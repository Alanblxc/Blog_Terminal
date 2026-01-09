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
                @keydown="handleKeydown"
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
import { onMounted, ref, computed } from "vue";
import Welcome from "./components/Welcome.vue";
import { useConfig } from "./composables/useConfig";
import { useTerminal } from "./composables/useTerminal";
import { parseInfoBarTemplate } from "./composables/utils";
import { useSystemStats } from "./composables/useSystemStats";

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
  handleKeydown, // 引入统一键盘处理
  focusInput,
  isDir,
  editor, // 获取编辑器状态
} = useTerminal(configContext);

// 3. 系统状态监控 (时间和性能)
const { 
  currentTime, 
  currentDayOfWeek, 
  sysStats, 
  startMonitoring 
} = useSystemStats();

const user = computed(() => config.value.app.user);

onMounted(async () => {
  await loadConfig();
  loadHistory();

  // 启动系统监控
  startMonitoring();

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
