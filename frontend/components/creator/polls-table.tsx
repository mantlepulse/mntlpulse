/**
 * Polls Table
 * Data table showing all polls created by the user
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PollActionsMenu } from "./poll-actions-menu";
import { Search, Filter } from "lucide-react";
import { formatEther } from "viem";

interface Poll {
  id: bigint;
  question: string;
  isActive: boolean;
  totalVotes: bigint;
  totalFunding: bigint;
  endTime: bigint;
}

interface PollsTableProps {
  polls: Poll[];
  isLoading?: boolean;
  onFundPoll?: (pollId: bigint) => void;
  onClosePoll?: (pollId: bigint) => void;
  onExportPoll?: (pollId: bigint) => void;
}

export function PollsTable({
  polls,
  isLoading = false,
  onFundPoll,
  onClosePoll,
  onExportPoll,
}: PollsTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "closed">("all");

  const filteredPolls = polls.filter((poll) => {
    const matchesSearch = poll.question
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && poll.isActive) ||
      (statusFilter === "closed" && !poll.isActive);
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (isActive: boolean, endTime: bigint) => {
    const now = BigInt(Math.floor(Date.now() / 1000));
    if (!isActive) {
      return <Badge variant="secondary">Closed</Badge>;
    }
    if (endTime < now) {
      return <Badge variant="outline">Ended</Badge>;
    }
    return <Badge variant="default">Active</Badge>;
  };

  const formatReward = (amount: bigint) => {
    if (amount === BigInt(0)) {
      return "0 ETH";
    }
    const formatted = parseFloat(formatEther(amount)).toFixed(4);
    return `${formatted} ETH`;
  };

  const exportToCSV = (pollId: bigint) => {
    const poll = polls.find((p) => p.id === pollId);
    if (!poll) return;

    const csvContent = [
      ["Poll ID", "Question", "Status", "Total Votes", "Total Funding"],
      [
        poll.id.toString(),
        poll.question,
        poll.isActive ? "Active" : "Closed",
        poll.totalVotes.toString(),
        formatReward(poll.totalFunding),
      ],
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `poll-${pollId}-data.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>My Polls</CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search polls..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 w-[200px]"
              />
            </div>
            <div className="flex gap-1">
              <Button
                variant={statusFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("all")}
              >
                All
              </Button>
              <Button
                variant={statusFilter === "active" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("active")}
              >
                Active
              </Button>
              <Button
                variant={statusFilter === "closed" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("closed")}
              >
                Closed
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 w-full animate-pulse rounded bg-muted" />
            ))}
          </div>
        ) : filteredPolls.length === 0 ? (
          <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
            {searchQuery || statusFilter !== "all"
              ? "No polls match your filters"
              : "No polls created yet"}
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Poll Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Responses</TableHead>
                  <TableHead className="text-right">Reward</TableHead>
                  <TableHead className="w-[70px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPolls.map((poll) => (
                  <TableRow key={poll.id.toString()}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/dapp/${poll.id}`}
                        className="hover:underline"
                      >
                        {poll.question}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(poll.isActive, poll.endTime)}
                    </TableCell>
                    <TableCell className="text-right">
                      {poll.totalVotes.toString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatReward(poll.totalFunding)}
                    </TableCell>
                    <TableCell>
                      <PollActionsMenu
                        pollId={poll.id}
                        isActive={poll.isActive}
                        onViewDetails={() =>
                          window.open(`/dapp/${poll.id}`, "_blank")
                        }
                        onFund={onFundPoll ? () => onFundPoll(poll.id) : undefined}
                        onClose={
                          onClosePoll ? () => onClosePoll(poll.id) : undefined
                        }
                        onExport={() => exportToCSV(poll.id)}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
