import type { Metadata } from "next";
import { businessProfile, siteContent } from "@/content/site";
import type { ContentImage } from "@/types/content";

interface PageMetadataInput {
  title: string;
  description: string;
  /** The page's own path. It becomes the canonical URL, so search filters never count as pages. */
  path: string;
  image?: ContentImage;
  /** Use the title as written, without the site name added after it. */
  absoluteTitle?: boolean;
}

/**
 * Canonical URL and link-preview tags for a page. Next replaces a parent's openGraph entirely when
 * a page sets its own, so every page states the whole set here.
 */
export function pageMetadata({ title, description, path, image, absoluteTitle = false }: PageMetadataInput): Metadata {
  // Link previews can't reliably show AVIF, so those pages use the default photo.
  const preview = image && !image.src.endsWith(".avif") ? image : businessProfile.shareImage;
  const socialTitle = absoluteTitle ? title : `${title} | ${siteContent.name}`;
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: path },
    openGraph: { type: "website", siteName: siteContent.name, title: socialTitle, description, url: path, images: [{ url: preview.src, alt: preview.alt }] },
    twitter: { card: "summary_large_image", title: socialTitle, description, images: [preview.src] },
  };
}
