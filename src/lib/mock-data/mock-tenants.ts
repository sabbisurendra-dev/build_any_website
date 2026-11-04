import type { BusinessVertical, UUID } from '@/types/domain';

export interface MockTenant {
  id: UUID;
  name: string;
  slug: string;
  vertical: BusinessVertical;
  status: 'onboarding' | 'active' | 'suspended';
  defaultCurrency: string;
  plan: 'starter' | 'growth' | 'pro' | 'enterprise';
  domain: string;
  customDomain?: string;
  websiteStatus: 'published' | 'draft';
  publishedVersion: number;
  location: {
    name: string;
    city: string;
    state: string;
    address: string;
    phone: string;
    timezone: string;
  };
  stats: {
    totalBookings: number;
    monthlyRevenueMinor: number;
    utilizationRate: number;
  };
  createdAt: string;
  onboardingTimeHours: number;
}

export const MOCK_TENANTS: MockTenant[] = [
  {
    id: 't-kickoff-01',
    name: 'Kickoff Football Turf & Sports Arena',
    slug: 'kickoff-turf',
    vertical: 'sports_turf',
    status: 'active',
    defaultCurrency: 'INR',
    plan: 'growth',
    domain: 'kickoff-turf.localhost:3000',
    customDomain: 'kickoffturf.in',
    websiteStatus: 'published',
    publishedVersion: 4,
    location: {
      name: 'Indiranagar Flagship Arena',
      city: 'Bengaluru',
      state: 'Karnataka',
      address: '12th Main Road, HAL 2nd Stage, Indiranagar',
      phone: '+91 98765 43210',
      timezone: 'Asia/Kolkata',
    },
    stats: {
      totalBookings: 342,
      monthlyRevenueMinor: 41040000, // ₹4,10,400
      utilizationRate: 88,
    },
    createdAt: '2026-10-12T09:00:00Z',
    onboardingTimeHours: 28, // within 1-2 days SLA
  },
  {
    id: 't-apex-02',
    name: 'Apex Badminton & Tennis Academy',
    slug: 'apex-badminton',
    vertical: 'racquet_court',
    status: 'active',
    defaultCurrency: 'INR',
    plan: 'starter',
    domain: 'apex-badminton.localhost:3000',
    websiteStatus: 'published',
    publishedVersion: 2,
    location: {
      name: 'Koramangala Indoor Stadium',
      city: 'Bengaluru',
      state: 'Karnataka',
      address: '80 Feet Road, 4th Block, Koramangala',
      phone: '+91 98450 11223',
      timezone: 'Asia/Kolkata',
    },
    stats: {
      totalBookings: 215,
      monthlyRevenueMinor: 17200000, // ₹1,72,000
      utilizationRate: 74,
    },
    createdAt: '2026-10-20T11:30:00Z',
    onboardingTimeHours: 22,
  },
  {
    id: 't-smilecraft-03',
    name: 'SmileCraft Dental & Implant Clinic',
    slug: 'smilecraft-clinic',
    vertical: 'clinic_healthcare',
    status: 'active',
    defaultCurrency: 'INR',
    plan: 'pro',
    domain: 'smilecraft-clinic.localhost:3000',
    customDomain: 'smilecraftdental.in',
    websiteStatus: 'published',
    publishedVersion: 3,
    location: {
      name: 'Bandra West Practice',
      city: 'Mumbai',
      state: 'Maharashtra',
      address: 'Hill Road, Near Bandra Station, Bandra West',
      phone: '+91 91234 56789',
      timezone: 'Asia/Kolkata',
    },
    stats: {
      totalBookings: 184,
      monthlyRevenueMinor: 27600000, // ₹2,76,000
      utilizationRate: 81,
    },
    createdAt: '2026-10-25T14:15:00Z',
    onboardingTimeHours: 34,
  },
  {
    id: 't-aura-04',
    name: 'Aura Luxury Salon, Spa & Wellness',
    slug: 'aura-salon',
    vertical: 'salon_beauty',
    status: 'onboarding',
    defaultCurrency: 'INR',
    plan: 'growth',
    domain: 'aura-salon.localhost:3000',
    websiteStatus: 'draft',
    publishedVersion: 1,
    location: {
      name: 'Jubilee Hills Salon',
      city: 'Hyderabad',
      state: 'Telangana',
      address: 'Road No. 36, Jubilee Hills',
      phone: '+91 99887 76655',
      timezone: 'Asia/Kolkata',
    },
    stats: {
      totalBookings: 42,
      monthlyRevenueMinor: 6300000, // ₹63,000
      utilizationRate: 45,
    },
    createdAt: '2026-11-03T10:00:00Z',
    onboardingTimeHours: 14,
  },
];
