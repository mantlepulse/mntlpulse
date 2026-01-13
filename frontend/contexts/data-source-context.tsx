/**
 * Data Source Context
 * Allows switching between contract-direct and subgraph data sources
 */

"use client"

import { createContext, useContext, useState, ReactNode, useEffect } from "react"

export type DataSource = "contract" | "subgraph"

interface DataSourceContextType {
  dataSource: DataSource
  setDataSource: (source: DataSource) => void
  toggleDataSource: () => void
  isSubgraph: boolean
  isContract: boolean
  isSubgraphDisabled: boolean
}

const DataSourceContext = createContext<DataSourceContextType | undefined>(undefined)

// Key for localStorage persistence
const DATA_SOURCE_STORAGE_KEY = "mntlpulse-data-source"

export function DataSourceProvider({ children }: { children: ReactNode }) {
  // Initialize from localStorage or environment variable
  const [dataSource, setDataSourceState] = useState<DataSource>(() => {
    // Default to environment variable or "contract"
    const envDefault = process.env.NEXT_PUBLIC_DEFAULT_DATA_SOURCE as DataSource
    return envDefault === "subgraph" ? "subgraph" : "contract"
  })

  // Load from localStorage on mount (client-side only)
  useEffect(() => {
    const stored = localStorage.getItem(DATA_SOURCE_STORAGE_KEY)
    if (stored === "subgraph" || stored === "contract") {
      setDataSourceState(stored)
    }
  }, [])

  const setDataSource = (source: DataSource) => {
    setDataSourceState(source)
    localStorage.setItem(DATA_SOURCE_STORAGE_KEY, source)
    console.log(`[DataSource] Switched to ${source}`)
  }

  const toggleDataSource = () => {
    const newSource = dataSource === "contract" ? "subgraph" : "contract"
    setDataSource(newSource)
  }

  const value: DataSourceContextType = {
    dataSource,
    setDataSource,
    toggleDataSource,
    isSubgraph: dataSource === "subgraph",
    isContract: dataSource === "contract",
    isSubgraphDisabled: false, // Subgraph is now enabled
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
