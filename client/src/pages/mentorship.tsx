import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Users, Plus, Calendar, Clock, CheckCircle, XCircle, Loader2, User } from "lucide-react";
import type { MentorshipWithDetails, User as UserType, ProjectWithOwner, MentorshipSession } from "@shared/schema";

const requestMentorshipSchema = z.object({
  mentorId: z.string().optional(),
  projectId: z.string().optional(),
  notes: z.string().min(10, "Por favor describe tu solicitud con al menos 10 caracteres"),
});

const createSessionSchema = z.object({
  scheduledAt: z.string().min(1, "Fecha requerida"),
  duration: z.string().min(1, "Duración requerida"),
  notes: z.string().optional(),
});

type RequestMentorshipForm = z.infer<typeof requestMentorshipSchema>;
type CreateSessionForm = z.infer<typeof createSessionSchema>;

const statusLabels: Record<string, string> = {
  pending: "Pendiente",
  active: "Activa",
  completed: "Completada",
  cancelled: "Cancelada",
};

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-600",
  active: "bg-green-500/10 text-green-600",
  completed: "bg-blue-500/10 text-blue-600",
  cancelled: "bg-red-500/10 text-red-600",
};

const sessionStatusLabels: Record<string, string> = {
  scheduled: "Programada",
  completed: "Completada",
  cancelled: "Cancelada",
};

