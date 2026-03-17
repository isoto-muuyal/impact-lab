import { useDeferredValue, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/contexts/LanguageContext";
import { Calendar, Eye, Loader2, MapPin, Plus, Search, Trash2, User, UserPlus, Users } from "lucide-react";
import type { ProjectJoinRequestWithDetails, ProjectWithOwner, SocialProjectParticipantWithUser } from "@shared/schema";

const statusLabels: Record<string, string> = {
  draft: "Borrador",
  active: "Activo",
  completed: "Completado",
  paused: "Pausado",
  cancelled: "Cancelado",
};

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  active: "bg-chart-2/10 text-chart-2",
  completed: "bg-primary/10 text-primary",
  paused: "bg-chart-3/10 text-chart-3",
  cancelled: "bg-destructive/10 text-destructive",
};

const participantRoleLabels: Record<string, string> = {
  creator: "Creador",
  proponente: "Creador/Proponente",
  mentor: "Mentor",
  participant: "Participante",
};

const joinRequestRoleLabels: Record<string, string> = {
  mentor: "Mentor",
  participant: "Participante",
};

const categoryOptions = [
  "Educación",
  "Salud",
  "Medio Ambiente",
  "Desarrollo Comunitario",
  "Emprendimiento Social",
  "Derechos Humanos",
  "Inclusión",
  "Tecnología para el Bien",
  "Otro",
];

async function fetchProjects(search: string): Promise<ProjectWithOwner[]> {
  const url = search ? `/api/projects?search=${encodeURIComponent(search)}` : "/api/projects";
  const res = await fetch(url, { credentials: "include" });

  if (!res.ok) {
    throw new Error(`${res.status}: ${await res.text()}`);
  }

  return res.json();
}

async function fetchProject(projectId: string): Promise<ProjectWithOwner> {
  const res = await fetch(`/api/projects/${projectId}`, { credentials: "include" });

  if (!res.ok) {
    throw new Error(`${res.status}: ${await res.text()}`);
  }

  return res.json();
}

async function fetchJoinRequests(projectId: string): Promise<ProjectJoinRequestWithDetails[]> {
  const res = await fetch(`/api/projects/${projectId}/join-requests`, { credentials: "include" });

  if (!res.ok) {
    throw new Error(`${res.status}: ${await res.text()}`);
  }

  return res.json();
}

async function fetchMyJoinRequests(): Promise<ProjectJoinRequestWithDetails[]> {
  const res = await fetch("/api/project-join-requests/my", { credentials: "include" });

  if (!res.ok) {
    throw new Error(`${res.status}: ${await res.text()}`);
  }

  return res.json();
}

