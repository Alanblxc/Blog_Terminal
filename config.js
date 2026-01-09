import fs from "fs";
import path from "path";
import { parse } from "@iarna/toml";

// 配置
const POSTS_DIR = "./public/post";
const OUTPUT_FILE = "./posts.json";

// 读取目录结构
function readDirectory(dirPath) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const result = [];

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      // 递归读取子目录
      const content = readDirectory(fullPath);
      result.push({
        name: entry.name,
        type: "dir",
        icon: "", // Nerd Font文件夹图标
        content,
      });
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      // 处理markdown文件
      result.push({
        name: entry.name,
        type: "file",
        icon: "", // Nerd Font文件图标
        title: entry.name.replace(".md", ""), // 初始化为文件名，用户可以手动修改
        date: new Date().toISOString().split("T")[0], // 初始化为当前日期，用户可以手动修改
        category: path.basename(dirPath), // 使用目录名作为分类
        path: fullPath.replace(/\\/g, "/"), // 转换为Linux路径格式
      });
    }
  }

  return result;
}

// 生成posts.json结构，直接使用post目录的内容作为根目录
let posts = readDirectory(POSTS_DIR);

// 确保post目录下的Readme.md正常显示，不添加项目根目录的README.md
// 不需要添加项目根目录的README.md，只使用post目录下的内容
posts = posts
  .map((item) => {
    return item;
  })
  .filter(Boolean);

// 解析config.toml并生成download目录结构
function generateDownloadDir() {
  try {
    // 读取config.toml文件
    const tomlContent = fs.readFileSync("./config.toml", "utf8");
    const tomlData = parse(tomlContent);

    // 创建download根目录
    const downloadDir = {
      name: "download",
      type: "dir",
      icon: "", // Nerd Font文件夹图标
      content: [],
    };

    // 遍历TOML数据中的download部分，生成目录和文件
    if (tomlData.download) {
      for (const [subDirName, files] of Object.entries(tomlData.download)) {
        // 创建子目录
        const subDir = {
          name: subDirName,
          type: "dir",
          icon: "", // Nerd Font文件夹图标
          content: [],
        };

        // 添加文件到子目录
        for (const [fileName, fileUrl] of Object.entries(files)) {
          subDir.content.push({
            name: fileName,
            type: "file",
            icon: "", // Nerd Font文件图标
            title: fileName,
            date: new Date().toISOString().split("T")[0],
            category: subDirName,
            path: `download/${subDirName}/${fileName}`,
            url: fileUrl, // 保存文件链接
          });
        }

        // 添加子目录到download目录
        downloadDir.content.push(subDir);
      }
    }

    return downloadDir;
  } catch (error) {
    console.error(`⚠️  Error parsing config.toml: ${error.message}`);
    return null;
  }
}

// 生成download目录并添加到posts数组
const downloadDir = generateDownloadDir();
if (downloadDir) {
  posts.push(downloadDir);
}

// 生成最终的JSON对象
const postsJson = {
  posts,
};

// 写入文件
fs.writeFileSync(OUTPUT_FILE, JSON.stringify(postsJson, null, 2));

console.log(`✓ posts.json generated successfully!`);
console.log(`📄 Output file: ${OUTPUT_FILE}`);
console.log(`📁 Posts directory: ${POSTS_DIR}`);
console.log(`📝 Total directories: ${posts.length}`);

// 统计文件数量
const totalFiles = posts.reduce((sum, item) => {
  if (item.type === "dir" && item.content) {
    return sum + item.content.length;
  }
  return sum;
}, 0);
console.log(`📄 Total files: ${totalFiles}`);

// -------------------------------------------------------------------------
// 资源复制逻辑
// -------------------------------------------------------------------------
const DIST_DIR = "./dist";

// 递归复制目录函数
function copyDirectory(src, dest) {
  if (!fs.existsSync(src)) {
    console.warn(`⚠️  Source directory not found: ${src}`);
    return;
  }
  
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// 复制单个文件函数
function copyFile(src, dest) {
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`✓ Copied: ${src} -> ${dest}`);
  } else {
    console.warn(`⚠️  Source file not found: ${src}`);
  }
}

// 执行复制任务
if (fs.existsSync(DIST_DIR)) {
  console.log("\n🚀 Starting post-build copy tasks...");

  // 1. 复制 public 目录 -> dist/public
  // 用户明确要求保留 public 文件夹结构
  const publicSrc = "./public";
  const publicDest = path.join(DIST_DIR, "public");
  console.log(`📁 Copying public directory to ${publicDest}...`);
  copyDirectory(publicSrc, publicDest);
  console.log(`✓ Copied public directory`);

  // 2. 复制 config.toml -> dist/config.toml
  copyFile("./config.toml", path.join(DIST_DIR, "config.toml"));
  
  // 3. 复制 README.md (可选，但推荐)
  copyFile("./README.md", path.join(DIST_DIR, "README.md"));

  // 4. 创建 .nojekyll 文件以适配 GitHub Pages
  fs.writeFileSync(path.join(DIST_DIR, ".nojekyll"), "");
  console.log(`✓ Created: .nojekyll in ${DIST_DIR}`);

  console.log("\n✅ All build assets copied successfully!");
} else {
  console.warn(`\n⚠️  Dist directory not found at ${DIST_DIR}. Make sure to run 'npm run build' before this script if you intend to deploy.`);
}

console.log(
  `\n💡 Hint: You can now edit ${OUTPUT_FILE} to update article titles, dates, etc.`
);
