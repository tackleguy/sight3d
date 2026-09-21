import { wantsKnowledgeDesign } from './knowledge-design';
import { directSportsRequest, createDirectSportsResponder } from './direct-sports';
import { buildingCatalogContext } from './building-catalog';
import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../window.main/AppContext';
import { ChatMessage, buildLocalSystemPrompt, buildSelectionContext, contextToMessage, getToolDefinitions, executeTool } from './AIService';
import { runChatTurn, ToolResult } from './chat-runner';
import './assistant.css';
import { BrowserAISetup } from './BrowserAISetup';
import { stopBrowserAI } from '../../src/web/browser-ai';

const STARTERS = [
  ['Quick stadium preset', 'Create a quick soccer stadium preset.'],
  ['A familiar example', 'Create a lighthouse inspired by a traditional coastal lighthouse, with its recognizable parts.'],
  ['A glass of water', 'Create a glass of water, radius 0.04m, height 0.12m.'],
  ['A colored arc', 'Create a blue arc with radius 2m and angle 180 degrees.'],
  ['A 3D chair', 'Create a wood chair, 0.5m wide, 0.5m deep and 0.9m tall.'],
  ['Building catalog', 'Show me types of buildings in the catalog.'],
  ['A terraced museum', 'Create a brutalist art museum with terraced massing, 48m wide and 20m tall.'],
  ['A house', 'Create a two-floor house, 12m wide, 9m deep and 7m tall, with a gable roof.'],
  ['A tower', 'Create a circular glass tower, 180m tall, 30m wide and 30m deep, twisted by 60 degrees, with a flat roof.'],
  ['A neighborhood', 'Design a Paris-inspired neighborhood with 6 buildings at detail level 2.'],
];

