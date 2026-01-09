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
        fontFamily: `${font.family.value}, '0xProto Nerd Font', 'Roboto Mono Nerd Font', 'Segoe UI Symbol', 'Segoe UI Emoji', monospace`,
        fontSize: `${fontSize}px`,
      }"
    >
      <div class="terminal-content">
        <!-- 欢迎区域：完全由配置驱动 -->
        <div v-if="showWelcome" class="welcome">
          <!-- 优化点：ASCII Art 改为数据绑定，不再硬编码 -->
          <pre v-if="!isMobile && asciiArt" class="ascii-art">{{
            asciiArt
          }}</pre>

          <div class="system-info">
            <!-- 优化点：直接读取配置中的欢迎信息 -->
            <div class="info-header">{{ welcome.title }}</div>
            <div class="info-item">
              󰍹&nbsp; OS {{ browserInfo.getOsType() }}
            </div>
            <div class="info-item">
              🌐&nbsp;Browser {{ browserInfo.getBrowserType() }}
            </div>
            <div class="info-item" v-html="welcome.welcomeMsg"></div>
            <div class="info-item" v-html="welcome.helpMsg"></div>
          </div>
        </div>

        <!-- 渲染每一次对话 -->
        <div
          v-for="(conversation, convIndex) in conversations"
          :key="conversation.id"
          class="conversation"
        >
          <!-- 命令行 -->
          <div class="command-line">
            <div class="prompt-header">
              <div
                class="info-bar-left"
                v-html="
                  parseInfoBarTemplate(
                    uiStyles.infoBar.leftTemplate,
                    {
                      user: user,
                      dayOfWeek: getDayOfWeek(),
                      time: conversation.command.time,
                      latency: latency,
                      cpu: cpuInfo,
                      mem: memoryInfo.percent,
                      memUsage: memoryInfo.usage,
                      memTotal: memoryInfo.total,
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
                      user: user,
                      dayOfWeek: getDayOfWeek(),
                      time: conversation.command.time,
                      latency: latency,
                      cpu: cpuInfo,
                      mem: memoryInfo.percent,
                      memUsage: memoryInfo.usage,
                      memTotal: memoryInfo.total,
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
                >{{ getDirIcon() }}
                {{
                  conversation.command.dir === "/"
                    ? "~"
                    : conversation.command.dir
                }}</span
              >
              <span
                class="prompt-symbol"
                :style="{ color: uiStyles.commandLine.promptSymbol }"
                >$</span
              >
              <span class="command-content">{{
                conversation.command.content
              }}</span>
            </div>
          </div>
          <!-- 命令输出 -->
          <div
            v-for="(outputItem, outputIndex) in conversation.output"
            :key="outputIndex"
            class="output"
          >
            <div v-if="outputItem.type === 'dir'" class="dir-output">
              <div
                v-for="item in outputItem.content"
                :key="item.name"
                class="dir-line"
                :style="{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }"
              >
                <span
                  v-if="item.type === 'dir'"
                  class="dir-item"
                  :style="{ color: uiStyles.commandLine.directory }"
                  >{{ item.icon }} {{ item.name }}</span
                >
                <div
                  v-else-if="item.type === 'file'"
                  :style="{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    width: '100%',
                  }"
                >
                  <span
                    class="file-item"
                    :style="{ color: uiStyles.commandLine.file }"
                    >{{ item.icon }} {{ item.name }}</span
                  >
                  <span
                    v-if="item.name.endsWith('.md') && item.date"
                    class="file-date"
                    :style="{ color: '#94a3b8', marginLeft: '10px' }"
                    >{{ item.date }}</span
                  >
                </div>
              </div>
            </div>
            <div
              v-else-if="outputItem.type === 'glow'"
              class="glow-content"
              :class="`theme-${theme.current.value}`"
            >
              <div class="glow-title">{{ outputItem.content.title }}</div>
              <div class="glow-meta">
                {{ outputItem.content.date }} |
                {{ outputItem.content.category }}
              </div>
              <div class="glow-body" v-html="outputItem.content.content"></div>
            </div>
            <div
              v-else-if="outputItem.type === 'editor'"
              class="editor-output"
              ref="editorContainer"
            ></div>
            <div v-else>{{ outputItem.content }}</div>
          </div>
        </div>
        <!-- 当前输入行 -->
        <div v-if="!isCommandExecuting" class="input-line">
          <div class="prompt-header">
            <div
              class="info-bar-left"
              v-html="
                parseInfoBarTemplate(
                  uiStyles.infoBar.leftTemplate,
                  {
                    user: user,
                    dayOfWeek: getDayOfWeek(),
                    time: currentTime,
                    latency: latency,
                    cpu: cpuInfo,
                    mem: memoryInfo.percent,
                    memUsage: memoryInfo.usage,
                    memTotal: memoryInfo.total,
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
                    user: user,
                    dayOfWeek: getDayOfWeek(),
                    time: currentTime,
                    latency: latency,
                    cpu: cpuInfo,
                    mem: memoryInfo.percent,
                    memUsage: memoryInfo.usage,
                    memTotal: memoryInfo.total,
                  },
                  uiStyles.infoBar.colors
                )
              "
            ></div>
          </div>
          <div class="prompt-line">
            <span class="prompt" :style="{ color: uiStyles.commandLine.prompt }"
              >{{ getDirIcon() }}
              {{ currentDir === "/" ? "~" : currentDir }}</span
            >
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
                placeholder=""
                ref="inputRef"
                autofocus
                class="command-content"
              />
            </div>
          </div>
        </div>
        <!-- 补全选项显示区域 -->
        <div
          v-if="!isCommandExecuting && tabCompleteState.showAll"
          class="completion-output"
        >
          <div class="dir-output">
            <div
              v-for="item in tabCompleteState.items"
              :key="item"
              class="dir-line"
              :style="{
                backgroundColor:
                  tabCompleteState.index ===
                  tabCompleteState.items.indexOf(item)
                    ? '#1e293b'
                    : 'transparent',
                padding: '2px 8px',
                borderRadius: '3px',
              }"
            >
              <span
                v-if="isDir(item, currentDir)"
                class="dir-item"
                :style="{ color: uiStyles.commandLine.directory }"
                >📁 {{ item }}</span
              >
              <span
                v-else
                class="file-item"
                :style="{ color: uiStyles.commandLine.file }"
                >📄 {{ item }}</span
              >
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick, watch, computed } from "vue";
import { marked } from "marked";
import { parse, stringify } from "@iarna/toml";

