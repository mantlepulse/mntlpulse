"use client"

import { Database, Layers } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useDataSource } from "@/contexts/data-source-context"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export function DataSourceToggle() {
  const { dataSource, toggleDataSource, isSubgraph, isContract } = useDataSource()

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-2 px-3"
            onClick={toggleDataSource}
          >
            {isSubgraph ? (
              <>
                <Layers className="h-4 w-4" />
                <span className="hidden sm:inline text-xs">Subgraph</span>
              </>
            ) : (
              <>
                <Database className="h-4 w-4" />
                <span className="hidden sm:inline text-xs">Contract</span>
              </>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">
            {isSubgraph
              ? "Using Subgraph (indexed data, faster queries)"
              : "Using Smart Contract (direct on-chain data)"}
          </p>
          <p className="text-xs text-muted-foreground">Click to switch</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
