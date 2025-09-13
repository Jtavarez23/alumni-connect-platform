import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { UpgradePrompt } from '@/components/ui/upgrade-prompt';
import SchoolSwitcher from '@/components/dashboard/SchoolSwitcher';
import { MessageDialog } from '@/components/messaging/MessageDialog';
import { 
  Users, 
  School,
  GraduationCap,
  Users2,
  Search,
  MapPin,
  Calendar,
  Filter,
  UserPlus,
  MessageCircle,
  Star,
  Crown,
  Building,
  Heart,
  Clock
} from 'lucide-react';

// AC-ARCH-001 Network interfaces
interface Person {
  id: string;
  name: string;
  avatar: string;
  school: string;
  gradYear: number;
  location: string;
  industry: string;
  mutualConnections: number;
  sharedClubs: string[];
  isConnected: boolean;
  recentlyJoined?: boolean;
}

interface SchoolDirectory {
  id: string;
  name: string;
  type: string;
  location: string;
  alumniCount: number;
  isFollowing: boolean;
  recentActivity: string;
  logo?: string;
}

interface ClassClub {
  id: string;
  name: string;
  type: 'class' | 'club';
  school: string;
  year?: number;
  memberCount: number;
  description: string;
  isJoined: boolean;
  lastActivity: string;
}

interface CustomGroup {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  isPrivate: boolean;
  isPremium: boolean;
  isJoined: boolean;
  category: string;
  lastActivity: string;
}

