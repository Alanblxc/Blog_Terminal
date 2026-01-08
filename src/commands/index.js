import { nextTick } from "vue";
import { marked } from "marked";

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
  const { articles, currentDir, conversation } = context;
  let targetPath = currentDir;

  // 如果指定了目录，计算目标路径
  if (targetDir) {
    if (targetDir.startsWith("/")) {
      // 绝对路径
      targetPath = targetDir;
    } else {
      // 相对路径
      targetPath =
        currentDir === "/" ? `/${targetDir}` : `${currentDir}/${targetDir}`;
    }
  }

  const targetContent = articles[targetPath];
  if (targetContent && targetContent.type === "dir") {
    // 将目录和文件分开，先显示目录，再显示文件
    const dirs = targetContent.content.filter((item) => item.type === "dir");
    const files = targetContent.content.filter((item) => item.type === "file");

    // 合并结果：目录在前，文件在后
    const sortedContent = [...dirs, ...files];

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
  const { articles, currentDirRef, conversation } = context;
  if (!dir) {
    return;
  }

  let targetPath;

  // 处理绝对路径（以/开头）
  if (dir.startsWith("/")) {
    targetPath = dir;
  }
  // 处理相对路径
  else {
    // 将当前目录和目标目录合并
    const currentPathParts = currentDirRef.value.split("/").filter(Boolean);
    const dirParts = dir.split("/").filter(Boolean);

    // 处理特殊路径组件
    for (const part of dirParts) {
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
    targetPath = "/" + currentPathParts.join("/");
  }

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
  const { articles, currentDir, conversation, getArticleInfo, theme } = context;
  if (!fileName) {
    await addOutput(conversation, {
      type: "error",
      content: "Usage: cat <file.md>",
    });
    return;
  }

  // 获取文章信息
  const articleInfo = getArticleInfo(fileName);
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
  const { articles, currentDir, conversation, getDirIcon } = context;
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
      treeLines.push(`${indent}${newPrefix}${item.icon} ${item.name}`);

      // 递归处理子目录
      if (item.type === "dir") {
        const subDirPath =
          dirPath === "/" ? `/${item.name}` : `${dirPath}/${item.name}`;
        treeLines.push(...generateTree(subDirPath, newIndent));
      }
    }

    return treeLines;
  };

  // 添加根目录
  const treeLines = [`${getDirIcon()} .`];
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
  const commonHelpText = `Available commands:\n\nls                    - List directory contents\ncd <dir>              - Change directory\ncat <file>            - Read markdown file\ntree                  - Display directory structure\nhelp                  - Show this help message\nsize <num|default>    - Set font size (12|14|16|18|20|24|default)\n\n💡 Type 'help -l' to see all available commands`;

  // 完整命令列表（使用 -l 参数时显示）
  const fullHelpText = `Available commands:\n\nls                    - List directory contents\ncd <dir>              - Change directory\ncat <file>            - Read markdown file\ntree                  - Display directory structure\nipconfig              - Show network configuration\nping <host>           - Send ICMP echo requests\nsize <num|default>    - Set font size (12|14|16|18|20|24|default)\nbackground            - Show current background settings\nbackground opacity <0-1> - Set background opacity\nbackground image <path>  - Set background image\ntheme                 - Show current theme and available themes\ntheme <name>          - Set markdown theme (default, dark, light, solarized, dracula)\necho <message>        - Print a message\nclear                 - Clear terminal\nhelp                  - Show this help message\n\n💡 Type 'help' without arguments to see only common commands`;

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
  const { conversation, fontSize } = context;
  if (size === "default") {
    fontSize.value = "16";
    await addOutput(conversation, {
      type: "success",
      content: "Font size set to default (16px)",
    });
  } else if (size && ["12", "14", "16", "18", "20", "24"].includes(size)) {
    fontSize.value = size;
    await addOutput(conversation, {
      type: "success",
      content: `Font size set to ${size}px`,
    });
  } else {
    await addOutput(conversation, {
      type: "error",
      content: "Usage: size <12|14|16|18|20|24|default>",
    });
  }
};

