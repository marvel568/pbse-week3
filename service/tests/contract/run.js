const assert = require("node:assert/strict");
const fs = require("node:fs");

const BASE_URL = process.env.BASE_URL || "http://localhost:8080";
const API = `${BASE_URL}/v1`;

async function request(path, options = {}) {
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      Accept: "application/json, application/problem+json",
      ...(options.headers || {})
    }
  });

  let body = null;
  const text = await response.text();

  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  return { response, body };
}

function assertProblem(result, expectedStatus) {
  assert.equal(
    result.response.status,
    expectedStatus,
    `Expected HTTP ${expectedStatus}, got ${result.response.status}`
  );

  assert.match(
    result.response.headers.get("content-type") || "",
    /application\/problem\+json/i,
    "Error responses must use application/problem+json"
  );

  assert.equal(typeof result.body, "object");
  assert.equal(result.body.status, expectedStatus);
  assert.equal(typeof result.body.type, "string");
  assert.equal(typeof result.body.title, "string");
}

async function testListRooms() {
  const result = await request("/rooms");

  assert.equal(result.response.status, 200);
  assert.match(
    result.response.headers.get("content-type") || "",
    /application\/json/i
  );

  assert.equal(typeof result.body, "object");
  assert.ok(Array.isArray(result.body.items));

  for (const room of result.body.items) {
    assert.equal(typeof room.id, "string");
    assert.equal(typeof room.roomNumber, "string");
    assert.equal(typeof room.capacity, "number");
    assert.equal(typeof room.location, "string");
    assert.equal(typeof room.isAvailable, "boolean");
  }

  console.log("✓ GET /v1/rooms");
}

async function testListRoomsWithLimit() {
  const result = await request("/rooms?limit=1");

  assert.equal(result.response.status, 200);
  assert.ok(Array.isArray(result.body.items));
  assert.ok(result.body.items.length <= 1);

  console.log("✓ GET /v1/rooms?limit=1");
}

function reservationBody(overrides = {}) {
  return {
    roomId: "room_B77",
    studentId: "s7654321",
    startTime: "2026-11-01T10:00:00+07:00",
    endTime: "2026-11-01T12:00:00+07:00",
    ...overrides
  };
}

async function createReservation(key, body = reservationBody()) {
  return request("/reservations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": key
    },
    body: JSON.stringify(body)
  });
}

async function testRoomCursorPagination() {
  const firstPage = await request("/rooms?limit=1");

  assert.equal(firstPage.response.status, 200);
  assert.equal(firstPage.body.items.length, 1);
  assert.equal(typeof firstPage.body.nextCursor, "string");

  const secondPage = await request(
    `/rooms?limit=1&cursor=${encodeURIComponent(firstPage.body.nextCursor)}`
  );

  assert.equal(secondPage.response.status, 200);
  assert.equal(secondPage.body.items.length, 1);
  assert.notEqual(secondPage.body.items[0].id, firstPage.body.items[0].id);

  console.log("GET /v1/rooms cursor pagination");
}

async function testInvalidCursor() {
  const result = await request("/rooms?cursor=not-a-cursor");

  assertProblem(result, 400);

  console.log("GET /v1/rooms invalid cursor -> 400");
}

async function testInvalidLimit() {
  const result = await request("/rooms?limit=0");

  assertProblem(result, 400);

  console.log("✓ GET /v1/rooms?limit=0 → 400");
}

async function testRoomNotFound() {
  const result = await request("/rooms/room_DOES_NOT_EXIST");

  assertProblem(result, 404);

  console.log("✓ GET /v1/rooms/{roomId} → 404");
}

async function testInvalidRoomId() {
  const result = await request("/rooms/not-a-valid-room-id");

  assertProblem(result, 400);

  console.log("✓ GET /v1/rooms/{roomId} invalid ID → 400");
}

