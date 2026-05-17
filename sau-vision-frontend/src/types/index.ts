export interface Room {
  id: string;
  name: string;
  capacity: number;
  hardware: string[];
  status: 'available' | 'occupied' | 'maintenance';
  occupancyPercent: number;
  location: string;
  lat?: number;
  lng?: number;
  facultyName?: string;
  facultyId?: string;
  bookings?: Booking[];
}

export interface CampusEvent {
  id: string;
  title: string;
  description?: string;
  date: string; // YYYY-MM-DD
  category: 'academic' | 'sports' | 'social' | 'other';
  mapX: number; // CRS.Simple pixel X
  mapY: number; // CRS.Simple pixel Y
}


export interface Booking {
  id: string;
  roomId: string;
  studentId: string;
  studentName?: string;
  roomName?: string;
  roomLocation?: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  endTime?: string; // HH:mm
  scheduledStart?: string; // ISO string from backend
  scheduledEnd?: string; // ISO string from backend
  duration: number; // in minutes
  status: 'pending' | 'approved' | 'rejected' | 'active' | 'completed' | 'ghosted' | 'cancelled';
  title?: string;
  description?: string;
  expectedAttendees?: number;
  studentComment?: string;
  lab?: Room;
  qrToken?: string;
  reliabilityScore: number; // 0-100
  student?: {
    id: string;
    universityId: string;
    fullName: string;
    faculty: string;
    programme?: string;
  };
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'student' | 'admin';
  eventRating?: number;
}

export interface OccupancyEvent {
  roomId: string;
  percent: number;
  timestamp: string;
}

export interface ReclamationAlert {
  type: 'RECLAMATION_ALERT';
  bookingId: string;
  minutesLeft: number;
}

export interface BookingSecuredEvent {
  type: 'BOOKING_SECURED';
  bookingId: string;
}

export interface ROIReport {
  bookingId: string;
  sessionTitle: string;
  roomName: string;
  timeRange: string;
  expectedAttendance: number;
  actualAttendance: number;
  efficiency: number; // percentage
  timeline: { time: string; count: number }[];
}

export interface IntentExtraction {
  capacity: number;
  hardware: string;
  date: string;
  time: string;
}
