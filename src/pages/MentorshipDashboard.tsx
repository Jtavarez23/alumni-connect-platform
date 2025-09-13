import React, { useState } from 'react';
import { 
  Users, 
  MessageCircle, 
  Calendar, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Star, 
  Filter, 
  Search,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AppLayout } from '@/components/layout/AppLayout';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useUserMentorshipMatches, useAcceptMentorshipMatch } from '@/hooks/useJobs';
import { toast } from 'sonner';
import type { MentorshipMatch } from '@/types/jobs';

export default function MentorshipDashboard() {
  const { data: matchesData, isLoading, error } = useUserMentorshipMatches();
  const acceptMatchMutation = useAcceptMentorshipMatch();
  
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedMatch, setExpandedMatch] = useState<string | null>(null);

  const allMatches = React.useMemo(() => {
    if (!matchesData) return [];
    return [...matchesData.as_mentor, ...matchesData.as_mentee];
  }, [matchesData]);

  const filteredMatches = React.useMemo(() => {
    let filtered = allMatches;
    
    // Filter by status
    if (activeTab !== 'all') {
      filtered = filtered.filter(match => match.status === activeTab);
    }
    
    // Filter by search
    if (searchQuery) {
      filtered = filtered.filter(match => {
        const partner = match.mentor_id === matchesData?.currentUser?.id ? match.mentee : match.mentor;
        return (
          partner?.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          partner?.current_role?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          partner?.current_company?.toLowerCase().includes(searchQuery.toLowerCase())
        );
      });
    }
    
    return filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [allMatches, activeTab, searchQuery, matchesData?.currentUser?.id]);

  const handleAcceptMatch = async (matchId: string, accept: boolean) => {
    try {
      await acceptMatchMutation.mutateAsync({ matchId, accept });
      toast.success(accept ? 'Match accepted!' : 'Match declined');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update match');
    }
  };

  const getPartnerProfile = (match: MentorshipMatch) => {
    return match.mentor_id === matchesData?.currentUser?.id ? match.mentee : match.mentor;
  };

  const getUserRole = (match: MentorshipMatch) => {
    return match.mentor_id === matchesData?.currentUser?.id ? 'mentor' : 'mentee';
  };

  if (isLoading) {
    return (
      <AppLayout title="Mentorship Dashboard">
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingSpinner size="lg" />
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout title="Mentorship Dashboard">
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">Failed to load mentorship matches</p>
          <Button onClick={() => window.location.reload()} variant="outline">
            Try Again
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Mentorship Dashboard">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-display gradient-text">Mentorship Dashboard</h1>
          <p className="text-body text-muted-foreground">
            Manage your mentorship connections and requests
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6 text-center">
              <Users className="w-8 h-8 text-primary mx-auto mb-2" />
              <h3 className="text-2xl font-bold">{allMatches.length}</h3>
              <p className="text-sm text-muted-foreground">Total Connections</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6 text-center">
              <Clock className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
              <h3 className="text-2xl font-bold">
                {allMatches.filter(m => m.status === 'suggested').length}
              </h3>
              <p className="text-sm text-muted-foreground">Pending Requests</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6 text-center">
              <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
              <h3 className="text-2xl font-bold">
                {allMatches.filter(m => m.status === 'accepted').length}
              </h3>
              <p className="text-sm text-muted-foreground">Active Mentorships</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6 text-center">
              <Star className="w-8 h-8 text-blue-500 mx-auto mb-2" />
              <h3 className="text-2xl font-bold">
                {allMatches.filter(m => m.status === 'accepted' && getUserRole(m) === 'mentor').length}
              </h3>
              <p className="text-sm text-muted-foreground">As Mentor</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Search connections..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto">
                <TabsList>
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="suggested">Pending</TabsTrigger>
                  <TabsTrigger value="accepted">Active</TabsTrigger>
                  <TabsTrigger value="ended">Ended</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardContent>
        </Card>

        {/* Matches List */}
        <div className="space-y-4">
          {filteredMatches.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-h2 mb-2">No connections found</h3>
                <p className="text-body text-muted-foreground">
                  {activeTab === 'suggested' 
                    ? 'You don\'t have any pending mentorship requests.'
                    : activeTab === 'accepted'
                    ? 'You don\'t have any active mentorships.'
                    : 'Start connecting with alumni to see your mentorship matches here.'
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredMatches.map((match) => {
              const partner = getPartnerProfile(match);
              const userRole = getUserRole(match);
              const isExpanded = expandedMatch === match.id;

              return (
                <Card key={match.id} className="overflow-hidden">
                  <CardContent className="p-0">
                    <div className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4 flex-1">
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={partner?.avatar_url} />
                            <AvatarFallback>
                              {partner?.display_name?.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="text-h2 font-semibold">{partner?.display_name}</h3>
                              <Badge variant={match.status === 'accepted' ? 'verified' : 'secondary'}>
                                {match.status}
                              </Badge>
                              <Badge variant="outline">
                                {userRole === 'mentor' ? 'Your Mentee' : 'Your Mentor'}
                              </Badge>
                            </div>
                            
                            {partner?.current_role && partner?.current_company && (
                              <p className="text-small text-muted-foreground">
                                {partner.current_role} at {partner.current_company}
                              </p>
                            )}
                            
                            <p className="text-xs text-muted-foreground mt-1">
                              Connected {new Date(match.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setExpandedMatch(isExpanded ? null : match.id)}
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </Button>
                      </div>

                      {isExpanded && (
                        <div className="mt-4 space-y-4 pt-4 border-t">
                          {match.message && (
                            <div>
                              <h4 className="text-sm font-medium mb-2">Initial Message</h4>
                              <p className="text-sm text-muted-foreground bg-muted p-3 rounded">
                                {match.message}
                              </p>
                            </div>
                          )}

                          {match.match_score && (
                            <div className="flex items-center gap-2">
                              <Star className="w-4 h-4 text-yellow-500" />
                              <span className="text-sm">Match Score: {match.match_score}%</span>
                            </div>
                          )}

                          {match.status === 'suggested' && userRole === 'mentor' && (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleAcceptMatch(match.id, true)}
                                disabled={acceptMatchMutation.isPending}
                              >
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Accept
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleAcceptMatch(match.id, false)}
                                disabled={acceptMatchMutation.isPending}
                              >
                                <XCircle className="w-4 h-4 mr-2" />
                                Decline
                              </Button>
                            </div>
                          )}

                          {match.status === 'accepted' && (
                            <div className="flex gap-2">
                              <Button size="sm">
                                <MessageCircle className="w-4 h-4 mr-2" />
                                Send Message
                              </Button>
                              <Button variant="outline" size="sm">
                                <Calendar className="w-4 h-4 mr-2" />
                                Schedule Meeting
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </AppLayout>
  );
}