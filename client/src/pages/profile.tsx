import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Role, RoleRequestWithDetails } from "@shared/schema";
import { MentorProfileChat, type MentorRoleRequestPreview } from "@/components/mentor-profile-chat";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  User, 
  Mail, 
  MapPin, 
  Globe, 
  Briefcase,
  Link2,
  Save,
  Edit,
  X,
  Shield,
  Check,
  Plus,
  Paperclip
} from "lucide-react";

function getProfileFormSchema(t: (key: string, fallback?: string) => string) {
  return z.object({
    firstName: z.string().min(1, t("profile.firstNameRequired", "First name is required.")),
    lastName: z.string().min(1, t("profile.lastNameRequired", "Last name is required.")),
    title: z.string().optional(),
    bio: z.string().max(500, t("profile.bioMaxLength", "Bio cannot exceed 500 characters.")).optional(),
    country: z.string().optional(),
    city: z.string().optional(),
    timezone: z.string().optional(),
    linkedinUrl: z.string().url(t("profile.invalidUrl", "Invalid URL.")).or(z.literal("")).optional(),
    skills: z.string().optional(),
    interests: z.string().optional(),
  });
}

type ProfileFormData = z.infer<ReturnType<typeof getProfileFormSchema>>;
type RoleRequestAttachment = {
  name: string;
  type: string;
  size: number;
  url: string;
  storageKey: string;
};

function getApiErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof Error) || !error.message) {
    return fallback;
  }

  const normalized = error.message.replace(/^\d+:\s*/, "").trim();
  if (!normalized) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(normalized);
    if (parsed && typeof parsed.message === "string") {
      return parsed.message;
    }
  } catch {
    return normalized;
  }

  return normalized;
}

async function uploadRoleRequestAttachment(file: File): Promise<RoleRequestAttachment> {
  const response = await fetch("/api/uploads/role-request-attachments", {
    method: "POST",
    headers: {
      "Content-Type": file.type || "application/octet-stream",
      "X-File-Name": encodeURIComponent(file.name),
      "X-File-Size": String(file.size),
    },
    body: file,
    credentials: "include",
  });

  if (!response.ok) {
    const text = (await response.text()) || response.statusText;
    throw new Error(`${response.status}: ${text}`);
  }

  return response.json();
}

const timezones = [
  { value: "America/New_York", label: "New York (GMT-5)" },
  { value: "America/Mexico_City", label: "Ciudad de México (GMT-6)" },
  { value: "America/Bogota", label: "Bogotá (GMT-5)" },
  { value: "America/Lima", label: "Lima (GMT-5)" },
  { value: "America/Santiago", label: "Santiago (GMT-4)" },
  { value: "America/Buenos_Aires", label: "Buenos Aires (GMT-3)" },
  { value: "America/Sao_Paulo", label: "São Paulo (GMT-3)" },
  { value: "Europe/Madrid", label: "Madrid (GMT+1)" },
];

