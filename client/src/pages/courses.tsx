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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Plus, BookOpen, Clock, BarChart3, Loader2, Trash2, Edit, Eye, User, CheckCircle, Play } from "lucide-react";
import type { CourseWithInstructor, EnrollmentWithCourse } from "@shared/schema";

const statusLabels: Record<string, string> = {
  draft: "Borrador",
  published: "Publicado",
  archived: "Archivado",
};

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  published: "bg-chart-2/10 text-chart-2",
  archived: "bg-chart-3/10 text-chart-3",
};

const difficultyLabels: Record<string, string> = {
  beginner: "Principiante",
  intermediate: "Intermedio",
  advanced: "Avanzado",
};

const difficultyColors: Record<string, string> = {
  beginner: "bg-chart-2/10 text-chart-2",
  intermediate: "bg-chart-3/10 text-chart-3",
  advanced: "bg-chart-4/10 text-chart-4",
};

const categoryOptions = [
  "Emprendimiento Social",
  "Liderazgo",
  "Gestión de Proyectos",
  "Finanzas",
  "Marketing Social",
  "Impacto y Medición",
  "Innovación",
  "Tecnología",
  "Comunicación",
  "Otro",
];

const enrollmentStatusLabels: Record<string, string> = {
  enrolled: "Inscrito",
  in_progress: "En Progreso",
  completed: "Completado",
  dropped: "Abandonado",
};

