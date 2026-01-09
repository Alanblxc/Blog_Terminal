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
      :style="{
        background: `rgba(0, 0, 0, ${background.opacity.value})`,
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        fontFamily: `${font.family.value}, '0xProto Nerd Font', 'Roboto Mono Nerd Font', 'Segoe UI Symbol', 'Segoe UI Emoji', monospace`,
        fontSize: `${fontSize}px`,
      }"
    >
      <div class="terminal-content">
        <div v-if="showWelcome" class="welcome">
          <pre v-if="!isMobile" class="ascii-art">
 @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@ 
 @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@ 
 @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@##******#@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@ 
 @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@%*+===============+%#@@@@@@@@@@@@@@@@@@@@@@@@@@@@@ 
 @@@@@@@@@@@@@@@@@@@@@@@@@@##++++===+================+#@@@@@@@@@@@@@@@@@@@@@@@@@@ 
 @@@@@@@@@@@@@@@@@@@@@@@@@+++++++++++==+==+=======+=++++%@@@@@@@@@@@@@@@@@@@@@@@@ 
 @@@@@@@@@@@@@@@@@@@@@@@+++++++++++++++===========++++++++%@@@@@@@@@@@@@@@@@@@@@@ 
 @@@@@@@@@@@@@@@@@@@@@#+++++++++=+++++=====+=====+++++++++++@@@@@@@@@@@@@@@@@@@@@ 
 @@@@@@@@@@@@@@@@@@@@%+++==------------==========++++++++++++#@@@@@@@@@@@@@@@@@@@ 
 @@@@@@@@@@@@@@@@@@@%+=-------------------========++++++++++++@@@@@@@@@@@@@@@@@@@ 
 @@@@@@@@@@@@@@@@@@@=-----------------------========++++++++++#@@@@@@@@@@@@@@@@@@ 
 @@@@@@@@@@@@@@@@@@@-----------------+######+-========+++++++++@@@@@@@@@@@@@@@@@@ 
 @@@@@@@@@@@@@@@@@@=---------------:##########==========++++++*@@@@@@@@@@@@@@@@@@ 
 @@@@@@@@@@@@@@@@@@=-------------::*##########%===============@@@@@@@@@@@@@@@@@@@ 
 @@@@@@@@@@@@@@@@@@=------------::::@#########==============+#@@@@@@@@@@@@@@@@@@@ 
 @@@@@@@@@@@@@@@@@@#-----------:::::%@######*==============+@@@@@@@@@@@@@@@@@@@@@ 
 @@@@@@@@@@@@@@@@@@@-----------::::::+@#######===========##@@@@@@@@@@@@@@@@@@@@@@ 
 @@@@@@@@@@@@@@@@@@@%----------::::::::*####@@@@@#####@#@@@@@@@@@@@@@@@@@@@@@@@@@ 
 @@@@@@@@@@@@@@@@@@@@%---------::::::::::+%@@@@@@#####@#@@@@@@@@@@@@@@@@@@@@@@@@@ 
 @@@@@@@@@@@@@@@@@@@@@#=-------::::::::::::::***%###%**+::-#@@@@@@@@@@@@@@@@@@@@@ 
 @@@@@@@@@@@@@@@@@@@@@@@=-------:::::::::::::::::::::::::-@@@@@@@@@@@@@@@@@@@@@@@ 
 @@@@@@@@@@@@@@@@@@@@@@@@@=-------:::::::::::::::::::::-@######################## 
 @@@@@@@@@@@@@@@@@@@@@@@@@@##------::::::::::::::::::##@######################### 
 @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@%*------:::::::::-**@@@@@######################### 
 @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@#####@#%+**+%#@@#@@@@@@@@######################### 
 @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@#################@@@@@@@@######################### 
 @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@#################@@@@@@@@#########################</pre
          >
          <div class="system-info">
            <div class="info-header">{{ welcomeConfig.title }}</div>
            <div class="info-item">
              󰍹&nbsp; OS {{ browserInfo.getOsType() }}
            </div>
            <div class="info-item">
              🌐&nbsp;Browser {{ browserInfo.getBrowserType() }}
            </div>
            <div class="info-item">{{ welcomeConfig.welcomeMsg }}</div>
            <div class="info-item">{{ welcomeConfig.helpMsg }}</div>
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
                  parseInfoBarTemplate(uiStyles.infoBar.leftTemplate, {
                    user: user,
                    dayOfWeek: getDayOfWeek(),
                    time: conversation.command.time,
                    latency: latency,
                    cpu: cpuInfo,
                    mem: memoryInfo.percent,
                    memUsage: memoryInfo.usage,
                    memTotal: memoryInfo.total,
                  })
                "
              ></div>
              <div
                class="info-bar-right"
                v-html="
                  parseInfoBarTemplate(uiStyles.infoBar.rightTemplate, {
                    user: user,
                    dayOfWeek: getDayOfWeek(),
                    time: conversation.command.time,
                    latency: latency,
                    cpu: cpuInfo,
                    mem: memoryInfo.percent,
                    memUsage: memoryInfo.usage,
                    memTotal: memoryInfo.total,
                  })
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
            >
              <!-- 编辑器内容将通过JavaScript动态添加 -->
            </div>
            <div v-else>{{ outputItem.content }}</div>
          </div>
        </div>
        <!-- 当前输入行 - 仅在命令执行完毕后显示 -->
        <div v-if="!isCommandExecuting" class="input-line">
          <div class="prompt-header">
            <div
              class="info-bar-left"
              v-html="
                parseInfoBarTemplate(uiStyles.infoBar.leftTemplate, {
                  user: user,
                  dayOfWeek: getDayOfWeek(),
                  time: currentTime,
                  latency: latency,
                  cpu: cpuInfo,
                  mem: memoryInfo.percent,
                  memUsage: memoryInfo.usage,
                  memTotal: memoryInfo.total,
                })
              "
            ></div>
            <div
              class="info-bar-right"
              v-html="
                parseInfoBarTemplate(uiStyles.infoBar.rightTemplate, {
                  user: user,
                  dayOfWeek: getDayOfWeek(),
                  time: currentTime,
                  latency: latency,
                  cpu: cpuInfo,
                  mem: memoryInfo.percent,
                  memUsage: memoryInfo.usage,
                  memTotal: memoryInfo.total,
                })
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
                v-if="isDir(item)"
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
import postsData from "../posts.json";
import { parse, stringify } from "@iarna/toml";

