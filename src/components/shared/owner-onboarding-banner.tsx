"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type TourStep = {
  id: string;
  title: string;
  description: string;
  action?: { label: string; href: string };
};

const TOUR_STEPS: TourStep[] = [
  {
    id: "dashboard",
    title: "Welcome to SKED! 🎉",
    description:
      "This is your dashboard — a quick view of today's bookings and stats. You'll find everything you need to run your business right here.",
    action: { label: "Set up services", href: "/dashboard/settings/services" },
  },
  {
    id: "services",
    title: "Add your services",
    description:
      "Create the services customers can book — like court rental, coaching session, or equipment rental. Set durations, prices, and more.",
    action: { label: "Set hours", href: "/dashboard/settings/hours" },
  },
  {
    id: "hours",
    title: "Set operating hours",
    description:
      "Tell customers when you're open. You can set different hours for each day and location.",
    action: {
      label: "Customize your page",
      href: "/dashboard/settings/page",
    },
  },
  {
    id: "page",
    title: "Go live! 🚀",
    description:
      "Customize your public page and hit publish. Share your link and start accepting bookings.",
  },
];

const TOUR_COMPLETE_KEY = "sked_tour_complete";

export function OwnerOnboardingBanner() {
  const [currentStep, setCurrentStep] = useState(0);
  const [dismissed, setDismissed] = useState(true); // Start dismissed until we check
  const [isOwner, setIsOwner] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function check() {
      // Skip if tour was already completed
      if (typeof window !== "undefined") {
        const completed = localStorage.getItem(TOUR_COMPLETE_KEY);
        if (completed) {
          setDismissed(true);
          return;
        }
      }

      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      const { data: membership } = await supabase
        .from("org_members")
        .select("role")
        .eq("user_id", session.user.id)
        .single();

      if (membership?.role === "owner") {
        setIsOwner(true);
        setDismissed(false);
      }
    }
    check();
  }, []);

  function handleDismiss() {
    setDismissed(true);
    if (typeof window !== "undefined") {
      localStorage.setItem(TOUR_COMPLETE_KEY, "true");
    }
  }

  function handleNext() {
    const step = TOUR_STEPS[currentStep];
    if (!step) return;
    if (step.action && currentStep < TOUR_STEPS.length - 1) {
      router.push(step.action.href);
    }
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      handleDismiss();
    }
  }

  if (dismissed || !isOwner) return null;

  const step = TOUR_STEPS[currentStep] ?? TOUR_STEPS[0];
  if (!step) return null;

  return (
    <div className="relative mb-6 overflow-hidden rounded-xl border border-primary/30 bg-primary/5 p-4 shadow-sm">
      {/* Close button */}
      <button
        onClick={handleDismiss}
        className="absolute right-3 top-3 rounded-full p-1 text-muted-foreground hover:bg-black/5"
        aria-label="Dismiss tour"
      >
        <X className="h-4 w-4" />
      </button>

      {/* Progress dots */}
      <div className="mb-3 flex gap-1.5">
        {TOUR_STEPS.map((_, i) => (
          <span
            key={i}
            className={`block h-1.5 rounded-full transition-all ${
              i === currentStep
                ? "w-6 bg-primary"
                : i < currentStep
                  ? "w-1.5 bg-primary/40"
                  : "w-1.5 bg-foreground/15"
            }`}
          />
        ))}
      </div>

      <h3 className="mb-1 font-semibold">{step.title}</h3>
      <p className="mb-3 text-sm text-muted-foreground">{step.description}</p>

      <div className="flex gap-2">
        <Button size="sm" onClick={handleNext}>
          {currentStep < TOUR_STEPS.length - 1 ? "Next" : "Got it!"}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleDismiss}
          className="text-muted-foreground"
        >
          Skip tour
        </Button>
      </div>
    </div>
  );
}
