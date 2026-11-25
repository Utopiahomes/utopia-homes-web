// Stand-in for next/image (2026-11-25, Next.js -> Astro): a plain <img> with the same src, so the owner
// editor can swap a photo by its path. "fill" becomes the next-fill class (global.css), which covers the
// parent box as Next's fill did; "priority" loads it eagerly.
import type { ImgHTMLAttributes } from "react";

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  src: string | { src: string };
  fill?: boolean;
  priority?: boolean;
  quality?: number;
  placeholder?: string;
  blurDataURL?: string;
  unoptimized?: boolean;
};

export default function Image({ src, fill, priority, quality: _q, placeholder: _p, blurDataURL: _b, unoptimized: _u, className, loading, ...rest }: Props) {
  const classes = [className, fill ? "next-fill" : ""].filter(Boolean).join(" ") || undefined;
  return <img src={typeof src === "string" ? src : src.src} className={classes} loading={loading ?? (priority ? "eager" : "lazy")} decoding="async" {...rest} />;
}
