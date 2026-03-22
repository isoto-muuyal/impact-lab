import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { BookOpen, CheckCircle2, Edit, Loader2, Plus, Save, Trash2, UserRound, Video } from "lucide-react";
import type { CourseWithCreator, CourseWithDetails, EnrollmentWithCourse } from "@shared/schema";

const statusLabels: Record<string, string> = {
  draft: "Borrador",
  open: "Abierto",
  ongoing: "En curso",
  completed: "Completado",
  archived: "Archivado",
};

function getYoutubeEmbedUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");

    if ((host === "youtube.com" || host === "m.youtube.com") && parsed.pathname.startsWith("/embed/")) {
      return url;
    }

    if (host === "youtube.com" || host === "m.youtube.com") {
      const videoId = parsed.searchParams.get("v");
      return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
    }

    if (host === "youtu.be") {
      const videoId = parsed.pathname.replace("/", "");
      return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
    }
  } catch {
    return null;
  }

  return null;
}

function isDirectVideoUrl(url: string): boolean {
  try {
    const { pathname } = new URL(url, window.location.origin);
    return [".mp4", ".webm", ".ogg", ".mov", ".m4v"].some((extension) =>
      pathname.toLowerCase().endsWith(extension)
    );
  } catch {
    return false;
  }
}

function renderVideoContent(url: string, title: string) {
  const youtubeEmbedUrl = getYoutubeEmbedUrl(url);
  if (youtubeEmbedUrl) {
    return (
      <div className="overflow-hidden rounded-md border bg-black">
        <iframe
          src={youtubeEmbedUrl}
          title={title}
          className="aspect-video w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
    );
  }

  if (isDirectVideoUrl(url)) {
    return (
      <div className="overflow-hidden rounded-md border bg-black">
        <video controls className="aspect-video w-full">
          <source src={url} />
          Tu navegador no pudo reproducir este video.
        </video>
      </div>
    );
  }

  return (
    <div className="rounded-md bg-muted p-3 text-sm break-all">
      <span className="font-medium">Video URL:</span>{" "}
      <a href={url} target="_blank" rel="noreferrer" className="text-primary underline">
        Abrir video
      </a>
    </div>
  );
}

