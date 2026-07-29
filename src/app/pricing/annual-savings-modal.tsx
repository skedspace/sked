"use client";

import { useMemo, useState } from "react";
import { ArrowRight, CalendarCheck, CheckCircle2, X } from "lucide-react";
import { SubscribeButton } from "./subscribe-button";

type AnnualSavingsModalProps = {
  monthlyPriceCents: number;
  oneYearDiscount: number;
  twoYearDiscount: number;
  threeYearDiscount: number;
};

function money(cents: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

function termPrice(monthlyPriceCents: number, months: number, discount: number) {
  return Math.round(monthlyPriceCents * months * (1 - discount / 100));
}

export function AnnualSavingsModal({
  monthlyPriceCents,
  oneYearDiscount,
  twoYearDiscount,
  threeYearDiscount,
}: AnnualSavingsModalProps) {
  const [open, setOpen] = useState(false);
  const [selectedMonths, setSelectedMonths] = useState(12);
  const options = useMemo(
    () => [
      { label: "1 Year", months: 12, discount: oneYearDiscount },
      { label: "2 Years", months: 24, discount: twoYearDiscount },
      { label: "3 Years", months: 36, discount: threeYearDiscount },
    ],
    [oneYearDiscount, threeYearDiscount, twoYearDiscount],
  );
  const bestDiscount = Math.max(oneYearDiscount, twoYearDiscount, threeYearDiscount);
  const selectedOption = options.find((option) => option.months === selectedMonths) ?? options[0]!;
  const selectedTotal = termPrice(monthlyPriceCents, selectedOption.months, selectedOption.discount);
  const selectedSaved = monthlyPriceCents * selectedOption.months - selectedTotal;

  return (
    <div className="mx-auto mt-8 max-w-3xl">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group flex w-full flex-col items-start justify-between gap-4 rounded-[22px] border border-[#171a16]/10 bg-[#171a16] p-5 text-left text-white shadow-[0_18px_50px_rgba(23,26,22,0.16)] transition-all hover:-translate-y-1 hover:bg-black sm:flex-row sm:items-center sm:p-6"
      >
        <span>
          <span className="mb-2 inline-flex rounded-full bg-[#b9f34b] px-3 py-1 text-[10px] font-black tracking-[0.12em] text-[#171a16] uppercase">
            Annual savings
          </span>
          <strong className="block text-xl font-black tracking-[-0.04em]">
            Save up to {bestDiscount}% when you subscribe annually.
          </strong>
          <small className="mt-1 block text-sm text-white/60">
            Compare 1-year, 2-year, and 3-year Premium options before you checkout.
          </small>
        </span>
        <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-bold">
          View annual options <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#171a16]/70 p-4 backdrop-blur-sm">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="annual-savings-title"
            className="relative max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-[28px] bg-[#fbfaf4] p-6 shadow-[0_30px_90px_rgba(0,0,0,0.28)] sm:p-8"
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-5 top-5 grid h-10 w-10 place-items-center rounded-full border border-black/10 bg-white text-[#171a16] transition-colors hover:bg-black hover:text-white"
              aria-label="Close annual savings"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="max-w-2xl pr-12">
              <p className="mb-3 text-xs font-black tracking-[0.18em] text-[#4e7410] uppercase">
                Premium annual plans
              </p>
              <h2 id="annual-savings-title" className="text-4xl font-black leading-none tracking-[-0.055em]">
                Pay ahead and keep more of your operating budget.
              </h2>
              <p className="text-muted-foreground mt-4 text-base leading-7">
                Annual plans include the same Premium features as monthly billing. The only difference is the longer commitment and lower effective monthly cost.
              </p>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {options.map((option) => {
                const total = termPrice(monthlyPriceCents, option.months, option.discount);
                const saved = monthlyPriceCents * option.months - total;
                const selected = option.months === selectedMonths;
                return (
                  <button
                    type="button"
                    key={option.label}
                    onClick={() => setSelectedMonths(option.months)}
                    aria-pressed={selected}
                    className={`rounded-[20px] border p-5 text-left transition-all ${
                      selected
                        ? "border-[#5f8b12] bg-[#f2ffd0] shadow-[0_18px_40px_rgba(95,139,18,0.16)]"
                        : "border-black/10 bg-white hover:-translate-y-1 hover:border-[#5f8b12]/30"
                    }`}
                  >
                    <span className="mb-5 grid h-11 w-11 place-items-center rounded-full bg-[#e9f8c2] text-[#4e7410]">
                      <CalendarCheck className="h-5 w-5" />
                    </span>
                    <span className="flex items-center justify-between gap-3">
                      <h3 className="text-lg font-black">{option.label}</h3>
                      {selected && (
                        <span className="rounded-full bg-[#171a16] px-2.5 py-1 text-[10px] font-black text-white">
                          Selected
                        </span>
                      )}
                    </span>
                    <p className="text-muted-foreground mt-1 text-sm">{option.discount}% discount</p>
                    <div className="mt-5">
                      <strong className="text-3xl font-black tracking-[-0.04em]">{money(total)}</strong>
                      <small className="text-muted-foreground block">for {option.months} months</small>
                    </div>
                    <p className="mt-4 inline-flex rounded-full bg-[#b9f34b] px-3 py-1 text-xs font-black text-[#171a16]">
                      Save {money(saved)}
                    </p>
                    <ul className="mt-5 space-y-2 text-sm">
                      <li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 text-[#5f8b12]" /> All Premium features</li>
                      <li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 text-[#5f8b12]" /> Lower effective monthly cost</li>
                    </ul>
                  </button>
                );
              })}
            </div>

            <div className="mt-8 flex flex-col gap-3 rounded-[18px] bg-[#171a16] p-5 text-white sm:flex-row sm:items-center sm:justify-between">
              <span>
                <strong className="block">Selected: {selectedOption.label} Premium</strong>
                <small className="text-white/60">
                  {money(selectedTotal)} total. You save {money(selectedSaved)} versus monthly billing.
                </small>
              </span>
              <SubscribeButton
                termMonths={selectedOption.months}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#b9f34b] px-5 py-3 text-sm font-bold text-[#171a16]"
              >
                Choose {selectedOption.label}
              </SubscribeButton>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
