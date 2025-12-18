import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/contexts/LanguageContext";
import { 
  Sidebar, 
  SidebarContent, 
  SidebarGroup, 
  SidebarGroupContent, 
  SidebarGroupLabel, 
  SidebarMenu, 
  SidebarMenuButton, 
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Home, 
  User, 
  BookOpen, 
  Users, 
  Rocket, 
  Target,
  Settings,
  LogOut,
  Sparkles,
  Calendar,
  MessageSquare,
  Building2,
  Trophy,
  FolderKanban
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface MenuItem {
  titleKey: string;
  url: string;
  icon: LucideIcon;
}

const menuItemsByRole: Record<string, MenuItem[]> = {
  usuario: [
    { titleKey: "nav.home", url: "/", icon: Home },
    { titleKey: "nav.profile", url: "/profile", icon: User },
    { titleKey: "nav.projects", url: "/projects", icon: Target },
    { titleKey: "nav.courses", url: "/courses", icon: BookOpen },
    { titleKey: "nav.mentorship", url: "/mentorship", icon: Users },
    { titleKey: "nav.events", url: "/events", icon: Calendar },
  ],
  mentor: [
    { titleKey: "nav.home", url: "/", icon: Home },
    { titleKey: "nav.profile", url: "/profile", icon: User },
    { titleKey: "nav.myMentorships", url: "/mentorship", icon: Users },
    { titleKey: "nav.assignedProjects", url: "/projects", icon: Target },
    { titleKey: "nav.messages", url: "/messages", icon: MessageSquare },
    { titleKey: "nav.calendar", url: "/calendar", icon: Calendar },
  ],
  facilitador: [
    { titleKey: "nav.home", url: "/", icon: Home },
    { titleKey: "nav.profile", url: "/profile", icon: User },
    { titleKey: "nav.projects", url: "/projects", icon: Target },
    { titleKey: "nav.courses", url: "/courses", icon: BookOpen },
    { titleKey: "nav.mentorship", url: "/mentorship", icon: Users },
    { titleKey: "nav.organizations", url: "/organizations", icon: Building2 },
    { titleKey: "nav.challenges", url: "/challenges", icon: Trophy },
    { titleKey: "nav.challengeProjects", url: "/challenge-projects", icon: FolderKanban },
    { titleKey: "nav.programs", url: "/programs", icon: Rocket },
    { titleKey: "nav.events", url: "/events", icon: Calendar },
    { titleKey: "nav.reports", url: "/reports", icon: Target },
  ],
};

const roleBadgeColors: Record<string, string> = {
  usuario: "bg-primary/10 text-primary",
  mentor: "bg-chart-2/10 text-chart-2",
  facilitador: "bg-chart-4/10 text-chart-4",
};

export function AppSidebar() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [location] = useLocation();

  const userRole = user?.userRoles?.[0]?.role?.name || "usuario";
  const menuItems = menuItemsByRole[userRole] || menuItemsByRole.usuario;

  const getRoleLabel = (role: string) => {
    const roleMap: Record<string, string> = {
      usuario: t("roles.user"),
      mentor: t("roles.mentor"),
      facilitador: t("roles.facilitator"),
    };
    return roleMap[role] || t("roles.user");
  };

  const getInitials = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return "U";
  };

  return (
    <Sidebar>
      <SidebarHeader className="border-b p-4">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-sm">{t("app.name")}</span>
            <span className="text-xs text-muted-foreground">{t("app.tagline")}</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{t("nav.navigation")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.titleKey}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={location === item.url}
                  >
                    <Link href={item.url} data-testid={`link-nav-${item.titleKey.split('.')[1]}`}>
                      <item.icon className="h-4 w-4" />
                      <span>{t(item.titleKey)}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>{t("nav.settings")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location === "/settings"}>
                  <Link href="/settings" data-testid="link-nav-settings">
                    <Settings className="h-4 w-4" />
                    <span>{t("nav.settings")}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t p-4">
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={user?.profileImageUrl || undefined} alt={user?.firstName || t("roles.user")} />
            <AvatarFallback>{getInitials()}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {user?.firstName && user?.lastName 
                ? `${user.firstName} ${user.lastName}`
                : user?.email || t("roles.user")}
            </p>
            <Badge 
              variant="secondary" 
              className={`text-xs ${roleBadgeColors[userRole] || roleBadgeColors.usuario}`}
            >
              {getRoleLabel(userRole)}
            </Badge>
          </div>
        </div>
        <a href="/api/logout" className="w-full">
          <Button variant="ghost" className="w-full justify-start gap-2" data-testid="button-logout">
            <LogOut className="h-4 w-4" />
            {t("auth.logout")}
          </Button>
        </a>
      </SidebarFooter>
    </Sidebar>
  );
}
