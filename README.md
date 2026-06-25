# Agnes AI for Copilot Chat

将 Agnes AI 模型接入 VS Code Copilot Chat，在编辑器中直接使用 Sapiens AI 的模型能力。

## 安装

1. 下载 `.vsix` 文件，`Ctrl+Shift+P` → **Extensions: Install from VSIX...**
2. `Ctrl+Shift+P` → **Agnes AI: Set API Key** → 粘贴 API Key
3. 在 Copilot Chat 模型选择器中切换到 **Agnes AI** 系列模型

## 获取 API Key

登录 [platform.agnes-ai.com](https://platform.agnes-ai.com) → API Keys → 创建 Key。

## 可用模型

| 模型 | 说明 |
|---|---|
| **Agnes 2.0 Flash** | 快速响应，128K 上下文 |

## 本地开发

```bash
pnpm install
pnpm compile
# F5 启动调试
```

## 调试

查看 **输出面板** → 选择 **Agnes AI Debug** 可看到请求/响应日志。
