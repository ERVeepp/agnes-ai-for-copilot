import * as vscode from 'vscode';

const AGNES_BASE_URL = 'https://apihub.agnes-ai.com/v1';

const AGNES_MODELS: vscode.LanguageModelChatInformation[] = [
    { id: 'agnes-2.0-flash', name: 'Agnes 2.0 Flash', family: 'Agnes', version: '2.0.0', maxInputTokens: 128000, maxOutputTokens: 16384, capabilities: { imageInput: true, toolCalling: true } },
];

// ============================================================
// 消息转换工具函数
// ============================================================

/** 提取单个 content part 的文本值（duck typing 兜底） */
function extractPartText(part: any): string {
    if (part instanceof vscode.LanguageModelTextPart) {
        return part.value;
    }
    if (part && typeof part === 'object') {
        if ('value' in part) return String(part.value);
        if ('text' in part) return String(part.text);
        if ('content' in part && typeof part.content === 'string') return part.content;
    }
    return '';
}

/** 将 Copilot 消息转换为 OpenAI 格式 */
function convertToOpenAIMessages(
    messages: readonly vscode.LanguageModelChatRequestMessage[],
    log: (msg: string) => void,
): Record<string, any>[] {
    return messages.map(m => {
        const role = m.role === 1 ? 'user' : m.role === 2 ? 'assistant' : 'system';
        let content = '';
        const toolCalls: any[] = [];

        if (typeof m.content === 'string') {
            content = m.content;
        } else if (m.content && typeof m.content === 'object' && Symbol.iterator in Object(m.content)) {
            for (const part of m.content as any[]) {
                if (part instanceof vscode.LanguageModelToolCallPart) {
                    toolCalls.push({
                        id: part.callId,
                        type: 'function',
                        function: { name: part.name, arguments: JSON.stringify(part.input) },
                    });
                } else if (part instanceof vscode.LanguageModelToolResultPart) {
                    for (const item of part.content) {
                        content += extractPartText(item);
                    }
                } else if (part && typeof part === 'object') {
                    const text = extractPartText(part);
                    if (text) {
                        content += text;
                    } else {
                        log(`[Agnes] 未知消息格式: ${JSON.stringify(part).substring(0, 200)}`);
                    }
                } else {
                    log(`[Agnes] 未知消息类型: ${typeof part}, value: ${String(part)}`);
                }
            }
        } else if (m.content && typeof m.content === 'object') {
            const c = m.content as Record<string, any>;
            content = String(c.value ?? c.text ?? c.content ?? JSON.stringify(m.content));
            log(`[Agnes] content 是非可迭代对象，已提取: ${content.substring(0, 100)}`);
        }

        const msg: Record<string, any> = { role, content: content || '' };
        if (toolCalls.length > 0) {
            msg.tool_calls = toolCalls;
        }
        return msg;
    });
}

// ============================================================
// SSE 流式解析器
// ============================================================

class SSEDecoder {
    private buffer = '';

    /** 喂入 chunk，返回解析出的完整 data 行数组 */
    feed(chunk: string): string[] {
        this.buffer += chunk;
        const lines: string[] = [];
        // 按 \n\n 分割 SSE 事件
        const events = this.buffer.split('\n\n');
        // 最后一段可能不完整，保留在 buffer 中
        this.buffer = events.pop() || '';

        for (const event of events) {
            for (const line of event.split('\n')) {
                const trimmed = line.trim();
                if (trimmed.startsWith('data: ')) {
                    const data = trimmed.slice(6);
                    if (data === '[DONE]') {
                        return lines; // 流结束，丢弃 [DONE]
                    }
                    lines.push(data);
                }
            }
        }
        return lines;
    }
}

// ============================================================
// Provider 实现
// ============================================================

export class AgnesChatProvider implements vscode.LanguageModelChatProvider {
    private outputChannel = vscode.window.createOutputChannel('Agnes AI Debug');

    constructor(private context: vscode.ExtensionContext) {}

    private log(msg: string) {
        console.log(msg);
        this.outputChannel.appendLine(msg);
    }

    async provideLanguageModelChatInformation(
        _options: vscode.PrepareLanguageModelChatModelOptions,
        _token: vscode.CancellationToken,
    ): Promise<vscode.LanguageModelChatInformation[]> {
        const apiKey = await this.context.secrets.get('agnes-copilot.apiKey');
        if (!apiKey) {
            return [];
        }
        return AGNES_MODELS;
    }

