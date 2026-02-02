// vite.config.js
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  // ✅ GitHub Pages repo name이 Jumpers 라면 이게 맞아
  //    (대소문자까지 정확히 일치해야 함)
  base: "/Jumpers/",
});
