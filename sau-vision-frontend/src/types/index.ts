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
}


export interface Booking {
  id: string;
  roomId: string;
  studentId: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  duration: number; // in minutes
  status: 'pending' | 'approved' | 'rejected' | 'active' | 'completed' | 'released';
  qrToken?: string;
  reliabilityScore: number; // 0-100
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'student' | 'admin';
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
