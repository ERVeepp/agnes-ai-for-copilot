// Agnes AI API 测试脚本
// 用法: node test-api.mjs <API_KEY>

const API_KEY = process.argv[2];
if (!API_KEY) {
    console.error('用法: node test-api.mjs <API_KEY>');
    process.exit(1);
}

const BASE = 'https://apihub.agnes-ai.com/v1';

async function test() {
    // 测试1: 非流式请求
    console.log('=== 测试1: 非流式 ===');
    const body = JSON.stringify({
        model: 'agnes-2.0-flash',
        messages: [{ role: 'user', content: '你好，请用一句话介绍自己' }],
        stream: false,
        max_tokens: 100,
    });

    const res = await fetch(`${BASE}/chat/completions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${API_KEY}`,
        },
        body,
    });

    console.log('状态:', res.status, res.statusText);
    const text = await res.text();
    console.log('响应体(前500字):', text.substring(0, 500));

    if (!res.ok) {
        console.log('❌ 非流式请求失败');
        return;
    }

    try {
        const json = JSON.parse(text);
        console.log('content:', json.choices?.[0]?.message?.content);
    } catch (e) {
        console.log('JSON解析失败:', e.message);
    }

    // 测试2: 流式请求
    console.log('\n=== 测试2: 流式 ===');
    const streamBody = JSON.stringify({
        model: 'agnes-2.0-flash',
        messages: [{ role: 'user', content: '说"Hello"' }],
        stream: true,
        max_tokens: 50,
    });

    const streamRes = await fetch(`${BASE}/chat/completions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${API_KEY}`,
        },
        body: streamBody,
    });

    console.log('状态:', streamRes.status, streamRes.statusText);
    if (!streamRes.ok) {
        console.log('响应:', await streamRes.text());
        return;
    }

    const reader = streamRes.body.getReader();
    const decoder = new TextDecoder();
    let result = '';

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        console.log('SSE chunk:', JSON.stringify(chunk.substring(0, 200)));
        result += chunk;
    }

    console.log('\n完整SSE输出:\n', result);
}

test().catch(e => console.error('错误:', e));
