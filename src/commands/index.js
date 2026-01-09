
import { nextTick } from "vue";
import { marked } from "marked";
import { resolvePath } from "../composables/utils";
import {
  articles,
  getCompletionItems,
  getArticleInfo,
  getDirIcon,
} from "../composables/fileSystem";
import vi from "./vi";
import read from "./read";
import { CommandAPI } from "../composables/CommandAPI";

/**
 * ==================================================================================
 * CommandAPI 使用指南
 * ==================================================================================
 * 
 * 所有终端命令都应遵循以下开发模式。使用 CommandAPI 可以简化上下文交互、参数获取和结果输出。
 * 
 * 基本结构:
 * 
 * const myCommand = async (rawContext, ...args) => {
 *   // 1. 初始化 API 实例
 *   const cmd = new CommandAPI(rawContext, args);
 * 
 *   // 2. 获取输入
 *   const arg1 = cmd.args[0]; // 获取第一个参数
 *   const cwd = cmd.cwd;      // 获取当前目录路径
 * 
 *   // 3. 执行逻辑
 *   if (!arg1) {
 *     // 4. 输出结果 (支持多种类型)
 *     cmd.error("Missing argument");
 *     return;
 *   }
 * 
 *   cmd.info(`Processing ${arg1}...`);
 *   cmd.success("Done!");
 *   
 *   // 高级输出:
 *   // cmd.print("普通文本");
 *   // cmd.markdown({ ... }); // 渲染 Markdown
 *   // cmd.dir(content);      // 渲染文件列表
 *   // cmd.tree(content);     // 渲染树形结构
 *   
 *   // 系统操作:
 *   // cmd.setCwd("/new/path"); // 切换目录
 *   // cmd.clear();             // 清屏
 * };
 * 
 * ==================================================================================
 */

// ls 命令
const ls = async (rawContext, ...args) => {
  // 初始化 API
  const cmd = new CommandAPI(rawContext, args);
  
  // 获取参数和环境
  const targetDir = cmd.args[0];
  const { currentDir } = cmd.raw; // 如需访问底层 context，可使用 cmd.raw
  
  let targetPath = resolvePath(currentDir, targetDir);
  const targetContent = articles[targetPath];

  if (targetContent && targetContent.type === "dir") {
    const dirs = targetContent.content.filter((item) => item.type === "dir");
    const files = targetContent.content.filter((item) => item.type === "file");

    const mdFiles = files.filter((file) => file.name.endsWith(".md"));
    const otherFiles = files.filter((file) => !file.name.endsWith(".md"));

    // 按日期排序 Markdown 文件
    mdFiles.sort((a, b) => {
      const dateA = a.date ? new Date(a.date) : new Date(0);
      const dateB = b.date ? new Date(b.date) : new Date(0);
      return dateB - dateA;
    });

    // 其他文件按名称排序
    otherFiles.sort((a, b) => a.name.localeCompare(b.name));

    // 如果是根目录，检查并添加虚拟的 config.toml
    if (targetPath === "/") {
      const hasConfigFile = files.some((file) => file.name === "config.toml");
      if (!hasConfigFile) {
        otherFiles.push({
          type: "file",
          name: "config.toml",
          icon: "",
          path: "/config.toml",
          isVirtual: true,
        });
        otherFiles.sort((a, b) => a.name.localeCompare(b.name));
      }
    }

    const sortedContent = [...dirs, ...mdFiles, ...otherFiles];
    cmd.dir(sortedContent);
  } else {
    cmd.error(`未找到目录: ${targetDir || currentDir}`);
  }
};

// cd 命令
const cd = async (rawContext, ...args) => {
  const cmd = new CommandAPI(rawContext, args);
  const dir = cmd.args[0];
  if (!dir) return;

  const targetPath = resolvePath(cmd.cwd, dir);
  if (articles[targetPath]) {
    cmd.setCwd(targetPath);
  } else {
    cmd.error(`未找到目录: ${dir}`);
  }
};

// viewFile 命令 (cat)
const viewFile = async (rawContext, ...args) => {
  const cmd = new CommandAPI(rawContext, args);
  const fileName = cmd.args[0];
  const { theme } = cmd.raw;

  if (!fileName) {
    cmd.error("用法: cat <file.md>");
    return;
  }

  // 特殊处理 config.toml
  if (fileName === "config.toml" && cmd.cwd === "/") {
    try {
      const content = await cmd.readFile(fileName);
      cmd.print(content || "");
      return;
    } catch (error) {
      cmd.error(`读取 config.toml 失败: ${error.message}`);
      return;
    }
  }

  const articleInfo = getArticleInfo(fileName, cmd.cwd);
  if (!articleInfo) {
    cmd.error(`未找到文件: ${fileName}`);
    return;
  }

  try {
    const response = await fetch(articleInfo.path);
    if (!response.ok) throw new Error("File not found");
    const content = await response.text();
    const parsedContent = marked(content);

    cmd.markdown({
      title: articleInfo.title,
      date: articleInfo.date,
      category: articleInfo.category,
      content: parsedContent,
      rawContent: content,
    });
  } catch (error) {
    cmd.error(`未找到文件: ${fileName}`);
  }
};

