// Jobs & Mentorship Hooks
// React Query hooks for Jobs and Mentorship CRUD

import { useQuery, useMutation, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { 
  Job, 
  JobFilters, 
  JobsResponse,
  CreateJobPayload,
  JobApplication,
  MentorshipProfile,
  MentorshipMatch,
  MentorshipFilters,
  MentorshipResponse,
  MentorshipRole
} from '@/types/jobs';

// =============================================
// JOBS QUERY HOOKS
// =============================================

export function useJobs(filters: JobFilters = {}, limit: number = 20) {
  return useInfiniteQuery({
    queryKey: ['jobs', filters],
    queryFn: async ({ pageParam = 0 }) => {
      const { data, error } = await supabase.rpc('get_jobs', {
        p_limit: limit,
        p_offset: pageParam * limit,
        p_location: filters.location,
        p_remote: filters.remote,
        p_job_type: filters.job_type,
        p_experience_level: filters.experience_level,
        p_search: filters.search
      });

      if (error) {
        console.error('Error fetching jobs:', error);
        throw error;
      }

      return data as JobsResponse;
    },
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.has_more ? allPages.length : undefined;
    },
    enabled: true,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useJob(jobId: string) {
  return useQuery({
    queryKey: ['job', jobId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('jobs')
        .select(`
          *,
          poster:profiles!posted_by (
            display_name,
            avatar_url
          ),
          company:businesses!company_id (
            name,
            logo_url
          ),
          applications:job_applications!job_id (
            id,
            status,
            user_id
          )
        `)
        .eq('id', jobId)
        .single();

      if (error) {
        console.error('Error fetching job:', error);
        throw error;
      }

      // Check if current user has applied or saved this job
      const currentUser = (await supabase.auth.getUser()).data.user;
      const hasApplied = currentUser ? 
        data.applications?.some((app: any) => app.user_id === currentUser.id) : 
        false;

      const { data: savedData } = currentUser ? await supabase
        .from('job_saves')
        .select('id')
        .eq('job_id', jobId)
        .eq('user_id', currentUser.id)
        .maybeSingle() : { data: null };

      return {
        ...data,
        posted_by_name: data.poster?.display_name,
        posted_by_avatar: data.poster?.avatar_url,
        company_logo: data.company?.logo_url,
        has_applied: hasApplied,
        is_saved: !!savedData,
        application_count: data.applications?.length || 0
      } as Job;
    },
    enabled: !!jobId,
  });
}

export function useUserJobs(userId?: string) {
  return useQuery({
    queryKey: ['user-jobs', userId],
    queryFn: async () => {
      const targetUserId = userId || (await supabase.auth.getUser()).data.user?.id;
      
      if (!targetUserId) {
        throw new Error('No user ID provided');
      }

      // Get jobs posted by user
      const { data: postedJobs, error: postedError } = await supabase
        .from('jobs')
        .select('*, applications:job_applications!job_id(id)')
        .eq('posted_by', targetUserId)
        .order('created_at', { ascending: false });

      if (postedError) throw postedError;

      // Get jobs user has applied to
      const { data: appliedJobs, error: appliedError } = await supabase
        .from('job_applications')
        .select(`
          *,
          job:jobs (*)
        `)
        .eq('user_id', targetUserId)
        .order('applied_at', { ascending: false });

      if (appliedError) throw appliedError;

      // Get saved jobs
      const { data: savedJobs, error: savedError } = await supabase
        .from('job_saves')
        .select(`
          *,
          job:jobs (*)
        `)
        .eq('user_id', targetUserId)
        .order('created_at', { ascending: false });

      if (savedError) throw savedError;

      return {
        posted: postedJobs?.map(job => ({
          ...job,
          application_count: job.applications?.length || 0
        })) || [],
        applied: appliedJobs?.map(app => app.job).filter(Boolean) || [],
        saved: savedJobs?.map(save => save.job).filter(Boolean) || []
      };
    },
    enabled: true,
  });
}

export function useSavedJobs() {
  return useQuery({
    queryKey: ['saved-jobs'],
    queryFn: async () => {
      const currentUser = (await supabase.auth.getUser()).data.user;
      if (!currentUser) return [];

      const { data, error } = await supabase
        .from('job_saves')
        .select(`
          *,
          job:jobs (
            *,
            poster:profiles!posted_by (display_name, avatar_url)
          )
        `)
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching saved jobs:', error);
        throw error;
      }

      return data.map(save => ({
        ...save.job,
        posted_by_name: save.job?.poster?.display_name,
        posted_by_avatar: save.job?.poster?.avatar_url
      }));
    },
  });
}

// =============================================
// JOBS MUTATION HOOKS
// =============================================

export function useCreateJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (jobData: CreateJobPayload) => {
      const { data, error } = await supabase.rpc('create_job', {
        p_title: jobData.title,
        p_company: jobData.company,
        p_location: jobData.location,
        p_remote: jobData.remote || false,
        p_job_type: jobData.job_type || 'full-time',
        p_experience_level: jobData.experience_level || 'mid',
        p_description: jobData.description,
        p_requirements: jobData.requirements,
        p_salary_min: jobData.salary_min,
        p_salary_max: jobData.salary_max,
        p_apply_url: jobData.apply_url,
        p_apply_email: jobData.apply_email
      });

      if (error) {
        console.error('Error creating job:', error);
        throw error;
      }

      return data as Job;
    },
    onSuccess: (newJob) => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['user-jobs'] });
      queryClient.setQueryData(['job', newJob.id], newJob);
      
      toast.success('Job posted successfully!');
    },
    onError: (error: any) => {
      console.error('Create job error:', error);
      toast.error(error.message || 'Failed to post job');
    },
  });
}

