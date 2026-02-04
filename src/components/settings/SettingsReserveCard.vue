<!-- FILE: src/components/settings/SettingsReserveCard.vue -->
<template>
  <section class="card reserve">
    <header class="card-head">
      <div>
        <h2 class="h2">예약 명단</h2>
        <p class="hint">예약일 기준으로 1개의 요일만 표시 · 승차/하차 장소 선택 시 기본노선 시간 자동표시</p>
      </div>

      <div class="actions">
        <button class="btn primary" type="button" @click="store.saveReserveToFirestore?.()" :disabled="saving">
          저장
        </button>
      </div>
    </header>

    <!-- 입력 영역 -->
    <section class="form">
      <div class="row">
        <div class="field">
          <span class="lab">예약사항</span>
          <select class="inp select" v-model="draft.kind">
            <option value="보강">보강</option>
            <option value="체험">체험</option>
            <option value="사용자 지정">사용자 지정 텍스트</option>
          </select>
        </div>

        <div class="field">
          <span class="lab">예약일</span>
          <input class="inp" type="date" v-model="draft.date" />
        </div>
      </div>

      <!-- 체험: 1회용 이름 -->
      <div class="row" v-if="draft.kind === '체험'">
        <div class="field grow">
          <span class="lab">체험 이름(1회용)</span>
          <input class="inp" v-model="draft.tempName" placeholder="예) 홍길동" />
        </div>
      </div>

      <!-- 보강/사용자지정: 기존 명단에서 선택 -->
      <div class="row" v-else>
        <div class="field grow">
          <span class="lab">기존 명단 이름 선택</span>
          <select class="inp select" v-model="draft.personId">
            <option value="">(선택)</option>
            <option v-for="p in peopleOptions" :key="p.id" :value="p.id">{{ p.name }}</option>
          </select>
        </div>

        <div class="field grow" v-if="draft.kind === '사용자 지정'">
          <span class="lab">사용자 지정 텍스트</span>
          <input class="inp" v-model="draft.customText" placeholder="예) 개인사정 / 병원 / 기타" />
        </div>
      </div>

      <div class="row">
        <button class="btn" type="button" @click="addReserve" :disabled="!canAdd">
          + 예약 추가
        </button>

        <div class="mini">
          <span class="chip">{{ draftDayLabel || "요일 자동표시" }}</span>
        </div>
      </div>
    </section>

    <div v-if="reserveItems.length === 0" class="empty big">예약이 없습니다.</div>

    <!-- 리스트 -->
    <section v-for="r in reserveItems" :key="r.id" class="personcard">
      <div class="editor-head">
        <div class="summary">
          <div class="sline">
            <span class="sname">{{ rDisplayName(r) }}</span>
            <span class="skind">{{ rDisplayKind(r) }}</span>
            <span class="sdate">{{ formatDate(r.date) }}</span>
          </div>

          <div class="sline sub">
            <span class="chip">{{ dayLabelFromDate(r.date) }}</span>
          </div>
        </div>

        <button class="btn danger" type="button" @click="removeReserve(r.id)">예약 삭제</button>
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

        <div class="crow">
          <div class="cday">
            <span class="dname">{{ dayLabelFromDate(r.date) }}</span>
          </div>

          <div class="cpick">
            <select class="inp select" v-model="r.pickupPlace">
              <option value="">(미선택)</option>

              <option
                v-if="r.pickupPlace && !optionExistsForReserve(r, 'pickup', r.pickupPlace)"
                :value="r.pickupPlace"
              >
                (기존) {{ r.pickupPlace }}
              </option>

              <option v-for="opt in placeOptionsForReserve(r, 'pickup')" :key="opt.place" :value="opt.place">
                {{ opt.place }}
              </option>
            </select>
          </div>

          <div class="ctime">
            <span class="tchip">{{ timeForReserve(r, "pickup") }}</span>
          </div>

          <div class="cdrop">
            <select class="inp select" v-model="r.dropoffPlace">
              <option value="">(미선택)</option>

              <option
                v-if="r.dropoffPlace && !optionExistsForReserve(r, 'dropoff', r.dropoffPlace)"
                :value="r.dropoffPlace"
              >
                (기존) {{ r.dropoffPlace }}
              </option>

              <option v-for="opt in placeOptionsForReserve(r, 'dropoff')" :key="opt.place" :value="opt.place">
                {{ opt.place }}
              </option>
            </select>
          </div>

          <div class="ctime">
            <span class="tchip">{{ timeForReserve(r, "dropoff") }}</span>
          </div>
        </div>
      </div>

      <!-- 모바일: 2줄 -->
      <div class="mcompact mobile-only">
        <div class="mday">
          <div class="mday-head">
            <span class="dname">{{ dayLabelFromDate(r.date) }}</span>
          </div>

          <div class="mline">
            <span class="tag pickup">승차</span>
            <select class="inp select msel" v-model="r.pickupPlace">
              <option value="">(미선택)</option>

              <option
                v-if="r.pickupPlace && !optionExistsForReserve(r, 'pickup', r.pickupPlace)"
                :value="r.pickupPlace"
              >
                (기존) {{ r.pickupPlace }}
              </option>

              <option v-for="opt in placeOptionsForReserve(r, 'pickup')" :key="opt.place" :value="opt.place">
                {{ opt.place }}
              </option>
            </select>

            <span class="tchip mt">{{ timeForReserve(r, "pickup") }}</span>
          </div>

          <div class="mline">
            <span class="tag dropoff">하차</span>
            <select class="inp select msel" v-model="r.dropoffPlace">
              <option value="">(미선택)</option>

              <option
                v-if="r.dropoffPlace && !optionExistsForReserve(r, 'dropoff', r.dropoffPlace)"
                :value="r.dropoffPlace"
              >
                (기존) {{ r.dropoffPlace }}
              </option>

              <option v-for="opt in placeOptionsForReserve(r, 'dropoff')" :key="opt.place" :value="opt.place">
                {{ opt.place }}
              </option>
            </select>

            <span class="tchip mt">{{ timeForReserve(r, "dropoff") }}</span>
          </div>
        </div>
      </div>

      <div class="note">예약은 예약일 기준으로만 표시됩니다. (해당 예약일의 요일 1개만)</div>
    </section>
  </section>
