// Job Posting Form
// Create new job listings for the alumni job board

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, DollarSign, MapPin, Briefcase, Mail, Globe, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { useCreateJob } from '@/hooks/useJobs';
import { AppLayout } from '@/components/layout/AppLayout';
import { JOB_TYPES, EXPERIENCE_LEVELS } from '@/types/jobs';
import type { CreateJobPayload } from '@/types/jobs';

export function PostJob() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const createMutation = useCreateJob();
  
  const [formData, setFormData] = useState<CreateJobPayload>({
    title: '',
    company: '',
    description: '',
    job_type: 'full-time',
    experience_level: 'mid',
    remote: false,
    salary_min: undefined,
    salary_max: undefined,
    location: '',
    apply_url: '',
    apply_email: '',
    requirements: '',
    benefits: '',
    visibility: 'alumni_only'
  });

  const updateFormData = (updates: Partial<CreateJobPayload>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.company || !formData.description) {
      toast({
        title: 'Missing required fields',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    try {
      await createMutation.mutateAsync(formData);
      toast({
        title: 'Success!',
        description: 'Your job has been posted to the alumni job board.',
      });
      navigate('/jobs');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to post job. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <AppLayout title="Post Job">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/jobs')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Post a Job</h1>
            <p className="text-muted-foreground">
              Share career opportunities with your alumni network
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Job Details</CardTitle>
              <p className="text-sm text-muted-foreground">
                Basic information about the position
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Job Title *</Label>
                  <Input
                    id="title"
                    placeholder="e.g., Senior Software Engineer"
                    value={formData.title}
                    onChange={(e) => updateFormData({ title: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="company">Company *</Label>
                  <Input
                    id="company"
                    placeholder="Company name"
                    value={formData.company}
                    onChange={(e) => updateFormData({ company: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Job Description *</Label>
                <Textarea
                  id="description"
                  placeholder="Describe the role, responsibilities, and what makes this position exciting..."
                  value={formData.description}
                  onChange={(e) => updateFormData({ description: e.target.value })}
                  rows={6}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="requirements">Requirements (Optional)</Label>
                <Textarea
                  id="requirements"
                  placeholder="Required skills, experience, education..."
                  value={formData.requirements}
                  onChange={(e) => updateFormData({ requirements: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="benefits">Benefits & Perks (Optional)</Label>
                <Textarea
                  id="benefits"
                  placeholder="Health insurance, remote work, professional development..."
                  value={formData.benefits}
                  onChange={(e) => updateFormData({ benefits: e.target.value })}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Position Details</CardTitle>
              <p className="text-sm text-muted-foreground">
                Job type, level, and compensation
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="job_type">
                    <Briefcase className="w-4 h-4 inline mr-2" />
                    Job Type
                  </Label>
                  <Select
                    value={formData.job_type}
                    onValueChange={(value: any) => updateFormData({ job_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select job type" />
                    </SelectTrigger>
                    <SelectContent>
                      {JOB_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="experience_level">
                    <Clock className="w-4 h-4 inline mr-2" />
                    Experience Level
                  </Label>
                  <Select
                    value={formData.experience_level}
                    onValueChange={(value: any) => updateFormData({ experience_level: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select level" />
                    </SelectTrigger>
                    <SelectContent>
                      {EXPERIENCE_LEVELS.map((level) => (
                        <SelectItem key={level.value} value={level.value}>
                          {level.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="remote">Remote Work</Label>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="remote"
                      checked={formData.remote}
                      onCheckedChange={(checked) => updateFormData({ remote: checked })}
                    />
                    <Label htmlFor="remote" className="cursor-pointer">
                      {formData.remote ? 'Remote' : 'On-site'}
                    </Label>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="salary_min">
                    <DollarSign className="w-4 h-4 inline mr-2" />
                    Minimum Salary (Optional)
                  </Label>
                  <Input
                    id="salary_min"
                    type="number"
                    placeholder="e.g., 80000"
                    value={formData.salary_min || ''}
                    onChange={(e) => updateFormData({ 
                      salary_min: e.target.value ? Number(e.target.value) : undefined 
                    })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="salary_max">
                    <DollarSign className="w-4 h-4 inline mr-2" />
                    Maximum Salary (Optional)
                  </Label>
                  <Input
                    id="salary_max"
                    type="number"
                    placeholder="e.g., 120000"
                    value={formData.salary_max || ''}
                    onChange={(e) => updateFormData({ 
                      salary_max: e.target.value ? Number(e.target.value) : undefined 
                    })}
                  />
                </div>
              </div>

              {!formData.remote && (
                <div className="space-y-2">
                  <Label htmlFor="location">
                    <MapPin className="w-4 h-4 inline mr-2" />
                    Location (Required for on-site roles)
                  </Label>
                  <Input
                    id="location"
                    placeholder="e.g., San Francisco, CA or Remote"
                    value={formData.location}
                    onChange={(e) => updateFormData({ location: e.target.value })}
                    required={!formData.remote}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Application Details</CardTitle>
              <p className="text-sm text-muted-foreground">
                How alumni should apply for this position
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="apply_url">
                    <Globe className="w-4 h-4 inline mr-2" />
                    Application URL (Optional)
                  </Label>
                  <Input
                    id="apply_url"
                    type="url"
                    placeholder="https://company.com/careers/apply"
                    value={formData.apply_url}
                    onChange={(e) => updateFormData({ apply_url: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="apply_email">
                    <Mail className="w-4 h-4 inline mr-2" />
                    Application Email (Optional)
                  </Label>
                  <Input
                    id="apply_email"
                    type="email"
                    placeholder="careers@company.com"
                    value={formData.apply_email}
                    onChange={(e) => updateFormData({ apply_email: e.target.value })}
                  />
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-800">
                  💡 Alumni will be able to apply directly through the platform if you provide
                  an application email. Otherwise, they'll be directed to your external URL.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Visibility Settings</CardTitle>
              <p className="text-sm text-muted-foreground">
                Control who can see this job posting
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label>Job Visibility</Label>
                <Select
                  value={formData.visibility}
                  onValueChange={(value: any) => updateFormData({ visibility: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select visibility" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="alumni_only">Alumni Only (Recommended)</SelectItem>
                    <SelectItem value="school_only">Your School Only</SelectItem>
                    <SelectItem value="connections_only">Your Connections Only</SelectItem>
                    <SelectItem value="public">Public (All Users)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  "Alumni Only" ensures only verified alumni can view and apply to this position.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-center pt-6 border-t">
            <Button
              variant="outline"
              type="button"
              onClick={() => navigate('/jobs')}
            >
              Cancel
            </Button>
            
            <Button
              type="submit"
              loading={createMutation.isPending}
              disabled={!formData.title || !formData.company || !formData.description}
            >
              Post Job
            </Button>
          </div>
        </form>

        {/* Tips */}
        <div className="bg-muted/50 rounded-lg p-4">
          <h4 className="font-medium mb-2">Tips for a Great Job Posting</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Be specific about required skills and experience levels</li>
            <li>• Highlight alumni-specific benefits or company culture</li>
            <li>• Include salary ranges to attract qualified candidates</li>
            <li>• Mention if you're open to mentoring recent graduates</li>
            <li>• Keep the description clear and focused on key responsibilities</li>
          </ul>
        </div>
      </div>
    </AppLayout>
  );
}

export default PostJob;