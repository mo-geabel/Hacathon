import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import {
  ArrowLeft, Users, CheckCircle2, Clock, Calendar,
  MapPin, Search, Download, Loader2, ShieldAlert,
  Star, ThumbsUp, ThumbsDown, MessageSquare, BarChart2
} from 'lucide-react';

interface Student {
  id: string;
  fullName: string;
  universityId: string;
  email: string;
  department: string;
  gpa: number;
  eventRating: number;
}

interface Registration {
  id: string;
  status: 'registered' | 'attended' | 'no_show';
  checkInTime: string | null;
  registeredAt: string;
  student: Student;
}

interface EventSummary {
  bookingId: string;
  title: string;
  scheduledStart: string;
  scheduledEnd: string;
  totalRegistered: number;
  totalAttended: number;
  lab: { name: string; faculty?: { name: string } } | null;
  registrations: Registration[];
}

export default function EventAttendees() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [data, setData] = useState<EventSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'attended' | 'registered'>('all');
  const [surveyResults, setSurveyResults] = useState<any>(null);
  const [showSurvey, setShowSurvey] = useState(false);

  useEffect(() => {
    const fetchAttendees = async () => {
      try {
        const { data: res } = await api.get(`/registrations/booking/${bookingId}`);
        setData(res);
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to load participants.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchAttendees();
    // Also fetch survey results
    api.get(`/survey/${bookingId}/results`)
      .then(res => setSurveyResults(res.data))
      .catch(() => {}); // silently ignore if no results yet
  }, [bookingId]);

  const filtered = data?.registrations.filter(reg => {
    const matchesSearch =
      reg.student.fullName.toLowerCase().includes(search.toLowerCase()) ||
      reg.student.universityId.toLowerCase().includes(search.toLowerCase()) ||
      reg.student.department.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filterStatus === 'all' || reg.status === filterStatus;
    return matchesSearch && matchesFilter;
  }) ?? [];

  const handleExportCSV = () => {
    if (!data) return;
    const header = 'Name,University ID,Department,Status,Check-In Time\n';
    const rows = data.registrations.map(r =>
      `"${r.student.fullName}","${r.student.universityId}","${r.student.department}","${r.status}","${r.checkInTime ? new Date(r.checkInTime).toLocaleString() : '-'}"`
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `attendees-${bookingId?.slice(0, 8)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-electric-500 animate-spin" />
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────────
  if (error || !data) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4 border border-red-500/20">
          <ShieldAlert className="w-8 h-8 text-red-400" />
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">Access Denied</h2>
        <p className="text-slate-500 dark:text-gray-400 text-sm mb-6">{error}</p>
        <button onClick={() => navigate('/dashboard')} className="btn-primary py-3 px-6">
          Back to Dashboard
        </button>
      </div>
    );
  }

  const start = new Date(data.scheduledStart);
  const end = new Date(data.scheduledEnd);
  const attendanceRate = data.totalRegistered > 0
    ? Math.round((data.totalAttended / data.totalRegistered) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-[#0a1322]/80 backdrop-blur-xl border-b border-slate-200 dark:border-white/5 px-6 py-5">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="w-9 h-9 rounded-full bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border border-border flex items-center justify-center transition-colors shrink-0"
          >
            <ArrowLeft className="w-4 h-4 text-slate-500 dark:text-gray-400" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-electric-400 font-semibold uppercase tracking-widest mb-0.5">Event Participants</p>
            <h1 className="text-xl font-bold text-foreground truncate">{data.title || 'Untitled Event'}</h1>
          </div>
          <button
            onClick={handleExportCSV}
            className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl bg-electric-500/10 border border-electric-500/20 text-electric-400 hover:bg-electric-500/20 transition-all text-sm font-semibold shrink-0"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* ── Event Info ───────────────────────────────────────────────────── */}
        <div className="bg-card border border-border rounded-2xl p-5 flex flex-wrap gap-4">
          <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-gray-300">
            <Calendar className="w-4 h-4 text-electric-400 shrink-0" />
            <span>
              {start.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
              {' · '}
              {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – {end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          {data.lab && (
            <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-gray-300">
              <MapPin className="w-4 h-4 text-electric-400 shrink-0" />
              <span>{data.lab.name}{data.lab.faculty ? ` · ${data.lab.faculty.name}` : ''}</span>
            </div>
          )}
        </div>

        {/* ── Stats ────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-card border border-border rounded-2xl p-5 text-center">
            <div className="text-3xl font-extrabold text-foreground mb-1">{data.totalRegistered}</div>
            <div className="text-xs text-slate-500 dark:text-gray-400 font-medium">Registered</div>
          </div>
          <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-5 text-center">
            <div className="text-3xl font-extrabold text-emerald-400 mb-1">{data.totalAttended}</div>
            <div className="text-xs text-slate-500 dark:text-gray-400 font-medium">Attended</div>
          </div>
          <div className="bg-card border border-border rounded-2xl p-5 text-center">
            <div className="text-3xl font-extrabold text-electric-400 mb-1">{attendanceRate}%</div>
            <div className="text-xs text-slate-500 dark:text-gray-400 font-medium">Show Rate</div>
          </div>
        </div>

        {/* ── Attendance Bar ───────────────────────────────────────────────── */}
        {data.totalRegistered > 0 && (
          <div className="bg-card border border-border rounded-2xl p-5">
            <div className="flex justify-between text-xs text-slate-500 dark:text-gray-400 mb-2">
              <span>Attendance Progress</span>
              <span className="font-semibold text-foreground">{data.totalAttended} / {data.totalRegistered}</span>
            </div>
            <div className="h-3 bg-background rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all rounded-full"
                style={{ width: `${attendanceRate}%` }}
              />
            </div>
          </div>
        )}

        {/* ── Survey Results (organizer only) ──────────────────────────────── */}
        {surveyResults && (
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <button
              onClick={() => setShowSurvey(s => !s)}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-100 dark:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-3">
                <BarChart2 className="w-5 h-5 text-electric-400" />
                <div className="text-left">
                  <p className="font-bold text-foreground text-sm">Survey Results</p>
                  <p className="text-xs text-slate-500 dark:text-gray-400">{surveyResults.totalResponses} response{surveyResults.totalResponses !== 1 ? 's' : ''}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {surveyResults.averageRating !== null && (
                  <div className="flex items-center gap-1.5">
                    <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                    <span className="font-bold text-foreground text-sm">{surveyResults.averageRating.toFixed(1)}</span>
                    <span className="text-xs text-slate-400 dark:text-gray-500">/ 5</span>
                  </div>
                )}
                <span className="text-slate-400 dark:text-gray-500 text-xs">{showSurvey ? '▲' : '▼'}</span>
              </div>
            </button>

            {showSurvey && surveyResults.totalResponses > 0 && (
              <div className="px-5 pb-5 border-t border-slate-200 dark:border-white/5 pt-4 space-y-5">
                {Object.entries(surveyResults.perQuestion).map(([qId, q]: [string, any]) => (
                  <div key={qId}>
                    <p className="text-xs font-semibold text-slate-600 dark:text-gray-300 mb-2">{q.question}</p>

                    {q.type === 'rating' && (
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          {[1,2,3,4,5].map(s => (
                            <Star key={s} className={`w-5 h-5 ${s <= Math.round(q.average) ? 'text-amber-400 fill-amber-400' : 'text-gray-700'}`} />
                          ))}
                          <span className="text-sm font-bold text-foreground ml-1">{q.average?.toFixed(1)}</span>
                          <span className="text-xs text-slate-400 dark:text-gray-500">({q.responses} votes)</span>
                        </div>
                        <div className="flex gap-1 mt-2">
                          {q.distribution?.map((d: any) => (
                            <div key={d.value} className="flex-1 text-center">
                              <div className="h-10 bg-background rounded relative overflow-hidden">
                                {q.responses > 0 && (
                                  <div
                                    className="absolute bottom-0 left-0 right-0 bg-amber-500/60 rounded"
                                    style={{ height: `${(d.count / q.responses) * 100}%` }}
                                  />
                                )}
                              </div>
                              <p className="text-[10px] text-slate-400 dark:text-gray-500 mt-1">{d.value}★</p>
                              <p className="text-[10px] text-slate-500 dark:text-gray-400 font-bold">{d.count}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {q.type === 'boolean' && (
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <div className="flex items-center gap-1.5 text-emerald-400 text-sm font-semibold">
                            <ThumbsUp className="w-4 h-4" /> {q.yesCount} Yes ({q.yesPercent}%)
                          </div>
                          <div className="flex items-center gap-1.5 text-red-400 text-sm font-semibold">
                            <ThumbsDown className="w-4 h-4" /> {q.noCount} No
                          </div>
                        </div>
                        <div className="h-2 bg-background rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${q.yesPercent}%` }} />
                        </div>
                      </div>
                    )}

                    {q.type === 'text' && q.comments?.length > 0 && (
                      <div className="space-y-2">
                        {q.comments.map((c: string, i: number) => (
                          <div key={i} className="flex items-start gap-2 bg-slate-100 dark:bg-white/5 rounded-xl px-3 py-2.5">
                            <MessageSquare className="w-3.5 h-3.5 text-slate-400 dark:text-gray-500 shrink-0 mt-0.5" />
                            <p className="text-xs text-slate-600 dark:text-gray-300">{c}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {showSurvey && surveyResults.totalResponses === 0 && (
              <p className="text-center text-xs text-slate-400 dark:text-gray-500 py-6 border-t border-slate-200 dark:border-white/5">
                No survey responses yet.
              </p>
            )}
          </div>
        )}

        {/* ── Search & Filter ──────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-gray-500 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by name, ID or department..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-card border border-border rounded-xl pl-9 pr-4 py-3 text-sm text-foreground placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-electric-500 focus:border-electric-500 transition-all"
            />
          </div>
          <div className="flex gap-2">
            {(['all', 'attended', 'registered'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilterStatus(f)}
                className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all capitalize ${
                  filterStatus === f
                    ? 'bg-electric-500/20 text-electric-400 border border-electric-500/30'
                    : 'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-gray-400 border border-slate-200 dark:border-white/5 hover:bg-slate-200 dark:hover:bg-white/10'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* ── Participants List ────────────────────────────────────────────── */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400 dark:text-gray-500">
            <Users className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="font-medium">No participants found</p>
            <p className="text-sm mt-1">
              {data.totalRegistered === 0
                ? 'No one has registered for this event yet.'
                : 'Try adjusting your search or filter.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((reg, idx) => (
              <div
                key={reg.id}
                className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${
                  reg.status === 'attended'
                    ? 'bg-emerald-500/5 border-emerald-500/20'
                    : reg.status === 'no_show'
                    ? 'bg-red-500/5 border-red-500/20'
                    : 'bg-card border-slate-200 dark:border-white/5 hover:border-border'
                }`}
              >
                {/* Avatar / Number */}
                <div className={`w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                  reg.status === 'attended'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20'
                    : 'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-gray-400 border border-border'
                }`}>
                  {reg.status === 'attended'
                    ? <CheckCircle2 className="w-5 h-5" />
                    : <span>{idx + 1}</span>
                  }
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-foreground text-sm truncate">{reg.student.fullName}</p>
                    <span className="text-[10px] bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-gray-400 border border-border px-2 py-0.5 rounded-full font-mono">
                      {reg.student.universityId}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5 truncate">{reg.student.department}</p>
                  {reg.checkInTime && (
                    <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Checked in at {new Date(reg.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}
                </div>

                {/* Status Badge */}
                <div className={`shrink-0 text-xs font-bold px-3 py-1.5 rounded-full border ${
                  reg.status === 'attended'
                    ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                    : reg.status === 'no_show'
                    ? 'text-red-400 bg-red-500/10 border-red-500/20'
                    : 'text-amber-400 bg-amber-500/10 border-amber-500/20'
                }`}>
                  {reg.status === 'attended' ? '✓ Attended' : reg.status === 'no_show' ? '✗ No Show' : '⏳ Registered'}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Mobile Export Button */}
        <button
          onClick={handleExportCSV}
          className="sm:hidden w-full flex items-center justify-center gap-2 py-3 bg-electric-500/10 border border-electric-500/20 text-electric-400 rounded-xl font-semibold text-sm hover:bg-electric-500/20 transition-all"
        >
          <Download className="w-4 h-4" />
          Export Attendees CSV
        </button>
      </div>
    </div>
  );
}
