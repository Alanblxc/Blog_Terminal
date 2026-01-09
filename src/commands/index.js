import { nextTick } from "vue";
import { marked } from "marked";
import { resolvePath } from "../composables/utils"; // 导入通用工具
import {
  articles,
  getCompletionItems,
  getArticleInfo,
  getDirIcon,
} from "../composables/fileSystem"; // 导入文件系统函数
import vi from "./vi"; // 导入复杂命令

// 命令模块 - 集中管理所有命令函数

// 辅助函数：向当前对话添加输出
const addOutput = async (conversation, output, scroll = true) => {
  if (conversation) {
    conversation.output.push(output);
    // 滚动逻辑由外部处理
  }
};

// 命令函数定义

// ls 命令 - 支持 ls 文件夹 查看指定文件夹内容
const ls = async (context, targetDir) => {
  const { currentDir, conversation } = context;
  // 使用resolvePath函数处理路径
  let targetPath = resolvePath(currentDir, targetDir);

  const targetContent = articles[targetPath];
  if (targetContent && targetContent.type === "dir") {
    // 将目录和文件分开，先显示目录，再显示文件
    const dirs = targetContent.content.filter((item) => item.type === "dir");
    const files = targetContent.content.filter((item) => item.type === "file");

    // 分离.md文件和非.md文件
    const mdFiles = files.filter((file) => file.name.endsWith(".md"));
    const otherFiles = files.filter((file) => !file.name.endsWith(".md"));

    // 按时间排序.md文件，最新的在前
    mdFiles.sort((a, b) => {
      const dateA = a.date ? new Date(a.date) : new Date(0);
      const dateB = b.date ? new Date(b.date) : new Date(0);
      return dateB - dateA;
    });

    // 非.md文件按名称排序
    otherFiles.sort((a, b) => a.name.localeCompare(b.name));

    // 在根目录添加虚拟的config.toml文件到文件列表中
    if (targetPath === "/") {
      // 检查是否已经存在config.toml文件
      const hasConfigFile = files.some((file) => file.name === "config.toml");
      if (!hasConfigFile) {
        // 将虚拟config.toml文件添加到otherFiles数组中
        otherFiles.push({
          type: "file",
          name: "config.toml",
          icon: "",
          path: "/config.toml",
          isVirtual: true, // 标记为虚拟文件
        });
        // 重新排序otherFiles，确保按名称排序
        otherFiles.sort((a, b) => a.name.localeCompare(b.name));
      }
    }

    // 合并结果：目录在前，.md文件按时间排序，然后是非.md文件按名称排序
    const sortedContent = [...dirs, ...mdFiles, ...otherFiles];

    await addOutput(conversation, {
      type: "dir",
      content: sortedContent,
    });
  } else {
    await addOutput(conversation, {
      type: "error",
      content: `Directory not found: ${targetDir || currentDir}`,
    });
  }
};

// cd 命令 - 重构支持多层嵌套文件夹
const cd = async (context, dir) => {
  const { currentDirRef, conversation } = context;
  if (!dir) {
    return;
  }

  // 使用resolvePath函数处理路径
  const targetPath = resolvePath(currentDirRef.value, dir);

  // 检查目标路径是否存在
  if (articles[targetPath]) {
    currentDirRef.value = targetPath;
  } else {
    await addOutput(conversation, {
      type: "error",
      content: `Directory not found: ${dir}`,
    });
  }
};

