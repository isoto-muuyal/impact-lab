import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function Register() {
  const { isAuthenticated, isLoading } = useAuth();
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const registerMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/register", {
        email,
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      setLocation("/");
    },
  });

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      setLocation("/");
    }
  }, [isAuthenticated, isLoading, setLocation]);

  const handleSubmit = () => {
    if (!firstName.trim() || !lastName.trim()) {
      setFormError(t("auth.nameRequired", "First and last name are required."));
      return;
    }

    if (password !== confirmPassword) {
      setFormError(t("auth.passwordMismatch", "Passwords do not match."));
      return;
    }

    setFormError(null);
    registerMutation.mutate();
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-muted/20">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{t("auth.registerTitle", "Create account")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            type="email"
            value={email}
            onChange={(event) => {
              setFormError(null);
              setEmail(event.target.value);
            }}
            placeholder={t("auth.emailPlaceholder", "Email")}
            data-testid="input-register-email"
          />
          <Input
            value={firstName}
            onChange={(event) => {
              setFormError(null);
              setFirstName(event.target.value);
            }}
            placeholder={t("auth.firstNamePlaceholder", "First name")}
            data-testid="input-register-first-name"
          />
          <Input
            value={lastName}
            onChange={(event) => {
              setFormError(null);
              setLastName(event.target.value);
            }}
            placeholder={t("auth.lastNamePlaceholder", "Last name")}
            data-testid="input-register-last-name"
          />
          <Input
            type="password"
            value={password}
            onChange={(event) => {
              setFormError(null);
              setPassword(event.target.value);
            }}
            placeholder={t("auth.passwordPlaceholder", "Password")}
            data-testid="input-register-password"
          />
          <Input
            type="password"
            value={confirmPassword}
            onChange={(event) => {
              setFormError(null);
              setConfirmPassword(event.target.value);
            }}
            placeholder={t("auth.confirmPasswordPlaceholder", "Confirm password")}
            data-testid="input-register-confirm-password"
          />
          <Button
            className="w-full"
            disabled={registerMutation.isPending}
            onClick={handleSubmit}
            data-testid="button-submit-register"
          >
            {t("auth.registerButton", "Register")}
          </Button>
          <a href="/api/auth/google" className="block">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              data-testid="button-google-register"
            >
              {t("auth.continueWithGoogle", "Continue with Google")}
            </Button>
          </a>
          {formError ? <p className="text-sm text-destructive">{formError}</p> : null}
          {registerMutation.error ? (
            <p className="text-sm text-destructive">
              {t("auth.registerFailed", "Could not create the account. Check that the email doesn't already exist.")}
            </p>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={() => setLocation("/login")}
            data-testid="button-go-login"
          >
            {t("auth.alreadyHaveAccount", "I already have an account")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
