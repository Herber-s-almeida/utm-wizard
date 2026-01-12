/**
 * UTM Parameter Generator Utility
 * Generates consistent UTM parameters for media lines based on plan and line data
 */

import { HierarchyLevel, DEFAULT_HIERARCHY_ORDER } from '@/types/hierarchy';

// Convert text to slug format (lowercase, no special chars, hyphens for spaces)
export function toSlug(text: string | null | undefined): string {
  if (!text) return '';
  
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .toLowerCase()
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/[^a-z0-9-]/g, '') // Remove non-alphanumeric (except hyphens)
    .replace(/-+/g, '-') // Collapse multiple hyphens
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
}

export interface UTMParams {
  utm_source: string;    // vehicle slug
  utm_medium: string;    // channel/medium slug  
  utm_campaign: string;  // line_code_campaign_subdivision_moment_phase
  utm_term: string;      // target slug (optional)
  utm_content: string;   // creative id (filled when creative is created)
}

export interface UTMGenerationParams {
  lineCode: string;
  campaignName: string | null;
  subdivisionSlug?: string | null;
  momentSlug?: string | null;
  funnelStageSlug?: string | null;
  vehicleSlug?: string | null;
  channelSlug?: string | null;
  targetSlug?: string | null;
  hierarchyOrder?: HierarchyLevel[];
}

/**
 * Get slug for a hierarchy level
 */
function getSlugForLevel(
  level: HierarchyLevel,
  subdivisionSlug: string | null | undefined,
  momentSlug: string | null | undefined,
  funnelStageSlug: string | null | undefined
): string {
  switch (level) {
    case 'subdivision':
      return subdivisionSlug || 'geral';
    case 'moment':
      return momentSlug || 'geral';
    case 'funnel_stage':
      return funnelStageSlug || 'geral';
    default:
      return 'geral';
  }
}

/**
 * Generate UTM parameters for a media line
 * utm_campaign format: {lineCode}_{campaign}_{level1}_{level2}_{level3}
 * The hierarchy order is determined by the plan's hierarchy_order setting
 */
export function generateUTM(params: UTMGenerationParams): UTMParams {
  const {
    lineCode,
    campaignName,
    subdivisionSlug,
    momentSlug,
    funnelStageSlug,
    vehicleSlug,
    channelSlug,
    targetSlug,
    hierarchyOrder = DEFAULT_HIERARCHY_ORDER,
  } = params;

  // Build hierarchy slugs in the order defined by the plan
  const orderedHierarchySlugs = hierarchyOrder.map(level => 
    getSlugForLevel(level, subdivisionSlug, momentSlug, funnelStageSlug)
  );

  // Build utm_campaign from components
  // Format: {lineCode}_{campaign}_{level1}_{level2}_{level3}
  const campaignParts = [
    lineCode || '',
    toSlug(campaignName),
    ...orderedHierarchySlugs,
  ].filter(Boolean);

  const utmCampaign = campaignParts.join('_');

  return {
    utm_source: vehicleSlug || '',
    utm_medium: channelSlug || '',
    utm_campaign: utmCampaign,
    utm_term: targetSlug || '',
    utm_content: '', // Filled when creative is created
  };
}

/**
 * Build a full URL with UTM parameters
 */
export function buildUrlWithUTM(baseUrl: string, utmParams: UTMParams): string {
  if (!baseUrl) return '';
  
  try {
    const url = new URL(baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`);
    
    if (utmParams.utm_source) url.searchParams.set('utm_source', utmParams.utm_source);
    if (utmParams.utm_medium) url.searchParams.set('utm_medium', utmParams.utm_medium);
    if (utmParams.utm_campaign) url.searchParams.set('utm_campaign', utmParams.utm_campaign);
    if (utmParams.utm_term) url.searchParams.set('utm_term', utmParams.utm_term);
    if (utmParams.utm_content) url.searchParams.set('utm_content', utmParams.utm_content);
    
    return url.toString();
  } catch {
    // If URL parsing fails, just append as query string
    const params = new URLSearchParams();
    if (utmParams.utm_source) params.set('utm_source', utmParams.utm_source);
    if (utmParams.utm_medium) params.set('utm_medium', utmParams.utm_medium);
    if (utmParams.utm_campaign) params.set('utm_campaign', utmParams.utm_campaign);
    if (utmParams.utm_term) params.set('utm_term', utmParams.utm_term);
    if (utmParams.utm_content) params.set('utm_content', utmParams.utm_content);
    
    const separator = baseUrl.includes('?') ? '&' : '?';
    return `${baseUrl}${separator}${params.toString()}`;
  }
}

/**
 * Parse UTM parameters from a URL
 */
export function parseUTMFromUrl(url: string): Partial<UTMParams> {
  try {
    const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
    return {
      utm_source: urlObj.searchParams.get('utm_source') || undefined,
      utm_medium: urlObj.searchParams.get('utm_medium') || undefined,
      utm_campaign: urlObj.searchParams.get('utm_campaign') || undefined,
      utm_term: urlObj.searchParams.get('utm_term') || undefined,
      utm_content: urlObj.searchParams.get('utm_content') || undefined,
    };
  } catch {
    return {};
  }
}
