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
  const maxProgress = Number(fs.maxProgress || 30);
  const targetProgress = Number(fs.targetProgress || maxProgress);
  const progress = Math.min(targetProgress, Number(current.progress || 0));
  const pcParticipation = formatPcParticipation(fs.pcParticipation);

  if (mode === "player" && !current.visible) {
    elements.detail.innerHTML = `<p class="hidden-note">このFSはまだGMから開示されていません。</p>`;
    return;
  }

  const milestoneHtml = fs.milestones.map(milestone => {
    const key = String(milestone.value);
    const visible = Boolean(current.milestones?.[key]);
    if (mode === "player" && !visible) return "";
    const check = formatCheck(milestone.check || fs.check, milestone.difficulty || fs.difficulty);
    const requirement = milestone.requirement || "指定なし";
    return `
      <div class="milestone ${visible ? "visible" : ""}">
        <div class="milestone-head">
          <span>進行値 ${milestone.value}</span>
          ${mode === "gm" ? checkboxHtml(`milestone-${key}`, visible, `data-action="milestone" data-value="${key}"`) : ""}
        </div>
        ${milestone.title ? `<div class="milestone-title">${escapeHtml(milestone.title)}</div>` : ""}
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
              <input type="number" min="0" max="${targetProgress}" step="1" value="${progress}" data-action="progress">
            </label>
            <button type="button" data-action="open-all">進行値をすべて開示</button>
            <button type="button" data-action="close-all">進行値をすべて非開示</button>
          </div>
        ` : ""}
      </div>

      <section class="basic-info">
        <table class="fs-sheet">
          <tbody>
            <tr>
              <th>名称</th>
              <td colspan="3">${escapeHtml(fs.title)}</td>
              <th>終了条件</th>
              <td>${escapeHtml(fs.end)}</td>
            </tr>
            <tr>
              <th>判定</th>
              <td>${escapeHtml(fs.check || "任意")}</td>
              <th>難易度</th>
              <td>${escapeHtml(fs.difficulty || "-")}</td>
              <th>最大達成値</th>
              <td>${maxProgress}</td>
            </tr>
            <tr>
              <th>経験点</th>
              <td>${escapeHtml(fs.exp || 0)}点</td>
              <th>目標進行値</th>
              <td>${targetProgress}</td>
            </tr>
            <tr>
              <th>PC参加条件</th>
              <td colspan="5">${escapeHtml(pcParticipation)}</td>
            </tr>
            <tr>
              <th>進行カウンター</th>
              <td colspan="5">${renderProgressCounter(progress, targetProgress)}</td>
            </tr>
            <tr>
              <th>概要</th>
              <td colspan="5">${escapeHtml(fs.summary)}</td>
            </tr>
          </tbody>
        </table>
      </section>

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
    const fs = fsData.find(item => item.id === fsId);
    next.fs[fsId].progress = clampProgress(target.value, fs?.targetProgress || fs?.maxProgress || 30);
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
    progress: clampProgress(value?.progress, 99),
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

function clampProgress(value, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(max, Math.round(number)));
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

function formatCheck(check, difficulty) {
  if (!check && !difficulty) return "行動内容に合う技能。";
  if (!difficulty) return check;
  return `${check} 難易度${difficulty}`;
}

function formatPcParticipation(participation = {}) {
  const required = participation.required || [];
  const recommended = participation.recommended || [];
  const parts = [];
  if (required.length) parts.push(`${required.join("・")}参加必須`);
  if (recommended.length) parts.push(`${recommended.join("・")}参加推奨`);
  return parts.join(" / ") || "指定なし";
}

function renderProgressCounter(progress, targetProgress) {
  const cells = [];
  for (let index = 1; index <= targetProgress; index += 1) {
    const classes = [
      index === progress ? "current" : "",
      index === targetProgress ? "target" : ""
    ].filter(Boolean).join(" ");
    cells.push(`<span class="${classes}">${index}</span>`);
  }
  return `<div class="progress-counter">${cells.join("")}</div>`;
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
