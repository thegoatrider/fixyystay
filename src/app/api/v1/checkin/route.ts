import { NextResponse } from 'next/server'
import { uploadAndVerifyFront, uploadBackImage } from '@/app/checkin/verify-action'
import { submitCheckin } from '@/app/checkin/actions'
import { createAdminClient } from '@/utils/supabase/admin'

// Handle CORS preflight requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export async function POST(req: Request) {
  try {
    const supabaseAdmin = createAdminClient()
    const formData = await req.formData()
    
    // 1. Extract required fields
    const propertyId = formData.get('propertyId') as string
    const guestName = formData.get('guestName') as string
    const guestPhone = formData.get('guestPhone') as string
    const frontImage = formData.get('frontImage') as File
    
    // 2. Extract optional fields
    const backImage = formData.get('backImage') as File | null
    const checkinDate = formData.get('checkinDate') as string | null
    const checkoutDate = formData.get('checkoutDate') as string | null
    const vehicleNumber = formData.get('vehicleNumber') as string | null
    const numPeopleStr = formData.get('numPeople') as string | null
    
    // Basic validation
    if (!propertyId || !guestName || !guestPhone || !frontImage) {
      return NextResponse.json(
        { error: 'Missing required fields: propertyId, guestName, guestPhone, or frontImage' }, 
        { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } }
      )
    }

    // 2.5 Verify API Key and Organization if Authorization header is present
    const authHeader = req.headers.get('Authorization')
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const apiKey = authHeader.split(' ')[1]
      
      const { data: org, error: orgError } = await supabaseAdmin
        .from('organizations')
        .select('id')
        .eq('api_key', apiKey)
        .single()
        
      if (orgError || !org) {
        return NextResponse.json(
          { error: 'Invalid API Key' }, 
          { status: 401, headers: { 'Access-Control-Allow-Origin': '*' } }
        )
      }
      
      // Verify that the property belongs to this organization
      const { data: prop, error: propErr } = await supabaseAdmin
        .from('properties')
        .select('organization_id')
        .eq('id', propertyId)
        .single()
        
      if (propErr || !prop || prop.organization_id !== org.id) {
        return NextResponse.json(
          { error: 'Property does not exist or does not belong to your organization.' }, 
          { status: 403, headers: { 'Access-Control-Allow-Origin': '*' } }
        )
      }
    }

    // 3. Verify Front Image
    const frontFormData = new FormData()
    frontFormData.append('image', frontImage)
    
    const frontResult = await uploadAndVerifyFront(frontFormData)
    if (!frontResult.success) {
      return NextResponse.json(
        { error: frontResult.error || 'Failed to verify front image' }, 
        { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } }
      )
    }
    
    const identityId = frontResult.guest_identity_id
    
    // 4. Verify Back Image (if provided)
    if (backImage && identityId) {
      const backFormData = new FormData()
      backFormData.append('image', backImage)
      backFormData.append('identityId', identityId)
      
      // We don't block check-in if back image upload fails, but we attempt it.
      await uploadBackImage(backFormData)
    }
    
    // 5. Submit Check-in
    const checkinFormData = new FormData()
    checkinFormData.append('propertyId', propertyId)
    checkinFormData.append('guestName', guestName)
    checkinFormData.append('guestPhone', guestPhone)
    
    // Default to 1 person if not specified or invalid
    const numPeople = numPeopleStr ? parseInt(numPeopleStr) : 1
    checkinFormData.append('numPeople', (isNaN(numPeople) || numPeople < 1) ? '1' : numPeople.toString())
    
    if (checkinDate) checkinFormData.append('checkinDate', checkinDate)
    if (checkoutDate) checkinFormData.append('checkoutDate', checkoutDate)
    if (vehicleNumber) checkinFormData.append('vehicleNumber', vehicleNumber)
    
    const checkinResult = await submitCheckin(checkinFormData, [identityId])
    
    if (checkinResult.error) {
      return NextResponse.json(
        { error: checkinResult.error }, 
        { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } }
      )
    }
    
    // 6. Return Success Response
    return NextResponse.json({
      success: true,
      message: 'Guest check-in completed successfully',
      data: {
        propertyName: checkinResult.propertyName,
        helpdeskNumber: checkinResult.helpdeskNumber,
        verificationStatus: frontResult.status,
        identityId: identityId,
        verificationReason: frontResult.reason
      }
    }, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      }
    })
    
  } catch (err: any) {
    console.error('[API] Check-in Error:', err)
    return NextResponse.json(
      { error: err.message || 'Internal Server Error' }, 
      { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } }
    )
  }
}
