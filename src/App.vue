<script setup>
import HelloWorld from "./components/HelloWorld.vue";

// ✅ 절대경로(/vite.svg) 직접 src로 쓰면 Pages에서 경로 깨질 수 있어서 import로 처리
import viteLogo from "/vite.svg";
import vueLogo from "./assets/vue.svg";
</script>

<template>
  <div>
    <a href="https://vite.dev" target="_blank" rel="noreferrer">
      <img :src="viteLogo" class="logo" alt="Vite logo" />
    </a>
    <a href="https://vuejs.org/" target="_blank" rel="noreferrer">
      <img :src="vueLogo" class="logo vue" alt="Vue logo" />
    </a>
  </div>

  <HelloWorld msg="Vite + Vue" />
</template>

<style scoped>
.logo {
  height: 6em;
  padding: 1.5em;
  will-change: filter;
  transition: filter 300ms;
}
.logo:hover {
  filter: drop-shadow(0 0 2em #646cffaa);
}
.logo.vue:hover {
  filter: drop-shadow(0 0 2em #42b883aa);
}
</style>
