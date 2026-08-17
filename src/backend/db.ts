import "reflect-metadata"
import fs from "fs"
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  PrimaryColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  DataSource,
  Repository,
  In,
  EntityManager,
  IsNull,
  Raw
} from "typeorm"
import { v4 as uuidv4 } from "uuid"
import type { EntityChange, EntityRef } from "../models/changeSets"
import { authorIdentity } from "./authz"
import { AllMigrations } from "./migrations/1786100000000-InitialSchema"
import {
  ChangeSet,
  PublicationBatch,
  Review,
  ContributionMedia,
  Contribution,
  ContributionStatus
} from "../models/contribution"

// Entities that map to our interfaces.

@Entity("changesets")
export class ChangeSetEntity implements ChangeSet {
  @PrimaryGeneratedColumn("uuid")
  id!: string

  @Column({ type: "varchar" })
  author!: string

  @Column({ type: "varchar" })
  title!: string

  @Column({ type: "varchar" })
  comments!: string

  @Column("bigint")
  timestamp!: number

  @Column("simple-json")
  changes!: EntityChange[]
}

@Entity("publication_batches")
export class PublicationBatchEntity implements PublicationBatch {
  @PrimaryGeneratedColumn()
  id!: number

  @Column({ type: "varchar", unique: true })
  title!: string

  @Column({ type: "varchar" })
  comments!: string

  @Column({ type: "varchar", nullable: true })
  published!: number | null

  @Column({ type: "varchar", nullable: true })
  publishedBy!: string | null

  @OneToMany(() => ContributionEntity, (contribution) => contribution.batch)
  contributions!: ContributionEntity[]
}

@Entity("reviews")
export class ReviewEntity implements Review {
  @PrimaryGeneratedColumn()
  id!: number

  @ManyToOne(() => ChangeSetEntity, {
    cascade: true,
    onDelete: "CASCADE",
    nullable: false
  })
  @JoinColumn()
  changeSet!: ChangeSetEntity

  @Column({ type: "int" })
  stackOrder!: number

  @ManyToOne(() => ContributionEntity, (contribution) => contribution.reviews)
  contribution!: ContributionEntity
}

@Entity("contribution_media")
export class ContributionMediaEntity implements ContributionMedia {
  @PrimaryGeneratedColumn()
  id!: number

  @Column({ type: "varchar" })
  type!: "audio" | "image" | "document"

  @Column({ type: "varchar" })
  file!: string

  @Column({ type: "varchar" })
  name!: string

  @Column({ type: "varchar" })
  comments!: string

  @ManyToOne(() => ContributionEntity, (contribution) => contribution.media, {
    nullable: false
  })
  contribution!: ContributionEntity
}

@Entity("contributions")
export class ContributionEntity implements Contribution {
  @PrimaryColumn({ type: "varchar" })
  id!: string

  @Column("simple-json")
  root!: EntityRef

  @ManyToOne(() => ChangeSetEntity, {
    cascade: true,
    onDelete: "CASCADE",
    nullable: false
  })

  @JoinColumn()
  changeSet!: ChangeSetEntity

  @Column({ type: "int" })
  status!: ContributionStatus

  @OneToMany(() => ReviewEntity, (review) => review.contribution, {
    cascade: true
  })
  reviews!: ReviewEntity[]

  @OneToMany(() => ContributionMediaEntity, (media) => media.contribution, {
    cascade: true
  })
  media!: ContributionMediaEntity[]

  @ManyToOne(() => PublicationBatchEntity, { nullable: true })
  @JoinColumn()
  batch?: PublicationBatchEntity | null

  @Column({ type: "varchar", nullable: true })
  decisionComments?: string

  @Column({ type: "varchar", nullable: true })
  decidedBy?: string | null

  @Column({ type: "bigint", nullable: true })
  decidedAt?: number | null
}

// Database connection

const DB_TYPE = process.env.CONTRIB_DB_TYPE || "sqlite"

