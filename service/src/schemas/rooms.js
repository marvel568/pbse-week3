const roomIdPattern = /^room_[A-Za-z0-9]{3,}$/;

function validateRoomId(id) {
  return typeof id === "string" && roomIdPattern.test(id);
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

  if (query.cursor !== undefined && typeof query.cursor !== "string") {
    errors.push("cursor must be a string");
  }

  return errors;
}

module.exports = { validateRoomId, validateRoomQuery };
