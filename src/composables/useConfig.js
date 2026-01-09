
import { ref, computed, watch } from "vue";
import parse from "@iarna/toml/parse-string.js";
import stringify from "@iarna/toml/stringify.js";
import { deepMerge } from "./utils";

const defaultConfig = {
  app: { user: "Alan" },
  welcome: {
    title: "Terminal Blog",
    welcomeMsg: "Loading...",
    helpMsg: "Type 'help'",
  },
  ascii: { art: "" },
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
    default: { prompt: "#3b82f6", directory: "#60a5fa", file: "#fbbf24" },
  },
  read_theme: {
    current: "default",
    available: ["default", "light", "eye_care"],
    default: {
      background: "#0d1117",
      text: "#c9d1d9",
      accent: "#58a6ff",
      codeBackground: "#161b22",
      tocHover: "rgba(56, 139, 253, 0.15)",
      borderColor: "#30363d"
    },
    light: {
      background: "#ffffff",
      text: "#24292f",
      accent: "#0969da",
      codeBackground: "#f6f8fa",
      tocHover: "#ebf0f4",
      borderColor: "#d0d7de"
    },
    eye_care: {
      background: "#f5f5dc", // 米色/奶油色
      text: "#4a4a4a",
      accent: "#8b4513",
      codeBackground: "#e8e8d0",
      tocHover: "#e0e0c0",
      borderColor: "#dcdcaa"
    }
  },
};

export function useConfig() {
  const config = ref(JSON.parse(JSON.stringify(defaultConfig)));

  // 基础计算属性
  const fontSize = computed(() => config.value.ui.fontSize);
  const font = {
    family: computed(() => config.value.ui.fontFamily || "Cascadia Code"),
  };
  const background = {
    image: computed(() => config.value.background.image),
    opacity: computed(() => parseFloat(config.value.background.opacity)),
  };
  const asciiArt = computed(() => config.value.ascii?.art || "");
  const welcome = computed(() => config.value.welcome || defaultConfig.welcome);

  const theme = {
    current: computed(() => config.value.theme.current),
    available: computed(() => config.value.theme.available),
    colors: computed(
      () => config.value.theme[config.value.theme.current] || {}
    ),
  };

  const readTheme = {
    current: computed(() => config.value.read_theme?.current || "default"),
    available: computed(() => config.value.read_theme?.available || ["default"]),
    colors: computed(() => {
       const current = config.value.read_theme?.current || "default";
       return config.value.read_theme?.[current] || defaultConfig.read_theme.default;
    }),
  };

  // 巨大的样式计算
  const uiStyles = computed(() => {
    const currentTheme = theme.current.value;
    const themeColors = config.value.theme[currentTheme] || {};
    const ui = config.value.ui || defaultConfig.ui;

    return {
      infoBar: {
        ...defaultConfig.ui.infoBar,
        ...ui.infoBar,
        colors: { ...defaultConfig.ui.infoBar.colors, ...ui.infoBar?.colors },
      },
      commandLine: {
        ...defaultConfig.ui.commandLine,
        ...ui.commandLine,
        prompt:
          ui.commandLine?.colors?.prompt || themeColors.prompt || "#3b82f6",
        directory:
          ui.commandLine?.colors?.directory ||
          themeColors.directory ||
          "#60a5fa",
        file: ui.commandLine?.colors?.file || themeColors.file || "#fbbf24",
        command:
          ui.commandLine?.colors?.command || themeColors.command || "#ffffff",
        colors: {
          ...defaultConfig.ui.commandLine.colors,
          ...ui.commandLine?.colors,
        },
        output: {
          ...defaultConfig.ui.commandLine.output,
          ...ui.commandLine?.output,
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

  // 加载配置
  const loadConfig = async () => {
    try {
      let configContent;
      let cachedConfig = localStorage.getItem("terminalConfigToml");
      let needsFresh = !cachedConfig;

      if (cachedConfig) {
        try {
          parse(cachedConfig);
        } catch (e) {
          localStorage.removeItem("terminalConfigToml");
          needsFresh = true;
        }
      }

      if (needsFresh) {
        // 使用相对路径 ./config.toml 适配 base: './'
        const res = await fetch("./config.toml");
        // 检查返回内容是否为 HTML (即 404 页面的情况)
        const contentType = res.headers.get("content-type");
        if (res.ok && (!contentType || !contentType.includes("text/html"))) {
          configContent = await res.text();
          // 双重校验：确保不是 HTML doctype 开头
          if (configContent.trim().toLowerCase().startsWith("<!doctype")) {
             throw new Error("Received HTML instead of TOML");
          }
          localStorage.setItem("terminalConfigToml", configContent);
        } else {
           throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);
        }
      } else {
        configContent = cachedConfig;
      }

      if (configContent) {
        const parsed = parse(configContent);
        const merged = deepMerge(defaultConfig, parsed);
        config.value = JSON.parse(JSON.stringify(merged));
      }
    } catch (e) {
      console.warn("Load config failed, using default.", e);
      config.value = JSON.parse(JSON.stringify(defaultConfig));
    }
  };

  // 更新配置
  const updateTomlConfig = (updates) => {
    try {
      const cached = localStorage.getItem("terminalConfigToml");
      if (!cached) return false;
      const parsed = parse(cached);
      const updated = deepMerge(parsed, updates);
      localStorage.setItem("terminalConfigToml", stringify(updated));
      loadConfig();
      return true;
    } catch (e) {
      console.error("Update TOML failed", e);
      return false;
    }
  };

  return {
    config,
    uiStyles,
    infoBarColors,
    fontSize,
    font,
    background,
    theme,
    readTheme,
    asciiArt,
    welcome,
    loadConfig,
    updateTomlConfig,
  };
}
