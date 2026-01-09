// 自动导入当前目录下所有的 .js 文件 (除了 index.js)
const modules = import.meta.glob('./*.js', { eager: true });

export const commands = {};

for (const path in modules) {
  // 忽略 index.js 自身
  if (path.includes('index.js')) continue;

  const module = modules[path];

  // 1. 处理默认导出 (export default)
  if (module.default) {
    // 假设默认导出的函数名即为命令名，或者文件名即为命令名
    // 这里优先使用函数名，如果没有名字则使用文件名
    const name = module.default.name || path.split('/').pop().replace('.js', '');
    commands[name] = module.default;
  }

  // 2. 处理命名导出 (export const ...)
  // 遍历模块的所有导出
  for (const key in module) {
    if (key !== 'default') {
      // 注册所有命名导出的函数
      // 特殊处理：如果导出的 key 包含 'Commands' 或 'Cmds' 后缀，可能不是命令本身，这里假设所有导出的函数都是命令
      // 为了安全起见，我们只注册函数类型的导出
      if (typeof module[key] === 'function') {
        // 处理特殊的别名映射，例如 viewFile -> cat
        if (key === 'viewFile') {
          commands['cat'] = module[key];
        } else {
          commands[key] = module[key];
        }
      }
    }
  }
}

export default commands;
