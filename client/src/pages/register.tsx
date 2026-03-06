import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function Register() {
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const registerMutation = useMutation({
    mutationFn: async () => {
      if (password !== confirmPassword) {
        throw new Error("Las contraseñas no coinciden.");
      }

      await apiRequest("POST", "/api/register", {
        username,
        email,
        password,
        firstName: firstName || undefined,
        lastName: lastName || undefined,
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

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-muted/20">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Crear cuenta</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            value={username}
            onChange={(event) => {
              setFormError(null);
              setUsername(event.target.value);
            }}
            placeholder="Usuario"
            data-testid="input-register-username"
          />
          <Input
            type="email"
            value={email}
            onChange={(event) => {
              setFormError(null);
              setEmail(event.target.value);
            }}
            placeholder="Correo electrónico"
            data-testid="input-register-email"
          />
          <Input
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
            placeholder="Nombre (opcional)"
            data-testid="input-register-first-name"
          />
          <Input
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
            placeholder="Apellido (opcional)"
            data-testid="input-register-last-name"
          />
          <Input
            type="password"
            value={password}
            onChange={(event) => {
              setFormError(null);
              setPassword(event.target.value);
            }}
            placeholder="Contraseña"
            data-testid="input-register-password"
          />
          <Input
            type="password"
            value={confirmPassword}
            onChange={(event) => {
              setFormError(null);
              setConfirmPassword(event.target.value);
            }}
            placeholder="Confirmar contraseña"
            data-testid="input-register-confirm-password"
          />
          <Button
            className="w-full"
            disabled={registerMutation.isPending}
            onClick={() => {
              if (password !== confirmPassword) {
                setFormError("Las contraseñas no coinciden.");
                return;
              }
              setFormError(null);
              registerMutation.mutate();
            }}
            data-testid="button-submit-register"
          >
            Registrarme
          </Button>
          {formError ? <p className="text-sm text-destructive">{formError}</p> : null}
          {registerMutation.error ? (
            <p className="text-sm text-destructive">
              No se pudo crear la cuenta. Verifica que el usuario y correo no existan.
            </p>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={() => setLocation("/login")}
            data-testid="button-go-login"
          >
            Ya tengo cuenta
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
