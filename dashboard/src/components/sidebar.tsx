'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, FolderKanban, Activity, Sun, Moon } from 'lucide-react';
import { useTheme } from '@/components/theme-provider';

const NAV_ITEMS = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/projects', label: 'Projects', icon: FolderKanban },
  { href: '/activity', label: 'Activity', icon: Activity },
];

export function Sidebar() {
  const pathname = usePathname();
  const { theme, toggle } = useTheme();

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-60 flex-col border-r border-[var(--am-border)] bg-[var(--am-sidebar-bg)]">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600">
          <span className="text-xs font-bold text-white">AI</span>
        </div>
        <div>
          <span className="text-sm font-semibold tracking-tight text-[var(--am-text)]">AIMAKER</span>
          <p className="text-[10px] text-[var(--am-text-muted)]">Orchestration Platform</p>
        </div>
      </div>

      {/* Divider */}
      <div className="mx-4 h-px bg-[var(--am-border)]" />

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 px-3 py-4">
        <p className="mb-2 px-3 text-[10px] font-medium uppercase tracking-wider text-[var(--am-text-faint)]">
          Menu
        </p>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active =
            item.href === '/'
              ? pathname === '/'
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all ${
                active
                  ? 'bg-[var(--am-accent-subtle)] text-[var(--am-text)] shadow-sm'
                  : 'text-[var(--am-text-muted)] hover:bg-[var(--am-bg-muted)] hover:text-[var(--am-text-secondary)]'
              }`}
            >
              <Icon size={16} className={active ? 'text-[var(--am-accent)]' : 'text-[var(--am-text-faint)] group-hover:text-[var(--am-text-muted)]'} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="mx-4 h-px bg-[var(--am-border)]" />
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[11px] text-[var(--am-text-faint)]">Engine connected</span>
        </div>
        <button
          onClick={toggle}
          className="flex h-7 w-7 items-center justify-center rounded-md border border-[var(--am-border)] bg-[var(--am-bg-muted)] text-[var(--am-text-muted)] hover:text-[var(--am-text)] hover:bg-[var(--am-bg-card-hover)] transition-all"
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? <Sun size={13} /> : <Moon size={13} />}
        </button>
      </div>
    </aside>
  );
}
