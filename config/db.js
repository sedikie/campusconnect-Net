const { Pool } = require("pg");
require("dotenv").config();

// Render (and most Postgres hosts) give you a single connection string
// like: postgres://user:password@host:5432/dbname
// Put that whole string in DATABASE_URL in your .env / Render dashboard.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.DB_SSL === "true"
      ? { rejectUnauthorized: false } // needed for Render's managed Postgres
      : false,
});

pool
  .connect()
  .then((client) => {
    console.log("Connected to PostgreSQL.");
    client.release();
  })
  .catch((err) => {
    console.error("Database connection failed:", err);
  });

module.exports = pool;
