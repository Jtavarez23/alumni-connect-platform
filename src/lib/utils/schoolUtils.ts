/**
 * Utility functions for school-related operations
 */

/**
 * Format school type for display by removing underscores and capitalizing
 * @param schoolType - The school type from database (e.g., "elementary_school")
 * @returns Formatted string (e.g., "Elementary School")
 */
export function formatSchoolType(schoolType: string): string {
  return schoolType
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());
}

/**
 * Get a user-friendly school type label
 * @param schoolType - The school type from database
 * @returns User-friendly label
 */
export function getSchoolTypeLabel(schoolType: string): string {
  const typeMap: Record<string, string> = {
    'elementary_school': 'Elementary School',
    'middle_school': 'Middle School',
    'high_school': 'High School',
    'college': 'College',
    'university': 'University',
    'graduate_school': 'Graduate School',
    'trade_school': 'Trade School',
    'community_college': 'Community College'
  };
  
  return typeMap[schoolType] || formatSchoolType(schoolType);
}

/**
 * Get school type icon based on type
 * @param schoolType - The school type from database
 * @returns Icon name or emoji
 */
export function getSchoolTypeIcon(schoolType: string): string {
  const iconMap: Record<string, string> = {
    'elementary_school': '🏫',
    'middle_school': '🏫',
    'high_school': '🎓',
    'college': '🏛️',
    'university': '🏛️',
    'graduate_school': '🎓',
    'trade_school': '🔧',
    'community_college': '🏫'
  };
  
  return iconMap[schoolType] || '🏫';
}