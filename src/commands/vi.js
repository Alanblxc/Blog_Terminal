import { CommandAPI } from "../composables/CommandAPI";
import { escapeHtml } from "../composables/utils";

/**
 * 全屏编辑器类 (FullScreenEditor)
 * 最终优化版：
 * 1. 搜索高亮持久化：切换 INSERT/NORMAL/COMMAND 模式高亮不消失
 * 2. 只有主动清空搜索(/ + 回车)或使用 :nohl 时才移除高亮
 */
class FullScreenEditor {
  constructor(options = {}) {
    this.options = options;
    
    // DOM 元素
    this.overlay = null;
    this.textarea = null;
    this.highlightedContent = null;
    this.lineNumbers = null;
    this.statusBar = null;
    this.commandInput = null;
    
    // 状态
    this.mode = "NORMAL";
    this.resolvePromise = null;
    this.content = "";
    this.clipboard = "";
    this.searchQuery = ""; // 当前搜索词
    this.lastChar = "";
    
    // 核心配置
    this.lineHeight = 24; 
    this.font = "'Cascadia Code', 'Consolas', 'Menlo', 'Monaco', 'Courier New', monospace";
    this._boundHandleResize = null;
    this.isActive = false; // 标记编辑器是否处于活跃状态
  }

  async open(content) {
    this.content = content;
    this.isActive = true;
    this._createDOM();
    this._bindEvents();
    this._switchMode("NORMAL");
    this._adjustScrollbarGap();
    this._updateUI();

    requestAnimationFrame(() => {
        if (this.isActive) {
          this._updateUI();
          this._adjustScrollbarGap();
        }
    });

    return new Promise((resolve) => {
      this.resolvePromise = resolve;
    });
  }

  close() {
    this.isActive = false;
    this._cleanup();
    if (this.options.onExit) this.options.onExit();
    if (this.resolvePromise) this.resolvePromise();
  }

