import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../integrations/supabase/client'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Badge } from '../components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import { 
  Users, 
  MessageCircle, 
  Calendar, 
  BookOpen, 
  MapPin, 
  Shield,
  Plus,
  Search,
  UserPlus,
  Settings,
  ArrowLeft
} from 'lucide-react'
import { getInitials } from '../lib/utils'

export default function GroupDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [group, setGroup] = useState<any>(null)
  const [members, setMembers] = useState<any[]>([])
  const [posts, setPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isMember, setIsMember] = useState(false)
  const [userRole, setUserRole] = useState('')
  const [activeTab, setActiveTab] = useState('members')

  useEffect(() => {
    if (id) {
      fetchGroupData()
    }
  }, [id, user])

  const fetchGroupData = async () => {
    try {
      // Fetch group details
      const { data: groupData, error: groupError } = await supabase
        .from('groups')
        .select('*, group_members(count)')
        .eq('id', id)
        .single()

      if (groupError) throw groupError
      setGroup(groupData)

      // Fetch members
      const { data: membersData, error: membersError } = await supabase
        .from('group_members')
        .select('*, profiles:user_id(*)')
        .eq('group_id', id)
        .order('created_at', { ascending: false })

      if (membersError) throw membersError
      setMembers(membersData || [])

      // Check if current user is a member
      if (user) {
        const { data: userMembership, error: membershipError } = await supabase
          .from('group_members')
          .select('role')
          .eq('group_id', id)
          .eq('user_id', user.id)
          .single()

        if (!membershipError && userMembership) {
          setIsMember(true)
          setUserRole(userMembership.role)
        }
      }

      // Fetch group posts (placeholder for now)
      setPosts([])

    } catch (error) {
      console.error('Error fetching group data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleJoinGroup = async () => {
    if (!user) return

    try {
      const { error } = await supabase
        .from('group_members')
        .insert([{
          group_id: id,
          user_id: user.id,
          role: 'member'
        }])

      if (error) throw error
      setIsMember(true)
      setUserRole('member')
      await fetchGroupData() // Refresh data
    } catch (error) {
      console.error('Error joining group:', error)
      alert('Failed to join group. Please try again.')
    }
  }

  const handleLeaveGroup = async () => {
    if (!user) return

    try {
      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('group_id', id)
        .eq('user_id', user.id)

      if (error) throw error
      setIsMember(false)
      setUserRole('')
      await fetchGroupData() // Refresh data
    } catch (error) {
      console.error('Error leaving group:', error)
      alert('Failed to leave group. Please try again.')
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-48 bg-gray-200 rounded"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (!group) {
    return (
      <div className="container mx-auto p-4 text-center">
        <h1 className="text-2xl font-bold mb-4">Group not found</h1>
        <Button onClick={() => navigate('/groups')}>Back to Groups</Button>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4">
      <Button
        variant="ghost"
        onClick={() => navigate('/groups')}
        className="mb-6"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Groups
      </Button>

      {/* Group Header */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <CardTitle className="text-2xl">{group.name}</CardTitle>
                <Badge variant={group.privacy === 'public' ? 'default' : 'secondary'}>
                  {group.privacy}
                </Badge>
                {userRole === 'owner' && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Settings className="w-3 h-3" />
                    Owner
                  </Badge>
                )}
              </div>
              <CardDescription>{group.description}</CardDescription>
            </div>
            
            {user && (
              <div className="flex gap-2">
                {isMember ? (
                  <>
                    {userRole === 'owner' && (
                      <Button variant="outline" size="sm">
                        <Settings className="w-4 h-4 mr-2" />
                        Manage
                      </Button>
                    )}
                    <Button variant="destructive" size="sm" onClick={handleLeaveGroup}>
                      Leave Group
                    </Button>
                  </>
                ) : (
                  <Button onClick={handleJoinGroup}>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Join Group
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span>{group.group_members[0]?.count || 0} members</span>
            </div>
            <div className="flex items-center gap-2">
              {group.type === 'class' && <BookOpen className="w-4 h-4" />}
              {group.type === 'club' && <Calendar className="w-4 h-4" />}
              {group.type === 'team' && <Shield className="w-4 h-4" />}
              <span className="capitalize">{group.type}</span>
            </div>
            {group.school_id && (
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                <span>School Group</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Group Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="posts">Posts</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
          <TabsTrigger value="about">About</TabsTrigger>
        </TabsList>

        <TabsContent value="members">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Members ({members.length})</CardTitle>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input placeholder="Search members..." className="pl-10" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {members.map((member) => (
                  <div key={member.id} className="flex items-center gap-3 p-3 rounded-lg border">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={member.profiles?.avatar_url} />
                      <AvatarFallback>
                        {getInitials(member.profiles?.first_name, member.profiles?.last_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {member.profiles?.first_name} {member.profiles?.last_name}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        {member.role === 'owner' ? 'Group Owner' : 'Member'}
                      </p>
                    </div>
                    {member.role === 'owner' && (
                      <Badge variant="outline">Owner</Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="posts">
          <Card>
            <CardHeader>
              <CardTitle>Group Posts</CardTitle>
              <CardDescription>
                Share updates, memories, and connect with other members
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isMember ? (
                <div className="text-center py-12">
                  <MessageCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No posts yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Be the first to share something with the group!
                  </p>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Post
                  </Button>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Shield className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Join to see posts</h3>
                  <p className="text-muted-foreground mb-4">
                    Become a member to view and participate in discussions
                  </p>
                  <Button onClick={handleJoinGroup}>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Join Group
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="events">
          <Card>
            <CardHeader>
              <CardTitle>Group Events</CardTitle>
              <CardDescription>
                Upcoming events and gatherings for this group
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Calendar className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No events scheduled</h3>
                <p className="text-muted-foreground">
                  Check back later for upcoming group events
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="about">
          <Card>
            <CardHeader>
              <CardTitle>About This Group</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Description</h4>
                  <p className="text-muted-foreground">{group.description || 'No description provided.'}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-2">Group Type</h4>
                    <Badge variant="outline" className="capitalize">
                      {group.type}
                    </Badge>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold mb-2">Privacy</h4>
                    <Badge variant={group.privacy === 'public' ? 'default' : 'secondary'}>
                      {group.privacy}
                    </Badge>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Created</h4>
                  <p className="text-muted-foreground">
                    {new Date(group.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}