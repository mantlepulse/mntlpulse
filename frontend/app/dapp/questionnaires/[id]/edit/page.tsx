"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ArrowLeft,
  CalendarIcon,
  Loader2,
  Save,
  ListChecks,
  GripVertical,
  X,
  Plus,
} from "lucide-react"
import { useAccount, useChainId } from "wagmi"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
  useQuestionnaire,
  useUpdateQuestionnaire,
  useUpdateQuestionnairePollOrder,
  useRemovePollFromQuestionnaire,
  useAddPollToQuestionnaire,
  usePollsInQuestionnaires,
} from "@/hooks/use-questionnaires"
import { usePollsByCreator, usePollsByIds } from "@/hooks/use-polls-by-creator"
import type { QuestionnaireWithPolls, QuestionnairePoll } from "@/lib/api/questionnaires-client"
import { TOKEN_INFO, getTokenSymbol as getTokenSymbolByAddress } from "@/lib/contracts/token-config"

interface PageProps {
  params: { id: string }
}

const editFormSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(2000).optional(),
  category: z.string().max(100).optional(),
  startTime: z.date().optional().nullable(),
  endTime: z.date().optional().nullable(),
  totalRewardAmount: z.string().optional(),
  fundingToken: z.string().optional(),
})

type EditFormData = z.infer<typeof editFormSchema>

