"use client"

import React from "react"

type SafeImageProps = React.ImgHTMLAttributes<HTMLImageElement> & {
  fallbackSrc?: string
}

export default function SafeImage({
  src,
  fallbackSrc = "/images/placeholder.png",
  alt,
  ...props
}: SafeImageProps) {
  const [hasError, setHasError] = React.useState(false)

  if (hasError) {
    return null
  }

  return (
    <img
      {...props}
      src={src}
      alt={alt}
      onError={() => {
        setHasError(true)
      }}
    />
  )
}

