"use client";

import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { TelegramLoginButton } from "@/components/auth/TelegramLoginButton";
import { NotificationToggle } from "@/components/notifications/NotificationToggle";

const NAV_LINKS = [
  { href: "/favorites", label: "Избранное" },
  { href: "/history", label: "История" },
  { href: "/assistant", label: "ИИ-подбор" },
];

export function SiteHeader() {
  const { user, profile, logout } = useAuth();

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between gap-4 border-b border-neutral-900 bg-black/90 px-4 py-3 backdrop-blur lg:px-8">
      <div className="flex items-center gap-6">
        <Link href="/" className="shrink-0 text-xl font-extrabold tracking-tight">
          NEURO<span className="text-nf-yellow">FILM</span>
        </Link>
        <nav className="hidden items-center gap-4 sm:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-neutral-400 transition-colors hover:text-nf-yellow"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>

      {user && profile ? (
        <div className="flex items-center gap-3">
          <NotificationToggle />
          {profile.photoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.photoUrl}
              alt={profile.username ?? profile.firstName}
              className="h-8 w-8 rounded-full"
            />
          )}
          <span className="hidden text-sm text-neutral-300 sm:inline">
            {profile.username ?? profile.firstName}
          </span>
          <button onClick={logout} className="text-xs text-neutral-500 transition-colors hover:text-nf-yellow">
            Выйти
          </button>
        </div>
      ) : (
        <TelegramLoginButton />
      )}
    </header>
  );
}
