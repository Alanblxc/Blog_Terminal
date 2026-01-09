import { CommandAPI } from "../composables/CommandAPI";
import { marked } from "marked";
import mermaid from "mermaid";
import katex from "katex";

// 初始化 mermaid 配置，设置为手动加载模式
mermaid.initialize({ startOnLoad: false });

import { escapeHtml } from "../composables/utils";

/**
 * 全屏阅读器类 (FullScreenReader)
 *
 * 该类负责创建一个覆盖全屏的阅读界面，用于渲染和展示 Markdown 内容。
 * 它不依赖 Vue 的模板系统，而是直接操作 DOM，以获得更好的性能和控制力。
 *
 * 主要功能：
 * 1. 解析 Markdown 内容（支持 KaTeX 公式、Mermaid 图表）。
 * 2. 提供全屏的阅读 UI（包含顶栏、侧边栏、内容区、底栏）。
 * 3. 生成文章目录 (TOC) 并支持跳转。
 * 4. 提供全文搜索功能（高亮显示、上/下一个匹配项）。
 * 5. 支持文件切换（同目录下文件）。
 * 6. 实时显示文档统计信息（字数、标题数等）。
 */
class FullScreenReader {
  /**
   * 构造函数
   * @param {Object} options - 配置选项
   * @param {Object} options.theme - 主题配置对象，包含颜色定义
   */
  constructor(options = {}) {
    this.options = options;
    this.theme = options.theme || {};

    // DOM 元素引用
    this.overlay = null; // 全屏覆盖层容器
    this.container = null; // 内容滚动容器
    this.contentBox = null; // Markdown 内容渲染区域
    this.sidebar = null; // 侧边栏（TOC 和搜索）
    this.searchBox = null; // 搜索框容器（旧版引用，现已整合到侧边栏）
    this.searchInput = null; // 搜索输入框
    this.fileSwitcher = null; // 顶栏文件切换器
    this.fileDropdown = null; // 文件列表下拉菜单
    this.pathSpan = null; // 顶栏路径显示

    // 搜索状态
    this.searchResults = []; // 搜索结果（DOM 节点数组）
    this.currentSearchIndex = -1; // 当前选中的搜索结果索引

    // Promise 控制
    this.resolvePromise = null; // 用于在关闭阅读器时 resolve open() 返回的 Promise

    // 内容数据
    this.headers = []; // 标题列表（用于 TOC）
    this.rawContent = ""; // 原始 Markdown 内容

    // 文件导航上下文
    this.currentFileIndex = -1; // 当前文件在列表中的索引
    this.currentFileName = ""; // 当前文件名，用于稳健的高亮匹配
    this.fileList = []; // 当前目录下的文件列表
    this.currentDir = "/"; // 当前目录路径
    this.articles = {}; // 所有文章数据引用

    // UI 交互状态
    this.isFileDropdownOpen = false; // 文件下拉菜单是否打开
  }

  /**
   * 设置文件上下文信息，用于文件切换功能
   * @param {Array} fileList - 文件列表
   * @param {number} currentIndex - 当前文件索引
   * @param {string} currentDir - 当前目录路径
   * @param {Object} articles - 文章数据源
   */
  setFileContext(fileList, currentIndex, currentDir, articles) {
    // 在排序前先获取当前文件的名称，因为 sort 是原地的，会改变索引对应关系
    const targetName = fileList[currentIndex]?.name;

    // 对文件列表按名称排序，确保切换顺序一致
    this.fileList = fileList.sort((a, b) => a.name.localeCompare(b.name));

    // 重新查找排序后的当前文件索引
    if (targetName) {
      this.currentFileName = targetName;
      this.currentFileIndex = this.fileList.findIndex(
        (f) => f.name === targetName
      );
    } else {
      // 如果找不到 targetName (例如 config.toml), 尝试使用第一个文件
      if (this.fileList.length > 0) {
        this.currentFileName = this.fileList[0].name;
        this.currentFileIndex = 0;
      }
    }
    this.currentDir = currentDir;
    this.articles = articles;
  }

