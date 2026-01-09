# 终端博客命令开发指南

本指南将介绍如何在 `src/commands/index.js` 文件中添加新命令，以扩展终端博客的功能。

## 命令系统架构

终端博客的命令系统采用模块化设计，所有命令函数集中在 `src/commands/index.js` 文件中管理。每个命令函数接收一个上下文对象和命令参数，并通过上下文对象与应用程序交互。

### 核心结构

```javascript
// 命令函数定义
const commandName = async (context, ...args) => {
  // 命令逻辑
};

// 命令映射
export const commands = {
  commandName,
  // 其他命令...
};
```

## 添加新命令的步骤

### 1. 定义命令函数

命令函数是一个异步函数，接收两个参数：
- `context`：上下文对象，包含应用程序的状态和工具函数
- `...args`：命令行参数（剩余参数语法）

### 2. 将命令添加到映射对象

将新定义的命令函数添加到 `commands` 对象中，键为命令名称。

## 上下文对象详解

上下文对象包含以下属性和方法：

| 属性/方法 | 类型 | 描述 |
|----------|------|------|
| `articles` | Object | 所有文章的目录结构 |
| `currentDir` | String | 当前工作目录 |
| `currentDirRef` | Ref | 当前工作目录的响应式引用 |
| `conversation` | Object | 当前对话对象，用于添加输出 |
| `getArticleInfo` | Function | 根据文件名获取文章信息 |
| `getDirIcon` | Function | 获取目录图标 |
| `fontSize` | Ref | 字体大小的响应式引用 |
| `font` | Object | 字体设置的响应式引用 |
| `background` | Object | 背景设置的响应式引用 |
| `theme` | Object | 主题设置的响应式引用 |
| `infoBarColors` | Ref | 信息栏颜色的响应式引用 |
| `conversations` | Ref | 所有对话的响应式引用 |
| `showWelcome` | Ref | 是否显示欢迎信息的响应式引用 |
| `clearHistory` | Function | 清除历史命令的函数 |

## 输出方法

使用辅助函数 `addOutput` 向当前对话添加输出：

```javascript
const addOutput = async (conversation, output, scroll = true) => {
  if (conversation) {
    conversation.output.push(output);
  }
};
```

### 输出对象结构

输出对象包含以下属性：

| 属性 | 类型 | 描述 |
|------|------|------|
| `type` | String | 输出类型（dir, glow, tree, error, success, help, info, output） |
| `content` | Any | 输出内容，根据类型不同可以是字符串、对象或数组 |

## 命令开发示例

### 示例 1：简单命令 - 显示当前时间

```javascript
// 定义命令函数
const time = async (context) => {
  const { conversation } = context;
  const currentTime = new Date().toLocaleString();
  
  await addOutput(conversation, {
    type: "output",
    content: `当前时间: ${currentTime}`
  });
};

// 添加到命令映射
export const commands = {
  time,
  // 其他命令...
};
```

### 示例 2：带参数的命令 - 显示指定目录的内容

```javascript
// 定义命令函数
const ls = async (context, targetDir) => {
  const { articles, currentDir, conversation } = context;
  let targetPath = currentDir;
  
  // 如果指定了目录，计算目标路径
  if (targetDir) {
    if (targetDir.startsWith("/")) {
      // 绝对路径
      targetPath = targetDir;
    } else {
      // 相对路径
      targetPath = currentDir === "/" ? `/${targetDir}` : `${currentDir}/${targetDir}`;
    }
  }
  
  const targetContent = articles[targetPath];
  if (targetContent && targetContent.type === "dir") {
    // 将目录和文件分开，先显示目录，再显示文件
    const dirs = targetContent.content.filter(item => item.type === "dir");
    const files = targetContent.content.filter(item => item.type === "file");
    
    // 合并结果：目录在前，文件在后
    const sortedContent = [...dirs, ...files];
    
    await addOutput(conversation, {
      type: "dir",
      content: sortedContent
    });
  } else {
    await addOutput(conversation, {
      type: "error",
      content: `Directory not found: ${targetDir || currentDir}`
    });
  }
};

// 添加到命令映射
export const commands = {
  ls,
  // 其他命令...
};
```

