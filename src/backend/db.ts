import "reflect-metadata"
import fs from "fs"
import {
  Entity,
  Column,
  Index,
  BeforeInsert,
  BeforeUpdate,
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
  Raw,
  Brackets,
  Between,
  MoreThanOrEqual,
  LessThanOrEqual,
  SelectQueryBuilder
} from "typeorm"
import { v4 as uuidv4 } from "uuid"
import type { EntityChange, EntityRef } from "../models/changeSets"
import { authorIdentity } from "./authz"
import { AllMigrations } from "./migrations/1786100000000-InitialSchema"
import { extractNationality } from "./nationality"
import { extractShipName } from "./shipName"
import {
  BatchWithCounts,
  ChangeSet,
  PublicationBatch,
  Review,
  ContributionMedia,
  Contribution,
  ContributionStatus
} from "../models/contribution"

/**
 * Epoch milliseconds, read back as the number they were written as.
 *
 * Drivers disagree about what a 64-bit integer is. TypeORM asks mysql2 for big
 * numbers as strings, so a `bigint` column arrives as "1786200000000" there
 * and as a number on sqlite, while the interfaces below declare `number` and
 * are read by callers who have no reason to ask which database answered. One
 * of them builds a Date out of it, and `new Date("1786200000000")` is an
 * Invalid Date.
 *
 * Storing the digits was never the problem -- a decimal string round-trips an
 * integer exactly. Only the type coming back is.
 */
const epochMilliseconds = {
  to: (value: number | null | undefined) => value,
  from: (value: string | number | null): number | null =>
    value === null || value === undefined ? null : Number(value)
}

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

  @Column({ type: "bigint", transformer: epochMilliseconds })
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

  @Column({ type: "bigint", nullable: true, transformer: epochMilliseconds })
  published!: number | null

  @Column({ type: "varchar", nullable: true })
  publishedBy!: string | null

  @OneToMany(() => ContributionEntity, (contribution) => contribution.batch)
  contributions!: ContributionEntity[]
}

/**
 * The listing shape, re-exported over the entity for callers holding one.
 *
 * The contract itself -- `BatchWithCounts` -- lives in the models package, so a
 * package consumer can type the payload; this alias just pairs it with the
 * TypeORM entity the query actually produces.
 *
 * `contributions` is omitted: the entity's relation is not populated by the
 * listing query (that is the whole point -- counts, not contents), so a type
 * that carried it would let a caller reach for an array that is never there.
 */
export type BatchListing = Omit<PublicationBatchEntity, "contributions"> &
  BatchWithCounts

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

  // Denormalised from `root` on write (see createContribution) so the list can
  // filter by the root entity's schema and id on real, indexed columns. The
  // schema and id live inside the `root` JSON, which can only be matched with a
  // leading-wildcard LIKE -- unindexable, so it forced a full table scan on
  // every editorial list load. Mirroring them here turns that filter into an
  // index lookup. `rootId` is stored as text because a root id may serialise as
  // a string or a number, and both are compared as the same value.
  @Index()
  @Column({ type: "varchar", nullable: true })
  rootSchema?: string | null

  @Index()
  @Column({ type: "varchar", nullable: true })
  rootId?: string | null

  // The root id again, as a number, for ordering the list by voyage id. `rootId`
  // is text (an id may be a string), and a text sort is lexicographic -- "1000"
  // would fall before "999". This column holds the id only when it is a whole
  // number, so `ORDER BY rootIdNum` is numeric and index-backed; a non-numeric
  // id (e.g. a not-yet-saved entity) is null and sorts at one end.
  @Index()
  @Column({ type: "bigint", nullable: true })
  rootIdNum?: string | null

  @ManyToOne(() => ChangeSetEntity, {
    cascade: true,
    onDelete: "CASCADE",
    nullable: false
  })

  @JoinColumn()
  changeSet!: ChangeSetEntity

  // Indexed because it is the selective filter on every editorial list query
  // (`WHERE status IN (...)`); without it the query scans the whole table.
  @Index()
  @Column({ type: "int" })
  status!: ContributionStatus

  // Denormalised from the changeSet on write (see createContribution) so the
  // list can order by ship name -- it has no column of its own in the change
  // tree, and a JSON path there is neither fixed nor cheap to sort on. Null for
  // contributions not about a voyage, or edits that never touched the ship.
  // Indexed so `ORDER BY shipName` does not filesort the whole table.
  @Index()
  @Column({ type: "varchar", nullable: true })
  shipName?: string | null

  // Denormalised ship nationality, same rationale as shipName: read from the
  // changeSet on write so the list can order by it. Null for contributions not
  // about a voyage, or edits that never touched the ship's nationality.
  @Index()
  @Column({ type: "varchar", nullable: true })
  nationality?: string | null

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

  @Column({ type: "bigint", nullable: true, transformer: epochMilliseconds })
  decidedAt?: number | null

  // Keep the denormalised root columns in step with `root` on every write, so
  // the list can filter on them whatever path saved the row. Derived from the
  // entity's own `root` (a scalar column, always loaded), so an update never
  // clears them. `rootId` is stored as text: a root id may be a string or a
  // number, and the filter compares both as the same string.
  @BeforeInsert()
  @BeforeUpdate()
  syncRootColumns(): void {
    const id = this.root?.id
    this.rootSchema = this.root?.schema != null ? String(this.root.schema) : null
    this.rootId = id != null ? String(id) : null
    // Kept as a string so a large id survives without float rounding; the bigint
    // column orders it numerically. Only a whole number qualifies.
    this.rootIdNum = id != null && /^-?\d+$/.test(String(id)) ? String(id) : null
  }
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

