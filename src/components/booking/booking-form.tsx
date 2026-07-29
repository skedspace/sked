"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createBooking } from "@/lib/booking-actions";
import { formatTime, formatCurrency, getContrastText } from "@/lib/utils";
import { applyDiscountCode, type DiscountResult } from "@/lib/discount-actions";
import { useAnalytics } from "@/lib/analytics";
import { CheckCircle2, ChevronLeft, Copy, Timer } from "lucide-react";

type Slot = {
  start_time: string;
  end_time: string;
  resource_id: string;
  resource_name: string;
};

type Service = {
  id: string;
  name: string;
  duration_min: number;
  price_cents: number;
  payment_mode?: string;
  deposit_cents?: number | null;
};

type PaymentMethod = {
  id: string;
  name: string;
  type: string;
  account_name?: string;
  account_number?: string;
  instructions?: string;
  qr_image_url?: string;
  status?: string;
  is_default?: boolean;
};

type Step = "pick-slot" | "details" | "done";

const STEP_LABELS: Record<Step, string> = {
  "pick-slot": "Choose time",
  details: "Your details",
  done: "Confirmed",
};

export function BookingForm({
  orgId,
  orgSlug,
  service,
  slots,
  bookingCopy,
  primaryColor = "#75c51b",
  inkColor = "#171a16",
  mutedColor = "#8c9185",
  paymentMethods = [],
}: {
  orgId: string;
  orgSlug: string;
  service: Service;
  slots: Slot[];
  bookingCopy?: {
    customerTitle?: string;
    customerHelper?: string;
    paymentTitle?: string;
    paymentHelper?: string;
    policyTitle?: string;
    policyHelper?: string;
    confirmationTitle?: string;
    confirmationHelper?: string;
  };
  paymentMethods?: PaymentMethod[];
  primaryColor?: string;
  inkColor?: string;
  mutedColor?: string;
}) {
  const [step, setStep] = useState<Step>(slots.length > 0 ? "pick-slot" : "done");
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState(
    () => paymentMethods.find((method) => method.is_default)?.id ?? paymentMethods[0]?.id ?? "pay_at_venue",
  );
  const [loading, setLoading] = useState(false);
  const [discountCode, setDiscountCode] = useState("");
  const [discountResult, setDiscountResult] = useState<DiscountResult | null>(null);
  const [checkingCode, setCheckingCode] = useState(false);
  const [showDiscount, setShowDiscount] = useState(false);
  const router = useRouter();
  const analytics = useAnalytics();

  const groupedSlots = useMemo(() => {
    const groups = new Map<string, Slot[]>();
    slots.forEach((slot) => {
      const existing = groups.get(slot.resource_name) ?? [];
      existing.push(slot);
      groups.set(slot.resource_name, existing);
    });
    return Array.from(groups.entries());
  }, [slots]);

  const totalSteps = 3;

  async function handleCheckCode() {
    if (!discountCode.trim()) return;
    setCheckingCode(true);
    setDiscountResult(null);
    const result = await applyDiscountCode(orgId, discountCode, service.price_cents);
    setDiscountResult(result);
    setCheckingCode(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSlot) return;
    setLoading(true);
    setError(null);
    analytics.trackBookingStarted(service.name);

    const finalPrice = discountResult?.valid
      ? discountResult.final_cents
      : service.price_cents;

    const formData = new FormData();
    formData.set("org_id", orgId);
    formData.set("org_slug", orgSlug);
    formData.set("service_id", service.id);
    formData.set("resource_id", selectedSlot.resource_id);
    formData.set("start_time", selectedSlot.start_time);
    formData.set("end_time", selectedSlot.end_time);
    formData.set("name", name);
    formData.set("email", email);
    formData.set("phone", phone);
    formData.set("price_cents", String(finalPrice));
    formData.set("payment_method_id", selectedPaymentMethodId);
    formData.set("idempotency_key", crypto.randomUUID());
    if (discountResult?.valid) {
      formData.set("discount_code", discountCode.toUpperCase());
      formData.set("discount_id", discountResult.discount_id);
    }

    const result = await createBooking(formData);
    if (result.success) {
      setBookingId(result.bookingId);
      setStep("done");
      analytics.trackBookingConfirmed(result.bookingId, service.name);
    } else {
      setError(result.error);
    }
    setLoading(false);
  }

  return (
    <div className="space-y-4">
      {/* ── Step indicator ── */}
      <div className="flex items-center gap-2">
        {["pick-slot", "details", "done"].map((s, i) => {
          const stepKey = s as Step;
          const isActive = step === stepKey;
          const isPast = ["pick-slot", "details", "done"].indexOf(step) > i;
          return (
            <div key={stepKey} className="flex items-center gap-2 flex-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <span
                  className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[10px] font-black ${
                    isPast || isActive
                      ? "text-white"
                      : "bg-[#e8ece6] text-[#8c9185]"
                  }`}
                  style={{
                    backgroundColor: isPast || isActive ? primaryColor : undefined,
                    color: isPast || isActive ? getContrastText(primaryColor) : undefined,
                  }}
                >
                  {isPast ? "✓" : i + 1}
                </span>
                <span
                  className={`hidden text-[11px] font-bold truncate sm:block`}
                  style={{ color: isPast || isActive ? inkColor : mutedColor }}
                >
                  {STEP_LABELS[stepKey]}
                </span>
              </div>
              {i < totalSteps - 1 && (
                <div
                  className={`h-px flex-1 ${
                    isPast ? primaryColor : "#e8ece6"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* ── Step: Pick slot ── */}
      {step === "pick-slot" && (
        <div className="min-h-[200px]">
          <div className="flex items-center justify-between gap-3 rounded-lg border border-black/[0.07] bg-white px-4 py-2.5 text-sm mb-4">
            <div className="flex items-center gap-2">
              <span className="font-bold text-[#171a16]">{service.name}</span>
              <span className="flex items-center gap-1 text-xs text-[#8c9185]">
                <Timer className="h-3 w-3" />
                {service.duration_min}m
              </span>
            </div>
            <span className="text-xs font-semibold" style={{ color: primaryColor }}>
              {formatCurrency(service.price_cents)}
            </span>
          </div>

          {slots.length === 0 ? (
            <p className="py-8 text-center text-xs font-medium text-[#8c9185]">
              No slots available for this date.
            </p>
          ) : (
            <div className="space-y-3 max-h-[200px] overflow-y-auto pr-1">
              {groupedSlots.map(([courtName, courtSlots]) => (
                <div key={courtName}>
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#8c9185]">
                    {courtName}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {courtSlots.map((slot, i) => (
                      <button
                        key={`${courtName}-${i}`}
                        type="button"
                        onClick={() => {
                          setSelectedSlot(slot);
                          analytics.trackSlotSelected(service.name);
                        }}
                        className={`rounded-lg border px-3 py-2 text-xs font-bold transition-all ${
                          selectedSlot?.start_time === slot.start_time &&
                          selectedSlot?.resource_id === slot.resource_id
                            ? "text-white"
                            : "bg-white text-[#171a16]"
                        }`}
                        style={{
                          borderColor:
                            selectedSlot?.start_time === slot.start_time &&
                            selectedSlot?.resource_id === slot.resource_id
                              ? primaryColor
                              : undefined,
                          backgroundColor:
                            selectedSlot?.start_time === slot.start_time &&
                            selectedSlot?.resource_id === slot.resource_id
                              ? primaryColor
                              : undefined,
                          color:
                            selectedSlot?.start_time === slot.start_time &&
                            selectedSlot?.resource_id === slot.resource_id
                              ? getContrastText(primaryColor)
                              : undefined,
                        }}
                      >
                        {formatTime(slot.start_time)}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {slots.length > 0 && (
            <Button
              type="button"
              disabled={!selectedSlot}
              onClick={() => setStep("details")}
              className="mt-4 h-11 w-full rounded-xl text-sm font-bold text-white disabled:bg-[#d9ddd2]"
              style={{ backgroundColor: inkColor }}
            >
              Continue
            </Button>
          )}
        </div>
      )}

      {/* ── Step: Customer details ── */}
      {step === "details" && (
        <div className="min-h-[200px]">
          <form onSubmit={handleSubmit} className="space-y-4">
            {(bookingCopy?.customerTitle || bookingCopy?.customerHelper) && (
              <div>
                {bookingCopy?.customerTitle && (
                  <p className="text-xs font-black text-[#171a16]">{bookingCopy.customerTitle}</p>
                )}
                {bookingCopy?.customerHelper && (
                  <p className="text-xs font-medium text-[#8c9185]">{bookingCopy.customerHelper}</p>
                )}
              </div>
            )}

            <div className="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold" style={{ borderColor: primaryColor + "30", backgroundColor: "#f0f9dd", color: "#326d1e" }}>
              <span>{formatTime(selectedSlot!.start_time)}</span>
              <span style={{ color: primaryColor }}>·</span>
              <span>{selectedSlot!.resource_name}</span>
              <button
                type="button"
                onClick={() => { setStep("pick-slot"); setSelectedSlot(null); }}
                className="ml-auto text-[#8c9185] hover:text-[#171a16] text-xs"
              >
                Change
              </button>
            </div>

            <div className="space-y-2.5">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Your name *"
                className="h-11 rounded-xl border-black/[0.08] bg-white px-3.5 text-sm"
                autoComplete="name"
              />
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                className="h-11 rounded-xl border-black/[0.08] bg-white px-3.5 text-sm"
                autoComplete="email"
              />
              <Input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Phone"
                className="h-11 rounded-xl border-black/[0.08] bg-white px-3.5 text-sm"
                autoComplete="tel"
              />
            </div>

            <div className="space-y-2">
              {(bookingCopy?.paymentTitle || bookingCopy?.paymentHelper) && (
                <div>
                  {bookingCopy?.paymentTitle && (
                    <p className="text-xs font-black text-[#171a16]">{bookingCopy.paymentTitle}</p>
                  )}
                  {bookingCopy?.paymentHelper && (
                    <p className="text-xs font-medium text-[#8c9185]">{bookingCopy.paymentHelper}</p>
                  )}
                </div>
              )}
              {service.price_cents > 0 && paymentMethods.length > 0 && (
                <div className="grid gap-2">
                  {paymentMethods.map((method) => (
                    <button
                      type="button"
                      key={method.id}
                      onClick={() => setSelectedPaymentMethodId(method.id)}
                      className={`rounded-xl border p-3 text-left text-xs transition-all ${
                        selectedPaymentMethodId === method.id ? "bg-[#f0f9dd]" : "bg-white"
                      }`}
                      style={{
                        borderColor: selectedPaymentMethodId === method.id ? primaryColor : "rgba(0,0,0,0.08)",
                      }}
                    >
                      <span className="block font-black text-[#171a16]">{method.name}</span>
                      <span className="mt-1 block font-medium text-[#6e716b]">
                        {[method.account_name, method.account_number].filter(Boolean).join(" - ") || "Manual payment instructions"}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              {service.price_cents > 0 && paymentMethods.length === 0 && (
                <div className="rounded-xl border border-black/[0.08] bg-white p-3 text-xs font-medium text-[#6e716b]">
                  Payment details will be coordinated by the venue after booking.
                </div>
              )}
            </div>

            {(bookingCopy?.policyTitle || bookingCopy?.policyHelper) && (
              <div
                className="rounded-xl border p-3 text-xs"
                style={{
                  borderColor: primaryColor + "30",
                  backgroundColor: primaryColor + "12",
                }}
              >
                {bookingCopy?.policyTitle && (
                  <p className="font-black text-[#171a16]">
                    {bookingCopy.policyTitle}
                  </p>
                )}
                {bookingCopy?.policyHelper && (
                  <p className="mt-1 font-medium leading-5 text-[#5f695c]">
                    {bookingCopy.policyHelper}
                  </p>
                )}
              </div>
            )}

            <div>
              <button
                type="button"
                onClick={() => setShowDiscount(!showDiscount)}
                className="text-xs font-medium text-[#8c9185] hover:text-[#57940e]"
                onMouseEnter={(e) => (e.currentTarget.style.color = primaryColor)}
                onMouseLeave={(e) => (e.currentTarget.style.color = "")}
              >
                {showDiscount ? "▾" : "▸"} Discount code
              </button>
              {showDiscount && (
                <div className="mt-2 space-y-2">
                  <div className="flex gap-1.5">
                    <Input
                      value={discountCode}
                      onChange={(e) => {
                        setDiscountCode(e.target.value.toUpperCase());
                        setDiscountResult(null);
                      }}
                      placeholder="SUMMER20"
                      className="h-9 flex-1 rounded-lg border-black/[0.08] bg-white px-3 text-xs uppercase"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleCheckCode}
                      disabled={checkingCode || !discountCode.trim()}
                      className="h-9 whitespace-nowrap bg-white px-3 text-xs"
                    >
                      {checkingCode ? "..." : "Apply"}
                    </Button>
                  </div>
                  {discountResult && (
                    <p className={`text-xs ${discountResult.valid ? "text-green-600" : "text-red-600"}`}>
                      {discountResult.valid
                        ? `${discountResult.message} — save ${formatCurrency(discountResult.discount_cents)}`
                        : discountResult.message}
                    </p>
                  )}
                </div>
              )}
            </div>

            {error && (
              <p className="rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-700">
                {error}
              </p>
            )}

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep("pick-slot")}
                className="h-11 flex-none rounded-xl border-black/[0.12] bg-white px-5 text-sm font-semibold"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                type="submit"
                disabled={loading || !name.trim()}
                className="h-11 flex-1 rounded-xl text-sm font-bold disabled:bg-[#d9ddd2]"
                style={{ backgroundColor: primaryColor, color: getContrastText(primaryColor) }}
              >
                {loading ? "Booking..." : "Confirm — " + formatCurrency(
                  discountResult?.valid ? discountResult.final_cents : service.price_cents
                )}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* ── Step: Done ── */}
      {step === "done" && (
        <div className="min-h-[200px] flex flex-col items-center justify-center text-center py-6">
          <CheckCircle2 className="mb-4 h-12 w-12" strokeWidth={1.6} style={{ color: primaryColor }} />
          <p className="text-base font-black text-[#171a16]">
            {bookingCopy?.confirmationTitle ?? "Booking confirmed!"}
          </p>
          {bookingCopy?.confirmationHelper && (
            <p className="mt-1 text-xs font-medium text-[#4a6d1e] max-w-xs">
              {bookingCopy.confirmationHelper}
            </p>
          )}
          <p className="mt-3 text-xs font-medium" style={{ color: mutedColor }}>
            Ref: {bookingId?.slice(0, 8).toUpperCase() ?? "---"}
          </p>
          {service.price_cents > 0 && (
            <ManualPaymentInstructions
              method={paymentMethods.find((method) => method.id === selectedPaymentMethodId) ?? null}
              amount={discountResult?.valid ? discountResult.final_cents : service.price_cents}
              primaryColor={primaryColor}
            />
          )}
          <Button
            onClick={() => router.refresh()}
            className="mt-6 h-10 rounded-xl px-6 text-xs font-bold text-white"
            style={{ backgroundColor: inkColor }}
          >
            Book another
          </Button>
        </div>
      )}
    </div>
  );
}

function ManualPaymentInstructions({
  method,
  amount,
  primaryColor,
}: {
  method: PaymentMethod | null;
  amount: number;
  primaryColor: string;
}) {
  const [copied, setCopied] = useState(false);
  const account = [method?.account_name, method?.account_number].filter(Boolean).join(" - ");

  async function copyAccount() {
    if (!account) return;
    await navigator.clipboard?.writeText(account);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="mt-4 w-full rounded-2xl border border-black/[0.08] bg-white p-4 text-left">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black text-[#171a16]">{method?.name ?? "Payment at venue"}</p>
          <p className="mt-1 text-sm font-black" style={{ color: primaryColor }}>
            Amount: {formatCurrency(amount)}
          </p>
        </div>
        {account && (
          <button type="button" onClick={copyAccount} className="rounded-lg border border-black/[0.08] px-2 py-1 text-[10px] font-bold text-[#53606b]">
            <Copy className="mr-1 inline h-3 w-3" />
            {copied ? "Copied" : "Copy"}
          </button>
        )}
      </div>
      {method?.qr_image_url && (
        <img src={method.qr_image_url} alt={`${method.name} QR code`} className="mx-auto mt-3 h-40 w-40 rounded-xl border border-black/[0.08] object-contain" />
      )}
      {account && <p className="mt-3 text-xs font-semibold text-[#171a16]">{account}</p>}
      <p className="mt-2 text-xs font-medium leading-5 text-[#6e716b]">
        {method?.instructions || "Please settle the payment using the venue's preferred method and keep your receipt for verification."}
      </p>
    </div>
  );
}
