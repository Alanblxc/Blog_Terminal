
import { ref, computed } from "vue";
import parse from "@iarna/toml/parse-string.js";
import stringify from "@iarna/toml/stringify.js";
import { deepMerge } from "./utils";

// 空的初始状态，等待 config.toml 加载
const initialConfig = {
  app: { user: "Guest" },
  welcome: {
    title: "Terminal Blog",
    welcomeMsg: "Loading configuration...",
    helpMsg: "Please wait...",
  },
  ascii: { art: "" },
  ui: {
    fontSize: "18",
    fontFamily: "monospace",
    infoBar: { colors: {} },
    commandLine: { colors: {}, output: {} },
  },
  background: { image: "", opacity: "1.0" },
  theme: { current: "default", available: [], default: {} },
  read_theme: { current: "default", available: [], default: {} },
};

export function useConfig() {
  const config = ref(JSON.parse(JSON.stringify(initialConfig)));
  const isLoaded = ref(false);
  const error = ref(null);

  // 基础计算属性
  const fontSize = computed(() => config.value.ui?.fontSize || "18");
  const font = {
    family: computed(() => config.value.ui?.fontFamily || "monospace"),
  };
  const background = {
    image: computed(() => config.value.background?.image || ""),
    opacity: computed(() => parseFloat(config.value.background?.opacity || "1.0")),
  };
  const asciiArt = computed(() => config.value.ascii?.art || "");
  const welcome = computed(() => config.value.welcome || initialConfig.welcome);

  const theme = {
    current: computed(() => config.value.theme?.current || "default"),
    available: computed(() => config.value.theme?.available || []),
    colors: computed(() => {
        const current = config.value.theme?.current;
        return (current && config.value.theme?.[current]) ? config.value.theme[current] : {};
    }),
  };

  const readTheme = {
    current: computed(() => config.value.read_theme?.current || "default"),
    available: computed(() => config.value.read_theme?.available || []),
    colors: computed(() => {
       const current = config.value.read_theme?.current;
       return (current && config.value.read_theme?.[current]) ? config.value.read_theme[current] : {};
    }),
  };

  // 样式计算
  const uiStyles = computed(() => {
    // 只有加载成功后才进行复杂的样式计算
    if (!isLoaded.value) return { infoBar: {}, commandLine: {}, theme: {} };

    const currentTheme = theme.current.value;
    const themeColors = config.value.theme?.[currentTheme] || {};
    const ui = config.value.ui || {};

    return {
      infoBar: {
        ...ui.infoBar,
        colors: { ...ui.infoBar?.colors },
      },
      commandLine: {
        ...ui.commandLine,
        prompt: ui.commandLine?.colors?.prompt || themeColors.prompt || "#3b82f6",
        directory: ui.commandLine?.colors?.directory || themeColors.directory || "#60a5fa",
        file: ui.commandLine?.colors?.file || themeColors.file || "#fbbf24",
        command: ui.commandLine?.colors?.command || themeColors.command || "#ffffff",
        colors: { ...ui.commandLine?.colors },
        output: { ...ui.commandLine?.output },
      },
      theme: {
        current: currentTheme,
        available: config.value.theme?.available || [],
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
          console.error("Cached config invalid, clearing cache:", e.message);
          localStorage.removeItem("terminalConfigToml");
          needsFresh = true;
        }
      }

      if (needsFresh) {
        const res = await fetch("./config.toml");
        const contentType = res.headers.get("content-type");
        if (res.ok && (!contentType || !contentType.includes("text/html"))) {
          configContent = await res.text();
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
        // 直接使用解析后的配置，不与默认配置合并
        config.value = parsed;
        isLoaded.value = true;
        error.value = null;
      } else {
          throw new Error("Empty configuration content");
      }
    } catch (e) {
      console.error("Critical: Failed to load config.toml:", e);
      error.value = e.message;
      // 不回退到默认配置，保持错误状态
      isLoaded.value = false;
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
    isLoaded, // 导出加载状态
    error,    // 导出错误信息
  };
}