/**
 * Applies a listContributions sort to a query builder. Used on the search /
 * voyage-id path, which cannot use a find-options `order` object. Relation
 * columns are named through the aliases setFindOptions generates for the
 * `contribAllRelations` joins (`<mainAlias>__<relation>`). `id` is always the
 * tiebreaker beneath the primary column, and takes the caller's direction when
 * it is itself the primary.
 */
const applyOrderToQueryBuilder = (
  qb: SelectQueryBuilder<ContributionEntity>,
  sortBy: string,
  sortOrder: "ASC" | "DESC"
): void => {
  // A relation column is ordered through a correlated subquery selected under a
  // dotless alias, not the relation's join alias. Two reasons: the join alias
  // setFindOptions generates is a TypeORM-internal name (0.3 spells the
  // changeSet join `contribution__contribution_changeSet`, not
  // `contribution__changeSet`), and the join-based pagination path parses a
  // dotted orderBy as `alias.column`, which a subquery or json_extract(...) is
  // not. Selecting the value under a plain alias sidesteps both.
  const orderBySubquery = (sql: string) =>
    qb.addSelect(sql, "list_sort_key").orderBy("list_sort_key", sortOrder)
  switch (sortBy) {
    case "voyage_id":
      // The voyage id is denormalised onto the indexed `rootIdNum` column, so it
      // orders numerically off an index rather than by extracting it from the
      // `root` JSON on every row.
      qb.orderBy("contribution.rootIdNum", sortOrder)
      break
    case "author":
      orderBySubquery(
        "(SELECT cs.author FROM changesets cs WHERE cs.id = contribution.changeSetId)"
      )
      break
    case "timestamp":
      orderBySubquery(
        "(SELECT cs.timestamp FROM changesets cs WHERE cs.id = contribution.changeSetId)"
      )
      break
    case "comments":
      orderBySubquery(
        "(SELECT cs.comments FROM changesets cs WHERE cs.id = contribution.changeSetId)"
      )
      break
    case "batch":
      orderBySubquery(
        "(SELECT b.title FROM publication_batches b WHERE b.id = contribution.batchId)"
      )
      break
    case "status":
      qb.orderBy("contribution.status", sortOrder)
      break
    case "decidedBy":
      qb.orderBy("contribution.decidedBy", sortOrder)
      break
    case "shipName":
      qb.orderBy("contribution.shipName", sortOrder)
      break
    case "nationality":
      qb.orderBy("contribution.nationality", sortOrder)
      break
    default:
      qb.orderBy("contribution.id", sortOrder)
  }
  if (sortBy !== "id") {
    qb.addOrderBy("contribution.id", "ASC")
  }
}

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

