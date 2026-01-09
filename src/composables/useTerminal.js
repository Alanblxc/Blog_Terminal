
import { ref, nextTick, watch, computed } from "vue";
import commands from "../commands";
import {
  getArticleInfo,
  getDirIcon,
  getCompletionItems,
  isDir,
  articles,
} from "./fileSystem";

export function useTerminal(configContext) {
  // 解构需要的配置方法和状态
  const {
    fontSize,
    font,
    background,
    theme,
    readTheme,
    uiStyles,
    infoBarColors,
    loadConfig,
    updateTomlConfig,
  } = configContext;

  const conversations = ref([]);
  const command = ref("");
  const inputRef = ref(null);
  const terminalRef = ref(null);
  const currentDir = ref("/");
  const isCommandExecuting = ref(false);
  const isWaitingForInput = ref(false); // 新增：是否正在等待交互式输入
  const showWelcome = ref(true);
  
  // 环境变量存储
  const env = ref({
    HOME: "/",
    USER: configContext.config?.value?.app?.user || "User",
    PATH: "/bin:/usr/bin",
    SHELL: "/bin/sh",
  });

  let inputResolver = null; // 新增：用于 resolve prompt 的 Promise

  // 历史记录
  const history = {
    commands: ref([]),
    index: ref(-1),
    temp: ref(""),
  };

  // 补全状态
  const tabCompleteState = ref({
    currentCmd: "",
    currentArg: "",
    originalArg: "",
    items: [],
    index: -1,
    showAll: false,
    firstTab: true,
  });

  // 加载历史
  const loadHistory = () => {
    const saved = localStorage.getItem("terminalHistory");
    if (saved) {
      try {
        history.commands.value = JSON.parse(saved);
      } catch (e) {}
    }
  };

  const saveHistory = () => {
    localStorage.setItem(
      "terminalHistory",
      JSON.stringify(history.commands.value.slice(-20))
    );
  };

  const clearHistory = () => {
    history.commands.value = [];
    localStorage.removeItem("terminalHistory");
  };

  // 滚动到底部
  const scrollToBottom = async () => {
    await nextTick();
    if (terminalRef.value) {
      terminalRef.value.scrollTop = terminalRef.value.scrollHeight;
    }
  };

  const focusInput = () => inputRef.value?.focus();

  // 执行命令
  const executeCommand = async () => {
    const cmdStr = command.value.trim();
    
    // 如果正在等待交互式输入
    if (isWaitingForInput.value && inputResolver) {
      const resolver = inputResolver;
      inputResolver = null;
      isWaitingForInput.value = false;
      
      // 将输入内容作为普通文本回显到输出
      const lastConv = conversations.value[conversations.value.length - 1];
      if (lastConv) {
        lastConv.output.push({ type: 'output', content: cmdStr });
      }
      
      command.value = "";
      resolver(cmdStr);
      return;
    }

    if (!cmdStr) return;

    isCommandExecuting.value = true;

    // 历史记录处理
    if (history.commands.value[history.commands.value.length - 1] !== cmdStr) {
      history.commands.value.push(cmdStr);
      saveHistory();
    }
    history.index.value = -1;
    history.temp.value = "";

    // 重置补全
    resetTabState();

    const newConv = {
      id: Date.now(),
      command: {
        content: cmdStr,
        time: new Date().toLocaleTimeString(), // 简化的时间
        dir: currentDir.value,
      },
      output: [],
    };
    conversations.value.push(newConv);

    const [cmdName, ...cmdArgs] = cmdStr.split(" ");

    try {
      if (commands[cmdName]) {
        // 构建上下文
        const context = {
          articles,
          currentDir: currentDir.value,
          currentDirRef: currentDir,
          conversation: newConv,
          getArticleInfo,
          getDirIcon,
          user: computed(() => configContext.config.value.app.user),
          fontSize,
          font,
          background,
          theme,
          readTheme,
          infoBarColors,
          uiStyles,
          conversations,
          showWelcome,
          clearHistory,
          updateTomlConfig,
          reloadConfig: loadConfig,
          scrollToBottom,
          env,
          waitForInput: () => {
            isWaitingForInput.value = true;
            return new Promise((resolve) => {
              inputResolver = resolve;
            });
          },
        };
        await commands[cmdName](context, ...cmdArgs);
      } else {
        newConv.output.push({
          type: "error",
          content: `Command not found: ${cmdName}`,
        });
      }
    } catch (e) {
      newConv.output.push({
        type: "error",
        content: `Error: ${e.message}`,
      });
    } finally {
      command.value = "";
      isCommandExecuting.value = false;
      await scrollToBottom();
      focusInput();
    }
  };

  // 历史导航
  const handleHistory = (dir) => {
    const cmds = history.commands.value;
    if (cmds.length === 0) return;

    if (history.index.value === -1) history.temp.value = command.value;

    if (dir === "up") {
      if (history.index.value < cmds.length - 1) {
        history.index.value++;
      }
    } else {
      if (history.index.value > -1) {
        history.index.value--;
      }
    }

    if (history.index.value === -1) {
      command.value = history.temp.value;
    } else {
      command.value = cmds[cmds.length - 1 - history.index.value];
    }

    // 光标移到最后
    nextTick(() => {
      if (inputRef.value)
        inputRef.value.setSelectionRange(
          command.value.length,
          command.value.length
        );
    });
  };

  const resetTabState = () => {
    tabCompleteState.value = {
      currentCmd: "",
      currentArg: "",
      originalArg: "",
      items: [],
      index: -1,
      showAll: false,
      firstTab: true,
    };
  };

  // 监听输入变化重置补全
  watch(command, (newVal, oldVal) => {
    if (!tabCompleteState.value.showAll) return;
    const newParts = newVal.split(" ");
    const oldParts = oldVal.split(" ");

    // 如果命令变了，或者参数的前缀不再匹配原始前缀
    if (
      newParts[0] !== oldParts[0] ||
      (newParts[1] &&
        !newParts[1].startsWith(tabCompleteState.value.originalArg))
    ) {
      resetTabState();
    }
  });

  // 补全导航
  const handleTabNavigate = (direction) => {
    if (!tabCompleteState.value.showAll || tabCompleteState.value.items.length === 0) return;
    
    const state = tabCompleteState.value;
    const len = state.items.length;
    
    if (direction === "next") { // Tab 或 Down
      state.index = (state.index + 1) % len;
    } else if (direction === "prev") { // Up
      state.index = (state.index - 1 + len) % len;
    }
    
    command.value = `${state.currentCmd} ${state.items[state.index]}`;
  };

  // --- 重构后的 Tab 补全 ---
  const handleTabComplete = (e) => {
    // 如果已经在补全模式，Tab 键只负责切换
    if (tabCompleteState.value.showAll) {
       handleTabNavigate("next");
       return;
    }
    const parts = command.value.split(" ");
    const cmdName = parts[0];
    const arg = parts.length > 1 ? parts[1] : "";

    // 1. 命令名补全 (输入为空，或只有一个部分)
    if (parts.length === 1) {
      // 定义默认补全命令列表
      const defaultCmds = ["ls", "cd", "cat"];

      // Case A: 没有任何输入，开始默认循环
      if (!cmdName) {
        command.value = defaultCmds[0]; // 这里不加空格，允许继续按Tab切换
        return;
      }

      // Case B: 输入了部分命令或正好是默认命令
      const isDefaultCmd = defaultCmds.includes(cmdName);
      if (isDefaultCmd) {
        // 如果是默认命令，循环切换到下一个默认命令
        const currentIndex = defaultCmds.indexOf(cmdName);
        const nextIndex = (currentIndex + 1) % defaultCmds.length;
        // 注意：这里也不加空格，这样可以持续循环 ls -> cd -> cat
        // 用户想用的时候，自己打空格进入参数补全
        command.value = defaultCmds[nextIndex];
      } else {
        // 否则补全所有匹配的命令
        const allCmds = Object.keys(commands).sort();
        const matches = allCmds.filter((c) => c.startsWith(cmdName));
        if (matches.length === 1) {
          command.value = matches[0] + " "; // 普通命令补全自动加空格
        } else if (matches.length > 1) {
          // 简单的循环补全逻辑
          const idx = matches.indexOf(cmdName);
          const next = matches[(idx + 1) % matches.length];
          if (next) command.value = next;
        }
      }
      return;
    }

    // 2. 参数补全 (调用 FileSystem 的通用逻辑)
    // 获取候选项
    const allCandidates = getCompletionItems(cmdName, currentDir.value, "");

    // 基于当前输入状态过滤
    const isSameCmd = tabCompleteState.value.currentCmd === cmdName;
    const prefix = tabCompleteState.value.showAll
      ? tabCompleteState.value.originalArg
      : arg;

    let matches = allCandidates.filter((item) => item.startsWith(prefix));

    // --- 修改点：针对 ls 和 cd 命令，只显示文件夹 ---
    // (逻辑已移至 getCompletionItems，此处无需重复过滤，除非需要覆盖默认逻辑)
    // -------------------------------------------

    if (matches.length === 0) return;

    // 如果是新的补全会话
    if (!isSameCmd || !tabCompleteState.value.showAll) {
      tabCompleteState.value = {
        currentCmd: cmdName,
        currentArg: arg,
        originalArg: arg,
        items: matches,
        index: -1,
        showAll: false, // 第一次按 tab 不显示列表，直接补全第一个
        firstTab: true,
      };
    }

    const state = tabCompleteState.value;

    if (state.firstTab) {
      // 第一次按 Tab: 如果只有一个匹配，直接补全；如果有多个，循环补全第一个
      state.showAll = true;
      state.firstTab = false;
      state.index = 0;
      command.value = `${cmdName} ${matches[0]}`;
    } else {
      // 后续按 Tab: 循环切换 (这里逻辑已经在顶部被拦截了，但为了安全保留)
      handleTabNavigate("next");
    }
  };

  // 键盘事件处理 (在 App.vue 中调用)
  const handleKeydown = (e) => {
    if (e.key === "Tab") {
      e.preventDefault();
      handleTabComplete(e);
    } else if (e.key === "ArrowUp") {
      if (tabCompleteState.value.showAll) {
        e.preventDefault();
        handleTabNavigate("prev");
      } else {
        e.preventDefault();
        handleHistory("up");
      }
    } else if (e.key === "ArrowDown") {
      if (tabCompleteState.value.showAll) {
        e.preventDefault();
        handleTabNavigate("next");
      } else {
        e.preventDefault();
        handleHistory("down");
      }
    } else if (e.key === "Enter") {
       executeCommand();
    }
  };

  return {
    command,
    conversations,
    inputRef,
    terminalRef,
    currentDir,
    showWelcome,
    isCommandExecuting,
    history,
    tabCompleteState,
    loadHistory,
    executeCommand,
    handleHistory,
    handleTabComplete,
    handleKeydown, // 导出统一的键盘处理
    focusInput,
    isDir, // 导出供模板使用
  };
}