// tree 命令
const tree = async (rawContext, ...args) => {
  const cmd = new CommandAPI(rawContext, args);
  const { currentDir } = cmd.raw; 

  // 递归生成树形结构
  const generateTree = (dirPath, indent = "", prefix = "") => {
    const dir = articles[dirPath];
    if (!dir || dir.type !== "dir") return [];

    const treeLines = [];
    const items = dir.content;

    for (let i = 0; i < items.length; i++) {
      const isLast = i === items.length - 1;
      const newIndent = indent + (isLast ? "    " : "│   ");
      const newPrefix = isLast ? "└── " : "├── ";

      const item = items[i];
      treeLines.push(`${indent}${newPrefix}${getDirIcon(item)} ${item.name}`);

      if (item.type === "dir") {
        const subDirPath = resolvePath(dirPath, item.name);
        if (articles[subDirPath]) {
          treeLines.push(...generateTree(subDirPath, newIndent));
        }
      }
    }
    return treeLines;
  };

  const treeLines = [`${getDirIcon({ type: "dir" })} .`];
  treeLines.push(...generateTree("/"));

  cmd.tree(treeLines.join("\n"));
};

// help 命令
const help = async (rawContext, ...args) => {
  const cmd = new CommandAPI(rawContext, args);
  const showAll = cmd.args.includes("-l");

  const commonHelpText = `用法: <command> [options]

命令列表:

  ls                    列出目录内容
  cd <dir>              切换目录
  cat <file>            查看Markdown文件内容
  read <file>           全屏阅读器 (支持TOC/搜索)
  tree                  显示目录结构
  help                  显示此帮助信息
  size <num|default>    设置字体大小 (1-26|default)
  font [font-name]      显示当前字体或设置字体 (0xProto Nerd Font|Fira Code|Cascadia Code|JetBrains Mono)
  background [0-1]      显示当前背景设置或设置透明度
  wget <file>           下载文件
  vi <file>             编辑文件 (config.toml)

💡 提示: 输入 'help -l' 查看所有可用命令`;

  const fullHelpText = `终端博客命令帮助

用法: <command> [options]

基本命令:

  ls                    列出目录内容
  cd <dir>              切换目录
  cat <file>            查看Markdown文件内容
  read <file>           全屏阅读器 (支持TOC/搜索/主题)
  tree                  显示完整目录结构
  find <term>           搜索文章名称
  wget <file>           下载文件
  vi <file>             编辑文件 (config.toml)

网络命令:

  ipconfig              显示网络配置信息
  ping <host>           发送ICMP回显请求

终端设置:

  size <num|default>    设置字体大小 (1-26|default)
  font [font-name]      显示当前字体或设置字体
  background            显示当前背景设置
  background <0-1>      设置背景透明度 (0-1之间的数值)
  theme                 显示当前主题和可用主题
  theme <name>          设置Markdown主题

实用命令:

  echo <message>        打印消息
  clear                 清空终端
  help                  显示此帮助信息
  help -l               显示完整帮助信息
  test-config           测试配置加载
  clear-config          清除所有配置和历史命令

💡 提示: 输入命令名称后按Tab键可进行自动补全`;

  cmd.help(showAll ? fullHelpText : commonHelpText);
};

// clear 命令
const clear = async (rawContext, ...args) => {
  const cmd = new CommandAPI(rawContext, args);
  cmd.clear();
};

