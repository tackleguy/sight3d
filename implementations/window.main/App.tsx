// @archigraph window.main
import React, { useEffect, useState, useCallback } from 'react';
import { AppProvider, useApp } from './AppContext';
import { DrawingToolbar } from './DrawingToolbar';
import { ViewsToolbar } from './ViewsToolbar';
import { SceneTabs } from './SceneTabs';
import { InstructorPanel } from './InstructorPanel';
import { LibraryPanel } from './LibraryPanel';
import { EntityInfoPanel } from './EntityInfoPanel';
import { OutlinerPanel } from './OutlinerPanel';
import { LayersPanel } from './LayersPanel';
import { MeasurementsBar } from './MeasurementsBar';
import { ContextMenu } from './ContextMenu';
import { ToolSettingsPanel } from './ToolSettingsPanel';
import { ViewportCanvas } from '../viewport.main/ViewportCanvas';
import { AIChatPanel } from '../ai.chat/AIChatPanel';
import { ExportModal } from './ExportModal';
import { BugReportModal } from './BugReportModal';
import { setSnapSettings } from '../../src/core/snap-settings';
import { PreferencesWindow } from '../window.preferences/PreferencesWindow';
import { WelcomeModal } from './WelcomeModal';
import { DEFAULT_PREFERENCES } from '../../src/core/ipc-types';
import { applyTemplateUnits, type ModelTemplate } from '../../src/core/units';
import { WebMenuBar } from '../../src/web/WebMenuBar';
import { PluginsBar } from '../plugin.system/PluginsBar';
import { WorkflowBar } from './WorkflowBar';
import { ParametersPanel } from '../plugin.system/ParametersPanel';

const EXAMPLE_SKP_URL = 'https://archigraph-releases-prod.s3.us-east-1.amazonaws.com/draftdown/examples/church.skp';

function useIsWeb() {
  return typeof (window as any).__PLATFORM__ === 'string' && (window as any).__PLATFORM__ === 'web';
}

export function App() {
  return (
    <AppProvider>
      <AppLayout />
    </AppProvider>
  );
}

// Build shortcut lookup tables from preferences (key -> toolId)
const shortcutMap: Record<string, string> = {};
const shiftShortcutMap: Record<string, string> = {};

for (const [toolId, binding] of Object.entries(DEFAULT_PREFERENCES.shortcuts)) {
  if (!toolId.startsWith('tool.')) continue;
  if (binding.startsWith('Shift+')) {
    shiftShortcutMap[binding.slice(6).toLowerCase()] = toolId;
  } else {
    shortcutMap[binding === 'Space' ? ' ' : binding.toLowerCase()] = toolId;
  }
}

