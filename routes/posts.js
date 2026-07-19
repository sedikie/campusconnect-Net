const express = require("express");
const pool = require("../config/db");
const { requireAuth } = require("../middleware/auth");
const upload = require("../middleware/upload");
const { uploadBuffer } = require("../config/cloudinary");

const router = express.Router();

// GET /api/groups/:groupId/posts - list posts in a group
router.get("/groups/:groupId/posts", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.id, p.title, p.content, p.media_url, p.media_name, p.media_type, p.created_at,
              u.full_name AS author_name, u.avatar_url AS author_avatar_url,
              (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) AS comment_count
       FROM posts p
       JOIN users u ON u.id = p.user_id
       WHERE p.group_id = $1
       ORDER BY p.created_at DESC`,
      [req.params.groupId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("List posts error:", err);
    res.status(500).json({ error: "Could not load posts for this group." });
  }
});

// POST /api/groups/:groupId/posts - create a post (must be a member of the group)
// Accepts multipart/form-data with an optional "media" file field, plus
// "title" and "content" text fields.
router.post("/groups/:groupId/posts", requireAuth, upload.single("media"), async (req, res) => {
  try {
    const { title, content } = req.body;
    if (!title || !title.trim() || !content || !content.trim()) {
      return res.status(400).json({ error: "Title and content are required." });
    }

    const membership = await pool.query(
      "SELECT id FROM group_members WHERE group_id = $1 AND user_id = $2",
      [req.params.groupId, req.session.userId]
    );

    if (membership.rows.length === 0) {
      return res.status(403).json({ error: "Join this group before posting in it." });
    }

    let mediaUrl = null;
    let mediaName = null;
    let mediaType = null;

    if (req.file) {
      const result = await uploadBuffer(req.file.buffer);
      mediaUrl = result.secure_url;
      mediaName = req.file.originalname;
      mediaType = req.file.mimetype;
    }

    const inserted = await pool.query(
      `INSERT INTO posts (group_id, user_id, title, content, media_url, media_name, media_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [req.params.groupId, req.session.userId, title.trim(), content.trim(), mediaUrl, mediaName, mediaType]
    );

    res.status(201).json({
      id: inserted.rows[0].id,
      title: title.trim(),
      content: content.trim(),
      media_url: mediaUrl,
      media_name: mediaName,
      media_type: mediaType,
      author_name: req.session.fullName,
      comment_count: 0,
    });
  } catch (err) {
    console.error("Create post error:", err);
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({ error: "That file is too large." });
    }
    res.status(500).json({ error: "Could not create this post." });
  }
});

// GET /api/posts/:postId/comments - list comments on a post
router.get("/posts/:postId/comments", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.id, c.content, c.media_url, c.media_name, c.media_type, c.created_at,
              u.full_name AS author_name, u.avatar_url AS author_avatar_url
       FROM comments c
       JOIN users u ON u.id = c.user_id
       WHERE c.post_id = $1
       ORDER BY c.created_at ASC`,
      [req.params.postId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("List comments error:", err);
    res.status(500).json({ error: "Could not load comments." });
  }
});

// POST /api/posts/:postId/comments - add a comment to a post
// Accepts multipart/form-data with an optional "media" file field, plus
// a "content" text field.
router.post("/posts/:postId/comments", requireAuth, upload.single("media"), async (req, res) => {
  try {
    const { content } = req.body;
    const hasFile = !!req.file;
    if ((!content || !content.trim()) && !hasFile) {
      return res.status(400).json({ error: "Comment cannot be empty." });
    }

    let mediaUrl = null;
    let mediaName = null;
    let mediaType = null;

    if (req.file) {
      const result = await uploadBuffer(req.file.buffer);
      mediaUrl = result.secure_url;
      mediaName = req.file.originalname;
      mediaType = req.file.mimetype;
    }

    const inserted = await pool.query(
      `INSERT INTO comments (post_id, user_id, content, media_url, media_name, media_type)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [req.params.postId, req.session.userId, (content || "").trim(), mediaUrl, mediaName, mediaType]
    );

    res.status(201).json({
      id: inserted.rows[0].id,
      content: (content || "").trim(),
      media_url: mediaUrl,
      media_name: mediaName,
      media_type: mediaType,
      author_name: req.session.fullName,
    });
  } catch (err) {
    console.error("Create comment error:", err);
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({ error: "That file is too large." });
    }
    res.status(500).json({ error: "Could not add your comment." });
  }
});

module.exports = router;
