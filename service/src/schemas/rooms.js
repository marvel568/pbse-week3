const roomIdPattern = /^room_[A-Za-z0-9]{3,}$/;

function validateRoomId(id) {
  return typeof id === "string" && roomIdPattern.test(id);
}

function decodeCursor(cursor) {
  if (typeof cursor !== "string" || cursor.length === 0) return null;

  try {
    const decoded = Buffer.from(cursor, "base64url").toString("utf8");
    const value = JSON.parse(decoded);

    if (
      !Number.isSafeInteger(value?.o) ||
      value.o < 0 ||
      Object.keys(value).length !== 1 ||
      encodeCursor(value.o) !== cursor
    ) {
      return null;
    }

    return value.o;
  } catch {
    return null;
  }
}

function encodeCursor(offset) {
  return Buffer.from(JSON.stringify({ o: offset })).toString("base64url");
}

function validateRoomQuery(query) {
  const errors = [];

  if (query.status !== undefined &&
      !["available", "reserved", "maintenance"].includes(query.status)) {
    errors.push("status must be available, reserved, or maintenance");
  }

  if (query.limit !== undefined) {
    const limit = Number(query.limit);
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      errors.push("limit must be an integer between 1 and 100");
    }
  }

  if (query.cursor !== undefined && decodeCursor(query.cursor) === null) {
    errors.push("cursor must be an opaque cursor returned by this API");
  }

  return errors;
}

function validateRoomStatusUpdate(body) {
  // Reject non-object bodies before reading their status property.
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return "Request body must be an object containing status.";
  }

  // Reject omitted, misspelled, or extra fields that are outside the contract.
  if (Object.keys(body).length !== 1 || !("status" in body)) {
    return "Request body must contain only the status field.";
  }

  // Limit updates to the three room states declared by the contract.
  if (!["available", "maintenance", "reserved"].includes(body.status)) {
    return "status must be available, maintenance, or reserved.";
  }

  return null;
}

module.exports = {
  validateRoomId,
  validateRoomQuery,
  validateRoomStatusUpdate,
  decodeCursor,
  encodeCursor
};
