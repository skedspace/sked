import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function AdminBookings() {
  const supabase = createAdminClient();

  const { data: bookings } = await supabase
    .from("bookings")
    .select("id, status, price_cents, time_range, source, created_at, org_id")
    .order("created_at", { ascending: false })
    .limit(100);

  const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    confirmed: "default",
    completed: "default",
    pending: "secondary",
    held: "outline",
    cancelled: "secondary",
    no_show: "destructive",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Bookings</h1>
        <p className="text-muted-foreground">
          All bookings across the platform.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent {bookings?.length ?? 0} bookings</CardTitle>
        </CardHeader>
        <CardContent>
          {!bookings || bookings.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No bookings yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-4 font-medium">ID</th>
                    <th className="pb-2 pr-4 font-medium">Status</th>
                    <th className="pb-2 pr-4 font-medium">Amount</th>
                    <th className="pb-2 pr-4 font-medium">Source</th>
                    <th className="pb-2 pr-4 font-medium">Org</th>
                    <th className="pb-2 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((b) => (
                    <tr key={b.id} className="border-b last:border-0">
                      <td className="py-2 pr-4 font-mono text-xs">
                        {b.id.slice(0, 8)}
                      </td>
                      <td className="py-2 pr-4">
                        <Badge variant={statusColors[b.status] ?? "outline"}>
                          {b.status}
                        </Badge>
                      </td>
                      <td className="py-2 pr-4">
                        ₱{(b.price_cents / 100).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2 pr-4 text-muted-foreground">
                        {b.source ?? "—"}
                      </td>
                      <td className="py-2 pr-4 font-mono text-xs text-muted-foreground">
                        {b.org_id.slice(0, 8)}
                      </td>
                      <td className="py-2 text-muted-foreground">
                        {new Date(b.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
