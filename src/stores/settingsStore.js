// FILE: src/stores/settingsStore.js
import { computed, reactive, ref, watch } from "vue";
import { db } from "@/firebase";
import { doc, onSnapshot, setDoc, serverTimestamp } from "firebase/firestore";

/** ===== Firestore doc ===== */
const APP_COL = "jumpers_app";
const APP_DOC = "default";

let unsub = null;
const applyingRemote = ref(false);

/** ===== day ===== */
const days = [
  { key: "mon", label: "월요일" },
  { key: "tue", label: "화요일" },
  { key: "wed", label: "수요일" },
  { key: "thu", label: "목요일" },
  { key: "fri", label: "금요일" },
];
function dayLabel(k) {
  return days.find((d) => d.key === k)?.label || k;
}

/** date(YYYY-MM-DD) -> dayKey */
function dayKeyFromDate(dateStr) {
  const s = String(dateStr || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return "";
  const [y, m, d] = s.split("-").map((n) => parseInt(n, 10));
  const dt = new Date(y, (m || 1) - 1, d || 1);
  const w = dt.getDay(); // 0 Sun ... 6 Sat
  const map = { 1: "mon", 2: "tue", 3: "wed", 4: "thu", 5: "fri" };
  return map[w] || "";
}

/** KST today */
function nowKstMs() {
  return Date.now() + 9 * 60 * 60 * 1000;
}
function formatTodayKSTDate() {
  const k = new Date(nowKstMs());
  const y = k.getUTCFullYear();
  const m = String(k.getUTCMonth() + 1).padStart(2, "0");
  const d = String(k.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** ===== tabs/day ===== */
const tab = ref("roster"); // route | roster | reserve
const dayKey = ref("tue");

/** ===== 기본노선 ===== */
const routes = reactive({
  mon: { pickup: [], dropoff: [] },
  tue: {
    pickup: [
      { id: "tue-pu-1405-junggiyu", time: "14:05", place: "중기유" },
      { id: "tue-pu-1413-thesharp", time: "14:13", place: "더샵" },
    ],
    dropoff: [
      { id: "tue-do-1600-junggiyu", time: "16:00", place: "중기유" },
      { id: "tue-do-1610-thesharp", time: "16:10", place: "더샵" },
    ],
  },
  wed: {
    pickup: [
      { id: "wed-pu-1400-hoban", time: "14:00", place: "호반정문" },
      { id: "wed-pu-1410-lake", time: "14:10", place: "레이크시티" },
    ],
    dropoff: [{ id: "wed-do-1610-lake", time: "16:10", place: "레이크시티" }],
  },
  thu: { pickup: [{ id: "thu-pu-1420-sangga", time: "14:20", place: "상가앞" }], dropoff: [] },
  fri: { pickup: [], dropoff: [] },
});

/** ✅ 통합 리스트의 draft(저장 눌러야 반영) */
const draft = reactive({}); // key => { kind, time, place }

function uid(prefix = "id") {
  return `${prefix}-${Math.random().toString(16).slice(2)}-${Date.now().toString(16)}`;
}

function normalizeTime(t) {
  const raw = String(t || "").trim();
  const m = raw.match(/^(\d{1,2})\s*:\s*(\d{1,2})$/);
  if (!m) return raw;
  const hh = Math.max(0, Math.min(23, parseInt(m[1], 10)));
  const mm = Math.max(0, Math.min(59, parseInt(m[2], 10)));
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

function sortByTimeAsc(a, b) {
  const [ah, am] = String(a.time || "00:00").split(":").map((x) => parseInt(x, 10));
  const [bh, bm] = String(b.time || "00:00").split(":").map((x) => parseInt(x, 10));
  return ah * 60 + am - (bh * 60 + bm);
}

function makeRowKey(dk, kind, id) {
  return `${dk}:${kind}:${id}`;
}

/** routes 기준(저장된 순서)로 통합 */
function combinedStops(dk) {
  const pu = (routes?.[dk]?.pickup || []).map((s) => ({
    dk,
    kind: "pickup",
    id: s.id,
    time: s.time,
    place: s.place,
    key: makeRowKey(dk, "pickup", s.id),
  }));
  const dof = (routes?.[dk]?.dropoff || []).map((s) => ({
    dk,
    kind: "dropoff",
    id: s.id,
    time: s.time,
    place: s.place,
    key: makeRowKey(dk, "dropoff", s.id),
  }));
  return [...pu, ...dof];
}

function ensureDraftForDay(dk) {
  const list = combinedStops(dk);
  for (const row of list) {
    const k = row.key;
    if (!draft[k]) draft[k] = { kind: row.kind, time: row.time, place: row.place };
    else {
      if (typeof draft[k].kind !== "string") draft[k].kind = row.kind;
      if (typeof draft[k].time !== "string") draft[k].time = row.time;
      if (typeof draft[k].place !== "string") draft[k].place = row.place;
    }
  }
}

/** ✅ 화면 출력: 저장 전에는 정렬하지 않음(줄 위치 고정) */
const combinedStopsView = computed(() => {
  const arr = combinedStops(dayKey.value);
  return arr.map((r) => {
    const d = draft[r.key];
    return d ? { ...r, kind: d.kind, time: d.time, place: d.place } : r;
  });
});

/** ===== roster ===== */
function makeEmptyAssign() {
  const out = {};
  for (const d of days) {
    out[d.key] = { pickupPlace: "", dropoffPlace: "" };
  }
  return out;
}

const people = ref([
  { id: "p1", name: "최시온", assign: makeEmptyAssign() },
  { id: "p2", name: "김준영", assign: makeEmptyAssign() },
  { id: "p3", name: "정사랑", assign: makeEmptyAssign() },
]);

people.value[0].assign.tue.pickupPlace = "중기유";
people.value[0].assign.tue.dropoffPlace = "더샵";
people.value[1].assign.tue.pickupPlace = "더샵";
people.value[1].assign.tue.dropoffPlace = "더샵";
people.value[2].assign.wed.pickupPlace = "레이크시티";
people.value[2].assign.wed.dropoffPlace = "레이크시티";

/** ✅ 신규 추가한 사람: 무조건 맨 위 고정 */
const pinnedTopId = ref("");

function deepClone(v) {
  return JSON.parse(JSON.stringify(v));
}

/** ✅ 이름 가나다순 + pinnedTopId는 무조건 맨 위 */
function sortKoName(a, b) {
  const pinned = String(pinnedTopId.value || "");
  const aid = String(a?.id || "");
  const bid = String(b?.id || "");

  if (pinned) {
    if (aid === pinned && bid !== pinned) return -1;
    if (aid !== pinned && bid === pinned) return 1;
  }

  const an = String(a?.name || "").trim();
  const bn = String(b?.name || "").trim();

  const aEmpty = !an;
  const bEmpty = !bn;

  if (aEmpty && !bEmpty) return -1;
  if (!aEmpty && bEmpty) return 1;

  if (aEmpty && bEmpty) return aid.localeCompare(bid);
  return an.localeCompare(bn, "ko");
}

function applyRoutesFromRemote(remoteRoutes) {
  const safe = remoteRoutes || {};
  for (const d of days) {
    const dk = d.key;
    const r = safe?.[dk] || {};
    const pu = Array.isArray(r.pickup) ? r.pickup : [];
    const dof = Array.isArray(r.dropoff) ? r.dropoff : [];

    routes[dk].pickup.splice(0, routes[dk].pickup.length, ...pu);
    routes[dk].dropoff.splice(0, routes[dk].dropoff.length, ...dof);
  }
}

function applyPeopleFromRemote(remotePeople) {
  if (!Array.isArray(remotePeople)) return;

  const fixed = remotePeople.map((p) => {
    const assign = p?.assign && typeof p.assign === "object" ? p.assign : {};
    const safeAssign = makeEmptyAssign();

    for (const d of days) {
      const dk = d.key;
      const a = assign?.[dk] || {};
      safeAssign[dk] = {
        pickupPlace: typeof a.pickupPlace === "string" ? a.pickupPlace : "",
        dropoffPlace: typeof a.dropoffPlace === "string" ? a.dropoffPlace : "",
      };
    }

    return {
      id: String(p?.id || uid("p")),
      name: typeof p?.name === "string" ? p.name : "",
      assign: safeAssign,
    };
  });

  people.value = fixed.slice().sort(sortKoName);
}

/** options/time */
function placeOptions(day, kind) {
  const arr = routes?.[day]?.[kind] || [];
  const seen = new Set();
  return arr
    .slice()
    .sort(sortByTimeAsc)
    .filter((s) => {
      const key = String(s.place || "").trim();
      if (!key) return false;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((s) => ({ place: s.place }));
}
function optionExists(day, kind, place) {
  if (!place) return true;
  return placeOptions(day, kind).some((o) => String(o.place) === String(place));
}
function autoTimeValue(day, kind, place) {
  if (!place) return "—";
  const arr = routes?.[day]?.[kind] || [];
  const found = arr.find((s) => String(s.place) === String(place));
  return found?.time || "—";
}
function onAssignPlaceChange() {
  // no-op
}

/** ===== 예약명단(새 구조) =====
 * 예약 1건 = 예약일 1개(요일 1줄만 표시)
 * kind: "보강" | "체험" | "사용자 지정" | "결석"
 * - 체험: tempName 사용(1회용)
 * - 보강/사용자 지정/결석: personId 사용(기존 명단 선택)
 * - 사용자 지정: customText 추가 텍스트
 * - 결석: 장소/시간 없음(홈에서 완전 제외)
 */
const reserveItems = ref([]); // [{id,kind,date,personId,tempName,customText,pickupPlace,dropoffPlace,createdAtMs,completedAtMs}]
const reserveError = ref("");

function normalizeReserveKind(k) {
  const v = String(k || "").trim();
  if (v === "보강" || v === "체험" || v === "사용자 지정" || v === "결석") return v;

  // 레거시 memoType 대응
  if (v === "reinforce") return "보강";
  if (v === "trial") return "체험";
  if (v === "custom") return "사용자 지정";
  if (v === "absent") return "결석";

  return "보강";
}

function reserveKindLabel(k) {
  return normalizeReserveKind(k);
}

function reserveDayKeyFromItem(r) {
  const date = typeof r?.date === "string" ? r.date : "";
  return dayKeyFromDate(date);
}

function applyReservationsFromRemote(remoteReservations) {
  if (!Array.isArray(remoteReservations)) return;

  const out = [];

  for (const raw of remoteReservations) {
    // ✅ 레거시(과거 구조): names[] + memoType/memoText + pickupPlace/dropoffPlace
    const legacyNames = Array.isArray(raw?.names) ? raw.names.map((x) => String(x || "").trim()).filter(Boolean) : [];
    const hasLegacyNames = legacyNames.length > 0;

    if (hasLegacyNames) {
      const date = typeof raw?.date === "string" ? raw.date : "";
      const pickupPlace = typeof raw?.pickupPlace === "string" ? raw.pickupPlace : "";
      const dropoffPlace = typeof raw?.dropoffPlace === "string" ? raw.dropoffPlace : "";

      const memoType = typeof raw?.memoType === "string" ? raw.memoType : "reinforce";
      const memoText = typeof raw?.memoText === "string" ? raw.memoText : "";

      const kind = normalizeReserveKind(memoType); // reinforce/trial/custom/absent -> 보강/체험/사용자 지정/결석

      for (const nm of legacyNames) {
        out.push({
          id: uid("res"),
          kind,
          date,
          personId: "",
          tempName: kind === "체험" ? nm : nm, // 표시용 보존
          customText: kind === "사용자 지정" ? String(memoText || "").trim() : "",
          pickupPlace: kind === "결석" ? "" : pickupPlace,
          dropoffPlace: kind === "결석" ? "" : dropoffPlace,
          createdAtMs: typeof raw?.createdAtMs === "number" ? raw.createdAtMs : Date.now(),
          completedAtMs: typeof raw?.completedAtMs === "number" ? raw.completedAtMs : 0,
        });
      }
      continue;
    }

    // ✅ 새 구조
    const id = String(raw?.id || uid("res"));
    const kind = normalizeReserveKind(raw?.kind);
    const date = typeof raw?.date === "string" ? raw.date : "";

    const personId = typeof raw?.personId === "string" ? raw.personId : "";
    const tempName = typeof raw?.tempName === "string" ? raw.tempName : "";
    const customText = typeof raw?.customText === "string" ? raw.customText : "";

    let pickupPlace = typeof raw?.pickupPlace === "string" ? raw.pickupPlace : "";
    let dropoffPlace = typeof raw?.dropoffPlace === "string" ? raw.dropoffPlace : "";

    // 레거시(kind/place) 단일필드 -> 새 필드 변환(혹시 남아있을 수 있음)
    if (!pickupPlace && !dropoffPlace && typeof raw?.place === "string") {
      const k = raw?.kind === "dropoff" ? "dropoff" : "pickup";
      if (k === "pickup") pickupPlace = String(raw.place || "");
      else dropoffPlace = String(raw.place || "");
    }

    const createdAtMs = typeof raw?.createdAtMs === "number" ? raw.createdAtMs : 0;
    const completedAtMs = typeof raw?.completedAtMs === "number" ? raw.completedAtMs : 0;

    out.push({
      id,
      kind,
      date,
      personId,
      tempName,
      customText,
      pickupPlace: kind === "결석" ? "" : pickupPlace,
      dropoffPlace: kind === "결석" ? "" : dropoffPlace,
      createdAtMs,
      completedAtMs,
    });
  }

  // 정렬: 날짜 -> id (안정)
  out.sort((a, b) => {
    const ad = String(a.date || "");
    const bd = String(b.date || "");
    if (ad !== bd) return ad.localeCompare(bd);
    return String(a.id).localeCompare(String(b.id));
  });

  reserveItems.value = out;
}

/** ===== Firestore save ===== */
async function saveAllToFirestore() {
  if (applyingRemote.value) return;

  const pinned = String(pinnedTopId.value || "");
  if (pinned && !people.value.some((p) => String(p.id) === pinned)) pinnedTopId.value = "";

  const cleanedPeople = people.value.map((p) => ({
    id: String(p.id || uid("p")),
    name: String(p.name || ""),
    assign: deepClone(p.assign || makeEmptyAssign()),
  }));

  const cleanedReservations = reserveItems.value.map((r) => {
    const kind = normalizeReserveKind(r.kind);

    return {
      id: String(r.id || uid("res")),
      kind,
      date: String(r.date || ""),
      personId: String(r.personId || ""),
      tempName: String(r.tempName || ""),
      customText: String(r.customText || ""),
      pickupPlace: kind === "결석" ? "" : String(r.pickupPlace || ""),
      dropoffPlace: kind === "결석" ? "" : String(r.dropoffPlace || ""),
      createdAtMs: typeof r.createdAtMs === "number" ? r.createdAtMs : Date.now(),
      completedAtMs: typeof r.completedAtMs === "number" ? r.completedAtMs : 0,
    };
  });

  const payload = {
    routes: deepClone(routes),
    people: cleanedPeople,
    pinnedTopId: String(pinnedTopId.value || ""),
    reservations: cleanedReservations,
    updatedAt: serverTimestamp(),
    savedAt: Date.now(),
  };

  await setDoc(doc(db, APP_COL, APP_DOC), payload, { merge: true });
}

// ✅ SettingsReserveCard.vue에서 쓰는 이름(호환용)
async function saveReserveToFirestore() {
  await saveAllToFirestore();
}

/** ===== 예약 완료/취소 + (홈에서) 10분 후 삭제 ===== */
const RES_DELETE_GRACE_MS = 10 * 60 * 1000;

function isReservationCompleted(r) {
  return typeof r?.completedAtMs === "number" && r.completedAtMs > 0;
}
function reservationDeleteAtMs(r) {
  if (!isReservationCompleted(r)) return 0;
  return r.completedAtMs + RES_DELETE_GRACE_MS;
}

/**
 * ✅ 중요:
 * - 자동으로 돌리지 않는다.
 * - Home.vue에서 "완료처리 흐름"이 끝났을 때만 호출한다.
 */
async function pruneCompletedReservations() {
  if (applyingRemote.value) return;

  const now = Date.now();
  let changed = false;

  const kept = [];
  for (const r of reserveItems.value) {
    const delAt = reservationDeleteAtMs(r);
    if (delAt > 0 && now >= delAt) {
      changed = true;
      continue;
    }
    kept.push(r);
  }

  if (changed) {
    reserveItems.value = kept;
    await saveAllToFirestore();
  }
}

async function markReservationCompleted(resId) {
  const id = String(resId || "");
  if (!id) return;

  const r = reserveItems.value.find((x) => String(x.id) === id);
  if (!r) return;

  if (!isReservationCompleted(r)) {
    r.completedAtMs = Date.now();
    await saveAllToFirestore();
  }
}

async function undoReservationCompleted(resId) {
  const id = String(resId || "");
  if (!id) return;

  const r = reserveItems.value.find((x) => String(x.id) === id);
  if (!r) return;

  if (isReservationCompleted(r)) {
    r.completedAtMs = 0;
    await saveAllToFirestore();
  }
}

/** ===== snapshot init/cleanup ===== */
function initSettingsStore() {
  if (unsub) return;

  const refDoc = doc(db, APP_COL, APP_DOC);

  unsub = onSnapshot(
    refDoc,
    (snap) => {
      if (!snap.exists()) return;
      const data = snap.data() || {};

      applyingRemote.value = true;
      try {
        pinnedTopId.value = typeof data.pinnedTopId === "string" ? data.pinnedTopId : "";

        if (data.routes) applyRoutesFromRemote(data.routes);
        if (data.people) applyPeopleFromRemote(data.people);
        if (data.reservations) applyReservationsFromRemote(data.reservations);

        ensureDraftForDay(dayKey.value);
      } finally {
        applyingRemote.value = false;
      }
    },
    (err) => console.error("[Firestore] onSnapshot error:", err)
  );
}

function cleanupSettingsStore() {
  if (unsub) unsub();
  unsub = null;
}

/** ===== 기본노선 액션 ===== */
const routeError = ref("");
const addForm = reactive({ kind: "pickup", time: "", place: "" });

function propagatePlaceRename({ dk, kind, fromPlace, toPlace }) {
  if (!fromPlace || !toPlace) return;
  if (String(fromPlace) === String(toPlace)) return;

  const placeField = kind === "dropoff" ? "dropoffPlace" : "pickupPlace";
  for (const p of people.value) {
    const a = p?.assign?.[dk];
    if (!a) continue;
    if (String(a[placeField] || "") === String(fromPlace)) {
      a[placeField] = toPlace;
    }
  }

  // ✅ 예약에서도 이름 바뀐 장소를 따라가게(같은 요일에만) - 결석은 제외
  for (const r of reserveItems.value) {
    if (normalizeReserveKind(r.kind) === "결석") continue;

    const rdk = reserveDayKeyFromItem(r);
    if (String(rdk || "") !== String(dk)) continue;
    if (kind === "pickup" && String(r.pickupPlace || "") === String(fromPlace)) r.pickupPlace = toPlace;
    if (kind === "dropoff" && String(r.dropoffPlace || "") === String(fromPlace)) r.dropoffPlace = toPlace;
  }
}

async function saveRow(row) {
  routeError.value = "";

  const k = row.key;
  const d = draft[k];
  if (!d) return;

  const dk = dayKey.value;

  const oldKind = row.kind;
  const oldArr = routes?.[dk]?.[oldKind] || [];
  const oldItem = oldArr.find((x) => x.id === row.id);
  const oldPlace = String(oldItem?.place || "");

  const newKind = d.kind === "dropoff" ? "dropoff" : "pickup";
  const newTime = normalizeTime(d.time);
  const newPlace = String(d.place || "").trim();

  if (!newTime || !/^\d{2}:\d{2}$/.test(newTime)) {
    routeError.value = "시간 형식이 올바르지 않습니다. 예) 14:05";
    return;
  }
  if (!newPlace) {
    routeError.value = "장소를 입력해주세요.";
    return;
  }

  const idx = oldArr.findIndex((x) => x.id === row.id);
  if (idx >= 0) oldArr.splice(idx, 1);

  const newArr = routes?.[dk]?.[newKind] || [];
  newArr.push({ id: row.id, time: newTime, place: newPlace });
  newArr.sort(sortByTimeAsc);

  const newKey = makeRowKey(dk, newKind, row.id);
  delete draft[k];
  draft[newKey] = { kind: newKind, time: newTime, place: newPlace };

  if (oldPlace && newPlace && String(oldPlace) !== String(newPlace)) {
    propagatePlaceRename({ dk, kind: oldKind, fromPlace: oldPlace, toPlace: newPlace });
  }

  await saveAllToFirestore();
}

async function removeStop(dk, kind, id) {
  const arr = routes?.[dk]?.[kind] || [];
  const i = arr.findIndex((x) => x.id === id);
  if (i >= 0) arr.splice(i, 1);

  const k = makeRowKey(dk, kind, id);
  if (draft[k]) delete draft[k];

  await saveAllToFirestore();
}

async function addStopFromForm() {
  routeError.value = "";

  const kind = addForm.kind === "dropoff" ? "dropoff" : "pickup";
  const time = normalizeTime(addForm.time);
  const place = String(addForm.place || "").trim();

  if (!time || !/^\d{2}:\d{2}$/.test(time)) {
    routeError.value = "시간 형식이 올바르지 않습니다. 예) 14:05";
    return;
  }
  if (!place) {
    routeError.value = "장소를 입력해주세요.";
    return;
  }

  const arr = routes?.[dayKey.value]?.[kind];
  const id = uid(`${dayKey.value}-${kind}`);
  arr.push({ id, time, place });
  arr.sort(sortByTimeAsc);

  const key = makeRowKey(dayKey.value, kind, id);
  draft[key] = { kind, time, place };

  addForm.time = "";
  addForm.place = "";

  await saveAllToFirestore();
}

function resetAddForm() {
  routeError.value = "";
  addForm.kind = "pickup";
  addForm.time = "";
  addForm.place = "";
}

function selectDay(k) {
  dayKey.value = k;
  ensureDraftForDay(k);
}

watch(
  () => dayKey.value,
  (k) => ensureDraftForDay(k),
  { immediate: true }
);

/** ===== 명단(검색/페이지/추가/삭제) ===== */
const nameQuery = ref("");
const page = ref(1);
const pageSize = 10;

function clearSearch() {
  nameQuery.value = "";
  page.value = 1;
}

const filteredAll = computed(() => {
  const kw = nameQuery.value.trim().toLowerCase();
  const base = people.value.slice().sort(sortKoName);
  if (!kw) return base;
  return base.filter((p) => String(p.name || "").toLowerCase().includes(kw));
});

const totalPages = computed(() => Math.max(1, Math.ceil(filteredAll.value.length / pageSize)));

watch(
  () => nameQuery.value,
  () => (page.value = 1)
);

watch(
  () => filteredAll.value.length,
  () => {
    if (page.value > totalPages.value) page.value = totalPages.value;
  }
);

const pagedPeople = computed(() => {
  const start = (page.value - 1) * pageSize;
  return filteredAll.value.slice(start, start + pageSize);
});

function prevPage() {
  page.value = Math.max(1, page.value - 1);
}
function nextPage() {
  page.value = Math.min(totalPages.value, page.value + 1);
}

const nameRefs = reactive({});
function setNameRef(id, el) {
  if (!id) return;
  if (el) nameRefs[id] = el;
  else delete nameRefs[id];
}

const newlyAddedId = ref("");

async function addPerson(nextTickFn) {
  const id = uid("p");
  const newPerson = { id, name: "", assign: makeEmptyAssign() };

  people.value.unshift(newPerson);
  pinnedTopId.value = id;

  page.value = 1;
  tab.value = "roster";

  if (typeof nextTickFn === "function") {
    await nextTickFn();
    const el = nameRefs[id];
    if (el && typeof el.focus === "function") {
      el.focus();
      if (typeof el.select === "function") el.select();
    }
  }

  newlyAddedId.value = id;
  nameQuery.value = "";
}

watch(
  () => people.value.find((p) => p.id === newlyAddedId.value)?.name,
  (nm) => {
    if (!newlyAddedId.value) return;
    const v = String(nm || "").trim();
    if (v) {
      nameQuery.value = v;
      page.value = 1;
      newlyAddedId.value = "";
    }
  }
);

async function removePerson(id) {
  const i = people.value.findIndex((p) => p.id === id);
  if (i >= 0) {
    people.value.splice(i, 1);
    if (String(pinnedTopId.value || "") === String(id)) pinnedTopId.value = "";
    await saveAllToFirestore();
  }
}

/** ===== 예약명단 helpers (새 구조) ===== */
function reserveSetToday() {
  return formatTodayKSTDate();
}

function reservePlaceOptionsByDate(dateStr, kind) {
  const dk = dayKeyFromDate(dateStr);
  if (!dk) return [];
  const kk = kind === "dropoff" ? "dropoff" : "pickup";
  return placeOptions(dk, kk);
}

function reservePickupOptionsByDate(dateStr) {
  return reservePlaceOptionsByDate(dateStr, "pickup");
}
function reserveDropoffOptionsByDate(dateStr) {
  return reservePlaceOptionsByDate(dateStr, "dropoff");
}

/** ✅ 예약 추가/삭제 (SettingsReserveCard.vue용) */
function addReserveItem(item) {
  if (!item || typeof item !== "object") return;

  const kind = normalizeReserveKind(item.kind);
  const date = String(item.date || "").trim();

  const dk = dayKeyFromDate(date);
  if (!dk) {
    reserveError.value = "주말(토/일)은 예약명단에서 지원하지 않습니다.";
    return;
  }

  const personId = String(item.personId || "");
  const tempName = String(item.tempName || "").trim();
  const customText = String(item.customText || "").trim();

  if (kind === "체험") {
    if (!tempName) {
      reserveError.value = "체험 이름을 입력해주세요.";
      return;
    }
  } else {
    if (!personId) {
      reserveError.value = "기존 명단 이름을 선택해주세요.";
      return;
    }
    if (kind === "사용자 지정" && !customText) {
      reserveError.value = "사용자 지정 텍스트를 입력해주세요.";
      return;
    }
  }

  reserveError.value = "";

  reserveItems.value.push({
    id: String(item.id || uid("res")),
    kind,
    date,
    personId: kind === "체험" ? "" : personId,
    tempName: kind === "체험" ? tempName : "",
    customText: kind === "사용자 지정" ? customText : "",
    pickupPlace: kind === "결석" ? "" : String(item.pickupPlace || ""),
    dropoffPlace: kind === "결석" ? "" : String(item.dropoffPlace || ""),
    createdAtMs: typeof item.createdAtMs === "number" ? item.createdAtMs : Date.now(),
    completedAtMs: typeof item.completedAtMs === "number" ? item.completedAtMs : 0,
  });
}

function removeReserveItem(id) {
  const rid = String(id || "");
  if (!rid) return;
  const i = reserveItems.value.findIndex((r) => String(r.id) === rid);
  if (i >= 0) reserveItems.value.splice(i, 1);
}

/** ✅ 예약 리스트 편집 저장(날짜/승하차 장소 수정) */
function validateReserveCore({ kind, date, pickupPlace, dropoffPlace }) {
  const k = normalizeReserveKind(kind);

  const d = String(date || "").trim();
  if (!d || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return "날짜 형식이 올바르지 않습니다.";

  const dk = dayKeyFromDate(d);
  if (!dk) return "주말(토/일)은 예약명단에서 지원하지 않습니다.";

  // ✅ 결석은 장소/시간이 없다(둘다 비어도 OK)
  if (k === "결석") return "";

  const pu = String(pickupPlace || "").trim();
  const dof = String(dropoffPlace || "").trim();

  // 승/하차 둘 중 하나 이상은 선택되어야 함
  if (!pu && !dof) return "승차/하차 장소를 1개 이상 선택해주세요.";

  if (pu) {
    const okPu = reservePlaceOptionsByDate(d, "pickup").some((o) => String(o.place) === pu);
    if (!okPu) return "선택한 승차 장소가 기본노선에 없습니다.";
  }
  if (dof) {
    const okDo = reservePlaceOptionsByDate(d, "dropoff").some((o) => String(o.place) === dof);
    if (!okDo) return "선택한 하차 장소가 기본노선에 없습니다.";
  }

  return "";
}

async function updateReserveCore(resId, patch) {
  const id = String(resId || "");
  if (!id) return "잘못된 예약입니다.";

  const r = reserveItems.value.find((x) => String(x.id) === id);
  if (!r) return "예약을 찾을 수 없습니다.";

  const kind = patch?.kind ?? r.kind;
  const date = patch?.date ?? r.date;
  const pickupPlace = patch?.pickupPlace ?? r.pickupPlace;
  const dropoffPlace = patch?.dropoffPlace ?? r.dropoffPlace;

  const msg = validateReserveCore({ kind, date, pickupPlace, dropoffPlace });
  if (msg) return msg;

  r.kind = normalizeReserveKind(kind);
  r.date = String(date);

  if (normalizeReserveKind(r.kind) === "결석") {
    r.pickupPlace = "";
    r.dropoffPlace = "";
  } else {
    r.pickupPlace = String(pickupPlace || "").trim();
    r.dropoffPlace = String(dropoffPlace || "").trim();
  }

  await saveAllToFirestore();
  return "";
}

/** ===== view ===== */
const reservationsView = computed(() => {
  return reserveItems.value.slice().sort((a, b) => {
    const ad = String(a.date || "");
    const bd = String(b.date || "");
    if (ad !== bd) return ad.localeCompare(bd);
    return String(a.id).localeCompare(String(b.id));
  });
});

/** ===== store api ===== */
export function useSettingsStore() {
  return {
    // init
    initSettingsStore,
    cleanupSettingsStore,

    // ui
    tab,
    dayKey,
    days,
    dayLabel,
    selectDay,

    // firestore
    saveAllToFirestore,
    saveReserveToFirestore, // ✅ 예약카드 저장 버튼 호환
    applyingRemote,

    // routes
    routes,
    draft,
    combinedStopsView,
    addForm,
    routeError,
    addStopFromForm,
    resetAddForm,
    saveRow,
    removeStop,

    // roster
    people,
    pinnedTopId,
    nameQuery,
    page,
    totalPages,
    pagedPeople,
    clearSearch,
    prevPage,
    nextPage,
    addPerson,
    removePerson,
    setNameRef,
    optionExists,
    placeOptions,
    autoTimeValue,
    onAssignPlaceChange,

    // reserve (새 구조)
    reservationsView, // (기존 이름 유지)
    reserveItems, // ✅ 새 핵심 배열
    reserveError,

    reserveKindLabel,
    reservePickupOptionsByDate,
    reserveDropoffOptionsByDate,

    addReserveItem,
    removeReserveItem,

    // reserve completion (HOME)
    isReservationCompleted,
    reservationDeleteAtMs,
    markReservationCompleted,
    undoReservationCompleted,
    pruneCompletedReservations,

    // reserve list edit
    updateReserveCore,
    validateReserveCore,

    // (기존 helper 일부 유지)
    reserveSetToday,
  };
}
