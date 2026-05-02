import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar, Plus, ChevronLeft, ChevronRight, Clock, MapPin,
  Users, X, Check, Trash2, CalendarDays, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAppStore } from "@/store/app";

const CALENDAR_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#ef4444",
  "#f97316", "#f59e0b", "#10b981", "#06b6d4", "#3b82f6",
];

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];

interface Meeting {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  location?: string;
  attendees: string[];
  color: string;
  isAllDay: boolean;
  calendarSource: string;
  status: string;
}

const DEMO_MEETINGS: Meeting[] = [
  {
    id: "1",
    title: "Team standup",
    startTime: new Date(new Date().setHours(9, 0, 0, 0)).toISOString(),
    endTime: new Date(new Date().setHours(9, 30, 0, 0)).toISOString(),
    attendees: ["alice@team.com", "bob@team.com"],
    color: "#6366f1",
    isAllDay: false,
    calendarSource: "nexus",
    status: "confirmed",
  },
  {
    id: "2",
    title: "Product review",
    startTime: new Date(new Date().setHours(14, 0, 0, 0)).toISOString(),
    endTime: new Date(new Date().setHours(15, 0, 0, 0)).toISOString(),
    location: "Conference Room B",
    attendees: ["product@team.com", "design@team.com", "eng@team.com"],
    color: "#8b5cf6",
    isAllDay: false,
    calendarSource: "nexus",
    status: "confirmed",
  },
  {
    id: "3",
    title: "Q2 Planning",
    startTime: (() => {
      const d = new Date(); d.setDate(d.getDate() + 2); d.setHours(10, 0, 0, 0); return d.toISOString();
    })(),
    endTime: (() => {
      const d = new Date(); d.setDate(d.getDate() + 2); d.setHours(12, 0, 0, 0); return d.toISOString();
    })(),
    description: "Quarterly planning session. Review OKRs and set goals for Q2.",
    attendees: ["ceo@team.com", "cto@team.com"],
    color: "#10b981",
    isAllDay: false,
    calendarSource: "nexus",
    status: "confirmed",
  },
];

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

