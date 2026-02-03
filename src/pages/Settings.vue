<!-- FILE: src/pages/Settings.vue -->
<template>
  <main class="page">
    <header class="top">
      <div class="brand">
        <div class="logo">J</div>
        <div class="brand-text">
          <h1 class="title">설정</h1>
          <p class="sub">기본노선(시간순 통합) · 명단 입력/배정</p>
        </div>
      </div>

      <div class="right">
        <RouterLink class="nav-btn" to="/">홈</RouterLink>
      </div>
    </header>

    <section class="content">
      <nav class="tabs">
        <button class="tab" :class="{ active: tab === 'route' }" type="button" @click="tab = 'route'">
          기본노선
        </button>
        <button class="tab" :class="{ active: tab === 'roster' }" type="button" @click="tab = 'roster'">
          명단
        </button>
      </nav>

      <!-- ===== 기본노선 ===== -->
      <section v-if="tab === 'route'" class="card">
        <header class="card-head">
          <div>
            <h2 class="h2">기본노선</h2>
            <p class="hint">
              요일별 정차지를 <b>시간순으로 통합</b> 표시 · 각 행은 수정 후 <b>저장</b> 눌러 반영
            </p>
          </div>
        </header>

        <div class="row">
          <div class="daytabs">
            <button
              v-for="d in days"
              :key="d.key"
              class="day"
              :class="{ active: dayKey === d.key }"
              type="button"
              @click="selectDay(d.key)"
            >
              {{ d.label }}
            </button>
          </div>

          <div class="info">
            <span class="pill">{{ dayLabel(dayKey) }}</span>
            <span class="pill soft">{{ combinedStopsSorted.length }}개</span>
          </div>
        </div>

        <div class="addbox">
          <div class="addgrid">
            <label class="field">
              <span class="lab">승/하차</span>
              <select class="inp select" v-model="addForm.kind">
                <option value="pickup">승차</option>
                <option value="dropoff">하차</option>
              </select>
            </label>

            <label class="field">
              <span class="lab">시간</span>
              <input class="inp" v-model="addForm.time" placeholder="예) 14:05" />
            </label>

            <label class="field">
              <span class="lab">장소</span>
              <input class="inp" v-model="addForm.place" placeholder="예) 더샵" />
            </label>

            <div class="add-actions">
              <button class="btn primary" type="button" @click="addStopFromForm">저장(노선추가)</button>
              <button class="btn" type="button" @click="resetAddForm" :disabled="!addForm.time && !addForm.place">
                초기화
              </button>
            </div>
          </div>

          <p v-if="routeError" class="err">{{ routeError }}</p>
        </div>

        <div class="table">
          <div class="thead thead-inline">
            <span>승/하차</span>
            <span>시간</span>
            <span>장소</span>
            <span class="ta">관리</span>
          </div>

          <div v-for="row in combinedStopsSorted" :key="row.key" class="trow trow-inline">
            <select class="inp select kind" v-model="draft[row.key].kind">
              <option value="pickup">승차</option>
              <option value="dropoff">하차</option>
            </select>

            <input class="inp time" v-model="draft[row.key].time" placeholder="14:05" />
            <input class="inp place" v-model="draft[row.key].place" placeholder="더샵" />

            <div class="actions-inline">
              <button class="icon primary" type="button" @click="saveRow(row)">저장</button>
              <button class="icon danger" type="button" @click="removeStop(dayKey, row.kind, row.id)">삭제</button>
            </div>
          </div>

          <div v-if="combinedStopsSorted.length === 0" class="empty">이 요일은 노선이 없습니다.</div>
        </div>
      </section>

      <!-- ===== 명단 (10명 페이지 + 데스크탑 1줄 / 모바일 2줄) ===== -->
      <section v-else class="card roster">
        <header class="card-head">
          <div>
            <h2 class="h2">명단</h2>
            <p class="hint">이름 가나다순 · 10명 단위 페이지 · 모바일은 승차/하차 2줄</p>
          </div>

          <div class="actions">
            <button class="btn" type="button" @click="addPerson">+ 사람 추가</button>
            <button class="btn primary" type="button" @click="saveAllToFirestore">저장</button>
          </div>
        </header>

        <div class="rosterbar">
          <div class="searchbar">
            <input class="inp searchinp" v-model="nameQuery" placeholder="이름 검색" />
            <button class="btn small clearbtn" type="button" @click="clearSearch" :disabled="!nameQuery">
              지우기
            </button>
          </div>

          <div class="pager" v-if="totalPages > 1">
            <button class="btn small" type="button" @click="prevPage" :disabled="page === 1">이전</button>
            <span class="ptext">{{ page }} / {{ totalPages }}</span>
            <button class="btn small" type="button" @click="nextPage" :disabled="page === totalPages">다음</button>
          </div>
        </div>

        <div v-if="pagedPeople.length === 0" class="empty big">검색 결과가 없습니다.</div>

        <section v-for="p in pagedPeople" :key="p.id" class="personcard">
          <div class="personhead">
            <div class="field grow">
              <span class="lab">이름</span>
              <input
                class="inp"
                :ref="(el) => setNameRef(p.id, el)"
                v-model="p.name"
                placeholder="예) 김준영"
              />
            </div>

            <button class="btn danger" type="button" @click="removePerson(p.id)">삭제</button>
          </div>

          <!-- 데스크탑/태블릿: 1줄 -->
          <div class="compact desktop-only">
            <div class="chead">
              <span class="cday">요일</span>
              <span class="cpick">승차</span>
              <span class="ctime">시간</span>
              <span class="cdrop">하차</span>
              <span class="ctime">시간</span>
            </div>

            <div v-for="d in days" :key="d.key" class="crow">
              <div class="cday">
                <span class="dname">{{ d.label }}</span>
              </div>

              <div class="cpick">
                <select class="inp select" v-model="p.assign[d.key].pickupPlace">
                  <option value="">(미배정)</option>
                  <option v-for="opt in placeOptions(d.key, 'pickup')" :key="opt.place" :value="opt.place">
                    {{ opt.place }}
                  </option>
                </select>
              </div>

              <div class="ctime">
                <span class="tchip">{{ autoTimeValue(d.key, "pickup", p.assign[d.key]?.pickupPlace) }}</span>
              </div>

              <div class="cdrop">
                <select class="inp select" v-model="p.assign[d.key].dropoffPlace">
                  <option value="">(미배정)</option>
                  <option v-for="opt in placeOptions(d.key, 'dropoff')" :key="opt.place" :value="opt.place">
                    {{ opt.place }}
                  </option>
                </select>
              </div>

              <div class="ctime">
                <span class="tchip">{{ autoTimeValue(d.key, "dropoff", p.assign[d.key]?.dropoffPlace) }}</span>
              </div>
            </div>
          </div>

          <!-- 모바일: 2줄(승차 줄 / 하차 줄) -->
          <div class="mcompact mobile-only">
            <div v-for="d in days" :key="d.key" class="mday">
              <div class="mday-head">
                <span class="dname">{{ d.label }}</span>
              </div>

              <div class="mline">
                <span class="tag pickup">승차</span>
                <select class="inp select msel" v-model="p.assign[d.key].pickupPlace">
                  <option value="">(미배정)</option>
                  <option v-for="opt in placeOptions(d.key, 'pickup')" :key="opt.place" :value="opt.place">
                    {{ opt.place }}
                  </option>
                </select>
                <span class="tchip mt">{{ autoTimeValue(d.key, "pickup", p.assign[d.key]?.pickupPlace) }}</span>
              </div>

              <div class="mline">
                <span class="tag dropoff">하차</span>
                <select class="inp select msel" v-model="p.assign[d.key].dropoffPlace">
                  <option value="">(미배정)</option>
                  <option v-for="opt in placeOptions(d.key, 'dropoff')" :key="opt.place" :value="opt.place">
                    {{ opt.place }}
                  </option>
                </select>
                <span class="tchip mt">{{ autoTimeValue(d.key, "dropoff", p.assign[d.key]?.dropoffPlace) }}</span>
              </div>
            </div>
          </div>

          <div class="note">시간은 입력하지 않습니다. (요일 + 장소가 기본노선과 매칭되면 자동 표시)</div>
        </section>
      </section>
    </section>

    <footer class="footer">© Jumpers</footer>
  </main>