  /**
   * 打开阅读器
   * @param {string} markdownContent - Markdown 原始内容
   * @param {string} title - 文档标题
   * @param {string} path - 文档路径
   * @returns {Promise} - 当阅读器关闭时 resolve
   */
  async open(markdownContent, title = "Reader", path = "") {
    this.rawContent = markdownContent;
    // 解析 Markdown 为 HTML
    const html = this._parseMarkdown(markdownContent);

    const isUpdate = !!this.overlay;

    // 如果 overlay 已存在，说明是切换文件，仅更新内容；否则创建 DOM
    if (isUpdate) {
      this._updateContent(html, title, path);
    } else {
      this._createDOM(html, title, path);
      this._bindEvents();
    }

    // 生成目录、渲染图表、更新统计
    this._generateTOC();
    this._renderDiagrams();
    this._updateStats();

    // 确保添加到文档流并聚焦
    if (!this.overlay.parentNode) {
      document.body.appendChild(this.overlay);
      this.container.focus();
    }

    // 如果是更新内容，直接返回，不要重新创建 Promise 导致之前的 Promise 丢失
    if (isUpdate) return;

    // 返回一个 Promise，直到调用 close() 时才结束
    return new Promise((resolve) => {
      this.resolvePromise = resolve;
    });
  }

  /**
   * 更新现有阅读器的内容（用于文件切换）
   * @param {string} html - 新的 HTML 内容
   * @param {string} title - 新标题
   * @param {string} path - 新路径
   */
  _updateContent(html, title, path) {
    this.contentBox.innerHTML = html;
    this._updateHeaderTitle(title);
    this.pathSpan.textContent = path;
    this.container.scrollTop = 0; // 重置滚动条
    this._renderDiagrams(); // 重新渲染图表
  }

  /**
   * 更新顶栏标题
   * @param {string} title - 新标题
   */
  _updateHeaderTitle(title) {
    if (this.fileSelectorLabel) {
      this.fileSelectorLabel.textContent = title;
    }
  }
  /**
   * 关闭文件下拉菜单
   */
  _closeFileDropdown() {
    this.isFileDropdownOpen = false;
  }
  /**
   * 切换到列表中的指定文件
   * @param {number} index - 目标文件索引
   */
  async _switchFile(index) {
      if (index < 0 || index >= this.fileList.length) return;
      
      const nextFile = this.fileList[index];
      try {
          // 获取文件内容
          const response = await fetch(nextFile.path);
          if (response.ok) {
              const content = await response.text();
              this.currentFileIndex = index;
              this.currentFileName = nextFile.name; // 更新当前文件名
              const fullPath = this.currentDir === "/" ? `/${nextFile.name}` : `${this.currentDir}/${nextFile.name}`;
              
              // 重新加载内容
              await this.open(content, nextFile.title || nextFile.name, fullPath);
              
              // 更新下拉列表的高亮状态，而不重新生成整个列表
              if (this.fileDropdown) {
                  const items = this.fileDropdown.querySelectorAll('.file-dropdown-item');
                  
                  // 1. 移除所有 active 类
                  Array.from(items).forEach(item => {
                      item.classList.remove('active');
                  });
                  
                  // 2. 查找并高亮新文件
                  let found = false;
                  
                  // 优先尝试按索引直接匹配 (假设列表顺序未变)
                  if (items[index] && items[index].textContent.trim() === (nextFile.title || nextFile.name).trim()) {
                       items[index].classList.add('active');
                       items[index].scrollIntoView({ block: "nearest" });
                       found = true;
                  }
                  
                  // 如果索引匹配失败 (例如文本对不上)，则遍历查找
                  if (!found) {
                      const targetText = (nextFile.title || nextFile.name).trim();
                      for (let i = 0; i < items.length; i++) {
                          if (items[i].textContent.trim() === targetText) {
                              items[i].classList.add('active');
                              items[i].scrollIntoView({ block: "nearest" });
                              found = true;
                              break;
                          }
                      }
                  }

                  // 3. 强制重绘，确保 UI 更新
                  this.fileDropdown.style.display = 'none';
                  this.fileDropdown.offsetHeight; // 触发回流
                  this.fileDropdown.style.display = '';
                  
                  // 4. 确保保持展开状态
                  if (!this.isFileDropdownOpen) {
                      this.fileDropdown.classList.add("open");
                      this.isFileDropdownOpen = true;
                  }
              }
          }
      } catch (e) {
          console.error("切换文件失败", e);
      }
  }

  /**
   * 关闭阅读器
   */
  close() {
    this._cleanup();
    // 强制聚焦回终端输入框
    // 尝试多个选择器以确保兼容性
    const input = document.querySelector('.terminal-input') || document.querySelector('input[type="text"]');
    if (input) {
        // 使用 setTimeout 确保 DOM 清理完成后再聚焦
        setTimeout(() => {
            input.focus();
            // 确保光标在最后
            if (input.value) {
                input.setSelectionRange(input.value.length, input.value.length);
            }
        }, 0);
    }
    
    if (this.resolvePromise) this.resolvePromise();
  }

