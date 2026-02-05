<!-- FILE: src/pages/Home.vue -->
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
              <li
                v-for="st in pendingStopsFor(d.dayKey, d.shift, d.isoYmd)"
                :key="st.kind + ':' + st.id"
                class="stop"
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
                      v-for="(nm, i) in namesAt(d.dayKey, d.shift, d.isoYmd, st.kind, st.id)"
                      :key="nm + i"
                      class="name"
                    >
                      {{ nm }}
                    </span>
                    <span
                      v-if="namesAt(d.dayKey, d.shift, d.isoYmd, st.kind, st.id).length === 0"
                      class="empty2"
                    >
                      —
                    </span>
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

            <div v-if="pendingStopsFor(d.dayKey, d.shift, d.isoYmd).length === 0" class="day-empty">
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
                  v-for="st in completedStopsFor(d.dayKey, d.shift, d.isoYmd)"
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
                        v-for="(nm, i) in namesAt(d.dayKey, d.shift, d.isoYmd, st.kind, st.id)"
                        :key="'d' + nm + i"
                        class="name"
                      >
                        {{ nm }}
                      </span>
                      <span
                        v-if="namesAt(d.dayKey, d.shift, d.isoYmd, st.kind, st.id).length === 0"
                        class="empty2"
                      >
                        —
                      </span>
                    </div>

                    <!-- ✅ 모바일 겹침 방지: 카운터를 버튼 안으로 결합 -->
                    <div class="done-actions">
                      <button
                        class="done-btn cancel combo"
                        type="button"
                        @click="undoDone(d.dayKey, st.kind, st.id)"
                        :title="'10분 카운터'"
                      >
                        <span class="combo-time">{{ countdownText(d.dayKey, st.kind, st.id) }}</span>
                        <span class="combo-sep">·</span>
                        <span class="combo-text">완료취소</span>
                      </button>
                    </div>
                  </div>
                </li>
              </ul>

              <div v-if="completedStopsFor(d.dayKey, d.shift, d.isoYmd).length === 0" class="done-empty">
                완료된 카드가 없습니다.
              </div>
            </section>

            <div v-if="allStopsForCard(d.dayKey, d.shift, d.isoYmd).length === 0" class="day-empty">
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
const reservations = ref([]);

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
  const wd = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", weekday: "long" }).format(new Date(tick.value));
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

