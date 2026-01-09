import { CommandAPI } from "../composables/CommandAPI";

// size 命令
export const size = async (rawContext, ...args) => {
  const cmd = new CommandAPI(rawContext, args);
  const sizeArg = cmd.args[0];

  if (sizeArg === "default") {
    const success = cmd.updateConfig({
      ui: { fontSize: "18" },
    });
    if (success) {
      cmd.success("字体大小已重置为默认 (18px)");
    } else {
      cmd.error("更新字体大小失败，请重试。");
    }
  } else {
    const sizeNum = parseInt(sizeArg);
    if (!isNaN(sizeNum) && sizeNum >= 1 && sizeNum <= 26) {
      const success = cmd.updateConfig({
        ui: { fontSize: sizeNum.toString() },
      });
      if (success) {
        cmd.success(`字体大小已设置为 ${sizeNum}px`);
      } else {
        cmd.error("更新字体大小失败，请重试。");
      }
    } else {
      cmd.error("用法: size <1-26|default>");
    }
  }
};

// background 命令
export const background = async (rawContext, ...args) => {
  const cmd = new CommandAPI(rawContext, args);
  const { background: bg } = cmd.raw;
  const argsList = cmd.args;

  if (argsList.length === 0) {
    cmd.info(`当前背景设置:
  图片: ${bg.image.value}
  透明度: ${bg.opacity.value}`);
  } else if (argsList.length === 1) {
    const opacity = argsList[0];
    const opacityNum = parseFloat(opacity);
    if (!isNaN(opacityNum) && opacityNum >= 0 && opacityNum <= 1) {
      const success = cmd.updateConfig({
        background: { opacity: opacityNum.toString() },
      });
      if (success) {
        cmd.success(`背景透明度已设置为 ${opacity}`);
      } else {
        cmd.error("更新背景透明度失败，请重试。");
      }
    } else {
      cmd.error("用法: background <0-1> | background opacity <0-1> | background image <path>");
    }
  } else if (argsList[0] === "opacity") {
    const opacity = argsList[1];
    const opacityNum = parseFloat(opacity);
    if (!isNaN(opacityNum) && opacityNum >= 0 && opacityNum <= 1) {
      const success = cmd.updateConfig({
        background: { opacity: opacityNum.toString() },
      });
      if (success) {
        cmd.success(`背景透明度已设置为 ${opacity}`);
      } else {
        cmd.error("更新背景透明度失败，请重试。");
      }
    } else {
      cmd.error("用法: background <0-1> | background opacity <0-1>");
    }
  } else if (argsList[0] === "image") {
    const imagePath = argsList[1];
    if (!imagePath) {
      cmd.error("用法: background image <path>");
      return;
    }
    let isValidUrl = false;
    try {
      new URL(imagePath);
      isValidUrl = true;
    } catch {
      isValidUrl = false;
    }
    if (!isValidUrl && !imagePath.startsWith("/")) {
      cmd.error("本地图片路径必须以 / 开头");
      return;
    }
    const success = cmd.updateConfig({
      background: { image: imagePath },
    });
    if (success) {
      cmd.success(`背景图片已设置为 ${imagePath}`);
      cmd.info(`当前背景设置:
  图片: ${bg.image.value}
  透明度: ${bg.opacity.value}`);
    } else {
      cmd.error("更新背景图片失败，请重试。");
    }
  } else {
    cmd.error("用法: background <0-1> | background opacity <0-1> | background image <path>");
  }
};

