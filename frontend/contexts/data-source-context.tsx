/**
 * Data Source Context
 * Currently forced to contract-only mode (subgraph disabled until Mantle indexer is available)
 */

"use client"

import { createContext, useContext, ReactNode } from "react"

export type DataSource = "contract" | "subgraph"

interface DataSourceContextType {
  dataSource: DataSource
  setDataSource: (source: DataSource) => void
  toggleDataSource: () => void
  isSubgraph: boolean
  isContract: boolean
  isSubgraphDisabled: boolean // New flag to indicate subgraph is disabled
}

const DataSourceContext = createContext<DataSourceContextType | undefined>(undefined)

export function DataSourceProvider({ children }: { children: ReactNode }) {
  // Force contract-only mode - subgraph disabled until Mantle indexer is available
  const dataSource: DataSource = "contract"

  // No-op functions since we're forcing contract mode
  const setDataSource = () => {
    console.warn("Subgraph is currently disabled. Using contract data source only.")
  }

  const toggleDataSource = () => {
    console.warn("Subgraph is currently disabled. Using contract data source only.")
  }

  const value: DataSourceContextType = {
    dataSource,
    setDataSource,
    toggleDataSource,
    isSubgraph: false,
    isContract: true,
    isSubgraphDisabled: true,
  }

  return (
    <DataSourceContext.Provider value={value}>
      {children}
    </DataSourceContext.Provider>
  )
}

export function useDataSource() {
  const context = useContext(DataSourceContext)
  if (context === undefined) {
    throw new Error("useDataSource must be used within a DataSourceProvider")
  }
  return context
}
