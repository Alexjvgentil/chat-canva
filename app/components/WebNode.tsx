import React, { useState, useEffect } from 'react';
import { type Node } from '../types';
import { TrashIcon } from './Icons';

interface WebNodeProps {
  node: Node;
  onDragStart: (e: React.MouseEvent, nodeId: string) => void;
  onDelete: (nodeId: string) => void;
  onStartEdgeCreation: (e: React.MouseEvent, nodeId: string, handle: string) => void;
  onCompleteEdgeCreation: (nodeId: string, handle: string) => void;
  onResizeStart: (e: React.MouseEvent, nodeId: string) => void;
  onRename: (nodeId: string, title: string) => void;
  onUrlChange: (nodeId: string, url: string) => void;
  onFocusToggle?: (nodeId: string) => void;
  isFocused?: boolean;
}

const normalizeUrl = (value: string) => {
  if (!value) return 'https://www.google.com';
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value}`;
};

const WebNode: React.FC<WebNodeProps> = ({ node, onDragStart, onDelete, onStartEdgeCreation, onCompleteEdgeCreation, onResizeStart, onRename, onUrlChange, onFocusToggle, isFocused }) => {
  const [nameDraft, setNameDraft] = useState(node.title ?? 'Web Browser');
  const [urlInput, setUrlInput] = useState(node.web?.url ?? 'https://www.google.com');
  const [currentUrl, setCurrentUrl] = useState(node.web?.url ?? 'https://www.google.com');

  useEffect(() => {
    setNameDraft(node.title ?? 'Web Browser');
  }, [node.title]);

  useEffect(() => {
    if (node.web?.url && node.web.url !== currentUrl) {
      setUrlInput(node.web.url);
      setCurrentUrl(node.web.url);
    }
  }, [node.web?.url, currentUrl]);

  const navigate = () => {
    const normalized = normalizeUrl(urlInput.trim());
    setCurrentUrl(normalized);
    onUrlChange(node.id, normalized);
  };

  return (
    <div
      className="node-interactive relative w-full h-full flex flex-col bg-gray-800/80 border border-gray-700/50 rounded-2xl shadow-2xl"
      onWheel={e => e.stopPropagation()}
      onMouseUpCapture={() => onCompleteEdgeCreation(node.id, 'input')}
    >
      <div
        onMouseDown={(e) => onDragStart(e, node.id)}
        className="group flex items-center justify-between p-2 text-xs text-gray-300 cursor-move bg-gray-900/30 rounded-t-2xl"
      >
        <span className="font-semibold">Web Search</span>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onFocusToggle?.(node.id);
            }}
            className="px-2 py-1 text-[10px] rounded bg-gray-700 text-gray-100 hover:bg-gray-600 opacity-0 group-hover:opacity-100 transition"
          >
            {isFocused ? 'Fechar' : 'Foco'}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(node.id);
            }}
            className="p-1 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition"
          >
            <TrashIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="px-4 pt-2 space-y-3">
        <div>
          <label className="block text-[11px] uppercase tracking-wide text-gray-500 mb-1">Nome</label>
          <input
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            onBlur={() => {
              const trimmed = nameDraft.trim();
              if (!trimmed) {
                setNameDraft(node.title ?? 'Web Browser');
                return;
              }
              if (!node.title || trimmed !== node.title) {
                onRename(node.id, trimmed);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === 'Escape') {
                (e.target as HTMLInputElement).blur();
              }
            }}
            className="w-full bg-gray-800 text-gray-100 rounded-lg px-3 py-1.5 text-sm border border-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-[11px] uppercase tracking-wide text-gray-500 mb-1">URL</label>
          <div className="flex gap-2">
            <input
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  navigate();
                }
              }}
              className="flex-1 bg-gray-900 text-gray-100 rounded-lg px-3 py-1.5 text-sm border border-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-sm hover:bg-indigo-500"
              onClick={navigate}
            >Ir</button>
          </div>
        </div>
      </div>

      <div className="flex-1 m-4 rounded-xl overflow-hidden border border-gray-700 bg-black/20">
        <iframe
          title={node.title ?? 'Web preview'}
          src={currentUrl}
          className="w-full h-full"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        />
      </div>

      <div
        className="node-interactive absolute top-1/2 -translate-y-1/2 -left-6 w-8 h-12 flex items-center justify-center cursor-pointer"
        onMouseUp={(e) => {
          e.stopPropagation();
          onCompleteEdgeCreation(node.id, 'input');
        }}
      >
        <div className="w-4 h-4 bg-gray-600 hover:bg-indigo-500 rounded-full border-2 border-gray-800 transition-colors opacity-50 group-hover:opacity-100" />
      </div>

      <div
        className="node-interactive absolute top-1/2 -translate-y-1/2 -right-6 w-8 h-12 flex items-center justify-center cursor-pointer"
        onMouseDown={(e) => onStartEdgeCreation(e, node.id, 'output')}
      >
        <div className="w-4 h-4 bg-indigo-600 hover:bg-indigo-500 rounded-full border-2 border-gray-800 transition-colors opacity-50 group-hover:opacity-100" />
      </div>

      <div
        onMouseDown={(e) => {
          e.stopPropagation();
          onResizeStart(e, node.id);
        }}
        className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize bg-gray-600/50 hover:bg-gray-500 rounded-br-2xl"
        style={{ transform: 'translate(2px, 2px)' }}
      />
    </div>
  );
};

export default WebNode;
