require("dotenv").config();

const express = require("express");
const mysql = require("mysql2/promise");
const { createRoomRouter } = require("./routes/rooms");
const { createReservationRouter } = require("./routes/reservations");

function requiredConfig() {
  const required = ["DB_HOST", "DB_PORT", "DB_NAME", "DB_USER"];
  for (const name of required) {
    if (!process.env[name]) {
      throw new Error(`Missing required environment variable: ${name}`);
    }
  }
}

function createApp(db) {
  const app = express();

  app.use(express.json());

  app.use("/v1/rooms", createRoomRouter(db));
  app.use("/v1/reservations", createReservationRouter(db));

  app.use((err, req, res, next) => {
    console.error(err);
    if (res.headersSent) return next(err);

    res.status(500).json({
      type: "https://api.example.com/problems/internal-error",
      title: "Internal server error",
      status: 500,
      detail: "An unexpected error occurred.",
      instance: req.originalUrl
    });
  });

  return app;
}

async function start() {
  requiredConfig();

  const db = await mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD || "",
    waitForConnections: true,
    connectionLimit: 10
  });

  const app = createApp(db);
  const port = Number(process.env.PORT || 8080);

  app.listen(port, () => {
    console.log(`RoomReservation API listening on port ${port}`);
  });
}

if (require.main === module) {
  start().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { createApp, requiredConfig };
