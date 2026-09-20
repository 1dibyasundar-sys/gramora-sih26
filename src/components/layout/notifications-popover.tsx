'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useNotifications } from '@/hooks/useNotifications';
import { Bell, CheckCheck, ExternalLink } from 'lucide-react';
import { cn, formatRelativeTime } from '@/lib/utils';
import Link from 'next/link';

export function NotificationsPopover() {
  const [open, setOpen] = useState(false);
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        aria-label="Notifications"
        className="relative w-10 h-10 rounded-xl bg-surface-elevated/80 border border-surface-border flex items-center justify-center text-foreground/70 hover:text-foreground transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-accent text-accent-foreground font-bold text-[10px] flex items-center justify-center ring-2 ring-background animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-3 w-80 sm:w-96 rounded-2xl bg-surface-primary/95 backdrop-blur-xl border border-surface-border shadow-elevated p-4 z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-3 border-b border-surface-border">
            <div className="flex items-center gap-2">
              <h4 className="text-body font-bold text-foreground">Notifications</h4>
              {unreadCount > 0 && (
                <span className="text-[11px] font-semibold text-primary-400 bg-primary-500/15 px-2 py-0.5 rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-caption font-semibold text-foreground/50 hover:text-primary-400 flex items-center gap-1 transition-colors"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all read
              </button>
            )}
          </div>

          <div className="mt-3 flex flex-col divide-y divide-surface-border/50 max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="text-caption text-foreground/50 text-center py-6">
                No notifications at this time.
              </p>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => markAsRead(notif.id)}
                  className={cn(
                    'py-3 first:pt-1 last:pb-1 cursor-pointer transition-colors',
                    !notif.read ? 'bg-white/[0.02]' : 'opacity-70'
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h5 className="text-body-sm font-semibold text-foreground flex items-center gap-1.5">
                      {!notif.read && (
                        <span className="w-2 h-2 rounded-full bg-accent shrink-0" />
                      )}
                      {notif.title}
                    </h5>
                    <span className="text-[10px] text-foreground/40 shrink-0 font-mono">
                      {formatRelativeTime(notif.createdAt)}
                    </span>
                  </div>
                  <p className="text-caption text-foreground/70 mt-1 leading-relaxed">
                    {notif.message}
                  </p>
                  {notif.actionUrl && (
                    <Link
                      href={notif.actionUrl}
                      onClick={() => setOpen(false)}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary-400 hover:text-primary-300 mt-2"
                    >
                      <span>View details</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
