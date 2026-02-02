<!-- FILE: src/App.vue -->
<template>
  <main class="page">
    <!-- TOP -->
    <header class="top">
      <div class="brand">
        <div class="logo">J</div>
        <div class="brand-text">
          <h1 class="title">Jumpers</h1>
          <p class="sub">Day lines checklist (Settings → Home)</p>
        </div>
      </div>

      <div class="right">
        <span class="time">KST {{ kstTime }}</span>
        <button class="nav-btn" type="button" @click="toggleView">
          {{ view === "home" ? "SETTINGS" : "HOME" }}
        </button>
      </div>
    </header>

    <!-- HOME -->
    <section v-if="view === 'home'" class="content">
      <p class="hint">
        ✅ 체크하면 <b>해당 라인 1개만</b> 같은 요일의 <b>다음주(+7일)</b>로 이동<br />
        ✅ 남은 라인은 <b>그 주에 그대로</b> 남아 있음<br />
        ✅ 이동된 라인은 <b>다음주 카드에 체크 풀린 상태</b>로 다시 등장
      </p>

      <p v-if="lastError" class="err">저장 오류: {{ lastError }}</p>

      <section class="days" v-if="ready">
        <article
          v-for="day in orderedDays"
          :key="day.key + ':' + day.shift"
          class="day-card"
        >
          <header class="day-head">
            <h2 class="day-title">
              {{ day.label }}
              <span class="day-date">{{ day.dateText }}</span>
            </h2>

            <span class="day-badge" :class="{ done: dayIsDone(day.key, day.shift) }">
              {{ dayIsDone(day.key, day.shift) ? "완료 → 다음주로" : "진행중" }}
            </span>
          </header>

          <ul class="lines">
            <li
              v-for="ln in linesAt(day.key, day.shift)"
              :key="day.key + ':' + day.shift + ':' + ln.id"
              class="line"
            >
              <label class="line-label">
                <input
                  type="checkbox"
                  :checked="false"
                  @change="moveLineToNextWeek(day.key, day.shift, ln.id, $event)"
                />
                <span class="text">{{ ln.text }}</span>
              </label>

              <span class="tag" :class="ln.kind">
                {{ ln.kind === "pickup" ? "승차" : "하차" }}
              </span>
            </li>
          </ul>

          <div v-if="linesAt(day.key, day.shift).length === 0" class="day-empty">
            이 요일은 모두 완료됨 ✅
          </div>
        </article>
      </section>

      <div v-else class="loading">로딩중…</div>

      <div class="danger-zone">
        <button class="danger" type="button" @click="resetStateOnly" :disabled="busy">
          체크상태 전체 초기화
        </button>
      </div>
    </section>

    <!-- SETTINGS -->
    <section v-else class="content">
      <header class="settings-head">
        <h2 class="section-title">설정</h2>
        <div class="settings-actions">
          <button class="btn" type="button" @click="reloadAll" :disabled="busy">새로고침</button>
          <button class="btn primary" type="button" @click="saveTemplateNow" :disabled="busy">
            저장
          </button>
        </div>
      </header>

      <p class="desc">
        요일별 라인 추가/삭제/수정 → <b>Firestore에 즉시 반영</b>
      </p>

      <p v-if="lastError" class="err">저장 오류: {{ lastError }}</p>

      <div v-if="!ready" class="loading">로딩중…</div>

      <div v-else class="settings">
        <div class="tabs">
          <button
            v-for="k in dayKeys"
            :key="k"
            type="button"
            class="tab"
            :class="{ active: editDayKey === k }"
            @click="editDayKey = k"
          >
            {{ dayLabels[k] }}
          </button>
        </div>

        <div class="editor">
          <div class="editor-head">
            <h3 class="editor-title">
              {{ dayLabels[editDayKey] }} 라인
              <span class="editor-sub">추가/삭제/수정 → 자동 저장</span>
            </h3>

            <button class="btn" type="button" @click="addLine(editDayKey)" :disabled="busy">
              + 라인 추가
            </button>
          </div>

          <ul class="lines">
            <li v-for="(ln, idx) in templateDays[editDayKey]" :key="ln.id" class="line edit-line">
              <div class="line-edit-row">
                <select class="inp smallsel" v-model="ln.kind" @change="persistTemplateDebounced()">
                  <option value="pickup">승차</option>
                  <option value="dropoff">하차</option>
                </select>

                <input
                  class="inp"
                  v-model="ln.text"
                  placeholder="예) 14:03 [레이크시티] 최시온"
                  @input="persistTemplateDebounced()"
                />

                <button class="btn small" type="button" @click="moveLine(editDayKey, idx, -1)">▲</button>
                <button class="btn small" type="button" @click="moveLine(editDayKey, idx, 1)">▼</button>

                <button class="btn small danger2" type="button" @click="removeLine(editDayKey, idx)">
                  삭제
                </button>
              </div>
            </li>
          </ul>

          <div v-if="templateDays[editDayKey].length === 0" class="day-empty">
            라인이 없습니다.
          </div>
        </div>
      </div>

      <div class="danger-zone">
        <button class="danger" type="button" @click="resetTemplateToDefault" :disabled="busy">
          템플릿 기본값으로 되돌리기(자동 저장)
        </button>
      </div>
    </section>

    <footer class="footer">© Jumpers</footer>
  </main>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from "vue";
