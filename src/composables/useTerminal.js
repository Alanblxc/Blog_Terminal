import { ref, nextTick, watch } from "vue";
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
  const showWelcome = ref(true);

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

  // --- 重构后的 Tab 补全 ---
  const handleTabComplete = () => {
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
    if (cmdName === "ls" || cmdName === "cd") {
      matches = matches.filter((item) => isDir(item, currentDir.value));
    }
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
      // 后续按 Tab: 循环切换
      state.index = (state.index + 1) % matches.length;
      command.value = `${cmdName} ${matches[state.index]}`;
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
    focusInput,
    isDir, // 导出供模板使用
  };
}