// 从命令模块导入命令映射
import commands from "./commands"; // 优雅的默认导入

// 配置默认值（用于初始化ref）
const defaultConfig = {
  app: { user: "Alan" },
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
      // 文本格式选项
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
      // 输出格式配色
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

// 辅助函数：更新localStorage中的TOML配置
const updateTomlConfig = (updates) => {
  try {
    // 获取当前缓存的TOML配置
    const cachedConfig = localStorage.getItem("terminalConfigToml");
    if (!cachedConfig) return false;

    // 解析TOML到JS对象
    const parsedConfig = parse(cachedConfig);

    // 应用更新
    const updatedConfig = { ...parsedConfig };

    // 递归更新配置对象
    const applyUpdates = (obj, updates, path = []) => {
      for (const [key, value] of Object.entries(updates)) {
        const currentPath = [...path, key];
        let target = obj;

        // 构建嵌套路径
        for (let i = 0; i < currentPath.length - 1; i++) {
          const nestedKey = currentPath[i];
          if (!target[nestedKey]) {
            target[nestedKey] = {};
          }
          target = target[nestedKey];
        }

        // 设置最终值
        target[currentPath[currentPath.length - 1]] = value;
      }
    };

    applyUpdates(updatedConfig, updates);

    // 使用@iarna/toml的stringify函数转换为TOML格式
    const tomlString = stringify(updatedConfig);

    // 保存回localStorage
    localStorage.setItem("terminalConfigToml", tomlString);

    // 重新加载配置以应用更改
    loadConfig();

    return true;
  } catch (error) {
    console.error("Failed to update TOML config:", error);
    return false;
  }
};

// 简单的TOML字符串生成函数
const toTomlString = (obj, indent = 0, parentKey = "") => {
  let result = "";
  const indentStr = "  ".repeat(indent);

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = parentKey ? `${parentKey}.${key}` : key;

    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      // 嵌套对象，生成section
      result += `${indentStr}[${fullKey}]\n`;
      result += toTomlString(value, indent + 1, fullKey);
    } else if (
      typeof value === "object" &&
      value !== null &&
      Array.isArray(value)
    ) {
      // 数组
      result += `${indentStr}${key} = [${value
        .map((item) => `\"${item}\"`)
        .join(", ")}]\n`;
    } else if (typeof value === "string") {
      // 字符串值 - 处理多行字符串
      if (value.includes("\n")) {
        // 多行字符串使用三引号
        result += `${indentStr}${key} = \"\"\"\n${value}\n${indentStr}\"\"\"\n`;
      } else {
        // 单行字符串使用普通引号
        result += `${indentStr}${key} = \"${value}\"\n`;
      }
    } else if (typeof value === "number") {
      // 数字值
      result += `${indentStr}${key} = ${value}\n`;
    } else if (typeof value === "boolean") {
      // 布尔值
      result += `${indentStr}${key} = ${value}\n`;
    }
  }

  return result;
};

