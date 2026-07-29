"use client";

import {
  ArrowRight,
  Bell,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Download,
  Edit3,
  ExternalLink,
  HelpCircle,
  Info,
  Plus,
  RefreshCw,
  Save,
  Star,
  WalletCards,
  X,
} from "lucide-react";
import { format, formatDistanceToNowStrict } from "date-fns";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { updatePricingSettingsAction } from "./actions";

export type PricingData = {
  range: { from: string; to: string };
  monthlyPriceCents: number;
  trialDays: number;
  oneYearDiscount: number;
  twoYearDiscount: number;
  threeYearDiscount: number;
  features: string[];
  customPlanName: string;
  customPlanPriceCents: number;
  customPlanDurationMonths: number;
  customPlanEnabled: boolean;
  showPlansToCustomers: boolean;
  allowTrialConversion: boolean;
  autoRenewPremium: boolean;
  prorationEnabled: boolean;
  activePremium: number;
  activeTrials: number;
  expiringTrials: number;
  periodUpdates: number;
  lastUpdatedAt: string;
  notifications: Array<{ id: string; title: string; detail: string; at: string }>;
};

function dateLabel(from: string, to: string) {
  const start = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  return `${format(start, "MMM d")} - ${format(end, "MMM d, yyyy")}`;
}

function money(cents: number, digits = 2) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(cents / 100);
}

function termPrice(monthlyCents: number, months: number, discount: number) {
  return Math.round(monthlyCents * months * (1 - discount / 100));
}

type PlanCardData = {
  id: string;
  name: string;
  term: string;
  months: number;
  discount: number;
  copy: string;
  priceCents?: number;
  isCustom?: boolean;
};

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (value: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      className={`pricing-toggle ${checked ? "is-on" : ""}`}
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
    >
      <span />
    </button>
  );
}

