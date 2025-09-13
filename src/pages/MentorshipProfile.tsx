import React, { useState, useEffect } from 'react';
import { Save, X, Calendar, Clock, Users, Briefcase, GraduationCap, Globe, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AppLayout } from '@/components/layout/AppLayout';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useMentorshipProfile, useUpsertMentorshipProfile } from '@/hooks/useJobs';
import { toast } from 'sonner';
import type { MentorshipRole } from '@/types/jobs';
import { INDUSTRIES, SKILLS, MEETING_PREFERENCES } from '@/types/jobs';

export default function MentorshipProfile() {
  const { data: profile, isLoading, error } = useMentorshipProfile();
  const upsertProfileMutation = useUpsertMentorshipProfile();
  
  const [formData, setFormData] = useState({
    role: 'both' as MentorshipRole,
    bio: '',
    expertise_areas: [] as string[],
    industries: [] as string[],
    skills: [] as string[],
    current_role: '',
    current_company: '',
    availability: {
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      preferred_days: [] as string[],
      preferred_times: [] as string[]
    },
    meeting_preferences: [] as string[],
    max_mentees: 3,
    is_available: true,
    linkedin_url: '',
    portfolio_url: ''
  });

  const [selectedSkill, setSelectedSkill] = useState('');
  const [selectedIndustry, setSelectedIndustry] = useState('');
  const [selectedMeetingPref, setSelectedMeetingPref] = useState('');

  useEffect(() => {
    if (profile) {
      setFormData({
        role: profile.role || 'both',
        bio: profile.bio || '',
        expertise_areas: profile.expertise_areas || [],
        industries: profile.industries || [],
        skills: profile.skills || [],
        current_role: profile.current_role || '',
        current_company: profile.current_company || '',
        availability: profile.availability || {
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          preferred_days: [],
          preferred_times: []
        },
        meeting_preferences: profile.meeting_preferences || [],
        max_mentees: profile.max_mentees || 3,
        is_available: profile.is_available !== undefined ? profile.is_available : true,
        linkedin_url: profile.linkedin_url || '',
        portfolio_url: profile.portfolio_url || ''
      });
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await upsertProfileMutation.mutateAsync(formData);
      toast.success('Mentorship profile saved successfully!');
    } catch (error) {
      toast.error('Failed to save mentorship profile');
    }
  };

  const addItem = (field: keyof typeof formData, value: string) => {
    if (value && !formData[field].includes(value)) {
      setFormData(prev => ({
        ...prev,
        [field]: [...prev[field], value]
      }));
    }
  };

  const removeItem = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].filter(item => item !== value)
    }));
  };

  const updateAvailability = (field: keyof typeof formData.availability, value: any) => {
    setFormData(prev => ({
      ...prev,
      availability: {
        ...prev.availability,
        [field]: value
      }
    }));
  };

  if (isLoading) {
    return (
      <AppLayout title="Mentorship Profile">
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingSpinner size="lg" />
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout title="Mentorship Profile">
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">Failed to load mentorship profile</p>
          <Button onClick={() => window.location.reload()} variant="outline">
            Try Again
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Mentorship Profile">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-display gradient-text">Mentorship Profile</h1>
          <p className="text-body text-muted-foreground">
            Set up your mentorship preferences and expertise to connect with fellow alumni
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="expertise">Expertise</TabsTrigger>
              <TabsTrigger value="availability">Availability</TabsTrigger>
              <TabsTrigger value="preferences">Preferences</TabsTrigger>
            </TabsList>

            <TabsContent value="basic">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Basic Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="role">Mentorship Role</Label>
                      <Select
                        value={formData.role}
                        onValueChange={(value: MentorshipRole) => setFormData(prev => ({ ...prev, role: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="mentor">Mentor</SelectItem>
                          <SelectItem value="mentee">Mentee</SelectItem>
                          <SelectItem value="both">Both</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="max_mentees">Max Mentees (if mentor)</Label>
                      <Input
                        id="max_mentees"
                        type="number"
                        min="1"
                        max="10"
                        value={formData.max_mentees}
                        onChange={(e) => setFormData(prev => ({ ...prev, max_mentees: parseInt(e.target.value) }))}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="current_role">Current Role</Label>
                    <Input
                      id="current_role"
                      value={formData.current_role}
                      onChange={(e) => setFormData(prev => ({ ...prev, current_role: e.target.value }))}
                      placeholder="e.g., Senior Software Engineer"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="current_company">Current Company</Label>
                    <Input
                      id="current_company"
                      value={formData.current_company}
                      onChange={(e) => setFormData(prev => ({ ...prev, current_company: e.target.value }))}
                      placeholder="e.g., Google"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bio">Bio & Introduction</Label>
                    <Textarea
                      id="bio"
                      value={formData.bio}
                      onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                      placeholder="Tell us about your background, experience, and what you can offer as a mentor or what you're looking for as a mentee..."
                      rows={4}
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_available"
                      checked={formData.is_available}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_available: checked }))}
                    />
                    <Label htmlFor="is_available">Available for mentorship</Label>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="expertise">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Briefcase className="w-5 h-5" />
                    Expertise & Skills
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Industries</Label>
                    <div className="flex gap-2">
                      <Select value={selectedIndustry} onValueChange={setSelectedIndustry}>
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Select industry" />
                        </SelectTrigger>
                        <SelectContent>
                          {INDUSTRIES.map(industry => (
                            <SelectItem key={industry} value={industry}>{industry}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button type="button" onClick={() => addItem('industries', selectedIndustry)}>
                        Add
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {formData.industries.map(industry => (
                        <Badge key={industry} variant="secondary" className="flex items-center gap-1">
                          {industry}
                          <X className="w-3 h-3 cursor-pointer" onClick={() => removeItem('industries', industry)} />
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Skills & Expertise Areas</Label>
                    <div className="flex gap-2">
                      <Select value={selectedSkill} onValueChange={setSelectedSkill}>
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Select skill" />
                        </SelectTrigger>
                        <SelectContent>
                          {SKILLS.map(skill => (
                            <SelectItem key={skill} value={skill}>{skill}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button type="button" onClick={() => addItem('skills', selectedSkill)}>
                        Add
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {formData.skills.map(skill => (
                        <Badge key={skill} variant="secondary" className="flex items-center gap-1">
                          {skill}
                          <X className="w-3 h-3 cursor-pointer" onClick={() => removeItem('skills', skill)} />
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="linkedin_url">LinkedIn Profile</Label>
                    <Input
                      id="linkedin_url"
                      type="url"
                      value={formData.linkedin_url}
                      onChange={(e) => setFormData(prev => ({ ...prev, linkedin_url: e.target.value }))}
                      placeholder="https://linkedin.com/in/yourname"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="portfolio_url">Portfolio/Website</Label>
                    <Input
                      id="portfolio_url"
                      type="url"
                      value={formData.portfolio_url}
                      onChange={(e) => setFormData(prev => ({ ...prev, portfolio_url: e.target.value }))}
                      placeholder="https://yourportfolio.com"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="availability">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Availability
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="timezone">Timezone</Label>
                    <Input
                      id="timezone"
                      value={formData.availability.timezone}
                      onChange={(e) => updateAvailability('timezone', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Preferred Days</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                        <div key={day} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={`day-${day}`}
                            checked={formData.availability.preferred_days.includes(day)}
                            onChange={(e) => {
                              const days = e.target.checked
                                ? [...formData.availability.preferred_days, day]
                                : formData.availability.preferred_days.filter(d => d !== day);
                              updateAvailability('preferred_days', days);
                            }}
                            className="rounded border-gray-300"
                          />
                          <Label htmlFor={`day-${day}`} className="text-sm">{day}</Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Preferred Times</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {['Morning', 'Afternoon', 'Evening', 'Weekend'].map(time => (
                        <div key={time} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={`time-${time}`}
                            checked={formData.availability.preferred_times.includes(time)}
                            onChange={(e) => {
                              const times = e.target.checked
                                ? [...formData.availability.preferred_times, time]
                                : formData.availability.preferred_times.filter(t => t !== time);
                              updateAvailability('preferred_times', times);
                            }}
                            className="rounded border-gray-300"
                          />
                          <Label htmlFor={`time-${time}`} className="text-sm">{time}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="preferences">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageCircle className="w-5 h-5" />
                    Meeting Preferences
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Preferred Meeting Methods</Label>
                    <div className="flex gap-2">
                      <Select value={selectedMeetingPref} onValueChange={setSelectedMeetingPref}>
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Select method" />
                        </SelectTrigger>
                        <SelectContent>
                          {MEETING_PREFERENCES.map(method => (
                            <SelectItem key={method} value={method}>{method}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button type="button" onClick={() => addItem('meeting_preferences', selectedMeetingPref)}>
                        Add
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {formData.meeting_preferences.map(method => (
                        <Badge key={method} variant="secondary" className="flex items-center gap-1">
                          {method}
                          <X className="w-3 h-3 cursor-pointer" onClick={() => removeItem('meeting_preferences', method)} />
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Mentorship Goals</Label>
                    <Textarea
                      placeholder="What are your specific goals for mentorship? What do you hope to achieve?"
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={() => window.history.back()}>
              Cancel
            </Button>
            <Button type="submit" disabled={upsertProfileMutation.isPending}>
              {upsertProfileMutation.isPending ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Profile
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}