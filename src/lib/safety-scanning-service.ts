// Safety Scanning Service Interface - Placeholder implementation for content moderation
// AC-ARCH-003 compliant safety scanning service structure

export interface SafetyScanResult {
  isSafe: boolean;
  flags: SafetyFlag[];
  confidence: number;
  scanType: 'nudity' | 'violence' | 'copyright' | 'general';
  processingTime?: number;
  recommendedAction?: 'approve' | 'quarantine' | 'reject' | 'review';
}

export interface SafetyFlag {
  category: 'nudity' | 'violence' | 'copyright' | 'hate_speech' | 'harassment' | 'spam' | 'other';
  confidence: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description?: string;
  location?: { // For image/video content
    bbox?: { x: number; y: number; width: number; height: number };
    timestamp?: number; // For video content
  };
}

export interface SafetyScanningService {
  scanImage(imageUrl: string): Promise<SafetyScanResult>;
  scanText(text: string): Promise<SafetyScanResult>;
  scanVideo(videoUrl: string): Promise<SafetyScanResult>;
  validateScanResult(result: SafetyScanResult): boolean;
}

// Mock Safety Scanning Service - Replace with actual safety scanning provider
export class MockSafetyScanningService implements SafetyScanningService {
  async scanImage(imageUrl: string): Promise<SafetyScanResult> {
    // Simulate safety scanning processing delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // 95% of images pass safety check, 5% get flagged
    const passesSafetyCheck = Math.random() > 0.05;
    
    if (passesSafetyCheck) {
      return {
        isSafe: true,
        flags: [],
        confidence: 0.92 + Math.random() * 0.07, // 92-99% confidence
        scanType: 'general',
        processingTime: 1500,
        recommendedAction: 'approve'
      };
    } else {
      // Generate random safety flags
      const flagCategories: SafetyFlag['category'][] = ['nudity', 'violence', 'copyright', 'other'];
      const flagSeverities: SafetyFlag['severity'][] = ['low', 'medium', 'high'];
      
      const flagCount = 1 + Math.floor(Math.random() * 2); // 1-2 flags
      const flags: SafetyFlag[] = [];
      
      for (let i = 0; i < flagCount; i++) {
        const category = flagCategories[Math.floor(Math.random() * flagCategories.length)];
        const severity = flagSeverities[Math.floor(Math.random() * flagSeverities.length)];
        
        flags.push({
          category,
          confidence: 0.7 + Math.random() * 0.29, // 70-99% confidence
          severity,
          description: this.getFlagDescription(category, severity)
        });
      }
      
      return {
        isSafe: false,
        flags,
        confidence: 0.85 + Math.random() * 0.14, // 85-99% confidence
        scanType: flags[0]?.category === 'copyright' ? 'copyright' : 
                 flags[0]?.category === 'violence' ? 'violence' : 'nudity',
        processingTime: 1500,
        recommendedAction: this.getRecommendedAction(flags)
      };
    }
  }

  async scanText(text: string): Promise<SafetyScanResult> {
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Simple text safety check
    const unsafePatterns = [
      /nude|naked|explicit/gi,
      /violence|fight|attack|hurt/gi,
      /copyright|infringement|illegal/gi,
      /hate|racist|sexist/gi
    ];
    
    const flags: SafetyFlag[] = [];
    
    unsafePatterns.forEach((pattern, index) => {
      if (pattern.test(text)) {
        const categories: SafetyFlag['category'][] = ['nudity', 'violence', 'copyright', 'hate_speech'];
        flags.push({
          category: categories[index],
          confidence: 0.8 + Math.random() * 0.19, // 80-99% confidence
          severity: 'medium',
          description: `Detected ${categories[index]} related content in text`
        });
      }
    });
    
    return {
      isSafe: flags.length === 0,
      flags,
      confidence: flags.length > 0 ? 0.9 : 0.95,
      scanType: 'general',
      processingTime: 800,
      recommendedAction: flags.length > 0 ? 'review' : 'approve'
    };
  }

