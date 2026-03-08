"use client"

import { Menu, MapPin, FileText, Home, LogIn } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuLink,
} from "@/components/ui/navigation-menu"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { AnimatedThemeToggler } from "@/registry/magicui/animated-theme-toggler"

const NAV_ITEMS = [
  { title: "Home", url: "/", icon: <Home className="h-3.5 w-3.5" /> },
  { title: "Live Map", url: "/map", icon: <MapPin className="h-3.5 w-3.5" /> },
  { title: "Post a Request", url: "/post", icon: <FileText className="h-3.5 w-3.5" /> },
]

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-sidebar backdrop-blur-md">
      <div className="flex h-14 w-full items-center justify-between px-4">

        {/* ── Logo only, no text ── */}
        <a href="/" className="flex items-left shrink-0">
          <img
            src="/logo/logo.svg"
            alt="CrisisConnect"
            className="h-25 w-50"
          />
        </a>

        {/* ── Desktop nav (center) ── */}
        <nav className="hidden lg:flex absolute left-1/2 -translate-x-1/2">
          <NavigationMenu>
            <NavigationMenuList className="gap-0.5">
              {NAV_ITEMS.map((item) => (
                <NavigationMenuItem key={item.title}>
                  <NavigationMenuLink
                    href={item.url}
                    className="group inline-flex h-9 items-center gap-2 justify-center rounded-md px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus:outline-none"
                  >
                    {item.icon}
                    {item.title}
                  </NavigationMenuLink>
                </NavigationMenuItem>
              ))}
            </NavigationMenuList>
          </NavigationMenu>
        </nav>

        {/* ── Right actions ── */}
        <div className="flex items-center gap-1">
          <AnimatedThemeToggler className="h-9 w-9 rounded-md flex items-center justify-center hover:bg-accent text-muted-foreground" />

          {/* Sign in — icon inline with text */}
          <div className="hidden lg:flex items-center gap-2 ml-1">
            <Button variant="ghost" size="sm" render={<a href="/login" className="flex items-center gap-1.5" />}>
              <LogIn className="h-3.5 w-3.5" />
              Sign in
            </Button>
            <Button size="sm" render={<a href="/signup" />}>
              Get started
            </Button>
          </div>

          {/* Mobile hamburger */}
          <Sheet>
            <SheetTrigger render={<Button variant="ghost" size="icon" className="lg:hidden text-muted-foreground" />}>
              <Menu className="h-4 w-4" />
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetHeader>
                <SheetTitle>
                  <a href="/" className="flex items-center">
                    <img src="/logo/logo.svg" alt="CrisisConnect" className="h-7 w-7" />
                  </a>
                </SheetTitle>
              </SheetHeader>
              <nav className="mt-6 flex flex-col gap-1">
                {NAV_ITEMS.map((item) => (
                  <a
                    key={item.title}
                    href={item.url}
                    className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    {item.icon}
                    {item.title}
                  </a>
                ))}
                <div className="mt-4 border-t border-border pt-4 flex flex-col gap-2">
                  <Button variant="outline" className="w-full" render={<a href="/login" className="flex items-center gap-1.5" />}>
                    <LogIn className="h-3.5 w-3.5" />
                    Sign in
                  </Button>
                  <Button className="w-full" render={<a href="/signup" />}>
                    Get started
                  </Button>
                </div>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
