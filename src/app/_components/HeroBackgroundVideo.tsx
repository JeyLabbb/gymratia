"use client";

import React from "react";

type HeroBackgroundVideoProps = {
  src: string;
  className?: string;
};

export default function HeroBackgroundVideo({ src, className }: HeroBackgroundVideoProps) {
  const ref = React.useRef<HTMLVideoElement | null>(null);

  React.useEffect(() => {
    const video = ref.current;
    if (!video) return;

    const handleEnded = () => {
      // Ensure last frame stays visible
      video.pause();
      video.currentTime = video.duration;
    };

    video.addEventListener("ended", handleEnded);
    return () => video.removeEventListener("ended", handleEnded);
  }, []);

  return (
    <video
      ref={ref}
      src={src}
      autoPlay
      muted
      playsInline
      preload="auto"
      controls={false}
      className={
        "absolute inset-0 h-full w-full object-cover pointer-events-none select-none " +
        (className ?? "")
      }
    />
  );
}

