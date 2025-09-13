import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ReportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  targetTable: 'posts' | 'profiles' | 'yearbook_pages' | 'comments' | 'events';
  targetId: string;
  targetName?: string;
}

type ReportReason = 'impersonation' | 'nudity' | 'violence' | 'harassment' | 'copyright' | 'spam' | 'other';

const REASON_LABELS: Record<ReportReason, string> = {
  impersonation: 'Impersonation',
  nudity: 'Nudity or sexual content',
  violence: 'Violence or harmful content',
  harassment: 'Harassment or bullying',
  copyright: 'Copyright infringement',
  spam: 'Spam or misleading content',
  other: 'Other'
};

export function ReportDialog({ isOpen, onClose, targetTable, targetId, targetName }: ReportDialogProps) {
  const [selectedReason, setSelectedReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!selectedReason) {
      setError('Please select a reason for reporting');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase.rpc('report_item', {
        p_target_table: targetTable,
        p_target_id: targetId,
        p_reason: selectedReason,
        p_details: details || null
      });

      if (rpcError) throw rpcError;

      if (data?.error) {
        throw new Error(data.error);
      }

      setSuccess(true);
      toast({
        title: 'Report submitted',
        description: 'Your report has been submitted for review. Thank you for helping keep our community safe.',
      });

      setTimeout(() => {
        onClose();
        resetForm();
      }, 2000);
    } catch (err) {
      console.error('Error submitting report:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit report');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setSelectedReason(null);
    setDetails('');
    setError(null);
    setSuccess(false);
  };

  const handleClose = () => {
    if (isSubmitting) return;
    onClose();
    setTimeout(resetForm, 300); // Reset after dialog closes
  };

  if (success) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <div className="text-center space-y-4">
            <CheckCircle2 className="mx-auto h-16 w-16 text-green-500" />
            <div>
              <h3 className="text-lg font-semibold text-green-700">Report Submitted!</h3>
              <p className="text-neutral-600 mt-2">
                Thank you for helping keep our community safe. Our moderators will review your report.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Report Content</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {targetName && (
            <p className="text-sm text-muted-foreground">
              Reporting: <span className="font-medium">{targetName}</span>
            </p>
          )}

          <div className="space-y-3">
            <Label>Why are you reporting this?</Label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.entries(REASON_LABELS) as [ReportReason, string][]).map(([reason, label]) => (
                <Button
                  key={reason}
                  variant={selectedReason === reason ? 'default' : 'outline'}
                  size="sm"
                  className="h-auto py-2 text-xs justify-start text-left whitespace-normal"
                  onClick={() => setSelectedReason(reason)}
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="details">Additional details (optional)</Label>
            <Textarea
              id="details"
              placeholder="Please provide any additional information that might help our moderators..."
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              rows={3}
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={!selectedReason || isSubmitting}
              className="min-w-[120px]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Report'
              )}
            </Button>
          </div>

          <div className="text-xs text-muted-foreground">
            <p>
              <strong>Note:</strong> Reports are reviewed by our moderation team. 
              False reports may result in account restrictions.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}