export default function Courses() {
  const { user, hasRole } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("catalog");
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [detailMode, setDetailMode] = useState<"view" | "manage">("view");
  const [editStatus, setEditStatus] = useState("draft");
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [newChapter, setNewChapter] = useState({ title: "", description: "" });
  const [newVideos, setNewVideos] = useState<Record<string, { title: string; description: string; videoUrl: string }>>({});

  const canCreateCourse = hasRole("mentor") || hasRole("facilitador");

  const { data: courses, isLoading: coursesLoading } = useQuery<CourseWithCreator[]>({
    queryKey: ["/api/courses"],
  });

  const { data: enrollments, isLoading: enrollmentsLoading } = useQuery<EnrollmentWithCourse[]>({
    queryKey: ["/api/enrollments"],
  });

  const { data: selectedCourse, isLoading: selectedCourseLoading } = useQuery<CourseWithDetails>({
    queryKey: ["/api/courses", selectedCourseId ?? ""],
    enabled: !!selectedCourseId,
  });

  useEffect(() => {
    if (!selectedCourse) return;

    setEditStatus(selectedCourse.status || "draft");
    const drafts: Record<string, string> = {};
    selectedCourse.chapters.forEach((chapter) => {
      chapter.videos.forEach((video) => {
        drafts[video.id] = video.note?.content || "";
      });
    });
    setNoteDrafts(drafts);
  }, [selectedCourse]);

  const invalidateCourseData = async (courseId?: string) => {
    await queryClient.invalidateQueries({ queryKey: ["/api/courses"] });
    await queryClient.invalidateQueries({ queryKey: ["/api/enrollments"] });
    if (courseId) {
      await queryClient.invalidateQueries({ queryKey: ["/api/courses", courseId] });
    }
  };

  const createCourseMutation = useMutation({
    mutationFn: async (payload: { title: string; description: string }) => {
      const res = await apiRequest("POST", "/api/courses", payload);
      return res.json();
    },
    onSuccess: async (course: CourseWithCreator) => {
      await invalidateCourseData(course.id);
      setIsCreateDialogOpen(false);
      setSelectedCourseId(course.id);
      setDetailMode("manage");
      toast({ title: "Curso creado", description: "Ahora puedes agregar capítulos y videos." });
    },
    onError: () => {
      toast({ title: "Error", description: "No se pudo crear el curso.", variant: "destructive" });
    },
  });

  const updateCourseMutation = useMutation({
    mutationFn: async ({ courseId, payload }: { courseId: string; payload: Record<string, unknown> }) => {
      const res = await apiRequest("PATCH", `/api/courses/${courseId}`, payload);
      return res.json();
    },
    onSuccess: async (_, variables) => {
      await invalidateCourseData(variables.courseId);
      toast({ title: "Curso actualizado", description: "Los cambios fueron guardados." });
    },
    onError: () => {
      toast({ title: "Error", description: "No se pudo actualizar el curso.", variant: "destructive" });
    },
  });

  const deleteCourseMutation = useMutation({
    mutationFn: async (courseId: string) => {
      await apiRequest("DELETE", `/api/courses/${courseId}`);
    },
    onSuccess: async () => {
      await invalidateCourseData(selectedCourseId || undefined);
      setSelectedCourseId(null);
      toast({ title: "Curso eliminado", description: "El curso fue eliminado." });
    },
    onError: () => {
      toast({ title: "Error", description: "No se pudo eliminar el curso.", variant: "destructive" });
    },
  });

  const enrollMutation = useMutation({
    mutationFn: async (courseId: string) => {
      const res = await apiRequest("POST", `/api/courses/${courseId}/enroll`);
      return res.json();
    },
    onSuccess: async (_, courseId) => {
      await invalidateCourseData(courseId);
      setSelectedCourseId(courseId);
      toast({ title: "Inscripción lista", description: "Ya puedes avanzar en el temario." });
    },
    onError: () => {
      toast({ title: "Error", description: "No se pudo completar la inscripción.", variant: "destructive" });
    },
  });

  const unenrollMutation = useMutation({
    mutationFn: async (courseId: string) => {
      await apiRequest("DELETE", `/api/courses/${courseId}/enroll`);
    },
    onSuccess: async (_, courseId) => {
      await invalidateCourseData(courseId);
      toast({ title: "Inscripción cancelada", description: "Ya no verás este curso en tu progreso." });
    },
    onError: () => {
      toast({ title: "Error", description: "No se pudo cancelar la inscripción.", variant: "destructive" });
    },
  });

  const createChapterMutation = useMutation({
    mutationFn: async ({ courseId, payload }: { courseId: string; payload: { title: string; description: string; order: number } }) => {
      const res = await apiRequest("POST", `/api/courses/${courseId}/chapters`, payload);
      return res.json();
    },
    onSuccess: async (_, variables) => {
      await invalidateCourseData(variables.courseId);
      setNewChapter({ title: "", description: "" });
      toast({ title: "Capítulo agregado", description: "Ahora puedes agregar videos." });
    },
    onError: () => {
      toast({ title: "Error", description: "No se pudo crear el capítulo.", variant: "destructive" });
    },
  });

  const updateChapterMutation = useMutation({
    mutationFn: async ({ chapterId, courseId, payload }: { chapterId: string; courseId: string; payload: Record<string, unknown> }) => {
      const res = await apiRequest("PATCH", `/api/course-chapters/${chapterId}`, { courseId, ...payload });
      return res.json();
    },
    onSuccess: async (_, variables) => {
      await invalidateCourseData(variables.courseId);
    },
  });

  const deleteChapterMutation = useMutation({
    mutationFn: async ({ chapterId, courseId }: { chapterId: string; courseId: string }) => {
      await apiRequest("DELETE", `/api/course-chapters/${chapterId}?courseId=${courseId}`);
    },
    onSuccess: async (_, variables) => {
      await invalidateCourseData(variables.courseId);
      toast({ title: "Capítulo eliminado" });
    },
  });

  const createVideoMutation = useMutation({
    mutationFn: async ({
      chapterId,
      courseId,
      payload,
    }: {
      chapterId: string;
      courseId: string;
      payload: { title: string; description: string; videoUrl: string; order: number };
    }) => {
      const res = await apiRequest("POST", `/api/course-chapters/${chapterId}/videos`, { courseId, ...payload });
      return res.json();
    },
    onSuccess: async (_, variables) => {
      await invalidateCourseData(variables.courseId);
      setNewVideos((current) => ({ ...current, [variables.chapterId]: { title: "", description: "", videoUrl: "" } }));
      toast({ title: "Video agregado" });
    },
    onError: () => {
      toast({ title: "Error", description: "No se pudo agregar el video.", variant: "destructive" });
    },
  });

  const updateVideoMutation = useMutation({
    mutationFn: async ({ videoId, courseId, payload }: { videoId: string; courseId: string; payload: Record<string, unknown> }) => {
      const res = await apiRequest("PATCH", `/api/course-videos/${videoId}`, { courseId, ...payload });
      return res.json();
    },
    onSuccess: async (_, variables) => {
      await invalidateCourseData(variables.courseId);
    },
  });

  const deleteVideoMutation = useMutation({
    mutationFn: async ({ videoId, courseId }: { videoId: string; courseId: string }) => {
      await apiRequest("DELETE", `/api/course-videos/${videoId}?courseId=${courseId}`);
    },
    onSuccess: async (_, variables) => {
      await invalidateCourseData(variables.courseId);
      toast({ title: "Video eliminado" });
    },
  });

  const saveNoteMutation = useMutation({
    mutationFn: async ({ videoId, courseId, content }: { videoId: string; courseId: string; content: string }) => {
      const res = await apiRequest("PUT", `/api/course-videos/${videoId}/note`, { courseId, content });
      return res.json();
    },
    onSuccess: async (_, variables) => {
      await invalidateCourseData(variables.courseId);
      toast({ title: "Notas guardadas" });
    },
    onError: () => {
      toast({ title: "Error", description: "No se pudieron guardar las notas.", variant: "destructive" });
    },
  });

  const updateVideoProgressMutation = useMutation({
    mutationFn: async ({
      videoId,
      courseId,
      completed,
    }: {
      videoId: string;
      courseId: string;
      completed: boolean;
    }) => {
      const res = await apiRequest("PUT", `/api/course-videos/${videoId}/progress`, {
        courseId,
        completed,
        watchedSeconds: completed ? 1 : 0,
      });
      return res.json();
    },
    onSuccess: async (_, variables) => {
      await invalidateCourseData(variables.courseId);
    },
    onError: () => {
      toast({ title: "Error", description: "No se pudo actualizar el progreso.", variant: "destructive" });
    },
  });

  const isEnrolled = (courseId: string) => enrollments?.some((enrollment) => enrollment.courseId === courseId);

  const filteredCourses = (courses || []).filter((course) => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    if (!normalizedSearch) return true;

    const creatorName = [course.createdBy?.firstName, course.createdBy?.lastName]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    const creatorEmail = course.createdBy?.email?.toLowerCase() || "";

    return (
      course.title.toLowerCase().includes(normalizedSearch) ||
      (course.description || "").toLowerCase().includes(normalizedSearch) ||
      creatorName.includes(normalizedSearch) ||
      creatorEmail.includes(normalizedSearch)
    );
  });

  const managedCourses = courses?.filter((course) => course.createdByUserId === user?.id || hasRole("facilitador")) || [];

  const renderCourseCard = (course: CourseWithCreator) => {
    const enrolled = isEnrolled(course.id);
    const canManage = course.createdByUserId === user?.id || hasRole("facilitador");
    const creatorName = [course.createdBy?.firstName, course.createdBy?.lastName].filter(Boolean).join(" ") || course.createdBy?.email || "Autor";

    return (
      <Card key={course.id} className="flex flex-col">
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2">
              <CardTitle>{course.title}</CardTitle>
              <CardDescription>{course.description || "Sin descripción."}</CardDescription>
            </div>
            <Badge variant={course.status === "draft" ? "outline" : "secondary"}>
              {statusLabels[course.status || "draft"] || course.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="flex-1 space-y-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <UserRound className="h-4 w-4" />
            <span>{creatorName}</span>
          </div>
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            <span>{course.durationHours ? `${course.durationHours} horas estimadas` : "Duración flexible"}</span>
          </div>
        </CardContent>
        <CardFooter className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            onClick={() => {
              setSelectedCourseId(course.id);
              setDetailMode("view");
            }}
          >
            Ver temario
          </Button>
          {canManage && (
            <Button
              variant="secondary"
              onClick={() => {
                setSelectedCourseId(course.id);
                setDetailMode("manage");
              }}
            >
              <Edit className="mr-2 h-4 w-4" />
              Editar
            </Button>
          )}
          {!canManage && (course.status === "open" || course.status === "ongoing") && !enrolled && (
            <Button onClick={() => enrollMutation.mutate(course.id)} disabled={enrollMutation.isPending}>
              <Plus className="mr-2 h-4 w-4" />
              Agregar
            </Button>
          )}
          {!canManage && enrolled && (
            <Badge className="bg-sky-100 text-sky-700 hover:bg-sky-100">
              <CheckCircle2 className="mr-1 h-3 w-3" />
              Inscrito
            </Badge>
          )}
        </CardFooter>
      </Card>
    );
  };

  const handleCreateCourse = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    createCourseMutation.mutate({
      title: String(formData.get("title") || "").trim(),
      description: String(formData.get("description") || "").trim(),
    });
  };

  const handleUpdateCourse = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedCourseId) return;
    const formData = new FormData(event.currentTarget);
    updateCourseMutation.mutate({
      courseId: selectedCourseId,
      payload: {
        title: String(formData.get("title") || "").trim(),
        description: String(formData.get("description") || "").trim(),
        status: editStatus,
        durationHours: Number(formData.get("durationHours") || 0) || null,
      },
    });
  };

  const handleCreateChapter = () => {
    if (!selectedCourse || !newChapter.title.trim()) return;
    createChapterMutation.mutate({
      courseId: selectedCourse.id,
      payload: {
        title: newChapter.title.trim(),
        description: newChapter.description.trim(),
        order: selectedCourse.chapters.length + 1,
      },
    });
  };

  const handleCreateVideo = (chapterId: string, order: number) => {
    if (!selectedCourse) return;
    const draft = newVideos[chapterId];
    if (!draft?.title.trim() || !draft.videoUrl.trim()) return;

    createVideoMutation.mutate({
      chapterId,
      courseId: selectedCourse.id,
      payload: {
        title: draft.title.trim(),
        description: draft.description.trim(),
        videoUrl: draft.videoUrl.trim(),
        order,
      },
    });
  };

  const isLoading = coursesLoading || enrollmentsLoading;

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Cursos</h1>
          <p className="text-muted-foreground">
            {canCreateCourse
              ? "Crea cursos breves y después completa su temario con capítulos y videos."
              : "Inscríbete, toma notas por video y sigue tu progreso en el temario."}
          </p>
        </div>

        {canCreateCourse && (
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nuevo curso
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Crear curso</DialogTitle>
                <DialogDescription>Empieza con título y descripción. Después podrás agregar capítulos y videos.</DialogDescription>
              </DialogHeader>
              <form className="space-y-4" onSubmit={handleCreateCourse}>
                <div className="space-y-2">
                  <Label htmlFor="course-title">Título</Label>
                  <Input id="course-title" name="title" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="course-description">Descripción</Label>
                  <Textarea id="course-description" name="description" rows={4} />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={createCourseMutation.isPending}>
                    {createCourseMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Crear
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="catalog">Catálogo</TabsTrigger>
          <TabsTrigger value="learning">Mi progreso</TabsTrigger>
          {canCreateCourse && <TabsTrigger value="manage">Mis cursos</TabsTrigger>}
        </TabsList>

        <TabsContent value="catalog" className="mt-6">
          <form
            className="mb-4 flex flex-wrap gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              setSearchTerm(searchInput);
            }}
          >
            <Input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Buscar por curso o mentor"
              className="max-w-md"
            />
            <Button type="submit" variant="outline">
              Buscar
            </Button>
          </form>

          {!courses?.length ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No hay cursos disponibles todavía.
                <br />
                Solo ven cursos los usuarios cuando el curso está en estado `Abierto`, `En curso` o `Completado`.
              </CardContent>
            </Card>
          ) : !filteredCourses.length ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No se encontraron cursos con ese nombre o mentor.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{filteredCourses.map(renderCourseCard)}</div>
          )}
        </TabsContent>

        <TabsContent value="learning" className="mt-6">
          {!enrollments?.length ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">Todavía no estás inscrito en ningún curso.</CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {enrollments.map((enrollment) => (
                <Card key={enrollment.id}>
                  <CardHeader>
                    <CardTitle>{enrollment.course?.title || "Curso"}</CardTitle>
                    <CardDescription>{enrollment.course?.description || "Sin descripción."}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Progreso</span>
                        <span>{enrollment.progressPercent || 0}%</span>
                      </div>
                      <Progress value={enrollment.progressPercent || 0} />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {enrollment.completedModulesCount || 0} de {enrollment.totalModulesCount || 0} videos completados
                    </p>
                  </CardContent>
                  <CardFooter className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedCourseId(enrollment.courseId);
                        setDetailMode("view");
                      }}
                    >
                      Ver temario
                    </Button>
                    <Button variant="ghost" onClick={() => unenrollMutation.mutate(enrollment.courseId)} disabled={unenrollMutation.isPending}>
                      Salirme
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {canCreateCourse && (
          <TabsContent value="manage" className="mt-6">
            {!managedCourses.length ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">Aún no has creado cursos.</CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{managedCourses.map(renderCourseCard)}</div>
            )}
          </TabsContent>
        )}
      </Tabs>

      <Dialog open={!!selectedCourseId} onOpenChange={(open) => !open && setSelectedCourseId(null)}>
        <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
          {selectedCourseLoading || !selectedCourse ? (
            <div className="flex min-h-[240px] items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>{selectedCourse.title}</DialogTitle>
                <DialogDescription>{selectedCourse.description || "Sin descripción."}</DialogDescription>
              </DialogHeader>

              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{statusLabels[selectedCourse.status || "draft"] || selectedCourse.status}</Badge>
                <Badge variant="outline">{selectedCourse.completedVideos} / {selectedCourse.totalVideos} videos completos</Badge>
                <Badge variant="outline">{selectedCourse.progressPercent}% de avance</Badge>
              </div>

              {detailMode === "manage" && selectedCourse.canEdit ? (
                <div className="space-y-6">
                  <form className="grid gap-4 rounded-lg border p-4" onSubmit={handleUpdateCourse}>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="edit-title">Título</Label>
                        <Input id="edit-title" name="title" defaultValue={selectedCourse.title} required />
                      </div>
                      <div className="space-y-2">
                        <Label>Estado</Label>
                        <Select value={editStatus} onValueChange={setEditStatus}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(statusLabels).map(([value, label]) => (
                              <SelectItem key={value} value={value}>
                                {label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-description">Descripción</Label>
                      <Textarea id="edit-description" name="description" rows={4} defaultValue={selectedCourse.description || ""} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-duration-hours">Horas estimadas</Label>
                      <Input id="edit-duration-hours" name="durationHours" type="number" min="0" defaultValue={selectedCourse.durationHours || ""} />
                    </div>
                    <div className="flex flex-wrap justify-between gap-2">
                      <Button
                        type="button"
                        variant="destructive"
                        onClick={() => deleteCourseMutation.mutate(selectedCourse.id)}
                        disabled={deleteCourseMutation.isPending}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Eliminar curso
                      </Button>
                      <Button type="submit" disabled={updateCourseMutation.isPending}>
                        <Save className="mr-2 h-4 w-4" />
                        Guardar datos del curso
                      </Button>
                    </div>
                  </form>

                  <Card>
                    <CardHeader>
                      <CardTitle>Agregar capítulo</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <Input
                        placeholder="Título del capítulo"
                        value={newChapter.title}
                        onChange={(event) => setNewChapter((current) => ({ ...current, title: event.target.value }))}
                      />
                      <Textarea
                        placeholder="Descripción del capítulo"
                        rows={3}
                        value={newChapter.description}
                        onChange={(event) => setNewChapter((current) => ({ ...current, description: event.target.value }))}
                      />
                      <div className="flex justify-end">
                        <Button onClick={handleCreateChapter} disabled={createChapterMutation.isPending || !newChapter.title.trim()}>
                          <Plus className="mr-2 h-4 w-4" />
                          Agregar capítulo
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  <Accordion type="multiple" className="w-full">
                    {selectedCourse.chapters.map((chapter, chapterIndex) => (
                      <AccordionItem key={chapter.id} value={chapter.id}>
                        <AccordionTrigger>{chapter.order}. {chapter.title}</AccordionTrigger>
                        <AccordionContent className="space-y-4">
                          <div className="grid gap-3 rounded-lg border p-4 md:grid-cols-2">
                            <Input
                                  defaultValue={chapter.title}
                                  onBlur={(event) =>
                                    updateChapterMutation.mutate({
                                      chapterId: chapter.id,
                                      courseId: selectedCourse.id,
                                      payload: { title: event.target.value },
                                    })
                                  }
                                />
                            <div className="flex justify-end">
                              <Button
                                variant="ghost"
                                onClick={() => deleteChapterMutation.mutate({ chapterId: chapter.id, courseId: selectedCourse.id })}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Eliminar capítulo
                              </Button>
                            </div>
                            <Textarea
                              className="md:col-span-2"
                              defaultValue={chapter.description || ""}
                              rows={3}
                              onBlur={(event) =>
                                updateChapterMutation.mutate({
                                  chapterId: chapter.id,
                                  courseId: selectedCourse.id,
                                  payload: { description: event.target.value },
                                })
                              }
                            />
                          </div>

                          <div className="space-y-3">
                            {chapter.videos.map((video, videoIndex) => (
                              <Card key={video.id}>
                                <CardContent className="grid gap-3 p-4">
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 text-sm font-medium">
                                      <Video className="h-4 w-4" />
                                      Video {videoIndex + 1}
                                    </div>
                                    <Button
                                      variant="ghost"
                                      onClick={() => deleteVideoMutation.mutate({ videoId: video.id, courseId: selectedCourse.id })}
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Eliminar
                                    </Button>
                                  </div>
                                  <Input
                                    defaultValue={video.title}
                                    onBlur={(event) =>
                                      updateVideoMutation.mutate({
                                        videoId: video.id,
                                        courseId: selectedCourse.id,
                                        payload: { title: event.target.value },
                                      })
                                    }
                                  />
                                  <Textarea
                                    defaultValue={video.description || ""}
                                    rows={2}
                                    onBlur={(event) =>
                                      updateVideoMutation.mutate({
                                        videoId: video.id,
                                        courseId: selectedCourse.id,
                                        payload: { description: event.target.value },
                                      })
                                    }
                                  />
                                  <Input
                                    defaultValue={video.videoUrl}
                                    onBlur={(event) =>
                                      updateVideoMutation.mutate({
                                        videoId: video.id,
                                        courseId: selectedCourse.id,
                                        payload: { videoUrl: event.target.value },
                                      })
                                    }
                                  />
                                </CardContent>
                              </Card>
                            ))}
                          </div>

                          <Card>
                            <CardHeader>
                              <CardTitle className="text-base">Agregar video</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                              <Input
                                placeholder="Título del video"
                                value={newVideos[chapter.id]?.title || ""}
                                onChange={(event) =>
                                  setNewVideos((current) => ({
                                    ...current,
                                    [chapter.id]: { ...current[chapter.id], title: event.target.value, description: current[chapter.id]?.description || "", videoUrl: current[chapter.id]?.videoUrl || "" },
                                  }))
                                }
                              />
                              <Textarea
                                placeholder="Descripción"
                                rows={2}
                                value={newVideos[chapter.id]?.description || ""}
                                onChange={(event) =>
                                  setNewVideos((current) => ({
                                    ...current,
                                    [chapter.id]: { ...current[chapter.id], title: current[chapter.id]?.title || "", description: event.target.value, videoUrl: current[chapter.id]?.videoUrl || "" },
                                  }))
                                }
                              />
                              <Input
                                placeholder="URL del video"
                                value={newVideos[chapter.id]?.videoUrl || ""}
                                onChange={(event) =>
                                  setNewVideos((current) => ({
                                    ...current,
                                    [chapter.id]: { ...current[chapter.id], title: current[chapter.id]?.title || "", description: current[chapter.id]?.description || "", videoUrl: event.target.value },
                                  }))
                                }
                              />
                              <div className="flex justify-end">
                                <Button onClick={() => handleCreateVideo(chapter.id, chapter.videos.length + 1)} disabled={createVideoMutation.isPending}>
                                  <Plus className="mr-2 h-4 w-4" />
                                  Agregar video
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="rounded-lg border p-4">
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Avance del curso</span>
                      <span>{selectedCourse.progressPercent}%</span>
                    </div>
                    <Progress value={selectedCourse.progressPercent} />
                  </div>

                  <Accordion type="multiple" className="w-full">
                    {selectedCourse.chapters.map((chapter) => (
                      <AccordionItem key={chapter.id} value={chapter.id}>
                        <AccordionTrigger>{chapter.order}. {chapter.title}</AccordionTrigger>
                        <AccordionContent className="space-y-4">
                          {chapter.description && <p className="text-sm text-muted-foreground">{chapter.description}</p>}
                          {chapter.videos.length === 0 ? (
                            <p className="text-sm text-muted-foreground">Este capítulo todavía no tiene videos.</p>
                          ) : (
                            chapter.videos.map((video) => (
                              <Card key={video.id}>
                                <CardContent className="space-y-4 p-4">
                                  <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                      <h4 className="font-medium">{video.title}</h4>
                                      {video.description && <p className="text-sm text-muted-foreground">{video.description}</p>}
                                    </div>
                                    <Badge variant={video.progress?.completed ? "secondary" : "outline"}>
                                      {video.progress?.completed ? "Completado" : "Pendiente"}
                                    </Badge>
                                  </div>

                                  {renderVideoContent(video.videoUrl, video.title)}

                                  {!!selectedCourse.enrollment && (
                                    <div className="flex items-center gap-3">
                                      <Checkbox
                                        checked={!!video.progress?.completed}
                                        onCheckedChange={(checked) =>
                                          updateVideoProgressMutation.mutate({
                                            videoId: video.id,
                                            courseId: selectedCourse.id,
                                            completed: checked === true,
                                          })
                                        }
                                      />
                                      <span className="text-sm">Marcar como completado</span>
                                    </div>
                                  )}

                                  {(!!selectedCourse.enrollment || selectedCourse.canEdit) && (
                                    <div className="space-y-2">
                                      <Label>Mis notas</Label>
                                      <Textarea
                                        rows={5}
                                        value={noteDrafts[video.id] ?? ""}
                                        onChange={(event) =>
                                          setNoteDrafts((current) => ({
                                            ...current,
                                            [video.id]: event.target.value,
                                          }))
                                        }
                                      />
                                      <div className="flex justify-end">
                                        <Button
                                          variant="outline"
                                          onClick={() =>
                                            saveNoteMutation.mutate({
                                              videoId: video.id,
                                              courseId: selectedCourse.id,
                                              content: noteDrafts[video.id] ?? "",
                                            })
                                          }
                                          disabled={saveNoteMutation.isPending}
                                        >
                                          <Save className="mr-2 h-4 w-4" />
                                          Guardar notas
                                        </Button>
                                      </div>
                                    </div>
                                  )}
                                </CardContent>
                              </Card>
                            ))
                          )}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>

                  <div className="flex flex-wrap justify-end gap-2">
                    {!selectedCourse.enrollment && (selectedCourse.status === "open" || selectedCourse.status === "ongoing") && !selectedCourse.canEdit && (
                      <Button onClick={() => enrollMutation.mutate(selectedCourse.id)} disabled={enrollMutation.isPending}>
                        Inscribirme
                      </Button>
                    )}
                    {!!selectedCourse.enrollment && (
                      <Button variant="outline" onClick={() => unenrollMutation.mutate(selectedCourse.id)} disabled={unenrollMutation.isPending}>
                        Salirme del curso
                      </Button>
                    )}
                    {selectedCourse.canEdit && (
                      <Button onClick={() => setDetailMode("manage")}>
                        <Edit className="mr-2 h-4 w-4" />
                        Gestionar curso
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
