"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useIsAdmin } from "@/app/hooks/useIsAdmin";
import { ConnectWallet } from "./ConnectWallet";

/**
 * Shared across every page so the chrome stays identical while navigating.
 * Pass `breadcrumb` to replace the nav on detail pages.
 */
export function SiteHeader({ breadcrumb }: { breadcrumb?: ReactNode }) {
  const { isAdmin } = useIsAdmin();
  const pathname = usePathname();
  const onMarkets = pathname === "/" || pathname.startsWith("/market");

  return (
    <header className="sticky top-0 z-30 border-b border-border-subtle bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between gap-4">
        <div className="flex items-center gap-6 min-w-0">
          <Link
            href="/"
            className="flex items-center gap-2 text-base font-semibold tracking-tight shrink-0 rounded-md focus-ring"
          >
            <span className="grid place-items-center w-6 h-6 rounded-md bg-avax text-white text-[11px] font-bold">
              H
            </span>
            Hy<span className="text-avax -ml-1.5">pa</span>
          </Link>

          {breadcrumb ?? (
            <nav className="hidden sm:flex items-center gap-1">
              <Link
                href="/"
                aria-current={onMarkets ? "page" : undefined}
                className={`text-xs px-2.5 py-1.5 rounded-lg transition-colors focus-ring ${
                  onMarkets
                    ? "bg-white/5 text-foreground"
                    : "text-muted hover:text-dim"
                }`}
              >
                Markets
              </Link>
              {["Portfolio", "Activity"].map((label) => (
                <span
                  key={label}
                  title="Coming soon"
                  className="text-xs px-2.5 py-1.5 rounded-lg text-muted/60 cursor-not-allowed"
                >
                  {label}
                </span>
              ))}
            </nav>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isAdmin && (
            <Link
              href="/create"
              className="text-xs px-3 py-1.5 rounded-lg border border-border-strong text-dim hover:text-foreground hover:border-muted transition-colors focus-ring"
            >
              Create
            </Link>
          )}
          <ConnectWallet />
        </div>
      </div>
    </header>
  );
}
