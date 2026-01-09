import postsData from "../../posts.json";

// ... (保持 articles 初始化和 buildArticles 逻辑不变) ...
export const articles = {
  "/": {
    type: "dir",
    content: postsData.posts,
  },
};

function buildArticles(dirPath, content) {
  content.forEach((item) => {
    if (item.type === "dir" && item.content) {
      const fullPath =
        dirPath === "/" ? `/${item.name}` : `${dirPath}/${item.name}`;
      articles[fullPath] = {
        type: "dir",
        content: item.content,
      };
      buildArticles(fullPath, item.content);
    }
  });
}
buildArticles("/", postsData.posts);

// ---------------------------------------------------------
// [FIX] 添加缺失的 getDirIcon 导出函数
// ---------------------------------------------------------
export const getDirIcon = (item) => {
  if (item.type === "dir") {
    return "\ue5ff"; //  Nerd Font文件夹图标
  } else if (item.type === "link") {
    return "\uf0c1"; // 🔗 Nerd Font链接图标
  }
  return "\ue609"; //  Nerd Font文件图标
};

// ... (保持 getArticleInfo, isDir, getDirContent 不变) ...
export const getArticleInfo = (fileName, currentDir) => {
  const currentContent = articles[currentDir];
  if (currentContent && currentContent.type === "dir") {
    const currentFile = currentContent.content.find(
      (item) => item.type === "file" && item.name === fileName
    );
    if (currentFile) return currentFile;
  }
  function findArticle(content) {
    for (const item of content) {
      if (item.type === "file" && item.name === fileName) return item;
      if (item.type === "dir" && item.content) {
        const found = findArticle(item.content);
        if (found) return found;
      }
    }
    return null;
  }
  return findArticle(postsData.posts);
};

export const isDir = (name, currentDir) => {
  const currentContent = articles[currentDir];
  if (currentContent && currentContent.type === "dir") {
    return currentContent.content.some(
      (item) => item.name === name && item.type === "dir"
    );
  }
  return false;
};

export const getDirContent = (dirPath) => {
  const dirContent = articles[dirPath];
  if (dirContent && dirContent.type === "dir") {
    return dirContent.content;
  }
  return null;
};

// --- 重构的核心：通用补全获取函数 ---
export const getCompletionItems = (cmd, currentDir, arg) => {
  let candidates = [];

  // 1. 处理特殊命令的参数补全
  if (cmd === "theme") {
    candidates = ["default", "dark", "light", "solarized", "dracula"];
  } else if (cmd === "font") {
    candidates = [
      "0xProto Nerd Font",
      "Fira Code",
      "Cascadia Code",
      "JetBrains Mono",
      "default",
    ];
  } else if (cmd === "background") {
    candidates = ["opacity", "image"];
  } else {
    // 2. 处理文件/目录补全
    const currentContent = articles[currentDir];
    if (currentContent && currentContent.type === "dir") {
      let itemTypes = ["dir", "file"]; // 默认

      if (cmd === "cd") itemTypes = ["dir"];
      else if (cmd === "cat" || cmd === "wget" || cmd === "vi")
        itemTypes = ["file"];

      candidates = currentContent.content
        .filter((item) => itemTypes.includes(item.type))
        .map((item) => item.name);

      // 特殊补全规则
      if (
        currentDir === "/" &&
        (cmd === "vi" || cmd === "ls" || cmd === "cat")
      ) {
        candidates.push("config.toml");
      }
    }
  }

  // 排序
  candidates.sort();

  // 过滤匹配前缀
  if (arg) {
    return candidates.filter((item) => item.startsWith(arg));
  }

  return candidates;
};