export default function QuestionnaireEditPage({ params }: PageProps) {
  const router = useRouter()
  const { id } = params
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const [polls, setPolls] = useState<QuestionnairePoll[]>([])
  const [showAddPoll, setShowAddPoll] = useState(false)

  // Fetch questionnaire with polls
  const {
    data: questionnaire,
    isLoading,
    error,
    refetch,
  } = useQuestionnaire(id, true) as {
    data: QuestionnaireWithPolls | undefined
    isLoading: boolean
    error: Error | null
    refetch: () => void
  }

  // Mutations
  const { mutateAsync: updateQuestionnaire, isPending: isUpdating } = useUpdateQuestionnaire()
  const { mutateAsync: updatePollOrder, isPending: isReordering } = useUpdateQuestionnairePollOrder()
  const { mutateAsync: removePoll, isPending: isRemoving } = useRemovePollFromQuestionnaire()
  const { mutateAsync: addPoll, isPending: isAdding } = useAddPollToQuestionnaire()

  // Fetch creator's polls for adding
  const { polls: creatorPolls, loading: creatorPollsLoading } = usePollsByCreator(address)

  // Fetch polls that are already in other questionnaires (excluding current one)
  const { data: pollsInQuestionnaires } = usePollsInQuestionnaires(id)

  // Get poll IDs from questionnaire to fetch their details
  const questionnairePollIds = useMemo(() => {
    if (!questionnaire?.polls) return []
    return questionnaire.polls.map((p) => p.pollId.toString())
  }, [questionnaire?.polls])

  // Fetch poll details for polls in the questionnaire (includes inactive polls)
  const { polls: questionnairePollsData } = usePollsByIds(questionnairePollIds)

  const form = useForm<EditFormData>({
    resolver: zodResolver(editFormSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "",
      startTime: null,
      endTime: null,
      totalRewardAmount: "0",
      fundingToken: "PULSE",
    },
  })

  // Helper to convert fundingToken (address or symbol) to symbol
  const getFundingTokenSymbol = (tokenValue: string | null | undefined): string => {
    if (!tokenValue) return "PULSE"
    // If it's already a symbol (exists in TOKEN_INFO), return it
    if (TOKEN_INFO[tokenValue]) return tokenValue
    // Otherwise try to look up by address
    const symbol = getTokenSymbolByAddress(chainId, tokenValue as `0x${string}`)
    return symbol || "PULSE"
  }

  // Initialize form and polls when questionnaire loads
  useEffect(() => {
    if (questionnaire) {
      form.reset({
        title: questionnaire.title,
        description: questionnaire.description || "",
        category: questionnaire.category || "",
        startTime: questionnaire.startTime ? new Date(questionnaire.startTime) : null,
        endTime: questionnaire.endTime ? new Date(questionnaire.endTime) : null,
        totalRewardAmount: questionnaire.totalRewardAmount || "0",
        fundingToken: getFundingTokenSymbol(questionnaire.fundingToken),
      })
      setPolls(questionnaire.polls || [])
    }
  }, [questionnaire, form, chainId])

  // Check authorization
  const isCreator = address?.toLowerCase() === questionnaire?.creatorAddress.toLowerCase()

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const sortableItems = useMemo(
    () => polls.map((p) => `${p.chainId}-${p.pollId}`),
    [polls]
  )

  // Available polls to add (not already in questionnaire)
  const availablePolls = useMemo(() => {
    if (!creatorPolls) return []
    const existingIds = new Set(polls.map((p) => `${chainId}-${p.pollId}`))
    return creatorPolls.filter((poll) => !existingIds.has(`${chainId}-${poll.id}`))
  }, [creatorPolls, polls, chainId])

  // Create a map of poll IDs to titles for quick lookup
  // Combines data from both creatorPolls (active) and questionnairePollsData (all polls in questionnaire)
  const pollTitleMap = useMemo(() => {
    const map = new Map<string, string>()
    // Add titles from questionnaire polls (includes inactive polls)
    if (questionnairePollsData) {
      questionnairePollsData.forEach((poll) => {
        map.set(`${chainId}-${poll.id}`, poll.title)
      })
    }
    // Add titles from creator's active polls (for available polls to add)
    if (creatorPolls) {
      creatorPolls.forEach((poll) => {
        if (!map.has(`${chainId}-${poll.id}`)) {
          map.set(`${chainId}-${poll.id}`, poll.title)
        }
      })
    }
    return map
  }, [creatorPolls, questionnairePollsData, chainId])

  // Create a map to track which polls are in other questionnaires
  const pollsInQuestionnairesMap = useMemo(() => {
    const map = new Map<string, { questionnaireId: string; questionnaireTitle: string }>()
    if (pollsInQuestionnaires) {
      pollsInQuestionnaires.forEach((p) => {
        const key = `${p.chainId}-${p.pollId}`
        map.set(key, {
          questionnaireId: p.questionnaireId,
          questionnaireTitle: p.questionnaireTitle,
        })
      })
    }
    return map
  }, [pollsInQuestionnaires])

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = sortableItems.indexOf(active.id as string)
      const newIndex = sortableItems.indexOf(over.id as string)

      const newPolls = arrayMove(polls, oldIndex, newIndex).map((poll, index) => ({
        ...poll,
        sortOrder: index,
      }))

      setPolls(newPolls)
    }
  }

  const handleSaveBasicInfo = async (data: EditFormData) => {
    try {
      await updateQuestionnaire({
        id,
        title: data.title,
        description: data.description,
        category: data.category,
        startTime: data.startTime?.toISOString(),
        endTime: data.endTime?.toISOString(),
        totalRewardAmount: data.totalRewardAmount,
        fundingToken: data.fundingToken,
      })
      toast.success("Questionnaire updated successfully")
    } catch (error) {
      toast.error("Failed to update questionnaire")
    }
  }

  const handleSavePollOrder = async () => {
    try {
      await updatePollOrder({
        questionnaireId: id,
        polls: polls.map((p, index) => ({
          chainId: p.chainId,
          pollId: p.pollId,
          sortOrder: index,
        })),
      })
      toast.success("Poll order saved")
      refetch()
    } catch (error) {
      toast.error("Failed to save poll order")
    }
  }

  const handleRemovePoll = async (pollChainId: number, pollId: number) => {
    try {
      await removePoll({ questionnaireId: id, chainId: pollChainId, pollId })
      setPolls((prev) => prev.filter((p) => !(p.chainId === pollChainId && p.pollId === pollId)))
      toast.success("Poll removed")
      refetch()
    } catch (error) {
      toast.error("Failed to remove poll")
    }
  }

  const handleAddPoll = async (pollId: string, pollTitle: string) => {
    try {
      await addPoll({
        questionnaireId: id,
        chainId,
        pollId: parseInt(pollId),
        sortOrder: polls.length,
        source: "existing",
      })
      toast.success("Poll added")
      setShowAddPoll(false)
      refetch()
    } catch (error) {
      toast.error("Failed to add poll")
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading questionnaire...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !questionnaire) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold mb-2">Questionnaire Not Found</h2>
          <p className="text-muted-foreground mb-4">
            This questionnaire doesn't exist or failed to load.
          </p>
          <Button onClick={() => router.push("/dapp/questionnaires")}>
            Back to Questionnaires
          </Button>
        </div>
      </div>
    )
  }

  if (!isCreator) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold mb-2">Unauthorized</h2>
          <p className="text-muted-foreground mb-4">
            You don't have permission to edit this questionnaire.
          </p>
          <Button onClick={() => router.push("/dapp/questionnaires")}>
            Back to Questionnaires
          </Button>
        </div>
      </div>
    )
  }

  const isSaving = isUpdating || isReordering || isRemoving || isAdding

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => router.push("/dapp/questionnaires")}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Questionnaires
        </Button>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Edit Questionnaire</h1>
            <p className="text-muted-foreground mt-1">
              Update your questionnaire details and poll order
            </p>
          </div>
          <Badge
            variant={
              questionnaire.status === "active"
                ? "default"
                : questionnaire.status === "draft"
                ? "secondary"
                : "destructive"
            }
          >
            {questionnaire.status}
          </Badge>
        </div>
      </div>

      <div className="space-y-6">
        {/* Basic Info Section */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>
              Update the title, description, and timing
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSaveBasicInfo)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter questionnaire title" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe what this questionnaire is about"
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Product, Community, Governance" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="startTime"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Start Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value || undefined}
                              onSelect={field.onChange}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="endTime"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>End Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value || undefined}
                              onSelect={field.onChange}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Separator />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="totalRewardAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Total Reward Amount</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="0" min="0" step="0.01" {...field} />
                        </FormControl>
                        <FormDescription>Total tokens to distribute</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="fundingToken"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Funding Token</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select token" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Object.entries(TOKEN_INFO).map(([symbol, token]) => (
                              <SelectItem key={symbol} value={symbol}>
                                {token.symbol} - {token.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-end">
                  <Button type="submit" disabled={isSaving}>
                    {isUpdating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Poll Order Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <ListChecks className="h-5 w-5" />
                  Poll Order
                </CardTitle>
                <CardDescription>
                  Drag and drop to reorder polls
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddPoll(!showAddPoll)}
                  disabled={isSaving}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Poll
                </Button>
                <Button
                  size="sm"
                  onClick={handleSavePollOrder}
                  disabled={isSaving || polls.length === 0}
                >
                  {isReordering ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Order
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Add Poll Section */}
            {showAddPoll && (
              <div className="mb-4 p-4 border rounded-lg bg-muted/50">
                <h4 className="font-medium mb-2">Add Existing Poll</h4>
                {creatorPollsLoading ? (
                  <p className="text-sm text-muted-foreground">Loading polls...</p>
                ) : availablePolls.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No more polls available to add
                  </p>
                ) : (
                  <TooltipProvider>
                    <div className="space-y-2 max-h-[200px] overflow-y-auto">
                      {availablePolls.map((poll) => {
                        const questionnaireInfo = pollsInQuestionnairesMap.get(`${chainId}-${poll.id}`)
                        return (
                          <div
                            key={poll.id}
                            className="flex items-center justify-between p-2 bg-background rounded border hover:border-primary cursor-pointer"
                            onClick={() => handleAddPoll(poll.id, poll.title)}
                          >
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <span className="text-sm truncate">{poll.title}</span>
                              {questionnaireInfo && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Badge variant="secondary" className="text-xs px-1.5 py-0 h-5 gap-1 flex-shrink-0">
                                      <ListChecks className="h-3 w-3" />
                                      In questionnaire
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Already in: {questionnaireInfo.questionnaireTitle}</p>
                                  </TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                            <Button size="sm" variant="ghost" disabled={isAdding}>
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        )
                      })}
                    </div>
                  </TooltipProvider>
                )}
              </div>
            )}

            {polls.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <ListChecks className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No polls in this questionnaire</p>
                <p className="text-sm">Click "Add Poll" to add polls</p>
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={sortableItems}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {polls.map((poll, index) => (
                      <SortablePollItem
                        key={`${poll.chainId}-${poll.pollId}`}
                        poll={poll}
                        index={index}
                        title={pollTitleMap.get(`${poll.chainId}-${poll.pollId}`)}
                        onRemove={() => handleRemovePoll(poll.chainId, poll.pollId)}
                        disabled={isSaving}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// Sortable Poll Item Component
interface SortablePollItemProps {
  poll: QuestionnairePoll
  index: number
  title?: string
  onRemove: () => void
  disabled?: boolean
}

function SortablePollItem({ poll, index, title, onRemove, disabled }: SortablePollItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `${poll.chainId}-${poll.pollId}`,
    disabled,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(isDragging && "opacity-50 shadow-lg")}
    >
      <CardContent className="p-3 flex items-center gap-3">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing touch-none"
          disabled={disabled}
        >
          <GripVertical className="h-5 w-5 text-muted-foreground" />
        </button>

        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-sm font-medium">
          {index + 1}
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate" title={title || `Poll #${poll.pollId}`}>
            {title || `Poll #${poll.pollId}`}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className="text-xs">
              #{poll.pollId}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {poll.source === "new" ? "New" : "Existing"}
            </Badge>
            {poll.rewardPercentage && poll.rewardPercentage !== "0" && (
              <span className="text-xs text-muted-foreground">
                {poll.rewardPercentage}% reward
              </span>
            )}
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={onRemove}
          disabled={disabled}
          className="text-muted-foreground hover:text-destructive"
        >
          <X className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  )
}
