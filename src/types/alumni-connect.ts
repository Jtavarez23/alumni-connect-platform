// Alumni Connect - TypeScript Types
// Implements AC-ARCH-004 frontend component contracts and shared types

export type UUID = string;
export type Trust = 'unverified' | 'verified_alumni' | 'school_admin' | 'moderator' | 'staff';
export type Visibility = 'public' | 'alumni_only' | 'school_only' | 'connections_only' | 'private';
export type MediaScanStatus = 'pending' | 'clean' | 'flagged' | 'quarantined' | 'error';
export type ReportReason = 'impersonation' | 'nudity' | 'violence' | 'harassment' | 'copyright' | 'spam' | 'other';
export type ClaimStatus = 'pending' | 'approved' | 'rejected';

// Core User and Profile Types
export interface User {
  id: UUID;
  displayName: string;
  avatarUrl?: string;
  trust: Trust;
  headline?: string;
  location?: string;
  industry?: string;
  isPrivate?: boolean;
  subscriptionTier?: 'free' | 'premium' | 'enterprise';
}

export interface Profile extends User {
  firstName: string;
  lastName: string;
  email?: string;
  createdAt: string;
  updatedAt: string;
  lastActive?: string;
}

// School and Education Types
export interface School {
  id: UUID;
  name: string;
  city?: string;
  state?: string;
  country?: string;
  isVerified: boolean;
  website?: string;
  establishedYear?: number;
  createdAt: string;
}

export interface ClassYear {
  id: UUID;
  schoolId: UUID;
  year: number;
  createdAt: string;
}

export interface UserEducation {
  id: UUID;
  userId: UUID;
  schoolId: UUID;
  classYearId?: UUID;
  schoolType: 'elementary' | 'middle_school' | 'high_school' | 'college' | 'university' | 'graduate_school' | 'trade_school';
  startYear: number;
  endYear: number;
  startGrade?: string;
  endGrade?: string;
  isPrimary: boolean;
  isGraduated: boolean;
  roleType: 'student' | 'teacher' | 'staff' | 'administrator';
  activities?: string[];
  achievements?: string[];
  verificationStatus: 'pending' | 'verified' | 'rejected';
  createdAt: string;
}

// Yearbook and Processing Types
export interface Yearbook {
  id: UUID;
  schoolId: UUID;
  classYearId?: UUID;
  uploadedBy: UUID;
  title?: string;
  storagePath: string;
  pageCount?: number;
  status: MediaScanStatus;
  ocrDone: boolean;
  faceDone: boolean;
  isPublic: boolean;
  visibility: Visibility;
  createdAt: string;
  updatedAt: string;
}

export interface YearbookPage {
  id: UUID;
  yearbookId: UUID;
  pageNumber: number;
  tileManifest?: string;
  imagePath?: string;
  createdAt: string;
}

export interface OcrText {
  id: UUID;
  pageId: UUID;
  text: string;
  bbox?: number[];
  createdAt: string;
}

export interface PageFace {
  id: UUID;
  pageId: UUID;
  bbox: number[];
  embedding?: number[];
  claimedBy?: UUID;
  createdAt: string;
}

export interface Claim {
  id: UUID;
  userId: UUID;
  pageFaceId?: UUID;
  pageNameId?: UUID;
  status: ClaimStatus;
  verifiedBy?: UUID;
  verifiedAt?: string;
  createdAt: string;
}

export interface SafetyQueue {
  id: UUID;
  yearbookId: UUID;
  status: MediaScanStatus;
  findings?: any;
  createdAt: string;
  updatedAt: string;
}

// Social and Content Types
export interface Post {
  id: UUID;
  authorId: UUID;              // camelCase per master docs
  schoolId?: UUID;             // camelCase per master docs
  groupId?: UUID;              // camelCase per master docs
  visibility: Visibility;
  text?: string;
  media?: any;
  metrics?: {
    like_count?: number;       // snake_case per master docs line 48
    comment_count?: number;    // snake_case per master docs line 48
    share_count?: number;      // snake_case per master docs line 48
  };
  createdAt: string;           // camelCase per master docs
  updatedAt?: string;          // camelCase for consistency
}

export interface Comment {
  id: UUID;
  postId: UUID;
  authorId: UUID;
  text: string;
  createdAt: string;
}

