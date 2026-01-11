/**
 * New Sidebar Navigation Component
 * Context-aware sidebar that adapts based on current route (creator vs participant)
 */

"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  FolderKanban,
  ClipboardList,
  BarChart3,
  Coins,
  Droplet,
  TrendingUp,
  Download,
  Settings,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  FileEdit,
  ArrowLeftRight,
  Trophy,
  Sparkles,
  Shield,
  Award,
  History,
  Home,
  Users,
  Wallet,
  Search,
  Target,
  ListChecks,
} from "lucide-react"
import { useSidebar } from "@/contexts/sidebar-context"

interface SidebarItemProps {
  icon: React.ComponentType<{ className?: string }>
  label: string
  href: string
  count?: number
  isCollapsed: boolean
  isActive?: boolean
}

function SidebarItem({
  icon: Icon,
  label,
  href,
  count,
  isCollapsed,
  isActive,
}: SidebarItemProps) {
  const content = (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:bg-accent",
        isActive && "bg-accent text-accent-foreground font-medium",
        isCollapsed && "justify-center px-2"
      )}
    >
      <Icon className={cn("h-5 w-5 flex-shrink-0", isCollapsed && "h-6 w-6")} />
      {!isCollapsed && (
        <>
          <span className="flex-1">{label}</span>
          {count !== undefined && (
            <Badge variant="secondary" className="ml-auto">
              {count}
            </Badge>
          )}
        </>
      )}
    </Link>
  )

  if (isCollapsed) {
    return (
      <TooltipProvider>
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent side="right" className="flex items-center gap-2">
            {label}
            {count !== undefined && <Badge variant="secondary">{count}</Badge>}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return content
}

interface SidebarSectionProps {
  title: string
  items: Array<{
    icon: React.ComponentType<{ className?: string }>
    label: string
    href: string
    count?: number
  }>
  isCollapsed: boolean
  pathname: string
}

function SidebarSection({ title, items, isCollapsed, pathname }: SidebarSectionProps) {
  if (items.length === 0) return null

  return (
    <div>
      {!isCollapsed && (
        <div className="px-3 py-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {title}
          </h2>
        </div>
      )}
      <div className="space-y-1">
        {items.map((item) => (
          <SidebarItem
            key={item.href}
            {...item}
            isCollapsed={isCollapsed}
            isActive={pathname === item.href || pathname.startsWith(item.href + "/")}
          />
        ))}
      </div>
    </div>
  )
}

export function NewSidebar() {
  const pathname = usePathname()
  const { isCollapsed, toggleSidebar } = useSidebar()

  // Determine current context based on route
  const isCreatorContext = pathname.startsWith("/creator")
  const isParticipantContext = pathname.startsWith("/participant")
  const isDonorContext = pathname.startsWith("/donor")
  const isDefaultContext = !isCreatorContext && !isParticipantContext && !isDonorContext

  // TODO: Replace with real data
  const projectsCount = 1
  const surveysCount = 0
  const pollsCount = 20

  // Default navigation (shown on main pages)
  const mainSections = [
    {
      icon: FolderKanban,
      label: "Projects",
      href: "/projects",
      count: projectsCount,
    },
    {
      icon: ClipboardList,
      label: "Surveys",
      href: "/surveys",
      count: surveysCount,
    },
    {
      icon: BarChart3,
      label: "Polls",
      href: "/dapp",
      count: pollsCount,
    },
  ]

  // Creator-specific navigation
  const creatorNavItems = [
    {
      icon: LayoutDashboard,
      label: "Dashboard",
      href: "/creator",
    },
    {
      icon: FileEdit,
      label: "Manage Polls",
      href: "/creator/manage",
    },
    {
      icon: ListChecks,
      label: "Questionnaires",
      href: "/creator/questionnaires",
    },
    {
      icon: ArrowLeftRight,
      label: "Distributions",
      href: "/creator/distributions",
    },
    {
      icon: Trophy,
      label: "Quests",
      href: "/creator/quests",
    },
  ]

  // Participant-specific navigation
  const participantNavItems = [
    {
      icon: LayoutDashboard,
      label: "Dashboard",
      href: "/participant",
    },
    {
      icon: Sparkles,
      label: "Quests",
      href: "/participant/quests",
    },
    {
      icon: Trophy,
      label: "My Points",
      href: "/participant/points",
    },
    {
      icon: Shield,
      label: "Membership",
      href: "/participant/membership",
    },
    {
      icon: History,
      label: "Rewards History",
      href: "/participant/rewards",
    },
  ]

  // Donor-specific navigation
  const donorNavItems = [
    {
      icon: LayoutDashboard,
      label: "Dashboard",
      href: "/donor",
    },
    {
      icon: Search,
      label: "Explore Polls",
      href: "/donor/explore",
    },
    {
      icon: Wallet,
      label: "Funded Polls",
      href: "/donor/funded",
    },
    {
      icon: History,
      label: "Funding History",
      href: "/donor/history",
    },
    {
      icon: Target,
      label: "Trending",
      href: "/donor/trending",
    },
  ]

  // Quick links to switch context
  const contextSwitchItems = [
    {
      icon: Home,
      label: "Home",
      href: "/",
    },
    {
      icon: Users,
      label: "Participate",
      href: "/participant/quests",
    },
    {
      icon: LayoutDashboard,
      label: "Creator Dashboard",
      href: "/creator",
    },
  ]

  // Quick actions (shown in all contexts)
  const quickActions = [
    {
      icon: Coins,
      label: "Token Stats",
      href: "/token-stats",
    },
    {
      icon: TrendingUp,
      label: "Analytics",
      href: "/analytics",
    },
    {
      icon: Settings,
      label: "Settings",
      href: "/settings",
    },
  ]

  return (
    <aside
      className={cn(
        "fixed left-0 top-16 z-40 h-[calc(100vh-4rem)] border-r bg-background transition-all duration-300",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      <div className="flex h-full flex-col">
        {/* Sidebar Content */}
        <div className="flex-1 space-y-4 overflow-y-auto p-3">

          {/* Creator Context Navigation */}
          {isCreatorContext && (
            <>
              <SidebarSection
                title="Creator"
                items={creatorNavItems}
                isCollapsed={isCollapsed}
                pathname={pathname}
              />

              {/* Switch to other contexts */}
              <SidebarSection
                title="Switch To"
                items={[
                  { icon: Home, label: "Home", href: "/" },
                  { icon: Sparkles, label: "Participant View", href: "/participant/quests" },
                  { icon: Wallet, label: "Donor Dashboard", href: "/donor" },
                ]}
                isCollapsed={isCollapsed}
                pathname={pathname}
              />
            </>
          )}

          {/* Participant Context Navigation */}
          {isParticipantContext && (
            <>
              <SidebarSection
                title="Participant"
                items={participantNavItems}
                isCollapsed={isCollapsed}
                pathname={pathname}
              />

              {/* Switch to other contexts */}
              <SidebarSection
                title="Switch To"
                items={[
                  { icon: Home, label: "Home", href: "/" },
                  { icon: LayoutDashboard, label: "Creator Dashboard", href: "/creator" },
                  { icon: Wallet, label: "Donor Dashboard", href: "/donor" },
                ]}
                isCollapsed={isCollapsed}
                pathname={pathname}
              />
            </>
          )}

          {/* Donor Context Navigation */}
          {isDonorContext && (
            <>
              <SidebarSection
                title="Donor"
                items={donorNavItems}
                isCollapsed={isCollapsed}
                pathname={pathname}
              />

              {/* Switch to other contexts */}
              <SidebarSection
                title="Switch To"
                items={[
                  { icon: Home, label: "Home", href: "/" },
                  { icon: LayoutDashboard, label: "Creator Dashboard", href: "/creator" },
                  { icon: Sparkles, label: "Participant View", href: "/participant/quests" },
                ]}
                isCollapsed={isCollapsed}
                pathname={pathname}
              />
            </>
          )}

          {/* Default Context Navigation (main pages) */}
          {isDefaultContext && (
            <>
              {/* Main Sections */}
              <div className="space-y-1">
                {mainSections.map((item) => (
                  <SidebarItem
                    key={item.href}
                    {...item}
                    isCollapsed={isCollapsed}
                    isActive={pathname === item.href || pathname.startsWith(item.href + "/")}
                  />
                ))}
              </div>

              {/* Participate Section */}
              <SidebarSection
                title="Participate"
                items={[
                  { icon: Sparkles, label: "Quests", href: "/participant/quests" },
                ]}
                isCollapsed={isCollapsed}
                pathname={pathname}
              />

              {/* Creator Section */}
              <SidebarSection
                title="Creator"
                items={creatorNavItems}
                isCollapsed={isCollapsed}
                pathname={pathname}
              />

              {/* Donor Section */}
              <SidebarSection
                title="Donor"
                items={[
                  { icon: Wallet, label: "Donor Dashboard", href: "/donor" },
                ]}
                isCollapsed={isCollapsed}
                pathname={pathname}
              />
            </>
          )}

          {/* Quick Actions - shown in all contexts */}
          <SidebarSection
            title="Quick Actions"
            items={quickActions}
            isCollapsed={isCollapsed}
            pathname={pathname}
          />
        </div>

        {/* Toggle Button */}
        <div className="border-t p-3">
          <Button
            variant="ghost"
            size="sm"
            className={cn("w-full", isCollapsed && "px-2")}
            onClick={toggleSidebar}
          >
            {isCollapsed ? (
              <ChevronRight className="h-5 w-5" />
            ) : (
              <>
                <ChevronLeft className="mr-2 h-5 w-5" />
                <span>Collapse</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </aside>
  )
}
