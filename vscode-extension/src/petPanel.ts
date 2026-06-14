import * as vscode from 'vscode';
import { SupabaseClient } from './supabaseClient';

export class PetPanel {
  public static currentPanel: PetPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private _disposables: vscode.Disposable[] = [];
  private supabase: SupabaseClient;

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, supabase: SupabaseClient) {
    this._panel = panel;
    this.supabase = supabase;
    this._panel.webview.html = this._getHtmlForWebview(this._panel.webview, extensionUri);

    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
    this._panel.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.command) {
          case 'fetchPet':
            const user = await this.supabase.getUser();
            if (user) {
              const profile = await this.supabase.getProfile(user.id);
              this._panel.webview.postMessage({ type: 'petData', data: profile });
            }
            break;
        }
      },
      null,
      this._disposables
    );
  }

  public static createOrShow(extensionUri: vscode.Uri, supabase: SupabaseClient) {
    const column = vscode.window.activeTextEditor ? vscode.ViewColumn.Beside : vscode.ViewColumn.One;
    if (PetPanel.currentPanel) {
      PetPanel.currentPanel._panel.reveal(column);
      return;
    }
    const panel = vscode.window.createWebviewPanel('devpet', 'DevPet Dashboard', column, {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media')],
    });
    PetPanel.currentPanel = new PetPanel(panel, extensionUri, supabase);
  }

  private _getHtmlForWebview(webview: vscode.Webview, extensionUri: vscode.Uri): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>DevPet Dashboard</title>
  <style>
    body { font-family: var(--vscode-font-family); background: var(--vscode-editor-background); color: var(--vscode-foreground); padding: 20px; }
    .pet-container { text-align: center; font-size: 80px; margin: 20px 0; transition: transform 0.3s; }
    .pet-container:hover { transform: scale(1.1); }
    .stats { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 20px; }
    .stat-card { background: var(--vscode-button-secondaryBackground); padding: 15px; border-radius: 8px; }
    .stat-value { font-size: 24px; font-weight: bold; color: var(--vscode-button-foreground); }
    .mood { font-size: 18px; margin-top: 10px; }
    .actions { display: flex; gap: 10px; justify-content: center; margin-top: 20px; }
    button { background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; }
    button:hover { opacity: 0.9; }
    .streak-flame { color: #ff6b35; }
  </style>
</head>
<body>
  <h1>🐛 DevPet Dashboard</h1>
  <div class="pet-container" id="pet">🥚</div>
  <div class="mood" id="mood">Loading...</div>
  <div class="stats">
    <div class="stat-card"><div>XP</div><div class="stat-value" id="xp">0</div></div>
    <div class="stat-card"><div>Stage</div><div class="stat-value" id="stage">Egg</div></div>
    <div class="stat-card"><div>Streak</div><div class="stat-value streak-flame" id="streak">0 🔥</div></div>
    <div class="stat-card"><div>Commits Today</div><div class="stat-value" id="commits">0</div></div>
  </div>
  <div class="actions">
    <button onclick="feed()">🍖 Feed (Commit)</button>
    <button onclick="play()">🎾 Play (Debug)</button>
    <button onclick="rest()">😴 Rest</button>
  </div>
  <script>
    const vscode = acquireVsCodeApi();
    const stages = ['🥚','🐣','🐛','🦋','🐉'];
    const stageNames = ['Egg','Hatchling','Junior','Senior','Architect'];

    vscode.postMessage({ command: 'fetchPet' });

    window.addEventListener('message', event => {
      const msg = event.data;
      if (msg.type === 'petData') {
        const p = msg.data;
        document.getElementById('pet').textContent = stages[p.pet_stage] || '🥚';
        document.getElementById('mood').textContent = 'Mood: ' + (p.pet_mood || 'neutral');
        document.getElementById('xp').textContent = p.pet_xp || 0;
        document.getElementById('stage').textContent = stageNames[p.pet_stage] || 'Egg';
        document.getElementById('streak').textContent = (p.current_streak || 0) + ' 🔥';
      }
    });

    function feed() { vscode.postMessage({ command: 'feed' }); }
    function play() { vscode.postMessage({ command: 'play' }); }
    function rest() { vscode.postMessage({ command: 'rest' }); }
  </script>
</body>
</html>`;
  }

  public dispose() {
    PetPanel.currentPanel = undefined;
    this._panel.dispose();
    while (this._disposables.length) {
      const x = this._disposables.pop();
      if (x) x.dispose();
    }
  }
}