import commands from "./commands";
import { deepMerge, browserInfo, parseInfoBarTemplate } from "./js/utils";
import {
  getArticleInfo,
  isDir,
  getCompletionItems,
  articles,
} from "./js/fileSystem";

// 优化点：defaultConfig 包含完整结构，但内容留空或设为最简，由 config.toml 填充
const defaultConfig = {
  app: { user: "Alan" },
  // 添加 welcome 和 ascii 的默认结构，防止 undefined 报错
  welcome: {
    title: "Terminal Blog",
    welcomeMsg: "Loading...",
    helpMsg: "Type 'help'",
  },
  ascii: {
    art: "", // 留空，通过 TOML 加载
  },
  ui: {
    fontSize: "18",
    fontFamily: "Consolas, Monaco, 'Courier New', monospace",
    infoBar: {
      backgroundColor: "transparent",
      textColor: "#e2e8f0",
      borderColor: "transparent",
      height: "24px",
      padding: "0 10px",
      leftTemplate: "{user} on {dayOfWeek} at {time}",
      rightTemplate: "{latency}  MEM: {mem}% ({memUsage}/{memTotal}GB)",
      colors: {
        username: "#ffbebc",
        dayOfWeek: "#bc93ff",
        commandTime: "#bc93ff",
        latency: "#a9ffb4",
        cpu: "#ce9178",
        mem: "#a9ffb4",
      },
    },
    commandLine: {
      promptSymbol: "$",
      promptSymbolColor: "#ec4899",
      boldPrompt: false,
      italicPrompt: false,
      underlinePrompt: false,
      colors: {
        prompt: "#3b82f6",
        directory: "#60a5fa",
        file: "#fbbf24",
        command: "#ffffff",
        error: "#ff0000",
        success: "#00ff00",
        warning: "#ffff00",
        info: "#00ffff",
      },
      output: {
        dirItem: "#60a5fa",
        fileItem: "#fbbf24",
        error: "#ff0000",
        help: "#a9ffb4",
        listItem: "#ffffff",
        treeLine: "#6b7280",
      },
    },
  },
  background: { image: "/background.jpg", opacity: "0.9" },
  theme: {
    current: "default",
    available: ["default", "dark", "light", "solarized", "dracula"],
    default: {
      background: "#000000",
      text: "#ffffff",
      prompt: "#3b82f6",
      command: "#ffffff",
      directory: "#60a5fa",
      file: "#fbbf24",
      error: "#ff0000",
    },
  },
};