const sharedOptions = {
  // Schemas come from migrations in every environment, so that the one the
  // server runs against is the one the migrations produce. Run them with
  // `npm run tools -- migrate`.
  synchronize: false,
  migrationsRun: false,
  logging: true,
  entities: [
    ChangeSetEntity,
    PublicationBatchEntity,
    ReviewEntity,
    ContributionMediaEntity,
    ContributionEntity
  ],
  subscribers: [],
  migrations: AllMigrations
}

const parsePort = (raw: string | undefined): number => {
  const port = Number(raw ?? "3306")
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error(
      `CONTRIB_DB_PORT must be an integer in 1..65535; got "${raw}".`
    )
  }
  return port
}

const readSslCa = (caPath: string): Buffer => {
  try {
    return fs.readFileSync(caPath)
  } catch (err) {
    throw new Error(
      `Failed to read CONTRIB_DB_SSL_CA at "${caPath}": ${(err as Error).message}`
    )
  }
}

const createDataSource = (): DataSource => {
  if (DB_TYPE === "mysql") {
    console.log(`Using MySQL database at ${process.env.CONTRIB_DB_HOST || "localhost"}`)
    return new DataSource({
      ...sharedOptions,
      type: "mysql",
      host: process.env.CONTRIB_DB_HOST || "localhost",
      port: parsePort(process.env.CONTRIB_DB_PORT),
      username: process.env.CONTRIB_DB_USER || "root",
      password: process.env.CONTRIB_DB_PASSWORD || "",
      database: process.env.CONTRIB_DB_NAME || "voyages_contribute",
      charset: "utf8mb4",
      ssl: process.env.CONTRIB_DB_SSL_CA
        ? { ca: readSslCa(process.env.CONTRIB_DB_SSL_CA) }
        : process.env.CONTRIB_DB_SSL !== "false"
          ? { rejectUnauthorized: true }
          : undefined
    })
  }
  const database = process.env.CONTRIB_DB_PATH || "./contrib.db"
  console.log(`Using SQLite database at: ${database}`)
  return new DataSource({
    ...sharedOptions,
    type: "sqlite",
    database
  })
}

export const AppDataSource = createDataSource()

const contribAllRelations = ["changeSet", "reviews", "reviews.changeSet", "media", "batch"]

/**
 * Sqlite has no default LIKE escape character and MySQL's is the backslash,
 * which is also a string escape there. Naming one explicitly means the same
 * pattern behaves the same on both.
 */
const LIKE_ESCAPE = "!"

/**
 * Makes a caller-supplied value match itself inside a LIKE pattern. Binding it
 * as a parameter stops it reaching the SQL as syntax, but not as wildcards: an
 * unescaped `%` would otherwise widen the search to every row.
 */
const likeLiteral = (value: string): string =>
  value.replace(/[!%_]/g, (char) => `${LIKE_ESCAPE}${char}`)

const getFullContribution = (
  manager: EntityManager,
  id: string
): Promise<ContributionEntity | null> =>
  // An absent id has to be refused here rather than passed on: TypeORM drops
  // an undefined condition from the where clause, so the query becomes
  // "any contribution" and returns an arbitrary one. Callers read that as the
  // record they asked for and write to it.
  id
    ? manager.findOne(ContributionEntity, {
        where: { id },
        relations: contribAllRelations
      })
    : Promise.resolve(null)

// Initialize repositories
export class DatabaseService {
  private contributionRepo: Repository<ContributionEntity>
  private mediaRepo: Repository<ContributionMediaEntity>
  private batchRepository: Repository<PublicationBatchEntity>

  constructor() {
    this.contributionRepo = AppDataSource.getRepository(ContributionEntity)
    this.mediaRepo = AppDataSource.getRepository(ContributionMediaEntity)
    this.batchRepository = AppDataSource.getRepository(PublicationBatchEntity)
  }

  async createContribution(
    data: Partial<Contribution>
  ): Promise<ContributionEntity> {
    const contribution = this.contributionRepo.create({
      ...data,
      id: data.id || uuidv4()
    } as ContributionEntity)
    return this.contributionRepo.save(contribution)
  }

  async getBatchContributions(
    batchId: number,
    status?: ContributionStatus
  ): Promise<ContributionEntity[] | null> {
    return this.contributionRepo.find({
      where: { batch: { id: batchId }, status },
      relations: contribAllRelations
    })
  }

