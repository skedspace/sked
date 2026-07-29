import type { Metadata } from "next";
import "./globals.css";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PostHogProvider } from "@/components/shared/posthog-provider";
import { CookieConsent } from "@/components/shared/cookie-consent";
import { ServiceWorkerRegister } from "@/components/shared/service-worker-register";

export const metadata: Metadata = {
  title: {
    template: "%s | SKED",
    default: "SKED — Scheduling & Business Page Platform",
  },
  description:
    "A beautiful business page and smart scheduler, together in one link.",
  manifest: "/manifest.webmanifest",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body className="min-h-screen antialiased">
        <TooltipProvider>
          <PostHogProvider>
            <ErrorBoundary>{children}</ErrorBoundary>
            <CookieConsent />
            <ServiceWorkerRegister />
          </PostHogProvider>
        </TooltipProvider>
      </body>
    </html>
  );
}
