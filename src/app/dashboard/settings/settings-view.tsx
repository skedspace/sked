"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  CalendarDays,
  Check,
  ChevronRight,
  CircleHelp,
  Clock,
  CreditCard,
  Edit3,
  Globe2,
  Image,
  KeyRound,
  Languages,
  Link2,
  Lock,
  LogOut,
  Mail,
  Monitor,
  Palette,
  Plus,
  Save,
  ShieldCheck,
  Store,
  Trash2,
  Upload,
  UserPlus,
  UserRound,
  UsersRound,
  WalletCards,
  Zap,
} from "lucide-react";
import { useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type Organization = {
  id: string;
  name?: string | null;
  slug?: string | null;
  plan?: string | null;
  logo_url?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
};

type NotificationPreferences = {
  booking_created: boolean;
  booking_cancelled: boolean;
  payment_received: boolean;
  daily_digest: boolean;
  marketing: boolean;
  email: boolean;
  sms: boolean;
  push: boolean;
};

type PaymentMethod = {
  id: string;
  provider: string;
  type: string;
  last4: string;
  status: "active" | "disabled";
  is_default: boolean;
};

type IntegrationSettings = {
  google_calendar: boolean;
  outlook_calendar: boolean;
  stripe: boolean;
  gcash: boolean;
  webhooks: boolean;
  public_api: boolean;
};

type SecuritySettings = {
  two_factor: boolean;
  session_timeout_minutes: number;
  staff_can_export: boolean;
  require_strong_passwords: boolean;
  login_alerts: boolean;
};

type RoleSettings = {
  staff_can_manage_bookings: boolean;
  staff_can_manage_customers: boolean;
  staff_can_view_reports: boolean;
  staff_can_manage_payments: boolean;
};

type OrgSettings = {
  business_type: string;
  website: string;
  address: string;
  primary_color: string;
  accent_color: string;
  booking_window_days: number;
  minimum_notice_minutes: number;
  cancellation_notice_hours: number;
  booking_interval_minutes: number;
  overlapping_bookings: boolean;
  auto_confirmation: boolean;
  language: string;
  date_format: string;
  time_format: string;
  currency: string;
  number_format: string;
  timezone: string;
  default_homepage: string;
  default_tab: string;
  items_per_page: number;
  dark_mode: boolean;
  compact_view: boolean;
  notification_preferences: NotificationPreferences;
  payment_methods: PaymentMethod[];
  integration_settings: IntegrationSettings;
  security_settings: SecuritySettings;
  role_settings: RoleSettings;
};

type FormState = OrgSettings & {
  name: string;
  email: string;
  phone: string;
  logo_url: string;
};

type Member = {
  user_id: string;
  role: "owner" | "staff" | string;
  created_at: string;
};

type Invitation = {
  id: string;
  email: string;
  role: string;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
};

const TABS = [
  "General",
  "Business",
  "Notifications",
  "Payment Methods",
  "Users & Roles",
  "Integrations",
  "Security",
];

const DEFAULT_NOTIFICATIONS: NotificationPreferences = {
  booking_created: true,
  booking_cancelled: true,
  payment_received: true,
  daily_digest: true,
  marketing: false,
  email: true,
  sms: false,
  push: true,
};

const DEFAULT_INTEGRATIONS: IntegrationSettings = {
  google_calendar: false,
  outlook_calendar: false,
  stripe: false,
  gcash: false,
  webhooks: false,
  public_api: false,
};

const DEFAULT_SECURITY: SecuritySettings = {
  two_factor: false,
  session_timeout_minutes: 120,
  staff_can_export: false,
  require_strong_passwords: true,
  login_alerts: true,
};

const DEFAULT_ROLES: RoleSettings = {
  staff_can_manage_bookings: true,
  staff_can_manage_customers: false,
  staff_can_view_reports: false,
  staff_can_manage_payments: false,
};

function settingsToForm(org: Organization, settings: OrgSettings): FormState {
  return {
    ...settings,
    notification_preferences: {
      ...DEFAULT_NOTIFICATIONS,
      ...(settings.notification_preferences ?? {}),
    },
    payment_methods: Array.isArray(settings.payment_methods)
      ? settings.payment_methods
      : [],
    integration_settings: {
      ...DEFAULT_INTEGRATIONS,
      ...(settings.integration_settings ?? {}),
    },
    security_settings: {
      ...DEFAULT_SECURITY,
      ...(settings.security_settings ?? {}),
    },
    role_settings: {
      ...DEFAULT_ROLES,
      ...(settings.role_settings ?? {}),
    },
    name: org.name ?? "",
    email: org.contact_email ?? "",
    phone: org.contact_phone ?? "",
    logo_url: org.logo_url ?? "",
  };
}

function initials(name: string) {
  return (name || "MS")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function SettingsView({
  orgId,
  userEmail,
  currentUserId,
  isOwner,
  organization,
  settings,
  members,
  invitations,
  subscription,
  settingsSchemaReady,
}: {
  orgId: string;
  userEmail: string;
  currentUserId: string;
  isOwner: boolean;
  organization: Organization;
  settings: OrgSettings;
  members: Member[];
  invitations: Invitation[];
  subscription: { plan?: string | null; status?: string | null } | null;
  settingsSchemaReady: boolean;
}) {
  const router = useRouter();
  const supabase = createClient();
  const db = supabase as any;
  const [tab, setTab] = useState("General");
  const [form, setForm] = useState<FormState>(() =>
    settingsToForm(organization, settings),
  );
  const [editing, setEditing] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [methodOpen, setMethodOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [methodDraft, setMethodDraft] = useState({
    provider: "Visa",
    type: "Card",
    last4: "",
  });
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const brandInitials = useMemo(() => initials(form.name), [form.name]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updateNotification(
    key: keyof NotificationPreferences,
    value: boolean,
  ) {
    update("notification_preferences", {
      ...form.notification_preferences,
      [key]: value,
    });
  }

  function updateIntegration(key: keyof IntegrationSettings, value: boolean) {
    update("integration_settings", {
      ...form.integration_settings,
      [key]: value,
    });
  }

  function updateSecurity<K extends keyof SecuritySettings>(
    key: K,
    value: SecuritySettings[K],
  ) {
    update("security_settings", {
      ...form.security_settings,
      [key]: value,
    });
  }

  function updateRole(key: keyof RoleSettings, value: boolean) {
    update("role_settings", {
      ...form.role_settings,
      [key]: value,
    });
  }

  async function saveChanges() {
    setSaving(true);
    setStatus(null);

    const orgPayload = {
      name: form.name.trim(),
      contact_email: form.email.trim() || null,
      contact_phone: form.phone.trim() || null,
      logo_url: form.logo_url.trim() || null,
    };
    const settingsPayload = {
      org_id: orgId,
      business_type: form.business_type,
      website: form.website.trim() || null,
      address: form.address.trim() || null,
      primary_color: form.primary_color,
      accent_color: form.accent_color,
      booking_window_days: Number(form.booking_window_days) || 7,
      minimum_notice_minutes: Number(form.minimum_notice_minutes) || 0,
      cancellation_notice_hours: Number(form.cancellation_notice_hours) || 0,
      booking_interval_minutes: Number(form.booking_interval_minutes) || 30,
      overlapping_bookings: form.overlapping_bookings,
      auto_confirmation: form.auto_confirmation,
      language: form.language,
      date_format: form.date_format,
      time_format: form.time_format,
      currency: form.currency,
      number_format: form.number_format,
      timezone: form.timezone,
      default_homepage: form.default_homepage,
      default_tab: form.default_tab,
      items_per_page: Number(form.items_per_page) || 20,
      dark_mode: form.dark_mode,
      compact_view: form.compact_view,
      notification_preferences: form.notification_preferences,
      payment_methods: form.payment_methods,
      integration_settings: form.integration_settings,
      security_settings: form.security_settings,
      role_settings: form.role_settings,
    };

    const orgResult = await db
      .from("organizations")
      .update(orgPayload)
      .eq("id", orgId);
    const settingsResult = await db
      .from("org_settings")
      .upsert(settingsPayload, { onConflict: "org_id" });

    setSaving(false);
    if (orgResult.error || settingsResult.error) {
      setStatus(orgResult.error?.message ?? settingsResult.error?.message);
      return;
    }

    setEditing(null);
    setStatus("Settings saved.");
    router.refresh();
  }

  async function inviteUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!inviteEmail.trim()) return;
    setBusyKey("invite");
    setStatus(null);
    const { error } = await db.from("staff_invitations").upsert(
      {
        org_id: orgId,
        email: inviteEmail.trim().toLowerCase(),
        role: "staff",
      },
      { onConflict: "org_id,email" },
    );
    setBusyKey(null);
    if (error) {
      setStatus(error.message);
      return;
    }
    setInviteEmail("");
    setStatus("Invitation saved.");
    router.refresh();
  }

  async function deleteInvitation(id: string) {
    setBusyKey(id);
    const { error } = await db.from("staff_invitations").delete().eq("id", id);
    setBusyKey(null);
    if (error) {
      setStatus(error.message);
      return;
    }
    router.refresh();
  }

  async function removeMember(userId: string) {
    if (userId === currentUserId) {
      setStatus("You cannot remove your own account.");
      return;
    }
    setBusyKey(userId);
    const { error } = await db
      .from("org_members")
      .delete()
      .eq("org_id", orgId)
      .eq("user_id", userId);
    setBusyKey(null);
    if (error) {
      setStatus(error.message);
      return;
    }
    router.refresh();
  }

  function addPaymentMethod(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next: PaymentMethod = {
      id: `pm-${Date.now()}`,
      provider: methodDraft.provider,
      type: methodDraft.type,
      last4: methodDraft.last4,
      status: "active",
      is_default: form.payment_methods.length === 0,
    };
    update("payment_methods", [...form.payment_methods, next]);
    setMethodDraft({ provider: "Visa", type: "Card", last4: "" });
    setMethodOpen(false);
  }

  function updateMethod(id: string, patch: Partial<PaymentMethod>) {
    update(
      "payment_methods",
      form.payment_methods.map((method) =>
        method.id === id
          ? { ...method, ...patch }
          : patch.is_default
            ? { ...method, is_default: false }
            : method,
      ),
    );
  }

  async function handlePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusyKey("password");
    setStatus(null);
    const { error } = await supabase.auth.updateUser({ password });
    setBusyKey(null);
    if (error) {
      setStatus(error.message);
      return;
    }
    setPassword("");
    setPasswordOpen(false);
    setStatus("Password updated.");
  }

  async function logout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <div className="space-y-5">
      <Header saving={saving} isOwner={isOwner} onSave={saveChanges} />

      {!isOwner && (
        <Notice tone="warning">
          Staff can view settings, but only owners can save changes.
        </Notice>
      )}
      {!settingsSchemaReady && (
        <Notice tone="warning">
          Run the latest settings migrations to persist all settings tabs.
        </Notice>
      )}
      {status && (
        <Notice
          tone={
            status.includes("saved") ||
            status.includes("updated") ||
            status.includes("Invitation")
              ? "success"
              : "error"
          }
        >
          {status}
        </Notice>
      )}

      <Tabs tab={tab} onChange={setTab} />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <main className="space-y-5">
          {tab === "General" && (
            <GeneralTab
              form={form}
              editing={editing}
              setEditing={setEditing}
              update={update}
              brandInitials={brandInitials}
            />
          )}
          {tab === "Business" && (
            <BusinessTab
              form={form}
              organization={organization}
              subscription={subscription}
              members={members}
              editing={editing}
              setEditing={setEditing}
              update={update}
            />
          )}
          {tab === "Notifications" && (
            <NotificationsTab
              preferences={form.notification_preferences}
              onChange={updateNotification}
            />
          )}
          {tab === "Payment Methods" && (
            <PaymentMethodsTab
              methods={form.payment_methods}
              onAdd={() => setMethodOpen(true)}
              onUpdate={updateMethod}
              onRemove={(id) =>
                update(
                  "payment_methods",
                  form.payment_methods.filter((method) => method.id !== id),
                )
              }
            />
          )}
          {tab === "Users & Roles" && (
            <UsersRolesTab
              isOwner={isOwner}
              currentUserId={currentUserId}
              members={members}
              invitations={invitations}
              roleSettings={form.role_settings}
              inviteEmail={inviteEmail}
              busyKey={busyKey}
              onInviteEmail={setInviteEmail}
              onInvite={inviteUser}
              onDeleteInvitation={deleteInvitation}
              onRemoveMember={removeMember}
              onRoleSetting={updateRole}
            />
          )}
          {tab === "Integrations" && (
            <IntegrationsTab
              integrations={form.integration_settings}
              onChange={updateIntegration}
            />
          )}
          {tab === "Security" && (
            <SecurityTab
              security={form.security_settings}
              onChange={updateSecurity}
              onPassword={() => setPasswordOpen(true)}
              onLogout={logout}
            />
          )}
        </main>

        <SettingsAside
          form={form}
          brandInitials={brandInitials}
          userEmail={userEmail}
          isOwner={isOwner}
          members={members}
          subscription={subscription}
          organization={organization}
          onPassword={() => setPasswordOpen(true)}
          onLogout={logout}
          update={update}
        />
      </div>

      <Dialog open={passwordOpen} onOpenChange={setPasswordOpen}>
        <DialogContent className="border-0 bg-white sm:rounded-2xl">
          <DialogHeader>
            <DialogTitle>Change password</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handlePassword}>
            <div className="space-y-2">
              <Label htmlFor="new-password">New password</Label>
              <Input
                id="new-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={8}
                required
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setPasswordOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={busyKey === "password"}>
                {busyKey === "password" ? "Updating..." : "Update password"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={methodOpen} onOpenChange={setMethodOpen}>
        <DialogContent className="border-0 bg-white sm:rounded-2xl">
          <DialogHeader>
            <DialogTitle>Add payment method</DialogTitle>
          </DialogHeader>
          <form
            className="grid gap-4 sm:grid-cols-2"
            onSubmit={addPaymentMethod}
          >
            <FieldSelect
              id="method-provider"
              label="Provider"
              value={methodDraft.provider}
              options={[
                "Visa",
                "Mastercard",
                "GCash",
                "PayPal",
                "Cash",
                "Bank",
              ]}
              onChange={(value) =>
                setMethodDraft((draft) => ({ ...draft, provider: value }))
              }
            />
            <FieldSelect
              id="method-type"
              label="Type"
              value={methodDraft.type}
              options={["Card", "Wallet", "Cash", "Bank transfer"]}
              onChange={(value) =>
                setMethodDraft((draft) => ({ ...draft, type: value }))
              }
            />
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="method-last4">Last 4 or reference</Label>
              <Input
                id="method-last4"
                value={methodDraft.last4}
                onChange={(event) =>
                  setMethodDraft((draft) => ({
                    ...draft,
                    last4: event.target.value,
                  }))
                }
                maxLength={12}
                placeholder="4242"
                required
              />
            </div>
            <div className="flex justify-end gap-3 sm:col-span-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setMethodOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Add method</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Header({
  saving,
  isOwner,
  onSave,
}: {
  saving: boolean;
  isOwner: boolean;
  onSave: () => void;
}) {
  return (
    <header className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
      <div>
        <h1 className="text-[28px] font-black tracking-[-0.04em] text-[#11140f]">
          Settings
        </h1>
        <p className="mt-1 text-sm text-[#646861]">
          Manage your business, preferences and system settings.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline">
          <CircleHelp />
          Help
        </Button>
        <Button
          className="bg-[#050604] px-5 text-white hover:bg-[#171a16]"
          onClick={onSave}
          disabled={saving || !isOwner}
        >
          {saving ? <Save /> : <Check />}
          {saving ? "Saving..." : "Save changes"}
        </Button>
      </div>
    </header>
  );
}

