import type { MetadataRoute } from 'next';
import { site } from '@/config/site';

/** Preview builds are never crawled; production indexing needs an explicit opt-in. */
export default function robots(): MetadataRoute.Robots {
  if (!site.indexable) return { rules: { userAgent: '*', disallow: '/' } };
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/api/', '/dev/'] },
    ...(site.url ? { host: site.url } : {}),
  };
}
