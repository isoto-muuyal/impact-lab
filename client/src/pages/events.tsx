import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar as CalendarIcon, MapPin, Users, Plus, Video, Loader2, Check, X, List } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { EventWithDetails } from "@shared/schema";
import EventCalendar from "@/components/EventCalendar";

const createEventSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  eventDate: z.string().min(1, "Start date is required"),
  endDate: z.string().optional(),
  location: z.string().optional(),
  isOnline: z.boolean().default(false),
  meetingUrl: z.string().optional(),
  maxAttendees: z.string().optional(),
  category: z.string().optional(),
});

type CreateEventFormData = z.infer<typeof createEventSchema>;

export default function Events() {
  const { user, hasAnyRole } = useAuth();
  const { t } = useTranslation();
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [activeView, setActiveView] = useState<'list' | 'calendar'>('list');
  
  const canCreate = hasAnyRole(['facilitador', 'mentor']);

  const form = useForm<CreateEventFormData>({
    resolver: zodResolver(createEventSchema),
    defaultValues: {
      title: "",
      description: "",
      eventDate: "",
      endDate: "",
      location: "",
      isOnline: false,
      meetingUrl: "",
      maxAttendees: "",
      category: "",
    },
  });

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
      form.reset();
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

  const onSubmit = (data: CreateEventFormData) => {
    const eventData = {
      title: data.title,
      description: data.description || null,
      eventDate: data.eventDate,
      endDate: data.endDate || null,
      location: data.location || null,
      isOnline: data.isOnline ? 'true' : 'false',
      meetingUrl: data.meetingUrl || null,
      maxAttendees: data.maxAttendees ? parseInt(data.maxAttendees) : null,
      category: data.category || null,
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
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-events-title">{t('events.title')}</h1>
          <p className="text-muted-foreground">{t('events.subtitle')}</p>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
          <Tabs value={activeView} onValueChange={(v) => setActiveView(v as 'list' | 'calendar')} className="mr-2">
            <TabsList>
              <TabsTrigger value="list" data-testid="tab-list-view">
                <List className="h-4 w-4 mr-1" />
                {t('events.listView')}
              </TabsTrigger>
              <TabsTrigger value="calendar" data-testid="tab-calendar-view">
                <CalendarIcon className="h-4 w-4 mr-1" />
                {t('events.calendarView')}
              </TabsTrigger>
            </TabsList>
          </Tabs>
          
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
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('events.form.title')}</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-event-title" />
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
                        <FormLabel>{t('events.form.description')}</FormLabel>
                        <FormControl>
                          <Textarea {...field} rows={3} data-testid="input-event-description" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="eventDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('events.form.startDate')}</FormLabel>
                          <FormControl>
                            <Input type="datetime-local" {...field} data-testid="input-event-date" />
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
                          <FormLabel>{t('events.form.endDate')}</FormLabel>
                          <FormControl>
                            <Input type="datetime-local" {...field} data-testid="input-event-end-date" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('events.form.category')}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-event-category">
                              <SelectValue placeholder={t('events.form.selectCategory')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="workshop">{t('events.categories.workshop')}</SelectItem>
                            <SelectItem value="webinar">{t('events.categories.webinar')}</SelectItem>
                            <SelectItem value="networking">{t('events.categories.networking')}</SelectItem>
                            <SelectItem value="training">{t('events.categories.training')}</SelectItem>
                            <SelectItem value="conference">{t('events.categories.conference')}</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="isOnline"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center gap-2">
                        <FormControl>
                          <Checkbox 
                            checked={field.value} 
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-is-online" 
                          />
                        </FormControl>
                        <FormLabel className="cursor-pointer !mt-0">{t('events.form.isOnline')}</FormLabel>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('events.form.location')}</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-event-location" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="meetingUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('events.form.meetingUrl')}</FormLabel>
                        <FormControl>
                          <Input type="url" {...field} data-testid="input-meeting-url" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="maxAttendees"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('events.form.maxAttendees')}</FormLabel>
                        <FormControl>
                          <Input type="number" min="1" {...field} data-testid="input-max-attendees" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
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
              </Form>
            </DialogContent>
          </Dialog>
        )}
        </div>
      </div>

      {activeView === 'calendar' ? (
        <EventCalendar />
      ) : (
        events?.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <CalendarIcon className="h-12 w-12 text-muted-foreground mb-4" />
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
                      <CalendarIcon className="h-4 w-4" />
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
        )
      )}
    </div>
  );
}
