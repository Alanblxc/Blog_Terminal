import postsData from "../../posts.json";

// 初始化articles对象
export const articles = {
  "/": {
    type: "dir",
    content: postsData.posts,
  },
};

// 递归构建所有目录的articles对象
function buildArticles(dirPath, content) {
  content.forEach((item) => {
    if (item.type === "dir" && item.content) {
      const fullPath =
        dirPath === "/" ? `/${item.name}` : `${dirPath}/${item.name}`;
      articles[fullPath] = {
        type: "dir",
        content: item.content,
      };
      // 递归构建子目录
      buildArticles(fullPath, item.content);
    }
  });
}

// 构建所有目录
buildArticles("/", postsData.posts);

// 从posts.json中获取文章信息的辅助函数
export const getArticleInfo = (fileName, currentDir) => {
  // 首先在当前目录查找
  const currentContent = articles[currentDir];
  if (currentContent && currentContent.type === "dir") {
    // 在当前目录查找
    const currentFile = currentContent.content.find(
      (item) => item.type === "file" && item.name === fileName
    );
    if (currentFile) {
      return currentFile;
    }
  }

  // 如果当前目录没有找到，再递归查找整个postsData.posts
  // 递归查找文章
  function findArticle(content) {
    for (const item of content) {
      if (item.type === "file" && item.name === fileName) {
        return item;
      }
      if (item.type === "dir" && item.content) {
        const found = findArticle(item.content);
        if (found) {
          return found;
        }
      }
    }
    return null;
  }

  return findArticle(postsData.posts);
};

// 检查补全项是否为目录
export const isDir = (name, currentDir) => {
  const currentContent = articles[currentDir];
  if (currentContent && currentContent.type === "dir") {
    return currentContent.content.some(
      (item) => item.name === name && item.type === "dir"
    );
  }
  return false;
};

// 获取目录内容
const getDirContent = (dirPath) => {
  const dirContent = articles[dirPath];
  if (dirContent && dirContent.type === "dir") {
    return dirContent.content;
  }
  return null;
};

// 通用文件补全函数
export const getCompletionItems = (cmd, currentDir, arg) => {
  const currentContent = articles[currentDir];
  if (!currentContent || currentContent.type !== "dir") {
    return [];
  }

  // 确定补全类型：文件夹、文件或两者
  let itemTypes = [];
  if (cmd === "cd") {
    // cd只补全文件夹
    itemTypes = ["dir"];
  } else if (cmd === "cat" || cmd === "wget") {
    // cat和wget只补全文件
    itemTypes = ["file"];
  } else if (cmd === "ls") {
    // ls补全文件夹和文件
    itemTypes = ["dir", "file"];
  } else if (cmd === "vi") {
    // vi补全文件，特别是.md文件和config.toml
    itemTypes = ["file"];
  } else {
    // 默认补全文件夹和文件
    itemTypes = ["dir", "file"];
  }

  // 获取所有匹配类型的项
  let allItems = currentContent.content
    .filter((item) => itemTypes.includes(item.type))
    .map((item) => item.name);

  // 排序候选项
  allItems.sort();

  // 在根目录下为非cd命令添加config.toml
  if (currentDir === "/" && cmd !== "cd") {
    allItems.push("config.toml");
    allItems.sort();
  }

  // 如果有前缀，过滤匹配前缀的项
  if (arg) {
    return allItems.filter((item) => item.startsWith(arg));
  }

  return allItems;
};

// 导出获取目录内容的函数
export { getDirContent };
