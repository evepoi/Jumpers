import { createRouter, createWebHashHistory } from "vue-router";

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    // { path: "/", component: Home },
    // { path: "/settings", component: Settings },
  ],
});

export default router;
