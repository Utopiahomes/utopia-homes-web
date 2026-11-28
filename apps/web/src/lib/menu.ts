// The site's menu and footer links (lists.json "menu" and "footer"; Ray, 2026-11-27: "add
// everything. I want full features"). Both are ordered lists the owner or Lucy changes in Stoin's
// editor: the order is the list, and a link not in it is hidden. The choices are the site's own
// pages plus every page the owner added (pages.json), whose ids are "p<index>" so they never change
// when a page's address does. Copied from the AK Development site.
import { content } from "./content";
import { stripMarkers } from "../../editor/markers.mjs";

const editMode = import.meta.env.PUBLIC_EDIT_MODE === "1";

type Link = { id: string; href: string; label: string; title: string };

const fixed: Link[] = [
  { id: "stays", href: "/stays", label: "Stays" },
  { id: "destinations", href: "/destinations/wildwood-new-jersey", label: "WW / Cape May" },
  { id: "owners", href: "/list-your-home", label: "Owners" },
  { id: "design", href: "/design", label: "Design" },
  { id: "about", href: "/about", label: "About" },
].map((link) => ({ ...link, title: link.label }));
const owned: (Link & { status: string })[] = content.pages.pages.map((page, index) => {
  const status = stripMarkers(page.status);
  return {
    id: `p${index}`,
    href: `/${stripMarkers(page.slug)}`,
    label: page.title,
    title: `${stripMarkers(page.title)}${status === "live" ? "" : status === "draft" ? " (draft)" : " (removed)"}`,
    status,
  };
});

/** Links this build can show: the site's pages, live added pages, and drafts in the editing copy. */
const built = [...fixed, ...owned.filter((page) => page.status === "live" || (editMode && page.status === "draft"))];

export type MenuList = "menu" | "footer";

/** The links in the list's order. In the editing copy the others follow, hidden, so the editor can
 * show a new order or a link shown again straight away (editor/bridge.js). */
export function menuLinks(list: MenuList) {
  const ids = content.lists[list] as string[];
  const shown = ids.map((id) => built.find((link) => link.id === id)).filter((link): link is Link => Boolean(link));
  const rest = editMode ? built.filter((link) => !ids.includes(link.id)) : [];
  return [...shown.map((link) => ({ ...link, hidden: false })), ...rest.map((link) => ({ ...link, hidden: true }))];
}

/** What the editor's manifest says about the list. Every page is a choice (removed ones too), so a
 * saved list always holds known ids. */
export function menuMeta(list: MenuList, label: string) {
  const choices = [...fixed, ...owned];
  return editMode
    ? JSON.stringify({ list, label, min: list === "menu" ? 1 : 0, max: choices.length, choices: choices.map(({ id, title }) => ({ id, title })) })
    : "";
}
