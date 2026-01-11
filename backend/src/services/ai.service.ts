/**
 * AI Service for MantlePulse Chatbox
 * Handles OpenAI API integration with function calling
 */

import OpenAI from 'openai';
import { AI_CONFIG, SYSTEM_PROMPT, AI_TOOLS } from '../config/ai.config';
import { logger } from '../utils/logger';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Types for AI chat
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface AIResponse {
  message: string;
  toolCalls?: ToolCall[];
  toolResults?: Array<{
    name: string;
    result: unknown;
  }>;
}

export interface ChatContext {
  userAddress?: string;
  chainId?: number;
}

/**
 * AI Service class for handling chat interactions
 */
export class AIService {
  /**
   * Process a chat message and return AI response
   */
  async chat(
    messages: ChatMessage[],
    context: ChatContext = {}
  ): Promise<AIResponse> {
    try {
      // Build system prompt with context
      let systemPrompt = SYSTEM_PROMPT;
      if (context.userAddress) {
        systemPrompt += `\n\nUser's connected wallet address: ${context.userAddress}`;
      }
      if (context.chainId) {
        systemPrompt += `\nCurrent chain ID: ${context.chainId}`;
      }

      // Convert messages to OpenAI format
      const openaiMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        { role: 'system', content: systemPrompt },
        ...messages.map((msg) => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        })),
      ];

      // Call OpenAI API with tools
      const response = await openai.chat.completions.create({
        model: AI_CONFIG.model,
        max_tokens: AI_CONFIG.maxTokens,
        temperature: AI_CONFIG.temperature,
        messages: openaiMessages,
        tools: AI_TOOLS,
      });

      const choice = response.choices[0];
      const message = choice.message;

      // Extract text content
      const textContent = message.content || '';

      // Extract tool calls
      const toolCalls: ToolCall[] = [];
      if (message.tool_calls) {
        for (const toolCall of message.tool_calls) {
          if (toolCall.type === 'function') {
            toolCalls.push({
              id: toolCall.id,
              name: toolCall.function.name,
              input: JSON.parse(toolCall.function.arguments || '{}'),
            });
          }
        }
      }

      logger.info('AI response generated', {
        hasMessage: !!textContent,
        toolCallCount: toolCalls.length,
        finishReason: choice.finish_reason,
      });

      return {
        message: textContent,
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      };
    } catch (error) {
      logger.error('AI chat error', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  /**
   * Continue conversation after tool execution
   * This is called when the frontend executes a tool and wants the AI to respond to the result
   */
  async continueWithToolResults(
    messages: ChatMessage[],
    toolResults: Array<{
      toolCallId: string;
      name: string;
      result: unknown;
      isError?: boolean;
    }>,
    context: ChatContext = {}
  ): Promise<AIResponse> {
    try {
      // Build system prompt with context
      let systemPrompt = SYSTEM_PROMPT;
      if (context.userAddress) {
        systemPrompt += `\n\nUser's connected wallet address: ${context.userAddress}`;
      }
      if (context.chainId) {
        systemPrompt += `\nCurrent chain ID: ${context.chainId}`;
      }

      // Build the conversation with tool results
      const openaiMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        { role: 'system', content: systemPrompt },
      ];

      // Add previous messages
      for (const msg of messages) {
        openaiMessages.push({
          role: msg.role,
          content: msg.content,
        });
      }

      // Add tool results
      for (const tr of toolResults) {
        openaiMessages.push({
          role: 'tool',
          tool_call_id: tr.toolCallId,
          content: typeof tr.result === 'string' ? tr.result : JSON.stringify(tr.result),
        });
      }

      // Call OpenAI API
      const response = await openai.chat.completions.create({
        model: AI_CONFIG.model,
        max_tokens: AI_CONFIG.maxTokens,
        temperature: AI_CONFIG.temperature,
        messages: openaiMessages,
        tools: AI_TOOLS,
      });

      const choice = response.choices[0];
      const message = choice.message;

      // Extract text content
      const textContent = message.content || '';

      // Extract tool calls
      const toolCalls: ToolCall[] = [];
      if (message.tool_calls) {
        for (const toolCall of message.tool_calls) {
          if (toolCall.type === 'function') {
            toolCalls.push({
              id: toolCall.id,
              name: toolCall.function.name,
              input: JSON.parse(toolCall.function.arguments || '{}'),
            });
          }
        }
      }

      logger.info('AI continued after tool results', {
        hasMessage: !!textContent,
        toolCallCount: toolCalls.length,
        finishReason: choice.finish_reason,
      });

      return {
        message: textContent,
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      };
    } catch (error) {
      logger.error('AI continue error', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  /**
   * Get a simple response without tools (for quick queries)
   */
  async simpleChat(prompt: string, context: ChatContext = {}): Promise<string> {
    try {
      let systemPrompt = SYSTEM_PROMPT;
      if (context.userAddress) {
        systemPrompt += `\n\nUser's connected wallet address: ${context.userAddress}`;
      }

      const response = await openai.chat.completions.create({
        model: AI_CONFIG.model,
        max_tokens: AI_CONFIG.maxTokens,
        temperature: AI_CONFIG.temperature,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
      });

      return response.choices[0].message.content || '';
    } catch (error) {
      logger.error('AI simple chat error', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}

// Export singleton instance
export const aiService = new AIService();
