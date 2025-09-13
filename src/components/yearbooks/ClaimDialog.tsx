// Alumni Connect - Claim Dialog
// Implements AC-ARCH-004 ClaimDialog component specification

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { User, School, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSubmitClaim } from '@/hooks/useYearbook';
import type { ClaimDialogProps, UserEducation, School as SchoolType } from '@/types/alumni-connect';

export function ClaimDialog({ pageFaceId, pageNameId, open, onClose }: ClaimDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const submitClaimMutation = useSubmitClaim();

  // Get current user profile
  const { data: userProfile } = useQuery({
    queryKey: ['user-profile'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          education:user_education(
            id,
            school:schools(id, name, city, state),
            start_year,
            end_year,
            school_type,
            is_graduated
          )
        `)
        .eq('id', user.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: open
  });

  // Get page context (which yearbook/school this claim is for)
  const { data: pageContext } = useQuery({
    queryKey: ['page-context', pageFaceId, pageNameId],
    queryFn: async () => {
      let pageId = null;
      
      if (pageFaceId) {
        const { data } = await supabase
          .from('page_faces')
          .select('page_id')
          .eq('id', pageFaceId)
          .single();
        pageId = data?.page_id;
      }
      
      if (pageNameId && !pageId) {
        const { data } = await supabase
          .from('page_names_ocr')
          .select('page_id')
          .eq('id', pageNameId)
          .single();
        pageId = data?.page_id;
      }

      if (!pageId) return null;

      const { data, error } = await supabase
        .from('yearbook_pages')
        .select(`
          page_number,
          yearbook:yearbooks(
            id,
            title,
            school:schools(id, name, city, state),
            class_year:class_years(year)
          )
        `)
        .eq('id', pageId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: open && (!!pageFaceId || !!pageNameId)
  });

  const handleSubmitClaim = async () => {
    if (!pageFaceId && !pageNameId) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await submitClaimMutation.mutateAsync({
        pageFaceId,
        pageNameId
      });
      
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit claim');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (isSubmitting) return;
    setError(null);
    setSuccess(false);
    onClose();
  };

  const isValidClaim = () => {
    if (!userProfile || !pageContext) return false;
    
    // Check if user has education history at the same school
    const hasSchoolHistory = userProfile.education?.some((edu: any) => 
      edu.school.id === pageContext.yearbook.school.id
    );
    
    // Check if user graduated around the same time as the yearbook
    const yearbookYear = pageContext.yearbook.class_year?.year;
    if (yearbookYear) {
      const hasMatchingYear = userProfile.education?.some((edu: any) => 
        edu.school.id === pageContext.yearbook.school.id &&
        yearbookYear >= edu.start_year && 
        yearbookYear <= edu.end_year
      );
      return hasMatchingYear;
    }
    
    return hasSchoolHistory;
  };

  if (success) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <div className="text-center space-y-4">
            <CheckCircle2 className="mx-auto h-16 w-16 text-green-500" />
            <div>
              <h3 className="text-lg font-semibold text-green-700">Claim Submitted!</h3>
              <p className="text-neutral-600 mt-2">
                Your claim has been submitted for review. You'll be notified when it's verified.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <User className="h-5 w-5 text-brand-500" />
            <span>Claim Your Photo</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* User Profile Section */}
          {userProfile && (
            <div className="flex items-center space-x-3 p-3 bg-neutral-50 rounded-lg">
              <Avatar className="h-12 w-12">
                <AvatarImage src={userProfile.avatar_url} />
                <AvatarFallback>
                  {userProfile.first_name?.[0]}{userProfile.last_name?.[0]}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="font-medium">
                  {userProfile.first_name} {userProfile.last_name}
                </p>
                <p className="text-sm text-neutral-600">{userProfile.email}</p>
                {userProfile.trust_level && (
                  <Badge 
                    variant={userProfile.trust_level === 'verified_alumni' ? 'default' : 'secondary'}
                    className="mt-1"
                  >
                    {userProfile.trust_level.replace('_', ' ')}
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Yearbook Context */}
          {pageContext && (
            <div className="space-y-3">
              <div className="flex items-center space-x-2 text-sm text-neutral-600">
                <School className="h-4 w-4" />
                <span>
                  {pageContext.yearbook.title || pageContext.yearbook.school.name}
                  {pageContext.yearbook.class_year && ` - Class of ${pageContext.yearbook.class_year.year}`}
                </span>
              </div>
              <div className="text-sm text-neutral-500">
                Page {pageContext.page_number} • {pageContext.yearbook.school.name}
                {pageContext.yearbook.school.city && ` • ${pageContext.yearbook.school.city}, ${pageContext.yearbook.school.state}`}
              </div>
            </div>
          )}

          {/* Validation and Warnings */}
          {userProfile && pageContext && !isValidClaim() && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>School Verification Required:</strong> We couldn't find matching education history for {pageContext.yearbook.school.name}. 
                Please update your profile with your education history before claiming photos.
              </AlertDescription>
            </Alert>
          )}

          {/* Education History Display */}
          {userProfile?.education && userProfile.education.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-neutral-700">Your Education History:</p>
              <div className="space-y-2">
                {userProfile.education.map((edu: any) => (
                  <div 
                    key={edu.id} 
                    className={`p-2 rounded border text-sm ${
                      pageContext && edu.school.id === pageContext.yearbook.school.id
                        ? 'border-green-200 bg-green-50'
                        : 'border-neutral-200 bg-neutral-50'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{edu.school.name}</p>
                        <p className="text-neutral-600">
                          {edu.start_year} - {edu.end_year}
                          {edu.is_graduated && ' (Graduated)'}
                        </p>
                      </div>
                      {pageContext && edu.school.id === pageContext.yearbook.school.id && (
                        <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Privacy Notice */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Privacy Notice:</strong> Claims are reviewed by moderators or verified alumni from your school. 
              Your profile information will be visible to reviewers for verification purposes.
            </AlertDescription>
          </Alert>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3">
            <Button 
              variant="outline" 
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSubmitClaim}
              disabled={!isValidClaim() || isSubmitting}
              className="min-w-[120px]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Claim'
              )}
            </Button>
          </div>

          {/* Help Text */}
          <div className="text-xs text-neutral-500">
            <p>
              <strong>Having trouble?</strong> Make sure your profile includes accurate education history. 
              Claims typically take 24-48 hours to review. You'll receive a notification when your claim is processed.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}