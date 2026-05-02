'use server';
import { cookies } from 'next/headers';

export async function setLocale(locale: 'en' | 'id') {
  const cookieStore = await cookies();
  cookieStore.set('app_locale', locale, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365, // 1 year
    sameSite: 'lax',
  });
}
