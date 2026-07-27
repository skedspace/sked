export type Package = {
  id: string;
  org_id: string;
  name: string;
  description: string | null;
  service_id: string | null;
  session_count: number;
  price_cents: number;
  duration_days: number | null;
  is_active: boolean;
  created_at: string;
};

export type CustomerPackage = {
  id: string;
  org_id: string;
  customer_id: string;
  package_id: string;
  sessions_remaining: number;
  sessions_total: number;
  payment_id: string | null;
  expires_at: string | null;
};

export type PackageWithCustomer = Package & {
  customer_packages?: CustomerPackage[];
};

/**
 * Formats a package price per session for display.
 */
export function formatPerSession(cents: number, sessions: number): string {
  return `₱${Math.round(cents / sessions / 100).toLocaleString("en-PH")}/session`;
}
