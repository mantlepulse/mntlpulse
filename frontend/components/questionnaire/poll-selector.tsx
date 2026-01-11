"use client"

import { useState, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Search, Plus, Check, Clock, ListChecks } from "lucide-react"
import { useAccount, useChainId } from "wagmi"
import { usePollsByCreator } from "@/hooks/use-polls-by-creator"
import { usePollsInQuestionnaires } from "@/hooks/use-questionnaires"
import { formatDistanceToNow } from "date-fns"

export interface SelectedPoll {
  chainId: number
  pollId: string
  question: string
  source: "new" | "existing"
  sortOrder: number
}

interface PollSelectorProps {
  selectedPolls: SelectedPoll[]
  onAddPoll: (poll: SelectedPoll) => void
  disabled?: boolean
  excludeQuestionnaireId?: string // When editing, exclude the current questionnaire
}

export function PollSelector({ selectedPolls, onAddPoll, disabled, excludeQuestionnaireId }: PollSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const { address } = useAccount()
  const chainId = useChainId()

  // Fetch creator's polls
  const { polls: creatorPolls, loading: isLoading } = usePollsByCreator(address)

  // Fetch polls that are already in other questionnaires
  const { data: pollsInQuestionnaires } = usePollsInQuestionnaires(excludeQuestionnaireId)

  // Create a map of poll IDs to questionnaire info for quick lookup
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

  // Filter polls by search query and exclude already selected
  const availablePolls = useMemo(() => {
    if (!creatorPolls) return []

    const selectedIds = new Set(selectedPolls.map((p) => `${p.chainId}-${p.pollId}`))

    return creatorPolls.filter((poll) => {
      // Exclude already selected polls
      if (selectedIds.has(`${chainId}-${poll.id}`)) return false

      // Filter by search query
      if (searchQuery) {
        return poll.title.toLowerCase().includes(searchQuery.toLowerCase())
      }

      return true
    })
  }, [creatorPolls, selectedPolls, searchQuery, chainId])

  const handleAddPoll = (poll: { id: string; title: string }) => {
    onAddPoll({
      chainId,
      pollId: poll.id,
      question: poll.title,
      source: "existing",
      sortOrder: selectedPolls.length,
    })
  }

  const isSelected = (pollId: string) => {
    return selectedPolls.some(
      (p) => p.chainId === chainId && p.pollId === pollId
    )
  }

  const getQuestionnaireInfo = (pollId: string) => {
    const key = `${chainId}-${pollId}`
    return pollsInQuestionnairesMap.get(key)
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search your polls..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
          disabled={disabled}
        />
      </div>

      <ScrollArea className="h-[300px] rounded-md border">
        <div className="p-2">
          {isLoading ? (
            <div className="flex items-center justify-center h-[250px]">
              <p className="text-muted-foreground">Loading polls...</p>
            </div>
          ) : availablePolls.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[250px] text-center">
              <p className="text-muted-foreground">
                {searchQuery
                  ? "No polls found matching your search"
                  : creatorPolls?.length === 0
                  ? "You haven't created any polls yet"
                  : "All your polls have been added"}
              </p>
            </div>
          ) : (
            <TooltipProvider>
              <div className="space-y-2">
                {availablePolls.map((poll) => {
                  const questionnaireInfo = getQuestionnaireInfo(poll.id)
                  return (
                    <Card
                      key={poll.id}
                      className={`cursor-pointer transition-all hover:border-primary hover:bg-accent/50 ${
                        isSelected(poll.id) ? "border-primary bg-primary/5" : ""
                      }`}
                      onClick={() => !disabled && !isSelected(poll.id) && handleAddPoll(poll)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 min-w-0 overflow-hidden">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-sm truncate">{poll.title}</p>
                              {questionnaireInfo && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="flex-shrink-0">
                                      <Badge variant="secondary" className="text-xs px-1.5 py-0 h-5 gap-1">
                                        <ListChecks className="h-3 w-3" />
                                        In questionnaire
                                      </Badge>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Already in: {questionnaireInfo.questionnaireTitle}</p>
                                  </TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                              <Badge variant="outline" className="text-xs flex-shrink-0">
                                {poll.status}
                              </Badge>
                              <span className="flex items-center gap-1 truncate">
                                <Clock className="h-3 w-3 flex-shrink-0" />
                                {poll.endsAt
                                  ? formatDistanceToNow(new Date(poll.endsAt), {
                                      addSuffix: true,
                                    })
                                  : "No end date"}
                              </span>
                            </div>
                          </div>
                          <div className="flex-shrink-0">
                            {isSelected(poll.id) ? (
                              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground">
                                <Check className="h-4 w-4" />
                              </div>
                            ) : (
                              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-colors">
                                <Plus className="h-4 w-4" />
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </TooltipProvider>
          )}
        </div>
      </ScrollArea>

      <p className="text-xs text-muted-foreground">
        Only your own polls can be added to a questionnaire
      </p>
    </div>
  )
}