// 配置状态管理
// 初始化时包含所有结构，避免计算属性报错
const config = ref(JSON.parse(JSON.stringify(defaultConfig)));

// 优化点：使用 computed 属性从 config 中提取数据
// 这样当 loadConfig 更新 config.value 时，UI 会自动更新
const asciiArt = computed(() => config.value.ascii?.art || "");
const welcome = computed(() => config.value.welcome || defaultConfig.welcome);

// 辅助函数：更新localStorage中的TOML配置
const updateTomlConfig = (updates) => {
  try {
    const cachedConfig = localStorage.getItem("terminalConfigToml");
    if (!cachedConfig) return false;

    const parsedConfig = parse(cachedConfig);
    const updatedConfig = deepMerge(parsedConfig, updates);
    const tomlString = stringify(updatedConfig);

    localStorage.setItem("terminalConfigToml", tomlString);
    loadConfig();

    return true;
  } catch (error) {
    console.error("Failed to update TOML config:", error);
    return false;
  }
};

// 加载配置
const loadConfig = async () => {
  try {
    let configContent;
    let isFreshConfig = false;

    let cachedConfig = localStorage.getItem("terminalConfigToml");
    let needsFreshConfig = !cachedConfig;

    if (cachedConfig) {
      try {
        parse(cachedConfig);
        console.log("Using cached config.toml from localStorage");
      } catch (preCheckError) {
        console.warn("Cached config is corrupted, fetching fresh copy...");
        localStorage.removeItem("terminalConfigToml");
        cachedConfig = null;
        needsFreshConfig = true;
      }
    }

    if (needsFreshConfig) {
      const response = await fetch("/config.toml");
      if (response.ok) {
        configContent = await response.text();
        localStorage.setItem("terminalConfigToml", configContent);
        console.log("Fetched and cached fresh config.toml from server");
        isFreshConfig = true;
      }
    } else {
      configContent = cachedConfig;
    }

    if (configContent) {
      const parsedConfig = parse(configContent);
      const mergedConfig = deepMerge(defaultConfig, parsedConfig);
      // 使用深拷贝确保响应式更新
      config.value = JSON.parse(JSON.stringify(mergedConfig));
      // 注意：不再需要单独维护 welcomeConfig，它现在是 config 的一部分
    }
  } catch (error) {
    console.warn(
      `Failed to load config.toml: ${error.message}. Using default configuration.`
    );
    localStorage.removeItem("terminalConfigToml");
    config.value = JSON.parse(JSON.stringify(deepMerge({}, defaultConfig)));
  }
};

const initApp = async () => {
  await loadConfig();
};

const conversations = ref([]);
const command = ref("");
const inputRef = ref(null);
const terminalRef = ref(null);
const currentDir = ref("/");
const showWelcome = ref(true);
const isMobile = ref(false);

const tabCompleteState = ref({
  currentCmd: "",
  currentArg: "",
  originalArg: "",
  items: [],
  index: -1,
  showAll: false,
  firstTab: true,
});

const user = computed(() => config.value.app.user);
const currentTime = ref("");
const currentDayOfWeek = ref("");

const memoryInfo = {
  usage: ref("0"),
  total: ref("0"),
  percent: ref("0"),
};
const cpuInfo = ref("0%");
const latency = ref("0.000s");

const fontSize = computed(() => config.value.ui.fontSize);
const font = {
  family: computed(() => config.value.ui.fontFamily || "Cascadia Code"),
};
const background = {
  image: computed(() => config.value.background.image),
  opacity: computed(() => parseFloat(config.value.background.opacity)),
};

