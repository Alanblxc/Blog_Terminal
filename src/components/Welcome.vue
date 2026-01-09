<template>
  <div class="welcome">
    <pre v-if="asciiArt" class="ascii-art">{{ asciiArt }}</pre>
    <div class="system-info">
      <div class="info-header">{{ welcome.title }}</div>
      <div class="info-item">󰍹&nbsp; OS {{ browserInfo.getOsType() }}</div>
      <div class="info-item">
        🌐&nbsp;Browser {{ browserInfo.getBrowserType() }}
      </div>
      <div class="info-item" v-html="welcome.welcomeMsg"></div>
      <div class="info-item" v-html="welcome.helpMsg"></div>
    </div>
  </div>
</template>

<script setup>
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
</script>

<style scoped>
/* 样式已全局定义，这里可选局部覆盖 */
</style>