  // How many contributions a batch holds of each status, keyed by status.
  // Counted in SQL rather than by loading the contributions, since the only
  // caller wants the tally for an error message and the full rows carry their
  // change sets with them.
  async getBatchContributionStatusCounts(
    batchId: number
  ): Promise<Partial<Record<ContributionStatus, number>>> {
    const rows = await this.contributionRepo
      .createQueryBuilder("contribution")
      .select("contribution.status", "status")
      .addSelect("COUNT(*)", "count")
      .where("contribution.batchId = :batchId", { batchId })
      .groupBy("contribution.status")
      .getRawMany<{ status: number; count: number }>()
    return rows.reduce<Partial<Record<ContributionStatus, number>>>(
      (counts, row) => {
        counts[row.status as ContributionStatus] = Number(row.count)
        return counts
      },
      {}
    )
  }

  async getContribution(id: string): Promise<ContributionEntity | null> {
    return getFullContribution(AppDataSource.manager, id)
  }

  async getBatchByTitle(title: string): Promise<PublicationBatchEntity | null> {
    return this.batchRepository.findOne({
      where: { title }
    })
  }

  async getBatchById(batchId: number): Promise<PublicationBatchEntity | null> {
    return this.batchRepository.findOne({ where: { id: batchId } })
  }

  async listContributions(
    options: {
      page?: number
      limit?: number
      status?: ContributionStatus | ContributionStatus[]
      batchId?: number | null
      author?: string
      /** Id of the root entity, e.g. a voyage id. */
      rootId?: string | number
      /** Schema of the root entity, within which its id is unique. */
      rootSchema?: string
      sortBy?: "author" | "timestamp" | "id"
      sortOrder?: "ASC" | "DESC"
    } = {}
  ): Promise<{
    data: ContributionEntity[]
    total: number
    page: number
    limit: number
  }> {
    const limit = options.limit ?? 10
    const {
      page = 1,
      status,
      batchId,
      author,
      rootId,
      rootSchema,
      sortBy = "id",
      sortOrder = "ASC"
    } = options

    // Build where clause
    const where: any = {}
    if (status !== undefined) {
      if (Array.isArray(status)) {
        where.status = In(status)
      } else {
        where.status = status
      }
    }

    if (batchId !== undefined) {
      if (batchId === null) {
        // Filter for contributions not assigned to any batch
        where.batch = IsNull()
      } else {
        // Filter for contributions assigned to specific batch
        where.batch = { id: batchId }
      }
    }

    // An author reads `Name <address>`, and the name is editable, so matching
    // the whole string would hide a contributor's own work from them the first
    // time they corrected their profile. Only the address is matched, either
    // closing the string or standing alone, which is what an account with no
    // name to show records.
    //
    // No case folding here, deliberately: an address is lowered once, where
    // the token is read, so both sides of this are already in the same form
    // for every author this code writes. `LOWER()` would only add a second,
    // different folding — SQL folds by collation and JavaScript by Unicode —
    // on top of one the data does not need.
    if (author) {
      const identity = authorIdentity(author)
      where.changeSet = {
        author: Raw(
          (column) =>
            `(${column} = :authorIdentity` +
            ` OR ${column} LIKE :authorSuffix ESCAPE '${LIKE_ESCAPE}')`,
          {
            authorIdentity: identity,
            authorSuffix: `%<${likeLiteral(identity)}>`
          }
        )
      }
    }

    // `root` is a simple-json column, so it is matched as text. This lets a
    // caller ask whether one entity already has a contribution instead of
    // paging the whole table and filtering client side.
    //
    // Four patterns because two things vary independently and neither is ours
    // to fix from here: an id may be serialised as a string or a number, and
    // JSON.stringify emits keys in the order the object happened to be built,
    // so `id` may be followed by a comma or by the closing brace.
    //
    // Ids are only unique within a schema, so `rootSchema` narrows the match:
    // without it a voyage id also matches a contribution rooted at another
    // entity that happens to share the number. Both conditions have to go in
    // one `Raw`, since a where clause holds a single condition per column.
    if (rootId !== undefined || rootSchema !== undefined) {
      const clauses: string[] = []
      const parameters: Record<string, string> = {}

      if (rootId !== undefined) {
        const id = likeLiteral(String(rootId))
        Object.assign(parameters, {
          rootIdTextComma: `%"id":"${id}",%`,
          rootIdTextEnd: `%"id":"${id}"}%`,
          rootIdNumComma: `%"id":${id},%`,
          rootIdNumEnd: `%"id":${id}}%`
        })
        clauses.push(
          "(" +
            [
              "rootIdTextComma",
              "rootIdTextEnd",
              "rootIdNumComma",
              "rootIdNumEnd"
            ]
              .map((name) => `COLUMN LIKE :${name} ESCAPE '${LIKE_ESCAPE}'`)
              .join(" OR ") +
            ")"
        )
      }

      if (rootSchema !== undefined) {
        parameters.rootSchema = `%"schema":"${likeLiteral(rootSchema)}"%`
        clauses.push(`COLUMN LIKE :rootSchema ESCAPE '${LIKE_ESCAPE}'`)
      }

      const sql = clauses.join(" AND ")
      where.root = Raw(
        (column) => sql.replace(/COLUMN/g, column),
        parameters
      )
    }

    // Build order clause
    const order: any = {}
    if (sortBy === "author") {
      order.changeSet = { author: sortOrder }
    } else if (sortBy === "timestamp") {
      order.changeSet = { timestamp: sortOrder }
    }
    // Add secondary sort
    order.id = "ASC"

    // Calculate offset
    const offset = (page - 1) * limit

    // Execute queries
    const [data, total] = await this.contributionRepo.findAndCount({
      where,
      order,
      skip: offset,
      take: limit,
      relations: contribAllRelations
    })

    return {
      data,
      total,
      page,
      limit
    }
  }

