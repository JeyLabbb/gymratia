import { MetadataRoute } from 'next'
import { getBaseUrl } from '@/lib/seo'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getBaseUrl()
  return {
    rules: [
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: ['/dashboard/', '/portal/', '/api/', '/auth/callback', '/onboarding/'],
      },
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/dashboard/', '/portal/', '/api/', '/auth/callback', '/onboarding/'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
