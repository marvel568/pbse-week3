# 0002 - Implementation Decisions

## Context

The RoomReservation service is implemented according to the API contract defined in `openapi.yaml`. The service requires database configuration, persistent storage for idempotency keys, and deployment to a hosting provider.

Configuration values are provided through environment variables so that local, CI, and production environments can use different settings without modifying the source code. Sensitive values such as the database password are not committed to the repository.

## Decision

The service uses Node.js with Express and MySQL.

The following environment variables are used by the service:

* `DB_HOST`
* `DB_PORT`
* `DB_NAME`
* `DB_USER`
* `DB_PASSWORD`
* `PORT`

The file `service/.env.example` is committed as a configuration template, while the real `service/.env` file is excluded through `.gitignore`.

Idempotency keys for `POST /v1/reservations` are stored persistently in the MySQL `idempotency_keys` table. The table stores the idempotency key, request hash, response status, response body, location, and creation time.

A `GET /health` endpoint is provided and returns HTTP 200 without checking the database or another external dependency.

The hosting provider used for deployment is **[YOUR HOSTING PROVIDER]**.

The public service URL is **[YOUR PUBLIC URL]**.

## Alternatives considered

### In-memory idempotency storage

Idempotency keys could be stored in the Node.js process memory. This would be simpler to implement, but all stored keys would be lost when the service restarts. This was therefore not selected.

### Database idempotency storage

Idempotency keys are stored in MySQL using the `idempotency_keys` table. This provides persistence across service restarts and was selected for the implementation.

### Committing `.env` to the repository

The real `.env` file could contain the database configuration directly in the repository. This was rejected because it could expose database credentials through version control.

### Environment variables

Environment variables were selected because they allow configuration and secrets to be supplied separately for local development, CI, and production without committing secrets to the repository.

## Consequences

Using environment variables keeps deployment configuration separate from the application source code and prevents database credentials from being committed to the repository.

Using MySQL for idempotency storage introduces a database dependency, but provides persistence across service restarts.

The `/health` endpoint can verify that the HTTP service is responding without depending on database availability.

Deploying the service provides a public URL that can be used to perform the required external API checks.

No changes are made to the required application directory structure. The decision record is added under `docs/decisions/0002-implementasi.md` as project documentation.
