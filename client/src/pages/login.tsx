import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function Login() {
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [username, setUsername] = useState("impactlab");
  const [password, setPassword] = useState("impactlab");

  const loginMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/login", { username, password });
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
          <CardTitle>Inicia sesión</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="Usuario"
            data-testid="input-username"
          />
          <Input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Contraseña"
            data-testid="input-password"
          />
          <Button
            className="w-full"
            disabled={loginMutation.isPending}
            onClick={() => loginMutation.mutate()}
            data-testid="button-submit-login"
          >
            Entrar
          </Button>
          {loginMutation.error ? (
            <p className="text-sm text-destructive">Credenciales inválidas.</p>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={() => setLocation("/register")}
            data-testid="button-go-register"
          >
            Crear cuenta
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
