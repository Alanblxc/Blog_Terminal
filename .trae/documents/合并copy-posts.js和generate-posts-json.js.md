# 合并脚本文件并将配置移至config.toml计划

## 1. 项目现状分析
当前项目存在以下问题：
1. 脚本文件过多（generate-posts-json.js 和 copy-posts.js）
2. 配置信息硬编码在App.vue中，不便于用户自定义
3. 重复的功能代码

## 2. 优化目标
1. 合并脚本文件，减少文件数量
2. 将配置信息移至config.toml，便于用户自定义
3. 保持所有原有功能完整
4. 简化构建流程
5. 提高代码可维护性

## 3. 实现步骤

### 步骤1：创建config.toml配置文件
1. 将以下配置信息从App.vue迁移到config.toml：
   - 用户信息（user）
   - UI相关配置（fontSize, background）
   - 主题配置（currentTheme, availableThemes）
   - 其他可自定义配置

2. config.toml文件结构设计：
   ```toml
   [app]
   user = "Alan"
   
   [ui]
   fontSize = "16"
   
   [background]
   image = "/background.jpg"
   opacity = "0.9"
   
   [theme]
   current = "default"
   available = ["default", "dark", "light", "solarized", "dracula"]
   ```

### 步骤2：修改App.vue，加载config.toml配置
1. 导入@iarna/toml库
2. 读取并解析config.toml文件
3. 使用配置文件中的值初始化状态

### 步骤3：合并脚本文件
1. 修改generate-posts-json.js：
   - 保留生成posts.json的核心功能
   - 添加复制README.md到dist的功能
   - 添加复制posts.json到dist的功能
   - 优化复制目录函数，显示详细日志

2. 更新package.json：
   - 修改build脚本，移除对copy-posts.js的调用
   - 修改copy-posts脚本，直接调用合并后的generate-posts-json.js

3. 删除冗余的copy-posts.js文件

## 4. 预期效果
- 项目中减少一个脚本文件
- 配置信息集中管理，便于用户自定义
- 保持所有原有功能完整
- 简化构建流程
- 提高代码可维护性

## 5. 关键功能保留
- 生成posts.json文件
- 复制post目录到dist
- 复制README.md到dist
- 复制posts.json到dist
- 详细的日志输出
- 错误处理
- 所有原有配置的可自定义性

## 6. 代码结构设计

### config.toml
```toml
# 应用配置
[app]
user = "Alan"

# UI配置
[ui]
fontSize = "16"

# 背景配置
[background]
image = "/background.jpg"
opacity = "0.9"

# 主题配置
[theme]
current = "default"
available = ["default", "dark", "light", "solarized", "dracula"]
```

### generate-posts-json.js
```javascript
// 1. 导入依赖
// 2. 配置常量
// 3. 生成posts.json的核心功能
// 4. 复制功能（合并后的）
//    - 复制post目录
//    - 复制README.md
//    - 复制posts.json
// 5. 输出结果
```

### App.vue修改
```javascript
// 1. 导入@iarna/toml
// 2. 读取config.toml配置
// 3. 使用配置初始化状态
```

通过这个计划，我们将实现脚本文件合并和配置外置的双重目标，使项目结构更加简化，配置更加灵活。