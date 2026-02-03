import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, User, Heart, MessageCircle, Eye, Hash } from 'lucide-react'
import { getPublicPost } from '@/lib/public-post'
import SafeImage from '@/app/_components/SafeImage'
import { AppFooter } from '@/app/_components/AppFooter'

type Props = {
  params: Promise<{ postId: string }>
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

export default async function PublicPostPage({ params }: Props) {
  const { postId } = await params
  const post = await getPublicPost(postId)

  if (!post) notFound()

  const firstImage = post.media_urls && post.media_urls.length > 0 ? post.media_urls[0] : null

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-[#F8FAFC]">
      <div className="max-w-2xl mx-auto px-4 py-6 md:py-10">
        <nav className="mb-6" aria-label="Breadcrumb">
          <Link
            href="/explore"
            className="inline-flex items-center gap-2 text-sm text-[#A7AFBE] hover:text-[#FF2D2D] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver a Explorar
          </Link>
        </nav>

        <article
          className="rounded-[22px] bg-[#14161B] border border-[rgba(255,255,255,0.08)] overflow-hidden"
          itemScope
          itemType="https://schema.org/SocialMediaPosting"
        >
          <header className="p-5 border-b border-[rgba(255,255,255,0.08)] flex items-center gap-3">
            <Link
              href={`/user/${post.user_id}`}
              className="flex items-center gap-3 hover:opacity-90 transition-opacity"
            >
              {post.author.avatar ? (
                <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-[rgba(255,255,255,0.1)] flex-shrink-0">
                  <SafeImage
                    src={post.author.avatar}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-full bg-[#FF2D2D]/30 flex items-center justify-center flex-shrink-0">
                  <User className="w-6 h-6 text-[#FF2D2D]" />
                </div>
              )}
              <div>
                <span className="font-semibold text-[#F8FAFC]" itemProp="author" itemScope itemType="https://schema.org/Person">
                  <span itemProp="name">{post.author.name}</span>
                </span>
                {post.author.is_trainer && (
                  <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-[#FF2D2D]/20 text-[#FF6B6B]">
                    Entrenador
                  </span>
                )}
                <p className="text-xs text-[#7B8291] mt-0.5" itemProp="datePublished" content={post.created_at}>
                  {formatDate(post.created_at)}
                </p>
              </div>
            </Link>
          </header>

          <div className="p-5">
            {post.content && (
              <div className="prose prose-invert prose-sm max-w-none mb-4">
                <p className="text-[#E5E7EB] whitespace-pre-wrap leading-relaxed" itemProp="text">
                  {post.content}
                </p>
              </div>
            )}

            {post.media_urls && post.media_urls.length > 0 && (
              <div className="space-y-2 mb-4">
                {post.media_urls.map((url, i) => (
                  <div key={i} className="rounded-xl overflow-hidden bg-[#0A0A0B]">
                    <SafeImage
                      src={url}
                      alt={post.content ? `Imagen de la publicación` : `Imagen compartida por ${post.author.name}`}
                      className="w-full max-h-[480px] object-contain"
                    />
                  </div>
                ))}
              </div>
            )}

            {post.tags && post.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {post.tags.map((tag, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-[#1A1D24] text-[#A7AFBE]"
                  >
                    <Hash className="w-3 h-3" />
                    {tag}
                  </span>
                ))}
              </div>
            )}

            <div className="flex items-center gap-4 text-sm text-[#7B8291]" aria-label="Estadísticas de la publicación">
              <span className="flex items-center gap-1.5">
                <Heart className="w-4 h-4" />
                {post.stats.likes}
              </span>
              <span className="flex items-center gap-1.5">
                <MessageCircle className="w-4 h-4" />
                {post.stats.comments}
              </span>
              <span className="flex items-center gap-1.5">
                <Eye className="w-4 h-4" />
                {post.stats.views}
              </span>
            </div>
          </div>
        </article>

        <div className="mt-6 p-5 rounded-[22px] bg-[#14161B] border border-[rgba(255,255,255,0.08)]">
          <p className="text-sm text-[#A7AFBE] mb-3">
            Esta publicación forma parte de la comunidad GymRatIA. Explora más contenido y comparte tu progreso.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/explore"
              className="inline-flex items-center gap-2 rounded-[16px] bg-[#FF2D2D] px-5 py-2.5 font-semibold text-white hover:bg-[#FF3D3D] transition-colors"
            >
              Ver más publicaciones
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-[16px] border border-[rgba(255,255,255,0.2)] px-5 py-2.5 font-medium text-[#F8FAFC] hover:bg-[#1A1D24] transition-colors"
            >
              Ir al inicio
            </Link>
          </div>
        </div>

        <AppFooter />
      </div>
    </div>
  )
}
