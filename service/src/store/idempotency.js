async function createIdempotencyKey(db, key, requestHash) {
  await db.execute(
    `INSERT INTO idempotency_keys (idempotency_key, request_hash)
     VALUES (?, ?)`,
    [key, requestHash]
  );
}

async function findIdempotencyKeyForUpdate(db, key) {
  const [rows] = await db.execute(
    `SELECT request_hash AS requestHash,
            response_status AS responseStatus,
            response_body AS responseBody,
            location
       FROM idempotency_keys
      WHERE idempotency_key = ?
      FOR UPDATE`,
    [key]
  );

  return rows[0] || null;
}

async function saveIdempotencyResponse(db, key, { status, body, location }) {
  await db.execute(
    `UPDATE idempotency_keys
        SET response_status = ?, response_body = ?, location = ?
      WHERE idempotency_key = ?`,
    [status, JSON.stringify(body), location, key]
  );
}

module.exports = {
  createIdempotencyKey,
  findIdempotencyKeyForUpdate,
  saveIdempotencyResponse
};
