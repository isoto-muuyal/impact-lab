import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Target, MapPin, Users, Calendar, Loader2, Trash2, Edit, Eye, User } from "lucide-react";
import type { ProjectWithOwner } from "@shared/schema";

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

export default function Projects() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<ProjectWithOwner | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  const userRole = user?.userRoles?.[0]?.role?.name || "usuario";

  const { data: projects, isLoading } = useQuery<ProjectWithOwner[]>({
    queryKey: ["/api/projects"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: Partial<ProjectWithOwner>) => {
      return apiRequest("POST", "/api/projects", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      setIsCreateDialogOpen(false);
      toast({ title: "Proyecto creado", description: "Tu proyecto ha sido creado exitosamente." });
    },
    onError: () => {
      toast({ title: "Error", description: "No se pudo crear el proyecto.", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ProjectWithOwner> }) => {
      return apiRequest("PATCH", `/api/projects/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      setIsViewDialogOpen(false);
      setIsEditMode(false);
      toast({ title: "Proyecto actualizado", description: "Los cambios han sido guardados." });
    },
    onError: () => {
      toast({ title: "Error", description: "No se pudo actualizar el proyecto.", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/projects/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      setIsViewDialogOpen(false);
      toast({ title: "Proyecto eliminado", description: "El proyecto ha sido eliminado." });
    },
    onError: () => {
      toast({ title: "Error", description: "No se pudo eliminar el proyecto.", variant: "destructive" });
    },
  });

  const handleCreateSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      title: formData.get("title") as string,
      description: formData.get("description") as string,
      objectives: formData.get("objectives") as string,
      targetBeneficiaries: formData.get("targetBeneficiaries") as string,
      expectedImpact: formData.get("expectedImpact") as string,
      location: formData.get("location") as string,
      category: formData.get("category") as string,
      status: "draft" as const,
    };
    createMutation.mutate(data);
  };

  const handleUpdateSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedProject) return;
    
    const formData = new FormData(e.currentTarget);
    const data = {
      title: formData.get("title") as string,
      description: formData.get("description") as string,
      objectives: formData.get("objectives") as string,
      targetBeneficiaries: formData.get("targetBeneficiaries") as string,
      expectedImpact: formData.get("expectedImpact") as string,
      location: formData.get("location") as string,
      category: formData.get("category") as string,
      status: formData.get("status") as ProjectWithOwner["status"],
    };
    updateMutation.mutate({ id: selectedProject.id, data });
  };

  const canEditProject = (project: ProjectWithOwner) => {
    return project.ownerId === user?.id || userRole === "facilitador" || userRole === "mentor";
  };

  const canDeleteProject = (project: ProjectWithOwner) => {
    return project.ownerId === user?.id || userRole === "facilitador";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">
            {userRole === "usuario" ? "Mis Proyectos" : "Proyectos"}
          </h1>
          <p className="text-muted-foreground">
            {userRole === "usuario" 
              ? "Gestiona tus proyectos de impacto social"
              : "Supervisa y acompaña proyectos de impacto social"
            }
          </p>
        </div>
        
        {userRole === "usuario" && (
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-project">
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Proyecto
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Crear Nuevo Proyecto</DialogTitle>
                <DialogDescription>
                  Describe tu proyecto de impacto social para conectar con mentores y recursos.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Nombre del Proyecto</Label>
                  <Input 
                    id="title" 
                    name="title" 
                    placeholder="Ej: Educación Digital para Comunidades Rurales"
                    required
                    data-testid="input-project-title"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Descripción</Label>
                  <Textarea 
                    id="description" 
                    name="description" 
                    placeholder="Describe tu proyecto en detalle..."
                    rows={3}
                    data-testid="input-project-description"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="objectives">Objetivos</Label>
                  <Textarea 
                    id="objectives" 
                    name="objectives" 
                    placeholder="¿Qué objetivos busca alcanzar tu proyecto?"
                    rows={2}
                    data-testid="input-project-objectives"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
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
                    <Input 
                      id="location" 
                      name="location" 
                      placeholder="Ciudad, País"
                      data-testid="input-project-location"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="targetBeneficiaries">Beneficiarios Objetivo</Label>
                  <Input 
                    id="targetBeneficiaries" 
                    name="targetBeneficiaries" 
                    placeholder="¿A quiénes beneficia tu proyecto?"
                    data-testid="input-project-beneficiaries"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expectedImpact">Impacto Esperado</Label>
                  <Textarea 
                    id="expectedImpact" 
                    name="expectedImpact" 
                    placeholder="¿Qué cambio esperas generar?"
                    rows={2}
                    data-testid="input-project-impact"
                  />
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

      {projects && projects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Target className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No hay proyectos aún</h3>
            <p className="text-muted-foreground text-center mb-4">
              {userRole === "usuario" 
                ? "Crea tu primer proyecto de impacto social para comenzar."
                : "Los proyectos de los usuarios aparecerán aquí."
              }
            </p>
            {userRole === "usuario" && (
              <Button onClick={() => setIsCreateDialogOpen(true)} data-testid="button-create-first-project">
                <Plus className="h-4 w-4 mr-2" />
                Crear Proyecto
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects?.map((project) => (
            <Card key={project.id} className="flex flex-col" data-testid={`card-project-${project.id}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-lg line-clamp-2">{project.title}</CardTitle>
                  <Badge className={statusColors[project.status || "draft"]}>
                    {statusLabels[project.status || "draft"]}
                  </Badge>
                </div>
                {project.category && (
                  <Badge variant="outline" className="w-fit">{project.category}</Badge>
                )}
              </CardHeader>
              <CardContent className="flex-1">
                <CardDescription className="line-clamp-3 mb-4">
                  {project.description || "Sin descripción"}
                </CardDescription>
                <div className="space-y-2 text-sm text-muted-foreground">
                  {project.location && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      <span>{project.location}</span>
                    </div>
                  )}
                  {project.targetBeneficiaries && (
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <span className="truncate">{project.targetBeneficiaries}</span>
                    </div>
                  )}
                  {project.createdAt && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>Creado: {new Date(project.createdAt).toLocaleDateString("es-MX")}</span>
                    </div>
                  )}
                  {(userRole === "mentor" || userRole === "facilitador") && project.owner && (
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <span data-testid={`text-project-owner-${project.id}`}>
                        Propietario: {project.owner.firstName || project.owner.email || "Usuario"}
                        {project.owner.lastName ? ` ${project.owner.lastName}` : ""}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter className="pt-0 gap-2 flex-wrap">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setSelectedProject(project);
                    setIsEditMode(false);
                    setIsViewDialogOpen(true);
                  }}
                  data-testid={`button-view-project-${project.id}`}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  Ver
                </Button>
                {canEditProject(project) && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setSelectedProject(project);
                      setIsEditMode(true);
                      setIsViewDialogOpen(true);
                    }}
                    data-testid={`button-edit-project-${project.id}`}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Editar
                  </Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditMode ? "Editar Proyecto" : "Detalles del Proyecto"}</DialogTitle>
          </DialogHeader>
          {selectedProject && (
            isEditMode ? (
              <form onSubmit={handleUpdateSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-title">Nombre del Proyecto</Label>
                  <Input 
                    id="edit-title" 
                    name="title" 
                    defaultValue={selectedProject.title}
                    required
                    data-testid="input-edit-project-title"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit-description">Descripción</Label>
                  <Textarea 
                    id="edit-description" 
                    name="description" 
                    defaultValue={selectedProject.description || ""}
                    rows={3}
                    data-testid="input-edit-project-description"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-objectives">Objetivos</Label>
                  <Textarea 
                    id="edit-objectives" 
                    name="objectives" 
                    defaultValue={selectedProject.objectives || ""}
                    rows={2}
                    data-testid="input-edit-project-objectives"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
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
                  <Input 
                    id="edit-location" 
                    name="location" 
                    defaultValue={selectedProject.location || ""}
                    data-testid="input-edit-project-location"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-targetBeneficiaries">Beneficiarios Objetivo</Label>
                  <Input 
                    id="edit-targetBeneficiaries" 
                    name="targetBeneficiaries" 
                    defaultValue={selectedProject.targetBeneficiaries || ""}
                    data-testid="input-edit-project-beneficiaries"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-expectedImpact">Impacto Esperado</Label>
                  <Textarea 
                    id="edit-expectedImpact" 
                    name="expectedImpact" 
                    defaultValue={selectedProject.expectedImpact || ""}
                    rows={2}
                    data-testid="input-edit-project-impact"
                  />
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
                      {deleteMutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4 mr-2" />
                      )}
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
              <div className="space-y-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className={statusColors[selectedProject.status || "draft"]}>
                    {statusLabels[selectedProject.status || "draft"]}
                  </Badge>
                  {selectedProject.category && (
                    <Badge variant="outline">{selectedProject.category}</Badge>
                  )}
                </div>

                <div className="space-y-3">
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Descripción</h4>
                    <p className="text-sm mt-1">{selectedProject.description || "Sin descripción"}</p>
                  </div>

                  {selectedProject.objectives && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground">Objetivos</h4>
                      <p className="text-sm mt-1">{selectedProject.objectives}</p>
                    </div>
                  )}

                  {selectedProject.location && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{selectedProject.location}</span>
                    </div>
                  )}

                  {selectedProject.targetBeneficiaries && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground">Beneficiarios</h4>
                      <p className="text-sm mt-1">{selectedProject.targetBeneficiaries}</p>
                    </div>
                  )}

                  {selectedProject.expectedImpact && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground">Impacto Esperado</h4>
                      <p className="text-sm mt-1">{selectedProject.expectedImpact}</p>
                    </div>
                  )}

                  {(userRole === "mentor" || userRole === "facilitador") && selectedProject.owner && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground">Propietario del Proyecto</h4>
                      <p className="text-sm mt-1" data-testid="text-selected-project-owner">
                        {selectedProject.owner.firstName || selectedProject.owner.email || "Usuario"}
                        {selectedProject.owner.lastName ? ` ${selectedProject.owner.lastName}` : ""}
                        {selectedProject.owner.email && selectedProject.owner.firstName && (
                          <span className="text-muted-foreground"> ({selectedProject.owner.email})</span>
                        )}
                      </p>
                    </div>
                  )}
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                    Cerrar
                  </Button>
                  {canEditProject(selectedProject) && (
                    <Button onClick={() => setIsEditMode(true)} data-testid="button-switch-to-edit">
                      <Edit className="h-4 w-4 mr-2" />
                      Editar
                    </Button>
                  )}
                </DialogFooter>
              </div>
            )
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
