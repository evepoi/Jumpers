<!-- FILE: src/pages/Settings.vue -->
<template>
  <main class="page">
    <header class="top">
      <div class="brand">
        <div class="logo">J</div>
        <div class="brand-text">
          <h1 class="title">설정</h1>
          <p class="sub">기본노선 · 명단 · 예약명단</p>
        </div>
      </div>

      <div class="right">
        <RouterLink class="nav-btn" to="/">홈</RouterLink>
      </div>
    </header>

    <section class="content">
      <nav class="tabs">
        <button class="tab" :class="{ active: store.tab.value === 'route' }" type="button" @click="store.tab.value = 'route'">
          기본노선
        </button>
        <button class="tab" :class="{ active: store.tab.value === 'roster' }" type="button" @click="store.tab.value = 'roster'">
          명단
        </button>
        <button class="tab" :class="{ active: store.tab.value === 'reserve' }" type="button" @click="store.tab.value = 'reserve'">
          예약명단
        </button>
      </nav>

      <SettingsRouteCard v-if="store.tab.value === 'route'" />
      <SettingsRosterCard v-else-if="store.tab.value === 'roster'" />
      <SettingsReserveCard v-else />
    </section>

    <footer class="footer">© Jumpers</footer>
  </main>
</template>

<script setup>
import { onMounted, onBeforeUnmount } from "vue";
import { useSettingsStore } from "@/stores/settingsStore";

import SettingsRouteCard from "@/components/settings/SettingsRouteCard.vue";
import SettingsRosterCard from "@/components/settings/SettingsRosterCard.vue";
import SettingsReserveCard from "@/components/settings/SettingsReserveCard.vue";

const store = useSettingsStore();

onMounted(() => {
  store.initSettingsStore();
});

onBeforeUnmount(() => {
  store.cleanupSettingsStore();
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

.footer {
  text-align: center;
  font-size: 11px;
  opacity: 0.6;
  padding: 24px 0 32px;
}
</style>
