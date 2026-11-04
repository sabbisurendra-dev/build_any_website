import type { UUID } from '@/types/domain';

export interface MockResource {
  id: UUID;
  name: string;
  type: string;
  slotDurationMinutes: number;
  minDurationMinutes: number;
  maxDurationMinutes: number;
  slotStepMinutes: number;
  basePriceMinor: number;
  peakPriceMinor: number;
  description: string;
  operatingHours: string;
  isActive: boolean;
}

export const MOCK_RESOURCES: MockResource[] = [
  {
    id: 'res-turf-01',
    name: 'FIFA Pro Synthetic Turf 1 (7v7)',
    type: 'football_turf',
    slotDurationMinutes: 60,
    minDurationMinutes: 60,
    maxDurationMinutes: 180,
    slotStepMinutes: 30,
    basePriceMinor: 120000, // ₹1,200/hr off-peak
    peakPriceMinor: 180000, // ₹1,800/hr peak evening floodlights
    description: 'Full-size 7v7 artificial turf with shock-absorbent infill, stadium floodlights, and covered dugout.',
    operatingHours: '06:00 AM – 01:00 AM',
    isActive: true,
  },
  {
    id: 'res-turf-02',
    name: 'Floodlit Fast Turf 2 (5v5)',
    type: 'football_turf',
    slotDurationMinutes: 60,
    minDurationMinutes: 60,
    maxDurationMinutes: 120,
    slotStepMinutes: 30,
    basePriceMinor: 100000, // ₹1,000/hr
    peakPriceMinor: 140000, // ₹1,400/hr
    description: 'Fast-paced 5v5 court with enclosed netting, electronic scoreboard, and premium night lighting.',
    operatingHours: '06:00 AM – 01:00 AM',
    isActive: true,
  },
  {
    id: 'res-cricket-03',
    name: 'Enclosed Box Cricket Arena',
    type: 'box_cricket',
    slotDurationMinutes: 60,
    minDurationMinutes: 60,
    maxDurationMinutes: 180,
    slotStepMinutes: 30,
    basePriceMinor: 100000,
    peakPriceMinor: 120000,
    description: 'All-weather indoor box cricket with bowling machine, boundary nets, and pavilion seating.',
    operatingHours: '06:00 AM – 12:00 AM',
    isActive: true,
  },
];
