
// src/composables/CommandAPI.js
import { resolvePath, escapeHtml } from "./utils";

/**
 * CommandAPI 类
 * 
 * 为所有终端命令提供统一的接口和工具方法。
 * 封装了对终端上下文的访问，简化了命令的编写。
 */
export class CommandAPI {
  /**
   * 构造函数
   * @param {Object} context - 终端上下文对象 (包含 currentDir, articles, etc.)
   * @param {Array} args - 命令参数数组
   */
  constructor(context, args = []) {
    this._ctx = context;
    this._args = args;
  }

  // --- 1. 参数解析增强 (Argument Parsing) ---

  /**
   * 获取所有命令参数
   * @returns {Array} 参数数组
   */
  get args() {
    return this._args;
  }

  /**
   * 检查是否存在某个 Flag（如 -l, --force）
   * @param {string} flag - 要检查的 flag 名称
   * @returns {boolean}
   */
  hasFlag(flag) {
    return this._args.includes(flag);
  }

  /**
   * 安全地获取指定位置的参数
   * @param {number} index - 参数索引 (从0开始)
   * @param {any} defaultValue - 如果参数不存在，返回的默认值
   * @returns {string|any}
   */
  getArg(index, defaultValue = null) {
    return this._args[index] !== undefined ? this._args[index] : defaultValue;
  }

  // --- 2. 交互式输入 (Interactivity) ---

  /**
   * 请求用户输入
   * @param {string} message - 提示信息
   * @returns {Promise<string>} 用户输入的内容
   */
  async prompt(message) {
    this.info(message);
    await this.scroll();
    if (this._ctx.waitForInput) {
      return await this._ctx.waitForInput();
    }
    return "";
  }

  // --- 3. 文件系统快捷方法 (FileSystem Helpers) ---

  /**
   * 获取当前工作目录 (CWD)
   * @returns {string} 当前目录路径
   */
  get cwd() {
    return this._ctx.currentDir;
  }

  /**
   * 解析路径 (支持 . 和 ..)
   * @param {string} path - 目标路径
   * @returns {string} 解析后的绝对路径
   */
  resolve(path) {
    return resolvePath(this.cwd, path);
  }

  /**
   * 在当前目录下查找文件信息
   * @param {string} name - 文件名
   * @returns {Object|null}
   */
  getFile(name) {
    if (this._ctx.getArticleInfo) {
      return this._ctx.getArticleInfo(name, this.cwd);
    }
    return null;
  }

  /**
   * 获取指定目录的内容
   * @param {string} path - 目录路径，默认为当前目录
   * @returns {Array|null}
   */
  getDir(path = this.cwd) {
    const articles = this._ctx.articles;
    if (articles && articles[path] && articles[path].type === 'dir') {
      return articles[path].content;
    }
    return null;
  }

  /**
   * 判断名称是否为文件夹
   * @param {string} name - 文件夹名
   * @returns {boolean}
   */
  isDir(name) {
    if (this._ctx.isDir) {
      return this._ctx.isDir(name, this.cwd);
    }
    return false;
  }

  /**
   * 检查文件或文件夹是否存在
   * @param {string} name - 名称
   * @returns {boolean}
   */
  exists(name) {
    return !!(this.getFile(name) || this.isDir(name));
  }

  /**
   * 读取文件内容 (支持虚拟文件系统)
   * @param {string} name 
   */
  async readFile(name) {
    // 1. 优先检查虚拟文件系统 (localStorage)
    const vfs = JSON.parse(localStorage.getItem("terminalVFS") || "{}");
    const fullPath = this.resolve(name);
    if (vfs[fullPath]) return vfs[fullPath];

    // 2. 特殊处理 config.toml
    if (name === "config.toml" && this.cwd === "/") {
      return localStorage.getItem("terminalConfigToml") || "";
    }

    // 3. 读取真实文章文件
    const fileInfo = this.getFile(name);
    if (fileInfo && fileInfo.path) {
      const response = await fetch(fileInfo.path);
      if (response.ok) return await response.text();
    }
    
    return null;
  }

  /**
   * 写入文件内容到虚拟文件系统
   * @param {string} name 
   * @param {string} content 
   */
  writeFile(name, content) {
    // 1. 特殊处理 config.toml
    if (name === "config.toml" && this.cwd === "/") {
      localStorage.setItem("terminalConfigToml", content);
      return true;
    }

    // 2. 写入通用虚拟文件系统 (localStorage)
    const vfs = JSON.parse(localStorage.getItem("terminalVFS") || "{}");
    const fullPath = this.resolve(name);
    vfs[fullPath] = content;
    localStorage.setItem("terminalVFS", JSON.stringify(vfs));
    return true;
  }

  // --- 4. 交互与动画支持 (UI & UX) ---

