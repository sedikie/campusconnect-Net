-- CampusConnect database schema (PostgreSQL)
-- Run this once against your Postgres database, e.g.:
--   psql "<your DATABASE_URL>" -f database/schema.sql
-- (Render gives you a ready-made connection command in its dashboard —
-- see the deployment steps in README.md.)

-- ---------------------------------------------------------------
-- Users
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id            SERIAL PRIMARY KEY,
    full_name     VARCHAR(100)  NOT NULL,
    email         VARCHAR(150)  NOT NULL UNIQUE,
    password_hash VARCHAR(255)  NOT NULL,
    programme     VARCHAR(100),
    campus        VARCHAR(100),
    avatar_url    VARCHAR(500),
    created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------
-- Groups (forums / communities)
-- "groups" is a reserved-ish word in some contexts, so it's quoted
-- consistently everywhere it's used in the queries below.
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "groups" (
    id            SERIAL PRIMARY KEY,
    name          VARCHAR(120)  NOT NULL,
    description   VARCHAR(500),
    category      VARCHAR(80)   NOT NULL DEFAULT 'General',
    created_by    INTEGER       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------
-- Group membership (many-to-many between users and groups)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS group_members (
    id         SERIAL PRIMARY KEY,
    group_id   INTEGER NOT NULL REFERENCES "groups"(id) ON DELETE CASCADE,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (group_id, user_id)
);

-- ---------------------------------------------------------------
-- Posts (forum threads within a group)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS posts (
    id          SERIAL PRIMARY KEY,
    group_id    INTEGER NOT NULL REFERENCES "groups"(id) ON DELETE CASCADE,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title       VARCHAR(200) NOT NULL,
    content     TEXT NOT NULL,
    media_url   VARCHAR(500),
    media_name  VARCHAR(255),
    media_type  VARCHAR(100),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------
-- Comments (replies to posts)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS comments (
    id          SERIAL PRIMARY KEY,
    post_id     INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content     TEXT NOT NULL,
    media_url   VARCHAR(500),
    media_name  VARCHAR(255),
    media_type  VARCHAR(100),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------
-- Migration: add media/avatar columns if this schema was already
-- applied before the media-upload feature existed. Safe to re-run.
-- ---------------------------------------------------------------
ALTER TABLE users   ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500);
ALTER TABLE posts    ADD COLUMN IF NOT EXISTS media_url  VARCHAR(500);
ALTER TABLE posts    ADD COLUMN IF NOT EXISTS media_name VARCHAR(255);
ALTER TABLE posts    ADD COLUMN IF NOT EXISTS media_type VARCHAR(100);
ALTER TABLE comments ADD COLUMN IF NOT EXISTS media_url  VARCHAR(500);
ALTER TABLE comments ADD COLUMN IF NOT EXISTS media_name VARCHAR(255);
ALTER TABLE comments ADD COLUMN IF NOT EXISTS media_type VARCHAR(100);
