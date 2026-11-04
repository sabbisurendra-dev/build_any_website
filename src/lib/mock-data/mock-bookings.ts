import type { BookingModel, BookingStatus, UUID } from '@/types/domain';

export interface MockBooking {
  id: UUID;
  bookingNumber: string;
  tenantId: UUID;
  bookingModel: BookingModel;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  resourceOrServiceName: string;
  staffName?: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  status: BookingStatus;
  paymentStatus: 'paid' | 'pending' | 'unpaid' | 'refunded';
  paymentMethod: 'upi' | 'card' | 'cash' | 'unknown';
  amountMinor: number;
  courtOrRoom?: string;
  notes?: string;
  createdAt: string;
}

export const MOCK_BOOKINGS: MockBooking[] = [
  {
    id: 'bk-001',
    bookingNumber: 'BK-20261105-7A12',
    tenantId: 't-kickoff-01',
    bookingModel: 'exclusive_resource',
    customerName: 'Aditya Verma',
    customerPhone: '+91 98450 12345',
    customerEmail: 'aditya.verma@example.com',
    resourceOrServiceName: 'FIFA Synthetic Turf 1 (7v7)',
    date: '2026-11-05',
    startTime: '19:00',
    endTime: '20:30',
    status: 'confirmed',
    paymentStatus: 'paid',
    paymentMethod: 'upi',
    amountMinor: 225000, // ₹2,250
    courtOrRoom: 'Ground 1',
    notes: 'Needs 2 footballs and bibs',
    createdAt: '2026-11-04T18:20:00Z',
  },
  {
    id: 'bk-002',
    bookingNumber: 'BK-20261105-8B34',
    tenantId: 't-kickoff-01',
    bookingModel: 'exclusive_resource',
    customerName: 'Vikram Seth',
    customerPhone: '+91 98200 45678',
    customerEmail: 'vikram.seth@example.com',
    resourceOrServiceName: 'Floodlit Turf 2 (5v5)',
    date: '2026-11-05',
    startTime: '20:00',
    endTime: '21:00',
    status: 'confirmed',
    paymentStatus: 'paid',
    paymentMethod: 'upi',
    amountMinor: 140000, // ₹1,400
    courtOrRoom: 'Ground 2',
    notes: 'Corporate team weekly scrimmage',
    createdAt: '2026-11-04T20:10:00Z',
  },
  {
    id: 'bk-003',
    bookingNumber: 'BK-20261105-9C56',
    tenantId: 't-kickoff-01',
    bookingModel: 'exclusive_resource',
    customerName: 'Rohan Mehra',
    customerPhone: '+91 98111 22334',
    resourceOrServiceName: 'Box Cricket Arena',
    date: '2026-11-05',
    startTime: '21:00',
    endTime: '23:00',
    status: 'confirmed',
    paymentStatus: 'paid',
    paymentMethod: 'upi',
    amountMinor: 240000, // ₹2,400
    courtOrRoom: 'Box Arena',
    createdAt: '2026-11-05T08:00:00Z',
  },
  {
    id: 'bk-004',
    bookingNumber: 'BK-20261105-1D78',
    tenantId: 't-kickoff-01',
    bookingModel: 'exclusive_resource',
    customerName: 'Karthik Rao',
    customerPhone: '+91 97400 99887',
    resourceOrServiceName: 'FIFA Synthetic Turf 1 (7v7)',
    date: '2026-11-05',
    startTime: '21:30',
    endTime: '22:30',
    status: 'temporarily_held',
    paymentStatus: 'pending',
    paymentMethod: 'upi',
    amountMinor: 150000, // ₹1,500
    courtOrRoom: 'Ground 1',
    notes: 'Active hold - awaiting UPI intent confirmation',
    createdAt: '2026-11-05T09:40:00Z',
  },
  {
    id: 'bk-005',
    bookingNumber: 'BK-20261105-2E90',
    tenantId: 't-kickoff-01',
    bookingModel: 'exclusive_resource',
    customerName: 'Sameer Nair',
    customerPhone: '+91 98860 55443',
    resourceOrServiceName: 'Floodlit Turf 2 (5v5)',
    date: '2026-11-05',
    startTime: '18:00',
    endTime: '19:00',
    status: 'completed',
    paymentStatus: 'paid',
    paymentMethod: 'cash',
    amountMinor: 120000, // ₹1,200
    courtOrRoom: 'Ground 2',
    notes: 'Walk-in cash settlement at venue reception',
    createdAt: '2026-11-05T12:00:00Z',
  },
  {
    id: 'bk-006',
    bookingNumber: 'BK-20261106-3F12',
    tenantId: 't-kickoff-01',
    bookingModel: 'exclusive_resource',
    customerName: 'Gaurav Gupta',
    customerPhone: '+91 98710 44332',
    resourceOrServiceName: 'FIFA Synthetic Turf 1 (7v7)',
    date: '2026-11-06',
    startTime: '07:00',
    endTime: '08:30',
    status: 'confirmed',
    paymentStatus: 'paid',
    paymentMethod: 'upi',
    amountMinor: 180000, // ₹1,800
    courtOrRoom: 'Ground 1',
    createdAt: '2026-11-04T14:30:00Z',
  },
  {
    id: 'bk-007',
    bookingNumber: 'BK-20261106-4G34',
    tenantId: 't-kickoff-01',
    bookingModel: 'exclusive_resource',
    customerName: 'Manish Kumar',
    customerPhone: '+91 99000 88776',
    resourceOrServiceName: 'Floodlit Turf 2 (5v5)',
    date: '2026-11-06',
    startTime: '19:30',
    endTime: '21:00',
    status: 'cancelled',
    paymentStatus: 'refunded',
    paymentMethod: 'upi',
    amountMinor: 180000,
    courtOrRoom: 'Ground 2',
    notes: 'Cancelled 24h in advance - automated refund processed',
    createdAt: '2026-11-03T16:00:00Z',
  },
];
