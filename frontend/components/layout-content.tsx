/**
 * Layout Content Component
 * Handles the fixed header + sidebar + main content layout structure
 */

"use client"

import { usePathname } from "next/navigation"
import { FixedHeader } from "@/components/fixed-header"
import { NewSidebar } from "@/components/new-sidebar"
import { AIChatbox } from "@/components/ai-chatbox/ai-chatbox"
import { useSidebar } from "@/contexts/sidebar-context"
import { cn } from "@/lib/utils"

interface LayoutContentProps {
  children: React.ReactNode
}

export function LayoutContent({ children }: LayoutContentProps) {
  const { isCollapsed } = useSidebar()
  const pathname = usePathname()

  // Show sidebar on creator, participant, and donor pages
  const showSidebar = pathname?.startsWith("/creator") || pathname?.startsWith("/participant") || pathname?.startsWith("/donor")

  return (
    <div className="flex min-h-screen flex-col">
      {/* Fixed Header */}
      <FixedHeader />

      {/* Content Area (Sidebar + Main) */}
      <div className="flex flex-1 pt-16">
        {/* Sidebar - Only show on creator, participant, and donor pages */}
        {showSidebar && <NewSidebar />}

        {/* Main Content */}
        <main
          className={cn(
            "flex-1 overflow-y-auto transition-all duration-300",
            showSidebar
              ? isCollapsed
                ? "ml-16"
                : "ml-64"
              : "ml-0"
          )}
        >
          {children}
        </main>
      </div>

      {/* AI Chatbox - Floating component */}
      <AIChatbox />
    </div>
  )
}
