# CampusConnect

A web platform for students to meet, share resources, and discuss — built with
HTML/CSS/JavaScript on the front end, Node.js (Express) on the back end, and
PostgreSQL for storage. This is the working prototype for the "CampusConnect"
project proposal (CODS 223).

## Features in this version

- Sign up / log in / log out (passwords hashed with bcrypt, session-based auth)
- Browse, create, and join groups (by course, department, or interest)
- Post discussions inside a group
- Comment on posts (threaded replies)
- Attach any file (image, PDF, document, etc.) to a post or comment
- Upload a profile picture

## 1. Prerequisites

You need these installed on your computer:

- **Node.js** (v18 or newer) — [nodejs.org](https://nodejs.org)
- **A PostgreSQL database** — this project is set up to use a free hosted
  database on [Render](https://render.com) rather than a local Postgres
  install (see the deployment section below), so you don't need Postgres
  installed on your own machine at all.
- **A free Cloudinary account** — [cloudinary.com](https://cloudinary.com) —
  used to store any files/images attached to posts, comments, and profile
  pictures. After signing up, your **Cloud Name**, **API Key**, and
  **API Secret** are shown right on your dashboard home page.

Check versions:
```bash
node -v
```

## 2. Set up the database

Run the schema file against your Postgres database using `psql`, or paste its
contents into your database host's SQL console (Render's dashboard has a
"Connect" → shell option that works well for this):

```bash
psql "<your DATABASE_URL>" -f database/schema.sql
```

This creates the `users`, `groups`, `group_members`, `posts`, and `comments`
tables.

## 3. Configure environment variables

Copy the example file and fill in your real database connection string:

```bash
cp .env.example .env
```

Open `.env` and set:
- `DATABASE_URL` — the full connection string from your Postgres host (e.g.
  Render's "External Database URL"), in the form
  `postgres://user:password@host/dbname`
- `DB_SSL=true` — required for Render's managed Postgres
- `SESSION_SECRET` — any long random string, used to sign login sessions
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` —
  from your Cloudinary dashboard

## 4. Install dependencies

```bash
npm install
```

## 5. Run the app

```bash
npm start
```

You should see:
```
CampusConnect server running at http://localhost:3000
Connected to PostgreSQL.
```

Open **http://localhost:3000** in your browser. Create an account, create or join a
group, and start posting.

For development (auto-restarts on file changes):
```bash
npm run dev
```

## Project structure

```
campusconnect/
  server.js            Express app entry point
  config/db.js          PostgreSQL connection pool
  middleware/auth.js     Login-required route guard
  routes/auth.js         Signup, login, logout, current user
  routes/groups.js       List, create, join, leave groups
  routes/posts.js        Posts and comments inside a group
  database/schema.sql    Full PostgreSQL schema (users, groups, posts, comments)
  public/                Front-end (HTML, CSS, JS) — served as static files
    index.html            Landing page
    signup.html / login.html
    dashboard.html         Browse / create / join groups
    group.html             Forum view for a single group
```

## How the pieces connect

1. The front-end pages in `public/` call the JSON API under `/api/...` using
   `fetch` (see `public/js/main.js`'s `api()` helper).
2. Express routes in `routes/` talk to PostgreSQL through the shared
   connection pool in `config/db.js` (built on the `pg` package).
3. Login state is kept in a server-side session (`express-session`), stored in a
   cookie in the browser. `middleware/auth.js` blocks actions like posting or
   creating a group unless the session has a logged-in user.

## Next steps (beyond this prototype)

These were listed as future scope in the project proposal and are natural next
additions:
- Real-time private/group messaging
- File upload and sharing on posts (not just text)
- Search across groups, posts, and users
- Admin dashboard for content moderation
- Deploying the app itself to a live host (see below — the database side of
  this is already set up)

## Deploying it live

1. Create a free **PostgreSQL** database on [Render](https://render.com)
   (Dashboard → New + → PostgreSQL → Free instance type). Copy its
   **External Database URL**.
2. Run `database/schema.sql` against that database (see Step 2 above).
3. Push this project to a GitHub repository.
4. In Render, create a **Web Service** from that GitHub repo.
   - Build command: `npm install`
   - Start command: `npm start`
5. In the Web Service's **Environment** tab, add the same variables from your
   `.env` file: `DATABASE_URL`, `DB_SSL=true`, `SESSION_SECRET`, and leave
   `PORT` unset (Render sets this automatically).
6. Deploy — Render gives you a public URL like
   `https://campusconnect.onrender.com` that works from anywhere.
