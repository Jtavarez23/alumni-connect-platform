// Job Detail Page
// Individual job listing view with application functionality

import React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, MapPin, Briefcase, DollarSign, Clock, Mail, Globe, Building, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useJob, useApplyToJob, useToggleJobSave } from '@/hooks/useJobs';
import { AppLayout } from '@/components/layout/AppLayout';
import { useToast } from '@/components/ui/use-toast';

export function JobDetail() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const { data: job, isLoading, error } = useJob(jobId || '');
  const applyMutation = useApplyToJob();
  const toggleSaveMutation = useToggleJobSave();

  const formatSalary = (min?: number, max?: number, currency = 'USD') => {
    if (!min && !max) return null;
    const formatter = new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency,
      maximumFractionDigits: 0 
    });
    
    if (min && max) {
      return `${formatter.format(min)} - ${formatter.format(max)}`;
    }
    return formatter.format(min || max || 0);
  };

  const handleApply = async () => {
    if (!jobId) return;
    
    try {
      await applyMutation.mutateAsync({
        jobId,
        coverLetter: `I'm interested in applying for the ${job?.title} position at ${job?.company}`,
        resumeUrl: undefined // Would come from user profile
      });
    } catch (error) {
      toast({
        title: 'Application Error',
        description: 'Failed to submit application. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleToggleSave = async () => {
    if (!jobId) return;
    
    try {
      await toggleSaveMutation.mutateAsync({
        jobId,
        save: !job?.is_saved
      });
    } catch (error) {
      toast({
        title: 'Save Error',
        description: 'Failed to update saved status.',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-4">Job not found</p>
        <Button onClick={() => navigate('/jobs')} variant="outline">
          Back to Jobs
        </Button>
      </div>
    );
  }

  return (
    <AppLayout title={job.title}>
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/jobs')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{job.title}</h1>
            <p className="text-muted-foreground">
              {job.company} • {job.location || 'Remote'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Job Details Card */}
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl">Job Details</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Posted {new Date(job.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {job.remote && (
                      <Badge variant="secondary">Remote</Badge>
                    )}
                    {job.is_featured && (
                      <Badge variant="default">Featured</Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Job Metadata */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Building className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">Company:</span>
                    <span>{job.company}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">Location:</span>
                    <span>{job.location || 'Remote'}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">Type:</span>
                    <span className="capitalize">{job.job_type.replace('-', ' ')}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">Level:</span>
                    <span className="capitalize">{job.experience_level} Level</span>
                  </div>
                  
                  {formatSalary(job.salary_min, job.salary_max, job.salary_currency) && (
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">Salary:</span>
                      <span>{formatSalary(job.salary_min, job.salary_max, job.salary_currency)}</span>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Job Description */}
                <div>
                  <h3 className="font-semibold mb-3">Description</h3>
                  <p className="text-muted-foreground whitespace-pre-wrap">{job.description}</p>
                </div>

                {/* Requirements */}
                {job.requirements && (
                  <div>
                    <h3 className="font-semibold mb-3">Requirements</h3>
                    <p className="text-muted-foreground whitespace-pre-wrap">{job.requirements}</p>
                  </div>
                )}

                {/* Benefits */}
                {job.benefits && (
                  <div>
                    <h3 className="font-semibold mb-3">Benefits & Perks</h3>
                    <p className="text-muted-foreground whitespace-pre-wrap">{job.benefits}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Posted By Info */}
            {job.posted_by_name && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Posted By</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{job.posted_by_name}</p>
                      <p className="text-sm text-muted-foreground">Alumni Member</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar - Application Actions */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Apply Now</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {job.has_applied ? (
                  <div className="text-center">
                    <Badge variant="default" className="mb-4">
                      Application Submitted
                    </Badge>
                    <p className="text-sm text-muted-foreground">
                      Your application has been sent to the employer.
                    </p>
                  </div>
                ) : (
                  <>
                    <Button 
                      className="w-full" 
                      onClick={handleApply}
                      loading={applyMutation.isPending}
                    >
                      Apply for this Job
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={handleToggleSave}
                      loading={toggleSaveMutation.isPending}
                    >
                      {job.is_saved ? 'Remove from Saved' : 'Save for Later'}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Application Options */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">How to Apply</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {job.apply_email ? (
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">Email: {job.apply_email}</span>
                  </div>
                ) : job.apply_url ? (
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-muted-foreground" />
                    <Link 
                      to={job.apply_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline"
                    >
                      Apply on Company Website
                    </Link>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Apply directly through this platform
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Job Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Applications:</span>
                  <span className="font-medium">{job.application_count || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Posted:</span>
                  <span className="font-medium">
                    {new Date(job.created_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Visibility:</span>
                  <span className="font-medium capitalize">
                    {job.visibility.replace('_', ' ')}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

export default JobDetail;