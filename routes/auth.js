const express = require("express");
const bcrypt = require("bcrypt");
const pool = require("../config/db");
const { requireAuth } = require("../middleware/auth");
const upload = require("../middleware/upload");
const { uploadBuffer } = require("../config/cloudinary");

const router = express.Router();

// POST /api/auth/signup
router.post("/signup", async (req, res) => {
  try {
    const { full_name, email, password, programme, campus } = req.body;

    if (!full_name || !email || !password) {
      return res.status(400).json({ error: "Full name, email and password are required." });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters." });
    }

    const existing = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: "An account with that email already exists." });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const inserted = await pool.query(
      `INSERT INTO users (full_name, email, password_hash, programme, campus)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [full_name, email, passwordHash, programme || null, campus || null]
    );

    const newUserId = inserted.rows[0].id;

    req.session.userId = newUserId;
    req.session.fullName = full_name;

    res.status(201).json({
      id: newUserId,
      full_name,
      email,
      programme: programme || null,
      campus: campus || null,
    });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ error: "Something went wrong while creating your account." });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    const result = await pool.query(
      "SELECT id, full_name, email, password_hash, programme, campus, avatar_url FROM users WHERE email = $1",
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Incorrect email or password." });
    }

    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: "Incorrect email or password." });
    }

    req.session.userId = user.id;
    req.session.fullName = user.full_name;

    res.json({
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      programme: user.programme,
      campus: user.campus,
      avatar_url: user.avatar_url,
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Something went wrong while logging in." });
  }
});

// POST /api/auth/logout
router.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Logout error:", err);
      return res.status(500).json({ error: "Could not log out. Please try again." });
    }
    res.clearCookie("connect.sid");
    res.json({ message: "Logged out." });
  });
});

// GET /api/auth/me
router.get("/me", async (req, res) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: "Not logged in." });
  }
  try {
    const result = await pool.query(
      "SELECT id, full_name, email, programme, campus, avatar_url FROM users WHERE id = $1",
      [req.session.userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Not logged in." });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Fetch current user error:", err);
    res.status(500).json({ error: "Could not load your account." });
  }
});

// PATCH /api/auth/avatar - upload/replace the current user's profile picture
router.patch("/avatar", requireAuth, upload.single("avatar"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image was uploaded." });
    }

    const result = await uploadBuffer(req.file.buffer, { folder: "campusconnect/avatars" });

    await pool.query("UPDATE users SET avatar_url = $1 WHERE id = $2", [
      result.secure_url,
      req.session.userId,
    ]);

    res.json({ avatar_url: result.secure_url });
  } catch (err) {
    console.error("Avatar upload error:", err);
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({ error: "That image is too large." });
    }
    res.status(500).json({ error: "Could not update your profile picture." });
  }
});

module.exports = router;
