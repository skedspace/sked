"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Cookie, ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const COOKIE_CONSENT_KEY = "sked_cookie_consent";

type ConsentChoice = "accepted" | "essential";

export function CookieConsent() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const consented = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!consented) setShow(true);
  }, []);

  function saveChoice(choice: ConsentChoice) {
    localStorage.setItem(COOKIE_CONSENT_KEY, choice);
    setShow(false);
  }

  if (!show) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4 sm:bottom-6">
      <section
        aria-labelledby="cookie-consent-title"
        className="pointer-events-auto relative w-full max-w-xl overflow-hidden rounded-xl border border-black/10 bg-[#fbfaf7]/95 p-3.5 text-[#151713] shadow-[0_18px_60px_rgba(12,16,10,0.18)] backdrop-blur-md sm:p-4"
      >
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_15%_0%,rgba(185,243,75,0.22),transparent_34%),linear-gradient(135deg,rgba(17,220,228,0.13),transparent_42%)]" />
        <button
          type="button"
          aria-label="Use essential cookies only"
          onClick={() => saveChoice("essential")}
          className="absolute right-2.5 top-2.5 rounded-full p-1.5 text-[#6b7068] transition hover:bg-black/5 hover:text-[#151713] focus:outline-none focus:ring-2 focus:ring-[#7cae25]"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex gap-3 pr-8">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#151713] text-[#b9f34b]">
            <Cookie className="h-4.5 w-4.5" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 id="cookie-consent-title" className="text-sm font-black">
                Cookies and similar technologies
              </h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#4f7d1f]">
                <ShieldCheck className="h-3 w-3" />
                Minimal
              </span>
            </div>
            <p className="mt-1 text-xs leading-5 text-[#5d615b]">
              We use essential cookies for login and security, plus limited storage for preferences,
              analytics, and live-board recovery. Review our{" "}
              <Link href="/privacy" className="font-semibold text-[#4f7d1f] hover:underline">
                Privacy Policy
              </Link>{" "}
              and{" "}
              <Link href="/terms" className="font-semibold text-[#4f7d1f] hover:underline">
                Terms
              </Link>
              .
            </p>
          </div>
        </div>

        <div className="mt-3 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => saveChoice("essential")}
            className="h-9 rounded-lg px-3 text-xs text-[#5d615b] hover:bg-black/5"
          >
            Essential only
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => saveChoice("accepted")}
            className="h-9 rounded-lg bg-[#151713] px-4 text-xs font-bold text-white hover:bg-[#252a23]"
          >
            Accept all
          </Button>
        </div>
      </section>
    </div>
  );
}
