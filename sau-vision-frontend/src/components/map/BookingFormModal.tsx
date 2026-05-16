import React, { useState, useEffect } from 'react';
import api from '../../lib/api';
import {
  X, Calendar, Clock, Users, FileText, Loader2,
  CheckCircle2, AlertCircle
} from 'lucide-react';

interface TimeSlot {
  scheduledStart: string;
  scheduledEnd: string;
}

interface BookingFormModalProps {
  lab: {
    id: string;
    name: string;
    capacity: number;
    location: string;
    hardware: string[];
  };
  existingBooking?: {
    id: string;
    title: string;
    description?: string;
    expectedAttendees?: number;
    date: string;
    startTime: string;
    endTime: string;
  };
  onClose: () => void;
  onSuccess: () => void;
}

// Generate 30-minute time slots from 09:00 to 18:30
const TIME_OPTIONS = Array.from({ length: 20 }, (_, i) => {
  const totalMins = 9 * 60 + i * 30;
  const h = Math.floor(totalMins / 60).toString().padStart(2, '0');
  const m = (totalMins % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
});

function toISO(date: string, time: string) {
  return new Date(`${date}T${time}:00`).toISOString();
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Helper to get smart default slots
function getNextAvailableTimeSlot() {
  const now = new Date();
  let h = now.getHours();
  let m = now.getMinutes();

  if (m < 30) {
    m = 30;
  } else {
    h += 1;
    m = 0;
  }

  // Clamp to our business hours 09:00 to 18:30
  if (h < 9) { h = 9; m = 0; }
  // If we calculate a start time past 18:00, clamp it to 18:00 so a 30m slot fits before 18:30
  if (h > 18 || (h === 18 && m > 0)) { h = 18; m = 0; }

  const startH = h.toString().padStart(2, '0');
  const startM = m.toString().padStart(2, '0');
  const startTime = `${startH}:${startM}`;

  let endH = h + 2;
  let endM = m;
  if (endH > 18 || (endH === 18 && endM > 30)) { endH = 18; endM = 30; }
  const endTime = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;

  return { startTime, endTime };
}

export default function BookingFormModal({ lab, existingBooking, onClose, onSuccess }: BookingFormModalProps) {
  const todayDateObj = new Date();
  // Format as YYYY-MM-DD using local time
  const today = todayDateObj.toLocaleDateString('en-CA');
  const defaultSlots = getNextAvailableTimeSlot();

  // If it's very late (past 18:00), default to tomorrow since bookings end at 18:30
  const isLate = todayDateObj.getHours() >= 18;
  const defaultDate = isLate ? new Date(todayDateObj.getTime() + 86400000).toLocaleDateString('en-CA') : today;
  const initialStart = isLate ? '09:00' : defaultSlots.startTime;
  const initialEnd = isLate ? '11:00' : defaultSlots.endTime;

  const [date, setDate] = useState(existingBooking?.date || defaultDate);
  const [startTime, setStartTime] = useState(existingBooking?.startTime || initialStart);
  const [endTime, setEndTime] = useState(existingBooking?.endTime || initialEnd);

  // When startTime changes, push endTime forward if it's no longer after startTime
  const handleStartTimeChange = (newStart: string) => {
    setStartTime(newStart);
    // Find the next slot after newStart in TIME_OPTIONS and set as endTime if current endTime is invalid
    if (endTime <= newStart) {
      const nextSlot = TIME_OPTIONS.find(t => t > newStart);
      setEndTime(nextSlot || '18:30');
    }
  };
  const [title, setTitle] = useState(existingBooking?.title || '');
  const [description, setDescription] = useState(existingBooking?.description || '');
  const [attendees, setAttendees] = useState(existingBooking?.expectedAttendees || 1);
  const [bookedSlots, setBookedSlots] = useState<TimeSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const fetchSlots = async () => {
      setSlotsLoading(true);
      try {
        const { data } = await api.get(`/labs/${lab.id}/slots?date=${date}`);
        setBookedSlots(data.slots || []);
      } catch {
        setBookedSlots([]);
      } finally {
        setSlotsLoading(false);
      }
    };
    fetchSlots();
  }, [lab.id, date]);

  const isSlotTaken = (slotTime: string) => {
    const slotStart = new Date(`${date}T${slotTime}:00`);
    return bookedSlots.some((b: any) => {
      if (existingBooking && b.bookingId === existingBooking.id) return false;
      const bStart = new Date(b.scheduledStart);
      const bEnd = new Date(b.scheduledEnd);
      return slotStart >= bStart && slotStart < bEnd;
    });
  };

  const getAvailableTimeOptions = () => {
    const now = new Date();
    const currentH = now.getHours();
    const currentM = now.getMinutes();
    const isToday = date === today;

    return TIME_OPTIONS.map(t => {
      let isPast = false;
      if (isToday) {
        const [h, m] = t.split(':').map(Number);
        if (h < currentH || (h === currentH && m < currentM)) {
          isPast = true;
        }
      }
      return { time: t, isPast };
    });
  };

  const timeOptionsWithPast = getAvailableTimeOptions();
  const isEndBeforeStart = endTime <= startTime;
  const isAttendeesOverCapacity = attendees > lab.capacity;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) { setError('Please add a session title.'); return; }
    if (isEndBeforeStart) { setError('End time must be after start time.'); return; }
    if (isAttendeesOverCapacity) { setError(`Max capacity is ${lab.capacity} for this lab.`); return; }

    const selectedStartObj = new Date(`${date}T${startTime}:00`);
    if (selectedStartObj < new Date()) {
      setError('You cannot request a booking in the past.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        labId: lab.id,
        title: title.trim(),
        description: description.trim() || undefined,
        expectedAttendees: attendees,
        scheduledStart: toISO(date, startTime),
        scheduledEnd: toISO(date, endTime),
      };

      if (existingBooking) {
        await api.patch(`/bookings/${existingBooking.id}`, payload);
      } else {
        await api.post('/bookings', payload);
      }
      setSuccess(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1800);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to submit booking. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ backdropFilter: 'blur(8px)', backgroundColor: 'rgba(0,0,0,0.7)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-lg bg-[#0d1829] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-slide-up">

        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-white/5 bg-white/[0.02]">
          <div>
            <h2 className="text-white font-bold text-lg">{lab.name}</h2>
            <p className="text-gray-400 text-xs mt-0.5">{lab.location}</p>
            <div className="flex flex-wrap gap-1 mt-2">
              {lab.hardware.slice(0, 4).map((hw) => (
                <span key={hw} className="text-[10px] px-2 py-0.5 rounded-full bg-electric-500/10 text-electric-400 border border-electric-500/20">
                  {hw}
                </span>
              ))}
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-500 hover:text-white hover:bg-white/5 rounded-lg transition-colors shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Success state */}
        {success ? (
          <div className="p-10 flex flex-col items-center text-center animate-fade-in">
            <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">
              {existingBooking ? 'Booking Updated!' : 'Request Submitted!'}
            </h3>
            <p className="text-gray-400 text-sm max-w-xs">
              {existingBooking
                ? 'Your pending booking has been successfully updated.'
                : 'Your booking is pending admin approval. You\'ll see it in your Dashboard once reviewed.'}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-5">

            {/* Error Banner */}
            {error && (
              <div className="flex items-start gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                {error}
              </div>
            )}

            {/* Date */}
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3 h-3" /> Date
              </label>
              <input
                type="date"
                value={date}
                min={today}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-electric-500 [color-scheme:dark]"
              />
            </div>

            {/* Time Row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5 flex items-center gap-1.5">
                  <Clock className="w-3 h-3" /> Start Time
                </label>
                <select
                  value={startTime}
                  onChange={(e) => handleStartTimeChange(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-electric-500"
                >
                  {timeOptionsWithPast.map(({ time: t, isPast }) => {
                    const taken = isSlotTaken(t);
                    const disabled = taken || isPast;
                    return (
                      <option key={t} value={t} disabled={disabled} className={disabled ? 'text-gray-400' : 'text-black'}>
                        {t}{taken ? ' — taken' : isPast ? ' — past' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5 flex items-center gap-1.5">
                  <Clock className="w-3 h-3" /> End Time
                </label>
                <select
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-electric-500"
                >
                  {timeOptionsWithPast.map(({ time: t, isPast }) => {
                    // Disable if the slot is at or before the start time, or if it's in the past today
                    const isBeforeOrEqualStart = t <= startTime;
                    const disabled = isBeforeOrEqualStart || (isPast && date === today);
                    return (
                      <option key={t} value={t} disabled={disabled} className={disabled ? 'text-gray-400' : 'text-black'}>
                        {t}{isBeforeOrEqualStart ? ' — before start' : isPast && date === today ? ' — past' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            {/* Booked Slots Indicator */}
            {slotsLoading ? (
              <div className="text-xs text-gray-500 flex items-center gap-1.5">
                <Loader2 className="w-3 h-3 animate-spin" /> Checking availability...
              </div>
            ) : bookedSlots.length > 0 ? (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                <p className="text-xs text-amber-400 font-medium mb-1">⚠ Already booked on this day:</p>
                <div className="flex flex-wrap gap-1.5">
                  {bookedSlots.map((s) => (
                    <span key={s.scheduledStart} className="text-xs bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30">
                      {formatTime(s.scheduledStart)} – {formatTime(s.scheduledEnd)}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-xs text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-3 h-3" /> All slots available on this date
              </div>
            )}

            {/* Attendees */}
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5 flex items-center gap-1.5">
                <Users className="w-3 h-3" /> Expected Attendees
                <span className="text-gray-600">/ max {lab.capacity}</span>
              </label>
              <input
                type="number"
                min={1}
                max={lab.capacity}
                value={attendees}
                onChange={(e) => setAttendees(Math.min(Number(e.target.value), lab.capacity))}
                className={`w-full bg-white/5 border rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-electric-500 ${isAttendeesOverCapacity ? 'border-red-500/50' : 'border-white/10'}`}
              />
              <div className="mt-2 h-1.5 w-full bg-navy-800 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${(attendees / lab.capacity) > 0.8 ? 'bg-amber-500' : 'bg-electric-500'}`}
                  style={{ width: `${Math.min((attendees / lab.capacity) * 100, 100)}%` }}
                />
              </div>
            </div>

            {/* Session Title */}
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5 flex items-center gap-1.5">
                <FileText className="w-3 h-3" /> Session Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. MATLAB Workshop, Study Group"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-electric-500"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Description (optional)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Any extra details for the admin..."
                rows={2}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-electric-500 resize-none"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={onClose} className="flex-1 btn-ghost py-2.5 text-sm">
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || isEndBeforeStart}
                className="flex-1 btn-primary py-2.5 text-sm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSubmitting
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
                  : existingBooking ? 'Save Changes' : 'Request Booking'
                }
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
