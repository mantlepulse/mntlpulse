'use client'

/**
 * Season Creation Form Component
 * Form for creating or editing a season/tournament
 */

import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Switch } from '@/components/ui/switch'
import { useCreateSeason, useUpdateSeason } from '@/hooks/use-seasons'
import { Season } from '@/lib/api/seasons-client'
import { Calendar, Coins, Loader2, Eye, Lock } from 'lucide-react'
import { format, addDays } from 'date-fns'

const seasonFormSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters').max(100),
  description: z.string().max(500).optional(),
  startTime: z.string().min(1, 'Start time is required'),
  endTime: z.string().min(1, 'End time is required'),
  totalPulsePool: z.coerce.number().min(0),
  isPublic: z.boolean(),
}).refine((data) => {
  const start = new Date(data.startTime)
  const end = new Date(data.endTime)
  return end > start
}, {
  message: 'End time must be after start time',
  path: ['endTime'],
})

type SeasonFormValues = z.infer<typeof seasonFormSchema>

interface SeasonCreationFormProps {
  season?: Season
  onSuccess?: () => void
}

export function SeasonCreationForm({ season, onSuccess }: SeasonCreationFormProps) {
  const router = useRouter()
  const createSeasonMutation = useCreateSeason()
  const updateSeasonMutation = useUpdateSeason()
  const isEditing = !!season

  // Default to starting tomorrow and ending 30 days later
  const defaultStartTime = format(addDays(new Date(), 1), "yyyy-MM-dd'T'HH:mm")
  const defaultEndTime = format(addDays(new Date(), 31), "yyyy-MM-dd'T'HH:mm")

  const form = useForm<SeasonFormValues>({
    resolver: zodResolver(seasonFormSchema),
    defaultValues: {
      name: season?.name || '',
      description: season?.description || '',
      startTime: season?.startTime
        ? format(new Date(season.startTime), "yyyy-MM-dd'T'HH:mm")
        : defaultStartTime,
      endTime: season?.endTime
        ? format(new Date(season.endTime), "yyyy-MM-dd'T'HH:mm")
        : defaultEndTime,
      totalPulsePool: season?.totalPulsePool ? parseFloat(season.totalPulsePool) : 0,
      isPublic: season?.isPublic ?? true,
    },
  })

  const onSubmit = async (values: SeasonFormValues) => {
    try {
      const data = {
        name: values.name,
        description: values.description || undefined,
        startTime: values.startTime,
        endTime: values.endTime,
        totalPulsePool: values.totalPulsePool.toString(),
        isPublic: values.isPublic,
      }

      if (isEditing && season) {
        await updateSeasonMutation.mutateAsync({
          id: season.id,
          ...data,
        })
      } else {
        await createSeasonMutation.mutateAsync(data)
      }

      onSuccess?.()
      router.push('/creator/quests?tab=seasons')
    } catch {
      // Error handled by mutation
    }
  }

  const isPending = createSeasonMutation.isPending || updateSeasonMutation.isPending

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Season Details
            </CardTitle>
            <CardDescription>
              Define the basic information for your season
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Season Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Season 1 - Launch Tournament" {...field} />
                  </FormControl>
                  <FormDescription>
                    Give your season a memorable name
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe what this season is about..."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isPublic"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="flex items-center gap-2">
                      {field.value ? (
                        <>
                          <Eye className="w-4 h-4" />
                          Public Season
                        </>
                      ) : (
                        <>
                          <Lock className="w-4 h-4" />
                          Private Season
                        </>
                      )}
                    </FormLabel>
                    <FormDescription>
                      {field.value
                        ? 'Anyone can see and participate in this season'
                        : 'Only invited participants can see this season'}
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Duration */}
        <Card>
          <CardHeader>
            <CardTitle>Duration</CardTitle>
            <CardDescription>
              Set when the season starts and ends
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Time</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormDescription>
                      When the season becomes active
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Time</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormDescription>
                      When the season ends
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Rewards Pool */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Coins className="w-5 h-5" />
              Rewards Pool
            </CardTitle>
            <CardDescription>
              Configure the PULSE token pool for this season
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="totalPulsePool"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Total PULSE Pool</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      step="any"
                      placeholder="e.g., 10000"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Total PULSE tokens to be distributed among participants based on their points.
                    You can update this amount until the season ends.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="rounded-lg bg-muted p-4">
              <h4 className="font-medium mb-2">How Distribution Works</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>1. Participants earn points by completing quests during the season</li>
                <li>2. When the season ends, the PULSE per point ratio is calculated</li>
                <li>3. Each participant receives PULSE based on their total points</li>
                <li>4. You can review the distribution before marking it as distributed</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-4 justify-end">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {isEditing ? 'Save Changes' : 'Create Season'}
          </Button>
        </div>
      </form>
    </Form>
  )
}