function Network() {
  const { user, profile } = useAuth();
  const { isFreeTier } = useSubscription();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('people');
  const [searchQuery, setSearchQuery] = useState('');
  const [contextSchool, setContextSchool] = useState<string | null>(null);
  const [connections, setConnections] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [sentRequests, setSentRequests] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // AC-ARCH-001: Network → People filters
  const [selectedSchool, setSelectedSchool] = useState<string>('all');
  const [gradYearRange, setGradYearRange] = useState<string>('all');
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [selectedIndustry, setSelectedIndustry] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('mutuals');
  
  // AC-ARCH-001: Mock data following "classmates, same era, mutuals" spec
  const mockPeople = useMemo(() => [
    {
      id: '1',
      name: 'Sarah Johnson',
      avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
      school: 'Miami High School',
      gradYear: 2005,
      location: 'Miami, FL',
      industry: 'Technology',
      mutualConnections: 12,
      sharedClubs: ['Drama Club', 'Student Council'],
      isConnected: false,
      recentlyJoined: true
    },
    {
      id: '2',
      name: 'Michael Chen',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
      school: 'Central Academy',
      gradYear: 2003,
      location: 'Orlando, FL',
      industry: 'Marketing',
      mutualConnections: 8,
      sharedClubs: ['Chess Club'],
      isConnected: true,
      recentlyJoined: false
    }
  ], []);
  
  const mockSchools = useMemo(() => [
    {
      id: '1',
      name: 'Miami High School',
      type: 'Public High School',
      location: 'Miami, FL',
      alumniCount: 12450,
      isFollowing: true,
      recentActivity: '15 new alumni joined this month',
      logo: undefined
    },
    {
      id: '2', 
      name: 'Central Academy',
      type: 'Private Academy',
      location: 'Orlando, FL',
      alumniCount: 3200,
      isFollowing: false,
      recentActivity: '8 new alumni joined this month'
    }
  ], []);
  
  const mockClassesClubs = useMemo(() => [
    {
      id: '1',
      name: 'Class of 2005',
      type: 'class' as const,
      school: 'Miami High School',
      year: 2005,
      memberCount: 287,
      description: 'Official hub for Miami High Class of 2005 graduates',
      isJoined: true,
      lastActivity: '2 days ago'
    },
    {
      id: '2',
      name: 'Drama Club Alumni',
      type: 'club' as const,
      school: 'Miami High School',
      memberCount: 94,
      description: 'Former Drama Club members staying connected',
      isJoined: false,
      lastActivity: '1 week ago'
    }
  ], []);
  
  const mockGroups = useMemo(() => [
    {
      id: '1',
      name: 'Miami Tech Professionals',
      description: 'Alumni working in technology companies',
      memberCount: 156,
      isPrivate: false,
      isPremium: false,
      isJoined: true,
      category: 'Professional',
      lastActivity: '3 hours ago'
    },
    {
      id: '2',
      name: 'Elite Networking Circle',
      description: 'Premium networking group for verified professionals',
      memberCount: 42,
      isPrivate: true,
      isPremium: true,
      isJoined: false,
      category: 'Premium',
      lastActivity: '1 day ago'
    }
  ], []);

  // AC-ARCH-001: People filtering logic
  const filteredPeople = useMemo(() => {
    let filtered = mockPeople;
    
    if (searchQuery) {
      filtered = filtered.filter(person => 
        person.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        person.school.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    if (selectedSchool !== 'all') {
      filtered = filtered.filter(person => person.school === selectedSchool);
    }
    
    if (gradYearRange !== 'all') {
      const currentYear = new Date().getFullYear();
      const ranges: Record<string, [number, number]> = {
        'recent': [currentYear - 5, currentYear],
        'same-era': [2000, 2010],
        'older': [1980, 1999]
      };
      const [min, max] = ranges[gradYearRange] || [0, 9999];
      filtered = filtered.filter(person => person.gradYear >= min && person.gradYear <= max);
    }
    
    // AC-ARCH-001: Sort by "Mutuals, Recently joined, Same class"
    if (sortBy === 'mutuals') {
      filtered.sort((a, b) => b.mutualConnections - a.mutualConnections);
    } else if (sortBy === 'recently-joined') {
      filtered.sort((a, b) => (b.recentlyJoined ? 1 : 0) - (a.recentlyJoined ? 1 : 0));
    } else if (sortBy === 'same-class') {
      const userGradYear = profile?.graduation_year || 2005;
      filtered.sort((a, b) => Math.abs(a.gradYear - userGradYear) - Math.abs(b.gradYear - userGradYear));
    }
    
    return filtered;
  }, [mockPeople, searchQuery, selectedSchool, gradYearRange, sortBy, profile?.graduation_year]);

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };
  
  const handleConnect = (personId: string) => {
    console.log('Connect with person:', personId);
    // TODO: Implement connection logic
  };
  
  const handleFollowSchool = (schoolId: string) => {
    console.log('Follow school:', schoolId);
    // TODO: Implement school follow logic
  };
  
  const handleJoinGroup = (groupId: string) => {
    console.log('Join group:', groupId);
    // TODO: Implement group join logic
  };

  // AC-ARCH-001: Person card component
  const renderPersonCard = (person: Person) => {
    return (
      <Card key={person.id} className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            <Avatar className="h-12 w-12">
              <AvatarImage src={person.avatar} />
              <AvatarFallback>{getInitials(person.name)}</AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-h2 font-semibold truncate">{person.name}</h3>
                {person.recentlyJoined && (
                  <Badge variant="secondary" className="text-xs">New</Badge>
                )}
              </div>
              
              <div className="space-y-1 text-small text-muted-foreground">
                <div className="flex items-center gap-1">
                  <GraduationCap className="h-3 w-3" />
                  <span>{person.school} '{String(person.gradYear).slice(-2)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  <span>{person.location}</span>
                </div>
                {person.mutualConnections > 0 && (
                  <div className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    <span>{person.mutualConnections} mutual connections</span>
                  </div>
                )}
                {person.sharedClubs.length > 0 && (
                  <div className="flex items-center gap-1">
                    <Users2 className="h-3 w-3" />
                    <span>Shared: {person.sharedClubs.slice(0, 2).join(', ')}</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {person.isConnected ? (
                <Button variant="secondary" size="sm">
                  <MessageCircle className="h-4 w-4" />
                </Button>
              ) : (
                <Button variant="primary" size="sm" onClick={() => handleConnect(person.id)}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Connect
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // AC-ARCH-001: School card component
  const renderSchoolCard = (school: SchoolDirectory) => {
    return (
      <Card key={school.id} className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
              {school.logo ? (
                <img src={school.logo} alt={school.name} className="h-8 w-8 rounded" />
              ) : (
                <School className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="text-h2 font-semibold truncate mb-1">{school.name}</h3>
              <p className="text-small text-muted-foreground mb-2">{school.type}</p>
              
              <div className="space-y-1 text-small text-muted-foreground">
                <div className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  <span>{school.location}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  <span>{school.alumniCount.toLocaleString()} alumni</span>
                </div>
                <p className="text-xs">{school.recentActivity}</p>
              </div>
            </div>
            
            <Button 
              variant={school.isFollowing ? "secondary" : "primary"} 
              size="sm"
              onClick={() => handleFollowSchool(school.id)}
            >
              {school.isFollowing ? (
                <><Heart className="h-4 w-4 mr-2" />Following</>
              ) : (
                <><UserPlus className="h-4 w-4 mr-2" />Follow</>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };
  
  // AC-ARCH-001: Classes & Clubs card component
  const renderClassClubCard = (item: ClassClub) => {
    return (
      <Card key={item.id} className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
              {item.type === 'class' ? (
                <GraduationCap className="h-6 w-6 text-primary" />
              ) : (
                <Users2 className="h-6 w-6 text-secondary" />
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-h2 font-semibold truncate">{item.name}</h3>
                <Badge variant={item.type === 'class' ? 'default' : 'secondary'}>
                  {item.type === 'class' ? 'Class' : 'Club'}
                </Badge>
              </div>
              
              <p className="text-small text-muted-foreground mb-2 line-clamp-2">
                {item.description}
              </p>
              
              <div className="space-y-1 text-small text-muted-foreground">
                <div className="flex items-center gap-1">
                  <School className="h-3 w-3" />
                  <span>{item.school}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  <span>{item.memberCount} members</span>
                </div>
                <p className="text-xs">Active {item.lastActivity}</p>
              </div>
            </div>
            
            <Button 
              variant={item.isJoined ? "secondary" : "primary"} 
              size="sm"
              onClick={() => handleJoinGroup(item.id)}
            >
              {item.isJoined ? 'Joined' : 'Join'}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };
  
  // AC-ARCH-001: Custom Groups card component
  const renderGroupCard = (group: CustomGroup) => {
    return (
      <Card key={group.id} className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
              {group.isPremium ? (
                <Crown className="h-6 w-6 text-yellow-500" />
              ) : (
                <Users className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-h2 font-semibold truncate">{group.name}</h3>
                {group.isPremium && (
                  <Badge variant="premium">Premium</Badge>
                )}
                {group.isPrivate && (
                  <Badge variant="secondary">Private</Badge>
                )}
              </div>
              
              <p className="text-small text-muted-foreground mb-2 line-clamp-2">
                {group.description}
              </p>
              
              <div className="space-y-1 text-small text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  <span>{group.memberCount} members</span>
                </div>
                <div className="flex items-center gap-1">
                  <Building className="h-3 w-3" />
                  <span>{group.category}</span>
                </div>
                <p className="text-xs">Active {group.lastActivity}</p>
              </div>
            </div>
            
            <Button 
              variant={group.isJoined ? "secondary" : "primary"} 
              size="sm"
              onClick={() => handleJoinGroup(group.id)}
              disabled={group.isPremium && !group.isJoined}
            >
              {group.isJoined ? 'Joined' : (group.isPremium ? 'Premium' : 'Join')}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Placeholder functions for connection and request rendering
  const renderConnectionCard = (connection: any) => (
    <Card key={connection.id} className="p-4">
      <div className="flex items-center gap-4">
        <Avatar className="h-12 w-12">
          <AvatarFallback>{getInitials(connection.name || 'Unknown')}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h4 className="font-semibold">{connection.name || 'Unknown User'}</h4>
          <p className="text-sm text-muted-foreground">Connection</p>
        </div>
      </div>
    </Card>
  );

  const renderRequestCard = (friendship: any, isIncoming: boolean) => (
    <Card key={friendship.id} className="p-4">
      <div className="flex items-center gap-4">
        <Avatar className="h-12 w-12">
          <AvatarFallback>{getInitials(friendship.name || 'Unknown')}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h4 className="font-semibold">{friendship.name || 'Unknown User'}</h4>
          <p className="text-sm text-muted-foreground">
            {isIncoming ? 'Incoming request' : 'Sent request'}
          </p>
        </div>
        {isIncoming && (
          <div className="flex gap-2">
            <Button size="sm" variant="default">Accept</Button>
            <Button size="sm" variant="outline">Decline</Button>
          </div>
        )}
      </div>
    </Card>
  );

  return (
    <AppLayout title="My Network">
      <div className="p-6">
        {/* Subscription Status Banner */}
        {isFreeTier && (
          <Card className="mb-6 border-warning bg-warning/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-warning/10 rounded-full">
                    <Crown className="h-5 w-5 text-warning" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-warning-foreground">Free Tier Network</h3>
                    <p className="text-sm text-muted-foreground">
                      Your network is limited to alumni from your graduation year. Upgrade to connect with alumni from all years.
                    </p>
                  </div>
                </div>
                <UpgradePrompt compact onUpgrade={() => navigate('/settings')} />
              </div>
            </CardContent>
          </Card>
        )}

        {/* School Context Switcher */}
        <div className="mb-6">
          <SchoolSwitcher 
            selectedSchool={contextSchool}
            onSchoolSelect={setContextSchool}
          />
        </div>

        {/* Network Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{connections.length}</p>
                  <p className="text-sm text-muted-foreground">Connections</p>
                  {isFreeTier && (
                    <p className="text-xs text-warning">Same year only</p>
                  )}
                </div>
                <Users className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{pendingRequests.length}</p>
                  <p className="text-sm text-muted-foreground">Pending Requests</p>
                </div>
                <UserPlus className="h-8 w-8 text-warning" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{sentRequests.length}</p>
                  <p className="text-sm text-muted-foreground">Sent Requests</p>
                </div>
                <Clock className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Network Tabs */}
        <Tabs defaultValue="connections" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="connections">
              Connections ({connections.length})
            </TabsTrigger>
            <TabsTrigger value="requests">
              Requests ({pendingRequests.length})
            </TabsTrigger>
            <TabsTrigger value="sent">
              Sent ({sentRequests.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="connections" className="mt-6">
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <Card key={i} className="p-4">
                    <div className="flex items-center gap-4">
                      <Skeleton className="h-12 w-12 rounded-full" />
                      <div className="flex-1">
                        <Skeleton className="h-4 w-32 mb-2" />
                        <Skeleton className="h-3 w-48" />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : connections.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No connections yet</h3>
                <p className="text-muted-foreground mb-4">
                  {isFreeTier 
                    ? "Start connecting with alumni from your graduation year"
                    : "Start connecting with alumni from your school"
                  }
                </p>
                <Button onClick={() => navigate('/alumni')}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Find Alumni
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {connections.map(renderConnectionCard)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="requests" className="mt-6">
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(2)].map((_, i) => (
                  <Card key={i} className="p-4">
                    <div className="flex items-center gap-4">
                      <Skeleton className="h-12 w-12 rounded-full" />
                      <div className="flex-1">
                        <Skeleton className="h-4 w-32 mb-2" />
                        <Skeleton className="h-3 w-48" />
                      </div>
                      <div className="flex gap-2">
                        <Skeleton className="h-8 w-8" />
                        <Skeleton className="h-8 w-8" />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : pendingRequests.length === 0 ? (
              <div className="text-center py-12">
                <UserPlus className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No pending requests</h3>
                <p className="text-muted-foreground">
                  You don't have any friend requests at the moment
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingRequests.map(friendship => renderRequestCard(friendship, true))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="sent" className="mt-6">
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(2)].map((_, i) => (
                  <Card key={i} className="p-4">
                    <div className="flex items-center gap-4">
                      <Skeleton className="h-12 w-12 rounded-full" />
                      <div className="flex-1">
                        <Skeleton className="h-4 w-32 mb-2" />
                        <Skeleton className="h-3 w-48" />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : sentRequests.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No sent requests</h3>
                <p className="text-muted-foreground">
                  You haven't sent any friend requests yet
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {sentRequests.map(friendship => renderRequestCard(friendship, false))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Premium Upgrade Prompt */}
        {isFreeTier && (connections.length > 0 || pendingRequests.length > 0 || sentRequests.length > 0) && (
          <div className="mt-8">
            <UpgradePrompt 
              feature="unlimited cross-year networking"
              onUpgrade={() => navigate('/settings')}
            />
          </div>
        )}
      </div>

      {/* Message Dialog */}
      {selectedUser && (
        <MessageDialog
          isOpen={messageDialogOpen}
          onClose={() => {
            setMessageDialogOpen(false);
            setSelectedUser(null);
          }}
          otherUser={selectedUser}
        />
      )}
    </AppLayout>
  );
};

export default Network;