  /**
   * Moves a contribution on, but only while it is still in the status the
   * caller decided against. Returns null when it has moved since, so the
   * caller can say so rather than write anyway.
   *
   * Deciding is read-modify-write across two requests: an editor accepting
   * while an author retries a submission would otherwise both read the same
   * row, and whichever saved last would silently discard the other's outcome.
   */
  async changeContributionStatus(
    id: string,
    from: ContributionStatus,
    to: ContributionStatus,
    decisionComments: string | null | undefined,
    decidedBy?: string | null
  ): Promise<ContributionEntity | null> {
    const comments = decisionComments ?? null
    // Written with the status, not carried over: the decider belongs to *this*
    // decision, so a later move without a known identity records none rather
    // than leaving the previous editor's name against a status they never set.
    const decider = decidedBy ?? null
    // Both statements run in one transaction, so the read describes the row
    // this write left behind. Apart, a third party deciding in between makes a
    // write that did land look like one that did not, and the caller is told
    // to reload and re-apply — which reverts the decision it was warned about.
    return AppDataSource.transaction(async (manager) => {
      await manager.update(
        ContributionEntity,
        { id, status: from },
        {
          status: to,
          decisionComments: comments,
          decidedBy: decider,
          decidedAt: decider === null ? null : Date.now()
        } as any
      )
      // Read back rather than trusting the row count. MySQL reports rows whose
      // values *changed*, so a request replayed with the values already stored
      // is indistinguishable from one that matched nothing — and sqlite
      // reports rows matched, so no test here can tell the two apart either.
      // What the caller needs to know is whether the contribution now says
      // what they asked for.
      const current = await getFullContribution(manager, id)
      if (
        !current ||
        current.status !== to ||
        (current.decisionComments ?? null) !== comments
      ) {
        return null
      }
      return current
    })
  }

  async updateContribution(
    id: string,
    data: Partial<Contribution>
  ): Promise<ContributionEntity | null> {
    await this.contributionRepo.update(id, data as Partial<ContributionEntity>)
    return this.getContribution(id)
  }

  async updateMultipleContributions(
    ids: string[],
    data: Partial<Contribution>
  ): Promise<number> {
    if (ids.length === 0) {
      return 0
    }
    const result = await this.contributionRepo.update(
      { id: In(ids) }, 
      data as Partial<ContributionEntity>
    )
    return result.affected || 0
  }

