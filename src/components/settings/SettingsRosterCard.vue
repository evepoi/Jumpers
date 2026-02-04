<!-- FILE: src/components/settings/SettingsRosterCard.vue -->
<template>
  <section class="card roster">
    <header class="card-head">
      <div>
        <h2 class="h2">명단</h2>
        <p class="hint">이름 가나다순 · 10명 단위 페이지 · 모바일은 승차/하차 2줄</p>
      </div>

      <div class="actions">
        <button class="btn" type="button" @click="addAndFocus">+ 사람 추가</button>
        <button class="btn primary" type="button" @click="store.saveAllToFirestore">저장</button>
      </div>
    </header>

    <div class="rosterbar">
      <div class="search">
        <input class="inp searchinp" v-model="store.nameQuery.value" placeholder="이름 검색" />
        <button class="btn small clearbtn" type="button" @click="store.clearSearch" :disabled="!store.nameQuery.value">
          지우기
        </button>
      </div>

      <div class="pager" v-if="store.totalPages.value > 1">
        <button class="btn small" type="button" @click="store.prevPage" :disabled="store.page.value === 1">이전</button>
        <span class="ptext">{{ store.page.value }} / {{ store.totalPages.value }}</span>
        <button class="btn small" type="button" @click="store.nextPage" :disabled="store.page.value === store.totalPages.value">
          다음
        </button>
      </div>
    </div>

    <div v-if="store.pagedPeople.value.length === 0" class="empty big">검색 결과가 없습니다.</div>

    <section v-for="p in store.pagedPeople.value" :key="p.id" class="personcard">
      <div class="editor-head">
        <div class="field grow">
          <span class="lab">이름</span>
          <input class="inp" :ref="(el) => store.setNameRef(p.id, el)" v-model="p.name" placeholder="예) 김준영" />
        </div>

        <button class="btn danger" type="button" @click="store.removePerson(p.id)">명단 삭제</button>
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

        <div v-for="d in store.days" :key="d.key" class="crow">
          <div class="cday">
            <span class="dname">{{ d.label }}</span>
          </div>

          <div class="cpick">
            <select class="inp select" v-model="p.assign[d.key].pickupPlace" @change="store.onAssignPlaceChange(p, d.key)">
              <option value="">(미배정)</option>

              <option
                v-if="p.assign[d.key].pickupPlace && !store.optionExists(d.key, 'pickup', p.assign[d.key].pickupPlace)"
                :value="p.assign[d.key].pickupPlace"
              >
                (기존) {{ p.assign[d.key].pickupPlace }}
              </option>

              <option v-for="opt in store.placeOptions(d.key, 'pickup')" :key="opt.place" :value="opt.place">
                {{ opt.place }}
              </option>
            </select>
          </div>

          <div class="ctime">
            <span class="tchip">{{ store.autoTimeValue(d.key, "pickup", p.assign[d.key]?.pickupPlace) }}</span>
          </div>

          <div class="cdrop">
            <select class="inp select" v-model="p.assign[d.key].dropoffPlace" @change="store.onAssignPlaceChange(p, d.key)">
              <option value="">(미배정)</option>

              <option
                v-if="p.assign[d.key].dropoffPlace && !store.optionExists(d.key, 'dropoff', p.assign[d.key].dropoffPlace)"
                :value="p.assign[d.key].dropoffPlace"
              >
                (기존) {{ p.assign[d.key].dropoffPlace }}
              </option>

              <option v-for="opt in store.placeOptions(d.key, 'dropoff')" :key="opt.place" :value="opt.place">
                {{ opt.place }}
              </option>
            </select>
          </div>

          <div class="ctime">
            <span class="tchip">{{ store.autoTimeValue(d.key, "dropoff", p.assign[d.key]?.dropoffPlace) }}</span>
          </div>
        </div>
      </div>

      <!-- 모바일: 2줄 -->
      <div class="mcompact mobile-only">
        <div v-for="d in store.days" :key="d.key" class="mday">
          <div class="mday-head">
            <span class="dname">{{ d.label }}</span>
          </div>

          <div class="mline">
            <span class="tag pickup">승차</span>
            <select class="inp select msel" v-model="p.assign[d.key].pickupPlace" @change="store.onAssignPlaceChange(p, d.key)">
              <option value="">(미배정)</option>

              <option
                v-if="p.assign[d.key].pickupPlace && !store.optionExists(d.key, 'pickup', p.assign[d.key].pickupPlace)"
                :value="p.assign[d.key].pickupPlace"
              >
                (기존) {{ p.assign[d.key].pickupPlace }}
              </option>

              <option v-for="opt in store.placeOptions(d.key, 'pickup')" :key="opt.place" :value="opt.place">
                {{ opt.place }}
              </option>
            </select>

            <span class="tchip mt">{{ store.autoTimeValue(d.key, "pickup", p.assign[d.key]?.pickupPlace) }}</span>
          </div>

          <div class="mline">
            <span class="tag dropoff">하차</span>
            <select class="inp select msel" v-model="p.assign[d.key].dropoffPlace" @change="store.onAssignPlaceChange(p, d.key)">
              <option value="">(미배정)</option>

              <option
                v-if="p.assign[d.key].dropoffPlace && !store.optionExists(d.key, 'dropoff', p.assign[d.key].dropoffPlace)"
                :value="p.assign[d.key].dropoffPlace"
              >
                (기존) {{ p.assign[d.key].dropoffPlace }}
              </option>

              <option v-for="opt in store.placeOptions(d.key, 'dropoff')" :key="opt.place" :value="opt.place">
                {{ opt.place }}
              </option>
            </select>

            <span class="tchip mt">{{ store.autoTimeValue(d.key, "dropoff", p.assign[d.key]?.dropoffPlace) }}</span>
          </div>
        </div>
      </div>

      <div class="note">시간은 입력하지 않습니다. (요일 + 장소가 기본노선과 매칭되면 자동으로 시간 표시)</div>
    </section>
  </section>
</template>

<script setup>
import { nextTick } from "vue";
import { useSettingsStore } from "@/stores/settingsStore";

const store = useSettingsStore();

async function addAndFocus() {
  await store.addPerson(nextTick);
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

.rosterbar {
  margin-top: 12px;
  display: flex;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
  align-items: center;
}
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
.pager {
  display: flex;
  align-items: center;
  gap: 8px;
}
.ptext {
  font-size: 12px;
  opacity: 0.8;
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
  align-items: flex-end;
  flex-wrap: wrap;
  margin-bottom: 12px;
}
.field.grow {
  flex: 1;
}
.lab {
  font-size: 11px;
  opacity: 0.75;
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

.desktop-only {
  display: block;
}
.mobile-only {
  display: none;
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
