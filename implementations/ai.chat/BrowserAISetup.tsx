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
  return <div className="browser-ai-setup" style={{ padding:12, borderBottom:'1px solid var(--border-color)', lineHeight:1.5 }}>
    <strong>Free browser AI</strong>
    {state.phase !== 'ready' && <p style={{ color:'var(--text-secondary)', margin:'6px 0' }}>No account, API key, or local server. First use downloads about 1 GB; allow roughly 2–3 GB of graphics memory. Model files come from Hugging Face and MLC; prompts stay on this device.</p>}
    <p role="status" style={{ overflowWrap:'anywhere', fontSize:11 }}>{state.message}</p>
    {state.phase === 'loading' && <progress aria-label="AI model download" value={state.progress} max={1} style={{width:'100%'}} />}
    {state.phase === 'loading' ? <button onClick={releaseBrowserAI}>Cancel download</button> : state.phase === 'ready' ? <button disabled={busy} onClick={releaseBrowserAI}>Unload AI</button> : <button className="ai-chat-send" onClick={() => void enableBrowserAI()}>{state.phase === 'error' ? 'Retry loading AI' : 'Enable browser AI'}</button>}
  </div>;
}
