import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "@/contexts/LanguageContext";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
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
  Building2, 
  Plus, 
  Search, 
  Globe, 
  MapPin, 
  Users,
  MoreHorizontal,
  Pencil,
  Power,
  PowerOff,
  ExternalLink,
  ShieldAlert
} from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import type { Organization, User } from "@shared/schema";

const organizationFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  legalStatus: z.enum(["nonprofit", "governmental", "educational", "corporate", "community_based", "other"]),
  description: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  website: z.string().url().optional().nullable().or(z.literal("")),
});

type OrganizationFormData = z.infer<typeof organizationFormSchema>;

export default function Organizations() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);

  const { hasRole } = useAuth();
  const isFacilitador = hasRole('facilitador');

  const form = useForm<OrganizationFormData>({
    resolver: zodResolver(organizationFormSchema),
    defaultValues: {
      name: "",
      legalStatus: "nonprofit",
      description: "",
      country: "",
      city: "",
      website: "",
    },
  });

  const { data: organizations = [], isLoading } = useQuery<Organization[]>({
    queryKey: ["/api/organizations"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: OrganizationFormData) => {
      return apiRequest("POST", "/api/organizations", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/organizations"] });
      setIsCreateOpen(false);
      form.reset();
      toast({
        title: t("common.success"),
        description: t("organizations.newOrganization"),
      });
    },
    onError: () => {
      toast({
        title: t("common.error"),
        description: "Failed to create organization",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<OrganizationFormData> }) => {
      return apiRequest("PATCH", `/api/organizations/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/organizations"] });
      setEditingOrg(null);
      form.reset();
      toast({
        title: t("common.success"),
        description: "Organization updated successfully",
      });
    },
    onError: () => {
      toast({
        title: t("common.error"),
        description: "Failed to update organization",
        variant: "destructive",
      });
    },
  });

  const activateMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("POST", `/api/organizations/${id}/activate`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/organizations"] });
      toast({
        title: t("common.success"),
        description: "Organization activated",
      });
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("POST", `/api/organizations/${id}/deactivate`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/organizations"] });
      toast({
        title: t("common.success"),
        description: "Organization deactivated",
      });
    },
  });

  const filteredOrganizations = organizations.filter(org => 
    org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    org.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    org.country?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateSubmit = (data: OrganizationFormData) => {
    createMutation.mutate(data);
  };

  const handleEditSubmit = (data: OrganizationFormData) => {
    if (editingOrg) {
      updateMutation.mutate({ id: editingOrg.id, data });
    }
  };

  const openEditDialog = (org: Organization) => {
    setEditingOrg(org);
    form.reset({
      name: org.name,
      legalStatus: org.legalStatus as any,
      description: org.description || "",
      country: org.country || "",
      city: org.city || "",
      website: org.website || "",
    });
  };

  const getLegalStatusLabel = (status: string) => {
    return t(`organizations.legalStatuses.${status}`) || status;
  };

  if (!isFacilitador) {
    return (
      <div className="container mx-auto p-6 max-w-7xl">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ShieldAlert className="h-12 w-12 text-muted-foreground mb-4" />
            <h2 className="text-lg font-medium mb-2" data-testid="text-access-denied">
              {t("common.accessDenied")}
            </h2>
            <p className="text-muted-foreground text-center mb-4">
              {t("organizations.facilitadorOnly")}
            </p>
            <Button variant="outline" onClick={() => setLocation("/dashboard")} data-testid="button-go-dashboard">
              {t("nav.dashboard")}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-organizations-title">
              {t("organizations.alliedOrganizations")}
            </h1>
            <p className="text-muted-foreground">
              {t("organizations.title")}
            </p>
          </div>
          <Button onClick={() => setIsCreateOpen(true)} data-testid="button-create-organization">
            <Plus className="h-4 w-4 mr-2" />
            {t("organizations.newOrganization")}
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("common.search")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 max-w-sm"
            data-testid="input-search-organizations"
          />
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-6 bg-muted rounded w-3/4" />
                  <div className="h-4 bg-muted rounded w-1/2" />
                </CardHeader>
                <CardContent>
                  <div className="h-20 bg-muted rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredOrganizations.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">{t("organizations.noOrganizations")}</p>
              <p className="text-muted-foreground">{t("organizations.createFirst")}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredOrganizations.map((org) => (
              <Card key={org.id} className="group" data-testid={`card-organization-${org.id}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg truncate">{org.name}</CardTitle>
                      <CardDescription className="flex items-center gap-1 mt-1">
                        <Badge variant={org.isActive ? "default" : "secondary"} className="text-xs">
                          {org.isActive ? t("organizations.active") : t("organizations.inactive")}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {getLegalStatusLabel(org.legalStatus)}
                        </Badge>
                      </CardDescription>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" data-testid={`button-org-menu-${org.id}`}>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditDialog(org)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          {t("common.edit")}
                        </DropdownMenuItem>
                        {org.isActive ? (
                          <DropdownMenuItem onClick={() => deactivateMutation.mutate(org.id)}>
                            <PowerOff className="h-4 w-4 mr-2" />
                            {t("organizations.deactivate")}
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={() => activateMutation.mutate(org.id)}>
                            <Power className="h-4 w-4 mr-2" />
                            {t("organizations.activate")}
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => setSelectedOrg(org)}>
                          <Users className="h-4 w-4 mr-2" />
                          {t("organizations.members")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent>
                  {org.description && (
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {org.description}
                    </p>
                  )}
                  <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                    {org.city && org.country && (
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        <span>{org.city}, {org.country}</span>
                      </div>
                    )}
                    {org.website && (
                      <a 
                        href={org.website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 hover:text-foreground transition-colors"
                      >
                        <Globe className="h-4 w-4" />
                        <span className="truncate">{org.website}</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("organizations.newOrganization")}</DialogTitle>
              <DialogDescription>
                {t("organizations.organizationDetails")}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleCreateSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("organizations.name")}</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-org-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="legalStatus"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("organizations.legalStatus")}</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-legal-status">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="nonprofit">{t("organizations.legalStatuses.nonprofit")}</SelectItem>
                          <SelectItem value="governmental">{t("organizations.legalStatuses.governmental")}</SelectItem>
                          <SelectItem value="educational">{t("organizations.legalStatuses.educational")}</SelectItem>
                          <SelectItem value="corporate">{t("organizations.legalStatuses.corporate")}</SelectItem>
                          <SelectItem value="community_based">{t("organizations.legalStatuses.community_based")}</SelectItem>
                          <SelectItem value="other">{t("organizations.legalStatuses.other")}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("organizations.description")}</FormLabel>
                      <FormControl>
                        <Textarea {...field} data-testid="input-org-description" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="country"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("organizations.country")}</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-org-country" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("organizations.city")}</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-org-city" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="website"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("organizations.website")}</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="https://" data-testid="input-org-website" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                    {t("common.cancel")}
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-organization">
                    {t("common.create")}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        <Dialog open={!!editingOrg} onOpenChange={(open) => !open && setEditingOrg(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("organizations.editOrganization")}</DialogTitle>
              <DialogDescription>
                {t("organizations.organizationDetails")}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleEditSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("organizations.name")}</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-edit-org-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="legalStatus"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("organizations.legalStatus")}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-edit-legal-status">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="nonprofit">{t("organizations.legalStatuses.nonprofit")}</SelectItem>
                          <SelectItem value="governmental">{t("organizations.legalStatuses.governmental")}</SelectItem>
                          <SelectItem value="educational">{t("organizations.legalStatuses.educational")}</SelectItem>
                          <SelectItem value="corporate">{t("organizations.legalStatuses.corporate")}</SelectItem>
                          <SelectItem value="community_based">{t("organizations.legalStatuses.community_based")}</SelectItem>
                          <SelectItem value="other">{t("organizations.legalStatuses.other")}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("organizations.description")}</FormLabel>
                      <FormControl>
                        <Textarea {...field} data-testid="input-edit-org-description" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="country"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("organizations.country")}</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-edit-org-country" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("organizations.city")}</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-edit-org-city" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="website"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("organizations.website")}</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="https://" data-testid="input-edit-org-website" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setEditingOrg(null)}>
                    {t("common.cancel")}
                  </Button>
                  <Button type="submit" disabled={updateMutation.isPending} data-testid="button-update-organization">
                    {t("common.save")}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        <OrganizationMembersDialog 
          organization={selectedOrg} 
          onClose={() => setSelectedOrg(null)} 
        />
      </div>
    </div>
  );
}

