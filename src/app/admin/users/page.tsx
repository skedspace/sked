import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type MemberRow = {
  user_id: string;
  org_id: string;
  role: string;
  created_at: string;
};

export default async function AdminUsers() {
  const supabase = createAdminClient();

  const { data } = await supabase
    .from("org_members")
    .select("user_id, org_id, role, created_at")
    .order("created_at", { ascending: false })
    .limit(100);
  const members = (data ?? []) as MemberRow[];

  // Group by user for display
  const userMap = new Map<string, { roles: string[]; orgs: string[]; created_at: string }>();

  members.forEach((m) => {
    const existing = userMap.get(m.user_id) ?? {
      roles: [] as string[],
      orgs: [] as string[],
      created_at: m.created_at,
    };
    existing.roles.push(m.role);
    existing.orgs.push(m.org_id.slice(0, 8));
    existing.created_at = m.created_at;
    userMap.set(m.user_id, existing);
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Users</h1>
        <p className="text-muted-foreground">
          All platform users and their memberships.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{userMap.size} users</CardTitle>
        </CardHeader>
        <CardContent>
          {userMap.size === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No users yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-4 font-medium">User ID</th>
                    <th className="pb-2 pr-4 font-medium">Roles</th>
                    <th className="pb-2 pr-4 font-medium">Organizations</th>
                    <th className="pb-2 font-medium">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from(userMap.entries()).map(([userId, info]) => (
                    <tr key={userId} className="border-b last:border-0">
                      <td className="py-2 pr-4 font-mono text-xs">
                        {userId.slice(0, 12)}...
                      </td>
                      <td className="py-2 pr-4">
                        <div className="flex gap-1">
                          {info.roles.map((r) => (
                            <Badge key={r} variant={r === "owner" ? "default" : "secondary"}>
                              {r}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="py-2 pr-4 font-mono text-xs text-muted-foreground">
                        {info.orgs.join(", ")}
                      </td>
                      <td className="py-2 text-muted-foreground">
                        {new Date(info.created_at).toLocaleDateString()}
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
