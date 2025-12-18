import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "@/contexts/LanguageContext";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  FolderKanban, 
  Plus, 
  Search, 
  MapPin,
  Calendar,
  MoreHorizontal,
  Pencil,
  Play,
  Pause,
  X,
  Users,
  TestTube
} from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import type { ChallengeProject, Challenge, Organization } from "@shared/schema";

const projectFormSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  summary: z.string().optional().nullable(),
  challengeId: z.string().optional().nullable(),
  leadOrganizationId: z.string().optional().nullable(),
  locationCity: z.string().optional().nullable(),
  locationCountry: z.string().optional().nullable(),
  sdgTags: z.array(z.string()).optional().default([]),
  impactFocus: z.string().optional().nullable(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  isPilot: z.boolean().optional().default(false),
});

type ProjectFormData = z.infer<typeof projectFormSchema>;

export default function ChallengeProjects() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<ChallengeProject | null>(null);
  const [filterChallengeId, setFilterChallengeId] = useState<string | null>(null);

  const userRole = (user as any)?.userRoles?.[0]?.role?.name || "usuario";
  const isFacilitador = userRole === "facilitador";

  const form = useForm<ProjectFormData>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      title: "",
      summary: "",
      challengeId: null,
      leadOrganizationId: null,
      locationCity: "",
      locationCountry: "",
      sdgTags: [],
      impactFocus: "",
      startDate: "",
      endDate: "",
      isPilot: false,
    },
  });

  const projectsApiUrl = filterChallengeId 
    ? `/api/challenge-projects?challengeId=${filterChallengeId}`
    : "/api/challenge-projects";

  const { data: projects = [], isLoading } = useQuery<ChallengeProject[]>({
    queryKey: [projectsApiUrl],
  });

  const { data: challenges = [] } = useQuery<Challenge[]>({
    queryKey: ["/api/challenges"],
  });

  const { data: organizations = [] } = useQuery<Organization[]>({
    queryKey: ["/api/organizations"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: ProjectFormData) => {
      return apiRequest("POST", "/api/challenge-projects", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (query) => 
        query.queryKey.some(k => typeof k === 'string' && k.startsWith('/api/challenge-projects'))
      });
      setIsCreateOpen(false);
      form.reset();
      toast({
        title: t("common.success"),
        description: t("challengeProjects.newProject"),
      });
    },
    onError: (error: any) => {
      toast({
        title: t("common.error"),
        description: error.message || "Failed to create project",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ProjectFormData> }) => {
      return apiRequest("PATCH", `/api/challenge-projects/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (query) => 
        query.queryKey.some(k => typeof k === 'string' && k.startsWith('/api/challenge-projects'))
      });
      setEditingProject(null);
      form.reset();
      toast({
        title: t("common.success"),
        description: "Project updated successfully",
      });
    },
    onError: () => {
      toast({
        title: t("common.error"),
        description: "Failed to update project",
        variant: "destructive",
      });
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return apiRequest("POST", `/api/challenge-projects/${id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (query) => 
        query.queryKey.some(k => typeof k === 'string' && k.startsWith('/api/challenge-projects'))
      });
      toast({
        title: t("common.success"),
        description: "Project status updated",
      });
    },
    onError: (error: Error) => {
      toast({
        title: t("common.error"),
        description: error.message || "Failed to update status",
        variant: "destructive",
      });
    },
  });

  const filteredProjects = projects.filter((project) =>
    project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    project.summary?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      idea: "bg-muted text-muted-foreground",
      design: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
      pilot: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
      active: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
      completed: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
      on_hold: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
      cancelled: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    };
    return (
      <Badge className={statusColors[status] || statusColors.idea}>
        {t(`challengeProjects.statuses.${status}` as any)}
      </Badge>
    );
  };

  const handleEdit = (project: ChallengeProject) => {
    setEditingProject(project);
    form.reset({
      title: project.title,
      summary: project.summary || "",
      challengeId: project.challengeId || null,
      leadOrganizationId: project.leadOrganizationId || null,
      locationCity: project.locationCity || "",
      locationCountry: project.locationCountry || "",
      sdgTags: project.sdgTags || [],
      impactFocus: project.impactFocus || "",
      startDate: project.startDate ? new Date(project.startDate).toISOString().split('T')[0] : "",
      endDate: project.endDate ? new Date(project.endDate).toISOString().split('T')[0] : "",
      isPilot: project.isPilot || false,
    });
  };

  const isTerminalStatus = (status: string | null): boolean => {
    return status === "completed" || status === "cancelled";
  };

  const onSubmit = (data: ProjectFormData) => {
    if (editingProject) {
      if (isTerminalStatus(editingProject.status)) {
        toast({
          title: t("common.error"),
          description: "Cannot edit completed or cancelled projects",
          variant: "destructive",
        });
        return;
      }
      updateMutation.mutate({ id: editingProject.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const canAdvanceStatus = (currentStatus: string): boolean => {
    const advanceableStatuses = ["idea", "design", "pilot", "active"];
    return advanceableStatuses.includes(currentStatus);
  };

  const getNextStatus = (currentStatus: string): string | null => {
    const statusFlow: Record<string, string> = {
      idea: "design",
      design: "pilot",
      pilot: "active",
      active: "completed",
    };
    return statusFlow[currentStatus] || null;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-projects-title">{t("challengeProjects.title")}</h1>
          <p className="text-muted-foreground">{t("challengeProjects.allProjects")}</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} data-testid="button-new-project">
          <Plus className="h-4 w-4 mr-2" />
          {t("challengeProjects.newProject")}
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("common.search")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search-projects"
          />
        </div>
        <Select 
          value={filterChallengeId || "all"} 
          onValueChange={(v) => setFilterChallengeId(v === "all" ? null : v)}
        >
          <SelectTrigger className="w-[200px]" data-testid="select-filter-challenge">
            <SelectValue placeholder={t("common.filter")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("challengeProjects.allProjects")}</SelectItem>
            {challenges.map((challenge) => (
              <SelectItem key={challenge.id} value={challenge.id}>
                {challenge.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-5 bg-muted rounded w-3/4" />
                <div className="h-4 bg-muted rounded w-1/2 mt-2" />
              </CardHeader>
              <CardContent>
                <div className="h-4 bg-muted rounded w-full mb-2" />
                <div className="h-4 bg-muted rounded w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredProjects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FolderKanban className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">{t("challengeProjects.noProjects")}</h3>
            <p className="text-muted-foreground text-center mb-4">
              {t("challengeProjects.createFirst")}
            </p>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              {t("challengeProjects.newProject")}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((project) => (
            <Card key={project.id} className="hover-elevate" data-testid={`card-project-${project.id}`}>
              <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 pb-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base truncate">{project.title}</CardTitle>
                    {project.isPilot && (
                      <TestTube className="h-4 w-4 text-orange-500 flex-shrink-0" />
                    )}
                  </div>
                  <CardDescription className="flex items-center gap-1 mt-1 flex-wrap">
                    {project.locationCity && (
                      <>
                        <MapPin className="h-3 w-3" />
                        <span>{project.locationCity}</span>
                        {project.locationCountry && <span>, {project.locationCountry}</span>}
                      </>
                    )}
                  </CardDescription>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" data-testid={`button-project-menu-${project.id}`}>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {project.status !== "cancelled" && project.status !== "completed" && (
                      <DropdownMenuItem onClick={() => handleEdit(project)}>
                        <Pencil className="h-4 w-4 mr-2" />
                        {t("common.edit")}
                      </DropdownMenuItem>
                    )}
                    {canAdvanceStatus(project.status || "idea") && (
                      <DropdownMenuItem onClick={() => statusMutation.mutate({ id: project.id, status: getNextStatus(project.status || "idea")! })}>
                        <Play className="h-4 w-4 mr-2" />
                        {t("challengeProjects.actions.advance")}
                      </DropdownMenuItem>
                    )}
                    {canAdvanceStatus(project.status || "idea") && project.status !== "on_hold" && (
                      <DropdownMenuItem onClick={() => statusMutation.mutate({ id: project.id, status: "on_hold" })}>
                        <Pause className="h-4 w-4 mr-2" />
                        {t("challengeProjects.actions.pause")}
                      </DropdownMenuItem>
                    )}
                    {canAdvanceStatus(project.status || "idea") && (
                      <DropdownMenuItem onClick={() => statusMutation.mutate({ id: project.id, status: "cancelled" })}>
                        <X className="h-4 w-4 mr-2" />
                        {t("challengeProjects.actions.cancel")}
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                  {project.summary || "-"}
                </p>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  {getStatusBadge(project.status || "idea")}
                  {project.startDate && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>{new Date(project.startDate).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
                {project.sdgTags && project.sdgTags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {project.sdgTags.slice(0, 3).map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {project.sdgTags.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{project.sdgTags.length - 3}
                      </Badge>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isCreateOpen || !!editingProject} onOpenChange={(open) => {
        if (!open) {
          setIsCreateOpen(false);
          setEditingProject(null);
          form.reset();
        }
      }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingProject ? t("challengeProjects.editProject") : t("challengeProjects.newProject")}
            </DialogTitle>
            <DialogDescription>
              {t("challengeProjects.projectDetails")}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("challengeProjects.name")}</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-project-title" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="summary"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("challengeProjects.summary")}</FormLabel>
                    <FormControl>
                      <Textarea {...field} value={field.value || ""} data-testid="input-project-summary" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="challengeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("challengeProjects.challenge")}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || undefined}>
                      <FormControl>
                        <SelectTrigger data-testid="select-project-challenge">
                          <SelectValue placeholder={t("common.select")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {challenges.filter(c => c.status === "open").map((challenge) => (
                          <SelectItem key={challenge.id} value={challenge.id}>
                            {challenge.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="leadOrganizationId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("challengeProjects.leadOrganization")}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || undefined}>
                      <FormControl>
                        <SelectTrigger data-testid="select-project-organization">
                          <SelectValue placeholder={t("common.select")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {organizations.map((org) => (
                          <SelectItem key={org.id} value={org.id}>
                            {org.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="locationCity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("challengeProjects.locationCity")}</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} data-testid="input-project-city" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="locationCountry"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("challengeProjects.locationCountry")}</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} data-testid="input-project-country" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="impactFocus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("challengeProjects.impactFocus")}</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} data-testid="input-project-impact" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("challengeProjects.startDate")}</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} value={field.value || ""} data-testid="input-project-start-date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("challengeProjects.endDate")}</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} value={field.value || ""} data-testid="input-project-end-date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="isPilot"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>{t("challengeProjects.isPilot")}</FormLabel>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-project-pilot"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => {
                  setIsCreateOpen(false);
                  setEditingProject(null);
                  form.reset();
                }}>
                  {t("common.cancel")}
                </Button>
                <Button 
                  type="submit" 
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-save-project"
                >
                  {t("common.save")}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
