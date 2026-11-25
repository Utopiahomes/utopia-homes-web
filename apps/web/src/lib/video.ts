// A video the owner puts on a page (2026-11-25, Ray: "Can a customer insert videos into their
// website?"): a YouTube, Vimeo or Loom link, shown in that service's own player. The same rules are
// in editor/bridge.js (the live preview) and in Stoin's editor (site_editor_kinds.clean_video).

export function videoEmbed(link: string | undefined): string {
  const url = (link ?? "").trim();
  const youtube = url.match(/^https:\/\/(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?(?:[^#]*&)?v=|shorts\/|live\/|embed\/)|youtu\.be\/)([\w-]{11})/);
  if (youtube) return `https://www.youtube-nocookie.com/embed/${youtube[1]}`;
  const vimeo = url.match(/^https:\/\/(?:www\.|player\.)?vimeo\.com\/(?:video\/)?(\d{1,12})/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  const loom = url.match(/^https:\/\/(?:www\.)?loom\.com\/(?:share|embed)\/([0-9a-f]{32})/);
  if (loom) return `https://www.loom.com/embed/${loom[1]}`;
  return "";
}

export const videoHosts = ["https://www.youtube-nocookie.com", "https://player.vimeo.com", "https://www.loom.com"];
