export function createAIWorker() {
  return new Worker(new URL('./browser-ai-worker.js', import.meta.url), { type: 'module' });
}
