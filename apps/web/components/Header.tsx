"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Logo from "./Logo";
import { useAuth } from "@/lib/auth";

export const NAV = [
  { href: "/pipeline", label: "Pipeline" },
  { href: "/agents", label: "Agents" },
  { href: "/sandbox", label: "Sandbox" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/faq", label: "FAQ" },
];

export default function Header() {
  const { user, ready, signOut } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  function logout() {
    signOut();
    router.push("/");
  }

  const linkClass = (active: boolean) =>
    `relative px-3.5 py-2 text-sm font-medium transition-colors ${active ? "text-paper" : "text-mute hover:text-paper"}`;

  return (
    <>
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 bg-gradient-to-r from-ember-hot via-ember to-ember-hot px-4 py-2 text-center text-[13px] font-semibold text-ink">
        <span>Runs on your machine with one command. No Docker, Redis or API key needed to start.</span>
        <Link href="/faq" className="underline underline-offset-4 hover:no-underline">
          Read the FAQ
        </Link>
      </div>
      <header className="sticky top-0 z-40 border-b border-line/80 bg-ink/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-3.5">
          <Link href="/" aria-label="CodeForge home">
            <Logo />
          </Link>
          <nav className="hidden items-center md:flex" aria-label="Main">
            {NAV.map((item) => {
              const active = pathname === item.href;
              return (
                <Link key={item.href} href={item.href} className={linkClass(active)} aria-current={active ? "page" : undefined}>
                  {item.label}
                  {active && <span className="absolute inset-x-3.5 -bottom-3.5 h-0.5 rounded-full bg-ember" />}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-2.5">
            {ready && user && (
              <>
                <span
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-ember/15 text-sm font-extrabold text-ember-hot"
                  title={user.email}
                  aria-label={`Signed in as ${user.name}`}
                >
                  {user.name.trim().charAt(0).toUpperCase()}
                </span>
                <button type="button" onClick={logout} className="btn-ghost hidden !py-2 sm:inline-flex">
                  Log out
                </button>
              </>
            )}
            {ready && !user && (
              <>
                <Link href="/login" className="btn-ghost hidden !py-2 sm:inline-flex">
                  Log in
                </Link>
                <Link href="/signup" className="btn-ember !py-2">
                  Sign up
                </Link>
              </>
            )}
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-controls="mobile-nav"
              aria-label="Menu"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-line md:hidden"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
              </svg>
            </button>
          </div>
        </div>
        {open && (
          <nav id="mobile-nav" className="border-t border-line px-6 py-3 md:hidden" aria-label="Mobile">
            <div className="flex flex-col">
              {NAV.map((item) => (
                <Link key={item.href} href={item.href} className={linkClass(pathname === item.href)}>
                  {item.label}
                </Link>
              ))}
              {ready && user ? (
                <button type="button" onClick={logout} className="px-3.5 py-2 text-left text-sm font-medium text-mute hover:text-paper">
                  Log out
                </button>
              ) : (
                <Link href="/login" className={linkClass(pathname === "/login")}>
                  Log in
                </Link>
              )}
            </div>
          </nav>
        )}
      </header>
    </>
  );
}
