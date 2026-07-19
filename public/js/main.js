// Small fetch wrapper that always sends/receives JSON and cookies
async function api(path, options = {}) {
  const res = await fetch(`/api${path}`, {
    method: options.method || "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  let data = null;
  try {
    data = await res.json();
  } catch (e) {
    // no body
  }

  if (!res.ok) {
    throw new Error((data && data.error) || "Something went wrong.");
  }
  return data;
}

// Like api(), but sends a FormData body (multipart/form-data) instead of
// JSON — used anywhere a file might be attached (posts, comments, avatar).
// Do NOT set a Content-Type header here: the browser sets it itself,
// including the multipart boundary string, which we can't set by hand.
async function apiUpload(path, formData, method = "POST") {
  const res = await fetch(`/api${path}`, {
    method,
    credentials: "include",
    body: formData,
  });

  let data = null;
  try {
    data = await res.json();
  } catch (e) {
    // no body
  }

  if (!res.ok) {
    throw new Error((data && data.error) || "Something went wrong.");
  }
  return data;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str == null ? "" : String(str);
  return div.innerHTML;
}

function timeAgo(dateStr) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

// Renders a small circular avatar image, or a fallback initial-letter
// badge if the user has no avatar_url set yet.
function avatarHtml(user, size = 28) {
  const style = `width:${size}px;height:${size}px;border-radius:50%;object-fit:cover;vertical-align:middle;`;
  if (user && user.avatar_url) {
    return `<img src="${escapeHtml(user.avatar_url)}" alt="" style="${style}" />`;
  }
  const initial = user && user.full_name ? user.full_name.trim()[0].toUpperCase() : "?";
  return `<span style="${style}display:inline-flex;align-items:center;justify-content:center;background:var(--gold);color:#2A2010;font-weight:700;font-size:${Math.round(
    size * 0.45
  )}px;">${initial}</span>`;
}

// Populate the nav bar based on whether someone is logged in.
// Any page including main.js can call this; it no-ops if #nav-auth isn't present.
async function initNav() {
  const slot = document.getElementById("nav-auth");
  if (!slot) return;

  try {
    const user = await api("/auth/me");
    slot.innerHTML = `
      <label class="nav-avatar" style="cursor:pointer;display:inline-flex;align-items:center;gap:8px;" title="Click to change your profile picture">
        ${avatarHtml(user)}
        <input type="file" id="avatar-input" accept="image/*" style="display:none;" />
      </label>
      <span class="nav-user">${escapeHtml(user.full_name)}</span>
      <a href="/dashboard.html">Dashboard</a>
      <button class="link-btn" id="logout-btn">Log out</button>
    `;
    document.getElementById("logout-btn").addEventListener("click", async () => {
      await api("/auth/logout", { method: "POST" });
      window.location.href = "/index.html";
    });

    document.getElementById("avatar-input").addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const fd = new FormData();
        fd.append("avatar", file);
        await apiUpload("/auth/avatar", fd, "PATCH");
        // Reload so every avatar reference on the page (nav, posts, etc.) updates.
        window.location.reload();
      } catch (err) {
        alert(err.message || "Could not update your profile picture.");
      }
    });
  } catch (e) {
    slot.innerHTML = `
      <a href="/login.html">Log in</a>
      <a href="/signup.html" class="btn btn-gold btn-small">Sign up</a>
    `;
  }
}

document.addEventListener("DOMContentLoaded", initNav);
