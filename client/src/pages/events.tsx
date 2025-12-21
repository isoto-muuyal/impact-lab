import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar, MapPin, Users, Clock, Plus, Globe, Video, Loader2, Check, X } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { EventWithDetails } from "@shared/schema";

export default function Events() {
  const { user, hasAnyRole } = useAuth();
  const { t } = useTranslation();
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  
  const canCreate = hasAnyRole(['facilitador', 'mentor']);

  const { data: events, isLoading } = useQuery<EventWithDetails[]>({
    queryKey: ['/api/events'],
  });

  const createEventMutation = useMutation({
    mutationFn: async (eventData: any) => {
      const response = await apiRequest('POST', '/api/events', eventData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/events'] });
      setIsCreateDialogOpen(false);
      toast({ title: t('events.created') });
    },
    onError: () => {
      toast({ title: t('events.createError'), variant: "destructive" });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (eventId: string) => {
      const response = await apiRequest('POST', `/api/events/${eventId}/register`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/events'] });
      toast({ title: t('events.registered') });
    },
    onError: () => {
      toast({ title: t('events.registerError'), variant: "destructive" });
    },
  });

  const cancelRegistrationMutation = useMutation({
    mutationFn: async (eventId: string) => {
      await apiRequest('DELETE', `/api/events/${eventId}/register`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/events'] });
      toast({ title: t('events.registrationCancelled') });
    },
    onError: () => {
      toast({ title: t('events.cancelError'), variant: "destructive" });
    },
  });

  const publishEventMutation = useMutation({
    mutationFn: async (eventId: string) => {
      const response = await apiRequest('POST', `/api/events/${eventId}/publish`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/events'] });
      toast({ title: t('events.published') });
    },
    onError: () => {
      toast({ title: t('events.publishError'), variant: "destructive" });
    },
  });

  const handleCreateEvent = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const eventData = {
      title: formData.get('title') as string,
      description: formData.get('description') as string,
      eventDate: formData.get('eventDate') as string,
      endDate: formData.get('endDate') as string || null,
      location: formData.get('location') as string,
      isOnline: formData.get('isOnline') === 'on' ? 'true' : 'false',
      meetingUrl: formData.get('meetingUrl') as string,
      maxAttendees: formData.get('maxAttendees') ? parseInt(formData.get('maxAttendees') as string) : null,
      category: formData.get('category') as string,
      status: 'draft',
    };
    
    createEventMutation.mutate(eventData);
  };

  const isUserRegistered = (event: EventWithDetails) => {
    return event.registrations?.some(r => r.userId === user?.id && r.status === 'registered');
  };

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      draft: "bg-muted text-muted-foreground",
      published: "bg-chart-2/10 text-chart-2",
      cancelled: "bg-destructive/10 text-destructive",
      completed: "bg-primary/10 text-primary",
    };
    return statusColors[status] || statusColors.draft;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-events-title">{t('events.title')}</h1>
          <p className="text-muted-foreground">{t('events.subtitle')}</p>
        </div>
        
        {canCreate && (
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-event">
                <Plus className="h-4 w-4 mr-2" />
                {t('events.create')}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{t('events.createNew')}</DialogTitle>
                <DialogDescription>{t('events.createDescription')}</DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleCreateEvent} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">{t('events.form.title')}</Label>
                  <Input id="title" name="title" required data-testid="input-event-title" />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">{t('events.form.description')}</Label>
                  <Textarea id="description" name="description" rows={3} data-testid="input-event-description" />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="eventDate">{t('events.form.startDate')}</Label>
                    <Input id="eventDate" name="eventDate" type="datetime-local" required data-testid="input-event-date" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endDate">{t('events.form.endDate')}</Label>
                    <Input id="endDate" name="endDate" type="datetime-local" data-testid="input-event-end-date" />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="category">{t('events.form.category')}</Label>
                  <Select name="category">
                    <SelectTrigger data-testid="select-event-category">
                      <SelectValue placeholder={t('events.form.selectCategory')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="workshop">{t('events.categories.workshop')}</SelectItem>
                      <SelectItem value="webinar">{t('events.categories.webinar')}</SelectItem>
                      <SelectItem value="networking">{t('events.categories.networking')}</SelectItem>
                      <SelectItem value="training">{t('events.categories.training')}</SelectItem>
                      <SelectItem value="conference">{t('events.categories.conference')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center gap-2">
                  <Checkbox id="isOnline" name="isOnline" data-testid="checkbox-is-online" />
                  <Label htmlFor="isOnline" className="cursor-pointer">{t('events.form.isOnline')}</Label>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="location">{t('events.form.location')}</Label>
                  <Input id="location" name="location" data-testid="input-event-location" />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="meetingUrl">{t('events.form.meetingUrl')}</Label>
                  <Input id="meetingUrl" name="meetingUrl" type="url" data-testid="input-meeting-url" />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="maxAttendees">{t('events.form.maxAttendees')}</Label>
                  <Input id="maxAttendees" name="maxAttendees" type="number" min="1" data-testid="input-max-attendees" />
                </div>
                
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    {t('common.cancel')}
                  </Button>
                  <Button type="submit" disabled={createEventMutation.isPending} data-testid="button-submit-event">
                    {createEventMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {t('events.create')}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {events?.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">{t('events.empty')}</h3>
            <p className="text-muted-foreground text-center">{t('events.emptyDescription')}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {events?.map((event) => (
            <Card key={event.id} data-testid={`card-event-${event.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-lg">{event.title}</CardTitle>
                  <Badge className={getStatusBadge(event.status || 'draft')}>
                    {t(`events.status.${event.status}`)}
                  </Badge>
                </div>
                {event.category && (
                  <Badge variant="outline" className="w-fit">
                    {t(`events.categories.${event.category}`)}
                  </Badge>
                )}
              </CardHeader>
              
              <CardContent className="space-y-3">
                {event.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{event.description}</p>
                )}
                
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>{format(new Date(event.eventDate), "PPP 'a las' p", { locale: es })}</span>
                  </div>
                  
                  {event.location && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>{event.location}</span>
                    </div>
                  )}
                  
                  {event.isOnline === 'true' && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Video className="h-4 w-4" />
                      <span>{t('events.online')}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>
                      {event.registrationCount || 0}
                      {event.maxAttendees && ` / ${event.maxAttendees}`}
                      {' '}{t('events.attendees')}
                    </span>
                  </div>
                </div>
                
                {event.createdBy && (
                  <div className="flex items-center gap-2 pt-2 border-t">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={event.createdBy.profileImageUrl || undefined} />
                      <AvatarFallback className="text-xs">
                        {event.createdBy.firstName?.[0] || event.createdBy.email?.[0] || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs text-muted-foreground">
                      {t('events.organizedBy')} {event.createdBy.firstName || event.createdBy.email}
                    </span>
                  </div>
                )}
              </CardContent>
              
              <CardFooter className="flex gap-2">
                {event.status === 'draft' && canCreate && event.createdByUserId === user?.id && (
                  <Button 
                    size="sm" 
                    onClick={() => publishEventMutation.mutate(event.id)}
                    disabled={publishEventMutation.isPending}
                    data-testid={`button-publish-${event.id}`}
                  >
                    {t('events.publish')}
                  </Button>
                )}
                
                {event.status === 'published' && (
                  isUserRegistered(event) ? (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => cancelRegistrationMutation.mutate(event.id)}
                      disabled={cancelRegistrationMutation.isPending}
                      data-testid={`button-cancel-registration-${event.id}`}
                    >
                      <X className="h-4 w-4 mr-1" />
                      {t('events.cancelRegistration')}
                    </Button>
                  ) : (
                    <Button 
                      size="sm"
                      onClick={() => registerMutation.mutate(event.id)}
                      disabled={registerMutation.isPending || !!(event.maxAttendees && event.registrationCount && event.registrationCount >= event.maxAttendees)}
                      data-testid={`button-register-${event.id}`}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      {t('events.register')}
                    </Button>
                  )
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
