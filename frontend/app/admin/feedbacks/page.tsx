/**
 * Admin Feedbacks Page
 * View and manage user feedback, trigger on-chain snapshots
 */

'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { format } from 'date-fns';
import {
  AlertCircle,
  MessageSquare,
  Bug,
  Palette,
  HelpCircle,
  Trash,
  X,
  Loader2,
  Camera,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  useFeedbacks,
  useFeedbackStats,
  usePendingSnapshots,
  useUpdateFeedbackStatus,
  useDeleteFeedback,
} from '@/hooks/use-feedbacks';
import { FeedbackCategory, FeedbackStatus } from '@/lib/api/feedback-client';

const CATEGORY_CONFIG: Record<FeedbackCategory, { label: string; icon: React.ReactNode; color: string }> = {
  feature_request: {
    label: 'Feature Request',
    icon: <MessageSquare className="h-4 w-4" />,
    color: 'bg-blue-500',
  },
  bug_report: {
    label: 'Bug Report',
    icon: <Bug className="h-4 w-4" />,
    color: 'bg-red-500',
  },
  ui_ux: {
    label: 'UI/UX',
    icon: <Palette className="h-4 w-4" />,
    color: 'bg-purple-500',
  },
  general: {
    label: 'General',
    icon: <HelpCircle className="h-4 w-4" />,
    color: 'bg-gray-500',
  },
};

const STATUS_CONFIG: Record<FeedbackStatus, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  open: { label: 'Open', variant: 'default' },
  selected: { label: 'Selected', variant: 'secondary' },
  polled: { label: 'Polled', variant: 'outline' },
  closed: { label: 'Closed', variant: 'destructive' },
};

