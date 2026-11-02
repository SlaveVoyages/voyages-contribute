# Voyages Contribution API and front-end library

This project supports an important part of the slavevoyages.org web site, the
user contribution system.

The codebase is used to both generate a front-end TS library for consumption in
the Voyages front-end as well as a backend application, that can be run on
Node.js, to support storing and retrieving the contributions.

## Unit tests

`npm run test` should run all unit tests in the project. Some may require a
live database connection and might fail if you do not have that setup in the
local environment.

## Database schema

The server does not create or alter its own schema, so a database has to be
migrated before it will serve. Applying migrations is idempotent, so this is
safe to run on every deploy.

### `MIGRATION_MODE`

What a starting server does about a schema that is behind the code. It is
deliberately independent of `NODE_ENV`: how a deployment gets its schema is a
separate decision from what the deployment is called.

| value | on startup | for |
|---|---|---|
| `none` (default) | refuses to serve, listing what is pending | a live service — nothing writes to the schema |
| `on-startup` | applies what is pending, then serves | local development, and single-instance deployments |
| `job` | applies what is pending and exits without serving | production migrations, as a one-shot container |

Unset or empty means `none`. An unrecognized value is refused before the
database is even opened, so a typo cannot silently select a writing mode.

`job` runs the ordinary server image, so a production migration needs no
separate build or bundle:

```
docker run --rm -e MIGRATION_MODE=job -v <volume>:/etc/data <image>
```

Stop the service first. SQLite tolerates one writer, so migrating underneath a
running server is not safe.

A mode that applies migrations takes a deployment from nothing to a working
database, creating one if there is none — so `job` on an empty volume is all a
first deployment needs. `none` never creates anything and so needs no
privilege to.

Whether the database was found or created is logged either way, because a
mistyped `CONTRIB_DB_PATH` or `CONTRIB_DB_NAME` yields a new empty database
rather than an error, and that log line is what tells the two apart.

### By hand, or in CI

```
npm run tools -- migrate           # apply anything pending
npm run tools -- migrate --status  # what is applied, what is not
npm run tools -- migrate --check   # exit 1 if anything is pending
```

`--check` is the one for CI: it fails when the schema is behind the code,
rather than leaving it to surface at runtime. Neither it nor `--status`
creates a database, since a reporting command should not.

Migrating a database built by an older version of this server, when
`synchronize` still created the schema, records the initial migration without
touching the existing tables.

### Adding a migration

Migrations live in `src/backend/migrations` and are listed in `AllMigrations`,
which the `DataSource` reads — a filesystem glob would not survive bundling.

Write them against the schema-builder API (`queryRunner.createTable`,
`addColumn`, …) rather than raw SQL. The same migrations run on both SQLite and
MySQL, and TypeORM renders each dialect's DDL from those definitions; raw SQL
would need one set per dialect. Bear in mind the dialects disagree on more than
syntax — SQLite only accepts `AUTOINCREMENT` on a column typed exactly
`INTEGER`, for instance.

## Running the server

npm run build-server && node ./output/server/server.js

### Candidate runtime

Use the same server image for migrations (`MIGRATION_MODE=job`) and serving
(`MIGRATION_MODE=none`). The migration process needs only database settings;
it exits without opening an HTTP listener or loading runtime authentication
and media storage. MySQL bootstrap and normal connections both use
`CONTRIB_DB_SSL_CA`, including hostname and certificate verification.

Serving with `NODE_ENV=production` requires `SUPABASE_URL` and the server-only
`CONTRIB_SERVICE_TOKEN`. The optional `SUPABASE_JWKS_URL` overrides the standard
JWKS endpoint. `VOYAGES_SERVER_URL` selects the matching Django API; data,
publication, and polling requests all use the service token as a bearer token.
Do not expose this credential in frontend configuration.

Set `CONTRIB_MEDIA_BUCKET` and `CONTRIB_MEDIA_PREFIX` together to store media in
private S3 objects. For an isolated candidate, use
`candidates/<slot>/contribute/media/`. AWS credentials come from the SDK's
default provider chain, including EKS Pod Identity. The service needs object
read, write, and delete permissions only within that prefix. No public ACL is
created. Without these two settings, disk-backed storage remains available for
local development and existing single-host deployments. `MEDIA_UPLOAD_FOLDER`
must remain writable for temporary media files and CSV imports.

`GET /media/:mediaId` requires the author's or an editor's bearer token and
returns a private, non-cacheable download. Browser clients should fetch the
bytes with an Authorization header rather than embedding credentials in URLs.

`/health/live` checks the HTTP process; `/health/ready` verifies a database
query. Run one server replica: CSV-import and bulk-approve progress is still
process-local and is lost on restart. Stored contribution records and S3 media
survive process replacement.

Run `npx vitest run`, `npm run build-server`, and
`node tests/authzSmoke.mjs` before deployment. The smoke test uses temporary
storage and a local signing key; it does not contact Supabase or Django.
