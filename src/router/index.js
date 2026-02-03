// FILE: src/router/index.js
import { createRouter, createWebHistory } from "vue-router";

import Home from "@/pages/Home.vue";
import Settings from "@/pages/Settings.vue";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: "/", name: "home", component: Home },
    { path: "/settings", name: "settings", component: Settings },
    { path: "/:pathMatch(.*)*", redirect: "/" },
  ],
  scrollBehavior() {
    return { top: 0 };
  },
});

export default router;