  /**
   * 解析 Markdown 内容
   * 处理 KaTeX 公式和 Mermaid 代码块
   * @param {string} content - Markdown 文本
   * @returns {string} - 解析后的 HTML
   */
  _parseMarkdown(content) {
    // 1. 处理块级公式 $$...$$
    let parsed = content.replace(/\$\$([\s\S]+?)\$\$/g, (match, tex) => {
      try {
        return `<div class="katex-block">${katex.renderToString(tex, {
          displayMode: true,
        })}</div>`;
      } catch (e) {
        return match;
      }
    });

    // 2. 处理行内公式 $...$
    // 使用正向预查和反向预查避免匹配转义的 \$
    parsed = parsed.replace(
      /(?<!\$)\$(?!\$)([^$]+?)(?<!\$)\$(?!\$)/g,
      (match, tex) => {
        try {
          return `<span class="katex-inline">${katex.renderToString(tex, {
            displayMode: false,
          })}</span>`;
        } catch (e) {
          return match;
        }
      }
    );

    // 3. 自定义 Marked 渲染器
    const renderer = new marked.Renderer();
    const originalCode = renderer.code.bind(renderer);

    // 拦截代码块渲染，处理 mermaid
    renderer.code = (code, language, isEscaped) => {
      if (language === "mermaid") return `<div class="mermaid">${code}</div>`;
      return originalCode(code, language, isEscaped);
    };

    return marked(parsed, { renderer });
  }