function OrganizationMembersDialog({ 
  organization, 
  onClose 
}: { 
  organization: Organization | null; 
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);

  const memberForm = useForm({
    defaultValues: {
      userId: "",
      role: "volunteer_consultant",
      notes: "",
    },
  });

  const { data: memberships = [], isLoading } = useQuery({
    queryKey: ["/api/organizations", organization?.id, "memberships"],
    queryFn: async () => {
      if (!organization) return [];
      const res = await fetch(`/api/organizations/${organization.id}/memberships`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch memberships");
      return res.json();
    },
    enabled: !!organization,
  });

  const { data: users = [] } = useQuery({
    queryKey: ["/api/users"],
    enabled: isAddMemberOpen,
  });

  const addMemberMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", `/api/organizations/${organization?.id}/memberships`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/organizations", organization?.id, "memberships"] });
      setIsAddMemberOpen(false);
      memberForm.reset();
      toast({
        title: t("common.success"),
        description: "Member added successfully",
      });
    },
    onError: () => {
      toast({
        title: t("common.error"),
        description: "Failed to add member",
        variant: "destructive",
      });
    },
  });

  const deleteMemberMutation = useMutation({
    mutationFn: async (membershipId: string) => {
      return apiRequest("DELETE", `/api/memberships/${membershipId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/organizations", organization?.id, "memberships"] });
      toast({
        title: t("common.success"),
        description: "Member removed successfully",
      });
    },
  });

  const handleAddMember = (data: any) => {
    addMemberMutation.mutate(data);
  };

  const getRoleLabel = (role: string) => {
    return t(`organizations.membership.roles.${role}`) || role;
  };

  if (!organization) return null;

  return (
    <>
      <Dialog open={!!organization} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{organization.name} - {t("organizations.members")}</DialogTitle>
            <DialogDescription>
              {t("organizations.membership.title")}
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex justify-end mb-4">
            <Button onClick={() => setIsAddMemberOpen(true)} data-testid="button-add-member">
              <Plus className="h-4 w-4 mr-2" />
              {t("organizations.membership.addMember")}
            </Button>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-muted rounded animate-pulse" />
              ))}
            </div>
          ) : memberships.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{t("organizations.membership.noMembers")}</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {memberships.map((membership: any) => (
                <div 
                  key={membership.id} 
                  className="flex items-center justify-between p-3 border rounded-lg"
                  data-testid={`member-${membership.id}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                      <Users className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">
                        {membership.user?.firstName} {membership.user?.lastName}
                      </p>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {getRoleLabel(membership.role)}
                        </Badge>
                        {membership.isCurrent && (
                          <Badge variant="default" className="text-xs">
                            {t("organizations.membership.isCurrent")}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => deleteMemberMutation.mutate(membership.id)}
                    data-testid={`button-delete-member-${membership.id}`}
                  >
                    {t("common.delete")}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isAddMemberOpen} onOpenChange={setIsAddMemberOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("organizations.membership.addMember")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={memberForm.handleSubmit(handleAddMember)} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("organizations.membership.selectUser")}</label>
              <Select onValueChange={(value) => memberForm.setValue("userId", value)}>
                <SelectTrigger data-testid="select-member-user">
                  <SelectValue placeholder={t("organizations.membership.selectUser")} />
                </SelectTrigger>
                <SelectContent>
                  {(users as any[]).map((user: any) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.firstName} {user.lastName} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("organizations.membership.role")}</label>
              <Select 
                defaultValue="volunteer_consultant"
                onValueChange={(value) => memberForm.setValue("role", value)}
              >
                <SelectTrigger data-testid="select-member-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="volunteer_consultant">{t("organizations.membership.roles.volunteer_consultant")}</SelectItem>
                  <SelectItem value="mentor">{t("organizations.membership.roles.mentor")}</SelectItem>
                  <SelectItem value="project_lead">{t("organizations.membership.roles.project_lead")}</SelectItem>
                  <SelectItem value="staff">{t("organizations.membership.roles.staff")}</SelectItem>
                  <SelectItem value="partner_representative">{t("organizations.membership.roles.partner_representative")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("organizations.membership.notes")}</label>
              <Textarea 
                {...memberForm.register("notes")} 
                data-testid="input-member-notes"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddMemberOpen(false)}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={addMemberMutation.isPending} data-testid="button-submit-member">
                {t("common.save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