</template>

<script setup>
import { computed, reactive, ref } from "vue";
import { useSettingsStore } from "@/stores/settingsStore";

const store = useSettingsStore();
const saving = ref(false);

const draft = reactive({
  kind: "보강", // "보강" | "체험" | "사용자 지정"
  date: "",
  personId: "",
  tempName: "",
  customText: "",
});

const peopleOptions = computed(() => {
  const arr = store.people?.value || store.people || [];
  return [...arr].filter((p) => p && p.id && p.name).sort((a, b) => (a.name || "").localeCompare(b.name || "", "ko"));
});

const reserveItems = computed(() => store.reserveItems?.value || store.reserveItems || []);

const canAdd = computed(() => {
  if (!draft.date) return false;

  if (draft.kind === "체험") {
    return !!draft.tempName?.trim();
  }

  if (!draft.personId) return false;

  if (draft.kind === "사용자 지정") {
    return !!draft.customText?.trim();
  }

  return true;
});

function kstDateObjFromYYYYMMDD(yyyyMmDd) {
  if (!yyyyMmDd) return null;
  // KST 고정
  return new Date(`${yyyyMmDd}T00:00:00+09:00`);
}

function dayKeyFromDate(yyyyMmDd) {
  const d = kstDateObjFromYYYYMMDD(yyyyMmDd);
  if (!d) return null;
  const idx = d.getDay(); // 0=Sun ... 6=Sat
  // 월~금만 사용(토/일은 표시만)
  const map = {
    1: "mon",
    2: "tue",
    3: "wed",
    4: "thu",
    5: "fri",
    6: "sat",
    0: "sun",
  };
  return map[idx] || null;
}

function dayLabelFromDate(yyyyMmDd) {
  const key = dayKeyFromDate(yyyyMmDd);
  const found = (store.days || []).find((x) => x.key === key);
  if (found) return found.label;
  if (key === "sat") return "토요일";
  if (key === "sun") return "일요일";
  return "—";
}

const draftDayLabel = computed(() => (draft.date ? dayLabelFromDate(draft.date) : ""));

