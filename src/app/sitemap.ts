import { MetadataRoute } from 'next'
import { createClient } from '@supabase/supabase-js'
import { getBaseUrl } from '@/lib/seo'
import { getActiveTrainers } from '@/lib/personas'

async function getAllTrainerSlugs(): Promise<string[]> {
  const fromPersonas = getActiveTrainers().map((t) => t.slug)
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return fromPersonas
  try {
    const supabase = createClient(url, key)
    const { data } = await supabase
      .from('trainers')
      .select('slug')
      .eq('is_active', true)
      .in('visibility_status', ['PUBLIC', 'REQUEST_ACCESS'])
    const fromDb = (data || []).map((r) => r.slug).filter((s) => !fromPersonas.includes(s))
    return [...new Set([...fromPersonas, ...fromDb])]
  } catch {
    return fromPersonas
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getBaseUrl()
  const trainerSlugs = await getAllTrainerSlugs()

  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
    { url: `${baseUrl}/trainers`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.9 },
    { url: `${baseUrl}/explore`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.85 },
    { url: `${baseUrl}/como-funciona`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/sobre-nosotros`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/faq`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${baseUrl}/auth/login`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/privacy`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    { url: `${baseUrl}/terms`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
  ]

  const trainerPages: MetadataRoute.Sitemap = trainerSlugs.map((slug) => ({
    url: `${baseUrl}/trainers/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }))

  // Publicaciones recientes para SEO (últimas 500)
  let postPages: MetadataRoute.Sitemap = []
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (url && key) {
    try {
      const supabase = createClient(url, key)
      const { data: posts } = await supabase
        .from('social_posts')
        .select('id, created_at')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(500)
      if (posts?.length) {
        postPages = posts.map((p: { id: string; created_at: string }) => ({
          url: `${baseUrl}/p/${p.id}`,
          lastModified: new Date(p.created_at),
          changeFrequency: 'weekly' as const,
          priority: 0.6,
        }))
      }
    } catch {
      // ignorar errores de posts en sitemap
    }
  }

  return [...staticPages, ...trainerPages, ...postPages]
}
