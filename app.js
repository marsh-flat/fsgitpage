import { firebaseConfig } from "./firebase-config.js";
import { fsData } from "./fs-data.js?v=fs-14f6475f1863";
import { happeningChart } from "./happening-data.js";
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
let activeInfoText = "";
let showAllFs = false;
let happeningRolling = false;
const roomPath = room.replace(/[.#$[\]/]/g, "_");

const elements = {
  roomPill: document.getElementById("room-pill"),
  syncStatus: document.getElementById("sync-status"),
  warning: document.getElementById("setup-warning"),
  fsSelect: document.getElementById("fs-select"),
  nav: document.getElementById("fs-nav"),
  happening: document.getElementById("happening-panel"),
  detail: document.getElementById("fs-detail"),
  playerUrl: document.getElementById("player-url"),
  copyPlayerUrl: document.getElementById("copy-player-url"),
  showAllFs: document.getElementById("show-all-fs")
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

  if (elements.showAllFs) {
    elements.showAllFs.checked = showAllFs;
    elements.showAllFs.addEventListener("change", () => {
      showAllFs = elements.showAllFs.checked;
      render();
    });
  }
}

function render() {
  if (mode !== "player") {
    const nextSelectedFsId = selectableFsId(selectedFsId);
    if (nextSelectedFsId !== selectedFsId) {
      selectedFsId = nextSelectedFsId;
      updateUrlParam("fs", selectedFsId);
      updatePlayerUrl();
    }
  }
  if (elements.fsSelect) {
    renderFsSelect();
    elements.fsSelect.value = selectedFsId;
  }
  renderNav();
  renderHappening();
  renderDetail();
}

function renderHappening() {
  if (!elements.happening) return;
  const happening = happeningState(state.happening);
  const item = happening.roll ? findHappening(happening.roll) : null;
  if (mode === "player" && !happening.visible) {
    elements.happening.innerHTML = "";
    elements.happening.hidden = true;
    return;
  }

  elements.happening.hidden = false;
  elements.happening.innerHTML = `
    <section class="happening-card ${happeningRolling ? "rolling" : ""}">
      <div class="happening-main">
        <div class="happening-title">ハプニングチャート</div>
        <div class="happening-roll">
          <span>D100</span>
          <strong>${formatRoll(happening.roll)}</strong>
          <small>${escapeHtml(item?.range || happening.range || "")}</small>
        </div>
        <p>${escapeHtml(item?.effect || happening.effect || "まだ決定されていません。")}</p>
      </div>
      <div class="happening-controls">
        <button type="button" data-happening-action="roll" ${happening.locked || happeningRolling ? "disabled" : ""}>
          ${happeningRolling ? "ロール中" : "ロール"}
        </button>
        ${mode === "gm" ? `
          <label><input type="checkbox" data-happening-action="visible" ${happening.visible ? "checked" : ""}> 表示</label>
          <label><input type="checkbox" data-happening-action="locked" ${happening.locked ? "checked" : ""}> ロック</label>
        ` : ""}
      </div>
    </section>
  `;

  elements.happening.querySelectorAll("[data-happening-action]").forEach(element => {
    element.addEventListener("click", handleHappeningClick);
    element.addEventListener("change", handleHappeningChange);
  });
}

function renderFsSelect() {
  const visibleItems = visibleFsItems();
  elements.fsSelect.innerHTML = "";
  visibleItems.forEach(fs => {
    const option = document.createElement("option");
    option.value = fs.id;
    option.textContent = `${fs.code} ${fs.title}`;
    elements.fsSelect.appendChild(option);
  });
}

function renderNav() {
  if (!elements.nav) return;
  const grouped = groupByScene(visibleFsItems());
  elements.nav.innerHTML = "";
  const activeIds = activeFsIds();

  Object.entries(grouped).forEach(([sceneName, items]) => {
    const block = document.createElement("div");
    block.className = "scene-block";
    const title = document.createElement("div");
    title.className = "scene-title";
    title.textContent = sceneName;
    title.addEventListener("click", () => {
      const fs = items[0];
      if (!fs) return;
      selectedFsId = fs.id;
      updateUrlParam("fs", selectedFsId);
      updatePlayerUrl();
      render();
    });
    block.appendChild(title);

    items.forEach(fs => {
      const requiresSuccess = getRequiresSuccess(fs);
      const item = document.createElement("label");
      item.className = [
        "nav-item",
        fs.id === selectedFsId ? "active" : "",
        activeIds.includes(fs.id) ? "broadcast" : "",
        requiresSuccess.length ? "locked-rule" : ""
      ].filter(Boolean).join(" ");
      item.innerHTML = `
        <input class="nav-check-input" type="checkbox" value="${fs.id}" ${activeIds.includes(fs.id) ? "checked" : ""}>
        <span class="nav-check-box" aria-hidden="true"></span>
        <span class="nav-code">${fs.code}</span>
        <span class="nav-title-wrap">
          <span class="nav-title">${escapeHtml(fs.title)}</span>
          ${renderPrerequisiteBadges(requiresSuccess)}
        </span>
      `;
      const input = item.querySelector("input");
      input.addEventListener("change", async () => {
        selectedFsId = fs.id;
        updateUrlParam("fs", selectedFsId);
        updatePlayerUrl();
        const next = structuredClone(state);
        next.activeFsIds = updateIdList(activeFsIds(next), fs.id, input.checked);
        next.activeFsId = next.activeFsIds[0] || fs.id;
        next.fs ??= {};
        next.fs[fs.id] = mergeFsState(next.fs[fs.id], fs);
        next.fs[fs.id].visible = input.checked;
        await saveState(next);
      });
      block.appendChild(item);
    });

    elements.nav.appendChild(block);
  });
}

function renderDetail() {
  elements.detail.classList.remove("multi-fs");
  if (mode === "player") {
    renderPlayerDetails();
    return;
  }
  const fs = fsData.find(item => item.id === selectedFsId) || fsData[0];
  if (!fs) return;
  elements.detail.innerHTML = renderFsCard(fs) + renderInfoDialog();
  elements.detail.onclick = handleDetailClick;
  elements.detail.querySelectorAll("[data-action]").forEach(input => {
    input.addEventListener("change", event => handleGmChange(fs.id, event));
  });
}

function renderPlayerDetails() {
  const items = activeFsItems().filter(fs => fsState(fs.id).visible);
  elements.detail.classList.toggle("multi-fs", items.length > 1);
  if (!items.length) {
    elements.detail.innerHTML = `<p class="hidden-note">開示中のFSはまだありません。</p>`;
    return;
  }
  elements.detail.innerHTML = items.map(fs => renderFsCard(fs)).join("") + renderInfoDialog();
  elements.detail.onclick = handleDetailClick;
}

function renderFsCard(fs) {
  const current = fsState(fs.id);
  const maxProgress = Number(fs.maxProgress || 30);
  const targetProgress = Number(fs.targetProgress || maxProgress);
  const progress = Math.min(targetProgress, Number(current.progress || 0));
  const pcParticipation = formatPcParticipation(fs.pcParticipation);
  const gmOnlyRuleRow = mode === "gm" ? `
            <tr>
              <th>経験点</th>
              <td>${escapeHtml(fs.exp || 0)}点</td>
              <th>目標進行値</th>
              <td>${targetProgress}</td>
            </tr>
  ` : "";
  const basicInfoHtml = mode === "player"
    ? renderPlayerBasicInfo(fs, progress, targetProgress, maxProgress, pcParticipation)
    : renderGmBasicInfo(fs, progress, targetProgress, maxProgress, pcParticipation, gmOnlyRuleRow);

  if (mode === "player" && !current.visible) {
    return `<p class="hidden-note">このFSはまだGMから開示されていません。</p>`;
  }

  const milestoneHtml = fs.milestones.map(milestone => {
    const key = String(milestone.value);
    const visible = Boolean(current.milestones?.[key]);
    if (mode === "player" && !visible) return "";
    const check = formatCheck(milestone.check || fs.check, milestone.difficulty || fs.difficulty);
    const requirement = milestone.requirement || "指定なし";
    const infoHtml = renderMilestoneInfos(fs.id, key, milestone, current);
    const masterTextHtml = mode === "gm" && milestone.mastertxt ? `
        <div class="master-note">
          <span>演出メモ</span>
          <p>${escapeHtml(milestone.mastertxt)}</p>
        </div>
    ` : "";
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
          <div class="rule-value-only">
            <dd>${escapeHtml(requirement)}</dd>
          </div>
        </dl>
        ${masterTextHtml}
        ${infoHtml}
      </div>
    `;
  }).join("");

  const resultHtml = renderResult(fs, current);

  return `
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
        ${basicInfoHtml}
      </section>

      <div class="fs-scroll-body">
        <div>
          <h3>進行値</h3>
          <div class="milestones">${milestoneHtml || `<p class="hidden-note">開示済みの進行値はまだありません。</p>`}</div>
        </div>

        <div>
          <h3>結果</h3>
          ${resultHtml}
        </div>
      </div>
    </article>
  `;
}

function renderGmBasicInfo(fs, progress, targetProgress, maxProgress, pcParticipation, gmOnlyRuleRow) {
  return `
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
        ${gmOnlyRuleRow}
        <tr>
          <th>条件</th>
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
  `;
}

function renderPlayerBasicInfo(fs, progress, targetProgress, maxProgress, pcParticipation) {
  return `
    <div class="player-info-grid">
      <div class="player-info-item player-info-wide">
        <span>名称</span>
        <strong>${escapeHtml(fs.title)}</strong>
      </div>
      <div class="player-info-item">
        <span>終了条件</span>
        <strong>${escapeHtml(fs.end)}</strong>
      </div>
      <div class="player-info-item player-info-wide">
        <span>判定</span>
        <strong>${escapeHtml(fs.check || "任意")}</strong>
      </div>
      <div class="player-info-item">
        <span>難易度</span>
        <strong>${escapeHtml(fs.difficulty || "-")}</strong>
      </div>
      <div class="player-info-item">
        <span>最大達成値</span>
        <strong>${maxProgress}</strong>
      </div>
      <div class="player-info-item player-info-wide">
        <span>条件</span>
        <strong>${escapeHtml(pcParticipation)}</strong>
      </div>
      <div class="player-info-item player-info-wide">
        <span>進行カウンター</span>
        ${renderProgressCounter(progress, targetProgress)}
      </div>
      <div class="player-info-item player-info-full">
        <span>概要</span>
        <p>${escapeHtml(fs.summary)}</p>
      </div>
    </div>
  `;
}

function renderInfoDialog() {
  return `
    <dialog class="info-dialog" id="info-dialog">
      <div class="info-dialog-head">
        <h3 id="info-dialog-title">情報</h3>
        <button type="button" class="icon-button copy-button" data-info-copy aria-label="クリップボードにコピー">
          <span aria-hidden="true"></span>
        </button>
        <button type="button" class="dialog-close" data-dialog-close aria-label="閉じる">×</button>
      </div>
      <div class="info-dialog-body" id="info-dialog-body"></div>
    </dialog>
  `;
}

function renderMilestoneInfos(fsId, milestoneKey, milestone, current) {
  const infos = Array.isArray(milestone.infos) ? milestone.infos : [];
  if (!infos.length) return "";
  if (mode === "gm") {
    const items = infos.map((info, index) => {
      const key = String(index);
      const visible = Boolean(current.infos?.[milestoneKey]?.[key]);
      return `
        <label class="info-control ${visible ? "visible" : ""}">
          <input type="checkbox" data-action="info" data-value="${milestoneKey}" data-info-index="${key}" ${visible ? "checked" : ""}>
          <span class="info-control-label">情報${index + 1}</span>
          <strong>${escapeHtml(info.title || `情報${index + 1}`)}</strong>
          <span>${escapeHtml(info.text)}</span>
        </label>
      `;
    }).join("");
    return `<div class="info-list">${items}</div>`;
  }

  const buttons = infos.map((info, index) => {
    const key = String(index);
    if (!current.infos?.[milestoneKey]?.[key]) return "";
    return `
      <button type="button" class="info-chip" data-info-open data-fs-id="${escapeHtml(fsId)}" data-value="${milestoneKey}" data-info-index="${key}">
        情報${index + 1}
      </button>
    `;
  }).join("");
  return buttons ? `<div class="info-chips">${buttons}</div>` : "";
}

function renderResult(fs, current) {
  const status = current.resultStatus || "pending";
  if (mode === "gm") {
    return `
      <div class="result-control">
        <label class="result-option ${status === "pending" ? "active" : ""}">
          <input type="radio" name="result-status-${fs.id}" value="pending" data-action="resultStatus" ${status === "pending" ? "checked" : ""}>
          <span>処理前</span>
        </label>
        <label class="result-option ${status === "success" ? "active" : ""}">
          <input type="radio" name="result-status-${fs.id}" value="success" data-action="resultStatus" ${status === "success" ? "checked" : ""}>
          <span>成功</span>
        </label>
        <label class="result-option ${status === "failure" ? "active" : ""}">
          <input type="radio" name="result-status-${fs.id}" value="failure" data-action="resultStatus" ${status === "failure" ? "checked" : ""}>
          <span>失敗</span>
        </label>
      </div>
      <div class="result-grid">
        <div class="result-card ${status === "success" ? "visible" : ""}">
          <div class="milestone-head"><span>成功</span></div>
          <p>${escapeHtml(fs.success)}</p>
        </div>
        <div class="result-card ${status === "failure" ? "visible" : ""}">
          <div class="milestone-head"><span>失敗</span></div>
          <p>${escapeHtml(fs.failure)}</p>
        </div>
      </div>
    `;
  }

  if (status === "success") {
    return `
      <div class="result-grid">
        <div class="result-card visible">
          <div class="milestone-head"><span>成功</span></div>
          <p>${escapeHtml(fs.success)}</p>
        </div>
      </div>
    `;
  }
  if (status === "failure") {
    return `
      <div class="result-grid">
        <div class="result-card visible">
          <div class="milestone-head"><span>失敗</span></div>
          <p>${escapeHtml(fs.failure)}</p>
        </div>
      </div>
    `;
  }
  return `<p class="hidden-note">結果欄はまだ開示されていません。</p>`;
}

function checkboxHtml(id, checked, attrs) {
  return `<input type="checkbox" id="${id}" ${attrs} ${checked ? "checked" : ""}>`;
}

async function handleGmChange(fsId, event) {
  const target = event.target;
  if (target.tagName !== "INPUT") return;
  const action = target.dataset.action;
  const next = structuredClone(state);
  const fs = fsData.find(item => item.id === fsId);
  next.fs ??= {};
  next.fs[fsId] = mergeFsState(next.fs[fsId], fs);

  if (action === "visible") {
    next.fs[fsId].visible = target.checked;
    next.activeFsIds = updateIdList(activeFsIds(next), fsId, target.checked);
    next.activeFsId = next.activeFsIds[0] || fsId;
  } else if (action === "milestone") {
    next.fs[fsId].milestones[target.dataset.value] = target.checked;
  } else if (action === "info") {
    next.fs[fsId].infos[target.dataset.value] ??= {};
    next.fs[fsId].infos[target.dataset.value][target.dataset.infoIndex] = target.checked;
  } else if (action === "resultStatus") {
    next.fs[fsId].resultStatus = normalizeResultStatus(target.value);
  } else if (action === "successVisible" || action === "failureVisible") {
    next.fs[fsId][action] = target.checked;
  } else if (action === "progress") {
    next.fs[fsId].progress = clampProgress(target.value, fs?.targetProgress || fs?.maxProgress || 30);
  }

  await saveState(next);
}

async function handleDetailClick(event) {
  const closeButton = event.target.closest("[data-dialog-close]");
  if (closeButton) {
    elements.detail.querySelector("#info-dialog")?.close();
    return;
  }

  const copyButton = event.target.closest("[data-info-copy]");
  if (copyButton) {
    await copyText(activeInfoText);
    copyButton.classList.add("copied");
    window.setTimeout(() => copyButton.classList.remove("copied"), 800);
    return;
  }

  const infoButton = event.target.closest("[data-info-open]");
  if (infoButton) {
    openInfoDialog(infoButton.dataset);
    return;
  }

  if (mode !== "gm") return;
  const action = event.target.dataset.action;
  if (action !== "open-all" && action !== "close-all") return;
  const fsId = selectedFsId;
  const fs = fsData.find(item => item.id === fsId);
  const next = structuredClone(state);
  next.fs ??= {};
  next.fs[fsId] = mergeFsState(next.fs[fsId], fs);
  fs.milestones.forEach(milestone => {
    next.fs[fsId].milestones[String(milestone.value)] = action === "open-all";
  });
  await saveState(next);
}

async function handleHappeningClick(event) {
  const button = event.target.closest("[data-happening-action='roll']");
  if (!button) return;
  const current = happeningState(state.happening);
  if (current.locked || happeningRolling) return;

  happeningRolling = true;
  renderHappening();
  try {
    const rolls = Array.from({ length: 8 }, rollD100);
    const finalRoll = rollD100();
    rolls.push(finalRoll);

    for (const [index, roll] of rolls.entries()) {
      previewHappeningRoll(roll);
      await wait(index === rolls.length - 1 ? 160 : 85 + index * 8);
    }

    const item = findHappening(finalRoll);
    const next = structuredClone(state);
    next.happening = {
      ...happeningState(next.happening),
      roll: finalRoll,
      range: item?.range || "",
      effect: item?.effect || ""
    };
    happeningRolling = false;
    await saveState(next);
  } finally {
    if (happeningRolling) {
      happeningRolling = false;
      renderHappening();
    }
  }
}

async function handleHappeningChange(event) {
  if (mode !== "gm") return;
  const action = event.target.dataset.happeningAction;
  if (action !== "visible" && action !== "locked") return;
  const next = structuredClone(state);
  next.happening = {
    ...happeningState(next.happening),
    [action]: event.target.checked
  };
  await saveState(next);
}

function previewHappeningRoll(roll) {
  const item = findHappening(roll);
  const card = elements.happening?.querySelector(".happening-card");
  if (!card) return;
  card.classList.add("rolling");
  const rollNumber = card.querySelector(".happening-roll strong");
  const rollRange = card.querySelector(".happening-roll small");
  const effect = card.querySelector("p");
  if (rollNumber) rollNumber.textContent = formatRoll(roll);
  if (rollRange) rollRange.textContent = item?.range || "";
  if (effect) effect.textContent = item?.effect || "";
}

function rollD100() {
  return Math.floor(Math.random() * 100) + 1;
}

function formatRoll(roll) {
  return roll ? String(roll).padStart(2, "0") : "--";
}

function wait(ms) {
  return new Promise(resolve => window.setTimeout(resolve, ms));
}

function openInfoDialog(dataset) {
  const fs = fsData.find(item => item.id === dataset.fsId);
  const milestone = fs?.milestones?.find(item => String(item.value) === dataset.value);
  const info = milestone?.infos?.[Number(dataset.infoIndex)];
  if (!info) return;
  const dialog = elements.detail.querySelector("#info-dialog");
  const title = elements.detail.querySelector("#info-dialog-title");
  const body = elements.detail.querySelector("#info-dialog-body");
  activeInfoText = info.text || "";
  title.textContent = info.title || `情報${Number(dataset.infoIndex) + 1}`;
  body.textContent = activeInfoText;
  dialog.showModal();
}

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text).catch(() => {});
    return;
  }
  const textarea = document.createElement("textarea");
  textarea.value = text;
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
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
  const firstId = fsData[0]?.id || "";
  return {
    activeFsId: firstId,
    activeFsIds: [],
    happening: happeningState(),
    fs: Object.fromEntries(fsData.map(fs => [fs.id, mergeFsState({}, fs)]))
  };
}

function mergeState(raw) {
  const next = defaultState();
  const rawActiveFsIds = Array.isArray(raw?.activeFsIds) ? raw.activeFsIds : [];
  const mergedActiveFsIds = rawActiveFsIds.map(String).filter(id => fsData.some(fs => fs.id === id));
  if (mergedActiveFsIds.length) {
    next.activeFsIds = mergedActiveFsIds;
  }
  if (fsData.some(fs => fs.id === raw?.activeFsId)) {
    next.activeFsId = raw.activeFsId;
    if (!mergedActiveFsIds.length) {
      next.activeFsIds = [raw.activeFsId];
    }
  }
  next.happening = happeningState(raw?.happening);
  Object.entries(raw?.fs || {}).forEach(([id, value]) => {
    const fs = fsData.find(item => item.id === id);
    next.fs[id] = mergeFsState(value, fs);
  });
  return next;
}

function happeningState(value = {}) {
  const roll = clampProgress(value?.roll, 100);
  const item = roll ? findHappening(roll) : null;
  return {
    visible: Boolean(value?.visible),
    locked: Boolean(value?.locked),
    roll,
    range: String(value?.range || item?.range || ""),
    effect: String(value?.effect || item?.effect || "")
  };
}

function findHappening(roll) {
  return happeningChart.find(item => roll >= item.min && roll <= item.max) || null;
}

function mergeFsState(value, fs = null) {
  const milestoneState = {};
  const infoState = {};
  const milestones = fs?.milestones?.length ? fs.milestones : [{ value: 3 }, { value: 6 }, { value: 9 }, { value: 12 }];
  milestones.forEach(milestone => {
    const milestoneKey = String(milestone.value);
    milestoneState[milestoneKey] = Boolean(value?.milestones?.[milestoneKey]);
    infoState[milestoneKey] = {};
    (milestone.infos || []).forEach((_, index) => {
      const infoKey = String(index);
      infoState[milestoneKey][infoKey] = Boolean(value?.infos?.[milestoneKey]?.[infoKey]);
    });
  });
  return {
    visible: Boolean(value?.visible),
    progress: clampProgress(value?.progress, 99),
    resultStatus: resolveResultStatus(value),
    successVisible: Boolean(value?.successVisible),
    failureVisible: Boolean(value?.failureVisible),
    milestones: milestoneState,
    infos: infoState
  };
}

function resolveResultStatus(value) {
  const status = normalizeResultStatus(value?.resultStatus);
  if (status !== "pending") return status;
  if (value?.successVisible) return "success";
  if (value?.failureVisible) return "failure";
  return "pending";
}

function normalizeResultStatus(value) {
  return value === "success" || value === "failure" ? value : "pending";
}

function clampProgress(value, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(max, Math.round(number)));
}

function fsState(id) {
  const fs = fsData.find(item => item.id === id);
  return mergeFsState(state.fs?.[id], fs);
}

function activeFsId() {
  return activeFsIds()[0] || state.activeFsId || fsData[0]?.id;
}

function activeFsIds(source = state) {
  if (Array.isArray(source.activeFsIds)) {
    return source.activeFsIds.map(String).filter(id => fsData.some(fs => fs.id === id));
  }
  return fsData.some(fs => fs.id === source.activeFsId) ? [source.activeFsId] : [];
}

function activeFsItems() {
  const visibleItems = visibleFsItems();
  const ids = activeFsIds();
  return visibleItems.filter(fs => ids.includes(fs.id));
}

function updateIdList(ids, id, checked) {
  const set = new Set(ids);
  if (checked) {
    set.add(id);
  } else {
    set.delete(id);
  }
  return fsData.map(fs => fs.id).filter(fsId => set.has(fsId));
}

function selectableFsId(id) {
  const visibleItems = visibleFsItems();
  if (visibleItems.some(fs => fs.id === id)) return id;
  return visibleItems[0]?.id || fsData[0]?.id;
}

function visibleFsItems() {
  return fsData.filter(fs => showAllFs || isFsUnlocked(fs));
}

function isFsUnlocked(fs) {
  return getRequiresSuccess(fs).every(id => isFsSuccessful(id));
}

function isFsSuccessful(id) {
  const fs = fsData.find(item => item.id === id);
  return fsState(fs?.id || id).resultStatus === "success";
}

function getRequiresSuccess(fs) {
  const value = fs.requiresSuccess || fs.requires_success || fs.prerequisites || [];
  return Array.isArray(value) ? value.map(String).filter(Boolean) : [];
}

function renderPrerequisiteBadges(ids) {
  if (!ids.length) return "";
  const badges = ids.map(id => {
    const satisfied = isFsSuccessful(id);
    return `<span class="req-badge ${satisfied ? "ok" : "missing"}">${escapeHtml(id)}</span>`;
  }).join("");
  return `<span class="req-badges">${badges}</span>`;
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
  const required = normalizeTextList(participation.required);
  const recommended = normalizeTextList(participation.recommended);
  const parts = [];
  if (required.length) parts.push(limitConditionText(`${required.join("・")}参加必須`));
  if (recommended.length) parts.push(limitConditionText(recommended.join("・")));
  return parts.join(" / ") || "指定なし";
}

function normalizeTextList(value) {
  if (!value) return [];
  const items = Array.isArray(value) ? value : [value];
  return items.map(item => String(item).trim()).filter(Boolean);
}

function limitConditionText(text) {
  return String(text).slice(0, 25);
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
