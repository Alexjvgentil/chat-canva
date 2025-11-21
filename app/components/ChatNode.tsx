import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { type Node, type Message, Role, NodeType, type Part } from '../types';
import { SparklesIcon, ImageIcon, SendIcon, PlayIcon, MoveIcon, EditIcon, SyncIcon, BotIcon, TrashIcon, PlusIcon } from './Icons';

interface ChatNodeProps {
  node: Node;
  onSendMessage: (parts: Part[], history: Message[] | undefined) => void;
  onBranch: (parentId: string, sourceMessage: Message, type: 'chat' | 'image', messageIndex: number) => void;
  onRun: (nodeId: string, parts: Part[]) => void;
  onDragStart: (e: React.MouseEvent, nodeId: string) => void;
  onEditMessage: (nodeId: string, messageIndex: number, newParts: Part[]) => void;
  onSync: (nodeId: string) => void;
  onDelete: (nodeId: string) => void;
  onUpdateAgentConfig: (config: Partial<Node['agentConfig']>) => void;
  onStartEdgeCreation: (e: React.MouseEvent, nodeId: string, handle: string) => void;
  onCompleteEdgeCreation: (nodeId: string, handle: string) => void;
  onResizeStart: (e: React.MouseEvent, nodeId: string) => void;
  onRename: (nodeId: string, title: string) => void;
}

const escapeHtml = (text: string) =>
    text.replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

const formatInlineMarkdown = (value: string) => {
    let text = escapeHtml(value);
    text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/__(.+?)__/g, '<strong>$1</strong>');
    text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
    text = text.replace(/_(.+?)_/g, '<em>$1</em>');
    text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
    return text;
};

