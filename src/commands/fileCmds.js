import { marked } from "marked";
import { resolvePath } from "../composables/utils";
import {
  articles,
  getArticleInfo,
  getDirIcon,
} from "../composables/fileSystem";
import { CommandAPI } from "../composables/CommandAPI";

// ls 命令
export const ls = async (rawContext, ...args) => {
  const cmd = new CommandAPI(rawContext, args);
  const targetDir = cmd.args[0];
  const { currentDir } = cmd.raw;
  
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
export const cd = async (rawContext, ...args) => {
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

// cat 命令
export const viewFile = async (rawContext, ...args) => {
  const cmd = new CommandAPI(rawContext, args);
  const fileName = cmd.args[0];

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
export const tree = async (rawContext, ...args) => {
  const cmd = new CommandAPI(rawContext, args);

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

// find 命令
export const find = async (rawContext, ...args) => {
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
export const wget = async (rawContext, ...args) => {
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
