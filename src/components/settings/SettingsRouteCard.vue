<!-- FILE: src/components/settings/SettingsRouteCard.vue -->
<template>
  <section class="card">
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
          v-for="d in store.days"
          :key="d.key"
          class="day"
          :class="{ active: store.dayKey.value === d.key }"
          type="button"
          @click="store.selectDay(d.key)"
        >
          {{ d.label }}
        </button>
      </div>

      <div class="info">
        <span class="pill">{{ store.dayLabel(store.dayKey.value) }}</span>
        <span class="pill soft">{{ store.combinedStopsView.value.length }}개</span>
      </div>
    </div>

    <!-- ✅ 간단 추가폼 -->
    <div class="addbox">
      <div class="addgrid">
        <label class="field">
          <span class="lab">승/하차</span>
          <select class="inp select" v-model="store.addForm.kind">
            <option value="pickup">승차</option>
            <option value="dropoff">하차</option>
          </select>
        </label>

        <label class="field">
          <span class="lab">시간</span>
          <input class="inp" v-model="store.addForm.time" placeholder="예) 14:05" />
        </label>

        <label class="field">
          <span class="lab">장소</span>
          <input class="inp" v-model="store.addForm.place" placeholder="예) 더샵" />
        </label>

        <div class="add-actions">
          <button class="btn primary" type="button" @click="store.addStopFromForm">저장(노선추가)</button>
          <button class="btn" type="button" @click="store.resetAddForm" :disabled="!store.addForm.time && !store.addForm.place">
            초기화
          </button>
        </div>
      </div>

      <p v-if="store.routeError.value" class="err">{{ store.routeError.value }}</p>
    </div>

    <!-- ✅ 통합 리스트 : 저장 전까지 정렬 금지(줄 위치 고정) -->
    <div class="table">
      <div class="thead thead-inline">
        <span>승/하차</span>
        <span>시간</span>
        <span>장소</span>
        <span class="ta">관리</span>
      </div>

      <div v-for="row in store.combinedStopsView.value" :key="row.key" class="trow trow-inline">
        <select class="inp select kind" v-model="store.draft[row.key].kind">
          <option value="pickup">승차</option>
          <option value="dropoff">하차</option>
        </select>

        <input class="inp time" v-model="store.draft[row.key].time" placeholder="14:05" />
        <input class="inp place" v-model="store.draft[row.key].place" placeholder="더샵" />

        <div class="actions-inline">
          <button class="icon primary" type="button" @click="store.saveRow(row)">저장</button>
          <button class="icon danger" type="button" @click="store.removeStop(store.dayKey.value, row.kind, row.id)">삭제</button>
        </div>
      </div>

      <div v-if="store.combinedStopsView.value.length === 0" class="empty">이 요일은 노선이 없습니다.</div>
    </div>
  </section>
</template>

<script setup>
import { useSettingsStore } from "@/stores/settingsStore";
const store = useSettingsStore();
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

/* add */
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
}
</style>