function AppLayout() {
  const { theme, app, activateTool, undo, redo, updateState, syncToolState, syncPreviews } = useApp();
  const [prefsVisible, setPrefsVisible] = useState(false);
  const [prefsTab, setPrefsTab] = useState<'units' | 'ai'>('units');
  const [tray, setTray] = useState<'model' | 'ai' | null>('ai');
  const [quickStart, setQuickStart] = useState(false);
  useEffect(() => {
    const toggle = () => setTray(t => t === 'ai' ? null : 'ai');
    const show = () => setTray('ai');
    const settings = () => { setPrefsTab('ai'); setPrefsVisible(true); };
    window.addEventListener('toggle-ai-chat', toggle);
    window.addEventListener('ai-prompt', show);
    window.addEventListener('show-ai-settings', settings);
    return () => { window.removeEventListener('toggle-ai-chat', toggle); window.removeEventListener('ai-prompt', show); window.removeEventListener('show-ai-settings', settings); };
  }, []);
  const [exportVisible, setExportVisible] = useState(false);
  const [bugReportVisible, setBugReportVisible] = useState(false);
  const [welcomeVisible, setWelcomeVisible] = useState(true);
  const isWeb = useIsWeb();

  // Handle keyboard shortcuts globally
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isArrow = e.key.startsWith('Arrow');

      // Don't handle tool shortcuts if focused on input/select or inside a dialog
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA' || (e.target as HTMLElement).isContentEditable) return;
      if (welcomeVisible || prefsVisible || exportVisible || bugReportVisible) return;
      if ((e.target as HTMLElement).closest('.text-input-dialog')) return;

      const isMeta = e.metaKey || e.ctrlKey;

      if (isMeta && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); return; }
      if (isMeta && e.key === 'z' && e.shiftKey) { e.preventDefault(); redo(); return; }

      // File operations
      if (isMeta && e.key === 's' && !e.shiftKey) { e.preventDefault(); (app as any)?.saveDocument(); return; }
      if (isMeta && e.key === 's' && e.shiftKey) { e.preventDefault(); (app as any)?.saveDocumentAs(); return; }
      if (isMeta && e.key === 'o') { e.preventDefault(); (app as any)?.openDocument(); return; }
      if (isMeta && e.key === 'e') { e.preventDefault(); setExportVisible(true); return; }
      if (isMeta && e.key === 'n') { e.preventDefault(); (app as any)?.newDocument(); return; }

      // Clipboard: copy/cut/paste geometry (Cmd/Ctrl+C/X/V; Shift+V = in place)
      const letter = e.key.toLowerCase();
      if (isMeta && letter === 'c' && !e.shiftKey) {
        e.preventDefault();
        (app as any)?.copySelection?.();
        return;
      }
      if (isMeta && letter === 'x' && !e.shiftKey) {
        e.preventDefault();
        if ((app as any)?.cutSelection?.()) {
          (app as any)?.syncScene?.();
          (app as any)?.syncSelection?.();
          syncPreviews();
        }
        return;
      }
      if (isMeta && letter === 'v') {
        e.preventDefault();
        if (e.shiftKey) {
          if ((app as any)?.pasteInPlace?.()) {
            (app as any)?.syncScene?.();
            (app as any)?.syncSelection?.();
            syncPreviews();
          }
          return;
        }
        // classic-CAD-style paste: clone attaches to the cursor via the Move
        // tool; click places it, Escape cancels the whole paste.
        const placed = (app as any)?.pasteClipboard?.();
        if (placed) {
          activateTool('tool.move');
          const mt = (app as any)?.toolManager?.getTool?.('tool.move') as any;
          mt?.beginPlacement?.(placed.vertexIds, placed.anchor);
          (app as any)?.syncScene?.();
          (app as any)?.syncSelection?.();
          syncPreviews();
          syncToolState();
        }
        return;
      }

      // Make Component — the classic modeler's G (and legacy Cmd/Ctrl+G)
      if ((e.key === 'g' || e.key === 'G') && !e.shiftKey && (isMeta || !isMeta)) {
        e.preventDefault();
        const sel = (app as any)?.document?.selection;
        const sm = (app as any)?.document?.scene;
        const geo = (app as any)?.document?.geometry;
        if (sel && sm?.createComponent && geo) {
          const ids = Array.from(sel.state.entityIds) as string[];
          if (ids.length > 0) {
            // Auto-include edges of selected faces
            const allIds = new Set(ids);
            for (const id of ids) {
              if (geo.getFace(id)) {
                const edges = geo.getFaceEdges(id);
                for (const edge of edges) allIds.add(edge.id);
              }
            }
            const compId = sm.createComponent('Component', Array.from(allIds));
            sel.clear();
            sel.add(compId);
            (app as any)?.syncScene?.();
            (app as any)?.syncSelection?.();
            syncPreviews();
          }
        }
        return;
      }

      // Zoom Extents — the classic modeler's Shift+Z
      if (!isMeta && e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        const bbox = (app as any)?.document?.geometry?.getBoundingBox?.();
        if (bbox) (app as any)?.viewport?.camera?.fitToBox?.(bbox);
        return;
      }

      // Tool shortcuts (from preferences)
      const key = e.key.toLowerCase();
      if (!isMeta && !e.shiftKey && shortcutMap[key]) {
        e.preventDefault();
        activateTool(shortcutMap[key]);
        return;
      }
      if (!isMeta && e.shiftKey && shiftShortcutMap[key]) {
        e.preventDefault();
        activateTool(shiftShortcutMap[key]);
        return;
      }

      // Escape: exit component/group editing, or clear selection and deactivate tool
      if (e.key === 'Escape') {
        e.preventDefault();
        const sm = (app as any)?.document?.scene;
        // If editing a component, let the tool handle exit and stop
        if (sm?.editingComponentId) {
          const tool = (app as any)?.toolManager?.getActiveTool();
          if (tool) {
            tool.onKeyDown({
              key: e.key, code: e.code,
              shiftKey: e.shiftKey, ctrlKey: e.ctrlKey || e.metaKey, altKey: e.altKey,
            });
          }
          (app as any)?.syncScene?.();
          (app as any)?.syncSelection?.();
          syncPreviews();
          syncToolState();
          return;
        }
        // classic CAD behavior: Escape mid-operation cancels the operation but
        // KEEPS the tool active; Escape with the tool idle clears the
        // selection and returns to Select.
        const tool = (app as any)?.toolManager?.getActiveTool();
        const wasMidOperation = !!tool && (tool as any).phase && (tool as any).phase !== 'idle';
        if (tool) {
          tool.onKeyDown({
            key: e.key, code: e.code,
            shiftKey: e.shiftKey, ctrlKey: e.ctrlKey || e.metaKey, altKey: e.altKey,
          });
        }
        if (!wasMidOperation) {
          (app as any)?.document?.selection?.clear();
          activateTool('tool.select');
        }
        (app as any)?.syncScene?.();
        (app as any)?.syncSelection?.();
        syncPreviews();
        syncToolState();
        return;
      }

      // Arrow keys + Enter + Delete: forward to active tool
      if (isArrow || e.key === 'Enter' || e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        const tool = (app as any)?.toolManager?.getActiveTool();
        if (tool) {
          tool.onKeyDown({
            key: e.key, code: e.code,
            shiftKey: e.shiftKey, ctrlKey: e.ctrlKey || e.metaKey, altKey: e.altKey,
          });
          (app as any)?.syncScene?.();
          (app as any)?.syncSelection?.();
          syncPreviews();
          syncToolState();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [app, activateTool, undo, redo, syncToolState, syncPreviews, welcomeVisible, prefsVisible, exportVisible, bugReportVisible]);

  // Listen for show-export-modal from MainToolbar
  useEffect(() => {
    const handler = () => setExportVisible(true);
    window.addEventListener('show-export-modal', handler);
    return () => window.removeEventListener('show-export-modal', handler);
  }, []);

  // Listen for menu actions from main process
  useEffect(() => {
    if (typeof window.api === 'undefined') return;

    const cleanup = window.api.on('menu:action', ({ action }) => {
      if (action === 'undo') { undo(); return; }
      if (action === 'redo') { redo(); return; }

      // Tool activation from menu
      if (typeof action === 'string' && action.startsWith('tool-')) {
        activateTool('tool.' + action.slice(5));
        return;
      }

      // Web-only actions (not in MenuAction type)
      if ((action as string) === 'fullscreen') {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen();
        } else {
          document.exitFullscreen();
        }
        return;
      }

      switch (action) {
        case 'export':
          setExportVisible(true);
          return;
        case 'preferences':
          setPrefsTab('units');
          setPrefsVisible(true);
          break;
        case 'delete': {
          const tool = (app as any)?.toolManager?.getActiveTool();
          if (tool) tool.onKeyDown({ key: 'Delete', code: 'Delete', shiftKey: false, ctrlKey: false, altKey: false });
          break;
        }
        case 'select-all':
          (app as any)?.document?.selection?.selectAll();
          break;
        case 'cut':
          document.execCommand('cut');
          break;
        case 'copy':
          document.execCommand('copy');
          break;
        case 'paste':
          document.execCommand('paste');
          break;
        case 'about':
          alert('DraftDown — 3D CAD Application');
          break;
        case 'report-bug':
          setBugReportVisible(true);
          break;
      }
    });

    return cleanup;
  }, [undo, redo, activateTool, app]);

  return (
    <div className="app-layout" data-theme={theme}>
      {isWeb && <WebMenuBar />}
      <WorkflowBar tray={tray} onTray={tab => setTray(t => t === tab ? null : tab)} onLearn={() => setQuickStart(v => !v)} />
      <div className="app-top-bar" style={{ position: 'relative' }}>
        <ViewsToolbar />
        <PluginsBar />
      </div>
      <div className="app-main">
        <DrawingToolbar />
        <div className="app-viewport-area" style={{ position: 'relative' }}>
          <SceneTabs />
          {quickStart && <div className="quick-start" aria-label="Quick start">
            <div><strong>Your first 3D shape</strong><button onClick={() => setQuickStart(false)} aria-label="Close quick start">×</button></div>
            <p>Choose a step, then follow the tool instructions below.</p>
            <button onClick={() => activateTool('tool.rectangle')}><b>1. Draw a rectangle</b><span>Click two corners on the ground · R</span></button>
            <button onClick={() => activateTool('tool.pushpull')}><b>2. Pull it into 3D</b><span>Click the face, move up, click to finish · P</span></button>
            <button onClick={() => activateTool('tool.orbit')}><b>3. Look around</b><span>Drag to orbit your new shape · O</span></button>
            <button onClick={() => window.dispatchEvent(new CustomEvent('ai-prompt', { detail: { mode: 'learn', prompt: 'Help me make my first model with Rectangle and Push/Pull. Give me one step at a time.' } }))}>Guide me with AI →</button>
          </div>}
          <ViewportCanvas />
          <InstructorPanel />
        </div>
        <aside className="app-tray" hidden={!tray}>
          <div className="tray-tabs" role="group" aria-label="Side panel"><button aria-pressed={tray === 'ai'} onClick={() => setTray('ai')}>AI assistant</button><button aria-pressed={tray === 'model'} onClick={() => setTray('model')}>Model</button><button onClick={() => setTray(null)} aria-label="Close side panel">×</button></div>
          <AIChatPanel visible={tray === 'ai'} />
          <div className="app-right-panels" hidden={tray !== 'model'}>
          <ToolSettingsPanel />
          <EntityInfoPanel />
          <LibraryPanel />
          <ParametersPanel />
          <OutlinerPanel />
          <LayersPanel />
          </div>
        </aside>
      </div>
      <MeasurementsBar />
      <ContextMenu />
      <LoadingOverlay />
      <ExportModal
        visible={exportVisible}
        onClose={() => setExportVisible(false)}
        onExport={(fmt) => (app as any)?.exportFile(fmt)}
      />
      <BugReportModal
        visible={bugReportVisible}
        onClose={() => setBugReportVisible(false)}
        app={app}
      />
      <WelcomeModal
        visible={welcomeVisible}
        onNewProject={(template?: ModelTemplate) => {
          if (template) {
            applyTemplateUnits(template);
            const a = app as any;
            if (a?.document) a.document.metadata.units = template.unit;
            updateState({ units: template.unit });
            a?.viewport?.renderer?.setBackgroundMode?.(template.sky ? 'sky' : 'solid');
          }
          setWelcomeVisible(false);
          setQuickStart(true);
        }}
        onOpenFile={() => {
          setWelcomeVisible(false);
          (app as any)?.openDocument();
        }}
        onLoadExample={() => {
          setWelcomeVisible(false);
          (app as any)?.loadSkpFromUrl(EXAMPLE_SKP_URL);
        }}
      />
      <PreferencesWindow initialTab={prefsTab} visible={prefsVisible} onClose={() => setPrefsVisible(false)} onSaved={(p) => {
        updateState({ units: p.units, gridSnapEnabled: p.gridSnapEnabled } as any);
        setSnapSettings({
          objectSnapEnabled: p.snapEnabled,
          gridSnapEnabled: p.gridSnapEnabled,
          gridSnapSpacing: p.gridSnapSpacing,
        });
        (app as any)?.viewport?.setGridSpacing?.(p.gridSpacing);
      }} />

      <style>{`
        .app-layout {
          display: flex;
          flex-direction: column;
          width: 100%;
          height: 100%;
          background: var(--bg-primary);
        }
        .app-top-bar {
          display: flex;
          flex-direction: column;
          border-bottom: 1px solid var(--border-color);
          flex-shrink: 0;
        }
        .app-main {
          display: flex;
          flex: 1;
          overflow: hidden;
        }
        .app-viewport-area {
          flex: 1;
          position: relative;
          overflow: hidden;
        }
        .app-right-panels[hidden] { display: none; }
        .app-right-panels {
          width: 100%;
          min-width: 0;
          flex: 1;
          border-left: 1px solid var(--border-color);
          display: flex;
          flex-direction: column;
          overflow-y: auto;
          background: var(--bg-secondary);

        }
      `}</style>
    </div>
  );
}

