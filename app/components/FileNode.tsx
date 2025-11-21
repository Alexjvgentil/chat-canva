import React, { useState, useRef, useEffect } from 'react';
import { type Node, type FileData } from '../types';
import { TrashIcon } from './Icons';

interface FileNodeProps {
  node: Node;
  onDragStart: (e: React.MouseEvent, nodeId: string) => void;
  onDelete: (nodeId: string) => void;
  onStartEdgeCreation: (e: React.MouseEvent, nodeId: string, handle: string) => void;
  onCompleteEdgeCreation: (nodeId: string, handle: string) => void;
  onResizeStart: (e: React.MouseEvent, nodeId: string) => void;
  onRename: (nodeId: string, title: string) => void;
  onFileChange: (nodeId: string, file: FileData | null) => void;
}

const formatBytes = (bytes: number) => {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
};

const getPreview = (node: Node) => {
  if (!node.file) return null;
  const fileUrl = `data:${node.file.mimeType};base64,${node.file.data}`;
  const mime = node.file.mimeType;

  if (mime.startsWith('image/')) {
    return <img src={fileUrl} alt={node.file.name} className="w-full h-full object-contain rounded-lg" />;
  }
  if (mime === 'application/pdf') {
    return <iframe title={node.file.name} src={fileUrl} className="w-full h-full rounded-lg" />;
  }
  if (mime.startsWith('audio/')) {
    return <audio controls className="w-full"><source src={fileUrl} type={mime} />Seu navegador não suporta áudio.</audio>;
  }
  if (mime.startsWith('video/')) {
    return <video controls className="w-full h-full rounded-lg"><source src={fileUrl} type={mime} />Seu navegador não suporta vídeo.</video>;
  }
  return (
    <div className="flex flex-col items-center justify-center h-full text-sm text-gray-300 gap-2">
      <span>Pré-visualização indisponível.</span>
      <a href={fileUrl} download={node.file.name} className="px-3 py-1 rounded bg-indigo-600 text-white text-xs">Baixar arquivo</a>
    </div>
  );
};

const FileNode: React.FC<FileNodeProps> = ({ node, onDragStart, onDelete, onStartEdgeCreation, onCompleteEdgeCreation, onResizeStart, onRename, onFileChange }) => {
  const [nameDraft, setNameDraft] = useState(node.title ?? 'File Node');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setNameDraft(node.title ?? 'File Node');
  }, [node.title]);

  const handleFileSelection = async (file?: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      onFileChange(node.id, {
        name: file.name,
        mimeType: file.type || 'application/octet-stream',
        size: file.size,
        data: base64,
      });
    };
    reader.readAsDataURL(file);
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
        <span className="font-semibold">Arquivo</span>
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

      <div className="px-4 pt-2">
        <label className="block text-[11px] uppercase tracking-wide text-gray-500 mb-1">Nome do arquivo</label>
        <input
          value={nameDraft}
          onChange={(e) => setNameDraft(e.target.value)}
          onBlur={() => {
            const trimmed = nameDraft.trim();
            if (!trimmed) {
              setNameDraft(node.title ?? 'File Node');
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

      <div
        className="flex-1 m-4 p-4 rounded-xl border border-dashed border-gray-600 bg-gray-900/40 flex flex-col gap-3"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const file = e.dataTransfer.files?.[0];
          handleFileSelection(file);
        }}
      >
        {node.file ? (
          <>
            <div className="text-xs text-gray-400 flex items-center justify-between">
              <span>{node.file.name}</span>
              <span>{formatBytes(node.file.size)}</span>
            </div>
            <div className="flex-1 min-h-[240px] bg-gray-900/60 rounded-lg p-2 overflow-hidden">
              {getPreview(node)}
            </div>
            <div className="flex items-center gap-2 text-xs">
              <button
                className="px-3 py-1 rounded bg-gray-700 text-gray-200 hover:bg-gray-600"
                onClick={() => inputRef.current?.click()}
              >Trocar arquivo</button>
              <button
                className="px-3 py-1 rounded bg-red-500/80 text-white hover:bg-red-500"
                onClick={() => onFileChange(node.id, null)}
              >Remover</button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col gap-3 items-center justify-center text-sm text-gray-400">
            <p>Arraste um arquivo para cá ou clique abaixo:</p>
            <button
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm hover:bg-indigo-500"
              onClick={() => inputRef.current?.click()}
            >Selecionar arquivo</button>
            <p className="text-xs text-gray-500 text-center">Suporta imagens, PDFs, documentos, planilhas e mais.</p>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          onChange={(e) => handleFileSelection(e.target.files?.[0])}
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

export default FileNode;
