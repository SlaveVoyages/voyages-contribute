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
  IsNull
} from "typeorm"
import { v4 as uuidv4 } from "uuid"
import type { EntityChange, EntityRef } from "../models/changeSets"
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

const getFullContribution = (
  manager: EntityManager,
  id: string
): Promise<ContributionEntity | null> =>
  manager.findOne(ContributionEntity, {
    where: { id },
    relations: contribAllRelations
  })

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
    
    if (author) {
      where.changeSet = { author }
    }

    if (options.author) {
      where.changeSet = { author: options.author }
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
      where: { id: mediaId }
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
