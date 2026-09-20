import type { WebWorkerMLCEngine } from '@mlc-ai/web-llm';
import type { ChatArgs } from '../core/local-ai';
import type { AIResponse } from '../../implementations/ai.chat/chat-runner';
import { createAIWorker } from './browser-ai-worker-factory';
import { completedBrowserOperations, generateBrowserResponse } from './browser-ai-protocol';

export const BROWSER_MODEL = 'Qwen2.5-0.5B-Instruct-q4f32_1-MLC';
type State = { phase:'idle'|'loading'|'ready'|'error'; progress:number; message:string };
let state: State = { phase:'idle', progress:0, message:'Download the model once, then chat on this device.' };
const listeners = new Set<() => void>();
export const getBrowserAIState = () => state;
export const subscribeBrowserAI = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
const update = (next: State) => { state = next; listeners.forEach(fn => fn()); };
let engine: WebWorkerMLCEngine | null = null;
let worker: Worker | null = null;
let loading: Promise<void> | null = null;
let cancelLoad: (() => void) | null = null;
let generation = 0;
let busy = false;
let chatStopped = false;
let cancelChat: (() => void) | null = null;

export function releaseBrowserAI() {
  generation++;
  cancelChat?.(); cancelChat = null;
  cancelLoad?.(); cancelLoad = null;
  worker?.terminate(); worker = null; engine = null; loading = null;
  update({ phase:'idle', progress:0, message:'AI unloaded. Downloaded model files remain cached in this browser.' });
}
export async function enableBrowserAI(): Promise<void> {
  if (state.phase === 'ready') return;
  if (loading) return loading;
  const run = ++generation;
  const cancelled = new Promise<never>((_, reject) => { cancelLoad = () => reject(new Error('Model loading cancelled.')); });
  void cancelled.catch(() => {});
  update({ phase:'loading', progress:0, message:'Checking this device…' });
  loading = (async () => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      if (!window.isSecureContext || !('gpu' in navigator)) throw new Error('Browser AI needs WebGPU on HTTPS or localhost. Try a current Chrome or Edge browser with hardware acceleration enabled.');
      const adapter = await (navigator as any).gpu.requestAdapter();
      if (!adapter) throw new Error('No compatible GPU is available. Enable hardware acceleration or try another device. Manual modeling still works.');
      if (run !== generation) return;
      const { WebWorkerMLCEngine: Engine, prebuiltAppConfig } = await import('@mlc-ai/web-llm');
      if (run !== generation) return;
      worker = createAIWorker();
      engine = new Engine(worker, { appConfig: { ...prebuiltAppConfig, cacheBackend:'indexeddb', model_list:prebuiltAppConfig.model_list.filter(model => model.model_id === BROWSER_MODEL) }, initProgressCallback: report => {
        if (run === generation) update({ phase:'loading', progress:Math.max(0,Math.min(1,report.progress)), message:report.text });
      } });
      const failed = new Promise<never>((_, reject) => {
        worker!.onerror = () => reject(new Error('The browser AI worker failed. Reload the page and try again.'));
        timer = setTimeout(() => reject(new Error('Model loading timed out. Check your connection and retry; completed downloads are cached.')), 600000);
      });
      await Promise.race([engine.reload(BROWSER_MODEL, { context_window_size:8192 }), cancelled, failed]);
      if (run === generation) update({ phase:'ready', progress:1, message:'Ready · AI runs in this browser. No inference API fees.' });
    } catch (e) {
      if (run === generation) {
        worker?.terminate(); worker = null; engine = null;
        update({ phase:'error', progress:0, message:e instanceof Error ? e.message : `Could not load browser AI: ${String(e)}. Check your connection and available memory, then retry.` });
      }
    } finally {
      if (timer) clearTimeout(timer);
      if (run === generation) { loading = null; cancelLoad = null; }
    }
  })();
  return loading;
}
export function stopBrowserAI() { chatStopped = true; engine?.interruptGenerate(); }
export async function chatBrowser(args: ChatArgs): Promise<AIResponse> {
  if (!engine || state.phase !== 'ready') return { error:'Enable browser AI above the conversation first. No app installation or API key is needed.' };
  const completed = completedBrowserOperations(args);
  if (completed) return completed;
  if (busy) return { error:'Browser AI is still finishing a request. Wait a moment and retry.' };
  busy = true; chatStopped = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const active = engine;
    const run = generation;
    return await Promise.race([
      generateBrowserResponse(args, request => active.chat.completions.create(request), () => chatStopped || generation !== run),
      new Promise<never>((_, reject) => { cancelChat = () => reject(new Error('Browser AI was unloaded. Enable it again to continue.')); }),
      new Promise<never>((_, reject) => { timer = setTimeout(() => { chatStopped = true; active.interruptGenerate(); reject(new Error('Browser AI timed out. Try a shorter request.')); }, 300000); }),
    ]);
  } catch (e) { return { error:e instanceof Error ? e.message : 'Browser AI failed. Reload the model or try a smaller request.' }; }
  finally { if (timer) clearTimeout(timer); cancelChat = null; busy = false; }
}
