/**
 * Data Source Context
 * Manages data source preference (subgraph vs contract) with localStorage persistence
 */

"use client"

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react"

export type DataSource = "contract" | "subgraph"

interface DataSourceContextType {
  dataSource: DataSource
  setDataSource: (source: DataSource) => void
  toggleDataSource: () => void
  isSubgraph: boolean
  isContract: boolean
}

const STORAGE_KEY = "mantlepulse-data-source"
const DEFAULT_SOURCE: DataSource = (process.env.NEXT_PUBLIC_DEFAULT_DATA_SOURCE as DataSource) || "contract"

const DataSourceContext = createContext<DataSourceContextType | undefined>(undefined)

export function DataSourceProvider({ children }: { children: ReactNode }) {
  const [dataSource, setDataSourceState] = useState<DataSource>(DEFAULT_SOURCE)
  const [mounted, setMounted] = useState(false)

  // Load initial state from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === "contract" || stored === "subgraph") {
      setDataSourceState(stored)
    }
    setMounted(true)
  }, [])

  // Save state to localStorage whenever it changes
  useEffect(() => {
    if (mounted) {
      localStorage.setItem(STORAGE_KEY, dataSource)
    }
  }, [dataSource, mounted])

  const setDataSource = useCallback((source: DataSource) => {
    setDataSourceState(source)
  }, [])

  const toggleDataSource = useCallback(() => {
    setDataSourceState(prev => prev === "contract" ? "subgraph" : "contract")
  }, [])

  const value: DataSourceContextType = {
    dataSource,
    setDataSource,
    toggleDataSource,
    isSubgraph: dataSource === "subgraph",
    isContract: dataSource === "contract",
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
