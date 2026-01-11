/**
 * React hook for AI chatbox
 * Manages chat state, AI interactions, and tool execution
 */

import { useState, useCallback, useEffect } from 'react';
import { useChainId } from 'wagmi';
import { aiClient, ChatMessage, ToolCall, handleAIError } from '@/lib/api/ai-client';
import { PollPreviewData, FundingSource, ShiftState } from '@/components/ai-chatbox/poll-preview-card';
import { ShiftStatusData } from '@/components/ai-chatbox/shift-status-card';
import { submitFeedback, FeedbackCategory } from '@/lib/api/feedback-client';
import { toast } from 'sonner';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface PollCreationRequest {
  question: string;
  options: string[];
  durationInHours: number;
  maxVoters?: number;
  // New: funding info for polls with SideShift funding
  fundingToken?: string;
  fundingAmount?: string;
}

export interface ShiftCreationRequest {
  sourceCoin: string;
  sourceNetwork?: string;
  sourceAmount: string;
}

interface UseAIChatOptions {
  userAddress?: string;
  userNetwork?: string;  // Detected network from user's wallet (e.g., "ethereum", "base")
  onCreatePollRequest?: (request: PollCreationRequest) => void;
  onCreateShiftRequest?: (request: ShiftCreationRequest) => Promise<void>;
}

interface CreatedPollInfo {
  pollId: string;
  fundingToken?: string;
  fundingAmount?: string;
}

interface UseAIChatReturn {
  messages: Message[];
  isLoading: boolean;
  pollPreview: PollPreviewData | null;
  shiftStatus: ShiftStatusData | null;
  shiftState: ShiftState | null;
  pendingPollCreation: PollCreationRequest | null;
  pendingShiftCreation: ShiftCreationRequest | null;
  createdPollId: string | null;
  createdPollInfo: CreatedPollInfo | null;
  sendMessage: (message: string) => Promise<void>;
  clearChat: () => void;
  confirmPoll: () => void;
  confirmShift: () => void;
  cancelPollCreation: () => void;
  onPollCreated: (success: boolean, pollId?: string) => void;
  onShiftCreated: (shiftData: ShiftState) => void;
  onShiftStatusUpdate: (status: ShiftState['status'], settledAmount?: string, settledToken?: string) => void;
  refreshShift: () => Promise<void>;
}

/**
 * Hook for managing AI chat interactions
 */
