import { CommandAPI } from "../composables/CommandAPI";

// help 命令
export const help = async (rawContext, ...args) => {
  const cmd = new CommandAPI(rawContext, args);
  const showAll = cmd.args.includes("-l");

  const commonHelpText = `用法: <command> [options]

命令列表:

  ls                    列出目录内容
  cd <dir>              切换目录
  cat <file>            查看Markdown文件内容
  read <file>           全屏阅读器 (支持TOC/搜索)
  tree                  显示目录结构
  help                  显示此帮助信息
  size <num|default>    设置字体大小 (1-26|default)
  font [font-name]      显示当前字体或设置字体 (0xProto Nerd Font|Fira Code|Cascadia Code|JetBrains Mono)
  background [0-1]      显示当前背景设置或设置透明度
  wget <file>           下载文件
  vi <file>             编辑文件 (config.toml)

💡 提示: 输入 'help -l' 查看所有可用命令`;

  const fullHelpText = `终端博客命令帮助

用法: <command> [options]

基本命令:

  ls                    列出目录内容
  cd <dir>              切换目录
  cat <file>            查看Markdown文件内容
  read <file>           全屏阅读器 (支持TOC/搜索/主题)
  tree                  显示完整目录结构
  find <term>           搜索文章名称
  wget <file>           下载文件
  vi <file>             编辑文件 (config.toml)

网络命令:

  ipconfig              显示网络配置信息
  ping <host>           发送ICMP回显请求

终端设置:

  size <num|default>    设置字体大小 (1-26|default)
  font [font-name]      显示当前字体或设置字体
  background            显示当前背景设置
  background <0-1>      设置背景透明度 (0-1之间的数值)
  theme                 显示当前主题和可用主题
  theme <name>          设置Markdown主题

实用命令:

  echo <message>        打印消息
  clear                 清空终端
  help                  显示此帮助信息
  help -l               显示完整帮助信息
  test-config           测试配置加载
  clear-config          清除所有配置和历史命令

💡 提示: 输入命令名称后按Tab键可进行自动补全`;

  cmd.help(showAll ? fullHelpText : commonHelpText);
};

// clear 命令
export const clear = async (rawContext, ...args) => {
  const cmd = new CommandAPI(rawContext, args);
  cmd.clear();
};

// echo 命令
export const echo = async (rawContext, ...args) => {
  const cmd = new CommandAPI(rawContext, args);
  const message = cmd.args.join(" "); // 拼接所有参数
  
  // 检查是否是文件
  const fileName = cmd.args[0];
  if (cmd.args.length === 1 && fileName) {
    // 尝试在当前目录查找文件
    let fileContent = null;
    try {
      fileContent = await cmd.readFile(fileName);
    } catch (e) {}
    
    if (fileContent !== null) {
      cmd.print(fileContent);
      return;
    }
  }

  cmd.print(message); // 输出普通文本
};