  _createDOM() {
    // 1. 全屏遮罩
    this.overlay = document.createElement("div");
    this.overlay.className = "terminal-editor-overlay";
    this.overlay.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: #0f172a; z-index: 999; display: flex; flex-direction: column;
      padding: 20px; box-sizing: border-box; font-family: ${this.font};
    `;

    // 2. 标题
    const title = document.createElement("div");
    title.style.cssText = "color: #64748b; font-size: 14px; margin-bottom: 10px; display: flex; justify-content: space-between; flex-shrink: 0;";
    title.innerHTML = `
      <span>VI 编辑器: <strong style="color: #e2e8f0">${this.options.fileName || "Untitled"}</strong> ${this.options.readOnly ? "(只读)" : ""}</span>
      <span>${this.options.language || "text"}</span>
    `;
    this.overlay.appendChild(title);

    // 3. 编辑器容器
    const container = document.createElement("div");
    container.style.cssText = `
      flex: 1; position: relative; background: #1e293b; border: 1px solid #334155;
      border-radius: 4px; overflow: hidden; display: flex;
    `;

    // 行号
    this.lineNumbers = document.createElement("div");
    this.lineNumbers.style.cssText = `
      width: 45px; height: 100%; background: #0f172a; flex-shrink: 0;
      color: #475569; padding: 10px 5px; box-sizing: border-box; text-align: right;
      user-select: none; border-right: 1px solid #334155; overflow: hidden; 
      font-family: ${this.font}; font-size: 14px; line-height: ${this.lineHeight}px;
    `;
    container.appendChild(this.lineNumbers);

    // 编辑区域
    const editorStack = document.createElement("div");
    editorStack.style.cssText = `
      flex: 1; position: relative; display: grid; overflow: hidden; 
      background: #1e293b;
    `;
    this.editorStack = editorStack;

    // 通用样式
    const commonStyle = `
      grid-area: 1 / 1;
      width: 100%;
      height: 100%;
      padding: 10px;
      box-sizing: border-box; 
      font-family: ${this.font}; 
      font-size: 14px; 
      line-height: ${this.lineHeight}px;
      white-space: pre-wrap; 
      word-wrap: break-word; 
      word-break: break-all;
      letter-spacing: 0px;
      border: none;
      margin: 0;
      outline: none;
    `;

    // 高亮层
    this.highlightedContent = document.createElement("div");
    this.highlightedContent.style.cssText = `
      ${commonStyle}
      color: #e2e8f0; 
      pointer-events: none;
      overflow-y: scroll;
      scrollbar-width: none;
      padding-bottom: 40px;
    `;
    
    // 滚动条样式
    const styleTag = document.createElement('style');
    styleTag.innerHTML = `.terminal-editor-overlay ::-webkit-scrollbar { width: 14px; background: #0f172a; } .terminal-editor-overlay ::-webkit-scrollbar-thumb { background: #334155; border-radius: 4px; }`;
    document.head.appendChild(styleTag);
    
    // 输入层
    this.textarea = document.createElement("textarea");
    this.textarea.value = this.content;
    this.textarea.spellcheck = false;
    this.textarea.style.cssText = `
      ${commonStyle}
      background: transparent; 
      color: transparent; 
      caret-color: #e2e8f0;
      resize: none; 
      z-index: 1;
      overflow-y: scroll;
      padding-bottom: 40px;
    `;
    
    editorStack.appendChild(this.highlightedContent);
    editorStack.appendChild(this.textarea);
    container.appendChild(editorStack);
    this.overlay.appendChild(container);

    // 4. 状态栏
    this.statusBar = document.createElement("div");
    this.statusBar.style.cssText = `
      display: flex; justify-content: space-between; align-items: center; margin-top: 8px; flex-shrink: 0;
      background: #334155; padding: 4px 12px; border-radius: 2px; color: #f8fafc; font-size: 12px;
    `;
    
    this.modeIndicator = document.createElement("span");
    this.modeIndicator.style.cssText = "padding: 2px 8px; border-radius: 2px; font-weight: bold; text-transform: uppercase;";
    this.positionIndicator = document.createElement("span");
    this.statusBar.appendChild(this.modeIndicator);
    this.statusBar.appendChild(this.positionIndicator);
    this.overlay.appendChild(this.statusBar);

    // 5. 命令栏
    const cmdContainer = document.createElement("div");
    cmdContainer.style.cssText = "display: none; align-items: center; height: 36px; background: #0f172a; border-top: 1px solid #334155; padding: 0 10px; flex-shrink: 0;";
    this.cmdPrompt = document.createElement("span");
    this.cmdPrompt.style.cssText = "color: #3b82f6; margin-right: 5px; font-weight: bold; font-family: inherit;";
    this.commandInput = document.createElement("input");
    this.commandInput.style.cssText = "flex: 1; background: transparent; color: #e2e8f0; border: none; padding: 5px 0; font-family: inherit; font-size: 14px; outline: none;";
    this.commandInputContainer = cmdContainer;
    cmdContainer.appendChild(this.cmdPrompt);
    cmdContainer.appendChild(this.commandInput);
    this.overlay.appendChild(cmdContainer);

    // 6. 提示框
    this.hintBox = document.createElement("div");
    this.hintBox.style.cssText = "color: #475569; font-size: 11px; margin-top: 8px; flex-shrink: 0;";
    this.hintBox.innerHTML = "NORMAL: i(编辑) / n(下个) / N(上个) / : (命令) / / (搜索)";
    this.overlay.appendChild(this.hintBox);

    this.errorBox = document.createElement("div");
    this.errorBox.style.cssText = "display: none; position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%); padding: 8px 16px; border-radius: 4px; font-size: 13px; z-index: 1000;";
    this.overlay.appendChild(this.errorBox);

    document.body.appendChild(this.overlay);
    this.textarea.focus();
  }

  _adjustScrollbarGap() {
    const scrollbarWidth = this.textarea.offsetWidth - this.textarea.clientWidth;
    this.highlightedContent.style.paddingRight = `${10 + scrollbarWidth}px`;
  }

  _bindEvents() {
    this.textarea.addEventListener("scroll", () => {
      this.highlightedContent.scrollTop = this.textarea.scrollTop;
      this.lineNumbers.scrollTop = this.textarea.scrollTop;
    });

    this.textarea.addEventListener("input", () => {
      this.content = this.textarea.value;
      this._updateUI();
      this._adjustScrollbarGap();
    });
    
    this._boundHandleResize = () => this._adjustScrollbarGap();
    window.addEventListener("resize", this._boundHandleResize);

    this.textarea.addEventListener("keydown", (e) => this._handleEditorKeydown(e));
    this.textarea.addEventListener("click", () => this._updateCursor());
    this.textarea.addEventListener("keyup", () => this._updateCursor());

    this.commandInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        this._executeLastLineCommand();
      } else if (e.key === "Escape") {
        this._switchMode("NORMAL");
      }
    });
  }

  _handleEditorKeydown(e) {
    if (this.mode === "INSERT") {
      if (e.key === "Escape") {
        e.preventDefault();
        this._switchMode("NORMAL");
      }
      return;
    }

    if (this.mode === "NORMAL") {
      const isMovementKey = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "PageUp", "PageDown", "Home", "End"].includes(e.key);
      if (!isMovementKey) e.preventDefault();

      const key = e.key;
      const content = this.textarea.value;
      const start = this.textarea.selectionStart;
      
      // --- 模式切换 ---
      if (key === "i") {
        this._switchMode("INSERT");
      } else if (key === "a") {
        this.textarea.selectionStart = Math.min(content.length, start + 1);
        this.textarea.selectionEnd = this.textarea.selectionStart;
        this._switchMode("INSERT");
      } else if (key === "o") {
        const lineEndPos = content.indexOf("\n", start);
        const actualEndPos = lineEndPos === -1 ? content.length : lineEndPos;
        const newContent = content.substring(0, actualEndPos) + "\n" + content.substring(actualEndPos);
        this.textarea.value = newContent;
        this.content = newContent;
        this.textarea.selectionStart = this.textarea.selectionEnd = actualEndPos + 1;
        this._updateUI();
        this._switchMode("INSERT");
      }
      
      // --- 搜索相关 (n/N) ---
      else if (key === "n") {
        this._findNext();
      } else if (key === "N") {
        this._findPrev();
      }

      // --- 删除/复制 ---
      else if (key === "d") {
        if (this.lastChar === "d") {
          const lines = content.split("\n");
          const currentLineIdx = content.substring(0, start).split("\n").length - 1;
          this.clipboard = lines[currentLineIdx];
          lines.splice(currentLineIdx, 1);
          this.textarea.value = lines.join("\n");
          this.content = this.textarea.value;
          this._updateUI();
          this._showMsg("已删除一行", "info");
          this.lastChar = "";
          this.textarea.selectionStart = start;
          this.textarea.selectionEnd = start;
        } else {
          this.lastChar = "d";
        }
      } else if (key === "y") {
        if (this.lastChar === "y") {
          const lines = content.split("\n");
          const currentLineIdx = content.substring(0, start).split("\n").length - 1;
          this.clipboard = lines[currentLineIdx];
          this._showMsg("已复制一行", "success");
          this.lastChar = "";
        } else {
          this.lastChar = "y";
        }
      } else if (key === "p") {
        if (this.clipboard) {
          const lines = content.split("\n");
          const currentLineIdx = content.substring(0, start).split("\n").length - 1;
          lines.splice(currentLineIdx + 1, 0, this.clipboard);
          this.textarea.value = lines.join("\n");
          this.content = this.textarea.value;
          this._updateUI();
        }
        this.lastChar = "";
      }

      // --- 基础移动 ---
      else if (key === "h") {
        this.textarea.selectionStart = Math.max(0, start - 1);
        this.textarea.selectionEnd = this.textarea.selectionStart;
        this._updateCursor();
      } else if (key === "l") {
        this.textarea.selectionStart = Math.min(content.length, start + 1);
        this.textarea.selectionEnd = this.textarea.selectionStart;
        this._updateCursor();
      } else if (key === "j" || key === "k") {
        const event = new KeyboardEvent("keydown", {
          key: key === "j" ? "ArrowDown" : "ArrowUp", bubbles: true
        });
        this.textarea.dispatchEvent(event);
      }

      // --- 命令入口 ---
      else if (key === ":") {
        this.cmdPrompt.textContent = ":";
        this._switchMode("COMMAND");
      } else if (key === "/") {
        this.cmdPrompt.textContent = "/";
        this._switchMode("COMMAND");
      } else {
        if (key !== "d" && key !== "y") this.lastChar = "";
      }
    }
  }

  _switchMode(mode) {
    this.mode = mode;
    this.commandInputContainer.style.display = (mode === "COMMAND") ? "flex" : "none";
    this.hintBox.style.display = (mode === "COMMAND") ? "none" : "block";

    if (mode === "COMMAND") {
      this.modeIndicator.textContent = "COMMAND";
      this.modeIndicator.style.background = "#3b82f6";
      this.commandInput.value = "";
      this.commandInput.focus();
    } else if (mode === "INSERT") {
      this.modeIndicator.textContent = "INSERT";
      this.modeIndicator.style.background = "#10b981";
      this.textarea.readOnly = false;
      this.textarea.focus();
    } else {
      this.modeIndicator.textContent = "NORMAL";
      this.modeIndicator.style.background = "#fbbf24";
      this.textarea.readOnly = true;
      this.textarea.focus();
    }
    this._updateUI(); 
  }

  async _executeLastLineCommand() {
    const rawCmd = this.commandInput.value.trim();
    const type = this.cmdPrompt.textContent;

    this._switchMode("NORMAL");
    this.textarea.focus();

    if (type === "/") {
      if (rawCmd === "") {
        // 主动清空搜索：/ + 回车 -> 清空高亮
        this.searchQuery = "";
        this._updateUI();
        this._showMsg("已清除搜索高亮", "info");
      } else {
        this.searchQuery = rawCmd;
        this._updateUI();
        this._performSearch();
      }
      return;
    }

    const cmd = rawCmd;
    if (cmd === "w") {
      if (this.options.onSave) await this.options.onSave(this.content);
      this._showMsg("已写入", "success");
    } else if (cmd === "q") {
      this.close();
    } else if (cmd === "wq") {
      if (this.options.onSave) await this.options.onSave(this.content);
      this.close();
    } else if (cmd === "q!") {
      this.close();
    } else if (cmd === "nohl") {
      this.searchQuery = "";
      this._updateUI();
      this._showMsg("已清除高亮", "info");
    } else if (cmd.startsWith("%s/")) {
      try {
        const parts = cmd.split("/");
        if (parts.length >= 3) {
          const oldStr = parts[1];
          const newStr = parts[2];
          const regex = new RegExp(oldStr, parts[3] === "g" ? "g" : "");
          this.content = this.content.replace(regex, newStr);
          this.textarea.value = this.content;
          this._updateUI();
          this._showMsg("替换完成", "success");
        }
      } catch (e) {
        this._showMsg("正则错误", "error");
      }
    } else {
      this._showMsg("未知命令", "error");
    }
  }

  _performSearch() {
    if (!this.searchQuery) return;
    this.textarea.focus();
    
    const startIndex = this.textarea.selectionStart;
    let index = this.content.indexOf(this.searchQuery, startIndex + 1);
    
    if (index === -1) {
      index = this.content.indexOf(this.searchQuery);
    }
    
    if (index !== -1) {
      this._scrollToMatch(index);
    } else {
      this._showMsg("未找到匹配项", "error");
    }
  }

  _findNext() {
    if (!this.searchQuery) {
        this._showMsg("无搜索模式", "error");
        return;
    }
    
    const start = this.textarea.selectionEnd; 
    let index = this.content.indexOf(this.searchQuery, start);
    
    if (index === -1) {
        index = this.content.indexOf(this.searchQuery);
        this._showMsg("回到顶部", "info");
    }
    
    if (index !== -1) {
        this._scrollToMatch(index);
    }
  }

  _findPrev() {
    if (!this.searchQuery) {
        this._showMsg("无搜索模式", "error");
        return;
    }

    const start = this.textarea.selectionStart; 
    let index = this.content.lastIndexOf(this.searchQuery, Math.max(0, start - 1));
    
    if (index === -1) {
        index = this.content.lastIndexOf(this.searchQuery);
        this._showMsg("回到底部", "info");
    }
    
    if (index !== -1) {
        this._scrollToMatch(index);
    }
  }

  _scrollToMatch(index) {
    this.textarea.setSelectionRange(index, index + this.searchQuery.length);
    
    const textBefore = this.content.substring(0, index);
    const linesBefore = textBefore.split("\n").length - 1;
    const targetScrollTop = (linesBefore * this.lineHeight) - (this.textarea.clientHeight / 2);
    
    this.textarea.scrollTop = Math.max(0, targetScrollTop);
    this._updateUI(); 
  }

  _updateUI() {
    const lines = this.textarea.value.split("\n");
    this.lineNumbers.innerHTML = lines.map((_, i) => i + 1).join("<br>");
    
    let highlightedHtml = lines.map(line => this._processLine(line)).join("\n");
    if (this.textarea.value.endsWith("\n")) {
      highlightedHtml += "\n ";
    }
    this.highlightedContent.innerHTML = highlightedHtml;
    this._updateCursor();
  }

  _processLine(line) {
    if (!line) return ""; 
    let processed = escapeHtml(line);
    
    if (this.searchQuery) {
      const safeQuery = escapeHtml(this.searchQuery).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      try {
        const regex = new RegExp(`(${safeQuery})`, "gi");
        processed = processed.replace(regex, `<mark style="background: #fbbf24; color: #000; border-radius: 2px;">$1</mark>`);
      } catch (e) {}
    }

    const tokenRegex = /(<[^>]+>)|(&quot;.*?&quot;)|(#.*)|(^\s*[\w\-_]+(?=\s*=))|(\b\d+\.?\d*\b)|([\[\]{}])|(&lt;!--.*?--&gt;)/g;
    return processed.replace(tokenRegex, (match, htmlTag, str, comment, key, num, brackets, htmlComment) => {
      if (htmlTag) return match; 
      if (str) return `<span style="color: #fbbf24;">${match}</span>`;
      if (comment || htmlComment) return `<span style="color: #64748b;">${match}</span>`;
      if (key) return `<span style="color: #3b82f6;">${match}</span>`;
      if (num) return `<span style="color: #10b981;">${match}</span>`;
      if (brackets) return `<span style="color: #8b5cf6;">${match}</span>`;
      return match;
    });
  }

  _updateCursor() {
    const start = this.textarea.selectionStart;
    const textBefore = this.textarea.value.substring(0, start);
    const lines = textBefore.split("\n");
    const row = lines.length;
    const col = lines[lines.length - 1].length + 1;
    this.positionIndicator.textContent = `${row}:${col}`;
  }

  _showMsg(msg, type) {
    this.errorBox.textContent = msg;
    this.errorBox.style.display = "block";
    this.errorBox.style.background = type === "error" ? "#7f1d1d" : (type === "success" ? "#064e3b" : "#1e293b");
    this.errorBox.style.color = "#f8fafc";
    this.errorBox.style.border = `1px solid ${type === "error" ? "#f43f5e" : (type === "success" ? "#10b981" : "#3b82f6")}`;
    setTimeout(() => {
      this.errorBox.style.display = "none";
    }, 2500);
  }

  _cleanup() {
    if (this._boundHandleResize) {
      window.removeEventListener("resize", this._boundHandleResize);
      this._boundHandleResize = null;
    }
    if (this.overlay && this.overlay.parentNode) {
      document.body.removeChild(this.overlay);
    }
  }
}

