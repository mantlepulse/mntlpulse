/**
 * Sidebar Navigation Component
 * Permanent left sidebar with collapsible sections
 */

"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAccount } from "wagmi"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import {
  Home,
  LayoutDashboard,
  FileText,
  BarChart3,
  Settings,
  Shield,
  Megaphone,
  ChevronDown,
  ChevronRight,
  Menu,
  Wallet,
  ArrowLeftRight,
  ShoppingCart,
  Repeat,
  ListChecks,
} from "lucide-react"

interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  requiresAuth?: boolean
  requiresOwner?: boolean
  children?: NavItem[]
}

interface SidebarNavigationProps {
  isOwner?: boolean
}

export function SidebarNavigation({ isOwner = false }: SidebarNavigationProps) {
  const { isConnected } = useAccount()
  const pathname = usePathname()
  const [expandedSections, setExpandedSections] = useState<string[]>(["creator"])

  const toggleSection = (label: string) => {
    setExpandedSections((prev) =>
      prev.includes(label) ? prev.filter((s) => s !== label) : [...prev, label]
    )
  }

  const navItems: NavItem[] = [
    {
      label: "Home",
      href: "/",
      icon: Home,
    },
    {
      label: "Dapp",
      href: "/dapp",
      icon: LayoutDashboard,
    },
    {
      label: "Bridge",
      href: "https://bridge.base.org",
      icon: ArrowLeftRight,
    },
    {
      label: "Buy PULSE",
      href: "/buy-pulse",
      icon: ShoppingCart,
    },
    {
      label: "Wallet",
      href: "/wallet",
      icon: Wallet,
      requiresAuth: true,
    },
    {
      label: "My Shifts",
      href: "/dapp/shifts",
      icon: Repeat,
      requiresAuth: true,
    },
    {
      label: "Creator",
      href: "/creator",
      icon: FileText,
      requiresAuth: true,
      children: [
        {
          label: "Dashboard",
          href: "/creator",
          icon: BarChart3,
        },
        {
          label: "Manage Polls",
          href: "/creator?tab=manage",
          icon: FileText,
        },
        {
          label: "Questionnaires",
          href: "/creator/questionnaires",
          icon: ListChecks,
        },
        {
          label: "Distributions",
          href: "/creator?tab=distributions",
          icon: BarChart3,
        },
      ],
    },
    {
      label: "Settings",
      href: "/settings",
      icon: Settings,
      requiresAuth: true,
    },
    {
      label: "Admin",
      href: "/admin",
      icon: Shield,
      requiresOwner: true,
    },
    {
      label: "Announcements",
      href: "/admin/announcements",
      icon: Megaphone,
      requiresOwner: true,
    },
  ]

  const filteredNavItems = navItems.filter((item) => {
    if (item.requiresOwner && !isOwner) return false
    if (item.requiresAuth && !isConnected) return false
    return true
  })

  const renderNavItem = (item: NavItem, isChild = false) => {
    const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
    const hasChildren = item.children && item.children.length > 0
    const isExpanded = expandedSections.includes(item.label.toLowerCase())
    const Icon = item.icon

    if (item.href.startsWith("http")) {
      return (
        <a
          key={item.label}
          href={item.href}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
            "hover:bg-accent hover:text-accent-foreground",
            isChild && "pl-9",
            isActive && "bg-accent text-accent-foreground font-medium"
          )}
        >
          <Icon className="h-4 w-4" />
          <span>{item.label}</span>
        </a>
      )
    }

    if (hasChildren) {
      return (
        <div key={item.label}>
          <button
            onClick={() => toggleSection(item.label.toLowerCase())}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
              "hover:bg-accent hover:text-accent-foreground",
              isActive && "bg-accent text-accent-foreground font-medium"
            )}
          >
            <Icon className="h-4 w-4" />
            <span className="flex-1 text-left">{item.label}</span>
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
          {isExpanded && (
            <div className="mt-1 space-y-1">
              {item.children?.map((child) => renderNavItem(child, true))}
            </div>
          )}
        </div>
      )
    }

    return (
      <Link
        key={item.label}
        href={item.href}
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
          "hover:bg-accent hover:text-accent-foreground",
          isChild && "pl-9",
          isActive && "bg-accent text-accent-foreground font-medium"
        )}
      >
        <Icon className="h-4 w-4" />
        <span>{item.label}</span>
      </Link>
    )
  }

  const SidebarContent = () => (
    <div className="flex h-full flex-col gap-2">
      <div className="flex h-14 items-center border-b px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="text-xl">MantlePulse</span>
        </Link>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {filteredNavItems.map((item) => renderNavItem(item))}
      </nav>
    </div>
  )

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-60 lg:flex-col border-r bg-background">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar */}
      <Sheet>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden fixed top-4 left-4 z-50"
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-60 p-0">
          <SidebarContent />
        </SheetContent>
      </Sheet>
    </>
  )
}
