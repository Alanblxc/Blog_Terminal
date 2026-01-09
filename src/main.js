// 添加global对象的polyfill，解决@iarna/toml库在浏览器环境中的错误
if (typeof global === "undefined") {
  window.global = window;
}

import { createApp } from "vue";
import "./style.css";

// 延迟导入App.vue，避免立即触发@iarna/toml的错误
// 说明：@iarna/toml 依赖 Node.js 的 global 对象。虽然我们在上面进行了 Polyfill，
// 但由于 ES Module 的 import 提升机制 (Hoisting)，如果直接使用 static import App from './App.vue'，
// App.vue 内部的 import 可能会在 window.global 赋值之前执行，导致报错。
// 因此，这里使用 dynamic import 配合 setTimeout 确保 Polyfill 先生效。
setTimeout(async () => {
  try {
    const App = (await import("./App.vue")).default;
    const app = createApp(App);
    app.mount("#app");
  } catch (error) {
    console.error("Error in Vue app initialization:", error);
  }
}, 0);
