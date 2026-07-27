"use client";

import { useState, useMemo } from "react";
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  Search,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import Link from "next/link";

type Org = {
  id: string;
  name: string;
  slug: string;
  plan: string;
  created_at: string;
  subdomain: string | null;
};

const PAGE_SIZE = 20;

export function AdminOrgList({ orgs }: { orgs: Org[] }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    if (!search.trim()) return orgs;
    const q = search.toLowerCase();
    return orgs.filter(
      (o) =>
        o.name.toLowerCase().includes(q) ||
        o.slug.toLowerCase().includes(q) ||
        o.plan.toLowerCase().includes(q),
    );
  }, [search, orgs]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageOrgs = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // Reset page when search changes
  const handleSearch = (val: string) => {
    setSearch(val);
    setPage(0);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search organizations..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <p className="text-sm text-muted-foreground">
          {filtered.length} of {orgs.length} orgs
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Organizations</CardTitle>
        </CardHeader>
        <CardContent>
          {pageOrgs.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {search ? "No organizations match your search." : "No organizations yet."}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-4 font-medium">Name</th>
                    <th className="pb-2 pr-4 font-medium">Slug</th>
                    <th className="pb-2 pr-4 font-medium">Plan</th>
                    <th className="pb-2 pr-4 font-medium">Subdomain</th>
                    <th className="pb-2 font-medium">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {pageOrgs.map((org) => (
                    <tr key={org.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="py-2.5 pr-4 font-medium">{org.name}</td>
                      <td className="py-2.5 pr-4 text-muted-foreground">
                        <Link href={`/p/${org.slug}`} className="hover:underline" target="_blank">
                          {org.slug}
                        </Link>
                      </td>
                      <td className="py-2.5 pr-4">
                        <Badge variant={org.plan === "free" ? "secondary" : "default"}>
                          {org.plan}
                        </Badge>
                      </td>
                      <td className="py-2.5 pr-4 text-muted-foreground">
                        {org.subdomain ?? "—"}
                      </td>
                      <td className="py-2.5 text-muted-foreground">
                        {new Date(org.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between border-t border-black/[0.07] pt-4">
              <p className="text-xs text-muted-foreground">
                Page {page + 1} of {totalPages}
              </p>
              <div className="flex gap-1">
                <button
                  onClick={() => setPage(Math.max(0, page - 1))}
                  disabled={page === 0}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-black/[0.09] disabled:opacity-30"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                  disabled={page >= totalPages - 1}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-black/[0.09] disabled:opacity-30"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