// background 命令
const background = async (context, ...args) => {
  const { conversation, background } = context;
  const { image: backgroundImage, opacity: backgroundOpacity } = background;

  if (args.length === 0) {
    // 显示当前背景设置
    await addOutput(conversation, {
      type: "info",
      content: `Current background settings:\n  Image: ${backgroundImage.value}\n  Opacity: ${backgroundOpacity.value}`,
    });
  } else if (args[0] === "opacity") {
    // 设置背景透明度
    const opacity = args[1];
    const opacityNum = parseFloat(opacity);
    if (!isNaN(opacityNum) && opacityNum >= 0 && opacityNum <= 1) {
      backgroundOpacity.value = opacityNum.toString();
      await addOutput(conversation, {
        type: "success",
        content: `Background opacity set to ${opacity}`,
      });
    } else {
      await addOutput(conversation, {
        type: "error",
        content: "Usage: background opacity <0-1>",
      });
    }
  } else if (args[0] === "image") {
    // 设置背景图片
    const imagePath = args[1];
    backgroundImage.value = imagePath;
    await addOutput(conversation, {
      type: "success",
      content: `Background image set to ${imagePath}`,
    });
  } else {
    await addOutput(conversation, {
      type: "error",
      content: "Usage: background [opacity <0-1>|image <path>]",
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
  const { conversation, theme } = context;
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
      theme.current.value = requestedTheme;
      await addOutput(conversation, {
        type: "success",
        content: `Theme set to ${requestedTheme}`,
      });
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

// test-config 命令 - 测试配置是否正确加载
const testConfig = async (context) => {
  const {
    conversation,
    user,
    fontSize,
    fontFamily,
    infoBar,
    background,
    theme,
  } = context;
  await addOutput(conversation, {
    type: "info",
    content: `Current configuration:\n  User: ${user.value}\n  Font: ${
      fontFamily.value
    }\n  Font Size: ${fontSize.value}\n  Info Bar:\n    Background: ${
      infoBar.backgroundColor
    }\n    Text: ${infoBar.textColor}\n    Border: ${
      infoBar.borderColor
    }\n  Background:\n    Image: ${background.image.value}\n    Opacity: ${
      background.opacity.value
    }\n    Position: ${background.position.value}\n    Size: ${
      background.size.value
    }\n    Repeat: ${background.repeat.value}\n  Theme: ${
      theme.current.value
    }\n  Available Themes: ${theme.available.value.join(
      ", "
    )}\n  Theme Colors for ${theme.current.value}:\n    Background: ${
      theme.colors.value[theme.current.value]?.background || "N/A"
    }\n    Text: ${
      theme.colors.value[theme.current.value]?.text || "N/A"
    }\n    Prompt: ${
      theme.colors.value[theme.current.value]?.prompt || "N/A"
    }\n    Command: ${
      theme.colors.value[theme.current.value]?.command || "N/A"
    }\n    Directory: ${
      theme.colors.value[theme.current.value]?.directory || "N/A"
    }\n    File: ${
      theme.colors.value[theme.current.value]?.file || "N/A"
    }\n    Error: ${theme.colors.value[theme.current.value]?.error || "N/A"}`,
  });
};

// find 命令 - 搜索文章
const find = async (context, ...args) => {
  const { conversation, articles } = context;
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
const getFileUrlFromPath = (filePath, context) => {
  const { articles } = context;
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
  const { articles, currentDir, conversation } = context;
  if (args.length === 0) {
    await addOutput(conversation, {
      type: "error",
      content: "Usage: wget <file_name>",
    });
    return;
  }

  const fileName = args[0];

  // 查找当前目录下的文件
  const currentContent = articles[currentDir];
  if (currentContent && currentContent.type === "dir") {
    const file = currentContent.content.find(
      (item) => item.type === "file" && item.name === fileName
    );

    if (file) {
      let fileUrl;

      // 如果文件有URL属性，直接使用
      if (file.url) {
        fileUrl = file.url;
      }
      // 如果是md文件且没有URL，构建本地文件路径
      else if (fileName.endsWith(".md")) {
        // 构建文件路径，假设文章文件都在post目录下
        // 例如：当前目录是 /tech，文件是 vue3-intro.md，那么路径是 /post/tech/vue3-intro.md
        const postPath =
          currentDir === "/"
            ? `/post/${fileName}`
            : `${currentDir.replace("/", "/post/")}/${fileName}`;
        fileUrl = postPath;
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
        return;
      }
    }
  }

  // 如果当前目录没有找到，尝试从根目录查找
  const fileUrl = getFileUrlFromPath(fileName, context);

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
  "test-config": testConfig,
  find,
  wget,
};

// 默认导出，方便更优雅的导入
export default commands;
