// 添加global对象的polyfill，解决@iarna/toml库在浏览器环境中的错误
if (typeof global === "undefined") {
  window.global = window;
}

import { createApp } from "vue";
import "./style.css";

// 延迟导入App.vue，避免立即触发@iarna/toml的错误
setTimeout(async () => {
  try {
    const App = (await import("./App.vue")).default;
    const app = createApp(App);
    app.mount("#app");
  } catch (error) {
    console.error("Error in Vue app initialization:", error);
  }
}, 0);
