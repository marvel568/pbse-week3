function sendProblem(res, { status, type, title, detail, instance, ...extensions }) {
  res
    .status(status)
    .type("application/problem+json")
    .json({
      type,
      title,
      status,
      ...(detail !== undefined ? { detail } : {}),
      ...(instance !== undefined ? { instance } : {}),
      ...extensions
    });
}

module.exports = { sendProblem };