// 在浏览器环境中使用fetch读取配置文件，并缓存到localStorage
const loadConfig = async () => {
  try {
    let configContent;
    let isFreshConfig = false;

    // 检查localStorage中是否有缓存的配置
    let cachedConfig = localStorage.getItem("terminalConfigToml");

    // 标记是否需要获取新配置
    let needsFreshConfig = !cachedConfig;

    // 如果有缓存但之前解析失败过，尝试获取新配置
    if (cachedConfig) {
      try {
        // 预检查缓存是否有效
        parse(cachedConfig);
        console.log("Using cached config.toml from localStorage");
      } catch (preCheckError) {
        console.warn("Cached config is corrupted, fetching fresh copy...");
        localStorage.removeItem("terminalConfigToml");
        cachedConfig = null;
        needsFreshConfig = true;
      }
    }

    // 如果需要获取新配置
    if (needsFreshConfig) {
      const response = await fetch("/config.toml");
      if (response.ok) {
        configContent = await response.text();
        // 将原始TOML内容缓存到localStorage
        localStorage.setItem("terminalConfigToml", configContent);
        console.log("Fetched and cached fresh config.toml from server");
        isFreshConfig = true;
      }
    } else {
      // 使用缓存的配置
      configContent = cachedConfig;
    }

    if (configContent) {
      // 解析TOML配置
      const parsedConfig = parse(configContent);
      // 更新响应式配置变量
      config.value = parsedConfig;

      // 更新状态值
      user.value = parsedConfig.app.user;
      fontSize.value = parsedConfig.ui.fontSize;
      font.family.value = parsedConfig.ui.fontFamily || "Cascadia Code"; // 更新字体设置
      background.image.value = parsedConfig.background.image;
      background.opacity.value = parseFloat(parsedConfig.background.opacity); // 转换为数字类型

      // 更新主题配置
      const newThemeConfig = {
        current: parsedConfig.theme.current,
        available: parsedConfig.theme.available,
        colors: parsedConfig.theme[parsedConfig.theme.current] || {},
      };

      // 更新样式配置 - 从配置文件读取命令行样式
      uiStyles.value = {
        // 信息栏配置
        infoBar: {
          backgroundColor:
            parsedConfig.ui?.infoBar?.backgroundColor || "transparent",
          textColor: parsedConfig.ui?.infoBar?.textColor || "#e2e8f0",
          borderColor: parsedConfig.ui?.infoBar?.borderColor || "transparent",
          height: parsedConfig.ui?.infoBar?.height || "24px",
          padding: parsedConfig.ui?.infoBar?.padding || "0 10px",
          leftTemplate:
            parsedConfig.ui?.infoBar?.leftTemplate ||
            "{user} on {dayOfWeek} at {time}",
          rightTemplate:
            parsedConfig.ui?.infoBar?.rightTemplate ||
            "{latency}  MEM: {mem}% ({memUsage}/{memTotal}GB)",
          colors: {
            username: parsedConfig.ui?.infoBar?.colors?.username || "#ffbebc",
            dayOfWeek: parsedConfig.ui?.infoBar?.colors?.dayOfWeek || "#bc93ff",
            commandTime:
              parsedConfig.ui?.infoBar?.colors?.commandTime || "#bc93ff",
            latency: parsedConfig.ui?.infoBar?.colors?.latency || "#a9ffb4",
            cpu: parsedConfig.ui?.infoBar?.colors?.cpu || "#ce9178",
            mem: parsedConfig.ui?.infoBar?.colors?.mem || "#a9ffb4",
          },
        },
        // 命令行样式 - 从配置读取
        commandLine: {
          // 文本格式选项
          boldPrompt: parsedConfig.ui?.commandLine?.boldPrompt || false,
          italicPrompt: parsedConfig.ui?.commandLine?.italicPrompt || false,
          underlinePrompt:
            parsedConfig.ui?.commandLine?.underlinePrompt || false,
          // 基本样式
          prompt: parsedConfig.ui?.commandLine?.colors?.prompt || "#3b82f6",
          promptSymbol: parsedConfig.ui?.commandLine?.promptSymbol || "$",
          promptSymbolColor:
            parsedConfig.ui?.commandLine?.promptSymbolColor || "#ec4899",
          directory:
            parsedConfig.ui?.commandLine?.colors?.directory || "#60a5fa",
          file: parsedConfig.ui?.commandLine?.colors?.file || "#fbbf24",
          command: parsedConfig.ui?.commandLine?.colors?.command || "#ffffff",
          // 状态颜色
          error: parsedConfig.ui?.commandLine?.colors?.error || "#ff0000",
          success: parsedConfig.ui?.commandLine?.colors?.success || "#00ff00",
          warning: parsedConfig.ui?.commandLine?.colors?.warning || "#ffff00",
          info: parsedConfig.ui?.commandLine?.colors?.info || "#00ffff",
          // 输出格式配色
          output: {
            dirItem: parsedConfig.ui?.commandLine?.output?.dirItem || "#60a5fa",
            fileItem:
              parsedConfig.ui?.commandLine?.output?.fileItem || "#fbbf24",
            error: parsedConfig.ui?.commandLine?.output?.error || "#ff0000",
            help: parsedConfig.ui?.commandLine?.output?.help || "#a9ffb4",
            listItem:
              parsedConfig.ui?.commandLine?.output?.listItem || "#ffffff",
            treeLine:
              parsedConfig.ui?.commandLine?.output?.treeLine || "#6b7280",
          },
        },
        // 主题配置
        theme: newThemeConfig,
      };

      // 更新欢迎语配置
      if (parsedConfig.welcome) {
        welcomeConfig.value = {
          title: parsedConfig.welcome.title || welcomeConfig.value.title,
          welcomeMsg:
            parsedConfig.welcome.welcomeMsg || welcomeConfig.value.welcomeMsg,
          helpMsg: parsedConfig.welcome.helpMsg || welcomeConfig.value.helpMsg,
        };
      }
    }
  } catch (error) {
    console.warn(
      `Failed to load config.toml: ${error.message}. Using default configuration.`
    );
    // 如果配置加载失败，尝试清除可能损坏的缓存
    localStorage.removeItem("terminalConfigToml");
  }
};

// 初始化应用配置
const initApp = async () => {
  await loadConfig();
  // 不再加载terminalSettings，所有配置都来自TOML
};

// 状态管理 - 按功能分组
const conversations = ref([]); // 对话数组，每个元素包含命令和输出
const command = ref("");
const inputRef = ref(null);
const currentDir = ref("/");
const showWelcome = ref(true);
const isMobile = ref(false); // 检测是否为移动设备

// 欢迎语配置
const welcomeConfig = ref({
  title: "Welcome to My Terminal Blog",
  welcomeMsg:
    "📝&nbsp;Type 'ls' to see categories, 'cat file.md' to read articles, 'tree' to see directory structure",
  helpMsg: "💡&nbsp;Type 'help' for available commands",
});

// Tab补全状态管理
const tabCompleteState = ref({
  currentCmd: "", // 当前命令
  currentArg: "", // 当前参数
  originalArg: "", // 原始前缀（用于过滤匹配项）
  items: [], // 补全列表
  index: -1, // 当前补全索引
  showAll: false, // 是否显示所有补全选项
  firstTab: true, // 是否是第一次按Tab键
});

