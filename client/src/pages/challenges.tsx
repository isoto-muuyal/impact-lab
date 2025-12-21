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
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Target, 
  Plus, 
  Search, 
  MapPin,
  Calendar,
  FolderOpen,
  MoreHorizontal,
  Pencil,
  Play,
  Check,
  Archive,
  ShieldAlert,
  Rocket
} from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import type { Challenge, Organization } from "@shared/schema";

const challengeFormSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().optional().nullable(),
  contextOrganizationId: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  sdgTags: z.array(z.string()).optional().default([]),
  openFrom: z.string().optional().nullable(),
  openUntil: z.string().optional().nullable(),
  maxProjects: z.number().int().min(1).optional().nullable(),
});

type ChallengeFormData = z.infer<typeof challengeFormSchema>;

const SDG_OPTIONS = [
  "SDG1", "SDG2", "SDG3", "SDG4", "SDG5", "SDG6", "SDG7", "SDG8",
  "SDG9", "SDG10", "SDG11", "SDG12", "SDG13", "SDG14", "SDG15", "SDG16", "SDG17"
];

export default function Challenges() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingChallenge, setEditingChallenge] = useState<Challenge | null>(null);
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);

  const { hasRole } = useAuth();
  const isFacilitador = hasRole('facilitador');

  const form = useForm<ChallengeFormData>({
    resolver: zodResolver(challengeFormSchema),
    defaultValues: {
      title: "",
      description: "",
      contextOrganizationId: null,
      city: "",
      country: "",
      sdgTags: [],
      openFrom: "",
      openUntil: "",
      maxProjects: 10,
    },
  });

  const { data: challenges = [], isLoading } = useQuery<Challenge[]>({
    queryKey: ["/api/challenges"],
  });

  const { data: organizations = [] } = useQuery<Organization[]>({
    queryKey: ["/api/organizations"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: ChallengeFormData) => {
      return apiRequest("POST", "/api/challenges", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/challenges"] });
      setIsCreateOpen(false);
      form.reset();
      toast({
        title: t("common.success"),
        description: t("challenges.newChallenge"),
      });
    },
    onError: () => {
      toast({
        title: t("common.error"),
        description: "Failed to create challenge",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ChallengeFormData> }) => {
      return apiRequest("PATCH", `/api/challenges/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/challenges"] });
      setEditingChallenge(null);
      form.reset();
      toast({
        title: t("common.success"),
        description: "Challenge updated successfully",
      });
    },
    onError: () => {
      toast({
        title: t("common.error"),
        description: "Failed to update challenge",
        variant: "destructive",
      });
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return apiRequest("POST", `/api/challenges/${id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/challenges"] });
      toast({
        title: t("common.success"),
        description: "Challenge status updated",
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

  const filteredChallenges = challenges.filter((challenge) =>
    challenge.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    challenge.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      draft: "bg-muted text-muted-foreground",
      open: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
      in_progress: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
      completed: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
      archived: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
    };
    return (
      <Badge className={statusColors[status] || statusColors.draft}>
        {t(`challenges.statuses.${status}` as any)}
      </Badge>
    );
  };

  const handleEdit = (challenge: Challenge) => {
    setEditingChallenge(challenge);
    form.reset({
      title: challenge.title,
      description: challenge.description || "",
      contextOrganizationId: challenge.contextOrganizationId || null,
      city: challenge.city || "",
      country: challenge.country || "",
      sdgTags: challenge.sdgTags || [],
      openFrom: challenge.openFrom ? new Date(challenge.openFrom).toISOString().split('T')[0] : "",
      openUntil: challenge.openUntil ? new Date(challenge.openUntil).toISOString().split('T')[0] : "",
      maxProjects: challenge.maxProjects || 10,
    });
  };

  const onSubmit = (data: ChallengeFormData) => {
    if (editingChallenge) {
      if (editingChallenge.status === "archived") {
        toast({
          title: t("common.error"),
          description: "Cannot edit archived challenges",
          variant: "destructive",
        });
        return;
      }
      updateMutation.mutate({ id: editingChallenge.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  if (!isFacilitador) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ShieldAlert className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">{t("common.accessDenied")}</h3>
            <p className="text-muted-foreground text-center">
              {t("challenges.facilitadorOnly")}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-challenges-title">{t("challenges.title")}</h1>
          <p className="text-muted-foreground">{t("challenges.allChallenges")}</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} data-testid="button-new-challenge">
          <Plus className="h-4 w-4 mr-2" />
          {t("challenges.newChallenge")}
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("common.search")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search-challenges"
          />
        </div>
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
      ) : filteredChallenges.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Target className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">{t("challenges.noChallenges")}</h3>
            <p className="text-muted-foreground text-center mb-4">
              {t("challenges.createFirst")}
            </p>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              {t("challenges.newChallenge")}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredChallenges.map((challenge) => (
            <Card key={challenge.id} className="hover-elevate" data-testid={`card-challenge-${challenge.id}`}>
              <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 pb-2">
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-base truncate">{challenge.title}</CardTitle>
                  <CardDescription className="flex items-center gap-1 mt-1 flex-wrap">
                    {challenge.city && (
                      <>
                        <MapPin className="h-3 w-3" />
                        <span>{challenge.city}</span>
                        {challenge.country && <span>, {challenge.country}</span>}
                      </>
                    )}
                  </CardDescription>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" data-testid={`button-challenge-menu-${challenge.id}`}>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {challenge.status !== "archived" && (
                      <DropdownMenuItem onClick={() => handleEdit(challenge)}>
                        <Pencil className="h-4 w-4 mr-2" />
                        {t("common.edit")}
                      </DropdownMenuItem>
                    )}
                    {challenge.status === "draft" && (
                      <DropdownMenuItem onClick={() => statusMutation.mutate({ id: challenge.id, status: "open" })}>
                        <Rocket className="h-4 w-4 mr-2" />
                        {t("challenges.actions.open")}
                      </DropdownMenuItem>
                    )}
                    {challenge.status === "open" && (
                      <DropdownMenuItem onClick={() => statusMutation.mutate({ id: challenge.id, status: "in_progress" })}>
                        <Play className="h-4 w-4 mr-2" />
                        {t("challenges.actions.start")}
                      </DropdownMenuItem>
                    )}
                    {challenge.status === "in_progress" && (
                      <DropdownMenuItem onClick={() => statusMutation.mutate({ id: challenge.id, status: "completed" })}>
                        <Check className="h-4 w-4 mr-2" />
                        {t("challenges.actions.complete")}
                      </DropdownMenuItem>
                    )}
                    {challenge.status === "completed" && (
                      <DropdownMenuItem onClick={() => statusMutation.mutate({ id: challenge.id, status: "archived" })}>
                        <Archive className="h-4 w-4 mr-2" />
                        {t("challenges.actions.archive")}
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                  {challenge.description || "-"}
                </p>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  {getStatusBadge(challenge.status || "draft")}
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <FolderOpen className="h-3 w-3" />
                    <span>0/{challenge.maxProjects || "-"}</span>
                  </div>
                </div>
                {challenge.sdgTags && challenge.sdgTags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {challenge.sdgTags.slice(0, 3).map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {challenge.sdgTags.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{challenge.sdgTags.length - 3}
                      </Badge>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isCreateOpen || !!editingChallenge} onOpenChange={(open) => {
        if (!open) {
          setIsCreateOpen(false);
          setEditingChallenge(null);
          form.reset();
        }
      }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingChallenge ? t("challenges.editChallenge") : t("challenges.newChallenge")}
            </DialogTitle>
            <DialogDescription>
              {t("challenges.challengeDetails")}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("challenges.name")}</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-challenge-title" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("challenges.description")}</FormLabel>
                    <FormControl>
                      <Textarea {...field} value={field.value || ""} data-testid="input-challenge-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="contextOrganizationId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("challenges.contextOrganization")}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || undefined}>
                      <FormControl>
                        <SelectTrigger data-testid="select-challenge-organization">
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
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("challenges.city")}</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} data-testid="input-challenge-city" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("challenges.country")}</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} data-testid="input-challenge-country" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="openFrom"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("challenges.openFrom")}</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} value={field.value || ""} data-testid="input-challenge-open-from" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="openUntil"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("challenges.openUntil")}</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} value={field.value || ""} data-testid="input-challenge-open-until" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="maxProjects"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("challenges.maxProjects")}</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min={1}
                        {...field} 
                        value={field.value || ""} 
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                        data-testid="input-challenge-max-projects" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => {
                  setIsCreateOpen(false);
                  setEditingChallenge(null);
                  form.reset();
                }}>
                  {t("common.cancel")}
                </Button>
                <Button 
                  type="submit" 
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-save-challenge"
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