const markdownToHtml = (raw: string) => {
    const lines = raw.split(/\r?\n/);
    let html = '';
    let inList = false;
    let inCode = false;
    const codeBuffer: string[] = [];

    const flushList = () => {
        if (inList) {
            html += '</ul>';
            inList = false;
        }
    };

    const flushCode = () => {
        if (inCode) {
            html += `<pre class="bg-gray-800/80 text-gray-100 rounded-lg p-3 text-xs overflow-auto"><code>${escapeHtml(codeBuffer.join('\n'))}</code></pre>`;
            codeBuffer.length = 0;
            inCode = false;
        }
    };

    lines.forEach((line) => {
        const trimmed = line.trim();

        if (trimmed.startsWith('```')) {
            if (inCode) {
                flushCode();
            } else {
                flushList();
                inCode = true;
            }
            return;
        }

        if (inCode) {
            codeBuffer.push(line);
            return;
        }

        if (/^[-*]\s+/.test(trimmed)) {
            if (!inList) {
                flushCode();
                html += '<ul class="list-disc pl-5 space-y-1">';
                inList = true;
            }
            const content = trimmed.replace(/^[-*]\s+/, '');
            html += `<li>${formatInlineMarkdown(content)}</li>`;
            return;
        }

        flushList();

        if (/^#{1,6}\s/.test(trimmed)) {
            const level = trimmed.match(/^#+/)[0].length;
            const content = trimmed.replace(/^#{1,6}\s*/, '');
            html += `<h${level} class="text-gray-100 font-semibold mt-2">${formatInlineMarkdown(content)}</h${level}>`;
            return;
        }

        if (trimmed === '') {
            html += '<p class="h-2"></p>';
            return;
        }

        html += `<p>${formatInlineMarkdown(trimmed)}</p>`;
    });

    flushList();
    flushCode();
    return html;
};

const MarkdownContent: React.FC<{ text: string }> = ({ text }) => {
    const html = useMemo(() => markdownToHtml(text), [text]);
    return (
        <div
            className="markdown-content prose prose-invert max-w-none text-sm text-gray-50 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: html }}
        />
    );
};

const MessageBubble: React.FC<{ 
    message: Message, 
    messageIndex: number,
    onBranch: (sourceMessage: Message, type: 'chat' | 'image') => void,
    onEditStart: () => void
}> = ({ message, messageIndex, onBranch, onEditStart }) => {
    const isUser = message.role === Role.USER;
    const hasImage = message.parts.some(p => p.inlineData);

    return (
        <div className={`group relative flex flex-col mb-4 ${isUser ? 'items-end' : 'items-start'}`}>
            <div className={`max-w-[90%] p-3 rounded-2xl ${isUser ? 'bg-indigo-600 rounded-br-md' : 'bg-gray-700 rounded-bl-md'}`}>
                <div className="flex flex-col gap-2">
                {message.parts.map((part, index) => {
                    if (part.inlineData) {
                        return <img key={index} src={`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`} alt="content" className="rounded-lg max-w-full h-auto" />
                    }
                    if(part.text) {
                        if (!isUser) {
                            return <MarkdownContent key={index} text={part.text} />
                        }
                        return <p key={index} className="text-sm text-gray-50 whitespace-pre-wrap">{part.text}</p>
                    }
                    return null;
                })}
                </div>
            </div>
            <div className="absolute bottom-[-16px] flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" style={{[isUser ? 'right' : 'left']: 0}}>
                {!isUser && !hasImage && (
                    <>
                        <button onClick={() => onBranch(message, 'chat')} className="p-1 bg-gray-600 hover:bg-gray-500 rounded-full text-gray-200" title="Branch Chat">
                           <SparklesIcon className="w-4 h-4" />
                        </button>
                        <button onClick={() => onBranch(message, 'image')} className="p-1 bg-gray-600 hover:bg-gray-500 rounded-full text-gray-200" title="Generate Image from Text">
                           <ImageIcon className="w-4 h-4" />
                        </button>
                    </>
                )}
                 {isUser && (
                     <button onClick={onEditStart} className="p-1 bg-gray-600 hover:bg-gray-500 rounded-full text-gray-200" title="Edit Message">
                       <EditIcon className="w-4 h-4" />
                    </button>
                 )}
            </div>
        </div>
    );
};


const NodeHeader: React.FC<{ onDragStart: (e: React.MouseEvent) => void; node: Node; onSync: () => void; onDelete: () => void; }> = ({ onDragStart, node, onSync, onDelete }) => {
    const ICONS: Record<NodeType, React.ReactNode> = {
        [NodeType.CHAT]: <SparklesIcon className="w-4 h-4 text-gray-500"/>,
        [NodeType.IMAGE]: <ImageIcon className="w-4 h-4 text-gray-500"/>,
        [NodeType.AGENT]: <BotIcon className="w-4 h-4 text-gray-500"/>,
        [NodeType.GROUP]: <div/>,
    };

    const TITLES: Record<NodeType, string> = {
        [NodeType.CHAT]: "Novo Chat",
        [NodeType.IMAGE]: "Análise de Imagem",
        [NodeType.AGENT]: "Novo Agente",
        [NodeType.GROUP]: "",
    };

    const CenterContent = () => {
        if (node.type === NodeType.AGENT && node.agentConfig?.agentName) {
            return <span className="font-semibold">{node.agentConfig.agentName}</span>
        }
        if (node.isExecuted === false) {
            return <span className="font-semibold">{TITLES[node.type]}</span>
        }
        return ICONS[node.type];
    }

    return (
        <div onMouseDown={onDragStart} className="group flex items-center justify-between p-2 text-center text-xs text-gray-400 cursor-move bg-gray-900/30 rounded-t-2xl">
            {node.isOutOfSync ? (
                <button onClick={onSync} className="flex items-center gap-1 text-amber-400 hover:text-amber-300" title="Fonte atualizada. Clique para sincronizar.">
                    <SyncIcon className="w-4 h-4"/>
                    <span>Sync</span>
                </button>
            ) : <div className="w-12"/>}
            <CenterContent />
            <div className="w-12 flex justify-end">
                 <button 
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete();
                    }}
                    className="p-1 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                    title="Delete Node"
                >
                    <TrashIcon className="w-4 h-4" />
                </button>
            </div>
        </div>
    )
};

const getDefaultNodeTitle = (node: Node) => {
    if (node.title?.trim()) return node.title.trim();
    if (node.type === NodeType.AGENT && node.agentConfig?.agentName) {
        return node.agentConfig.agentName;
    }
    switch (node.type) {
        case NodeType.CHAT:
            return 'Chat Node';
        case NodeType.IMAGE:
            return 'Image Node';
        case NodeType.AGENT:
            return 'Agent Node';
        case NodeType.GROUP:
            return 'Group';
        default:
            return 'Node';
    }
};

