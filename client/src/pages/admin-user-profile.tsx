import { Link, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { ArrowLeft, Briefcase, Mail, MapPin, Shield, UserRound } from "lucide-react";
import { useTranslation } from "@/contexts/LanguageContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { ProjectWithOwner, UserWithProfile } from "@shared/schema";

type AdminUserDetails = UserWithProfile & {
  projects?: ProjectWithOwner[];
};

export default function AdminUserProfile() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();

  const userQuery = useQuery<AdminUserDetails>({
    queryKey: ["/api/admin/users", id],
    enabled: !!id,
  });

  if (userQuery.isLoading) {
    return (
      <div className="p-6 max-w-5xl mx-auto space-y-4">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (userQuery.error || !userQuery.data) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <Card>
          <CardContent className="p-6 text-destructive">{t("admin.profile.loadError")}</CardContent>
        </Card>
      </div>
    );
  }

  const user = userQuery.data;
  const projects = user.projects ?? [];
  const displayName = getUserDisplayName(user, t("admin.users.unknownUser"));
  const roles = user.userRoles?.filter((userRole) => userRole.status === "active") ?? [];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <Button variant="ghost" asChild>
        <Link href="/admin?tab=users">
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t("admin.profile.backToUsers")}
        </Link>
      </Button>

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col gap-5 md:flex-row md:items-start">
            <Avatar className="h-20 w-20">
              <AvatarImage src={user.profileImageUrl || undefined} alt={displayName} />
              <AvatarFallback>{getInitials(user)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1 space-y-4">
              <div>
                <h1 className="text-3xl font-semibold">{displayName}</h1>
                <p className="text-muted-foreground">{user.profile?.title || t("admin.profile.noTitle")}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {roles.length > 0 ? roles.map((userRole) => (
                  <Badge key={userRole.id} variant="secondary">
                    <Shield className="h-3 w-3 mr-1" />
                    {userRole.role?.name || t("admin.profile.role")}
                  </Badge>
                )) : <Badge variant="outline">{t("admin.profile.noRoles")}</Badge>}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <Card>
          <CardHeader>
            <CardTitle>{t("admin.profile.about")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <InfoRow icon={<Mail className="h-4 w-4" />} label={t("admin.profile.email")} value={user.email || user.username || "-"} />
            <InfoRow icon={<MapPin className="h-4 w-4" />} label={t("admin.profile.location")} value={[user.profile?.city, user.profile?.country].filter(Boolean).join(", ") || "-"} />
            <InfoRow icon={<UserRound className="h-4 w-4" />} label={t("admin.profile.lastLogin")} value={formatDate(user.lastAccessAt)} />
            <div>
              <p className="text-sm font-medium">{t("admin.profile.bio")}</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{user.profile?.bio || t("admin.profile.noBio")}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("admin.profile.skills")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <BadgeList label={t("admin.profile.skills")} items={user.profile?.skills ?? []} empty={t("admin.profile.noSkills")} />
            <BadgeList label={t("admin.profile.interests")} items={user.profile?.interests ?? []} empty={t("admin.profile.noInterests")} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("admin.profile.projects")}</CardTitle>
        </CardHeader>
        <CardContent>
          {projects.length === 0 ? (
            <p className="text-muted-foreground">{t("admin.profile.noProjects")}</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {projects.map((project) => (
                <Link key={project.id} href={`/projects?projectId=${project.id}`} className="rounded-lg border p-4 transition-colors hover:bg-muted/50">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium line-clamp-1">{project.title}</p>
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                        {project.description || t("admin.projects.noDescription")}
                      </p>
                    </div>
                    <Badge variant="outline">{project.status || "-"}</Badge>
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                    <Briefcase className="h-3.5 w-3.5" />
                    <span>{t("admin.projects.enlisted")}: {project.participants?.length ?? 0}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 text-muted-foreground">{icon}</span>
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-sm text-muted-foreground">{value}</p>
      </div>
    </div>
  );
}

function BadgeList({ label, items, empty }: { label: string; items: string[]; empty: string }) {
  return (
    <div>
      <p className="text-sm font-medium">{label}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {items.length > 0 ? items.map((item) => (
          <Badge key={item} variant="secondary">{item}</Badge>
        )) : <p className="text-sm text-muted-foreground">{empty}</p>}
      </div>
    </div>
  );
}

function getInitials(user: AdminUserDetails) {
  if (user.firstName && user.lastName) {
    return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
  }
  return (user.email || user.username || "U")[0].toUpperCase();
}

function getUserDisplayName(user: AdminUserDetails, fallback: string) {
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return fullName || user.email || user.username || fallback;
}

function formatDate(value?: string | Date | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