function normalizeIsoDate(s) {
  const raw = String(s || "").trim();
  if (!raw) return "";

  const dot = raw.match(/^(\d{4})\.(\d{1,2})\.(\d{1,2})$/);
  if (dot) {
    const y = dot[1];
    const m = String(parseInt(dot[2], 10)).padStart(2, "0");
    const d = String(parseInt(dot[3], 10)).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  const dash = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (dash) {
    const y = dash[1];
    const m = String(parseInt(dash[2], 10)).padStart(2, "0");
    const d = String(parseInt(dash[3], 10)).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  return raw;
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

/** ✅ kind/memoType 정규화 (레거시 + 새 구조) */
function normalizeReserveKindKey(rawKind, rawMemoType) {
  const k = String(rawKind || "").trim();
  const mt = String(rawMemoType || "").trim();

  // 새 구조(kind)
  if (k === "체험") return "trial";
  if (k === "보강") return "reinforce";
  if (k === "사용자 지정") return "custom";
  if (k === "결석") return "absent";

  // 레거시(memoType)
  if (mt === "trial") return "trial";
  if (mt === "reinforce") return "reinforce";
  if (mt === "custom") return "custom";
  if (mt === "absent") return "absent";

  // 아주 옛날에 kind가 trial/reinforce/custom/absent로 들어올 수도
  if (k === "trial" || k === "reinforce" || k === "custom" || k === "absent") return k;

  return ""; // unknown
}

function reserveLabelForDisplay(kindKey, customText) {
  if (kindKey === "trial") return "체험";
  if (kindKey === "reinforce") return "보강";
  if (kindKey === "custom") return String(customText || "").trim() || "사용자지정";
  if (kindKey === "absent") return "결석";
  return "예약";
}

function reservationNamesArrayLegacy(r) {
  if (Array.isArray(r?.names)) return r.names.map((x) => String(x || "").trim()).filter(Boolean);
  const one = String(r?.tempName || "").trim();
  return one ? [one] : [];
}

/** ✅ Firestore 예약 데이터 정규화(레거시/키/형태 모두 흡수) */
function normalizeReservationsInput(data) {
  const cand =
    data?.reservations ??
    data?.reservationList ??
    data?.reservation ??
    data?.reserve ??
    data?.reserves ??
    [];

  const arr = Array.isArray(cand) ? cand : cand && typeof cand === "object" ? Object.values(cand) : [];

  return arr
    .map((r) => {
      const id = String(r?.id || "") || `res-${Math.random().toString(16).slice(2)}-${Date.now().toString(16)}`;
      const date = normalizeIsoDate(r?.date);

      // 새 구조 필드도 보존
      const kind = typeof r?.kind === "string" ? r.kind : "";
      const personId = typeof r?.personId === "string" ? r.personId : "";
      const tempName = typeof r?.tempName === "string" ? r.tempName : "";
      const customText = typeof r?.customText === "string" ? r.customText : "";

      // 레거시
      const memoType = typeof r?.memoType === "string" ? r.memoType : "";
      const memoText = typeof r?.memoText === "string" ? r.memoText : "";

      let pickupPlace = String(r?.pickupPlace || "").trim();
      let dropoffPlace = String(r?.dropoffPlace || "").trim();

      // legacy: kind/place
      if (!pickupPlace && !dropoffPlace && typeof r?.place === "string") {
        const k = String(r?.kind || "pickup");
        if (k === "dropoff") dropoffPlace = String(r.place || "").trim();
        else pickupPlace = String(r.place || "").trim();
      }

      // 레거시 names/tempName
      const legacyNames = reservationNamesArrayLegacy(r);

      return {
        id,
        date,

        // keep both
        kind,
        personId,
        tempName,
        customText,

        memoType,
        memoText,
        legacyNames,

        pickupPlace,
        dropoffPlace,

        createdAtMs: typeof r?.createdAtMs === "number" ? r.createdAtMs : 0,
        completedAtMs: typeof r?.completedAtMs === "number" ? r.completedAtMs : 0,
      };
    })
    .filter((r) => !!r.date);
}

/** ✅ roster에서 id로 이름 찾기 */
function personNameById(pid) {
  const id = String(pid || "");
  if (!id) return "";
  const list = Array.isArray(roster.value) ? roster.value : [];
  const p = list.find((x) => String(x?.id || "") === id);
  return String(p?.name || "").trim();
}

/** ✅ 결석 자동삭제: 결석일이 "지나면" 즉시 삭제 (KST 기준) */
function collectExpiredAbsenceIds() {
  const today = normalizeIsoDate(kstIsoYmd());
  const list = Array.isArray(reservations.value) ? reservations.value : [];
  const out = [];

  for (const r of list) {
    const rk = normalizeReserveKindKey(r?.kind, r?.memoType);
    if (rk !== "absent") continue;

    const d = normalizeIsoDate(r?.date);
    if (d && d < today) out.push(String(r?.id || ""));
  }
  return out.filter(Boolean);
}

function reserveLabelLower(kindKey, customText) {
  return reserveLabelForDisplay(kindKey, customText).toLowerCase();
}

function buildDayModelForIso(dayKey, isoYmdRaw) {
  const isoYmd = normalizeIsoDate(isoYmdRaw);

  const outCounts = { pickup: {}, dropoff: {} };
  const overrides = {};
  const trialExtras = { pickup: {}, dropoff: {} };

  const rsv = Array.isArray(reservations.value) ? reservations.value : [];
  for (const r of rsv) {
    if (normalizeIsoDate(r?.date) !== isoYmd) continue;

    const kindKey = normalizeReserveKindKey(r?.kind, r?.memoType);
    const label = reserveLabelForDisplay(kindKey, r?.customText || r?.memoText);

    const pu = String(r?.pickupPlace || "").trim();
    const dof = String(r?.dropoffPlace || "").trim();

    // ✅ 대상 이름 결정
    let targetName = "";

    // 새 구조 우선
    if (kindKey === "trial") {
      targetName = String(r?.tempName || "").trim();
    } else {
      targetName = personNameById(r?.personId);
      if (!targetName) {
        // 레거시 fallback: names[0]
        const legacyNames = Array.isArray(r?.legacyNames) ? r.legacyNames : [];
        targetName = String(legacyNames[0] || "").trim();
      }
    }

    if (!targetName) continue;

    // ✅ 결석: 해당일 완전 제외
    if (kindKey === "absent") {
      if (!overrides[targetName]) overrides[targetName] = {};
      overrides[targetName].__none__ = true;
      continue;
    }

    // ✅ 체험: 기존명단과 무관하게 추가
    if (kindKey === "trial") {
      const disp = `${targetName}(${label || "체험"})`;

      if (pu) {
        if (!trialExtras.pickup[pu]) trialExtras.pickup[pu] = [];
        trialExtras.pickup[pu].push(disp);
        outCounts.pickup[pu] = (outCounts.pickup[pu] || 0) + 1;
      }
      if (dof) {
        if (!trialExtras.dropoff[dof]) trialExtras.dropoff[dof] = [];
        trialExtras.dropoff[dof].push(disp);
        outCounts.dropoff[dof] = (outCounts.dropoff[dof] || 0) + 1;
      }
      continue;
    }

    // ✅ 보강/사용자 지정: 기존명단의 "시간/장소"를 override
    if (!overrides[targetName]) overrides[targetName] = {};

    // “미배정(완전 제외)” 데이터가 혹시 들어올 수 있으니: 둘다 비면 해당일 완전 제외 플래그
    if (!pu && !dof) {
      overrides[targetName].__none__ = true;
      continue;
    }

    if (pu) overrides[targetName].pickup = { place: pu, label };
    if (dof) overrides[targetName].dropoff = { place: dof, label };
  }

  // ✅ roster 기반 count 합산 (override 반영)
  const list = Array.isArray(roster.value) ? roster.value : [];
  for (const p of list) {
    const nm = String(p?.name || "").trim();
    if (!nm) continue;

    const ov = overrides[nm] || {};
    if (ov.__none__) continue; // 완전 제외

    const a = p?.assign?.[dayKey] || {};

    const pickupPlace = ov.pickup?.place ? String(ov.pickup.place) : String(a.pickupPlace || "").trim();
    if (pickupPlace) outCounts.pickup[pickupPlace] = (outCounts.pickup[pickupPlace] || 0) + 1;

    const dropoffPlace = ov.dropoff?.place ? String(ov.dropoff.place) : String(a.dropoffPlace || "").trim();
    if (dropoffPlace) outCounts.dropoff[dropoffPlace] = (outCounts.dropoff[dropoffPlace] || 0) + 1;
  }

  return { counts: outCounts, overrides, trialExtras };
}

function allStopsForCard(dayKey, cardShift, isoYmdRaw) {
  const isoYmd = normalizeIsoDate(isoYmdRaw);
  if (!isoYmd) return [];

  const model = buildDayModelForIso(dayKey, isoYmd);

  const puArr = Array.isArray(routes.value?.[dayKey]?.pickup) ? routes.value[dayKey].pickup : [];
  const doArr = Array.isArray(routes.value?.[dayKey]?.dropoff) ? routes.value[dayKey].dropoff : [];

  const pu = [...puArr]
    .sort(sortByTimeAsc)
    .filter((s) => (model.counts.pickup[String(s.place || "")] || 0) > 0)
    .map((s) => ({ ...s, kind: "pickup" }));

  const dof = [...doArr]
    .sort(sortByTimeAsc)
    .filter((s) => (model.counts.dropoff[String(s.place || "")] || 0) > 0)
    .map((s) => ({ ...s, kind: "dropoff" }));

  return [...pu, ...dof].sort(sortByTimeAsc);
}

/** =========================
 * ✅ NEW STATE MODEL (kind 포함)
 * ========================= */
const items = ref({}); // key -> {shift, doneAt}

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

function visibleStopsForCard(dayKey, cardShift, isoYmd) {
  return allStopsForCard(dayKey, cardShift, isoYmd).filter((s) => getShift(dayKey, s.kind, s.id) === cardShift);
}
function pendingStopsFor(dayKey, cardShift, isoYmd) {
  return visibleStopsForCard(dayKey, cardShift, isoYmd).filter((s) => !isDone(dayKey, s.kind, s.id));
}
function completedStopsFor(dayKey, cardShift, isoYmd) {
  return visibleStopsForCard(dayKey, cardShift, isoYmd).filter((s) => isDone(dayKey, s.kind, s.id));
}

/** 당일만 활성 */
function isTodayIso(isoYmd) {
  return normalizeIsoDate(isoYmd) === normalizeIsoDate(kstIsoYmd());
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

/** ✅ 예약 자동삭제 규칙(그대로 유지) */
function shouldDeleteReserveOnMovedStop(r, movedIsoRaw, movedDayKey, movedKind, movedPlace) {
  const movedIso = normalizeIsoDate(movedIsoRaw);
  if (normalizeIsoDate(r?.date) !== movedIso) return false;

  const dk = weekdayKeyOfIso(movedIso);
  if (dk !== movedDayKey) return false;

  const pu = String(r?.pickupPlace || "").trim();
  const dof = String(r?.dropoffPlace || "").trim();

  const placeMatch = String(movedPlace || "").trim();
  const hasPu = !!pu;
  const hasDo = !!dof;

  if (hasPu && hasDo) {
    if (movedKind !== "dropoff") return false;
    if (String(dof) !== placeMatch) return false;
    return true;
  }

  if (hasPu && !hasDo) {
    if (movedKind !== "pickup") return false;
    if (String(pu) !== placeMatch) return false;
    return true;
  }

  if (!hasPu && hasDo) {
    if (movedKind !== "dropoff") return false;
    if (String(dof) !== placeMatch) return false;
    return true;
  }

  return false;
}

async function deleteReservationsByIds(ids) {
  const list = Array.isArray(ids) ? ids.map((x) => String(x || "")).filter(Boolean) : [];
  if (list.length === 0) return;

  const before = Array.isArray(reservations.value) ? reservations.value : [];
  const next = before.filter((r) => !list.includes(String(r?.id || "")));
  if (next.length === before.length) return;

  reservations.value = next;

  const payload = {
    reservations: JSON.parse(JSON.stringify(next)),
    updatedAt: serverTimestamp(),
    savedAt: Date.now(),
  };
  await setDoc(doc(db, APP_COL, APP_DOC), payload, { merge: true });
}

/** 자동 이동 + 예약 삭제 */
let autoTimer = null;
function runAutoMove() {
  const now = nowMs.value;

  for (const d of baseDays) {
    const dk = d.key;

    const all = [];
    const puArr = Array.isArray(routes.value?.[dk]?.pickup) ? routes.value[dk].pickup : [];
    const doArr = Array.isArray(routes.value?.[dk]?.dropoff) ? routes.value[dk].dropoff : [];
    for (const s of puArr) all.push({ ...s, kind: "pickup" });
    for (const s of doArr) all.push({ ...s, kind: "dropoff" });

    for (const st of all) {
      const it = ensureItem(dk, st.kind, st.id);

      if (it.doneAt && now - it.doneAt >= AUTO_MS) {
        const curShift = getShift(dk, st.kind, st.id);
        const movedIso = formatIsoYmd(plannedDateUtc(dk, curShift));

        it.doneAt = null;
        it.shift = curShift + 1;

        const movedPlace = String(st.place || "");
        const toDelete = [];
        for (const r of Array.isArray(reservations.value) ? reservations.value : []) {
          if (shouldDeleteReserveOnMovedStop(r, movedIso, dk, st.kind, movedPlace)) {
            toDelete.push(String(r?.id || ""));
          }
        }
        if (toDelete.length > 0) deleteReservationsByIds(toDelete).catch(() => {});
      }
    }
  }
}

/** 주가 바뀌면 shift 당기기 + done 초기화 */
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
function namesAt(dayKey, cardShift, isoYmdRaw, kind, stopId) {
  const isoYmd = normalizeIsoDate(isoYmdRaw);
  const keyword = q.value.trim().toLowerCase();

  const stop = visibleStopsForCard(dayKey, cardShift, isoYmd).find((s) => s.kind === kind && s.id === stopId);
  const stopPlace = String(stop?.place || "").trim();
  const stopPlaceLc = stopPlace.toLowerCase();

  const model = buildDayModelForIso(dayKey, isoYmd);
  const overrides = model.overrides || {};
  const extras = model.trialExtras || { pickup: {}, dropoff: {} };

  const out = [];
  const seen = new Set();

  const list = Array.isArray(roster.value) ? roster.value : [];
  for (const p of list) {
    const nm = String(p?.name || "").trim();
    if (!nm) continue;

    const ov = overrides[nm] || {};
    if (ov.__none__) continue;

    const a = p?.assign?.[dayKey] || {};

    if (kind === "pickup") {
      const place = ov.pickup?.place ? String(ov.pickup.place) : String(a.pickupPlace || "").trim();
      if (!place) continue;
      if (place !== stopPlace) continue;

      const label = ov.pickup?.place ? String(ov.pickup.label || "").trim() : "";
      const disp = label ? `${nm}(${label})` : nm;

      if (!seen.has(disp)) {
        seen.add(disp);
        out.push(disp);
      }
      continue;
    }

    const place = ov.dropoff?.place ? String(ov.dropoff.place) : String(a.dropoffPlace || "").trim();
    if (!place) continue;
    if (place !== stopPlace) continue;

    const label = ov.dropoff?.place ? String(ov.dropoff.label || "").trim() : "";
    const disp = label ? `${nm}(${label})` : nm;

    if (!seen.has(disp)) {
      seen.add(disp);
      out.push(disp);
    }
  }

  const addList = kind === "pickup" ? extras.pickup[String(stopPlace)] || [] : extras.dropoff[String(stopPlace)] || [];
  for (const disp of addList) {
    if (!disp) continue;
    if (!seen.has(disp)) {
      seen.add(disp);
      out.push(disp);
    }
  }

  if (!keyword) return out;

  const placeHit = stopPlaceLc.includes(keyword);
  return out.filter((nm) => placeHit || String(nm).toLowerCase().includes(keyword));
}

/** filters */
const filteredDays = computed(() => {
  const keyword = q.value.trim().toLowerCase();
  let base = selectedDay.value === "all" ? dayCards.value : dayCards.value.filter((d) => d.dayKey === selectedDay.value);
  if (!keyword) return base;

  return base.filter((d) => {
    const stops = visibleStopsForCard(d.dayKey, d.shift, d.isoYmd);
    const placeHit = stops.some((s) => String(s.place || "").toLowerCase().includes(keyword));

    const rosterHit = (Array.isArray(roster.value) ? roster.value : []).some((p) => {
      const a = p.assign?.[d.dayKey] || {};
      const nmHit = String(p.name || "").toLowerCase().includes(keyword);
      const pu = String(a.pickupPlace || "").toLowerCase();
      const dof = String(a.dropoffPlace || "").toLowerCase();
      const placeByAssignHit = pu.includes(keyword) || dof.includes(keyword);
      return nmHit || placeByAssignHit;
    });

    const reserveHit = (Array.isArray(reservations.value) ? reservations.value : []).some((r) => {
      if (normalizeIsoDate(r?.date) !== normalizeIsoDate(d.isoYmd)) return false;

      const kindKey = normalizeReserveKindKey(r?.kind, r?.memoType);
      const label = reserveLabelLower(kindKey, r?.customText || r?.memoText);

      const pu = String(r?.pickupPlace || "").toLowerCase();
      const dof = String(r?.dropoffPlace || "").toLowerCase();
      const placeHit2 = pu.includes(keyword) || dof.includes(keyword);

      const nmCandidates = [];
      const tn = String(r?.tempName || "").trim();
      if (tn) nmCandidates.push(tn);
      const pn = personNameById(r?.personId);
      if (pn) nmCandidates.push(pn);
      const legacy = Array.isArray(r?.legacyNames) ? r.legacyNames : [];
      nmCandidates.push(...legacy);

      const nmHit = nmCandidates.some((nm) => String(nm || "").toLowerCase().includes(keyword));
      const typeHit = label.includes(keyword);

      const custom = String(r?.customText || r?.memoText || "").toLowerCase();
      const memoHit = custom.includes(keyword);

      return nmHit || placeHit2 || typeHit || memoHit;
    });

    return placeHit || rosterHit || reserveHit;
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

      reservations.value = normalizeReservationsInput(data);

      // ✅ 결석 자동삭제(당일이 지나면 삭제)
      const toDelete = collectExpiredAbsenceIds();
      if (toDelete.length > 0) {
        deleteReservationsByIds(toDelete).catch(() => {});
      }
    },
    () => {}
  );

  unsubState = onSnapshot(
    doc(db, STATE_COL, STATE_DOC),
    (snap) => {
      if (!snap.exists()) return;
      const st = snap.data() || {};
      const remoteSavedAt = Number(st.savedAt || 0);

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

/* ✅ 카운터 + 완료취소 결합 버튼 */
.done-btn.combo {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
}
.done-btn.combo .combo-time {
  font-weight: 900;
  font-size: 12px;
}
.done-btn.combo .combo-sep {
  opacity: 0.6;
}
.done-btn.combo .combo-text {
  font-weight: 700;
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

/* ✅ 모바일: 완료목록(done) 전용 정렬 + 진행카드는 기존 유지 */
@media (max-width: 720px) {
  /* ===== 공통: 모바일 기본 ===== */
  .stop {
    grid-template-columns: 1fr;
    gap: 8px;
  }

  .stop-left {
    display: grid;
    grid-template-columns: 64px 1fr;
    gap: 10px;
    align-items: center;
  }

  .time {
    font-size: 18px;
    min-width: 64px;
    font-weight: 900;
  }

  .place {
    display: flex;
    gap: 8px;
    align-items: center;
    min-width: 0;
  }

  .place-text {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* ===== 오른쪽 영역: 세로 스택 ===== */
  .stop-right {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }

  /* 2줄: 명단 */
  .names {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  /* 3줄: 완료취소(카운터 포함) */
  .done-actions {
    display: grid;
    grid-template-columns: 1fr;
    gap: 8px;
  }

  .done-btn {
    width: 100%;
    min-width: 0;
  }
}
</style>
