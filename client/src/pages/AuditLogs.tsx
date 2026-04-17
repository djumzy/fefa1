import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Shield, Search, Filter, Monitor, Smartphone, Globe, Clock } from "lucide-react";
import AdminSidebar from "@/components/AdminSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { AuditLog } from "@shared/schema";

function timeAgo(date: string | Date | null): string {
  if (!date) return "";
  const d = new Date(date);
  const now = Date.now();
  const diff = Math.floor((now - d.getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return d.toLocaleDateString();
}

function actionColor(action: string): string {
  if (action.includes("LOGIN")) return "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300";
  if (action.includes("LOAN_PAYMENT")) return "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300";
  if (action.includes("LOAN")) return "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300";
  if (action.includes("SAVINGS") || action.includes("TRANSACTION")) return "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300";
  if (action.includes("DELETE") || action.includes("REMOVE")) return "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300";
  if (action.includes("USER") || action.includes("MEMBER")) return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300";
  return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
}

function parseDevice(ua: string | null): { device: string; browser: string } {
  if (!ua) return { device: "Unknown", browser: "Unknown" };
  const isMobile = /Mobile|Android|iPhone|iPad/.test(ua);
  const browser = ua.includes("Chrome") ? "Chrome"
    : ua.includes("Firefox") ? "Firefox"
    : ua.includes("Safari") ? "Safari"
    : ua.includes("Edge") ? "Edge"
    : "Browser";
  return { device: isMobile ? "Mobile" : "Desktop", browser };
}

function formatAction(action: string): string {
  return action.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

export default function AuditLogs() {
  const [search, setSearch] = useState("");
  const [filterAction, setFilterAction] = useState("all");

  const { data: logs = [], isLoading } = useQuery<AuditLog[]>({
    queryKey: ["/api/audit-logs"],
    refetchInterval: 60000,
  });

  const actionTypes = ["all", ...Array.from(new Set(logs.map(l => l.action)))];

  const filtered = logs.filter(l => {
    const matchAction = filterAction === "all" || l.action === filterAction;
    const term = search.toLowerCase();
    const matchSearch = !term || 
      l.action?.toLowerCase().includes(term) ||
      l.performedByName?.toLowerCase().includes(term) ||
      l.location?.toLowerCase().includes(term) ||
      l.ipAddress?.toLowerCase().includes(term) ||
      JSON.stringify(l.details)?.toLowerCase().includes(term);
    return matchAction && matchSearch;
  });

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar />
      <main className="flex-1 p-6 overflow-auto">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800">
              <Shield className="h-6 w-6 text-slate-600 dark:text-slate-300" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Audit Logs</h1>
              <p className="text-sm text-muted-foreground">Full system activity trail with device and location tracking</p>
            </div>
          </div>

          {/* Stats bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Total Events", value: logs.length },
              { label: "Today", value: logs.filter(l => l.createdAt && new Date(l.createdAt).toDateString() === new Date().toDateString()).length },
              { label: "Unique Actions", value: new Set(logs.map(l => l.action)).size },
              { label: "Unique Users", value: new Set(logs.map(l => l.performedBy).filter(Boolean)).size },
            ].map(({ label, value }) => (
              <Card key={label}>
                <CardContent className="pt-4 pb-3">
                  <p className="text-2xl font-bold">{value}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by action, user, IP, or location…"
                    className="pl-9"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>
                <Select value={filterAction} onValueChange={setFilterAction}>
                  <SelectTrigger className="sm:w-56">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Filter by action" />
                  </SelectTrigger>
                  <SelectContent>
                    {actionTypes.map(a => (
                      <SelectItem key={a} value={a}>
                        {a === "all" ? "All Actions" : formatAction(a)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Log table */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">
                {filtered.length} {filtered.length === 1 ? "event" : "events"}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="py-12 text-center text-muted-foreground">Loading audit logs…</div>
              ) : filtered.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">No events found</div>
              ) : (
                <div className="divide-y">
                  {filtered.map((log) => {
                    const { device, browser } = parseDevice(log.userAgent);
                    return (
                      <div key={log.id} className="px-6 py-4 hover:bg-muted/30 transition-colors">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline" className={`text-xs font-semibold ${actionColor(log.action)}`}>
                              {formatAction(log.action)}
                            </Badge>
                            {log.performedByType && (
                              <Badge variant="secondary" className="text-xs capitalize">
                                {log.performedByType}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                            <Clock className="h-3 w-3" />
                            {timeAgo(log.createdAt)}
                          </div>
                        </div>

                        {log.performedByName && (
                          <p className="text-sm font-medium mt-1">{log.performedByName}</p>
                        )}

                        {log.details && (
                          <div className="mt-1.5 text-xs text-muted-foreground bg-muted/40 rounded px-2 py-1 font-mono">
                            {Object.entries(log.details as Record<string, any>)
                              .filter(([k]) => !['memberId', 'entityId'].includes(k))
                              .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
                              .join(' · ')}
                          </div>
                        )}

                        <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            {device === "Mobile" ? <Smartphone className="h-3 w-3" /> : <Monitor className="h-3 w-3" />}
                            {device} · {browser}
                          </span>
                          {log.ipAddress && (
                            <span className="font-mono">{log.ipAddress}</span>
                          )}
                          {log.location && (
                            <span className="flex items-center gap-1">
                              <Globe className="h-3 w-3" />
                              {log.location}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
