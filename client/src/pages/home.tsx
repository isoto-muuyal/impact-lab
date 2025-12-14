import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
  BarChart3
} from "lucide-react";

export default function Home() {
  const { user, isLoading } = useAuth();
  
  const userRole = user?.userRoles?.[0]?.role?.name || "usuario";

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
        return <UsuarioDashboard user={user} />;
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

function UsuarioDashboard({ user }: { user: any }) {
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
          href="/projects/new"
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
  color = "primary" 
}: { 
  title: string; 
  description: string; 
  icon: React.ReactNode;
  buttonText: string;
  href: string;
  color?: string;
}) {
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
        <Button variant="outline" className="gap-2" data-testid={`button-action-${title.toLowerCase().replace(/\s/g, '-')}`}>
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
