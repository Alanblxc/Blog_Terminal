# GitHub 发布步骤指南

## 步骤 1：在 GitHub 上创建仓库

1. 登录您的 GitHub 账号
2. 点击右上角的 `+` 图标，选择 `New repository`
3. 填写仓库信息：
   - **Repository name**：输入 `blog_Terminal`（注意大小写）
   - **Description**：输入 `基于 Vue 3 + Vite 的终端风格博客应用`
   - **Visibility**：选择 `Public`（公开）
   - 不要勾选 `Add a README file`（我们已经有了 README.md 文件）
   - 不要勾选 `Add .gitignore`（我们已经有了 .gitignore 文件）
   - 不要选择 `License`（我们已经有了 LICENSE 文件）
4. 点击 `Create repository` 按钮

## 步骤 2：复制仓库 URL

创建仓库后，您会看到仓库页面，复制页面上显示的 HTTPS 或 SSH URL。例如：
- HTTPS URL：`https://github.com/your-username/blog_Terminal.git`
- SSH URL：`git@github.com:your-username/blog_Terminal.git`

## 步骤 3：添加远程仓库

打开终端或命令提示符，导航到您的项目目录，然后执行以下命令（替换为您的仓库 URL）：

```bash
git remote add origin https://github.com/your-username/blog_Terminal.git
```

## 步骤 4：推送代码到 GitHub

执行以下命令将本地代码推送到 GitHub：

```bash
git push -u origin main
```

如果您使用的是 SSH URL，可能需要输入 SSH 密钥密码。

如果您使用的是 HTTPS URL，可能需要输入 GitHub 用户名和密码（或个人访问令牌）。

## 步骤 5：验证推送结果

在浏览器中刷新 GitHub 仓库页面，您应该能看到您的项目代码已经成功推送到 GitHub 上。

## 常见问题

### Q：推送时提示 "fatal: 'main' does not appear to be a git repository"？
A：这可能是因为您的本地分支名称不是 `main`。执行以下命令查看本地分支名称：
```bash
git branch
```
如果本地分支名称是 `master`，则使用以下命令推送：
```bash
git push -u origin master
```

### Q：推送时提示 "fatal: Authentication failed for..."？
A：这是因为您的 GitHub 用户名或密码（或个人访问令牌）不正确。请确保您输入的是正确的 GitHub 凭证。

### Q：推送时提示 "error: failed to push some refs to..."？
A：这可能是因为 GitHub 仓库已经有内容，而您的本地仓库没有这些内容。执行以下命令将 GitHub 仓库的内容拉取到本地，然后再次推送：
```bash
git pull origin main --allow-unrelated-histories
git push -u origin main
```

## 后续步骤

1. 配置 GitHub Pages（可选）：
   - 在 GitHub 仓库页面，点击 `Settings` 选项卡
   - 点击左侧菜单中的 `Pages`
   - 在 `Source` 部分，选择 `Deploy from a branch`
   - 在 `Branch` 部分，选择 `main` 分支和 `/root` 文件夹
   - 点击 `Save`
   - 等待几分钟，您可以通过 `https://your-username.github.io/blog_Terminal/` 访问您的博客

2. 添加 GitHub Actions 工作流（可选）：
   - 自动构建和部署项目
   - 自动运行测试
   - 自动生成文档

祝您发布成功！🎉