const UnexecutedNode: React.FC<{ node: Node, onRun: (parts: Part[]) => void, onUpdateAgentConfig: (config: Partial<Node['agentConfig']>) => void }> = ({ node, onRun, onUpdateAgentConfig }) => {
    const [prompt, setPrompt] = useState(node.messages?.[0]?.parts[0]?.text || '');
    const [image, setImage] = useState<{file: File, base64: string, mimeType: string} | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const base64 = (event.target?.result as string).split(',')[1];
                setImage({ file, base64, mimeType: file.type });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRun = () => {
        const parts: Part[] = [];
        if (image) {
            parts.push({ inlineData: { mimeType: image.mimeType, data: image.base64 } });
        }
        if (prompt.trim()) {
            parts.push({ text: prompt });
        }
        if (parts.length > 0 && !node.isLoading) {
            onRun(parts);
        }
    }

    const isRunDisabled = node.isLoading || !prompt.trim() || (node.type === NodeType.IMAGE && !image);

    return (
        <>
            <div className="p-4 flex-1">
                {node.type === NodeType.IMAGE && (
                     <div className="mb-4">
                        <label className="block text-xs text-gray-400 mb-2">Arquivo de Imagem</label>
                         <input type="file" accept="image/*" onChange={handleFileChange} className="w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"/>
                         {image && <img src={`data:${image.mimeType};base64,${image.base64}`} alt="preview" className="mt-4 rounded-lg max-w-full h-auto" />}
                     </div>
                )}
                {node.type === NodeType.AGENT && (
                    <div className="mb-4 space-y-3">
                         <div>
                            <label className="block text-xs text-gray-400 mb-1">Nome Agente</label>
                            <input 
                                type="text" 
                                placeholder="Nome do Agente" 
                                value={node.agentConfig?.agentName || ''}
                                onChange={(e) => onUpdateAgentConfig({ agentName: e.target.value })}
                                className="w-full bg-gray-700 text-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
                         </div>
                         <div>
                            <label className="block text-xs text-gray-400 mb-1">Fonte de Dados</label>
                            <input type="text" placeholder="Ex: URL, ID do documento" className="w-full bg-gray-700 text-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
                         </div>
                         <div>
                            <label className="block text-xs text-gray-400 mb-1">Tools</label>
                            <input type="text" placeholder="Ex: search, calculator" className="w-full bg-gray-700 text-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
                         </div>
                    </div>
                )}

                <textarea 
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    className="w-full h-24 bg-gray-700 text-gray-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition resize-none"
                    placeholder={
                        node.type === NodeType.IMAGE ? 'Faça uma pergunta sobre a imagem...' : 
                        node.type === NodeType.AGENT ? 'Defina o objetivo do agente...' :
                        'Comece uma nova conversa...'
                    }
                    disabled={node.isLoading}
                />
            </div>
            <div className="p-3 border-t border-gray-700/50 flex justify-end">
                <button
                  onClick={handleRun}
                  disabled={isRunDisabled}
                  className="p-2 bg-indigo-600 rounded-lg text-white disabled:bg-gray-600 disabled:cursor-not-allowed hover:bg-indigo-500 transition-colors flex items-center gap-2"
                >
                 <PlayIcon className="w-4 h-4" />
                 <span>Executar</span>
                </button>
            </div>
        </>
    )
}

