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
safe to run on every deploy:

```
npm run tools -- migrate                    # apply anything pending
npm run tools -- migrate --status           # what is applied, what is not
npm run tools -- migrate --check            # exit 1 if anything is pending
npm run tools -- migrate --create-database  # MySQL only, see below
```

`--check` is the one for CI: it fails when the schema is behind the code,
rather than leaving it to surface at runtime.

SQLite creates its file on connect, so `migrate` alone is enough to go from
nothing to a working database. MySQL will not connect to a database that does
not exist and TypeORM will not create one, so a first run there needs
`--create-database`.

Running `migrate` against a database built by an older version of this server,
when `synchronize` still created the schema, records the initial migration
without touching the existing tables.

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