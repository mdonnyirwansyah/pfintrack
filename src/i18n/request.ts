import { getRequestConfig } from 'next-intl/server';
import { cookies, headers } from 'next/headers';

const INDONESIAN_COUNTRY_CODES = new Set(['ID']);

function detectLocaleFromCountry(country: string | null): 'id' | 'en' | null {
  if (!country) return null;
  return INDONESIAN_COUNTRY_CODES.has(country.toUpperCase()) ? 'id' : 'en';
}

function detectLocaleFromAcceptLanguage(acceptLanguage: string | null): 'id' | 'en' {
  if (!acceptLanguage) return 'en';
  const normalized = acceptLanguage.toLowerCase();
  const primary = normalized.split(',')[0].trim();
  if (primary.startsWith('id') || primary.startsWith('in')) {
    return 'id';
  }
  return 'en';
}

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get('app_locale')?.value;

  let locale: 'id' | 'en';
  if (cookieLocale === 'id' || cookieLocale === 'en') {
    locale = cookieLocale;
  } else {
    const headerStore = await headers();
    const country =
      headerStore.get('x-vercel-ip-country') ||
      headerStore.get('cf-ipcountry') ||
      headerStore.get('x-country-code');
    const countryLocale = detectLocaleFromCountry(country);
    if (countryLocale) {
      locale = countryLocale;
    } else {
      locale = detectLocaleFromAcceptLanguage(headerStore.get('accept-language'));
    }
  }

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
