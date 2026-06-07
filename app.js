import { firebaseConfig } from "./firebase-config.js";
import { fsData } from "./fs-data.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getDatabase,
  get,
  onValue,
  ref,
  set,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";

const mode = document.body.dataset.mode;
const params = new URLSearchParams(location.search);
const room = params.get("room") || "ark01";
let selectedFsId = params.get("fs") || fsData[0].id;
let db = null;
let roomRef = null;
let unsubscribe = null;
let state = defaultState();
const roomPath = room.replace(/[.#$[\]/]/g, "_");

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
    db = getDatabase(app);
    roomRef = ref(db, `fsRooms/${roomPath}`);
    const snap = await get(roomRef);
    if (!snap.exists() && mode === "gm") {
      await set(roomRef, {
        ...defaultState(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }

    unsubscribe = onValue(roomRef, snapshot => {
      if (snapshot.exists()) {
        state = mergeState(snapshot.val());
      }
      setSyncStatus("Firebase接続中", true);
      render();
    }, error => {
      console.error(error);
      setSyncStatus("同期エラー", false);
      showWarning(`Realtime Databaseの読み書きに失敗しました: ${error.message}`);
    });
  } catch (error) {
    console.error(error);
    setSyncStatus("Firebase接続失敗", false);
    showWarning(`Firebase接続に失敗しました: ${error.message}`);
  }
}

function renderStaticControls() {
  if (elements.fsSelect) {
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
  }

  if (elements.copyPlayerUrl) {
    elements.copyPlayerUrl.addEventListener("click", async () => {
      elements.playerUrl.select();
      await navigator.clipboard?.writeText(elements.playerUrl.value).catch(() => {});
    });
  }
}

function render() {
  if (mode === "player") {
    selectedFsId = activeFsId();
  }
  if (elements.fsSelect) {
    elements.fsSelect.value = selectedFsId;
  }
  renderNav();
  renderDetail();
}

function renderNav() {
  if (!elements.nav) return;
  const grouped = groupByScene(fsData);
  elements.nav.innerHTML = "";
  const activeId = activeFsId();

  Object.entries(grouped).forEach(([sceneName, items]) => {
    const block = document.createElement("div");
    block.className = "scene-block";
    const title = document.createElement("div");
    title.className = "scene-title";
    title.textContent = sceneName;
    block.appendChild(title);

    items.forEach(fs => {
      const item = document.createElement("label");
      item.className = `nav-item ${fs.id === selectedFsId ? "active" : ""} ${fs.id === activeId ? "broadcast" : ""}`;
      item.innerHTML = `
        <input type="radio" name="active-fs" value="${fs.id}" ${fs.id === activeId ? "checked" : ""}>
        <span class="nav-code">${fs.code}</span>
        <span class="nav-title">${escapeHtml(fs.title)}</span>
      `;
      item.querySelector("input").addEventListener("change", async () => {
        selectedFsId = fs.id;
        updateUrlParam("fs", selectedFsId);
        updatePlayerUrl();
        const next = structuredClone(state);
        next.activeFsId = fs.id;
        await saveState(next);
      });
      block.appendChild(item);
    });

    elements.nav.appendChild(block);
  });
}

function renderDetail() {
  const fs = fsData.find(item => item.id === selectedFsId) || fsData[0];
  if (!fs) return;
  const current = fsState(fs.id);
  const requirement = fs.requirement || requirementFor(fs);
  const baseCheck = fs.check || "1ラウンドに1回、行動内容に合う技能で判定する。判定成功で進行値+1、達成値18以上で+2、25以上で+3。";
  const progress = Number(current.progress || 0);
  const progressPercent = Math.min(100, Math.max(0, (progress / 12) * 100));

  if (mode === "player" && !current.visible) {
    elements.detail.innerHTML = `<p class="hidden-note">このFSはまだGMから開示されていません。</p>`;
    return;
  }

  const milestoneHtml = fs.milestones.map(milestone => {
    const key = String(milestone.value);
    const visible = Boolean(current.milestones?.[key]);
    if (mode === "player" && !visible) return "";
    const check = milestone.check || `累積進行値が${milestone.value}以上になると開示。判定成功で+1、達成値18以上で+2、25以上で+3。`;
    const requirement = milestone.requirement || fs.requirement || requirementFor(fs);
    return `
      <div class="milestone ${visible ? "visible" : ""}">
        <div class="milestone-head">
          <span>進行値 ${milestone.value}</span>
          ${mode === "gm" ? checkboxHtml(`milestone-${key}`, visible, `data-action="milestone" data-value="${key}"`) : ""}
        </div>
        <p>${escapeHtml(milestone.text)}</p>
        <dl class="milestone-rule">
          <div>
            <dt>判定条件</dt>
            <dd>${escapeHtml(check)}</dd>
          </div>
          <div>
            <dt>要求</dt>
            <dd>${escapeHtml(requirement)}</dd>
          </div>
        </dl>
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
            <label class="field-row">
              <span>現在の達成値</span>
              <input type="number" min="0" max="12" step="1" value="${progress}" data-action="progress">
            </label>
            <button type="button" data-action="open-all">進行値をすべて開示</button>
            <button type="button" data-action="close-all">進行値をすべて非開示</button>
          </div>
        ` : ""}
      </div>

      <section class="basic-info">
        <h3>基本情報</h3>
        <div class="basic-grid">
          <div>
            <span class="basic-label">終了条件</span>
            <span>${escapeHtml(fs.end)}</span>
          </div>
          <div>
            <span class="basic-label">判定条件</span>
            <span>${escapeHtml(baseCheck)}</span>
          </div>
          <div>
            <span class="basic-label">要求</span>
            <span>${escapeHtml(requirement)}</span>
          </div>
          <div>
            <span class="basic-label">現在の達成状況</span>
            <span>${progress} / 12</span>
          </div>
        </div>
        <div class="progress-track" aria-label="現在の達成状況">
          <span style="width: ${progressPercent}%"></span>
        </div>
      </section>

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
  } else if (action === "progress") {
    next.fs[fsId].progress = clampProgress(target.value);
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
    await set(roomRef, {
      ...state,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error(error);
    showWarning(`保存に失敗しました: ${error.message}`);
  }
}

function defaultState() {
  return {
    activeFsId: fsData[0]?.id || "",
    fs: Object.fromEntries(fsData.map(fs => [fs.id, mergeFsState({})]))
  };
}

function mergeState(raw) {
  const next = defaultState();
  if (fsData.some(fs => fs.id === raw?.activeFsId)) {
    next.activeFsId = raw.activeFsId;
  }
  Object.entries(raw?.fs || {}).forEach(([id, value]) => {
    next.fs[id] = mergeFsState(value);
  });
  return next;
}

function mergeFsState(value) {
  return {
    visible: Boolean(value?.visible),
    progress: clampProgress(value?.progress),
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

function clampProgress(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(12, Math.round(number)));
}

function fsState(id) {
  return mergeFsState(state.fs?.[id]);
}

function activeFsId() {
  return fsData.some(fs => fs.id === state.activeFsId) ? state.activeFsId : fsData[0]?.id;
}

function updatePlayerUrl() {
  if (!elements.playerUrl) return;
  const url = new URL("player.html", location.href);
  url.searchParams.set("room", room);
  url.searchParams.delete("fs");
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

function requirementFor(fs) {
  const requirements = {
    A1: "〈情報：裏社会〉〈知覚〉〈調達〉。目安難易度9。",
    A2: "〈交渉〉〈情報：GPO〉【社会】。目安難易度9。",
    A3: "〈情報：ストレンジャーズ〉〈知識：レネゲイド〉〈交渉〉。目安難易度9。",
    A4: "〈交渉〉〈情報：裏社会〉【社会】。目安難易度9。",
    A5: "〈交渉〉〈情報：GPO〉〈調達〉。目安難易度9。",
    B1: "〈知覚〉〈情報：裏社会〉〈隠密〉。目安難易度9。",
    B2: "〈情報：UGN〉〈医学〉〈知覚〉。目安難易度9。",
    B3: "〈RC〉〈知識：レネゲイド〉〈意志〉。目安難易度9。",
    C11: "〈白兵〉〈射撃〉〈回避〉〈運転〉。目安難易度10。",
    C12: "〈白兵〉〈射撃〉〈RC〉〈回避〉。目安難易度10。",
    C13: "〈医学〉〈交渉〉〈意志〉〈知覚〉。目安難易度10。",
    C14: "〈交渉〉〈情報：裏社会〉〈運転〉。目安難易度10。",
    C15: "〈交渉〉〈情報：GPO〉〈調達〉。目安難易度10。",
    C21: "〈RC〉〈知識：レネゲイド〉〈意志〉。目安難易度11。",
    C22: "〈RC〉〈知識：レネゲイド〉〈意志〉。目安難易度11。",
    C23: "〈情報：ストレンジャーズ〉〈交渉〉〈知識：レネゲイド〉。目安難易度10。",
    C24: "〈交渉〉〈情報：裏社会〉〈運転〉。目安難易度10。",
    C25: "〈交渉〉〈情報：GPO〉〈調達〉。目安難易度10。",
    D1A: "〈知覚〉〈運転〉〈情報：裏社会〉〈交渉〉。目安難易度11。",
    D1B: "〈白兵〉〈射撃〉〈運転〉〈交渉〉。目安難易度11。",
    D2: "〈医学〉〈意志〉〈知覚〉〈交渉〉。目安難易度11。",
    D3: "〈白兵〉〈射撃〉〈RC〉〈運転〉。目安難易度11。",
    D4: "〈交渉〉〈情報：ストレンジャーズ〉〈医学〉。目安難易度11。"
  };

  return requirements[fs.id] || "行動内容に合う技能。目安難易度9。";
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