### 示例 3：调用外部 API 的命令

```javascript
// 定义命令函数
const weather = async (context, city = "Beijing") => {
  const { conversation } = context;
  
  try {
    // 显示加载信息
    await addOutput(conversation, {
      type: "info",
      content: `正在查询 ${city} 的天气...`
    });
    
    // 调用天气 API
    const response = await fetch(`https://wttr.in/${city}?format=j1`);
    const data = await response.json();
    
    // 解析天气数据
    const current = data.current_condition[0];
    const weatherInfo = `${city} 的当前天气：
温度: ${current.temp_C}°C
天气: ${current.weatherDesc[0].value}
湿度: ${current.humidity}%
风速: ${current.windspeedKmph} km/h`;
    
    await addOutput(conversation, {
      type: "output",
      content: weatherInfo
    });
  } catch (error) {
    await addOutput(conversation, {
      type: "error",
      content: `查询天气失败: ${error.message}`
    });
  }
};

// 添加到命令映射
export const commands = {
  weather,
  // 其他命令...
};
```

## 命令输出类型

### 1. 普通文本输出

```javascript
await addOutput(conversation, {
  type: "output",
  content: "普通文本输出"
});
```

### 2. 目录输出

```javascript
await addOutput(conversation, {
  type: "dir",
  content: [
    { name: "dir1", type: "dir", icon: "" },
    { name: "file1.md", type: "file", icon: "" }
  ]
});
```

### 3. 树状结构输出

```javascript
await addOutput(conversation, {
  type: "tree",
  content: "树形结构文本\n├── dir1\n│   └── file1.md\n└── dir2"
});
```

### 4. 错误信息

```javascript
await addOutput(conversation, {
  type: "error",
  content: "错误信息"
});
```

### 5. 成功信息

```javascript
await addOutput(conversation, {
  type: "success",
  content: "成功信息"
});
```

### 6. 帮助信息

```javascript
await addOutput(conversation, {
  type: "help",
  content: "帮助信息"
});
```

### 7. 提示信息

```javascript
await addOutput(conversation, {
  type: "info",
  content: "提示信息"
});
```

### 8. Markdown 内容输出

```javascript
await addOutput(conversation, {
  type: "glow",
  content: {
    title: "文章标题",
    date: "2023-01-01",
    category: "tech",
    content: "<h1>Markdown 内容</h1><p>解析后的 HTML 内容</p>"
  },
  theme: "default"
});
```

## 命令开发最佳实践

### 1. 使用异步函数

所有命令函数都应该是异步函数，以便处理异步操作（如文件读取、网络请求等）。

### 2. 错误处理

使用 try-catch 块捕获并处理可能的错误，向用户显示友好的错误信息。

### 3. 命令文档

在命令函数中添加注释，说明命令的功能、参数和使用方法。对于复杂命令，建议在 `help` 命令中添加文档。

### 4. 测试

开发新命令后，建议手动测试命令的各种情况，包括：
- 正常执行
- 错误情况
- 边界条件
- 参数变化

### 5. 性能考虑

- 避免阻塞操作
- 合理使用 `await`
- 对于大量数据，考虑分页或延迟加载

## 命令命名约定

- 命令名称应该简洁明了，使用小写字母
- 避免使用保留字和已存在的命令名称
- 对于复合命令，使用连字符分隔（如 `test-config`）

## 示例命令开发流程

1. 确定命令功能和名称
2. 定义命令函数
3. 实现命令逻辑
4. 添加输出处理
5. 将命令添加到命令映射
6. 测试命令功能
7. 更新帮助文档（如果需要）

## 现有命令参考

查看 `src/commands/index.js` 文件中的现有命令，了解命令的实现方式和最佳实践。

## 总结

通过遵循本指南，您可以轻松地在终端博客中添加新命令，扩展其功能。命令系统的模块化设计使得添加和维护命令变得简单高效。

祝您开发愉快！