import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { 
  Users, 
  Target, 
  BookOpen, 
  Rocket,
  ArrowRight,
  Sparkles,
  Globe,
  Heart
} from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-4 flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-semibold">GA4SI</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <a href="/api/login">
              <Button data-testid="button-login">
                Iniciar Sesión
              </Button>
            </a>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10" />
        <div className="max-w-7xl mx-auto px-4 py-20 md:py-32">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 rounded-full border bg-muted/50 px-4 py-1.5 text-sm mb-6">
              <Globe className="h-4 w-4 text-primary" />
              <span className="text-muted-foreground">Plataforma de Impacto Social</span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight mb-6">
              Transforma tu comunidad con
              <span className="text-primary"> proyectos sociales</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Conecta con mentores, accede a cursos, participa en programas de aceleración 
              y crea el cambio que tu comunidad necesita.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href="/api/login">
                <Button size="lg" className="gap-2" data-testid="button-hero-login">
                  Comenzar ahora
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </a>
              <Button size="lg" variant="outline" data-testid="button-learn-more">
                Conocer más
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-semibold mb-4">Todo lo que necesitas para crear impacto</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Una plataforma integral para gestionar proyectos sociales, 
              conectar con expertos y acelerar tu crecimiento.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <FeatureCard
              icon={<Target className="h-6 w-6" />}
              title="Proyectos Sociales"
              description="Crea, gestiona y da seguimiento a tus proyectos de impacto comunitario."
            />
            <FeatureCard
              icon={<BookOpen className="h-6 w-6" />}
              title="Cursos y Formación"
              description="Accede a contenido educativo diseñado para emprendedores sociales."
            />
            <FeatureCard
              icon={<Users className="h-6 w-6" />}
              title="Mentoría"
              description="Conecta con mentores experimentados que guiarán tu camino."
            />
            <FeatureCard
              icon={<Rocket className="h-6 w-6" />}
              title="Aceleración"
              description="Participa en programas intensivos para escalar tu proyecto."
            />
          </div>
        </div>
      </section>

      {/* Roles Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-semibold mb-4">Únete según tu perfil</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Ya seas emprendedor, mentor o facilitador, hay un lugar para ti en nuestra comunidad.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <RoleCard
              title="Usuario"
              description="Crea proyectos sociales, accede a cursos y conecta con mentores para hacer crecer tu impacto."
              features={["Crear proyectos", "Inscribirse a cursos", "Solicitar mentoría", "Participar en eventos"]}
              color="primary"
            />
            <RoleCard
              title="Mentor"
              description="Comparte tu experiencia y conocimiento guiando a emprendedores sociales en su camino."
              features={["Ofrecer mentoría", "Revisar proyectos", "Dar retroalimentación", "Conectar comunidades"]}
              color="chart-2"
            />
            <RoleCard
              title="Facilitador"
              description="Coordina programas, gestiona eventos y facilita el crecimiento de la comunidad."
              features={["Gestionar programas", "Coordinar eventos", "Supervisar proyectos", "Generar reportes"]}
              color="chart-4"
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <Heart className="h-12 w-12 mx-auto mb-6 opacity-90" />
          <h2 className="text-3xl font-semibold mb-4">Comienza a crear impacto hoy</h2>
          <p className="text-lg opacity-90 max-w-2xl mx-auto mb-8">
            Únete a nuestra comunidad de emprendedores sociales y transforma 
            tu visión en realidad.
          </p>
          <a href="/api/login">
            <Button size="lg" variant="secondary" className="gap-2" data-testid="button-cta-join">
              Unirse ahora
              <ArrowRight className="h-4 w-4" />
            </Button>
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <Sparkles className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-semibold">GA4SI</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2025 GA4SI. Plataforma de Gestión de Proyectos Sociales.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { 
  icon: React.ReactNode; 
  title: string; 
  description: string 
}) {
  return (
    <Card className="border-none bg-card/50 hover-elevate cursor-default">
      <CardContent className="p-6">
        <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 text-primary">
          {icon}
        </div>
        <h3 className="font-semibold mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

function RoleCard({ title, description, features, color }: { 
  title: string; 
  description: string;
  features: string[];
  color: string;
}) {
  const colorClasses: Record<string, string> = {
    "primary": "bg-primary/10 text-primary",
    "chart-2": "bg-chart-2/10 text-chart-2",
    "chart-4": "bg-chart-4/10 text-chart-4",
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-6">
        <div className={`inline-flex px-3 py-1 rounded-full text-sm font-medium mb-4 ${colorClasses[color]}`}>
          {title}
        </div>
        <p className="text-muted-foreground mb-6">{description}</p>
        <ul className="space-y-2">
          {features.map((feature, index) => (
            <li key={index} className="flex items-center gap-2 text-sm">
              <div className={`h-1.5 w-1.5 rounded-full ${color === 'primary' ? 'bg-primary' : color === 'chart-2' ? 'bg-chart-2' : 'bg-chart-4'}`} />
              {feature}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
