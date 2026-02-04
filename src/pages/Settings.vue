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
            <span class="pill soft">{{ combinedStopsView.length }}개</span>
          </div>
        </div>

        <!-- ✅ 간단 추가폼 -->
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

        <!-- ✅ 통합 리스트 : 저장 전까지 정렬 금지(줄 위치 고정) -->
        <div class="table">
          <div class="thead thead-inline">
            <span>승/하차</span>
            <span>시간</span>
            <span>장소</span>
            <span class="ta">관리</span>
          </div>

          <div v-for="row in combinedStopsView" :key="row.key" class="trow trow-inline">
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

          <div v-if="combinedStopsView.length === 0" class="empty">이 요일은 노선이 없습니다.</div>
        </div>
      </section>

      <!-- ===== 명단 ===== -->
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
          <div class="search">
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
          <div class="editor-head">
            <div class="field grow">
              <span class="lab">이름</span>
              <input class="inp" :ref="(el) => setNameRef(p.id, el)" v-model="p.name" placeholder="예) 김준영" />
            </div>

            <button class="btn danger" type="button" @click="removePerson(p.id)">명단 삭제</button>
          </div>

          <!-- 데스크탑: 1줄 -->
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
                <select class="inp select" v-model="p.assign[d.key].pickupPlace" @change="onAssignPlaceChange(p, d.key)">
                  <option value="">(미배정)</option>

                  <!-- ✅ 기본노선에 없는 값이면 '(기존)'으로 보여주되, 값은 유지 -->
                  <option
                    v-if="p.assign[d.key].pickupPlace && !optionExists(d.key, 'pickup', p.assign[d.key].pickupPlace)"
                    :value="p.assign[d.key].pickupPlace"
                  >
                    (기존) {{ p.assign[d.key].pickupPlace }}
                  </option>

                  <option v-for="opt in placeOptions(d.key, 'pickup')" :key="opt.place" :value="opt.place">
                    {{ opt.place }}
                  </option>
                </select>
              </div>

              <div class="ctime">
                <span class="tchip">{{ autoTimeValue(d.key, "pickup", p.assign[d.key]?.pickupPlace) }}</span>
              </div>

              <div class="cdrop">
                <select class="inp select" v-model="p.assign[d.key].dropoffPlace" @change="onAssignPlaceChange(p, d.key)">
                  <option value="">(미배정)</option>

                  <option
                    v-if="p.assign[d.key].dropoffPlace && !optionExists(d.key, 'dropoff', p.assign[d.key].dropoffPlace)"
                    :value="p.assign[d.key].dropoffPlace"
                  >
                    (기존) {{ p.assign[d.key].dropoffPlace }}
                  </option>

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

          <!-- 모바일: 2줄 -->
          <div class="mcompact mobile-only">
            <div v-for="d in days" :key="d.key" class="mday">
              <div class="mday-head">
                <span class="dname">{{ d.label }}</span>
              </div>

              <div class="mline">
                <span class="tag pickup">승차</span>
                <select class="inp select msel" v-model="p.assign[d.key].pickupPlace" @change="onAssignPlaceChange(p, d.key)">
                  <option value="">(미배정)</option>

                  <option
                    v-if="p.assign[d.key].pickupPlace && !optionExists(d.key, 'pickup', p.assign[d.key].pickupPlace)"
                    :value="p.assign[d.key].pickupPlace"
                  >
                    (기존) {{ p.assign[d.key].pickupPlace }}
                  </option>

                  <option v-for="opt in placeOptions(d.key, 'pickup')" :key="opt.place" :value="opt.place">
                    {{ opt.place }}
                  </option>
                </select>

                <span class="tchip mt">{{ autoTimeValue(d.key, "pickup", p.assign[d.key]?.pickupPlace) }}</span>
              </div>

              <div class="mline">
                <span class="tag dropoff">하차</span>
                <select class="inp select msel" v-model="p.assign[d.key].dropoffPlace" @change="onAssignPlaceChange(p, d.key)">
                  <option value="">(미배정)</option>

                  <option
                    v-if="p.assign[d.key].dropoffPlace && !optionExists(d.key, 'dropoff', p.assign[d.key].dropoffPlace)"
                    :value="p.assign[d.key].dropoffPlace"
                  >
                    (기존) {{ p.assign[d.key].dropoffPlace }}
                  </option>

                  <option v-for="opt in placeOptions(d.key, 'dropoff')" :key="opt.place" :value="opt.place">
                    {{ opt.place }}
                  </option>
                </select>

                <span class="tchip mt">{{ autoTimeValue(d.key, "dropoff", p.assign[d.key]?.dropoffPlace) }}</span>
              </div>
            </div>
          </div>

          <div class="note">시간은 입력하지 않습니다. (요일 + 장소가 기본노선과 매칭되면 자동으로 시간 표시)</div>
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

const tab = ref("roster");
const dayKey = ref("tue");

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
    out[d.key] = {
      pickupPlace: "",
      dropoffPlace: "",
    };
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

/** ===== Firestore save/load ===== */
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

