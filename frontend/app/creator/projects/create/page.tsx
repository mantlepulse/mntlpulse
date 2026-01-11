'use client'

/**
 * Create Project Page
 * Form for creating a new project
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAccount } from 'wagmi'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { CreatorBreadcrumb } from '@/components/creator/creator-breadcrumb'
import { useCreateProject } from '@/hooks/use-projects'
import { FolderKanban, X, Plus, ArrowLeft, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

const CATEGORY_SUGGESTIONS = [
  'Product Feedback',
  'Community',
  'Research',
  'Governance',
  'Feature Requests',
  'User Experience',
  'Marketing',
  'Other',
]

export default function CreateProjectPage() {
  const router = useRouter()
  const { isConnected } = useAccount()
  const { mutateAsync: createProject, isPending } = useCreateProject()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [showVoteBreakdown, setShowVoteBreakdown] = useState(true)
  const [showTrends, setShowTrends] = useState(true)
  const [showParticipantInsights, setShowParticipantInsights] = useState(false)

  const handleAddTag = () => {
    const trimmedTag = tagInput.trim()
    if (trimmedTag && !tags.includes(trimmedTag) && tags.length < 10) {
      setTags([...tags, trimmedTag])
      setTagInput('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove))
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddTag()
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      toast.error('Project name is required')
      return
    }

    try {
      const project = await createProject({
        name: name.trim(),
        description: description.trim() || undefined,
        category: category.trim() || undefined,
        tags: tags.length > 0 ? tags : undefined,
        settings: {
          showVoteBreakdown,
          showTrends,
          showParticipantInsights,
        },
      })

      toast.success('Project created successfully!')
      router.push(`/creator/projects/${project.id}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create project')
    }
  }

  if (!isConnected) {
    return (
      <div className="container mx-auto py-8 px-4">
        <CreatorBreadcrumb />
        <Card className="mt-8">
          <CardContent className="py-16 text-center">
            <FolderKanban className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">Connect Your Wallet</h2>
            <p className="text-muted-foreground">
              Connect your wallet to create a project.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-2xl">
      <CreatorBreadcrumb />

      {/* Back Button */}
      <Button
        variant="ghost"
        className="mb-6"
        onClick={() => router.push('/creator/projects')}
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Projects
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderKanban className="w-6 h-6 text-primary" />
            Create New Project
          </CardTitle>
          <CardDescription>
            Create a project to organize your polls and generate insights.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Project Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Project Name *</Label>
              <Input
                id="name"
                placeholder="Enter project name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={200}
              />
              <p className="text-xs text-muted-foreground">
                {name.length}/200 characters
              </p>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe your project (optional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={1000}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                {description.length}/1000 characters
              </p>
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                placeholder="e.g., Product Feedback, Community"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                maxLength={100}
              />
              <div className="flex flex-wrap gap-2 mt-2">
                {CATEGORY_SUGGESTIONS.map((suggestion) => (
                  <Button
                    key={suggestion}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => setCategory(suggestion)}
                  >
                    {suggestion}
                  </Button>
                ))}
              </div>
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label htmlFor="tags">Tags</Label>
              <div className="flex gap-2">
                <Input
                  id="tags"
                  placeholder="Add a tag"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  maxLength={50}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddTag}
                  disabled={!tagInput.trim() || tags.length >= 10}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="pr-1">
                      {tag}
                      <button
                        type="button"
                        className="ml-1 hover:text-destructive"
                        onClick={() => handleRemoveTag(tag)}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                {tags.length}/10 tags
              </p>
            </div>

            {/* Settings */}
            <div className="space-y-4">
              <Label>Display Settings</Label>
              <div className="space-y-4 p-4 border rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">Vote Breakdown</p>
                    <p className="text-xs text-muted-foreground">
                      Show vote distribution across poll options
                    </p>
                  </div>
                  <Switch
                    checked={showVoteBreakdown}
                    onCheckedChange={setShowVoteBreakdown}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">Trends</p>
                    <p className="text-xs text-muted-foreground">
                      Show voting trends over time
                    </p>
                  </div>
                  <Switch
                    checked={showTrends}
                    onCheckedChange={setShowTrends}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">Participant Insights</p>
                    <p className="text-xs text-muted-foreground">
                      Show insights about voter demographics
                    </p>
                  </div>
                  <Switch
                    checked={showParticipantInsights}
                    onCheckedChange={setShowParticipantInsights}
                  />
                </div>
              </div>
            </div>

            {/* Submit */}
            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => router.push('/creator/projects')}
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Project
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
