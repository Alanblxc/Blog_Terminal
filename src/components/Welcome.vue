<template>
  <div class="welcome">
    <pre v-if="asciiArt && showAsciiArt" class="ascii-art">{{ asciiArt }}</pre>
    <div class="system-info">
      <div class="info-header">{{ welcome.title }}</div>
      <div class="info-item">󰍹&nbsp;OS {{ browserInfo.getOsType() }}</div>
      <div class="info-item">
        🌐&nbsp;Browser {{ browserInfo.getBrowserType() }}
      </div>
      <div class="info-item" v-html="welcome.welcomeMsg"></div>
      <div class="info-item" v-html="welcome.helpMsg"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import { browserInfo } from "../composables/utils";

defineProps({
  welcome: {
    type: Object,
    required: true,
  },
  asciiArt: {
    type: String,
    default: "",
  },
});

// 响应式变量，控制是否显示字符画
const showAsciiArt = ref(true);

// 窗口大小变化处理函数
const handleResize = () => {
  // 在手机端（宽度小于768px）隐藏字符画
  showAsciiArt.value = window.innerWidth >= 768;
};

// 组件挂载时添加窗口大小监听
onMounted(() => {
  // 初始检查
  handleResize();
  // 添加窗口大小变化监听
  window.addEventListener("resize", handleResize);
});

// 组件卸载时移除窗口大小监听
onUnmounted(() => {
  window.removeEventListener("resize", handleResize);
});
</script>

<style scoped>
.welcome {
  font-family: var(--font-stack);
}

.ascii-art {
  font-family: var(--font-stack);
}

.system-info {
  font-family: var(--font-stack);
}

.info-header {
  font-family: var(--font-stack);
}

.info-item {
  font-family: var(--font-stack);
}
</style>