  async addMediaToContribution(
    contributionId: string,
    mediaData: ContributionMedia
  ): Promise<ContributionEntity | null> {
    return await AppDataSource.transaction(async (manager) => {
      // 1. Check if contribution exists
      const contribution = await manager.findOne(ContributionEntity, {
        where: { id: contributionId },
        relations: ["media"]
      })

      if (!contribution) {
        return null
      }

      // 2. Create the media entity
      const mediaEntity = new ContributionMediaEntity()
      mediaEntity.type = mediaData.type
      mediaEntity.file = mediaData.file
      mediaEntity.name = mediaData.name
      mediaEntity.comments = mediaData.comments
      mediaEntity.contribution = contribution

      await manager.save(ContributionMediaEntity, mediaEntity)

      // 3. Return the updated contribution with all relations
      return await getFullContribution(manager, contributionId)
    })
  }

  // Add review to contribution
  async addReviewToContribution(
    contributionId: string,
    reviewChangeSetData: {
      author: string
      title: string
      comments: string
      timestamp: number
      changes: EntityChange[]
    }
  ): Promise<ContributionEntity | null> {
    return await AppDataSource.transaction(async (manager) => {
      // 1. Check if contribution exists and get current reviews
      const contribution = await manager.findOne(ContributionEntity, {
        where: { id: contributionId },
        relations: ["reviews"]
      })

      if (!contribution) {
        return null
      }

      // 2. Calculate the next stackOrder automatically
      const maxStackOrder =
        contribution.reviews.length > 0
          ? Math.max(...contribution.reviews.map((review) => review.stackOrder))
          : 0
      const nextStackOrder = maxStackOrder + 1

      // 3. Create the ChangeSet for the review
      const changeSetEntity = new ChangeSetEntity()
      changeSetEntity.author = reviewChangeSetData.author
      changeSetEntity.title = reviewChangeSetData.title
      changeSetEntity.comments = reviewChangeSetData.comments
      changeSetEntity.timestamp = reviewChangeSetData.timestamp
      changeSetEntity.changes = reviewChangeSetData.changes

      const savedChangeSet = await manager.save(
        ChangeSetEntity,
        changeSetEntity
      )

      // 4. Create the review with automatic stackOrder
      const reviewEntity = new ReviewEntity()
      reviewEntity.changeSet = savedChangeSet
      reviewEntity.stackOrder = nextStackOrder
      reviewEntity.contribution = contribution

      await manager.save(ReviewEntity, reviewEntity)

      // 5. Return the updated contribution with all relations
      return await getFullContribution(manager, contributionId)
    })
  }

  // Get media by ID (helper method for deletion)
  async getMediaById(mediaId: number): Promise<ContributionMediaEntity | null> {
    return await this.mediaRepo.findOne({
      where: { id: mediaId },
      // The contribution it hangs off, so a caller can be checked against its
      // author before the file is removed.
      relations: ["contribution", "contribution.changeSet"]
    })
  }

  // Remove media metadata from database
  async removeMedia(mediaId: number): Promise<boolean> {
    const result = await this.mediaRepo.delete(mediaId)
    return result.affected !== 0
  }

  // Create publication batch
  async createPublicationBatch(batchData: {
    title: string
    comments: string
  }): Promise<PublicationBatchEntity> {
    const batchEntity = new PublicationBatchEntity()
    batchEntity.title = batchData.title
    batchEntity.comments = batchData.comments
    batchEntity.published = null
    return await this.batchRepository.save(batchEntity)
  }