import {
  defaultTemplate,
  defaultState,
  loadTemplate,
  saveTemplate,
  loadState,
  saveState,
} from "@/services/jumpersStore";

/** ===== KST clock ===== */
function createKstClock() {
  const tick = ref(Date.now());
  let timer = null;

  const kstTime = computed(() => {
    return new Intl.DateTimeFormat("ko-KR", {
      timeZone: "Asia/Seoul",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(tick.value));
  });

  const kstDate = computed(() => {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date(tick.value));
    const y = parts.find((p) => p.type === "year")?.value || "0000";
    const m = parts.find((p) => p.type === "month")?.value || "00";
    const d = parts.find((p) => p.type === "day")?.value || "00";
    return `${y}-${m}-${d}`;
  });

  const kstWeekdayKey = computed(() => {
    const wd = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Seoul",
      weekday: "short",
    }).format(new Date(tick.value));
    const map = { Mon: "mon", Tue: "tue", Wed: "wed", Thu: "thu", Fri: "fri", Sat: "sat", Sun: "sun" };
    return map[wd] || "mon";
  });

  const start = () => {
    if (timer) return;
    tick.value = Date.now();
    timer = setInterval(() => (tick.value = Date.now()), 1000);
  };
  const stop = () => {
    if (!timer) return;
    clearInterval(timer);
    timer = null;
  };
  return { kstTime, kstDate, kstWeekdayKey, start, stop };
}

const view = ref("home");
const { kstTime, kstDate, kstWeekdayKey, start: startKst, stop: stopKst } = createKstClock();

function toggleView() {
  view.value = view.value === "home" ? "settings" : "home";
}

/** ===== Labels / order ===== */
const dayLabels = { mon: "월요일", tue: "화요일", wed: "수요일", thu: "목요일", fri: "금요일" };
const dayKeys = ["mon", "tue", "wed", "thu", "fri"];

const weekdayIdx = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
function parseKstDateToUtcMidnight(yyyyMmDd) {
  const [y, m, d] = (yyyyMmDd || "1970-01-01").split("-").map((v) => parseInt(v, 10));
  return new Date(Date.UTC(y || 1970, (m || 1) - 1, d || 1, 0, 0, 0));
}
function addDaysUtc(dateObj, days) {
  return new Date(dateObj.getTime() + days * 86400000);
}
function formatDotYmd(dateObj) {
  const y = dateObj.getUTCFullYear();
  const m = dateObj.getUTCMonth() + 1;
  const d = dateObj.getUTCDate();
  return `${y}.${m}.${d}`;
}

