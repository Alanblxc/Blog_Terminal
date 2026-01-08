# GitHub 发布指南

本指南将帮助您将终端博客项目发布到 GitHub 上。

## 准备工作

1. 确保您已经安装了 Git
2. 确保您已经拥有 GitHub 账号
3. 确保您的项目已经包含以下文件：
   - `README.md`（项目说明文档）
   - `LICENSE`（许可证文件）
   - `.gitignore`（Git 忽略文件）

## 步骤 1：在 GitHub 上创建新仓库

1. 登录您的 GitHub 账号
2. 点击右上角的 `+` 图标，选择 `New repository`
3. 填写仓库信息：
   - **Repository name**：输入仓库名称，例如 `blog-terminal`
   - **Description**：输入仓库描述，例如 "基于 Vue 3 + Vite 的终端风格博客应用"
   - **Visibility**：选择 `Public`（公开）或 `Private`（私有）
   - 勾选 `Add a README file`（可选，我们已经有了 README.md 文件）
   - 勾选 `Add .gitignore`（可选，我们已经有了 .gitignore 文件）
   - 选择 `License`：MIT License（我们已经有了 LICENSE 文件）
4. 点击 `Create repository` 按钮

## 步骤 2：将本地项目推送到 GitHub

### 方法 1：使用 Git 命令行

1. 打开终端或命令提示符
2. 导航到您的项目目录：
   ```bash
   cd d:/project/blog_terminal/blog_terminal
   ```
3. 初始化 Git 仓库（如果尚未初始化）：
   ```bash
   git init
   ```
4. 添加所有文件到暂存区：
   ```bash
   git add .
   ```
5. 提交文件：
   ```bash
   git commit -m "Initial commit"
   ```
6. 添加远程仓库（替换 `your-username` 和 `your-repository` 为您的 GitHub 用户名和仓库名称）：
   ```bash
   git remote add origin https://github.com/your-username/your-repository.git
   ```
7. 推送代码到 GitHub：
   ```bash
   git push -u origin main
   ```

### 方法 2：使用 GitHub Desktop

1. 下载并安装 [GitHub Desktop](https://desktop.github.com/)
2. 打开 GitHub Desktop
3. 点击 `File` > `Add Local Repository`
4. 选择您的项目目录
5. 点击 `Add Repository`
6. 点击 `Publish repository`
7. 选择您的 GitHub 账号
8. 输入仓库名称和描述
9. 选择 `Public` 或 `Private`
10. 点击 `Publish Repository`

## 步骤 3：配置 GitHub Pages（可选）

如果您想将博客部署到 GitHub Pages 上，可以按照以下步骤操作：

1. 在 GitHub 仓库页面，点击 `Settings` 选项卡
2. 点击左侧菜单中的 `Pages`
3. 在 `Source` 部分，选择 `Deploy from a branch`
4. 在 `Branch` 部分：
   - 选择 `main` 或 `master` 分支
   - 选择 `/docs` 文件夹（如果您将构建文件放在 docs 文件夹中）
   或选择 `/root` 文件夹（如果您将构建文件放在根目录中）
5. 点击 `Save`
6. 等待几分钟，GitHub Pages 会自动部署您的博客
7. 您可以通过 `https://your-username.github.io/your-repository/` 访问您的博客

## 步骤 4：完善文档

为了让您的项目更受欢迎，建议您进一步完善文档：

1. 更新 `README.md` 文件，添加更多项目细节和使用指南
2. 创建 `CONTRIBUTING.md` 文件，说明如何贡献代码
3. 创建 `CHANGELOG.md` 文件，记录项目的版本变更
4. 添加项目截图到 `README.md` 文件中
5. 添加 GitHub Actions 工作流，自动构建和部署项目

## 步骤 5：宣传您的项目（可选）

1. 在 Twitter、LinkedIn、Reddit 等社交媒体上分享您的项目
2. 提交您的项目到相关的开源项目列表网站
3. 邀请朋友和同事试用您的项目，并提供反馈

## 常见问题

### Q：我忘记了 Git 用户名和邮箱，如何设置？
A：您可以使用以下命令设置 Git 用户名和邮箱：
```bash
git config --global user.name "Your Name"
git config --global user.email "your-email@example.com"
```

### Q：如何生成 SSH 密钥，以便无需每次都输入密码？
A：您可以按照 [GitHub 官方指南](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/generating-a-new-ssh-key-and-adding-it-to-the-ssh-agent) 生成 SSH 密钥。

### Q：如何更新 GitHub 上的代码？
A：您可以使用以下命令更新代码：
```bash
git add .
git commit -m "Update description"
git push
```

## 资源链接

- [Git 官方文档](https://git-scm.com/doc)
- [GitHub 官方文档](https://docs.github.com/)
- [GitHub Pages 官方文档](https://docs.github.com/en/pages)

祝您发布成功！🎉