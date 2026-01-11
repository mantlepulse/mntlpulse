"use client"

import { Database, Cloud } from "lucide-react"
import { useDataSource } from "@/contexts/data-source-context"
import { Button } from "@/components/ui/button"

export function DataSourceToggle() {
  const { toggleDataSource, isContract } = useDataSource()

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggleDataSource}
      className="h-9 gap-2 px-3"
      title={isContract ? "Using Smart Contract - Click for Subgraph" : "Using The Graph - Click for Contract"}
    >
      {isContract ? (
        <>
          <Database className="h-4 w-4" />
          <span className="hidden sm:inline text-xs">Contract</span>
        </>
      ) : (
        <>
          <Cloud className="h-4 w-4" />
          <span className="hidden sm:inline text-xs">Subgraph</span>
        </>
      )}
    </Button>
  )
}
