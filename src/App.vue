<template>
  <div
    id="app"
    @click="focusInput"
    :style="{
      backgroundImage: `url(${background.image})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      backgroundAttachment: 'fixed',
    }"
  >
    <div
      class="terminal"
      :class="`font-size-${fontSize}`"
      :style="{
        background: `rgba(0, 0, 0, ${background.opacity})`,
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
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
            <div class="info-header">Welcome to My Terminal Blog</div>
            <div class="info-item">󰍹 OS {{ browserInfo.getOsType() }}</div>
            <div class="info-item">
              🌐 Browser {{ browserInfo.getBrowserType() }}
            </div>
            <div class="info-item">
              📝 Type 'ls' to see categories, 'cat file.md' to read articles,
              'tree' to see directory structure
            </div>
            <div class="info-item">💡 Type 'help' for available commands</div>
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
              <span class="user-info">
                <span
                  class="username"
                  :style="{ color: infoBarColors.username }"
                  >{{ user }}</span
                >
                <span class="user-info-separator"> on </span>
                <span
                  class="day-of-week"
                  :style="{ color: infoBarColors.dayOfWeek }"
                  >{{ getDayOfWeek() }}</span
                >
                <span class="user-info-separator"> at </span>
                <span
                  class="command-time"
                  :style="{ color: infoBarColors.commandTime }"
                  >{{ conversation.command.time }}</span
                >
              </span>
              <span class="latency-mem-info">
                <span
                  class="latency"
                  :style="{ color: infoBarColors.latency }"
                  >{{ latency }}</span
                >
                <span class="mem-label">  MEM:</span>
                <span class="mem-value" :style="{ color: infoBarColors.mem }">
                  {{ memoryInfo.percent }}% ({{ memoryInfo.usage }}/{{
                    memoryInfo.total
                  }}GB)</span
                >
              </span>
            </div>
            <div class="prompt-line">
              <span class="prompt" :style="{ color: theme.colors.prompt }"
                >{{ getDirIcon() }}
                {{
                  conversation.command.dir === "/"
                    ? "~"
                    : conversation.command.dir
                }}</span
              >
              <span class="prompt-symbol" :style="{ color: '#ec4899' }">$</span>
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
              >
                <span
                  v-if="item.type === 'dir'"
                  class="dir-item"
                  :style="{ color: theme.colors.directory }"
                  >{{ item.icon }} {{ item.name }}</span
                >
                <span
                  v-else-if="item.type === 'file'"
                  class="file-item"
                  :style="{ color: theme.colors.file }"
                  >{{ item.icon }} {{ item.name }}</span
                >
              </div>
            </div>
            <div
              v-else-if="outputItem.type === 'glow'"
              class="glow-content"
              :class="`theme-${outputItem.theme}`"
            >
              <div class="glow-title">{{ outputItem.content.title }}</div>
              <div class="glow-meta">
                {{ outputItem.content.date }} |
                {{ outputItem.content.category }}
              </div>
              <div class="glow-body" v-html="outputItem.content.content"></div>
            </div>
            <div v-else>{{ outputItem.content }}</div>
          </div>
        </div>
        <!-- 当前输入行 - 仅在命令执行完毕后显示 -->
        <div v-if="!isCommandExecuting" class="input-line">
          <div class="prompt-header">
            <span class="user-info">
              <span
                class="username"
                :style="{ color: infoBarColors.username }"
                >{{ user }}</span
              >
              <span class="user-info-separator"> on </span>
              <span
                class="day-of-week"
                :style="{ color: infoBarColors.dayOfWeek }"
                >{{ getDayOfWeek() }}</span
              >
              <span class="user-info-separator"> at </span>
              <span
                class="command-time"
                :style="{ color: infoBarColors.commandTime }"
                >{{ currentTime }}</span
              >
            </span>
            <span class="latency-mem-info">
              <span class="latency" :style="{ color: infoBarColors.latency }">{{
                latency
              }}</span>
              <span class="mem-label">  MEM:</span>
              <span class="mem-value" :style="{ color: infoBarColors.mem }">
                {{ memoryInfo.percent }}% ({{ memoryInfo.usage }}/{{
                  memoryInfo.total
                }}GB)</span
              >
            </span>
          </div>
          <div class="prompt-line">
            <span class="prompt" :style="{ color: theme.colors.prompt }"
              >{{ getDirIcon() }}
              {{ currentDir === "/" ? "~" : currentDir }}</span
            >
            <span class="prompt-symbol" :style="{ color: '#ec4899' }">$</span>
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
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick, watch } from "vue";
import { marked } from "marked";
import postsData from "../posts.json";
import { parse } from "@iarna/toml";

// 从命令模块导入命令映射
import commands from "./commands"; // 优雅的默认导入

// 读取配置文件
let config = {
  app: { user: "Alan" },
  ui: { fontSize: "16" },
  background: { image: "/background.jpg", opacity: "0.9" },
  theme: {
    current: "default",
    available: ["default", "dark", "light", "solarized", "dracula"],
  },
};

// 在浏览器环境中使用fetch读取配置文件
const loadConfig = async () => {
  try {
    const response = await fetch("/config.toml");
    if (response.ok) {
      const configContent = await response.text();
      config = parse(configContent);
      // 更新状态值
      user.value = config.app.user;
      fontSize.value = config.ui.fontSize;
      background.image.value = config.background.image;
      background.opacity.value = config.background.opacity;
      theme.current.value = config.theme.current;
      theme.available.value = config.theme.available;

      // 更新信息栏配色
      infoBarColors.value = {
        username: config.ui?.infoBar?.colors?.username || "#ffbebc",
        dayOfWeek: config.ui?.infoBar?.colors?.dayOfWeek || "#bc93ff",
        commandTime: config.ui?.infoBar?.colors?.commandTime || "#bc93ff",
        latency: config.ui?.infoBar?.colors?.latency || "#a9ffb4",
        mem: config.ui?.infoBar?.colors?.mem || "#a9ffb4",
      };

      // 更新主题配色
      theme.colors.value = config.theme[config.theme.current] || {};
    }
  } catch (error) {
    console.warn(
      `Failed to load config.toml: ${error.message}. Using default configuration.`
    );
  }
};

// 调用加载配置函数
loadConfig();

// 状态管理 - 按功能分组
const conversations = ref([]); // 对话数组，每个元素包含命令和输出
const command = ref("");
const inputRef = ref(null);
const currentDir = ref("/");
const showWelcome = ref(true);
const isMobile = ref(false); // 检测是否为移动设备

// Tab补全状态管理
const tabCompleteState = ref({
  currentCmd: "", // 当前命令
  currentArg: "", // 当前参数
  items: [], // 补全列表
  index: -1, // 当前补全索引
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
const user = ref(config.app.user);
const currentTime = ref("");
const batteryStatus = ref("95%");
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
const latency = ref("0.000s");
const startTime = ref(new Date());

// UI 相关状态
const fontSize = ref(config.ui.fontSize); // 字体大小，从配置文件读取
const background = {
  image: ref(config.background.image), // 背景图片路径，从配置文件读取
  opacity: ref(config.background.opacity), // 背景透明度，从配置文件读取
};

// 信息栏配色状态
const infoBarColors = ref({
  username: config.ui?.infoBar?.colors?.username || "#ffbebc",
  dayOfWeek: config.ui?.infoBar?.colors?.dayOfWeek || "#bc93ff",
  commandTime: config.ui?.infoBar?.colors?.commandTime || "#bc93ff",
  latency: config.ui?.infoBar?.colors?.latency || "#a9ffb4",
  mem: config.ui?.infoBar?.colors?.mem || "#a9ffb4",
});

// 主题相关状态
const theme = {
  current: ref(config.theme.current), // 当前主题，从配置文件读取
  available: ref(config.theme.available), // 可用主题列表，从配置文件读取
  colors: ref(config.theme[config.theme.current] || {}), // 当前主题配色
};

// 命令执行相关
const isCommandExecuting = ref(false); // 跟踪命令是否正在执行

// 历史命令相关
const history = {
  commands: ref([]), // 存储历史命令的数组
  index: ref(-1), // 当前历史命令索引，-1表示当前输入
  temp: ref(""), // 临时存储当前输入，用于历史命令切换
};

// 更新延迟时间
const updateLatency = () => {
  const now = new Date();
  const diff = now - startTime.value;
  const seconds = (diff / 1000).toFixed(3);
  latency.value = `${seconds}s`;
};

// 更新内存信息
const updateMemoryInfo = () => {
  // 只使用performance.memory API获取当前网页的堆内存占用
  if (performance && performance.memory) {
    console.log(performance.memory);
    const memInfo = performance.memory;
    const used = Math.round(memInfo.usedJSHeapSize / 1024 / 1024); // MB
    const total = Math.round(memInfo.totalJSHeapSize / 1024 / 1024); // MB
    const percent = Math.round((used / total) * 100);

    memoryInfo.usage.value = used.toString();
    memoryInfo.total.value = total.toString();
    memoryInfo.percent.value = percent.toString();
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
  updateLatency();
  updateMemoryInfo();
};

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

// 执行命令
const executeCommand = async () => {
  if (!command.value.trim()) return;

  // 设置命令正在执行状态，隐藏输入行
  isCommandExecuting.value = true;

  const cmd = command.value.trim();

  // 添加到历史命令数组（去重，避免连续重复命令）
  if (history.commands.value[history.commands.value.length - 1] !== cmd) {
    history.commands.value.push(cmd);
  }
  // 重置历史索引
  history.index.value = -1;
  history.temp.value = "";

  // 重置补全状态
  tabCompleteState.value = {
    currentCmd: "",
    currentArg: "",
    items: [],
    index: -1,
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
        background,
        theme,
        infoBarColors,
        conversations,
        showWelcome,
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
  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const now = new Date();
  return days[now.getDay()];
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

// Tab键补全功能 - 实现按顺序循环补全
const handleTabComplete = () => {
  const cmd = command.value;
  const parts = cmd.split(" ");

  // 处理命令补全（只补全命令，不补全文件夹）
  if (parts.length === 1) {
    const cmdPrefix = parts[0];
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

    // 如果没有匹配项，直接返回
    if (allItems.length === 0) {
      return;
    }

    // 情况1：没有输入参数，直接按顺序循环补全
    if (!currentArg) {
      // 重置补全状态，开始新的顺序循环
      tabCompleteState.value = {
        currentCmd: currentCmd,
        currentArg: "",
        items: allItems,
        index: -1,
      };

      // 计算下一个索引并应用补全
      tabCompleteState.value.index =
        (tabCompleteState.value.index + 1) % allItems.length;
      command.value = `${currentCmd} ${allItems[tabCompleteState.value.index]}`;
      return;
    }

    // 情况2：有输入参数，判断是前缀匹配还是顺序循环
    // 检查当前参数是否是之前补全列表中的完整项
    const isSequentialMode =
      tabCompleteState.value.currentCmd === currentCmd &&
      tabCompleteState.value.items.includes(currentArg);

    if (isSequentialMode) {
      // 继续顺序循环补全
      // 确保补全列表是最新的
      if (
        tabCompleteState.value.items.length !== allItems.length ||
        !tabCompleteState.value.items.every(
          (item, index) => item === allItems[index]
        )
      ) {
        // 补全列表已变化，重置状态
        tabCompleteState.value.items = allItems;
        tabCompleteState.value.index = -1;
      }

      // 计算当前参数在列表中的位置
      const currentItemIndex = tabCompleteState.value.items.indexOf(currentArg);
      if (currentItemIndex !== -1) {
        // 设置当前索引为找到的位置，下一次循环会从下一个开始
        tabCompleteState.value.index = currentItemIndex;
      }

      // 计算下一个索引并应用补全
      tabCompleteState.value.index =
        (tabCompleteState.value.index + 1) %
        tabCompleteState.value.items.length;
      command.value = `${currentCmd} ${
        tabCompleteState.value.items[tabCompleteState.value.index]
      }`;
    } else {
      // 前缀匹配模式
      // 过滤匹配前缀的项
      const matchingItems = allItems.filter((item) =>
        item.startsWith(currentArg)
      );

      if (matchingItems.length > 0) {
        // 重置补全状态，开始新的前缀匹配循环
        tabCompleteState.value = {
          currentCmd: currentCmd,
          currentArg: currentArg,
          items: matchingItems,
          index: -1,
        };

        // 计算下一个索引并应用补全
        tabCompleteState.value.index =
          (tabCompleteState.value.index + 1) % matchingItems.length;
        command.value = `${currentCmd} ${
          matchingItems[tabCompleteState.value.index]
        }`;
      }
    }
  } else if (parts[0] === "theme" && parts.length <= 2) {
    // 处理theme命令的参数补全
    // 获取所有可用主题作为候选项
    const allThemes = theme.available.value;

    // 如果没有匹配项，直接返回
    if (allThemes.length === 0) {
      return;
    }

    // 获取当前命令和参数
    const currentCmd = parts[0];
    const currentArg = parts.length === 2 ? parts[1] : "";

    // 情况1：有输入前缀，按前缀补全
    if (currentArg) {
      // 过滤匹配前缀的主题
      const matchingThemes = allThemes.filter((theme) =>
        theme.startsWith(currentArg)
      );

      if (matchingThemes.length > 0) {
        // 检查状态是否匹配当前命令和参数
        if (
          tabCompleteState.value.currentCmd !== currentCmd ||
          !tabCompleteState.value.currentArg.startsWith(currentArg) ||
          tabCompleteState.value.items.length === 0
        ) {
          // 重置状态
          tabCompleteState.value.currentCmd = currentCmd;
          tabCompleteState.value.currentArg = currentArg;
          tabCompleteState.value.items = matchingThemes;
          tabCompleteState.value.index = -1;
        }

        // 计算下一个索引
        tabCompleteState.value.index =
          (tabCompleteState.value.index + 1) % matchingThemes.length;

        // 应用补全
        command.value = `${currentCmd} ${
          matchingThemes[tabCompleteState.value.index]
        }`;
      }
    }
    // 情况2：没有输入前缀，按顺序循环补全
    else {
      // 检查状态是否匹配当前命令
      if (
        tabCompleteState.value.currentCmd !== currentCmd ||
        tabCompleteState.value.items.length === 0
      ) {
        // 重置状态
        tabCompleteState.value.currentCmd = currentCmd;
        tabCompleteState.value.currentArg = currentArg;
        tabCompleteState.value.items = allThemes;
        tabCompleteState.value.index = -1;
      }

      // 计算下一个索引
      tabCompleteState.value.index =
        (tabCompleteState.value.index + 1) % allThemes.length;

      // 应用补全
      command.value = `${currentCmd} ${
        allThemes[tabCompleteState.value.index]
      }`;
    }
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

  // 检测设备类型
  isMobile.value = detectMobile();

  // 监听窗口大小变化，动态更新设备类型
  const handleResize = () => {
    isMobile.value = detectMobile();
  };
  window.addEventListener("resize", handleResize);

  // 直接显示命令，不隐藏欢迎界面
  updateTime();

  // 检查cookie，只有第一次进入网站时才自动执行命令
  const hasVisited = document.cookie.includes("hasVisited=true");
  if (!hasVisited) {
    // 设置cookie，有效期为1年
    document.cookie = "hasVisited=true; max-age=31536000; path=/";

    // 自动执行cat Readme.md命令
    const catConversation = {
      id: Date.now(),
      command: {
        content: "cat Readme.md",
        time: currentTime.value,
        dir: currentDir.value,
      },
      output: [],
    };
    conversations.value.push(catConversation);
    currentConversation = catConversation;
    await commands.cat(
      articles,
      currentDir.value,
      currentConversation,
      getArticleInfo,
      "Readme.md",
      theme.current
    );
    await scrollToBottom();

    // 自动执行tree命令
    await nextTick();
    const treeConversation = {
      id: Date.now() + 1,
      command: {
        content: "tree",
        time: currentTime.value,
        dir: currentDir.value,
      },
      output: [],
    };
    conversations.value.push(treeConversation);
    currentConversation = treeConversation;
    await commands.tree(
      articles,
      currentDir.value,
      currentConversation,
      getDirIcon
    );
    await scrollToBottom();
  }

  onUnmounted(() => {
    clearInterval(timeInterval);
    window.removeEventListener("resize", handleResize);
  });
});
</script>

<style scoped>
/* 组件样式已在 style.css 中定义 */
</style>
