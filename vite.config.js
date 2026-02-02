// vite.config.js
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

// GitHub Actions 환경에서는 process.env.GITHUB_ACTIONS = "true" 로 들어옴
const isGhPages = process.env.GITHUB_ACTIONS === "true";

export default defineConfig({
  plugins: [vue()],
  // ✅ 로컬(dev)은 "/", GitHub Pages 배포(build)는 "/Jumpers/"
  base: isGhPages ? "/Jumpers/" : "/",
});
