/**
 * AI Routes for MantlePulse Chatbox
 * POST /api/ai/chat - Main chat endpoint
 * POST /api/ai/chat/continue - Continue after tool execution
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { aiService, ChatMessage, ChatContext } from '../services/ai.service';
import { logger } from '../utils/logger';
import { apiLimiter } from '../middleware/rate-limit';

const router = Router();

// Validation schemas
const chatMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1).max(10000),
});

const chatRequestSchema = z.object({
  messages: z.array(chatMessageSchema).min(1).max(50),
  context: z.object({
    userAddress: z.string().optional(),
    chainId: z.number().optional(),
  }).optional(),
});

const toolResultSchema = z.object({
  toolCallId: z.string(),
  name: z.string(),
  result: z.unknown(),
  isError: z.boolean().optional(),
});

const continueRequestSchema = z.object({
  messages: z.array(chatMessageSchema).min(1).max(50),
  toolResults: z.array(toolResultSchema).min(1).max(10),
  context: z.object({
    userAddress: z.string().optional(),
    chainId: z.number().optional(),
  }).optional(),
});

/**
 * POST /api/ai/chat
 * Main chat endpoint - sends messages to Claude and returns response with potential tool calls
 */
router.post('/chat', apiLimiter, async (req: Request, res: Response) => {
  try {
    // Validate request
    const data = chatRequestSchema.parse(req.body);

    logger.info('AI chat request', {
      messageCount: data.messages.length,
      hasContext: !!data.context,
      userAddress: data.context?.userAddress?.slice(0, 10),
    });

    // Call AI service
    const response = await aiService.chat(
      data.messages as ChatMessage[],
      data.context as ChatContext
    );

    res.json({
      success: true,
      data: {
        message: response.message,
        toolCalls: response.toolCalls,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn('AI chat validation error', { errors: error.issues });
      return res.status(400).json({
        success: false,
        error: 'Invalid request',
        details: error.issues,
      });
    }

    logger.error('AI chat error', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    res.status(500).json({
      success: false,
      error: 'Failed to process chat request',
    });
  }
});

/**
 * POST /api/ai/chat/continue
 * Continue conversation after tool execution
 * Frontend executes tool, sends result back, AI responds
 */
router.post('/chat/continue', apiLimiter, async (req: Request, res: Response) => {
  try {
    // Validate request
    const data = continueRequestSchema.parse(req.body);

    logger.info('AI chat continue request', {
      messageCount: data.messages.length,
      toolResultCount: data.toolResults.length,
      toolNames: data.toolResults.map((tr) => tr.name),
    });

    // Call AI service to continue with tool results
    const response = await aiService.continueWithToolResults(
      data.messages as ChatMessage[],
      data.toolResults,
      data.context as ChatContext
    );

    res.json({
      success: true,
      data: {
        message: response.message,
        toolCalls: response.toolCalls,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn('AI chat continue validation error', { errors: error.issues });
      return res.status(400).json({
        success: false,
        error: 'Invalid request',
        details: error.issues,
      });
    }

    logger.error('AI chat continue error', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    res.status(500).json({
      success: false,
      error: 'Failed to continue chat',
    });
  }
});

/**
 * GET /api/ai/health
 * Health check for AI service
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    // Check if API key is configured
    const hasApiKey = !!process.env.OPENAI_API_KEY;

    res.json({
      success: true,
      data: {
        status: hasApiKey ? 'ready' : 'not_configured',
        hasApiKey,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Health check failed',
    });
  }
});

export default router;
