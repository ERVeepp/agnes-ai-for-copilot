import * as vscode from 'vscode';

const AGNES_BASE_URL = 'https://apihub.agnes-ai.com/v1';

const AGNES_MODELS: vscode.LanguageModelChatInformation[] = [
    { id: 'agnes-2.0-flash', name: 'Agnes 2.0 Flash', family: 'Agnes', version: '2.0.0', maxInputTokens: 128000, maxOutputTokens: 16384, capabilities: { imageInput: true, toolCalling: true } },
];

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

        // 按照 DeepSeek/Kimi 扩展的标准方式转换消息
        // 注意：Copilot Chat 传过来的 content parts 可能是普通对象而非 VS Code 原生类实例，
        // 所以不能只靠 instanceof，需要同时检查对象的 shape（duck typing）
        const openaiMessages = messages.map(m => {
            const role = m.role === 1 ? 'user' : m.role === 2 ? 'assistant' : 'system';
            let content = '';
            const toolCalls: any[] = [];

            if (typeof m.content === 'string') {
                content = m.content;
            } else if (m.content && typeof m.content === 'object' && Symbol.iterator in Object(m.content)) {
                // content 是可迭代对象（数组等）
                for (const part of m.content as any[]) {
                    // 优先用 instanceof，失败时用 duck typing 兜底
                    if (part instanceof vscode.LanguageModelTextPart) {
                        content += part.value;
                    } else if (part instanceof vscode.LanguageModelToolCallPart) {
                        toolCalls.push({
                            id: part.callId,
                            type: 'function',
                            function: {
                                name: part.name,
                                arguments: JSON.stringify(part.input),
                            },
                        });
                    } else if (part instanceof vscode.LanguageModelToolResultPart) {
                        for (const item of part.content) {
                            if (item instanceof vscode.LanguageModelTextPart) {
                                content += item.value;
                            } else if (item && typeof item === 'object' && 'value' in item) {
                                // 工具结果中的纯文本兜底
                                content += String((item as any).value);
                            }
                        }
                    } else if (part && typeof part === 'object') {
                        // 兜底：普通对象，尝试提取 value/text/content 字段
                        const p = part as Record<string, any>;
                        if ('value' in p) {
                            content += String(p.value);
                        } else if ('text' in p) {
                            content += String(p.text);
                        } else if ('content' in p) {
                            content += String(p.content);
                        } else {
                            this.log(`[Agnes] 未知消息格式: ${JSON.stringify(part).substring(0, 200)}`);
                        }
                    } else {
                        this.log(`[Agnes] 未知消息类型: ${typeof part}, value: ${String(part)}`);
                    }
                }
            } else if (m.content && typeof m.content === 'object') {
                // content 是普通对象（非可迭代），尝试提取字段
                const c = m.content as Record<string, any>;
                content = String(c.value ?? c.text ?? c.content ?? JSON.stringify(m.content));
                this.log(`[Agnes] content 是非可迭代对象，已提取: ${content.substring(0, 100)}`);
            }

            const msg: Record<string, any> = { role, content: content || '' };
            if (toolCalls.length > 0) {
                msg.tool_calls = toolCalls;
            }

            return msg;
        });

        this.log(`[Agnes] 消息详情:`);
        for (const m of openaiMessages) {
            const preview = (typeof m.content === 'string' ? m.content : JSON.stringify(m.content)).substring(0, 100);
            this.log(`  [${m.role}] ${preview}`);
        }

        const body: Record<string, any> = {
            model: model.id,
            messages: openaiMessages,
            stream: false,
            max_tokens: maxTokens,
        };

        const requestBody = JSON.stringify(body);
        this.log(`[Agnes] === 请求 ===`);
        this.log(`[Agnes] URL: ${AGNES_BASE_URL}/chat/completions`);
        this.log(`[Agnes] Model: ${body.model}, max_tokens: ${body.max_tokens}`);
        this.log(`[Agnes] Messages count: ${body.messages.length}`);

        const response = await fetch(`${AGNES_BASE_URL}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: requestBody,
            signal: token.isCancellationRequested ? AbortSignal.abort() : undefined,
        });

        this.log(`[Agnes] 响应状态: ${response.status} ${response.statusText}`);
        this.log(`[Agnes] Content-Type: ${response.headers.get('content-type')}`);

        if (!response.ok) {
            const err = await response.text().catch(() => '');
            throw new Error(`Agnes AI 请求失败 (${response.status}): ${err}`);
        }

        // 非流式响应
        const json = await response.text();
        this.log(`[Agnes] 原始响应: ${json.substring(0, 500)}`);

        let parsed: any;
        try {
            parsed = JSON.parse(json);
        } catch {
            throw new Error(`Agnes AI 响应解析失败: ${json.substring(0, 200)}`);
        }

        const content = parsed.choices?.[0]?.message?.content;
        if (content) {
            progress.report(new vscode.LanguageModelTextPart(typeof content === 'string' ? content : JSON.stringify(content)));
        } else {
            this.log(`[Agnes] 未找到 content: ${JSON.stringify(parsed).substring(0, 500)}`);
            progress.report(new vscode.LanguageModelTextPart('[无内容] 查看 Agnes AI Debug 输出面板'));
        }
    }

    async provideTokenCount(
        _model: vscode.LanguageModelChatInformation,
        text: string | vscode.LanguageModelChatRequestMessage,
        _token: vscode.CancellationToken,
    ): Promise<number> {
        const content = typeof text === 'string' ? text : JSON.stringify(text);
        return Math.ceil(content.length / 3);
    }
}
