import { parse, stringify } from "@iarna/toml";

// 深度合并对象 (原 App.vue 中的逻辑)
export const deepMerge = (target, source) => {
  if (typeof source !== "object" || source === null) return source;
  if (typeof target !== "object" || target === null) target = {};
  for (const key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      if (typeof source[key] === "object" && source[key] !== null) {
        if (Array.isArray(source[key])) {
          target[key] = source[key];
        } else {
          target[key] = deepMerge(target[key], source[key]);
        }
      } else {
        target[key] = source[key];
      }
    }
  }
  return target;
};

// 路径解析 (原 index.js 中的逻辑)
export const resolvePath = (currentPath, targetPath) => {
  // 如果没有指定目标路径，返回当前路径
  if (!targetPath) {
    return currentPath;
  }

  let resolvedPath;

  // 处理绝对路径（以/开头）
  if (targetPath.startsWith("/")) {
    resolvedPath = targetPath;
  }
  // 处理相对路径
  else {
    // 将当前目录和目标目录合并
    const currentPathParts = currentPath.split("/").filter(Boolean);
    const targetPathParts = targetPath.split("/").filter(Boolean);

    // 处理特殊路径组件
    for (const part of targetPathParts) {
      if (part === "..") {
        // 返回上一级目录
        currentPathParts.pop();
      } else if (part !== ".") {
        // 添加子目录，不处理当前目录
        currentPathParts.push(part);
      }
      // 忽略 .
    }

    // 构建完整路径
    resolvedPath = "/" + currentPathParts.join("/");
  }

  return resolvedPath;
};

// HTML转义 (原 vi 命令中的逻辑，提取出来通用)
export const escapeHtml = (text) => {
  if (!text) return "";
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>'"]/g, (m) => map[m]);
};

// 浏览器信息对象
export const browserInfo = {
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

// 解析信息栏模板字符串的函数
export const parseInfoBarTemplate = (template, data, styles) => {
  // 确保获取ref的实际值
  const getValue = (val) => {
    return typeof val === "object" && val !== null && "value" in val
      ? val.value
      : val;
  };

  // 替换所有可用变量
  let parsedTemplate = template;
  const variables = {
    "{user}": `<span style="color: ${styles.username}">${getValue(
      data.user
    )}</span>`,
    "{dayOfWeek}": `<span style="color: ${styles.dayOfWeek}">${getValue(
      data.dayOfWeek
    )}</span>`,
    "{time}": `<span style="color: ${styles.commandTime}">${getValue(
      data.time
    )}</span>`,
    "{latency}": `<span style="color: ${styles.latency}">${getValue(
      data.latency
    )}</span>`,
    "{cpu}": `<span style="color: ${styles.cpu}">${getValue(data.cpu)}</span>`,
    "{mem}": `<span style="color: ${styles.mem}">${getValue(data.mem)}</span>`,
    "{memUsage}": `<span style="color: ${styles.mem}">${getValue(
      data.memUsage
    )}</span>`,
    "{memTotal}": `<span style="color: ${styles.mem}">${getValue(
      data.memTotal
    )}</span>`,
  };

  // 替换模板中的所有变量
  for (const [key, value] of Object.entries(variables)) {
    parsedTemplate = parsedTemplate.replace(new RegExp(key, "g"), value);
  }

  return parsedTemplate;
};