// 通用文件补全函数
const getCompletionItems = (cmd, currentDirValue, currentArg) => {
  const currentContent = articles[currentDirValue];
  if (!currentContent || currentContent.type !== "dir") {
    return [];
  }

  // 确定补全类型：文件夹、文件或两者
  let itemTypes = [];
  if (cmd === "cd") {
    // cd只补全文件夹
    itemTypes = ["dir"];
  } else if (cmd === "cat" || cmd === "wget") {
    // cat和wget只补全文件
    itemTypes = ["file"];
  } else if (cmd === "ls") {
    // ls补全文件夹和文件
    itemTypes = ["dir", "file"];
  } else {
    // 默认补全文件夹和文件
    itemTypes = ["dir", "file"];
  }

  // 获取所有匹配类型的项
  let allItems = currentContent.content
    .filter((item) => itemTypes.includes(item.type))
    .map((item) => item.name);

  // 排序候选项
  allItems.sort();

  // 如果有前缀，过滤匹配前缀的项
  if (currentArg) {
    return allItems.filter((item) => item.startsWith(currentArg));
  }

  return allItems;
};

// 用户和系统信息
const user = ref(defaultConfig.app.user);
const currentTime = ref("");
const currentDayOfWeek = ref("");
const browserInfo = {
  getBrowserType: () => {
    const userAgent = navigator.userAgent;
    if (userAgent.includes("Chrome")) return "Chrome";
    if (userAgent.includes("Firefox")) return "Firefox";
    if (userAgent.includes("Safari")) return "Safari";
    if (userAgent.includes("Edge")) return "Edge";
    return "Unknown Browser";
  },
  getOsType: () => {
    const platform = navigator.platform;
    if (platform.includes("Win")) return "Windows";
    if (platform.includes("Mac")) return "macOS";
    if (platform.includes("Linux")) return "Linux";
    if (platform.includes("Android")) return "Android";
    if (platform.includes("iOS")) return "iOS";
    return "Unknown OS";
  },
};

// 性能和资源信息
const memoryInfo = {
  usage: ref("0"),
  total: ref("0"),
  percent: ref("0"),
};
const cpuInfo = ref("0%"); // CPU使用率
const latency = ref("0.000s");

// 解析信息栏模板，替换变量为实际值
const parseInfoBarTemplate = (template, data) => {
  // 确保获取ref的实际值
  const getValue = (val) => {
    return typeof val === "object" && val !== null && "value" in val
      ? val.value
      : val;
  };

  // 替换所有可用变量
  let parsedTemplate = template;
  const variables = {
    "{user}": `<span style="color: ${
      uiStyles.value.infoBar.colors.username
    }">${getValue(data.user)}</span>`,
    "{dayOfWeek}": `<span style="color: ${
      uiStyles.value.infoBar.colors.dayOfWeek
    }">${getValue(data.dayOfWeek)}</span>`,
    "{time}": `<span style="color: ${
      uiStyles.value.infoBar.colors.commandTime
    }">${getValue(data.time)}</span>`,
    "{latency}": `<span style="color: ${
      uiStyles.value.infoBar.colors.latency
    }">${getValue(data.latency)}</span>`,
    "{cpu}": `<span style="color: ${
      uiStyles.value.infoBar.colors.cpu
    }">${getValue(data.cpu)}</span>`,
    "{mem}": `<span style="color: ${
      uiStyles.value.infoBar.colors.mem
    }">${getValue(data.mem)}</span>`,
    "{memUsage}": `<span style="color: ${
      uiStyles.value.infoBar.colors.mem
    }">${getValue(data.memUsage)}</span>`,
    "{memTotal}": `<span style="color: ${
      uiStyles.value.infoBar.colors.mem
    }">${getValue(data.memTotal)}</span>`,
  };

  // 替换模板中的所有变量
  for (const [key, value] of Object.entries(variables)) {
    parsedTemplate = parsedTemplate.replace(new RegExp(key, "g"), value);
  }

  return parsedTemplate;
};

// UI 相关状态
const fontSize = ref(defaultConfig.ui.fontSize); // 字体大小，从配置文件读取
const font = {
  family: ref(defaultConfig.ui.fontFamily || "Cascadia Code"), // 字体，从配置文件读取，默认为Cascadia Code
};
const background = {
  image: ref(defaultConfig.background.image), // 背景图片路径，从配置文件读取
  opacity: ref(parseFloat(defaultConfig.background.opacity)), // 背景透明度，初始化为数字类型
};

// 先初始化主题配置
const themeConfig = ref({
  current: defaultConfig.theme.current,
  available: defaultConfig.theme.available,
  colors: defaultConfig.theme[defaultConfig.theme.current] || {
    prompt: "#3b82f6",
    directory: "#60a5fa",
    file: "#fbbf24",
  },
});

