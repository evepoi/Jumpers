import { createRouter, createWebHistory } from "vue-router";

// 예시 컴포넌트
import HomeView from "@/views/HomeView.vue";
import SettingsView from "@/views/SettingsView.vue";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL), // ✅ /Jumpers/ 자동 반영
  routes: [
    { path: "/", name: "home", component: HomeView },
    { path: "/settings", name: "settings", component: SettingsView },
  ],
});

export default router;