function formatDate(yyyyMmDd) {
  if (!yyyyMmDd) return "—";
  const d = kstDateObjFromYYYYMMDD(yyyyMmDd);
  if (!d) return "—";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${y}.${m}.${da}`;
}

function rDisplayName(r) {
  if (r.kind === "체험") return r.tempName || "(체험)";
  const arr = store.people?.value || store.people || [];
  const p = arr.find((x) => x.id === r.personId);
  return p?.name || "(이름없음)";
}

function rDisplayKind(r) {
  if (r.kind === "사용자 지정") return r.customText || "사용자 지정";
  return r.kind || "—";
}

function placeOptionsForReserve(r, type) {
  const dayKey = dayKeyFromDate(r.date);
  if (!dayKey) return [];
  return store.placeOptions?.(dayKey, type) || [];
}

function optionExistsForReserve(r, type, place) {
  const dayKey = dayKeyFromDate(r.date);
  if (!dayKey) return true;
  if (!store.optionExists) return true;
  return store.optionExists(dayKey, type, place);
}

function timeForReserve(r, type) {
  const dayKey = dayKeyFromDate(r.date);
  if (!dayKey) return "—";
  const place = type === "pickup" ? r.pickupPlace : r.dropoffPlace;
  return store.autoTimeValue?.(dayKey, type, place) || "—";
}

async function addReserve() {
  if (!canAdd.value) return;

  const base = {
    id: crypto.randomUUID(),
    kind: draft.kind,
    date: draft.date,
    pickupPlace: "",
    dropoffPlace: "",
  };

  const item =
    draft.kind === "체험"
      ? { ...base, tempName: draft.tempName.trim(), personId: "", customText: "" }
      : {
          ...base,
          personId: draft.personId,
          tempName: "",
          customText: draft.kind === "사용자 지정" ? draft.customText.trim() : "",
        };

  // store에 위임
  if (store.addReserveItem) {
    store.addReserveItem(item);
  } else if (store.reserveItems?.value) {
    store.reserveItems.value.push(item);
  } else if (Array.isArray(store.reserveItems)) {
    store.reserveItems.push(item);
  }

  // 입력 초기화(예약일은 유지해도 되는데, 요청상 “추가 후 리스트로”라서 일단 유지)
  draft.tempName = "";
  draft.personId = "";
  draft.customText = "";

  // 자동저장은 원하면 여기서 켜도 됨. 지금은 저장버튼으로 통일.
}

function removeReserve(id) {
  if (store.removeReserveItem) {
    store.removeReserveItem(id);
    return;
  }
  const arr = store.reserveItems?.value || store.reserveItems;
  if (!Array.isArray(arr)) return;
  const idx = arr.findIndex((x) => x.id === id);
  if (idx >= 0) arr.splice(idx, 1);
}
</script>

<style scoped>
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

.actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

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
.btn.danger {
  border-color: rgba(255, 80, 80, 0.35);
  background: rgba(255, 80, 80, 0.12);
  color: #ffd6d6;
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

.form {
  margin-top: 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  background: rgba(0, 0, 0, 0.12);
  padding: 12px;
}
.row {
  display: flex;
  gap: 10px;
  align-items: flex-end;
  flex-wrap: wrap;
  margin-top: 10px;
}
.row:first-child {
  margin-top: 0;
}
.field {
  min-width: 180px;
  flex: 1;
}
.field.grow {
  flex: 2;
  min-width: 220px;
}
.lab {
  display: block;
  font-size: 11px;
  opacity: 0.75;
  margin-bottom: 6px;
}
.mini {
  display: flex;
  align-items: center;
  gap: 8px;
}
.chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 30px;
  padding: 0 10px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.03);
  font-size: 12px;
  opacity: 0.9;
  white-space: nowrap;
}

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
  align-items: flex-start;
  flex-wrap: wrap;
  margin-bottom: 12px;
}
.summary {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.sline {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}
.sline.sub {
  opacity: 0.85;
}
.sname {
  font-size: 13px;
  font-weight: 900;
}
.skind {
  font-size: 12px;
  padding: 3px 8px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(79, 107, 255, 0.14);
}
.sdate {
  font-size: 12px;
  opacity: 0.85;
}

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
.dname {
  font-size: 12px;
  font-weight: 900;
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

.note {
  margin-top: 12px;
  font-size: 12px;
  opacity: 0.75;
  line-height: 1.5;
}
.empty.big {
  padding: 30px 10px;
  text-align: center;
  opacity: 0.75;
}

.desktop-only {
  display: block;
}
.mobile-only {
  display: none;
}

@media (max-width: 720px) {
  .desktop-only {
    display: none;
  }
  .mobile-only {
    display: block;
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