export function useApplyToJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ jobId, coverLetter, resumeUrl }: { 
      jobId: string; 
      coverLetter?: string; 
      resumeUrl?: string; 
    }) => {
      const { data, error } = await supabase.rpc('apply_to_job', {
        p_job_id: jobId,
        p_cover_letter: coverLetter,
        p_resume_url: resumeUrl
      });

      if (error) {
        console.error('Error applying to job:', error);
        throw error;
      }

      return data;
    },
    onSuccess: (result, { jobId }) => {
      // Update job cache to show application
      queryClient.setQueryData(['job', jobId], (old: Job | undefined) => {
        if (!old) return old;
        return {
          ...old,
          has_applied: true,
          application_count: (old.application_count || 0) + 1
        };
      });
      
      queryClient.invalidateQueries({ queryKey: ['user-jobs'] });
      toast.success('Application submitted successfully!');
    },
    onError: (error: any) => {
      console.error('Apply to job error:', error);
      toast.error(error.message || 'Failed to submit application');
    },
  });
}

export function useToggleJobSave() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ jobId, save = true }: { jobId: string; save?: boolean }) => {
      const { data, error } = await supabase.rpc('toggle_job_save', {
        p_job_id: jobId,
        p_save: save
      });

      if (error) {
        console.error('Error toggling job save:', error);
        throw error;
      }

      return data;
    },
    onSuccess: (result, { jobId, save }) => {
      // Update job cache
      queryClient.setQueryData(['job', jobId], (old: Job | undefined) => {
        if (!old) return old;
        return {
          ...old,
          is_saved: save
        };
      });
      
      queryClient.invalidateQueries({ queryKey: ['saved-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['user-jobs'] });
      
      toast.success(save ? 'Job saved!' : 'Job unsaved');
    },
    onError: (error: any) => {
      console.error('Toggle job save error:', error);
      toast.error(error.message || 'Failed to save/unsave job');
    },
  });
}

// =============================================
// MENTORSHIP QUERY HOOKS
// =============================================

