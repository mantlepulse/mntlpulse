/**
 * Creator Breadcrumb Component
 * Auto-generates breadcrumb navigation for creator pages
 */

"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { Home } from "lucide-react"
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

export function CreatorBreadcrumb() {
  const pathname = usePathname()

  // Determine current page based on pathname
  const getCurrentPage = () => {
    if (pathname === "/creator") {
      return "Dashboard"
    } else if (pathname === "/creator/manage") {
      return "Manage Polls"
    } else if (pathname === "/creator/distributions") {
      return "Distribution History"
    } else if (pathname === "/creator/quests") {
      return "Quests"
    } else if (pathname === "/creator/quests/create") {
      return "Create Quest"
    } else if (pathname === "/creator/projects") {
      return "Projects"
    } else if (pathname === "/creator/projects/create") {
      return "Create Project"
    } else if (pathname.startsWith("/creator/projects/")) {
      return "Project Details"
    }
    return "Creator"
  }

  const currentPage = getCurrentPage()
  const isMainCreatorPage = pathname === "/creator"

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href="/" className="flex items-center gap-1">
              <Home className="h-3.5 w-3.5" />
              <span>Home</span>
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          {isMainCreatorPage ? (
            <BreadcrumbPage>Creator</BreadcrumbPage>
          ) : (
            <BreadcrumbLink asChild>
              <Link href="/creator">Creator</Link>
            </BreadcrumbLink>
          )}
        </BreadcrumbItem>
        {!isMainCreatorPage && (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{currentPage}</BreadcrumbPage>
            </BreadcrumbItem>
          </>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