// viewFile 命令（cat命令的处理函数）
const viewFile = async (context, fileName) => {
  const { currentDir, conversation, getArticleInfo, theme } = context;
  if (!fileName) {
    await addOutput(conversation, {
      type: "error",
      content: "Usage: cat <file.md>",
    });
    return;
  }

  // 特殊处理config.toml文件
  if (fileName === "config.toml" && currentDir === "/") {
    try {
      // 从localStorage获取config.toml内容
      const content = localStorage.getItem("terminalConfigToml") || "";

      // 创建输出对象，显示原始TOML内容
      await addOutput(conversation, {
        type: "output",
        content: content,
      });
      return;
    } catch (error) {
      await addOutput(conversation, {
        type: "error",
        content: `Error reading config.toml: ${error.message}`,
      });
      return;
    }
  }

  // 获取文章信息
  const articleInfo = getArticleInfo(fileName, currentDir);
  if (!articleInfo) {
    await addOutput(conversation, {
      type: "error",
      content: `File not found: ${fileName}`,
    });
    return;
  }

  try {
    // 读取文件内容
    const response = await fetch(articleInfo.path.replace("./", "/"));
    if (!response.ok) {
      throw new Error("File not found");
    }
    const content = await response.text();
    // 使用marked解析Markdown内容
    const parsedContent = marked(content);

    // 创建新的输出对象
    const newOutput = {
      type: "glow",
      content: {
        title: articleInfo.title,
        date: articleInfo.date,
        category: articleInfo.category,
        content: parsedContent,
        rawContent: content, // 保存原始内容，方便主题切换时重新渲染
      },
      theme: theme.current.value, // 保存当前主题，用于渲染
    };

    await addOutput(conversation, newOutput);
  } catch (error) {
    await addOutput(conversation, {
      type: "error",
      content: `File not found: ${fileName}`,
    });
  }
};

// tree命令 - 递归显示目录结构
const tree = async (context) => {
  const { currentDir, conversation, getDirIcon } = context;
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
      // 使用getDirIcon函数生成图标，而不是直接访问item.icon
      treeLines.push(`${indent}${newPrefix}${getDirIcon(item)} ${item.name}`);

      // 递归处理子目录
      if (item.type === "dir") {
        // 使用resolvePath处理路径，确保路径格式正确
        const subDirPath = resolvePath(dirPath, item.name);
        // 检查目标目录是否存在于articles中
        if (articles[subDirPath]) {
          treeLines.push(...generateTree(subDirPath, newIndent));
        }
      }
    }

    return treeLines;
  };

  // 添加根目录
  const treeLines = [`${getDirIcon({ type: "dir" })} .`];
  treeLines.push(...generateTree("/"));

  await addOutput(conversation, {
    type: "tree",
    content: treeLines.join("\n"),
  });
};

// help 命令
const help = async (context, ...args) => {
  const { conversation } = context;
  const showAll = args.includes("-l");

  // 常用命令列表（默认显示）
  const commonHelpText = `用法: <command> [options]

命令列表:

  ls                    列出目录内容
  cd <dir>              切换目录
  cat <file>            查看Markdown文件内容
  tree                  显示目录结构
  help                  显示此帮助信息
  size <num|default>    设置字体大小 (1-26|default)
  font [font-name]      显示当前字体或设置字体 (0xProto Nerd Font|Fira Code|Cascadia Code|JetBrains Mono)
  background [0-1]      显示当前背景设置或设置透明度
  wget <file>           下载文件

💡 提示: 输入 'help -l' 查看所有可用命令`;

  // 完整命令列表（使用 -l 参数时显示）
  const fullHelpText = `终端博客命令帮助

用法: <command> [options]

基本命令:

  ls                    列出目录内容
  cd <dir>              切换目录
  cat <file>            查看Markdown文件内容
  tree                  显示完整目录结构
  find <term>           搜索文章名称
  wget <file>           下载文件

网络命令:

  ipconfig              显示网络配置信息
  ping <host>           发送ICMP回显请求

终端设置:

  size <num|default>    设置字体大小 (1-26|default)
  font [font-name]      显示当前字体或设置字体
                        可用字体: 0xProto Nerd Font, Fira Code, Cascadia Code, JetBrains Mono
  background            显示当前背景设置
  background <0-1>      设置背景透明度 (0-1之间的数值)
  background opacity <0-1> 设置背景透明度
  background image <path>  设置背景图片路径
  theme                 显示当前主题和可用主题
  theme <name>          设置Markdown主题
                        可用主题: default, dark, light, solarized, dracula

实用命令:

  echo <message>        打印消息
  clear                 清空终端
  help                  显示此帮助信息
  help -l               显示完整帮助信息
  test-config           测试配置加载
  clear-config          清除所有配置和历史命令

💡 提示: 输入命令名称后按Tab键可进行自动补全`;

  const helpText = showAll ? fullHelpText : commonHelpText;
  await addOutput(conversation, { type: "help", content: helpText });
};

