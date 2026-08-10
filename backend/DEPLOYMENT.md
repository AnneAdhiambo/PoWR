# Vendor-neutral backend deployment

PoWR does not require a provider-specific release hook.

## Required environment

- `DATABASE_URL`: PostgreSQL connection string
- `PORT`: HTTP port exposed by the platform (defaults to `3001`)
- The remaining application secrets required by the API

## Build

```sh
npm ci
npm run build
```

The build step never connects to or modifies the database.

## Start

```sh
npm run start:production
```

This command applies pending migrations and starts the API only after the
database is ready. Migrations are idempotent and protected by a PostgreSQL
advisory lock, so concurrent container starts are safe.

## Docker

The included Dockerfile already uses `npm run start:production`. Any platform
that honors the image's default command needs no custom deployment command.

## Platforms with release phases

A provider may optionally run the commands separately:

```sh
npm run migrate:prod
npm run start
```

This is an optimization, not a requirement.