export const ChatNode: React.FC<ChatNodeProps> = ({ node, onSendMessage, onBranch, onRun, onDragStart, onEditMessage, onSync, onDelete, onUpdateAgentConfig, onStartEdgeCreation, onCompleteEdgeCreation, onResizeStart, onRename }) => {
  const [input, setInput] = useState('');
  const [editingMessage, setEditingMessage] = useState<{index: number; parts: Part[]} | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [nameDraft, setNameDraft] = useState(getDefaultNodeTitle(node));

  useEffect(() => {
    setNameDraft(getDefaultNodeTitle(node));
  }, [node.title, node.type, node.agentConfig?.agentName]);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [node.messages, node.isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !node.isLoading) {
      const history = node.messages;
      onSendMessage([{ text: input }], history);
      setInput('');
    }
  };
  
  const handleSaveEdit = () => {
      if (editingMessage && editingMessage.parts.some(p => p.text?.trim())) {
          onEditMessage(node.id, editingMessage.index, editingMessage.parts);
          setEditingMessage(null);
      }
  };
  
  const nodeClass = node.isExecuted
    ? "bg-gray-800/80 border-gray-700/50"
    : "bg-gray-800/80 border-dashed border-indigo-500/50";

  return (
    <div 
        onWheel={e => e.stopPropagation()}
        onMouseUpCapture={() => onCompleteEdgeCreation(node.id, 'input')}
        className={`node-interactive group relative w-full h-full flex flex-col backdrop-blur-md rounded-2xl shadow-2xl border cursor-auto ${nodeClass}`}
    >
        {/* Input Handle */}
        <div 
            onMouseUp={(e) => {
                e.stopPropagation();
                onCompleteEdgeCreation(node.id, 'input');
            }}
            title="Input"
            className="node-interactive absolute top-1/2 -translate-y-1/2 -left-6 w-8 h-12 flex items-center justify-center cursor-pointer"
        >
            <div className="w-4 h-4 bg-gray-600 hover:bg-indigo-500 rounded-full cursor-pointer border-2 border-gray-800 transition-colors opacity-50 group-hover:opacity-100" />
        </div>

        {/* Output Handle */}
        <div 
            onMouseDown={(e) => onStartEdgeCreation(e, node.id, 'output')}
            title="Output"
            className="node-interactive absolute top-1/2 -translate-y-1/2 -right-6 w-8 h-12 flex items-center justify-center cursor-pointer"
        >
            <div className="w-4 h-4 bg-indigo-600 hover:bg-indigo-500 rounded-full cursor-pointer border-2 border-gray-800 transition-colors opacity-50 group-hover:opacity-100" />
        </div>
        
        <NodeHeader onDragStart={(e) => onDragStart(e, node.id)} node={node} onSync={() => onSync(node.id)} onDelete={() => onDelete(node.id)} />
        <div className="px-4 pt-2">
            <label className="block text-[11px] uppercase tracking-wide text-gray-500 mb-1">Nome do nó</label>
            <input
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                onBlur={() => {
                    const trimmed = nameDraft.trim();
                    if (!trimmed) {
                        setNameDraft(getDefaultNodeTitle(node));
                        return;
                    }
                    if (!node.title || trimmed !== node.title) {
                        onRename(node.id, trimmed);
                    }
                }}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        (e.target as HTMLInputElement).blur();
                    } else if (e.key === 'Escape') {
                        setNameDraft(getDefaultNodeTitle(node));
                        (e.target as HTMLInputElement).blur();
                    }
                }}
                className="w-full bg-gray-800 text-gray-100 rounded-lg px-3 py-1.5 text-sm border border-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
        </div>
        
        {node.isExecuted === false ? (
            <UnexecutedNode node={node} onRun={(parts) => onRun(node.id, parts)} onUpdateAgentConfig={onUpdateAgentConfig} />
        ) : (
            <>
                <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
                {node.messages?.map((msg, index) => {
                    if (editingMessage && editingMessage.index === index) {
                        return (
                            <div key={index} className="flex flex-col items-end mb-4">
                                <textarea 
                                        value={editingMessage.parts.find(p => p.text)?.text || ''}
                                        onChange={(e) => setEditingMessage({ ...editingMessage, parts: [{ text: e.target.value }] })}
                                        className="w-full bg-indigo-700 text-gray-50 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 transition resize-y"
                                        rows={3}
                                        autoFocus
                                />
                                <div className="flex gap-2 mt-2">
                                    <button onClick={() => setEditingMessage(null)} className="text-xs px-2 py-1 rounded bg-gray-600 hover:bg-gray-500">Cancelar</button>
                                    <button onClick={handleSaveEdit} className="text-xs px-2 py-1 rounded bg-indigo-500 hover:bg-indigo-400">Salvar</button>
                                </div>
                            </div>
                        )
                    }
                    return (
                            <MessageBubble 
                                key={index} 
                                message={msg}
                                messageIndex={index}
                                onBranch={(sourceMsg, type) => onBranch(node.id, sourceMsg, type, index)}
                                onEditStart={() => setEditingMessage({index, parts: msg.parts})}
                            />
                    )
                    })}
                {node.isLoading && (
                    <div className="flex items-start mb-4">
                        <div className="p-3 rounded-2xl bg-gray-700 rounded-bl-md">
                            <div className="flex items-center gap-2 text-sm text-gray-400">
                                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse"></div>
                                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse [animation-delay:0.2s]"></div>
                                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse [animation-delay:0.4s]"></div>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
                </div>
                <div className="p-3 border-t border-gray-700/50">
                    <form onSubmit={handleSubmit} className="flex items-center gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Digite sua mensagem..."
                        className="flex-1 bg-gray-700 text-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                        disabled={node.isLoading || !!editingMessage}
                    />
                    <button
                        type="submit"
                        disabled={node.isLoading || !input.trim() || !!editingMessage}
                        className="p-2 bg-indigo-600 rounded-lg text-white disabled:bg-gray-600 disabled:cursor-not-allowed hover:bg-indigo-500 transition-colors"
                    >
                    <SendIcon/>
                    </button>
                    </form>
                </div>
            </>
        )}
        <div
            onMouseDown={(e) => {
                e.stopPropagation();
                onResizeStart(e, node.id);
            }}
            className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize opacity-0 group-hover:opacity-100 transition-opacity bg-gray-600/50 hover:bg-gray-500 rounded-br-2xl z-10"
            style={{ transform: 'translate(2px, 2px)'}}
        />
    </div>
  );
};