export default function Courses() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<CourseWithInstructor | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [activeTab, setActiveTab] = useState("catalog");

  const userRole = user?.userRoles?.[0]?.role?.name || "usuario";

  const { data: courses, isLoading: coursesLoading } = useQuery<CourseWithInstructor[]>({
    queryKey: ["/api/courses"],
  });

  const { data: enrollments, isLoading: enrollmentsLoading } = useQuery<EnrollmentWithCourse[]>({
    queryKey: ["/api/enrollments"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: Partial<CourseWithInstructor>) => {
      return apiRequest("POST", "/api/courses", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/courses"] });
      setIsCreateDialogOpen(false);
      toast({ title: "Curso creado", description: "El curso ha sido creado exitosamente." });
    },
    onError: () => {
      toast({ title: "Error", description: "No se pudo crear el curso.", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CourseWithInstructor> }) => {
      return apiRequest("PATCH", `/api/courses/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/courses"] });
      setIsViewDialogOpen(false);
      setIsEditMode(false);
      toast({ title: "Curso actualizado", description: "Los cambios han sido guardados." });
    },
    onError: () => {
      toast({ title: "Error", description: "No se pudo actualizar el curso.", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/courses/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/courses"] });
      setIsViewDialogOpen(false);
      toast({ title: "Curso eliminado", description: "El curso ha sido eliminado." });
    },
    onError: () => {
      toast({ title: "Error", description: "No se pudo eliminar el curso.", variant: "destructive" });
    },
  });

  const enrollMutation = useMutation({
    mutationFn: async (courseId: string) => {
      return apiRequest("POST", `/api/courses/${courseId}/enroll`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/enrollments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/courses"] });
      toast({ title: "Inscripcion exitosa", description: "Te has inscrito al curso." });
    },
    onError: () => {
      toast({ title: "Error", description: "No se pudo inscribir al curso.", variant: "destructive" });
    },
  });

  const unenrollMutation = useMutation({
    mutationFn: async (courseId: string) => {
      return apiRequest("DELETE", `/api/courses/${courseId}/enroll`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/enrollments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/courses"] });
      toast({ title: "Desinscripcion exitosa", description: "Te has desinscrito del curso." });
    },
    onError: () => {
      toast({ title: "Error", description: "No se pudo desinscribir del curso.", variant: "destructive" });
    },
  });

  const updateProgressMutation = useMutation({
    mutationFn: async ({ enrollmentId, progress }: { enrollmentId: string; progress: string }) => {
      const status = parseInt(progress) >= 100 ? "completed" : "in_progress";
      const completedAt = parseInt(progress) >= 100 ? new Date().toISOString() : null;
      return apiRequest("PATCH", `/api/enrollments/${enrollmentId}`, { progress, status, completedAt });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/enrollments"] });
      toast({ title: "Progreso actualizado", description: "Tu progreso ha sido guardado." });
    },
    onError: () => {
      toast({ title: "Error", description: "No se pudo actualizar el progreso.", variant: "destructive" });
    },
  });

  const handleCreateSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      title: formData.get("title") as string,
      description: formData.get("description") as string,
      content: formData.get("content") as string,
      category: formData.get("category") as string,
      difficulty: formData.get("difficulty") as string,
      duration: formData.get("duration") as string,
      status: "draft" as const,
    };
    createMutation.mutate(data);
  };

  const handleUpdateSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedCourse) return;
    
    const formData = new FormData(e.currentTarget);
    const data = {
      title: formData.get("title") as string,
      description: formData.get("description") as string,
      content: formData.get("content") as string,
      category: formData.get("category") as string,
      difficulty: formData.get("difficulty") as string,
      duration: formData.get("duration") as string,
      status: formData.get("status") as CourseWithInstructor["status"],
    };
    updateMutation.mutate({ id: selectedCourse.id, data });
  };

  const isEnrolled = (courseId: string) => {
    return enrollments?.some(e => e.courseId === courseId);
  };

  const getEnrollment = (courseId: string) => {
    return enrollments?.find(e => e.courseId === courseId);
  };

  const isLoading = coursesLoading || enrollmentsLoading;

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
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Cursos</h1>
          <p className="text-muted-foreground">
            {userRole === "facilitador" 
              ? "Gestiona y crea cursos para la comunidad"
              : "Explora cursos para desarrollar tus habilidades"
            }
          </p>
        </div>
        
        {userRole === "facilitador" && (
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-course">
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Curso
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Crear Nuevo Curso</DialogTitle>
                <DialogDescription>
                  Crea un nuevo curso para emprendedores sociales.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Titulo del Curso</Label>
                  <Input 
                    id="title" 
                    name="title" 
                    placeholder="Ej: Introduccion al Emprendimiento Social"
                    required
                    data-testid="input-course-title"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Descripcion</Label>
                  <Textarea 
                    id="description" 
                    name="description" 
                    placeholder="Describe el curso..."
                    rows={3}
                    data-testid="input-course-description"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="content">Contenido del Curso</Label>
                  <Textarea 
                    id="content" 
                    name="content" 
                    placeholder="Detalla el contenido y modulos del curso..."
                    rows={4}
                    data-testid="input-course-content"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category">Categoria</Label>
                    <Select name="category">
                      <SelectTrigger data-testid="select-course-category">
                        <SelectValue placeholder="Selecciona una categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        {categoryOptions.map((cat) => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="difficulty">Dificultad</Label>
                    <Select name="difficulty">
                      <SelectTrigger data-testid="select-course-difficulty">
                        <SelectValue placeholder="Selecciona dificultad" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="beginner">Principiante</SelectItem>
                        <SelectItem value="intermediate">Intermedio</SelectItem>
                        <SelectItem value="advanced">Avanzado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="duration">Duracion</Label>
                  <Input 
                    id="duration" 
                    name="duration" 
                    placeholder="Ej: 4 semanas, 10 horas"
                    data-testid="input-course-duration"
                  />
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-course">
                    {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Crear Curso
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="catalog" data-testid="tab-catalog">Catalogo</TabsTrigger>
          <TabsTrigger value="my-courses" data-testid="tab-my-courses">Mis Cursos</TabsTrigger>
        </TabsList>

        <TabsContent value="catalog" className="mt-6">
          {courses && courses.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No hay cursos disponibles</h3>
                <p className="text-muted-foreground text-center mb-4">
                  {userRole === "facilitador" 
                    ? "Crea el primer curso para la comunidad."
                    : "Pronto habra cursos disponibles para ti."
                  }
                </p>
                {userRole === "facilitador" && (
                  <Button onClick={() => setIsCreateDialogOpen(true)} data-testid="button-create-first-course">
                    <Plus className="h-4 w-4 mr-2" />
                    Crear Curso
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {courses?.map((course) => (
                <Card key={course.id} className="flex flex-col" data-testid={`card-course-${course.id}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-lg line-clamp-2">{course.title}</CardTitle>
                      {userRole === "facilitador" && (
                        <Badge className={statusColors[course.status || "draft"]}>
                          {statusLabels[course.status || "draft"]}
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {course.category && (
                        <Badge variant="outline">{course.category}</Badge>
                      )}
                      {course.difficulty && (
                        <Badge className={difficultyColors[course.difficulty]}>
                          {difficultyLabels[course.difficulty] || course.difficulty}
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <CardDescription className="line-clamp-3 mb-4">
                      {course.description || "Sin descripcion"}
                    </CardDescription>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      {course.duration && (
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          <span>{course.duration}</span>
                        </div>
                      )}
                      {course.instructor && (
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          <span>
                            {course.instructor.firstName || course.instructor.email || "Instructor"}
                            {course.instructor.lastName ? ` ${course.instructor.lastName}` : ""}
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
                        setSelectedCourse(course);
                        setIsEditMode(false);
                        setIsViewDialogOpen(true);
                      }}
                      data-testid={`button-view-course-${course.id}`}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Ver
                    </Button>
                    {userRole === "facilitador" && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setSelectedCourse(course);
                          setIsEditMode(true);
                          setIsViewDialogOpen(true);
                        }}
                        data-testid={`button-edit-course-${course.id}`}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Editar
                      </Button>
                    )}
                    {userRole !== "facilitador" && course.status === "published" && (
                      isEnrolled(course.id) ? (
                        <Badge variant="secondary" className="bg-chart-2/10 text-chart-2">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Inscrito
                        </Badge>
                      ) : (
                        <Button 
                          size="sm"
                          onClick={() => enrollMutation.mutate(course.id)}
                          disabled={enrollMutation.isPending}
                          data-testid={`button-enroll-course-${course.id}`}
                        >
                          {enrollMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                          Inscribirse
                        </Button>
                      )
                    )}
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="my-courses" className="mt-6">
          {!enrollments || enrollments.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No estas inscrito en ningun curso</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Explora el catalogo y encuentra cursos para desarrollar tus habilidades.
                </p>
                <Button onClick={() => setActiveTab("catalog")} data-testid="button-explore-catalog">
                  <BookOpen className="h-4 w-4 mr-2" />
                  Explorar Catalogo
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {enrollments.map((enrollment) => (
                <Card key={enrollment.id} className="flex flex-col" data-testid={`card-enrollment-${enrollment.id}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-lg line-clamp-2">
                        {enrollment.course?.title || "Curso"}
                      </CardTitle>
                      <Badge className={
                        enrollment.status === "completed" 
                          ? "bg-chart-2/10 text-chart-2" 
                          : "bg-primary/10 text-primary"
                      }>
                        {enrollmentStatusLabels[enrollment.status || "enrolled"]}
                      </Badge>
                    </div>
                    {enrollment.course?.category && (
                      <Badge variant="outline" className="w-fit">{enrollment.course.category}</Badge>
                    )}
                  </CardHeader>
                  <CardContent className="flex-1">
                    <CardDescription className="line-clamp-2 mb-4">
                      {enrollment.course?.description || "Sin descripcion"}
                    </CardDescription>
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Progreso</span>
                          <span className="font-medium">{enrollment.progress || "0"}%</span>
                        </div>
                        <Progress value={parseInt(enrollment.progress || "0")} className="h-2" />
                      </div>
                      {enrollment.course?.duration && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span>{enrollment.course.duration}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter className="pt-0 gap-2 flex-wrap">
                    {enrollment.status !== "completed" && (
                      <Button 
                        size="sm"
                        onClick={() => {
                          const currentProgress = parseInt(enrollment.progress || "0");
                          const newProgress = Math.min(currentProgress + 25, 100).toString();
                          updateProgressMutation.mutate({ 
                            enrollmentId: enrollment.id, 
                            progress: newProgress 
                          });
                        }}
                        disabled={updateProgressMutation.isPending}
                        data-testid={`button-continue-course-${enrollment.id}`}
                      >
                        {updateProgressMutation.isPending ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <Play className="h-4 w-4 mr-1" />
                        )}
                        Continuar
                      </Button>
                    )}
                    <Button 
                      variant="outline"
                      size="sm"
                      onClick={() => unenrollMutation.mutate(enrollment.courseId)}
                      disabled={unenrollMutation.isPending}
                      data-testid={`button-unenroll-${enrollment.id}`}
                    >
                      {unenrollMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                      Desinscribirse
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditMode ? "Editar Curso" : "Detalles del Curso"}</DialogTitle>
          </DialogHeader>
          {selectedCourse && (
            isEditMode ? (
              <form onSubmit={handleUpdateSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-title">Titulo del Curso</Label>
                  <Input 
                    id="edit-title" 
                    name="title" 
                    defaultValue={selectedCourse.title}
                    required
                    data-testid="input-edit-course-title"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit-description">Descripcion</Label>
                  <Textarea 
                    id="edit-description" 
                    name="description" 
                    defaultValue={selectedCourse.description || ""}
                    rows={3}
                    data-testid="input-edit-course-description"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-content">Contenido del Curso</Label>
                  <Textarea 
                    id="edit-content" 
                    name="content" 
                    defaultValue={selectedCourse.content || ""}
                    rows={4}
                    data-testid="input-edit-course-content"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-category">Categoria</Label>
                    <Select name="category" defaultValue={selectedCourse.category || ""}>
                      <SelectTrigger data-testid="select-edit-course-category">
                        <SelectValue placeholder="Selecciona una categoria" />
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
                    <Select name="status" defaultValue={selectedCourse.status || "draft"}>
                      <SelectTrigger data-testid="select-edit-course-status">
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

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-difficulty">Dificultad</Label>
                    <Select name="difficulty" defaultValue={selectedCourse.difficulty || ""}>
                      <SelectTrigger data-testid="select-edit-course-difficulty">
                        <SelectValue placeholder="Selecciona dificultad" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="beginner">Principiante</SelectItem>
                        <SelectItem value="intermediate">Intermedio</SelectItem>
                        <SelectItem value="advanced">Avanzado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-duration">Duracion</Label>
                    <Input 
                      id="edit-duration" 
                      name="duration" 
                      defaultValue={selectedCourse.duration || ""}
                      data-testid="input-edit-course-duration"
                    />
                  </div>
                </div>

                <DialogFooter className="gap-2">
                  <Button 
                    type="button" 
                    variant="destructive"
                    onClick={() => deleteMutation.mutate(selectedCourse.id)}
                    disabled={deleteMutation.isPending}
                    data-testid="button-delete-course"
                  >
                    {deleteMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4 mr-2" />
                    )}
                    Eliminar
                  </Button>
                  <div className="flex-1" />
                  <Button type="button" variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={updateMutation.isPending} data-testid="button-save-course">
                    {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Guardar Cambios
                  </Button>
                </DialogFooter>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2 flex-wrap">
                  {userRole === "facilitador" && (
                    <Badge className={statusColors[selectedCourse.status || "draft"]}>
                      {statusLabels[selectedCourse.status || "draft"]}
                    </Badge>
                  )}
                  {selectedCourse.category && (
                    <Badge variant="outline">{selectedCourse.category}</Badge>
                  )}
                  {selectedCourse.difficulty && (
                    <Badge className={difficultyColors[selectedCourse.difficulty]}>
                      {difficultyLabels[selectedCourse.difficulty] || selectedCourse.difficulty}
                    </Badge>
                  )}
                </div>

                <div className="space-y-3">
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Descripcion</h4>
                    <p className="text-sm mt-1">{selectedCourse.description || "Sin descripcion"}</p>
                  </div>

                  {selectedCourse.content && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground">Contenido</h4>
                      <p className="text-sm mt-1 whitespace-pre-wrap">{selectedCourse.content}</p>
                    </div>
                  )}

                  {selectedCourse.duration && (
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>{selectedCourse.duration}</span>
                    </div>
                  )}

                  {selectedCourse.instructor && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground">Instructor</h4>
                      <p className="text-sm mt-1">
                        {selectedCourse.instructor.firstName || selectedCourse.instructor.email || "Instructor"}
                        {selectedCourse.instructor.lastName ? ` ${selectedCourse.instructor.lastName}` : ""}
                      </p>
                    </div>
                  )}
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                    Cerrar
                  </Button>
                  {userRole !== "facilitador" && selectedCourse.status === "published" && !isEnrolled(selectedCourse.id) && (
                    <Button 
                      onClick={() => {
                        enrollMutation.mutate(selectedCourse.id);
                        setIsViewDialogOpen(false);
                      }}
                      disabled={enrollMutation.isPending}
                      data-testid="button-enroll-dialog"
                    >
                      {enrollMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Inscribirse
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