// theme 命令
export const theme = async (rawContext, ...args) => {
  const cmd = new CommandAPI(rawContext, args);
  const { theme: themeConfig } = cmd.raw;
  const argsList = cmd.args;

  // 扩展: 支持 read 子命令
  if (argsList[0] === "read") {
     const readThemeName = argsList[1];
     if (!readThemeName) {
        // 显示当前 read theme
        const currentReadTheme = cmd.raw.config?.value?.read_theme?.current || "default";
        const availableReadThemes = cmd.raw.config?.value?.read_theme?.available || ["default"];
        cmd.info(`当前阅读器主题: ${currentReadTheme}\n可用阅读器主题: ${availableReadThemes.join(", ")}`);
        return;
     }
     
     const availableReadThemes = cmd.raw.config?.value?.read_theme?.available || ["default"];
     if (availableReadThemes.includes(readThemeName)) {
        const success = cmd.updateConfig({
          read_theme: { current: readThemeName },
        });
        if (success) {
          cmd.success(`阅读器主题已设置为 ${readThemeName}`);
        } else {
          cmd.error("更新阅读器主题失败。");
        }
     } else {
        cmd.error(`未找到阅读器主题: ${readThemeName}\n可用主题: ${availableReadThemes.join(", ")}`);
     }
     return;
  }

  if (argsList.length === 0) {
    cmd.info(`当前主题: ${themeConfig.current.value}\n可用主题: ${themeConfig.available.value.join(", ")}`);
  } else if (argsList.length === 1) {
    const requestedTheme = argsList[0];
    if (themeConfig.available.value.includes(requestedTheme)) {
      const success = cmd.updateConfig({
        theme: { current: requestedTheme },
      });
      if (success) {
        cmd.success(`主题已设置为 ${requestedTheme}`);
      } else {
        cmd.error("更新主题失败，请重试。");
      }
    } else {
      cmd.error(`未找到主题: ${requestedTheme}\n可用主题: ${themeConfig.available.value.join(", ")}`);
    }
  }
};

// font 命令
export const font = async (rawContext, ...args) => {
  const cmd = new CommandAPI(rawContext, args);
  const availableFonts = [
    "0xProto Nerd Font",
    "Fira Code",
    "Cascadia Code",
    "JetBrains Mono",
  ];
  const defaultFont = "Cascadia Code";
  const { font: fontConfig } = cmd.raw;
  const argsList = cmd.args;

  if (argsList.length === 0) {
    cmd.info(`当前字体: ${fontConfig.family.value}\n可用字体: ${availableFonts.join(", ")}, default`);
  } else {
    const fontName = argsList.join(" ");
    if (availableFonts.includes(fontName)) {
      const success = cmd.updateConfig({
        ui: { fontFamily: fontName },
      });
      if (success) {
        cmd.success(`字体已设置为 ${fontName}`);
      } else {
        cmd.error("更新字体失败，请重试。");
      }
    } else if (fontName === "default") {
      const success = cmd.updateConfig({
        ui: { fontFamily: defaultFont },
      });
      if (success) {
        cmd.success(`字体已设置为默认 (${defaultFont})`);
      } else {
        cmd.error("更新字体失败，请重试。");
      }
    } else {
      cmd.error(`未找到字体: ${fontName}\n可用字体: ${availableFonts.join(", ")}, default`);
    }
  }
};

// test-config 命令
export const testConfig = async (rawContext, ...args) => {
  const cmd = new CommandAPI(rawContext, args);
  const { user, fontSize, background, theme } = cmd.raw; 
  
  const userInfo = user ? user.value : "Unknown";
  const sizeInfo = fontSize ? fontSize.value : "Unknown";
  const bgImage = background?.image ? background.image.value : "None";
  const bgOpacity = background?.opacity ? background.opacity.value : "N/A";
  const themeName = theme?.current ? theme.current.value : "Default";
  const availableThemes = theme?.available ? theme.available.value.join(", ") : "N/A";

  cmd.info(`当前配置:
  用户: ${userInfo}
  字体大小: ${sizeInfo}px
  背景:
    图片: ${bgImage}
    透明度: ${bgOpacity}
  主题: ${themeName}
  可用主题: ${availableThemes}`);
};

// clear-config 命令
export const clearConfig = async (rawContext, ...args) => {
  const cmd = new CommandAPI(rawContext, args);
  const {
    conversations,
    clearHistory,
    reloadConfig
  } = cmd.raw;

  // 1. 清除所有本地存储的配置和历史
  localStorage.removeItem("terminalSettings");
  localStorage.removeItem("terminalHistory");
  localStorage.removeItem("terminalConfigToml");
  localStorage.removeItem("terminalVFS");

  // 2. 清除内存中的状态
  if (clearHistory) clearHistory();
  if (conversations && conversations.value) {
    conversations.value = [];
  }

  // 3. 重新加载默认配置
  if (reloadConfig) {
    await reloadConfig();
  }

  cmd.success("所有配置和历史记录已清除！");
  cmd.info("所有设置已重置为默认值。");
};