const theme = {
  current: computed(() => config.value.theme.current),
  available: computed(() => config.value.theme.available),
  colors: computed(() => {
    return (
      config.value.theme[config.value.theme.current] || {
        prompt: "#3b82f6",
        directory: "#60a5fa",
        file: "#fbbf24",
      }
    );
  }),
};

const uiStyles = computed(() => {
  const currentTheme = theme.current.value;
  const themeColors = config.value.theme[currentTheme] || {};

  return {
    infoBar: {
      backgroundColor:
        config.value.ui?.infoBar?.backgroundColor || "transparent",
      textColor: config.value.ui?.infoBar?.textColor || "#e2e8f0",
      borderColor: config.value.ui?.infoBar?.borderColor || "transparent",
      height: config.value.ui?.infoBar?.height || "24px",
      padding: config.value.ui?.infoBar?.padding || "0 10px",
      leftTemplate:
        config.value.ui?.infoBar?.leftTemplate ||
        "{user} on {dayOfWeek} at {time}",
      rightTemplate:
        config.value.ui?.infoBar?.rightTemplate ||
        "{latency}  MEM: {mem}% ({memUsage}/{memTotal}GB)",
      colors: {
        username: config.value.ui?.infoBar?.colors?.username || "#ffbebc",
        dayOfWeek: config.value.ui?.infoBar?.colors?.dayOfWeek || "#bc93ff",
        commandTime: config.value.ui?.infoBar?.colors?.commandTime || "#bc93ff",
        latency: config.value.ui?.infoBar?.colors?.latency || "#a9ffb4",
        cpu: config.value.ui?.infoBar?.colors?.cpu || "#ce9178",
        mem: config.value.ui?.infoBar?.colors?.mem || "#a9ffb4",
      },
    },
    commandLine: {
      boldPrompt: config.value.ui?.commandLine?.boldPrompt || false,
      italicPrompt: config.value.ui?.commandLine?.italicPrompt || false,
      underlinePrompt: config.value.ui?.commandLine?.underlinePrompt || false,
      prompt:
        config.value.ui?.commandLine?.colors?.prompt ||
        themeColors.prompt ||
        "#3b82f6",
      promptSymbol: config.value.ui?.commandLine?.promptSymbol || "$",
      promptSymbolColor:
        config.value.ui?.commandLine?.promptSymbolColor || "#ec4899",
      directory:
        config.value.ui?.commandLine?.colors?.directory ||
        themeColors.directory ||
        "#60a5fa",
      file:
        config.value.ui?.commandLine?.colors?.file ||
        themeColors.file ||
        "#fbbf24",
      command:
        config.value.ui?.commandLine?.colors?.command ||
        themeColors.command ||
        "#ffffff",
      error: config.value.ui?.commandLine?.colors?.error || "#ff0000",
      success: config.value.ui?.commandLine?.colors?.success || "#00ff00",
      warning: config.value.ui?.commandLine?.colors?.warning || "#ffff00",
      info: config.value.ui?.commandLine?.colors?.info || "#00ffff",
      output: {
        dirItem: config.value.ui?.commandLine?.output?.dirItem || "#60a5fa",
        fileItem: config.value.ui?.commandLine?.output?.fileItem || "#fbbf24",
        error: config.value.ui?.commandLine?.output?.error || "#ff0000",
        help: config.value.ui?.commandLine?.output?.help || "#a9ffb4",
        listItem: config.value.ui?.commandLine?.output?.listItem || "#ffffff",
        treeLine: config.value.ui?.commandLine?.output?.treeLine || "#6b7280",
      },
    },
    theme: {
      current: currentTheme,
      available: config.value.theme.available,
      colors: themeColors,
    },
  };
});

const infoBarColors = computed(() => uiStyles.value.infoBar);

watch(
  () => theme.current.value,
  (newTheme) => {
    conversations.value.forEach((conversation) => {
      conversation.output.forEach((outputItem) => {
        if (outputItem.type === "glow") {
          outputItem.theme = newTheme;
        }
      });
    });
  }
);

