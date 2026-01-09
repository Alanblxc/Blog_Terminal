import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  server: {
    allowedHosts: true, // 允许所有主机访问，解决Blocked request问题
  },
  base: './', // 关键配置：使资源路径为相对路径
});