  // Assign contribution to batch (or clear assignment with null batch_id)
  async assignContributionToBatch(
    contributionId: string | string[],
    batchId: number | null
  ): Promise<ContributionEntity | ContributionEntity[] | { error: string }> {
    const ids = Array.isArray(contributionId) ? contributionId : [contributionId]
    return await AppDataSource.transaction(async (manager) => {
      // Fetch all contributions requested
      const contributions = await manager.findBy(ContributionEntity, { id: In(ids) })
      const foundIds = new Set(contributions.map((c) => c.id))
      const missing = ids.filter((i) => !foundIds.has(i))
      if (missing.length > 0) {
        return { error: `Contribution(s) not found: ${missing.join(", ")}` }
      }
      // If batchId is provided, verify the batch exists
      let batch: PublicationBatchEntity | null = null
      if (batchId !== null) {
        batch = await manager.findOne(PublicationBatchEntity, { where: { id: batchId } })
        if (!batch) {
          return { error: `Publication batch with ID ${batchId} not found` }
        }
      }
      // Update all contributions
      for (const c of contributions) {
        if (batchId === null) {
          // Explicitly clear relation in DB
            c.batch = null
        } else {
            c.batch = batch ?? null
        }
      }
      await manager.save(ContributionEntity, contributions)
      // Return the updated contribution(s) with all relations
      const full = await Promise.all(
        contributions.map((c) => getFullContribution(manager, c.id))
      )
      const resolved = full.filter((c): c is ContributionEntity => !!c)
      if (!Array.isArray(contributionId)) {
        return resolved[0] ?? { error: "Could not fetch full contribution" }
      }
      if (resolved.length !== contributions.length) {
        return { error: "Could not fetch all updated contributions" }
      }
      return resolved
    })
  }

  // Get batches by publication status
  async getBatchesByStatus(
    filter: "all" | "published" | "pending"
  ): Promise<PublicationBatchEntity[]> {
    const queryBuilder = this.batchRepository
      .createQueryBuilder("batch")
      .leftJoinAndSelect("batch.contributions", "contributions")
      .leftJoinAndSelect("contributions.changeSet", "changeSet")
      .orderBy("batch.id", "DESC")
    switch (filter) {
      case "published":
        queryBuilder.where("batch.published IS NOT NULL")
        break
      case "pending":
        queryBuilder.where("batch.published IS NULL")
        break
      case "all":
      default:
        // No additional where clause for 'all'
        break
    }
    return await queryBuilder.getMany()
  }

  async deleteContribution(id: string): Promise<boolean> {
    const result = await this.contributionRepo.delete(id)
    return result.affected ? result.affected > 0 : false
  }

  // Check whether a batch has any contributions assigned.
  async batchHasContributions(batchId: number): Promise<boolean> {
    const count = await this.contributionRepo.count({
      where: { batch: { id: batchId } }
    })
    return count > 0
  }

  // Delete a publication batch by id (only call if it has no contributions!)
  async deleteBatch(batchId: number): Promise<boolean> {
    const result = await this.batchRepository.delete(batchId)
    return (result.affected ?? 0) > 0
  }

  // Stamp a batch as published.
  //
  // Only fills a `published` that is still null. Publication is polled, so this
  // runs once per poll after the run completes; without the guard the second
  // poll would keep pushing the timestamp forward, and a re-publish of the same
  // batch would erase the original date.
  //
  // Returns whether this call was the one that stamped it.
  async markBatchPublished(
    batchId: number,
    publishedBy?: string | null,
    publishedAt: number = Date.now()
  ): Promise<boolean> {
    const result = await this.batchRepository
      .createQueryBuilder()
      .update(PublicationBatchEntity)
      // Written together with the timestamp and under the same guard, so the
      // pair is always consistent: a batch never carries a publication date
      // with someone else's name, or a name with no date.
      .set({ published: publishedAt, publishedBy: publishedBy ?? null })
      .where("id = :batchId", { batchId })
      .andWhere("published IS NULL")
      .execute()
    return (result.affected ?? 0) > 0
  }

  async updateBatch(
    batchId: number,
    data: { title?: string; comments?: string }
  ): Promise<PublicationBatchEntity | null> {
    if (!data.title && !data.comments) {
      return this.getBatchById(batchId)
    }
    await this.batchRepository.update(batchId, {
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(data.comments !== undefined ? { comments: data.comments } : {})
    })
    return this.getBatchById(batchId)
  }
}

// Initialize database connection.
export const initDatabase = async (): Promise<void> => {
  try {
    await AppDataSource.initialize()
    console.log("Database connection established")
  } catch (error) {
    console.error("Error connecting to database:", error)
    throw error
  }
}
