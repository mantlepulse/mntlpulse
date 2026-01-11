"use client"

import { Database } from "lucide-react"
import { Button } from "@/components/ui/button"

export function DataSourceToggle() {
  // Subgraph disabled - always show Contract mode
  // Toggle functionality disabled until Mantle indexer is available

  return (
    <Button
      variant="outline"
      size="sm"
      className="h-9 gap-2 px-3 cursor-default"
      title="Using Smart Contract data (Subgraph currently unavailable)"
    >
      <Database className="h-4 w-4" />
      <span className="hidden sm:inline text-xs">Contract</span>
    </Button>
  )
}
