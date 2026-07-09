import 'server-only'

const dictionaries = {
  en: () => import('@/../dictionaries/en.json').then((module) => module.default),
  hi: () => import('@/../dictionaries/hi.json').then((module) => module.default),
  mr: () => import('@/../dictionaries/mr.json').then((module) => module.default),
}

export type Locale = keyof typeof dictionaries

export const getDictionary = async (locale: string) => {
  if (locale in dictionaries) {
    return dictionaries[locale as Locale]()
  }
  return dictionaries['en']()
}
