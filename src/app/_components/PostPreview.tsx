"use client"

import { useRouter } from 'next/navigation'
import SafeImage from './SafeImage'
import { Play } from 'lucide-react'
import { cn } from '@/lib/utils'

type PostPreviewProps = {
  post: {
    id: string
    post_type: 'photo' | 'video' | 'thread' | 'text'
    media_urls?: string[]
    content?: string
  }
  className?: string
}

export default function PostPreview({ post, className }: PostPreviewProps) {
  const router = useRouter()

  const handleClick = () => {
    router.push(`/explore?post=${post.id}`)
  }

  const firstMedia = post.media_urls?.[0]

  return (
    <div
      onClick={handleClick}
      className={cn(
        "relative aspect-square bg-[#0A0A0B] rounded-lg overflow-hidden cursor-pointer group hover:opacity-90 transition-opacity",
        className
      )}
    >
      {firstMedia ? (
        <>
          {post.post_type === 'video' ? (
            <div className="relative w-full h-full">
              <video
                src={firstMedia}
                className="w-full h-full object-cover"
                muted
                playsInline
                preload="metadata"
                onLoadedMetadata={(e) => {
                  const video = e.currentTarget
                  video.currentTime = 0.1 // Mostrar primer frame
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors pointer-events-none">
                <Play className="w-8 h-8 text-white/80" fill="currentColor" />
              </div>
            </div>
          ) : (
            <SafeImage
              src={firstMedia}
              alt="Post preview"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          )}
          {post.media_urls && post.media_urls.length > 1 && (
            <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path d="M4 3a2 2 0 100 4h12a2 2 0 100-4H4z" />
                <path d="M2 7h16v10a2 2 0 01-2 2H4a2 2 0 01-2-2V7z" />
              </svg>
              {post.media_urls.length}
            </div>
          )}
        </>
      ) : post.content ? (
        <div className="w-full h-full flex items-center justify-center p-4">
          <p className="text-sm text-[#A7AFBE] line-clamp-6 text-center">
            {post.content}
          </p>
        </div>
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-[#14161B]">
          <div className="w-12 h-12 rounded-full border-2 border-[#FF2D2D]/30 flex items-center justify-center">
            <span className="text-[#FF2D2D] text-xs">Post</span>
          </div>
        </div>
      )}
    </div>
  )
}

