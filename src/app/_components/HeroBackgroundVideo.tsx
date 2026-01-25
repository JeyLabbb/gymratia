"use client";

import React, { useState, useEffect, useRef } from "react";

type HeroBackgroundVideoProps = {
  src: string;
  className?: string;
};

export default function HeroBackgroundVideo({ src, className }: HeroBackgroundVideoProps) {
  const ref = React.useRef<HTMLVideoElement | null>(null);
  const [shouldPlay, setShouldPlay] = useState(false);
  const [lastFrameSrc, setLastFrameSrc] = useState<string | null>(null);
  const hasInitialized = useRef(false);

  useEffect(() => {
    // Verificar si el video ya se reprodujo en esta sesión
    const videoKey = `video_played_${src}`;
    const hasPlayed = sessionStorage.getItem(videoKey);
    
    if (hasPlayed) {
      // Si ya se reprodujo, solo mostrar el último frame
      const lastFrame = sessionStorage.getItem(`${videoKey}_frame`);
      if (lastFrame) {
        setLastFrameSrc(lastFrame);
      } else {
        // Si no hay último frame guardado, cargar el video pero ir al final
        setShouldPlay(false);
      }
    } else {
      // Primera vez, reproducir el video
      setShouldPlay(true);
    }
    hasInitialized.current = true;
  }, [src]);

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
              const videoKey = `video_played_${src}`;
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
  }, [shouldPlay, src]); // Removido lastFrameSrc del array de dependencias

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
      src={src}
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

