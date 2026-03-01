import { useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { BarChart3, Lock, MousePointerClick, ShieldAlert, UserRound } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

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

export default function AdminPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [range, setRange] = useState<ActivityRange>("week");
  const [credentials, setCredentials] = useState({ username: "impactlab", password: "impactlab" });
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
        <div className="flex gap-2">
          <RangeButton active={range === "week"} onClick={() => setRange("week")}>This Week</RangeButton>
          <RangeButton active={range === "month"} onClick={() => setRange("month")}>This Month</RangeButton>
          <RangeButton active={range === "all"} onClick={() => setRange("all")}>All</RangeButton>
        </div>
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
