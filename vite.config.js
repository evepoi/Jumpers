import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig(({ command }) => {
  // dev 서버는 루트(/)로, GitHub Pages 빌드(prod)만 /Jumpers/로
  const isBuild = command === "build";
  return {
    plugins: [vue()],
    base: isBuild ? "/Jumpers/" : "/",
  };
});
