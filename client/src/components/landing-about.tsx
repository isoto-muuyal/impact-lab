import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/contexts/LanguageContext";
import {
  ArrowRight,
  Globe,
  Eye,
  Target,
  GraduationCap,
  FlaskConical,
  Users,
  Building2,
  Lightbulb,
  Briefcase,
  Award,
  TrendingUp,
  Network,
  Rocket,
  BookOpen,
  Sparkles,
  Play,
  Compass,
  Handshake,
  Shield,
  Zap,
  Star,
  BarChart3,
  Layers,
} from "lucide-react";

export default function LandingAbout() {
  const { t } = useTranslation();

  // Icons for audiences section
  const audienceIcons = [
    <Users className="h-7 w-7" />,
    <GraduationCap className="h-7 w-7" />,
    <Building2 className="h-7 w-7" />,
    <Briefcase className="h-7 w-7" />,
    <Handshake className="h-7 w-7" />,
  ];

  // Icons for benefits section
  const benefitIcons = [
    <Network className="h-6 w-6" />,
    <Award className="h-6 w-6" />,
    <Briefcase className="h-6 w-6" />,
    <TrendingUp className="h-6 w-6" />,
    <Lightbulb className="h-6 w-6" />,
    <Globe className="h-6 w-6" />,
    <Shield className="h-6 w-6" />,
    <Zap className="h-6 w-6" />,
  ];

  // Icons for methodology steps
  const methodIcons = [
    <Compass className="h-5 w-5" />,
    <Lightbulb className="h-5 w-5" />,
    <Layers className="h-5 w-5" />,
    <BarChart3 className="h-5 w-5" />,
    <Rocket className="h-5 w-5" />,
  ];

  // Cycle icons + colors
  const cycleConfig = [
    { icon: <Lightbulb className="h-6 w-6" />, color: "bg-orange-500/10 text-orange-500" },
    { icon: <BookOpen className="h-6 w-6" />, color: "bg-primary/10 text-primary" },
    { icon: <Users className="h-6 w-6" />, color: "bg-orange-500/10 text-orange-500" },
    { icon: <Rocket className="h-6 w-6" />, color: "bg-primary/10 text-primary" },
  ];

  // Team member images
  const memberImages = [
    "/team-member-1.png",
    "/team-member-2.png",
    "/team-member-3.png",
    "/team-member-4.png",
  ];

  return (
    <>
      {/* About Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-orange-500/5" />
        <div className="absolute top-20 right-10 w-72 h-72 rounded-full bg-orange-500/5 blur-3xl" />
        <div className="absolute bottom-10 left-10 w-96 h-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="max-w-7xl mx-auto px-4 py-20 md:py-28 relative">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 rounded-full border bg-muted/50 px-4 py-1.5 text-sm mb-6">
              <Globe className="h-4 w-4 text-orange-500" />
              <span className="text-muted-foreground">{t("about.badge")}</span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight mb-6">
              {t("about.heroTitle")}{" "}
              <span className="bg-gradient-to-r from-primary to-orange-500 bg-clip-text text-transparent">
                {t("about.heroHighlight")}
              </span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
              {t("about.heroDescription")}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href="/register">
                <Button size="lg" className="gap-2" data-testid="button-about-start">
                  {t("about.startNow")}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </a>
              <Button size="lg" variant="outline" data-testid="button-about-learn">
                {t("about.learnMore")}
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* El Origen Section */}
      <section className="py-20 bg-muted/20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-semibold mb-4">{t("about.origin.title")}</h2>
            <div className="w-16 h-1 bg-orange-500 mx-auto rounded-full" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
            {/* Video Placeholder */}
            <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-slate-900 to-slate-800 aspect-video flex items-center justify-center group cursor-pointer shadow-xl">
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
              <div className="relative z-10 flex flex-col items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-orange-500/90 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <Play className="h-7 w-7 text-white ml-1" />
                </div>
                <p className="text-white/80 text-sm font-medium">{t("about.origin.videoLabel")}</p>
              </div>
              <div className="absolute inset-0 opacity-10" style={{
                backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.3) 1px, transparent 1px)",
                backgroundSize: "24px 24px"
              }} />
            </div>

            {/* Mission/Vision/Objectives Cards */}
            <div className="space-y-4">
              <Card className="border-none bg-primary text-primary-foreground shadow-lg overflow-hidden">
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="h-10 w-10 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                      <Compass className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg mb-1">{t("about.origin.mission.title")}</h3>
                      <p className="text-sm opacity-90 leading-relaxed">
                        {t("about.origin.mission.description")}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-lg overflow-hidden">
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="h-10 w-10 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                      <Eye className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg mb-1">{t("about.origin.vision.title")}</h3>
                      <p className="text-sm opacity-90 leading-relaxed">
                        {t("about.origin.vision.description")}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none bg-card shadow-lg overflow-hidden">
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center shrink-0">
                      <Target className="h-5 w-5 text-orange-500" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg mb-1">{t("about.origin.objectives.title")}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {t("about.origin.objectives.description")}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Nuestro Modelo Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-semibold mb-4">{t("about.model.title")}</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              {t("about.model.subtitle")}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
            {/* Learning-Lab Card */}
            <Card className="overflow-hidden border-none shadow-lg group hover:shadow-xl transition-shadow duration-300">
              <div className="bg-primary text-primary-foreground p-6">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-white/20 flex items-center justify-center">
                    <GraduationCap className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold">{t("about.model.learningLab.title")}</h3>
                    <p className="text-sm opacity-80">{t("about.model.learningLab.subtitle")}</p>
                  </div>
                </div>
              </div>
              <CardContent className="p-6">
                <p className="text-muted-foreground mb-4 leading-relaxed">
                  {t("about.model.learningLab.description")}
                </p>
                <div className="flex flex-wrap gap-2">
                  {[0, 1, 2, 3].map((i) => (
                    <Badge key={i} variant="secondary" className="bg-primary/10 text-primary">
                      {t(`about.model.learningLab.tags.${i}`, ["Cursos", "Mentorías", "Certificaciones", "Evaluaciones"][i])}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Co-Lab Card */}
            <Card className="overflow-hidden border-none shadow-lg group hover:shadow-xl transition-shadow duration-300">
              <div className="bg-orange-500 text-white p-6">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-white/20 flex items-center justify-center">
                    <FlaskConical className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold">{t("about.model.coLab.title")}</h3>
                    <p className="text-sm opacity-80">{t("about.model.coLab.subtitle")}</p>
                  </div>
                </div>
              </div>
              <CardContent className="p-6">
                <p className="text-muted-foreground mb-4 leading-relaxed">
                  {t("about.model.coLab.description")}
                </p>
                <div className="flex flex-wrap gap-2">
                  {[0, 1, 2, 3].map((i) => (
                    <Badge key={i} variant="secondary" className="bg-orange-500/10 text-orange-600">
                      {t(`about.model.coLab.tags.${i}`, ["Gran Idea", "Metodológico", "Prototipado", "Revisiones"][i])}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Ciclo Entero - Cycle Diagram */}
          <div className="bg-muted/30 rounded-2xl p-8 md:p-10">
            <h3 className="text-xl font-semibold text-center mb-8">{t("about.model.cycle.title")}</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {cycleConfig.map((step, idx) => (
                <div key={idx} className="relative text-center">
                  <div className={`h-14 w-14 rounded-2xl ${step.color} flex items-center justify-center mx-auto mb-3`}>
                    {step.icon}
                  </div>
                  <h4 className="font-semibold text-sm mb-1">{t(`about.model.cycle.steps.${idx}.title`)}</h4>
                  <p className="text-xs text-muted-foreground">{t(`about.model.cycle.steps.${idx}.desc`)}</p>
                  {idx < 3 && (
                    <ArrowRight className="hidden md:block h-4 w-4 text-muted-foreground/40 absolute top-7 -right-3 md:-right-5" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* A Quiénes Servimos */}
      <section className="py-20 bg-muted/20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-semibold mb-4">{t("about.audiences.title")}</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              {t("about.audiences.subtitle")}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
            {audienceIcons.map((icon, idx) => (
              <Card key={idx} className="text-center border-none shadow-md hover:shadow-lg transition-shadow duration-300 group">
                <CardContent className="p-6">
                  <div className="h-14 w-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                    {icon}
                  </div>
                  <h3 className="font-semibold text-sm mb-2">{t(`about.audiences.items.${idx}.title`)}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{t(`about.audiences.items.${idx}.desc`)}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Qué gana el Talento - Dark Section */}
      <section className="py-20 bg-[hsl(220,60%,15%)] text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-5" style={{
          backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.4) 1px, transparent 1px)",
          backgroundSize: "32px 32px"
        }} />
        <div className="max-w-7xl mx-auto px-4 relative">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-semibold mb-4">{t("about.benefits.title")}</h2>
            <p className="text-white/70 text-lg max-w-2xl mx-auto">
              {t("about.benefits.subtitle")}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {benefitIcons.map((icon, idx) => (
              <div key={idx} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-5 hover:bg-white/10 transition-colors duration-300">
                <div className="h-11 w-11 rounded-lg bg-orange-500/20 text-orange-400 flex items-center justify-center mb-4">
                  {icon}
                </div>
                <h3 className="font-semibold text-sm mb-2">{t(`about.benefits.items.${idx}.title`)}</h3>
                <p className="text-xs text-white/60 leading-relaxed">{t(`about.benefits.items.${idx}.desc`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Nuestra Metodología */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-semibold mb-4">{t("about.methodology.title")}</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              {t("about.methodology.subtitle")}
            </p>
          </div>

          <div className="relative">
            {/* Connection Line */}
            <div className="hidden lg:block absolute top-12 left-[10%] right-[10%] h-0.5 bg-gradient-to-r from-primary via-orange-500 to-primary" />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8">
              {methodIcons.map((icon, idx) => (
                <div key={idx} className="text-center relative">
                  <div className="relative z-10 bg-background">
                    <div className="h-14 w-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center mx-auto mb-4 text-lg font-bold shadow-lg">
                      {icon}
                    </div>
                  </div>
                  <span className="inline-block text-xs font-bold text-orange-500 mb-1">
                    {t("about.methodology.stepLabel")} {t(`about.methodology.steps.${idx}.step`)}
                  </span>
                  <h4 className="font-semibold mb-2">{t(`about.methodology.steps.${idx}.title`)}</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">{t(`about.methodology.steps.${idx}.desc`)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Nuestra Historia - Timeline */}
      <section className="py-20 bg-muted/20">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-semibold mb-4">{t("about.history.title")}</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              {t("about.history.subtitle")}
            </p>
          </div>

          <div className="relative">
            {/* Vertical timeline line */}
            <div className="absolute left-4 md:left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary via-orange-500 to-primary md:-translate-x-0.5" />

            <div className="space-y-12">
              {[0, 1, 2, 3, 4].map((idx) => {
                const side = idx % 2 === 0 ? "left" : "right";
                return (
                  <div key={idx} className={`relative flex items-start ${side === "right" ? "md:flex-row-reverse" : ""}`}>
                    {/* Timeline dot */}
                    <div className="absolute left-4 md:left-1/2 h-8 w-8 -translate-x-1/2 bg-background border-4 border-primary rounded-full z-10 flex items-center justify-center">
                      <div className="h-2 w-2 rounded-full bg-orange-500" />
                    </div>

                    {/* Content */}
                    <div className={`ml-14 md:ml-0 md:w-[calc(50%-2rem)] ${side === "right" ? "md:mr-auto md:pr-8 md:text-right" : "md:ml-auto md:pl-8"}`}>
                      <Card className="border-none shadow-md">
                        <CardContent className="p-5">
                          <Badge variant="secondary" className="bg-orange-500/10 text-orange-600 mb-2 font-bold">
                            {t(`about.history.events.${idx}.year`)}
                          </Badge>
                          <h4 className="font-semibold text-lg mb-2">{t(`about.history.events.${idx}.title`)}</h4>
                          <p className="text-sm text-muted-foreground leading-relaxed">{t(`about.history.events.${idx}.desc`)}</p>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Liderazgo con Propósito */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-semibold mb-4">{t("about.leadership.title")}</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              {t("about.leadership.subtitle")}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {memberImages.map((image, idx) => (
              <div key={idx} className="text-center group">
                <div className="relative mb-5">
                  <div className="w-36 h-36 mx-auto rounded-full overflow-hidden border-4 border-muted group-hover:border-primary transition-colors duration-300 shadow-lg">
                    <img
                      src={image}
                      alt={t(`about.leadership.members.${idx}.name`)}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2">
                    <div className="h-6 w-6 rounded-full bg-orange-500 flex items-center justify-center shadow-md">
                      <Star className="h-3 w-3 text-white" />
                    </div>
                  </div>
                </div>
                <h3 className="font-semibold text-lg">{t(`about.leadership.members.${idx}.name`)}</h3>
                <p className="text-sm text-muted-foreground">{t(`about.leadership.members.${idx}.role`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-orange-500 via-orange-500 to-orange-600 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.4) 1px, transparent 1px)",
          backgroundSize: "28px 28px"
        }} />
        <div className="max-w-7xl mx-auto px-4 text-center relative">
          <Sparkles className="h-10 w-10 mx-auto mb-6 opacity-90" />
          <h2 className="text-3xl md:text-4xl font-semibold mb-4">{t("about.cta.title")}</h2>
          <p className="text-lg opacity-90 max-w-2xl mx-auto mb-8 leading-relaxed">
            {t("about.cta.description")}
          </p>
          <a href="/register">
            <Button size="lg" className="bg-white text-orange-600 hover:bg-white/90 gap-2 shadow-lg font-semibold" data-testid="button-about-cta-join">
              {t("about.cta.button")}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </a>
        </div>
      </section>
    </>
  );
}
