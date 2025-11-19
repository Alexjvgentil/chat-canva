import React, { useState, useRef, useCallback, useEffect } from 'react';
import { ChatNode } from './components/ChatNode';
import { GroupNode } from './components/GroupNode';
import { type Node, type Message, type Part, Role, NodeType, type Edge } from './types';
import { generateText } from './services/geminiService';
import { ZoomInIcon, ZoomOutIcon, LocateIcon } from './components/Icons';
import { Sidebar } from './components/Sidebar';

const NODE_WIDTH = 352; // 22rem
const NODE_DEFAULT_HEIGHT = 450;
const NODE_SPACING = 64; // 4rem

const App: React.FC = () => {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [transform, setTransform] = useState({ scale: 1, translateX: 0, translateY: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [draggingNode, setDraggingNode] = useState<{ id: string; offsetX: number; offsetY: number } | null>(null);
  const [resizingNode, setResizingNode] = useState<{ id: string; startX: number; startY: number; startWidth: number; startHeight: number } | null>(null);
  const [edgeCreation, setEdgeCreation] = useState<{ sourceNodeId: string; sourceHandle: string; sourcePos: { x: number; y: number }; currentPos: { x: number; y: number }; } | null>(null);
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const createInitialNode = (): Node => ({
    id: `node-${Date.now()}`,
    type: NodeType.CHAT,
    position: { x: 0, y: 0 },
    size: { width: NODE_WIDTH, height: NODE_DEFAULT_HEIGHT },
    messages: [{ role: Role.MODEL, parts: [{ text: 'Olá! Como posso te ajudar a explorar suas ideias hoje?' }] }],
    parentId: null,
    isLoading: false,
    isExecuted: true,
  });

  const centerCanvas = useCallback((nodeId?: string) => {
    if (!canvasRef.current) return;
    const { width, height } = canvasRef.current.getBoundingClientRect();
    let targetNode = nodes.find(n => n.id === nodeId);
    if (!targetNode && nodes.length > 0) {
      targetNode = nodes[nodes.length - 1];
    }

    if (targetNode) {
      const nodeWidth = targetNode.size?.width ?? NODE_WIDTH;
      const newTranslateX = width / 2 - (targetNode.position.x + nodeWidth / 2) * transform.scale;
      const newTranslateY = height / 2 - (targetNode.position.y) * transform.scale;
      setTransform(prev => ({ ...prev, translateX: newTranslateX, translateY: newTranslateY }));
    } else {
      setTransform(prev => ({ ...prev, translateX: width / 2 - (NODE_WIDTH / 2) * transform.scale, translateY: height / 4 }));
    }
  }, [nodes, transform.scale]);

  useEffect(() => {
    setNodes([createInitialNode()]);
  }, []);

  useEffect(() => {
    if (nodes.length === 1) {
      centerCanvas();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes.length]);

  const addNodeFromBranch = useCallback((parentId: string, sourceMessage: Message, type: 'chat' | 'image', parentMessageIndex: number) => {
    const parentNode = nodes.find(n => n.id === parentId);
    if (!parentNode) return;
  
    const childNodes = nodes.filter(n => n.parentId === parentId);
    const parentWidth = parentNode.size?.width ?? NODE_WIDTH;
    const newPosition = {
      x: parentNode.position.x + parentWidth + NODE_SPACING,
      y: parentNode.position.y + (childNodes.length * (NODE_SPACING)),
    };
  
    const newNodeType = type === 'image' ? NodeType.IMAGE : NodeType.CHAT;
    
    if (newNodeType === NodeType.CHAT) {
        const newNodeId = `node-${Date.now()}`;
        const newNode: Node = {
            id: newNodeId,
            type: NodeType.CHAT,
            position: newPosition,
            size: { width: NODE_WIDTH, height: NODE_DEFAULT_HEIGHT },
            messages: [sourceMessage], 
            parentId: parentId,
            parentMessageIndex: parentMessageIndex,
            isLoading: false,
            isExecuted: true,
        };

        const newEdge: Edge = {
            id: `edge-${Date.now()}`,
            source: parentId,
            sourceHandle: 'output',
            target: newNodeId,
            targetHandle: 'input',
        };

        setNodes(prev => [...prev, newNode]);
        setEdges(prev => [...prev, newEdge]);
        centerCanvas(newNode.id);
        return;
    }
    
    // Original behavior for non-chat nodes (e.g., Image node)
    const initialParts = sourceMessage.parts;

    const newNode: Node = {
      id: `node-${Date.now()}`,
      type: newNodeType,
      position: newPosition,
      size: { width: NODE_WIDTH, height: NODE_DEFAULT_HEIGHT },
      messages: [{ role: Role.MODEL, parts: initialParts }],
      parentId: parentId,
      parentMessageIndex: parentMessageIndex,
      isLoading: false,
      isExecuted: false,
    };
  
    setNodes(prev => [...prev, newNode]);
    centerCanvas(newNode.id);
  
  }, [nodes, centerCanvas]);
  
  const addNodeFromMenu = (type: NodeType) => {
    if (!canvasRef.current) return;
    const { width, height } = canvasRef.current.getBoundingClientRect();
    const nodeWidth = type === NodeType.GROUP ? 500 : NODE_WIDTH;
    const centerX = (width / 2 - transform.translateX) / transform.scale - nodeWidth / 2;
    const centerY = (height / 2 - transform.translateY) / transform.scale - 100;

    if (type === NodeType.GROUP) {
      const newNode: Node = {
        id: `node-${Date.now()}`,
        type: NodeType.GROUP,
        position: { x: centerX, y: centerY },
        size: { width: 500, height: 400 },
        parentId: null,
      };
      setNodes(prev => [...prev, newNode]);
      return;
    }

    let initialMessages: Message[] = [];
    if (type === NodeType.CHAT) {
        initialMessages = [{ role: Role.MODEL, parts: [{ text: "Comece uma nova conversa..." }] }];
    } else if (type === NodeType.IMAGE) {
        initialMessages = [{ role: Role.MODEL, parts: [{ text: "Envie uma imagem e faça uma pergunta sobre ela." }] }];
    } else if (type === NodeType.AGENT) {
        initialMessages = [{ role: Role.MODEL, parts: [{ text: "Configure e execute este agente." }] }];
    }

    const newNode: Node = {
        id: `node-${Date.now()}`,
        type: type,
        position: { x: centerX, y: centerY },
        size: { width: NODE_WIDTH, height: NODE_DEFAULT_HEIGHT },
        messages: initialMessages,
        parentId: null,
        isLoading: false,
        isExecuted: false,
        agentConfig: type === NodeType.AGENT ? { agentName: 'Novo Agente', dataSource: '', tools: [] } : undefined
    };
    setNodes(prev => [...prev, newNode]);
  }

  const handleDeleteNode = useCallback((nodeId: string) => {
    const confirmMessage = 'Tem certeza de que deseja excluir este nó? (Os filhos se tornarão nós independentes)';
    if (!window.confirm(confirmMessage)) {
        return;
    }

    setNodes(prevNodes => {
        // Filter out the node to be deleted
        const remainingNodes = prevNodes.filter(n => n.id !== nodeId);
        
        // Map over the remaining nodes to update any children of the deleted node
        return remainingNodes.map(n => {
            if (n.parentId === nodeId) {
                // This node was a child of the deleted node, promote it to a root node
                return {
                    ...n,
                    parentId: null,
                    parentMessageIndex: undefined,
                    isOutOfSync: false,
                };
            }
            return n;
        });
    });
    setEdges(prevEdges => prevEdges.filter(edge => edge.source !== nodeId && edge.target !== nodeId));
  }, []);

  const handleDeleteEdge = useCallback((edgeId: string) => {
    setEdges(prevEdges => prevEdges.filter(edge => edge.id !== edgeId));
  }, []);

  const handleResetCanvas = () => {
    setNodes([createInitialNode()]);
    setEdges([]);
    centerCanvas();
  }
  
  const handleRunNode = useCallback(async (nodeId: string, parts: Part[]) => {
      const node = nodes.find(n => n.id === nodeId);
      if (!node) return;

      setNodes(prev => prev.map(n => n.id === nodeId ? { 
          ...n, 
          isLoading: true, 
          isExecuted: true,
          messages: [{ role: Role.USER, parts }]
      } : n));

      const parentNode = nodes.find(n => n.id === node.parentId);
      const history = parentNode?.messages?.slice(0, node.parentMessageIndex! + 1) ?? [];
      await handleSendMessage(nodeId, parts, history, true);

  }, [nodes]);

  const handleUpdateAgentConfig = useCallback((nodeId: string, newConfig: Partial<Node['agentConfig']>) => {
    setNodes(prev => prev.map(n => {
        if (n.id === nodeId && n.type === NodeType.AGENT && n.agentConfig) {
            return { ...n, agentConfig: { ...n.agentConfig, ...newConfig } };
        }
        return n;
    }));
  }, []);

  const handleSendMessage = useCallback(async (nodeId: string, parts: Part[], history?: Message[], isInitialRun: boolean = false) => {
    const userMessage: Message = { role: Role.USER, parts };
    
    setNodes(prev => prev.map(n => {
        if (n.id === nodeId) {
            const currentMessages = n.messages ?? [];
            return {
                ...n,
                isLoading: true,
                messages: isInitialRun ? currentMessages : [...currentMessages, userMessage],
            };
        }
        return n;
    }));
    
    try {
      const responseText = await generateText(parts, history ?? []);
      const newMessage: Message = { role: Role.MODEL, parts: [{ text: responseText }] };
       setNodes(prev => prev.map(n => {
            if (n.id === nodeId) {
                const currentMessages = n.messages ?? [];
                const finalMessages = isInitialRun ? [...currentMessages, newMessage] : [...currentMessages, userMessage, newMessage];
                return { ...n, messages: finalMessages, isLoading: false };
            }
            return n;
        }));
    } catch (error) {
      console.error('Error generating text:', error);
      const errorMessage: Message = { role: Role.MODEL, parts: [{ text: 'Desculpe, ocorreu um erro. Por favor, tente novamente.' }] };
       setNodes(prev => prev.map(n => {
            if (n.id === nodeId) {
                const currentMessages = n.messages ?? [];
                 const finalMessages = isInitialRun ? [...currentMessages, errorMessage] : [...currentMessages, userMessage, errorMessage];
                return { ...n, messages: finalMessages, isLoading: false };
            }
            return n;
        }));
    }
  }, []);

  const handleEditMessage = async (nodeId: string, messageIndex: number, newParts: Part[]) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node || !node.messages) return;

    // 1. Truncate conversation at the point of edit
    const truncatedMessages = node.messages.slice(0, messageIndex);
    const updatedMessage = { ...node.messages[messageIndex], parts: newParts };
    const newMessages = [...truncatedMessages, updatedMessage];
    
    setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, messages: newMessages, isLoading: true } : n));
    
    // 2. Re-run generation
    try {
        const history = newMessages;
        const responseText = await generateText(newParts, history.slice(0, -1));
        const newModelMessage: Message = { role: Role.MODEL, parts: [{ text: responseText }] };

        // 3. Update node and check for out-of-sync children
        setNodes(prev => {
            return prev.map(currentNode => {
                if (currentNode.id === nodeId) {
                    return { ...currentNode, messages: [...newMessages, newModelMessage], isLoading: false };
                }
                // Mark children as out of sync
                if (currentNode.parentId === nodeId && currentNode.parentMessageIndex === messageIndex + 1) {
                    return { ...currentNode, isOutOfSync: true };
                }
                return currentNode;
            });
        });

    } catch (error) {
        console.error('Error re-generating text:', error);
        const errorMessage: Message = { role: Role.MODEL, parts: [{ text: 'Erro ao gerar nova resposta.' }] };
        setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, messages: [...newMessages, errorMessage], isLoading: false } : n));
    }
  };

  const handleSyncNode = (nodeId: string) => {
    setNodes(prev => {
        const nodeToSync = prev.find(n => n.id === nodeId);
        if (!nodeToSync || nodeToSync.parentId === null || nodeToSync.parentMessageIndex === undefined || !nodeToSync.messages) return prev;

        const parentNode = prev.find(n => n.id === nodeToSync.parentId);
        if (!parentNode || !parentNode.messages) return prev;

        const newSourceMessage = parentNode.messages[nodeToSync.parentMessageIndex];
        if (!newSourceMessage) return prev;
        
        return prev.map(n => {
            if (n.id === nodeId) {
                return {
                    ...n,
                    messages: [{ ...n.messages![0], parts: newSourceMessage.parts }],
                    isExecuted: false,
                    isOutOfSync: false,
                }
            }
            return n;
        });
    });
  };

  const handleNodeResizeStart = (e: React.MouseEvent, nodeId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const node = nodes.find(n => n.id === nodeId);
    if (!node || !node.size) return;

    setResizingNode({
        id: nodeId,
        startX: e.clientX,
        startY: e.clientY,
        startWidth: node.size.width,
        startHeight: node.size.height,
    });
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('.node-interactive')) return;
    e.preventDefault();
    setIsPanning(true);
    setPanStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
     if (edgeCreation) {
        setEdgeCreation(prev => {
            if (!prev) return null;
            return {
                ...prev,
                currentPos: {
                    x: (e.clientX - transform.translateX) / transform.scale,
                    y: (e.clientY - transform.translateY) / transform.scale,
                }
            }
        });
        return;
    }
    if (resizingNode) {
        const dx = (e.clientX - resizingNode.startX) / transform.scale;
        const dy = (e.clientY - resizingNode.startY) / transform.scale;
        const newWidth = Math.max(300, resizingNode.startWidth + dx);
        const newHeight = Math.max(200, resizingNode.startHeight + dy);

        setNodes(nodes.map(n => 
            n.id === resizingNode.id ? { ...n, size: { width: newWidth, height: newHeight } } : n
        ));
        return;
    }
    if (draggingNode) {
        const newX = (e.clientX - transform.translateX) / transform.scale - draggingNode.offsetX;
        const newY = (e.clientY - transform.translateY) / transform.scale - draggingNode.offsetY;
        setNodes(nodes.map(n => n.id === draggingNode.id ? { ...n, position: { x: newX, y: newY } } : n));
        return;
    }
    if (!isPanning) return;
    const dx = e.clientX - panStart.x;
    const dy = e.clientY - panStart.y;
    setTransform(prev => ({
      ...prev,
      translateX: prev.translateX + dx,
      translateY: prev.translateY + dy,
    }));
    setPanStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    if (edgeCreation) {
      setEdgeCreation(null);
    }
    setIsPanning(false);
    setDraggingNode(null);
    setResizingNode(null);
  };
  
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (!canvasRef.current || (e.target as HTMLElement).closest('.node-interactive')) return;
    e.preventDefault();
    const scaleAmount = 1.1;
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const newScale = e.deltaY > 0 ? transform.scale / scaleAmount : transform.scale * scaleAmount;
    
    const newTranslateX = mouseX - (mouseX - transform.translateX) * (newScale / transform.scale);
    const newTranslateY = mouseY - (mouseY - transform.translateY) * (newScale / transform.scale);

    setTransform({ scale: newScale, translateX: newTranslateX, translateY: newTranslateY });
  };

  const handleNodeDragStart = (e: React.MouseEvent, nodeId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    
    const offsetX = (e.clientX - transform.translateX) / transform.scale - node.position.x;
    const offsetY = (e.clientY - transform.translateY) / transform.scale - node.position.y;
    
    setDraggingNode({ id: nodeId, offsetX, offsetY });
  }

  const handleStartEdgeCreation = useCallback((e: React.MouseEvent, sourceNodeId: string, sourceHandle: string) => {
    e.preventDefault();
    e.stopPropagation();

    const sourceNode = nodes.find(n => n.id === sourceNodeId);
    if (!sourceNode) return;

    const sourcePos = getNodeAnchor(sourceNode, sourceHandle);
    
    const currentPos = {
        x: (e.clientX - transform.translateX) / transform.scale,
        y: (e.clientY - transform.translateY) / transform.scale,
    };

    setEdgeCreation({ sourceNodeId, sourceHandle, sourcePos, currentPos });
  }, [nodes, transform.scale, transform.translateX, transform.translateY]);

  const handleCompleteEdgeCreation = useCallback((targetNodeId: string, targetHandle: string) => {
      if (edgeCreation && edgeCreation.sourceNodeId !== targetNodeId && edgeCreation.sourceHandle !== targetHandle) {
          const edgeExists = edges.some(edge => 
              (edge.source === edgeCreation.sourceNodeId && edge.target === targetNodeId) ||
              (edge.source === targetNodeId && edge.target === edgeCreation.sourceNodeId)
          );

          if (!edgeExists) {
              const newEdge: Edge = {
                  id: `edge-${Date.now()}`,
                  source: edgeCreation.sourceNodeId,
                  sourceHandle: edgeCreation.sourceHandle,
                  target: targetNodeId,
                  targetHandle: targetHandle,
              };
              setEdges(prev => [...prev, newEdge]);
          }
      }
      setEdgeCreation(null);
  }, [edgeCreation, edges]);


  const zoom = (direction: 'in' | 'out') => {
    if (!canvasRef.current) return;
    const scaleAmount = 1.2;
    const rect = canvasRef.current.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const newScale = direction === 'out' ? transform.scale / scaleAmount : transform.scale * scaleAmount;
    
    const newTranslateX = centerX - (centerX - transform.translateX) * (newScale / transform.scale);
    const newTranslateY = centerY - (centerY - transform.translateY) * (newScale / transform.scale);

    setTransform({ scale: newScale, translateX: newTranslateX, translateY: newTranslateY });
  }
  
  const getNodeAnchor = (node: Node, handle: 'input' | 'output' | string): { x: number; y: number } => {
    const isGroup = node.type === NodeType.GROUP;
    const width = node.size?.width ?? (isGroup ? 0 : NODE_WIDTH);
    const height = node.size?.height ?? (isGroup ? 0 : 80);
    const yPos = node.position.y + (isGroup ? height / 2 : 40);

    if (handle === 'output') { // Right side
        return { x: node.position.x + width, y: yPos };
    }
    // 'input' or default, left side
    return { x: node.position.x, y: yPos };
  };

  const renderLines = () => {
    return nodes.map(node => {
        if (!node.parentId || node.type === NodeType.GROUP) return null;
        const parentNode = nodes.find(n => n.id === node.parentId);
        if (!parentNode) return null;
        
        // Hide the default parent line if a manual edge exists
        const hasManualEdge = edges.some(edge => 
            (edge.source === node.parentId && edge.target === node.id) || 
            (edge.source === node.id && edge.target === node.parentId)
        );
        if (hasManualEdge) return null;

        const parentWidth = parentNode.size?.width ?? NODE_WIDTH;
        const startX = parentNode.position.x + parentWidth;
        const startY = parentNode.position.y + 40;
        const endX = node.position.x;
        const endY = node.position.y + 40;
        
        const isOutOfSync = node.isOutOfSync;

        return (
            <path
              key={`line-${node.id}`}
              d={`M ${startX} ${startY} C ${startX + NODE_SPACING / 2} ${startY}, ${endX - NODE_SPACING / 2} ${endY}, ${endX} ${endY}`}
              stroke={isOutOfSync ? "#F59E0B" : "#4A5568"}
              strokeWidth="2"
              fill="none"
              strokeDasharray={isOutOfSync ? "4 4" : "none"}
              style={{ transition: 'stroke 0.3s, stroke-dasharray 0.3s' }}
            />
        );
    });
  };
  
  const renderEdges = () => {
    const edgePaths = edges.map(edge => {
        const sourceNode = nodes.find(n => n.id === edge.source);
        const targetNode = nodes.find(n => n.id === edge.target);
        if (!sourceNode || !targetNode) return null;

        const sourcePos = getNodeAnchor(sourceNode, edge.sourceHandle);
        const targetPos = getNodeAnchor(targetNode, edge.targetHandle);
        
        const isOutOfSync = targetNode.parentId === sourceNode.id && targetNode.isOutOfSync;
        const isHovered = hoveredEdgeId === edge.id;
        const strokeColor = isOutOfSync ? "#F59E0B" : isHovered ? "#A78BFA" : "#6B7280";
        const markerId = `url(#arrowhead-${isOutOfSync ? 'outofsync' : isHovered ? 'hover' : 'default'})`;

        const pathD = `M ${sourcePos.x} ${sourcePos.y} C ${sourcePos.x + 80} ${sourcePos.y}, ${targetPos.x - 80} ${targetPos.y}, ${targetPos.x} ${targetPos.y}`;

        const midX = 0.125 * sourcePos.x + 0.375 * (sourcePos.x + 80) + 0.375 * (targetPos.x - 80) + 0.125 * targetPos.x;
        const midY = 0.125 * sourcePos.y + 0.375 * sourcePos.y + 0.375 * targetPos.y + 0.125 * targetPos.y;

        return (
            <g key={edge.id} onMouseEnter={() => setHoveredEdgeId(edge.id)} onMouseLeave={() => setHoveredEdgeId(null)} style={{ cursor: 'pointer' }}>
                <path d={pathD} stroke="transparent" strokeWidth="20" fill="none" />
                <path 
                    d={pathD} 
                    stroke={strokeColor}
                    strokeWidth={isHovered ? 3 : 2} 
                    fill="none" 
                    markerEnd={markerId}
                    strokeDasharray={isOutOfSync ? "4 4" : "none"}
                    style={{ transition: 'stroke 0.2s, stroke-width 0.2s, stroke-dasharray 0.3s' }}
                />
                {isHovered && (
                    <g 
                        transform={`translate(${midX - 12}, ${midY - 12})`} 
                        onClick={(e) => { e.stopPropagation(); handleDeleteEdge(edge.id); }}
                    >
                        <rect width="24" height="24" rx="12" fill="#1F2937" stroke={strokeColor} strokeWidth="1" />
                        <path d="M 16 8 L 8 16 M 8 8 L 16 16" stroke="#9CA3AF" strokeWidth="1.5" />
                    </g>
                )}
            </g>
        );
    });
    
    if (edgeCreation) {
        const { sourcePos, currentPos } = edgeCreation;
         edgePaths.push(
             <path key="preview-edge" d={`M ${sourcePos.x} ${sourcePos.y} C ${sourcePos.x + 80} ${sourcePos.y}, ${currentPos.x - 80} ${currentPos.y}, ${currentPos.x} ${currentPos.y}`} stroke="#A78BFA" strokeWidth="2" fill="none" strokeDasharray="5 5" />
         );
    }
    return edgePaths;
  }
  
  const groupNodes = nodes.filter(n => n.type === NodeType.GROUP);
  const chatLikeNodes = nodes.filter(n => n.type !== NodeType.GROUP);

  return (
    <div
      ref={canvasRef}
      className="w-screen h-screen overflow-hidden cursor-grab active:cursor-grabbing bg-gray-900"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
    >
      <Sidebar onAddNode={addNodeFromMenu} onReset={handleResetCanvas} />
      <div className="absolute inset-0 bg-[radial-gradient(#374151_1px,transparent_1px)] [background-size:32px_32px]"></div>
      <div
        className="transform-gpu"
        style={{ transform: `translate(${transform.translateX}px, ${transform.translateY}px) scale(${transform.scale})`, transition: isPanning || draggingNode || resizingNode ? 'none' : 'transform 0.1s' }}
      >
        <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible' }}>
            <defs>
              <marker id="arrowhead-default" markerWidth="10" markerHeight="7" refX="8" refY="3.5" orient="auto" fill="#6B7280">
                <polygon points="0 0, 10 3.5, 0 7" />
              </marker>
              <marker id="arrowhead-outofsync" markerWidth="10" markerHeight="7" refX="8" refY="3.5" orient="auto" fill="#F59E0B">
                <polygon points="0 0, 10 3.5, 0 7" />
              </marker>
              <marker id="arrowhead-hover" markerWidth="10" markerHeight="7" refX="8" refY="3.5" orient="auto" fill="#A78BFA">
                <polygon points="0 0, 10 3.5, 0 7" />
              </marker>
            </defs>
            {renderLines()}
            {renderEdges()}
        </svg>

        {groupNodes.map(node => (
            <GroupNode
                key={node.id}
                node={node}
                onDragStart={handleNodeDragStart}
                onResizeStart={handleNodeResizeStart}
                onDelete={handleDeleteNode}
                onStartEdgeCreation={handleStartEdgeCreation}
                onCompleteEdgeCreation={handleCompleteEdgeCreation}
            />
        ))}

        {chatLikeNodes.map(node => (
          <div
            key={node.id}
            className="absolute flex"
            style={{
              left: `${node.position.x}px`,
              top: `${node.position.y}px`,
              width: `${node.size?.width ?? NODE_WIDTH}px`,
              height: `${node.size?.height ?? NODE_DEFAULT_HEIGHT}px`,
            }}
          >
            <ChatNode
              node={node}
              onSendMessage={(parts, history) => handleSendMessage(node.id, parts, history)}
              onBranch={addNodeFromBranch}
              onRun={handleRunNode}
              onDragStart={handleNodeDragStart}
              onEditMessage={handleEditMessage}
              onSync={handleSyncNode}
              onDelete={handleDeleteNode}
              onUpdateAgentConfig={(config) => handleUpdateAgentConfig(node.id, config)}
              onStartEdgeCreation={handleStartEdgeCreation}
              onCompleteEdgeCreation={handleCompleteEdgeCreation}
              onResizeStart={handleNodeResizeStart}
            />
          </div>
        ))}
      </div>
      <div className="absolute bottom-4 right-4 flex flex-col gap-2 p-2 bg-gray-800/50 backdrop-blur-sm rounded-lg">
        <button onClick={() => zoom('in')} className="p-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-md transition-colors"><ZoomInIcon/></button>
        <button onClick={() => zoom('out')} className="p-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-md transition-colors"><ZoomOutIcon/></button>
        <button onClick={() => centerCanvas()} className="p-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-md transition-colors"><LocateIcon/></button>
      </div>
       <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 text-sm text-gray-400">
            <span>Gemini Infinite Canvas</span>
        </div>
    </div>
  );
};

export default App;