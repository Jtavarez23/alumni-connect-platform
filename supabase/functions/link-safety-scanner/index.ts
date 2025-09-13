// Alumni Connect - Link Safety Scanner
// AC-ARCH-003 compliant URL safety scanning implementation
// Uses Google Safe Browsing API and heuristic analysis

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Google Safe Browsing API configuration
const GOOGLE_SAFE_BROWSING_API_KEY = Deno.env.get('GOOGLE_SAFE_BROWSING_API_KEY')
const GOOGLE_SAFE_BROWSING_URL = 'https://safebrowsing.googleapis.com/v4/threatMatches:find'

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get next pending link scan
    const { data: pendingScan, error: scanError } = await supabaseClient
      .from('link_scan_queue')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(1)
      .single()

    if (scanError || !pendingScan) {
      return new Response(
        JSON.stringify({ message: 'No pending link scans' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // Update status to processing
    await supabaseClient
      .from('link_scan_queue')
      .update({ status: 'processing', updated_at: new Date().toISOString() })
      .eq('id', pendingScan.id)

    const scanResults: Array<{
      url: string
      isSafe: boolean
      riskLevel: string
      categories: string[]
      confidence: number
      details?: string
    }> = []

    let allSafe = true

    // Process each URL
    for (const url of pendingScan.urls) {
      try {
        const result = await scanUrl(url)
        scanResults.push(result)
        
        if (!result.isSafe) {
          allSafe = false
        }

        // Store individual scan result
        await supabaseClient
          .from('link_scan_results')
          .insert({
            url: result.url,
            domain: new URL(result.url).hostname,
            status: result.isSafe ? 'safe' : 'unsafe',
            risk_level: result.riskLevel,
            categories: result.categories,
            confidence_score: result.confidence,
            provider: 'google_safebrowsing',
            raw_response: { details: result.details }
          })

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100))
        
      } catch (error) {
        console.error(`Error scanning URL ${url}:`, error)
        scanResults.push({
          url,
          isSafe: false, // Fail-safe: treat errors as unsafe
          riskLevel: 'high',
          categories: ['error'],
          confidence: 1.0,
          details: `Scan failed: ${error.message}`
        })
        allSafe = false
      }
    }

    // Update scan queue status
    const finalStatus = allSafe ? 'safe' : 'unsafe'
    await supabaseClient
      .from('link_scan_queue')
      .update({
        status: finalStatus,
        findings: {
          safe_urls: scanResults.filter(r => r.isSafe).map(r => r.url),
          unsafe_urls: scanResults.filter(r => !r.isSafe).map(r => r.url),
          results: scanResults,
          scanned_at: new Date().toISOString()
        },
        scanned_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', pendingScan.id)

    // If unsafe, trigger moderation workflow
    if (!allSafe) {
      await supabaseClient.rpc('notify_moderators_unsafe_content', {
        p_target_table: pendingScan.target_table,
        p_target_id: pendingScan.target_id,
        p_reason: 'unsafe_urls_detected',
        p_details: JSON.stringify({
          unsafe_urls: scanResults.filter(r => !r.isSafe).map(r => r.url),
          scan_id: pendingScan.id
        })
      })
    }

    return new Response(
      JSON.stringify({
        success: true,
        scan_id: pendingScan.id,
        status: finalStatus,
        total_urls: pendingScan.urls.length,
        unsafe_count: scanResults.filter(r => !r.isSafe).length,
        results: scanResults
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error('Link safety scanner error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})

// Main URL scanning function
async function scanUrl(url: string): Promise<{
  url: string
  isSafe: boolean
  riskLevel: string
  categories: string[]
  confidence: number
  details?: string
}> {
  try {
    // Validate URL format
    if (!isValidUrl(url)) {
      return {
        url,
        isSafe: false,
        riskLevel: 'high',
        categories: ['malicious'],
        confidence: 0.9,
        details: 'Invalid URL format'
      }
    }

    // Check against Google Safe Browsing API
    const safeBrowsingResult = await checkGoogleSafeBrowsing(url)
    
    if (safeBrowsingResult && safeBrowsingResult.matches && safeBrowsingResult.matches.length > 0) {
      const threats = safeBrowsingResult.matches.map((m: any) => m.threatType)
      return {
        url,
        isSafe: false,
        riskLevel: getRiskLevel(threats),
        categories: threats,
        confidence: 0.95,
        details: `Google Safe Browsing detected threats: ${threats.join(', ')}`
      }
    }

    // Additional heuristic checks
    const heuristicResult = await heuristicUrlCheck(url)
    if (!heuristicResult.isSafe) {
      return {
        url,
        isSafe: false,
        riskLevel: heuristicResult.riskLevel,
        categories: heuristicResult.categories,
        confidence: heuristicResult.confidence,
        details: heuristicResult.details
      }
    }

    // If all checks pass, URL is safe
    return {
      url,
      isSafe: true,
      riskLevel: 'low',
      categories: [],
      confidence: 0.85,
      details: 'No threats detected'
    }

  } catch (error) {
    console.error(`Error scanning URL ${url}:`, error)
    // Fallback to conservative approach
    return {
      url,
      isSafe: false,
      riskLevel: 'high',
      categories: ['error'],
      confidence: 1.0,
      details: `Scan failed: ${error.message}`
    }
  }
}

// Google Safe Browsing API check
async function checkGoogleSafeBrowsing(url: string): Promise<any> {
  if (!GOOGLE_SAFE_BROWSING_API_KEY) {
    console.warn('Google Safe Browsing API key not configured')
    return null
  }

  const requestBody = {
    client: {
      clientId: 'alumni-connect',
      clientVersion: '1.0.0'
    },
    threatInfo: {
      threatTypes: [
        'MALWARE', 'SOCIAL_ENGINEERING', 'UNWANTED_SOFTWARE', 'POTENTIALLY_HARMFUL_APPLICATION'
      ],
      platformTypes: ['ANY_PLATFORM'],
      threatEntryTypes: ['URL'],
      threatEntries: [{ url }]
    }
  }

  const response = await fetch(`${GOOGLE_SAFE_BROWSING_URL}?key=${GOOGLE_SAFE_BROWSING_API_KEY}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody)
  })

  if (!response.ok) {
    throw new Error(`Google Safe Browsing API error: ${response.status}`)
  }

  return await response.json()
}

// Heuristic URL checks (supplementary to API checks)
async function heuristicUrlCheck(url: string): Promise<{
  isSafe: boolean
  riskLevel: string
  categories: string[]
  confidence: number
  details?: string
}> {
  const urlObj = new URL(url)
  const domain = urlObj.hostname
  
  // Check for suspicious TLDs
  const suspiciousTlds = ['.xyz', '.top', '.club', '.loan', '.win', '.review', '.date']
  const hasSuspiciousTld = suspiciousTlds.some(tld => domain.endsWith(tld))
  
  if (hasSuspiciousTld) {
    return {
      isSafe: false,
      riskLevel: 'medium',
      categories: ['suspicious'],
      confidence: 0.7,
      details: 'Suspicious top-level domain detected'
    }
  }

  // Check for IP addresses (often used in phishing)
  const isIpAddress = /^\d+\.\d+\.\d+\.\d+$/.test(domain)
  if (isIpAddress) {
    return {
      isSafe: false,
      riskLevel: 'high',
      categories: ['phishing'],
      confidence: 0.8,
      details: 'URL uses IP address instead of domain name'
    }
  }

  // Check for excessive subdomains (common in phishing)
  const subdomainCount = domain.split('.').length - 2
  if (subdomainCount > 3) {
    return {
      isSafe: false,
      riskLevel: 'medium',
      categories: ['suspicious'],
      confidence: 0.6,
      details: 'Excessive number of subdomains detected'
    }
  }

  // Check URL length (long URLs can be suspicious)
  if (url.length > 200) {
    return {
      isSafe: false,
      riskLevel: 'low',
      categories: ['suspicious'],
      confidence: 0.5,
      details: 'Unusually long URL detected'
    }
  }

  return {
    isSafe: true,
    riskLevel: 'low',
    categories: [],
    confidence: 0.3,
    details: 'No heuristic issues detected'
  }
}

// Helper function to determine risk level based on threat types
function getRiskLevel(threatTypes: string[]): string {
  const criticalThreats = ['MALWARE', 'SOCIAL_ENGINEERING']
  const highThreats = ['UNWANTED_SOFTWARE', 'POTENTIALLY_HARMFUL_APPLICATION']
  
  if (threatTypes.some(t => criticalThreats.includes(t))) {
    return 'critical'
  }
  if (threatTypes.some(t => highThreats.includes(t))) {
    return 'high'
  }
  return 'medium'
}

// Basic URL validation
function isValidUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}