const vi = async (rawContext, ...args) => {
  const cmd = new CommandAPI(rawContext, args);
  const fileName = cmd.args[0];

  if (!fileName) {
    cmd.error("vi: 缺少文件名参数");
    return;
  }

  const { articles } = cmd.raw;
  let content = "";
  let isReadOnly = true;
  let fileType = "unknown";

  const cleanHtmlTags = (text) => {
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = text;
    return tempDiv.textContent || tempDiv.innerText || "";
  };

  if (fileName === "config.toml" && cmd.cwd === "/") {
    const rawContent = await cmd.readFile(fileName);
    content = cleanHtmlTags(rawContent || "");
    isReadOnly = false;
    fileType = "toml";
  } else if (fileName.endsWith(".md")) {
    fileType = "markdown";
    try {
      const currentContent = articles[cmd.cwd];
      if (currentContent && currentContent.type === "dir") {
        const fileInfo = currentContent.content.find(
          (item) => item.type === "file" && item.name === fileName
        );

        if (fileInfo) {
          const response = await fetch(fileInfo.path);
          if (response.ok) {
            content = await response.text();
            isReadOnly = true;
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
      cmd.error(`vi: ${fileName}: 没有那个文件或目录`);
      return;
    }
  } else {
    cmd.error(`vi: ${fileName}: 不支持的文件类型`);
    return;
  }

  const editor = new FullScreenEditor({
    fileName,
    readOnly: isReadOnly,
    language: fileType,
    onSave: async (newContent) => {
      if (fileName === "config.toml" && cmd.cwd === "/") {
        cmd.writeFile(fileName, newContent);
        cmd.success(`${fileName} 保存成功。`);
        await cmd.reloadConfig();
        cmd.info("配置已重载。");
      }
    },
    onExit: () => {
      if (!isReadOnly && fileName !== "config.toml") {
         cmd.info("已退出编辑器");
      }
    }
  });

  await editor.open(content);
};

export default vi;
