import Link from "next/link";
import { CalendarCheck } from "lucide-react";
import type { ReactNode } from "react";

function BrandMark() {
  return (
    <span className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-[11px] bg-[#171a16] text-[#b9f34b]">
      <CalendarCheck className="h-[19px] w-[19px]" strokeWidth={2.2} />
      <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-[#ff6b4a]" />
    </span>
  );
}

function StepProgress({ currentStep }: { currentStep: 1 | 2 | 3 }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-xs font-semibold">
        <span className="text-[#666961]">Step {currentStep} of 3</span>
        <span className="text-[#171a16]">
          {currentStep === 1
            ? "Account"
            : currentStep === 2
              ? "Business page"
              : "Go live"}
        </span>
      </div>
      <div
        className="grid grid-cols-3 gap-1.5"
        role="progressbar"
        aria-label="Setup progress"
        aria-valuemin={1}
        aria-valuemax={3}
        aria-valuenow={currentStep}
      >
        {[1, 2, 3].map((step) => (
          <span
            key={step}
            className={`h-1.5 rounded-full ${
              step <= currentStep ? "bg-[#171a16]" : "bg-black/10"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

export function OnboardingShell({
  currentStep,
  title,
  description,
  children,
}: {
  currentStep: 1 | 2 | 3;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f3f2ec] px-4 py-8 text-[#171a16] sm:px-6">
      <section className="w-full max-w-[560px] rounded-[28px] border border-black/10 bg-[#fbfaf7] p-5 shadow-[0_24px_80px_rgba(23,26,22,0.12)] sm:p-8">
        <div className="mb-8 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2.5 rounded-xl focus-visible:ring-2 focus-visible:ring-[#86bd24] focus-visible:outline-none"
            aria-label="SKED home"
          >
            <BrandMark />
            <span className="text-lg font-bold tracking-[-0.03em]">sked</span>
          </Link>
          {currentStep === 1 && (
            <Link
              href="/login"
              className="rounded-lg px-2 py-1 text-xs font-semibold text-[#666961] hover:text-[#171a16] focus-visible:ring-2 focus-visible:ring-[#86bd24] focus-visible:outline-none"
            >
              Sign in
            </Link>
          )}
        </div>

        <StepProgress currentStep={currentStep} />

        <div className="mt-8 mb-7">
          <h1 className="text-3xl leading-tight font-semibold tracking-[-0.04em]">
            {title}
          </h1>
          <p className="mt-2 text-sm leading-6 text-[#696c65]">{description}</p>
        </div>

        {children}
      </section>
    </main>
  );
}