watch(
  () => command.value,
  (newValue, oldValue) => {
    if (tabCompleteState.value.showAll) {
      const newParts = newValue.split(" ");
      const oldParts = oldValue.split(" ");

      if (newParts[0] !== oldParts[0]) {
        tabCompleteState.value = {
          currentCmd: "",
          currentArg: "",
          originalArg: "",
          items: [],
          index: -1,
          showAll: false,
          firstTab: true,
        };
        return;
      }

      if (newParts.length <= 2 && oldParts.length <= 2) {
        const newArg = newParts[1] || "";
        const allItems = getCompletionItems(newParts[0], currentDir.value, "");
        const matchingItems = tabCompleteState.value.originalArg
          ? allItems.filter((item) =>
              item.startsWith(tabCompleteState.value.originalArg)
            )
          : allItems;

        if (!newArg || !matchingItems.some((item) => item.startsWith(newArg))) {
          tabCompleteState.value = {
            currentCmd: "",
            currentArg: "",
            originalArg: "",
            items: [],
            index: -1,
            showAll: false,
            firstTab: true,
          };
        }
      } else {
        tabCompleteState.value = {
          currentCmd: "",
          currentArg: "",
          originalArg: "",
          items: [],
          index: -1,
          showAll: false,
          firstTab: true,
        };
      }
    }
  }
);

const isCommandExecuting = ref(false);

const history = {
  commands: ref([]),
  index: ref(-1),
  temp: ref(""),
};

const loadHistory = () => {
  const savedHistory = localStorage.getItem("terminalHistory");
  if (savedHistory) {
    try {
      const parsedHistory = JSON.parse(savedHistory);
      if (Array.isArray(parsedHistory)) {
        history.commands.value = parsedHistory;
      }
    } catch (error) {
      console.error("Failed to load history from localStorage:", error);
    }
  }
};

const saveHistory = () => {
  const limitedHistory = history.commands.value.slice(-20);
  localStorage.setItem("terminalHistory", JSON.stringify(limitedHistory));
};

const clearHistory = () => {
  history.commands.value = [];
  localStorage.removeItem("terminalHistory");
};

const updateMemoryInfo = () => {
  if (performance && performance.memory) {
    const memInfo = performance.memory;
    const used = Math.round(memInfo.usedJSHeapSize / 1024 / 1024);
    const total = Math.round(memInfo.totalJSHeapSize / 1024 / 1024);
    const percent = Math.round((used / total) * 100);

    memoryInfo.usage.value = used.toString();
    memoryInfo.total.value = total.toString();
    memoryInfo.percent.value = percent.toString();
  }
};

let lastTimestamp = 0;
let cpuUsage = 0;
let frameCount = 0;

const updateCpuInfo = () => {
  const now = performance.now();
  if (lastTimestamp > 0) {
    const frameTime = now - lastTimestamp;
    const idealFrameTime = 16.67;
    cpuUsage = Math.min(100, Math.round((frameTime / idealFrameTime) * 100));
    cpuInfo.value = `${cpuUsage}%`;
  }
  lastTimestamp = now;
  frameCount++;

  if (frameCount % 10 === 0) {
    requestAnimationFrame(updateCpuInfo);
  } else {
    requestAnimationFrame(updateCpuInfo);
  }
};

let currentConversation = null;

const updateTime = () => {
  const now = new Date();
  currentTime.value = now.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    hourCycle: "h12",
  });

  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  currentDayOfWeek.value = days[now.getDay()];

  updateMemoryInfo();
};

const executeCommand = async () => {
  if (!command.value.trim()) return;

  isCommandExecuting.value = true;

  const cmd = command.value.trim();

  if (history.commands.value[history.commands.value.length - 1] !== cmd) {
    history.commands.value.push(cmd);
    saveHistory();
  }
  history.index.value = -1;
  history.temp.value = "";

  tabCompleteState.value = {
    currentCmd: "",
    currentArg: "",
    originalArg: "",
    items: [],
    index: -1,
    showAll: false,
    firstTab: true,
  };

  const commandTime = currentTime.value;
  const commandDir = currentDir.value;

  const newConversation = {
    id: Date.now(),
    command: {
      content: cmd,
      time: commandTime,
      dir: commandDir,
    },
    output: [],
  };

  conversations.value.push(newConversation);
  currentConversation = newConversation;

  const args = cmd.split(" ");
  const cmdName = args[0];
  const cmdArgs = args.slice(1);

  try {
    if (commands[cmdName]) {
      const context = {
        articles,
        currentDir: currentDir.value,
        currentDirRef: currentDir,
        conversation: currentConversation,
        getArticleInfo,
        getDirIcon,
        fontSize,
        font,
        background,
        theme,
        infoBarColors,
        uiStyles,
        conversations,
        showWelcome,
        clearHistory,
        updateTomlConfig,
        reloadConfig: loadConfig,
      };

      const commandHandler = commands[cmdName];
      await commandHandler(context, ...cmdArgs);
    } else {
      if (currentConversation) {
        currentConversation.output.push({
          type: "error",
          content: `Command not found: ${cmdName}`,
        });
        await scrollToBottom();
      }
    }
  } finally {
    command.value = "";
    isCommandExecuting.value = false;
    await nextTick();
    await scrollToBottom();
    focusInput();
  }
};