/** ===== data ===== */
const ready = ref(false);
const busy = ref(false);
const lastError = ref("");

const template = ref(defaultTemplate());
const state = ref(defaultState());
const templateDays = computed(() => template.value.days);

const editDayKey = ref("mon");

/**
 * ✅ NEW STATE RULE
 * - state.weekShift[dayKey] = "현재(가장 위에 보여줄) 주차(shift)"   (기존 필드 재사용)
 * - state.doneMap[dayKey][lineId] = 그 라인이 속한 주차 shift(number) (기존 doneMap을 숫자맵으로 재사용)
 *
 * 즉, 더 이상 boolean done이 아니라 "라인 위치(몇 주차인지)" 저장.
 */

function getBaseShift(dayKey) {
  const n = state.value?.weekShift?.[dayKey];
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
}

function getLineShift(dayKey, lineId) {
  const v = state.value?.doneMap?.[dayKey]?.[lineId];
  return Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0;
}

function setLineShift(dayKey, lineId, shift) {
  if (!state.value.doneMap) state.value.doneMap = {};
  if (!state.value.doneMap[dayKey]) state.value.doneMap[dayKey] = {};
  state.value.doneMap[dayKey][lineId] = shift;
}

function normalizeBaseShift(dayKey) {
  const base = getBaseShift(dayKey);
  const lines = templateDays.value?.[dayKey] || [];
  if (lines.length === 0) return;

  let cur = base;
  while (true) {
    const hasAny = lines.some((ln) => getLineShift(dayKey, ln.id) === cur);
    if (hasAny) break;

    const maxShift = Math.max(cur, ...lines.map((ln) => getLineShift(dayKey, ln.id)));
    if (cur >= maxShift) break;

    cur += 1;
  }

  state.value.weekShift[dayKey] = cur;
}

/** 날짜 계산: (dayKey, shift) => 실제 표시 날짜 */
function getPlannedDateUtc(targetKey, shift) {
  const todayUtc = parseKstDateToUtcMidnight(kstDate.value);
  const todayIdx = weekdayIdx[kstWeekdayKey.value] ?? 1;
  const targetIdx = weekdayIdx[targetKey] ?? 1;

  const baseDelta = (targetIdx - todayIdx + 7) % 7;
  const extraDelta = (Number.isFinite(shift) ? shift : 0) * 7;

  return addDaysUtc(todayUtc, baseDelta + extraDelta);
}

/** ✅ 주차별 카드 생성 */
function shiftsToRender(dayKey) {
  const lines = templateDays.value?.[dayKey] || [];
  const base = getBaseShift(dayKey);

  // 라인이 없으면 카드 1개만
  if (lines.length === 0) return [base];

  // 라인이 속한 shift들을 모음
  const set = new Set();
  set.add(base);
  for (const ln of lines) set.add(getLineShift(dayKey, ln.id));

  // base보다 작은 건 화면에서 의미 없으니 제거
  const arr = Array.from(set).filter((s) => s >= base);
  arr.sort((a, b) => a - b);
  return arr;
}

const orderedDays = computed(() => {
  const rows = [];
  for (const k of dayKeys) {
    const shifts = shiftsToRender(k);
    for (const sh of shifts) {
      const dateUtc = getPlannedDateUtc(k, sh);
      rows.push({
        key: k,
        shift: sh,
        label: dayLabels[k],
        dateUtc,
        dateText: formatDotYmd(dateUtc),
      });
    }
  }
  rows.sort((a, b) => a.dateUtc.getTime() - b.dateUtc.getTime());
  return rows;
});

/** ✅ 특정 요일/주차에 속한 라인만 보여주기 */
function linesAt(dayKey, shift) {
  const lines = templateDays.value?.[dayKey] || [];
  return lines.filter((ln) => getLineShift(dayKey, ln.id) === shift);
}

