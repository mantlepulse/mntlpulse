"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { useAccount, useChainId } from "wagmi"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChatMessage } from "./chat-message"
import { PollPreviewCard, PollPreviewData, ShiftState } from "./poll-preview-card"
import { ShiftStatusCard, ShiftStatusData } from "./shift-status-card"
import { useAIChat, Message, PollCreationRequest, ShiftCreationRequest } from "@/hooks/use-ai-chat"
import { useCreatePoll, usePollsContractAddress } from "@/lib/contracts/polls-contract-utils"
import { FundingType } from "@/lib/contracts/polls-contract"
import { useSideshift, useShiftMonitor } from "@/hooks/use-sideshift"
import { getDefaultDestinationCoin, getNetworkForChain, getDefaultNetworkForCoin, getNetworkDisplayName, getSourceNetworkForChain, isTestnet } from "@/lib/utils/currency"
import { getTokenAddress } from "@/lib/contracts/token-config"
import { Bot, X, Send, Minimize2, Maximize2, Trash2, Loader2, GripVertical, ExternalLink, Coins } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { Address, decodeEventLog } from "viem"
import { POLLS_CONTRACT_ABI } from "@/lib/contracts/polls-contract"

// Size constraints
const MIN_WIDTH = 320
const MAX_WIDTH = 600
const MIN_HEIGHT = 400
const MAX_HEIGHT = 800
const DEFAULT_WIDTH = 384 // 96 * 4 = w-96
const DEFAULT_HEIGHT = 600

interface AIChatboxProps {
  className?: string
}

