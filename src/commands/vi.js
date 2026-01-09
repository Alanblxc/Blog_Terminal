// src/commands/vi.js
import { escapeHtml } from "../js/utils"; // 复用工具函数

// 辅助函数：向当前对话添加输出
const addOutput = async (conversation, output) => {
  if (conversation) conversation.output.push(output);
};

// vi 命令 - 终端内编辑文件
const vi = async (context, fileName) => {
  const { articles, currentDir, conversation, reloadConfig } = context;

  // 检查是否是config.toml或.md文件
  if (!fileName) {
    await addOutput(conversation, {
      type: "error",
      content: `vi: missing filename`,
    });
    return;
  }

  // 确定文件类型和内容
  let fileContent = "";
  let isConfigFile = fileName === "config.toml";
  let isMdFile = fileName.endsWith(".md");
  let canSave = isConfigFile;

  // 清理HTML标签的函数，确保只处理纯文本
  const cleanHtmlTags = (text) => {
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = text;
    return tempDiv.textContent || tempDiv.innerText || "";
  };

  // 获取文件内容
  if (isConfigFile) {
    // config.toml从localStorage获取，确保是纯文本
    const rawContent = localStorage.getItem("terminalConfigToml") || "";
    fileContent = cleanHtmlTags(rawContent);
  } else if (isMdFile) {
    // .md文件从服务器获取
    try {
      // 获取当前目录下的文件信息
      const currentContent = articles[currentDir];
      if (currentContent && currentContent.type === "dir") {
        const fileInfo = currentContent.content.find(
          (item) => item.type === "file" && item.name === fileName
        );

        if (fileInfo) {
          // 读取文件内容
          const response = await fetch(fileInfo.path.replace("./", "/"));
          if (response.ok) {
            fileContent = await response.text();
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
      await addOutput(conversation, {
        type: "error",
        content: `vi: ${fileName}: No such file or directory`,
      });
      return;
    }
  } else {
    await addOutput(conversation, {
      type: "error",
      content: `vi: ${fileName}: Unsupported file type`,
    });
    return;
  }

  // 显示编辑器提示
  let editHint = "";
  if (!canSave) {
    editHint = " (READ-ONLY: .md files cannot be saved)";
  }

  await addOutput(conversation, {
    type: "info",
    content: `=== EDITING ${fileName}${editHint} ===\n`,
  });

  // 创建一个覆盖整个终端的编辑器
  const editorOverlay = document.createElement("div");
  editorOverlay.className = "terminal-editor-overlay";
  editorOverlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: #0f172a;
    z-index: 999;
    display: flex;
    flex-direction: column;
    padding: 20px;
    box-sizing: border-box;
    font-family: 'Cascadia Code', monospace;
  `;

  // 创建编辑器标题
  const editorTitle = document.createElement("div");
  editorTitle.style.cssText = `
    color: #e2e8f0;
    font-size: 16px;
    margin-bottom: 15px;
    font-weight: bold;
  `;
  editorTitle.textContent = `EDITING: ${fileName}`;
  editorOverlay.appendChild(editorTitle);

  // 创建编辑器容器
  const editorContainer = document.createElement("div");
  editorContainer.style.cssText = `
    flex: 1;
    position: relative;
    background: #1e293b;
    border: 1px solid #475569;
    border-radius: 4px;
    overflow: hidden;
    font-family: 'Cascadia Code', monospace;
    font-size: 14px;
    line-height: 1.5;
  `;

  // 创建行号
  const lineNumbers = document.createElement("div");
  lineNumbers.style.cssText = `
    position: absolute;
    left: 0;
    top: 0;
    width: 50px;
    background: #0f172a;
    color: #64748b;
    padding: 15px 8px;
    box-sizing: border-box;
    font-size: 14px;
    line-height: 1.5;
    text-align: right;
    user-select: none;
  `;
  editorContainer.appendChild(lineNumbers);

  // 创建高亮内容显示区
  const highlightedContent = document.createElement("div");
  highlightedContent.style.cssText = `
    position: absolute;
    left: 50px;
    top: 0;
    right: 0;
    bottom: 0;
    margin: 0;
    padding: 15px;
    box-sizing: border-box;
    background: transparent;
    color: #e2e8f0;
    font-family: 'Cascadia Code', monospace;
    font-size: 14px;
    line-height: 1.5;
    white-space: pre-wrap;
    word-wrap: break-word;
    overflow: hidden;
    pointer-events: none;
  `;
  editorContainer.appendChild(highlightedContent);

  // 创建文本区域
  const textarea = document.createElement("textarea");
  textarea.value = fileContent;
  textarea.style.cssText = `
    position: absolute;
    left: 50px;
    top: 0;
    right: 0;
    bottom: 0;
    width: calc(100% - 50px);
    height: 100%;
    background: transparent;
    color: transparent;
    border: none;
    padding: 15px;
    box-sizing: border-box;
    font-family: 'Cascadia Code', monospace;
    font-size: 14px;
    line-height: 1.5;
    resize: none;
    outline: none;
    caret-color: #e2e8f0;
    z-index: 1;
  `;
  editorContainer.appendChild(textarea);

  // 创建状态栏
  const statusBar = document.createElement("div");
  statusBar.style.cssText = `
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 10px;
    background: #1e293b;
    padding: 5px 10px;
    border-radius: 3px;
    color: #e2e8f0;
    font-size: 12px;
  `;

  // 状态栏内容
  const modeIndicator = document.createElement("span");
  modeIndicator.textContent = "INSERT";
  modeIndicator.style.cssText = `
    color: #10b981;
    font-weight: bold;
  `;

  const fileIndicator = document.createElement("span");
  fileIndicator.textContent = fileName;

  const positionIndicator = document.createElement("span");
  positionIndicator.textContent = "1:1";

  statusBar.appendChild(modeIndicator);
  statusBar.appendChild(fileIndicator);
  statusBar.appendChild(positionIndicator);

  // 创建命令输入区域
  const commandContainer = document.createElement("div");
  commandContainer.style.cssText = `
    display: flex;
    align-items: center;
    margin-top: 15px;
    background: #1e293b;
    padding: 10px;
    border-radius: 3px;
    display: none; /* 初始隐藏，仅在命令模式下显示 */
  `;

  // 命令提示符
  const commandPrompt = document.createElement("span");
  commandPrompt.style.cssText = `
    color: #e2e8f0;
    margin-right: 10px;
    font-weight: bold;
  `;
  commandPrompt.textContent = ":";
  commandContainer.appendChild(commandPrompt);

  // 命令输入框
  const commandInput = document.createElement("input");
  commandInput.type = "text";
  commandInput.placeholder = "Enter command (wq, q!)";
  commandInput.style.cssText = `
    flex: 1;
    background: #0f172a;
    color: #e2e8f0;
    border: 1px solid #475569;
    border-radius: 3px;
    padding: 5px 10px;
    font-family: 'Cascadia Code', monospace;
    font-size: 14px;
    outline: none;
  `;
  commandContainer.appendChild(commandInput);

  // 创建指令提示
  const instructions = document.createElement("div");
  instructions.style.cssText = `
    color: #94a3b8;
    font-size: 12px;
    margin-top: 15px;
    background: #1e293b;
    padding: 10px;
    border-radius: 3px;
  `;
  instructions.innerHTML = `
    <strong>COMMANDS:</strong><br>
    <code>:w</code> - Save file<br>
    <code>:wq</code> - Save and exit<br>
    <code>:q</code> - Quit without saving (if no changes)<br>
    <code>:q!</code> - Quit without saving<br>
    <code>:</code> - Enter command mode<br>
    <code>ESC</code> - Return to edit mode from command mode
  `;

  // 添加到编辑器覆盖层
  editorOverlay.appendChild(editorContainer);
  editorOverlay.appendChild(statusBar);
  editorOverlay.appendChild(commandContainer);
  editorOverlay.appendChild(instructions);

  // 更新行号
  const updateLineNumbers = () => {
    const lines = textarea.value.split("\n");
    const lineCount = lines.length;
    let lineNumbersHTML = "";
    for (let i = 1; i <= lineCount; i++) {
      lineNumbersHTML += `${i}\n`;
    }
    lineNumbers.textContent = lineNumbersHTML;
  };

  // 更新光标位置
  const updatePosition = () => {
    const start = textarea.selectionStart;
    const content = textarea.value;
    const lines = content.substring(0, start).split("\n");
    const line = lines.length;
    const col = lines[lines.length - 1].length + 1;
    positionIndicator.textContent = `${line}:${col}`;
  };

  /**
   * 2. 核心：单行处理函数（Tokenizer 模式）
   * 使用组合正则一次性扫描，避免高亮规则冲突
   */
  const processLine = (line) => {
    if (!line) return "<br>"; // 保持空行高度
    // 定义所有语法的组合正则
    // 注意顺序非常重要：
    // 1. 字符串 ("...") - 必须最先匹配，防止字符串里的 # 被当成注释，或字符串里的数字被拆分
    // 2. 注释 (#...) - 匹配到行尾
    // 3. 键名 (key =) - 匹配行首的单词
    // 4. 数字 - 整数或小数
    // 5. 括号 - [] {}
    const tokenRegex =
      /("[^"]*")|(#.*)|(^\s*[\w\-_]+(?=\s*=))|(\b\d+\.?\d*\b)|([\[\]{}])/g;
    let html = "";
    let lastIndex = 0;
    let match;
    // 循环匹配当前行
    while ((match = tokenRegex.exec(line)) !== null) {
      // A. 处理匹配内容之前的普通文本（比如空格、等号等）
      const plainText = line.substring(lastIndex, match.index);
      if (plainText) {
        html += escapeHtml(plainText);
      }
      // B. 解构正则捕获组
      // fullMatch 是完全匹配的内容
      // 后面对应上面正则的 5 个括号组
      const [fullMatch, string, comment, key, number, brackets] = match;
      // C. 根据捕获到的类型，包裹对应的颜色标签
      // 注意：这里必须先 escapeHtml(内容)，再包裹 span
      if (string) {
        html += `<span style="color: #fbbf24;">${escapeHtml(string)}</span>`;
      } else if (comment) {
        html += `<span style="color: #64748b;">${escapeHtml(comment)}</span>`;
      } else if (key) {
        html += `<span style="color: #3b82f6;">${escapeHtml(key)}</span>`;
      } else if (number) {
        html += `<span style="color: #10b981;">${escapeHtml(number)}</span>`;
      } else if (brackets) {
        html += `<span style="color: #8b5cf6;">${escapeHtml(brackets)}</span>`;
      }
      // 更新指针位置
      lastIndex = tokenRegex.lastIndex;
    }
    // D. 处理行尾剩余的普通文本
    const remaining = line.substring(lastIndex);
    if (remaining) {
      html += escapeHtml(remaining);
    }
    return html;
  };

  /**
   * 3. 主应用函数
   */
  const applySyntaxHighlighting = () => {
    // 获取原始内容
    const rawText = textarea.value || "";

    // 按行分割
    const lines = rawText.split("\n");
    // 处理每一行
    const htmlResult = lines
      .map((line) => {
        // 处理当前行
        return processLine(line);
      })
      .join("\n");
    // 一次性写入 DOM
    highlightedContent.innerHTML = htmlResult;
  };

  // 同步滚动
  textarea.addEventListener("scroll", () => {
    highlightedContent.scrollTop = textarea.scrollTop;
    lineNumbers.scrollTop = textarea.scrollTop;
  });

  // 输入事件处理
  textarea.addEventListener("input", () => {
    updateLineNumbers();
    applySyntaxHighlighting();
    updatePosition();
  });

  // 点击和按键事件处理
  textarea.addEventListener("click", updatePosition);
  textarea.addEventListener("keydown", updatePosition);

  // 初始化
  updateLineNumbers();
  applySyntaxHighlighting();
  updatePosition();

  // 添加到页面
  document.body.appendChild(editorOverlay);

  // 聚焦到文本框
  textarea.focus();

  // 资源清理函数
  const cleanupEditor = () => {
    try {
      // 移除DOM元素
      if (editorOverlay.parentNode) {
        document.body.removeChild(editorOverlay);
      }
    } catch (error) {
      console.error("Error cleaning up editor:", error);
    }
  };

  // 返回一个Promise，确保vi命令不会立即结束
  return new Promise(async (resolve) => {
    try {
      // 切换到命令模式
      const switchToCommandMode = () => {
        textarea.blur();
        textarea.style.borderColor = "#3c3c3c";
        commandContainer.style.display = "flex";
        commandInput.focus();
        modeIndicator.textContent = "COMMAND";
        modeIndicator.style.color = "#f43f5e";
      };

      // 切换到编辑模式
      const switchToEditMode = () => {
        commandInput.blur();
        commandContainer.style.display = "none";
        textarea.style.borderColor = "#3c3c3c";
        textarea.focus();
        modeIndicator.textContent = "INSERT";
        modeIndicator.style.color = "#10b981";
      };

      // 创建错误信息显示区域
      const errorContainer = document.createElement("div");
      errorContainer.style.cssText = `
      color: #ff0000;
      font-size: 12px;
      margin-top: 10px;
      padding: 8px;
      background: rgba(255, 0, 0, 0.1);
      border-radius: 3px;
      display: none;
    `;
      editorOverlay.appendChild(errorContainer);

      // 显示错误信息
      const showError = (message) => {
        errorContainer.textContent = message;
        errorContainer.style.display = "block";
        // 3秒后自动隐藏错误信息
        setTimeout(() => {
          errorContainer.style.display = "none";
        }, 3000);
      };

      // 显示成功信息
      const showSuccess = (message) => {
        errorContainer.textContent = message;
        errorContainer.style.color = "#00ff00";
        errorContainer.style.background = "rgba(0, 255, 0, 0.1)";
        errorContainer.style.display = "block";
        // 3秒后自动隐藏成功信息
        setTimeout(() => {
          errorContainer.style.display = "none";
        }, 3000);
      };

      // 处理命令
      const handleCommand = async (command) => {
        // 清理命令输入
        const cmd = command.trim();
        commandInput.value = ""; // 清空命令输入框

        switch (cmd) {
          case "w":
            if (canSave) {
              // 保存文件 - 只允许config.toml保存
              const newContent = textarea.value;
              localStorage.setItem("terminalConfigToml", newContent);

              // 显示成功信息
              showSuccess(`${fileName} saved successfully.`);
              switchToEditMode();

              // 重新加载配置
              if (reloadConfig) {
                await reloadConfig();
              }
            } else {
              // .md文件不允许保存
              showError(`Cannot save ${fileName}: Read-only file`);
              switchToEditMode();
            }
            break;

          case "wq":
            if (canSave) {
              // 保存并退出 - 只允许config.toml保存
              const newContent = textarea.value;
              localStorage.setItem("terminalConfigToml", newContent);

              // 通知用户保存成功
              await addOutput(conversation, {
                type: "success",
                content: `${fileName} saved successfully.`,
              });

              // 重新加载配置
              if (reloadConfig) {
                await reloadConfig();
                await addOutput(conversation, {
                  type: "info",
                  content: "Configuration reloaded successfully.",
                });
              }

              // 清理资源并解决Promise，结束vi命令
              cleanupEditor();
              resolve();
            } else {
              // .md文件不允许保存
              showError(`Cannot save ${fileName}: Read-only file`);
              switchToEditMode();
            }
            break;

          case "q":
          case "q!":
            // 退出不保存
            await addOutput(conversation, {
              type: "info",
              content: `Exited without saving.`,
            });

            // 清理资源并解决Promise，结束vi命令
            cleanupEditor();
            resolve();
            break;

          case "":
            // 空命令，返回编辑模式
            switchToEditMode();
            break;

          default:
            // 未知命令，显示错误并返回编辑模式
            showError(`Unknown command: ${cmd}`);
            switchToEditMode();
            break;
        }
      };

      // 监听文本区域的键盘事件
      textarea.addEventListener("keydown", (e) => {
        if (e.key === ":") {
          // 输入:进入命令模式
          switchToCommandMode();
          e.preventDefault(); // 阻止:字符被输入到文本框
        }
      });

      // 监听命令输入框的键盘事件
      commandInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          // 回车键执行命令
          handleCommand(commandInput.value);
        } else if (e.key === "Escape") {
          // ESC键返回编辑模式
          switchToEditMode();
        }
      });
    } catch (error) {
      console.error("Error in vi editor:", error);
      // 清理资源并解决Promise，结束vi命令
      cleanupEditor();
      resolve();
    }
  });
};

export default vi;