function dayIsDone(dayKey, shift) {
  const lines = templateDays.value?.[dayKey] || [];
  if (lines.length === 0) return true; // 라인 없는 요일은 항상 완료로 간주(표시는 그대로)
  return linesAt(dayKey, shift).length === 0;
}

/** ✅ 체크하면 "그 라인만" 다음주(+1 shift)로 이동 */
function moveLineToNextWeek(dayKey, shift, lineId, ev) {
  const checked = !!ev?.target?.checked;
  if (!checked) return;

  if (ev?.target) ev.target.checked = false;

  // 현재 shift에서 다음 shift로 이동
  setLineShift(dayKey, lineId, (Number.isFinite(shift) ? shift : 0) + 1);

  // baseShift(맨 위 카드)가 비었다면 자동으로 다음으로 당김
  normalizeBaseShift(dayKey);

  persistStateDebounced();
}

/** ===== Persist state ===== */
let stateTimer = null;
async function persistStateNow() {
  lastError.value = "";
  try {
    await saveState({ ...state.value, savedAt: Date.now() });
  } catch (e) {
    console.error("[saveState] failed:", e);
    lastError.value = e?.message || String(e);
  }
}
function persistStateDebounced() {
  if (stateTimer) clearTimeout(stateTimer);
  stateTimer = setTimeout(() => persistStateNow(), 350);
}

async function resetStateOnly() {
  busy.value = true;
  lastError.value = "";
  try {
    const def = defaultState();
    state.value = def;
    await saveState(state.value);
  } catch (e) {
    console.error("[resetState] failed:", e);
    lastError.value = e?.message || String(e);
  } finally {
    busy.value = false;
  }
}

/** ===== Settings CRUD ===== */
function uid(prefix = "ln") {
  return `${prefix}-${Math.random().toString(16).slice(2)}-${Date.now().toString(16)}`;
}

function addLine(dayKey) {
  const id = uid(dayKey);
  templateDays.value[dayKey].push({ id, kind: "pickup", text: "" });

  // 새 라인은 "현재 baseShift"에 붙이기
  setLineShift(dayKey, id, getBaseShift(dayKey));

  persistTemplateDebounced();
  persistStateDebounced();
}

function removeLine(dayKey, index) {
  const ln = templateDays.value[dayKey][index];
  templateDays.value[dayKey].splice(index, 1);

  // 삭제된 라인의 shift 기록도 제거
  if (state.value?.doneMap?.[dayKey] && ln?.id) {
    delete state.value.doneMap[dayKey][ln.id];
  }
  normalizeBaseShift(dayKey);

  persistTemplateDebounced();
  persistStateDebounced();
}

function moveLine(dayKey, index, dir) {
  const arr = templateDays.value[dayKey];
  const ni = index + dir;
  if (ni < 0 || ni >= arr.length) return;
  const [it] = arr.splice(index, 1);
  arr.splice(ni, 0, it);
  persistTemplateDebounced();
}

/** ===== Persist template ===== */
let tplTimer = null;

async function saveTemplateNow() {
  busy.value = true;
  lastError.value = "";
  try {
    await saveTemplate(template.value);
  } catch (e) {
    console.error("[saveTemplate] failed:", e);
    lastError.value = e?.message || String(e);
  } finally {
    busy.value = false;
  }
}

function persistTemplateDebounced() {
  if (tplTimer) clearTimeout(tplTimer);
  tplTimer = setTimeout(() => {
    saveTemplateNow();
  }, 450);
}

async function resetTemplateToDefault() {
  template.value = defaultTemplate();

  // 템플릿 리셋 시: 라인 shift 맵도 초기화(기본은 0)
  const def = defaultState();
  state.value.weekShift = def.weekShift;
  state.value.doneMap = {};
  persistTemplateDebounced();
  persistStateDebounced();
}

