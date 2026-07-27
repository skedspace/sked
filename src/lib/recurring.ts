import { createClient } from "@/lib/supabase/server";

export type RecurringFrequency = "weekly" | "biweekly" | "monthly";

export type RecurringRule = {
  id: string;
  org_id: string;
  resource_id: string;
  service_id: string;
  customer_id: string;
  frequency: RecurringFrequency;
  start_date: string;
  end_date: string | null;
  start_time: string;
  end_time: string;
  day_of_week: number | null;
  day_of_month: number | null;
  max_occurrences: number;
  occurrences_created: number;
  is_active: boolean;
};

/**
 * Creates a recurring booking rule and generates future bookings.
 */
export async function createRecurringRule(params: {
  orgId: string;
  resourceId: string;
  serviceId: string;
  customerId: string;
  frequency: RecurringFrequency;
  startDate: string;
  startTime: string;
  endTime: string;
  endDate?: string;
  maxOccurrences?: number;
}) {
  const supabase = createClient();

  const startDate = new Date(params.startDate);
  const dayOfWeek = ["weekly", "biweekly"].includes(params.frequency)
    ? startDate.getDay()
    : null;
  const dayOfMonth = params.frequency === "monthly" ? startDate.getDate() : null;

  // Create the rule
  const { data: rule, error: ruleError } = await supabase
    .from("recurring_rules")
    .insert({
      org_id: params.orgId,
      resource_id: params.resourceId,
      service_id: params.serviceId,
      customer_id: params.customerId,
      frequency: params.frequency,
      start_date: params.startDate,
      end_date: params.endDate ?? null,
      start_time: params.startTime,
      end_time: params.endTime,
      day_of_week: dayOfWeek,
      day_of_month: dayOfMonth,
      max_occurrences: params.maxOccurrences ?? 52,
    })
    .select("id")
    .single();

  if (ruleError) return { error: ruleError.message };
  if (!rule) return { error: "Could not create recurring rule." };

  // Generate future bookings
  const { error: genError } = await supabase.rpc("generate_recurring_bookings", {
    p_rule_id: rule.id,
  });

  if (genError) return { error: genError.message };

  return { ruleId: rule.id };
}

/**
 * Formats the frequency for display.
 */
export function formatFrequency(freq: RecurringFrequency): string {
  switch (freq) {
    case "weekly": return "Every week";
    case "biweekly": return "Every 2 weeks";
    case "monthly": return "Every month";
  }
}
