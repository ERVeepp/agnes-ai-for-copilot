# Agnes AI — Copilot Chat Provider

[English](../README.md) | 简体中文

[![Version](https://img.shields.io/github/v/release/erveepp/agnes-ai-for-copilot?style=for-the-badge&label=Version)](https://github.com/erveepp/agnes-ai-for-copilot/releases)
[![Installs](https://img.shields.io/visual-studio-marketplace/i/erveepp.agnes-ai-for-copilot-chat?style=for-the-badge&label=Installs)](https://marketplace.visualstudio.com/items?itemName=erveepp.agnes-ai-for-copilot-chat)

[从 VS Code Marketplace 安装](https://marketplace.visualstudio.com/items?itemName=erveepp.agnes-ai-for-copilot-chat)

在 Copilot Chat 模型选择器中直接使用 Agnes AI —— 不离开你熟悉的 Copilot 工作流。

> 喜欢 Agnes AI 的性价比，但不想放弃 GitHub Copilot 的 Agent 模式、工具调用和成熟的交互体验？本扩展将 Agnes AI 模型直接接入 Copilot Chat 模型选择器，使用你自己的 API Key。

---

## 为什么选这个扩展？

- **不是替换 Copilot，而是增强它。** 没有新的侧边栏，没有新的聊天界面需要学习。只是在你已经在用的模型选择器中多了一个选项。
- **Agent 模式、工具调用、Instructions、MCP、Skills —— 全部正常运作。** Copilot 的完整能力栈，现在跑在 Agnes 上。
- **需自行提供 API Key，直接向 Agnes AI 付费。** 你的 API Key，你的账单，你的速率限制。密钥存储在操作系统密钥链中，不会以明文形式写入磁盘。

## 功能特性

### Agnes AI 模型出现在模型选择器中

Agnes 2.0 Flash 与 GPT-4o、Claude 等并列在 Copilot Chat 的模型选择器中。支持 128K 上下文，原生支持图片输入和工具调用。

### 继承全部 Copilot 能力

由于本扩展接入的是 Copilot 的原生 provider API，你免费获得完整能力栈：

- **Agent 模式** —— 自主执行多步骤任务
- **工具调用** —— 文件编辑、终端操作、工作区搜索、Git、测试
- **Instructions & Skills** —— 你的 `.instructions.md`、`AGENTS.md` 和各项 Skills 开箱即用

### 安全优先

API Key 存储在 VS Code 的 `SecretStorage` 中（macOS 钥匙串 / Windows 凭据管理器 / Linux 密钥环）。绝不会出现在 `settings.json` 中，也不会被提交到 Git 历史。

### 零运行时依赖

纯 VS Code API + Node.js 内置模块。无需 Python、Docker 或本地代理进程。

---

## 快速开始

### 前置条件

- **VS Code 1.116** 及以上版本。本扩展依赖非公开的 Copilot Chat API。
- **GitHub Copilot 订阅**（Free / Pro / Enterprise —— 免费版即可使用）
- **Agnes AI API Key**，从 [platform.agnes-ai.com](https://platform.agnes-ai.com) 获取

### 安装方式

从 [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=erveepp.agnes-ai-for-copilot-chat) 安装，或在 [Releases](https://github.com/erveepp/agnes-ai-for-copilot/releases) 页面下载 `.vsix` 手动安装。

### 使用步骤

1. 通过命令面板（`Ctrl+Shift+P`）运行 **Agnes AI: Set API Key**
2. 粘贴你的 API Key（通常以 `sk-` 开头）
3. 打开 Copilot Chat，点击模型选择器，选择 **Agnes 2.0 Flash**
4. 搞定 —— 开始聊天

---

## 可用模型

| 模型 | 适用场景 | 上下文 |
|---|---|---|
| **Agnes 2.0 Flash** | 日常编码、快速迭代、低成本对话 | 128K |

支持工具调用、图片输入。

---

## 设置项

| 设置 | 默认值 | 说明 |
|---|---|---|
| 无额外设置项 | — | 本扩展零配置，仅需设置 API Key 即可使用 |

API Key 通过命令 `Agnes AI: Set API Key` 设置，存储在系统密钥链中。

---

## 本地开发

```bash
pnpm install
pnpm compile
# F5 启动调试
```

查看 **输出面板** → 选择 **Agnes AI Debug** 可看到请求/响应日志。

---

## 许可证

[MIT](LICENSE)
