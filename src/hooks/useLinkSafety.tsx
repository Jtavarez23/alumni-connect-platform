// Hook for link safety checking and status

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface LinkSafetyResult {
  url: string;
  isSafe: boolean;
  riskLevel: 'low' | 'medium' | 'high' | 'critical' | 'unknown';
  categories: string[];
  lastScan?: string;
}

interface UseLinkSafetyReturn {
  results: LinkSafetyResult[];
  loading: boolean;
  error: string | null;
  checkUrls: (urls: string[]) => Promise<void>;
}

export function useLinkSafety(): UseLinkSafetyReturn {
  const [results, setResults] = useState<LinkSafetyResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkUrls = async (urls: string[]) => {
    if (urls.length === 0) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase.rpc('check_urls_safe', {
        p_urls: urls
      });

      if (rpcError) throw rpcError;

      const safetyResults: LinkSafetyResult[] = (data || []).map((item: any) => ({
        url: item.url,
        isSafe: item.is_safe,
        riskLevel: item.risk_level || 'unknown',
        categories: item.categories || [],
        lastScan: item.last_scan
      }));

      setResults(safetyResults);
    } catch (err) {
      console.error('Error checking URL safety:', err);
      setError(err instanceof Error ? err.message : 'Failed to check URL safety');
      
      // Fallback: mark all URLs as safe if check fails
      setResults(urls.map(url => ({
        url,
        isSafe: true,
        riskLevel: 'unknown',
        categories: [],
        lastScan: undefined
      })));
    } finally {
      setLoading(false);
    }
  };

  return {
    results,
    loading,
    error,
    checkUrls
  };
}

// Utility function to extract URLs from text
export function extractUrlsFromText(text: string): string[] {
  const urlRegex = /https?:\/\/[^\s<>"'{}|\\^`\[\]]+/gi;
  const matches = text.match(urlRegex);
  return matches ? Array.from(new Set(matches)) : []; // Remove duplicates
}

// Component to display URL safety status
export function LinkSafetyIndicator({ url, result }: { 
  url: string; 
  result?: LinkSafetyResult 
}) {
  if (!result) {
    return (
      <span className="inline-flex items-center text-xs text-muted-foreground">
        <div className="w-2 h-2 bg-gray-300 rounded-full mr-1"></div>
        Checking...
      </span>
    );
  }

  const getColor = () => {
    if (!result.isSafe) {
      switch (result.riskLevel) {
        case 'critical': return 'bg-red-500';
        case 'high': return 'bg-orange-500';
        case 'medium': return 'bg-yellow-500';
        default: return 'bg-gray-500';
      }
    }
    return 'bg-green-500';
  };

  const getTooltip = () => {
    if (!result.isSafe) {
      return `Unsafe URL: ${result.categories.join(', ')} (${result.riskLevel} risk)`;
    }
    return 'Safe URL';
  };

  return (
    <span 
      className="inline-flex items-center text-xs"
      title={getTooltip()}
    >
      <div className={`w-2 h-2 ${getColor()} rounded-full mr-1`}></div>
      {result.isSafe ? 'Safe' : 'Unsafe'}
    </span>
  );
}