<template>
  <div
    id="app"
    @click="focusInput"
    :style="{
      backgroundImage: `url(${background.image.value})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      backgroundAttachment: 'fixed',
    }"
  >
    <div
      class="terminal"
      ref="terminalRef"
      :style="{
        background: `rgba(0, 0, 0, ${background.opacity.value})`,
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        fontFamily: `${font.family.value}, monospace`,
        fontSize: `${fontSize}px`,
      }"
    >
      <div class="terminal-content">
        <!-- 欢迎组件 -->
        <Welcome v-if="showWelcome" :welcome="welcome" :ascii-art="asciiArt" />

        <!-- 历史对话 -->
        <div v-for="conv in conversations" :key="conv.id" class="conversation">
          <!-- 命令行回顾 -->
          <div class="command-line">
            <div class="prompt-header">
              <div
                class="info-bar-left"
                v-html="
                  parseInfoBarTemplate(
                    uiStyles.infoBar.leftTemplate,
                    {
                      user,
                      dayOfWeek: currentDayOfWeek,
                      time: conv.command.time,
                      ...sysStats,
                    },
                    uiStyles.infoBar.colors
                  )
                "
              ></div>
              <div
                class="info-bar-right"
                v-html="
                  parseInfoBarTemplate(
                    uiStyles.infoBar.rightTemplate,
                    {
                      user,
                      dayOfWeek: currentDayOfWeek.value,
                      time: conv.command.time,
                      ...sysStats,
                    },
                    uiStyles.infoBar.colors
                  )
                "
              ></div>
            </div>
            <div class="prompt-line">
              <span
                class="prompt"
                :style="{ color: uiStyles.commandLine.prompt }"
              >
                 {{ conv.command.dir === "/" ? "~" : conv.command.dir }}
              </span>
              <span
                class="prompt-symbol"
                :style="{ color: uiStyles.commandLine.promptSymbol }"
                >$</span
              >
              <span class="command-content">{{ conv.command.content }}</span>
            </div>
          </div>

          <!-- 输出内容 -->
          <div v-for="(out, idx) in conv.output" :key="idx" class="output">
            <!-- 目录输出 -->
            <div v-if="out.type === 'dir'" class="dir-output">
              <div
                v-for="item in out.content"
                :key="item.name"
                class="dir-line"
              >
                <span
                  v-if="item.type === 'dir'"
                  class="dir-item"
                  :style="{ color: uiStyles.commandLine.directory }"
                >
                  {{ item.icon }} {{ item.name }}
                </span>
                <div
                  v-else
                  class="file-wrapper"
                  style="
                    display: flex;
                    justify-content: space-between;
                    width: 100%;
                  "
                >
                  <span
                    class="file-item"
                    :style="{ color: uiStyles.commandLine.file }"
                  >
                    {{ item.icon }} {{ item.name }}
                  </span>
                  <span
                    v-if="item.name.endsWith('.md')"
                    style="color: #94a3b8"
                    >{{ item.date }}</span
                  >
                </div>
              </div>
            </div>
            <!-- Markdown渲染 -->
            <div
              v-else-if="out.type === 'glow'"
              class="glow-content"
              :class="`theme-${theme.current.value}`"
            >
              <div class="glow-title">{{ out.content.title }}</div>
              <div class="glow-meta">
                {{ out.content.date }} | {{ out.content.category }}
              </div>
              <div class="glow-body" v-html="out.content.content"></div>
            </div>
            <!-- 普通文本 -->
            <div v-else>{{ out.content }}</div>
          </div>
        </div>

        <!-- 输入行 -->
        <div v-if="!isCommandExecuting" class="input-line">
          <div class="prompt-header">
            <div
              class="info-bar-left"
              v-html="
                parseInfoBarTemplate(
                  uiStyles.infoBar.leftTemplate,
                  {
                    user,
                    dayOfWeek: currentDayOfWeek,
                    time: currentTime,
                    ...sysStats,
                  },
                  uiStyles.infoBar.colors
                )
              "
            ></div>
            <div
              class="info-bar-right"
              v-html="
                parseInfoBarTemplate(
                  uiStyles.infoBar.rightTemplate,
                  {
                    user,
                    dayOfWeek: currentDayOfWeek.value,
                    time: currentTime.value,
                    ...sysStats,
                  },
                  uiStyles.infoBar.colors
                )
              "
            ></div>
          </div>
          <div class="prompt-line">
            <span
              class="prompt"
              :style="{ color: uiStyles.commandLine.prompt }"
            >
               {{ currentDir === "/" ? "~" : currentDir }}
            </span>
            <span
              class="prompt-symbol"
              :style="{ color: uiStyles.commandLine.promptSymbol }"
              >$</span
            >
            <div class="input-container">
              <input
                v-model="command"
                @keydown.enter="executeCommand"
                @keydown.tab.prevent="handleTabComplete"
                @keydown.up.prevent="handleHistory('up')"
                @keydown.down.prevent="handleHistory('down')"
                ref="inputRef"
                autofocus
                class="command-content"
              />
            </div>
          </div>
        </div>

        <!-- 补全列表 -->
        <div
          v-if="!isCommandExecuting && tabCompleteState.showAll"
          class="completion-output"
        >
          <div class="dir-output">
            <div
              v-for="(item, idx) in tabCompleteState.items"
              :key="item"
              class="dir-line"
              :style="{
                backgroundColor:
                  tabCompleteState.index === idx ? '#1e293b' : 'transparent',
              }"
            >
              <span
                v-if="isDir(item, currentDir)"
                class="dir-item"
                :style="{
                  color: uiStyles.commandLine.directory,
                  fontFamily: 'var(--font-stack)',
                }"
                > {{ item }}</span
              >
              <span
                v-else
                class="file-item"
                :style="{
                  color: uiStyles.commandLine.file,
                  fontFamily: 'var(--font-stack)',
                }"
                > {{ item }}</span
              >
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref, computed } from "vue";
import Welcome from "./components/Welcome.vue";
import { useConfig } from "./composables/useConfig";
import { useTerminal } from "./composables/useTerminal";
import { parseInfoBarTemplate } from "./composables/utils";

// 1. 初始化配置
const configContext = useConfig();
const {
  config,
  uiStyles,
  fontSize,
  font,
  background,
  theme,
  asciiArt,
  welcome,
  loadConfig,
} = configContext;

// 2. 初始化终端逻辑
const {
  command,
  conversations,
  inputRef,
  terminalRef,
  currentDir,
  showWelcome,
  isCommandExecuting,
  tabCompleteState,
  loadHistory,
  executeCommand,
  handleHistory,
  handleTabComplete,
  focusInput,
  isDir,
} = useTerminal(configContext);

// 3. 系统状态监控 (时间和性能)
const currentTime = ref("");
const currentDayOfWeek = ref("");
const memoryInfo = ref({ usage: 0, total: 0, percent: 0 });
const cpuInfo = ref("0%");
const latency = ref("0.000s");
const sysInfoTimer = ref(null); // 保存定时器ID

const user = computed(() => config.value.app.user);
// 聚合性能数据传给 parseInfoBarTemplate
const sysStats = computed(() => ({
  latency: latency.value,
  cpu: cpuInfo.value,
  mem: memoryInfo.value.percent,
  memUsage: memoryInfo.value.usage,
  memTotal: memoryInfo.value.total,
}));

// 辅助：更新时间与资源
const updateSysInfo = () => {
  const now = new Date();
  currentTime.value = now.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  currentDayOfWeek.value = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ][now.getDay()];

  if (performance?.memory) {
    const m = performance.memory;
    const used = Math.round(m.usedJSHeapSize / 1048576);
    const total = Math.round(m.totalJSHeapSize / 1048576);
    memoryInfo.value = {
      usage: used,
      total,
      percent: Math.round((used / total) * 100),
    };
  }

  // 简单的 CPU 模拟
  let lastTime = performance.now();
  requestAnimationFrame(() => {
    const delta = performance.now() - lastTime;
    cpuInfo.value = Math.min(100, Math.round((delta / 16.67) * 100)) + "%";
  });
};

// 注册onUnmounted钩子，确保在setup()同步执行期间注册
onUnmounted(() => {
  if (sysInfoTimer.value) {
    clearInterval(sysInfoTimer.value);
  }
});

onMounted(async () => {
  await loadConfig();
  loadHistory();

  updateSysInfo();
  sysInfoTimer.value = setInterval(updateSysInfo, 2000); // 降低频率优化性能

  // 初始命令
  const hist = localStorage.getItem("terminalHistory");
  if (!hist || JSON.parse(hist).length === 0) {
    command.value = "cat Readme.md";
    await executeCommand();
    command.value = "tree"; // 为了效果
    await executeCommand();
  }
});
</script>

<style scoped>
/* 样式已在 style.css 中定义 */
</style>
