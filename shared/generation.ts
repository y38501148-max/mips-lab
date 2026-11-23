export type ReasoningMode='auto'|'deepseek'|'openai'|'off'
export type ReasoningEffort='default'|'low'|'medium'|'high'|'max'
export interface GenerationPlan {generator:string;reference:string;checker:string;validator:string;notes?:string}
export interface CompletionMetadata {model:string;protocol:string;reasoningEffort:string;thinkingRequested:boolean;reasoningObserved:boolean;reasoningTokens?:number;outputTokens?:number;finishReason?:string;duration:number}
export interface GenerationDiagnostic {stage:string;message:string;input?:string;referenceOutput?:string;checkerOutput?:string;expectedOutput?:string;actualCount?:number;expectedCount?:number;rawOutput?:string;script?:string}
export interface GenerationAttempt {number:number;state:'running'|'failed'|'done';completion?:CompletionMetadata;diagnostic?:GenerationDiagnostic;plan?:GenerationPlan}
