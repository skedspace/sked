import Link from "next/link";
import {
  ArrowLeft,
  BadgePercent,
  ChartNoAxesCombined,
  ClipboardList,
  CreditCard,
  Mail,
  Megaphone,
  MonitorCog,
  Settings,
  SlidersHorizontal,
  WalletCards,
} from "lucide-react";

const sections = {
  subscriptions: { title: "Subscriptions", icon: WalletCards },
  payments: { title: "Payments", icon: CreditCard },
  courts: { title: "Courts", icon: MonitorCog },
  marketing: { title: "Marketing", icon: Megaphone },
  promotions: { title: "Promotions", icon: BadgePercent },
  "email-campaigns": { title: "Email Campaigns", icon: Mail },
  analytics: { title: "Analytics", icon: ChartNoAxesCombined },
  "platform-settings": { title: "Platform Settings", icon: Settings },
  integrations: { title: "Integrations", icon: SlidersHorizontal },
  "audit-logs": { title: "Audit Logs", icon: ClipboardList },
} as const;

export default async function AdminSection({
  params,
}: {
  params: Promise<{ section: string[] }>;
}) {
  const { section } = await params;
  const key = section[0] as keyof typeof sections;
  const current = sections[key] ?? { title: "Admin", icon: Settings };
  const Icon = current.icon;

  return (
    <div className="admin-empty-page">
      <div>
        <span><Icon /></span>
        <h1>{current.title}</h1>
        <p>This workspace is ready for its management components.</p>
        <Link href="/admin"><ArrowLeft /> Back to Command Center</Link>
      </div>
    </div>
  );
}