function Tabs({
  tab,
  onChange,
}: {
  tab: string;
  onChange: (tab: string) => void;
}) {
  return (
    <nav className="overflow-x-auto border-b border-black/[0.08]">
      <div className="flex min-w-max gap-8 px-2">
        {TABS.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => onChange(item)}
            className={cn(
              "border-b-2 px-2 py-4 text-sm font-semibold transition-colors",
              tab === item
                ? "border-[#62c51c] text-[#171a16]"
                : "border-transparent text-[#5f655d]",
            )}
          >
            {item}
          </button>
        ))}
      </div>
    </nav>
  );
}

function GeneralTab({
  form,
  editing,
  setEditing,
  update,
  brandInitials,
}: {
  form: FormState;
  editing: string | null;
  setEditing: (value: string | null) => void;
  update: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  brandInitials: string;
}) {
  return (
    <>
      <BrandingSection
        form={form}
        brandInitials={brandInitials}
        editing={editing === "branding"}
        onEdit={() => setEditing("branding")}
        update={update}
      />
      <BookingSection
        form={form}
        editing={editing === "booking"}
        onEdit={() => setEditing("booking")}
        update={update}
      />
      <OtherSettingsSection
        form={form}
        editing={editing === "other"}
        onEdit={() => setEditing("other")}
        update={update}
      />
    </>
  );
}