export function AIChatPanel({ visible = true }: { visible?: boolean }) {
  const { app, selectedCount, activeTool, units, undo, canUndo, syncToolState, syncPreviews } = useApp();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<'build' | 'learn'>('build');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [lastPrompt, setLastPrompt] = useState('');
  const [liveTools, setLiveTools] = useState<ToolResult[]>([]);
  const stopRef = useRef(false);
  const busyRef = useRef(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { if (visible) endRef.current?.scrollIntoView({ block: 'nearest' }); }, [messages, loading, liveTools, visible]);
  useEffect(() => {
    const suggest = (e: Event) => {
      if (busyRef.current) return;
      setInput((e as CustomEvent).detail?.prompt || 'How do I use the current tool?');
      setMode((e as CustomEvent).detail?.mode || 'learn');
      inputRef.current?.focus();
    };
    window.addEventListener('ai-prompt', suggest);
    return () => window.removeEventListener('ai-prompt', suggest);
  }, []);

  async function sendMessage() {
    const text = input.trim();
    if (!text || busyRef.current) return;
    const api = (app as any)?.modelAPI ?? (window as any).modelAPI;
    if (!api) { setError('The model is still loading. Try again in a moment.'); return; }
    busyRef.current = true;
    stopRef.current = false;
    setLoading(true); setError(null); setLiveTools([]); setLastPrompt(text); setInput('');
    const next: ChatMessage[] = [...messages, { role: 'user', content: text }];
    setMessages(next);
    const completed: ToolResult[] = [];
    try {
      const history = next.map(m => ({ role: m.role, content: m.content }));
      history[history.length - 1].content = `${contextToMessage(buildSelectionContext(api))}\nDisplay units: ${units}. Active tool: ${activeTool?.name || 'Select'}.\n\n${text}`;
      const system = mode === 'learn'
        ? 'You are Sight3D’s friendly modeling instructor. Explain SketchUp-style modeling in short, concrete steps using the active tool and selection context. You cannot edit geometry in Learn mode. Never claim to have made changes. Teach Rectangle (R), Push/Pull (P), Orbit (O), Move (M), and typed dimensions. Ask one focused question when the request is ambiguous.'
        : buildLocalSystemPrompt() + '\nYou are the Sight3D modeling assistant. Use plain language, state assumptions about dimensions, and ask one focused question when intent is ambiguous. Preserve unrelated geometry. After editing, briefly explain what changed and that each modeling operation can be undone. Never claim an operation succeeded if its result failed.';
      const direct = mode === 'build' && /\b(quick|preset)\b/i.test(text) && directSportsRequest(text) ? createDirectSportsResponder(text) : null;
      const result = await runChatTurn({
        messages: history,
        maxRounds: 6,
        request: async messages => direct ? direct(messages) : window.api.invoke('ai:chat', { system:system+(wantsKnowledgeDesign(text)?'':buildingCatalogContext(text)), messages, tools: mode === 'build' ? getToolDefinitions() : [] }) as any,
        execute: async (name, args) => {
          const result = await executeTool(api, name, ['create_building','create_city'].includes(name) ? {...args,brief:text} : args);
          (app as any)?.syncScene?.(); (app as any)?.syncSelection?.();
          syncToolState(); syncPreviews();
          if (['create_design','create_skyscraper','create_building','create_city'].includes(name) && JSON.parse(result).ok) { api.setView('iso'); api.zoomExtents(); }
          return result;
        },
        stopped: () => stopRef.current,
        allowEdits: mode === 'build',
        onProgress: setProgress,
        onTool: tool => { completed.push(tool); setLiveTools([...completed]); },
      });
      setMessages(prev => [...prev, { role: 'assistant', content: result.stopped ? 'Stopped. Completed operations remain in the model; use Undo to step back.' : result.text || 'Finished. Review the operations below.', toolCalls: completed }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The request failed. Please try again.');
      if (completed.length) setMessages(prev => [...prev, { role: 'assistant', content: 'The request stopped before finishing. These operations ran; review the model before retrying.', toolCalls: completed }]);
    } finally { busyRef.current = false; setLoading(false); setLiveTools([]); }
  }

  return (
    <section className="ai-chat-window" aria-label="AI modeling assistant" hidden={!visible}>
      <div className="ai-chat-header"><strong>Model with AI</strong><button disabled={loading || !messages.length} onClick={() => { setMessages([]); setError(null); }} title="Start a new conversation">New chat</button></div>
      <div className="ai-mode-switch" role="group" aria-label="Assistant mode">
        <button aria-pressed={mode === 'build'} disabled={loading} onClick={() => setMode('build')}>Create</button>
        <button aria-pressed={mode === 'learn'} disabled={loading} onClick={() => setMode('learn')}>Ask for help</button>
      </div>
      <p className="ai-mode-help">{mode === 'build' ? 'Describe what you want to make or change.' : 'Get instructions without changing your model.'}</p>
      <div className="ai-context"><span>{selectedCount ? `${selectedCount} selected` : 'Nothing selected'}</span><span>Units: {units}</span></div>
      <div className="ai-chat-messages" role="log" aria-label="Conversation" aria-live="polite">
        <BrowserAISetup busy={loading} />
        {messages.length === 0 && <div className="ai-chat-empty">
          <h2>{mode === 'build' ? 'What would you like to make?' : 'Learn by making.'}</h2>
          <p>{mode === 'build' ? 'Use your own words, or choose an example to edit. Sizes are optional. Ask for an example or describe its defining features. Quick stadium presets work without loading AI.' : 'Ask about a tool or follow a small project, one step at a time.'}</p>
          <div className="ai-starters">{(mode === 'build' ? STARTERS : [['Make my first model', 'Walk me through drawing a rectangle and turning it into a box with Push/Pull. Give me one step at a time.'], ['Explain this tool', `How do I use ${activeTool?.name || 'Select'}? Explain the clicks and keyboard shortcuts.`]]).map(([label, prompt]) => <button key={label} onClick={() => { setInput(prompt); inputRef.current?.focus(); }}>{label}</button>)}</div>

        </div>}
        {messages.map((msg, i) => <div key={i} className={`ai-chat-msg ai-chat-msg-${msg.role}`}>
          <div className="ai-chat-msg-role">{msg.role === 'user' ? 'You' : 'Sight3D'}</div>
          <div className="ai-chat-msg-content">{msg.content}</div>
          {!!msg.toolCalls?.length && <details className="ai-chat-tool-calls"><summary>{msg.toolCalls.length} operation{msg.toolCalls.length === 1 ? '' : 's'} · view details</summary>{msg.toolCalls.map((tc, j) => <ToolCallRow key={j} tc={tc} />)}</details>}
        </div>)}
        {!loading && mode === 'build' && messages.some(m => m.toolCalls?.some(t => t.name === 'create_building')) && <button className="ai-followup" onClick={() => { setInput('Add more detail.'); inputRef.current?.focus(); }}>Add more detail</button>}
        {loading && <div className="ai-progress" role="status">{progress}<small>{liveTools.length > 0 ? `${liveTools.length} changes completed` : 'You can stop at any time.'}</small></div>}
        {error && <div className="ai-chat-error" role="alert"><strong>Couldn’t finish this request</strong><p>{error}</p><button onClick={() => { setInput(lastPrompt); inputRef.current?.focus(); }}>Edit and retry</button><details><summary>Connection settings</summary><button onClick={() => window.dispatchEvent(new Event('show-ai-settings'))}>Open AI settings</button></details></div>}
        <div ref={endRef} />
      </div>
      <div className="ai-chat-input-area">
        <label htmlFor="ai-prompt-input">{mode === 'build' ? 'Describe your model or change' : 'Ask a modeling question'}</label>
        <textarea id="ai-prompt-input" ref={inputRef} value={input} onChange={e => setInput(e.target.value)} placeholder={mode === 'build' ? 'A small house with a gable roof…' : 'How do I turn a flat shape into 3D?'} rows={3} disabled={loading}
          onKeyDown={e => { e.stopPropagation(); if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void sendMessage(); } }} />
        <div className="ai-compose-actions"><button disabled={!canUndo || loading} onClick={undo}>Undo change</button>{loading ? <button className="ai-chat-send" onClick={() => { stopRef.current = true; stopBrowserAI(); setProgress('Stopping after the current request or operation…'); }}>Stop</button> : <button className="ai-chat-send" onClick={() => void sendMessage()} disabled={!input.trim() || !app}>Send</button>}</div>
        <small>Enter to send · Shift + Enter for a new line</small>
        <details className="ai-options"><summary>More options</summary><p>Undo reverses one change at a time.</p><button onClick={() => window.dispatchEvent(new Event('show-ai-settings'))}>AI settings</button></details>
      </div>
    </section>
  );
}

function ToolCallRow({ tc }: { tc: { name: string; input: Record<string, unknown>; result?: string } }) {
  const [expanded, setExpanded] = useState(false);
  // Try to parse the result so we can pull `ok`, `error`, `created` etc.
  let parsed: any = tc.result;
  let ok = true;
  let summary = '';
  try {
    if (typeof tc.result === 'string') parsed = JSON.parse(tc.result);
  } catch (e) { console.warn('[AIChatPanel.ToolCallRow] result was not valid JSON, keeping raw:', e); }

  if (parsed && typeof parsed === 'object') {
    if (parsed.ok === false) ok = false;
    if (tc.name === 'execute_script') {
      const c = parsed.created ?? {};
      const r = parsed.removed ?? {};
      const counts = (o: any) =>
        `F${(o.faces ?? []).length} E${(o.edges ?? []).length} V${(o.vertices ?? []).length} G${(o.groups ?? []).length}`;
      summary = ok
        ? `"${parsed.operationName ?? ''}" — created ${counts(c)}${(r.faces?.length || r.edges?.length) ? `, removed ${counts(r)}` : ''}`
        : `"${parsed.operationName ?? ''}" — ${parsed.error ?? 'failed'}`;
    } else if (tc.name === 'inspect') {
      summary = `${Array.isArray(parsed) ? parsed.length : 0} entit${(Array.isArray(parsed) && parsed.length === 1) ? 'y' : 'ies'}`;
    } else if (tc.name === 'read_state') {
      const s = parsed.selection?.counts ?? {};
      summary = `selection: F${s.faces ?? 0} E${s.edges ?? 0} V${s.vertices ?? 0} · model: ${parsed.model?.totalFaces ?? 0} faces, ${parsed.model?.totalEdges ?? 0} edges`;
    } else if (tc.name === 'read_api_reference') {
      const s = typeof parsed === 'string' ? parsed.length : (typeof tc.result === 'string' ? tc.result.length : 0);
      summary = `${s.toLocaleString()} chars`;
    }
  }

  const inputPreview = (() => {
    if (tc.name === 'execute_script') {
      const op = (tc.input as any).operationName ?? '';
      const script = String((tc.input as any).script ?? '').replace(/\s+/g, ' ').trim();
      return op + ' — ' + (script.length > 60 ? script.slice(0, 60) + '…' : script);
    }
    if (tc.name === 'inspect') {
      const ids = (tc.input as any).ids ?? [];
      return Array.isArray(ids) ? `${ids.length} id(s)` : '';
    }
    return JSON.stringify(tc.input ?? {}, null, 0).slice(0, 80);
  })();

  return (
    <div className={`ai-chat-tool-call ${expanded ? 'expanded' : ''}`}>
      <div className="ai-chat-tool-row-top">
        <span className="ai-chat-tool-name" style={{ color: ok ? '#4ade80' : '#f87171' }}>{tc.name}</span>
        <span className="ai-chat-tool-args">{summary || inputPreview}</span>
        <button className="ai-chat-tool-toggle" onClick={() => setExpanded(!expanded)}>
          {expanded ? 'hide' : 'show'}
        </button>
      </div>
      {expanded && (
        <>
          {tc.name === 'execute_script' && (
            <div className="ai-chat-tool-detail">
              {String((tc.input as any).script ?? '')}
            </div>
          )}
          {tc.name !== 'execute_script' && (
            <div className="ai-chat-tool-detail">
              input: {JSON.stringify(tc.input, null, 2)}
            </div>
          )}
          <div className={`ai-chat-tool-detail ${ok ? 'ok' : 'error'}`}>
            {typeof parsed === 'string' ? parsed : JSON.stringify(parsed, null, 2)}
          </div>
        </>
      )}
    </div>
  );
}
