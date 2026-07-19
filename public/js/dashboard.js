let allGroups = [];
let currentTab = "all";

async function guardAuth() {
  try {
    await api("/auth/me");
  } catch (e) {
    window.location.href = "/login.html";
  }
}

function renderGroups() {
  const list = document.getElementById("group-list");
  const groups = currentTab === "mine" ? allGroups.filter((g) => g.joined) : allGroups;

  if (groups.length === 0) {
    list.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1;">
        <h3>${currentTab === "mine" ? "You haven't joined any groups yet" : "No groups yet"}</h3>
        <p>${currentTab === "mine" ? "Browse all groups and join one that fits your course or interests." : "Be the first to create one."}</p>
      </div>`;
    return;
  }

  list.innerHTML = groups
    .map(
      (g) => `
      <div class="group-card">
        <div class="pin-tab"></div>
        <span class="category">${escapeHtml(g.category)}</span>
        <h3>${escapeHtml(g.name)}</h3>
        <p class="desc">${escapeHtml(g.description || "No description yet.")}</p>
        <div class="meta">${g.member_count} member${g.member_count == 1 ? "" : "s"} · started by ${escapeHtml(g.created_by_name)}</div>
        <div class="actions">
          <a href="/group.html?id=${g.id}" class="btn btn-outline btn-small">Open</a>
          ${
            g.joined
              ? `<button class="btn btn-small" style="background:var(--sage);color:#fff;" disabled>Joined</button>`
              : `<button class="btn btn-primary btn-small join-btn" data-id="${g.id}">Join</button>`
          }
        </div>
      </div>`
    )
    .join("");

  list.querySelectorAll(".join-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      btn.disabled = true;
      btn.textContent = "Joining…";
      try {
        await api(`/groups/${btn.dataset.id}/join`, { method: "POST" });
        await loadGroups();
      } catch (err) {
        alert(err.message);
        btn.disabled = false;
        btn.textContent = "Join";
      }
    });
  });
}

async function loadGroups() {
  allGroups = await api("/groups");
  renderGroups();
}

document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    currentTab = tab.dataset.tab;
    renderGroups();
  });
});

// Create group modal
const modal = document.getElementById("create-modal");
document.getElementById("open-create-modal").addEventListener("click", () => modal.classList.add("open"));
document.getElementById("cancel-create").addEventListener("click", () => modal.classList.remove("open"));
modal.addEventListener("click", (e) => {
  if (e.target === modal) modal.classList.remove("open");
});

document.getElementById("create-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const errorBox = document.getElementById("create-error");
  errorBox.style.display = "none";

  try {
    await api("/groups", {
      method: "POST",
      body: {
        name: document.getElementById("g-name").value.trim(),
        category: document.getElementById("g-category").value,
        description: document.getElementById("g-description").value.trim(),
      },
    });
    modal.classList.remove("open");
    document.getElementById("create-form").reset();
    await loadGroups();
  } catch (err) {
    errorBox.textContent = err.message;
    errorBox.style.display = "block";
  }
});

(async function init() {
  await guardAuth();
  await loadGroups();
})();
