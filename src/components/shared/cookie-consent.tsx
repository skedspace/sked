"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const COOKIE_CONSENT_KEY = "sked_cookie_consent";

/**
 * SKED-styled cookie consent banner.
 * Appears at the bottom of the page until the user accepts.
 */
export function CookieConsent() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const consented = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!consented) setShow(true);
  }, []);

  function handleAccept() {
    localStorage.setItem(COOKIE_CONSENT_KEY, "true");
    setShow(false);
  }

  if (!show) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-paper p-4 shadow-lg">
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-3 sm:flex-row sm:justify-between">
        <p className="text-sm text-muted-foreground">
          We use cookies and similar technologies to improve your experience.
          By continuing, you agree to our{" "}
          <Link href="/privacy" className="text-primary hover:underline">
            Privacy Policy
          </Link>{" "}
          and{" "}
          <Link href="/terms" className="text-primary hover:underline">
            Terms of Service
          </Link>.
        </p>
        <div className="flex gap-2">
          <Button size="sm" onClick={handleAccept}>
            Accept
          </Button>
        </div>
      </div>
    </div>
  );
}
