import { firebaseConfig } from "./firebase-config.js";
import { fsData } from "./fs-data.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getFirestore,
  doc,
  getDoc,
  onSnapshot,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const mode = document.body.dataset.mode;
const params = new URLSearchParams(location.search);
const room = params.get("room") || "ark01";
let selectedFsId = params.get("fs") || fsData[0].id;
let db = null;
let roomRef = null;
let unsubscribe = null;
let state = defaultState();

const elements = {
  roomPill: document.getElementById("room-pill"),
  syncStatus: document.getElementById("sync-status"),
  warning: document.getElementById("setup-warning"),
  fsSelect: document.getElementById("fs-select"),
  nav: document.getElementById("fs-nav"),
  detail: document.getElementById("fs-detail"),
  playerUrl: document.getElementById("player-url"),
  copyPlayerUrl: document.getElementById("copy-player-url")
};

bootstrap();

function bootstrap() {
  elements.roomPill.textContent = `room: ${room}`;
  renderStaticControls();
  updatePlayerUrl();
  render();

  if (isFirebaseConfigured()) {
    connectFirebase();
  } else {
    showWarning("firebase-config.js が未設定です。画面確認はできますが、GM/PL同期はまだ動きません。");
  }
}

function isFirebaseConfigured() {
  return firebaseConfig.projectId && !firebaseConfig.projectId.startsWith("PASTE_");
}

