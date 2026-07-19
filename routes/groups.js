const express = require("express");
const pool = require("../config/db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// GET /api/groups - list all groups, with member count and whether the current user has joined
router.get("/", async (req, res) => {
  try {
    const currentUserId = req.session?.userId || 0;

    const result = await pool.query(
      `SELECT g.id, g.name, g.description, g.category, g.created_at,
              u.full_name AS created_by_name,
              COUNT(DISTINCT gm.id) AS member_count,
              MAX(CASE WHEN gm.user_id = $1 THEN 1 ELSE 0 END) AS joined
       FROM "groups" g
       JOIN users u ON u.id = g.created_by
       LEFT JOIN group_members gm ON gm.group_id = g.id
       GROUP BY g.id, g.name, g.description, g.category, g.created_at, u.full_name
       ORDER BY g.created_at DESC`,
      [currentUserId]
    );

    res.json(result.rows.map((r) => ({ ...r, joined: Number(r.joined) === 1 })));
  } catch (err) {
    console.error("List groups error:", err);
    res.status(500).json({ error: "Could not load groups." });
  }
});

// GET /api/groups/:id - single group detail
router.get("/:id", async (req, res) => {
  try {
    const currentUserId = req.session?.userId || 0;

    const result = await pool.query(
      `SELECT g.id, g.name, g.description, g.category, g.created_at,
              u.full_name AS created_by_name,
              COUNT(DISTINCT gm.id) AS member_count,
              MAX(CASE WHEN gm.user_id = $1 THEN 1 ELSE 0 END) AS joined
       FROM "groups" g
       JOIN users u ON u.id = g.created_by
       LEFT JOIN group_members gm ON gm.group_id = g.id
       WHERE g.id = $2
       GROUP BY g.id, g.name, g.description, g.category, g.created_at, u.full_name`,
      [currentUserId, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Group not found." });
    }
    const row = result.rows[0];
    res.json({ ...row, joined: Number(row.joined) === 1 });
  } catch (err) {
    console.error("Get group error:", err);
    res.status(500).json({ error: "Could not load this group." });
  }
});

// POST /api/groups - create a new group (creator is auto-joined)
router.post("/", requireAuth, async (req, res) => {
  const { name, description, category } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: "Group name is required." });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const groupResult = await client.query(
      `INSERT INTO "groups" (name, description, category, created_by)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [name.trim(), description || null, category || "General", req.session.userId]
    );

    const newGroupId = groupResult.rows[0].id;

    await client.query(
      "INSERT INTO group_members (group_id, user_id) VALUES ($1, $2)",
      [newGroupId, req.session.userId]
    );

    await client.query("COMMIT");
    res.status(201).json({
      id: newGroupId,
      name,
      description,
      category: category || "General",
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Create group error:", err);
    res.status(500).json({ error: "Could not create the group." });
  } finally {
    client.release();
  }
});

// POST /api/groups/:id/join - join a group
router.post("/:id/join", requireAuth, async (req, res) => {
  try {
    const groupRows = await pool.query('SELECT id FROM "groups" WHERE id = $1', [req.params.id]);

    if (groupRows.rows.length === 0) {
      return res.status(404).json({ error: "Group not found." });
    }

    // ON CONFLICT DO NOTHING = Postgres's equivalent of MySQL's INSERT IGNORE,
    // relying on the UNIQUE (group_id, user_id) constraint from the schema.
    await pool.query(
      `INSERT INTO group_members (group_id, user_id)
       VALUES ($1, $2)
       ON CONFLICT (group_id, user_id) DO NOTHING`,
      [req.params.id, req.session.userId]
    );

    res.json({ message: "Joined group." });
  } catch (err) {
    console.error("Join group error:", err);
    res.status(500).json({ error: "Could not join this group." });
  }
});

// POST /api/groups/:id/leave - leave a group
router.post("/:id/leave", requireAuth, async (req, res) => {
  try {
    await pool.query(
      "DELETE FROM group_members WHERE group_id = $1 AND user_id = $2",
      [req.params.id, req.session.userId]
    );

    res.json({ message: "Left group." });
  } catch (err) {
    console.error("Leave group error:", err);
    res.status(500).json({ error: "Could not leave this group." });
  }
});

module.exports = router;
