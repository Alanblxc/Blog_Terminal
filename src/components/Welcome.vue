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
