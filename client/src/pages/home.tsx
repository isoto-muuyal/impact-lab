import { useDeferredValue, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/contexts/LanguageContext";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLocation } from "wouter";
import { 
  Target, 
  BookOpen, 
  Users, 
  Calendar,
  ArrowRight,
  TrendingUp,
  Clock,
  CheckCircle,
  Rocket,
  MessageSquare,
  BarChart3,
  Search,
  Bell,
  UserPlus,
  Eye,
  Plus,
} from "lucide-react";
import type { Notification, ProjectJoinRequestWithDetails, ProjectWithOwner } from "@shared/schema";

export default function Home() {
  const { user, isLoading, hasRole } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  
  const userRole = user?.userRoles?.[0]?.role?.name || "usuario";

  const handleCreateProjectClick = () => {
    if (!hasRole("proponente")) {
      toast({
        title: t("common.accessDenied"),
        description: t("projects.proponentRoleRequired"),
        variant: "destructive",
      });
      return;
    }

    setLocation("/projects");
  };

  if (isLoading) {
    return <HomeLoadingSkeleton />;
  }

  const renderDashboard = () => {
    switch (userRole) {
      case "mentor":
        return <MentorDashboard user={user} />;
      case "facilitador":
        return <FacilitadorDashboard user={user} />;
      default:
        return <UsuarioDashboard user={user} onCreateProject={handleCreateProjectClick} />;
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Welcome Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-semibold mb-2" data-testid="text-welcome">
          Bienvenido{user?.firstName ? `, ${user.firstName}` : ""}
        </h1>
        <p className="text-muted-foreground text-lg">
          {getWelcomeMessage(userRole)}
        </p>
      </div>

      {renderDashboard()}
      <ProjectDiscoverySection onCreateProject={handleCreateProjectClick} />
    </div>
  );
}

function getWelcomeMessage(role: string): string {
  switch (role) {
    case "mentor":
      return "Revisa tus mentorías activas y conecta con emprendedores sociales.";
    case "facilitador":
      return "Gestiona los programas y supervisa el progreso de la comunidad.";
    default:
      return "Explora cursos, proyectos y oportunidades de mentoría.";
  }
}

function UsuarioDashboard({ user, onCreateProject }: { user: any; onCreateProject: () => void }) {
  return (
    <>
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Mis Proyectos"
          value="0"
          description="Proyectos activos"
          icon={<Target className="h-5 w-5" />}
          trend="+0%"
        />
        <StatCard
          title="Cursos"
          value="0"
          description="En progreso"
          icon={<BookOpen className="h-5 w-5" />}
          trend="Nuevo"
        />
        <StatCard
          title="Mentorías"
          value="0"
          description="Sesiones programadas"
          icon={<Users className="h-5 w-5" />}
        />
        <StatCard
          title="Eventos"
          value="0"
          description="Próximos eventos"
          icon={<Calendar className="h-5 w-5" />}
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <ActionCard
          title="Crear Proyecto"
          description="Inicia un nuevo proyecto social y compártelo con la comunidad."
          icon={<Target className="h-6 w-6" />}
          buttonText="Nuevo proyecto"
          href="/projects"
          onClick={onCreateProject}
        />
        <ActionCard
          title="Explorar Cursos"
          description="Accede a contenido educativo para emprendedores sociales."
          icon={<BookOpen className="h-6 w-6" />}
          buttonText="Ver cursos"
          href="/courses"
        />
        <ActionCard
          title="Solicitar Mentoría"
          description="Conecta con mentores experimentados en tu área."
          icon={<Users className="h-6 w-6" />}
          buttonText="Buscar mentor"
          href="/mentorship"
        />
      </div>

      {/* Profile Completion */}
      {!user?.profile?.profileStatus || user?.profile?.profileStatus === 'incomplete' ? (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-lg bg-chart-4/10 flex items-center justify-center text-chart-4">
                <Clock className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold mb-1">Completa tu perfil</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Agrega tu información profesional para conectar mejor con mentores y la comunidad.
                </p>
                <Button variant="outline" className="gap-2" data-testid="button-complete-profile">
                  Completar perfil
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </>
  );
}

async function fetchProjects(search: string): Promise<ProjectWithOwner[]> {
  const url = search ? `/api/projects?search=${encodeURIComponent(search)}` : "/api/projects";
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) {
    throw new Error(`${res.status}: ${await res.text()}`);
  }
  return res.json();
}

async function fetchMyJoinRequests(): Promise<ProjectJoinRequestWithDetails[]> {
  const res = await fetch("/api/project-join-requests/my", { credentials: "include" });
  if (!res.ok) {
    throw new Error(`${res.status}: ${await res.text()}`);
  }
  return res.json();
}

async function fetchNotifications(): Promise<Notification[]> {
  const res = await fetch("/api/notifications", { credentials: "include" });
  if (!res.ok) {
    throw new Error(`${res.status}: ${await res.text()}`);
  }
  return res.json();
}

function ProjectDiscoverySection({ onCreateProject }: { onCreateProject: () => void }) {
  const { user, hasRole } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProject, setSelectedProject] = useState<ProjectWithOwner | null>(null);
  const [joinRole, setJoinRole] = useState<"participant" | "mentor">("participant");
  const [joinReason, setJoinReason] = useState("");
  const deferredSearch = useDeferredValue(searchQuery.trim());
  const [, setLocation] = useLocation();

  const projectsQuery = useQuery<ProjectWithOwner[]>({
    queryKey: ["/api/projects", "home", deferredSearch],
    queryFn: () => fetchProjects(deferredSearch),
  });

  const myJoinRequestsQuery = useQuery<ProjectJoinRequestWithDetails[]>({
    queryKey: ["/api/project-join-requests/my"],
    queryFn: fetchMyJoinRequests,
  });

  const notificationsQuery = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
    queryFn: fetchNotifications,
  });

  const joinRequestMutation = useMutation({
    mutationFn: async ({ projectId, requestedRole, helpDescription }: { projectId: string; requestedRole: "participant" | "mentor"; helpDescription: string }) =>
      apiRequest("POST", `/api/projects/${projectId}/join-requests`, { requestedRole, helpDescription }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/projects"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/project-join-requests/my"] }),
      ]);
      setSelectedProject(null);
      setJoinRole("participant");
      setJoinReason("");
      toast({ title: "Solicitud enviada", description: "Tu solicitud fue enviada al creador del proyecto." });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo enviar la solicitud.",
        variant: "destructive",
      });
    },
  });

  const readNotificationMutation = useMutation({
    mutationFn: async (notificationId: string) => apiRequest("POST", `/api/notifications/${notificationId}/read`, {}),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
  });

  const requestOptions = [
    { value: "participant" as const, label: "Participante", enabled: true },
    { value: "mentor" as const, label: "Mentor", enabled: hasRole("mentor") },
  ].filter((option) => option.enabled);

  const myRequestsByProjectId = new Map((myJoinRequestsQuery.data ?? []).map((request) => [request.projectId, request]));
  const projects = projectsQuery.data ?? [];

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-4">
            <span>Buscar Proyectos</span>
            <Button variant="outline" size="sm" onClick={onCreateProject}>
              <Plus className="h-4 w-4 mr-2" />
              Crear
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Busca proyectos por nombre, impacto, categoría o ubicación"
              className="pl-9"
            />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {projects.map((project) => {
              const participants = project.participants ?? [];
              const isMember = project.ownerId === user?.id
                || project.mentorId === user?.id
                || participants.some((participant) => participant.userId === user?.id);
              const myRequest = myRequestsByProjectId.get(project.id);

              return (
                <div
                  key={project.id}
                  className={`rounded-xl border p-4 ${isMember ? "bg-sky-100 border-sky-200" : "bg-slate-100 border-slate-200"}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold">{project.title}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{project.description || "Sin descripción"}</p>
                    </div>
                    {isMember ? <Badge className="bg-sky-600 text-white">Ya participas</Badge> : null}
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {project.category ? <Badge variant="outline">{project.category}</Badge> : null}
                    {project.location ? <Badge variant="outline">{project.location}</Badge> : null}
                    {myRequest && !isMember ? (
                      <Badge variant="secondary">
                        {myRequest.status === "pending" ? "Pendiente" : myRequest.status === "accepted" ? "Aceptada" : "Rechazada"}
                      </Badge>
                    ) : null}
                  </div>
                  <div className="flex gap-2 mt-4">
                    {isMember ? (
                      <Button size="sm" onClick={() => setLocation("/projects")}>
                        <Eye className="h-4 w-4 mr-2" />
                        Ver proyecto
                      </Button>
                    ) : !myRequest ? (
                      <Button size="sm" variant="outline" onClick={() => setSelectedProject(project)}>
                        <UserPlus className="h-4 w-4 mr-2" />
                        Reques to join
                      </Button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notificaciones
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {notificationsQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Cargando notificaciones...</p>
          ) : (notificationsQuery.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No tienes notificaciones recientes.</p>
          ) : (
            (notificationsQuery.data ?? []).slice(0, 5).map((notification) => (
              <div key={notification.id} className="rounded-lg border p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-sm">{notification.title}</p>
                    <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
                  </div>
                  {!notification.readAt ? (
                    <Button size="sm" variant="ghost" onClick={() => readNotificationMutation.mutate(notification.id)}>
                      Marcar leida
                    </Button>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Dialog
        open={!!selectedProject}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedProject(null);
            setJoinReason("");
            setJoinRole("participant");
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Request to join</DialogTitle>
            <DialogDescription>
              Elige el rol con el que quieres participar y explica tu aporte.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Rol que quiero asumir</Label>
              <Select value={joinRole} onValueChange={(value: "participant" | "mentor") => setJoinRole(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {requestOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="join-reason-home">Como puedo participar</Label>
              <Textarea
                id="join-reason-home"
                value={joinReason}
                onChange={(event) => setJoinReason(event.target.value)}
                rows={4}
                placeholder="Describe tu experiencia, tiempo disponible y como quieres contribuir."
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setSelectedProject(null)}>
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={!selectedProject || !joinReason.trim() || joinRequestMutation.isPending}
              onClick={() => {
                if (!selectedProject) return;
                joinRequestMutation.mutate({
                  projectId: selectedProject.id,
                  requestedRole: joinRole,
                  helpDescription: joinReason.trim(),
                });
              }}
            >
              {joinRequestMutation.isPending ? <Clock className="h-4 w-4 mr-2 animate-spin" /> : null}
              Enviar solicitud
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MentorDashboard({ user }: { user: any }) {
  return (
    <>
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Mentorías Activas"
          value="0"
          description="Emprendedores asignados"
          icon={<Users className="h-5 w-5" />}
          color="chart-2"
        />
        <StatCard
          title="Sesiones"
          value="0"
          description="Este mes"
          icon={<Calendar className="h-5 w-5" />}
          color="chart-2"
        />
        <StatCard
          title="Proyectos"
          value="0"
          description="En revisión"
          icon={<Target className="h-5 w-5" />}
          color="chart-2"
        />
        <StatCard
          title="Mensajes"
          value="0"
          description="Sin leer"
          icon={<MessageSquare className="h-5 w-5" />}
          color="chart-2"
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <ActionCard
          title="Mis Mentorías"
          description="Revisa y gestiona tus sesiones de mentoría programadas."
          icon={<Users className="h-6 w-6" />}
          buttonText="Ver mentorías"
          href="/mentorship"
          color="chart-2"
        />
        <ActionCard
          title="Revisar Proyectos"
          description="Da retroalimentación a los proyectos asignados."
          icon={<Target className="h-6 w-6" />}
          buttonText="Ver proyectos"
          href="/projects"
          color="chart-2"
        />
        <ActionCard
          title="Calendario"
          description="Organiza tus sesiones y disponibilidad."
          icon={<Calendar className="h-6 w-6" />}
          buttonText="Ver calendario"
          href="/calendar"
          color="chart-2"
        />
      </div>

      {/* Upcoming Sessions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-chart-2" />
            Próximas Sesiones
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
              <Calendar className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">No hay sesiones programadas</p>
            <p className="text-sm text-muted-foreground mt-1">
              Las próximas mentorías aparecerán aquí.
            </p>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

function FacilitadorDashboard({ user }: { user: any }) {
  return (
    <>
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Programas"
          value="0"
          description="Activos"
          icon={<Rocket className="h-5 w-5" />}
          color="chart-4"
        />
        <StatCard
          title="Usuarios"
          value="0"
          description="Registrados"
          icon={<Users className="h-5 w-5" />}
          color="chart-4"
        />
        <StatCard
          title="Proyectos"
          value="0"
          description="En plataforma"
          icon={<Target className="h-5 w-5" />}
          color="chart-4"
        />
        <StatCard
          title="Eventos"
          value="0"
          description="Próximos"
          icon={<Calendar className="h-5 w-5" />}
          color="chart-4"
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <ActionCard
          title="Gestionar Programas"
          description="Crea y administra programas de aceleración."
          icon={<Rocket className="h-6 w-6" />}
          buttonText="Ver programas"
          href="/programs"
          color="chart-4"
        />
        <ActionCard
          title="Usuarios"
          description="Administra usuarios y asigna roles."
          icon={<Users className="h-6 w-6" />}
          buttonText="Ver usuarios"
          href="/users"
          color="chart-4"
        />
        <ActionCard
          title="Reportes"
          description="Genera reportes de actividad y métricas."
          icon={<BarChart3 className="h-6 w-6" />}
          buttonText="Ver reportes"
          href="/reports"
          color="chart-4"
        />
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-chart-4" />
            Actividad Reciente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
              <BarChart3 className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">No hay actividad reciente</p>
            <p className="text-sm text-muted-foreground mt-1">
              La actividad de la plataforma aparecerá aquí.
            </p>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

function StatCard({ 
  title, 
  value, 
  description, 
  icon, 
  trend,
  color = "primary" 
}: { 
  title: string; 
  value: string; 
  description: string; 
  icon: React.ReactNode;
  trend?: string;
  color?: string;
}) {
  const colorClasses: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    "chart-2": "bg-chart-2/10 text-chart-2",
    "chart-4": "bg-chart-4/10 text-chart-4",
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between gap-4 mb-3">
          <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${colorClasses[color]}`}>
            {icon}
          </div>
          {trend && (
            <Badge variant="secondary" className="text-xs">
              {trend}
            </Badge>
          )}
        </div>
        <div className="text-2xl font-semibold mb-1">{value}</div>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

function ActionCard({ 
  title, 
  description, 
  icon, 
  buttonText, 
  href,
  onClick,
  color = "primary" 
}: { 
  title: string; 
  description: string; 
  icon: React.ReactNode;
  buttonText: string;
  href: string;
  onClick?: () => void;
  color?: string;
}) {
  const [, setLocation] = useLocation();
  const colorClasses: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    "chart-2": "bg-chart-2/10 text-chart-2",
    "chart-4": "bg-chart-4/10 text-chart-4",
  };

  return (
    <Card className="hover-elevate cursor-default">
      <CardContent className="p-6">
        <div className={`h-12 w-12 rounded-lg flex items-center justify-center mb-4 ${colorClasses[color]}`}>
          {icon}
        </div>
        <h3 className="font-semibold mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground mb-4">{description}</p>
        <Button
          variant="outline"
          className="gap-2"
          data-testid={`button-action-${title.toLowerCase().replace(/\s/g, '-')}`}
          onClick={() => onClick ? onClick() : setLocation(href)}
        >
          {buttonText}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}

function HomeLoadingSkeleton() {
  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="mb-8">
        <Skeleton className="h-9 w-64 mb-2" />
        <Skeleton className="h-6 w-96" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-10 w-10 rounded-lg mb-3" />
              <Skeleton className="h-8 w-12 mb-1" />
              <Skeleton className="h-4 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-12 w-12 rounded-lg mb-4" />
              <Skeleton className="h-5 w-32 mb-2" />
              <Skeleton className="h-4 w-full mb-4" />
              <Skeleton className="h-9 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