// Outcome of deleteBatch. `published_with_contributions` is the one case that
// stays blocked, and it carries the batch so the caller can name it.
export type DeleteBatchResult =
  // `mediaFiles` are the upload filenames whose rows were deleted, for the
  // caller to unlink from disk after the transaction commits. Empty unless the
  // batch's contributions were deleted too (deleteContributions).
  | { deleted: true; mediaFiles: string[] }
  | { deleted: false; reason: "not_found" }
  | {
      deleted: false
      reason: "published_with_contributions"
      batch: PublicationBatchEntity
    }

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
      id: data.id || uuidv4(),
      // Recomputed on every save so it tracks the ship as the changeSet is
      // edited; null when the change tree names no ship.
      // (rootSchema / rootId are filled from `root` by the entity's
      // BeforeInsert/BeforeUpdate hook, so they need no assignment here.)
      shipName: extractShipName(data.changeSet),
      nationality: extractNationality(data.changeSet)
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
      sortBy?:
        | "author"
        | "timestamp"
        | "comments"
        | "status"
        | "id"
        | "decidedBy"
        | "batch"
        | "voyage_id"
        | "shipName"
        | "nationality"
      sortOrder?: "ASC" | "DESC"
      /**
       * Free-text search. Case-insensitive OR match across the contribution id,
       * the root voyage id, and (subject to visibility) the changeSet author /
       * title / comments.
       */
      search?: string
      /**
       * Who may be matched on the sensitive changeSet fields (author, title,
       * comments). "all" for an editor -- every row. For a contributor, only
       * their own rows, named by identity, so a text search cannot probe the
       * redacted content of other people's contributions. The public fields
       * (contribution id, voyage id) are always searchable by anyone.
       */
      searchSensitiveScope?: "all" | { ownIdentity: string | null }
      /** Inclusive lower / upper bounds on the changeSet timestamp (epoch ms). */
      dateFrom?: number
      dateTo?: number
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
      sortOrder = "ASC",
      search,
      searchSensitiveScope = "all",
      dateFrom,
      dateTo
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
    // Author and the date range both live on the changeSet, so they are built
    // into one nested clause -- a where holds a single condition per relation.
    const changeSetWhere: any = {}
    if (author) {
      const identity = authorIdentity(author)
      changeSetWhere.author = Raw(
        (column) =>
          `(${column} = :authorIdentity` +
          ` OR ${column} LIKE :authorSuffix ESCAPE '${LIKE_ESCAPE}')`,
        {
          authorIdentity: identity,
          authorSuffix: `%<${likeLiteral(identity)}>`
        }
      )
    }
    // Date range on the changeSet timestamp -- the same value the Date column
    // shows and `sortBy: "timestamp"` orders by. Open-ended on either side.
    if (dateFrom !== undefined && dateTo !== undefined) {
      changeSetWhere.timestamp = Between(dateFrom, dateTo)
    } else if (dateFrom !== undefined) {
      changeSetWhere.timestamp = MoreThanOrEqual(dateFrom)
    } else if (dateTo !== undefined) {
      changeSetWhere.timestamp = LessThanOrEqual(dateTo)
    }
    if (Object.keys(changeSetWhere).length > 0) {
      where.changeSet = changeSetWhere
    }

    // The root entity's schema and id are denormalised onto their own indexed
    // columns (`rootSchema` / `rootId`), so this filter is a plain equality on
    // an index rather than a leading-wildcard LIKE over the `root` JSON, which
    // no index can serve and which forced a full table scan on every load.
    //
    // Ids are only unique within a schema, so both are matched together when
    // both are given: without the schema a voyage id would also match a
    // contribution rooted at another entity that happens to share the number.
    // `rootId` is compared as text because a root id may be a string or number
    // and the column stores whichever it was, as a string.
    if (rootSchema !== undefined) {
      where.rootSchema = rootSchema
    }
    if (rootId !== undefined) {
      where.rootId = String(rootId)
    }

    // Calculate offset
    const offset = (page - 1) * limit

    // Only a free-text search needs a query builder: it is an OR group across
    // columns and a relation. Ordering by the voyage id no longer does -- it is
    // the `rootIdNum` column now, nameable in a find-options `order` like any
    // other. (A search combined with a voyage-id sort still lands here, and
    // applyOrderToQueryBuilder orders it by that same column.)
    const useQueryBuilder = search !== undefined

    if (useQueryBuilder) {
      const qb = this.contributionRepo
        .createQueryBuilder("contribution")
        .setFindOptions({ where, relations: contribAllRelations })

      if (search !== undefined) {
        // Case-insensitive %term% match. LIKE folds case for ASCII on both
        // sqlite and the app's MySQL collation; the term is escaped so % and _
        // in the query are literals.
        const term = `%${likeLiteral(search)}%`
        qb.andWhere(
          new Brackets((b) => {
            // Public fields, searchable by anyone: the contribution id and the
            // voyage id (root.id, via the same JSON path the sort uses).
            b.where(
              `contribution.id LIKE :searchTerm ESCAPE '${LIKE_ESCAPE}'`,
              { searchTerm: term }
            ).orWhere(
              `json_extract(contribution.root, '$.id') LIKE :searchTerm ESCAPE '${LIKE_ESCAPE}'`,
              { searchTerm: term }
            )
            // Sensitive fields (author / title / comments) plus the changeSet
            // body live on the changeSet. Matched via a subquery keyed by the
            // FK so this does not depend on the join alias. For an editor,
            // across every row; for a contributor, only their own rows -- named
            // by identity -- so a search cannot probe the redacted content of
            // other people's work.
            //
            // `cs.changes` is the whole edit as one simple-json (text) column.
            // A LIKE over it is how the ship name -- and any other value buried
            // in the change tree, which has no column of its own -- becomes
            // searchable. It is deliberately broad: a term can match a value
            // anywhere in the tree, not only the ship, and matches the raw JSON
            // (so it also sees the property keys). That is the trade for
            // searching a field the schema does not surface as a column.
            const sensitive =
              `cs.author LIKE :searchTerm ESCAPE '${LIKE_ESCAPE}'` +
              ` OR cs.title LIKE :searchTerm ESCAPE '${LIKE_ESCAPE}'` +
              ` OR cs.comments LIKE :searchTerm ESCAPE '${LIKE_ESCAPE}'` +
              ` OR cs.changes LIKE :searchTerm ESCAPE '${LIKE_ESCAPE}'`
            if (searchSensitiveScope === "all") {
              b.orWhere(
                `contribution.changeSetId IN (SELECT cs.id FROM changesets cs WHERE ${sensitive})`,
                { searchTerm: term }
              )
            } else if (searchSensitiveScope.ownIdentity) {
              const own = searchSensitiveScope.ownIdentity
              b.orWhere(
                "contribution.changeSetId IN (SELECT cs.id FROM changesets cs WHERE " +
                  `(cs.author = :searchOwn OR cs.author LIKE :searchOwnSuffix ESCAPE '${LIKE_ESCAPE}')` +
                  ` AND (${sensitive}))`,
                {
                  searchTerm: term,
                  searchOwn: own,
                  searchOwnSuffix: `%<${likeLiteral(own)}>`
                }
              )
            }
            // An anonymous contributor (no identity) matches only the public
            // fields above -- nothing more is added.
          })
        )
      }

      applyOrderToQueryBuilder(qb, sortBy, sortOrder)
      const [data, total] = await qb.skip(offset).take(limit).getManyAndCount()
      return { data, total, page, limit }
    }

    // Build order clause.
    //
    // Real columns and to-one relations are offered.
    const order: any = {}
    if (sortBy === "author") {
      order.changeSet = { author: sortOrder }
    } else if (sortBy === "timestamp") {
      order.changeSet = { timestamp: sortOrder }
    } else if (sortBy === "comments") {
      order.changeSet = { comments: sortOrder }
    } else if (sortBy === "status") {
      order.status = sortOrder
    } else if (sortBy === "voyage_id") {
      // Denormalised numeric voyage id; see the rootIdNum column.
      order.rootIdNum = sortOrder
    } else if (sortBy === "shipName") {
      order.shipName = sortOrder
    } else if (sortBy === "nationality") {
      order.nationality = sortOrder
    } else if (sortBy === "decidedBy") {
      order.decidedBy = sortOrder
    } else if (sortBy === "batch") {
      // `batch` is a to-one relation, so its rows are not multiplied by the
      // join and pagination stays correct. Unassigned rows have a null title,
      // which the database groups at one end of the order.
      order.batch = { title: sortOrder }
    }
    // `id` doubles as the tiebreaker, so it is always in the clause. When it is
    // what the caller asked to order by, it takes their direction; otherwise it
    // stays ASC to break ties stably beneath the primary column.
    order.id = sortBy === "id" ? sortOrder : "ASC"

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
    // Taken as the request body had it, and parsed below: this is the boundary
    // an id crosses, so it is where it becomes one.
    batchId: number | string | null
  ): Promise<ContributionEntity | ContributionEntity[] | { error: string }> {
    const ids = Array.isArray(contributionId) ? contributionId : [contributionId]
    return await AppDataSource.transaction(async (manager) => {
      // Each contribution is fetched with the batch it currently sits in, which
      // is one of the two a move can disturb.
      const contributions = await manager.find(ContributionEntity, {
        where: { id: In(ids) },
        relations: ["batch"]
      })
      const foundIds = new Set(contributions.map((c) => c.id))
      const missing = ids.filter((i) => !foundIds.has(i))
      if (missing.length > 0) {
        return { error: `Contribution(s) not found: ${missing.join(", ")}` }
      }
      // The body reaches here unparsed, so this is where a batch id becomes
      // one. Absent, it used to arrive as undefined, which TypeORM drops from
      // the where clause -- the lookup below then matched an arbitrary batch
      // and the contribution was assigned to whichever came back. Arriving as
      // a numeric string it was wrong differently: it compares unequal to the
      // number the driver returns, so a request naming the batch a
      // contribution is already in read as a move out of it.
      //
      // Only null asks for the assignment to be cleared. Nothing else stands
      // in for it.
      let target: number | null = null
      if (batchId !== null) {
        const named =
          typeof batchId === "number" || typeof batchId === "string"
            ? Number(batchId)
            : NaN
        if (!Number.isInteger(named) || named <= 0) {
          return {
            error:
              `Invalid publication batch id: ${JSON.stringify(batchId)}. ` +
              "Name a batch, or null to clear the assignment."
          }
        }
        target = named
      }
      // If a batch is named, verify it exists
      let batch: PublicationBatchEntity | null = null
      if (target !== null) {
        batch = await manager.findOne(PublicationBatchEntity, { where: { id: target } })
        if (!batch) {
          return { error: `Publication batch with ID ${target} not found` }
        }
      }
      // A request naming the batch a contribution is already in moves it
      // nowhere, so there is nothing to guard. Assignment is retried, and a
      // retry asking for the placement it already has is answered rather than
      // refused for a move it is not making.
      const moving = contributions.filter(
        (c) => (c.batch?.id ?? null) !== target
      )
      // What a published batch holds is the record of what it published, and it
      // carries a date and a publisher saying so. Moving work out credits that
      // publisher for work the batch no longer contains; moving work in makes
      // them the publisher of work that never went out. Nothing records where a
      // contribution came from, so neither can be undone.
      //
      // Both ends are checked, because a move disturbs the batch it leaves as
      // much as the one it joins.
      const frozen = new Map<number, PublicationBatchEntity>()
      if (batch?.published != null && moving.length > 0) {
        frozen.set(batch.id, batch)
      }
      for (const c of moving) {
        if (c.batch?.published != null) {
          frozen.set(c.batch.id, c.batch)
        }
      }
      if (frozen.size > 0) {
        const describe = [...frozen.values()]
          .map((b) => `${b.id} ("${b.title}")`)
          .join(", ")
        return {
          error:
            "Contributions cannot be moved into or out of a published " +
            `batch: ${describe}`
        }
      }
      // Asked of the contribution as well as of the batch, because a batch
      // cannot always answer for it. Work published on its own carries no
      // batch to be stamped, and would otherwise be free to join one and be
      // counted among what that batch published.
      const alreadyOut = moving.filter(
        (c) => c.status === ContributionStatus.Published
      )
      if (alreadyOut.length > 0) {
        return {
          error:
            "Published contributions cannot be moved between batches: " +
            alreadyOut.map((c) => c.id).join(", ")
        }
      }
      // Update all contributions
      for (const c of contributions) {
        if (target === null) {
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
  ): Promise<BatchListing[]> {
    const queryBuilder = this.batchRepository
      .createQueryBuilder("batch")
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
    const batches = await queryBuilder.getMany()
    if (batches.length === 0) {
      return []
    }
    // One row per (batch, status) that actually has contributions, so a batch
    // with none simply gets no rows and keeps the zeroed counts below.
    const rows = await this.contributionRepo
      .createQueryBuilder("contribution")
      .select("contribution.batchId", "batchId")
      .addSelect("contribution.status", "status")
      .addSelect("COUNT(*)", "count")
      .where("contribution.batchId IN (:...ids)", {
        ids: batches.map((b) => b.id)
      })
      .groupBy("contribution.batchId")
      .addGroupBy("contribution.status")
      .getRawMany<{ batchId: number; status: number; count: string | number }>()
    const counts = new Map<
      number,
      Partial<Record<ContributionStatus, number>>
    >()
    for (const row of rows) {
      const forBatch = counts.get(Number(row.batchId)) ?? {}
      // `COUNT(*)` comes back as a string from some drivers. The status is one
      // of the enum's values, read back off the column it was stored under.
      forBatch[Number(row.status) as ContributionStatus] = Number(row.count)
      counts.set(Number(row.batchId), forBatch)
    }
    return batches.map((batch) => {
      const statusCounts = counts.get(batch.id) ?? {}
      return {
        ...batch,
        statusCounts,
        contributionCount: Object.values(statusCounts).reduce(
          (sum, c) => sum + c,
          0
        )
      }
    })
  }

  async deleteContribution(
    id: string
  ): Promise<{ deleted: boolean; mediaFiles: string[] }> {
    // reviews and media reference the contribution with no ON DELETE CASCADE, so
    // a plain delete fails a foreign-key constraint once the contribution has
    // either. Rejected and accepted contributions carry reviews, so removing the
    // children first (in one transaction) is what lets those be deleted, not
    // just clean WorkInProgress drafts.
    return AppDataSource.transaction(async (manager) => {
      const contribution = await manager.findOne(ContributionEntity, {
        where: { id },
        relations: ["reviews", "media"]
      })
      if (!contribution) {
        return { deleted: false, mediaFiles: [] }
      }
      // The upload filenames, returned so the caller can unlink them from disk
      // after commit -- deleting the media rows only removes their metadata.
      const mediaFiles = contribution.media?.map((m) => m.file) ?? []
      // The change sets owned by this contribution and its reviews. Their FKs
      // point at `changesets`, so onDelete: CASCADE never reaches them from
      // here; capture the ids before the referencing rows go, then delete them
      // once nothing points at them, so their bodies are not orphaned forever.
      const changeSetIds = await this.ownedChangeSetIds(manager, id)
      if (contribution.media?.length) {
        await manager.remove(contribution.media)
      }
      if (contribution.reviews?.length) {
        await manager.remove(contribution.reviews)
      }
      const result = await manager.delete(ContributionEntity, id)
      const deleted = result.affected ? result.affected > 0 : false
      if (deleted && changeSetIds.length) {
        await manager.delete(ChangeSetEntity, In(changeSetIds))
      }
      return { deleted, mediaFiles: deleted ? mediaFiles : [] }
    })
  }

  // The ids of the change sets a contribution and its reviews own -- the
  // contribution's own changeSet plus one per review. Read straight from the FK
  // columns so the change-set bodies need not be loaded just to delete them.
  private async ownedChangeSetIds(
    manager: EntityManager,
    contributionId: string
  ): Promise<string[]> {
    const rows: { id: string | null }[] = [
      ...(await manager.query(
        "SELECT changeSetId AS id FROM contributions WHERE id = ?",
        [contributionId]
      )),
      ...(await manager.query(
        "SELECT changeSetId AS id FROM reviews WHERE contributionId = ?",
        [contributionId]
      ))
    ]
    return rows.map((r) => r.id).filter((id): id is string => id != null)
  }

  // Check whether a batch has any contributions assigned.
  async batchHasContributions(batchId: number): Promise<boolean> {
    const count = await this.contributionRepo.count({
      where: { batch: { id: batchId } }
    })
    return count > 0
  }

  // The ids of a batch's contributions that are candidates for bulk approval:
  // anything not already decided or published -- WorkInProgress or Submitted.
  // Bulk imports land as WorkInProgress, so restricting to Submitted alone left
  // an imported batch with nothing to approve. Already-Accepted / Rejected /
  // Published are skipped here rather than reported as refusals, since they are
  // not what the editor is asking to act on. Each candidate is still run through
  // the full acceptance path (changeOneStatus), which is where readiness is
  // gated, and which already permits an editor to accept a WorkInProgress draft.
  async getBatchApprovableContributionIds(batchId: number): Promise<string[]> {
    const rows = await this.contributionRepo.find({
      where: {
        batch: { id: batchId },
        status: In([
          ContributionStatus.WorkInProgress,
          ContributionStatus.Submitted
        ])
      },
      select: { id: true },
      order: { id: "ASC" }
    })
    return rows.map((r) => r.id)
  }

  // unpublished. Used to re-validate each chunk of a running bulk-approve so a concurrent assign/unassign/publish cannot make it act on stale ids.
  async filterBatchApprovableIds(
    batchId: number,
    ids: string[]
  ): Promise<string[]> {
    if (ids.length === 0) {
      return []
    }
    const batch = await this.batchRepository.findOne({ where: { id: batchId } })
    if (!batch || batch.published != null) {
      return []
    }
    const rows = await this.contributionRepo.find({
      where: {
        id: In(ids),
        batch: { id: batchId },
        status: In([
          ContributionStatus.WorkInProgress,
          ContributionStatus.Submitted
        ])
      },
      select: { id: true }
    })
    return rows.map((r) => r.id)
  }

  // Delete a publication batch by id, in one of two modes:
  //
  //  - `deleteContributions = false` (default): unassign the batch's
  //    contributions (batch -> null) and delete the empty batch. The
  //    contributions survive, back in the pool. This is what the delete-batch
  //    modal has always promised.
  //  - `deleteContributions = true`: delete the batch's contributions as well,
  //    then the batch. Destructive -- the contributions are gone.
  //
  // Both run in one transaction so a contribution is never left pointing at a
  // batch that is gone.
  //
  // The one case that stays blocked is a *published* batch that still holds
  // contributions: a published batch is the record of what it published (it
  // carries a `published` date and `publishedBy`), and removing its
  // contributions -- by unassign or delete -- would corrupt that record.
  // Mirrors the guard in assignContributionToBatch.
  async deleteBatch(
    batchId: number,
    deleteContributions = false
  ): Promise<DeleteBatchResult> {
    return await AppDataSource.transaction(async (manager) => {
      const batch = await manager.findOne(PublicationBatchEntity, {
        where: { id: batchId }
      })
      if (!batch) {
        return { deleted: false, reason: "not_found" }
      }
      // The published guard only needs to know whether any contribution is
      // still attached -- a count, not the rows themselves.
      if (batch.published != null) {
        const stillHeld = await manager.count(ContributionEntity, {
          where: { batch: { id: batchId } }
        })
        if (stillHeld > 0) {
          return { deleted: false, reason: "published_with_contributions", batch }
        }
      }
      let mediaFiles: string[] = []
      if (deleteContributions) {
        // Delete the batch's contributions. reviews and media reference the
        // contribution with no ON DELETE CASCADE, so remove those first. All
        // set-based (subquery on batchId) so a 7,000-voyage batch is a handful
        // of statements, not thousands.
        const inBatch =
          "contributionId IN (SELECT id FROM contributions WHERE batchId = :batchId)"
        // Captured before the deletes: the upload filenames (returned so the
        // caller can unlink them after commit) and the change-set ids owned by
        // these contributions and their reviews (deleted below, since their FKs
        // point at `changesets` so cascade never reaches them).
        const mediaRows: { file: string }[] = await manager.query(
          "SELECT file FROM contribution_media WHERE contributionId IN " +
            "(SELECT id FROM contributions WHERE batchId = ?)",
          [batchId]
        )
        mediaFiles = mediaRows.map((r) => r.file).filter((f) => f != null)
        const changeSetRows: { id: string | null }[] = [
          ...(await manager.query(
            "SELECT changeSetId AS id FROM contributions WHERE batchId = ?",
            [batchId]
          )),
          ...(await manager.query(
            "SELECT changeSetId AS id FROM reviews WHERE " +
              "contributionId IN (SELECT id FROM contributions WHERE batchId = ?)",
            [batchId]
          ))
        ]
        const changeSetIds = changeSetRows
          .map((r) => r.id)
          .filter((id): id is string => id != null)
        await manager
          .createQueryBuilder()
          .delete()
          .from(ContributionMediaEntity)
          .where(inBatch, { batchId })
          .execute()
        await manager
          .createQueryBuilder()
          .delete()
          .from(ReviewEntity)
          .where(inBatch, { batchId })
          .execute()
        await manager
          .createQueryBuilder()
          .delete()
          .from(ContributionEntity)
          .where("batchId = :batchId", { batchId })
          .execute()
        if (changeSetIds.length) {
          await manager.delete(ChangeSetEntity, In(changeSetIds))
        }
      } else {
        // Set-based unassign: one UPDATE rather than loading every row and saving it back, which for a 7,000-voyage batch was thousands of statements.
        await manager
          .createQueryBuilder()
          .update(ContributionEntity)
          .set({ batch: null })
          .where("batchId = :batchId", { batchId })
          .execute()
      }
      const result = await manager.delete(PublicationBatchEntity, batchId)
      return (result.affected ?? 0) > 0
        ? { deleted: true, mediaFiles }
        : { deleted: false, reason: "not_found" }
    })
  }

  // Stamp a batch as published.
  //
  // Only fills a `published` that is still null. Publication is polled, so this
  // runs once per poll after the run completes; without the guard the second
  // poll would keep pushing the timestamp forward, and a re-publish of the same
  // batch would erase the original date.
  //
  // Returns whether this call was the one that stamped it.
  private async stampBatch(
    manager: EntityManager,
    batchId: number,
    publishedBy: string | null,
    publishedAt: number
  ): Promise<boolean> {
    const result = await manager
      .createQueryBuilder()
      .update(PublicationBatchEntity)
      // Written together with the timestamp and under the same guard, so the
      // pair is always consistent: a batch never carries a publication date
      // with someone else's name, or a name with no date.
      .set({ published: publishedAt, publishedBy })
      .where("id = :batchId", { batchId })
      .andWhere("published IS NULL")
      .execute()
    return (result.affected ?? 0) > 0
  }

  async markBatchPublished(
    batchId: number,
    publishedBy?: string | null,
    publishedAt: number = Date.now()
  ): Promise<boolean> {
    return await this.stampBatch(
      AppDataSource.manager,
      batchId,
      publishedBy ?? null,
      publishedAt
    )
  }

  // Record a completed publication: the contributions it covered become
  // Published, and the batch that held them is stamped.
  //
  // One write, because upstream publishes a batch all or none and what is
  // recorded here has to say the same thing. Split, a batch holds published
  // work while claiming never to have published it -- it stays on the pending
  // list offering to publish work that is already out, and the name of whoever
  // published it is gone. Nothing reconciles the halves afterwards: the poll
  // that would is only made while somebody is still watching.
  //
  // Work published on its own has no batch, so `batchId` is null and there is
  // nothing to stamp.
  async recordPublication(
    contributionIds: string[],
    batchId: number | null,
    publishedBy?: string | null,
    publishedAt: number = Date.now()
  ): Promise<{ updated: number; stamped: boolean }> {
    return await AppDataSource.transaction(async (manager) => {
      let updated = 0
      if (contributionIds.length > 0) {
        const result = await manager.update(
          ContributionEntity,
          { id: In(contributionIds) },
          { status: ContributionStatus.Published }
        )
        updated = result.affected ?? 0
      }
      const stamped =
        batchId === null
          ? false
          : await this.stampBatch(
            manager,
            batchId,
            publishedBy ?? null,
            publishedAt
          )
      return { updated, stamped }
    })
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