// clear 命令
const clear = async (context) => {
  const { conversations, showWelcome } = context;
  conversations.value = [];
  showWelcome.value = false;
};

// size 命令
const size = async (context, size) => {
  const { conversation, updateTomlConfig } = context;
  if (size === "default") {
    // 更新TOML配置中的字体大小为默认值
    const success = updateTomlConfig({
      ui: {
        fontSize: "18",
      },
    });

    if (success) {
      await addOutput(conversation, {
        type: "success",
        content: "Font size set to default (18px)",
      });
    } else {
      await addOutput(conversation, {
        type: "error",
        content: "Failed to update font size. Please try again.",
      });
    }
  } else {
    // 尝试将size转换为数字
    const sizeNum = parseInt(size);
    // 检查是否为1-26之间的有效数字
    if (!isNaN(sizeNum) && sizeNum >= 1 && sizeNum <= 26) {
      // 更新TOML配置中的字体大小
      const success = updateTomlConfig({
        ui: {
          fontSize: sizeNum.toString(),
        },
      });

      if (success) {
        await addOutput(conversation, {
          type: "success",
          content: `Font size set to ${sizeNum}px`,
        });
      } else {
        await addOutput(conversation, {
          type: "error",
          content: "Failed to update font size. Please try again.",
        });
      }
    } else {
      await addOutput(conversation, {
        type: "error",
        content: "Usage: size <1-26|default>",
      });
    }
  }
};

// background 命令
const background = async (context, ...args) => {
  const { conversation, background: bg, updateTomlConfig } = context;

  if (args.length === 0) {
    // 显示当前背景设置
    await addOutput(conversation, {
      type: "info",
      content: `Current background settings:
  Image: ${bg.image.value}
  Opacity: ${bg.opacity.value}`,
    });
  } else if (args.length === 1) {
    // 只有一个参数时，直接作为透明度处理
    const opacity = args[0];
    const opacityNum = parseFloat(opacity);
    if (!isNaN(opacityNum) && opacityNum >= 0 && opacityNum <= 1) {
      // 更新TOML配置中的背景透明度
      const success = updateTomlConfig({
        background: {
          opacity: opacityNum.toString(),
        },
      });

      if (success) {
        await addOutput(conversation, {
          type: "success",
          content: `Background opacity set to ${opacity}`,
        });
      } else {
        await addOutput(conversation, {
          type: "error",
          content: "Failed to update background opacity. Please try again.",
        });
      }
    } else {
      await addOutput(conversation, {
        type: "error",
        content:
          "Usage: background <0-1> | background opacity <0-1> | background image <path>",
      });
    }
  } else if (args[0] === "opacity") {
    // 设置背景透明度
    const opacity = args[1];
    const opacityNum = parseFloat(opacity);
    if (!isNaN(opacityNum) && opacityNum >= 0 && opacityNum <= 1) {
      // 更新TOML配置中的背景透明度
      const success = updateTomlConfig({
        background: {
          opacity: opacityNum.toString(),
        },
      });

      if (success) {
        await addOutput(conversation, {
          type: "success",
          content: `Background opacity set to ${opacity}`,
        });
      } else {
        await addOutput(conversation, {
          type: "error",
          content: "Failed to update background opacity. Please try again.",
        });
      }
    } else {
      await addOutput(conversation, {
        type: "error",
        content: "Usage: background <0-1> | background opacity <0-1>",
      });
    }
  } else if (args[0] === "image") {
    // 设置背景图片
    const imagePath = args[1];
    if (!imagePath) {
      await addOutput(conversation, {
        type: "error",
        content: "Usage: background image <path>",
      });
      return;
    }

    // 验证图片路径格式
    let isValidUrl = false;
    try {
      // 尝试解析为URL
      new URL(imagePath);
      isValidUrl = true;
    } catch {
      // 不是URL，可能是本地路径
      isValidUrl = false;
    }

    // 本地路径需要以/开头
    if (!isValidUrl && !imagePath.startsWith("/")) {
      await addOutput(conversation, {
        type: "error",
        content: "Local image path must start with /",
      });
      return;
    }

    // 更新TOML配置中的背景图片
    const success = updateTomlConfig({
      background: {
        image: imagePath,
      },
    });

    if (success) {
      await addOutput(conversation, {
        type: "success",
        content: `Background image set to ${imagePath}`,
      });

      // 显示当前背景设置，让用户确认修改
      await addOutput(conversation, {
        type: "info",
        content: `Current background settings:
  Image: ${bg.image.value}
  Opacity: ${bg.opacity.value}`,
      });
    } else {
      await addOutput(conversation, {
        type: "error",
        content: "Failed to update background image. Please try again.",
      });
    }
  } else {
    await addOutput(conversation, {
      type: "error",
      content:
        "Usage: background <0-1> | background opacity <0-1> | background image <path>",
    });
  }
};

