# Service — RoomReservation API

Implementation of the contract in `../openapi.yaml`.

## Operations (A.3)

| Operation | Served by | Remaining work |
|---|---|---|
| `GET /v1/rooms/{roomId}` | service | — |
| `GET /v1/rooms` | service | `cursor` pagination not yet implemented (only `status` and `limit` are honoured) |
| `POST /v1/reservations` | service | Idempotency-key replay/dedup storage not yet implemented (A.8) — the header is validated and required, but a repeated key with the same body is not yet detected and short-circuited |

## Failure catalogue (A.6.2)

Every row below is produced by `sendProblem()` in `src/problem.js`, and every
`status`/`type` pair here is also declared on the relevant operation in
`openapi.yaml`.

| Cause (in handler) | Status | Type URI |
|---|---|---|
| `roomId` path parameter doesn't match the id pattern | 400 | `https://api.example.com/problems/malformed-request` |
| `status`/`limit`/`cursor` query parameter invalid | 400 | `https://api.example.com/problems/malformed-request` |
| `Idempotency-Key` header missing or not a UUID | 400 | `https://api.example.com/problems/malformed-request` |
| Reservation body missing/mistyped fields | 400 | `https://api.example.com/problems/malformed-request` |
| Room identifier not found (`GET /rooms/{roomId}`) | 404 | `https://api.example.com/problems/not-found` |
| `endTime` not after `startTime` | 422 | `https://api.example.com/problems/validation-failed` |
| `roomId` well-formed but doesn't reference an existing room (create) | 422 | `https://api.example.com/problems/validation-failed` |
| Room exists but `isAvailable = false` | 409 | `https://api.example.com/problems/outlet-closed` |
| Overlapping active/confirmed reservation on the room | 409 | `https://api.example.com/problems/reservation-conflict` |
| Uncaught exception anywhere in the app | 500 | `https://api.example.com/problems/internal-error` |

## Running locally

\```
cp .env.example .env    # then fill in real DB credentials
npm install
mysql < db/schema.sql
mysql < db/seed.sql
npm start
\```

## Restart-persistence check (A.7.1)

\```
# 1. create a few reservations via curl
# 2. stop the process (Ctrl+C)
# 3. start it again: npm start
# 4. GET the same reservations - they must still be there
\```
