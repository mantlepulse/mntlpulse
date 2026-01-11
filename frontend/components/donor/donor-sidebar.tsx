/**
 * Donor Sidebar Component
 * Sidebar navigation for donor-specific actions
 */

"use client"

import { useState, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import {
  Search,
  Wallet,
  History,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Filter,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

interface DonorSidebarProps {
  activeFundingCount?: number
}

export function DonorSidebar({ activeFundingCount = 0 }: DonorSidebarProps) {
  const router = useRouter()
  const pathname = usePathname()

  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("donor-sidebar-collapsed") === "true"
    }
    return false
  })

  // Persist collapse state
  useEffect(() => {
    localStorage.setItem("donor-sidebar-collapsed", String(collapsed))
  }, [collapsed])

  const menuItems = [
    {
      label: "Explore Polls",
      icon: Search,
      href: "/donor/explore",
      description: "Find polls to fund",
    },
    {
      label: "Funded Polls",
      icon: Wallet,
      href: "/donor/funded",
      description: "View your funded polls",
      badge: activeFundingCount > 0 ? activeFundingCount : undefined,
    },
    {
      label: "Funding History",
      icon: History,
      href: "/donor/history",
      description: "View past funding",
    },
    {
      label: "Trending Polls",
      icon: TrendingUp,
      href: "/donor/trending",
      description: "Hot polls to fund",
    },
  ]

  if (collapsed) {
    return (
      <div className="flex flex-col items-center gap-2 p-2 border-r bg-muted/30">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(false)}
          className="shrink-0"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <div className="flex flex-col gap-2 mt-4">
          {menuItems.map((item) => {
            const Icon = item.icon
            return (
              <Button
                key={item.href}
                variant="ghost"
                size="icon"
                onClick={() => router.push(item.href)}
                className={cn(
                  "relative",
                  pathname === item.href && "bg-accent"
                )}
                title={item.label}
              >
                <Icon className="h-4 w-4" />
                {item.badge && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[10px] font-bold text-primary-foreground flex items-center justify-center">
                    {item.badge}
                  </span>
                )}
              </Button>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <aside className="w-[280px] border-r bg-muted/30 flex flex-col shrink-0">
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between">
        <h2 className="font-semibold text-sm">Donor Actions</h2>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => setCollapsed(true)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>

      {/* Navigation Menu */}
      <ScrollArea className="flex-1 p-2">
        <div className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href

            return (
              <button
                key={item.href}
                onClick={() => router.push(item.href)}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-lg transition-all cursor-pointer text-left",
                  "hover:bg-accent/50",
                  isActive && "bg-accent border border-primary/20"
                )}
              >
                <Icon className={cn(
                  "h-5 w-5 shrink-0",
                  isActive ? "text-primary" : "text-muted-foreground"
                )} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className={cn(
                      "text-sm font-medium truncate",
                      isActive && "text-primary"
                    )}>
                      {item.label}
                    </span>
                    {item.badge && (
                      <Badge variant="default" className="text-xs">
                        {item.badge}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {item.description}
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      </ScrollArea>

      {/* Quick Filter Section */}
      <div className="p-4 border-t">
        <Button
          variant="outline"
          className="w-full justify-start"
          onClick={() => router.push("/donor/explore")}
        >
          <Filter className="h-4 w-4 mr-2" />
          Filter Polls
        </Button>
      </div>
    </aside>
  )
}
