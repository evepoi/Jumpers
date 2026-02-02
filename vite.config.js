import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  // ✅ GitHub Actions에서 env.BASE_URL로 주입됨 (/Jumpers/ 같은 값)
  base: process.env.BASE_URL || "/",
});