    async provideLanguageModelChatResponse(
        model: vscode.LanguageModelChatInformation,
        messages: readonly vscode.LanguageModelChatRequestMessage[],
        options: vscode.ProvideLanguageModelChatResponseOptions,
        progress: vscode.Progress<vscode.LanguageModelResponsePart>,
        token: vscode.CancellationToken,
    ): Promise<void> {
        const apiKey = await this.context.secrets.get('agnes-copilot.apiKey');
        if (!apiKey) {
            throw new Error('请先设置 Agnes AI API Key: Ctrl+Shift+P → Agnes AI: Set API Key');
        }

        const maxTokens = (options.modelOptions as any)?.max_tokens ?? model.maxOutputTokens ?? 4096;
        const openaiMessages = convertToOpenAIMessages(messages, msg => this.log(msg));

        // Debug: 打印转换后的消息摘要
        if (openaiMessages.length <= 3) {
            this.log(`[Agnes] 消息详情:`);
            for (const m of openaiMessages) {
                const preview = (typeof m.content === 'string' ? m.content : JSON.stringify(m.content)).substring(0, 100);
                this.log(`  [${m.role}] ${preview}${m.tool_calls ? ` tool_calls:${m.tool_calls.length}` : ''}`);
            }
        } else {
            this.log(`[Agnes] 消息数: ${openaiMessages.length}, 首条角色: ${openaiMessages[0]?.role}, 末条角色: ${openaiMessages[openaiMessages.length - 1]?.role}`);
        }

        const body: Record<string, any> = {
            model: model.id,
            messages: openaiMessages,
            stream: true,        // ✅ 启用流式响应
            max_tokens: maxTokens,
        };

        this.log(`[Agnes] === 请求 ===`);
        this.log(`[Agnes] URL: ${AGNES_BASE_URL}/chat/completions`);
        this.log(`[Agnes] Model: ${body.model}, max_tokens: ${body.max_tokens}, stream: true`);

        // 创建 AbortController 以支持取消
        const abortController = new AbortController();
        const cancelListener = token.onCancellationRequested(() => {
            this.log('[Agnes] 请求已取消');
            abortController.abort();
        });

        try {
            const response = await fetch(`${AGNES_BASE_URL}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                },
                body: JSON.stringify(body),
                signal: abortController.signal,
            });

            this.log(`[Agnes] 响应状态: ${response.status} ${response.statusText}`);

            if (!response.ok) {
                const err = await response.text().catch(() => '');
                throw new Error(`Agnes AI 请求失败 (${response.status}): ${err}`);
            }

            // ---- 流式 SSE 解析 ----
            if (!response.body) {
                throw new Error('响应体为空，不支持流式读取');
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            const sse = new SSEDecoder();
            let fullContent = '';
            let chunkCount = 0;

            // 流式 Tool Call 累积器：key = index, value = { id, name, arguments }
            const pendingToolCalls = new Map<number, { id: string; name: string; args: string }>();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const text = decoder.decode(value, { stream: true });
                const dataLines = sse.feed(text);

                for (const line of dataLines) {
                    try {
                        const parsed = JSON.parse(line);
                        const delta = parsed.choices?.[0]?.delta;
                        if (!delta) continue;

                        // 文本增量 → 立即流式输出
                        if (delta.content) {
                            fullContent += delta.content;
                            progress.report(new vscode.LanguageModelTextPart(delta.content));
                            chunkCount++;
                        }

                        // Tool Call 增量 → 累积
                        if (delta.tool_calls) {
                            for (const tc of delta.tool_calls) {
                                const idx: number = tc.index ?? 0;

                                if (!pendingToolCalls.has(idx)) {
                                    pendingToolCalls.set(idx, { id: '', name: '', args: '' });
                                }
                                const pending = pendingToolCalls.get(idx)!;

                                // 首个 tool call chunk：包含 id 和 function.name
                                if (tc.id) pending.id = tc.id;
                                if (tc.function?.name) pending.name = tc.function.name;
                                // 后续 chunk：累积 arguments 片段
                                if (tc.function?.arguments) pending.args += tc.function.arguments;
                            }
                        }
                    } catch {
                        // 忽略无法解析的行
                    }
                }
            }

            // 流结束 → 报告累积完成的 Tool Calls
            for (const [, tc] of pendingToolCalls) {
                if (tc.id && tc.name) {
                    let input: any = undefined;
                    if (tc.args) {
                        try {
                            input = JSON.parse(tc.args);
                        } catch {
                            // arguments 不是合法 JSON，传原始字符串
                            input = tc.args;
                        }
                    }
                    progress.report(new vscode.LanguageModelToolCallPart(tc.id, tc.name, input));
                    this.log(`[Agnes] Tool call: ${tc.name}(${tc.id}) args=${tc.args.substring(0, 100)}`);
                }
            }

            this.log(`[Agnes] 流式完成，共 ${chunkCount} 个文本块，总长度: ${fullContent.length}，Tool calls: ${pendingToolCalls.size}`);

            // 如果没有任何内容返回，发送提示
            if (!fullContent && pendingToolCalls.size === 0) {
                this.log(`[Agnes] ⚠️ 未收到任何内容`);
                progress.report(new vscode.LanguageModelTextPart('[无内容] 查看 Agnes AI Debug 输出面板'));
            }
        } finally {
            cancelListener.dispose();
        }
    }

    async provideTokenCount(
        _model: vscode.LanguageModelChatInformation,
        text: string | vscode.LanguageModelChatRequestMessage,
        _token: vscode.CancellationToken,
    ): Promise<number> {
        const content = typeof text === 'string' ? text : JSON.stringify(text);
        // 改进的 token 估算：CJK 字符约 2 token/字，英文约 1 token/4 字符
        let count = 0;
        for (const ch of content) {
            const code = ch.charCodeAt(0);
            if (code >= 0x4E00 && code <= 0x9FFF || // CJK 统一汉字
                code >= 0x3400 && code <= 0x4DBF || // CJK 扩展 A
                code >= 0x20000 && code <= 0x2A6DF || // CJK 扩展 B
                code >= 0xF900 && code <= 0xFAFF || // CJK 兼容汉字
                code >= 0x3040 && code <= 0x309F || // 平假名
                code >= 0x30A0 && code <= 0x30FF || // 片假名
                code >= 0xAC00 && code <= 0xD7AF) { // 韩文
                count += 2;
            } else if (code <= 0x7F) {
                count += 0.25; // ASCII
            } else {
                count += 1;
            }
        }
        return Math.max(1, Math.ceil(count));
    }
}