  /**
   * 创建 DOM 结构
   * 构建包含 Header, Sidebar, Content, Footer 的完整界面
   */
  _createDOM(htmlContent, title, path) {
    const colors = this.theme;

    // 1. 创建全屏覆盖层
    this.overlay = document.createElement("div");
    this.overlay.className = "terminal-reader-overlay";
    this.overlay.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: var(--reader-bg, ${colors.background || "#0d1117"}); 
      z-index: 1000; display: flex; flex-direction: column;
      padding: 0; box-sizing: border-box; font-family: 'Cascadia Code', monospace;
      color: var(--reader-text, ${colors.text || "#c9d1d9"});
      --reader-accent: ${colors.accent || "#58a6ff"};
      --reader-code-bg: ${colors.codeBackground || "#161b22"};
      --reader-toc-hover: ${colors.tocHover || "rgba(56, 139, 253, 0.15)"};
      --reader-border: ${colors.borderColor || "#30363d"};
    `;

    // 2. 顶栏 (Header)
    const header = document.createElement("div");
    header.style.cssText = `
      padding: 0 20px;
      background: var(--reader-code-bg);
      border-bottom: 1px solid var(--reader-border);
      display: flex; align-items: center; justify-content: space-between;
      flex-shrink: 0; height: 50px; position: relative;
    `;

    // 顶栏左侧：控制按钮区域
    const leftControls = document.createElement("div");
    leftControls.style.cssText =
      "display: flex; gap: 10px; align-items: center;";

    // 退出按钮
    const exitBtn = document.createElement("div");
    exitBtn.title = "退出 (Esc)";
    exitBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 -960 960 960" width="20" fill="currentColor"><path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z"/></svg>`;
    exitBtn.style.cssText = `
        cursor: pointer; padding: 4px; border-radius: 4px;
        display: flex; align-items: center; justify-content: center;
        color: #ff6b6b; transition: background 0.2s; margin-right: 4px;
    `;
    exitBtn.onmouseenter = () =>
      (exitBtn.style.background = "rgba(255, 107, 107, 0.1)");
    exitBtn.onmouseleave = () => (exitBtn.style.background = "transparent");
    exitBtn.onclick = () => this.close();

    // 文件切换器 (下拉菜单触发器)
    this.fileSwitcher = document.createElement("div");
    this.fileSwitcher.style.cssText = `
        background: transparent; border: 1px solid var(--reader-border);
        color: var(--reader-text); padding: 4px 8px; border-radius: 4px;
        cursor: pointer; font-size: 14px; display: flex; align-items: center; gap: 8px;
        position: relative; user-select: none;
    `;

    // 文件名标签
    this.fileSelectorLabel = document.createElement("span");
    this.fileSelectorLabel.textContent = title;
    this.fileSelectorLabel.style.cssText = `
        display: inline-block; max-width: 300px; white-space: nowrap; 
        overflow: hidden; text-overflow: ellipsis; font-size: 14px;
    `;

    // 下拉箭头图标
    const arrowIcon = document.createElement("span");
    arrowIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" height="16" viewBox="0 -960 960 960" width="16" fill="currentColor"><path d="M480-345 240-585l56-56 184 184 184-184 56 56-240 240Z"/></svg>`;
    arrowIcon.style.cssText = "display: flex; align-items: center;";

    this.fileSwitcher.appendChild(this.fileSelectorLabel);
    this.fileSwitcher.appendChild(arrowIcon);
    this.fileSwitcher.onclick = (e) => {
      e.stopPropagation();
      this._toggleFileDropdown();
    };

    leftControls.appendChild(exitBtn);
    leftControls.appendChild(this.fileSwitcher);

    // 顶栏中间：路径信息
    const centerInfo = document.createElement("div");
    centerInfo.style.cssText =
      "display: flex; flex-direction: column; align-items: center; position: absolute; left: 50%; transform: translateX(-50%);";

    this.pathSpan = document.createElement("div");
    this.pathSpan.textContent = path;
    this.pathSpan.style.fontSize = "12px";
    this.pathSpan.style.color = "#8b949e";

    centerInfo.appendChild(this.pathSpan);

    header.appendChild(leftControls);
    header.appendChild(centerInfo);
    header.appendChild(document.createElement("div")); // 右侧占位符

    this.overlay.appendChild(header);

    // 3. 主体区域 (Flex 布局，包含内容区和侧边栏)
    const body = document.createElement("div");
    body.style.cssText =
      "flex: 1; display: flex; overflow: hidden; position: relative;";

    // 4. 内容容器
    this.container = document.createElement("div");
    this.container.tabIndex = 0; // 使其可聚焦，以便接收键盘事件
    this.container.style.cssText = `
      flex: 1; overflow-y: auto; padding: 20px 5%; scroll-behavior: smooth;
      outline: none; position: relative; padding-bottom: 40px;
    `;

    // 5. 侧边栏 (目录与搜索)
    this.sidebar = document.createElement("div");
    this.sidebar.style.cssText = `
      width: 250px; border-left: 1px solid var(--reader-border);
      background: var(--reader-bg); overflow-y: auto; padding: 20px;
      font-size: 12px; flex-shrink: 0; display: flex; flex-direction: column;
    `;

    // 搜索容器
    const searchContainer = document.createElement("div");
    searchContainer.style.cssText =
      "margin-bottom: 15px; display: flex; align-items: center; gap: 0;";

    this.searchInput = document.createElement("input");
    this.searchInput.placeholder = "查找...";
    this.searchInput.style.cssText = `
      background: var(--reader-bg); border: 1px solid var(--reader-border);
      color: var(--reader-text); padding: 6px 10px; border-radius: 4px 0 0 4px;
      font-family: inherit; font-size: 12px; outline: none; flex: 1;
      box-sizing: border-box; min-width: 0; border-right: none;
    `;

    const navBtnStyle = `
      background: var(--reader-code-bg); border: 1px solid var(--reader-border);
      color: var(--reader-text); padding: 5px 8px; 
      cursor: pointer; font-size: 12px; display: flex; align-items: center; justify-content: center;
      min-width: 28px; height: 100%; box-sizing: border-box;
    `;

    // 上一个匹配项按钮
    const prevBtn = document.createElement("button");
    prevBtn.innerHTML = "←";
    prevBtn.title = "上一个 (Shift+Enter)";
    prevBtn.style.cssText = navBtnStyle + "border-right: none;";
    prevBtn.onclick = () => this._nextMatch(-1);

    // 下一个匹配项按钮
    const nextBtn = document.createElement("button");
    nextBtn.innerHTML = "→";
    nextBtn.title = "下一个 (Enter)";
    nextBtn.style.cssText = navBtnStyle + "border-radius: 0 4px 4px 0;";
    nextBtn.onclick = () => this._nextMatch(1);

    searchContainer.appendChild(this.searchInput);
    searchContainer.appendChild(prevBtn);
    searchContainer.appendChild(nextBtn);
    this.sidebar.appendChild(searchContainer);

    // 6. 渲染后的 Markdown 内容容器
    this.contentBox = document.createElement("div");
    this.contentBox.className = "markdown-body glow-style";
    this.contentBox.innerHTML = htmlContent;

    // 7. 底栏 (Footer)
    this.footer = document.createElement("div");
    this.footer.style.cssText = `
      height: 30px; background: var(--reader-code-bg); border-top: 1px solid var(--reader-border);
      display: flex; align-items: center; justify-content: space-between; padding: 0 20px;
      font-size: 12px; color: #8b949e; flex-shrink: 0;
    `;

    const footerLeft = document.createElement("div");
    footerLeft.style.cssText = "display: flex; gap: 15px; align-items: center;";

    // 创建带 Tooltip 的统计项辅助函数
    const createStat = (icon, label) => {
      const wrapper = document.createElement("div");
      wrapper.style.cssText =
        "position: relative; display: flex; align-items: center; cursor: help;";
      const span = document.createElement("span");
      span.textContent = icon; // 初始文本，稍后在 _updateStats 中更新
      wrapper.appendChild(span);

      // Tooltip 元素
      const tip = document.createElement("div");
      tip.textContent = label;
      tip.style.cssText = `
            position: absolute; bottom: 100%; left: 50%; transform: translateX(-50%);
            margin-bottom: 4px; padding: 4px 8px; background: rgba(0,0,0,0.8);
            color: #ccc; font-size: 12px; border-radius: 4px; white-space: nowrap;
            opacity: 0; transition: opacity 0.2s; pointer-events: none; z-index: 1001;
        `;
      wrapper.appendChild(tip);

      // 悬停显示逻辑 (延迟 300ms)
      let timeout;
      wrapper.onmouseenter = () => {
        timeout = setTimeout(() => {
          tip.style.opacity = "1";
        }, 300);
      };
      wrapper.onmouseleave = () => {
        clearTimeout(timeout);
        tip.style.opacity = "0";
      };
      return { wrapper, span };
    };

    const sWords = createStat("", "总字数");
    const sHeads = createStat("", "标题数量");
    const sImgs = createStat("", "图片数量");
    const sCode = createStat("", "代码块数量");

    this.statWords = sWords.span;
    this.statHeadings = sHeads.span;
    this.statImages = sImgs.span;
    this.statCode = sCode.span;

    // 分隔符辅助函数
    const createSep = () => {
      const s = document.createElement("span");
      s.textContent = "|";
      s.style.opacity = "0.3";
      return s;
    };

    footerLeft.appendChild(sWords.wrapper);
    footerLeft.appendChild(createSep());
    footerLeft.appendChild(sHeads.wrapper);
    footerLeft.appendChild(createSep());
    footerLeft.appendChild(sImgs.wrapper);
    footerLeft.appendChild(createSep());
    footerLeft.appendChild(sCode.wrapper);

    // 底部右侧：时间显示
    this.dateTimeSpan = document.createElement("div");
    this._updateDateTime();
    this.dateTimeInterval = setInterval(() => this._updateDateTime(), 1000);

    this.footer.appendChild(footerLeft);
    this.footer.appendChild(this.dateTimeSpan);

    // 8. 注入 CSS 样式
    const style = document.createElement("style");
    style.textContent = `
      @import url('https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css');
      /* 如果CDN加载失败，可以考虑使用本地fallback或者其他CDN */
      
      .glow-style { line-height: 1.6; font-size: 16px; max-width: 800px; margin: 0 auto; }
      .glow-style h1, .glow-style h2, .glow-style h3 { color: var(--reader-accent); margin-top: 24px; margin-bottom: 16px; font-weight: 600; line-height: 1.25; }
      .glow-style h1 { font-size: 2em; border-bottom: 1px solid var(--reader-border); padding-bottom: .3em; }
      .glow-style h2 { font-size: 1.5em; }
      .glow-style h3 { font-size: 1.25em; }
      .glow-style a { color: var(--reader-accent); text-decoration: none; }
      .glow-style a:hover { text-decoration: underline; }
      .glow-style p { margin-bottom: 16px; }
      .glow-style code { background-color: var(--reader-code-bg); padding: .2em .4em; font-size: 85%; border-radius: 6px; font-family: 'Fira Code', monospace; }
      .glow-style pre { background-color: var(--reader-code-bg); padding: 16px; overflow: auto; border-radius: 6px; margin-bottom: 16px; border: 1px solid var(--reader-border); }
      .glow-style pre code { background-color: transparent; padding: 0; font-size: 100%; color: inherit; }
      .glow-style blockquote { padding: 0 1em; color: #8b949e; border-left: .25em solid var(--reader-border); margin: 0 0 16px 0; }
      .glow-style ul, .glow-style ol { padding-left: 2em; margin-bottom: 16px; }
      .glow-style img { max-width: 100%; background-color: var(--reader-bg); }
      
      .toc-item { padding: 4px 8px; cursor: pointer; border-radius: 4px; color: var(--reader-text); text-decoration: none; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .toc-item:hover { background: var(--reader-toc-hover); color: var(--reader-accent); }
      .toc-h1 { font-weight: bold; margin-bottom: 5px; }
      .toc-h2 { padding-left: 15px; }
      .toc-h3 { padding-left: 25px; }
      
      .search-match { background: #f2cc60; color: #000; }
      .search-match.active { background: #ff9632; }
      
      .mermaid { display: flex; justify-content: center; margin: 20px 0; }
      .katex-display { overflow-x: auto; overflow-y: hidden; }

      ::-webkit-scrollbar { width: 8px; height: 8px; }
      ::-webkit-scrollbar-track { background: var(--reader-bg); }
      ::-webkit-scrollbar-thumb { background: var(--reader-border); border-radius: 4px; }
      ::-webkit-scrollbar-thumb:hover { background: var(--reader-accent); }
      
      /* 文件列表下拉菜单样式 */
      .file-dropdown {
          position: absolute; top: calc(100% + 4px); left: 0; width: 100%;
          background: var(--reader-bg); border: 1px solid var(--reader-border);
          border-radius: 6px; max-height: 300px; overflow-y: auto;
          z-index: 1002;
          box-shadow: 0 4px 12px rgba(0,0,0,0.2);
          
          /* 动画状态 */
          opacity: 0;
          transform: translateY(-10px) scaleY(0.95);
          transform-origin: top center;
          visibility: hidden;
          transition: 
            opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1),
            transform 0.2s cubic-bezier(0.4, 0, 0.2, 1),
            visibility 0.2s;
      }
      .file-dropdown.open { 
          opacity: 1;
          transform: translateY(0) scaleY(1);
          visibility: visible;
          padding: 4px 0;
      }
      .file-dropdown-item {
          padding: 8px 12px; cursor: pointer; font-size: 14px;
          color: var(--reader-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          transition: background 0.1s, color 0.1s;
          box-sizing: border-box;
      }
      .file-dropdown-item:hover { background: var(--reader-toc-hover); }
      .file-dropdown-item.active { 
          color: var(--reader-accent); 
          font-weight: bold; 
          background: var(--reader-toc-hover);
          border-left: 2px solid var(--reader-accent);
          padding-left: 10px; /* 补偿 border 宽度 */
      }
    `;

    this.container.appendChild(style);
    this.container.appendChild(this.contentBox);
    body.appendChild(this.container);
    body.appendChild(this.sidebar);

    this.overlay.appendChild(header);
    this.overlay.appendChild(body);
    this.overlay.appendChild(this.footer);

    // 9. 添加下拉菜单容器到切换器
    this.fileDropdown = document.createElement("div");
    this.fileDropdown.className = "file-dropdown";
    this.fileSwitcher.appendChild(this.fileDropdown);

    // 监听点击外部关闭下拉菜单
    document.addEventListener("click", this._handleOutsideClick);
  }