// ipconfig 命令
const ipconfig = async (context) => {
  const { conversation } = context;
  // 辅助函数：获取本地IP
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

      // 注册超时，如果2秒没拿到，就放弃
      const timeoutId = setTimeout(() => {
        pc.close();
        resolve(null);
      }, 2000);

      pc.onicecandidate = (ice) => {
        if (ice && ice.candidate && ice.candidate.candidate) {
          // 使用正则提取 IP
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

      // 建立伪连接通道触发 candidate 收集
      pc.createDataChannel("");
      pc.createOffer()
        .then((sdp) => pc.setLocalDescription(sdp, noop, noop))
        .catch(() => {});
    });
  };

  // 提示正在加载
  await addOutput(conversation, {
    type: "info",
    content: "Checking network configuration...",
  });

  try {
    // 1. 并行获取公网IP和局域网IP
    const publicIpPromise = fetch("https://api.ipify.org?format=json")
      .then((res) => res.json())
      .then((data) => data.ip)
      .catch(() => "Unknown");

    // 使用上面的 WebRTC 函数获取局域网IP
    const localIpPromise = getLocalIP();

    const [publicIp, realLocalIp] = await Promise.all([
      publicIpPromise,
      localIpPromise,
    ]);

    // 如果 WebRTC 被屏蔽(返回null)，则生成一个模拟的 IP
    const displayLocalIp =
      realLocalIp ||
      `192.168.1.${Math.floor(Math.random() * 200 + 20)} (Simulated)`;
    const isSimulated = !realLocalIp;

    const info = [
      `\nWindows IP Configuration\n`,
      `Ethernet adapter Ethernet 0:`,
      `   Connection-specific DNS Suffix  . : localdomain`,
      `   Link-local IPv6 Address . . . . . : fe80::${Math.floor(
        Math.random() * 9999
      )}%11`,
      `   IPv4 Address. . . . . . . . . . . : ${displayLocalIp} ${
        isSimulated
          ? "<- Browser privacy blocked real IP"
          : "<- Detected via WebRTC>"
      }`,
      `   Subnet Mask . . . . . . . . . . . : 255.255.255.0`,
      `   Default Gateway . . . . . . . . . : 192.168.1.1`,
      `\nWide Area Network (WAN) stats:`,
      `   Public IP Address . . . . . . . . : ${publicIp}`,
    ];

    await addOutput(conversation, {
      type: "success",
      content: info.join("\n"),
    });
  } catch (e) {
    await addOutput(conversation, {
      type: "error",
      content: "Error reading network configuration.",
    });
  }
};

