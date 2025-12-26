import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageSelector } from "@/components/language-selector";
import { useTranslation } from "@/contexts/LanguageContext";
import { 
  Users, 
  BookOpen, 
  Rocket,
  ArrowRight,
  Globe,
  Heart,
  GraduationCap,
  Lightbulb,
  Handshake,
  FlaskConical,
  Beaker,
  Sparkles
} from "lucide-react";
import impactLabBanner from "@assets/BANNER_IMPACTLAB_1766790182200.jpg";

export default function Landing() {
  const { t, tArray } = useTranslation();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-4 flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-500">
                <div className="h-3 w-3 rounded-full bg-white" />
              </div>
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary -ml-2">
                <div className="h-2 w-2 rounded-full bg-white" />
              </div>
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-lg font-bold">
                <span className="text-primary">Impact</span>
                <span className="text-orange-500">LAB</span>
              </span>
              <span className="text-[10px] text-muted-foreground -mt-1">By GA4SI</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSelector />
            <ThemeToggle />
            <a href="/api/login">
              <Button data-testid="button-login">
                {t("auth.login")}
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
              <span className="text-muted-foreground">{t("landing.platform")}</span>
            </div>
            <div className="flex items-center justify-center gap-2 mb-6">
              <div className="flex items-center gap-0.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-500">
                  <div className="h-4 w-4 rounded-full bg-white" />
                </div>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary -ml-3 mt-2">
                  <div className="h-3 w-3 rounded-full bg-white" />
                </div>
              </div>
              <div className="flex flex-col items-start leading-none">
                <span className="text-3xl md:text-4xl font-bold tracking-tight" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                  <span className="text-primary">Impact</span>
                  <span className="text-orange-500">LAB</span>
                </span>
                <span className="text-sm font-semibold text-orange-500 -mt-1">By GA4SI</span>
              </div>
            </div>
            <p className="text-base text-muted-foreground italic mb-4">Building Connections, Growing Opportunities!</p>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight mb-6">
              {t("landing.heroTitle")}
              <span className="text-primary"> {t("landing.heroHighlight")}</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              {t("landing.heroDescription")}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href="/api/login">
                <Button size="lg" className="gap-2" data-testid="button-hero-login">
                  {t("landing.startNow")}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </a>
              <Button size="lg" variant="outline" data-testid="button-learn-more">
                {t("landing.learnMore")}
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section - Labs */}
      <section className="py-20 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-semibold mb-4">{t("landing.featuresTitle")}</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              {t("landing.featuresDescription")}
            </p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* LEARNING-LAB */}
            <LabSection
              icon={<GraduationCap className="h-8 w-8" />}
              title={t("labs.learningLab.title")}
              description={t("labs.learningLab.description")}
              color="primary"
              modules={[
                {
                  id: "courses",
                  icon: <BookOpen className="h-5 w-5" />,
                  title: t("labs.learningLab.courses.title"),
                  description: t("labs.learningLab.courses.description"),
                  subgroups: tArray("labs.learningLab.courses.subgroups"),
                },
                {
                  id: "mentorship",
                  icon: <Handshake className="h-5 w-5" />,
                  title: t("labs.learningLab.mentorship.title"),
                  description: t("labs.learningLab.mentorship.description"),
                  subgroups: tArray("labs.learningLab.mentorship.subgroups"),
                },
              ]}
            />

            {/* CO-LAB */}
            <LabSection
              icon={<FlaskConical className="h-8 w-8" />}
              title={t("labs.coLab.title")}
              description={t("labs.coLab.description")}
              color="primary"
              modules={[
                {
                  id: "granIdea",
                  icon: <Lightbulb className="h-5 w-5" />,
                  title: t("labs.coLab.granIdea.title"),
                  description: t("labs.coLab.granIdea.description"),
                  subgroups: tArray("labs.coLab.granIdea.subgroups"),
                },
                {
                  id: "metodologico",
                  icon: <Beaker className="h-5 w-5" />,
                  title: t("labs.coLab.metodologico.title"),
                  description: t("labs.coLab.metodologico.description"),
                  subgroups: tArray("labs.coLab.metodologico.subgroups"),
                },
              ]}
            />
          </div>
        </div>
      </section>

      {/* Roles Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-semibold mb-4">{t("landing.rolesTitle")}</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              {t("landing.rolesDescription")}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <RoleCard
              title={t("roleCards.organization.title")}
              description={t("roleCards.organization.description")}
              features={tArray("roleCards.organization.features")}
              roles={tArray("roleCards.organization.roles")}
              color="chart-4"
            />
            <RoleCard
              title={t("roleCards.proponent.title")}
              description={t("roleCards.proponent.description")}
              features={tArray("roleCards.proponent.features")}
              roles={tArray("roleCards.proponent.roles")}
              color="primary"
            />
            <RoleCard
              title={t("roleCards.supporter.title")}
              description={t("roleCards.supporter.description")}
              features={tArray("roleCards.supporter.features")}
              roles={tArray("roleCards.supporter.roles")}
              color="chart-2"
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <Heart className="h-12 w-12 mx-auto mb-6 opacity-90" />
          <h2 className="text-3xl font-semibold mb-4">{t("landing.ctaTitle")}</h2>
          <p className="text-lg opacity-90 max-w-2xl mx-auto mb-8">
            {t("landing.ctaDescription")}
          </p>
          <a href="/api/login">
            <Button size="lg" variant="secondary" className="gap-2" data-testid="button-cta-join">
              {t("landing.joinNow")}
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
              <span className="font-semibold">{t("app.name")}</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2025 {t("app.name")}. {t("landing.copyright")}.
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

function RoleCard({ title, description, features, roles, color }: { 
  title: string; 
  description: string;
  features: string[];
  roles: string[];
  color: string;
}) {
  const colorClasses: Record<string, string> = {
    "primary": "bg-primary/10 text-primary",
    "chart-2": "bg-chart-2/10 text-chart-2",
    "chart-4": "bg-chart-4/10 text-chart-4",
  };

  const dotClasses: Record<string, string> = {
    "primary": "bg-primary",
    "chart-2": "bg-chart-2",
    "chart-4": "bg-chart-4",
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-6">
        <div className={`inline-flex px-3 py-1 rounded-full text-sm font-medium mb-4 ${colorClasses[color]}`}>
          {title}
        </div>
        <p className="text-muted-foreground mb-4">{description}</p>
        <div className="flex flex-wrap gap-2 mb-4">
          {roles.map((role, index) => (
            <Badge key={index} variant="outline" className="text-xs">
              {role}
            </Badge>
          ))}
        </div>
        <ul className="space-y-2">
          {features.map((feature, index) => (
            <li key={index} className="flex items-center gap-2 text-sm">
              <div className={`h-1.5 w-1.5 rounded-full ${dotClasses[color]}`} />
              {feature}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

interface LabModule {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  subgroups: string[];
}

function LabSection({ icon, title, description, color, modules }: { 
  icon: React.ReactNode;
  title: string; 
  description: string;
  color: string;
  modules: LabModule[];
}) {
  const headerColors: Record<string, string> = {
    "primary": "bg-primary text-primary-foreground",
    "chart-2": "bg-chart-2 text-white",
    "chart-4": "bg-chart-4 text-white",
  };

  const iconBgColors: Record<string, string> = {
    "primary": "bg-primary/10 text-primary",
    "chart-2": "bg-chart-2/10 text-chart-2",
    "chart-4": "bg-chart-4/10 text-chart-4",
  };

  return (
    <Card className="overflow-hidden" data-testid={`lab-section-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <div className={`p-4 ${headerColors[color]}`}>
        <div className="flex items-center gap-3">
          {icon}
          <div>
            <h3 className="text-xl font-semibold">{title}</h3>
            <p className="text-sm opacity-90">{description}</p>
          </div>
        </div>
      </div>
      <CardContent className="p-4">
        <div className="space-y-4">
          {modules.map((module) => (
            <div 
              key={module.id} 
              className="border rounded-md p-4 hover-elevate cursor-pointer"
              data-testid={`module-${module.id}`}
            >
              <div className="flex items-start gap-3 mb-3">
                <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${iconBgColors[color]}`}>
                  {module.icon}
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold">{module.title}</h4>
                  <p className="text-sm text-muted-foreground">{module.description}</p>
                </div>
              </div>
              {module.subgroups.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {module.subgroups.map((subgroup, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      {subgroup}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
