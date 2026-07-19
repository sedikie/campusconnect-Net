const params = new URLSearchParams(window.location.search);
const groupId = params.get("id");

if (!groupId) {
  window.location.href = "/dashboard.html";
  throw new Error("No group id in URL — redirecting to dashboard.");
}

async function guardAuth() {
  try {
    await api("/auth/me");
  } catch (e) {
    window.location.href = "/login.html";
  }
}

async function loadGroup() {
  const group = await api(`/groups/${groupId}`);
  document.getElementById("group-name").textContent = group.name;
  document.getElementById("group-desc").textContent = group.description || "No description yet.";
  document.getElementById("group-meta").textContent =
    `${group.category} · ${group.member_count} member${group.member_count == 1 ? "" : "s"}`;

  const composer = document.getElementById("composer");
  if (!group.joined) {
    composer.innerHTML = `<summary>Join this group to start posting</summary>
      <div class="composer-body">
        <button class="btn btn-primary" id="join-to-post">Join group</button>
      </div>`;
    composer.open = true;
    document.getElementById("join-to-post").addEventListener("click", async (e) => {
      e.target.disabled = true;
      e.target.textContent = "Joining…";
      await api(`/groups/${groupId}/join`, { method: "POST" });
      window.location.reload();
    });
  }
}

// Renders whatever was attached to a post/comment: an inline image if it's
// a picture, otherwise a generic "download this file" link with its name.
function mediaHtml(item) {
  if (!item.media_url) return "";
  const isImage = (item.media_type || "").startsWith("image/");
  if (isImage) {
    return `<div class="media-attachment">
      <a href="${escapeHtml(item.media_url)}" target="_blank" rel="noopener">
        <img src="${escapeHtml(item.media_url)}" alt="${escapeHtml(item.media_name || "attachment")}" class="media-image" />
      </a>
    </div>`;
  }
  return `<div class="media-attachment media-file">
    <a href="${escapeHtml(item.media_url)}" target="_blank" rel="noopener" download>
      📎 ${escapeHtml(item.media_name || "Download attachment")}
    </a>
  </div>`;
}

function postCardHtml(post) {
  return `
    <div class="post-card" data-post-id="${post.id}">
      <div class="post-meta">${avatarHtml({ full_name: post.author_name, avatar_url: post.author_avatar_url }, 22)} ${escapeHtml(post.author_name)} · ${timeAgo(post.created_at)}</div>
      <h3 class="post-title-toggle">${escapeHtml(post.title)}</h3>
      <div class="post-content">${escapeHtml(post.content)}</div>
      ${mediaHtml(post)}
      <div class="post-footer">
        <button class="comment-toggle">💬 ${post.comment_count} comment${post.comment_count == 1 ? "" : "s"}</button>
      </div>
      <div class="comments-panel">
        <div class="comment-items">Loading…</div>
        <form class="comment-form">
          <input type="text" placeholder="Write a reply…" />
          <label class="comment-file-btn" title="Attach a file">
            📎<input type="file" class="comment-file-input" style="display:none;" />
          </label>
          <button type="submit" class="btn btn-primary btn-small">Reply</button>
        </form>
        <div class="comment-file-name"></div>
      </div>
    </div>`;
}

async function loadPosts() {
  const posts = await api(`/groups/${groupId}/posts`);
  const list = document.getElementById("post-list");

  if (posts.length === 0) {
    list.innerHTML = `<div class="empty-state"><h3>No discussions yet</h3><p>Start the first one above.</p></div>`;
    return;
  }

  list.innerHTML = posts.map(postCardHtml).join("");

  list.querySelectorAll(".post-card").forEach((card) => {
    const postId = card.dataset.postId;
    const toggleBtns = card.querySelectorAll(".comment-toggle, .post-title-toggle");
    const panel = card.querySelector(".comments-panel");
    let loaded = false;

    toggleBtns.forEach((btn) =>
      btn.addEventListener("click", async () => {
        panel.classList.toggle("open");
        if (panel.classList.contains("open") && !loaded) {
          loaded = true;
          await loadComments(postId, panel);
        }
      })
    );

    const fileInput = card.querySelector(".comment-file-input");
    const fileNameBox = card.querySelector(".comment-file-name");
    fileInput.addEventListener("change", () => {
      fileNameBox.textContent = fileInput.files[0] ? `Attached: ${fileInput.files[0].name}` : "";
    });

    card.querySelector(".comment-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const input = e.target.querySelector("input[type=text]");
      const content = input.value.trim();
      const file = fileInput.files[0];
      if (!content && !file) return;

      try {
        const fd = new FormData();
        fd.append("content", content);
        if (file) fd.append("media", file);
        await apiUpload(`/posts/${postId}/comments`, fd);
        input.value = "";
        fileInput.value = "";
        fileNameBox.textContent = "";
        await loadComments(postId, panel);
      } catch (err) {
        alert(err.message);
      }
    });
  });
}

async function loadComments(postId, panel) {
  const itemsBox = panel.querySelector(".comment-items");
  const comments = await api(`/posts/${postId}/comments`);
  itemsBox.innerHTML = comments.length
    ? comments
        .map(
          (c) => `
      <div class="comment-item">
        ${avatarHtml({ full_name: c.author_name, avatar_url: c.author_avatar_url }, 20)}
        <span class="author">${escapeHtml(c.author_name)}</span>
        <span class="time">${timeAgo(c.created_at)}</span>
        <div>${escapeHtml(c.content)}</div>
        ${mediaHtml(c)}
      </div>`
        )
        .join("")
    : `<p style="color:var(--ink-soft);font-size:13.5px;">No replies yet — be the first.</p>`;
}

const postFileInput = document.getElementById("p-media");
const postFileNameBox = document.getElementById("p-media-name");
if (postFileInput) {
  postFileInput.addEventListener("change", () => {
    postFileNameBox.textContent = postFileInput.files[0] ? `Attached: ${postFileInput.files[0].name}` : "";
  });
}

document.getElementById("post-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const errorBox = document.getElementById("post-error");
  errorBox.style.display = "none";

  const title = document.getElementById("p-title").value.trim();
  const content = document.getElementById("p-content").value.trim();
  const file = postFileInput ? postFileInput.files[0] : null;

  try {
    const fd = new FormData();
    fd.append("title", title);
    fd.append("content", content);
    if (file) fd.append("media", file);
    await apiUpload(`/groups/${groupId}/posts`, fd);
    document.getElementById("post-form").reset();
    if (postFileNameBox) postFileNameBox.textContent = "";
    await loadPosts();
  } catch (err) {
    errorBox.textContent = err.message;
    errorBox.style.display = "block";
  }
});

(async function init() {
  await guardAuth();
  await loadGroup();
  await loadPosts();
})();
