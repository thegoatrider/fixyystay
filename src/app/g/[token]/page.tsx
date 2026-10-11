import { getGuestPortalDataByToken } from '@/app/actions/guest-hub'
import GuestPortalClient from './GuestPortalClient'
import { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export async function generateMetadata(props: {
  params: Promise<{ token: string }>
}): Promise<Metadata> {
  const { token } = await props.params
  const data = await getGuestPortalDataByToken(token)
  return {
    title:
      data.state === 'active' || data.state === 'not_active' || data.state === 'pin_required'
        ? `${data.hotelName} · Guest Hub`
        : 'Guest Hub',
    robots: { index: false, follow: false },
  }
}

export default async function GuestRoomQrPage(props: {
  params: Promise<{ token: string }>
}) {
  const { token } = await props.params
  const initialData = await getGuestPortalDataByToken(token)

  return <GuestPortalClient qrToken={token} initialData={initialData} />
}
