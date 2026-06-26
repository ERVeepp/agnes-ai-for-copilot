import * as vscode from 'vscode';
import { AgnesChatProvider } from './agnesProvider';

export function activate(context: vscode.ExtensionContext) {
    const provider = new AgnesChatProvider(context);

    context.subscriptions.push(
        vscode.lm.registerLanguageModelChatProvider('agnes-ai', provider),
        vscode.commands.registerCommand('agnes-ai-for-copilot-chat.setApiKey', async () => {
            const key = await vscode.window.showInputBox({
                prompt: '请输入 Agnes AI API Key',
                placeHolder: 'sk-...',
                password: true,
                ignoreFocusOut: true,
            });
            if (key) {
                await context.secrets.store('agnes-copilot.apiKey', key);
                vscode.window.showInformationMessage('Agnes AI API Key 已保存');
            }
        }),
    );
}

export function deactivate() {}