export function AIChatbox({ className }: AIChatboxProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [input, setInput] = useState("")
  const [isCreatingPoll, setIsCreatingPoll] = useState(false)
  const [isCreatingShift, setIsCreatingShift] = useState(false)
  const [currentShiftId, setCurrentShiftId] = useState<string | null>(null)
  const [size, setSize] = useState({ width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT })
  const [isResizing, setIsResizing] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const contractAddress = usePollsContractAddress()

  // Shift hooks
  const { createShift, loading: shiftLoading } = useSideshift()
  const { status: shiftMonitorStatus, shiftData: shiftMonitorData } = useShiftMonitor(currentShiftId)

  // Handle resize from top-left corner
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)

    const startX = e.clientX
    const startY = e.clientY
    const startWidth = size.width
    const startHeight = size.height

    const handleMouseMove = (moveEvent: MouseEvent) => {
      // Calculate delta (inverted because we're resizing from top-left)
      const deltaX = startX - moveEvent.clientX
      const deltaY = startY - moveEvent.clientY

      // Calculate new dimensions
      const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth + deltaX))
      const newHeight = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, startHeight + deltaY))

      setSize({ width: newWidth, height: newHeight })
    }

    const handleMouseUp = () => {
      setIsResizing(false)
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }

    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)
  }, [size])

  // Poll creation hook
  const {
    createPoll,
    isPending: isPollPending,
    isConfirming: isPollConfirming,
    isSuccess: isPollSuccess,
    error: pollError,
    hash: pollTxHash,
    receipt: pollReceipt,
  } = useCreatePoll()

  // Handle poll creation request from AI chat
  const handleCreatePollRequest = useCallback(async (request: PollCreationRequest) => {
    if (!contractAddress) {
      toast.error("Contract not available on this network")
      return
    }

    setIsCreatingPoll(true)

    try {
      // Determine funding token from request, default to ETH if not specified
      let fundingToken: Address = '0x0000000000000000000000000000000000000000' as Address
      let fundingType = FundingType.NONE

      if (request.fundingToken) {
        // Map token symbol to address using token-config
        const tokenAddress = getTokenAddress(chainId, request.fundingToken.toUpperCase())
        if (tokenAddress) {
          fundingToken = tokenAddress
          // If funding token is specified, use COMMUNITY funding type (others can fund)
          fundingType = FundingType.COMMUNITY
        } else {
          console.warn(`Unknown funding token: ${request.fundingToken}, falling back to ETH`)
        }
      }

      await createPoll(
        request.question,
        request.options,
        request.durationInHours,
        fundingToken,
        fundingType
      )
    } catch (error) {
      console.error("Error creating poll:", error)
      toast.error("Failed to create poll")
      setIsCreatingPoll(false)
    }
  }, [contractAddress, chainId, createPoll])

  // Store callback ref to break circular dependency
  const onShiftCreatedRef = useRef<((data: ShiftState) => void) | null>(null)

  // Handle shift creation request from AI chat
  const handleCreateShiftRequest = useCallback(async (request: ShiftCreationRequest) => {
    if (!address) {
      toast.error("Wallet not connected")
      return
    }

    // Check if user is on a testnet - SideShift doesn't support testnets
    if (isTestnet(chainId)) {
      toast.error("SideShift not available on testnets", {
        description: "Please switch to a mainnet (e.g., Base, Ethereum) to use SideShift for funding.",
        duration: 5000,
      })
      return
    }

    setIsCreatingShift(true)

    try {
      // Determine destination coin based on source (stablecoins go to USDC, others go to ETH)
      const destCoin = getDefaultDestinationCoin(request.sourceCoin)
      const destNetwork = getNetworkForChain(chainId)

      // Get source network - use provided, or detect from connected chain, or default based on coin
      // For cross-chain shifts, we need the SideShift network identifier (e.g., "ethereum", not "Ethereum")
      let sourceNetwork = request.sourceNetwork
      if (!sourceNetwork) {
        // If user is connected to a supported network, use that as the source
        const connectedNetwork = getSourceNetworkForChain(chainId)
        // If connected to Base (destination), default to the coin's native network
        if (connectedNetwork === 'base' || connectedNetwork === 'baseSepolia') {
          sourceNetwork = getDefaultNetworkForCoin(request.sourceCoin)
        } else {
          sourceNetwork = connectedNetwork
        }
      }

      const result = await createShift({
        userAddress: address,
        purpose: 'bridge', // Using bridge since poll doesn't exist yet
        sourceCoin: request.sourceCoin,
        sourceNetwork,
        destCoin,
        destNetwork,
        sourceAmount: request.sourceAmount,
        chainId,
      })

      if (result) {
        setCurrentShiftId(result.shift.id)
        // Use ref to call onShiftCreated
        onShiftCreatedRef.current?.({
          shiftId: result.shift.id,
          depositAddress: result.sideshift.depositAddress,
          depositCoin: result.sideshift.depositCoin,
          depositNetwork: result.sideshift.depositNetwork,
          status: 'waiting',
        })
      }
    } catch (error) {
      console.error("Error creating shift:", error)
      toast.error("Failed to create shift")
    } finally {
      setIsCreatingShift(false)
    }
  }, [address, chainId, createShift])

  const {
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
    onPollCreated,
    onShiftCreated,
    onShiftStatusUpdate,
    refreshShift,
  } = useAIChat({
    userAddress: address,
    userNetwork: getNetworkDisplayName(chainId),
    onCreatePollRequest: handleCreatePollRequest,
    onCreateShiftRequest: handleCreateShiftRequest,
  })

  // Update ref when onShiftCreated changes
  useEffect(() => {
    onShiftCreatedRef.current = onShiftCreated
  }, [onShiftCreated])

  // Monitor shift status and update hook state
  useEffect(() => {
    if (shiftMonitorStatus && currentShiftId) {
      const settledAmount = shiftMonitorData?.sideshiftData?.settleAmount
      const settledToken = shiftMonitorData?.sideshiftData?.settleCoin
      onShiftStatusUpdate(
        shiftMonitorStatus as ShiftState['status'],
        settledAmount,
        settledToken
      )

      // Reset shift ID when shift is complete or failed
      if (['settled', 'expired', 'refunded'].includes(shiftMonitorStatus)) {
        // Keep shift ID for a bit so user can see status, then reset
        // setCurrentShiftId(null) - don't reset immediately
      }
    }
  }, [shiftMonitorStatus, shiftMonitorData, currentShiftId, onShiftStatusUpdate])

  // Handle poll creation success/failure
  useEffect(() => {
    if (isPollSuccess && isCreatingPoll && pollReceipt) {
      // Extract poll ID from transaction logs
      let pollId: string | undefined
      try {
        for (const log of pollReceipt.logs) {
          try {
            const decoded = decodeEventLog({
              abi: POLLS_CONTRACT_ABI,
              data: log.data,
              topics: log.topics,
            })
            if (decoded.eventName === 'PollCreated' && decoded.args) {
              const args = decoded.args as unknown as { pollId: bigint }
              pollId = args.pollId.toString()
              break
            }
          } catch {
            // Not the event we're looking for, continue
          }
        }
      } catch (error) {
        console.error("Error parsing poll ID from receipt:", error)
      }

      toast.success("Poll created successfully!")
      onPollCreated(true, pollId)
      setIsCreatingPoll(false)
    }
  }, [isPollSuccess, isCreatingPoll, pollReceipt, onPollCreated])

  useEffect(() => {
    if (pollError && isCreatingPoll) {
      console.error("Poll creation error:", pollError)
      toast.error(`Failed to create poll: ${pollError.message}`)
      onPollCreated(false)
      setIsCreatingPoll(false)
    }
  }, [pollError, isCreatingPoll, onPollCreated])

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, pollPreview, shiftStatus, shiftState])

  // Focus input when opened
  useEffect(() => {
    if (isOpen && !isMinimized && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen, isMinimized])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const message = input.trim()
    setInput("")
    await sendMessage(message)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const isPollCreationInProgress = isPollPending || isPollConfirming || isCreatingPoll

  // Floating button when closed
  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg",
          "bg-primary hover:bg-primary/90",
          "z-50",
          className
        )}
        size="icon"
      >
        <Bot className="h-6 w-6" />
        <span className="sr-only">Open AI Assistant</span>
      </Button>
    )
  }

  // Minimized state
  if (isMinimized) {
    return (
      <Card
        className={cn(
          "fixed bottom-6 right-6 w-64 z-50 shadow-lg cursor-pointer",
          className
        )}
        onClick={() => setIsMinimized(false)}
      >
        <CardHeader className="py-3 px-4 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="h-4 w-4" />
            <CardTitle className="text-sm">MantlePulse AI</CardTitle>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={(e) => {
                e.stopPropagation()
                setIsMinimized(false)
              }}
            >
              <Maximize2 className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={(e) => {
                e.stopPropagation()
                setIsOpen(false)
              }}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </CardHeader>
      </Card>
    )
  }

  // Full chat view
  return (
    <Card
      ref={cardRef}
      className={cn(
        "fixed bottom-6 right-6 z-50 shadow-lg flex flex-col",
        isResizing && "select-none",
        className
      )}
      style={{
        width: size.width,
        height: size.height,
      }}
    >
      {/* Resize Handle - Top Left Corner */}
      <div
        className="absolute -top-1.5 -left-1.5 w-6 h-6 cursor-nw-resize z-10 group flex items-center justify-center"
        onMouseDown={handleResizeStart}
        title="Drag to resize"
      >
        <GripVertical className="h-3 w-3 text-muted-foreground group-hover:text-primary transition-colors rotate-45" />
      </div>

      {/* Left edge resize handle */}
      <div
        className="absolute top-1/2 -left-1 w-2 h-16 -translate-y-1/2 cursor-ew-resize z-10 group"
        onMouseDown={(e) => {
          e.preventDefault()
          setIsResizing(true)
          const startX = e.clientX
          const startWidth = size.width

          const handleMouseMove = (moveEvent: MouseEvent) => {
            const deltaX = startX - moveEvent.clientX
            const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth + deltaX))
            setSize((prev) => ({ ...prev, width: newWidth }))
          }

          const handleMouseUp = () => {
            setIsResizing(false)
            document.removeEventListener("mousemove", handleMouseMove)
            document.removeEventListener("mouseup", handleMouseUp)
          }

          document.addEventListener("mousemove", handleMouseMove)
          document.addEventListener("mouseup", handleMouseUp)
        }}
      >
        <div className="w-1 h-full rounded-full bg-transparent group-hover:bg-primary/50 transition-colors" />
      </div>

      {/* Top edge resize handle */}
      <div
        className="absolute -top-1 left-1/2 w-16 h-2 -translate-x-1/2 cursor-ns-resize z-10 group"
        onMouseDown={(e) => {
          e.preventDefault()
          setIsResizing(true)
          const startY = e.clientY
          const startHeight = size.height

          const handleMouseMove = (moveEvent: MouseEvent) => {
            const deltaY = startY - moveEvent.clientY
            const newHeight = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, startHeight + deltaY))
            setSize((prev) => ({ ...prev, height: newHeight }))
          }

          const handleMouseUp = () => {
            setIsResizing(false)
            document.removeEventListener("mousemove", handleMouseMove)
            document.removeEventListener("mouseup", handleMouseUp)
          }

          document.addEventListener("mousemove", handleMouseMove)
          document.addEventListener("mouseup", handleMouseUp)
        }}
      >
        <div className="h-1 w-full rounded-full bg-transparent group-hover:bg-primary/50 transition-colors" />
      </div>

      {/* Header */}
      <CardHeader className="py-3 px-4 border-b flex flex-row items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">MantlePulse AI</CardTitle>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={clearChat}
            title="Clear chat"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setIsMinimized(true)}
          >
            <Minimize2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setIsOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      {/* Messages */}
      <CardContent className="flex-1 p-0 overflow-hidden">
        <ScrollArea className="h-full p-4" ref={scrollRef}>
          <div className="space-y-4">
            {/* Welcome message */}
            {messages.length === 0 && (
              <div className="text-center py-8 space-y-2">
                <Bot className="h-12 w-12 mx-auto text-primary/50" />
                <h3 className="font-medium">Welcome to MantlePulse AI</h3>
                <p className="text-sm text-muted-foreground max-w-[250px] mx-auto">
                  {isConnected
                    ? "Tell me what kind of poll you'd like to create!"
                    : "Connect your wallet to start creating polls."}
                </p>
                {isConnected && (
                  <div className="text-xs text-muted-foreground pt-2 space-y-1">
                    <p>Try saying:</p>
                    <p className="italic">"Create for me a poll about what features to build next for Base Pulse. Collect responses for 1 week. Fund the poll with 0.01 ETH using SideShift and split the rewards equally to max of 10 respondents."</p>
                  </div>
                )}
              </div>
            )}

            {/* Chat messages */}
            {messages.map((message, index) => (
              <ChatMessage
                key={index}
                role={message.role}
                content={message.content}
              />
            ))}

            {/* Loading indicator */}
            {isLoading && (
              <ChatMessage role="assistant" content="" isLoading />
            )}

            {/* Poll Preview */}
            {pollPreview && (
              <PollPreviewCard
                data={pollPreview}
                onConfirm={confirmPoll}
                onCreateShift={confirmShift}
                isCreating={isPollCreationInProgress}
                isCreatingShift={isCreatingShift || shiftLoading}
                shiftState={shiftState || undefined}
                isOnTestnet={isTestnet(chainId)}
              />
            )}

            {/* Shift Creation Status */}
            {(isCreatingShift || shiftLoading) && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary/10 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Creating SideShift order...</span>
              </div>
            )}

            {/* Poll Creation Status */}
            {isPollCreationInProgress && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>
                  {isPollPending && "Waiting for wallet confirmation..."}
                  {isPollConfirming && "Confirming transaction..."}
                  {!isPollPending && !isPollConfirming && "Creating poll..."}
                </span>
              </div>
            )}

            {/* Shift Status */}
            {shiftStatus && (
              <ShiftStatusCard data={shiftStatus} onRefresh={refreshShift} />
            )}

            {/* View Poll Button - shown after successful poll creation */}
            {createdPollId && !pollPreview && !isPollCreationInProgress && (
              <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div className="text-sm">
                      <p className="font-medium text-green-600">Poll Created!</p>
                      <p className="text-xs text-muted-foreground">Poll ID: {createdPollId}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      asChild
                      size="sm"
                      variant="outline"
                      className="flex-1 border-green-500/30 hover:bg-green-500/10"
                    >
                      <Link href={`/dapp/poll/${createdPollId}`}>
                        <ExternalLink className="h-3 w-3 mr-1" />
                        View Poll
                      </Link>
                    </Button>
                    {createdPollInfo?.fundingToken && createdPollInfo?.fundingAmount && (
                      <Button
                        asChild
                        size="sm"
                        className="flex-1"
                      >
                        <Link href={`/dapp/poll/${createdPollId}/fund`}>
                          <Coins className="h-3 w-3 mr-1" />
                          Fund Poll
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>

      {/* Input */}
      <div className="p-4 border-t shrink-0">
        <form onSubmit={handleSubmit} className="flex gap-2 items-end">
          <Textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isConnected
                ? "Ask me to create a poll..."
                : "Connect wallet first"
            }
            disabled={!isConnected || isLoading || isPollCreationInProgress}
            className="flex-1 min-h-[40px] max-h-[200px] resize-y"
            rows={1}
          />
          <Button
            type="submit"
            size="icon"
            className="shrink-0"
            disabled={!isConnected || isLoading || !input.trim() || isPollCreationInProgress}
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </Card>
  )
}