function BusinessTab({
  form,
  organization,
  subscription,
  members,
  editing,
  setEditing,
  update,
}: {
  form: FormState;
  organization: Organization;
  subscription: { plan?: string | null; status?: string | null } | null;
  members: Member[];
  editing: string | null;
  setEditing: (value: string | null) => void;
  update: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
}) {
  return (
    <>
      <BusinessInfoSection
        form={form}
        editing={editing === "business"}
        onEdit={() => setEditing("business")}
        update={update}
      />
      <SettingsSection
        id="business-operations"
        icon={<Store />}
        title="Business Operations"
        description="Manage public identity, plan details and operational links."
        editing={false}
        onEdit={() => undefined}
      >
        <div className="grid gap-4 md:grid-cols-3">
          <InfoTile
            label="Public Page"
            value={`/p/${organization.slug ?? ""}`}
            href="/dashboard/settings/page"
          />
          <InfoTile
            label="Current Plan"
            value={subscription?.plan ?? organization.plan ?? "free"}
            href="/dashboard/settings/plan"
          />
          <InfoTile
            label="Team Size"
            value={`${members.length} users`}
            href="/dashboard/settings/team"
          />
        </div>
      </SettingsSection>
      <BookingSection
        form={form}
        editing={editing === "booking"}
        onEdit={() => setEditing("booking")}
        update={update}
      />
    </>
  );
}

