import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import path from "path";

export default defineConfig(({ command }) => ({
  plugins: [vue()],

  // ✅ GitHub Pages / 로컬 대응 그대로 유지
  base: command === "build" ? "/Jumpers/" : "/",

  // ✅ @ alias 추가 (이게 핵심)
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },

  server: {
    watch: {
      usePolling: true,
      interval: 100,
      ignored: ["**/node_modules/**"],
    },
  },
}));