async function saveAllToFirestore() {
  if (applyingRemote.value) return;

  const pinned = String(pinnedTopId.value || "");
  if (pinned && !people.value.some((p) => String(p.id) === pinned)) pinnedTopId.value = "";

  const cleanedPeople = people.value.map((p) => ({
    id: String(p.id || uid("p")),
    name: String(p.name || ""),
    assign: deepClone(p.assign || makeEmptyAssign()),
  }));

  const payload = {
    routes: deepClone(routes),
    people: cleanedPeople,
    pinnedTopId: String(pinnedTopId.value || ""),
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
        pinnedTopId.value = typeof data.pinnedTopId === "string" ? data.pinnedTopId : "";

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

/** ✅ 행 저장 */
const routeError = ref("");

/** ✅ 장소명 변경 시 명단도 같이 변경(요일+승/하차 단위) */
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
}

async function saveRow(row) {
  routeError.value = "";

  const k = row.key;
  const d = draft[k];
  if (!d) return;

  const dk = dayKey.value;

  const oldKind = row.kind; // 현재 routes에 있는 kind(기준)
  const oldArr = routes?.[dk]?.[oldKind] || [];
  const oldItem = oldArr.find((x) => x.id === row.id);
  const oldPlace = String(oldItem?.place || "");
  const oldTime = String(oldItem?.time || "");

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

  // 기존 제거
  const idx = oldArr.findIndex((x) => x.id === row.id);
  if (idx >= 0) oldArr.splice(idx, 1);

  // 새 배열에 추가
  const newArr = routes?.[dk]?.[newKind] || [];
  newArr.push({ id: row.id, time: newTime, place: newPlace });

  // ✅ 저장 시점에만 시간정렬 적용
  newArr.sort(sortByTimeAsc);

  // draft key 갱신
  const newKey = makeRowKey(dk, newKind, row.id);
  delete draft[k];
  draft[newKey] = { kind: newKind, time: newTime, place: newPlace };

  // ✅ 장소명 변경이면(그리고 삭제가 아닌 수정이면) 명단도 같이 변경
  // - kind가 바뀐 경우: oldKind쪽에 묶였던 사람들은 oldPlace 기준이니, 그쪽을 newPlace로 변경
  // - (원하면 kind 변경도 같이 따라가게 할 수 있지만, 요청은 '장소명 변경 따라가기'라서 장소만 변경)
  if (oldPlace && newPlace && String(oldPlace) !== String(newPlace)) {
    propagatePlaceRename({ dk, kind: oldKind, fromPlace: oldPlace, toPlace: newPlace });
  }

  // 참고: 시간만 바뀌면 명단 변경 없음. 홈은 routes time을 바로 읽으니 자동 반영.
  // oldTime/newTime 비교는 필요 없음.

  await saveAllToFirestore();
}

async function removeStop(dk, kind, id) {
  const arr = routes?.[dk]?.[kind] || [];
  const i = arr.findIndex((x) => x.id === id);
  if (i >= 0) arr.splice(i, 1);

  const k = makeRowKey(dk, kind, id);
  if (draft[k]) delete draft[k];

  // 삭제 시 명단은 건드리지 않음(원래대로라면 '(기존)'으로 남게 됨)
  await saveAllToFirestore();
}

/** ✅ 추가폼 */
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

  // ✅ 추가는 "저장" 성격이므로 즉시 정렬(원래 의도 유지)
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

/** day 변경 */
function selectDay(k) {
  dayKey.value = k;
  ensureDraftForDay(k);
}
watch(
  () => dayKey.value,
  (k) => ensureDraftForDay(k),
  { immediate: true }
);

/** ===== 명단: 검색 + 페이지 ===== */
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

/** ✅ 이름 input 포커스 refs */
const nameRefs = reactive({});
function setNameRef(id, el) {
  if (!id) return;
  if (el) nameRefs[id] = el;
  else delete nameRefs[id];
}

/** ✅ 방금 추가한 사람 id 추적(이름 입력하면 검색창 자동 입력용) */
const newlyAddedId = ref("");

/** ✅ 새 사람: 맨 위 + 1페이지 + 이름칸 자동 포커스 + 검색 자동 */
async function addPerson() {
  const id = uid("p");
  const newPerson = { id, name: "", assign: makeEmptyAssign() };

  people.value.unshift(newPerson);

  pinnedTopId.value = id;

  page.value = 1;
  tab.value = "roster";

  await nextTick();

  const el = nameRefs[id];
  if (el && typeof el.focus === "function") {
    el.focus();
    if (typeof el.select === "function") el.select();
  }

  newlyAddedId.value = id;
  nameQuery.value = "";
}

/** ✅ 방금 추가한 사람 이름을 입력하면, 검색창에 자동으로 그 이름을 넣어 "바로 표시" */
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

/** ✅ 옵션 존재 여부(기본노선에 없으면 '(기존)' 옵션을 추가해 유지) */
function optionExists(day, kind, place) {
  if (!place) return true;
  return placeOptions(day, kind).some((o) => String(o.place) === String(place));
}

/** (명단에서 장소 바꾸는 건 그냥 값만 바뀌면 됨) */
function onAssignPlaceChange() {
  // no-op
}

async function removePerson(id) {
  const i = people.value.findIndex((p) => p.id === id);
  if (i >= 0) {
    people.value.splice(i, 1);

    if (String(pinnedTopId.value || "") === String(id)) {
      pinnedTopId.value = "";
    }

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
}
.btn.danger {
  border-color: rgba(255, 80, 80, 0.35);
  background: rgba(255, 80, 80, 0.12);
  color: #ffd6d6;
}

/* day tabs row */
.row {
  margin-top: 12px;
  display: flex;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
  align-items: center;
}
.daytabs {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.day {
  font-size: 12px;
  padding: 8px 12px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.03);
  color: #eaf0ff;
  cursor: pointer;
  opacity: 0.9;
}
.day.active {
  background: rgba(0, 200, 120, 0.12);
  border-color: rgba(0, 200, 120, 0.35);
  color: #6cffc0;
}
.info {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.pill {
  font-size: 11px;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.03);
  opacity: 0.9;
}
.pill.soft {
  opacity: 0.75;
}

/* add form */
.addbox {
  margin-top: 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(0, 0, 0, 0.14);
  border-radius: 16px;
  padding: 12px;
}
.addgrid {
  display: grid;
  grid-template-columns: 160px 140px 1fr auto;
  gap: 10px;
  align-items: end;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
}
.lab {
  font-size: 11px;
  opacity: 0.75;
}
.add-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  flex-wrap: wrap;
}

.err {
  margin: 10px 0 0;
  font-size: 12px;
  color: #ffd6d6;
  opacity: 0.95;
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

/* dropdown readability */
.select {
  background-color: rgba(0, 0, 0, 0.38);
  color: #eaf0ff;
  border-color: rgba(255, 255, 255, 0.18);
  color-scheme: dark;
}
.select option {
  background: #0e1018;
  color: #eaf0ff;
}
.select option:checked {
  background: #182047;
  color: #eaf0ff;
}

/* table */
.table {
  margin-top: 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.12);
}
.thead,
.trow {
  padding: 10px;
}
.thead {
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}
.trow {
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}
.trow:last-child {
  border-bottom: none;
}
.empty {
  margin-top: 12px;
  font-size: 12px;
  opacity: 0.75;
  text-align: center;
}

/* ✅ 한 줄 레이아웃 */
.thead-inline,
.trow-inline {
  display: flex;
  align-items: center;
  gap: 8px;
}
.thead-inline {
  font-size: 11px;
  opacity: 0.7;
}
.thead-inline span:nth-child(1) {
  width: 110px;
}
.thead-inline span:nth-child(2) {
  width: 110px;
}
.thead-inline span:nth-child(3) {
  flex: 1;
}
.thead-inline span:nth-child(4) {
  width: 170px;
  text-align: right;
}

.kind {
  width: 110px;
}
.time {
  width: 110px;
}
.place {
  flex: 1;
  min-width: 0;
}
.actions-inline {
  width: 170px;
  display: flex;
  justify-content: flex-end;
  gap: 6px;
  flex-wrap: nowrap;
}

/* row buttons */
.icon {
  font-size: 12px;
  padding: 8px 10px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.03);
  color: #eaf0ff;
  cursor: pointer;
}
.icon.primary {
  background: rgba(79, 107, 255, 0.18);
  border-color: rgba(79, 107, 255, 0.55);
}
.icon.danger {
  border-color: rgba(255, 80, 80, 0.35);
  background: rgba(255, 80, 80, 0.12);
  color: #ffd6d6;
}

