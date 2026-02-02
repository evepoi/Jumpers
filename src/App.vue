<template>
  <main class="page">
    <header class="top">
      <div class="brand">
        <div class="logo">J</div>
        <div class="brand-text">
          <h1 class="title">Jumpers</h1>
          <p class="sub">One-page starter (GitHub Pages 테스트용)</p>
        </div>
      </div>

      <nav class="nav">
        <a href="#about">About</a>
        <a href="#features">Features</a>
        <a href="#cta">Start</a>
      </nav>
    </header>

    <section class="hero">
      <div class="hero-text">
        <h2>배포가 정상인지 먼저 확인하자</h2>
        <p>
          지금 화면이 보이면, Pages 경로/빌드/배포는 성공이야.
          이후에 기능을 하나씩 붙이면 됨.
        </p>

        <div class="hero-actions">
          <a class="btn primary" href="#cta">시작하기</a>
          <a class="btn" href="#features">기능 보기</a>
        </div>

        <p class="hint">
          현재 경로(base): <code>{{ baseUrl }}</code>
        </p>
      </div>

      <div class="hero-card">
        <div class="card">
          <p class="card-label">Status</p>
          <p class="card-value">{{ status }}</p>
          <div class="divider"></div>
          <p class="card-label">Built at</p>
          <p class="card-value mono">{{ builtAt }}</p>
        </div>
      </div>
    </section>

    <section id="about" class="section">
      <h3>About</h3>
      <p>
        이 페이지는 “흰 화면 원인”을 제거하기 위한 최소 구성 원페이지야.
        이미지, 라우터, 외부 의존 없이 렌더링만 확인.
      </p>
    </section>

    <section id="features" class="section grid">
      <h3>Features</h3>
      <div class="cards">
        <article class="mini">
          <h4>경로 안전</h4>
          <p>GitHub Pages base 경로를 화면에 출력해서 즉시 확인.</p>
        </article>
        <article class="mini">
          <h4>의존성 최소</h4>
          <p>이미지/라우터 없이 렌더링만 검증.</p>
        </article>
        <article class="mini">
          <h4>확장 쉬움</h4>
          <p>이 레이아웃을 기준으로 섹션만 추가하면 됨.</p>
        </article>
      </div>
    </section>

    <section id="cta" class="section cta">
      <h3>Start</h3>
      <p>여기까지 스크롤되면 렌더링/스타일 모두 정상.</p>
      <button class="btn primary" type="button" @click="toggleStatus">
        상태 토글
      </button>
    </section>

    <footer class="footer">
      <p>© Jumpers</p>
    </footer>
  </main>
</template>

<script setup>
import { ref, computed } from "vue";

const baseUrl = import.meta.env.BASE_URL;

const on = ref(true);
const status = computed(() => (on.value ? "OK (rendered)" : "OK (toggled)"));

const builtAt = new Date().toISOString();

function toggleStatus() {
  on.value = !on.value;
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #0b0c10;
  color: #eaf0ff;
  font-family: system-ui, -apple-system, Segoe UI, Roboto, "Noto Sans", Arial;
}

.top {
  position: sticky;
  top: 0;
  z-index: 10;
  backdrop-filter: blur(10px);
  background: rgba(11, 12, 16, 0.7);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo {
  width: 38px;
  height: 38px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  font-weight: 800;
  background: linear-gradient(135deg, #4f6bff, #00c2ff);
  color: #081018;
}

.brand-text .title {
  margin: 0;
  font-size: 16px;
  line-height: 1.1;
}

.brand-text .sub {
  margin: 2px 0 0;
  font-size: 12px;
  opacity: 0.8;
}

.nav {
  display: flex;
  gap: 14px;
  font-size: 13px;
}

.nav a {
  color: #eaf0ff;
  opacity: 0.85;
  text-decoration: none;
}

.nav a:hover {
  opacity: 1;
  text-decoration: underline;
}

.hero {
  display: grid;
  grid-template-columns: 1.3fr 1fr;
  gap: 18px;
  padding: 40px 18px 10px;
  max-width: 980px;
  margin: 0 auto;
}

.hero-text h2 {
  margin: 0 0 10px;
  font-size: 28px;
}

.hero-text p {
  margin: 0 0 14px;
  opacity: 0.9;
  line-height: 1.6;
}

.hero-actions {
  display: flex;
  gap: 10px;
  margin-top: 10px;
}

.btn {
  display: inline-block;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.06);
  color: #eaf0ff;
  padding: 10px 14px;
  border-radius: 12px;
  text-decoration: none;
  cursor: pointer;
  font-size: 14px;
}

.btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

.btn.primary {
  border-color: rgba(79, 107, 255, 0.6);
  background: rgba(79, 107, 255, 0.22);
}

.hint {
  margin-top: 14px;
  font-size: 12px;
  opacity: 0.85;
}

.hint code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12px;
  background: rgba(255, 255, 255, 0.08);
  padding: 2px 6px;
  border-radius: 8px;
}

.hero-card {
  display: grid;
  align-items: start;
}

.card {
  border: 1px solid rgba(255, 255, 255, 0.10);
  background: rgba(255, 255, 255, 0.06);
  border-radius: 18px;
  padding: 16px;
}

.card-label {
  margin: 0;
  font-size: 12px;
  opacity: 0.75;
}

.card-value {
  margin: 6px 0 0;
  font-size: 16px;
  font-weight: 700;
}

.card-value.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12px;
  font-weight: 600;
  opacity: 0.95;
}

.divider {
  height: 1px;
  margin: 12px 0;
  background: rgba(255, 255, 255, 0.10);
}

.section {
  max-width: 980px;
  margin: 0 auto;
  padding: 28px 18px;
}

.section h3 {
  margin: 0 0 10px;
  font-size: 18px;
}

.section p {
  margin: 0;
  opacity: 0.9;
  line-height: 1.7;
}

.section.grid .cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-top: 12px;
}

.mini {
  border: 1px solid rgba(255, 255, 255, 0.10);
  background: rgba(255, 255, 255, 0.06);
  border-radius: 16px;
  padding: 14px;
}

.mini h4 {
  margin: 0 0 6px;
  font-size: 14px;
}

.mini p {
  margin: 0;
  font-size: 13px;
  opacity: 0.9;
}

.cta {
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.footer {
  padding: 22px 18px 36px;
  text-align: center;
  opacity: 0.7;
  font-size: 12px;
}

@media (max-width: 860px) {
  .hero {
    grid-template-columns: 1fr;
  }
  .section.grid .cards {
    grid-template-columns: 1fr;
  }
}
</style>