  /**
   * 处理外部点击事件，用于关闭下拉菜单
   */
  _handleOutsideClick = (e) => {
    if (this.isFileDropdownOpen && !this.fileSwitcher.contains(e.target)) {
      this._closeFileDropdown();
    }
  };

  /**
   * 切换文件下拉菜单的显示/隐藏状态
   */
  _toggleFileDropdown() {
    if (this.isFileDropdownOpen) {
      this._closeFileDropdown();
    } else {
      this._openFileDropdown();
    }
  }

  /**
   * 打开文件下拉菜单
   * 生成列表项并高亮当前文件
   */
  _openFileDropdown() {
    if (!this.fileList.length) return;

    this.fileDropdown.innerHTML = "";
    this.fileList.forEach((file, index) => {
      const item = document.createElement("div");
      item.className = "file-dropdown-item";
      // 使用文件名进行稳健匹配，而非仅仅依赖索引
      // 确保比较时都是字符串，并处理可能的空值
      const isMatch =
        file.name && this.currentFileName && file.name === this.currentFileName;
      if (isMatch) item.classList.add("active");
      item.textContent = file.title || file.name;
      item.title = file.title || file.name;
      item.onclick = (e) => {
        e.stopPropagation();
        this._switchFile(index);
      };
      this.fileDropdown.appendChild(item);
    });

    this.fileDropdown.classList.add("open");
    this.isFileDropdownOpen = true;

    // 自动滚动到当前选中的项
    setTimeout(() => {
      const active = this.fileDropdown.querySelector(".active");
      if (active) active.scrollIntoView({ block: "nearest" });
    }, 0);
  }

