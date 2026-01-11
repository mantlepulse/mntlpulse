/**
 * Announcement Banner Component
 * Displays active announcement at top of landing page
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { X, ExternalLink, Megaphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useActiveAnnouncement } from '@/hooks/use-announcements';

export function AnnouncementBanner() {
  const { data: announcement, isLoading } = useActiveAnnouncement();
  const [isDismissed, setIsDismissed] = useState(false);

  // Check localStorage for dismissal
  useEffect(() => {
    if (announcement?.id) {
      const dismissed = localStorage.getItem(`announcement-dismissed-${announcement.id}`);
      if (dismissed === 'true') {
        setIsDismissed(true);
      }
    }
  }, [announcement?.id]);

  const handleDismiss = () => {
    if (announcement?.id) {
      localStorage.setItem(`announcement-dismissed-${announcement.id}`, 'true');
      setIsDismissed(true);
    }
  };

  // Don't show if loading, no announcement, or dismissed
  if (isLoading || !announcement || isDismissed || !announcement.dismissible) {
    return null;
  }

  return (
    <div className="relative bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 text-white">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Icon and Content */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Megaphone className="h-5 w-5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm md:text-base">
                {announcement.title}
              </p>
              <p className="text-xs md:text-sm text-white/90 line-clamp-2">
                {announcement.description}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {announcement.link && (
              <Button
                asChild
                size="sm"
                variant="secondary"
                className="hidden md:inline-flex"
              >
                <Link
                  href={announcement.link}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {announcement.linkText || 'Learn More'}
                  <ExternalLink className="ml-2 h-3 w-3" />
                </Link>
              </Button>
            )}

            {announcement.dismissible && (
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-white hover:bg-white/20"
                onClick={handleDismiss}
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Dismiss</span>
              </Button>
            )}
          </div>
        </div>

        {/* Mobile Link */}
        {announcement.link && (
          <div className="mt-2 md:hidden">
            <Button asChild size="sm" variant="secondary" className="w-full">
              <Link
                href={announcement.link}
                target="_blank"
                rel="noopener noreferrer"
              >
                {announcement.linkText || 'Learn More'}
                <ExternalLink className="ml-2 h-3 w-3" />
              </Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
