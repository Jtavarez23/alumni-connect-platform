import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Shield, Link as LinkIcon } from 'lucide-react';
import { useLinkSafety, LinkSafetyResult } from '@/hooks/useLinkSafety';

interface UrlSafetyBadgeProps {
  text: string;
  className?: string;
}

export function UrlSafetyBadge({ text, className }: UrlSafetyBadgeProps) {
  const [urls, setUrls] = useState<string[]>([]);
  const { results, loading, checkUrls } = useLinkSafety();

  useEffect(() => {
    const extractedUrls = extractUrlsFromText(text);
    setUrls(extractedUrls);
    
    if (extractedUrls.length > 0) {
      checkUrls(extractedUrls);
    }
  }, [text, checkUrls]);

  if (urls.length === 0 || loading) {
    return null;
  }

  const unsafeResults = results.filter(r => !r.isSafe);
  const safeResults = results.filter(r => r.isSafe);

  if (unsafeResults.length > 0) {
    return (
      <Badge 
        variant="destructive" 
        className={`gap-1 ${className}`}
        title={`${unsafeResults.length} unsafe URL(s) detected`}
      >
        <AlertTriangle className="h-3 w-3" />
        {unsafeResults.length} unsafe link{unsafeResults.length > 1 ? 's' : ''}
      </Badge>
    );
  }

  if (safeResults.length > 0) {
    return (
      <Badge 
        variant="outline" 
        className={`gap-1 ${className}`}
        title={`${safeResults.length} safe URL(s)`}
      >
        <Shield className="h-3 w-3 text-green-500" />
        {safeResults.length} link{safeResults.length > 1 ? 's' : ''}
      </Badge>
    );
  }

  return null;
}

// Utility function to extract URLs from text
function extractUrlsFromText(text: string): string[] {
  const urlRegex = /https?:\/\/[^\s<>"'{}|\\^`\[\]]+/gi;
  const matches = text.match(urlRegex);
  return matches ? Array.from(new Set(matches)) : [];
}