export default function MeetingsView() {
  const { currentWorkspaceId } = useAppStore();
  const [view, setView] = useState<"month" | "week" | "list">("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [meetings, setMeetings] = useState<Meeting[]>(DEMO_MEETINGS);
  const [selectedDay, setSelectedDay] = useState<Date | null>(new Date());
  const [showCreate, setShowCreate] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [calendarConnects, setCalendarConnects] = useState<Record<string, boolean>>({});

  // Create form state
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newDate, setNewDate] = useState(new Date().toISOString().split("T")[0]);
  const [newStartTime, setNewStartTime] = useState("09:00");
  const [newEndTime, setNewEndTime] = useState("10:00");
  const [newLocation, setNewLocation] = useState("");
  const [newAttendees, setNewAttendees] = useState("");
  const [newColor, setNewColor] = useState(CALENDAR_COLORS[0]);
  const [newAllDay, setNewAllDay] = useState(false);

  // Calendar grid for month view
  const getMonthDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days: (Date | null)[] = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));
    while (days.length % 7 !== 0) days.push(null);
    return days;
  };

  const getMeetingsForDay = (day: Date) =>
    meetings.filter(m => isSameDay(new Date(m.startTime), day));

  const createMeeting = () => {
    if (!newTitle.trim()) { toast.error("Title required"); return; }
    const startTime = newAllDay
      ? new Date(`${newDate}T00:00:00`).toISOString()
      : new Date(`${newDate}T${newStartTime}`).toISOString();
    const endTime = newAllDay
      ? new Date(`${newDate}T23:59:59`).toISOString()
      : new Date(`${newDate}T${newEndTime}`).toISOString();

    const meeting: Meeting = {
      id: `local-${Date.now()}`,
      title: newTitle,
      description: newDesc || undefined,
      startTime,
      endTime,
      location: newLocation || undefined,
      attendees: newAttendees.split(",").map(s => s.trim()).filter(Boolean),
      color: newColor,
      isAllDay: newAllDay,
      calendarSource: "nexus",
      status: "confirmed",
    };
    setMeetings(prev => [...prev, meeting]);
    setShowCreate(false);
    setNewTitle(""); setNewDesc(""); setNewLocation(""); setNewAttendees("");
    toast.success("Meeting created");
  };

  const deleteMeeting = (id: string) => {
    setMeetings(prev => prev.filter(m => m.id !== id));
    setSelectedMeeting(null);
    toast.success("Meeting deleted");
  };

  const connectCalendar = (name: string) => {
    setCalendarConnects(prev => ({ ...prev, [name]: true }));
    toast.success(`${name} calendar connected! Syncing...`);
  };

  const days = getMonthDays();
  const today = new Date();
  const upcomingMeetings = meetings
    .filter(m => new Date(m.startTime) >= today)
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  const selectedDayMeetings = selectedDay ? getMeetingsForDay(selectedDay) : [];

  return (
    <div className="flex h-full">
      {/* Left panel */}
      <div className="w-72 flex-shrink-0 border-r border-border/40 flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-primary" />
            <span className="font-semibold text-sm">Meetings</span>
          </div>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* Mini calendar */}
        <div className="p-3 border-b border-border/40">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-foreground">
              {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
            </span>
            <div className="flex gap-1">
              <Button size="icon" variant="ghost" className="h-5 w-5"
                onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}>
                <ChevronLeft className="h-3 w-3" />
              </Button>
              <Button size="icon" variant="ghost" className="h-5 w-5"
                onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}>
                <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            {DAYS_OF_WEEK.map(d => (
              <div key={d} className="text-[9px] text-muted-foreground/50 text-center py-0.5 font-medium">{d[0]}</div>
            ))}
            {days.map((day, i) => {
              if (!day) return <div key={`empty-${i}`} />;
              const hasMeetings = getMeetingsForDay(day).length > 0;
              const isToday = isSameDay(day, today);
              const isSelected = selectedDay && isSameDay(day, selectedDay);
              return (
                <button
                  key={i}
                  onClick={() => setSelectedDay(day)}
                  className={cn(
                    "h-6 w-6 text-[11px] rounded-full flex items-center justify-center mx-auto transition-all relative",
                    isToday && !isSelected && "bg-primary/20 text-primary font-bold",
                    isSelected && "bg-primary text-primary-foreground font-bold",
                    !isToday && !isSelected && "hover:bg-accent text-foreground/80"
                  )}
                >
                  {day.getDate()}
                  {hasMeetings && !isSelected && (
                    <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Calendar connections */}
        <div className="p-3 border-b border-border/40">
          <div className="text-[10px] text-muted-foreground/50 uppercase font-semibold tracking-wider mb-2">Connect Calendars</div>
          {[
            { name: "Google Calendar", emoji: "📅", color: "text-blue-400" },
            { name: "Apple Calendar", emoji: "🍎", color: "text-gray-400" },
            { name: "Outlook", emoji: "📧", color: "text-blue-500" },
          ].map((cal) => (
            <button
              key={cal.name}
              onClick={() => connectCalendar(cal.name)}
              className={cn(
                "w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-colors",
                calendarConnects[cal.name]
                  ? "text-green-400 bg-green-500/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
              )}
            >
              <span>{cal.emoji}</span>
              <span className="flex-1 text-left">{cal.name}</span>
              {calendarConnects[cal.name]
                ? <Check className="h-3 w-3" />
                : <Plus className="h-3 w-3 opacity-50" />}
            </button>
          ))}
        </div>

        {/* Upcoming */}
        <ScrollArea className="flex-1">
          <div className="p-3 space-y-1.5">
            <div className="text-[10px] text-muted-foreground/50 uppercase font-semibold tracking-wider mb-2">Upcoming</div>
            {upcomingMeetings.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">No upcoming meetings</p>
            )}
            {upcomingMeetings.slice(0, 8).map(m => (
              <button
                key={m.id}
                onClick={() => setSelectedMeeting(m)}
                className={cn(
                  "w-full flex items-start gap-2 p-2 rounded-lg text-left transition-all",
                  selectedMeeting?.id === m.id ? "bg-accent" : "hover:bg-accent/50"
                )}
              >
                <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: m.color }} />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-foreground truncate">{m.title}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    {new Date(m.startTime).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                    {!m.isAllDay && ` · ${formatTime(m.startTime)}`}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-border/40">
          <div className="flex items-center gap-3">
            <div className="flex gap-1">
              <Button size="icon" variant="ghost" className="h-7 w-7"
                onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" className="h-7 w-7"
                onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <h2 className="font-bold text-foreground">
              {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h2>
            <Button size="sm" variant="outline" className="h-6 text-xs px-2"
              onClick={() => { setCurrentDate(new Date()); setSelectedDay(new Date()); }}>
              Today
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex bg-muted/40 rounded-lg p-0.5 gap-0.5">
              {(["month", "week", "list"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-xs font-medium transition-all capitalize",
                    view === v ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {v}
                </button>
              ))}
            </div>
            <Button size="sm" onClick={() => setShowCreate(true)}
              className="gap-1.5 bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white border-0 h-7 text-xs">
              <Plus className="h-3.5 w-3.5" /> New Meeting
            </Button>
          </div>
        </div>

        {/* Calendar grid (month view) */}
        {view === "month" && (
          <div className="flex-1 overflow-auto">
            <div className="grid grid-cols-7 border-b border-border/40">
              {DAYS_OF_WEEK.map(d => (
                <div key={d} className="py-2 text-center text-xs font-semibold text-muted-foreground border-r last:border-r-0 border-border/40">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 flex-1" style={{ minHeight: "calc(100% - 32px)" }}>
              {days.map((day, i) => {
                const dayMeetings = day ? getMeetingsForDay(day) : [];
                const isToday = day && isSameDay(day, today);
                const isSelected = day && selectedDay && isSameDay(day, selectedDay);
                const isCurrentMonth = day && day.getMonth() === currentDate.getMonth();
                return (
                  <div
                    key={i}
                    onClick={() => day && setSelectedDay(day)}
                    className={cn(
                      "min-h-24 border-r border-b last:border-r-0 border-border/20 p-1 cursor-pointer transition-colors",
                      !isCurrentMonth && "opacity-30",
                      isSelected && "bg-primary/5",
                      !isSelected && day && "hover:bg-accent/30"
                    )}
                  >
                    {day && (
                      <>
                        <div className={cn(
                          "w-6 h-6 rounded-full flex items-center justify-center text-xs mb-1 font-medium",
                          isToday ? "bg-primary text-primary-foreground" : "text-foreground/70"
                        )}>
                          {day.getDate()}
                        </div>
                        <div className="space-y-0.5">
                          {dayMeetings.slice(0, 3).map(m => (
                            <button
                              key={m.id}
                              onClick={(e) => { e.stopPropagation(); setSelectedMeeting(m); }}
                              className="w-full text-left px-1.5 py-0.5 rounded text-[10px] font-medium truncate text-white"
                              style={{ background: m.color }}
                            >
                              {m.isAllDay ? m.title : `${formatTime(m.startTime)} ${m.title}`}
                            </button>
                          ))}
                          {dayMeetings.length > 3 && (
                            <div className="text-[10px] text-muted-foreground px-1">+{dayMeetings.length - 3} more</div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* List view */}
        {view === "list" && (
          <ScrollArea className="flex-1 p-6">
            <div className="max-w-2xl mx-auto space-y-6">
              {upcomingMeetings.length === 0 && (
                <div className="text-center py-16 text-muted-foreground">
                  <CalendarDays className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p className="text-sm">No upcoming meetings</p>
                  <Button size="sm" className="mt-4" onClick={() => setShowCreate(true)}>Schedule a meeting</Button>
                </div>
              )}
              {upcomingMeetings.map(m => (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-4 p-4 rounded-xl border border-border bg-card hover:border-border/80 cursor-pointer transition-all group"
                  onClick={() => setSelectedMeeting(m)}
                >
                  <div className="w-1 h-full min-h-14 rounded-full flex-shrink-0" style={{ background: m.color }} />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-foreground">{m.title}</div>
                    {m.description && <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{m.description}</div>}
                    <div className="flex items-center gap-4 mt-2 flex-wrap">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {new Date(m.startTime).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
                        {!m.isAllDay && ` · ${formatTime(m.startTime)} – ${formatTime(m.endTime)}`}
                      </div>
                      {m.location && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" />{m.location}
                        </div>
                      )}
                      {m.attendees.length > 0 && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Users className="h-3 w-3" />{m.attendees.length} attendee{m.attendees.length > 1 ? "s" : ""}
                        </div>
                      )}
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive flex-shrink-0"
                    onClick={(e) => { e.stopPropagation(); deleteMeeting(m.id); }}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </motion.div>
              ))}
            </div>
          </ScrollArea>
        )}

        {/* Week view (simplified) */}
        {view === "week" && (
          <ScrollArea className="flex-1 p-6">
            <div className="max-w-3xl mx-auto">
              <div className="grid grid-cols-7 gap-2">
                {Array.from({ length: 7 }, (_, i) => {
                  const d = new Date(currentDate);
                  const day = d.getDay();
                  d.setDate(d.getDate() - day + i);
                  const dayMeetings = getMeetingsForDay(d);
                  const isToday = isSameDay(d, today);
                  return (
                    <div key={i} className={cn("rounded-xl border p-2", isToday ? "border-primary/40 bg-primary/5" : "border-border/40")}>
                      <div className={cn("text-xs font-semibold mb-2", isToday ? "text-primary" : "text-muted-foreground")}>
                        {DAYS_OF_WEEK[i]}
                        <span className={cn("block text-lg font-bold", isToday ? "text-primary" : "text-foreground")}>{d.getDate()}</span>
                      </div>
                      <div className="space-y-1">
                        {dayMeetings.map(m => (
                          <button key={m.id} onClick={() => setSelectedMeeting(m)}
                            className="w-full text-left px-1.5 py-1 rounded text-[10px] font-medium text-white truncate"
                            style={{ background: m.color }}>
                            {m.isAllDay ? m.title : `${formatTime(m.startTime)}`}
                            <div className="truncate">{m.title}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Meeting detail panel */}
      <AnimatePresence>
        {selectedMeeting && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="flex-shrink-0 border-l border-border/40 overflow-hidden"
          >
            <div className="w-80 h-full flex flex-col">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ background: selectedMeeting.color }} />
                  <span className="font-semibold text-sm text-foreground truncate">{selectedMeeting.title}</span>
                </div>
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setSelectedMeeting(null)}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Clock className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-sm text-foreground font-medium">
                        {new Date(selectedMeeting.startTime).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                      </div>
                      {!selectedMeeting.isAllDay && (
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {formatTime(selectedMeeting.startTime)} – {formatTime(selectedMeeting.endTime)}
                        </div>
                      )}
                      {selectedMeeting.isAllDay && <div className="text-xs text-muted-foreground mt-0.5">All day</div>}
                    </div>
                  </div>
                  {selectedMeeting.location && (
                    <div className="flex items-center gap-3">
                      <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-sm text-foreground">{selectedMeeting.location}</span>
                    </div>
                  )}
                  {selectedMeeting.description && (
                    <div className="text-sm text-muted-foreground leading-relaxed p-3 bg-muted/30 rounded-lg">
                      {selectedMeeting.description}
                    </div>
                  )}
                  {selectedMeeting.attendees.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Attendees</span>
                      </div>
                      <div className="space-y-1.5">
                        {selectedMeeting.attendees.map(a => (
                          <div key={a} className="flex items-center gap-2 text-sm">
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-[10px] font-bold text-white">
                              {a[0].toUpperCase()}
                            </div>
                            <span className="text-foreground">{a}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="pt-2 flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1 h-7 text-xs gap-1.5">
                      <Sparkles className="h-3 w-3" /> AI Agenda
                    </Button>
                    <Button
                      size="sm" variant="ghost"
                      className="h-7 text-xs text-muted-foreground hover:text-destructive"
                      onClick={() => deleteMeeting(selectedMeeting.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </ScrollArea>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create meeting modal */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowCreate(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-background border border-border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-border/40">
                <h3 className="font-bold text-foreground">New Meeting</h3>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setShowCreate(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <ScrollArea className="max-h-[70vh]">
                <div className="p-5 space-y-4">
                  <div>
                    <Input
                      autoFocus
                      placeholder="Meeting title"
                      value={newTitle}
                      onChange={e => setNewTitle(e.target.value)}
                      className="h-9 text-sm font-medium border-border/60"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <Label className="text-xs text-muted-foreground">Date</Label>
                      <Input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} className="mt-1 h-8 text-sm" />
                    </div>
                    <div className="flex items-center gap-2 pt-5">
                      <Switch checked={newAllDay} onCheckedChange={setNewAllDay} />
                      <span className="text-xs text-muted-foreground">All day</span>
                    </div>
                  </div>
                  {!newAllDay && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs text-muted-foreground">Start time</Label>
                        <Input type="time" value={newStartTime} onChange={e => setNewStartTime(e.target.value)} className="mt-1 h-8 text-sm" />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">End time</Label>
                        <Input type="time" value={newEndTime} onChange={e => setNewEndTime(e.target.value)} className="mt-1 h-8 text-sm" />
                      </div>
                    </div>
                  )}
                  <div>
                    <Label className="text-xs text-muted-foreground">Location (optional)</Label>
                    <Input value={newLocation} onChange={e => setNewLocation(e.target.value)} placeholder="Room, Zoom link, etc." className="mt-1 h-8 text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Attendees (comma-separated emails)</Label>
                    <Input value={newAttendees} onChange={e => setNewAttendees(e.target.value)} placeholder="alice@co.com, bob@co.com" className="mt-1 h-8 text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Description</Label>
                    <Textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Meeting agenda or notes..." className="mt-1 min-h-16 text-sm resize-none" />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Color</Label>
                    <div className="flex gap-2 mt-1.5">
                      {CALENDAR_COLORS.map(c => (
                        <button key={c} onClick={() => setNewColor(c)}
                          className={cn("w-5 h-5 rounded-full transition-transform", newColor === c && "ring-2 ring-offset-1 ring-offset-background scale-125")}
                          style={{ background: c }} />
                      ))}
                    </div>
                  </div>
                </div>
              </ScrollArea>
              <div className="flex gap-2 p-4 border-t border-border/40">
                <Button variant="outline" size="sm" onClick={() => setShowCreate(false)} className="flex-1">Cancel</Button>
                <Button size="sm" onClick={createMeeting} disabled={!newTitle.trim()}
                  className="flex-1 bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white border-0">
                  Create Meeting
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
