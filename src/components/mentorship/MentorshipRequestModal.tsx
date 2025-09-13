import React, { useState } from 'react';
import { X, Send, User, Star, Briefcase, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useRequestMentorshipMatch } from '@/hooks/useJobs';
import { toast } from 'sonner';
import type { MentorshipProfile } from '@/types/jobs';

interface MentorshipRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetProfile: MentorshipProfile;
  currentUserProfile?: MentorshipProfile | null;
}

export function MentorshipRequestModal({
  isOpen,
  onClose,
  targetProfile,
  currentUserProfile
}: MentorshipRequestModalProps) {
  const [message, setMessage] = useState('');
  const requestMatchMutation = useRequestMentorshipMatch();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await requestMatchMutation.mutateAsync({
        targetUserId: targetProfile.user_id,
        message: message.trim() || undefined
      });
      
      toast.success('Mentorship request sent successfully!');
      onClose();
      setMessage('');
    } catch (error: any) {
      toast.error(error.message || 'Failed to send mentorship request');
    }
  };

  const getDefaultMessage = () => {
    const userRole = currentUserProfile?.role || 'mentee';
    const targetRole = targetProfile.role;
    
    if (userRole === 'mentee' && (targetRole === 'mentor' || targetRole === 'both')) {
      return `Hello! I'm interested in learning more about ${targetProfile.expertise_areas?.[0] || 'your field'} and would appreciate your guidance as a mentor.`;
    } else if (userRole === 'mentor' && (targetRole === 'mentee' || targetRole === 'both')) {
      return `Hello! I'd be happy to offer mentorship and share my experience in ${currentUserProfile?.expertise_areas?.[0] || 'my field'} with you.`;
    }
    
    return 'Hello! I\'d like to connect with you for mentorship.';
  };

  React.useEffect(() => {
    if (isOpen && !message) {
      setMessage(getDefaultMessage());
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-5 h-5" />
            Send Mentorship Request
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Target Profile Info */}
          <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
            <Avatar className="h-12 w-12">
              <AvatarImage src={targetProfile.avatar_url} />
              <AvatarFallback>
                {targetProfile.display_name?.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h4 className="font-semibold">{targetProfile.display_name}</h4>
                <Badge variant="secondary" className="text-xs">
                  {targetProfile.role}
                </Badge>
              </div>
              
              {targetProfile.current_role && targetProfile.current_company && (
                <p className="text-sm text-muted-foreground">
                  {targetProfile.current_role} at {targetProfile.current_company}
                </p>
              )}
              
              {targetProfile.school_name && (
                <div className="flex items-center gap-1 mt-1">
                  <GraduationCap className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {targetProfile.school_name}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Expertise Preview */}
          {(targetProfile.expertise_areas?.length > 0 || targetProfile.industries?.length > 0) && (
            <div className="space-y-2">
              <h5 className="text-sm font-medium">Expertise Areas</h5>
              <div className="flex flex-wrap gap-1">
                {[...(targetProfile.expertise_areas || []), ...(targetProfile.industries || [])]
                  .slice(0, 5)
                  .map((item: string) => (
                  <Badge key={item} variant="outline" className="text-xs">
                    {item}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Message Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="message" className="text-sm font-medium">
                Your Message
              </label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Introduce yourself and explain why you'd like to connect..."
                rows={4}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                This will help them understand your goals and how they can help.
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={requestMatchMutation.isPending || !message.trim()}
              >
                {requestMatchMutation.isPending ? (
                  <>
                    <div className="animate-spin mr-2">
                      <Send className="w-4 h-4" />
                    </div>
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Send Request
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}