async function connectFirebase() {
  try {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    roomRef = doc(db, "fsRooms", room);
    const snap = await getDoc(roomRef);
    if (!snap.exists() && mode === "gm") {
      await setDoc(roomRef, {
        ...defaultState(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }

    unsubscribe = onSnapshot(roomRef, snapshot => {
      if (snapshot.exists()) {
        state = mergeState(snapshot.data());
      }
      setSyncStatus("Firebase接続中", true);
      render();
    }, error => {
      console.error(error);
      setSyncStatus("同期エラー", false);
      showWarning(`Firestoreの読み書きに失敗しました: ${error.message}`);
    });
  } catch (error) {
    console.error(error);
    setSyncStatus("Firebase接続失敗", false);
    showWarning(`Firebase接続に失敗しました: ${error.message}`);
  }
}

function renderStaticControls() {
  elements.fsSelect.innerHTML = "";
  fsData.forEach(fs => {
    const option = document.createElement("option");
    option.value = fs.id;
    option.textContent = `${fs.code} ${fs.title}`;
    elements.fsSelect.appendChild(option);
  });

  elements.fsSelect.value = selectedFsId;
  elements.fsSelect.addEventListener("change", () => {
    selectedFsId = elements.fsSelect.value;
    updateUrlParam("fs", selectedFsId);
    updatePlayerUrl();
    render();
  });

  if (elements.copyPlayerUrl) {
    elements.copyPlayerUrl.addEventListener("click", async () => {
      elements.playerUrl.select();
      await navigator.clipboard?.writeText(elements.playerUrl.value).catch(() => {});
    });
  }
}

function render() {
  elements.fsSelect.value = selectedFsId;
  renderNav();
  renderDetail();
}

function renderNav() {
  const grouped = groupByScene(fsData);
  elements.nav.innerHTML = "";

  Object.entries(grouped).forEach(([sceneName, items]) => {
    const block = document.createElement("div");
    block.className = "scene-block";
    const title = document.createElement("div");
    title.className = "scene-title";
    title.textContent = sceneName;
    block.appendChild(title);

    items.forEach(fs => {
      if (mode === "player" && !fsState(fs.id).visible) return;
      const button = document.createElement("button");
      button.type = "button";
      button.className = `nav-item ${fs.id === selectedFsId ? "active" : ""}`;
      button.innerHTML = `<span class="nav-code">${fs.code}</span><span class="nav-title">${escapeHtml(fs.title)}</span>`;
      button.addEventListener("click", () => {
        selectedFsId = fs.id;
        updateUrlParam("fs", selectedFsId);
        updatePlayerUrl();
        render();
      });
      block.appendChild(button);
    });

    elements.nav.appendChild(block);
  });
}

function renderDetail() {
  const fs = fsData.find(item => item.id === selectedFsId) || fsData[0];
  if (!fs) return;
  const current = fsState(fs.id);

  if (mode === "player" && !current.visible) {
    elements.detail.innerHTML = `<p class="hidden-note">このFSはまだGMから開示されていません。</p>`;
    return;
  }

  const milestoneHtml = fs.milestones.map(milestone => {
    const key = String(milestone.value);
    const visible = Boolean(current.milestones?.[key]);
    if (mode === "player" && !visible) return "";
    return `
      <div class="milestone ${visible ? "visible" : ""}">
        <div class="milestone-head">
          <span>進行値 ${milestone.value}</span>
          ${mode === "gm" ? checkboxHtml(`milestone-${key}`, visible, `data-action="milestone" data-value="${key}"`) : ""}
        </div>
        <p>${escapeHtml(milestone.text)}</p>
      </div>
    `;
  }).join("");

  const resultHtml = [
    { key: "successVisible", label: "成功時", text: fs.success },
    { key: "failureVisible", label: "失敗時", text: fs.failure }
  ].map(item => {
    const visible = Boolean(current[item.key]);
    if (mode === "player" && !visible) return "";
    return `
      <div class="result-card ${visible ? "visible" : ""}">
        <div class="milestone-head">
          <span>${item.label}</span>
          ${mode === "gm" ? checkboxHtml(item.key, visible, `data-action="${item.key}"`) : ""}
        </div>
        <p>${escapeHtml(item.text)}</p>
      </div>
    `;
  }).join("");

  elements.detail.innerHTML = `
    <article class="fs-card">
      <div class="fs-head">
        <div>
          <h2>${fs.code}：${escapeHtml(fs.title)}</h2>
          <div class="meta">
            <span class="pill">${fs.sceneName}</span>
            <span class="pill">終了条件: ${escapeHtml(fs.end)}</span>
          </div>
        </div>
        ${mode === "gm" ? `
          <div class="gm-box">
            <label class="check-row">
              <input type="checkbox" data-action="visible" ${current.visible ? "checked" : ""}>
              <span>このFSをPLへ開示する</span>
            </label>
            <button type="button" data-action="open-all">進行値をすべて開示</button>
            <button type="button" data-action="close-all">進行値をすべて非開示</button>
          </div>
        ` : ""}
      </div>

      <p class="summary">${escapeHtml(fs.summary)}</p>

      <div>
        <h3>進行値</h3>
        <div class="milestones">${milestoneHtml || `<p class="hidden-note">開示済みの進行値はまだありません。</p>`}</div>
      </div>

      <div>
        <h3>結果</h3>
        <div class="result-grid">${resultHtml || `<p class="hidden-note">結果欄はまだ開示されていません。</p>`}</div>
      </div>
    </article>
  `;

  if (mode === "gm") {
    elements.detail.querySelectorAll("[data-action]").forEach(input => {
      input.addEventListener("change", event => handleGmChange(fs.id, event));
      input.addEventListener("click", event => handleGmClick(fs.id, event));
    });
  }
}

function checkboxHtml(id, checked, attrs) {
  return `<input type="checkbox" id="${id}" ${attrs} ${checked ? "checked" : ""}>`;
}

async function handleGmChange(fsId, event) {
  const target = event.target;
  if (target.tagName !== "INPUT") return;
  const action = target.dataset.action;
  const next = structuredClone(state);
  next.fs ??= {};
  next.fs[fsId] = mergeFsState(next.fs[fsId]);

  if (action === "visible") {
    next.fs[fsId].visible = target.checked;
  } else if (action === "milestone") {
    next.fs[fsId].milestones[target.dataset.value] = target.checked;
  } else if (action === "successVisible" || action === "failureVisible") {
    next.fs[fsId][action] = target.checked;
  }

  await saveState(next);
}

async function handleGmClick(fsId, event) {
  const action = event.target.dataset.action;
  if (action !== "open-all" && action !== "close-all") return;
  const fs = fsData.find(item => item.id === fsId);
  const next = structuredClone(state);
  next.fs ??= {};
  next.fs[fsId] = mergeFsState(next.fs[fsId]);
  fs.milestones.forEach(milestone => {
    next.fs[fsId].milestones[String(milestone.value)] = action === "open-all";
  });
  await saveState(next);
}

async function saveState(next) {
  state = mergeState(next);
  render();
  if (!roomRef) return;
  try {
    await setDoc(roomRef, {
      ...state,
      updatedAt: serverTimestamp()
    }, { merge: true });
  } catch (error) {
    console.error(error);
    showWarning(`保存に失敗しました: ${error.message}`);
  }
}

function defaultState() {
  return {
    fs: Object.fromEntries(fsData.map(fs => [fs.id, mergeFsState({})]))
  };
}

function mergeState(raw) {
  const next = defaultState();
  Object.entries(raw?.fs || {}).forEach(([id, value]) => {
    next.fs[id] = mergeFsState(value);
  });
  return next;
}

function mergeFsState(value) {
  return {
    visible: Boolean(value?.visible),
    successVisible: Boolean(value?.successVisible),
    failureVisible: Boolean(value?.failureVisible),
    milestones: {
      "3": Boolean(value?.milestones?.["3"]),
      "6": Boolean(value?.milestones?.["6"]),
      "9": Boolean(value?.milestones?.["9"]),
      "12": Boolean(value?.milestones?.["12"])
    }
  };
}

function fsState(id) {
  return mergeFsState(state.fs?.[id]);
}

function updatePlayerUrl() {
  if (!elements.playerUrl) return;
  const url = new URL("player.html", location.href);
  url.searchParams.set("room", room);
  url.searchParams.set("fs", selectedFsId);
  elements.playerUrl.value = url.href;
}

function updateUrlParam(key, value) {
  const url = new URL(location.href);
  url.searchParams.set(key, value);
  history.replaceState(null, "", url);
}

function setSyncStatus(text, live) {
  elements.syncStatus.textContent = text;
  elements.syncStatus.classList.toggle("live", live);
  elements.syncStatus.classList.toggle("warn", !live);
}

function showWarning(text) {
  elements.warning.innerHTML = `<div class="setup">${escapeHtml(text)}</div>`;
}

function groupByScene(items) {
  return items.reduce((acc, fs) => {
    acc[fs.sceneName] ??= [];
    acc[fs.sceneName].push(fs);
    return acc;
  }, {});
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[char]));
}

window.addEventListener("beforeunload", () => {
  if (unsubscribe) unsubscribe();
});
