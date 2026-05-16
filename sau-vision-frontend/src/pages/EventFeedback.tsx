import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { SURVEY_QUESTIONS, RATING_LABELS } from '../config/surveyQuestions';
import {
  Star, CheckCircle2, ArrowLeft, Loader2, Send,
  MessageSquare, ShieldAlert, ThumbsUp, ThumbsDown
} from 'lucide-react';

type Answers = Record<string, any>;

export default function EventFeedback() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();

  const [status, setStatus] = useState<'loading' | 'form' | 'submitting' | 'done' | 'already-submitted' | 'error'>('loading');
  const [answers, setAnswers] = useState<Answers>({});
  const [hoveredRating, setHoveredRating] = useState<Record<string, number>>({});
  const [errorMsg, setErrorMsg] = useState('');
  const [score, setScore] = useState<number | null>(null);
  const [eventTitle, setEventTitle] = useState('');

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const { data } = await api.get(`/survey/${bookingId}/my-status`);
        if (data.hasSubmitted) {
          setStatus('already-submitted');
        } else {
          setStatus('form');
        }
      } catch (err: any) {
        setErrorMsg(err.response?.data?.error || 'Could not load survey.');
        setStatus('error');
      }
    };
    checkStatus();
  }, [bookingId]);

  const setAnswer = (id: string, value: any) => {
    setAnswers(prev => ({ ...prev, [id]: value }));
  };

  const isComplete = () => {
    return SURVEY_QUESTIONS
      .filter(q => q.required)
      .every(q => {
        const val = answers[q.id];
        if (val === undefined || val === null) return false;
        if (q.type === 'text') return true; // text is never required to fill
        return val !== '';
      });
  };

  const handleSubmit = async () => {
    if (!isComplete()) return;
    setStatus('submitting');
    try {
      const { data } = await api.post(`/survey/${bookingId}/submit`, { answers });
      setScore(data.score);
      setStatus('done');
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || 'Submission failed.');
      setStatus('error');
    }
  };

  // ── Already submitted ─────────────────────────────────────────────────────
  if (status === 'already-submitted') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-6 sm:p-6 text-center animate-fade-in">
        <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center mb-6 border border-blue-500/20">
          <CheckCircle2 className="w-10 h-10 text-blue-400" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Already Submitted</h2>
        <p className="text-slate-500 dark:text-gray-400 text-sm mb-8">You have already sent your feedback for this event.</p>
        <button onClick={() => navigate('/dashboard')} className="btn-primary py-3 px-8">
          Back to Dashboard
        </button>
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (status === 'error') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-6 sm:p-6 text-center animate-fade-in">
        <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6 border border-red-500/20">
          <ShieldAlert className="w-10 h-10 text-red-400" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Cannot Load Survey</h2>
        <p className="text-slate-500 dark:text-gray-400 text-sm mb-8">{errorMsg}</p>
        <button onClick={() => navigate('/dashboard')} className="btn-primary py-3 px-8">
          Back to Dashboard
        </button>
      </div>
    );
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (status === 'loading' || status === 'submitting') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 text-electric-500 animate-spin" />
        <p className="text-slate-500 dark:text-gray-400 text-sm">
          {status === 'submitting' ? 'Submitting your feedback...' : 'Loading survey...'}
        </p>
      </div>
    );
  }

  // ── Success ───────────────────────────────────────────────────────────────
  if (status === 'done') {
    const starCount = score !== null ? Math.round(score / 20) : 0;
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-6 sm:p-6 text-center animate-fade-in">
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-emerald-500 blur-[40px] opacity-20 rounded-full" />
          <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center relative border border-emerald-500/30">
            <CheckCircle2 className="w-12 h-12 text-emerald-400" />
          </div>
        </div>
        <h2 className="text-3xl font-extrabold text-foreground mb-2">Thank You!</h2>
        <p className="text-emerald-400 font-medium mb-1">Your feedback has been recorded.</p>
        <p className="text-slate-400 dark:text-gray-500 text-sm mb-6">This helps the organizer improve future events.</p>

        {score !== null && (
          <div className="bg-card border border-border rounded-2xl px-8 py-5 mb-8 inline-flex flex-col items-center">
            <p className="text-xs text-slate-500 dark:text-gray-400 mb-2">Your overall rating</p>
            <div className="flex gap-1 mb-2">
              {[1,2,3,4,5].map(s => (
                <Star
                  key={s}
                  className={`w-6 h-6 ${s <= starCount ? 'text-amber-400 fill-amber-400' : 'text-gray-700'}`}
                />
              ))}
            </div>
            <p className="text-2xl font-bold text-foreground">{(score / 20).toFixed(1)} <span className="text-sm text-slate-400 dark:text-gray-500">/ 5.0</span></p>
          </div>
        )}

        <button onClick={() => navigate('/dashboard')} className="btn-primary py-3 px-8">
          Back to Dashboard
        </button>
      </div>
    );
  }

  // ── Survey Form ───────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="bg-white dark:bg-[#0a1322]/80 backdrop-blur-xl border-b border-slate-200 dark:border-white/5 px-4 sm:px-6 py-5">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border border-border flex items-center justify-center transition-colors shrink-0"
          >
            <ArrowLeft className="w-4 h-4 text-slate-500 dark:text-gray-400" />
          </button>
          <div>
            <p className="text-xs text-electric-400 font-semibold uppercase tracking-widest mb-0.5">Post-Event Survey</p>
            <h1 className="text-xl font-bold text-foreground">Rate this Event</h1>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-5">
        {/* Intro card */}
        <div className="bg-electric-500/5 border border-electric-500/20 rounded-2xl p-5">
          <div className="flex items-start gap-3">
            <MessageSquare className="w-5 h-5 text-electric-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-foreground mb-1">Your feedback matters!</p>
              <p className="text-xs text-slate-500 dark:text-gray-400">Your responses directly influence the organizer's reputation score on the platform. Please answer honestly.</p>
            </div>
          </div>
        </div>

        {/* Questions */}
        {SURVEY_QUESTIONS.map((q, idx) => (
          <div key={q.id} className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <div>
              <p className="text-xs text-electric-400 font-semibold uppercase tracking-widest mb-1">
                Q{idx + 1} {q.required ? '' : '· Optional'}
              </p>
              <h3 className="text-base font-bold text-foreground">{q.question}</h3>
              {q.description && <p className="text-xs text-slate-500 dark:text-gray-400 mt-1">{q.description}</p>}
            </div>

            {/* Rating question */}
            {q.type === 'rating' && (
              <div>
                <div className="flex gap-2 flex-wrap">
                  {Array.from({ length: (q.max! - q.min!) + 1 }, (_, i) => i + q.min!).map(val => {
                    const isHovered = (hoveredRating[q.id] ?? 0) >= val;
                    const isSelected = (answers[q.id] ?? 0) >= val;
                    const active = isHovered || (!hoveredRating[q.id] && isSelected);
                    return (
                      <button
                        key={val}
                        onMouseEnter={() => setHoveredRating(prev => ({ ...prev, [q.id]: val }))}
                        onMouseLeave={() => setHoveredRating(prev => { const n = {...prev}; delete n[q.id]; return n; })}
                        onClick={() => setAnswer(q.id, val)}
                        className="group flex flex-col items-center gap-1 p-1"
                      >
                        <Star
                          className={`w-9 h-9 transition-all ${
                            active
                              ? 'text-amber-400 fill-amber-400 scale-110'
                              : 'text-gray-700 hover:text-amber-300'
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>
                {answers[q.id] && (
                  <p className="text-sm text-amber-400 font-semibold mt-2">
                    {answers[q.id]} / {q.max} — {RATING_LABELS[answers[q.id]]}
                  </p>
                )}
              </div>
            )}

            {/* Boolean question */}
            {q.type === 'boolean' && (
              <div className="flex gap-3">
                <button
                  onClick={() => setAnswer(q.id, true)}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border font-semibold text-sm transition-all ${
                    answers[q.id] === true
                      ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                      : 'bg-slate-100 dark:bg-white/5 border-border text-slate-500 dark:text-gray-400 hover:bg-slate-200 dark:hover:bg-white/10 hover:text-foreground'
                  }`}
                >
                  <ThumbsUp className="w-4 h-4" /> Yes
                </button>
                <button
                  onClick={() => setAnswer(q.id, false)}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border font-semibold text-sm transition-all ${
                    answers[q.id] === false
                      ? 'bg-red-500/20 border-red-500/40 text-red-400'
                      : 'bg-slate-100 dark:bg-white/5 border-border text-slate-500 dark:text-gray-400 hover:bg-slate-200 dark:hover:bg-white/10 hover:text-foreground'
                  }`}
                >
                  <ThumbsDown className="w-4 h-4" /> No
                </button>
              </div>
            )}

            {/* Text question */}
            {q.type === 'text' && (
              <textarea
                value={answers[q.id] || ''}
                onChange={e => setAnswer(q.id, e.target.value)}
                placeholder="Write your feedback here..."
                rows={3}
                className="w-full bg-slate-100 dark:bg-white/5 border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-electric-500 focus:border-electric-500 resize-none transition-all"
              />
            )}
          </div>
        ))}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={!isComplete()}
          className={`w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-3 transition-all ${
            isComplete()
              ? 'bg-white text-navy-900 hover:bg-electric-400 hover:scale-[1.01] shadow-[0_0_20px_rgba(59,130,246,0.2)]'
              : 'bg-white/10 text-slate-400 dark:text-gray-500 cursor-not-allowed'
          }`}
        >
          <Send className="w-5 h-5" />
          Submit Feedback
        </button>

        {!isComplete() && (
          <p className="text-center text-xs text-slate-400 dark:text-gray-500">
            Please answer all required questions to submit.
          </p>
        )}
      </div>
    </div>
  );
}
