<template>
  <main class="page">
    <!-- TOP -->
    <header class="top">
      <div class="brand">
        <div class="logo">J</div>
        <div class="brand-text">
          <h1 class="title">점퍼즈 차량시간표</h1>
          <p class="sub">기본노선 시간표 기준 · 명단 자동 합치기</p>
        </div>
      </div>

      <div class="right">
        <div class="clock">
          <span class="k">KST</span>
          <span class="v">{{ nowKst }}</span>
        </div>
        <RouterLink class="nav-btn" to="/settings">설정</RouterLink>
      </div>
    </header>

    <section class="content">
      <!-- HERO -->
      <section class="hero">
        <div class="hero-left">
          <h2 class="h2">운영 홈</h2>

          <div class="chips">
            <span class="chip">{{ todayLabel }}</span>
            <span class="chip ok">운영중</span>
            <span class="chip soft">시간순 정렬</span>
          </div>

          <div class="controls">
            <!-- ✅ 승차/하차 토글 제거: 카드 안에서 승차/하차 뱃지로 구분 -->
            <div class="dayseg">
              <button
                v-for="d in dayTabs"
                :key="d.key"
                class="seg-btn"
                :class="{ active: selectedDay === d.key }"
                type="button"
                @click="selectedDay = d.key"
              >
                {{ d.label }}
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- SEARCH -->
      <section class="bar">
        <div class="search">
          <input class="inp" v-model="q" placeholder="이름/장소 검색 (예: 더샵, 김준영)" />
          <button class="btn small" type="button" @click="q = ''" :disabled="!q">지우기</button>
        </div>
      </section>

      <!-- DAYS -->
      <section class="days">
        <article v-for="d in filteredDays" :key="d.key" class="day-card">
          <header class="day-head">
            <div class="day-left">
              <h3 class="day-title">
                {{ d.label }}
                <span class="day-date">{{ d.dateText }}</span>
              </h3>
            </div>
          </header>

          <div class="day-body">
            <!-- 진행 -->
            <ul class="timeline">
              <li v-for="st in pendingStopsFor(d.dayKey, d.shift)" :key="st.kind + ':' + st.id" class="stop">
                <div class="stop-left">
                  <div class="time">{{ st.time }}</div>
                  <div class="place">
                    <span class="tag" :class="st.kind === 'pickup' ? 'tag-pickup' : 'tag-dropoff'">
                      {{ st.kind === "pickup" ? "승차" : "하차" }}
                    </span>
                    <span class="place-text">{{ st.place }}</span>
                  </div>
                </div>

                <div class="stop-right">
                  <div class="names">
                    <span v-for="(nm, i) in namesAt(d.dayKey, d.shift, st.kind, st.id)" :key="nm + i" class="name">
                      {{ nm }}
                    </span>
                    <span v-if="namesAt(d.dayKey, d.shift, st.kind, st.id).length === 0" class="empty2">—</span>
                  </div>

                  <button
                    class="done-btn"
                    type="button"
                    :disabled="!canCompleteToday(d.isoYmd)"
                    :class="{ disabled: !canCompleteToday(d.isoYmd) }"
                    @click="markDone(d.dayKey, st.kind, st.id)"
                  >
                    완료
                  </button>
                </div>
              </li>
            </ul>

            <div v-if="pendingStopsFor(d.dayKey, d.shift).length === 0" class="day-empty">
              진행중 카드가 없습니다.
            </div>

            <!-- 완료목록: 당일만 -->
            <section v-if="isTodayIso(d.isoYmd)" class="done-section">
              <div class="done-head">
                <div class="done-title">{{ d.label }} 완료목록</div>
                <div class="done-sub">완료 후 10분 카운터(0초)면 자동으로 다음주 동일요일로 이동</div>
              </div>

              <ul class="timeline done">
                <li
                  v-for="st in completedStopsFor(d.dayKey, d.shift)"
                  :key="'done:' + st.kind + ':' + st.id"
                  class="stop done-card"
                >
                  <div class="stop-left">
                    <div class="time">{{ st.time }}</div>
                    <div class="place">
                      <span class="tag" :class="st.kind === 'pickup' ? 'tag-pickup' : 'tag-dropoff'">
                        {{ st.kind === "pickup" ? "승차" : "하차" }}
                      </span>
                      <span class="place-text">{{ st.place }}</span>
                    </div>
                  </div>

                  <div class="stop-right">
                    <div class="names">
                      <span
                        v-for="(nm, i) in namesAt(d.dayKey, d.shift, st.kind, st.id)"
                        :key="'d' + nm + i"
                        class="name"
                      >
                        {{ nm }}
                      </span>
                      <span v-if="namesAt(d.dayKey, d.shift, st.kind, st.id).length === 0" class="empty2">—</span>
                    </div>

                    <div class="done-actions">
                      <span class="countdown" :title="'10분 카운터'">
                        {{ countdownText(d.dayKey, st.kind, st.id) }}
                      </span>

                      <button class="done-btn cancel" type="button" @click="undoDone(d.dayKey, st.kind, st.id)">
                        완료취소
                      </button>
                    </div>
                  </div>
                </li>
              </ul>

              <div v-if="completedStopsFor(d.dayKey, d.shift).length === 0" class="done-empty">
                완료된 카드가 없습니다.
              </div>
            </section>

            <div v-if="allStopsFor(d.dayKey).length === 0" class="day-empty">
              이 요일은 노선이 없습니다. (설정에서 기본노선 등록)
            </div>
          </div>
        </article>

        <div v-if="filteredDays.length === 0" class="empty">검색 결과가 없습니다.</div>
      </section>
    </section>

    <footer class="footer">© Jumpers</footer>
  </main>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { db } from "@/firebase";