// 样式配置统一管理
const uiStyles = ref({
  // 信息栏配置
  infoBar: {
    backgroundColor:
      defaultConfig.ui?.infoBar?.backgroundColor || "transparent",
    textColor: defaultConfig.ui?.infoBar?.textColor || "#e2e8f0",
    borderColor: defaultConfig.ui?.infoBar?.borderColor || "transparent",
    height: defaultConfig.ui?.infoBar?.height || "24px",
    padding: defaultConfig.ui?.infoBar?.padding || "0 10px",
    leftTemplate:
      defaultConfig.ui?.infoBar?.leftTemplate ||
      "{user} on {dayOfWeek} at {time}",
    rightTemplate:
      defaultConfig.ui?.infoBar?.rightTemplate ||
      "{latency}  MEM: {mem}% ({memUsage}/{memTotal}GB)",
    colors: {
      username: defaultConfig.ui?.infoBar?.colors?.username || "#ffbebc",
      dayOfWeek: defaultConfig.ui?.infoBar?.colors?.dayOfWeek || "#bc93ff",
      commandTime: defaultConfig.ui?.infoBar?.colors?.commandTime || "#bc93ff",
      latency: defaultConfig.ui?.infoBar?.colors?.latency || "#a9ffb4",
      cpu: defaultConfig.ui?.infoBar?.colors?.cpu || "#ce9178",
      mem: defaultConfig.ui?.infoBar?.colors?.mem || "#a9ffb4",
    },
  },
  // 命令行样式 - 从配置读取
  commandLine: {
    // 文本格式选项
    boldPrompt: defaultConfig.ui?.commandLine?.boldPrompt || false,
    italicPrompt: defaultConfig.ui?.commandLine?.italicPrompt || false,
    underlinePrompt: defaultConfig.ui?.commandLine?.underlinePrompt || false,
    // 基本样式
    prompt: defaultConfig.ui?.commandLine?.colors?.prompt || "#3b82f6",
    promptSymbol: defaultConfig.ui?.commandLine?.promptSymbol || "$",
    promptSymbolColor:
      defaultConfig.ui?.commandLine?.promptSymbolColor || "#ec4899",
    directory: defaultConfig.ui?.commandLine?.colors?.directory || "#60a5fa",
    file: defaultConfig.ui?.commandLine?.colors?.file || "#fbbf24",
    command: defaultConfig.ui?.commandLine?.colors?.command || "#ffffff",
    // 状态颜色
    error: defaultConfig.ui?.commandLine?.colors?.error || "#ff0000",
    success: defaultConfig.ui?.commandLine?.colors?.success || "#00ff00",
    warning: defaultConfig.ui?.commandLine?.colors?.warning || "#ffff00",
    info: defaultConfig.ui?.commandLine?.colors?.info || "#00ffff",
    // 输出格式配色
    output: {
      dirItem: defaultConfig.ui?.commandLine?.output?.dirItem || "#60a5fa",
      fileItem: defaultConfig.ui?.commandLine?.output?.fileItem || "#fbbf24",
      error: defaultConfig.ui?.commandLine?.output?.error || "#ff0000",
      help: defaultConfig.ui?.commandLine?.output?.help || "#a9ffb4",
      listItem: defaultConfig.ui?.commandLine?.output?.listItem || "#ffffff",
      treeLine: defaultConfig.ui?.commandLine?.output?.treeLine || "#6b7280",
    },
  },
  // 主题配置
  theme: themeConfig.value,
});

// 主题相关状态（保留原有接口，确保兼容性）
const theme = {
  current: computed(() => uiStyles.value.theme.current),
  available: computed(() => uiStyles.value.theme.available),
  colors: computed(() => uiStyles.value.theme.colors),
};

// 信息栏配色状态（保留原有接口，确保兼容性）
const infoBarColors = computed(() => uiStyles.value.infoBar);

// 监听主题变化，更新命令行样式和所有已渲染的文档内容
watch(
  () => theme.current.value,
  (newTheme) => {
    // 主题变化时，从配置中获取对应主题的样式
    const themeColors = config.value.theme[newTheme] || {
      prompt: uiStyles.value.commandLine.prompt || "#3b82f6",
      directory: uiStyles.value.commandLine.directory || "#60a5fa",
      file: uiStyles.value.commandLine.file || "#fbbf24",
      command: uiStyles.value.commandLine.command || "#ffffff",
    };

    // 更新命令行样式，优先使用配置文件中的命令行样式，主题样式作为备选
    uiStyles.value.commandLine = {
      ...uiStyles.value.commandLine,
      // 只在配置文件中没有明确设置时才使用主题颜色
      prompt:
        config.value.ui?.commandLine?.colors?.prompt || themeColors.prompt,
      directory:
        config.value.ui?.commandLine?.colors?.directory ||
        themeColors.directory,
      file: config.value.ui?.commandLine?.colors?.file || themeColors.file,
      command:
        config.value.ui?.commandLine?.colors?.command || themeColors.command,
    };

    // 更新所有已渲染的文档内容的主题
    conversations.value.forEach((conversation) => {
      conversation.output.forEach((outputItem) => {
        if (outputItem.type === "glow") {
          outputItem.theme = newTheme;
        }
      });
    });
  }
);