async function testRoomStatusFilters() {
  const maintenance = await request("/rooms?status=maintenance");
  const reserved = await request("/rooms?status=reserved");

  assert.equal(maintenance.response.status, 200);
  assert.deepEqual(maintenance.body.items.map((room) => room.id), ["room_A12"]);
  assert.equal(maintenance.body.items[0].isAvailable, false);
  assert.equal(reserved.response.status, 200);
  assert.deepEqual(reserved.body.items.map((room) => room.id), ["room_X91"]);
  assert.equal(reserved.body.items[0].isAvailable, false);

  console.log("GET /v1/rooms status filters");
}

async function testMalformedJson() {
  const result = await request("/reservations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{"
  });

  assertProblem(result, 400);

  console.log("POST /v1/reservations malformed JSON -> 400");
}

async function testReservationRequiresIdempotencyKey() {
  const result = await request("/reservations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      roomId: "room_7Kq",
      studentId: "s1234567",
      startTime: "2026-09-10T10:00:00+07:00",
      endTime: "2026-09-10T12:00:00+07:00"
    })
  });

  assertProblem(result, 400);

  console.log("✓ POST /v1/reservations without Idempotency-Key → 400");
}

async function testReservationValidation() {
  const invalidTimestamp = await createReservation(
    "00000000-0000-4000-8000-000000000001",
    reservationBody({ startTime: "2026-02-30T10:00:00+07:00" })
  );
  assertProblem(invalidTimestamp, 400);

  const invalidTimeRange = await createReservation(
    "00000000-0000-4000-8000-000000000002",
    reservationBody({ endTime: "2026-11-01T09:00:00+07:00" })
  );
  assertProblem(invalidTimeRange, 422);

  const unknownRoom = await createReservation(
    "00000000-0000-4000-8000-000000000003",
    reservationBody({ roomId: "room_Z99" })
  );
  assertProblem(unknownRoom, 422);

  console.log("POST /v1/reservations validation -> 400 and 422");
}

async function testReservationConflicts() {
  const unavailableRoom = await createReservation(
    "00000000-0000-4000-8000-000000000004",
    reservationBody({ roomId: "room_A12" })
  );
  assertProblem(unavailableRoom, 409);

  const overlappingReservation = await createReservation(
    "00000000-0000-4000-8000-000000000005",
    reservationBody({
      roomId: "room_7Kq",
      startTime: "2026-09-10T10:30:00+07:00",
      endTime: "2026-09-10T11:30:00+07:00"
    })
  );
  assertProblem(overlappingReservation, 409);

  console.log("POST /v1/reservations domain conflicts -> 409");
}

async function testCreateReadAndIdempotency() {
  const key = "00000000-0000-4000-8000-000000000006";
  const created = await createReservation(key);

  assert.equal(created.response.status, 201);
  assert.match(created.response.headers.get("location") || "", /^\/v1\/reservations\/res_/);
  assert.equal(created.body.status, "confirmed");
  assert.equal(typeof created.body.createdAt, "string");

  const read = await request(created.response.headers.get("location"));
  assert.equal(read.response.status, 200);
  assert.deepEqual(read.body, created.body);

  const replay = await createReservation(key);
  assert.equal(replay.response.status, 201);
  assert.equal(replay.response.headers.get("location"), created.response.headers.get("location"));
  assert.deepEqual(replay.body, created.body);

  const reusedKey = await createReservation(
    key,
    reservationBody({ studentId: "s7654322" })
  );
  assertProblem(reusedKey, 409);

  if (process.env.PERSISTENCE_ID_FILE) {
    fs.writeFileSync(process.env.PERSISTENCE_ID_FILE, created.body.id, "utf8");
  }

  console.log("POST /v1/reservations create, read, and idempotency");
}

async function main() {
  console.log(`Running contract tests against ${BASE_URL}`);

  await testListRooms();
  await testListRoomsWithLimit();
  await testRoomCursorPagination();
  await testInvalidLimit();
  await testInvalidCursor();
  await testRoomNotFound();
  await testInvalidRoomId();
  await testRoomStatusFilters();
  await testMalformedJson();
  await testReservationRequiresIdempotencyKey();
  await testReservationValidation();
  await testReservationConflicts();
  await testCreateReadAndIdempotency();

  console.log("\nContract tests passed.");
}

main().catch((error) => {
  console.error("\nContract tests failed.");
  console.error(error.message);
  process.exit(1);
});