// size 命令
const size = async (rawContext, ...args) => {
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
const background = async (rawContext, ...args) => {
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

// ipconfig 命令
const ipconfig = async (rawContext, ...args) => {
  const cmd = new CommandAPI(rawContext, args);
  
  // 获取本地 IP (通过 WebRTC)
  const getLocalIP = () => {
    return new Promise((resolve) => {
      const RTCPeerConnection =
        window.RTCPeerConnection ||
        window.mozRTCPeerConnection ||
        window.webkitRTCPeerConnection;
      if (!RTCPeerConnection) {
        resolve(null);
        return;
      }
      const pc = new RTCPeerConnection({ iceServers: [] });
      const noop = () => {};
      const timeoutId = setTimeout(() => {
        pc.close();
        resolve(null);
      }, 2000);
      pc.onicecandidate = (ice) => {
        if (ice && ice.candidate && ice.candidate.candidate) {
          const myIPRegex = /([0-9]{1,3}(\.[0-9]{1,3}){3})/;
          const match = myIPRegex.exec(ice.candidate.candidate);
          if (match) {
            clearTimeout(timeoutId);
            pc.onicecandidate = noop;
            pc.close();
            resolve(match[1]);
          }
        }
      };
      pc.createDataChannel("");
      pc.createOffer()
        .then((sdp) => pc.setLocalDescription(sdp, noop, noop))
        .catch(() => {});
    });
  };

  cmd.info("正在检查网络配置...");
  await cmd.scroll();

  try {
    // 1. 获取公网 IP
    const publicIpPromise = fetch("https://api.ipify.org?format=json")
      .then((res) => res.json())
      .then((data) => data.ip)
      .catch(() => "Unknown");
      
    // 2. 获取 DNS 信息
    const dnsInfoPromise = fetch("https://edns.ip-api.com/json")
      .then((res) => res.json())
      .then((data) => data.dns)
      .catch(() => null);

    // 3. 获取本地 IP
    const localIpPromise = getLocalIP();

    const [publicIp, dnsData, realLocalIp] = await Promise.all([
      publicIpPromise,
      dnsInfoPromise,
      localIpPromise,
    ]);

    const displayLocalIp =
      realLocalIp ||
      `192.168.1.${Math.floor(Math.random() * 200 + 20)} (模拟)`;
    const isSimulated = !realLocalIp;
    
    const dnsSuffix = dnsData ? dnsData.geo.split(' ').pop().toLowerCase() + ".local" : "localdomain";
    const dnsDisplay = dnsData 
      ? `${dnsData.ip} (${dnsData.geo})`
      : "192.168.1.1 (模拟)";

    const info = [
      `\nWindows IP 配置\n`,
      `以太网适配器 Ethernet 0:`,
      `   连接特定的 DNS 后缀 . . . . . . . : ${dnsSuffix}`,
      `   本地链接 IPv6 地址. . . . . . . . : fe80::${Math.floor(
        Math.random() * 9999
      )}%11`,
      `   IPv4 地址 . . . . . . . . . . . . : ${displayLocalIp} ${
        isSimulated
          ? "<- 浏览器隐私策略已屏蔽真实 IP"
          : "<- 通过 WebRTC 检测>"
      }`,
      `   子网掩码  . . . . . . . . . . . . : 255.255.255.0`,
      `   默认网关. . . . . . . . . . . . . : 192.168.1.1`,
      `   DNS 服务器  . . . . . . . . . . . : ${dnsDisplay}`,
      `\n广域网 (WAN) 统计:`,
      `   公网 IP 地址. . . . . . . . . . . : ${publicIp}`,
    ];

    cmd.success(info.join("\n"));
    await cmd.scroll();
  } catch (e) {
    cmd.error("读取网络配置失败。");
  }
};

// ping 命令
const ping = async (rawContext, ...args) => {
  const cmd = new CommandAPI(rawContext, args);
  const target = cmd.getArg(0, "localhost");
  
  let url = target.trim().replace(/\/$/, "");
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }
  const displayUrl = url.replace(/^https?:\/\//, "");

  const stats = { sent: 0, received: 0, times: [] };

  cmd.info(`正在 Ping ${displayUrl} [TCP/HTTP 模拟] 具有 32 字节的数据:`);
  await cmd.scroll();
  await cmd.sleep(500);

  for (let i = 0; i < 4; i++) {
    stats.sent++;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    const start = performance.now();

    try {
      await fetch(url, {
        mode: "no-cors",
        cache: "no-store",
        signal: controller.signal,
      });
      const end = performance.now();
      clearTimeout(timeoutId);
      const time = (end - start).toFixed(0);
      stats.times.push(parseInt(time));
      stats.received++;
      
      cmd.success(`来自 ${displayUrl} 的回复: 时间=${time}ms 协议=HTTP/HTTPS`);
    } catch (err) {
      clearTimeout(timeoutId);
      let errorMsg = "请求超时。";
      if (err.name !== "AbortError") {
        errorMsg = "无法访问目标主机 (网络/CORS 错误)。";
      }
      cmd.error(errorMsg);
    }
    
    // 关键：每次输出后立即滚动并等待
    await cmd.scroll();
    
    if (i < 3) {
      await cmd.sleep(1000);
    }
  }

  cmd.print("");
  await cmd.scroll();
  await cmd.sleep(200);

  const lost = stats.sent - stats.received;
  const lostPercent = Math.round((lost / stats.sent) * 100);
  let min = 0, max = 0, avg = 0;
  if (stats.times.length > 0) {
    min = Math.min(...stats.times);
    max = Math.max(...stats.times);
    avg = Math.round(stats.times.reduce((a, b) => a + b, 0) / stats.times.length);
  }

  const statsLines = [
    `${displayUrl} 的 Ping 统计信息:`,
    `    数据包: 已发送 = ${stats.sent}，已接收 = ${stats.received}，丢失 = ${lost} (${lostPercent}% 丢失)，`,
    `往返行程的估计时间(以毫秒为单位):`,
    `    最短 = ${min}ms，最长 = ${max}ms，平均 = ${avg}ms`,
  ];

  for (const line of statsLines) {
    cmd.info(line);
    await cmd.scroll();
    await cmd.sleep(150);
  }
};

// theme 命令
const theme = async (rawContext, ...args) => {
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

// echo 命令
const echo = async (rawContext, ...args) => {
  const cmd = new CommandAPI(rawContext, args);
  const message = cmd.args.join(" "); // 拼接所有参数
  
  // 检查是否是文件
  const fileName = cmd.args[0];
  if (cmd.args.length === 1 && fileName) {
    const { articles } = cmd.raw;
    const { currentDir } = cmd.raw;
    
    // 尝试在当前目录查找文件
    let fileContent = null;
    try {
      // 使用 cmd.readFile 统一处理所有文件读取逻辑
      fileContent = await cmd.readFile(fileName);
    } catch (e) {}
    
    if (fileContent !== null) {
      cmd.print(fileContent);
      return;
    }
  }

  cmd.print(message); // 输出普通文本
};

// font 命令
const font = async (rawContext, ...args) => {
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
const testConfig = async (rawContext, ...args) => {
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

// find 命令
const find = async (rawContext, ...args) => {
  const cmd = new CommandAPI(rawContext, args);
  const searchTerm = cmd.args.join(" ");

  if (!searchTerm) {
    cmd.error("用法: find <article_name>");
    return;
  }

  const searchResults = [];
  const searchInDir = (dirPath, content) => {
    content.forEach((item) => {
      if (
        item.type === "file" &&
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
      ) {
        searchResults.push({ ...item, path: dirPath });
      }
      if (item.type === "dir" && item.content) {
        const fullPath =
          dirPath === "/" ? `/${item.name}` : `${dirPath}/${item.name}`;
        searchInDir(fullPath, item.content);
      }
    });
  };

  searchInDir("/", articles["/"].content);

  if (searchResults.length === 0) {
    cmd.info(`未找到匹配 "${searchTerm}" 的文章`);
  } else {
    const resultContent = [
      `找到 ${searchResults.length} 篇匹配 "${searchTerm}" 的文章:`,
      "",
    ];
    searchResults.forEach((result) => {
      resultContent.push(
        `${result.icon} ${result.path}/${result.name} (${result.category})`
      );
    });
    cmd.info(resultContent.join("\n"));
  }
};

// wget 命令
const wget = async (rawContext, ...args) => {
  const cmd = new CommandAPI(rawContext, args);
  const fileName = cmd.args[0];

  if (!fileName) {
    cmd.error("用法: wget <file_name>");
    return;
  }

  if (fileName === "config.toml" && cmd.cwd === "/") {
    try {
      const content = await cmd.readFile(fileName);
      const blob = new Blob([content || ""], { type: "text/toml" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "config.toml";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      cmd.success(`开始下载: ${fileName}`);
      cmd.info(`正在从系统配置下载 config.toml`);
      return;
    } catch (error) {
      cmd.error(`下载 config.toml 失败: ${error.message}`);
      return;
    }
  }

  const file = getArticleInfo(fileName, "/");
  let fileUrl = null;

  if (file) {
    if (file.url) {
      fileUrl = file.url;
    } else if (fileName.endsWith(".md")) {
      fileUrl = file.path || `/post/${fileName}`;
    }
  }

  if (fileUrl) {
    window.open(fileUrl, "_blank");
    cmd.success(`开始下载: ${fileName}`);
    cmd.info(`正在下载: ${fileUrl}`);
  } else {
    cmd.error(`未找到文件: ${fileName}`);
  }
};

// clear-config 命令
const clearConfig = async (rawContext, ...args) => {
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

export const commands = {
  ls,
  cd,
  cat: viewFile,
  tree,
  help,
  clear,
  size,
  background,
  ipconfig,
  ping,
  theme,
  echo,
  font,
  "test-config": testConfig,
  find,
  wget,
  "clear-config": clearConfig,
  vi,
  read,
};

export default commands;
