import React, { useEffect, useState, useSyncExternalStore } from 'react';
import { enableBrowserAI, getBrowserAIState, releaseBrowserAI, subscribeBrowserAI } from '../../src/web/browser-ai';

export function BrowserAISetup({ busy = false, force = false }: { busy?: boolean; force?: boolean }) {
  const [provider, setProvider] = useState('browser');
  const state = useSyncExternalStore(subscribeBrowserAI, getBrowserAIState);
  const isWeb = (window as any).__PLATFORM__ === 'web';
  useEffect(() => {
    if (!isWeb) return;
    const refresh = () => { void window.api.invoke('prefs:get').then(p => setProvider(p.aiProvider || 'browser')); };
    refresh(); window.addEventListener('ai-preferences-changed', refresh);
    return () => window.removeEventListener('ai-preferences-changed', refresh);
  }, [isWeb]);
  if (!isWeb || (!force && provider !== 'browser')) return null;
  const ready = state.phase === 'ready';
  return <div className="browser-ai-setup">
    <p role="status">{ready ? `Ready · ${state.vision?'Photo AI':'Text AI'} on this device` : state.phase === 'loading' ? `Getting AI ready… ${Math.round(state.progress * 100)}%` : state.phase === 'error' ? state.message : 'Free AI · Runs on your device'}</p>
    {!ready && state.phase !== 'loading' && <p className="ai-download-note">{state.vision?'Photo AI needs a larger model download and a compatible GPU.':'Download about 1 GB once to get started. 1.5B model. No account needed.'}</p>}
    {state.phase === 'loading' && <progress aria-label="AI model download" value={state.progress} max={1} />}
    {state.phase === 'loading' ? <button onClick={releaseBrowserAI}>Cancel download</button> : !ready ? <button className="ai-chat-send" onClick={() => void enableBrowserAI(!!state.vision)}>{state.phase === 'error' ? 'Retry loading AI' : 'Enable browser AI'}</button> : null}
    <details className="ai-device-details"><summary>{ready ? 'Device options' : 'Download details'}</summary>
      <p>Prompts stay on this device. Model files download from Hugging Face and MLC and are cached when storage allows. AI needs a compatible browser and roughly 2–3 GB of graphics memory.</p>
      <p>Photo AI reads selected images. It downloads a larger vision model and needs at least 4 GB of graphics memory, with additional space for context. Photos load from Wikimedia.</p>
      {!state.vision&&state.phase!=='loading'&&<button disabled={busy} onClick={()=>void enableBrowserAI(true)}>Enable photo AI</button>}
      {state.vision&&state.phase!=='loading'&&<button disabled={busy} onClick={()=>{window.dispatchEvent(new Event('ai-text-mode'));void enableBrowserAI(false);}}>Use text AI instead</button>}
      {state.phase === 'loading' && <p>{state.message}</p>}
      {ready && <button disabled={busy} onClick={releaseBrowserAI}>Turn off AI</button>}
    </details>
  </div>;
}