async function reloadAll() {
  busy.value = true;
  lastError.value = "";
  try {
    await initLoad(true);
  } finally {
    busy.value = false;
  }
}

/** ===== load ===== */
function looksLikeLegacyDoneMap(dm) {
  if (!dm || typeof dm !== "object") return false;
  return Object.keys(dm).some((k) => k.includes(":")); // 예: "tue:0" 같은 키면 구버전
}

async function initLoad(force = false) {
  ready.value = false;
  lastError.value = "";

  // template
  try {
    const t = await loadTemplate();
    if (!t || !t.days || force) {
      const def = defaultTemplate();
      template.value = def;
      await saveTemplate(def);
    } else {
      template.value = { version: 2, days: t.days };
    }
  } catch (e) {
    console.error("[loadTemplate] failed:", e);
    lastError.value = e?.message || String(e);
    template.value = defaultTemplate();
  }

  // state
  try {
    const s = await loadState();
    if (!s || !s.weekShift) {
      const defS = defaultState();
      state.value = defS;
      await saveState(defS);
    } else {
      const dm = s.doneMap || {};

      // ✅ 구버전(doneMap이 sk키 구조)이면, 깨끗하게 초기화(라인 이동 방식이 완전히 달라서 변환 불가)
      const safeDoneMap = looksLikeLegacyDoneMap(dm) ? {} : dm;

      state.value = {
        weekShift: s.weekShift || defaultState().weekShift,
        doneMap: safeDoneMap,
        savedAt: s.savedAt || Date.now(),
      };
    }
  } catch (e) {
    console.error("[loadState] failed:", e);
    lastError.value = e?.message || String(e);
    state.value = defaultState();
  }

  // ✅ 템플릿에 존재하는 모든 라인은 shift 기본값(0)이 보장되도록(저장 없이 런타임에서만)
  for (const k of dayKeys) {
    const lines = template.value?.days?.[k] || [];
    for (const ln of lines) {
      const sh = getLineShift(k, ln.id);
      if (!Number.isFinite(sh) || sh < 0) setLineShift(k, ln.id, 0);
    }
    normalizeBaseShift(k);
  }

  if (!template.value?.days?.[editDayKey.value]) editDayKey.value = "mon";
  ready.value = true;
}

onMounted(async () => {
  startKst();
  await initLoad(false);
});

onBeforeUnmount(() => {
  stopKst();
  if (stateTimer) clearTimeout(stateTimer);
  if (tplTimer) clearTimeout(tplTimer);
});
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #0b0c10;
  color: #eaf0ff;
  font-family: system-ui, -apple-system, Segoe UI, Roboto, "Noto Sans";
}

/* TOP */
.top {
  position: sticky;
  top: 0;
  z-index: 10;
  background: rgba(11, 12, 16, 0.85);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
}

.brand {
  display: flex;
  gap: 10px;
  align-items: center;
}

.logo {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  font-weight: 800;
  background: linear-gradient(135deg, #4f6bff, #00c2ff);
  color: #081018;
}

.brand-text .title {
  margin: 0;
  font-size: 15px;
}

.brand-text .sub {
  margin: 0;
  font-size: 11px;
  opacity: 0.7;
}

.right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.time {
  font-size: 12px;
  opacity: 0.8;
}

.nav-btn {
  font-size: 12px;
  padding: 7px 10px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: transparent;
  color: #eaf0ff;
  cursor: pointer;
}

.nav-btn:hover {
  background: rgba(255, 255, 255, 0.06);
}

.content {
  padding: 16px;
  max-width: 760px;
  margin: 0 auto;
}

.hint {
  margin: 0 0 14px;
  font-size: 12px;
  opacity: 0.75;
  line-height: 1.5;
}

.loading {
  opacity: 0.75;
  font-size: 13px;
  padding: 10px 0;
}

.err {
  margin: 8px 0 12px;
  font-size: 12px;
  color: #ffd6d6;
  opacity: 0.95;
}

/* Days */
.days {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.day-card {
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.05);
  border-radius: 18px;
  padding: 14px;
}

.day-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  margin-bottom: 10px;
}

