"use client";

import {
  ArrowRight,
  Bell,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  Download,
  HelpCircle,
  Plug,
  Plus,
  RefreshCw,
  Settings2,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  addWebhookEndpointAction,
  deleteWebhookEndpointAction,
  setPayMongoEnabledAction,
  testPayMongoConnectionAction,
  toggleWebhookEndpointAction,
  type WebhookEndpoint,
} from "./actions";

export type IntegrationLog = {
  id: string;
  event: string;
  source: string;
  status: "success" | "failed" | "pending";
  detail: string;
  at: string;
};

export type IntegrationsData = {
  range: { from: string; to: string };
  paymongo: {
    configured: boolean;
    enabled: boolean;
    connected: boolean;
    environment: string;
    credentialId: string;
    lastPaymentAt: string | null;
    lastSyncAt: string | null;
  };
  endpoints: WebhookEndpoint[];
  logs: IntegrationLog[];
  configSource: "database" | "local";
  databaseHealthy: boolean;
  notifications: IntegrationLog[];
  system: {
    environment: string;
    region: string;
    version: string;
    processUptimeSeconds: number;
    memoryUsage: number;
    transport: string;
    lastConfigAt: string | null;
  };
};

const webhookEvents = [
  ["subscription.created", "Subscription created"],
  ["subscription.renewed", "Subscription renewed"],
  ["subscription.cancelled", "Subscription cancelled"],
  ["payment.succeeded", "Payment succeeded"],
  ["payment.failed", "Payment failed"],
] as const;

function formatDate(value: string | null, includeTime = true) {
  if (!value) return "Never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Never";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    ...(includeTime ? { hour: "numeric", minute: "2-digit" } : {}),
  }).format(date);
}

function dateLabel(from: string, to: string) {
  return `${formatDate(`${from}T00:00:00`, false).replace(/, \d{4}$/, "")} - ${formatDate(`${to}T00:00:00`, false)}`;
}

function uptime(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return hours ? `${hours}h ${minutes}m` : `${Math.max(1, minutes)}m`;
}

