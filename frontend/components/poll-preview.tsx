"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Clock, Users, Coins } from "lucide-react"

interface PollPreviewProps {
  title: string
  description: string
  options: string[]
  category: string
  endDate?: Date
  fundingType: "none" | "self" | "community"
  rewardAmount?: number
}

export function PollPreview({
  title,
  description,
  options,
  category,
  endDate,
  fundingType,
  rewardAmount,
}: PollPreviewProps) {
  const validOptions = options.filter(Boolean)
  const mockVotes = validOptions.map((_, index) => Math.floor(Math.random() * 100))
  const totalVotes = mockVotes.reduce((sum, votes) => sum + votes, 0)

  const fundingColors = {
    self: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    community: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    none: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  }

  const fundingLabels = {
    self: "Self-funded",
    community: "Community",
    none: "No rewards",
  }

  if (!title || validOptions.length < 2) {
    return (
      <Card className="gradient-card border-border/50">
        <CardContent className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Fill in the form to see a preview of your poll</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="gradient-card border-border/50">
      <CardHeader className="space-y-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <h3 className="font-semibold text-lg leading-tight">{title}</h3>
            <p className="text-sm text-muted-foreground line-clamp-2">{description}</p>
          </div>
          <Badge variant="outline" className="ml-2 shrink-0">
            {category}
          </Badge>
        </div>

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarFallback className="text-xs">YU</AvatarFallback>
            </Avatar>
            <span className="text-muted-foreground">You</span>
          </div>
          <Badge variant="outline" className={fundingColors[fundingType]}>
            {fundingLabels[fundingType]}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-3">
          {validOptions.slice(0, 3).map((option, index) => {
            const votes = mockVotes[index] || 0
            const percentage = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0
            return (
              <div key={index} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="line-clamp-1">{option}</span>
                  <span className="text-muted-foreground">{percentage}%</span>
                </div>
                <Progress value={percentage} className="h-2" />
              </div>
            )
          })}
          {validOptions.length > 3 && (
            <p className="text-xs text-muted-foreground">+{validOptions.length - 3} more options</p>
          )}
        </div>

        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="space-y-1">
            <div className="flex items-center justify-center gap-1">
              <Users className="h-3 w-3 text-muted-foreground" />
              <span className="text-sm font-medium">{totalVotes}</span>
            </div>
            <p className="text-xs text-muted-foreground">Votes</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-center gap-1">
              <Coins className="h-3 w-3 text-muted-foreground" />
              <span className="text-sm font-medium">{rewardAmount || 0} ETH</span>
            </div>
            <p className="text-xs text-muted-foreground">Reward</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-center gap-1">
              <Clock className="h-3 w-3 text-muted-foreground" />
              <span className="text-sm font-medium">
                {endDate ? Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0}d
              </span>
            </div>
            <p className="text-xs text-muted-foreground">Left</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
