import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
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
  MessageSquare
} from "lucide-react";

const menuItemsByRole = {
  usuario: [
    { title: "Inicio", url: "/", icon: Home },
    { title: "Mi Perfil", url: "/profile", icon: User },
    { title: "Mis Proyectos", url: "/projects", icon: Target },
    { title: "Cursos", url: "/courses", icon: BookOpen },
    { title: "Mentoría", url: "/mentorship", icon: Users },
    { title: "Eventos", url: "/events", icon: Calendar },
  ],
  mentor: [
    { title: "Inicio", url: "/", icon: Home },
    { title: "Mi Perfil", url: "/profile", icon: User },
    { title: "Mis Mentorías", url: "/mentorship", icon: Users },
    { title: "Proyectos Asignados", url: "/projects", icon: Target },
    { title: "Mensajes", url: "/messages", icon: MessageSquare },
    { title: "Calendario", url: "/calendar", icon: Calendar },
  ],
  facilitador: [
    { title: "Inicio", url: "/", icon: Home },
    { title: "Mi Perfil", url: "/profile", icon: User },
    { title: "Gestión de Programas", url: "/programs", icon: Rocket },
    { title: "Usuarios", url: "/users", icon: Users },
    { title: "Eventos", url: "/events", icon: Calendar },
    { title: "Reportes", url: "/reports", icon: Target },
  ],
};

const roleLabels: Record<string, string> = {
  usuario: "Usuario",
  mentor: "Mentor",
  facilitador: "Facilitador",
};

const roleBadgeColors: Record<string, string> = {
  usuario: "bg-primary/10 text-primary",
  mentor: "bg-chart-2/10 text-chart-2",
  facilitador: "bg-chart-4/10 text-chart-4",
};

export function AppSidebar() {
  const { user } = useAuth();
  const [location] = useLocation();

  const userRole = user?.userRoles?.[0]?.role?.name || "usuario";
  const menuItems = menuItemsByRole[userRole as keyof typeof menuItemsByRole] || menuItemsByRole.usuario;

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
            <span className="font-semibold text-sm">GA4SI</span>
            <span className="text-xs text-muted-foreground">Impacto Social</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navegación</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={location === item.url}
                  >
                    <Link href={item.url} data-testid={`link-nav-${item.title.toLowerCase().replace(/\s/g, '-')}`}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Configuración</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location === "/settings"}>
                  <Link href="/settings" data-testid="link-nav-settings">
                    <Settings className="h-4 w-4" />
                    <span>Configuración</span>
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
            <AvatarImage src={user?.profileImageUrl || undefined} alt={user?.firstName || "Usuario"} />
            <AvatarFallback>{getInitials()}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {user?.firstName && user?.lastName 
                ? `${user.firstName} ${user.lastName}`
                : user?.email || "Usuario"}
            </p>
            <Badge 
              variant="secondary" 
              className={`text-xs ${roleBadgeColors[userRole] || roleBadgeColors.usuario}`}
            >
              {roleLabels[userRole] || "Usuario"}
            </Badge>
          </div>
        </div>
        <a href="/api/logout" className="w-full">
          <Button variant="ghost" className="w-full justify-start gap-2" data-testid="button-logout">
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </Button>
        </a>
      </SidebarFooter>
    </Sidebar>
  );
}