export interface Reaction {
  postId: UUID;
  userId: UUID;
  emoji: string;
  createdAt: string;
}

// Network and Connection Types
export interface Connection {
  id: UUID;
  userId: UUID;
  connectionId: UUID;
  status: 'pending' | 'accepted' | 'rejected' | 'blocked';
  createdAt: string;
}

export interface Group {
  id: UUID;
  schoolId?: UUID;
  name: string;
  kind: 'class' | 'club' | 'team' | 'custom';
  visibility: Visibility;
  createdBy?: UUID;
  createdAt: string;
}

export interface GroupMember {
  groupId: UUID;
  userId: UUID;
  role: 'owner' | 'admin' | 'member';
  joinedAt: string;
}

// Events and Ticketing Types
export interface Event {
  id: UUID;
  hostType: 'school' | 'group' | 'user';
  hostId: UUID;
  title: string;
  description?: string;
  startsAt: string;
  endsAt?: string;
  location?: string;
  isVirtual: boolean;
  visibility: Visibility;
  ticketingEnabled: boolean;
  createdBy?: UUID;
  createdAt: string;
}

export interface EventTicket {
  id: UUID;
  eventId: UUID;
  name: string;
  priceCents: number;
  currency: string;
  quantity?: number;
  salesStart?: string;
  salesEnd?: string;
  createdAt: string;
}

export interface EventOrder {
  id: UUID;
  eventId: UUID;
  purchaserId?: UUID;
  ticketId?: UUID;
  qty: number;
  stripePaymentIntent?: string;
  status: 'created' | 'paid' | 'refunded' | 'canceled';
  createdAt: string;
}

// Business and Job Types
export interface Business {
  id: UUID;
  ownerId?: UUID;
  name: string;
  category?: string;
  website?: string;
  location?: string;
  perk?: string;
  isPremium: boolean;
  verified: boolean;
  createdAt: string;
}

export interface Job {
  id: UUID;
  postedBy?: UUID;
  title: string;
  company?: string;
  location?: string;
  remote: boolean;
  description?: string;
  applyUrl?: string;
  visibility: Visibility;
  createdAt: string;
}

export interface JobApplication {
  id: UUID;
  jobId: UUID;
  userId: UUID;
  note?: string;
  status: string;
  createdAt: string;
}

// Mentorship Types
export interface MentorshipProfile {
  userId: UUID;
  role: 'mentor' | 'mentee' | 'both';
  topics?: string[];
  availability?: any;
  createdAt: string;
}

export interface MentorshipMatch {
  id: UUID;
  mentorId: UUID;
  menteeId: UUID;
  status: 'suggested' | 'accepted' | 'ended';
  createdAt: string;
}

// Messaging Types
export interface Conversation {
  id: UUID;
  createdBy?: UUID;
  isGroup: boolean;
  title?: string;
  createdAt: string;
}

export interface ConversationMember {
  conversationId: UUID;
  userId: UUID;
  role: 'owner' | 'admin' | 'member';
  joinedAt: string;
}

export interface Message {
  id: UUID;
  conversationId: UUID;
  senderId: UUID;
  text?: string;
  media?: any;
  createdAt: string;
}

// Notification Types
export interface Notification {
  id: UUID;
  userId: UUID;
  kind: string;
  payload: any;
  isRead: boolean;
  createdAt: string;
}

// Moderation Types
export interface ModerationReport {
  id: UUID;
  reporterId?: UUID;
  targetTable: string;
  targetId: UUID;
  reason: ReportReason;
  details?: string;
  status: 'open' | 'reviewing' | 'closed';
  createdAt: string;
}

export interface ModerationAction {
  id: UUID;
  reportId: UUID;
  moderatorId?: UUID;
  action: string;
  notes?: string;
  createdAt: string;
}

// Activity and Analytics Types
export interface ActivityFeed {
  id: UUID;
  userId: UUID;
  activityType: 'new_member_joined' | 'photo_tagged' | 'memory_shared' | 'then_vs_now_post' | 
                'reunion_announcement' | 'profile_update' | 'group_activity' | 'connection_made';
  contentId?: UUID;
  contentData?: any;
  schoolContext?: UUID;
  yearContext?: number;
  priorityScore: number;
  createdAt: string;
}