const getDirIcon = () => {
  return "";
};

const getDayOfWeek = () => {
  return currentDayOfWeek.value;
};

const focusInput = () => {
  if (inputRef.value) {
    inputRef.value.focus();
  }
};

const handleHistory = (direction) => {
  if (history.commands.value.length === 0) return;

  if (history.index.value === -1) {
    history.temp.value = command.value;
  }

  if (direction === "up") {
    if (history.index.value < history.commands.value.length - 1) {
      history.index.value++;
      command.value =
        history.commands.value[
          history.commands.value.length - 1 - history.index.value
        ];
    }
  } else if (direction === "down") {
    if (history.index.value > 0) {
      history.index.value--;
      command.value =
        history.commands.value[
          history.commands.value.length - 1 - history.index.value
        ];
    } else if (history.index.value === 0) {
      history.index.value = -1;
      command.value = history.temp.value;
    }
  }

  nextTick(() => {
    if (inputRef.value) {
      inputRef.value.focus();
      inputRef.value.setSelectionRange(
        command.value.length,
        command.value.length
      );
    }
  });
};

const handleGenericCompletion = (currentCmd, currentArg, allItems) => {
  if (allItems.length === 0) return;

  const isSameCommand = tabCompleteState.value.currentCmd === currentCmd;
  const isInSameCompletion = tabCompleteState.value.showAll;

  const prefixToUse = isInSameCompletion
    ? tabCompleteState.value.originalArg
    : currentArg;

  const matchingItems = prefixToUse
    ? allItems.filter((item) => item.startsWith(prefixToUse))
    : allItems;

  if (matchingItems.length === 0) return;

  if (!isSameCommand || !isInSameCompletion) {
    tabCompleteState.value = {
      currentCmd: currentCmd,
      currentArg: currentArg,
      originalArg: currentArg,
      items: matchingItems,
      index: -1,
      showAll: false,
      firstTab: true,
    };
  }

  if (tabCompleteState.value.firstTab) {
    tabCompleteState.value.showAll = true;
    tabCompleteState.value.firstTab = false;
    tabCompleteState.value.index = 0;
    command.value = `${currentCmd} ${matchingItems[0]}`;
  } else {
    tabCompleteState.value.index =
      (tabCompleteState.value.index + 1) % matchingItems.length;
    command.value = `${currentCmd} ${
      matchingItems[tabCompleteState.value.index]
    }`;
  }
};