function NotificationsTab({
  preferences,
  onChange,
}: {
  preferences: NotificationPreferences;
  onChange: (key: keyof NotificationPreferences, value: boolean) => void;
}) {
  return (
    <>
      <SettingsSection
        id="notification-events"
        icon={<Bell />}
        title="Notification Events"
        description="Choose which business events should generate alerts."
        editing={false}
        onEdit={() => undefined}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <SwitchCard
            label="New bookings"
            description="Alert staff when a booking is created."
            checked={preferences.booking_created}
            onChange={(value) => onChange("booking_created", value)}
          />
          <SwitchCard
            label="Cancelled bookings"
            description="Alert staff when a customer cancels."
            checked={preferences.booking_cancelled}
            onChange={(value) => onChange("booking_cancelled", value)}
          />
          <SwitchCard
            label="Payment received"
            description="Notify owners when payments succeed."
            checked={preferences.payment_received}
            onChange={(value) => onChange("payment_received", value)}
          />
          <SwitchCard
            label="Daily digest"
            description="Send a daily operations summary."
            checked={preferences.daily_digest}
            onChange={(value) => onChange("daily_digest", value)}
          />
          <SwitchCard
            label="Product updates"
            description="Receive occasional SKED news."
            checked={preferences.marketing}
            onChange={(value) => onChange("marketing", value)}
          />
        </div>
      </SettingsSection>
      <SettingsSection
        id="notification-channels"
        icon={<Mail />}
        title="Delivery Channels"
        description="Pick the channels your team wants to use."
        editing={false}
        onEdit={() => undefined}
      >
        <div className="grid gap-4 md:grid-cols-3">
          <SwitchCard
            label="Email"
            description="Send notifications by email."
            checked={preferences.email}
            onChange={(value) => onChange("email", value)}
          />
          <SwitchCard
            label="SMS"
            description="Use SMS for urgent alerts."
            checked={preferences.sms}
            onChange={(value) => onChange("sms", value)}
          />
          <SwitchCard
            label="Push"
            description="Show in-app notification prompts."
            checked={preferences.push}
            onChange={(value) => onChange("push", value)}
          />
        </div>
      </SettingsSection>
    </>
  );
}

