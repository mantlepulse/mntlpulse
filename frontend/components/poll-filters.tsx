"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Search, Filter, X } from "lucide-react"
import { useState } from "react"

interface FilterState {
  search: string
  status: string
  category: string
  fundingType: string
  sortBy: string
}

interface PollFiltersProps {
  filters: FilterState
  onFiltersChange: (filters: FilterState) => void
}

const categories = ["All Categories", "Governance", "Community", "Product", "Events", "General"]

const statuses = ["All Status", "Active", "Ended", "Upcoming"]

const fundingTypes = ["All Funding", "Self-funded", "Community", "No rewards"]

const sortOptions = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "most-votes", label: "Most Votes" },
  { value: "highest-reward", label: "Highest Reward" },
  { value: "ending-soon", label: "Ending Soon" },
]

export function PollFilters({ filters, onFiltersChange }: PollFiltersProps) {
  const [showAdvanced, setShowAdvanced] = useState(false)

  const updateFilter = (key: keyof FilterState, value: string) => {
    onFiltersChange({ ...filters, [key]: value })
  }

  const clearFilters = () => {
    onFiltersChange({
      search: "",
      status: "All Status",
      category: "All Categories",
      fundingType: "All Funding",
      sortBy: "newest",
    })
  }

  const hasActiveFilters =
    filters.search ||
    filters.status !== "All Status" ||
    filters.category !== "All Categories" ||
    filters.fundingType !== "All Funding"

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search polls..."
            value={filters.search}
            onChange={(e) => updateFilter("search", e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          {/* Sort dropdown - always visible */}
          <Select value={filters.sortBy} onValueChange={(value) => updateFilter("sortBy", value)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              {sortOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => setShowAdvanced(!showAdvanced)}>
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
          {hasActiveFilters && (
            <Button variant="outline" size="sm" onClick={clearFilters}>
              <X className="h-4 w-4 mr-2" />
              Clear
            </Button>
          )}
        </div>
      </div>

      {showAdvanced && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 border rounded-lg bg-muted/30">
          <div className="space-y-2">
            <label className="text-sm font-medium">Status</label>
            <Select value={filters.status} onValueChange={(value) => updateFilter("status", value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statuses.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Category</label>
            <Select value={filters.category} onValueChange={(value) => updateFilter("category", value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Funding</label>
            <Select value={filters.fundingType} onValueChange={(value) => updateFilter("fundingType", value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {fundingTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          {filters.search && (
            <Badge variant="secondary" className="gap-1">
              Search: {filters.search}
              <X className="h-3 w-3 cursor-pointer" onClick={() => updateFilter("search", "")} />
            </Badge>
          )}
          {filters.status !== "All Status" && (
            <Badge variant="secondary" className="gap-1">
              {filters.status}
              <X className="h-3 w-3 cursor-pointer" onClick={() => updateFilter("status", "All Status")} />
            </Badge>
          )}
          {filters.category !== "All Categories" && (
            <Badge variant="secondary" className="gap-1">
              {filters.category}
              <X className="h-3 w-3 cursor-pointer" onClick={() => updateFilter("category", "All Categories")} />
            </Badge>
          )}
          {filters.fundingType !== "All Funding" && (
            <Badge variant="secondary" className="gap-1">
              {filters.fundingType}
              <X className="h-3 w-3 cursor-pointer" onClick={() => updateFilter("fundingType", "All Funding")} />
            </Badge>
          )}
        </div>
      )}
    </div>
  )
}
