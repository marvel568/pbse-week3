# 0003 — Authentication and access control

## Context

Session 3 deliberately had no authentication. Session 4 adds authentication
and access control on top of the running RoomReservation service without
rewriting its existing contract implementation.

The service has two domain actors with different responsibilities. Students
make and inspect their own reservations. Administrators manage room
availability and need visibility of all reservations. The existing room-status
operation is especially consequential because making a room unavailable
deletes its reservation entries.

## Decision

### Authorization server

The production service will use Auth0, in the `roomreservation-pbse` tenant in
the Australia region, as its authorization server. Auth0 provides a publicly
reachable JWKS endpoint that the Vercel deployment can use to verify signed
access tokens. Refresh-token rotation is enabled with reuse detection and a
zero-second overlap period. Reuse of a rotated refresh token revokes its token
family; this behaviour will be evidenced during the worksheet's refresh-token
test step.

### How tests obtain tokens

Production tokens will not be required in CI. Authentication tests will create
short-lived JWTs locally using a dedicated test signing key and will configure
the service with the matching local JWKS fixture. The test key is separate from
the Auth0 production signing keys and is never used by the deployed service.

This keeps CI deterministic and independent of Auth0 availability, network
access, rate limits, test users, or refresh-token state. The test tokens will
contain the same claims that the service expects from Auth0: a subject (`sub`),
an audience (`aud`), an issuer (`iss`), an expiry (`exp`), and a role claim.

### Domain actors and authorization rules

| Actor | What they do |
|---|---|
| Student | May call `GET /health` and read room information through `GET /v1/rooms` and `GET /v1/rooms/{roomId}`. May create reservations and read reservations. |
| Administrator | May read every reservation through `GET /v1/reservations`, read any individual reservation, and update room status through `PUT /v1/rooms/{roomId}/status`. |

The service will derive the acting identity and role from a verified access
token. It will not trust a client-supplied role header or a `studentId` supplied
only in the request body. When creating a reservation, the authenticated
student identity will be used to enforce ownership.

### Client classification

Every application that requests a token is classified by one question: can
the user read values stored inside this application?

| Our client | Runs on | Public/Confidential | Flow | Holds a secret? |
|---|---|---|---|---|
| Web client (Session 5) | User's browser | Public | Authorization Code + PKCE | No |
| Mobile client (Session 6) | User's device | Public | Authorization Code + PKCE | No |

Rules for public clients:

1. Authorization Code with PKCE, no client secret.
2. The client sends only the hash of a random verifier (the challenge) and
   must present the original verifier at code exchange, so an intercepted
   code alone is useless.
3. `state` is random, stored until the callback, and compared. It protects
   the login-to-callback link, a different problem from the one PKCE solves.
4. Redirect URIs are registered and matched in full, with no wildcards.
5. Tokens never appear in the browser address bar.

Obfuscating or splitting a secret inside a public client does not make it
confidential: the app must reconstruct the value to use it, so a user who
controls the device can read it.

## Alternatives considered

### Cookie-based server sessions

Server-side sessions would require session storage, CSRF protection, and
cookie-specific deployment configuration. They are less suitable for this
JSON API and its independent clients, so bearer access tokens were selected.

### Self-hosted authorization server

The team could host its own token issuer and JWKS endpoint. That would add
security-sensitive infrastructure, key rotation, user management, and
operational work beyond the scope of the worksheet. Auth0 was selected instead.

### Retrieving Auth0 tokens during CI

CI could obtain tokens from Auth0 at test time, but each test run would depend
on an external network service and persistent test-user state. Local test JWTs
and a local JWKS fixture were selected to keep tests reproducible.

### Trusting a role supplied by the client

Accepting a header or request-body field such as `role: admin` would let any
caller grant itself administrative access. Roles must therefore come only from
a token that has passed signature, issuer, audience, and expiry validation.

## Consequences

The service will need authentication configuration for the expected issuer,
audience, JWKS location, and role-claim name. Production configuration will be
provided as environment variables; secrets and private keys will not be
committed to the repository.

Protected endpoints will return `401 Unauthorized` when a token is missing,
expired, malformed, or cannot be verified. They will return `403 Forbidden`
when a verified caller lacks the required role or scope. A reservation that 
does not exist and a reservation that belongs to another student are both 
answered with an identical `404 Not Found`, so identifiers cannot be enumerated. 
These failures will be documented in OpenAPI as Problem Details responses 
and tested in CI.

The current unauthenticated implementation remains temporarily available while
the authentication middleware and tests are introduced. Once enforcement is
added, the student and administrator permissions in this record become the
source of truth for route-level access checks.
