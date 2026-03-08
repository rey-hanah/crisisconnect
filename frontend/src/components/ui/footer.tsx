"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { MapPin, Phone, Mail, ExternalLink, HeartHandshake, Map } from "lucide-react";

interface FooterProps extends React.HTMLAttributes<HTMLDivElement> {}

export const Footer = React.forwardRef<HTMLDivElement, FooterProps>(
  ({ className, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("border-t border-border bg-background", className)} {...props}>
        <div className="max-w-screen-xl mx-auto px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">

            {/* Brand */}
            <div className="lg:col-span-5">
              <a href="/" className="flex items-center gap-2 mb-4">
                <img src="/logo/logo.svg" alt="CrisisConnect" className="h-7 dark:invert" />
                <span className="font-serif font-black text-lg tracking-tight">CrisisConnect</span>
              </a>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-sm">
                Real-time disaster relief coordination. Connecting people who need help with people
                who can give it — no noise, no middleman.
              </p>

              {/* Contact info */}
              <div className="mt-6 space-y-2.5">
                <div className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                  <span>257 Alice Street, Down the Rabbit Hole<br />British Columbia, Canada</span>
                </div>
                <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                  <Phone className="h-4 w-4 shrink-0 text-primary" />
                  <span>+1 (604) 555-0197</span>
                </div>
                <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4 shrink-0 text-primary" />
                  <a href="mailto:hello@crisisconnect.ca" className="hover:text-foreground transition-colors">
                    hello@crisisconnect.ca
                  </a>
                </div>
              </div>
            </div>

            {/* Links */}
            <div className="grid grid-cols-2 gap-8 lg:col-span-7 lg:justify-items-end">

              <div>
                <h3 className="text-sm font-semibold mb-4">Platform</h3>
                <ul className="space-y-2.5">
                  <li>
                    <a href="/" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors group">
                      <HeartHandshake className="h-4 w-4 shrink-0" />
                      Home
                    </a>
                  </li>
                  <li>
                    <a href="/app" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors group">
                      <Map className="h-4 w-4 shrink-0" />
                      Dashboard
                    </a>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-sm font-semibold mb-4">Legal</h3>
                <ul className="space-y-2.5">
                  <li>
                    <a href="/privacy-policy" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                      <ExternalLink className="h-4 w-4 shrink-0" />
                      Privacy Policy
                    </a>
                  </li>
                  <li>
                    <a href="/terms-of-service" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                      <ExternalLink className="h-4 w-4 shrink-0" />
                      Terms of Service
                    </a>
                  </li>
                </ul>
              </div>

            </div>
          </div>

          {/* Bottom bar */}
          <div className="mt-16 border-t border-border pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              © 2025 CrisisConnect Inc. — Built at cmd-f hackathon for people who need it most.
            </p>
            <p className="text-xs text-muted-foreground font-mono">
              257 Alice St · Down the Rabbit Hole, BC
            </p>
          </div>
        </div>
      </div>
    );
  }
);

Footer.displayName = "Footer";
