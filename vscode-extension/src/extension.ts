import * as vscode from 'vscode';
import { PetTracker } from './tracker';
import { PetPanel } from './petPanel';
import { SupabaseClient } from './supabaseClient';

let tracker: PetTracker;
let panel: PetPanel;
let statusBarItem: vscode.StatusBarItem;

export function activate(context: vscode.ExtensionContext) {
  const config = vscode.workspace.getConfiguration('devpet');
  const supabaseUrl = config.get<string>('supabaseUrl') || '';
  const supabaseKey = config.get<string>('supabaseAnonKey') || '';

  if (!supabaseUrl || !supabaseKey) {
    vscode.window.showWarningMessage('DevPet: Please configure Supabase URL and Anon Key in settings');
    return;
  }

  const supabase = new SupabaseClient(supabaseUrl, supabaseKey);
  tracker = new PetTracker(supabase);

  // Status bar
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  statusBarItem.text = '$(heart) DevPet: Loading...';
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);

  // Commands
  context.subscriptions.push(
    vscode.commands.registerCommand('devpet.openDashboard', () => {
      PetPanel.createOrShow(context.extensionUri, supabase);
    }),
    vscode.commands.registerCommand('devpet.feedPet', () => {
      tracker.logEvent('commit');
      vscode.window.showInformationMessage('🍖 DevPet fed with a commit!');
    }),
    vscode.commands.registerCommand('devpet.playWithPet', () => {
      tracker.logEvent('language_switch', vscode.window.activeTextEditor?.document.languageId);
      vscode.window.showInformationMessage('🎾 DevPet played with a new language!');
    }),
    vscode.commands.registerCommand('devpet.restPet', () => {
      tracker.endSession();
      vscode.window.showInformationMessage('😴 DevPet is resting...');
    })
  );

  // Event listeners
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument(() => tracker.logKeystroke()),
    vscode.workspace.onDidSaveTextDocument((doc) => {
      tracker.logEvent('save', doc.languageId);
      updateStatusBar(doc.languageId);
    }),
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor) {
        tracker.logEvent('language_switch', editor.document.languageId);
        updateStatusBar(editor.document.languageId);
      }
    })
  );

  // Git integration
  const gitExtension = vscode.extensions.getExtension('vscode.git')?.exports;
  if (gitExtension) {
    const git = gitExtension.getAPI(1);
    git.onDidCommit(() => {
      tracker.logEvent('commit');
      vscode.window.showInformationMessage('🎉 Commit detected! DevPet is growing!');
    });
  }

  // Session tracking
  tracker.startSession();

  // Periodic sync
  const syncInterval = setInterval(() => tracker.flushEvents(), 30000);
  context.subscriptions.push({ dispose: () => clearInterval(syncInterval) });

  // Update status periodically
  setInterval(() => updateStatusBar(), 60000);
}

function updateStatusBar(language?: string) {
  if (!tracker) return;
  const mood = tracker.getMood();
  const emoji = mood === 'happy' ? '😊' : mood === 'focused' ? '🤓' : mood === 'tired' ? '😴' : '🥚';
  const lang = language ? ` | ${language}` : '';
  statusBarItem.text = `${emoji} DevPet${lang}`;
  statusBarItem.tooltip = `Mood: ${mood} | XP: ${tracker.getXp()} | Streak: ${tracker.getStreak()} days`;
}

export function deactivate() {
  if (tracker) tracker.endSession();
}