function PaymentMethodsTab({
  methods,
  onAdd,
  onUpdate,
  onRemove,
}: {
  methods: PaymentMethod[];
  onAdd: () => void;
  onUpdate: (id: string, patch: Partial<PaymentMethod>) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <SettingsSection
      id="payment-methods"
      icon={<CreditCard />}
      title="Payment Methods"
      description="Manage the payment methods you accept and display."
      editing={false}
      onEdit={onAdd}
      actionLabel="Add method"
    >
      <div className="space-y-3">
        {methods.length === 0 ? (
          <EmptyState
            title="No payment methods yet"
            description="Add Visa, Mastercard, GCash, PayPal, cash or bank transfer options."
          />
        ) : (
          methods.map((method) => (
            <div
              key={method.id}
              className="grid gap-3 rounded-xl border border-black/[0.07] p-4 md:grid-cols-[1fr_auto_auto_auto] md:items-center"
            >
              <div>
                <p className="font-black">{method.provider}</p>
                <p className="mt-1 text-sm text-[#626860]">
                  {method.type} - {method.last4}
                </p>
              </div>
              <StatusPill
                active={method.status === "active"}
                activeText="Active"
                inactiveText="Disabled"
              />
              <Button
                variant="outline"
                onClick={() => onUpdate(method.id, { is_default: true })}
                disabled={method.is_default}
              >
                {method.is_default ? "Default" : "Make default"}
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Toggle payment method"
                  onClick={() =>
                    onUpdate(method.id, {
                      status:
                        method.status === "active" ? "disabled" : "active",
                    })
                  }
                >
                  <Check />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Remove payment method"
                  onClick={() => onRemove(method.id)}
                >
                  <Trash2 />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </SettingsSection>
  );
}

function UsersRolesTab({
  isOwner,
  currentUserId,
  members,
  invitations,
  roleSettings,
  inviteEmail,
  busyKey,
  onInviteEmail,
  onInvite,
  onDeleteInvitation,
  onRemoveMember,
  onRoleSetting,
}: {
  isOwner: boolean;
  currentUserId: string;
  members: Member[];
  invitations: Invitation[];
  roleSettings: RoleSettings;
  inviteEmail: string;
  busyKey: string | null;
  onInviteEmail: (value: string) => void;
  onInvite: (event: FormEvent<HTMLFormElement>) => void;
  onDeleteInvitation: (id: string) => void;
  onRemoveMember: (userId: string) => void;
  onRoleSetting: (key: keyof RoleSettings, value: boolean) => void;
}) {
  return (
    <>
      <SettingsSection
        id="invite-users"
        icon={<UserPlus />}
        title="Invite Users"
        description="Invite staff members to help manage the business."
        editing={false}
        onEdit={() => undefined}
      >
        <form className="flex flex-col gap-3 sm:flex-row" onSubmit={onInvite}>
          <Input
            type="email"
            value={inviteEmail}
            onChange={(event) => onInviteEmail(event.target.value)}
            placeholder="staff@example.com"
            disabled={!isOwner}
            required
          />
          <Button type="submit" disabled={!isOwner || busyKey === "invite"}>
            <UserPlus />
            {busyKey === "invite" ? "Inviting..." : "Invite staff"}
          </Button>
        </form>
      </SettingsSection>
      <SettingsSection
        id="members"
        icon={<UsersRound />}
        title="Users & Roles"
        description="Review active users, pending invitations and staff permissions."
        editing={false}
        onEdit={() => undefined}
      >
        <div className="space-y-6">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead>
                <tr className="border-b border-black/[0.07] text-xs font-black text-[#626860] uppercase">
                  <th className="py-3">User</th>
                  <th className="py-3">Role</th>
                  <th className="py-3">Joined</th>
                  <th className="py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr
                    key={member.user_id}
                    className="border-b border-black/[0.06]"
                  >
                    <td className="py-4 font-black">
                      {member.user_id === currentUserId
                        ? "You"
                        : member.user_id.slice(0, 8)}
                    </td>
                    <td className="py-4 capitalize">{member.role}</td>
                    <td className="py-4">
                      {new Date(member.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-4 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={
                          !isOwner ||
                          member.user_id === currentUserId ||
                          member.role === "owner" ||
                          busyKey === member.user_id
                        }
                        onClick={() => onRemoveMember(member.user_id)}
                      >
                        Remove
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div>
            <h3 className="mb-3 text-sm font-black">Pending Invitations</h3>
            {invitations.length === 0 ? (
              <p className="text-sm text-[#626860]">No pending invitations.</p>
            ) : (
              <div className="space-y-2">
                {invitations.map((invite) => (
                  <div
                    key={invite.id}
                    className="flex items-center justify-between rounded-xl bg-[#f6f7f2] px-4 py-3 text-sm"
                  >
                    <span>
                      <span className="font-black">{invite.email}</span>
                      <span className="ml-2 text-[#626860]">
                        expires{" "}
                        {new Date(invite.expires_at).toLocaleDateString()}
                      </span>
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      disabled={!isOwner || busyKey === invite.id}
                      onClick={() => onDeleteInvitation(invite.id)}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <SwitchCard
              label="Staff can manage bookings"
              description="Allow staff to create and update bookings."
              checked={roleSettings.staff_can_manage_bookings}
              onChange={(value) =>
                onRoleSetting("staff_can_manage_bookings", value)
              }
            />
            <SwitchCard
              label="Staff can manage customers"
              description="Allow staff to edit customer records."
              checked={roleSettings.staff_can_manage_customers}
              onChange={(value) =>
                onRoleSetting("staff_can_manage_customers", value)
              }
            />
            <SwitchCard
              label="Staff can view reports"
              description="Allow staff to access analytics pages."
              checked={roleSettings.staff_can_view_reports}
              onChange={(value) =>
                onRoleSetting("staff_can_view_reports", value)
              }
            />
            <SwitchCard
              label="Staff can manage payments"
              description="Allow staff to update payment records."
              checked={roleSettings.staff_can_manage_payments}
              onChange={(value) =>
                onRoleSetting("staff_can_manage_payments", value)
              }
            />
          </div>
        </div>
      </SettingsSection>
    </>
  );
}

function IntegrationsTab({
  integrations,
  onChange,
}: {
  integrations: IntegrationSettings;
  onChange: (key: keyof IntegrationSettings, value: boolean) => void;
}) {
  const rows: Array<[keyof IntegrationSettings, string, string]> = [
    [
      "google_calendar",
      "Google Calendar",
      "Sync bookings with Google Calendar.",
    ],
    [
      "outlook_calendar",
      "Outlook Calendar",
      "Sync bookings with Outlook Calendar.",
    ],
    ["stripe", "Stripe", "Accept card payments with Stripe."],
    ["gcash", "GCash", "Track GCash/manual wallet payments."],
    ["webhooks", "Webhooks", "Send booking events to external systems."],
    ["public_api", "Public API", "Enable API access for custom integrations."],
  ];
  return (
    <SettingsSection
      id="integrations"
      icon={<Link2 />}
      title="Integrations"
      description="Connect SKED with calendars, payments and operations tools."
      editing={false}
      onEdit={() => undefined}
    >
      <div className="grid gap-4 md:grid-cols-2">
        {rows.map(([key, label, description]) => (
          <SwitchCard
            key={key}
            label={label}
            description={description}
            checked={integrations[key]}
            onChange={(value) => onChange(key, value)}
          />
        ))}
      </div>
    </SettingsSection>
  );
}

function SecurityTab({
  security,
  onChange,
  onPassword,
  onLogout,
}: {
  security: SecuritySettings;
  onChange: <K extends keyof SecuritySettings>(
    key: K,
    value: SecuritySettings[K],
  ) => void;
  onPassword: () => void;
  onLogout: () => void;
}) {
  return (
    <>
      <SettingsSection
        id="security"
        icon={<ShieldCheck />}
        title="Security Settings"
        description="Control login, access and export protections."
        editing={false}
        onEdit={() => undefined}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <SwitchCard
            label="Two-factor authentication"
            description="Require an extra login step for owners."
            checked={security.two_factor}
            onChange={(value) => onChange("two_factor", value)}
          />
          <SwitchCard
            label="Strong passwords"
            description="Require 8+ characters for new passwords."
            checked={security.require_strong_passwords}
            onChange={(value) => onChange("require_strong_passwords", value)}
          />
          <SwitchCard
            label="Login alerts"
            description="Notify owners about new sign-ins."
            checked={security.login_alerts}
            onChange={(value) => onChange("login_alerts", value)}
          />
          <SwitchCard
            label="Staff report exports"
            description="Allow staff to download reports."
            checked={security.staff_can_export}
            onChange={(value) => onChange("staff_can_export", value)}
          />
        </div>
        <div className="mt-5 max-w-xs">
          <Label htmlFor="session-timeout">Session timeout</Label>
          <select
            id="session-timeout"
            className="mt-2 h-11 w-full rounded-xl border border-black/10 bg-white px-3 text-sm font-semibold"
            value={String(security.session_timeout_minutes)}
            onChange={(event) =>
              onChange("session_timeout_minutes", Number(event.target.value))
            }
          >
            <option value="30">30 minutes</option>
            <option value="60">1 hour</option>
            <option value="120">2 hours</option>
            <option value="480">8 hours</option>
          </select>
        </div>
      </SettingsSection>
      <SettingsSection
        id="account-security"
        icon={<KeyRound />}
        title="Account Access"
        description="Update your own password or end the current session."
        editing={false}
        onEdit={onPassword}
        actionLabel="Change password"
      >
        <Button
          variant="outline"
          className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
          onClick={onLogout}
        >
          <LogOut />
          Logout
        </Button>
      </SettingsSection>
    </>
  );
}

function BusinessInfoSection({
  form,
  editing,
  onEdit,
  update,
}: {
  form: FormState;
  editing: boolean;
  onEdit: () => void;
  update: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
}) {
  return (
    <SettingsSection
      id="business"
      icon={<Store />}
      title="Business Information"
      description="Update your business details and contact information."
      editing={editing}
      onEdit={onEdit}
    >
      <div className="grid gap-6 md:grid-cols-3">
        <TextSetting
          label="Business Name"
          value={form.name}
          editing={editing}
          onChange={(value) => update("name", value)}
        />
        <TextSetting
          label="Email"
          value={form.email}
          type="email"
          editing={editing}
          onChange={(value) => update("email", value)}
        />
        <TextSetting
          label="Phone"
          value={form.phone}
          editing={editing}
          onChange={(value) => update("phone", value)}
        />
        <TextSetting
          label="Business Type"
          value={form.business_type}
          editing={editing}
          onChange={(value) => update("business_type", value)}
        />
        <TextSetting
          label="Website"
          value={form.website}
          editing={editing}
          onChange={(value) => update("website", value)}
        />
        <TextSetting
          label="Address"
          value={form.address}
          editing={editing}
          onChange={(value) => update("address", value)}
        />
      </div>
    </SettingsSection>
  );
}

function BrandingSection({
  form,
  brandInitials,
  editing,
  onEdit,
  update,
}: {
  form: FormState;
  brandInitials: string;
  editing: boolean;
  onEdit: () => void;
  update: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [logoUploading, setLogoUploading] = useState(false);

  async function handleLogoUpload(file: File) {
    setLogoUploading(true);
    try {
      const supabase = createClient();
      const path = `org-logos/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("logos")
        .upload(path, file);
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("logos").getPublicUrl(path);
      if (urlData?.publicUrl) {
        update("logo_url", urlData.publicUrl);
      }
    } catch {
      // upload failed silently – user can still paste a URL manually
    } finally {
      setLogoUploading(false);
    }
  }

  return (
    <SettingsSection
      id="branding"
      icon={<Image />}
      title="Branding"
      description="Customize how your brand appears in SKED."
      editing={editing}
      onEdit={onEdit}
    >
      <div className="grid gap-6 md:grid-cols-[240px_1fr_1fr]">
        <div>
          <p className="text-xs font-semibold text-[#626860]">Logo</p>
          <div className="mt-3 flex items-center gap-4">
            {form.logo_url ? (
              <img
                src={form.logo_url}
                alt="Business logo"
                className="h-14 w-14 rounded-xl object-cover"
              />
            ) : (
              <span className="grid h-14 w-14 place-items-center rounded-xl bg-[#050604] text-lg font-black text-[#b9f34b]">
                {brandInitials}
              </span>
            )}
            <Button
              variant="outline"
              type="button"
              disabled={logoUploading}
              onClick={() => fileRef.current?.click()}
            >
              <Upload />
              {logoUploading ? "Uploading..." : "Change logo"}
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleLogoUpload(file);
                e.target.value = "";
              }}
            />
          </div>
          {editing && (
            <Input
              className="mt-3"
              value={form.logo_url}
              onChange={(event) => update("logo_url", event.target.value)}
              placeholder="https://..."
            />
          )}
          <p className="mt-2 text-xs text-[#7b8077]">
            Recommended: Square PNG, 512x512px
          </p>
        </div>
        <ColorSetting
          label="Primary Color"
          value={form.primary_color}
          editing={editing}
          onChange={(value) => update("primary_color", value)}
        />
        <ColorSetting
          label="Accent Color"
          value={form.accent_color}
          editing={editing}
          onChange={(value) => update("accent_color", value)}
        />
      </div>
    </SettingsSection>
  );
}

function BookingSection({
  form,
  editing,
  onEdit,
  update,
}: {
  form: FormState;
  editing: boolean;
  onEdit: () => void;
  update: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
}) {
  return (
    <SettingsSection
      id="booking"
      icon={<CalendarDays />}
      title="Booking Preferences"
      description="Configure default booking rules and preferences."
      editing={editing}
      onEdit={onEdit}
    >
      <div className="grid gap-6 md:grid-cols-3">
        <NumberSetting
          icon={<CalendarDays />}
          label="Booking Window"
          suffix="days in advance"
          value={form.booking_window_days}
          editing={editing}
          onChange={(value) => update("booking_window_days", value)}
        />
        <NumberSetting
          icon={<Clock />}
          label="Minimum Booking Notice"
          suffix="minutes"
          value={form.minimum_notice_minutes}
          editing={editing}
          onChange={(value) => update("minimum_notice_minutes", value)}
        />
        <NumberSetting
          icon={<Clock />}
          label="Cancellation Policy"
          suffix="hours before booking"
          value={form.cancellation_notice_hours}
          editing={editing}
          onChange={(value) => update("cancellation_notice_hours", value)}
        />
        <NumberSetting
          icon={<CalendarDays />}
          label="Booking Interval"
          suffix="minutes"
          value={form.booking_interval_minutes}
          editing={editing}
          onChange={(value) => update("booking_interval_minutes", value)}
        />
        <ToggleSetting
          label="Overlapping Bookings"
          value={form.overlapping_bookings}
          enabledText="Allowed"
          disabledText="Not allowed"
          editing={editing}
          onChange={(value) => update("overlapping_bookings", value)}
        />
        <ToggleSetting
          label="Auto Confirmation"
          value={form.auto_confirmation}
          enabledText="Enabled"
          disabledText="Disabled"
          editing={editing}
          onChange={(value) => update("auto_confirmation", value)}
        />
      </div>
    </SettingsSection>
  );
}

function OtherSettingsSection({
  form,
  editing,
  onEdit,
  update,
}: {
  form: FormState;
  editing: boolean;
  onEdit: () => void;
  update: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
}) {
  return (
    <SettingsSection
      id="other"
      icon={<Palette />}
      title="Other Settings"
      description="Manage locale preferences and system settings."
      editing={editing}
      onEdit={onEdit}
    >
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-6">
        <SelectSetting
          icon={<Languages />}
          label="Language"
          value={form.language}
          editing={editing}
          options={["English", "Filipino"]}
          onChange={(value) => update("language", value)}
        />
        <SelectSetting
          icon={<CalendarDays />}
          label="Date Format"
          value={form.date_format}
          editing={editing}
          options={["MMM d, yyyy", "dd/MM/yyyy", "MM/dd/yyyy"]}
          onChange={(value) => update("date_format", value)}
        />
        <SelectSetting
          icon={<Clock />}
          label="Time Format"
          value={form.time_format}
          editing={editing}
          options={["12-hour (AM/PM)", "24-hour"]}
          onChange={(value) => update("time_format", value)}
        />
        <SelectSetting
          icon={<WalletCards />}
          label="Currency"
          value={form.currency}
          editing={editing}
          options={["PHP (PHP)", "USD ($)", "SGD ($)"]}
          onChange={(value) => update("currency", value)}
        />
        <SelectSetting
          icon={<Globe2 />}
          label="Number Format"
          value={form.number_format}
          editing={editing}
          options={["1,234.56", "1.234,56"]}
          onChange={(value) => update("number_format", value)}
        />
        <SelectSetting
          icon={<Clock />}
          label="Time Zone"
          value={form.timezone}
          editing={editing}
          options={["Asia/Manila", "Asia/Singapore", "UTC"]}
          onChange={(value) => update("timezone", value)}
        />
      </div>
    </SettingsSection>
  );
}

function SettingsAside({
  form,
  brandInitials,
  userEmail,
  isOwner,
  members,
  subscription,
  organization,
  onPassword,
  onLogout,
  update,
}: {
  form: FormState;
  brandInitials: string;
  userEmail: string;
  isOwner: boolean;
  members: Member[];
  subscription: { plan?: string | null; status?: string | null } | null;
  organization: Organization;
  onPassword: () => void;
  onLogout: () => void;
  update: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
}) {
  return (
    <aside className="space-y-5">
      <SideCard icon={<Zap />} title="Quick Actions">
        <QuickLink
          href="/dashboard/settings/team"
          label="Manage Users & Roles"
        />
        <QuickLink href="/dashboard/payments" label="Payment Methods" />
        <QuickLink
          href="/dashboard/settings/calendar"
          label="Calendar Settings"
        />
        <QuickLink href="/dashboard/settings/embed" label="Integrations" />
        <QuickLink href="/dashboard/settings/page" label="Public Page" />
      </SideCard>
      <SideCard icon={<UserRound />} title="Account">
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-[#050604] text-sm font-black text-[#b9f34b]">
            {brandInitials}
          </span>
          <span>
            <span className="block text-sm font-black">
              {form.name || "Business"}
            </span>
            <span className="text-xs text-[#626860]">
              {isOwner ? "Admin" : "Staff"} - {userEmail || "No email"}
            </span>
          </span>
        </div>
        <Button variant="outline" className="mt-5 w-full" onClick={onPassword}>
          <Lock />
          Change password
        </Button>
      </SideCard>
      <SideCard icon={<Monitor />} title="System Preferences">
        <div className="space-y-3">
          <CompactSelect
            label="Default Homepage"
            value={form.default_homepage}
            options={["Dashboard", "Calendar", "Bookings"]}
            onChange={(value) => update("default_homepage", value)}
          />
          <CompactSelect
            label="Default Tab"
            value={form.default_tab}
            options={["Calendar", "Bookings", "Reports"]}
            onChange={(value) => update("default_tab", value)}
          />
          <CompactSelect
            label="Items Per Page"
            value={String(form.items_per_page)}
            options={["10", "20", "50", "100"]}
            onChange={(value) => update("items_per_page", Number(value))}
          />
          <SwitchRow
            label="Dark Mode"
            checked={form.dark_mode}
            onChange={(value) => update("dark_mode", value)}
          />
          <SwitchRow
            label="Compact View"
            checked={form.compact_view}
            onChange={(value) => update("compact_view", value)}
          />
        </div>
      </SideCard>
      <div className="rounded-2xl border border-black/[0.07] bg-white p-5 shadow-[0_10px_28px_rgba(23,26,22,0.05)]">
        <div className="mb-4 grid grid-cols-2 gap-3 text-sm">
          <MiniStat
            label="Plan"
            value={subscription?.plan ?? organization.plan ?? "free"}
          />
          <MiniStat label="Users" value={String(members.length)} />
        </div>
        <Button
          variant="outline"
          className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
          onClick={onLogout}
        >
          <LogOut />
          Logout
        </Button>
      </div>
    </aside>
  );
}

function SettingsSection({
  id,
  icon,
  title,
  description,
  editing,
  onEdit,
  actionLabel,
  children,
}: {
  id: string;
  icon: ReactNode;
  title: string;
  description: string;
  editing: boolean;
  onEdit: () => void;
  actionLabel?: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className="rounded-2xl border border-black/[0.07] bg-white p-6 shadow-[0_10px_28px_rgba(23,26,22,0.05)]"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#ebf7d7] text-[#326d1e] [&_svg]:h-6 [&_svg]:w-6">
            {icon}
          </span>
          <span>
            <h2 className="text-base font-black">{title}</h2>
            <p className="mt-1 text-sm text-[#626860]">{description}</p>
          </span>
        </div>
        <Button variant="outline" onClick={onEdit}>
          {actionLabel === "Add method" ? <Plus /> : <Edit3 />}
          {actionLabel ?? (editing ? "Editing" : "Edit")}
        </Button>
      </div>
      <div className="mt-7">{children}</div>
    </section>
  );
}

function TextSetting({
  label,
  value,
  editing,
  type = "text",
  onChange,
}: {
  label: string;
  value: string;
  editing: boolean;
  type?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <p className="text-xs font-semibold text-[#626860]">{label}</p>
      {editing ? (
        <Input
          className="mt-2"
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <p className="mt-2 text-sm font-black whitespace-pre-line">
          {value || "Not set"}
        </p>
      )}
    </div>
  );
}

function ColorSetting({
  label,
  value,
  editing,
  onChange,
}: {
  label: string;
  value: string;
  editing: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <p className="text-xs font-semibold text-[#626860]">{label}</p>
      <div className="mt-3 flex items-center gap-3">
        <input
          aria-label={label}
          type="color"
          disabled={!editing}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-7 w-7 rounded-md border border-black/10 bg-transparent"
        />
        <span className="text-sm font-black">{value.toUpperCase()}</span>
      </div>
    </div>
  );
}

function NumberSetting({
  icon,
  label,
  suffix,
  value,
  editing,
  onChange,
}: {
  icon: ReactNode;
  label: string;
  suffix: string;
  value: number;
  editing: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 text-[#62a91d] [&_svg]:h-4 [&_svg]:w-4">
        {icon}
      </span>
      <span className="min-w-0">
        <p className="text-sm font-semibold text-[#626860]">{label}</p>
        {editing ? (
          <div className="mt-2 flex max-w-56 items-center gap-2">
            <Input
              type="number"
              min={0}
              value={value}
              onChange={(event) => onChange(Number(event.target.value))}
            />
            <span className="text-xs text-[#626860]">{suffix}</span>
          </div>
        ) : (
          <p className="mt-1 text-sm font-black">
            {value} {suffix}
          </p>
        )}
      </span>
    </div>
  );
}

function ToggleSetting({
  label,
  value,
  enabledText,
  disabledText,
  editing,
  onChange,
}: {
  label: string;
  value: boolean;
  enabledText: string;
  disabledText: string;
  editing: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div>
      <p className="text-sm font-semibold text-[#626860]">{label}</p>
      <button
        type="button"
        disabled={!editing}
        onClick={() => onChange(!value)}
        className={cn(
          "mt-2 text-sm font-black",
          value ? "text-[#32740f]" : "text-[#171a16]",
          editing && "rounded-lg border border-black/10 px-3 py-2",
        )}
      >
        {value ? enabledText : disabledText}
      </button>
    </div>
  );
}

function SelectSetting({
  icon,
  label,
  value,
  editing,
  options,
  onChange,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  editing: boolean;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="min-w-0">
      <span className="mb-2 flex items-center gap-2 text-xs font-semibold text-[#626860]">
        <span className="text-[#171a16] [&_svg]:h-4 [&_svg]:w-4">{icon}</span>
        {label}
      </span>
      {editing ? (
        <select
          className="h-10 w-full rounded-xl border border-black/10 bg-white px-3 text-sm font-semibold"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        >
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : (
        <p className="truncate text-sm font-black">{value}</p>
      )}
    </div>
  );
}

function SwitchCard({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-black/[0.07] p-4">
      <span>
        <span className="block text-sm font-black">{label}</span>
        <span className="mt-1 block text-sm text-[#626860]">{description}</span>
      </span>
      <Switch checked={checked} onChange={onChange} />
    </div>
  );
}

function StatusPill({
  active,
  activeText,
  inactiveText,
}: {
  active: boolean;
  activeText: string;
  inactiveText: string;
}) {
  return (
    <span
      className={cn(
        "rounded-lg px-3 py-1.5 text-xs font-black",
        active ? "bg-[#eff9d7] text-[#32740f]" : "bg-[#f1f1ed] text-[#626860]",
      )}
    >
      {active ? activeText : inactiveText}
    </span>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-black/[0.14] p-8 text-center">
      <p className="font-black">{title}</p>
      <p className="mt-2 text-sm text-[#626860]">{description}</p>
    </div>
  );
}

function Notice({
  tone,
  children,
}: {
  tone: "success" | "warning" | "error";
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border px-4 py-3 text-sm font-semibold",
        tone === "success" && "border-lime-200 bg-lime-50 text-lime-900",
        tone === "warning" && "border-amber-200 bg-amber-50 text-amber-900",
        tone === "error" && "border-red-200 bg-red-50 text-red-700",
      )}
    >
      {children}
    </div>
  );
}

function InfoTile({
  label,
  value,
  href,
}: {
  label: string;
  value: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-black/[0.07] p-4 transition-colors hover:bg-[#fbfcf7]"
    >
      <p className="text-xs font-semibold text-[#626860]">{label}</p>
      <p className="mt-2 font-black capitalize">{value || "Not set"}</p>
    </Link>
  );
}

function SideCard({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-black/[0.07] bg-white p-5 shadow-[0_10px_28px_rgba(23,26,22,0.05)]">
      <div className="mb-5 flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-full bg-[#ebf7d7] text-[#326d1e] [&_svg]:h-5 [&_svg]:w-5">
          {icon}
        </span>
        <h2 className="text-sm font-black">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function QuickLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between py-3 text-sm font-semibold"
    >
      {label}
      <ChevronRight className="h-4 w-4" />
    </Link>
  );
}

function CompactSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid grid-cols-[1fr_150px] items-center gap-3 text-sm">
      <span className="font-semibold text-[#626860]">{label}</span>
      <select
        className="h-10 rounded-xl border border-black/10 bg-white px-3 text-sm font-semibold"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function SwitchRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="font-semibold text-[#626860]">{label}</span>
      <Switch checked={checked} onChange={onChange} />
    </div>
  );
}

function Switch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "flex h-6 w-11 shrink-0 items-center rounded-full p-1 transition-colors",
        checked ? "bg-[#b9f34b]" : "bg-[#d6d7d2]",
      )}
    >
      <span
        className={cn(
          "h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
          checked ? "translate-x-5" : "translate-x-0",
        )}
      />
    </button>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[#f6f7f2] p-3">
      <p className="text-xs font-semibold text-[#626860]">{label}</p>
      <p className="mt-1 text-sm font-black capitalize">{value}</p>
    </div>
  );
}

function FieldSelect({
  id,
  label,
  value,
  options,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <select
        id={id}
        className="h-11 w-full rounded-xl border border-black/10 bg-white px-3.5 py-2 text-sm shadow-sm outline-none"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}
