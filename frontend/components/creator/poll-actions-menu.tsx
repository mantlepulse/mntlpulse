/**
 * Poll Actions Menu
 * Dropdown menu with actions for managing polls
 */

"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  MoreHorizontal,
  Eye,
  DollarSign,
  Edit,
  XCircle,
  Download,
  Copy,
} from "lucide-react";

interface PollActionsMenuProps {
  pollId: bigint;
  isActive: boolean;
  onViewDetails?: () => void;
  onFund?: () => void;
  onEdit?: () => void;
  onClose?: () => void;
  onExport?: () => void;
  onDuplicate?: () => void;
}

export function PollActionsMenu({
  pollId,
  isActive,
  onViewDetails,
  onFund,
  onEdit,
  onClose,
  onExport,
  onDuplicate,
}: PollActionsMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <span className="sr-only">Open menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {onViewDetails && (
          <DropdownMenuItem onClick={onViewDetails}>
            <Eye className="mr-2 h-4 w-4" />
            View Details
          </DropdownMenuItem>
        )}
        {isActive && onFund && (
          <DropdownMenuItem onClick={onFund}>
            <DollarSign className="mr-2 h-4 w-4" />
            Fund Poll
          </DropdownMenuItem>
        )}
        {isActive && onEdit && (
          <DropdownMenuItem onClick={onEdit}>
            <Edit className="mr-2 h-4 w-4" />
            Edit Poll
          </DropdownMenuItem>
        )}
        {onExport && (
          <DropdownMenuItem onClick={onExport}>
            <Download className="mr-2 h-4 w-4" />
            Export Data
          </DropdownMenuItem>
        )}
        {onDuplicate && (
          <DropdownMenuItem onClick={onDuplicate}>
            <Copy className="mr-2 h-4 w-4" />
            Duplicate Poll
          </DropdownMenuItem>
        )}
        {isActive && onClose && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onClose} className="text-destructive">
              <XCircle className="mr-2 h-4 w-4" />
              Close Poll
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