import { doc, onSnapshot, setDoc, serverTimestamp } from "firebase/firestore";

/** ===== Firestore docs ===== */
const APP_COL = "jumpers_app";
const APP_DOC = "default";
const STATE_COL = "jumpers_state";
const STATE_DOC = "default";

/** ===== realtime data from Firestore ===== */
const routes = ref({
  mon: { pickup: [], dropoff: [] },
  tue: { pickup: [], dropoff: [] },
  wed: { pickup: [], dropoff: [] },
  thu: { pickup: [], dropoff: [] },
  fri: { pickup: [], dropoff: [] },
});
const roster = ref([]);

/** ===== KST clock ===== */
const tick = ref(Date.now());
let timer = null;

const nowMs = computed(() => tick.value);

const nowKst = computed(() => {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(tick.value));
});

const todayLabel = computed(() => {
  const wd = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", weekday: "long" }).format(
    new Date(tick.value)
  );
  const ymd = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(tick.value));
  const [y, m, d] = ymd.split("-").map((v) => String(parseInt(v, 10)));
  return `${wd} ${y}.${m}.${d}`;
});

onMounted(() => (timer = setInterval(() => (tick.value = Date.now()), 1000)));
onBeforeUnmount(() => timer && clearInterval(timer));

/** ===== day utils (KST 기반) ===== */
const weekdayIdx = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };

function kstIsoYmd() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(tick.value));
}
function parseIsoToUtcMidnight(yyyyMmDd) {
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
function formatIsoYmd(dateObj) {
  const y = dateObj.getUTCFullYear();
  const m = String(dateObj.getUTCMonth() + 1).padStart(2, "0");
  const d = String(dateObj.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getWeekStartUtcForIso(isoYmd) {
  const todayUtc = parseIsoToUtcMidnight(isoYmd);
  const tmpTick = Date.UTC(todayUtc.getUTCFullYear(), todayUtc.getUTCMonth(), todayUtc.getUTCDate(), 12, 0, 0);
  const wd = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Seoul", weekday: "short" }).format(new Date(tmpTick));
  const map = { Mon: "mon", Tue: "tue", Wed: "wed", Thu: "thu", Fri: "fri", Sat: "sat", Sun: "sun" };
  const k = map[wd] || "mon";
  const idx = weekdayIdx[k] ?? 1;

  const deltaToMon = (idx - 1 + 7) % 7;
  return addDaysUtc(todayUtc, -deltaToMon);
}
function getCurrentWeekStartUtc() {
  return getWeekStartUtcForIso(kstIsoYmd());
}
function plannedDateUtc(dayKey, shift = 0) {
  const ws = getCurrentWeekStartUtc();
  const targetIdx = weekdayIdx[dayKey] ?? 1;
  return addDaysUtc(ws, (targetIdx - 1) + shift * 7);
}

const baseDays = [
  { key: "mon", label: "월요일" },
  { key: "tue", label: "화요일" },
  { key: "wed", label: "수요일" },
  { key: "thu", label: "목요일" },
  { key: "fri", label: "금요일" },
];

function labelByDayKey(k) {
  return baseDays.find((d) => d.key === k)?.label || k;
}

function weekdayKeyOfIso(isoYmd) {
  const dt = parseIsoToUtcMidnight(isoYmd);
  const t = Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate(), 12, 0, 0);
  const wd = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Seoul", weekday: "short" }).format(new Date(t));
  const map = { Mon: "mon", Tue: "tue", Wed: "wed", Thu: "thu", Fri: "fri", Sat: "sat", Sun: "sun" };
  return map[wd] || "mon";
}

const dayCards = computed(() => {
  const todayIso = kstIsoYmd();
  const todayUtc = parseIsoToUtcMidnight(todayIso);

  const cards = [];
  for (let i = 0; i <= 7; i += 1) {
    const dt = addDaysUtc(todayUtc, i);
    const iso = formatIsoYmd(dt);
    const dayKey = weekdayKeyOfIso(iso);
    if (!["mon", "tue", "wed", "thu", "fri"].includes(dayKey)) continue;

    const curWs = getCurrentWeekStartUtc();
    const occWs = getWeekStartUtcForIso(iso);
    const shift = Math.round((occWs.getTime() - curWs.getTime()) / (7 * 86400000));

    cards.push({
      key: `${dayKey}:${iso}`,
      dayKey,
      isoYmd: iso,
      shift,
      label: labelByDayKey(dayKey),
      dateText: formatDotYmd(dt),
    });
  }
  return cards;
});

const dayTabs = computed(() => [{ key: "all", label: "전체" }, ...baseDays.map((d) => ({ key: d.key, label: d.label }))]);

/** ===== UI state ===== */
const selectedDay = ref("all");
const q = ref("");

/** ===== helpers ===== */
function sortByTimeAsc(a, b) {
  const [ah, am] = String(a.time || "00:00").split(":").map((x) => parseInt(x, 10));
  const [bh, bm] = String(b.time || "00:00").split(":").map((x) => parseInt(x, 10));
  return ah * 60 + am - (bh * 60 + bm);
}

/** ✅ "명단 배정된 stop만 노출" 유지 (승차/하차 각각 카운트) */
const assignedCountByDayKindPlace = computed(() => {
  const out = {
    pickup: { mon: {}, tue: {}, wed: {}, thu: {}, fri: {} },
    dropoff: { mon: {}, tue: {}, wed: {}, thu: {}, fri: {} },
  };

  const list = Array.isArray(roster.value) ? roster.value : [];
  for (const p of list) {
    const assign = p?.assign || {};
    for (const d of baseDays) {
      const dk = d.key;
      const a = assign?.[dk] || {};
      const pu = typeof a.pickupPlace === "string" ? a.pickupPlace : "";
      const dof = typeof a.dropoffPlace === "string" ? a.dropoffPlace : "";

      if (pu) out.pickup[dk][pu] = (out.pickup[dk][pu] || 0) + 1;
      if (dof) out.dropoff[dk][dof] = (out.dropoff[dk][dof] || 0) + 1;
    }
  }
  return out;
});

/** ✅ 한 요일 카드에서 승차/하차를 "하나의 타임라인"으로 합치고 시간순 정렬 */
function allStopsFor(dayKey) {
  if (!Array.isArray(roster.value) || roster.value.length === 0) return [];

  const puArr = Array.isArray(routes.value?.[dayKey]?.pickup) ? routes.value[dayKey].pickup : [];
  const doArr = Array.isArray(routes.value?.[dayKey]?.dropoff) ? routes.value[dayKey].dropoff : [];

  const puCounts = assignedCountByDayKindPlace.value?.pickup?.[dayKey] || {};
  const doCounts = assignedCountByDayKindPlace.value?.dropoff?.[dayKey] || {};

  const pu = [...puArr]
    .sort(sortByTimeAsc)
    .filter((s) => (puCounts[String(s.place || "")] || 0) > 0)
    .map((s) => ({ ...s, kind: "pickup" }));

  const dof = [...doArr]
    .sort(sortByTimeAsc)
    .filter((s) => (doCounts[String(s.place || "")] || 0) > 0)
    .map((s) => ({ ...s, kind: "dropoff" }));

  return [...pu, ...dof].sort(sortByTimeAsc);
}

/** =========================
 * ✅ NEW STATE MODEL (kind 포함)
 * items["pickup:tue:stopId"] = { shift: 0, doneAt: number|null }
 * ========================= */
const items = ref({}); // key -> {shift, doneAt}

/** key helpers */
function itemKey(dayKey, kind, stopId) {
  return `${kind}:${dayKey}:${stopId}`;
}
function ensureItem(dayKey, kind, stopId) {
  const k = itemKey(dayKey, kind, stopId);
  if (!items.value[k]) items.value[k] = { shift: 0, doneAt: null };
  if (!Number.isFinite(items.value[k].shift)) items.value[k].shift = 0;
  return items.value[k];
}
function getShift(dayKey, kind, stopId) {
  return Math.max(0, Math.floor(ensureItem(dayKey, kind, stopId).shift || 0));
}
function isDone(dayKey, kind, stopId) {
  return !!ensureItem(dayKey, kind, stopId).doneAt;
}
function doneAt(dayKey, kind, stopId) {
  return ensureItem(dayKey, kind, stopId).doneAt || null;
}

/** 카드 shift에 맞춰 표시 */
function visibleStopsForCard(dayKey, cardShift) {
  return allStopsFor(dayKey).filter((s) => getShift(dayKey, s.kind, s.id) === cardShift);
}
function pendingStopsFor(dayKey, cardShift) {
  return visibleStopsForCard(dayKey, cardShift).filter((s) => !isDone(dayKey, s.kind, s.id));
}
function completedStopsFor(dayKey, cardShift) {
  return visibleStopsForCard(dayKey, cardShift).filter((s) => isDone(dayKey, s.kind, s.id));
}

/** KST 기준 스케줄 순간(ms) (현재는 자동완료/자동넘김에 사용하지 않음) */
function scheduleMsKst(dayKey, kind, stopId) {
  const st = allStopsFor(dayKey).find((s) => s.kind === kind && s.id === stopId);
  if (!st?.time) return 0;

  const sh = getShift(dayKey, kind, stopId);
  const dateUtc = plannedDateUtc(dayKey, sh);
  const y = dateUtc.getUTCFullYear();
  const m = dateUtc.getUTCMonth() + 1;
  const d = dateUtc.getUTCDate();

  const [hh, mm] = String(st.time).split(":").map((x) => parseInt(x, 10));
  return Date.UTC(y, m - 1, d, (hh || 0) - 9, mm || 0, 0, 0);
}

/** 당일만 활성 */
function isTodayIso(isoYmd) {
  return isoYmd === kstIsoYmd();
}
function canCompleteToday(cardIsoYmd) {
  return isTodayIso(cardIsoYmd);
}

/** 10분 카운터 */
const AUTO_MS = 10 * 60 * 1000;
function remainMs(dayKey, kind, stopId) {
  const t = doneAt(dayKey, kind, stopId);
  if (!t) return null;
  const left = AUTO_MS - (nowMs.value - t);
  return Math.max(0, left);
}
function mmss(ms) {
  const total = Math.max(0, Math.floor((ms || 0) / 1000));
  const mm = String(Math.floor(total / 60)).padStart(2, "0");
  const ss = String(total % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}
function countdownText(dayKey, kind, stopId) {
  const ms = remainMs(dayKey, kind, stopId);
  if (ms === null) return "—";
  return mmss(ms);
}

/** 완료/취소 */
function markDone(dayKey, kind, stopId) {
  ensureItem(dayKey, kind, stopId).doneAt = nowMs.value;
  scheduleSaveState(true);
}
function undoDone(dayKey, kind, stopId) {
  ensureItem(dayKey, kind, stopId).doneAt = null;
  scheduleSaveState(true);
}

/** 자동 처리
 * ✅ 변경: "시간이 지나면 자동 완료/자동 넘김" 제거
 * - 이제는 '완료'를 눌러야 doneAt이 생김
 * - doneAt이 생긴 것만 10분 후 shift++ + doneAt 초기화
 */
let autoTimer = null;
function runAutoMove() {
  const now = nowMs.value;

  for (const d of baseDays) {
    const dayKey = d.key;
    const stops = allStopsFor(dayKey);

    for (const st of stops) {
      const it = ensureItem(dayKey, st.kind, st.id);

      // (B) 완료 후 10분 -> 다음주로 이동 + 완료 제거 (유지)
      if (it.doneAt && now - it.doneAt >= AUTO_MS) {
        it.doneAt = null;
        it.shift = getShift(dayKey, st.kind, st.id) + 1;
      }
    }
  }
}

/** 주가 바뀌면 shift 당기기 + done 초기화(기존 유지) */
const weekStartYmd = computed(() => formatIsoYmd(getCurrentWeekStartUtc()));
watch(
  () => weekStartYmd.value,
  () => {
    const next = {};
    for (const [k, v] of Object.entries(items.value || {})) {
      const nv = Math.max(0, Math.floor(v?.shift || 0) - 1);
      if (nv > 0) next[k] = { shift: nv, doneAt: null };
      else next[k] = { shift: 0, doneAt: null };
    }
    items.value = next;
    scheduleSaveState(true);
  }
);

/** names */
function namesAt(dayKey, cardShift, kind, stopId) {
  const keyword = q.value.trim().toLowerCase();
  const stop = visibleStopsForCard(dayKey, cardShift).find((s) => s.kind === kind && s.id === stopId);
  const stopPlace = String(stop?.place || "").toLowerCase();

  const names = (Array.isArray(roster.value) ? roster.value : [])
    .map((p) => {
      const a = p.assign?.[dayKey] || { pickupPlace: "", dropoffPlace: "" };
      const chosenPlace = kind === "pickup" ? a.pickupPlace : a.dropoffPlace;
      if (!chosenPlace) return null;
      if (String(chosenPlace) !== String(stop?.place || "")) return null;
      return p.name;
    })
    .filter(Boolean);

  if (!keyword) return names;

  const placeHit = stopPlace.includes(keyword);
  return names.filter((nm) => placeHit || String(nm).toLowerCase().includes(keyword));
}

/** filters */
const filteredDays = computed(() => {
  const keyword = q.value.trim().toLowerCase();
  let base = selectedDay.value === "all" ? dayCards.value : dayCards.value.filter((d) => d.dayKey === selectedDay.value);
  if (!keyword) return base;

  return base.filter((d) => {
    const stops = visibleStopsForCard(d.dayKey, d.shift);
    const placeHit = stops.some((s) => String(s.place || "").toLowerCase().includes(keyword));

    const nameHit = (Array.isArray(roster.value) ? roster.value : []).some((p) => {
      const a = p.assign?.[d.dayKey] || {};
      const nmHit = String(p.name || "").toLowerCase().includes(keyword);
      const pu = String(a.pickupPlace || "").toLowerCase();
      const dof = String(a.dropoffPlace || "").toLowerCase();
      const placeByAssignHit = pu.includes(keyword) || dof.includes(keyword);
      return nmHit || placeByAssignHit;
    });

    return placeHit || nameHit;
  });
});

/** ===== Firestore subscribe + state save ===== */
let unsubApp = null;
let unsubState = null;

let savingTimer = null;
const applyingRemote = ref(false);
const lastLocalWriteAt = ref(0);

function deepClone(v) {
  return JSON.parse(JSON.stringify(v));
}

async function saveStateToFirestore() {
  if (applyingRemote.value) return;

  const now = Date.now();
  lastLocalWriteAt.value = now;

  const payload = {
    items: deepClone(items.value),
    updatedAt: serverTimestamp(),
    savedAt: now,
  };
  await setDoc(doc(db, STATE_COL, STATE_DOC), payload, { merge: true });
}

function scheduleSaveState(immediate = false) {
  if (applyingRemote.value) return;
  if (savingTimer) clearTimeout(savingTimer);

  if (immediate) {
    saveStateToFirestore().catch(() => {});
    return;
  }
  savingTimer = setTimeout(() => {
    saveStateToFirestore().catch(() => {});
  }, 300);
}

watch(
  () => items.value,
  () => scheduleSaveState(false),
  { deep: true }
);

onMounted(() => {
  unsubApp = onSnapshot(
    doc(db, APP_COL, APP_DOC),
    (snap) => {
      if (!snap.exists()) return;
      const data = snap.data() || {};
      if (data.routes) routes.value = data.routes;
      if (Array.isArray(data.people)) roster.value = data.people;
      else roster.value = [];
    },
    () => {}
  );

  unsubState = onSnapshot(
    doc(db, STATE_COL, STATE_DOC),
    (snap) => {
      if (!snap.exists()) return;
      const st = snap.data() || {};
      const remoteSavedAt = Number(st.savedAt || 0);

      // 오래된 스냅샷이면 무시(되돌아옴 방지)
      if (remoteSavedAt && lastLocalWriteAt.value && remoteSavedAt < lastLocalWriteAt.value) return;

      applyingRemote.value = true;
      try {
        items.value = st.items || {};
      } finally {
        setTimeout(() => (applyingRemote.value = false), 0);
      }
    },
    () => {}
  );

  runAutoMove();
  autoTimer = setInterval(runAutoMove, 10 * 1000);
});

onBeforeUnmount(() => {
  if (unsubApp) unsubApp();
  if (unsubState) unsubState();
  if (autoTimer) clearInterval(autoTimer);
  if (savingTimer) clearTimeout(savingTimer);
});
</script>

<style scoped>
/* ✅ 스타일은 너가 준 그대로 (변경 없음) */
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
  z-index: 30;
  background: rgba(11, 12, 16, 0.9);
  backdrop-filter: blur(10px);
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
  font-weight: 900;
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
.clock {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  line-height: 1.1;
}
.clock .k {
  font-size: 10px;
  opacity: 0.65;
}
.clock .v {
  font-size: 12px;
  font-weight: 900;
  opacity: 0.95;
}
.nav-btn {
  font-size: 12px;
  padding: 7px 10px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(255, 255, 255, 0.04);
  color: #eaf0ff;
  text-decoration: none;
}
.nav-btn:hover {
  background: rgba(255, 255, 255, 0.08);
}

.content {
  padding: 16px;
  max-width: 980px;
  margin: 0 auto;
}
.h2 {
  margin: 0;
  font-size: 18px;
}

/* HERO */
.hero {
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.04);
  border-radius: 18px;
  padding: 14px;
}
.chips {
  margin-top: 8px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.chip {
  font-size: 11px;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.03);
}
.chip.ok {
  background: rgba(0, 200, 120, 0.12);
  border-color: rgba(0, 200, 120, 0.35);
  color: #6cffc0;
}
.chip.soft {
  opacity: 0.8;
}

.controls {
  margin-top: 10px;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: center;
}

/* (기존 mode 스타일은 남겨도 무방: 템플릿에서만 제거됨) */
.mode {
  display: flex;
  gap: 6px;
}
.mode-btn {
  font-size: 12px;
  padding: 8px 12px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(0, 0, 0, 0.18);
  color: #eaf0ff;
  cursor: pointer;
}
.mode-btn.active {
  background: rgba(79, 107, 255, 0.18);
  border-color: rgba(79, 107, 255, 0.55);
}

.dayseg {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.seg-btn {
  font-size: 12px;
  padding: 7px 10px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.03);
  color: #eaf0ff;
  cursor: pointer;
  opacity: 0.9;
}
.seg-btn.active {
  background: rgba(0, 200, 120, 0.12);
  border-color: rgba(0, 200, 120, 0.35);
  color: #6cffc0;
}

/* SEARCH */
.bar {
  margin-top: 12px;
  display: flex;
  justify-content: flex-end;
}
.search {
  display: flex;
  gap: 8px;
  width: 100%;
  max-width: 520px;
}
.inp {
  height: 36px;
  padding: 0 10px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(0, 0, 0, 0.18);
  color: #eaf0ff;
  outline: none;
  width: 100%;
  box-sizing: border-box;
}
.inp:focus {
  border-color: rgba(79, 107, 255, 0.55);
}
.btn {
  font-size: 12px;
  padding: 8px 10px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(0, 0, 0, 0.18);
  color: #eaf0ff;
  cursor: pointer;
}
.btn:hover {
  background: rgba(255, 255, 255, 0.06);
}
.btn.small {
  padding: 8px 10px;
}

/* DAYS */
.days {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.day-card {
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.05);
  border-radius: 18px;
  padding: 12px;
}
.day-title {
  margin: 0;
  font-size: 16px;
  display: flex;
  gap: 8px;
  align-items: baseline;
}
.day-date {
  font-size: 12px;
  opacity: 0.65;
  font-weight: 600;
}
.day-body {
  margin-top: 10px;
}

/* TIMELINE */
.timeline {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.stop {
  display: grid;
  grid-template-columns: 160px 1fr;
  gap: 10px;
  padding: 10px;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(0, 0, 0, 0.14);
}
.stop-left {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.time {
  font-size: 18px;
  font-weight: 900;
  letter-spacing: 0.2px;
}
.place {
  display: flex;
  gap: 8px;
  align-items: center;
  min-width: 0;
}
.place-text {
  font-size: 13px;
  opacity: 0.9;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ✅ 승차/하차 태그 */
.tag {
  font-size: 11px;
  padding: 4px 8px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.05);
  font-weight: 900;
  white-space: nowrap;
}
.tag-pickup {
  border-color: rgba(0, 200, 120, 0.35);
  background: rgba(0, 200, 120, 0.12);
  color: #6cffc0;
}
.tag-dropoff {
  border-color: rgba(79, 107, 255, 0.45);
  background: rgba(79, 107, 255, 0.14);
  color: #b7c4ff;
}

.stop-right {
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.names {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.name {
  font-size: 12px;
  padding: 5px 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
  white-space: nowrap;
}
.empty2 {
  font-size: 12px;
  opacity: 0.55;
}

/* 완료 버튼 */
.done-btn {
  font-size: 12px;
  padding: 8px 10px;
  border-radius: 12px;
  border: 1px solid rgba(0, 200, 120, 0.35);
  background: rgba(0, 200, 120, 0.12);
  color: #6cffc0;
  cursor: pointer;
  white-space: nowrap;
}
.done-btn:hover {
  background: rgba(0, 200, 120, 0.18);
}
.done-btn.disabled,
.done-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
.done-btn.cancel {
  border-color: rgba(255, 159, 67, 0.45);
  background: rgba(255, 159, 67, 0.14);
  color: #ffd7a6;
  opacity: 1;
}

/* 완료 섹션 */
.done-section {
  margin-top: 14px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  padding-top: 12px;
}
.done-head {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 10px;
}
.done-title {
  font-size: 12px;
  font-weight: 900;
  opacity: 0.92;
}
.done-sub {
  font-size: 11px;
  opacity: 0.65;
}
.stop.done-card {
  background: rgba(255, 255, 255, 0.03);
  border-color: rgba(255, 255, 255, 0.08);
}
.done-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
.countdown {
  font-size: 12px;
  font-weight: 900;
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.06);
  opacity: 0.95;
  white-space: nowrap;
}
.done-empty {
  margin-top: 8px;
  font-size: 12px;
  opacity: 0.65;
  text-align: center;
}

.day-empty,
.empty {
  margin-top: 14px;
  font-size: 12px;
  opacity: 0.75;
  text-align: center;
}
.footer {
  text-align: center;
  font-size: 11px;
  opacity: 0.6;
  padding: 24px 0 32px;
}

@media (max-width: 720px) {
  .stop {
    grid-template-columns: 1fr;
  }
  .stop-right {
    flex-direction: column;
    align-items: stretch;
  }
  .done-actions {
    justify-content: space-between;
  }
  .done-btn {
    width: 100%;
  }
  .place-text {
    white-space: normal;
  }
}
</style>


