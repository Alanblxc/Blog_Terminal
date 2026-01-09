import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  server: {
    allowedHosts: true, // 允许所有主机访问，解决Blocked request问题
  },
  base: './', // 关键配置：使资源路径为相对路径
  publicDir: false, // 禁用默认的 public 目录复制，由 config.js 手动处理
  build: {
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks: {
          mermaid: ['mermaid'],
          katex: ['katex'],
        },
      },
    },
  },
});