const handleTabComplete = () => {
  const cmd = command.value;
  const parts = cmd.split(" ");

  if (parts.length === 1) {
    const cmdPrefix = parts[0];
    const basicCommands = ["ls", "cd", "cat"];

    if (cmdPrefix === "" || basicCommands.includes(cmdPrefix)) {
      let currentIndex = basicCommands.indexOf(command.value);
      let nextIndex =
        currentIndex === -1 ? 0 : (currentIndex + 1) % basicCommands.length;
      command.value = basicCommands[nextIndex];
      return;
    }

    const commandNames = Object.keys(commands).sort();
    let matchingCommands = commandNames.filter((cmdName) =>
      cmdName.startsWith(cmdPrefix)
    );

    if (matchingCommands.length === 0) return;
    let currentIndex = matchingCommands.indexOf(cmdPrefix);
    let nextIndex =
      currentIndex === -1 ? 0 : (currentIndex + 1) % matchingCommands.length;
    command.value = matchingCommands[nextIndex];
    return;
  }

  if (
    (parts[0] === "cd" ||
      parts[0] === "cat" ||
      parts[0] === "wget" ||
      parts[0] === "ls") &&
    parts.length <= 2
  ) {
    const currentCmd = parts[0];
    const currentArg = parts.length === 2 ? parts[1] : "";
    const allItems = getCompletionItems(currentCmd, currentDir.value, "");
    handleGenericCompletion(currentCmd, currentArg, allItems);
  } else if (parts[0] === "theme" && parts.length <= 2) {
    const allThemes = theme.available.value;
    const currentCmd = parts[0];
    const currentArg = parts.length === 2 ? parts[1] : "";
    handleGenericCompletion(currentCmd, currentArg, allThemes);
  } else if (parts[0] === "background" && parts.length <= 2) {
    const currentCmd = parts[0];
    const currentArg = parts.length === 2 ? parts[1] : "";
    const backgroundSubcommands = ["opacity", "image"];
    handleGenericCompletion(currentCmd, currentArg, backgroundSubcommands);
  } else if (parts[0] === "font" && parts.length <= 2) {
    const currentCmd = parts[0];
    const currentArg = parts.length === 2 ? parts[1] : "";
    const availableFonts = [
      "0xProto Nerd Font",
      "Fira Code",
      "Cascadia Code",
      "JetBrains Mono",
      "default",
    ];
    handleGenericCompletion(currentCmd, currentArg, availableFonts);
  } else if (parts[0] === "vi" && parts.length <= 2) {
    const currentCmd = parts[0];
    const currentArg = parts.length === 2 ? parts[1] : "";
    const allItems = getCompletionItems(currentCmd, currentDir.value, "");
    const mdItems = allItems.filter((item) => item.endsWith(".md"));
    let viItems = [...mdItems];
    if (currentDir.value === "/") {
      if (!viItems.includes("config.toml")) {
        viItems.push("config.toml");
      }
    }
    handleGenericCompletion(currentCmd, currentArg, viItems);
  }
};

const scrollToBottom = async () => {
  await nextTick();
  if (terminalRef.value) {
    terminalRef.value.scrollTop = terminalRef.value.scrollHeight;
  }
};

const detectMobile = () => {
  return (
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    ) || window.innerWidth <= 768
  );
};

onMounted(async () => {
  updateTime();
  const timeInterval = setInterval(updateTime, 60000);
  requestAnimationFrame(updateCpuInfo);
  isMobile.value = detectMobile();

  const handleResize = () => {
    isMobile.value = detectMobile();
  };
  window.addEventListener("resize", handleResize);

  onUnmounted(() => {
    clearInterval(timeInterval);
    window.removeEventListener("resize", handleResize);
  });

  loadHistory();
  await initApp();

  const autoExecuteCommands = async (commandsStr) => {
    const commandsList = commandsStr.split("|");
    for (const cmdStr of commandsList) {
      const cmd = cmdStr.trim();
      if (!cmd) continue;

      const args = cmd.split(" ");
      const cmdName = args[0];
      const cmdArgs = args.slice(1);

      const newConversation = {
        id: Date.now() + Math.random(),
        command: {
          content: cmd,
          time: currentTime.value,
          dir: currentDir.value,
        },
        output: [],
      };

      conversations.value.push(newConversation);
      currentConversation = newConversation;

      try {
        if (commands[cmdName]) {
          const context = {
            articles,
            currentDir: currentDir.value,
            currentDirRef: currentDir,
            conversation: currentConversation,
            getArticleInfo,
            getDirIcon,
            fontSize,
            font,
            background,
            theme,
            infoBarColors,
            conversations,
            showWelcome,
          };
          await commands[cmdName](context, ...cmdArgs);
        } else {
          currentConversation.output.push({
            type: "error",
            content: `Command not found: ${cmdName}`,
          });
        }
      } catch (error) {
        currentConversation.output.push({
          type: "error",
          content: `Error executing command: ${error.message}`,
        });
      }
      await scrollToBottom();
      await nextTick();
    }
  };

  if (history.commands.value.length === 0) {
    await autoExecuteCommands("cat Readme.md|tree");
  }
});
</script>

<style scoped>
/* 组件样式已在 style.css 中定义 */
</style>