export default function MentorshipPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [sessionDialogOpen, setSessionDialogOpen] = useState(false);
  const [selectedMentorship, setSelectedMentorship] = useState<MentorshipWithDetails | null>(null);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);

  const userRole = user?.userRoles?.[0]?.role?.name || "usuario";

  const { data: mentorships, isLoading } = useQuery<MentorshipWithDetails[]>({
    queryKey: ["/api/mentorships"],
  });

  const { data: mentors } = useQuery<UserType[]>({
    queryKey: ["/api/mentors"],
  });

  const { data: projects } = useQuery<ProjectWithOwner[]>({
    queryKey: ["/api/projects/my"],
  });

  const requestForm = useForm<RequestMentorshipForm>({
    resolver: zodResolver(requestMentorshipSchema),
    defaultValues: {
      mentorId: "",
      projectId: "",
      notes: "",
    },
  });

  const sessionForm = useForm<CreateSessionForm>({
    resolver: zodResolver(createSessionSchema),
    defaultValues: {
      scheduledAt: "",
      duration: "60",
      notes: "",
    },
  });

  const requestMutation = useMutation({
    mutationFn: async (data: RequestMentorshipForm) => {
      return apiRequest("POST", "/api/mentorships", {
        mentorId: data.mentorId || null,
        projectId: data.projectId || null,
        notes: data.notes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/mentorships"] });
      toast({ title: "Solicitud enviada", description: "Tu solicitud de mentoría ha sido enviada" });
      setRequestDialogOpen(false);
      requestForm.reset();
    },
    onError: () => {
      toast({ title: "Error", description: "No se pudo enviar la solicitud", variant: "destructive" });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return apiRequest("PATCH", `/api/mentorships/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/mentorships"] });
      toast({ title: "Estado actualizado" });
    },
    onError: () => {
      toast({ title: "Error", description: "No se pudo actualizar el estado", variant: "destructive" });
    },
  });

  const assignMentorMutation = useMutation({
    mutationFn: async ({ id, mentorId }: { id: string; mentorId: string }) => {
      return apiRequest("PATCH", `/api/mentorships/${id}`, { mentorId, status: "active" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/mentorships"] });
      toast({ title: "Mentor asignado" });
      setAssignDialogOpen(false);
    },
    onError: () => {
      toast({ title: "Error", description: "No se pudo asignar el mentor", variant: "destructive" });
    },
  });

  const createSessionMutation = useMutation({
    mutationFn: async (data: CreateSessionForm) => {
      if (!selectedMentorship) return;
      return apiRequest("POST", `/api/mentorships/${selectedMentorship.id}/sessions`, {
        scheduledAt: data.scheduledAt,
        duration: data.duration,
        notes: data.notes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/mentorships"] });
      toast({ title: "Sesión programada" });
      setSessionDialogOpen(false);
      sessionForm.reset();
    },
    onError: () => {
      toast({ title: "Error", description: "No se pudo crear la sesión", variant: "destructive" });
    },
  });

  const onRequestSubmit = (data: RequestMentorshipForm) => {
    requestMutation.mutate(data);
  };

  const onSessionSubmit = (data: CreateSessionForm) => {
    createSessionMutation.mutate(data);
  };

  const getInitials = (user?: UserType | null) => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    return "U";
  };

  const pendingMentorships = mentorships?.filter(m => m.status === "pending") || [];
  const activeMentorships = mentorships?.filter(m => m.status === "active") || [];
  const completedMentorships = mentorships?.filter(m => m.status === "completed" || m.status === "cancelled") || [];

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">
            {userRole === "mentor" ? "Mis Mentorías" : userRole === "facilitador" ? "Gestión de Mentorías" : "Mentoría"}
          </h1>
          <p className="text-muted-foreground">
            {userRole === "usuario" 
              ? "Solicita mentoría de expertos para tu proyecto" 
              : userRole === "mentor"
              ? "Gestiona tus mentorías y programa sesiones"
              : "Administra las mentorías y asigna mentores"}
          </p>
        </div>
        {userRole === "usuario" && (
          <Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-request-mentorship">
                <Plus className="h-4 w-4 mr-2" />
                Solicitar Mentoría
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Solicitar Mentoría</DialogTitle>
                <DialogDescription>Completa el formulario para solicitar una mentoría</DialogDescription>
              </DialogHeader>
              <Form {...requestForm}>
                <form onSubmit={requestForm.handleSubmit(onRequestSubmit)} className="space-y-4">
                  <FormField
                    control={requestForm.control}
                    name="projectId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Proyecto (opcional)</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-project">
                              <SelectValue placeholder="Selecciona un proyecto" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {projects?.map(p => (
                              <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={requestForm.control}
                    name="mentorId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mentor preferido (opcional)</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-mentor">
                              <SelectValue placeholder="Selecciona un mentor" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {mentors?.map(m => (
                              <SelectItem key={m.id} value={m.id}>
                                {m.firstName} {m.lastName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={requestForm.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Describe tu solicitud</FormLabel>
                        <FormControl>
                          <Textarea 
                            {...field} 
                            placeholder="Describe en qué necesitas ayuda..."
                            data-testid="input-notes"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button type="submit" disabled={requestMutation.isPending} data-testid="button-submit-request">
                      {requestMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Enviar Solicitud
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Tabs defaultValue="active" className="w-full">
        <TabsList>
          <TabsTrigger value="pending" data-testid="tab-pending">
            Pendientes ({pendingMentorships.length})
          </TabsTrigger>
          <TabsTrigger value="active" data-testid="tab-active">
            Activas ({activeMentorships.length})
          </TabsTrigger>
          <TabsTrigger value="completed" data-testid="tab-completed">
            Historial ({completedMentorships.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4">
          {pendingMentorships.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No hay solicitudes pendientes</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {pendingMentorships.map(m => (
                <MentorshipCard 
                  key={m.id} 
                  mentorship={m} 
                  userRole={userRole}
                  onAssign={() => { setSelectedMentorship(m); setAssignDialogOpen(true); }}
                  onUpdateStatus={(status) => updateStatusMutation.mutate({ id: m.id, status })}
                  getInitials={getInitials}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="active" className="mt-4">
          {activeMentorships.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No hay mentorías activas</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {activeMentorships.map(m => (
                <MentorshipCard 
                  key={m.id} 
                  mentorship={m} 
                  userRole={userRole}
                  onScheduleSession={() => { setSelectedMentorship(m); setSessionDialogOpen(true); }}
                  onUpdateStatus={(status) => updateStatusMutation.mutate({ id: m.id, status })}
                  getInitials={getInitials}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed" className="mt-4">
          {completedMentorships.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No hay historial de mentorías</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {completedMentorships.map(m => (
                <MentorshipCard 
                  key={m.id} 
                  mentorship={m} 
                  userRole={userRole}
                  getInitials={getInitials}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Asignar Mentor</DialogTitle>
            <DialogDescription>Selecciona un mentor para esta solicitud</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {mentors?.map(m => (
              <div 
                key={m.id} 
                className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover-elevate"
                onClick={() => {
                  if (selectedMentorship) {
                    assignMentorMutation.mutate({ id: selectedMentorship.id, mentorId: m.id });
                  }
                }}
                data-testid={`button-assign-mentor-${m.id}`}
              >
                <Avatar>
                  <AvatarImage src={m.profileImageUrl || undefined} />
                  <AvatarFallback>{getInitials(m)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{m.firstName} {m.lastName}</p>
                  <p className="text-sm text-muted-foreground">{m.email}</p>
                </div>
              </div>
            ))}
            {(!mentors || mentors.length === 0) && (
              <p className="text-muted-foreground text-center py-4">No hay mentores disponibles</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={sessionDialogOpen} onOpenChange={setSessionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Programar Sesión</DialogTitle>
            <DialogDescription>Programa una nueva sesión de mentoría</DialogDescription>
          </DialogHeader>
          <Form {...sessionForm}>
            <form onSubmit={sessionForm.handleSubmit(onSessionSubmit)} className="space-y-4">
              <FormField
                control={sessionForm.control}
                name="scheduledAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha y hora</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} data-testid="input-session-date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={sessionForm.control}
                name="duration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duración (minutos)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-duration">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="30">30 minutos</SelectItem>
                        <SelectItem value="60">1 hora</SelectItem>
                        <SelectItem value="90">1.5 horas</SelectItem>
                        <SelectItem value="120">2 horas</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={sessionForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notas (opcional)</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Temas a tratar..." data-testid="input-session-notes" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit" disabled={createSessionMutation.isPending} data-testid="button-create-session">
                  {createSessionMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Programar Sesión
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface MentorshipCardProps {
  mentorship: MentorshipWithDetails;
  userRole: string;
  onAssign?: () => void;
  onScheduleSession?: () => void;
  onUpdateStatus?: (status: string) => void;
  getInitials: (user?: UserType | null) => string;
}

function MentorshipCard({ mentorship, userRole, onAssign, onScheduleSession, onUpdateStatus, getInitials }: MentorshipCardProps) {
  const { data: sessions } = useQuery<MentorshipSession[]>({
    queryKey: ["/api/mentorships", mentorship.id, "sessions"],
    queryFn: async () => {
      const res = await fetch(`/api/mentorships/${mentorship.id}/sessions`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: mentorship.status === "active",
  });

  return (
    <Card data-testid={`card-mentorship-${mentorship.id}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-lg">{mentorship.project?.title || "Mentoría General"}</CardTitle>
          <Badge className={statusColors[mentorship.status || "pending"]}>
            {statusLabels[mentorship.status || "pending"]}
          </Badge>
        </div>
        <CardDescription className="line-clamp-2">{mentorship.notes}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">Mentee: </span>
          <Avatar className="h-6 w-6">
            <AvatarImage src={mentorship.mentee?.profileImageUrl || undefined} />
            <AvatarFallback className="text-xs">{getInitials(mentorship.mentee)}</AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium">
            {mentorship.mentee?.firstName} {mentorship.mentee?.lastName}
          </span>
        </div>
        {mentorship.mentor && (
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">Mentor: </span>
            <Avatar className="h-6 w-6">
              <AvatarImage src={mentorship.mentor?.profileImageUrl || undefined} />
              <AvatarFallback className="text-xs">{getInitials(mentorship.mentor)}</AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium">
              {mentorship.mentor?.firstName} {mentorship.mentor?.lastName}
            </span>
          </div>
        )}
        {sessions && sessions.length > 0 && (
          <div className="border-t pt-2 mt-2">
            <p className="text-xs text-muted-foreground mb-1">Próximas sesiones:</p>
            {sessions.slice(0, 2).map(s => (
              <div key={s.id} className="flex items-center gap-2 text-sm">
                <Calendar className="h-3 w-3" />
                <span>{new Date(s.scheduledAt).toLocaleDateString()}</span>
                <Clock className="h-3 w-3" />
                <span>{s.duration} min</span>
                <Badge variant="outline" className="text-xs">
                  {sessionStatusLabels[s.status || "scheduled"]}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
      <CardFooter className="gap-2 flex-wrap">
        {mentorship.status === "pending" && userRole === "facilitador" && onAssign && (
          <Button size="sm" onClick={onAssign} data-testid="button-assign">
            Asignar Mentor
          </Button>
        )}
        {mentorship.status === "active" && (userRole === "mentor" || userRole === "facilitador") && onScheduleSession && (
          <Button size="sm" onClick={onScheduleSession} data-testid="button-schedule">
            <Calendar className="h-4 w-4 mr-1" />
            Programar Sesión
          </Button>
        )}
        {mentorship.status === "active" && (userRole === "mentor" || userRole === "facilitador") && onUpdateStatus && (
          <Button size="sm" variant="outline" onClick={() => onUpdateStatus("completed")} data-testid="button-complete">
            <CheckCircle className="h-4 w-4 mr-1" />
            Completar
          </Button>
        )}
        {mentorship.status === "pending" && onUpdateStatus && (userRole === "mentor" || userRole === "facilitador") && (
          <Button size="sm" variant="ghost" onClick={() => onUpdateStatus("cancelled")} data-testid="button-cancel">
            <XCircle className="h-4 w-4 mr-1" />
            Cancelar
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