  /**
   * 异步等待 (毫秒)
   * @param {number} ms 
   */
  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 执行带 Loading 状态的任务
   * @param {string} text - 加载提示文字
   * @param {Promise} taskPromise - 异步任务
   */
  async loading(text, taskPromise) {
    const loadingIdx = this._ctx.conversation.output.length;
    this._addOutput({ type: 'info', content: `⏳ ${text}...` });
    
    try {
      const result = await taskPromise;
      this._ctx.conversation.output[loadingIdx].content = `✅ ${text} 完成`;
      return result;
    } catch (e) {
      this._ctx.conversation.output[loadingIdx].type = 'error';
      this._ctx.conversation.output[loadingIdx].content = `❌ ${text} 失败: ${e.message}`;
      throw e;
    }
  }

  /**
   * 显示进度条
   * @param {number} percent - 0-100
   * @param {string} label - 描述
   */
  progress(percent, label = "") {
    const width = 20;
    const completed = Math.round((percent / 100) * width);
    const remaining = width - completed;
    const bar = "█".repeat(completed) + "░".repeat(remaining);
    
    // 查找最后一个 progress 类型的输出进行更新，如果没有则新增
    const outputs = this._ctx.conversation.output;
    const lastOutput = outputs[outputs.length - 1];
    
    const content = `${bar} ${percent}% ${label}`;
    
    if (lastOutput && lastOutput.type === 'progress') {
      lastOutput.content = content;
    } else {
      this._addOutput({ type: 'progress', content });
    }
  }

  /**
   * 格式化输出表格数据
   */
  table(data, columns = null) {
    if (!Array.isArray(data) || data.length === 0) return;
    
    const keys = columns || Object.keys(data[0]);
    const header = keys.join('\t');
    const rows = data.map(item => keys.map(k => item[k]).join('\t'));
    
    this.print([header, '-'.repeat(header.length * 2), ...rows].join('\n'));
  }

  // --- 5. 环境与样式 (Context & Style) ---

  /**
   * 设置环境变量
   */
  setEnv(key, value) {
    if (this._ctx.env) {
      this._ctx.env.value[key] = value;
    }
  }

  /**
   * 获取环境变量
   */
  getEnv(key) {
    return this._ctx.env?.value[key] || "";
  }

  /**
   * 文本样式辅助静态方法
   */
  static style = {
    bold: (text) => `<strong>${escapeHtml(text)}</strong>`,
    color: (text, color) => `<span style="color: ${color}">${escapeHtml(text)}</span>`,
    italic: (text) => `<em>${escapeHtml(text)}</em>`,
    link: (text, url) => `<a href="${url}" target="_blank" style="color: var(--reader-accent)">${escapeHtml(text)}</a>`
  };

  /**
   * 获取当前主题信息
   */
  getTheme() {
    return this._ctx.theme?.current?.value || 'default';
  }

  /**
   * 获取特定类型的样式定义
   */
  getStyle(type) {
    return this._ctx.uiStyles?.value?.commandLine?.colors?.[type] || '#fff';
  }

  // --- 6. 输出方法 ---

  /**
   * 输出普通文本
   */
  print(content) {
    this._addOutput({ type: 'output', content }); 
  }

  /**
   * 输出成功信息
   */
  success(content) {
    this._addOutput({ type: 'success', content });
  }

  /**
   * 输出错误信息
   */
  error(content) {
    this._addOutput({ type: 'error', content });
  }

  /**
   * 输出一般信息
   */
  info(content) {
    this._addOutput({ type: 'info', content });
  }

  /**
   * 发送原始自定义类型的输出
   */
  raw(type, content) {
    this._addOutput({ type, content });
  }

  // --- 7. 高级输出 ---

  /**
   * 渲染 Markdown 内容
   */
  markdown(contentObj) {
    this._addOutput({ type: 'glow', content: contentObj });
  }

  /**
   * 渲染目录列表
   */
  dir(content) {
    this._addOutput({ type: 'dir', content });
  }
  
  /**
   * 渲染树形结构
   */
  tree(content) {
    this._addOutput({ type: 'tree', content });
  }
  
  /**
   * 渲染帮助信息
   */
  help(content) {
    this._addOutput({ type: 'help', content });
  }

  // 私有辅助方法：添加输出到对话记录
  _addOutput(output) {
    if (this._ctx.conversation) {
      this._ctx.conversation.output.push(output);
    }
  }

  // --- 8. 系统能力 ---

  /**
   * 触发滚动到底部
   */
  async scroll() {
    if (this._ctx.scrollToBottom) {
      await this._ctx.scrollToBottom();
    }
  }

  /**
   * 设置当前工作目录
   */
  setCwd(path) {
    if (this._ctx.currentDirRef) {
      this._ctx.currentDirRef.value = path;
    }
  }
  
  /**
   * 清屏
   */
  clear() {
    if (this._ctx.conversations) {
      this._ctx.conversations.value = [];
    }
    if (this._ctx.showWelcome) {
      this._ctx.showWelcome.value = false;
    }
  }

  /**
   * 重载配置
   */
  reloadConfig() {
    if (this._ctx.reloadConfig) {
      return this._ctx.reloadConfig();
    }
  }
  
  /**
   * 更新 TOML 配置
   */
  updateConfig(config) {
    if (this._ctx.updateTomlConfig) {
      return this._ctx.updateTomlConfig(config);
    }
    return false;
  }
  
  /**
   * 获取原始上下文
   */
  get raw() {
    return this._ctx;
  }
}
