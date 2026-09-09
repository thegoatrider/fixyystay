'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

export default function PushNotificationManager() {
  const router = useRouter()
  const initialized = useRef(false)

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    async function initPush() {
      // Dynamic import to avoid SSR errors
      try {
        const { Capacitor } = await import('@capacitor/core')
        if (!Capacitor.isNativePlatform()) {
          console.log('[PushNotifications] Web platform detected - Native Push skipped.')
          return
        }

        const { PushNotifications } = await import('@capacitor/push-notifications')

        // 1. Create Android Notification Channel (Crucial for Android 8.0+)
        if (Capacitor.getPlatform() === 'android') {
          await PushNotifications.createChannel({
            id: 'fixystays_channel',
            name: 'FixyStays Alerts',
            description: 'Important updates regarding bookings, check-ins, and renewals',
            importance: 5, // High importance (heads-up notification)
            visibility: 1, // Public
            sound: 'default',
            vibration: true,
          })
        }

        // 2. Check and Request Permissions
        let permStatus = await PushNotifications.checkPermissions()

        if (permStatus.receive === 'prompt') {
          permStatus = await PushNotifications.requestPermissions()
        }

        if (permStatus.receive !== 'granted') {
          console.warn('[PushNotifications] Push permission was not granted:', permStatus.receive)
          return
        }

        // 3. Register device with FCM
        await PushNotifications.register()

        // 4. On Registration Success: Send FCM token to backend
        await PushNotifications.addListener('registration', async (token) => {
          console.log('[PushNotifications] Device registered with FCM token:', token.value)
          try {
            await fetch('/api/notifications/register-token', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                token: token.value,
                platform: Capacitor.getPlatform(),
                deviceInfo: {
                  userAgent: navigator.userAgent,
                  registeredAt: new Date().toISOString(),
                },
              }),
            })
          } catch (err) {
            console.error('[PushNotifications] Failed to send token to backend:', err)
          }
        })

        // 5. On Registration Error
        await PushNotifications.addListener('registrationError', (err) => {
          console.error('[PushNotifications] Error on registration:', err)
        })

        // 6. On Push Received (Foreground)
        await PushNotifications.addListener('pushNotificationReceived', (notification) => {
          console.log('[PushNotifications] Notification received in foreground:', notification)
        })

        // 7. On Push Click / Action (Deep linking)
        await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
          console.log('[PushNotifications] Action performed on notification:', action)
          const data = action.notification.data
          if (data && data.url) {
            router.push(data.url)
          }
        })
      } catch (err) {
        console.error('[PushNotifications] Initialization error:', err)
      }
    }

    initPush()
  }, [router])

  return null
}
