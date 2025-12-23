import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Calendar, MapPin, Video, Users } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, addMonths, subMonths, type Locale } from "date-fns";
import { es, enUS, fr, pt, ar, zhCN } from "date-fns/locale";
import type { EventWithDetails } from "@shared/schema";

const getLocale = (lang: string): Locale => {
  const locales: Record<string, Locale> = {
    es,
    en: enUS,
    fr,
    pt,
    ar,
    zh: zhCN,
  };
  return locales[lang] || es;
};

const getWeekDays = (lang: string): string[] => {
  const weekDaysByLang: Record<string, string[]> = {
    es: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'],
    en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    fr: ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'],
    pt: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'],
    ar: ['أحد', 'إثن', 'ثلا', 'أرب', 'خمي', 'جمع', 'سبت'],
    zh: ['日', '一', '二', '三', '四', '五', '六'],
  };
  return weekDaysByLang[lang] || weekDaysByLang.es;
};

const eventTypeColors: Record<string, string> = {
  general: "bg-primary/10 text-primary border-primary/20",
  acceleration: "bg-chart-1/10 text-chart-1 border-chart-1/20",
  workshop: "bg-chart-2/10 text-chart-2 border-chart-2/20",
  mentorship_session: "bg-chart-3/10 text-chart-3 border-chart-3/20",
  demo_day: "bg-chart-4/10 text-chart-4 border-chart-4/20",
  pitch_practice: "bg-chart-5/10 text-chart-5 border-chart-5/20",
  networking: "bg-accent/50 text-accent-foreground border-accent/30",
};

interface EventCalendarProps {
  onEventClick?: (event: EventWithDetails) => void;
}

export default function EventCalendar({ onEventClick }: EventCalendarProps) {
  const { t, language } = useTranslation();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  
  const locale = getLocale(language);
  const weekDays = getWeekDays(language);
  
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;

  const { data: events, isLoading } = useQuery<EventWithDetails[]>({
    queryKey: ['/api/events/calendar', year, month],
    queryFn: async () => {
      const response = await fetch(`/api/events/calendar/${year}/${month}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch calendar events');
      return response.json();
    },
  });

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const startDayOfWeek = monthStart.getDay();
  const paddingDays = Array(startDayOfWeek).fill(null);

  const goToPreviousMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const goToNextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  };

  const getEventsForDay = (day: Date) => {
    if (!events) return [];
    return events.filter(event => isSameDay(new Date(event.eventDate), day));
  };

  const selectedDayEvents = selectedDate ? getEventsForDay(selectedDate) : [];

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <Card className="flex-1">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-4">
            <CardTitle className="text-lg">
              {format(currentDate, 'MMMM yyyy', { locale })}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={goToToday} data-testid="button-today">
                {t('calendar.today')}
              </Button>
              <Button size="icon" variant="ghost" onClick={goToPreviousMonth} data-testid="button-prev-month">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" onClick={goToNextMonth} data-testid="button-next-month">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1 mb-2">
            {weekDays.map((day) => (
              <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
                {day}
              </div>
            ))}
          </div>
          
          <div className="grid grid-cols-7 gap-1">
            {paddingDays.map((_, index) => (
              <div key={`padding-${index}`} className="h-14 p-1" />
            ))}
            
            {daysInMonth.map((day) => {
              const dayEvents = getEventsForDay(day);
              const isSelected = selectedDate && isSameDay(day, selectedDate);
              const isTodayDate = isToday(day);
              
              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelectedDate(day)}
                  className={`h-14 p-1 rounded-md text-sm transition-colors hover-elevate
                    ${isSelected ? 'bg-primary/10 ring-2 ring-primary' : ''}
                    ${isTodayDate && !isSelected ? 'bg-accent/50' : ''}
                    ${!isSameMonth(day, currentDate) ? 'text-muted-foreground/50' : ''}
                  `}
                  data-testid={`calendar-day-${format(day, 'yyyy-MM-dd')}`}
                >
                  <div className={`font-medium ${isTodayDate ? 'text-primary' : ''}`}>
                    {format(day, 'd')}
                  </div>
                  {dayEvents.length > 0 && (
                    <div className="flex gap-0.5 justify-center mt-0.5">
                      {dayEvents.slice(0, 3).map((event, i) => (
                        <div
                          key={event.id}
                          className={`w-1.5 h-1.5 rounded-full ${
                            eventTypeColors[event.eventType || 'general']?.split(' ')[0] || 'bg-primary'
                          }`}
                        />
                      ))}
                      {dayEvents.length > 3 && (
                        <span className="text-[10px] text-muted-foreground">+{dayEvents.length - 3}</span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card className="lg:w-80">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">
            {selectedDate 
              ? format(selectedDate, 'EEEE, d MMMM', { locale })
              : t('calendar.selectDay')
            }
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!selectedDate ? (
            <p className="text-sm text-muted-foreground">{t('calendar.selectDayDescription')}</p>
          ) : selectedDayEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Calendar className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">{t('calendar.noEvents')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {selectedDayEvents.map((event) => (
                <button
                  key={event.id}
                  onClick={() => onEventClick?.(event)}
                  className="w-full text-left p-3 rounded-md border hover-elevate"
                  data-testid={`calendar-event-${event.id}`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="font-medium text-sm line-clamp-1">{event.title}</span>
                    <Badge className={eventTypeColors[event.eventType || 'general']} variant="outline">
                      {t(`events.types.${event.eventType || 'general'}`)}
                    </Badge>
                  </div>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>{format(new Date(event.eventDate), 'p', { locale })}</span>
                    </div>
                    {event.location && (
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        <span className="line-clamp-1">{event.location}</span>
                      </div>
                    )}
                    {event.isOnline === 'true' && (
                      <div className="flex items-center gap-1">
                        <Video className="h-3 w-3" />
                        <span>{t('events.online')}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      <span>
                        {event.registrationCount || 0}
                        {event.maxAttendees && ` / ${event.maxAttendees}`}
                      </span>
                    </div>
                  </div>
                  {event.accelerationProgram && (
                    <Badge variant="secondary" className="mt-2 text-xs">
                      {event.accelerationProgram.name}
                    </Badge>
                  )}
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
