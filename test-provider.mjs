// 模拟 Copilot Chat 调用 Agnes Provider 的消息格式测试
// 用法: node test-provider.mjs <API_KEY>

const API_KEY = process.argv[2];
if (!API_KEY) {
    console.error('用法: node test-provider.mjs <API_KEY>');
    process.exit(1);
}

const BASE = 'https://apihub.agnes-ai.com/v1';

/**
 * 模拟 agnesProvider.ts 中的消息转换逻辑（修复版）
 */
function convertMessages(messages) {
    return messages.map(m => {
        const roleMap = { 1: 'user', 2: 'assistant', 0: 'system' };
        const role = roleMap[m.role] ?? m.role ?? 'user';
        let content = '';
        const toolCalls = [];

        if (typeof m.content === 'string') {
            content = m.content;
        } else if (m.content && typeof m.content === 'object' && Symbol.iterator in Object(m.content)) {
            for (const part of m.content) {
                // Duck typing: 先检查对象字段
                if (part && typeof part === 'object') {
                    const p = part;
                    // LanguageModelTextPart: { value: string }
                    if ('value' in p && typeof p.value === 'string' && !('callId' in p) && !('name' in p)) {
                        content += p.value;
                    }
                    // LanguageModelToolCallPart: { callId, name, input }
                    else if ('callId' in p && 'name' in p && 'input' in p) {
                        toolCalls.push({
                            id: p.callId,
                            type: 'function',
                            function: {
                                name: p.name,
                                arguments: typeof p.input === 'string' ? p.input : JSON.stringify(p.input),
                            },
                        });
                    }
                    // LanguageModelToolResultPart: { callId, content: [...] }
                    else if ('callId' in p && 'content' in p && Array.isArray(p.content)) {
                        for (const item of p.content) {
                            if (item && typeof item === 'object' && 'value' in item) {
                                content += String(item.value);
                            }
                        }
                    }
                    // 其他对象：尝试提取常见字段
                    else if ('text' in p) {
                        content += String(p.text);
                    } else if ('content' in p && typeof p.content === 'string') {
                        content += String(p.content);
                    } else {
                        console.log(`  [WARN] 未知 part 格式: ${JSON.stringify(p).substring(0, 150)}`);
                    }
                }
            }
        } else if (m.content && typeof m.content === 'object') {
            content = String(m.content.value ?? m.content.text ?? m.content.content ?? JSON.stringify(m.content));
        }

        const msg = { role, content: content || '' };
        if (toolCalls.length > 0) {
            msg.tool_calls = toolCalls;
        }
        return msg;
    });
}

async function testCase(name, messages) {
    console.log(`\n=== 测试: ${name} ===`);
    
    const converted = convertMessages(messages);
    console.log('转换后的消息:');
    for (const m of converted) {
        const preview = (typeof m.content === 'string' ? m.content : JSON.stringify(m.content)).substring(0, 200);
        console.log(`  [${m.role}] ${preview}`);
        if (m.tool_calls) {
            console.log(`  tool_calls: ${JSON.stringify(m.tool_calls).substring(0, 200)}`);
        }
    }

    const body = JSON.stringify({
        model: 'agnes-2.0-flash',
        messages: converted,
        stream: false,
        max_tokens: 200,
    });

    const res = await fetch(`${BASE}/chat/completions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_KEY}`,
        },
        body,
    });

    const text = await res.text();
    console.log(`状态: ${res.status}`);

    if (!res.ok) {
        console.log(`❌ 失败: ${text.substring(0, 300)}`);
        return false;
    }

    try {
        const json = JSON.parse(text);
        const reply = json.choices?.[0]?.message?.content;
        console.log(`✅ 回复: ${reply?.substring(0, 200)}`);
        // 检查回复中是否包含 [object Object]
        if (reply && reply.includes('[object Object]')) {
            console.log(`⚠️  回复中包含 [object Object]！`);
            return false;
        }
        return true;
    } catch (e) {
        console.log(`❌ JSON 解析失败: ${e.message}`);
        return false;
    }
}

async function main() {
    // 测试1: 普通文本消息 (VS Code role=1 是 user, role=2 是 assistant)
    await testCase('普通文本消息', [
        { role: 1, content: '你好，请用一句话介绍自己' },
    ]);

    // 测试2: content 是数组，包含普通对象 {value: "text"}（模拟 Copilot 可能传的格式）
    await testCase('content 数组(普通对象)', [
        { role: 1, content: [{ value: '你好，用一句话介绍自己' }] },
    ]);

    // 测试3: content 是数组，每个元素是 {value: ...}
    await testCase('多段 content 数组', [
        { role: 1, content: [{ value: '第一段' }, { value: '第二段' }] },
    ]);

    // 测试4: content 是字符串（标准格式）
    await testCase('标准字符串 content', [
        { role: 0, content: '你是一个有用的助手' },
        { role: 1, content: '你好' },
    ]);

    // 测试5: 模拟带工具调用的消息
    await testCase('带工具调用的消息', [
        { role: 1, content: '帮我搜索一下天气' },
        { role: 2, content: '', toolCalls: [{ callId: 'call_1', name: 'search_weather', input: { city: '北京' } }] },
        { role: 1, content: [{ callId: 'call_1', content: [{ value: '北京今天晴，25°C' }] }] },
    ]);

    // 测试6: content 是普通对象（非数组）
    await testCase('content 是普通对象', [
        { role: 1, content: { value: '你好' } },
    ]);

    console.log('\n=== 全部测试完成 ===');
}

main().catch(e => console.error('测试脚本错误:', e));