export default function Projects() {
  const { user, hasRole } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isJoinDialogOpen, setIsJoinDialogOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [joinRequestedRole, setJoinRequestedRole] = useState<"mentor" | "participant">("participant");
  const [joinHelpDescription, setJoinHelpDescription] = useState("");

  const deferredSearchQuery = useDeferredValue(searchQuery.trim());
  const userRole = user?.userRoles?.[0]?.role?.name || "usuario";
  const hasProponenteRole = hasRole("proponente");

  const showProponenteRoleWarning = () => {
    toast({
      title: t("common.accessDenied"),
      description: t("projects.proponentRoleRequired"),
      variant: "destructive",
    });
  };

  const projectsQuery = useQuery<ProjectWithOwner[]>({
    queryKey: ["/api/projects", deferredSearchQuery],
    queryFn: () => fetchProjects(deferredSearchQuery),
  });

  const selectedProjectQuery = useQuery<ProjectWithOwner>({
    queryKey: ["/api/projects", selectedProjectId],
    queryFn: () => fetchProject(selectedProjectId!),
    enabled: !!selectedProjectId,
  });

  const selectedProject = selectedProjectQuery.data
    ?? projectsQuery.data?.find((project) => project.id === selectedProjectId)
    ?? null;

  const joinRequestsQuery = useQuery<ProjectJoinRequestWithDetails[]>({
    queryKey: ["/api/projects", selectedProjectId, "join-requests"],
    queryFn: () => fetchJoinRequests(selectedProjectId!),
    enabled: !!selectedProjectId && !!selectedProject && selectedProject.ownerId === user?.id && isViewDialogOpen,
  });

  const myJoinRequestsQuery = useQuery<ProjectJoinRequestWithDetails[]>({
    queryKey: ["/api/project-join-requests/my"],
    queryFn: fetchMyJoinRequests,
  });

  const createMutation = useMutation({
    mutationFn: async (data: Partial<ProjectWithOwner>) => apiRequest("POST", "/api/projects", data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      setIsCreateDialogOpen(false);
      toast({ title: "Proyecto creado", description: "Tu proyecto ha sido creado exitosamente." });
    },
    onError: () => {
      toast({ title: "Error", description: "No se pudo crear el proyecto.", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ProjectWithOwner> }) =>
      apiRequest("PATCH", `/api/projects/${id}`, data),
    onSuccess: async (_, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/projects"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/projects", variables.id] }),
      ]);
      setIsEditMode(false);
      toast({ title: "Proyecto actualizado", description: "Los cambios han sido guardados." });
    },
    onError: () => {
      toast({ title: "Error", description: "No se pudo actualizar el proyecto.", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/projects/${id}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      setIsViewDialogOpen(false);
      setSelectedProjectId(null);
      toast({ title: "Proyecto eliminado", description: "El proyecto ha sido eliminado." });
    },
    onError: () => {
      toast({ title: "Error", description: "No se pudo eliminar el proyecto.", variant: "destructive" });
    },
  });

  const joinRequestMutation = useMutation({
    mutationFn: async ({ projectId, requestedRole, helpDescription }: { projectId: string; requestedRole: "mentor" | "participant"; helpDescription: string }) =>
      apiRequest("POST", `/api/projects/${projectId}/join-requests`, { requestedRole, helpDescription }),
    onSuccess: async (_, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/projects"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/projects", variables.projectId] }),
        queryClient.invalidateQueries({ queryKey: ["/api/project-join-requests/my"] }),
      ]);
      setIsJoinDialogOpen(false);
      setJoinRequestedRole("participant");
      setJoinHelpDescription("");
      toast({ title: "Solicitud enviada", description: "Tu solicitud para unirte al proyecto fue enviada." });
    },
    onError: async (error: Error) => {
      toast({
        title: "No se pudo enviar la solicitud",
        description: error.message || "Intenta nuevamente.",
        variant: "destructive",
      });
    },
  });

  const reviewJoinRequestMutation = useMutation({
    mutationFn: async ({ projectId, requestId, status, decisionReason }: { projectId: string; requestId: string; status: "accepted" | "rejected"; decisionReason: string }) =>
      apiRequest("PATCH", `/api/projects/${projectId}/join-requests/${requestId}`, { status, decisionReason }),
    onSuccess: async (_, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/projects"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/projects", variables.projectId] }),
        queryClient.invalidateQueries({ queryKey: ["/api/projects", variables.projectId, "join-requests"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/project-join-requests/my"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/notifications"] }),
      ]);
      toast({
        title: variables.status === "accepted" ? "Solicitud aceptada" : "Solicitud rechazada",
        description: variables.status === "accepted"
          ? "La persona fue agregada al proyecto."
          : "La solicitud fue rechazada.",
      });
    },
    onError: () => {
      toast({ title: "Error", description: "No se pudo actualizar la solicitud.", variant: "destructive" });
    },
  });

  const handleCreateSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!hasProponenteRole) {
      showProponenteRoleWarning();
      return;
    }

    const formData = new FormData(e.currentTarget);
    createMutation.mutate({
      title: formData.get("title") as string,
      description: formData.get("description") as string,
      objectives: formData.get("objectives") as string,
      targetBeneficiaries: formData.get("targetBeneficiaries") as string,
      expectedImpact: formData.get("expectedImpact") as string,
      location: formData.get("location") as string,
      category: formData.get("category") as string,
      status: "draft",
    });
  };

  const handleUpdateSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedProject) return;

    const formData = new FormData(e.currentTarget);
    updateMutation.mutate({
      id: selectedProject.id,
      data: {
        title: formData.get("title") as string,
        description: formData.get("description") as string,
        objectives: formData.get("objectives") as string,
        targetBeneficiaries: formData.get("targetBeneficiaries") as string,
        expectedImpact: formData.get("expectedImpact") as string,
        location: formData.get("location") as string,
        category: formData.get("category") as string,
        status: formData.get("status") as ProjectWithOwner["status"],
      },
    });
  };

  const handleJoinRequestSubmit = () => {
    if (!selectedProject) return;
    if (joinRequestedRole === "mentor" && !hasRole("mentor")) {
      toast({
        title: "Acceso denegado",
        description: "Necesitas el rol de mentor activado para solicitar ese rol.",
        variant: "destructive",
      });
      return;
    }
    joinRequestMutation.mutate({
      projectId: selectedProject.id,
      requestedRole: joinRequestedRole,
      helpDescription: joinHelpDescription.trim(),
    });
  };

  const projectStats = useMemo(() => {
    const projects = projectsQuery.data ?? [];
    return {
      mine: projects.filter((project) => project.ownerId === user?.id).length,
      participating: projects.filter((project) =>
        project.participants?.some((participant) => participant.userId === user?.id && participant.userId !== project.ownerId)
      ).length,
    };
  }, [projectsQuery.data, user?.id]);

  const canEditProject = (project: ProjectWithOwner) =>
    project.ownerId === user?.id || project.mentorId === user?.id || userRole === "facilitador";

  const canDeleteProject = (project: ProjectWithOwner) =>
    project.ownerId === user?.id || userRole === "facilitador";

  const openProjectDetails = (project: ProjectWithOwner, editMode = false) => {
    setSelectedProjectId(project.id);
    setIsEditMode(editMode);
    setIsViewDialogOpen(true);
  };

  const openJoinRequestDialog = (project: ProjectWithOwner) => {
    setSelectedProjectId(project.id);
    setJoinRequestedRole("participant");
    setJoinHelpDescription("");
    setIsJoinDialogOpen(true);
  };

  if (projectsQuery.isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const projects = projectsQuery.data ?? [];
  const myRequestsByProjectId = new Map((myJoinRequestsQuery.data ?? []).map((request) => [request.projectId, request]));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Proyectos</h1>
          <p className="text-muted-foreground">
            Busca proyectos, solicita unirte y gestiona tu equipo de trabajo.
          </p>
        </div>

        {userRole === "usuario" && (
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button
                data-testid="button-create-project"
                onClick={(event) => {
                  if (hasProponenteRole) return;
                  event.preventDefault();
                  showProponenteRoleWarning();
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Proyecto
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Crear Nuevo Proyecto</DialogTitle>
                <DialogDescription>
                  Describe tu proyecto de impacto social para conectar con mentores y participantes.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Nombre del Proyecto</Label>
                  <Input id="title" name="title" required data-testid="input-project-title" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descripción</Label>
                  <Textarea id="description" name="description" rows={3} data-testid="input-project-description" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="objectives">Objetivos</Label>
                  <Textarea id="objectives" name="objectives" rows={2} data-testid="input-project-objectives" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category">Categoría</Label>
                    <Select name="category">
                      <SelectTrigger data-testid="select-project-category">
                        <SelectValue placeholder="Selecciona una categoría" />
                      </SelectTrigger>
                      <SelectContent>
                        {categoryOptions.map((cat) => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="location">Ubicación</Label>
                    <Input id="location" name="location" data-testid="input-project-location" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="targetBeneficiaries">Beneficiarios Objetivo</Label>
                  <Input id="targetBeneficiaries" name="targetBeneficiaries" data-testid="input-project-beneficiaries" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expectedImpact">Impacto Esperado</Label>
                  <Textarea id="expectedImpact" name="expectedImpact" rows={2} data-testid="input-project-impact" />
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-project">
                    {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Crear Proyecto
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Resultados</p>
            <p className="text-3xl font-semibold">{projects.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Mis proyectos</p>
            <p className="text-3xl font-semibold">{projectStats.mine}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Participo en</p>
            <p className="text-3xl font-semibold">{projectStats.participating}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Buscar proyecto por nombre, categoría, ubicación o impacto"
              className="pl-9"
              data-testid="input-search-projects"
            />
          </div>
        </CardContent>
      </Card>

      {projects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No se encontraron proyectos</h3>
            <p className="text-muted-foreground text-center mb-4">
              Ajusta tu búsqueda o crea un nuevo proyecto para empezar.
            </p>
            {userRole === "usuario" && (
              <Button
                onClick={() => hasProponenteRole ? setIsCreateDialogOpen(true) : showProponenteRoleWarning()}
                data-testid="button-create-first-project"
              >
                <Plus className="h-4 w-4 mr-2" />
                Crear Proyecto
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => {
            const participants = project.participants ?? [];
            const myParticipation = participants.find((participant) => participant.userId === user?.id);
            const isOwner = project.ownerId === user?.id;
            const hasProjectAccess = isOwner || !!myParticipation || project.mentorId === user?.id || userRole === "facilitador";
            const myRequest = myRequestsByProjectId.get(project.id);

            return (
              <Card key={project.id} className="flex flex-col" data-testid={`card-project-${project.id}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-lg line-clamp-2">{project.title}</CardTitle>
                    <Badge className={statusColors[project.status || "draft"]}>
                      {statusLabels[project.status || "draft"]}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {project.category && <Badge variant="outline">{project.category}</Badge>}
                    {isOwner && <Badge variant="secondary">Tu proyecto</Badge>}
                    {myParticipation && !isOwner && (
                      <Badge variant="secondary">{participantRoleLabels[myParticipation.role]}</Badge>
                    )}
                    {myRequest && !hasProjectAccess && (
                      <Badge variant={myRequest.status === "pending" ? "outline" : "secondary"}>
                        {myRequest.status === "pending" ? "Solicitud pendiente" : myRequest.status === "accepted" ? "Solicitud aceptada" : "Solicitud rechazada"}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="flex-1 space-y-4">
                  <CardDescription className="line-clamp-3">
                    {project.description || "Sin descripción"}
                  </CardDescription>

                  <div className="space-y-2 text-sm text-muted-foreground">
                    {project.location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        <span>{project.location}</span>
                      </div>
                    )}
                    {project.createdAt && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>Creado: {new Date(project.createdAt).toLocaleDateString("es-MX")}</span>
                      </div>
                    )}
                    {project.owner && (
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span>
                          {project.owner.firstName || project.owner.email || "Usuario"}
                          {project.owner.lastName ? ` ${project.owner.lastName}` : ""}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Participantes</span>
                      <Badge variant="outline">{participants.length}</Badge>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {participants.slice(0, 3).map((participant) => (
                        <Badge key={participant.id} variant="secondary" className="font-normal">
                          {(participant.user?.firstName || participant.user?.email || "Usuario")}: {participantRoleLabels[participant.role]}
                        </Badge>
                      ))}
                      {participants.length > 3 && (
                        <Badge variant="outline">+{participants.length - 3} más</Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="pt-0 gap-2 flex-wrap">
                  {hasProjectAccess && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openProjectDetails(project)}
                      data-testid={`button-view-project-${project.id}`}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Ver
                    </Button>
                  )}
                  {!hasProjectAccess && !myRequest && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openJoinRequestDialog(project)}
                      data-testid={`button-request-join-${project.id}`}
                    >
                      <UserPlus className="h-4 w-4 mr-1" />
                      Solicitar unirme
                    </Button>
                  )}
                  {canEditProject(project) && (
                    <Button
                      size="sm"
                      onClick={() => openProjectDetails(project, true)}
                      data-testid={`button-edit-project-${project.id}`}
                    >
                      Editar
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog
        open={isJoinDialogOpen}
        onOpenChange={(open) => {
          setIsJoinDialogOpen(open);
          if (!open) {
            setJoinRequestedRole("participant");
            setJoinHelpDescription("");
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Solicitar unirme al proyecto</DialogTitle>
            <DialogDescription>
              Elige cómo quieres participar y explica cómo puedes ayudar.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Mi rol en el proyecto</Label>
              <Select value={joinRequestedRole} onValueChange={(value: "mentor" | "participant") => setJoinRequestedRole(value)}>
                <SelectTrigger data-testid="select-join-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="participant">Participante</SelectItem>
                  {hasRole("mentor") ? <SelectItem value="mentor">Mentor</SelectItem> : null}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="join-help-description">¿Cómo puedo ayudar?</Label>
              <Textarea
                id="join-help-description"
                value={joinHelpDescription}
                onChange={(event) => setJoinHelpDescription(event.target.value)}
                rows={5}
                placeholder="Describe tu experiencia, disponibilidad o aporte para este proyecto."
                data-testid="textarea-join-help-description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsJoinDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleJoinRequestSubmit}
              disabled={joinRequestMutation.isPending || joinHelpDescription.trim().length === 0 || !selectedProject}
              data-testid="button-submit-join-request"
            >
              {joinRequestMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Enviar solicitud
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isViewDialogOpen}
        onOpenChange={(open) => {
          setIsViewDialogOpen(open);
          if (!open) {
            setIsEditMode(false);
            setSelectedProjectId(null);
          }
        }}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedProjectQuery.isLoading && !selectedProject ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : selectedProject ? (
            <>
              <DialogHeader>
                <DialogTitle>{isEditMode ? "Editar Proyecto" : selectedProject.title}</DialogTitle>
                {!isEditMode && (
                  <DialogDescription>
                    Revisa los detalles, participantes y solicitudes de este proyecto.
                  </DialogDescription>
                )}
              </DialogHeader>

              {isEditMode ? (
                <form onSubmit={handleUpdateSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-title">Nombre del Proyecto</Label>
                    <Input id="edit-title" name="title" defaultValue={selectedProject.title} required data-testid="input-edit-project-title" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-description">Descripción</Label>
                    <Textarea id="edit-description" name="description" defaultValue={selectedProject.description || ""} rows={3} data-testid="input-edit-project-description" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-objectives">Objetivos</Label>
                    <Textarea id="edit-objectives" name="objectives" defaultValue={selectedProject.objectives || ""} rows={2} data-testid="input-edit-project-objectives" />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-category">Categoría</Label>
                      <Select name="category" defaultValue={selectedProject.category || ""}>
                        <SelectTrigger data-testid="select-edit-project-category">
                          <SelectValue placeholder="Selecciona una categoría" />
                        </SelectTrigger>
                        <SelectContent>
                          {categoryOptions.map((cat) => (
                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="edit-status">Estado</Label>
                      <Select name="status" defaultValue={selectedProject.status || "draft"}>
                        <SelectTrigger data-testid="select-edit-project-status">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(statusLabels).map(([value, label]) => (
                            <SelectItem key={value} value={value}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-location">Ubicación</Label>
                    <Input id="edit-location" name="location" defaultValue={selectedProject.location || ""} data-testid="input-edit-project-location" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-targetBeneficiaries">Beneficiarios Objetivo</Label>
                    <Input id="edit-targetBeneficiaries" name="targetBeneficiaries" defaultValue={selectedProject.targetBeneficiaries || ""} data-testid="input-edit-project-beneficiaries" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-expectedImpact">Impacto Esperado</Label>
                    <Textarea id="edit-expectedImpact" name="expectedImpact" defaultValue={selectedProject.expectedImpact || ""} rows={2} data-testid="input-edit-project-impact" />
                  </div>

                  <DialogFooter className="gap-2">
                    {canDeleteProject(selectedProject) && (
                      <Button
                        type="button"
                        variant="destructive"
                        onClick={() => deleteMutation.mutate(selectedProject.id)}
                        disabled={deleteMutation.isPending}
                        data-testid="button-delete-project"
                      >
                        {deleteMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
                        Eliminar
                      </Button>
                    )}
                    <div className="flex-1" />
                    <Button type="button" variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={updateMutation.isPending} data-testid="button-save-project">
                      {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Guardar Cambios
                    </Button>
                  </DialogFooter>
                </form>
              ) : (
                <ProjectDetailsView
                  project={selectedProject}
                  isOwner={selectedProject.ownerId === user?.id}
                  canEdit={canEditProject(selectedProject)}
                  joinRequests={joinRequestsQuery.data ?? []}
                  isLoadingRequests={joinRequestsQuery.isLoading}
                  onEdit={() => setIsEditMode(true)}
                  onClose={() => setIsViewDialogOpen(false)}
                  onReviewJoinRequest={(requestId, status, decisionReason) =>
                    reviewJoinRequestMutation.mutate({ projectId: selectedProject.id, requestId, status, decisionReason })
                  }
                  isReviewingJoinRequest={reviewJoinRequestMutation.isPending}
                />
              )}
            </>
          ) : (
            <div className="py-8 text-center text-muted-foreground">No se pudo cargar el proyecto.</div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ProjectDetailsView({
  project,
  isOwner,
  canEdit,
  joinRequests,
  isLoadingRequests,
  onEdit,
  onClose,
  onReviewJoinRequest,
  isReviewingJoinRequest,
}: {
  project: ProjectWithOwner;
  isOwner: boolean;
  canEdit: boolean;
  joinRequests: ProjectJoinRequestWithDetails[];
  isLoadingRequests: boolean;
  onEdit: () => void;
  onClose: () => void;
  onReviewJoinRequest: (requestId: string, status: "accepted" | "rejected", decisionReason: string) => void;
  isReviewingJoinRequest: boolean;
}) {
  const [decisionReasons, setDecisionReasons] = useState<Record<string, string>>({});
  const participants = project.participants ?? [];
  const pendingRequests = joinRequests.filter((request) => request.status === "pending");
  const handleDecision = (requestId: string, status: "accepted" | "rejected") => {
    const reason = decisionReasons[requestId]?.trim() || "";
    if (!reason) {
      return;
    }
    onReviewJoinRequest(requestId, status, reason);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 flex-wrap">
        <Badge className={statusColors[project.status || "draft"]}>
          {statusLabels[project.status || "draft"]}
        </Badge>
        {project.category && <Badge variant="outline">{project.category}</Badge>}
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          <TabsTrigger value="participants">Participantes</TabsTrigger>
          {isOwner ? <TabsTrigger value="requests">Solicitudes</TabsTrigger> : null}
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <div className="space-y-4">
            <DetailBlock label="Descripción" value={project.description || "Sin descripción"} />
            {project.objectives && <DetailBlock label="Objetivos" value={project.objectives} />}
            {project.targetBeneficiaries && <DetailBlock label="Beneficiarios" value={project.targetBeneficiaries} />}
            {project.expectedImpact && <DetailBlock label="Impacto Esperado" value={project.expectedImpact} />}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">Datos generales</h4>
              <div className="space-y-2 text-sm">
                {project.location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{project.location}</span>
                  </div>
                )}
                {project.owner && (
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {project.owner.firstName || project.owner.email || "Usuario"}
                      {project.owner.lastName ? ` ${project.owner.lastName}` : ""}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="participants" className="mt-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-muted-foreground">Participantes</h4>
              <Badge variant="outline">{participants.length}</Badge>
            </div>
            {participants.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay participantes registrados.</p>
            ) : (
              <div className="space-y-2">
                {participants.map((participant: SocialProjectParticipantWithUser) => (
                  <div key={participant.id} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium">
                          {participant.user?.firstName || participant.user?.email || "Usuario"}
                          {participant.user?.lastName ? ` ${participant.user.lastName}` : ""}
                        </p>
                        {participant.user?.email && participant.user?.firstName && (
                          <p className="text-xs text-muted-foreground">{participant.user.email}</p>
                        )}
                      </div>
                      <Badge variant="secondary">{participantRoleLabels[participant.role]}</Badge>
                    </div>
                    {participant.helpDescription && (
                      <p className="text-sm text-muted-foreground mt-2">{participant.helpDescription}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {isOwner ? (
          <TabsContent value="requests" className="mt-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-muted-foreground">Solicitudes para unirse</h4>
                <Badge variant="outline">{pendingRequests.length}</Badge>
              </div>
              {isLoadingRequests ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Cargando solicitudes...
                </div>
              ) : pendingRequests.length === 0 ? (
                <p className="text-sm text-muted-foreground">No hay solicitudes pendientes.</p>
              ) : (
                <div className="space-y-3">
                  {pendingRequests.map((request) => (
                    <div key={request.id} className="rounded-lg border p-3 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium">
                            {request.user?.firstName || request.user?.email || "Usuario"}
                            {request.user?.lastName ? ` ${request.user.lastName}` : ""}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Rol solicitado: {joinRequestRoleLabels[request.requestedRole]}
                          </p>
                        </div>
                        <Badge variant="outline">
                          {new Date(request.createdAt || Date.now()).toLocaleDateString("es-MX")}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{request.helpDescription}</p>
                      <div className="space-y-2">
                        <Label htmlFor={`decision-reason-${request.id}`}>Explica tu decisión</Label>
                        <Textarea
                          id={`decision-reason-${request.id}`}
                          value={decisionReasons[request.id] || ""}
                          onChange={(event) => setDecisionReasons((current) => ({ ...current, [request.id]: event.target.value }))}
                          rows={3}
                          placeholder="Explica por qué aceptas o rechazas esta solicitud."
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleDecision(request.id, "accepted")}
                          disabled={isReviewingJoinRequest || !(decisionReasons[request.id] || "").trim()}
                          data-testid={`button-accept-join-request-${request.id}`}
                        >
                          Aceptar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDecision(request.id, "rejected")}
                          disabled={isReviewingJoinRequest || !(decisionReasons[request.id] || "").trim()}
                          data-testid={`button-reject-join-request-${request.id}`}
                        >
                          Rechazar
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        ) : null}
      </Tabs>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Cerrar
        </Button>
        {canEdit && (
          <Button onClick={onEdit} data-testid="button-switch-to-edit">
            Editar
          </Button>
        )}
      </DialogFooter>
    </div>
  );
}

function DetailBlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <h4 className="text-sm font-medium text-muted-foreground">{label}</h4>
      <p className="text-sm mt-1 whitespace-pre-wrap">{value}</p>
    </div>
  );
}