  /**
   * 关闭文件下拉菜单
   */
  _closeFileDropdown() {
    this.fileDropdown.classList.remove("open");
    this.isFileDropdownOpen = false;
  }

  /**
   * 渲染 Mermaid 图表
   * 查找内容区所有的 .mermaid 容器并执行渲染
   */
  async _renderDiagrams() {
    try {
      await mermaid.run({
        nodes: this.contentBox.querySelectorAll(".mermaid"),
      });
    } catch (e) {
      console.error("Mermaid render error:", e);
    }
  }

  /**
   * 更新文档统计信息
   * 计算字数、标题数、图片数和代码块数
   */
  _updateStats() {
    // 移除代码块和公式，只统计正文
    const text = this.rawContent
      .replace(/```[\s\S]*?```/g, "")
      .replace(/\$\$[\s\S]*?\$\$/g, "");
    const words = text.match(/\b\w+\b/g)?.length || 0;

    const hCount = (this.rawContent.match(/^#{1,6}\s/gm) || []).length;
    const imgCount =
      (this.rawContent.match(/!\[.*?\]\(.*?\)/g) || []).length +
      (this.rawContent.match(/<img/g) || []).length;
    const codeCount = (this.rawContent.match(/```/g) || []).length / 2; // code blocks have opening and closing ticks

    this.statWords.textContent = `📝 ${words}`;
    this.statHeadings.textContent = `📑 ${hCount}`;
    this.statImages.textContent = `🖼️ ${imgCount}`;
    this.statCode.textContent = `💻 ${Math.floor(codeCount)}`;
  }

  /**
   * 更新当前日期时间显示
   */
  _updateDateTime() {
    const now = new Date();
    this.dateTimeSpan.textContent = now.toLocaleString();
  }

  /**
   * 生成目录 (TOC)
   * 扫描 h1-h3 标签并在侧边栏生成链接
   */
  _generateTOC() {
    // 清除侧边栏中除了搜索框以外的内容
    while (this.sidebar.children.length > 1) {
      this.sidebar.removeChild(this.sidebar.lastChild);
    }

    const headers = this.contentBox.querySelectorAll("h1, h2, h3");
    if (headers.length === 0) {
      const msg = document.createElement("div");
      msg.innerHTML =
        "<div style='padding:10px; opacity:0.6;'>未发现标题</div>";
      this.sidebar.appendChild(msg);
      return;
    }

    const tocList = document.createElement("div");
    headers.forEach((header, index) => {
      if (!header.id) header.id = `toc-header-${index}`;
      const link = document.createElement("div");
      link.textContent = header.textContent;
      link.className = `toc-item toc-${header.tagName.toLowerCase()}`;
      link.onclick = () => {
        header.scrollIntoView({ behavior: "smooth", block: "start" });
      };
      tocList.appendChild(link);
    });
    this.sidebar.appendChild(tocList);
  }

  /**
   * 绑定事件监听器
   * 处理快捷键和搜索框输入
   */
  _bindEvents() {
    // 搜索框事件
    this.searchInput.addEventListener("input", (e) =>
      this._performSearch(e.target.value)
    );
    this.searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        if (e.shiftKey) this._nextMatch(-1); // Shift+Enter 上一个
        else this._nextMatch(1); // Enter 下一个
      }
      e.stopPropagation(); // 防止冒泡到全局快捷键
    });

    // 全局键盘事件
    this._handleKeydown = (e) => {
      // 如果焦点在搜索框，ESC 退出聚焦，不关闭阅读器
      if (document.activeElement === this.searchInput) {
        if (e.key === "Escape") {
          this.searchInput.blur();
          this.container.focus();
        }
        return;
      }

      // 如果下拉菜单打开，ESC 关闭下拉菜单
      if (this.isFileDropdownOpen && e.key === "Escape") {
          this._closeFileDropdown();
          return;
      }

      const scrollAmount = 50;

      switch (e.key) {
        case "Escape":
        case "q":
          e.preventDefault();
          this.close();
          break;
        case "/":
          e.preventDefault();
          this.searchInput.focus();
          break;
        case "j":
        case "ArrowDown":
          this.container.scrollTop += scrollAmount;
          break;
        case "k":
        case "ArrowUp":
          this.container.scrollTop -= scrollAmount;
          break;
        case "d":
          if (e.ctrlKey)
            this.container.scrollTop += this.container.clientHeight / 2;
          break;
        case "u":
          if (e.ctrlKey)
            this.container.scrollTop -= this.container.clientHeight / 2;
          break;
        case " ":
        case "PageDown":
          e.preventDefault();
          this.container.scrollTop += this.container.clientHeight;
          break;
        case "PageUp":
          e.preventDefault();
          this.container.scrollTop -= this.container.clientHeight;
          break;
        case "g":
          this.container.scrollTop = 0;
          break;
        case "G":
          if (e.shiftKey) {
            this.container.scrollTop = this.container.scrollHeight;
          }
          break;
      }
    };

    window.addEventListener("keydown", this._handleKeydown);
  }

  /**
   * 执行全文搜索
   * 使用 TreeWalker 遍历文本节点，使用 mark 标签包裹匹配项
   * @param {string} query - 搜索关键词
   */
  _performSearch(query) {
    this._clearHighlights();
    this.searchResults = [];
    this.currentSearchIndex = -1;

    if (!query) return;

    // 遍历所有文本节点
    const walker = document.createTreeWalker(
      this.contentBox,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );
    let node;
    const matches = [];

    while ((node = walker.nextNode())) {
      // 忽略 style 和 script 标签内的文本
      if (
        node.parentElement &&
        (node.parentElement.tagName === "STYLE" ||
          node.parentElement.tagName === "SCRIPT")
      )
        continue;
      const text = node.nodeValue;
      const regex = new RegExp(
        query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        "gi"
      );
      let match;
      while ((match = regex.exec(text)) !== null) {
        matches.push({ node, index: match.index, length: match[0].length });
      }
    }

    // 反向遍历并高亮，避免 DOM 变更影响后续索引
    for (let i = matches.length - 1; i >= 0; i--) {
      const { node, index, length } = matches[i];
      const range = document.createRange();
      range.setStart(node, index);
      range.setEnd(node, index + length);
      const mark = document.createElement("mark");
      mark.className = "search-match";
      range.surroundContents(mark);
      this.searchResults.unshift(mark);
    }

    // 自动选中第一个匹配项
    if (this.searchResults.length > 0) {
      this._nextMatch(1);
    }
  }

  /**
   * 清除所有搜索高亮
   */
  _clearHighlights() {
    const marks = this.contentBox.querySelectorAll(".search-match");
    marks.forEach((mark) => {
      const parent = mark.parentNode;
      while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
      parent.removeChild(mark);
    });
    this.contentBox.normalize(); // 合并相邻文本节点
  }

  /**
   * 导航到上一个/下一个搜索匹配项
   * @param {number} direction - 1 (下一个) 或 -1 (上一个)
   */
  _nextMatch(direction) {
    if (this.searchResults.length === 0) return;

    // 移除当前高亮
    if (
      this.currentSearchIndex >= 0 &&
      this.searchResults[this.currentSearchIndex]
    ) {
      this.searchResults[this.currentSearchIndex].classList.remove("active");
    }

    this.currentSearchIndex += direction;
    // 循环导航
    if (this.currentSearchIndex >= this.searchResults.length)
      this.currentSearchIndex = 0;
    if (this.currentSearchIndex < 0)
      this.currentSearchIndex = this.searchResults.length - 1;

    // 添加新的高亮并滚动
    const target = this.searchResults[this.currentSearchIndex];
    if (target) {
      target.classList.add("active");
      target.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  /**
   * 清理资源
   * 移除事件监听器和 DOM 元素
   */
  _cleanup() {
    document.removeEventListener("click", this._handleOutsideClick);
    if (this._handleKeydown) {
      window.removeEventListener("keydown", this._handleKeydown);
    }
    if (this.dateTimeInterval) {
      clearInterval(this.dateTimeInterval);
    }
    if (this.overlay && this.overlay.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay);
    }
  }
}

/**
 * read 命令执行函数
 * @param {Object} rawContext - 命令上下文
 * @param {Array} args - 命令参数
 */
const read = async (rawContext, ...args) => {
  const cmd = new CommandAPI(rawContext, args);
  const fileName = cmd.args[0];

  if (!fileName) {
    cmd.error("用法: read <filename>");
    return;
  }

  const { articles, readTheme } = cmd.raw;
  let content = "";
  let title = fileName;
  let fullPath = cmd.cwd === "/" ? `/${fileName}` : `${cmd.cwd}/${fileName}`;
  let fileList = [];
  let currentIndex = -1;

  // 特殊处理 config.toml
  if (fileName === "config.toml" && cmd.cwd === "/") {
    const rawContent = localStorage.getItem("terminalConfigToml") || "";
    content = "```toml\n" + rawContent + "\n```";
    title = "config.toml";
  } else {
    try {
      // 解析当前目录下的文件列表
      const currentContent = articles[cmd.cwd];
      if (currentContent && currentContent.type === "dir") {
        fileList = currentContent.content.filter(
          (item) => item.type === "file"
        );
        currentIndex = fileList.findIndex((item) => item.name === fileName);
        const fileInfo = fileList[currentIndex];

        if (fileInfo) {
          const response = await fetch(fileInfo.path);
          if (response.ok) {
            content = await response.text();
            title = fileInfo.title || fileName;
          } else {
            throw new Error("File not found");
          }
        } else {
          throw new Error("File not found");
        }
      } else {
        throw new Error("Directory not found");
      }
    } catch (error) {
      cmd.error(`read: ${fileName}: 文件不存在`);
      return;
    }
  }

  // 初始化阅读器并注入当前主题配置
  const reader = new FullScreenReader({
    theme: readTheme?.colors?.value || {},
  });

  // 设置文件上下文以支持文件切换
  if (fileList.length > 0) {
    reader.setFileContext(fileList, currentIndex, cmd.cwd, articles);
  }

  // 打开阅读器
  await reader.open(content, title, fullPath);
};

export default read;
