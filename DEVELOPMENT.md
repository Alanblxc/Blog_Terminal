# 终端博客开发文档

## 1. 项目概述

这是一个基于Vue 3的终端风格博客应用，允许用户通过命令行界面浏览和阅读博客文章。应用支持丰富的终端命令，如ls、cd、cat、tree等，提供了良好的用户体验和交互性。

## 2. 技术栈

- **前端框架**: Vue 3 (Composition API with `<script setup>`)
- **构建工具**: Vite
- **Markdown解析**: marked
- **样式**: CSS (自定义终端样式)
- **数据格式**: JSON

## 3. 项目结构

```
blog-terminal/
├── src/
│   ├── commands/         # 命令处理模块
│   │   └── index.js      # 所有命令的集中管理
│   ├── App.vue           # 主应用组件
│   └── main.js           # 应用入口
├── post/                 # 博客文章目录
│   ├── Alan/             # 分类目录
│   ├── life/             # 分类目录
│   ├── study/            # 分类目录
│   └── tech/             # 分类目录
├── dist/                 # 构建输出目录
├── posts.json            # 文章数据和目录结构
├── generate-posts-json.js # 生成posts.json的脚本
├── copy-posts.js         # 复制post目录到dist的脚本
├── file.toml             # 下载文件配置
├── vite.config.js        # Vite配置
├── package.json          # 项目依赖和脚本
└── DEVELOPMENT.md        # 开发文档
```

## 4. 核心功能

### 4.1 终端界面
- 仿Linux终端风格的UI设计
- 支持命令行输入和输出
- 实时显示系统信息（时间、内存使用等）
- 响应式设计，支持移动设备

### 4.2 命令系统
- **ls**: 列出目录内容
- **cd**: 切换目录
- **cat**: 查看Markdown文件内容
- **tree**: 显示目录结构
- **help**: 显示帮助信息
- **clear**: 清空终端
- **size**: 设置字体大小
- **background**: 设置背景
- **ipconfig**: 显示网络配置
- **ping**: 测试网络连接
- **theme**: 设置Markdown主题
- **echo**: 输出文本
- **wget**: 下载文件

### 4.3 自动补全
- 支持命令补全
- 支持文件和目录补全
- 支持按顺序循环补全
- 支持前缀匹配补全

### 4.4 文章管理
- 支持多级目录结构
- 自动生成posts.json数据
- 支持Markdown渲染
- 支持主题切换

## 5. 代码架构

### 5.1 命令处理机制

命令系统采用模块化设计，所有命令集中在`src/commands/index.js`中管理。每个命令都是一个独立的函数，通过命令映射对象导出，便于添加和维护新命令。

```javascript
// 命令映射结构
export const commands = {
  ls: ls,
  cd: cd,
  cat: viewFile,
  // ... 其他命令
};
```

### 5.2 状态管理

应用使用Vue 3的Composition API进行状态管理，主要状态包括：

- `conversations`: 存储命令和输出历史
- `currentDir`: 当前工作目录
- `command`: 当前输入的命令
- `isCommandExecuting`: 命令执行状态
- `tabCompleteState`: 自动补全状态

### 5.3 文件系统模拟

应用通过`articles`对象模拟文件系统，该对象从`posts.json`生成，包含了所有文章和目录的结构信息。

```javascript
// articles对象结构
const articles = {
  '/': {
    type: 'dir',
    content: [/* 目录内容 */]
  },
  '/tech': {
    type: 'dir',
    content: [/* 目录内容 */]
  },
  // ... 其他目录
};
```

## 6. 开发流程

### 6.1 安装依赖

```bash
npm install
```

### 6.2 开发模式

```bash
npm run dev
```

该命令会：
1. 生成posts.json文件
2. 启动Vite开发服务器
3. 监听文件变化，自动热更新

### 6.3 构建生产版本

```bash
npm run build
```

该命令会：
1. 生成posts.json文件
2. 构建生产版本到dist目录
3. 复制post目录到dist

### 6.4 预览生产版本

```bash
npm run preview
```

启动本地服务器预览生产构建结果。

## 7. 命令开发指南

### 7.1 添加新命令

1. 在`src/commands/index.js`中定义命令函数
2. 将命令添加到`commands`映射对象中
3. 在`help`命令中添加命令说明

### 7.2 命令函数模板

```javascript
export const yourCommand = async (articles, currentDir, conversation, ...args) => {
  // 命令逻辑
  // 使用addOutput函数添加输出
  await addOutput(conversation, {
    type: 'output',
    content: 'Command output'
  });
};
```

### 7.3 命令参数

- `articles`: 文件系统对象
- `currentDir`: 当前工作目录
- `conversation`: 当前对话对象，用于添加输出
- `args`: 命令参数数组

## 8. 数据生成

### 8.1 posts.json生成

`posts.json`文件由`generate-posts-json.js`脚本自动生成，包含了所有文章的元数据和目录结构。脚本会遍历`post`目录，生成对应的JSON结构。

### 8.2 文章格式

每篇文章都是一个Markdown文件，存放在对应的分类目录中。文章的元数据（标题、日期、分类等）会在生成`posts.json`时自动提取或生成。

### 8.3 下载文件配置

下载文件通过`file.toml`配置，格式如下：

```toml
[download.example]
file1.txt = "https://example.com/file1.txt"
file2.zip = "https://example.com/file2.zip"
```

## 9. 主题系统

应用支持多种Markdown主题，可通过`theme`命令切换：

- default
- dark
- light
- solarized
- dracula

主题样式定义在CSS文件中，通过添加对应的CSS类实现主题切换。

## 10. 部署指南

### 10.1 静态部署

构建完成后，将`dist`目录中的所有文件部署到静态文件服务器即可。

### 10.2 服务器要求

- 支持静态文件服务
- 无需特殊服务器配置
- 支持HTML5 History模式（可选，用于更好的URL体验）

## 11. 性能优化

- 延迟加载：只在需要时加载文章内容
- 虚拟滚动：优化长列表性能
- 缓存机制：缓存已加载的文章内容
- 代码分割：使用Vite的自动代码分割功能

## 12. 浏览器兼容性

- Chrome/Edge (最新版本)
- Firefox (最新版本)
- Safari (最新版本)
- 支持现代浏览器的ES模块

## 13. 贡献指南

1. Fork仓库
2. 创建特性分支
3. 提交更改
4. 推送到分支
5. 创建Pull Request

## 14. 许可证

MIT License

## 15. 未来规划

- [ ] 支持用户认证
- [ ] 添加评论功能
- [ ] 支持文章搜索
- [ ] 支持自定义命令
- [ ] 添加更多主题
- [ ] 支持语法高亮
- [ ] 添加文件上传功能

## 16. 联系方式

如有问题或建议，欢迎通过GitHub Issues反馈。

---

**更新日期**: 2026-01-08
**版本**: 1.0.0