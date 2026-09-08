# Changelog

All notable changes to `openapi.yaml` are recorded here

## 0.2.1 — Session 3 (Part A)

### Changed
- Clarified that a `409` response from `POST /v1/reservations` includes
  `https://api.example.com/problems/idempotency-key-reuse` when a client
  sends a different request body with an already-used `Idempotency-Key`.

### Why this is a contract clarification
The Session 2 idempotency rules require a distinct `409` outcome for key
reuse with a different body. A.8 implements that outcome server-side, so the
shared conflict response documentation now names it explicitly.

## 0.2.0 — Session 3 (Part A)

### Changed
- `POST /v1/reservations` now accepts a `NewReservation` request body
  containing only the fields the client actually supplies: `roomId`,
  `studentId`, `startTime`, `endTime`. The previous version reused the full
  `Reservation` schema as the request body, which meant the contract required
  the client to send `id`, `status`, and `createdAt` on every create request —
  values the server is supposed to fill in (see A.5.4). The response body is
  unchanged and still returns the full `Reservation` representation.
- Added a `400` response to `POST /v1/reservations`. The endpoint can reject a
  missing/malformed `Idempotency-Key` header or a structurally invalid body
  before doing any work, but that response was undocumented.

### Why this is a contract fix, not an implementation-only fix
Per Rule 0.1: if the implementation doesn't match a correct contract, fix the
implementation; if the contract itself is wrong, revise it deliberately and
record why. Implementing A.5 surfaced that the write endpoint's own contract
disagreed with its own stated design (A.5.4 says the server fills in
server-owned fields; the requestBody schema said the client must supply them).
That is a defect in the document, not in the code that was written against it,
so the fix belongs here, with a version bump, rather than being patched around
silently in the handler.

## 0.1.0 — Session 2 (Part B)
Initial contract: `Rooms`, `Reservation` schemas; `GET /rooms/{roomId}`,
`GET /rooms`, `POST /reservations`.
