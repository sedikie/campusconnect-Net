// One-time setup script: creates all the tables in your Postgres database.
// Usage:  node run-schema.js
// Reads DATABASE_URL / DB_SSL from your .env file, same as the app itself.

require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

async function main() {
  const schemaPath = path.join(__dirname, "database", "schema.sql");
  const schemaSql = fs.readFileSync(schemaPath, "utf8");

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
  });

  console.log("Connecting to database...");
  await client.connect();

  console.log("Running schema.sql...");
  await client.query(schemaSql);

  console.log("Done! Tables created: users, groups, group_members, posts, comments.");
  await client.end();
}

main().catch((err) => {
  console.error("Failed to set up the database:");
  console.error(err);
  process.exit(1);
});