// ─── Loading Overlay ──────────────────────────────────────────────

function LoadingOverlay() {
  const [loading, setLoading] = useState<{ message: string; progress: number } | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail.done) {
        setLoading(null);
      } else {
        setLoading({ message: detail.message || 'Loading...', progress: detail.progress ?? -1 });
      }
    };
    window.addEventListener('import-progress', handler);
    return () => window.removeEventListener('import-progress', handler);
  }, []);

  if (!loading) return null;

  const hasProgress = loading.progress >= 0 && loading.progress <= 1;

  return (
    <div className="loading-overlay">
      <div className="loading-dialog">
        <div className="loading-spinner" />
        <div className="loading-message">{loading.message}</div>
        <div className="loading-bar-track">
          {hasProgress
            ? <div className="loading-bar-fill" style={{ width: `${Math.round(loading.progress * 100)}%` }} />
            : <div className="loading-bar-indeterminate" />
          }
        </div>
        {hasProgress && (
          <div className="loading-percent">{Math.round(loading.progress * 100)}%</div>
        )}
      </div>
      <style>{`
        .loading-overlay {
          position: fixed; inset: 0; z-index: 10000;
          background: rgba(0,0,0,0.5); display: flex;
          align-items: center; justify-content: center;
        }
        .loading-dialog {
          background: var(--bg-secondary, #2a2a2a); border-radius: 8px;
          padding: 24px 32px; min-width: 300px; text-align: center;
          box-shadow: 0 8px 32px rgba(0,0,0,0.4);
        }
        .loading-spinner {
          width: 32px; height: 32px; margin: 0 auto 12px;
          border: 3px solid var(--border-color, #555);
          border-top-color: var(--accent, #4488ff);
          border-radius: 50%; animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .loading-message {
          font-size: 13px; color: var(--text-primary, #eee);
          margin-bottom: 12px; font-weight: 500;
        }
        .loading-bar-track {
          height: 6px; background: var(--bg-tertiary, #333);
          border-radius: 3px; overflow: hidden;
        }
        .loading-bar-fill {
          height: 100%; background: var(--accent, #4488ff);
          border-radius: 3px;
        }
        .loading-bar-indeterminate {
          height: 100%; width: 40%; background: var(--accent, #4488ff);
          border-radius: 3px; animation: indeterminate 1.2s ease-in-out infinite;
        }
        @keyframes indeterminate {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(350%); }
        }
        .loading-percent {
          font-size: 11px; color: var(--text-muted, #888);
          margin-top: 6px;
        }
      `}</style>
    </div>
  );
}
