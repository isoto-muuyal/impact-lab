import { useAuth, type RoleName } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldX, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: RoleName[];
  fallbackMessage?: string;
}

export function RoleGuard({ children, allowedRoles, fallbackMessage }: RoleGuardProps) {
  const { isLoading, isAuthenticated, hasAnyRole } = useAuth();

  if (isLoading) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-10 w-48 mb-4" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-6">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <ShieldX className="h-6 w-6" />
              Acceso Restringido
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Debes iniciar sesion para acceder a esta pagina.
            </p>
            <Button asChild>
              <a href="/login" data-testid="button-login">
                Iniciar Sesion
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!hasAnyRole(allowedRoles)) {
    const roleNames: Record<RoleName, string> = {
      usuario: "Usuario",
      mentor: "Mentor",
      facilitador: "Facilitador",
      proponente: "Proponente",
      acreditador: "Acreditador",
    };
    
    const requiredRolesList = allowedRoles.map(r => roleNames[r]).join(", ");

    return (
      <div className="flex items-center justify-center min-h-[60vh] p-6">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <ShieldX className="h-6 w-6" />
              Acceso Denegado
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              {fallbackMessage || `Esta seccion esta disponible solo para: ${requiredRolesList}`}
            </p>
            <p className="text-sm text-muted-foreground">
              Puedes cambiar tus roles desde tu perfil si necesitas acceso a esta funcionalidad.
            </p>
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" asChild>
                <Link href="/" data-testid="link-home">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Ir al Inicio
                </Link>
              </Button>
              <Button asChild>
                <Link href="/profile" data-testid="link-profile">
                  Gestionar Roles
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
