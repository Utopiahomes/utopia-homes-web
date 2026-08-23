"use client";
import Image from "next/image";
import { useEffect, useRef } from "react";
import type { ContentImage } from "@/types/content";
export function ParallaxMedia({ image, className = "" }: { image: ContentImage; className?: string }) {
  const frame = useRef<HTMLDivElement>(null);
  useEffect(() => { const element = frame.current; if (!element || matchMedia("(prefers-reduced-motion: reduce)").matches) return; let ticking = false; const update = () => { const rect = element.getBoundingClientRect(); const progress = (innerHeight - rect.top) / (innerHeight + rect.height) - .5; element.style.setProperty("--parallax", `${Math.max(-1, Math.min(1, progress)) * 44}px`); ticking = false; }; const onScroll = () => { if (!ticking) { requestAnimationFrame(update); ticking = true; } }; update(); addEventListener("scroll", onScroll, { passive: true }); return () => removeEventListener("scroll", onScroll); }, []);
  return <div ref={frame} className={`parallax-media ${className}`}><Image src={image.src} alt={image.alt} fill sizes="100vw" /></div>;
}