export function AdminPricing({ data }: { data: PricingData }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [rangeFrom, setRangeFrom] = useState(data.range.from);
  const [rangeTo, setRangeTo] = useState(data.range.to);
  const [monthlyPrice, setMonthlyPrice] = useState((data.monthlyPriceCents / 100).toFixed(2));
  const [trialDays, setTrialDays] = useState(data.trialDays);
  const [oneYearDiscount, setOneYearDiscount] = useState(data.oneYearDiscount);
  const [twoYearDiscount, setTwoYearDiscount] = useState(data.twoYearDiscount);
  const [threeYearDiscount, setThreeYearDiscount] = useState(data.threeYearDiscount);
  const [features, setFeatures] = useState(data.features);
  const [editingFeatures, setEditingFeatures] = useState(false);
  const [customPlanName, setCustomPlanName] = useState(data.customPlanName);
  const [customPlanPrice, setCustomPlanPrice] = useState((data.customPlanPriceCents / 100).toFixed(2));
  const [customPlanDuration, setCustomPlanDuration] = useState(data.customPlanDurationMonths);
  const [customPlanEnabled, setCustomPlanEnabled] = useState(data.customPlanEnabled);
  const [showCustomPlanEditor, setShowCustomPlanEditor] = useState(false);
  const [showPlans, setShowPlans] = useState(data.showPlansToCustomers);
  const [allowConversion, setAllowConversion] = useState(data.allowTrialConversion);
  const [autoRenew, setAutoRenew] = useState(data.autoRenewPremium);
  const [proration, setProration] = useState(data.prorationEnabled);
  const [preview, setPreview] = useState<"monthly" | "annual">("monthly");
  const [message, setMessage] = useState("");

  const monthlyCents = Math.max(0, Math.round(Number(monthlyPrice || 0) * 100));
  const customPlanPriceCents = Math.max(0, Math.round(Number(customPlanPrice || 0) * 100));
  const plans = useMemo<PlanCardData[]>(() => {
    const basePlans: PlanCardData[] = [
      { id: "monthly", name: "Premium", term: "Monthly", months: 1, discount: 0, copy: "Ideal for organizations that need flexibility and no long-term commitment." },
      { id: "year1", name: "Premium", term: "1 Year", months: 12, discount: oneYearDiscount, copy: "Best for long-term use with significant savings." },
      { id: "year2", name: "Premium", term: "2 Years", months: 24, discount: twoYearDiscount, copy: "More savings for your extended commitment." },
      { id: "year3", name: "Premium", term: "3 Years", months: 36, discount: threeYearDiscount, copy: "Maximum savings for long-term partners." },
    ];

    if (!customPlanEnabled) return basePlans;

    return [
      ...basePlans,
      {
        id: "custom",
        name: customPlanName.trim() || "Custom Premium",
        term: `${customPlanDuration} ${customPlanDuration === 1 ? "Month" : "Months"}`,
        months: customPlanDuration,
        discount: 0,
        copy: "Custom commercial term for selected partners or contract pricing.",
        priceCents: customPlanPriceCents,
        isCustom: true,
      },
    ];
  }, [
    customPlanDuration,
    customPlanEnabled,
    customPlanName,
    customPlanPriceCents,
    oneYearDiscount,
    threeYearDiscount,
    twoYearDiscount,
  ]);

  function applyRange(days?: number) {
    let from = rangeFrom;
    let to = rangeTo;
    if (days) {
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - days);
      from = format(start, "yyyy-MM-dd");
      to = format(end, "yyyy-MM-dd");
      setRangeFrom(from);
      setRangeTo(to);
    }
    router.push(`/admin/pricing?${new URLSearchParams({ from, to })}`);
  }

  function save() {
    setMessage("");
    startTransition(async () => {
      const result = await updatePricingSettingsAction({
        monthlyPriceCents: monthlyCents,
        trialDays,
        oneYearDiscount,
        twoYearDiscount,
        threeYearDiscount,
        features,
        customPlanName,
        customPlanPriceCents,
        customPlanDurationMonths: customPlanDuration,
        customPlanEnabled,
        showPlansToCustomers: showPlans,
        allowTrialConversion: allowConversion,
        autoRenewPremium: autoRenew,
        prorationEnabled: proration,
      });
      if (!result.ok) {
        setMessage(result.error || "Unable to save pricing settings.");
        return;
      }
      setMessage(result.warning ? `Pricing settings saved. ${result.warning}` : "Pricing settings saved.");
      router.refresh();
    });
  }

  function openCustomPlanEditor() {
    if (!customPlanEnabled) setCustomPlanEnabled(true);
    setShowCustomPlanEditor(true);
  }

  function saveCustomPlan() {
    if (!customPlanEnabled) {
      setShowCustomPlanEditor(false);
      setMessage("Custom plan disabled. Click Save Changes to publish it.");
      return;
    }
    const nextName = customPlanName.trim();
    if (!nextName) {
      setMessage("Custom plan name is required.");
      return;
    }
    if (!Number.isFinite(customPlanPriceCents) || customPlanPriceCents < 0) {
      setMessage("Custom plan price must be valid.");
      return;
    }
    if (!Number.isInteger(customPlanDuration) || customPlanDuration < 1 || customPlanDuration > 60) {
      setMessage("Custom plan duration must be between 1 and 60 months.");
      return;
    }
    setCustomPlanName(nextName);
    setCustomPlanEnabled(true);
    setShowCustomPlanEditor(false);
    setMessage("Custom plan card added. Click Save Changes to publish it.");
  }

  const previewPlan = preview === "monthly" ? plans[0]! : plans[1]!;
  const previewPrice = termPrice(monthlyCents, previewPlan.months, previewPlan.discount);

  return (
    <div className="command-center pricing-page">
      <header className="command-header organizations-header">
        <div>
          <h1>Plans & Pricing</h1>
          <p>Manage your subscription plans, pricing, and billing settings.</p>
        </div>
        <div className="command-actions">
          <details className="admin-popover date-popover">
            <summary className="admin-action-button">
              <CalendarDays /> <span>{dateLabel(data.range.from, data.range.to)}</span> <ChevronDown />
            </summary>
            <div className="admin-popover-panel date-panel">
              <div className="date-presets">
                <button type="button" onClick={() => applyRange(7)}>7 days</button>
                <button type="button" onClick={() => applyRange(30)}>30 days</button>
                <button type="button" onClick={() => applyRange(90)}>90 days</button>
              </div>
              <label>From<input type="date" value={rangeFrom} onChange={(event) => setRangeFrom(event.target.value)} /></label>
              <label>To<input type="date" value={rangeTo} onChange={(event) => setRangeTo(event.target.value)} /></label>
              <button className="date-apply" type="button" onClick={() => applyRange()}>Apply reporting period</button>
            </div>
          </details>
          <Link className="admin-action-button" href={`/admin/pricing/export?from=${data.range.from}&to=${data.range.to}`}>
            <Download /> <span>Export Report</span>
          </Link>
          <Link className="admin-action-button help-button" href="/admin/subscriptions">
            <HelpCircle /> <span>Help</span>
          </Link>
          <details className="admin-popover notification-popover">
            <summary className="notification-button" aria-label="Open pricing notifications">
              <Bell />
              {data.notifications.length > 0 && <span>{data.notifications.length}</span>}
            </summary>
            <div className="admin-popover-panel notification-panel">
              <div className="notification-heading">
                <div><strong>Pricing Activity</strong><small>Plan and billing signals</small></div>
                <button type="button" onClick={() => router.refresh()} title="Refresh notifications"><RefreshCw /></button>
              </div>
              <div className="org-notification-list">
                {data.notifications.map((notification) => (
                  <div key={notification.id}>
                    <span><WalletCards /></span>
                    <div><strong>{notification.title}</strong><small>{notification.detail}</small></div>
                    <time>{formatDistanceToNowStrict(new Date(notification.at), { addSuffix: true })}</time>
                  </div>
                ))}
              </div>
              <Link href="/admin/audit-logs">View all activity <ArrowRight /></Link>
            </div>
          </details>
          <span className="organizations-admin-avatar" title="Klein Conejos">KC</span>
        </div>
      </header>

      {message && <button className="org-toast" type="button" onClick={() => setMessage("")}>{message}<X /></button>}

      <section className="pricing-panel pricing-plans-panel">
        <div className="pricing-section-head">
          <div>
            <h2>Current Plan Structure</h2>
            <p>You currently offer the following subscription plans.</p>
          </div>
          <label className="pricing-toggle-row">Show plans to customers <Toggle checked={showPlans} onChange={setShowPlans} label="Show plans to customers" /></label>
        </div>
        <div className="pricing-plan-grid">
          {plans.map((plan) => {
            const baseline = monthlyCents * plan.months;
            const price = plan.priceCents ?? termPrice(monthlyCents, plan.months, plan.discount);
            const saved = Math.max(0, baseline - price);
            const computedDiscount = baseline > 0 ? Math.round((saved / baseline) * 100) : 0;
            return (
              <article className={`pricing-plan-card ${plan.id === "monthly" ? "is-active" : ""} ${plan.isCustom ? "is-custom" : ""}`} key={plan.id}>
                {(plan.discount > 0 || plan.isCustom) && (
                  <em>
                    {saved > 0
                      ? `Save ${plan.discount || computedDiscount}%`
                      : "Custom plan"}
                  </em>
                )}
                {plan.isCustom && (
                  <button
                    className="pricing-plan-edit"
                    type="button"
                    onClick={openCustomPlanEditor}
                  >
                    <Edit3 /> Edit
                  </button>
                )}
                <span className="pricing-plan-icon">
                  {plan.id === "monthly" ? <Star /> : plan.isCustom ? <WalletCards /> : <CalendarDays />}
                </span>
                <h3>{plan.name}</h3>
                <strong>{plan.term}</strong>
                <p>{plan.copy}</p>
                <div><b>{money(price)}</b><small> / {plan.term.toLowerCase()}</small></div>
                {plan.id === "monthly" ? (
                  <small>{data.activePremium} active premium accounts</small>
                ) : saved > 0 ? (
                  <mark>{money(saved)} saved vs monthly</mark>
                ) : (
                  <mark>Custom rate</mark>
                )}
              </article>
            );
          })}
          <button className="pricing-add-plan" type="button" onClick={openCustomPlanEditor}>
            <span>{customPlanEnabled ? <Edit3 /> : <Plus />}</span>
            <strong>{customPlanEnabled ? "Edit Custom Plan" : "Add Custom Plan"}</strong>
            <small>
              {customPlanEnabled
                ? "Update the custom plan card, price, or duration."
                : "Create a new plan with custom pricing and duration."}
            </small>
          </button>
        </div>
      </section>

      <div className="pricing-layout">
        <section className="pricing-panel pricing-features">
          <h2>Included in All Premium Plans</h2>
          {editingFeatures ? (
            <div className="pricing-feature-editor">
              {features.map((feature, index) => (
                <label key={`${feature}-${index}`}>
                  <span>Feature {index + 1}</span>
                  <input
                    value={feature}
                    onChange={(event) => {
                      const value = event.target.value;
                      setFeatures((current) => current.map((item, itemIndex) => (itemIndex === index ? value : item)));
                    }}
                  />
                  <button
                    type="button"
                    aria-label={`Remove feature ${index + 1}`}
                    onClick={() => {
                      setFeatures((current) => current.filter((_, itemIndex) => itemIndex !== index));
                    }}
                    disabled={features.length <= 1}
                  >
                    <X />
                  </button>
                </label>
              ))}
              <button type="button" onClick={() => setFeatures((current) => [...current, "New premium feature"])}>
                <Plus /> Add Feature
              </button>
              <button
                type="button"
                onClick={() => {
                  const nextFeatures = features.map((feature) => feature.trim()).filter(Boolean);
                  if (nextFeatures.length === 0) {
                    setMessage("Add at least one premium feature.");
                    return;
                  }
                  setFeatures(nextFeatures);
                  setEditingFeatures(false);
                  setMessage("Feature list updated. Click Save Changes to publish it.");
                }}
              >
                Done Editing
              </button>
            </div>
          ) : (
            <>
              <ul>
                {features.map((feature) => <li key={feature}><CheckCircle2 /> {feature}</li>)}
              </ul>
              <button type="button" onClick={() => setEditingFeatures(true)}>Edit Features</button>
            </>
          )}
        </section>

        <section className="pricing-panel pricing-settings">
          <h2>Pricing Settings</h2>
          <div className="pricing-setting-row">
            <span><strong>Currency</strong><small>Select the currency for all plan pricing.</small></span>
            <select value="PHP" disabled><option>PHP (₱) - Philippine Peso</option></select>
          </div>
          <div className="pricing-setting-row">
            <span><strong>Premium Monthly Price</strong><small>The monthly price for the Premium plan.</small></span>
            <label className="pricing-money-input">₱<input type="number" min="0" step="0.01" value={monthlyPrice} onChange={(event) => setMonthlyPrice(event.target.value)} /></label>
          </div>
          <div className="pricing-setting-row">
            <span><strong>Free Trial Duration</strong><small>New organizations get full access during the trial period.</small></span>
            <label className="pricing-days-input"><input type="number" min="1" max="60" value={trialDays} onChange={(event) => setTrialDays(Number(event.target.value))} /> days</label>
            <mark>Active</mark>
          </div>
          <div className="pricing-setting-row">
            <span><strong>Allow Trial to Premium Conversion</strong><small>Organizations can upgrade to Premium at any time.</small></span>
            <Toggle checked={allowConversion} onChange={setAllowConversion} label="Allow trial to premium conversion" />
            <small>{allowConversion ? "Enabled" : "Disabled"}</small>
          </div>
          <div className="pricing-setting-row">
            <span><strong>Auto-Renewal for Premium</strong><small>Automatically renew subscriptions at the end of the term.</small></span>
            <Toggle checked={autoRenew} onChange={setAutoRenew} label="Auto-renew premium" />
            <small>{autoRenew ? "Enabled" : "Disabled"}</small>
          </div>
          <div className="pricing-setting-row">
            <span><strong>Proration</strong><small>Charge prorated amount when upgrading or downgrading.</small></span>
            <Toggle checked={proration} onChange={setProration} label="Enable proration" />
            <small>{proration ? "Enabled" : "Disabled"}</small>
          </div>
          <div className="pricing-save-row">
            <Info />
            <span><strong>Changes are applied instantly</strong><small>Existing subscriptions will be charged based on their selected billing cycle.</small></span>
            <Link href={`/admin/pricing/export?from=${data.range.from}&to=${data.range.to}`}>Export Report</Link>
            <button type="button" disabled={pending} onClick={save}><Save /> {pending ? "Saving..." : "Save Changes"}</button>
          </div>
        </section>

        <aside className="pricing-side">
          <section className="pricing-panel">
            <h2>Annual Discount Structure</h2>
            <p>The more years they commit, the bigger the discount.</p>
            <table>
              <tbody>
                {[
                  ["Monthly", 0, 0],
                  ["1 Year", oneYearDiscount, monthlyCents * 12 - termPrice(monthlyCents, 12, oneYearDiscount)],
                  ["2 Years", twoYearDiscount, monthlyCents * 24 - termPrice(monthlyCents, 24, twoYearDiscount)],
                  ["3 Years", threeYearDiscount, monthlyCents * 36 - termPrice(monthlyCents, 36, threeYearDiscount)],
                ].map(([label, discount, saved]) => (
                  <tr key={String(label)}>
                    <td>{label}</td>
                    <td>{Number(discount) > 0 ? <input value={Number(discount)} type="number" min="0" max="90" onChange={(event) => {
                      const value = Number(event.target.value);
                      if (label === "1 Year") setOneYearDiscount(value);
                      if (label === "2 Years") setTwoYearDiscount(value);
                      if (label === "3 Years") setThreeYearDiscount(value);
                    }} /> : "-"}</td>
                    <td>{Number(saved) > 0 ? money(Number(saved)) : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="pricing-panel pricing-preview">
            <h2>Pricing Preview <small>(Customer View)</small></h2>
            <div className="pricing-tabs">
              <button type="button" className={preview === "monthly" ? "is-active" : ""} onClick={() => setPreview("monthly")}>Monthly</button>
              <button type="button" className={preview === "annual" ? "is-active" : ""} onClick={() => setPreview("annual")}>Annual</button>
            </div>
            <article>
              <h3>{preview === "monthly" ? "Premium Monthly" : "Premium Annual"}</h3>
              <b>{money(previewPrice)}</b><small> / {preview === "monthly" ? "month" : "year"}</small>
              <ul>
                <li>All premium features included</li>
                <li>{data.activeTrials} active trials eligible</li>
                <li>{data.expiringTrials} trials expiring soon</li>
              </ul>
              <Link href="/pricing" target="_blank">Preview as Customer <ExternalLink /></Link>
            </article>
          </section>
        </aside>
      </div>
      {showCustomPlanEditor && (
        <div className="org-modal-backdrop" role="presentation">
          <section className="org-modal pricing-modal" role="dialog" aria-modal="true" aria-labelledby="custom-plan-title">
            <button className="org-modal-close" type="button" onClick={() => setShowCustomPlanEditor(false)} aria-label="Close custom plan editor"><X /></button>
            <h2 id="custom-plan-title">Custom Plan</h2>
            <p>Create a configurable plan that can be enabled and exported with pricing settings.</p>
            <label>
              Plan name
              <input value={customPlanName} onChange={(event) => setCustomPlanName(event.target.value)} />
            </label>
            <label>
              Price
              <input type="number" min="0" step="0.01" value={customPlanPrice} onChange={(event) => setCustomPlanPrice(event.target.value)} />
            </label>
            <label>
              Duration months
              <input type="number" min="1" max="60" value={customPlanDuration} onChange={(event) => setCustomPlanDuration(Number(event.target.value))} />
            </label>
            <label className="pricing-toggle-row">
              Enabled
              <Toggle checked={customPlanEnabled} onChange={setCustomPlanEnabled} label="Enable custom plan" />
            </label>
            <div className="pricing-modal-actions">
              <button type="button" onClick={() => setShowCustomPlanEditor(false)}>Cancel</button>
              <button type="button" onClick={saveCustomPlan}>Apply Custom Plan</button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
