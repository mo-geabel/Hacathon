import React, { useState } from 'react';
import type { CampusEvent } from '../../types';
import { X, MapPin, Calendar, Tag, FileText, Loader2 } from 'lucide-react';

interface EventFormModalProps {
  mapX: number;
  mapY: number;
  onSubmit: (data: Omit<CampusEvent, 'id'>) => Promise<void>;
  onCancel: () => void;
}

const CATEGORIES: { value: CampusEvent['category']; label: string; color: string }[] = [
  { value: 'academic', label: '🎓 Academic', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  { value: 'sports', label: '⚽ Sports', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  { value: 'social', label: '🎉 Social', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  { value: 'other', label: '📌 Other', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
];

export default function EventFormModal({ mapX, mapY, onSubmit, onCancel }: EventFormModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState<CampusEvent['category']>('academic');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    setError('');
    setIsSubmitting(true);
    try {
      await onSubmit({ title: title.trim(), description: description.trim() || undefined, date, category, mapX, mapY });
    } catch {
      setError('Failed to save event. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ backdropFilter: 'blur(8px)', backgroundColor: 'rgba(0,0,0,0.6)' }}>
      <div className="w-full max-w-md bg-[#0f1a2e] border border-border rounded-2xl shadow-2xl overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-white/5 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-electric-500/20 flex items-center justify-center">
              <MapPin className="w-4 h-4 text-electric-400" />
            </div>
            <div>
              <h2 className="text-foreground font-semibold text-sm">Add Campus Event</h2>
              <p className="text-slate-400 dark:text-gray-500 text-xs">Pinned at x:{Math.round(mapX)}, y:{Math.round(mapY)}</p>
            </div>
          </div>
          <button onClick={onCancel} className="p-1.5 text-slate-400 dark:text-gray-500 hover:text-foreground hover:bg-slate-100 dark:bg-white/5 rounded-lg transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-gray-400 mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3 h-3" /> Event Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Basketball Practice"
              className="w-full bg-slate-100 dark:bg-white/5 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-electric-500 focus:border-transparent transition-all"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-gray-400 mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="What's happening? (optional)"
              rows={2}
              className="w-full bg-slate-100 dark:bg-white/5 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-electric-500 focus:border-transparent transition-all resize-none"
            />
          </div>

          {/* Date */}
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-gray-400 mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3 h-3" /> Date *
            </label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full bg-slate-100 dark:bg-white/5 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-electric-500 focus:border-transparent transition-all [color-scheme:dark]"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-gray-400 mb-1.5 flex items-center gap-1.5">
              <Tag className="w-3 h-3" /> Category
            </label>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setCategory(cat.value)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                    category === cat.value
                      ? cat.color + ' ring-1 ring-white/20'
                      : 'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-gray-400 border-border hover:bg-slate-200 dark:hover:bg-white/10'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 btn-ghost py-2.5 text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 btn-primary py-2.5 text-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
              ) : (
                'Pin Event'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