// ping 命令
const ping = async (context, target = "localhost") => {
  const { conversation } = context;
  // 辅助函数：强制等待渲染完成
  const updateView = async (delay = 100) => {
    await nextTick();
    await new Promise((r) => setTimeout(r, delay));
  };

  if (!target) {
    await addOutput(conversation, {
      type: "error",
      content: "Usage: ping <domain or ip>",
    });
    return;
  }

  // URL 格式化处理
  let url = target.trim();
  url = url.replace(/\/$/, "");

  // 补全协议
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }

  const displayUrl = url.replace(/^https?:\/\//, "");

  // 统计数据容器
  const stats = {
    sent: 0,
    received: 0,
    times: [],
  };

  // 输出头部
  await addOutput(conversation, {
    type: "info",
    content: `Pinging ${displayUrl} [TCP/HTTP Simulation] with 32 bytes of data:`,
  });
  await updateView(500);

  // 循环发送 4 次请求
  for (let i = 0; i < 4; i++) {
    stats.sent++;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    const start = performance.now();
    let outputLine;

    try {
      // 发起请求
      await fetch(url, {
        mode: "no-cors",
        cache: "no-store",
        signal: controller.signal,
      });

      // 计算时间
      const end = performance.now();
      clearTimeout(timeoutId);

      const time = (end - start).toFixed(0);
      stats.times.push(parseInt(time));
      stats.received++;

      outputLine = {
        type: "success",
        content: `Reply from ${displayUrl}: time=${time}ms protocol=HTTP/HTTPS`,
      };
    } catch (err) {
      clearTimeout(timeoutId);
      let errorMsg = "Request timed out.";
      if (err.name !== "AbortError") {
        errorMsg = "Destination host unreachable (Network/CORS Error).";
      }
      outputLine = {
        type: "error",
        content: errorMsg,
      };
    }

    // 立即输出单行结果
    await addOutput(conversation, outputLine);
    await updateView(100);

    // 模拟 Ping 的间隔 (1秒)，只有前3次需要额外等待
    if (i < 3) {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  // 计算并输出统计结果
  await addOutput(conversation, { type: "info", content: "" });
  await updateView(200);

  const lost = stats.sent - stats.received;
  const lostPercent = Math.round((lost / stats.sent) * 100);

  let min = 0,
    max = 0,
    avg = 0;
  if (stats.times.length > 0) {
    min = Math.min(...stats.times);
    max = Math.max(...stats.times);
    avg = Math.round(
      stats.times.reduce((a, b) => a + b, 0) / stats.times.length
    );
  }

  // 准备统计信息的行
  const statsLines = [
    `Ping statistics for ${displayUrl}:`,
    `    Packets: Sent = ${stats.sent}, Received = ${stats.received}, Lost = ${lost} (${lostPercent}% loss),`,
    `Approximate round trip times in milli-seconds:`,
    `    Minimum = ${min}ms, Maximum = ${max}ms, Average = ${avg}ms`,
  ];

  // 逐行输出统计信息
  for (const lineContent of statsLines) {
    await addOutput(conversation, {
      type: "info",
      content: lineContent,
    });
    await updateView(150);
  }
};

// theme 命令
const theme = async (context, ...args) => {
  const { conversation, theme, updateTomlConfig } = context;
  if (args.length === 0) {
    // 显示当前主题和可用主题
    await addOutput(conversation, {
      type: "info",
      content: `Current theme: ${
        theme.current.value
      }\nAvailable themes: ${theme.available.value.join(", ")}`,
    });
  } else if (args.length === 1) {
    const requestedTheme = args[0];
    if (theme.available.value.includes(requestedTheme)) {
      // 更新TOML配置中的主题
      const success = updateTomlConfig({
        theme: {
          current: requestedTheme,
        },
      });

      if (success) {
        await addOutput(conversation, {
          type: "success",
          content: `Theme set to ${requestedTheme}`,
        });
      } else {
        await addOutput(conversation, {
          type: "error",
          content: `Failed to update theme. Please try again.`,
        });
      }
    } else {
      await addOutput(conversation, {
        type: "error",
        content: `Theme not found: ${requestedTheme}\nAvailable themes: ${theme.available.value.join(
          ", "
        )}`,
      });
    }
  }
};

// echo 命令
const echo = async (context, ...args) => {
  const { conversation } = context;
  const message = args.join(" ");
  await addOutput(conversation, {
    type: "output",
    content: message,
  });
};

// font 命令 - 修改字体
const font = async (context, ...args) => {
  const { conversation, updateTomlConfig } = context;
  const availableFonts = [
    "0xProto Nerd Font",
    "Fira Code",
    "Cascadia Code",
    "JetBrains Mono",
  ];
  const defaultFont = "Cascadia Code"; // 默认字体，避免文件图标乱码

  if (args.length === 0) {
    // 显示当前字体设置和可用字体 - 从上下文中获取currentFont
    const { font } = context;
    await addOutput(conversation, {
      type: "info",
      content: `Current font: ${
        font.family.value
      }\nAvailable fonts: ${availableFonts.join(", ")}, default`,
    });
  } else {
    const fontName = args.join(" ");
    if (availableFonts.includes(fontName)) {
      // 更新TOML配置中的字体
      const success = updateTomlConfig({
        ui: {
          fontFamily: fontName,
        },
      });

      if (success) {
        await addOutput(conversation, {
          type: "success",
          content: `Font set to ${fontName}`,
        });
      } else {
        await addOutput(conversation, {
          type: "error",
          content: "Failed to update font. Please try again.",
        });
      }
    } else if (fontName === "default") {
      // 切换回默认字体
      const success = updateTomlConfig({
        ui: {
          fontFamily: defaultFont,
        },
      });

      if (success) {
        await addOutput(conversation, {
          type: "success",
          content: `Font set to default (${defaultFont})`,
        });
      } else {
        await addOutput(conversation, {
          type: "error",
          content: "Failed to update font. Please try again.",
        });
      }
    } else {
      await addOutput(conversation, {
        type: "error",
        content: `Font not found: ${fontName}\nAvailable fonts: ${availableFonts.join(
          ", "
        )}, default`,
      });
    }
  }
};

// test-config 命令 - 测试配置是否正确加载
const testConfig = async (context) => {
  const { conversation, user, fontSize, background, theme } = context;
  await addOutput(conversation, {
    type: "info",
    content: `Current configuration:\n  User: ${user.value}\n  Font Size: ${
      fontSize.value
    }\n  Background:\n    Image: ${background.image.value}\n    Opacity: ${
      background.opacity.value
    }\n  Theme: ${
      theme.current.value
    }\n  Available Themes: ${theme.available.value.join(", ")}`,
  });
};

// find 命令 - 搜索文章
const find = async (context, ...args) => {
  const { conversation } = context;
  const searchTerm = args.join(" ");

  if (!searchTerm) {
    await addOutput(conversation, {
      type: "error",
      content: "Usage: find <article_name>",
    });
    return;
  }

  // 递归搜索所有文章
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

  // 从根目录开始搜索
  searchInDir("/", articles["/"].content);

  if (searchResults.length === 0) {
    await addOutput(conversation, {
      type: "info",
      content: `No articles found matching "${searchTerm}"`,
    });
  } else {
    const resultContent = [
      `Found ${searchResults.length} article(s) matching "${searchTerm}":`,
      "",
    ];

    searchResults.forEach((result) => {
      resultContent.push(
        `${result.icon} ${result.path}/${result.name} (${result.category})`
      );
    });

    await addOutput(conversation, {
      type: "info",
      content: resultContent.join("\n"),
    });
  }
};

// wget 命令 - 使用跳转来实现下载
const getFileUrlFromPath = (filePath) => {
  // 递归查找文件的URL
  const findFile = (content) => {
    for (const item of content) {
      if (item.type === "file" && item.name === filePath) {
        return item.url;
      }
      if (item.type === "dir" && item.content) {
        const found = findFile(item.content);
        if (found) {
          return found;
        }
      }
    }
    return null;
  };

  // 从根目录开始查找
  const rootContent = articles["/"].content;
  return findFile(rootContent);
};

const wget = async (context, ...args) => {
  const { conversation, getArticleInfo } = context;
  if (args.length === 0) {
    await addOutput(conversation, {
      type: "error",
      content: "Usage: wget <file_name>",
    });
    return;
  }

  const fileName = args[0];

  // 特殊处理config.toml文件
  if (fileName === "config.toml") {
    try {
      // 从localStorage获取config.toml内容
      const content = localStorage.getItem("terminalConfigToml") || "";

      // 创建Blob对象
      const blob = new Blob([content], { type: "text/toml" });

      // 创建下载链接
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "config.toml";

      // 触发下载
      document.body.appendChild(a);
      a.click();

      // 清理
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      await addOutput(conversation, {
        type: "success",
        content: `Starting download: ${fileName}`,
      });
      await addOutput(conversation, {
        type: "info",
        content: `Downloading config.toml from localStorage`,
      });
      return;
    } catch (error) {
      await addOutput(conversation, {
        type: "error",
        content: `Error downloading config.toml: ${error.message}`,
      });
      return;
    }
  }

  // 使用getArticleInfo函数查找文件（支持整个文件系统查找）
  const file = getArticleInfo(fileName, "/");

  let fileUrl = null;

  if (file) {
    // 如果文件有URL属性，直接使用
    if (file.url) {
      fileUrl = file.url;
    }
    // 如果是md文件且没有URL，使用文件的path属性或构建默认路径
    else if (fileName.endsWith(".md")) {
      fileUrl = file.path || `/post/${fileName}`;
    }
  }

  if (fileUrl) {
    // 在新标签页中打开下载链接，不覆盖当前页面
    window.open(fileUrl, "_blank");
    await addOutput(conversation, {
      type: "success",
      content: `Starting download: ${fileName}`,
    });
    await addOutput(conversation, {
      type: "info",
      content: `Downloading from: ${fileUrl}`,
    });
  } else {
    await addOutput(conversation, {
      type: "error",
      content: `File not found: ${fileName}`,
    });
  }
};

// clear config 命令 - 清除所有样式设置和历史命令
const clearConfig = async (context, ...args) => {
  const {
    conversation,
    fontSize,
    font,
    background,
    theme,
    uiStyles,
    conversations,
    clearHistory,
  } = context;

  // 清除localStorage中的设置、历史命令和缓存的TOML配置
  localStorage.removeItem("terminalSettings");
  localStorage.removeItem("terminalHistory");
  localStorage.removeItem("terminalConfigToml");

  // 重置应用程序状态
  // 重置字体大小
  if (fontSize) {
    fontSize.value = "18"; // 恢复默认字体大小，匹配config.toml中的设置
  }

  // 重置字体
  if (font && font.family) {
    font.family.value = "Cascadia Code"; // 恢复默认字体
  }

  // 重置背景
  if (background) {
    if (background.image) {
      background.image.value = "/background.jpg"; // 恢复默认背景图片
    }
    if (background.opacity) {
      background.opacity.value = 0.9; // 恢复默认背景透明度
    }
  }

  // 重置主题 - 使用uiStyles而不是只读的computed属性
  if (uiStyles && uiStyles.value && uiStyles.value.theme) {
    uiStyles.value.theme.current = "default"; // 恢复默认主题
  } else if (theme && theme.current) {
    // 兼容旧代码，尝试直接修改theme.current.value
    try {
      theme.current.value = "default";
    } catch (e) {
      // 如果修改失败，忽略错误
    }
  }

  // 重置历史命令
  if (clearHistory) {
    clearHistory(); // 调用App.vue中定义的清除历史命令函数
  }

  // 显示成功信息
  await addOutput(conversation, {
    type: "success",
    content: "All configuration and history have been cleared!",
  });

  // 清空对话历史
  if (conversations && conversations.value) {
    conversations.value = [];
  }

  // 不再需要提示用户刷新页面，因为状态已经立即更新
  await addOutput(conversation, {
    type: "info",
    content: "All settings have been reset to default values.",
  });
};

// 命令映射
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
};

// 默认导出，方便更优雅的导入
export default commands;
