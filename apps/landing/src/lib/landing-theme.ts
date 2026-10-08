import { cookies } from 'next/headers';
import { LANDING_THEME_COOKIE, type LandingTheme } from '@/config/theme';

export async function getLandingTheme(): Promise<LandingTheme> {
  return (await cookies()).get(LANDING_THEME_COOKIE)?.value === 'light' ? 'light' : 'dark';
}
