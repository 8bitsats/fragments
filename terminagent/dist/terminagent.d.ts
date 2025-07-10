export interface TerminAgentConfig {
    apiKey: string;
    openaiApiKey?: string;
    model: string;
    enableVoice?: boolean;
    enableSearch?: boolean;
    enableComputerUse?: boolean;
    enableSolanaTrading?: boolean;
    workingDirectory: string;
    port?: number;
}
export interface AgentCapabilities {
    webSearch: boolean;
    fileSearch: boolean;
    codeExecution: boolean;
    codeEditing: boolean;
    imageGeneration: boolean;
    computerUse: boolean;
    solanaTrading: boolean;
    mcpServers: boolean;
}
export interface ModelProvider {
    name: 'google' | 'openai';
    model: string;
    capabilities: AgentCapabilities;
}
export declare class TerminAgent {
    private config;
    private googleAI;
    private openAI?;
    private currentProvider;
    private app;
    private server;
    private isRunning;
    private animationFrames;
    private currentFrame;
    constructor(config: TerminAgentConfig);
    private initializeAnimations;
    private setupServer;
    private setupRoutes;
    initialize(): Promise<void>;
    private testConnections;
    start(): Promise<void>;
    private startAnimation;
    private startInteractiveMode;
    private displayStatus;
    switchProvider(provider: 'google' | 'openai', model: string): Promise<void>;
    private getProviderCapabilities;
    processMessage(message: string, context?: any): Promise<{
        content: string;
        provider: string;
        model: string;
    }>;
    private processWithGoogle;
    private processWithOpenAI;
    executeCode(code: string, language: string): Promise<any>;
    handleFileOperation(operation: string, filePath: string, content?: string): Promise<any>;
    performWebSearch(query: string): Promise<any>;
    generateImageWithBlurEffect(prompt: string, provider?: string): Promise<any>;
    performComputerAction(action: string, params: any): Promise<any>;
    performSolanaOperation(action: string, params: any): Promise<any>;
    private takeScreenshot;
    private performClick;
    private typeText;
    private scroll;
    private openApplication;
    private getSolanaBalance;
    private sendSolanaTransaction;
    private getTokenPrice;
    private swapTokens;
    stop(): void;
}
//# sourceMappingURL=terminagent.d.ts.map