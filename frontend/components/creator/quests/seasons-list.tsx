'use client'

/**
 * Seasons List Component
 * Displays and manages seasons/tournaments created by the creator
 */

import { useState } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useCreatorSeasons, useDeleteSeason, useCalculateDistribution, useMarkSeasonDistributed } from '@/hooks/use-seasons'
import {
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  Trophy,
  Calendar,
  Plus,
  Calculator,
  CheckCircle2,
  Clock,
  Coins,
} from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import { Season, SeasonStatus } from '@/lib/api/seasons-client'

const statusConfig: Record<SeasonStatus, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  upcoming: { label: 'Upcoming', variant: 'outline' },
  active: { label: 'Active', variant: 'default' },
  ended: { label: 'Ended', variant: 'secondary' },
  distributed: { label: 'Distributed', variant: 'default' },
}

export function SeasonsList() {
  const { data: seasons, isLoading, error } = useCreatorSeasons()
  const deleteSeasonMutation = useDeleteSeason()
  const calculateDistributionMutation = useCalculateDistribution()
  const markDistributedMutation = useMarkSeasonDistributed()

  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | SeasonStatus>('all')
  const [seasonToDelete, setSeasonToDelete] = useState<Season | null>(null)

  const filteredSeasons = seasons?.filter((season) => {
    const matchesSearch = season.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || season.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const handleDelete = async () => {
    if (!seasonToDelete) return
    try {
      await deleteSeasonMutation.mutateAsync(seasonToDelete.id)
      setSeasonToDelete(null)
    } catch {
      // Error handled by mutation
    }
  }

  const handleCalculateDistribution = async (season: Season) => {
    try {
      await calculateDistributionMutation.mutateAsync(season.id)
    } catch {
      // Error handled by mutation
    }
  }

  const handleMarkDistributed = async (season: Season) => {
    try {
      await markDistributedMutation.mutateAsync(season.id)
    } catch {
      // Error handled by mutation
    }
  }

  const getTimeProgress = (season: Season) => {
    const now = new Date().getTime()
    const start = new Date(season.startTime).getTime()
    const end = new Date(season.endTime).getTime()

    if (now < start) return 0
    if (now > end) return 100

    return Math.round(((now - start) / (end - start)) * 100)
  }

  const getTimeRemaining = (season: Season) => {
    const now = new Date()
    const start = new Date(season.startTime)
    const end = new Date(season.endTime)

    if (now < start) {
      return `Starts ${formatDistanceToNow(start, { addSuffix: true })}`
    }
    if (now < end) {
      return `Ends ${formatDistanceToNow(end, { addSuffix: true })}`
    }
    return `Ended ${formatDistanceToNow(end, { addSuffix: true })}`
  }

  const formatPulsePool = (amount: string) => {
    const num = parseFloat(amount)
    if (num === 0) return '0 PULSE'
    if (num >= 1000000) return `${(num / 1000000).toFixed(2)}M PULSE`
    if (num >= 1000) return `${(num / 1000).toFixed(2)}K PULSE`
    return `${num.toFixed(2)} PULSE`
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        Failed to load seasons. Please try again.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search seasons..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={statusFilter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('all')}
          >
            All
          </Button>
          <Button
            variant={statusFilter === 'active' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('active')}
          >
            Active
          </Button>
          <Button
            variant={statusFilter === 'upcoming' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('upcoming')}
          >
            Upcoming
          </Button>
          <Button
            variant={statusFilter === 'ended' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('ended')}
          >
            Ended
          </Button>
        </div>
      </div>

      {/* Seasons List */}
      {!filteredSeasons || filteredSeasons.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Calendar className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-1">
            {searchQuery || statusFilter !== 'all' ? 'No seasons found' : 'No seasons yet'}
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            {searchQuery || statusFilter !== 'all'
              ? 'Try adjusting your filters'
              : 'Create your first season to organize quests and distribute rewards'}
          </p>
          {!searchQuery && statusFilter === 'all' && (
            <Button asChild>
              <Link href="/creator/quests/seasons/create">
                <Plus className="w-4 h-4 mr-2" />
                Create Season
              </Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Season</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Pool</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSeasons.map((season) => (
                <TableRow key={season.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <Link
                        href={`/creator/quests/seasons/${season.id}`}
                        className="font-medium hover:underline"
                      >
                        {season.name}
                      </Link>
                      {season.description && (
                        <span className="text-xs text-muted-foreground line-clamp-1">
                          {season.description}
                        </span>
                      )}
                      <div className="flex items-center gap-1 mt-1">
                        {season.isPublic ? (
                          <Badge variant="outline" className="text-xs">Public</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">Private</Badge>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {getTimeRemaining(season)}
                      </div>
                      <Progress value={getTimeProgress(season)} className="h-1.5 w-24" />
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(season.startTime), 'MMM d')} -{' '}
                        {format(new Date(season.endTime), 'MMM d, yyyy')}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Coins className="w-3 h-3 text-amber-500" />
                      <span className="font-medium">{formatPulsePool(season.totalPulsePool)}</span>
                    </div>
                    {season.pulsePerPoint && (
                      <div className="text-xs text-muted-foreground">
                        {parseFloat(season.pulsePerPoint).toFixed(4)} PULSE/pt
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusConfig[season.status].variant}>
                      {statusConfig[season.status].label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Open menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/creator/quests/seasons/${season.id}`}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/creator/quests/seasons/${season.id}/leaderboard`}>
                            <Trophy className="mr-2 h-4 w-4" />
                            View Leaderboard
                          </Link>
                        </DropdownMenuItem>
                        {(season.status === 'upcoming' || season.status === 'active') && (
                          <DropdownMenuItem asChild>
                            <Link href={`/creator/quests/seasons/${season.id}/edit`}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit Season
                            </Link>
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        {season.status === 'ended' && (
                          <>
                            <DropdownMenuItem
                              onClick={() => handleCalculateDistribution(season)}
                              disabled={calculateDistributionMutation.isPending}
                            >
                              <Calculator className="mr-2 h-4 w-4" />
                              Calculate Distribution
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleMarkDistributed(season)}
                              disabled={markDistributedMutation.isPending}
                            >
                              <CheckCircle2 className="mr-2 h-4 w-4" />
                              Mark as Distributed
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                          </>
                        )}
                        {season.status === 'upcoming' && (
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => setSeasonToDelete(season)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete Season
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!seasonToDelete} onOpenChange={() => setSeasonToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Season</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{seasonToDelete?.name}&quot;? This action cannot
              be undone. All quests associated with this season will remain but will be unlinked.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteSeasonMutation.isPending}
            >
              {deleteSeasonMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