export function AdminIntegrations({ data }: { data: IntegrationsData }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [tab, setTab] = useState<"all" | "webhooks">("all");
  const [configureOpen, setConfigureOpen] = useState(false);
  const [endpointOpen, setEndpointOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [rangeFrom, setRangeFrom] = useState(data.range.from);
  const [rangeTo, setRangeTo] = useState(data.range.to);

  function applyRange() {
    router.push(`/admin/integrations?${new URLSearchParams({ from: rangeFrom, to: rangeTo })}`);
  }

  function run(action: () => Promise<{ ok: boolean; message: string }>, close?: () => void) {
    startTransition(async () => {
      try {
        const result = await action();
        setMessage(result.message);
        if (result.ok) {
          close?.();
          router.refresh();
        }
      } catch {
        setMessage("The request failed before it could be completed.");
      }
    });
  }

  const connectedCount = data.paymongo.connected ? 1 : 0;

  return (
    <div className="command-center integrations-page">
      <header className="command-header organizations-header">
        <div>
          <h1>Integrations</h1>
          <p>Manage third-party services and platform integrations.</p>
        </div>
        <div className="command-actions">
          <details className="admin-popover date-popover">
            <summary className="admin-action-button"><CalendarDays /><span>{dateLabel(data.range.from, data.range.to)}</span><ChevronDown /></summary>
            <div className="admin-popover-panel date-panel">
              <label>From<input type="date" value={rangeFrom} onChange={(event) => setRangeFrom(event.target.value)} /></label>
              <label>To<input type="date" value={rangeTo} onChange={(event) => setRangeTo(event.target.value)} /></label>
              <button className="date-apply" type="button" onClick={applyRange}>Apply reporting period</button>
            </div>
          </details>
          <Link className="admin-action-button" href={`/admin/integrations/export?from=${data.range.from}&to=${data.range.to}`}><Download /><span>Export</span></Link>
          <Link className="admin-action-button help-button" href="/admin/audit-logs"><HelpCircle /><span>Help</span></Link>
          <details className="admin-popover notification-popover">
            <summary className="notification-button" aria-label="Open integration notifications">
              <Bell />
              {data.notifications.length > 0 && <span>{data.notifications.length}</span>}
            </summary>
            <div className="admin-popover-panel notification-panel">
              <div className="notification-heading">
                <div><strong>Integration Activity</strong><small>Platform gateway and webhook events</small></div>
                <button type="button" onClick={() => router.refresh()} title="Refresh notifications"><RefreshCw /></button>
              </div>
              <div className="analytics-notification-list">
                {data.notifications.map((notification) => (
                  <div className={`analytics-notification tone-${notification.status === "failed" ? "danger" : "info"}`} key={notification.id}>
                    <span>{notification.status === "failed" ? <CircleAlert /> : <Plug />}</span>
                    <div><strong>{notification.event}</strong><small>{notification.detail}</small></div>
                    <time dateTime={notification.at}>{formatDate(notification.at)}</time>
                  </div>
                ))}
                {data.notifications.length === 0 && <p className="integration-empty-copy">No integration activity in this date range.</p>}
              </div>
              <Link href="/admin/audit-logs">View audit logs <ArrowRight /></Link>
            </div>
          </details>
          <span className="organizations-admin-avatar" title="Super Admin">SA</span>
        </div>
      </header>

      {message && <button className="org-toast" type="button" onClick={() => setMessage("")}>{message}<X /></button>}

      <div className="integrations-tabs" role="tablist" aria-label="Integration views">
        <button className={tab === "all" ? "is-active" : ""} role="tab" aria-selected={tab === "all"} onClick={() => setTab("all")}>All Integrations</button>
        <button className={tab === "webhooks" ? "is-active" : ""} role="tab" aria-selected={tab === "webhooks"} onClick={() => setTab("webhooks")}>Webhooks</button>
      </div>

      <div className="integrations-layout">
        <main>
          {tab === "all" && (
            <>
              <h2>Payment Gateway</h2>
              <article className="integration-provider-card">
                <div className="paymongo-mark" aria-hidden="true"><span /><span /></div>
                <div className="integration-provider-summary">
                  <div><h3>PayMongo</h3><StatusBadge connected={data.paymongo.connected} configured={data.paymongo.configured} /></div>
                  <p>Processes SKED platform subscriptions only. Organization booking payments remain organization-managed.</p>
                </div>
                <dl>
                  <div><dt>Status</dt><dd><i className={data.paymongo.connected ? "is-good" : "is-bad"} />{data.paymongo.connected ? "Connected" : "Disconnected"}</dd></div>
                  <div><dt>Environment</dt><dd>{data.paymongo.environment}</dd></div>
                  <div><dt>Credential ID</dt><dd>{data.paymongo.credentialId}</dd></div>
                  <div><dt>Last Platform Payment</dt><dd>{formatDate(data.paymongo.lastPaymentAt)}</dd></div>
                </dl>
                <button className="integration-configure" type="button" onClick={() => setConfigureOpen(true)}><Settings2 />Configure</button>
              </article>

              <h2>Available Integrations</h2>
              <section className="integration-coming-soon">
                <span><Plug /></span>
                <h3>More integrations coming soon.</h3>
                <p>New providers will appear here only after their server adapters and credential checks are implemented.</p>
              </section>
            </>
          )}

          {tab === "webhooks" && (
            <WebhookManager
              endpoints={data.endpoints}
              pending={pending}
              onAdd={() => setEndpointOpen(true)}
              onToggle={(id) => run(() => toggleWebhookEndpointAction(id))}
              onDelete={(id) => run(() => deleteWebhookEndpointAction(id))}
            />
          )}
        </main>

        <aside className="integration-side">
          <section className="admin-panel integration-side-card">
            <h2>Integration Overview</h2>
            <p>Live summary of configured platform services.</p>
            <dl>
              <div><dt>Total Integrations</dt><dd>1</dd></div>
              <div><dt>Connected</dt><dd className="is-good">{connectedCount}</dd></div>
              <div><dt>Disconnected</dt><dd className={connectedCount ? "" : "is-bad"}>{1 - connectedCount}</dd></div>
              <div><dt>Last Successful Sync</dt><dd>{formatDate(data.paymongo.lastSyncAt)}</dd></div>
              <div><dt>Configuration Store</dt><dd>{data.configSource === "database" ? "Supabase" : "Local preview"}</dd></div>
            </dl>
          </section>

          <WebhookSummary endpoints={data.endpoints} onAdd={() => setEndpointOpen(true)} onView={() => setTab("webhooks")} />
          <IntegrationLogs logs={data.logs} />
        </aside>
      </div>

      <IntegrationSystemFooter data={data} />

      {configureOpen && (
        <div className="admin-dialog-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setConfigureOpen(false)}>
          <section className="admin-dialog integration-dialog" role="dialog" aria-modal="true" aria-labelledby="paymongo-dialog-title">
            <header><div><h2 id="paymongo-dialog-title">Configure PayMongo</h2><p>SKED platform subscription gateway</p></div><button type="button" onClick={() => setConfigureOpen(false)} aria-label="Close"><X /></button></header>
            <div className="integration-config-status">
              <StatusBadge connected={data.paymongo.connected} configured={data.paymongo.configured} />
              <p>{data.paymongo.configured ? "Both required server keys are configured." : "Add PAYMONGO_PUBLIC_KEY and PAYMONGO_SECRET_KEY to the server environment. Keys are never stored in the browser or app_config."}</p>
            </div>
            <dl className="integration-dialog-details">
              <div><dt>Environment</dt><dd>{data.paymongo.environment}</dd></div>
              <div><dt>Public credential</dt><dd>{data.paymongo.credentialId}</dd></div>
              <div><dt>Gateway</dt><dd>{data.paymongo.enabled ? "Enabled" : "Disabled"}</dd></div>
            </dl>
            <footer>
              <button type="button" disabled={pending || !data.paymongo.configured} onClick={() => run(testPayMongoConnectionAction)}>Test Connection</button>
              <button className="is-primary" type="button" disabled={pending || (!data.paymongo.configured && !data.paymongo.enabled)} onClick={() => run(() => setPayMongoEnabledAction(!data.paymongo.enabled), () => setConfigureOpen(false))}>
                {data.paymongo.enabled ? "Disable Gateway" : "Enable Gateway"}
              </button>
            </footer>
          </section>
        </div>
      )}

      {endpointOpen && (
        <EndpointDialog
          pending={pending}
          onClose={() => setEndpointOpen(false)}
          onSubmit={(input) => run(() => addWebhookEndpointAction(input), () => setEndpointOpen(false))}
        />
      )}
    </div>
  );
}

function StatusBadge({ connected, configured }: { connected: boolean; configured: boolean }) {
  return <span className={`integration-status-badge ${connected ? "is-connected" : ""}`}>{connected ? "Connected" : configured ? "Disabled" : "Not configured"}</span>;
}

function WebhookSummary({ endpoints, onAdd, onView }: { endpoints: WebhookEndpoint[]; onAdd: () => void; onView: () => void }) {
  return (
    <section className="admin-panel integration-side-card">
      <header><div><h2>Webhook Endpoints</h2><p>Outbound platform event destinations.</p></div><button type="button" onClick={onAdd}><Plus />Add Endpoint</button></header>
      <div className="webhook-summary-table">
        {endpoints.slice(0, 3).map((endpoint) => (
          <div key={endpoint.id}><i className={endpoint.active ? "is-active" : ""} /><span><strong>{endpoint.url}</strong><small>{endpoint.events.join(", ")}</small></span><em>{endpoint.active ? "Active" : "Paused"}</em></div>
        ))}
        {endpoints.length === 0 && <p className="integration-empty-copy">No webhook endpoints configured.</p>}
      </div>
      <button className="integration-card-link" type="button" onClick={onView}>View all endpoints <ArrowRight /></button>
    </section>
  );
}

function WebhookManager({ endpoints, pending, onAdd, onToggle, onDelete }: {
  endpoints: WebhookEndpoint[];
  pending: boolean;
  onAdd: () => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <section className="integration-webhook-manager">
      <header><div><h2>Webhook Endpoints</h2><p>Send platform subscription events to administrator-controlled HTTPS destinations.</p></div><button type="button" onClick={onAdd}><Plus />Add Endpoint</button></header>
      <div className="integration-webhook-table">
        <div className="is-heading"><span>Endpoint URL</span><span>Events</span><span>Status</span><span>Actions</span></div>
        {endpoints.map((endpoint) => (
          <div key={endpoint.id}>
            <span className="webhook-url"><i className={endpoint.active ? "is-active" : ""} />{endpoint.url}</span>
            <span>{endpoint.events.join(", ")}</span>
            <span><em>{endpoint.active ? "Active" : "Paused"}</em></span>
            <span className="webhook-actions">
              <button type="button" disabled={pending} onClick={() => onToggle(endpoint.id)}>{endpoint.active ? "Pause" : "Enable"}</button>
              <button type="button" disabled={pending} onClick={() => onDelete(endpoint.id)} aria-label={`Delete ${endpoint.url}`}><Trash2 /></button>
            </span>
          </div>
        ))}
        {endpoints.length === 0 && <div className="webhook-empty"><Plug /><strong>No endpoints yet</strong><span>Add an HTTPS destination to receive selected platform events.</span></div>}
      </div>
    </section>
  );
}

function IntegrationLogs({ logs }: { logs: IntegrationLog[] }) {
  return (
    <section className="admin-panel integration-side-card integration-logs">
      <h2>Logs</h2><p>Real platform payment and integration activity.</p>
      <div className="integration-log-table">
        <div><span>Event</span><span>Source</span><span>Status</span><span>Date</span></div>
        {logs.slice(0, 7).map((log) => (
          <div key={log.id}><span title={log.detail}>{log.event}</span><span>{log.source}</span><span className={`is-${log.status}`}><i />{log.status}</span><time dateTime={log.at}>{formatDate(log.at)}</time></div>
        ))}
      </div>
      {logs.length === 0 && <p className="integration-empty-copy">No integration events were recorded for this date range.</p>}
      <Link className="integration-card-link" href="/admin/audit-logs">View all logs <ArrowRight /></Link>
    </section>
  );
}

function EndpointDialog({ pending, onClose, onSubmit }: {
  pending: boolean;
  onClose: () => void;
  onSubmit: (input: { url: string; events: string[] }) => void;
}) {
  const [url, setUrl] = useState("");
  const [events, setEvents] = useState<string[]>(["subscription.created", "payment.succeeded", "payment.failed"]);
  return (
    <div className="admin-dialog-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <form className="admin-dialog integration-dialog" onSubmit={(event) => { event.preventDefault(); onSubmit({ url, events }); }}>
        <header><div><h2>Add Webhook Endpoint</h2><p>Outbound platform events only</p></div><button type="button" onClick={onClose} aria-label="Close"><X /></button></header>
        <label className="integration-field">Endpoint URL<input type="url" required placeholder="https://example.com/sked-events" value={url} onChange={(event) => setUrl(event.target.value)} /></label>
        <fieldset className="integration-event-options"><legend>Events</legend>
          {webhookEvents.map(([value, label]) => (
            <label key={value}><input type="checkbox" checked={events.includes(value)} onChange={(event) => setEvents((current) => event.target.checked ? [...current, value] : current.filter((item) => item !== value))} /><span><CheckCircle2 />{label}</span></label>
          ))}
        </fieldset>
        <footer><button type="button" onClick={onClose}>Cancel</button><button className="is-primary" type="submit" disabled={pending || !url || events.length === 0}>Add Endpoint</button></footer>
      </form>
    </div>
  );
}

function IntegrationSystemFooter({ data }: { data: IntegrationsData }) {
  return (
    <section className="admin-panel integration-system-footer">
      <Info title="Environment" value={data.system.environment} detail={data.system.region} />
      <Info title="App Process" value={uptime(data.system.processUptimeSeconds)} detail="Current process uptime" />
      <Info title="Database" value={data.databaseHealthy ? "Supabase connected" : "Supabase disconnected"} detail={`Config: ${data.configSource}`} warning={!data.databaseHealthy} />
      <Info title="Last Configuration" value={formatDate(data.system.lastConfigAt)} detail={data.system.version} />
      <Info title="Memory" value={`${data.system.memoryUsage.toFixed(2)}%`} detail="Process RSS / host memory" />
      <Info title="Transport" value={data.system.transport} detail={data.system.transport === "HTTPS" ? "Encrypted" : "Local preview"} warning={data.system.transport !== "HTTPS"} />
    </section>
  );
}

function Info({ title, value, detail, warning = false }: { title: string; value: string; detail: string; warning?: boolean }) {
  return <div className={warning ? "is-warning" : ""}><small>{title}</small><strong>{value}</strong><span>{detail}</span></div>;
}