export function useAIChat({ userAddress, userNetwork, onCreatePollRequest, onCreateShiftRequest }: UseAIChatOptions = {}): UseAIChatReturn {
  const chainId = useChainId();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [pollPreview, setPollPreview] = useState<PollPreviewData | null>(null);
  const [shiftStatus, setShiftStatus] = useState<ShiftStatusData | null>(null);
  const [shiftState, setShiftState] = useState<ShiftState | null>(null);
  const [createdPollId, setCreatedPollId] = useState<string | null>(null);
  const [createdPollInfo, setCreatedPollInfo] = useState<CreatedPollInfo | null>(null);
  const [pendingPollCreation, setPendingPollCreation] = useState<PollCreationRequest | null>(null);
  const [pendingShiftCreation, setPendingShiftCreation] = useState<ShiftCreationRequest | null>(null);

  /**
   * Process tool calls from AI response
   */
  const processToolCalls = useCallback(async (toolCalls: ToolCall[]) => {
    for (const toolCall of toolCalls) {
      switch (toolCall.name) {
        case 'preview_poll':
          // Show poll preview in the chat
          const previewData = toolCall.input as unknown as PollPreviewData & {
            fundingAmount?: string;
            fundingToken?: string;
            useSideshift?: boolean;
          };

          // Check if funding was specified (via fundingAmount/fundingToken)
          const hasFunding = !!(previewData.fundingAmount && previewData.fundingToken);
          // Check if SideShift is explicitly requested
          const useSideshift = previewData.useSideshift === true;

          // Build poll preview with funding info
          const pollPreviewWithFunding: PollPreviewData = {
            ...previewData,
            hasFunding,
            useSideshift,
            fundingSource: hasFunding ? {
              coin: previewData.fundingToken!,
              amount: previewData.fundingAmount!,
              detectedNetwork: useSideshift ? userNetwork : undefined,
            } : undefined,
          };

          setPollPreview(pollPreviewWithFunding);

          // Also prepare the creation request
          const durationInSeconds = previewData.duration || 604800; // Default 7 days
          const durationInHours = Math.ceil(durationInSeconds / 3600);

          setPendingPollCreation({
            question: previewData.question,
            options: previewData.options,
            durationInHours,
            maxVoters: previewData.maxVoters,
            fundingToken: previewData.fundingToken,
            fundingAmount: previewData.fundingAmount,
          });

          // Only prepare shift creation if SideShift is explicitly requested
          if (hasFunding && useSideshift) {
            setPendingShiftCreation({
              sourceCoin: previewData.fundingToken!,
              sourceAmount: previewData.fundingAmount!,
            });
          } else {
            setPendingShiftCreation(null);
          }
          break;

        case 'create_poll':
          // AI wants to create a poll - prepare the request
          const createData = toolCall.input as {
            question: string;
            options: string[];
            duration: number;
            maxVoters?: number;
          };

          setPendingPollCreation({
            question: createData.question,
            options: createData.options,
            durationInHours: Math.ceil(createData.duration / 3600),
            maxVoters: createData.maxVoters,
          });
          break;

        case 'create_funding_shift':
          // Handle shift creation request from AI
          const shiftData = toolCall.input as {
            sourceCoin: string;
            sourceNetwork?: string;
            amount: string;
          };

          setPendingShiftCreation({
            sourceCoin: shiftData.sourceCoin,
            sourceNetwork: shiftData.sourceNetwork,
            sourceAmount: shiftData.amount,
          });
          break;

        case 'create_claim_shift':
          // TODO: Handle claim shift creation
          setMessages((prev) => [
            ...prev,
            {
              role: 'assistant',
              content: 'Claim shift creation will be available soon. For now, please use the Claim Rewards dialog on the poll card.',
            },
          ]);
          break;

        case 'get_user_polls':
        case 'get_poll_details':
        case 'get_claimable_rewards':
        case 'get_shift_status':
          // TODO: Handle read operations
          break;

        case 'collect_feedback':
          // Handle feedback collection from AI
          const feedbackData = toolCall.input as {
            category: FeedbackCategory;
            content: string;
            shareWallet?: boolean;
          };

          try {
            await submitFeedback({
              category: feedbackData.category,
              content: feedbackData.content,
              walletAddress: feedbackData.shareWallet && userAddress ? userAddress : undefined,
              isAnonymous: !feedbackData.shareWallet,
              metadata: {
                browser: typeof window !== 'undefined' ? navigator.userAgent : undefined,
                page: typeof window !== 'undefined' ? window.location.pathname : undefined,
              },
            });

            toast.success('Feedback submitted successfully');
            setMessages((prev) => [
              ...prev,
              {
                role: 'assistant',
                content: feedbackData.shareWallet && userAddress
                  ? 'Thank you for your feedback! Your wallet address has been associated with this feedback for potential rewards.'
                  : 'Thank you for your feedback! It has been submitted anonymously.',
              },
            ]);
          } catch (error) {
            console.error('Failed to submit feedback:', error);
            setMessages((prev) => [
              ...prev,
              {
                role: 'assistant',
                content: 'I apologize, there was an error submitting your feedback. Please try again or use the dedicated feedback page at /feedback.',
              },
            ]);
          }
          break;

        default:
          console.warn('Unknown tool call:', toolCall.name);
      }
    }
  }, [userNetwork, userAddress]);

  /**
   * Send a message to the AI
   */
  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim()) return;

      // Add user message
      const userMessage: Message = { role: 'user', content };
      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);

      try {
        // Convert messages to API format
        const chatMessages: ChatMessage[] = [
          ...messages.map((m) => ({ role: m.role, content: m.content })),
          { role: 'user' as const, content },
        ];

        // Send to AI API
        const response = await aiClient.chat(chatMessages, {
          userAddress,
          chainId,
        });

        if (!response.success) {
          throw new Error(response.error || 'Failed to get AI response');
        }

        // Add assistant message
        if (response.data.message) {
          setMessages((prev) => [
            ...prev,
            { role: 'assistant', content: response.data.message },
          ]);
        }

        // Process tool calls
        if (response.data.toolCalls && response.data.toolCalls.length > 0) {
          await processToolCalls(response.data.toolCalls);
        }
      } catch (error) {
        const errorMessage = handleAIError(error);
        toast.error('AI Error', { description: errorMessage });
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: `I'm sorry, I encountered an error: ${errorMessage}. Please try again.`,
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [messages, userAddress, chainId, processToolCalls]
  );

  /**
   * Clear the chat
   */
  const clearChat = useCallback(() => {
    setMessages([]);
    setPollPreview(null);
    setShiftStatus(null);
    setShiftState(null);
    setPendingPollCreation(null);
    setPendingShiftCreation(null);
    setCreatedPollId(null);
    setCreatedPollInfo(null);
  }, []);

  /**
   * Confirm and trigger poll creation
   * This signals to the parent component to execute the contract call
   */
  const confirmPoll = useCallback(() => {
    if (!pendingPollCreation) {
      toast.error('No poll to create');
      return;
    }

    // Notify parent component to create the poll
    if (onCreatePollRequest) {
      onCreatePollRequest(pendingPollCreation);
    }

    // Clear the preview (the actual creation will be handled by the component)
    setPollPreview(null);
  }, [pendingPollCreation, onCreatePollRequest]);

  /**
   * Cancel poll creation
   */
  const cancelPollCreation = useCallback(() => {
    setPollPreview(null);
    setPendingPollCreation(null);
    setMessages((prev) => [
      ...prev,
      {
        role: 'assistant',
        content: 'Poll creation cancelled. Let me know if you\'d like to create a different poll!',
      },
    ]);
  }, []);

  /**
   * Called when poll creation completes (success or failure)
   */
  const onPollCreated = useCallback((success: boolean, pollId?: string) => {
    // Store funding info before clearing pendingPollCreation
    const fundingToken = pendingPollCreation?.fundingToken;
    const fundingAmount = pendingPollCreation?.fundingAmount;

    setPendingPollCreation(null);
    setShiftState(null);
    setPendingShiftCreation(null);

    if (success) {
      // Store the created poll ID and funding info for the View Poll / Fund Poll buttons
      if (pollId) {
        setCreatedPollId(pollId);
        setCreatedPollInfo({
          pollId,
          fundingToken,
          fundingAmount,
        });
      }

      const hasFunding = fundingToken && fundingAmount;
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: pollId
            ? hasFunding
              ? `Your poll has been created successfully! Poll ID: ${pollId}. Click "Fund Poll" to add ${fundingAmount} ${fundingToken} as rewards.`
              : `Your poll has been created successfully! Poll ID: ${pollId}. You can now share it with others.`
            : 'Your poll has been created successfully! You can now share it with others.',
        },
      ]);
    } else {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'There was an error creating the poll. Please try again or check your wallet connection.',
        },
      ]);
    }
  }, [pendingPollCreation]);

  /**
   * Confirm and trigger shift creation
   * This signals to the parent component to execute the shift API call
   */
  const confirmShift = useCallback(() => {
    if (!pendingShiftCreation) {
      toast.error('No shift to create');
      return;
    }

    // Notify parent component to create the shift
    if (onCreateShiftRequest) {
      onCreateShiftRequest(pendingShiftCreation);
    }
  }, [pendingShiftCreation, onCreateShiftRequest]);

  /**
   * Called when shift is created successfully
   */
  const onShiftCreated = useCallback((data: ShiftState) => {
    setShiftState(data);
    setMessages((prev) => [
      ...prev,
      {
        role: 'assistant',
        content: `Shift created! Please send ${pendingShiftCreation?.sourceAmount || ''} ${pendingShiftCreation?.sourceCoin || ''} to the deposit address shown above. Once the funds arrive, you'll be able to create your poll.`,
      },
    ]);
  }, [pendingShiftCreation]);

  /**
   * Called when shift status updates (from polling)
   */
  const onShiftStatusUpdate = useCallback((
    status: ShiftState['status'],
    settledAmount?: string,
    settledToken?: string
  ) => {
    setShiftState((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        status,
        settledAmount,
        settledToken,
      };
    });

    // Add message when shift settles
    if (status === 'settled' && settledAmount) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `Great! Your shift is complete. ${settledAmount} ${settledToken || 'USDC'} has been received on Base. You can now create your poll with funding!`,
        },
      ]);
    }
  }, []);

  /**
   * Refresh shift status
   */
  const refreshShift = useCallback(async () => {
    if (!shiftStatus) return;

    setIsLoading(true);

    try {
      // Send a message asking for status update
      await sendMessage(`What's the status of my shift ${shiftStatus.orderId}?`);
    } catch (error) {
      toast.error('Failed to refresh shift status');
    } finally {
      setIsLoading(false);
    }
  }, [shiftStatus, sendMessage]);

  return {
    messages,
    isLoading,
    pollPreview,
    shiftStatus,
    shiftState,
    pendingPollCreation,
    pendingShiftCreation,
    createdPollId,
    createdPollInfo,
    sendMessage,
    clearChat,
    confirmPoll,
    confirmShift,
    cancelPollCreation,
    onPollCreated,
    onShiftCreated,
    onShiftStatusUpdate,
    refreshShift,
  };
}
