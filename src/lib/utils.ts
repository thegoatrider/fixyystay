import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const COUNTRY_CODES = [
  { code: '91', label: 'IN (+91)', icon: '🇮🇳' },
  { code: '1', label: 'US (+1)', icon: '🇺🇸' },
  { code: '44', label: 'UK (+44)', icon: '🇬🇧' },
  { code: '971', label: 'AE (+971)', icon: '🇦🇪' },
  { code: '61', label: 'AU (+61)', icon: '🇦🇺' },
  { code: '65', label: 'SG (+65)', icon: '🇸🇬' },
  { code: '1', label: 'CA (+1)', icon: '🇨🇦' },
  { code: '49', label: 'DE (+49)', icon: '🇩🇪' },
  { code: '33', label: 'FR (+33)', icon: '🇫🇷' },
  { code: '81', label: 'JP (+81)', icon: '🇯🇵' },
]

export function formatWhatsAppNumber(phone: string, countryCode?: string) {
  const cleaned = phone.replace(/\D/g, '')
  if (countryCode) {
    // Basic check to see if the user already typed the country code
    if (cleaned.startsWith(countryCode) && cleaned.length > countryCode.length + 5) {
      return cleaned
    }
    return `${countryCode}${cleaned}`
  }
  if (cleaned.length === 10) {
    return `91${cleaned}`
  }
  return cleaned
}
