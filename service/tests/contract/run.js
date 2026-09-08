const assert = require("node:assert/strict");

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

async function main() {
  console.log(`Running contract tests against ${BASE_URL}`);

  await testListRooms();
  await testListRoomsWithLimit();
  await testInvalidLimit();
  await testRoomNotFound();
  await testInvalidRoomId();
  await testReservationRequiresIdempotencyKey();

  console.log("\nContract tests passed.");
}

main().catch((error) => {
  console.error("\nContract tests failed.");
  console.error(error.message);
  process.exit(1);
});