// 监听命令输入变化，当用户删除文件名时清除补全状态
watch(
  () => command.value,
  (newValue, oldValue) => {
    // 只有当补全列表显示时才需要检查
    if (tabCompleteState.value.showAll) {
      const newParts = newValue.split(" ");
      const oldParts = oldValue.split(" ");

      // 检查命令是否相同
      if (newParts[0] !== oldParts[0]) {
        // 命令改变了，清除补全状态
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

      // 检查参数是否发生了变化（不只是补全项的切换）
      if (newParts.length <= 2 && oldParts.length <= 2) {
        const newArg = newParts[1] || "";
        const oldArg = oldParts[1] || "";

        // 获取当前命令的所有补全项
        const allItems = getCompletionItems(newParts[0], currentDir.value, "");
        // 过滤匹配原始前缀的项
        const matchingItems = tabCompleteState.value.originalArg
          ? allItems.filter((item) =>
              item.startsWith(tabCompleteState.value.originalArg)
            )
          : allItems;

        // 如果当前参数为空，或者不是任何匹配项的前缀，清除补全状态
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
        // 命令参数数量改变了，清除补全状态
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

// 命令执行相关
const isCommandExecuting = ref(false); // 跟踪命令是否正在执行

// 历史命令相关
const history = {
  commands: ref([]), // 存储历史命令的数组
  index: ref(-1), // 当前历史命令索引，-1表示当前输入
  temp: ref(""), // 临时存储当前输入，用于历史命令切换
};

// 加载历史命令从localStorage
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

// 保存历史命令到localStorage
const saveHistory = () => {
  // 限制历史命令数量为20条
  const limitedHistory = history.commands.value.slice(-20);
  localStorage.setItem("terminalHistory", JSON.stringify(limitedHistory));
};

// 清除历史命令
const clearHistory = () => {
  history.commands.value = [];
  localStorage.removeItem("terminalHistory");
};

// 更新内存信息
const updateMemoryInfo = () => {
  // 只使用performance.memory API获取当前网页的堆内存占用
  if (performance && performance.memory) {
    const memInfo = performance.memory;
    const used = Math.round(memInfo.usedJSHeapSize / 1024 / 1024); // MB
    const total = Math.round(memInfo.totalJSHeapSize / 1024 / 1024); // MB
    const percent = Math.round((used / total) * 100);

    memoryInfo.usage.value = used.toString();
    memoryInfo.total.value = total.toString();
    memoryInfo.percent.value = percent.toString();
  }
};

// 简单的CPU使用率估算（使用requestAnimationFrame时间差）
let lastTimestamp = 0;
let cpuUsage = 0;
let frameCount = 0;

const updateCpuInfo = () => {
  const now = performance.now();
  if (lastTimestamp > 0) {
    const frameTime = now - lastTimestamp;
    // 假设60fps的理想帧时间是16.67ms
    const idealFrameTime = 16.67;
    // 计算CPU使用率（实际使用时间/理想时间，上限100%）
    cpuUsage = Math.min(100, Math.round((frameTime / idealFrameTime) * 100));
    cpuInfo.value = `${cpuUsage}%`;
  }
  lastTimestamp = now;
  frameCount++;

  // 每10帧更新一次CPU显示，避免过于频繁更新
  if (frameCount % 10 === 0) {
    requestAnimationFrame(updateCpuInfo);
  } else {
    requestAnimationFrame(updateCpuInfo);
  }
};

// 当前正在执行的对话引用
let currentConversation = null;

// 更新时间
const updateTime = () => {
  const now = new Date();
  currentTime.value = now.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    hourCycle: "h12",
  });

  // 更新星期几缓存
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

// 配置状态管理
const config = ref({
  app: { user: "Alan" },
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
});

// 从JSON文件加载文章数据
const articles = {
  "/": {
    type: "dir",
    content: postsData.posts,
  },
};

// 递归构建所有目录的articles对象
function buildArticles(dirPath, content) {
  content.forEach((item) => {
    if (item.type === "dir" && item.content) {
      const fullPath =
        dirPath === "/" ? `/${item.name}` : `${dirPath}/${item.name}`;
      articles[fullPath] = {
        type: "dir",
        content: item.content,
      };
      // 递归构建子目录
      buildArticles(fullPath, item.content);
    }
  });
}

// 构建所有目录
buildArticles("/", postsData.posts);

// 从posts.json中获取文章信息的辅助函数
const getArticleInfo = (fileName) => {
  // 首先在当前目录查找
  const currentContent = articles[currentDir.value];
  if (currentContent && currentContent.type === "dir") {
    // 在当前目录查找
    const currentFile = currentContent.content.find(
      (item) => item.type === "file" && item.name === fileName
    );
    if (currentFile) {
      return currentFile;
    }
  }

  // 如果当前目录没有找到，再递归查找整个postsData.posts
  // 递归查找文章
  function findArticle(content) {
    for (const item of content) {
      if (item.type === "file" && item.name === fileName) {
        return item;
      }
      if (item.type === "dir" && item.content) {
        const found = findArticle(item.content);
        if (found) {
          return found;
        }
      }
    }
    return null;
  }

  return findArticle(postsData.posts);
};

// 检查补全项是否为目录
const isDir = (itemName) => {
  const currentContent = articles[currentDir.value];
  if (currentContent && currentContent.type === "dir") {
    return currentContent.content.some(
      (item) => item.name === itemName && item.type === "dir"
    );
  }
  return false;
};

// 执行命令
const executeCommand = async () => {
  if (!command.value.trim()) return;

  // 设置命令正在执行状态，隐藏输入行
  isCommandExecuting.value = true;

  const cmd = command.value.trim();

  // 添加到历史命令数组（去重，避免连续重复命令）
  if (history.commands.value[history.commands.value.length - 1] !== cmd) {
    history.commands.value.push(cmd);
    saveHistory(); // 保存历史命令到localStorage
  }
  // 重置历史索引
  history.index.value = -1;
  history.temp.value = "";

  // 重置补全状态
  tabCompleteState.value = {
    currentCmd: "",
    currentArg: "",
    originalArg: "",
    items: [],
    index: -1,
    showAll: false,
    firstTab: true,
  };

  // 保存命令执行时的时间和目录
  const commandTime = currentTime.value;
  const commandDir = currentDir.value;

  // 创建新的对话对象
  const newConversation = {
    id: Date.now(),
    command: {
      content: cmd,
      time: commandTime,
      dir: commandDir,
    },
    output: [],
  };

  // 添加到对话数组
  conversations.value.push(newConversation);
  // 设置当前对话引用
  currentConversation = newConversation;

  const args = cmd.split(" ");
  const cmdName = args[0];
  const cmdArgs = args.slice(1);

  // 执行命令，确保所有命令执行完毕后才显示新的输入行
  try {
    // 统一化命令执行
    if (commands[cmdName]) {
      // 创建命令上下文对象，包含所有可能需要的参数
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
        clearHistory, // 添加清除历史命令的函数
        updateTomlConfig, // 添加TOML配置更新函数
        reloadConfig: loadConfig, // 添加重新加载配置函数
      };

      // 获取命令处理函数
      const commandHandler = commands[cmdName];

      // 执行命令，直接将context对象和命令参数传递给命令处理函数
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
    // 命令执行完毕后清空命令输入框
    command.value = "";
    // 设置命令执行完毕状态，显示输入行
    isCommandExecuting.value = false;
    // 等待DOM更新后执行滚动和聚焦
    await nextTick();
    // 滚动到底部，确保看到最新输出
    await scrollToBottom();
    // 聚焦到输入框
    focusInput();
  }
};

// 获取目录图标
const getDirIcon = () => {
  return "";
};

// 获取星期几
const getDayOfWeek = () => {
  return currentDayOfWeek.value;
};

// 移除重复的getBrowserType和getOsType函数，直接使用browserInfo对象中的方法
// 移除未使用的getBatteryStatus函数

// 聚焦到输入框
const focusInput = () => {
  if (inputRef.value) {
    inputRef.value.focus();
  }
};

// 处理上下键切换历史命令
const handleHistory = (direction) => {
  if (history.commands.value.length === 0) return;

  // 当第一次按上键时，保存当前输入
  if (history.index.value === -1) {
    history.temp.value = command.value;
  }

  if (direction === "up") {
    // 向上切换，索引增加
    if (history.index.value < history.commands.value.length - 1) {
      history.index.value++;
      command.value =
        history.commands.value[
          history.commands.value.length - 1 - history.index.value
        ];
    }
  } else if (direction === "down") {
    // 向下切换，索引减少
    if (history.index.value > 0) {
      history.index.value--;
      command.value =
        history.commands.value[
          history.commands.value.length - 1 - history.index.value
        ];
    } else if (history.index.value === 0) {
      // 回到初始状态，恢复临时保存的命令
      history.index.value = -1;
      command.value = history.temp.value;
    }
  }

  // 聚焦到输入框并将光标移动到末尾
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

// 通用补全函数
const handleGenericCompletion = (currentCmd, currentArg, allItems) => {
  // 如果没有匹配项，直接返回
  if (allItems.length === 0) {
    return;
  }

  // 检查是否是连续的Tab键按下
  const isSameCommand = tabCompleteState.value.currentCmd === currentCmd;
  const isInSameCompletion = tabCompleteState.value.showAll;

  // 确定使用哪个前缀来过滤匹配项
  const prefixToUse = isInSameCompletion
    ? tabCompleteState.value.originalArg
    : currentArg;

  // 过滤匹配前缀的项
  const matchingItems = prefixToUse
    ? allItems.filter((item) => item.startsWith(prefixToUse))
    : allItems;

  if (matchingItems.length === 0) {
    return;
  }

  // 检查状态是否匹配当前命令和参数
  if (!isSameCommand || !isInSameCompletion) {
    // 重置状态
    tabCompleteState.value = {
      currentCmd: currentCmd,
      currentArg: currentArg,
      originalArg: currentArg, // 保存原始前缀
      items: matchingItems,
      index: -1,
      showAll: false,
      firstTab: true,
    };
  }

  // 第一次按Tab键，显示所有补全选项
  if (tabCompleteState.value.firstTab) {
    tabCompleteState.value.showAll = true;
    tabCompleteState.value.firstTab = false;
    tabCompleteState.value.index = 0;

    // 应用第一个补全项
    command.value = `${currentCmd} ${matchingItems[0]}`;
  }
  // 后续按Tab键，循环补全
  else {
    // 计算下一个索引
    tabCompleteState.value.index =
      (tabCompleteState.value.index + 1) % matchingItems.length;

    // 应用补全
    command.value = `${currentCmd} ${
      matchingItems[tabCompleteState.value.index]
    }`;
  }
};

// Tab键补全功能 - 实现按顺序循环补全
const handleTabComplete = () => {
  const cmd = command.value;
  const parts = cmd.split(" ");

  // 处理命令补全（只补全命令，不补全文件夹）
  if (parts.length === 1) {
    const cmdPrefix = parts[0];
    const basicCommands = ["ls", "cd", "cat"];

    // 当输入框为空或只有ls、cd、cat之一时，循环切换这三个基础命令
    if (cmdPrefix === "" || basicCommands.includes(cmdPrefix)) {
      // 查找当前命令在列表中的位置
      let currentIndex = basicCommands.indexOf(command.value);

      // 如果当前命令不在列表中（比如输入框为空），从第一个开始；否则循环到下一个
      let nextIndex =
        currentIndex === -1 ? 0 : (currentIndex + 1) % basicCommands.length;

      // 应用补全
      command.value = basicCommands[nextIndex];
      return;
    }

    // 从命令对象中获取所有命令名称
    const commandNames = Object.keys(commands).sort();

    // 过滤匹配前缀的命令
    let matchingCommands = commandNames.filter((cmdName) =>
      cmdName.startsWith(cmdPrefix)
    );

    if (matchingCommands.length === 0) return;

    // 查找当前命令在匹配列表中的位置
    let currentIndex = matchingCommands.indexOf(cmdPrefix);

    // 如果当前命令不在列表中，从第一个开始；否则循环到下一个
    let nextIndex =
      currentIndex === -1 ? 0 : (currentIndex + 1) % matchingCommands.length;

    // 应用补全
    command.value = matchingCommands[nextIndex];
    return;
  }

  // 处理cd、cat、wget、ls命令的参数补全
  if (
    (parts[0] === "cd" ||
      parts[0] === "cat" ||
      parts[0] === "wget" ||
      parts[0] === "ls") &&
    parts.length <= 2
  ) {
    // 获取当前命令和参数
    const currentCmd = parts[0];
    const currentArg = parts.length === 2 ? parts[1] : "";

    // 获取当前目录下的所有可能补全项
    const allItems = getCompletionItems(currentCmd, currentDir.value, "");

    // 直接使用通用补全函数处理补全
    handleGenericCompletion(currentCmd, currentArg, allItems);
  } else if (parts[0] === "theme" && parts.length <= 2) {
    // 处理theme命令的参数补全
    // 获取所有可用主题作为候选项
    const allThemes = theme.available.value;
    const currentCmd = parts[0];
    const currentArg = parts.length === 2 ? parts[1] : "";

    // 使用通用补全函数
    handleGenericCompletion(currentCmd, currentArg, allThemes);
  } else if (parts[0] === "background" && parts.length <= 2) {
    // 处理background命令的参数补全
    const currentCmd = parts[0];
    const currentArg = parts.length === 2 ? parts[1] : "";

    // background命令的子命令列表
    const backgroundSubcommands = ["opacity", "image"];

    // 使用通用补全函数进行子命令补全
    handleGenericCompletion(currentCmd, currentArg, backgroundSubcommands);
  } else if (parts[0] === "font" && parts.length <= 2) {
    // 处理font命令的参数补全
    const currentCmd = parts[0];
    const currentArg = parts.length === 2 ? parts[1] : "";

    // font命令的可用字体列表，包括default选项
    const availableFonts = [
      "0xProto Nerd Font",
      "Fira Code",
      "Cascadia Code",
      "JetBrains Mono",
      "default",
    ];

    // 使用通用补全函数进行字体补全
    handleGenericCompletion(currentCmd, currentArg, availableFonts);
  } else if (parts[0] === "vi" && parts.length <= 2) {
    // 处理vi命令的参数补全
    const currentCmd = parts[0];
    const currentArg = parts.length === 2 ? parts[1] : "";

    // 获取当前目录下的所有文件
    const allItems = getCompletionItems(currentCmd, currentDir.value, "");

    // 过滤出.md文件
    const mdItems = allItems.filter((item) => item.endsWith(".md"));

    // 创建vi命令的补全列表，包括.md文件和config.toml
    let viItems = [...mdItems];

    // 检查config.toml是否已经在列表中，如果不在则添加
    if (!viItems.includes("config.toml")) {
      viItems.push("config.toml");
    }

    // 过滤匹配当前参数前缀的项
    const matchingItems = currentArg
      ? viItems.filter((item) => item.startsWith(currentArg))
      : viItems;

    // 使用通用补全函数进行补全
    handleGenericCompletion(currentCmd, currentArg, matchingItems);
  }
};

// 滚动到底部 - 改为异步函数，确保等待DOM更新
const scrollToBottom = async () => {
  // 使用Vue.nextTick确保DOM更新后执行滚动
  await nextTick();
  const terminal = document.querySelector(".terminal");
  if (terminal) {
    terminal.scrollTop = terminal.scrollHeight;
  }
};

// 检测是否为移动设备的辅助函数
const detectMobile = () => {
  return (
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    ) || window.innerWidth <= 768
  );
};

// 页面加载时自动执行命令
onMounted(async () => {
  updateTime();
  const timeInterval = setInterval(updateTime, 60000);

  // 启动CPU使用率更新循环
  requestAnimationFrame(updateCpuInfo);

  // 检测设备类型
  isMobile.value = detectMobile();

  // 监听窗口大小变化，动态更新设备类型
  const handleResize = () => {
    isMobile.value = detectMobile();
  };
  window.addEventListener("resize", handleResize);

  // 注册onUnmounted钩子在await之前
  onUnmounted(() => {
    clearInterval(timeInterval);
    window.removeEventListener("resize", handleResize);
  });

  // 加载历史命令
  loadHistory();

  // 初始化应用配置（先加载config.toml，再加载localStorage设置）
  await initApp();

  // 封装自动执行命令的函数
  const autoExecuteCommands = async (commandsStr) => {
    // 将命令字符串按|分割成命令数组
    const commandsList = commandsStr.split("|");

    // 遍历命令数组，依次执行每个命令
    for (const cmdStr of commandsList) {
      const cmd = cmdStr.trim();
      if (!cmd) continue;

      // 解析命令和参数
      const args = cmd.split(" ");
      const cmdName = args[0];
      const cmdArgs = args.slice(1);

      // 创建新的对话对象
      const newConversation = {
        id: Date.now() + Math.random(),
        command: {
          content: cmd,
          time: currentTime.value,
          dir: currentDir.value,
        },
        output: [],
      };

      // 添加到对话数组
      conversations.value.push(newConversation);
      // 设置当前对话引用
      currentConversation = newConversation;

      try {
        // 执行命令
        if (commands[cmdName]) {
          // 创建命令上下文对象
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

          // 执行命令
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

      // 等待DOM更新后滚动到底部
      await scrollToBottom();
      await nextTick();
    }
  };

  // 检查是否有terminalHistory，如果没有则自动执行命令
  if (history.commands.value.length === 0) {
    // 自动执行命令
    await autoExecuteCommands("cat Readme.md|tree");
  }
});
</script>

<style scoped>
/* 组件样式已在 style.css 中定义 */
</style>
