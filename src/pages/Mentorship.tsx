import React, { useState, useMemo } from 'react';
import { Plus, Search, Users, Star, MessageCircle, Calendar, GraduationCap, Briefcase, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AppLayout } from '@/components/layout/AppLayout';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useMentorshipMatches, useMentorshipProfile, useRequestMentorshipMatch, useUpsertMentorshipProfile } from '@/hooks/useJobs';
import { MentorshipRequestModal } from '@/components/mentorship/MentorshipRequestModal';
import { toast } from 'sonner';
import type { MentorshipRole, MentorshipProfile } from '@/types/jobs';

export default function Mentorship() {
  const [role, setRole] = useState<MentorshipRole>('mentee');
  const [searchQuery, setSearchQuery] = useState('');
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<MentorshipProfile | null>(null);

  // Real data from backend
  const { data: matchesData, isLoading, error, fetchNextPage, hasNextPage, isFetchingNextPage } = 
    useMentorshipMatches(role === 'mentee' ? 'mentee' : 'mentor');
  
  const { data: userProfile } = useMentorshipProfile();
  const requestMatchMutation = useRequestMentorshipMatch();
  const upsertProfileMutation = useUpsertMentorshipProfile();

  const allProfiles = useMemo(() => 
    matchesData?.pages.flatMap(page => page.matches).filter(Boolean) || [], 
    [matchesData]
  );

  const filteredProfiles = useMemo(() => {
    if (!searchQuery) return allProfiles;
    return allProfiles.filter(profile =>
      profile?.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      profile?.expertise_areas?.some(skill => skill?.toLowerCase().includes(searchQuery.toLowerCase())) ||
      profile?.industries?.some(industry => industry?.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [allProfiles, searchQuery]);

  const handleRequestMentorship = (profile: MentorshipProfile) => {
    setSelectedProfile(profile);
    setRequestModalOpen(true);
  };

  const handleModalClose = () => {
    setRequestModalOpen(false);
    setSelectedProfile(null);
  };

  const handleOptIn = async () => {
    try {
      await upsertProfileMutation.mutateAsync({
        role: role === 'mentee' ? 'mentee' : 'mentor',
        bio: userProfile?.bio || `I'm excited to ${role === 'mentee' ? 'learn from' : 'help'} fellow alumni!`,
        expertise_areas: userProfile?.expertise_areas || [],
        industries: userProfile?.industries || []
      });
    } catch (error) {
      toast.error('Failed to update mentorship profile');
    }
  };

  if (isLoading) {
    return (
      <AppLayout title="Mentorship">
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingSpinner size="lg" />
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout title="Mentorship">
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">Failed to load mentorship profiles</p>
          <Button onClick={() => window.location.reload()} variant="outline">
            Try Again
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Mentorship">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header - AC-ARCH-001 compliant */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-display gradient-text">Alumni Mentorship</h1>
            <p className="text-body text-muted-foreground">
              Connect with fellow alumni for career guidance and professional growth
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="primary" onClick={() => window.location.href = '/mentorship/profile'}>
              <Plus className="w-4 h-4 mr-2" />
              {userProfile ? 'Edit Profile' : `Create ${role === 'mentee' ? 'Mentee' : 'Mentor'} Profile`}
            </Button>
            {userProfile && (
              <Button variant="outline" onClick={() => window.location.href = '/mentorship/dashboard'}>
                <Users className="w-4 h-4 mr-2" />
                My Connections
              </Button>
            )}
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search by skills, topics, or expertise..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-small font-medium">Looking for:</span>
            <Button
              variant={role === 'mentee' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setRole('mentee')}
            >
              Mentors
            </Button>
            <Button
              variant={role === 'mentor' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setRole('mentor')}
            >
              Mentees
            </Button>
          </div>
        </div>

        {/* Mentorship Grid - Following AC-ARCH-001: opt-in, topics, availability */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProfiles.map((profile) => (
            <Card key={profile.id} variant="default" className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-4">
                <div className="flex items-start gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={profile?.avatar_url} />
                    <AvatarFallback className="text-sm">
                      {profile?.display_name?.split(' ').map(n => n[0]).join('') || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-h2 font-semibold truncate">{profile?.display_name || 'Unknown User'}</h3>
                      {profile?.is_available && (
                        <Badge variant="verified" className="text-xs">
                          ✓ Available
                        </Badge>
                      )}
                    </div>
                    <p className="text-small text-muted-foreground truncate">
                      {profile?.current_role || ''} {profile?.current_company ? `at ${profile.current_company}` : ''}
                    </p>
                    {profile?.school_name && (
                      <div className="flex items-center gap-2 mt-1">
                        <GraduationCap className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {profile?.school_name}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {profile?.bio && (
                  <p className="text-small text-muted-foreground line-clamp-2">
                    {profile?.bio}
                  </p>
                )}

                {/* Expertise Areas per AC-ARCH-001 */}
                {(profile.expertise_areas?.length > 0 || profile.industries?.length > 0) && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">
                      {role === 'mentee' ? 'Expertise Areas' : 'Interested In'}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {[...(profile.expertise_areas || []), ...(profile.industries || [])]
                        .slice(0, 3)
                        .map((item: string) => (
                        <Badge key={item} variant="secondary" className="text-xs">
                          {item}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Availability per AC-ARCH-001 */}
                {profile.availability && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      Available: {JSON.stringify(profile.availability)}
                    </span>
                  </div>
                )}

                {/* Match score if available */}
                {profile.match_score && (
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Star className="h-3 w-3 text-yellow-500 fill-current" />
                      <span>Match Score: {profile.match_score}%</span>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                  <Button 
                    variant="primary" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => handleRequestMentorship(profile)}
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Connect
                  </Button>
                  <Button variant="secondary" size="sm">
                    <Calendar className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Empty State */}
        {filteredProfiles.length === 0 && (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-h2 mb-2">
              No {role === 'mentee' ? 'mentors' : 'mentees'} found
            </h3>
            <p className="text-body text-muted-foreground mb-6 max-w-md mx-auto">
              {role === 'mentee' 
                ? 'Be the first to opt-in as a mentor and help fellow alumni!'
                : 'Start your mentorship journey by opting-in as a mentee!'
              }
            </p>
            <Button variant="primary" onClick={() => window.location.href = '/mentorship/profile'} disabled={upsertProfileMutation.isPending}>
              <Plus className="w-4 h-4 mr-2" />
              {userProfile ? 'Edit Profile' : 'Create Profile'}
            </Button>
          </div>
        )}

        {/* Load More */}
        {hasNextPage && (
          <div className="text-center">
            <Button
              variant="outline"
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
            >
              {isFetchingNextPage ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Loading...
                </>
              ) : (
                'Load More Profiles'
              )}
            </Button>
          </div>
        )}

        {/* Info Section - AC-ARCH-001 compliant */}
        <Card variant="highlight" className="mt-8">
          <CardContent className="p-6">
            <div className="grid md:grid-cols-3 gap-6 text-center">
              <div>
                <Briefcase className="h-8 w-8 text-primary mx-auto mb-2" />
                <h3 className="text-h2 mb-1">Career Growth</h3>
                <p className="text-small text-muted-foreground">
                  Get guidance from successful alumni in your field
                </p>
              </div>
              <div>
                <Users className="h-8 w-8 text-primary mx-auto mb-2" />
                <h3 className="text-h2 mb-1">Alumni Network</h3>
                <p className="text-small text-muted-foreground">
                  Connect with graduates from your school and era
                </p>
              </div>
              <div>
                <GraduationCap className="h-8 w-8 text-primary mx-auto mb-2" />
                <h3 className="text-h2 mb-1">Give Back</h3>
                <p className="text-small text-muted-foreground">
                  Share your experience and help the next generation
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Mentorship Request Modal */}
      {selectedProfile && (
        <MentorshipRequestModal
          isOpen={requestModalOpen}
          onClose={handleModalClose}
          targetProfile={selectedProfile}
          currentUserProfile={userProfile}
        />
      )}
    </AppLayout>
  );
}