/* ===========================
   ✅ 명단(ROSTER) 전용 스타일
   =========================== */

.rosterbar {
  margin-top: 12px;
  display: flex;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
  align-items: center;
}

/* 검색 줄: 입력폭 줄이고, 지우기 버튼 줄바꿈 방지 */
.search {
  display: flex;
  gap: 8px;
  margin-bottom: 0;
  align-items: center;
}
.searchinp {
  width: min(220px, 60vw);
}
.clearbtn {
  min-width: 68px;
  white-space: nowrap;
}

/* pager */
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
.editor-head {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: flex-end;
  flex-wrap: wrap;
  margin-bottom: 12px;
}
.field.grow {
  flex: 1;
}

/* compact desktop */
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

/* mobile compact */
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
.empty.big {
  padding: 30px 10px;
}
.footer {
  text-align: center;
  font-size: 11px;
  opacity: 0.6;
  padding: 24px 0 32px;
}

/* responsive */
@media (max-width: 860px) {
  /* 원본에 있던 split/dayrow 대응은 남겨둬도 무해 */
}

@media (max-width: 900px) {
  .addgrid {
    grid-template-columns: 1fr 1fr;
  }
  .add-actions {
    justify-content: flex-start;
  }
}

@media (max-width: 720px) {
  .thead-inline {
    display: none;
  }
  .trow-inline {
    flex-wrap: wrap;
  }
  .kind,
  .time {
    width: calc(50% - 4px);
  }
  .place {
    width: 100%;
    flex: none;
  }
  .actions-inline {
    width: 100%;
    justify-content: flex-end;
  }

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
