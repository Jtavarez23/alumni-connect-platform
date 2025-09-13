// Jobs & Mentorship Types
// Based on AC-ARCH-004 component contracts

export type JobType = 'full-time' | 'part-time' | 'contract' | 'internship' | 'volunteer';
export type ExperienceLevel = 'entry' | 'mid' | 'senior' | 'executive';
export type ApplicationStatus = 'applied' | 'reviewing' | 'interviewing' | 'offered' | 'rejected' | 'withdrawn';
export type MentorshipRole = 'mentor' | 'mentee' | 'both';
export type MatchStatus = 'suggested' | 'accepted' | 'ended';

export interface Job {
  id: string;
  posted_by?: string;
  company_id?: string;
  title: string;
  company: string;
  location?: string;
  remote: boolean;
  job_type: JobType;
  experience_level: ExperienceLevel;
  salary_min?: number;
  salary_max?: number;
  salary_currency: string;
  description: string;
  requirements?: string;
  benefits?: string;
  apply_url?: string;
  apply_email?: string;
  visibility: 'public' | 'alumni_only' | 'school_only' | 'connections_only';
  is_featured: boolean;
  expires_at?: string;
  created_at: string;
  updated_at: string;
  
  // Populated data
  posted_by_name?: string;
  posted_by_avatar?: string;
  company_logo?: string;
  is_saved?: boolean;
  has_applied?: boolean;
  application_count?: number;
}

export interface JobApplication {
  id: string;
  job_id: string;
  user_id: string;
  cover_letter?: string;
  resume_url?: string;
  status: ApplicationStatus;
  notes?: string;
  applied_at: string;
  updated_at: string;
  
  // Populated data
  job?: Job;
  applicant_name?: string;
  applicant_avatar?: string;
}

export interface MentorshipProfile {
  user_id: string;
  role: MentorshipRole;
  bio?: string;
  expertise_areas: string[];
  career_stage?: string;
  current_role?: string;
  current_company?: string;
  industries: string[];
  skills: string[];
  languages: string[];
  availability?: {
    timezone?: string;
    preferred_days?: string[];
    preferred_times?: string[];
  };
  meeting_preferences: string[];
  max_mentees: number;
  is_available: boolean;
  linkedin_url?: string;
  portfolio_url?: string;
  hourly_rate_cents?: number;
  created_at: string;
  updated_at: string;
  
  // Populated data
  display_name?: string;
  avatar_url?: string;
  school_name?: string;
  match_score?: number;
}

export interface MentorshipMatch {
  id: string;
  mentor_id: string;
  mentee_id: string;
  status: MatchStatus;
  match_score?: number;
  matched_on?: any;
  message?: string;
  accepted_at?: string;
  ended_at?: string;
  end_reason?: string;
  created_at: string;
  updated_at: string;
  
  // Populated data
  mentor?: MentorshipProfile;
  mentee?: MentorshipProfile;
}

export interface CreateJobPayload {
  title: string;
  company: string;
  location?: string;
  remote?: boolean;
  job_type?: JobType;
  experience_level?: ExperienceLevel;
  description: string;
  requirements?: string;
  benefits?: string;
  salary_min?: number;
  salary_max?: number;
  apply_url?: string;
  apply_email?: string;
  visibility?: Job['visibility'];
}

export interface JobFilters {
  location?: string;
  remote?: boolean;
  job_type?: JobType;
  experience_level?: ExperienceLevel;
  search?: string;
  company?: string;
  salary_min?: number;
}

export interface JobsResponse {
  jobs: Job[];
  total_count: number;
  has_more: boolean;
}

export interface MentorshipFilters {
  role?: MentorshipRole;
  expertise_areas?: string[];
  industries?: string[];
  availability?: boolean;
}

export interface MentorshipResponse {
  matches: MentorshipProfile[];
  total_count: number;
  has_more: boolean;
}

// Job categories and constants
export const JOB_TYPES: { value: JobType; label: string }[] = [
  { value: 'full-time', label: 'Full-time' },
  { value: 'part-time', label: 'Part-time' },
  { value: 'contract', label: 'Contract' },
  { value: 'internship', label: 'Internship' },
  { value: 'volunteer', label: 'Volunteer' },
];

export const EXPERIENCE_LEVELS: { value: ExperienceLevel; label: string }[] = [
  { value: 'entry', label: 'Entry Level' },
  { value: 'mid', label: 'Mid Level' },
  { value: 'senior', label: 'Senior Level' },
  { value: 'executive', label: 'Executive' },
];

export const INDUSTRIES = [
  'Technology',
  'Healthcare',
  'Finance',
  'Education',
  'Marketing',
  'Sales',
  'Engineering',
  'Design',
  'Operations',
  'Legal',
  'Consulting',
  'Real Estate',
  'Non-profit',
  'Government',
  'Entertainment',
  'Retail',
  'Manufacturing',
  'Energy',
  'Transportation',
  'Other'
] as const;

export const SKILLS = [
  'JavaScript',
  'Python',
  'React',
  'Node.js',
  'SQL',
  'Project Management',
  'Data Analysis',
  'Machine Learning',
  'Marketing Strategy',
  'Sales',
  'Leadership',
  'Communication',
  'Problem Solving',
  'Team Management',
  'Strategic Planning',
  'Financial Analysis',
  'Digital Marketing',
  'Content Creation',
  'UX/UI Design',
  'Business Development'
] as const;

export const MEETING_PREFERENCES = [
  'video',
  'phone',
  'in-person',
  'chat',
  'email'
] as const;