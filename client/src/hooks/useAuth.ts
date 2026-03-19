import { useQuery } from "@tanstack/react-query";
import type { UserWithProfile } from "@shared/schema";

export type RoleName = 'usuario' | 'mentor' | 'facilitador' | 'proponente' | 'acreditador';

async function fetchUser(): Promise<UserWithProfile | null> {
  const res = await fetch("/api/auth/user", {
    credentials: "include",
  });
  
  if (res.status === 401) {
    return null;
  }
  
  if (!res.ok) {
    throw new Error(`${res.status}: ${res.statusText}`);
  }
  
  return res.json();
}

export function useAuth() {
  const { data: user, isLoading, error } = useQuery<UserWithProfile | null>({
    queryKey: ["/api/auth/user"],
    queryFn: fetchUser,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const hasRole = (roleName: RoleName): boolean => {
    if (!user?.userRoles) return false;
    return user.userRoles.some((ur: any) => ur.role?.name === roleName && ur.status === "active");
  };

  const hasAnyRole = (roleNames: RoleName[]): boolean => {
    if (!user?.userRoles) return false;
    return roleNames.some(roleName => hasRole(roleName));
  };

  const getUserRoles = (): RoleName[] => {
    if (!user?.userRoles) return [];
    return user.userRoles
      .filter((ur: any) => ur.status === "active")
      .map((ur: any) => ur.role?.name as RoleName)
      .filter(Boolean);
  };

  return {
    user: user ?? null,
    isLoading,
    isAuthenticated: !!user,
    error,
    hasRole,
    hasAnyRole,
    getUserRoles,
  };
}
