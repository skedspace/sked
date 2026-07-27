"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

type Member = {
  user_id: string;
  role: string;
  created_at: string;
};

export function TeamManagement({
  members,
  orgId,
  isOwner,
  currentUserId,
}: {
  members: Member[];
  orgId: string;
  isOwner: boolean;
  currentUserId: string;
}) {
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const ownerCount = members.filter((m) => m.role === "owner").length;

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviting(true);
    setInviteError(null);
    setInviteSuccess(false);

    const { error } = await supabase.from("staff_invitations").insert({
      org_id: orgId,
      email: inviteEmail,
      role: "staff",
    });

    setInviting(false);
    if (error) {
      if (error.message?.includes("unique")) {
        setInviteError("An invitation for this email already exists.");
      } else {
        setInviteError(error.message);
      }
    } else {
      setInviteSuccess(true);
      setInviteEmail("");
      setTimeout(() => {
        setInviteOpen(false);
        setInviteSuccess(false);
      }, 2000);
    }
  }

  async function handleRemoveMember(userId: string) {
    if (!confirm("Remove this member from the organization? This action cannot be undone.")) return;

    const { error } = await supabase
      .from("org_members")
      .delete()
      .eq("org_id", orgId)
      .eq("user_id", userId);

    if (!error) router.refresh();
  }

  return (
    <div className="space-y-6">
      {/* Current members */}
      <Card>
        <CardHeader>
          <CardTitle>Members ({members.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <p className="text-sm text-muted-foreground">No members yet.</p>
          ) : (
            <div className="space-y-2">
              {members.map((member) => (
                <div
                  key={member.user_id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {member.user_id === currentUserId ? "You" : member.user_id.slice(0, 8)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Joined {new Date(member.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={member.role === "owner" ? "default" : "secondary"}>
                      {member.role}
                    </Badge>
                    {isOwner && member.user_id !== currentUserId && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleRemoveMember(member.user_id)}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invite staff */}
      {isOwner && (
        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
          <DialogTrigger asChild>
            <Button>Invite team member</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite team member</DialogTitle>
            </DialogHeader>
            {inviteSuccess ? (
              <p className="text-center text-sm text-green-600">
                Invitation sent! The user will be added when they accept.
              </p>
            ) : (
              <form onSubmit={handleInvite} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="invite-email">Email address</Label>
                  <Input
                    id="invite-email"
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="colleague@example.com"
                    required
                  />
                </div>
                {inviteError && (
                  <p className="text-sm text-destructive">{inviteError}</p>
                )}
                <Button type="submit" className="w-full" disabled={inviting}>
                  {inviting ? "Sending invitation..." : "Send invitation"}
                </Button>
              </form>
            )}
          </DialogContent>
        </Dialog>
      )}

      {/* Staff permissions info */}
      <Card>
        <CardHeader>
          <CardTitle>Permissions</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <ul className="space-y-1">
            <li><strong>Owners</strong> — Full access to all settings, billing, and management.</li>
            <li><strong>Staff</strong> — Can view dashboard, bookings, and customers. Cannot modify settings, plans, or manage team.</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
