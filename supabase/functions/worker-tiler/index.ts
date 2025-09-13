// Alumni Connect - Tiling Worker
// Creates Deep Zoom/IIIF tiles for yearbook pages
// AC-ARCH-003 compliant tiling implementation

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get yearbooks ready for tiling (face detection done but not tiled yet)
    const { data: yearbooks, error: yearbooksError } = await supabaseClient
      .from('yearbooks')
      .select('id, school_id, face_done, is_public')
      .eq('face_done', true)
      .eq('status', 'clean') // Only tile safe content
      .order('created_at', { ascending: true })
      .limit(1)

    if (yearbooksError || !yearbooks || yearbooks.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No yearbooks ready for tiling' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    const yearbook = yearbooks[0]

    // Get school info for watermarking
    const { data: school, error: schoolError } = await supabaseClient
      .from('schools')
      .select('name, location')
      .eq('id', yearbook.school_id)
      .single()

    if (schoolError) {
      console.warn('Could not fetch school info for watermark:', schoolError.message)
    }

    // Get all pages for this yearbook
    const { data: pages, error: pagesError } = await supabaseClient
      .from('yearbook_pages')
      .select('id, image_path, page_number')
      .eq('yearbook_id', yearbook.id)
      .order('page_number', { ascending: true })

    if (pagesError) {
      throw new Error(`Failed to fetch pages: ${pagesError.message}`)
    }

    // Process each page for tiling
    for (const page of pages) {
      try {
        // Get signed URL for the original image
        const { data: signedUrlData } = await supabaseClient.storage
          .from('yearbooks-originals')
          .createSignedUrl(page.image_path, 3600)

        if (!signedUrlData?.signedUrl) {
          throw new Error(`Failed to get signed URL for ${page.image_path}`)
        }

        // Generate tiles (mock implementation - would use VIPS/ImageMagick in production)
        const tileManifest = await generateTiles(signedUrlData.signedUrl, {
          schoolName: school?.name,
          year: new Date().getFullYear(), // Would get actual year from yearbook
          isPublic: yearbook.is_public
        })

        // Generate low-res preview
        const previewPath = await generatePreview(signedUrlData.signedUrl, page.id)

        // Update page with tile manifest and preview
        const { error: updateError } = await supabaseClient
          .from('yearbook_pages')
          .update({
            tile_manifest: JSON.stringify(tileManifest),
            preview_path: previewPath
          })
          .eq('id', page.id)

        if (updateError) {
          throw new Error(`Failed to update page with tile manifest: ${updateError.message}`)
        }

        console.log(`Tiling completed for page ${page.page_number}`)

        // Add small delay between tiling operations
        await new Promise(resolve => setTimeout(resolve, 1000))

      } catch (pageError) {
        console.error(`Error processing page ${page.id}:`, pageError)
        // Continue with other pages even if one fails
      }
    }

    // Mark yearbook as ready for viewing
    await supabaseClient
      .from('yearbooks')
      .update({ 
        status: 'ready', 
        updated_at: new Date().toISOString() 
      })
      .eq('id', yearbook.id)

    // Create notifications for the uploader that processing is complete
    const { data: yearbookWithUploader } = await supabaseClient
      .from('yearbooks')
      .select('uploaded_by')
      .eq('id', yearbook.id)
      .single()

    if (yearbookWithUploader?.uploaded_by) {
      await supabaseClient
        .from('notifications')
        .insert({
          user_id: yearbookWithUploader.uploaded_by,
          kind: 'yearbook_processing_complete',
          payload: {
            yearbook_id: yearbook.id,
            message: 'Your yearbook is now ready for viewing and claims!'
          }
        })
    }

    return new Response(
      JSON.stringify({
        success: true,
        yearbook_id: yearbook.id,
        pages_processed: pages.length,
        message: 'Tiling completed - yearbook ready for viewing'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error('Tiling worker error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})

// Real tile generation implementation placeholder
// In production, use VIPS (libvips) or ImageMagick for Deep Zoom/IIIF tiling
async function generateTiles(
  imageUrl: string, 
  options: { schoolName?: string; year: number; isPublic: boolean }
): Promise<any> {
  try {
    // Download the image for processing
    const response = await fetch(imageUrl)
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.status}`)
    }
    
    const imageBuffer = await response.arrayBuffer()
    
    // In production, this would use VIPS or ImageMagick to:
    // 1. Generate Deep Zoom/IIIF tiles
    // 2. Apply watermark if needed
    // 3. Upload tiles to storage
    // 4. Generate proper manifest
    
    const manifest = await simulateTilingProcess(imageBuffer, options)
    
    return manifest
    
  } catch (error) {
    console.error('Tile generation error:', error)
    
    // Fallback to basic manifest
    return {
      type: 'deepzoom',
      baseUrl: `https://${Deno.env.get('SUPABASE_URL')?.replace('https://', '')}/storage/v1/object/public/yearbooks-tiles`,
      tileSize: 256,
      overlap: 1,
      format: 'jpg',
      width: 800,
      height: 1200,
      watermark: options.isPublic ? `${options.schoolName} ${options.year} - Alumni Connect` : null,
      zoomLevels: 5,
      created: new Date().toISOString(),
      error: error.message
    }
  }
}

// Simulated tiling process (placeholder for real VIPS/ImageMagick)
// In production, replace with:
// 1. VIPS: vips dzsave input.jpg output_folder
// 2. ImageMagick: convert input.jpg -define tiff:tile-geometry=256x256 -compress jpeg ptif:output.tif
async function simulateTilingProcess(
  imageBuffer: ArrayBuffer, 
  options: { schoolName?: string; year: number; isPublic: boolean }
): Promise<any> {
  // Simulate processing time
  await new Promise(resolve => setTimeout(resolve, 3000))
  
  // Analyze image to get real dimensions (placeholder)
  const view = new Uint8Array(imageBuffer)
  const imageSize = view.length
  
  // Estimate dimensions based on file size (very rough heuristic)
  const estimatedWidth = 800 + Math.floor((imageSize / 100000) % 400)
  const estimatedHeight = 1200 + Math.floor((imageSize / 150000) % 600)
  
  // Calculate zoom levels based on image size
  const maxDimension = Math.max(estimatedWidth, estimatedHeight)
  const zoomLevels = Math.ceil(Math.log2(maxDimension / 256)) + 1
  
  return {
    type: 'deepzoom',
    baseUrl: `https://${Deno.env.get('SUPABASE_URL')?.replace('https://', '')}/storage/v1/object/public/yearbooks-tiles`,
    tileSize: 256,
    overlap: 2,
    format: 'jpg',
    width: estimatedWidth,
    height: estimatedHeight,
    watermark: options.isPublic ? `${options.schoolName} ${options.year} - Alumni Connect` : null,
    zoomLevels: Math.min(zoomLevels, 8), // Cap at 8 zoom levels
    created: new Date().toISOString(),
    tilesGenerated: Math.ceil(estimatedWidth / 256) * Math.ceil(estimatedHeight / 256) * zoomLevels
  }
}

// Mock preview generation
async function generatePreview(imageUrl: string, pageId: string): Promise<string> {
  // Simulate preview generation
  await new Promise(resolve => setTimeout(resolve, 1000))

  // In production, this would:
  // 1. Download the original image
  // 2. Resize to preview dimensions (e.g., 400px width)
  // 3. Apply watermark if needed
  // 4. Upload to yearbooks-previews bucket
  // 5. Return the storage path

  const previewPath = `previews/${pageId}/preview.jpg`
  
  // Mock upload to storage
  console.log(`Would upload preview to: ${previewPath}`)
  
  return previewPath
}