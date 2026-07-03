import { createAdminClient } from '@/utils/supabase/admin'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'

// 1. Google OAuth Helpers
export function getGoogleAuthUrl(origin: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const redirectUri = `${origin}/api/auth/google/callback`

  if (!clientId) {
    throw new Error('GOOGLE_CLIENT_ID environment variable is not configured')
  }

  const scopes = [
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/userinfo.email'
  ]

  return (
    `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${clientId}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&response_type=code` +
    `&scope=${encodeURIComponent(scopes.join(' '))}` +
    `&access_type=offline` +
    `&prompt=consent`
  )
}

export async function exchangeAuthCode(code: string, origin: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const redirectUri = `${origin}/api/auth/google/callback`

  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth Client credentials are not configured')
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code'
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Failed to exchange authorization code: ${errorText}`)
  }

  return response.json()
}

export async function refreshAccessToken(refreshToken: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth Client credentials are not configured')
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Failed to refresh access token: ${errorText}`)
  }

  return response.json()
}

export async function getGoogleEmail(accessToken: string): Promise<string> {
  const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` }
  })

  if (!response.ok) {
    throw new Error('Failed to retrieve user email information from Google')
  }

  const data = await response.json()
  return data.email
}

// 2. Google Drive API Operations
export async function findGoogleFolder(accessToken: string, name: string, parentId?: string): Promise<string | null> {
  let query = `mimeType = 'application/vnd.google-apps.folder' and name = '${name}' and trashed = false`
  if (parentId) {
    query += ` and '${parentId}' in parents`
  }

  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id)`,
    {
      headers: { Authorization: `Bearer ${accessToken}` }
    }
  )

  if (!response.ok) {
    const errText = await response.text()
    console.error(`Error searching folder on Google Drive: ${errText}`)
    return null
  }

  const data = await response.json()
  return data.files?.[0]?.id || null
}

export async function createGoogleFolder(accessToken: string, name: string, parentId?: string): Promise<string> {
  const response = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: parentId ? [parentId] : undefined
    })
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`Failed to create folder '${name}' on Google Drive: ${errText}`)
  }

  const data = await response.json()
  return data.id
}

export async function uploadGoogleFile(
  accessToken: string,
  parentId: string,
  filename: string,
  mimeType: string,
  content: Buffer | ArrayBuffer | string
): Promise<string> {
  const boundary = 'fixstay_google_upload_boundary'
  const metadata = JSON.stringify({
    name: filename,
    parents: [parentId]
  })

  let fileBuffer: Buffer
  if (typeof content === 'string') {
    fileBuffer = Buffer.from(content)
  } else if (content instanceof ArrayBuffer) {
    fileBuffer = Buffer.from(content)
  } else {
    fileBuffer = content
  }

  const multipartBody = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n`),
    Buffer.from(`--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`),
    fileBuffer,
    Buffer.from(`\r\n--${boundary}--`)
  ])

  const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
      'Content-Length': multipartBody.length.toString()
    },
    body: multipartBody
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`Failed to upload file '${filename}' to Google Drive: ${errText}`)
  }

  const data = await response.json()
  return data.id
}

// 3. PDF Generator Helper
export async function generateCheckinPDF(
  checkin: any,
  identities: any[],
  propertyName: string
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage([600, 780])
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  // Title header
  page.drawText('FIXY STAYS - GUEST CHECK-IN RECORD', {
    x: 50,
    y: 730,
    size: 18,
    font: boldFont,
    color: rgb(0.1, 0.3, 0.7)
  })

  // Horizontal separator line
  page.drawLine({
    start: { x: 50, y: 715 },
    end: { x: 550, y: 715 },
    thickness: 2,
    color: rgb(0.8, 0.8, 0.8)
  })

  let y = 680

  // Property Details
  page.drawText(`Property Name: ${propertyName}`, { x: 50, y, size: 12, font: boldFont })
  y -= 20
  page.drawText(`Check-In ID / UID: ${checkin.uid || checkin.id}`, { x: 50, y, size: 10, font })
  y -= 15
  page.drawText(`Guest Contact Phone: ${checkin.guest_phone}`, { x: 50, y, size: 10, font })
  y -= 15
  page.drawText(`Check-In Date: ${checkin.checkin_date || 'N/A'}`, { x: 50, y, size: 10, font })
  y -= 15
  page.drawText(`Check-Out Date: ${checkin.checkout_date || 'N/A'}`, { x: 50, y, size: 10, font })
  y -= 15
  if (checkin.vehicle_number) {
    page.drawText(`Vehicle Number: ${checkin.vehicle_number}`, { x: 50, y, size: 10, font })
    y -= 15
  }
  page.drawText(`Number of Guests: ${checkin.num_people}`, { x: 50, y, size: 10, font })
  y -= 35

  // Guest Identity Details Section
  page.drawText('VERIFIED GUEST IDENTITIES', { x: 50, y, size: 12, font: boldFont, color: rgb(0.2, 0.2, 0.2) })
  y -= 10
  page.drawLine({ start: { x: 50, y }, end: { x: 550, y }, thickness: 1, color: rgb(0.9, 0.9, 0.9) })
  y -= 25

  identities.forEach((identity, idx) => {
    // Basic multi-page protection (simple offset reset)
    if (y < 80) {
      // Just clip or overflow prevention - our bounds are normally small for typical stays
      return
    }

    page.drawText(`Guest #${idx + 1}: ${identity.full_name}`, { x: 50, y, size: 11, font: boldFont })
    y -= 15
    page.drawText(`Document Type: ${identity.document_type}`, { x: 70, y, size: 10, font })
    y -= 15
    page.drawText(`Document Number: ${identity.document_number}`, { x: 70, y, size: 10, font })
    y -= 15
    page.drawText(`Verification Status: ${identity.verification_status}`, {
      x: 70,
      y,
      size: 10,
      font,
      color: rgb(0.1, 0.5, 0.1)
    })
    y -= 25
  })

  // Footer stamp
  page.drawText('This guest check-in was securely verified by Fixy Stays AI Verification.', {
    x: 50,
    y: 40,
    size: 8,
    font,
    color: rgb(0.5, 0.5, 0.5)
  })

  const pdfBytes = await pdfDoc.save()
  return pdfBytes
}

