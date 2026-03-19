import { useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { BarChart3, Copy, Lock, MousePointerClick, ShieldAlert, UserRound } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type ActivityRange = "week" | "month" | "all";

type ActivityLogEntry = {
  id: string;
  activityType: "page_view" | "button_click";
  path: string;
  buttonId?: string | null;
  buttonLabel?: string | null;
  ipAddress?: string | null;
  country?: string | null;
  region?: string | null;
  city?: string | null;
  createdAt?: string | null;
  user?: {
    id: string;
    username?: string | null;
    email?: string | null;
  } | null;
};

type ActivityAggregate = {
  key: string;
  count: number;
};

type ActivityReport = {
  logs: ActivityLogEntry[];
  topPages: ActivityAggregate[];
  topButtons: ActivityAggregate[];
};

type RoleRequestAttachment = {
  name: string;
  type: string;
  size: number;
  dataUrl: string;
};

type RoleRequestEntry = {
  id: string;
  justification: string;
  attachmentsJson?: string | null;
  status: "pending" | "approved" | "rejected";
  decisionNote?: string | null;
  createdAt?: string | null;
  user?: {
    username?: string | null;
    email?: string | null;
  } | null;
  role?: {
    id: string;
    name: string;
  } | null;
};

export default function AdminPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [range, setRange] = useState<ActivityRange>("week");
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window === "undefined") return "activity";
    return new URLSearchParams(window.location.search).get("tab") === "role-requests" ? "role-requests" : "activity";
  });
  const [credentials, setCredentials] = useState({ username: "impactlab", password: "impactlab" });
  const [decisionNotes, setDecisionNotes] = useState<Record<string, string>>({});
  const isImpactLabAdmin = user?.username === "impactlab";

  const loginMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/admin/login", credentials);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
  });

  const reportQuery = useQuery<ActivityReport>({
    queryKey: ["/api/admin/activity", range],
    queryFn: async () => {
      const res = await fetch(`/api/admin/activity?range=${range}`, {
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error(`${res.status}: ${await res.text()}`);
      }

      return res.json();
    },
    enabled: isImpactLabAdmin,
  });

  const roleRequestsQuery = useQuery<RoleRequestEntry[]>({
    queryKey: ["/api/admin/role-requests"],
    enabled: isImpactLabAdmin,
  });

  const reviewRoleRequestMutation = useMutation({
    mutationFn: async ({ id, status, decisionNote }: { id: string; status: "approved" | "rejected"; decisionNote: string }) => {
      await apiRequest("PATCH", `/api/admin/role-requests/${id}`, { status, decisionNote });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/role-requests"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
  });

  const logs = reportQuery.data?.logs ?? [];
  const topPages = reportQuery.data?.topPages ?? [];
  const topButtons = reportQuery.data?.topButtons ?? [];
  const reportTitle = useMemo(() => {
    if (range === "week") return "This Week";
    if (range === "month") return "This Month";
    return "All History";
  }, [range]);

  if (isLoading) {
    return <div className="p-6">Loading admin dashboard...</div>;
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-muted/20">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Admin Login
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              value={credentials.username}
              onChange={(event) => setCredentials((current) => ({ ...current, username: event.target.value }))}
              placeholder="Username"
            />
            <Input
              type="password"
              value={credentials.password}
              onChange={(event) => setCredentials((current) => ({ ...current, password: event.target.value }))}
              placeholder="Password"
            />
            <Button
              className="w-full"
              disabled={loginMutation.isPending}
              onClick={() => loginMutation.mutate()}
              data-testid="button-admin-login"
            >
              Sign in as impactlab
            </Button>
            {loginMutation.error ? (
              <p className="text-sm text-destructive">Invalid admin credentials.</p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isImpactLabAdmin) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="h-5 w-5" />
              Access denied
            </CardTitle>
          </CardHeader>
          <CardContent>
            This area is restricted to the `impactlab` admin user.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Admin Activity</h1>
          <p className="text-muted-foreground">Tracking report for {reportTitle.toLowerCase()}.</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="activity">Site Stats</TabsTrigger>
          <TabsTrigger value="role-requests">Role Requests</TabsTrigger>
        </TabsList>

        <TabsContent value="activity" className="space-y-6 mt-6">
          <div className="flex gap-2">
            <RangeButton active={range === "week"} onClick={() => setRange("week")}>This Week</RangeButton>
            <RangeButton active={range === "month"} onClick={() => setRange("month")}>This Month</RangeButton>
            <RangeButton active={range === "all"} onClick={() => setRange("all")}>All</RangeButton>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <SummaryCard title="Tracked Events" value={String(logs.length)} icon={<BarChart3 className="h-5 w-5" />} />
            <SummaryCard title="Top Pages" value={String(topPages.length)} icon={<UserRound className="h-5 w-5" />} />
            <SummaryCard title="Top Buttons" value={String(topButtons.length)} icon={<MousePointerClick className="h-5 w-5" />} />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <RankedList title="Top 10 Pages Visited" items={topPages} />
            <RankedList title="Top 10 Buttons Clicked" items={topButtons} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Activity Log</CardTitle>
            </CardHeader>
            <CardContent>
              {reportQuery.isLoading ? (
                <p>Loading activity...</p>
              ) : reportQuery.error ? (
                <p className="text-destructive">Failed to load activity report.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>When</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Path</TableHead>
                        <TableHead>Button</TableHead>
                        <TableHead>IP</TableHead>
                        <TableHead>Location</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell>{formatDate(log.createdAt)}</TableCell>
                          <TableCell>{log.user?.username || log.user?.email || "Anonymous"}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{log.activityType}</Badge>
                          </TableCell>
                          <TableCell className="font-mono text-xs">{log.path}</TableCell>
                          <TableCell>{log.buttonLabel || log.buttonId || "-"}</TableCell>
                          <TableCell className="font-mono text-xs">{log.ipAddress || "-"}</TableCell>
                          <TableCell>{[log.city, log.region, log.country].filter(Boolean).join(", ") || "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="role-requests" className="space-y-4 mt-6">
          {roleRequestsQuery.isLoading ? (
            <p>Loading role requests...</p>
          ) : roleRequestsQuery.error ? (
            <p className="text-destructive">Failed to load role requests.</p>
          ) : !roleRequestsQuery.data?.length ? (
            <Card>
              <CardContent className="p-6 text-muted-foreground">No role requests yet.</CardContent>
            </Card>
          ) : (
            roleRequestsQuery.data.map((request) => {
              const attachments = parseAttachments(request.attachmentsJson);
              return (
                <Card key={request.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between gap-3">
                      <CardTitle>{request.role?.name || "Role request"}</CardTitle>
                      <Badge variant={request.status === "pending" ? "outline" : "secondary"}>{request.status}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <p className="text-sm font-medium">Username</p>
                        <p className="text-sm text-muted-foreground">{request.user?.username || "-"}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Email</p>
                        <div className="flex items-center gap-2">
                          <p className="text-sm text-muted-foreground">{request.user?.email || "-"}</p>
                          {request.user?.email ? (
                            <Button variant="ghost" size="sm" onClick={() => navigator.clipboard.writeText(request.user?.email || "")}>
                              <Copy className="h-4 w-4" />
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Justification</p>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{request.justification}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Attachments</p>
                      {attachments.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No attachments.</p>
                      ) : (
                        <div className="flex flex-wrap gap-2 pt-2">
                          {attachments.map((attachment) => (
                            <a key={attachment.name} href={attachment.dataUrl} download={attachment.name} className="text-sm underline text-primary">
                              {attachment.name}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Decision note</p>
                      <Textarea
                        rows={3}
                        value={decisionNotes[request.id] ?? request.decisionNote ?? ""}
                        onChange={(event) =>
                          setDecisionNotes((current) => ({
                            ...current,
                            [request.id]: event.target.value,
                          }))
                        }
                        disabled={request.status !== "pending"}
                      />
                    </div>
                    {request.status === "pending" ? (
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="outline"
                          onClick={() =>
                            reviewRoleRequestMutation.mutate({
                              id: request.id,
                              status: "rejected",
                              decisionNote: decisionNotes[request.id] || "",
                            })
                          }
                        >
                          Reject
                        </Button>
                        <Button
                          onClick={() =>
                            reviewRoleRequestMutation.mutate({
                              id: request.id,
                              status: "approved",
                              decisionNote: decisionNotes[request.id] || "",
                            })
                          }
                        >
                          Approve
                        </Button>
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SummaryCard({ title, value, icon }: { title: string; value: string; icon: ReactNode }) {
  return (
    <Card>
      <CardContent className="p-6 flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-3xl font-semibold">{value}</p>
        </div>
        <div className="h-11 w-11 rounded-full bg-primary/10 text-primary flex items-center justify-center">
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}

function RankedList({ title, items }: { title: string; items: ActivityAggregate[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 ? <p className="text-muted-foreground">No data for this range.</p> : null}
        {items.map((item, index) => (
          <div key={`${item.key}-${index}`} className="flex items-center justify-between gap-4 rounded-lg border p-3">
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{item.key}</p>
            </div>
            <Badge variant="outline">{item.count}</Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function RangeButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Button variant={active ? "default" : "outline"} onClick={onClick}>
      {children}
    </Button>
  );
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function parseAttachments(value?: string | null): RoleRequestAttachment[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