  async scanVideo(videoUrl: string): Promise<SafetyScanResult> {
    // Simulate video scanning (more intensive)
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // 90% of videos pass safety check
    const passesSafetyCheck = Math.random() > 0.1;
    
    return {
      isSafe: passesSafetyCheck,
      flags: passesSafetyCheck ? [] : [{
        category: 'other',
        confidence: 0.88,
        severity: 'medium',
        description: 'Video content requires manual review'
      }],
      confidence: 0.91,
      scanType: 'general',
      processingTime: 5000,
      recommendedAction: passesSafetyCheck ? 'approve' : 'review'
    };
  }

  validateScanResult(result: SafetyScanResult): boolean {
    if (typeof result.isSafe !== 'boolean') return false;
    if (!Array.isArray(result.flags)) return false;
    if (result.confidence < 0 || result.confidence > 1) return false;
    
    // Validate each flag
    return result.flags.every(flag => 
      ['nudity', 'violence', 'copyright', 'hate_speech', 'harassment', 'spam', 'other'].includes(flag.category) &&
      flag.confidence >= 0 && flag.confidence <= 1 &&
      ['low', 'medium', 'high', 'critical'].includes(flag.severity)
    );
  }

  private getFlagDescription(category: SafetyFlag['category'], severity: SafetyFlag['severity']): string {
    const descriptions = {
      nudity: {
        low: 'Mild suggestive content detected',
        medium: 'Partial nudity detected',
        high: 'Explicit nudity detected',
        critical: 'Graphic explicit content detected'
      },
      violence: {
        low: 'Mild violent content detected',
        medium: 'Moderate violence detected',
        high: 'Graphic violence detected',
        critical: 'Extreme violence detected'
      },
      copyright: {
        low: 'Potential copyright concern',
        medium: 'Likely copyright infringement',
        high: 'Clear copyright violation',
        critical: 'Severe copyright violation'
      },
      other: {
        low: 'Minor content policy concern',
        medium: 'Content policy violation',
        high: 'Serious content policy violation',
        critical: 'Severe content policy violation'
      }
    };
    
    return descriptions[category]?.[severity] || 'Content policy violation detected';
  }

  private getRecommendedAction(flags: SafetyFlag[]): SafetyScanResult['recommendedAction'] {
    if (flags.some(flag => flag.severity === 'critical')) return 'reject';
    if (flags.some(flag => flag.severity === 'high')) return 'quarantine';
    if (flags.length > 0) return 'review';
    return 'approve';
  }
}

// Factory function to get safety scanning service instance
export function getSafetyScanningService(): SafetyScanningService {
  // In production, this would return the actual safety scanning service provider
  // For now, return mock service for development
  return new MockSafetyScanningService();
}

// Utility function to scan yearbook content for safety
export async function scanYearbookContent(
  content: { imageUrl?: string; text?: string },
  contentType: 'image' | 'text' | 'mixed' = 'image'
): Promise<{
  isSafe: boolean;
  flags: SafetyFlag[];
  recommendedAction: SafetyScanResult['recommendedAction'];
  error?: string;
}> {
  try {
    const safetyService = getSafetyScanningService();
    let result: SafetyScanResult;
    
    if (contentType === 'image' && content.imageUrl) {
      result = await safetyService.scanImage(content.imageUrl);
    } else if (contentType === 'text' && content.text) {
      result = await safetyService.scanText(content.text);
    } else {
      throw new Error('Unsupported content type for safety scanning');
    }
    
    if (safetyService.validateScanResult(result)) {
      return {
        isSafe: result.isSafe,
        flags: result.flags,
        recommendedAction: result.recommendedAction || 'review'
      };
    } else {
      return {
        isSafe: false,
        flags: [{ category: 'other', confidence: 1, severity: 'high', description: 'Safety scan validation failed' }],
        recommendedAction: 'quarantine',
        error: 'Safety scan validation failed'
      };
    }
  } catch (error) {
    console.error('Safety scanning failed:', error);
    return {
      isSafe: false,
      flags: [{ category: 'other', confidence: 1, severity: 'high', description: 'Safety scanning error occurred' }],
      recommendedAction: 'quarantine',
      error: error instanceof Error ? error.message : 'Unknown safety scanning error'
    };
  }
}

// Quick safety check for uploads
export async function quickSafetyCheck(content: { imageUrl?: string; text?: string }): Promise<boolean> {
  try {
    const result = await scanYearbookContent(content);
    return result.isSafe && result.recommendedAction === 'approve';
  } catch {
    // If safety check fails, default to quarantine for safety
    return false;
  }
}