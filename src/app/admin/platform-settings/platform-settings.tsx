"use client";

import {
  ArrowRight,
  Bell,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Database,
  Download,
  ExternalLink,
  Globe2,
  HelpCircle,
  Link2,
  Palette,
  RefreshCw,
  RotateCw,
  Search,
  ServerCog,
  ShieldCheck,
  UploadCloud,
  WalletCards,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type React from "react";
import { useState, useTransition } from "react";
import { runPlatformQuickActionAction, updatePlatformSettingAction } from "./actions";

export type PlatformSettingsData = {
  range: { from: string; to: string };
  settings: {
    platformName: string;
    platformLogoUrl: string;
    platformFaviconUrl: string;
    platformPrimaryColor: string;
    platformAccentColor: string;
    platformCustomDomain: string;
    language: string;
    timezone: string;
    currency: string;
    dateFormat: string;
    numberFormat: string;
    maintenanceMode: boolean;
    bookingDefaultDurationMinutes: number;
    bookingBufferMinutes: number;
    bookingCancellationHours: number;
    bookingIntervalMinutes: number;
    twoFactorRequired: boolean;
    activeSessionLimit: number;
    apiKeyLimit: number;
    emailNotifications: boolean;
    inAppNotifications: boolean;
    paymentAlerts: boolean;
    weeklyReports: boolean;
    paymongoConnected: boolean;
    resendConnected: boolean;
    googleAnalyticsConnected: boolean;
    facebookPixelConnected: boolean;
  };
  system: {
    environment: string;
    region: string;
    version: string;
    database: string;
    databaseHealthy: boolean;
    configSource: "database" | "local";
    processUptimeLabel: string;
    activeSessions: number | null;
    errorRate: number | null;
    cpuUsage: number | null;
    memoryUsage: number;
    storageUsage: number | null;
    sslValid: boolean;
    backupStatus: string;
    lastUpdatedAt: string;
    lastUpdatedLabel: string;
    lastBackupAt: string;
    lastBackupLabel: string;
    nextBackupAt: string;
  };
  notifications: Array<{ id: string; title: string; detail: string; at: string; relativeLabel: string; tone: "success" | "warning" | "danger" | "info" }>;
  demo: boolean;
};

type CardTone = "cyan" | "purple" | "blue" | "green" | "orange" | "red";

const cards = [
  {
    key: "branding",
    title: "Branding & Identity",
    detail: "Manage your platform name, logo, favicon, colors, and other brand identity settings.",
    icon: Palette,
    tone: "cyan" as CardTone,
    items: ["Logo & Favicon", "Brand Colors", "Typography", "Custom Domain"],
    custom: "branding",
  },
  {
    key: "billing",
    title: "Subscription & Billing",
    detail: "Configure subscription plans, pricing, trials, taxes, and billing preferences.",
    icon: WalletCards,
    tone: "purple" as CardTone,
    items: ["Plans & Pricing", "Trial Settings", "Billing Cycles", "Taxes & Fees"],
    href: "/admin/pricing",
  },
  {
    key: "booking",
    title: "Booking Settings",
    detail: "Set default booking rules, durations, buffers and cancellation policies.",
    icon: CalendarDays,
    tone: "blue" as CardTone,
    items: ["Default Durations", "Buffer & Prep Time", "Cancellation Policy", "Rotation Rules"],
    custom: "booking",
  },
  {
    key: "localization",
    title: "Localization",
    detail: "Manage language, time zone, date format, currency and number format.",
    icon: Globe2,
    tone: "green" as CardTone,
    items: ["Language", "Time Zone", "Currency", "Date & Number Format"],
    custom: "localization",
  },
  {
    key: "security",
    title: "Security & Access",
    detail: "Control access, authentication, and security policies for your platform.",
    icon: ShieldCheck,
    tone: "orange" as CardTone,
    custom: "security",
  },
  {
    key: "notifications",
    title: "Notifications",
    detail: "Customize and manage how platform alerts and notifications are delivered.",
    icon: Bell,
    tone: "red" as CardTone,
    custom: "notifications",
  },
  {
    key: "integrations",
    title: "Integrations",
    detail: "Connect and manage third-party services and tools.",
    icon: Link2,
    tone: "cyan" as CardTone,
    custom: "integrations",
    href: "/admin/integrations",
  },
  {
    key: "tools",
    title: "System & Tools",
    detail: "System maintenance, data tools, and advanced platform utilities.",
    icon: ServerCog,
    tone: "purple" as CardTone,
    custom: "tools",
  },
];

function dateLabel(from: string, to: string) {
  return `${formatDate(from)} - ${formatDate(to, true)}`;
}

function formatDate(value: string | null, includeYear = false) {
  if (!value) return "-";
  const date = new Date(value.includes("T") ? value : `${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "-";
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[date.getMonth()]} ${date.getDate()}${includeYear ? `, ${date.getFullYear()}` : ""}`;
}

function isoDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function AdminPlatformSettings({ data }: { data: PlatformSettingsData }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [settings, setSettings] = useState(data.settings);
  const [rangeFrom, setRangeFrom] = useState(data.range.from);
  const [rangeTo, setRangeTo] = useState(data.range.to);
  const [message, setMessage] = useState("");

  function applyRange(days?: number) {
    let from = rangeFrom;
    let to = rangeTo;
    if (days) {
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - days);
      from = isoDateKey(start);
      to = isoDateKey(end);
      setRangeFrom(from);
      setRangeTo(to);
    }
    router.push(`/admin/platform-settings?${new URLSearchParams({ from, to })}`);
  }

  function updateSetting<K extends keyof PlatformSettingsData["settings"]>(key: K, configKey: string, value: PlatformSettingsData["settings"][K]) {
    const previousValue = settings[key];
    setSettings((current) => ({ ...current, [key]: value }));
    startTransition(async () => {
      try {
        const result = await updatePlatformSettingAction(configKey, String(value));
        if (!result.ok) {
          setSettings((current) => ({ ...current, [key]: previousValue }));
          setMessage(result.error || "Setting could not be saved.");
          return;
        }
        setMessage(result.error || "Setting saved.");
        router.refresh();
      } catch {
        setSettings((current) => ({ ...current, [key]: previousValue }));
        setMessage("The setting request failed. Please retry.");
      }
    });
  }

  function runQuickAction(action: "clear_cache" | "restart_queues" | "rebuild_search" | "database_backup") {
    startTransition(async () => {
      try {
        const result = await runPlatformQuickActionAction(action);
        setMessage(result.ok ? result.error || "Quick action completed." : result.error || "Quick action failed.");
        if (result.ok) router.refresh();
      } catch {
        setMessage("The quick action request failed. Please retry.");
      }
    });
  }

  return (
    <div className="command-center settings-page">
      <header className="command-header organizations-header">
        <div>
          <h1>Settings</h1>
          <p>Configure your platform, security, integrations, and system preferences.</p>
        </div>
        <div className="command-actions">
          <details className="admin-popover date-popover">
            <summary className="admin-action-button"><CalendarDays /> <span>{dateLabel(data.range.from, data.range.to)}</span> <ChevronDown /></summary>
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
          <Link className="admin-action-button" href={`/admin/platform-settings/export?from=${data.range.from}&to=${data.range.to}`}><Download /> <span>Export</span></Link>
          <Link className="admin-action-button help-button" href="/admin/audit-logs"><HelpCircle /> <span>Help</span></Link>
          <details className="admin-popover notification-popover">
            <summary className="notification-button" aria-label="Open settings notifications">
              <Bell />
              {data.notifications.length > 0 && <span>{data.notifications.length}</span>}
            </summary>
            <div className="admin-popover-panel notification-panel">
              <div className="notification-heading">
                <div><strong>Settings Alerts</strong><small>System and configuration activity</small></div>
                <button type="button" onClick={() => router.refresh()} title="Refresh notifications"><RefreshCw /></button>
              </div>
              <div className="analytics-notification-list">
                {data.notifications.map((notification) => (
                  <div className={`analytics-notification tone-${notification.tone}`} key={notification.id}>
                    <span><ServerCog /></span>
                    <div><strong>{notification.title}</strong><small>{notification.detail}</small></div>
                    <time dateTime={notification.at}>{notification.relativeLabel}</time>
                  </div>
                ))}
              </div>
              <Link href="/admin/audit-logs">View audit logs <ArrowRight /></Link>
            </div>
          </details>
          <span className="organizations-admin-avatar" title="Klein Conejos">KC</span>
        </div>
      </header>

      {message && <button className="org-toast" type="button" onClick={() => setMessage("")}>{message}<X /></button>}

      <div className="settings-layout">
        <main>
          <h2>Platform Configuration</h2>
          <section className="settings-card-grid">
            {cards.map((card) => (
              <SettingsCard
                key={card.key}
                card={card}
                settings={settings}
                pending={pending}
                onToggle={updateSetting}
                onQuickAction={runQuickAction}
              />
            ))}
          </section>
          <SystemFooter data={data} />
        </main>
        <aside className="settings-side">
          <SystemOverview data={data} />
          <PlatformInformation data={data} />
          <QuickActions pending={pending} onQuickAction={runQuickAction} />
        </aside>
      </div>

    </div>
  );
}

function SettingsCard({
  card,
  settings,
  pending,
  onToggle,
  onQuickAction,
}: {
  card: (typeof cards)[number];
  settings: PlatformSettingsData["settings"];
  pending: boolean;
  onToggle: <K extends keyof PlatformSettingsData["settings"]>(key: K, configKey: string, value: PlatformSettingsData["settings"][K]) => void;
  onQuickAction: (action: "clear_cache" | "restart_queues" | "rebuild_search" | "database_backup") => void;
}) {
  const Icon = card.icon;
  return (
    <article className={`settings-card tone-${card.tone}`}>
      <header>
        <span><Icon /></span>
        <div><h3>{card.title}</h3><p>{card.detail}</p></div>
      </header>
      {card.custom === "security" ? (
        <SettingRows rows={[
          ["Two-Factor Authentication", <Toggle key="2fa" checked={settings.twoFactorRequired} disabled={pending} onChange={(value) => onToggle("twoFactorRequired", "security_two_factor_required", value)} />],
          ["Password Policy", <Badge key="policy" label="Strong" />],
          ["Active Sessions", <Badge key="sessions" label={String(settings.activeSessionLimit)} />],
          ["API Keys", <Badge key="keys" label={String(settings.apiKeyLimit)} />],
        ]} />
      ) : card.custom === "branding" ? (
        <SettingRows rows={[
          ["Platform Name", <InlineInput key="name" value={settings.platformName} disabled={pending} onChange={(value) => onToggle("platformName", "platform_name", value)} />],
          ["Logo URL", <InlineInput key="logo" value={settings.platformLogoUrl} disabled={pending} placeholder="https://..." onChange={(value) => onToggle("platformLogoUrl", "platform_logo_url", value)} />],
          ["Primary Color", <ColorInput key="primary" value={settings.platformPrimaryColor} disabled={pending} onChange={(value) => onToggle("platformPrimaryColor", "platform_primary_color", value)} />],
          ["Custom Domain", <InlineInput key="domain" value={settings.platformCustomDomain} disabled={pending} placeholder="app.example.com" onChange={(value) => onToggle("platformCustomDomain", "platform_custom_domain", value)} />],
        ]} />
      ) : card.custom === "booking" ? (
        <SettingRows rows={[
          ["Default Duration", <InlineNumber key="duration" value={settings.bookingDefaultDurationMinutes} suffix="min" disabled={pending} onChange={(value) => onToggle("bookingDefaultDurationMinutes", "booking_default_duration_minutes", value)} />],
          ["Buffer & Prep", <InlineNumber key="buffer" value={settings.bookingBufferMinutes} suffix="min" disabled={pending} onChange={(value) => onToggle("bookingBufferMinutes", "booking_buffer_minutes", value)} />],
          ["Cancellation Cutoff", <InlineNumber key="cancel" value={settings.bookingCancellationHours} suffix="hr" disabled={pending} onChange={(value) => onToggle("bookingCancellationHours", "booking_cancellation_hours", value)} />],
          ["Booking Interval", <InlineNumber key="interval" value={settings.bookingIntervalMinutes} suffix="min" disabled={pending} onChange={(value) => onToggle("bookingIntervalMinutes", "booking_interval_minutes", value)} />],
        ]} />
      ) : card.custom === "localization" ? (
        <SettingRows rows={[
          ["Language", <InlineSelect key="language" value={settings.language} disabled={pending} options={["English", "Filipino"]} onChange={(value) => onToggle("language", "platform_language", value)} />],
          ["Time Zone", <InlineSelect key="timezone" value={settings.timezone} disabled={pending} options={["Asia/Singapore", "Asia/Manila", "UTC"]} onChange={(value) => onToggle("timezone", "platform_timezone", value)} />],
          ["Currency", <InlineSelect key="currency" value={settings.currency} disabled={pending} options={["PHP", "USD", "SGD"]} onChange={(value) => onToggle("currency", "platform_currency", value)} />],
          ["Number Format", <InlineSelect key="number" value={settings.numberFormat} disabled={pending} options={["1,234.56", "1.234,56", "1234.56"]} onChange={(value) => onToggle("numberFormat", "platform_number_format", value)} />],
        ]} />
      ) : card.custom === "notifications" ? (
        <SettingRows rows={[
          ["Email Notifications", <Toggle key="email" checked={settings.emailNotifications} disabled={pending} onChange={(value) => onToggle("emailNotifications", "notifications_email_enabled", value)} />],
          ["In-App Notifications", <Toggle key="app" checked={settings.inAppNotifications} disabled={pending} onChange={(value) => onToggle("inAppNotifications", "notifications_in_app_enabled", value)} />],
          ["Payment Alerts", <Toggle key="pay" checked={settings.paymentAlerts} disabled={pending} onChange={(value) => onToggle("paymentAlerts", "notifications_payment_alerts_enabled", value)} />],
          ["Weekly Reports", <Toggle key="reports" checked={settings.weeklyReports} disabled={pending} onChange={(value) => onToggle("weeklyReports", "notifications_weekly_reports_enabled", value)} />],
        ]} />
      ) : card.custom === "integrations" ? (
        <SettingRows rows={[
          ["PayMongo", <Toggle key="paymongo" checked={settings.paymongoConnected} disabled={pending} onChange={(value) => onToggle("paymongoConnected", "integration_paymongo_connected", value)} />],
          ["Resend", <Toggle key="resend" checked={settings.resendConnected} disabled={pending} onChange={(value) => onToggle("resendConnected", "integration_resend_connected", value)} />],
          ["Google Analytics", <Toggle key="ga" checked={settings.googleAnalyticsConnected} disabled={pending} onChange={(value) => onToggle("googleAnalyticsConnected", "integration_google_analytics_connected", value)} />],
          ["Facebook Pixel", <Toggle key="pixel" checked={settings.facebookPixelConnected} disabled={pending} onChange={(value) => onToggle("facebookPixelConnected", "integration_facebook_pixel_connected", value)} />],
        ]} />
      ) : card.custom === "tools" ? (
        <SettingRows rows={[
          ["Maintenance Mode", <Toggle key="maintenance" checked={settings.maintenanceMode} disabled={pending} onChange={(value) => onToggle("maintenanceMode", "platform_maintenance_mode", value)} />],
          ["Audit Logs", <ArrowRight key="audit" />],
          ["Data Export", <Download key="export" />],
          ["Data Import", <UploadCloud key="import" />],
          ["Config Snapshot", <button key="backup" type="button" onClick={() => onQuickAction("database_backup")}>Save now</button>],
        ]} />
      ) : (
        <ul>
          {card.items?.map((item) => <li key={item}><CheckCircle2 /> {item}</li>)}
        </ul>
      )}
      {card.href ? (
        <Link href={card.href}>Manage <ArrowRight /></Link>
      ) : (
        <p className="settings-save-note">Changes save automatically to app_config.</p>
      )}
    </article>
  );
}

function SettingRows({ rows }: { rows: Array<[string, React.ReactNode]> }) {
  return <div className="settings-row-list">{rows.map(([label, control]) => <div key={label}><span>{label}</span>{control}</div>)}</div>;
}

function Toggle({ checked, disabled, onChange }: { checked: boolean; disabled?: boolean; onChange: (checked: boolean) => void }) {
  return <button className={`pricing-toggle ${checked ? "is-on" : ""}`} type="button" disabled={disabled} onClick={() => onChange(!checked)}><span /></button>;
}

function Badge({ label }: { label: string }) {
  return <em className="settings-mini-badge">{label}</em>;
}

function InlineInput({
  value,
  disabled,
  placeholder,
  onChange,
}: {
  value: string;
  disabled?: boolean;
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  return (
    <input
      className="settings-inline-input"
      disabled={disabled}
      placeholder={placeholder}
      value={draft}
      onBlur={() => draft !== value && onChange(draft)}
      onChange={(event) => setDraft(event.target.value)}
    />
  );
}

function InlineNumber({
  value,
  suffix,
  disabled,
  onChange,
}: {
  value: number;
  suffix: string;
  disabled?: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <label className="settings-inline-number">
      <input
        disabled={disabled}
        min={0}
        type="number"
        value={value}
        onChange={(event) => onChange(Number(event.target.value) || 0)}
      />
      <span>{suffix}</span>
    </label>
  );
}

function InlineSelect({
  value,
  options,
  disabled,
  onChange,
}: {
  value: string;
  options: string[];
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <select
      className="settings-inline-select"
      disabled={disabled}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      {options.map((option) => <option key={option} value={option}>{option}</option>)}
    </select>
  );
}

function ColorInput({
  value,
  disabled,
  onChange,
}: {
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className="settings-color-input">
      <input
        aria-label="Brand color"
        disabled={disabled}
        type="color"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      <span>{value.toUpperCase()}</span>
    </label>
  );
}

function SystemOverview({ data }: { data: PlatformSettingsData }) {
  return (
    <section className="admin-panel settings-side-card">
      <h2>System Overview</h2>
      <div className="settings-status-line"><CheckCircle2 /><span>Database</span><strong>{data.system.databaseHealthy ? "Connected" : "Disconnected"}</strong></div>
      <small>Last checked {data.system.lastUpdatedLabel}</small>
      <dl>
        <div><dt>App Process Uptime</dt><dd>{data.system.processUptimeLabel}</dd></div>
        <div><dt>Config Source</dt><dd>{data.system.configSource === "database" ? "Supabase" : "Local preview"}</dd></div>
        <div><dt>Maintenance</dt><dd>{data.settings.maintenanceMode ? "Enabled" : "Off"}</dd></div>
      </dl>
    </section>
  );
}

function PlatformInformation({ data }: { data: PlatformSettingsData }) {
  return (
    <section className="admin-panel settings-side-card">
      <h2>Platform Information</h2>
      <dl>
        <div><dt>Environment</dt><dd>{data.system.environment}</dd></div>
        <div><dt>Version</dt><dd>{data.system.version}</dd></div>
        <div><dt>Last Updated</dt><dd>{formatDate(data.system.lastUpdatedAt, true)}</dd></div>
      </dl>
      <Link href="/admin/audit-logs">View Changelog <ExternalLink /></Link>
    </section>
  );
}

function QuickActions({ pending, onQuickAction }: { pending: boolean; onQuickAction: (action: "clear_cache" | "restart_queues" | "rebuild_search" | "database_backup") => void }) {
  return (
    <section className="admin-panel settings-side-card">
      <h2>Quick Actions</h2>
      <div className="settings-quick-actions">
        <button disabled={pending} type="button" onClick={() => onQuickAction("clear_cache")}><CalendarDays />Refresh App Cache</button>
        <button disabled={pending} type="button" onClick={() => onQuickAction("restart_queues")}><RotateCw />Refresh Runtime Status</button>
        <button disabled={pending} type="button" onClick={() => onQuickAction("rebuild_search")}><Search />Refresh Admin Index</button>
        <button disabled={pending} type="button" onClick={() => onQuickAction("database_backup")}><Database />Save Config Snapshot</button>
      </div>
    </section>
  );
}

function SystemFooter({ data }: { data: PlatformSettingsData }) {
  return (
    <section className="admin-panel settings-footer">
      <InfoCell title="Environment" value={data.system.environment} detail={data.system.region} />
      <InfoCell title="App Process" value={data.system.processUptimeLabel} detail="Current Next.js process uptime" tone="green" />
      <InfoCell title="Database" value={data.system.database} detail={data.system.databaseHealthy ? "Status: Healthy" : "Status: Check required"} tone={data.system.databaseHealthy ? "green" : "orange"} />
      <InfoCell title="Last Backup" value={data.system.lastBackupLabel} detail={formatDate(data.system.lastBackupAt, true)} />
      <InfoCell title="Config Source" value={data.system.configSource === "database" ? "Supabase" : "Local"} detail={`${data.settings.platformName} platform settings`} />
      <div className="settings-usage-bars">
        <Meter label="CPU Usage" value={data.system.cpuUsage} />
        <Meter label="Memory Usage" value={data.system.memoryUsage} />
        <Meter label="Storage Usage" value={data.system.storageUsage} />
      </div>
      <InfoCell title="Transport" value={data.system.sslValid ? "HTTPS" : "Local HTTP"} detail={`Next backup ${formatDate(data.system.nextBackupAt, true)}`} tone={data.system.sslValid ? "green" : "orange"} />
    </section>
  );
}

function InfoCell({ title, value, detail, tone }: { title: string; value: string; detail: string; tone?: "green" | "orange" | "red" }) {
  return <div className={`settings-info-cell ${tone ? `tone-${tone}` : ""}`}><small>{title}</small><strong>{value}</strong><span>{detail}</span></div>;
}

function Meter({ label, value }: { label: string; value: number | null }) {
  return <div><span>{label}</span><strong>{value === null ? "N/A" : `${Math.round(value)}%`}</strong><i><b style={{ width: `${value === null ? 0 : Math.round(value)}%` }} /></i></div>;
}