export function useMentorshipMatches(role: MentorshipRole = 'mentee', filters: MentorshipFilters = {}, limit: number = 20) {
  return useInfiniteQuery({
    queryKey: ['mentorship-matches', role, filters],
    queryFn: async ({ pageParam = 0 }) => {
      const { data, error } = await supabase.rpc('get_mentorship_matches', {
        p_role: role,
        p_expertise_areas: filters.expertise_areas || [],
        p_industries: filters.industries || [],
        p_limit: limit,
        p_offset: pageParam * limit
      });

      if (error) {
        console.error('Error fetching mentorship matches:', error);
        throw error;
      }

      return data as MentorshipResponse;
    },
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.has_more ? allPages.length : undefined;
    },
    enabled: true,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

export function useMentorshipProfile(userId?: string) {
  return useQuery({
    queryKey: ['mentorship-profile', userId],
    queryFn: async () => {
      const targetUserId = userId || (await supabase.auth.getUser()).data.user?.id;
      
      if (!targetUserId) {
        throw new Error('No user ID provided');
      }

      const { data, error } = await supabase
        .from('mentorship_profiles')
        .select(`
          *,
          user:profiles!user_id (
            first_name,
            last_name,
            avatar_url
          )
        `)
        .eq('user_id', targetUserId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching mentorship profile:', error);
        throw error;
      }

      if (!data) return null;

      return {
        ...data,
        display_name: data.user ? `${data.user.first_name} ${data.user.last_name}`.trim() : '',
        avatar_url: data.user?.avatar_url
      } as MentorshipProfile;
    },
  });
}

export function useUserMentorshipMatches() {
  return useQuery({
    queryKey: ['user-mentorship-matches'],
    queryFn: async () => {
      const currentUser = (await supabase.auth.getUser()).data.user;
      if (!currentUser) return { as_mentor: [], as_mentee: [] };

      const { data, error } = await supabase
        .from('mentorship_matches')
        .select(`
          *,
          mentor:profiles!mentor_id (display_name, avatar_url),
          mentee:profiles!mentee_id (display_name, avatar_url)
        `)
        .or(`mentor_id.eq.${currentUser.id},mentee_id.eq.${currentUser.id}`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching user mentorship matches:', error);
        throw error;
      }

      const asMentor = data.filter(match => match.mentor_id === currentUser.id);
      const asMentee = data.filter(match => match.mentee_id === currentUser.id);

      return { as_mentor: asMentor, as_mentee: asMentee };
    },
  });
}

// =============================================
// MENTORSHIP MUTATION HOOKS
// =============================================

export function useUpsertMentorshipProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profileData: Partial<MentorshipProfile>) => {
      const { data, error } = await supabase.rpc('upsert_mentorship_profile', {
        p_role: profileData.role!,
        p_bio: profileData.bio,
        p_expertise_areas: profileData.expertise_areas || [],
        p_industries: profileData.industries || [],
        p_availability: profileData.availability ? JSON.stringify(profileData.availability) : '{}',
        p_max_mentees: profileData.max_mentees || 3
      });

      if (error) {
        console.error('Error upserting mentorship profile:', error);
        throw error;
      }

      return data as MentorshipProfile;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mentorship-profile'] });
      queryClient.invalidateQueries({ queryKey: ['mentorship-matches'] });
      
      toast.success('Mentorship profile updated successfully!');
    },
    onError: (error: any) => {
      console.error('Upsert mentorship profile error:', error);
      toast.error(error.message || 'Failed to update mentorship profile');
    },
  });
}

export function useRequestMentorshipMatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ targetUserId, message }: { targetUserId: string; message?: string }) => {
      const { data, error } = await supabase.rpc('request_mentorship_match', {
        p_target_user_id: targetUserId,
        p_message: message
      });

      if (error) {
        console.error('Error requesting mentorship match:', error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-mentorship-matches'] });
      queryClient.invalidateQueries({ queryKey: ['mentorship-matches'] });
      
      toast.success('Mentorship request sent!');
    },
    onError: (error: any) => {
      console.error('Request mentorship match error:', error);
      toast.error(error.message || 'Failed to send mentorship request');
    },
  });
}

export function useAcceptMentorshipMatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ matchId, accept }: { matchId: string; accept: boolean }) => {
      const { data, error } = await supabase
        .from('mentorship_matches')
        .update({
          status: accept ? 'accepted' : 'ended',
          accepted_at: accept ? new Date().toISOString() : undefined,
          ended_at: accept ? undefined : new Date().toISOString(),
          end_reason: accept ? undefined : 'declined'
        })
        .eq('id', matchId)
        .select()
        .single();

      if (error) {
        console.error('Error updating mentorship match:', error);
        throw error;
      }

      return data;
    },
    onSuccess: (updatedMatch) => {
      queryClient.invalidateQueries({ queryKey: ['user-mentorship-matches'] });
      queryClient.invalidateQueries({ queryKey: ['mentorship-matches'] });
      
      toast.success(updatedMatch.status === 'accepted' ? 
        'Mentorship match accepted!' : 
        'Mentorship match declined'
      );
    },
    onError: (error: any) => {
      console.error('Accept mentorship match error:', error);
      toast.error(error.message || 'Failed to update mentorship match');
    },
  });
}