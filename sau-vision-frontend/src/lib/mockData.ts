import type { Room, Booking, ROIReport } from '../types';

export const mockRooms: Room[] = [
  { id: 'r1', name: 'Lab 101', capacity: 30, hardware: ['Computers', 'Projector'], status: 'available', occupancyPercent: 20, location: 'Building A, Floor 1' },
  { id: 'r2', name: 'GPU Farm', capacity: 15, hardware: ['GPU Workstations'], status: 'occupied', occupancyPercent: 95, location: 'Building B, Floor 2' },
  { id: 'r3', name: 'Seminar Room A', capacity: 50, hardware: ['Smartboard', 'Mic System'], status: 'available', occupancyPercent: 0, location: 'Building A, Floor 2' },
  { id: 'r4', name: 'Mac Lab', capacity: 25, hardware: ['Macs'], status: 'available', occupancyPercent: 45, location: 'Building C, Floor 1' },
  { id: 'r5', name: 'Study Pod 1', capacity: 4, hardware: ['Whiteboard'], status: 'occupied', occupancyPercent: 100, location: 'Library, Floor 1' },
  { id: 'r6', name: 'Study Pod 2', capacity: 4, hardware: ['Whiteboard'], status: 'available', occupancyPercent: 25, location: 'Library, Floor 1' },
  { id: 'r7', name: 'Robotics Lab', capacity: 20, hardware: ['3D Printers', 'IoT Kits'], status: 'maintenance', occupancyPercent: 0, location: 'Building D, Basement' },
  { id: 'r8', name: 'Lecture Hall', capacity: 150, hardware: ['Projector', 'PA System'], status: 'occupied', occupancyPercent: 85, location: 'Main Building' },
];

export const mockBookings: Booking[] = [
  { id: 'b1', roomId: 'r1', studentId: 's1', date: '2026-05-15', time: '14:00', duration: 120, status: 'pending', reliabilityScore: 92 },
  { id: 'b2', roomId: 'r2', studentId: 's2', date: '2026-05-15', time: '15:30', duration: 60, status: 'approved', qrToken: 'mock-qr-token-b2', reliabilityScore: 85 },
  { id: 'b3', roomId: 'r5', studentId: 's3', date: '2026-05-15', time: '10:00', duration: 180, status: 'active', qrToken: 'mock-qr-token-b3', reliabilityScore: 99 },
  { id: 'b4', roomId: 'r8', studentId: 's4', date: '2026-05-16', time: '09:00', duration: 90, status: 'pending', reliabilityScore: 45 },
  { id: 'b5', roomId: 'r4', studentId: 's1', date: '2026-05-14', time: '13:00', duration: 120, status: 'completed', reliabilityScore: 95 },
];

export const mockROIReport: ROIReport = {
  bookingId: 'b5',
  sessionTitle: 'iOS Development Workshop',
  roomName: 'Mac Lab',
  timeRange: '13:00 - 15:00',
  expectedAttendance: 20,
  actualAttendance: 24,
  efficiency: 120, // 24/20 * 100
  timeline: [
    { time: '13:00', count: 5 },
    { time: '13:10', count: 18 },
    { time: '13:20', count: 22 },
    { time: '13:30', count: 24 },
    { time: '14:00', count: 24 },
    { time: '14:30', count: 23 },
    { time: '14:50', count: 15 },
    { time: '15:00', count: 0 },
  ]
};

// Helper for simulating API calls with delay
export const mockDelay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
