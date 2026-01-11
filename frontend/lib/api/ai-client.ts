/**
 * AI API Client
 * Frontend client for AI chatbox API
 */

import { apiClient, handleAPIError } from './client';

// Types
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface ChatResponse {
  success: boolean;
  data: {
    message: string;
    toolCalls?: ToolCall[];
  };
  error?: string;
}

export interface ToolResult {
  toolCallId: string;
  name: string;
  result: unknown;
  isError?: boolean;
}

export interface ChatContext {
  userAddress?: string;
  chainId?: number;
}

/**
 * AI API client functions
 */
export const aiClient = {
  /**
   * Send a chat message and get AI response
   */
  async chat(
    messages: ChatMessage[],
    context?: ChatContext
  ): Promise<ChatResponse> {
    const response = await apiClient.post<ChatResponse>('/api/ai/chat', {
      messages,
      context,
    });
    return response.data;
  },

  /**
   * Continue chat after tool execution
   */
  async continueChat(
    messages: ChatMessage[],
    toolResults: ToolResult[],
    context?: ChatContext
  ): Promise<ChatResponse> {
    const response = await apiClient.post<ChatResponse>('/api/ai/chat/continue', {
      messages,
      toolResults,
      context,
    });
    return response.data;
  },

  /**
   * Check AI service health
   */
  async checkHealth(): Promise<{ status: string; hasApiKey: boolean }> {
    const response = await apiClient.get('/api/ai/health');
    return response.data.data;
  },
};

/**
 * Handle AI API errors
 */
export function handleAIError(error: unknown): string {
  return handleAPIError(error);
}
