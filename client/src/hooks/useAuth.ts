import { useQuery } from "@tanstack/react-query";
import type { UserWithProfile } from "@shared/schema";

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

  return {
    user: user ?? null,
    isLoading,
    isAuthenticated: !!user,
    error,
  };
}
