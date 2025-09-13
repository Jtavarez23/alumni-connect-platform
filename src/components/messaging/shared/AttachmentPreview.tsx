// Attachment preview component for message input
import React, { memo } from 'react';
import { Button } from '@/components/ui/button';
import { X, Paperclip } from 'lucide-react';
import { Attachment } from '@/lib/messaging/types';
import { formatFileSize } from '@/lib/messaging/utils';
import { cn } from '@/lib/utils';

interface AttachmentPreviewProps {
  attachments: Attachment[];
  onRemove: (id: string) => void;
  className?: string;
}

export const AttachmentPreview = memo<AttachmentPreviewProps>(({
  attachments,
  onRemove,
  className
}) => {
  if (attachments.length === 0) return null;

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {attachments.map((attachment) => (
        <div key={attachment.id} className="relative">
          {attachment.type === 'image' && attachment.preview ? (
            <div className="relative">
              <img
                src={attachment.preview}
                alt="Preview"
                className="w-16 h-16 object-cover rounded border"
              />
              {attachment.uploadProgress !== undefined && attachment.uploadProgress < 100 && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded">
                  <div className="text-white text-xs font-medium">
                    {Math.round(attachment.uploadProgress)}%
                  </div>
                </div>
              )}
              <Button
                variant="destructive"
                size="icon"
                className="absolute -top-2 -right-2 h-5 w-5"
                onClick={() => onRemove(attachment.id)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <div className="relative bg-muted rounded border p-2 text-xs min-w-[80px]">
              <div className="flex items-center gap-1 mb-1">
                <Paperclip className="h-3 w-3 flex-shrink-0" />
                <span className="truncate font-medium">
                  {attachment.file.name}
                </span>
              </div>
              <div className="text-muted-foreground">
                {formatFileSize(attachment.file.size)}
              </div>
              {attachment.uploadProgress !== undefined && attachment.uploadProgress < 100 && (
                <div className="mt-1">
                  <div className="w-full bg-background rounded-full h-1">
                    <div
                      className="bg-primary h-1 rounded-full transition-all duration-300"
                      style={{ width: `${attachment.uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}
              <Button
                variant="destructive"
                size="icon"
                className="absolute -top-2 -right-2 h-5 w-5"
                onClick={() => onRemove(attachment.id)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
});

AttachmentPreview.displayName = 'AttachmentPreview';