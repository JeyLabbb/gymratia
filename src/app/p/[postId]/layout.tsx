import type { Metadata } from 'next'
import { getBaseUrl, SITE_NAME } from '@/lib/seo'
import { getPublicPost } from '@/lib/public-post'

type Props = {
  params: Promise<{ postId: string }>
  children: React.ReactNode
}

function truncate(str: string, max: number): string {
  if (str.length <= max) return str
  return str.slice(0, max - 3).trim() + '...'
}

export async function generateMetadata({ params }: { params: Promise<{ postId: string }> }): Promise<Metadata> {
  const { postId } = await params
  const post = await getPublicPost(postId)
  const baseUrl = getBaseUrl()
  const url = `${baseUrl}/p/${postId}`

  if (!post) {
    return {
      title: 'Publicación no encontrada',
      description: 'Esta publicación no está disponible en GymRatIA.',
      robots: { index: false, follow: true },
    }
  }

  const snippet = post.content
    ? truncate(post.content.replace(/\s+/g, ' '), 155)
    : `Publicación de ${post.author.name} en la comunidad GymRatIA.`
  const title = post.content
    ? truncate(post.content.replace(/\s+/g, ' '), 60)
    : `Publicación de ${post.author.name}`

  const ogImage =
    post.media_urls && post.media_urls.length > 0
      ? post.media_urls[0]
      : `${baseUrl}/apple-touch-icon.png`

  return {
    title: `${title} | Explorar GymRatIA`,
    description: snippet,
    openGraph: {
      title: `${title} | ${SITE_NAME}`,
      description: snippet,
      url,
      type: 'article',
      publishedTime: post.created_at,
      authors: [post.author.name],
      images: [{ url: ogImage, alt: post.content ? truncate(post.content, 100) : `Publicación de ${post.author.name}` }],
    },
    twitter: {
      card: post.media_urls?.length ? 'summary_large_image' : 'summary',
      title: `${title} | ${SITE_NAME}`,
      description: snippet,
    },
    alternates: { canonical: url },
    robots: { index: true, follow: true },
  }
}

export default function PostLayout({ children }: Props) {
  return <>{children}</>
}
