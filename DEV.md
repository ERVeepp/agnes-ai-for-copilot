# 开发者维护文档

## 发布到 VS Code 插件商店

**前置条件**：[Azure DevOps](https://dev.azure.com/) 账号 + [VS Code Marketplace](https://marketplace.visualstudio.com/manage) 发布者。

```bash
# 1. 全局安装 vsce（仅首次）
npm install -g @vscode/vsce

# 2. 创建发布者（仅首次）
# 访问 https://marketplace.visualstudio.com/manage → Create Publisher

# 3. 获取 Personal Access Token
# https://dev.azure.com/ → User Settings → Personal Access Tokens
# 权限勾选 Marketplace (Read & Manage)

# 4. 登录
npx @vscode/vsce login <你的发布者ID>

# 5. 编译并打包
npx @vscode/vsce package

# 6. 发布
npx @vscode/vsce publish
```

发布后商店地址：<br>
`https://marketplace.visualstudio.com/items?itemName=<发布者>.agnes-ai-for-copilot-chat`

已发布扩展：[erveepp.agnes-ai-for-copilot-chat](https://marketplace.visualstudio.com/items?itemName=erveepp.agnes-ai-for-copilot-chat)

## 版本号规则

更新 `package.json` 中 `version` 字段，发布时自动识别。

## 编译

```bash
npx tsc -p ./
```

生成产物在 `out/` 目录。
