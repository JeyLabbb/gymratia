"use client";

import React, { useState, useEffect, useRef } from "react";

type HeroBackgroundVideoProps = {
  src: string;
  /** Video alternativo para móvil/vertical (portrait o viewport estrecho) */
  mobileSrc?: string;
  className?: string;
};

function useMobileOrPortrait(): boolean {
  const [isMobileOrPortrait, setIsMobileOrPortrait] = useState(false);

  useEffect(() => {
    const check = () => {
      const narrow = window.matchMedia("(max-width: 767px)").matches;
      const portrait = window.matchMedia("(orientation: portrait)").matches;
      setIsMobileOrPortrait(narrow || portrait);
    };

    check();
    const mqNarrow = window.matchMedia("(max-width: 767px)");
    const mqPortrait = window.matchMedia("(orientation: portrait)");
    const handler = () => check();
    mqNarrow.addEventListener("change", handler);
    mqPortrait.addEventListener("change", handler);
    return () => {
      mqNarrow.removeEventListener("change", handler);
      mqPortrait.removeEventListener("change", handler);
    };
  }, []);

  return isMobileOrPortrait;
}

export default function HeroBackgroundVideo({ src, mobileSrc, className }: HeroBackgroundVideoProps) {
  const ref = React.useRef<HTMLVideoElement | null>(null);
  const [shouldPlay, setShouldPlay] = useState(false);
  const [lastFrameSrc, setLastFrameSrc] = useState<string | null>(null);
  const hasInitialized = useRef(false);
  const isMobileOrPortrait = useMobileOrPortrait();

  const effectiveSrc = mobileSrc && isMobileOrPortrait ? mobileSrc : src;

  useEffect(() => {
    setLastFrameSrc(null); // Evitar frame de otro video al cambiar src
    const videoKey = `video_played_${effectiveSrc}`;
    const hasPlayed = sessionStorage.getItem(videoKey);

    if (hasPlayed) {
      const lastFrame = sessionStorage.getItem(`${videoKey}_frame`);
      if (lastFrame) {
        setLastFrameSrc(lastFrame);
      } else {
        setShouldPlay(false);
      }
    } else {
      setShouldPlay(true);
    }
    hasInitialized.current = true;
  }, [effectiveSrc]);

  useEffect(() => {
    const video = ref.current;
    if (!video || !hasInitialized.current) return;

    const captureLastFrame = () => {
      try {
        // Asegurar que el video esté en el último frame
        video.currentTime = video.duration;
        video.pause();
        
        // Esperar a que el frame esté listo
        const capture = () => {
          if (video.readyState >= 2) { // HAVE_CURRENT_DATA o superior
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth || 1920;
            canvas.height = video.videoHeight || 1080;
            const ctx = canvas.getContext('2d');
            if (ctx && video.videoWidth > 0 && video.videoHeight > 0) {
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              const frameDataUrl = canvas.toDataURL('image/jpeg', 0.95);
              
              // Guardar en sessionStorage
              const videoKey = `video_played_${effectiveSrc}`;
              sessionStorage.setItem(videoKey, 'true');
              sessionStorage.setItem(`${videoKey}_frame`, frameDataUrl);
              
              setLastFrameSrc(frameDataUrl);
              setShouldPlay(false);
            }
          } else {
            // Si aún no está listo, esperar un poco más
            setTimeout(capture, 50);
          }
        };
        
        setTimeout(capture, 100);
      } catch (error) {
        console.error('Error capturing video frame:', error);
      }
    };

    const handleLoadedMetadata = () => {
      if (!shouldPlay) {
        // Si no debe reproducir, ir directamente al final y capturar frame
        video.currentTime = video.duration;
        video.pause();
        captureLastFrame();
      }
    };

    const handleLoadedData = () => {
      if (!shouldPlay && !lastFrameSrc) {
        // Si no debe reproducir y no hay frame guardado, ir al final
        video.currentTime = video.duration;
        video.pause();
        captureLastFrame();
      }
    };

    const handleEnded = () => {
      // Cuando termine, capturar el último frame y guardarlo
      captureLastFrame();
    };

    const handleCanPlay = () => {
      if (shouldPlay) {
        video.play().catch(console.error);
      } else if (!lastFrameSrc) {
        video.currentTime = video.duration;
        video.pause();
      }
    };

    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("loadeddata", handleLoadedData);
    video.addEventListener("canplay", handleCanPlay);
    video.addEventListener("ended", handleEnded);
    
    return () => {
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("loadeddata", handleLoadedData);
      video.removeEventListener("canplay", handleCanPlay);
      video.removeEventListener("ended", handleEnded);
    };
  }, [shouldPlay, effectiveSrc]);

  // Si tenemos el último frame guardado, mostrar solo la imagen
  if (lastFrameSrc) {
    return (
      <img
        src={lastFrameSrc}
        alt="Background"
        className={
          "absolute inset-0 h-full w-full object-cover pointer-events-none select-none " +
          (className ?? "")
        }
      />
    );
  }

  return (
    <video
      ref={ref}
      src={effectiveSrc}
      autoPlay={shouldPlay}
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

