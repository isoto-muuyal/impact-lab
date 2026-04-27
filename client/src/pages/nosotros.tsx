import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageSelector } from "@/components/language-selector";
import { useTranslation } from "@/contexts/LanguageContext";
import { Linkedin } from "lucide-react";

const teamMembers = [
  { key: "karla", name: "Karla España", initials: "KE", linkedinUrl: "https://www.linkedin.com/in/karlaespana/" },
  { key: "nadya", name: "Nadya Bayona", initials: "NB", linkedinUrl: "https://www.linkedin.com/in/nadyabayona/" },
  { key: "julian", name: "Julián Suaza", initials: "JS", linkedinUrl: "https://www.linkedin.com/in/juliansuaza/" },
];

export default function Nosotros() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background">
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

          <nav className="hidden sm:flex items-center gap-1">
            <a href="/">
              <Button variant="ghost" size="sm">{t("nav.home")}</Button>
            </a>
            <Button variant="secondary" size="sm" disabled>
              {t("nosotros.navTitle")}
            </Button>
          </nav>

          <div className="flex items-center gap-2">
            <LanguageSelector />
            <ThemeToggle />
            <a href="/login">
              <Button data-testid="button-login">{t("auth.login")}</Button>
            </a>
          </div>
        </div>
      </header>

      <section className="py-16">
        <div className="max-w-2xl mx-auto px-4">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-3 mb-2">
              <div className="h-px flex-1 bg-orange-300" />
              <h2 className="text-xl font-bold tracking-widest text-orange-500">
                {t("nosotros.teamTitle")}
              </h2>
              <div className="h-px flex-1 bg-orange-300" />
            </div>
          </div>

          <div className="space-y-6">
            {teamMembers.map((member) => (
              <Card key={member.key} className="shadow-sm">
                <CardContent className="p-6 flex flex-col items-center text-center">
                  <div className="relative mb-4">
                    <div className="h-24 w-24 rounded-full bg-muted flex items-center justify-center text-2xl font-semibold text-muted-foreground border-2 border-border">
                      {member.initials}
                    </div>
                    <a
                      href={member.linkedinUrl}
                      className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-[#0077B5] text-white shadow-sm hover:bg-[#005885] transition-colors"
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`LinkedIn de ${member.name}`}
                    >
                      <Linkedin className="h-4 w-4" />
                    </a>
                  </div>

                  <h3 className="text-lg font-bold mb-1">{member.name}</h3>

                  <p className="text-sm font-medium text-primary mb-2">
                    {t(`nosotros.members.${member.key}.title`)}
                  </p>

                  <p className="text-sm text-muted-foreground mb-4">
                    {t(`nosotros.members.${member.key}.description`)}
                  </p>

                  <Badge
                    variant="outline"
                    className="text-orange-500 border-orange-200 bg-orange-50 dark:bg-orange-950/20 text-xs text-center whitespace-normal h-auto py-1"
                  >
                    {t(`nosotros.members.${member.key}.department`)}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