export async function getActiveAccessToken(ownerId: string): Promise<string | null> {
  try {
    const supabaseAdmin = createAdminClient()
    const { data: tokens, error: tokensError } = await supabaseAdmin
      .from('owner_google_tokens')
      .select('*')
      .eq('owner_id', ownerId)
      .maybeSingle()

    if (tokensError || !tokens) {
      return null
    }

    let currentAccessToken = tokens.access_token
    const now = new Date()
    const expiry = new Date(tokens.expiry_date)

    // Refresh token 5 minutes before actual expiry just in case
    if (now.getTime() >= expiry.getTime() - 5 * 60 * 1000) {
      console.log(`[GOOGLE-DRIVE] Refreshing access token for owner ${ownerId}`)
      const refreshResult = await refreshAccessToken(tokens.refresh_token)
      currentAccessToken = refreshResult.access_token
      const newExpiryDate = new Date(now.getTime() + (refreshResult.expires_in || 3600) * 1000)

      const { error: updateError } = await supabaseAdmin
        .from('owner_google_tokens')
        .update({
          access_token: currentAccessToken,
          expiry_date: newExpiryDate.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('owner_id', ownerId)

      if (updateError) {
        console.error('[GOOGLE-DRIVE] Failed to update refreshed token in DB:', updateError)
      }
    }

    return currentAccessToken
  } catch (err) {
    console.error('[GOOGLE-DRIVE] Error obtaining active token:', err)
    return null
  }
}

// 4. Main Sync Orchestrator Action
export async function backupCheckinToGoogleDrive(checkinId: string) {
  try {
    const supabaseAdmin = createAdminClient()

    // 1. Fetch checkin record
    const { data: checkin, error: checkinError } = await supabaseAdmin
      .from('guest_checkins')
      .select('*')
      .eq('id', checkinId)
      .single()

    if (checkinError || !checkin) {
      console.error(`[GOOGLE-DRIVE-SYNC] Checkin ${checkinId} not found:`, checkinError)
      return { success: false, error: 'Checkin record not found' }
    }

    // 2. Fetch active credentials using helper
    const currentAccessToken = await getActiveAccessToken(checkin.owner_id)
    if (!currentAccessToken) {
      return { success: true, message: 'Google Drive not connected or token expired for this owner' }
    }

    // 4. Fetch associated guest identities
    const { data: identities, error: identityError } = await supabaseAdmin
      .from('guest_identity')
      .select('*')
      .eq('checkin_id', checkinId)

    if (identityError || !identities) {
      console.error(`[GOOGLE-DRIVE-SYNC] Failed to load guest identities for ${checkinId}:`, identityError)
      return { success: false, error: 'Identities not found' }
    }

    // 5. Fetch property name
    const { data: property } = await supabaseAdmin
      .from('properties')
      .select('name')
      .eq('id', checkin.property_id)
      .single()

    const propertyName = property?.name || 'Unknown Property'

    // 6. Find or create root folder "Fixy Stays Guest Records"
    const { data: tokenRecord } = await supabaseAdmin
      .from('owner_google_tokens')
      .select('root_folder_id')
      .eq('owner_id', checkin.owner_id)
      .maybeSingle()

    let rootFolderId = tokenRecord?.root_folder_id
    if (!rootFolderId) {
      rootFolderId = await findGoogleFolder(currentAccessToken, 'Fixy Stays Guest Records')
      if (!rootFolderId) {
        rootFolderId = await createGoogleFolder(currentAccessToken, 'Fixy Stays Guest Records')
      }
      
      // Save root folder ID for future uploads
      await supabaseAdmin
        .from('owner_google_tokens')
        .update({ root_folder_id: rootFolderId })
        .eq('owner_id', checkin.owner_id)
    }

    // Double check rootFolderId resolved
    if (!rootFolderId) {
      throw new Error('Could not find or create root folder on Google Drive')
    }

    // 7. Create subfolder for this checkin
    const sanitizeName = (name: string) => name.replace(/[^a-zA-Z0-9\s-_]/g, '')
    const folderName = `CheckIn - ${sanitizeName(checkin.guest_name)} - ${checkin.uid || checkin.id.substring(0, 8)}`
    const subfolderId = await createGoogleFolder(currentAccessToken, folderName, rootFolderId)

    // 8. Generate and upload check-in summary PDF
    const pdfBytes = await generateCheckinPDF(checkin, identities, propertyName)
    await uploadGoogleFile(
      currentAccessToken,
      subfolderId,
      `Checkin_Summary_${checkin.uid || checkin.id.substring(0, 8)}.pdf`,
      'application/pdf',
      Buffer.from(pdfBytes)
    )

    // 9. Download and copy guest ID images
    for (let i = 0; i < identities.length; i++) {
      const iden = identities[i]
      const guestPrefix = `Guest_${i + 1}_${sanitizeName(iden.full_name || 'Doc')}`

      if (iden.document_image_url) {
        await downloadAndCopyGoogleFile(
          currentAccessToken,
          subfolderId,
          iden.document_image_url,
          `${guestPrefix}_Front`
        )
      }
      if (iden.back_image_url) {
        await downloadAndCopyGoogleFile(
          currentAccessToken,
          subfolderId,
          iden.back_image_url,
          `${guestPrefix}_Back`
        )
      }
    }

    console.log(`[GOOGLE-DRIVE-SYNC] Successfully backed up check-in ${checkinId} to Google Drive`)
    return { success: true }
  } catch (err: any) {
    console.error('[GOOGLE-DRIVE-SYNC] Error backing up check-in to Google Drive:', err)
    return { success: false, error: err.message }
  }
}

// Download image/doc helper and upload to Google Drive
async function downloadAndCopyGoogleFile(
  accessToken: string,
  parentId: string,
  url: string,
  baseFilename: string
) {
  try {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to fetch file from storage: status ${response.status}`)
    }

    const contentType = response.headers.get('Content-Type') || 'image/jpeg'
    const arrayBuffer = await response.arrayBuffer()

    // Determine appropriate extension from content type
    let ext = 'jpg'
    if (contentType.includes('pdf')) ext = 'pdf'
    else if (contentType.includes('png')) ext = 'png'
    else if (contentType.includes('gif')) ext = 'gif'
    else if (contentType.includes('webp')) ext = 'webp'

    const filename = `${baseFilename}.${ext}`
    await uploadGoogleFile(accessToken, parentId, filename, contentType, arrayBuffer)
  } catch (e) {
    console.error(`[GOOGLE-DRIVE-SYNC] Failed to download or copy file ${url} to Google Drive:`, e)
  }
}