</template>

<script setup>
import { computed, reactive, ref, watch, onMounted, onBeforeUnmount, nextTick } from "vue";
import { db } from "@/firebase";
import { doc, onSnapshot, setDoc, serverTimestamp } from "firebase/firestore";

const APP_COL = "jumpers_app";
const APP_DOC = "default";

let unsub = null;
const applyingRemote = ref(false);

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

const tab = ref("roster");
const dayKey = ref("tue");

const draft = reactive({});

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

const combinedStopsSorted = computed(() => {
  const arr = combinedStops(dayKey.value);
  const mapped = arr.map((r) => {
    const d = draft[r.key];
    return d ? { ...r, kind: d.kind, time: d.time, place: d.place } : r;
  });
  return mapped.slice().sort(sortByTimeAsc);
});

function makeEmptyAssign() {
  const out = {};
  for (const d of days) out[d.key] = { pickupPlace: "", dropoffPlace: "" };
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

function deepClone(v) {
  return JSON.parse(JSON.stringify(v));
}

/* ✅ 이름 가나다순(빈 이름은 "맨 위") */
function sortKoName(a, b) {
  const an = String(a?.name || "").trim();
  const bn = String(b?.name || "").trim();

  const aEmpty = !an;
  const bEmpty = !bn;

  if (aEmpty && !bEmpty) return -1;
  if (!aEmpty && bEmpty) return 1;

  if (aEmpty && bEmpty) return String(a?.id || "").localeCompare(String(b?.id || ""));
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

async function saveAllToFirestore() {
  if (applyingRemote.value) return;

  const cleanedPeople = people.value.map((p) => ({
    id: String(p.id || uid("p")),
    name: String(p.name || ""),
    assign: deepClone(p.assign || makeEmptyAssign()),
  }));

  const payload = {
    routes: deepClone(routes),
    people: cleanedPeople,
    updatedAt: serverTimestamp(),
    savedAt: Date.now(),
  };

  await setDoc(doc(db, APP_COL, APP_DOC), payload, { merge: true });
}

onMounted(() => {
  const refDoc = doc(db, APP_COL, APP_DOC);

  unsub = onSnapshot(
    refDoc,
    (snap) => {
      if (!snap.exists()) return;
      const data = snap.data() || {};

      applyingRemote.value = true;
      try {
        if (data.routes) applyRoutesFromRemote(data.routes);
        if (data.people) applyPeopleFromRemote(data.people);
        ensureDraftForDay(dayKey.value);
      } finally {
        applyingRemote.value = false;
      }
    },
    (err) => console.error("[Firestore] onSnapshot error:", err)
  );
});

onBeforeUnmount(() => {
  if (unsub) unsub();
});

const routeError = ref("");

async function saveRow(row) {
  routeError.value = "";
  const k = row.key;
  const d = draft[k];
  if (!d) return;

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

  const oldArr = routes?.[dayKey.value]?.[row.kind] || [];
  const idx = oldArr.findIndex((x) => x.id === row.id);
  if (idx >= 0) oldArr.splice(idx, 1);

  const newArr = routes?.[dayKey.value]?.[newKind] || [];
  newArr.push({ id: row.id, time: newTime, place: newPlace });
  newArr.sort(sortByTimeAsc);

  const newKey = makeRowKey(dayKey.value, newKind, row.id);
  delete draft[k];
  draft[newKey] = { kind: newKind, time: newTime, place: newPlace };

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

const addForm = reactive({ kind: "pickup", time: "", place: "" });

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

/** roster: paging */
const nameQuery = ref("");
const page = ref(1);
const pageSize = 10;

function clearSearch() {
  nameQuery.value = "";
  page.value = 1;
}

/** ✅ name input ref 관리 + 방금 추가한 사람 자동 포커스 */
const nameRefs = reactive({});
function setNameRef(id, el) {
  if (!id) return;
  if (el) nameRefs[id] = el;
  else delete nameRefs[id];
}
const pendingFocusId = ref("");

const filteredAll = computed(() => {
  const kw = nameQuery.value.trim().toLowerCase();
  const base = people.value.slice().sort(sortKoName);
  if (!kw) return base;
  return base.filter((p) => String(p.name || "").toLowerCase().includes(kw));
});

const totalPages = computed(() => Math.max(1, Math.ceil(filteredAll.value.length / pageSize)));

watch(
  () => nameQuery.value,
  () => {
    page.value = 1;
  }
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

/** ✅ 새 사람: 맨 위 + 1페이지로 + 이름칸 포커스 */
async function addPerson() {
  const id = uid("p");

  people.value.unshift({ id, name: "", assign: makeEmptyAssign() });
  page.value = 1;

  pendingFocusId.value = id;
  await nextTick();
  const el = nameRefs[id];
  if (el && typeof el.focus === "function") {
    el.focus();
    if (typeof el.select === "function") el.select();
  }
}

async function removePerson(id) {
  const i = people.value.findIndex((p) => p.id === id);
  if (i >= 0) {
    people.value.splice(i, 1);
    await saveAllToFirestore();
  }
}

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

function autoTimeValue(day, kind, place) {
  if (!place) return "—";
  const arr = routes?.[day]?.[kind] || [];
  const found = arr.find((s) => String(s.place) === String(place));
  return found?.time || "—";
}
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

/* tabs */
.tabs {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}
.tab {
  font-size: 12px;
  padding: 8px 12px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.03);
  color: #eaf0ff;
  cursor: pointer;
  opacity: 0.9;
}
.tab.active {
  background: rgba(79, 107, 255, 0.18);
  border-color: rgba(79, 107, 255, 0.55);
}

.card {
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.05);
  border-radius: 18px;
  padding: 14px;
}
.card-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.h2 {
  margin: 0;
  font-size: 18px;
}
.hint {
  margin: 6px 0 0;
  font-size: 12px;
  opacity: 0.75;
  line-height: 1.5;
}

/* buttons */
.btn {
  font-size: 12px;
  padding: 8px 10px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(0, 0, 0, 0.18);
  color: #eaf0ff;
  cursor: pointer;
  white-space: nowrap;
}
.btn:hover {
  background: rgba(255, 255, 255, 0.06);
}
.btn.primary {
  background: rgba(79, 107, 255, 0.18);
  border-color: rgba(79, 107, 255, 0.55);
}
.btn.small {
  padding: 8px 10px;
  min-width: 64px;
}
.btn.danger {
  border-color: rgba(255, 80, 80, 0.35);
  background: rgba(255, 80, 80, 0.12);
  color: #ffd6d6;
}

/* inputs */
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
.select {
  background-color: rgba(0, 0, 0, 0.38);
  color: #eaf0ff;
  border-color: rgba(255, 255, 255, 0.18);
  color-scheme: dark;
}

.empty.big {
  padding: 24px 10px;
  text-align: center;
  opacity: 0.75;
  font-size: 12px;
}

/* roster bar */
.rosterbar {
  margin-top: 12px;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
}
.searchbar {
  display: flex;
  gap: 8px;
  align-items: center;
}
.searchinp {
  width: min(220px, 60vw);
}
.clearbtn {
  min-width: 68px;
}

.pager {
  display: flex;
  align-items: center;
  gap: 8px;
}
.ptext {
  font-size: 12px;
  opacity: 0.8;
}

/* person card */
.personcard {
  margin-top: 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  background: rgba(0, 0, 0, 0.12);
  padding: 12px;
}
.personhead {
  display: flex;
  gap: 10px;
  align-items: end;
  flex-wrap: wrap;
}
.field.grow {
  flex: 1;
}

/* tags + time chip */
.tag {
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  white-space: nowrap;
}
.tag.pickup {
  background: rgba(79, 107, 255, 0.18);
  border-color: rgba(79, 107, 255, 0.5);
}
.tag.dropoff {
  background: rgba(255, 159, 67, 0.16);
  border-color: rgba(255, 159, 67, 0.45);
}
.tchip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 36px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(0, 0, 0, 0.18);
  font-size: 12px;
  opacity: 0.9;
  padding: 0 10px;
}
.tchip.mt {
  min-width: 52px;
}

/* desktop compact */
.compact {
  margin-top: 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.03);
}
.chead,
.crow {
  display: grid;
  grid-template-columns: 80px 1fr 64px 1fr 64px;
  gap: 8px;
  align-items: center;
  padding: 10px;
}
.chead {
  font-size: 11px;
  opacity: 0.7;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}
.crow {
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}
.crow:last-child {
  border-bottom: none;
}
.dname {
  font-size: 12px;
  font-weight: 900;
}

/* mobile compact (2 lines) */
.mcompact {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.mday {
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.03);
  padding: 10px;
}
.mday-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}
.mline {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 8px;
  align-items: center;
  margin-top: 8px;
}
.msel {
  min-width: 0;
}

/* show/hide */
.desktop-only {
  display: block;
}
.mobile-only {
  display: none;
}

/* note/footer */
.note {
  margin-top: 12px;
  font-size: 12px;
  opacity: 0.75;
  line-height: 1.5;
}
.footer {
  text-align: center;
  font-size: 11px;
  opacity: 0.6;
  padding: 24px 0 32px;
}

/* responsive */
@media (max-width: 720px) {
  .desktop-only {
    display: none;
  }
  .mobile-only {
    display: block;
  }
  .searchinp {
    width: 52vw;
  }
  .tchip {
    height: 34px;
    font-size: 11px;
    padding: 0 8px;
  }
  .tchip.mt {
    min-width: 46px;
  }
}
</style>
