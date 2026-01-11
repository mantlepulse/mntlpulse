'use client'

/**
 * Quest Creation Form Component
 * Form for creating or editing a creator quest
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { useCreateQuest, useUpdateQuest } from '@/hooks/use-creator-quests'
import { useCreatorSeasons } from '@/hooks/use-seasons'
import {
  CreatorQuest,
  CreatorQuestType,
  CreatorQuestRequirementType,
} from '@/lib/api/creator-quests-client'
import { QuestTemplateSelector, QuestTemplate } from './quest-templates'
import { Target, Trophy, Users, Calendar, Loader2, Sparkles, ArrowLeft } from 'lucide-react'
import { format } from 'date-fns'

const questFormSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters').max(100),
  description: z.string().min(10, 'Description must be at least 10 characters').max(500),
  questType: z.enum(['participation', 'engagement_goal']),
  requirementType: z.enum([
    'vote_on_polls',
    'vote_on_specific_poll',
    'share_poll',
    'first_n_voters',
    'participate_n_polls',
  ]),
  requirementTarget: z.coerce.number().min(1, 'Target must be at least 1'),
  pointsReward: z.coerce.number().min(1, 'Points reward must be at least 1'),
  maxCompletions: z.coerce.number().optional(),
  hasMaxCompletions: z.boolean(),
  pollScope: z.enum(['all', 'specific']),
  seasonId: z.string().optional(),
  hasTimeLimit: z.boolean(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
})

type QuestFormValues = z.infer<typeof questFormSchema>

const requirementTypeOptions: { value: CreatorQuestRequirementType; label: string; description: string }[] = [
  { value: 'vote_on_polls', label: 'Vote on Polls', description: 'Participants vote on any of your polls' },
  { value: 'participate_n_polls', label: 'Participate in Polls', description: 'Participants engage with multiple polls' },
  { value: 'first_n_voters', label: 'First N Voters', description: 'Be among the first voters on a poll' },
  { value: 'share_poll', label: 'Share Poll', description: 'Share polls on social media' },
]

interface QuestCreationFormProps {
  quest?: CreatorQuest
  onSuccess?: () => void
}

export function QuestCreationForm({ quest, onSuccess }: QuestCreationFormProps) {
  const router = useRouter()
  const createQuestMutation = useCreateQuest()
  const updateQuestMutation = useUpdateQuest()
  const { data: seasons } = useCreatorSeasons()
  const isEditing = !!quest

  // Template selection state
  const [showTemplates, setShowTemplates] = useState(!isEditing)
  const [selectedTemplate, setSelectedTemplate] = useState<QuestTemplate | null>(null)

  const form = useForm<QuestFormValues>({
    resolver: zodResolver(questFormSchema),
    defaultValues: {
      name: quest?.name || '',
      description: quest?.description || '',
      questType: quest?.questType || 'participation',
      requirementType: (quest?.requirements?.type as CreatorQuestRequirementType) || 'vote_on_polls',
      requirementTarget: quest?.requirements?.target || 1,
      pointsReward: quest?.pointsReward || 10,
      maxCompletions: quest?.maxCompletions || undefined,
      hasMaxCompletions: !!quest?.maxCompletions,
      pollScope: quest?.pollScope || 'all',
      seasonId: quest?.seasonId || undefined,
      hasTimeLimit: !!(quest?.startTime || quest?.endTime),
      startTime: quest?.startTime ? format(new Date(quest.startTime), "yyyy-MM-dd'T'HH:mm") : undefined,
      endTime: quest?.endTime ? format(new Date(quest.endTime), "yyyy-MM-dd'T'HH:mm") : undefined,
    },
  })

  const hasMaxCompletions = form.watch('hasMaxCompletions')
  const hasTimeLimit = form.watch('hasTimeLimit')
  const questType = form.watch('questType')

  // Handle template selection
  const handleTemplateSelect = (template: QuestTemplate) => {
    setSelectedTemplate(template)
    form.reset({
      name: template.name,
      description: template.description,
      questType: template.questType,
      requirementType: template.requirementType,
      requirementTarget: template.requirementTarget,
      pointsReward: template.pointsReward,
      maxCompletions: template.maxCompletions,
      hasMaxCompletions: !!template.maxCompletions,
      pollScope: 'all',
      seasonId: undefined,
      hasTimeLimit: false,
      startTime: undefined,
      endTime: undefined,
    })
    setShowTemplates(false)
  }

  const handleSkipTemplates = () => {
    setShowTemplates(false)
  }

  const handleBackToTemplates = () => {
    setShowTemplates(true)
    setSelectedTemplate(null)
  }

  const onSubmit = async (values: QuestFormValues) => {
    try {
      const data = {
        name: values.name,
        description: values.description,
        questType: values.questType as CreatorQuestType,
        requirements: {
          type: values.requirementType as CreatorQuestRequirementType,
          target: values.requirementTarget,
        },
        pointsReward: values.pointsReward,
        maxCompletions: values.hasMaxCompletions ? values.maxCompletions : undefined,
        pollScope: values.pollScope as 'all' | 'specific',
        seasonId: values.seasonId || undefined,
        startTime: values.hasTimeLimit && values.startTime ? values.startTime : undefined,
        endTime: values.hasTimeLimit && values.endTime ? values.endTime : undefined,
      }

      if (isEditing && quest) {
        await updateQuestMutation.mutateAsync({
          id: quest.id,
          name: data.name,
          description: data.description,
          pointsReward: data.pointsReward,
          maxCompletions: data.maxCompletions,
          startTime: data.startTime,
          endTime: data.endTime,
        })
      } else {
        await createQuestMutation.mutateAsync(data)
      }

      onSuccess?.()
      router.push('/creator/quests')
    } catch {
      // Error handled by mutation
    }
  }

  const isPending = createQuestMutation.isPending || updateQuestMutation.isPending

  // Show template selector for new quests
  if (showTemplates && !isEditing) {
    return (
      <QuestTemplateSelector
        onSelectTemplate={handleTemplateSelect}
        onSkip={handleSkipTemplates}
      />
    )
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* Template Badge & Back Button */}
        {selectedTemplate && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm text-muted-foreground">Using template:</span>
              <Badge variant="secondary">{selectedTemplate.name}</Badge>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleBackToTemplates}
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Change Template
            </Button>
          </div>
        )}

        {!isEditing && !selectedTemplate && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleBackToTemplates}
          >
            <Sparkles className="w-4 h-4 mr-1" />
            Use a Template
          </Button>
        )}

        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Quest Details
            </CardTitle>
            <CardDescription>
              Define the basic information for your quest
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quest Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Vote on 5 Polls" {...field} />
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
                      placeholder="Describe what participants need to do to complete this quest..."
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
              name="questType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quest Type</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                    >
                      <div className="flex items-start space-x-3 border rounded-lg p-4 cursor-pointer hover:border-primary transition-colors">
                        <RadioGroupItem value="participation" id="participation" className="mt-1" />
                        <div className="grid gap-1">
                          <Label htmlFor="participation" className="font-medium cursor-pointer">
                            <Users className="w-4 h-4 inline mr-2" />
                            Participation Quest
                          </Label>
                          <p className="text-sm text-muted-foreground">
                            Tasks participants complete individually (e.g., &quot;Vote on 3 polls&quot;)
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3 border rounded-lg p-4 cursor-pointer hover:border-primary transition-colors">
                        <RadioGroupItem value="engagement_goal" id="engagement_goal" className="mt-1" />
                        <div className="grid gap-1">
                          <Label htmlFor="engagement_goal" className="font-medium cursor-pointer">
                            <Trophy className="w-4 h-4 inline mr-2" />
                            Engagement Goal
                          </Label>
                          <p className="text-sm text-muted-foreground">
                            Limited milestone rewards (e.g., &quot;First 100 voters&quot;)
                          </p>
                        </div>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Requirements */}
        <Card>
          <CardHeader>
            <CardTitle>Requirements</CardTitle>
            <CardDescription>
              Define what participants need to do
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="requirementType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Requirement Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select requirement type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {requirementTypeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <div className="flex flex-col">
                            <span>{option.label}</span>
                            <span className="text-xs text-muted-foreground">{option.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="requirementTarget"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Target</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      placeholder="e.g., 5"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Number of actions required to complete this quest
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="pollScope"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Poll Scope</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isEditing}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select poll scope" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="all">All My Polls</SelectItem>
                      <SelectItem value="specific" disabled>Specific Polls (Coming Soon)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Which polls count towards quest completion
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Rewards */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5" />
              Rewards
            </CardTitle>
            <CardDescription>
              Configure points and completion limits
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="pointsReward"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Points Reward</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      placeholder="e.g., 100"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Points awarded upon quest completion (converted to PULSE at season end)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4">
              <FormField
                control={form.control}
                name="hasMaxCompletions"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel>Limit Total Completions</FormLabel>
                      <FormDescription>
                        Set a maximum number of users who can complete this quest
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              {hasMaxCompletions && (
                <FormField
                  control={form.control}
                  name="maxCompletions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Completions</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          placeholder="e.g., 100"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Time & Season */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Time & Season
            </CardTitle>
            <CardDescription>
              Configure timing and associate with a season
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="seasonId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Season (Optional)</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(value === 'none' ? undefined : value)}
                    defaultValue={field.value || 'none'}
                    disabled={isEditing}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a season (optional)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">No Season</SelectItem>
                      {seasons?.filter((s) => s.status === 'active' || s.status === 'upcoming').map((season) => (
                        <SelectItem key={season.id} value={season.id}>
                          {season.name} ({season.status})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Link this quest to a season for organized point distribution
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4">
              <FormField
                control={form.control}
                name="hasTimeLimit"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel>Set Time Limit</FormLabel>
                      <FormDescription>
                        Quest will only be available during specified time period
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              {hasTimeLimit && (
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
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
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
            {isEditing ? 'Save Changes' : 'Create Quest'}
          </Button>
        </div>
      </form>
    </Form>
  )
}