.day-title {
  margin: 0;
  font-size: 16px;
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.day-date {
  font-size: 12px;
  opacity: 0.65;
  font-weight: 500;
}

.day-badge {
  font-size: 11px;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  opacity: 0.9;
}

.day-badge.done {
  background: rgba(0, 200, 120, 0.14);
  border-color: rgba(0, 200, 120, 0.35);
  color: #6cffc0;
}

/* Lines */
.lines {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.03);
}

.line-label {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  cursor: pointer;
  flex: 1;
  min-width: 0;
}

.line-label input {
  margin-top: 2px;
}

.text {
  font-size: 14px;
  line-height: 1.35;
  word-break: break-word;
}

/* Tags */
.tag {
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  white-space: nowrap;
  opacity: 0.95;
}

.tag.pickup {
  background: rgba(79, 107, 255, 0.18);
  border-color: rgba(79, 107, 255, 0.5);
}

.tag.dropoff {
  background: rgba(255, 159, 67, 0.16);
  border-color: rgba(255, 159, 67, 0.45);
}

.day-empty {
  margin-top: 10px;
  font-size: 12px;
  opacity: 0.7;
}

/* Danger zone */
.danger-zone {
  margin-top: 14px;
  display: flex;
  justify-content: flex-end;
}

.danger {
  font-size: 12px;
  padding: 8px 10px;
  border-radius: 12px;
  border: 1px solid rgba(255, 80, 80, 0.35);
  background: rgba(255, 80, 80, 0.12);
  color: #ffd6d6;
  cursor: pointer;
}

.danger:hover {
  background: rgba(255, 80, 80, 0.18);
}

/* SETTINGS */
.settings-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 6px;
}

.section-title {
  margin: 0;
  font-size: 18px;
}

.desc {
  margin: 0 0 12px;
  font-size: 12px;
  opacity: 0.75;
}

.settings-actions {
  display: flex;
  gap: 8px;
}

.btn {
  font-size: 12px;
  padding: 7px 10px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: transparent;
  color: #eaf0ff;
  cursor: pointer;
}

.btn:hover {
  background: rgba(255, 255, 255, 0.06);
}

.btn.primary {
  background: rgba(79, 107, 255, 0.18);
  border-color: rgba(79, 107, 255, 0.55);
}

.btn.small {
  font-size: 11px;
  padding: 6px 8px;
  border-radius: 9px;
}

.btn.danger2 {
  border-color: rgba(255, 80, 80, 0.35);
  background: rgba(255, 80, 80, 0.12);
  color: #ffd6d6;
}

.tabs {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 10px;
}

.tab {
  font-size: 12px;
  padding: 7px 10px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: transparent;
  color: #eaf0ff;
  cursor: pointer;
  opacity: 0.9;
}

.tab.active {
  background: rgba(0, 200, 120, 0.14);
  border-color: rgba(0, 200, 120, 0.35);
  color: #6cffc0;
}

.editor {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.editor-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.editor-title {
  margin: 0;
  font-size: 14px;
}

.editor-sub {
  margin-left: 8px;
  font-size: 11px;
  opacity: 0.7;
  font-weight: 500;
}

.edit-line {
  padding: 8px;
}

.line-edit-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.inp {
  height: 34px;
  padding: 0 10px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(0, 0, 0, 0.18);
  color: #eaf0ff;
  outline: none;
}

.inp:focus {
  border-color: rgba(79, 107, 255, 0.55);
}

.smallsel {
  width: 88px;
}

.footer {
  text-align: center;
  font-size: 11px;
  opacity: 0.6;
  padding: 24px 0 32px;
}
</style>
