export enum Role {
    USER = 'user',
    MODEL = 'model',
}

export enum NodeType {
    CHAT = 'chat',
    IMAGE = 'image',
    AGENT = 'agent',
    GROUP = 'group',
    FILE = 'file',
    WEB = 'web',
}

export interface FileData {
    name: string;
    mimeType: string;
    size: number;
    data: string; // base64
}

export interface Part {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string; // base64 string
    fileName?: string;
  };
}


export interface Message {
    role: Role;
    parts: Part[];
}

export interface Node {
    id: string;
    type: NodeType;
    position: { x: number; y: number };
    size?: { width: number; height: number };
    title?: string;
    messages?: Message[];
    parentId: string | null;
    parentMessageIndex?: number;
    isOutOfSync?: boolean;
    isLoading?: boolean;
    isExecuted?: boolean;
    agentConfig?: {
        agentName: string;
        dataSource: string;
        tools: string[];
    };
    file?: FileData;
    web?: {
        url: string;
    };
}

export interface Edge {
    id: string;
    source: string;
    sourceHandle: string;
    target: string;
    targetHandle: string;
}
