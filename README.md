# 终端博客

一个基于 Vue 3 + Vite 的终端风格博客应用。

## 功能特性

- 🖥️ 终端风格的用户界面
- 📝 Markdown 文章支持
- 📁 目录导航和文件浏览
- 🌙 多种主题支持
- 📱 响应式设计，适配移动端
- ⚡ 快速加载和渲染

## 技术栈

- Vue 3 (Composition API + `<script setup>`)
- Vite
- marked (Markdown 解析)
- Node.js (构建脚本)

## 快速开始

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

### 构建生产版本

```bash
npm run build
```

### 部署到 GitHub Pages

```bash
npm run deploy
```
> **注意**：该命令会自动执行构建并将 `dist` 目录推送到 `gh-pages` 分支。

## 项目结构

```
├── src/                    # 源代码目录
│   ├── components/         # Vue 组件
│   ├── commands/           # 命令处理函数
│   ├── composables/        # 组合式函数 (逻辑封装)
│   ├── App.vue             # 主应用组件
│   └── main.js             # 入口文件
├── public/                 # 静态资源目录
│   ├── post/               # 博客文章 (.md 文件)
│   └── background.jpg      # 终端背景图
├── config.js               # 自动化脚本 (生成 posts.json 并处理资源复制)
├── config.toml             # 应用配置文件 (用户可自定义界面和功能)
├── vite.config.js          # Vite 配置文件
└── package.json            # 项目依赖和脚本
```

## 命令说明

### 开发相关

- `npm run dev` - 启动开发服务器
- `npm run build` - 构建生产版本
- `npm run deploy` - 部署到 GitHub Pages
- `npm run generate-posts` - 生成 posts.json 文件
- `npm run copy-posts` - 复制文章目录到 dist

### 终端命令

在应用中可以使用以下命令：

- `ls` - 列出目录内容
- `cd <dir>` - 切换目录
- `cat <file>` - 查看文件内容
- `tree` - 显示目录结构
- `help` - 查看帮助信息
- `clear` - 清空终端
- `size <num>` - 设置字体大小
- `background` - 设置背景
- `theme <name>` - 切换主题

## 文章管理

1. 在 `post/` 目录下创建分类文件夹
2. 在分类文件夹中添加 Markdown 文章
3. 运行 `npm run generate-posts` 生成 posts.json
4. 启动开发服务器或构建生产版本

## 自定义配置

### 主题

修改 `src/App.vue` 中的 `theme` 配置来添加或修改主题。

### 背景

修改 `src/App.vue` 中的 `background` 配置来更改背景图片和透明度。

### 字体大小

通过 `size` 命令或修改 `src/App.vue` 中的 `fontSize` 配置来调整字体大小。

## 浏览器支持

- Chrome (推荐)
- Firefox
- Safari
- Edge

## 许可证

MIT
