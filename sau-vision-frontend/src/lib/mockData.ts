import type { Room, Booking, ROIReport } from '../types';

export const mockRooms: Room[] = [
  { id: 'r1', name: 'Lab 101', capacity: 30, hardware: ['Computers', 'Projector'], status: 'available', occupancyPercent: 20, location: 'Building A, Floor 1', lat: 40.7437, lng: 30.3330 },
  { id: 'r2', name: 'Lab 203', capacity: 25, hardware: ['Computers', '3D Printers'], status: 'occupied', occupancyPercent: 85, location: 'Building B, Floor 2', lat: 40.7441, lng: 30.3338 },
  { id: 'r3', name: 'Conference Hall', capacity: 150, hardware: ['Projector', 'Audio System'], status: 'available', occupancyPercent: 5, location: 'Admin Block, Floor 1', lat: 40.7429, lng: 30.3342 },
  { id: 'r4', name: 'Computer Lab 1', capacity: 40, hardware: ['Computers', 'Whiteboard'], status: 'maintenance', occupancyPercent: 0, location: 'CS Building, Floor 1', lat: 40.7434, lng: 30.3325 },
  { id: 'r5', name: 'Meeting Room A', capacity: 10, hardware: ['TV Screen'], status: 'available', occupancyPercent: 60, location: 'Building A, Floor 2', lat: 40.7438, lng: 30.3332 },
  { id: 'r6', name: 'Study Area 1', capacity: 50, hardware: ['Power Outlets'], status: 'occupied', occupancyPercent: 95, location: 'Library, Floor 1', lat: 40.7425, lng: 30.3335 },
  { id: 'r7', name: 'Robotics Lab', capacity: 20, hardware: ['Robotic Arms', 'Computers'], status: 'available', occupancyPercent: 30, location: 'Engineering Block, Floor 1', lat: 40.7445, lng: 30.3340 },
  { id: 'r8', name: 'VR Studio', capacity: 15, hardware: ['VR Headsets', 'High-end PCs'], status: 'maintenance', occupancyPercent: 0, location: 'Innovation Center, Floor 3', lat: 40.7440, lng: 30.3320 },
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