export default function Profile() {
  const { user, isLoading } = useAuth();
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [isRoleRequestDialogOpen, setIsRoleRequestDialogOpen] = useState(false);
  const [requestedRoleId, setRequestedRoleId] = useState<string | null>(null);
  const [roleRequestJustification, setRoleRequestJustification] = useState("");
  const [roleRequestAttachments, setRoleRequestAttachments] = useState<RoleRequestAttachment[]>([]);
  const [isUploadingRoleAttachments, setIsUploadingRoleAttachments] = useState(false);
  const [isMentorProfileChatOpen, setIsMentorProfileChatOpen] = useState(false);
  const [pendingMentorDraftId, setPendingMentorDraftId] = useState<string | null>(null);
  
  const isImpactLabAdmin = user?.username === "impactlab";

  const { data: allRoles } = useQuery<Role[]>({
    queryKey: ['/api/roles'],
    enabled: !!user,
  });

  const { data: roleRequests } = useQuery<RoleRequestWithDetails[]>({
    queryKey: ['/api/role-requests/my'],
    enabled: !!user && !isImpactLabAdmin,
  });

  useEffect(() => {
    if (user?.userRoles) {
      setSelectedRoles(user.userRoles.filter((ur: any) => ur.status === "active").map((ur: any) => ur.roleId));
    }
  }, [user]);

  const profileFormSchema = useMemo(() => getProfileFormSchema(t), [t]);

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      title: "",
      bio: "",
      country: "",
      city: "",
      timezone: "America/New_York",
      linkedinUrl: "",
      skills: "",
      interests: "",
    },
  });

  useEffect(() => {
    if (user) {
      form.reset({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        title: user.profile?.title || "",
        bio: user.profile?.bio || "",
        country: user.profile?.country || "",
        city: user.profile?.city || "",
        timezone: user.timezone || "America/New_York",
        linkedinUrl: user.profile?.linkedinUrl || "",
        skills: user.profile?.skills?.join(", ") || "",
        interests: user.profile?.interests?.join(", ") || "",
      });
    }
  }, [user, form]);

  useEffect(() => {
    if (!isLoading && !user) {
      toast({
        title: t("profile.unauthorizedTitle", "Unauthorized"),
        description: t("profile.unauthorizedDescription", "Logging in..."),
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/login";
      }, 500);
    }
  }, [isLoading, user, toast, t]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      const profileData = {
        ...data,
        skills: data.skills ? data.skills.split(",").map(s => s.trim()).filter(Boolean) : [],
        interests: data.interests ? data.interests.split(",").map(s => s.trim()).filter(Boolean) : [],
      };
      await apiRequest("PATCH", "/api/profile", profileData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      setIsEditing(false);
      toast({
        title: t("profile.profileUpdatedTitle", "Profile updated"),
        description: t("profile.profileUpdatedDescription", "Your information has been saved successfully."),
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: t("profile.unauthorizedTitle", "Unauthorized"),
          description: t("profile.unauthorizedDescription", "Logging in..."),
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/login";
        }, 500);
        return;
      }
      toast({
        title: t("common.error", "Error"),
        description: t("profile.updateErrorDescription", "Could not update the profile. Please try again."),
        variant: "destructive",
      });
    },
  });

  const updateRolesMutation = useMutation({
    mutationFn: async (roleIds: string[]) => {
      await apiRequest('PUT', '/api/auth/user/roles', { roleIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      toast({
        title: t("profile.rolesUpdatedTitle", "Roles updated"),
        description: t("profile.rolesUpdatedDescription", "Your roles have been updated successfully."),
      });
    },
    onError: () => {
      toast({
        title: t("common.error", "Error"),
        description: t("profile.rolesUpdateErrorDescription", "Could not update the roles."),
        variant: "destructive",
      });
    },
  });

  const roleRequestMutation = useMutation({
    mutationFn: async (payload: { roleId: string; justification: string; attachments: RoleRequestAttachment[] }) => {
      await apiRequest("POST", "/api/role-requests", {
        ...payload,
        ...(pendingMentorDraftId ? { draftId: pendingMentorDraftId } : {}),
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['/api/role-requests/my'] });
      setIsRoleRequestDialogOpen(false);
      setRequestedRoleId(null);
      setRoleRequestJustification("");
      setRoleRequestAttachments([]);
      setPendingMentorDraftId(null);
      toast({
        title: t("profile.roleRequestSentTitle", "Request sent"),
        description: t("profile.roleRequestSentDescription", "An admin will review your role request."),
      });
    },
    onError: (error) => {
      toast({
        title: t("common.error", "Error"),
        description: getApiErrorMessage(error, t("profile.roleRequestErrorFallback", "Could not submit the role request.")),
        variant: "destructive",
      });
    },
  });

  const handleRoleToggle = (roleId: string) => {
    setSelectedRoles(prev => {
      if (prev.includes(roleId)) {
        if (prev.length === 1) return prev;
        return prev.filter(id => id !== roleId);
      }
      return [...prev, roleId];
    });
  };

  const handleSaveRoles = () => {
    if (selectedRoles.length === 0) {
      toast({
        title: t("common.error", "Error"),
        description: t("profile.selectAtLeastOneRole", "You must select at least one role."),
        variant: "destructive",
      });
      return;
    }
    updateRolesMutation.mutate(selectedRoles);
  };

  const handleOpenRoleRequest = (roleId: string) => {
    const role = allRoles?.find((item) => item.id === roleId);
    if (role?.name === "mentor") {
      setRequestedRoleId(roleId);
      setIsMentorProfileChatOpen(true);
      return;
    }

    setRequestedRoleId(roleId);
    setRoleRequestJustification("");
    setRoleRequestAttachments([]);
    setPendingMentorDraftId(null);
    setIsRoleRequestDialogOpen(true);
  };

  const handleMentorSection1Complete = (preview: MentorRoleRequestPreview) => {
    setPendingMentorDraftId(preview.draftId);
    setRoleRequestJustification(preview.justification);
    setRoleRequestAttachments(preview.attachments);
    setIsRoleRequestDialogOpen(true);
  };

  const handleRoleRequestAttachments = async (files: FileList | null) => {
    if (!files?.length) return;

    try {
      setIsUploadingRoleAttachments(true);
      const nextAttachments = await Promise.all(
        Array.from(files).slice(0, 5).map((file) => uploadRoleRequestAttachment(file))
      );
      setRoleRequestAttachments(nextAttachments);
      toast({
        title: t("profile.attachmentsUploadedTitle", "Attachments uploaded"),
        description: t("profile.attachmentsUploadedDescription", "The files were uploaded successfully."),
      });
    } catch (error) {
      setRoleRequestAttachments([]);
      toast({
        title: t("common.error", "Error"),
        description: getApiErrorMessage(error, t("profile.attachmentUploadErrorFallback", "Could not upload the attachment.")),
        variant: "destructive",
      });
    } finally {
      setIsUploadingRoleAttachments(false);
    }
  };

  const handleSubmitRoleRequest = () => {
    if (!requestedRoleId || !roleRequestJustification.trim()) {
      toast({
        title: t("common.error", "Error"),
        description: t("profile.justifyRoleRequired", "You must explain why you need the role."),
        variant: "destructive",
      });
      return;
    }

    roleRequestMutation.mutate({
      roleId: requestedRoleId,
      justification: roleRequestJustification.trim(),
      attachments: roleRequestAttachments,
    });
  };

  const hasRoleChanges = () => {
    if (!user?.userRoles) return false;
    const currentRoles = user.userRoles.filter((ur: any) => ur.status === "active").map((ur: any) => ur.roleId).sort();
    const newRoles = [...selectedRoles].sort();
    if (currentRoles.length !== newRoles.length) return true;
    return currentRoles.some((id: string, index: number) => id !== newRoles[index]);
  };

  const onSubmit = (data: ProfileFormData) => {
    updateProfileMutation.mutate(data);
  };

  const userRole = user?.userRoles?.[0]?.role?.name || "usuario";
  const roleLabels: Record<string, string> = {
    usuario: t("profile.roleCatalog.usuario.label", "User"),
    mentor: t("profile.roleCatalog.mentor.label", "Mentor"),
    facilitador: t("profile.roleCatalog.facilitador.label", "Facilitator"),
    proponente: t("profile.roleCatalog.proponente.label", "Proposer"),
    acreditador: t("profile.roleCatalog.acreditador.label", "Accreditor"),
  };
  const roleBadgeColors: Record<string, string> = {
    usuario: "bg-primary/10 text-primary",
    mentor: "bg-chart-2/10 text-chart-2",
    facilitador: "bg-chart-4/10 text-chart-4",
    proponente: "bg-chart-1/10 text-chart-1",
    acreditador: "bg-chart-3/10 text-chart-3",
  };
  const roleDescriptions: Record<string, string> = {
    usuario: t("profile.roleCatalog.usuario.description", "Basic access to the platform"),
    mentor: t("profile.roleCatalog.mentor.description", "Can create and run mentorships, choose projects to guide"),
    facilitador: t("profile.roleCatalog.facilitador.description", "Can create courses and upload educational content"),
    proponente: t("profile.roleCatalog.proponente.description", "Can create projects, search for mentors, and enroll in courses"),
    acreditador: t("profile.roleCatalog.acreditador.description", "Institution that certifies courses and mentorships"),
  };
  const grantedRoleIds = new Set(user?.userRoles?.map((ur: any) => ur.roleId) || []);
  const pendingRoleRequestIds = new Set(
    roleRequests?.filter((request) => request.status === "pending").map((request) => request.roleId) || []
  );
  const requestedRole = allRoles?.find((role) => role.id === requestedRoleId);

  const getInitials = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return "U";
  };

  if (isLoading) {
    return <ProfileSkeleton />;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-semibold mb-2">{t("profile.title", "My Profile")}</h1>
          <p className="text-muted-foreground">
            {t("profile.subtitle", "Manage your personal and professional information.")}
          </p>
        </div>
        {!isEditing ? (
          <Button onClick={() => setIsEditing(true)} className="gap-2" data-testid="button-edit-profile">
            <Edit className="h-4 w-4" />
            {t("profile.editProfile", "Edit profile")}
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsEditing(false);
                form.reset();
              }}
              className="gap-2"
              data-testid="button-cancel-edit"
            >
              <X className="h-4 w-4" />
              {t("common.cancel", "Cancel")}
            </Button>
            <Button
              onClick={form.handleSubmit(onSubmit)}
              disabled={updateProfileMutation.isPending}
              className="gap-2"
              data-testid="button-save-profile"
            >
              <Save className="h-4 w-4" />
              {updateProfileMutation.isPending ? t("profile.saving", "Saving...") : t("common.save", "Save")}
            </Button>
          </div>
        )}
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Profile Header Card */}
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row items-start gap-6">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={user.profileImageUrl || undefined} alt={user.firstName || roleLabels.usuario} />
                  <AvatarFallback className="text-2xl">{getInitials()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <Badge 
                      variant="secondary" 
                      className={`${roleBadgeColors[userRole]}`}
                    >
                      {roleLabels[userRole]}
                    </Badge>
                    {user.profile?.profileStatus === 'complete' ? (
                      <Badge variant="secondary" className="bg-chart-2/10 text-chart-2">
                        {t("profile.profileComplete", "Complete profile")}
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-chart-4/10 text-chart-4">
                        {t("profile.profileIncomplete", "Incomplete profile")}
                      </Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("profile.firstName", "First name")}</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              disabled={!isEditing}
                              placeholder={t("profile.firstNamePlaceholder", "Your first name")}
                              data-testid="input-first-name"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("profile.lastName", "Last name")}</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              disabled={!isEditing}
                              placeholder={t("profile.lastNamePlaceholder", "Your last name")}
                              data-testid="input-last-name"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Professional Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-muted-foreground" />
                {t("profile.professionalInfo", "Professional Information")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("profile.professionalTitle", "Professional title")}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        disabled={!isEditing}
                        placeholder={t("profile.professionalTitlePlaceholder", "E.g: Social Entrepreneur, Engineer, Designer...")}
                        data-testid="input-title"
                      />
                    </FormControl>
                    <FormDescription>
                      {t("profile.professionalTitleHint", "Your main role or specialty.")}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="bio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("profile.bio", "Bio")}</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        disabled={!isEditing}
                        placeholder={t("profile.bioPlaceholder", "Tell us about yourself, your experience and what motivates you...")}
                        className="resize-none min-h-[100px]"
                        data-testid="textarea-bio"
                      />
                    </FormControl>
                    <FormDescription>
                      {t("profile.bioHint", "Maximum 500 characters.")}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="skills"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("profile.skills", "Skills")}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          disabled={!isEditing}
                          placeholder={t("profile.skillsPlaceholder", "E.g: Leadership, Design, Marketing...")}
                          data-testid="input-skills"
                        />
                      </FormControl>
                      <FormDescription>
                        {t("profile.skillsHint", "Separate each skill with a comma.")}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="interests"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("profile.interests", "Interests")}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          disabled={!isEditing}
                          placeholder={t("profile.interestsPlaceholder", "E.g: Education, Environment, Technology...")}
                          data-testid="input-interests"
                        />
                      </FormControl>
                      <FormDescription>
                        {t("profile.interestsHint", "Areas that interest you.")}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="linkedinUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Link2 className="h-4 w-4" />
                      {t("profile.linkedin", "LinkedIn")}
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        disabled={!isEditing}
                        placeholder={t("profile.linkedinPlaceholder", "https://linkedin.com/in/your-profile")}
                        data-testid="input-linkedin"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Location & Contact */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-muted-foreground" />
                {t("profile.locationContact", "Location & Contact")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("profile.country", "Country")}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          disabled={!isEditing}
                          placeholder={t("profile.countryPlaceholder", "E.g: Mexico")}
                          data-testid="input-country"
                        />
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
                      <FormLabel>{t("profile.city", "City")}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          disabled={!isEditing}
                          placeholder={t("profile.cityPlaceholder", "E.g: Mexico City")}
                          data-testid="input-city"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="timezone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      {t("profile.timezone", "Timezone")}
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={!isEditing}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-timezone">
                          <SelectValue placeholder={t("profile.selectTimezone", "Select your timezone")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {timezones.map((tz) => (
                          <SelectItem key={tz.value} value={tz.value}>
                            {tz.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex items-center gap-2 p-4 rounded-lg bg-muted/50">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{t("profile.email", "Email")}</p>
                  <p className="text-sm text-muted-foreground" data-testid="text-email">
                    {user.email || t("profile.notAvailable", "Not available")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </form>
      </Form>

      {/* Role Selection Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-muted-foreground" />
            {t("profile.myRoles", "My Roles")}
          </CardTitle>
          <CardDescription>
            {t("profile.myRolesHint", "Select the roles you want to play on the platform. You can have multiple roles.")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {allRoles?.map((role) => {
              const isGranted = grantedRoleIds.has(role.id);
              const canToggle = isImpactLabAdmin || isGranted;
              const isPending = pendingRoleRequestIds.has(role.id);
              
              return (
                <div
                  key={role.id}
                  className={`flex items-start gap-4 rounded-md border p-4 ${canToggle ? 'hover-elevate' : ''}`}
                  data-testid={`role-option-${role.name}`}
                >
                  <Checkbox
                    id={`role-${role.id}`}
                    checked={selectedRoles.includes(role.id)}
                    onCheckedChange={() => canToggle && handleRoleToggle(role.id)}
                    disabled={!canToggle}
                    className="mt-1"
                    data-testid={`checkbox-role-${role.name}`}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <label 
                        htmlFor={`role-${role.id}`}
                        className={`font-medium ${canToggle ? 'cursor-pointer' : ''}`}
                      >
                        {roleLabels[role.name] || role.name}
                      </label>
                      {selectedRoles.includes(role.id) ? <Badge variant="secondary">{t("profile.active", "Active")}</Badge> : null}
                      {isGranted && !selectedRoles.includes(role.id) ? <Badge variant="outline">{t("profile.granted", "Granted")}</Badge> : null}
                      {isPending ? <Badge variant="outline">{t("profile.pending", "Pending")}</Badge> : null}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {roleDescriptions[role.name] || role.description}
                    </p>
                  </div>
                  {canToggle ? (
                    selectedRoles.includes(role.id) ? <Check className="h-5 w-5 text-primary" /> : null
                  ) : isPending ? null : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenRoleRequest(role.id)}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      {t("profile.addRole", "Add role")}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-6 flex justify-end">
            <Button
              onClick={handleSaveRoles}
              disabled={!hasRoleChanges() || updateRolesMutation.isPending}
              data-testid="button-save-roles"
            >
              {updateRolesMutation.isPending ? (
                t("profile.saving", "Saving...")
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {t("profile.saveRoles", "Save Roles")}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isRoleRequestDialogOpen} onOpenChange={setIsRoleRequestDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("profile.requestRole", "Request role")}</DialogTitle>
            <DialogDescription>
              {requestedRole
                ? `${t("profile.requestRoleDescription", "Explain why you need this role")}: ${roleLabels[requestedRole.name] || requestedRole.name}`
                : t("profile.describeRequest", "Describe your request.")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="role-request-justification">{t("profile.justification", "Justification")}</Label>
              <Textarea
                id="role-request-justification"
                rows={5}
                value={roleRequestJustification}
                onChange={(event) => setRoleRequestJustification(event.target.value)}
                placeholder={t("profile.justificationPlaceholder", "Tell us your experience, why you need this role and how you'll use it.")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role-request-attachments">{t("profile.attachments", "Supporting attachments")}</Label>
              <Input
                id="role-request-attachments"
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp"
                onChange={(event) => {
                  void handleRoleRequestAttachments(event.target.files);
                }}
              />
              {isUploadingRoleAttachments ? (
                <p className="text-sm text-muted-foreground">{t("profile.uploadingAttachments", "Uploading attachments...")}</p>
              ) : null}
              {roleRequestAttachments.length > 0 ? (
                <div className="space-y-2 rounded-md border p-3 text-sm">
                  {roleRequestAttachments.map((attachment) => (
                    <div key={attachment.name} className="flex items-center gap-2 text-muted-foreground">
                      <Paperclip className="h-4 w-4" />
                      <span>{attachment.name}</span>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsRoleRequestDialogOpen(false)}>
              {t("common.cancel", "Cancel")}
            </Button>
            <Button type="button" onClick={handleSubmitRoleRequest} disabled={roleRequestMutation.isPending || isUploadingRoleAttachments}>
              {roleRequestMutation.isPending ? t("profile.sending", "Sending...") : t("profile.sendRequest", "Submit request")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <MentorProfileChat
        open={isMentorProfileChatOpen}
        onOpenChange={setIsMentorProfileChatOpen}
        onSection1Complete={handleMentorSection1Complete}
      />
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <Skeleton className="h-9 w-48 mb-2" />
          <Skeleton className="h-5 w-72" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-6">
            <Skeleton className="h-24 w-24 rounded-full" />
            <div className="flex-1 space-y-4">
              <div className="flex gap-2">
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-6 w-24" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-24 w-full" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
