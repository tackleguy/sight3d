import React from 'react';
import { useApp } from './AppContext';

export function WorkflowBar({ tray, onTray, onLearn }: { tray: 'model' | 'ai' | null; onTray: (tab: 'model' | 'ai') => void; onLearn: () => void }) {
  const { app, documentName, dirty, undo, redo, canUndo, canRedo, undoName, redoName } = useApp();
  return <header className="workflow-bar">
    <strong className="workflow-brand">Sight3D</strong>
    <span className="workflow-document" title={documentName}>{documentName}{dirty ? ' · Unsaved' : ''}</span>
    <div className="workflow-history"><button disabled={!canUndo} onClick={undo} title={undoName ? `Undo ${undoName}` : 'Undo'}>Undo</button><button disabled={!canRedo} onClick={redo} title={redoName ? `Redo ${redoName}` : 'Redo'}>Redo</button></div>
    <button disabled={!app} onClick={() => (app as any)?.saveDocument()}>Save</button>
    <div className="workflow-spacer" />
    <button onClick={onLearn}>Quick start</button>
    <button aria-pressed={tray === 'model'} onClick={() => onTray('model')}>Model tray</button>
    <button className="workflow-ai" aria-pressed={tray === 'ai'} onClick={() => onTray('ai')}>AI assistant</button>
  </header>;
}