export interface ProfileView {
  id: UUID;
  viewerId: UUID;
  viewedId: UUID;
  viewedAt: string;
  viewContext: 'search' | 'yearbook' | 'group' | 'direct' | 'suggestion';
}

// API Response Types
export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
  success?: boolean;
}

export interface PaginatedResponse<T = any> {
  items: T[];
  nextCursor?: string;
  hasMore?: boolean;
  total?: number;
}

// Component Props Types (AC-ARCH-004 specifications)
export interface YearbookUploadWizardProps {
  onComplete?: (yearbookId: UUID) => void;
}

export interface YearbookReaderProps {
  yearbookId: UUID;
  page?: number;
}

export interface ClaimDialogProps {
  pageFaceId?: UUID;
  pageNameId?: UUID;
  open: boolean;
  onClose: () => void;
}

export interface PostCardProps {
  data: Post & {
    author: User;
    school?: School;
  };
  onLike?: (postId: UUID) => void;
  onComment?: (postId: UUID) => void;
  onShare?: (postId: UUID) => void;
  onReport?: (postId: UUID) => void;
}

export interface ConnectionButtonProps {
  userId: UUID;
  currentStatus?: Connection['status'];
  onStatusChange?: (status: Connection['status']) => void;
}

// RPC Function Types (AC-ARCH-004 specifications)
export type RpcStartYearbookProcessing = (yearbookId: UUID) => Promise<ApiResponse>;
export type RpcSubmitClaim = (args: { pageFaceId?: UUID; pageNameId?: UUID }) => Promise<ApiResponse<Claim>>;
export type RpcApproveClaim = (claimId: UUID) => Promise<ApiResponse<{ status: ClaimStatus }>>;
export type RpcRejectClaim = (claimId: UUID, reason?: string) => Promise<ApiResponse<{ status: ClaimStatus }>>;

export type RpcGetNetworkFeed = (cursor?: string) => Promise<PaginatedResponse<Post>>;
export type RpcGetForYouFeed = (cursor?: string) => Promise<PaginatedResponse<Post>>;

export type RpcCreateEvent = (payload: Partial<Event> & { tickets?: Partial<EventTicket>[] }) => Promise<ApiResponse<Event>>;
export type RpcPurchaseTicket = (args: { eventId: UUID; ticketId: UUID; qty: number }) => Promise<ApiResponse<{ checkoutUrl: string }>>;

export type RpcReportItem = (args: { 
  targetTable: string; 
  targetId: UUID; 
  reason: ReportReason; 
  details?: string 
}) => Promise<ApiResponse>;

export type RpcSendMessage = (args: { 
  conversationId: UUID; 
  text?: string; 
  media?: any 
}) => Promise<ApiResponse<Message>>;

// Hook Return Types
export interface UseQueryResult<T> {
  data: T | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

export interface UseMutationResult<TData = any, TVariables = any> {
  mutate: (variables: TVariables) => void;
  mutateAsync: (variables: TVariables) => Promise<TData>;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  data: TData | undefined;
}

// Search and Discovery Types
export interface SearchFilters {
  school?: UUID;
  yearRange?: [number, number];
  location?: string;
  industry?: string;
  activities?: string[];
}

export interface NetworkOverlap {
  schoolId: UUID;
  schoolName: string;
  overlapYears: [number, number];
}

// Premium Feature Types
export interface PremiumFeatures {
  unlimitedSchools: boolean;
  unlimitedSearches: boolean;
  unlimitedMessaging: boolean;
  profileAnalytics: boolean;
  allYearsNetworking: boolean;
  verifiedSocialLinks: boolean;
  unlimitedSuggestions: boolean;
  exportContacts: boolean;
  eventCreation: boolean;
  premiumBadge: boolean;
  bulkYearbookUpload?: boolean;
  analyticsDashboard?: boolean;
  customBranding?: boolean;
  apiAccess?: boolean;
}

export interface SearchQuota {
  id: UUID;
  userId: UUID;
  date: string;
  searchesUsed: number;
  searchLimit: number;
  lastSearchAt?: string;
  earnedSearches: number;
}

// Export all types
export * from './alumni-connect';