export default function AdminFeedbacksPage() {
  const { address, isConnected } = useAccount();
  const [statusFilter, setStatusFilter] = useState<FeedbackStatus | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<FeedbackCategory | 'all'>('all');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Check if user is admin
  const isAdmin = address && process.env.NEXT_PUBLIC_ADMIN_ADDRESSES?.split(',')
    .map(a => a.toLowerCase())
    .includes(address.toLowerCase());

  // Fetch data
  const { data: feedbacksData, isLoading: feedbacksLoading } = useFeedbacks({
    status: statusFilter === 'all' ? undefined : statusFilter,
    category: categoryFilter === 'all' ? undefined : categoryFilter,
    limit: 100,
  });
  const { data: stats, isLoading: statsLoading } = useFeedbackStats();
  const { data: pendingData } = usePendingSnapshots(50);

  // Mutations
  const updateStatusMutation = useUpdateFeedbackStatus();
  const deleteMutation = useDeleteFeedback();

  const handleStatusChange = async (id: string, newStatus: FeedbackStatus) => {
    try {
      await updateStatusMutation.mutateAsync({ id, status: newStatus });
      toast.success('Status updated');
    } catch {
      toast.error('Failed to update status');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
      toast.success('Feedback deleted');
      setDeleteConfirmId(null);
    } catch {
      toast.error('Failed to delete feedback');
    }
  };

  const feedbacks = feedbacksData?.feedbacks || [];
  const pendingCount = pendingData?.count || 0;

  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 text-center">
            <AlertCircle className="h-12 w-12 text-amber-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-amber-800 mb-2">Wallet Not Connected</h2>
            <p className="text-amber-700">Please connect your wallet to access the feedbacks admin panel.</p>
          </div>
        </div>
      </div>
    );
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
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Feedback Management</h1>
          </div>
          <p className="text-muted-foreground">
            View and manage user feedback, select for polls, and trigger on-chain snapshots
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{statsLoading ? '...' : stats?.total || 0}</div>
              <p className="text-xs text-muted-foreground">Total</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-600">{statsLoading ? '...' : stats?.open || 0}</div>
              <p className="text-xs text-muted-foreground">Open</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-blue-600">{statsLoading ? '...' : stats?.selected || 0}</div>
              <p className="text-xs text-muted-foreground">Selected</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-purple-600">{statsLoading ? '...' : stats?.polled || 0}</div>
              <p className="text-xs text-muted-foreground">Polled</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-gray-600">{statsLoading ? '...' : stats?.closed || 0}</div>
              <p className="text-xs text-muted-foreground">Closed</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-amber-600">{statsLoading ? '...' : stats?.pending || 0}</div>
              <p className="text-xs text-muted-foreground">Pending Snapshot</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-emerald-600">{statsLoading ? '...' : stats?.snapshotted || 0}</div>
              <p className="text-xs text-muted-foreground">Snapshotted</p>
            </CardContent>
          </Card>
        </div>

        {/* Snapshot Alert */}
        {pendingCount > 0 && (
          <Card className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Camera className="h-8 w-8 text-amber-600" />
                  <div>
                    <h3 className="font-semibold text-amber-800 dark:text-amber-200">
                      {pendingCount} feedbacks pending snapshot
                    </h3>
                    <p className="text-sm text-amber-700 dark:text-amber-300">
                      These feedbacks have not been recorded on-chain yet
                    </p>
                  </div>
                </div>
                <Button variant="outline" disabled>
                  <Camera className="h-4 w-4 mr-2" />
                  Snapshot (Coming Soon)
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Feedbacks Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>All Feedbacks</CardTitle>
                <CardDescription>
                  Filter and manage feedback submissions
                </CardDescription>
              </div>
              <div className="flex gap-4">
                <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as FeedbackStatus | 'all')}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="selected">Selected</SelectItem>
                    <SelectItem value="polled">Polled</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as FeedbackCategory | 'all')}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="feature_request">Feature Request</SelectItem>
                    <SelectItem value="bug_report">Bug Report</SelectItem>
                    <SelectItem value="ui_ux">UI/UX</SelectItem>
                    <SelectItem value="general">General</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {feedbacksLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : feedbacks.length === 0 ? (
              <p className="text-center text-muted-foreground py-12">No feedbacks found</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Category</TableHead>
                    <TableHead>Content</TableHead>
                    <TableHead className="w-[100px]">Status</TableHead>
                    <TableHead className="w-[100px]">Snapshot</TableHead>
                    <TableHead className="w-[120px]">Created</TableHead>
                    <TableHead className="w-[140px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {feedbacks.map((feedback) => (
                    <TableRow key={feedback.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className={`p-1 rounded ${CATEGORY_CONFIG[feedback.category].color}`}>
                            {CATEGORY_CONFIG[feedback.category].icon}
                          </div>
                          <span className="text-xs">{CATEGORY_CONFIG[feedback.category].label}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-md">
                          <p className="text-sm line-clamp-2">{feedback.content}</p>
                          {!feedback.isAnonymous && feedback.walletAddress && (
                            <p className="text-xs text-muted-foreground mt-1 font-mono">
                              {feedback.walletAddress.slice(0, 6)}...{feedback.walletAddress.slice(-4)}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={feedback.status}
                          onValueChange={(v) => handleStatusChange(feedback.id, v as FeedbackStatus)}
                          disabled={updateStatusMutation.isPending}
                        >
                          <SelectTrigger className="w-[100px] h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="open">Open</SelectItem>
                            <SelectItem value="selected">Selected</SelectItem>
                            <SelectItem value="polled">Polled</SelectItem>
                            <SelectItem value="closed">Closed</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        {feedback.snapshotTxHash ? (
                          <a
                            href={`https://basescan.org/tx/${feedback.snapshotTxHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-green-600 hover:underline"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          <Badge variant="outline" className="text-amber-600">Pending</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(feedback.createdAt), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell className="text-right">
                        <Dialog
                          open={deleteConfirmId === feedback.id}
                          onOpenChange={(open) => !open && setDeleteConfirmId(null)}
                        >
                          <DialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setDeleteConfirmId(feedback.id)}
                            >
                              <Trash className="h-4 w-4 text-red-500" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Delete Feedback</DialogTitle>
                              <DialogDescription>
                                Are you sure you want to delete this feedback? This action cannot be undone.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="py-4">
                              <p className="text-sm text-muted-foreground line-clamp-3">
                                "{feedback.content}"
                              </p>
                            </div>
                            <DialogFooter>
                              <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
                                Cancel
                              </Button>
                              <Button
                                variant="destructive"
                                onClick={() => handleDelete(feedback.id)}
                                disabled={deleteMutation.isPending}
                              >
                                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
