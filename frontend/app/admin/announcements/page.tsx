"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  AlertCircle,
  Megaphone,
  Plus,
  Edit,
  Trash,
  Archive,
  Send,
  X,
} from "lucide-react"
import { useAccount } from "wagmi"
import {
  useAllAnnouncements,
  useCreateAnnouncement,
  useUpdateAnnouncement,
  useDeleteAnnouncement,
  usePublishAnnouncement,
  useArchiveAnnouncement,
} from "@/hooks/use-announcements"
import { Announcement } from "@/lib/api/announcements-client"
import { toast } from "sonner"
import { format } from "date-fns"

interface AnnouncementFormData {
  title: string
  description: string
  link?: string
  linkText?: string
  dismissible: boolean
  priority: number
  startDate?: string
  endDate?: string
}

const initialFormData: AnnouncementFormData = {
  title: "",
  description: "",
  link: "",
  linkText: "Learn More",
  dismissible: true,
  priority: 5,
  startDate: "",
  endDate: "",
}

export default function AdminAnnouncementsPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [formData, setFormData] = useState<AnnouncementFormData>(initialFormData)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  const { address, isConnected } = useAccount()

  // Check if user is admin (from environment)
  const isAdmin = address && process.env.NEXT_PUBLIC_ADMIN_ADDRESSES?.split(',')
    .map(a => a.toLowerCase())
    .includes(address.toLowerCase())

  const { data: announcements, isLoading } = useAllAnnouncements(address)
  const createMutation = useCreateAnnouncement()
  const updateMutation = useUpdateAnnouncement()
  const deleteMutation = useDeleteAnnouncement()
  const publishMutation = usePublishAnnouncement()
  const archiveMutation = useArchiveAnnouncement()

  const handleCreate = async () => {
    if (!formData.title || !formData.description) {
      toast.error("Title and description are required")
      return
    }

    try {
      await createMutation.mutateAsync({
        title: formData.title,
        description: formData.description,
        link: formData.link || undefined,
        linkText: formData.linkText || undefined,
        dismissible: formData.dismissible,
        priority: formData.priority,
        startDate: formData.startDate || undefined,
        endDate: formData.endDate || undefined,
        status: 'draft',
      })
      toast.success("Announcement created")
      setIsCreateDialogOpen(false)
      setFormData(initialFormData)
    } catch (error) {
      toast.error("Failed to create announcement")
      console.error(error)
    }
  }

  const handleEdit = async () => {
    if (!editingId || !formData.title || !formData.description) {
      toast.error("Title and description are required")
      return
    }

    try {
      await updateMutation.mutateAsync({
        id: editingId,
        data: {
          title: formData.title,
          description: formData.description,
          link: formData.link || undefined,
          linkText: formData.linkText || undefined,
          dismissible: formData.dismissible,
          priority: formData.priority,
          startDate: formData.startDate || undefined,
          endDate: formData.endDate || undefined,
        },
      })
      toast.success("Announcement updated")
      setIsEditDialogOpen(false)
      setFormData(initialFormData)
      setEditingId(null)
    } catch (error) {
      toast.error("Failed to update announcement")
      console.error(error)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id)
      toast.success("Announcement deleted")
      setDeleteConfirmId(null)
    } catch (error) {
      toast.error("Failed to delete announcement")
      console.error(error)
    }
  }

  const handlePublish = async (id: string) => {
    try {
      await publishMutation.mutateAsync(id)
      toast.success("Announcement published")
    } catch (error) {
      toast.error("Failed to publish announcement")
      console.error(error)
    }
  }

  const handleArchive = async (id: string) => {
    try {
      await archiveMutation.mutateAsync(id)
      toast.success("Announcement archived")
    } catch (error) {
      toast.error("Failed to archive announcement")
      console.error(error)
    }
  }

  const openEditDialog = (announcement: Announcement) => {
    setEditingId(announcement.id)
    setFormData({
      title: announcement.title,
      description: announcement.description,
      link: announcement.link || "",
      linkText: announcement.linkText || "Learn More",
      dismissible: announcement.dismissible,
      priority: announcement.priority,
      startDate: announcement.startDate ? format(new Date(announcement.startDate), "yyyy-MM-dd'T'HH:mm") : "",
      endDate: announcement.endDate ? format(new Date(announcement.endDate), "yyyy-MM-dd'T'HH:mm") : "",
    })
    setIsEditDialogOpen(true)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'published':
        return <Badge className="bg-green-500">Published</Badge>
      case 'draft':
        return <Badge variant="secondary">Draft</Badge>
      case 'archived':
        return <Badge variant="outline">Archived</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 text-center">
            <AlertCircle className="h-12 w-12 text-amber-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-amber-800 mb-2">Wallet Not Connected</h2>
            <p className="text-amber-700">Please connect your wallet to access the announcements admin panel.</p>
          </div>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <X className="h-12 w-12 text-red-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-red-800 mb-2">Access Denied</h2>
            <p className="text-red-700">You are not an admin. Only admin addresses can access this panel.</p>
            <p className="text-sm text-red-600 mt-2">Your address: {address}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Megaphone className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold">Announcements Management</h1>
            </div>
            <p className="text-muted-foreground">
              Create and manage platform announcements
            </p>
          </div>

          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setFormData(initialFormData)}>
                <Plus className="h-4 w-4 mr-2" />
                New Announcement
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create Announcement</DialogTitle>
                <DialogDescription>
                  Create a new announcement. It will be saved as a draft.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Announcement title"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Announcement description"
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="link">Link (optional)</Label>
                    <Input
                      id="link"
                      value={formData.link}
                      onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                      placeholder="https://..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="linkText">Link Text</Label>
                    <Input
                      id="linkText"
                      value={formData.linkText}
                      onChange={(e) => setFormData({ ...formData, linkText: e.target.value })}
                      placeholder="Learn More"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startDate">Start Date (optional)</Label>
                    <Input
                      id="startDate"
                      type="datetime-local"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endDate">End Date (optional)</Label>
                    <Input
                      id="endDate"
                      type="datetime-local"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="priority">Priority (1-10)</Label>
                    <Input
                      id="priority"
                      type="number"
                      min="1"
                      max="10"
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 5 })}
                    />
                  </div>
                  <div className="flex items-center space-x-2 pt-8">
                    <input
                      type="checkbox"
                      id="dismissible"
                      checked={formData.dismissible}
                      onChange={(e) => setFormData({ ...formData, dismissible: e.target.checked })}
                    />
                    <Label htmlFor="dismissible">Dismissible</Label>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreate} disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Creating..." : "Create Draft"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Announcements</CardTitle>
            <CardDescription>
              Manage all announcements including drafts, published, and archived
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-center text-muted-foreground py-8">Loading announcements...</p>
            ) : !announcements || announcements.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No announcements yet</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Dates</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {announcements.map((announcement) => (
                    <TableRow key={announcement.id}>
                      <TableCell className="font-medium">
                        {announcement.title}
                        {announcement.link && (
                          <a
                            href={announcement.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary ml-2"
                          >
                            🔗
                          </a>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(announcement.status)}</TableCell>
                      <TableCell>{announcement.priority}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {announcement.startDate && (
                          <div>From: {format(new Date(announcement.startDate), 'MMM d, yyyy')}</div>
                        )}
                        {announcement.endDate && (
                          <div>To: {format(new Date(announcement.endDate), 'MMM d, yyyy')}</div>
                        )}
                        {!announcement.startDate && !announcement.endDate && (
                          <span>Always active</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(announcement.createdAt), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openEditDialog(announcement)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>

                          {announcement.status === 'draft' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handlePublish(announcement.id)}
                              disabled={publishMutation.isPending}
                            >
                              <Send className="h-4 w-4" />
                            </Button>
                          )}

                          {announcement.status === 'published' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleArchive(announcement.id)}
                              disabled={archiveMutation.isPending}
                            >
                              <Archive className="h-4 w-4" />
                            </Button>
                          )}

                          <Dialog open={deleteConfirmId === announcement.id} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
                            <DialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setDeleteConfirmId(announcement.id)}
                              >
                                <Trash className="h-4 w-4 text-red-500" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Delete Announcement</DialogTitle>
                                <DialogDescription>
                                  Are you sure you want to delete "{announcement.title}"? This action cannot be undone.
                                </DialogDescription>
                              </DialogHeader>
                              <DialogFooter>
                                <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
                                  Cancel
                                </Button>
                                <Button
                                  variant="destructive"
                                  onClick={() => handleDelete(announcement.id)}
                                  disabled={deleteMutation.isPending}
                                >
                                  {deleteMutation.isPending ? "Deleting..." : "Delete"}
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Announcement</DialogTitle>
              <DialogDescription>
                Update announcement details
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-title">Title *</Label>
                <Input
                  id="edit-title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Announcement title"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description">Description *</Label>
                <Textarea
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Announcement description"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-link">Link (optional)</Label>
                  <Input
                    id="edit-link"
                    value={formData.link}
                    onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-linkText">Link Text</Label>
                  <Input
                    id="edit-linkText"
                    value={formData.linkText}
                    onChange={(e) => setFormData({ ...formData, linkText: e.target.value })}
                    placeholder="Learn More"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-startDate">Start Date (optional)</Label>
                  <Input
                    id="edit-startDate"
                    type="datetime-local"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-endDate">End Date (optional)</Label>
                  <Input
                    id="edit-endDate"
                    type="datetime-local"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-priority">Priority (1-10)</Label>
                  <Input
                    id="edit-priority"
                    type="number"
                    min="1"
                    max="10"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 5 })}
                  />
                </div>
                <div className="flex items-center space-x-2 pt-8">
                  <input
                    type="checkbox"
                    id="edit-dismissible"
                    checked={formData.dismissible}
                    onChange={(e) => setFormData({ ...formData, dismissible: e.target.checked })}
                  />
                  <Label htmlFor="edit-dismissible">Dismissible</Label>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleEdit} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Updating..." : "Update"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
