// Business Directory Types
// Based on AC-ARCH-004 component contracts

export type ClaimStatus = 'pending' | 'approved' | 'rejected';

export interface Business {
  id: string;
  owner_id?: string;
  name: string;
  description?: string;
  category?: string;
  website?: string;
  email?: string;
  phone?: string;
  location?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  };
  perk?: string; // Alumni benefit description
  perk_url?: string; // Link to redeem alumni perk
  is_premium: boolean;
  verified: boolean;
  logo_url?: string;
  images?: string[];
  hours?: {
    monday?: string;
    tuesday?: string;
    wednesday?: string;
    thursday?: string;
    friday?: string;
    saturday?: string;
    sunday?: string;
  };
  social_links?: {
    facebook?: string;
    instagram?: string;
    linkedin?: string;
    twitter?: string;
    youtube?: string;
  };
  created_at: string;
  updated_at: string;
  
  // Populated data
  owner_name?: string;
  owner_avatar?: string;
  is_owner?: boolean;
  has_claimed?: boolean;
}

export interface BusinessClaim {
  id: string;
  business_id: string;
  user_id: string;
  status: ClaimStatus;
  evidence_type?: string; // 'website', 'email', 'document', 'social'
  evidence_data?: any;
  reviewed_by?: string;
  reviewed_at?: string;
  notes?: string;
  created_at: string;
}

export interface CreateBusinessPayload {
  name: string;
  description?: string;
  category?: string;
  website?: string;
  email?: string;
  phone?: string;
  location?: string;
  address?: Business['address'];
  perk?: string;
  perk_url?: string;
  logo_url?: string;
  images?: string[];
  hours?: Business['hours'];
  social_links?: Business['social_links'];
}

export interface BusinessFilters {
  category?: string;
  location?: string;
  search?: string;
  verified_only?: boolean;
  with_perks?: boolean;
}

export interface BusinessesResponse {
  businesses: Business[];
  total_count: number;
  has_more: boolean;
}

export interface ClaimBusinessPayload {
  business_id: string;
  evidence_type: string;
  evidence_data?: any;
}

// Business categories for filtering/selection
export const BUSINESS_CATEGORIES = [
  'Restaurant',
  'Retail',
  'Healthcare',
  'Professional Services',
  'Technology',
  'Real Estate',
  'Finance',
  'Education',
  'Entertainment',
  'Travel & Hospitality',
  'Automotive',
  'Home Services',
  'Beauty & Wellness',
  'Sports & Recreation',
  'Non-profit',
  'Other'
] as const;

export type BusinessCategory = typeof BUSINESS_CATEGORIES[number];

// Evidence types for business claims
export const EVIDENCE_TYPES = [
  { value: 'website', label: 'Website/Domain ownership' },
  { value: 'email', label: 'Business email verification' },
  { value: 'document', label: 'Official business documents' },
  { value: 'social', label: 'Social media verification' }
] as const;