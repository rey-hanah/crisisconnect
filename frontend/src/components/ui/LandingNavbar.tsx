// Landing page navbar (simple version for public-facing homepage)

"use client"

import { LogIn, Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AnimatedThemeToggler } from "@/registry/magicui/animated-theme-toggler"
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet"

export default function LandingNavbar() {
  return (
    <header className="sticky top-0 z-50 w-full bg-sidebar border-b border-border">
      <div className="flex h-14 w-full items-center justify-between px-4">

        {/* Logo — links to home */}
        <a href="/" className="flex items-center shrink-0">
          <img
            src="/logo/logo.svg"
            alt="CrisisConnect"
            className="h-25 w-80 dark:invert"
          />
        </a>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          <AnimatedThemeToggler />

          <a
            href="/login"
            className="hidden md:flex items-center gap-1.5 text-sm text-foreground hover:text-foreground/80 transition-colors px-2 py-1.5"
          >
            <LogIn className="h-4 w-4" />
            Sign in
          </a>

          <a href="/signup" className="hidden md:flex items-center justify-center rounded-md bg-primary text-primary-foreground px-3 py-1.5 text-sm font-medium hover:bg-primary/90 transition-colors">
            Get started
          </a>

          {/* Mobile hamburger */}
          <Sheet>
            <SheetTrigger className="md:hidden inline-flex items-center justify-center rounded-md p-2 hover:bg-accent">
              <Menu className="h-5 w-5" />
            </SheetTrigger>
            <SheetContent side="right" className="w-64">
              <div className="flex flex-col gap-4 pt-8">
                <hr className="border-border" />
                <a href="/login" className="flex items-center gap-2 text-sm font-medium">
                  <LogIn className="h-4 w-4" /> Sign in
                </a>
                <Button asChild size="sm">
                  <a href="/signup">Get started</a>
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>

      </div>
    </header>
  )
}
