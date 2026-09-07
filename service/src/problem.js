function problem(type, title, status, detail, instance) {
  return {
    type,
    title,
    status,
    ...(detail ? { detail } : {}),
    ...(instance ? { instance } : {})
  };
}

module.exports = { problem };
