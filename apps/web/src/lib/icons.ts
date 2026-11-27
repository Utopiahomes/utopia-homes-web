// The site's line icons, for sections with an icon on each row (Ray, 2026-11-27: "Start Step 2",
// the icon picker on the AK Development gap list). 24 x 24, drawn with a stroke in the site's colour.
// The owner picks one by name in the editor; editor/bridge.js reads the same list from the page.
export const icons: Record<string, string> = {
  home: "M3 11 12 3l9 8M5 9.5V21h14V9.5M10 21v-6h4v6",
  building: "M4 21V3h11v18M15 9h5v12M7 7h2M11 7h1M7 11h2M11 11h1M7 15h2M11 15h1M3 21h18",
  key: "M14.5 9.5a4.5 4.5 0 1 1-1.3-3.2M13 11l8 8M18 16l2-2M16 18l2-2",
  hammer: "M14 5 9 10l2 2 5-5M14 5l3-2 4 4-2 3-3-1M9 10l-6 6 3 3 6-6",
  chart: "M4 20h16M6 20v-6h3v6M10.5 20V9h3v11M15 20V4h3v16",
  growth: "M3 20h4v-4h4v-4h4V8h4V4",
  handshake: "M2 12l4-4 4 2 3-2 4 1 5 4M6 8l-3 7 6 5 3-2M12 18l2 1 3-2M14 15l3 2M11 13l3 2",
  people: "M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2 20c0-3.5 3-6 7-6s7 2.5 7 6M16 4.5a3.5 3.5 0 0 1 0 6.5M18 14c2.4.6 4 2.9 4 6",
  person: "M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c0-4.4 3.6-7 8-7s8 2.6 8 7",
  graduation: "M12 3 2 8l10 5 10-5-10-5zM6 10.5V16c0 1.7 2.7 3 6 3s6-1.3 6-3v-5.5M22 8v6",
  book: "M4 4h6a2 2 0 0 1 2 2v14a2 2 0 0 0-2-2H4zM20 4h-6a2 2 0 0 0-2 2v14a2 2 0 0 1 2-2h6z",
  food: "M8 3v8M5 3v5a3 3 0 0 0 6 0V3M8 11v10M17 3c-2 2-3 4-3 7h3v11",
  heart: "M12 20s-8-5-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 9c0 6-8 11-8 11z",
  leaf: "M5 19c0-8 5-14 15-15-1 10-7 15-15 15zM5 19l7-7",
  star: "M12 3l2.5 5 5.5.8-4 3.9.9 5.5L12 15.6 7.1 18.2l.9-5.5-4-3.9 5.5-.8z",
  shield: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6zM8.5 12l2.5 2.5 4.5-5",
  check: "M4 12l5 5L20 6",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 3",
  calendar: "M4 6h16v15H4zM4 10h16M8 3v4M16 3v4",
  phone: "M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A17 17 0 0 1 3 5a2 2 0 0 1 2-2z",
  mail: "M3 6h18v12H3zM3 7l9 6 9-6",
  pin: "M12 21s-7-6.5-7-12a7 7 0 0 1 14 0c0 5.5-7 12-7 12zM12 11.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z",
  money: "M3 7h18v10H3zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 10v4M18 10v4",
  idea: "M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.9.7 1.5 1.6 1.5 2.6V17h4v-.5c0-1 .6-1.9 1.5-2.6A6 6 0 0 0 12 3z",
  globe: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3 12h18M12 3c2.5 2.7 3.5 5.7 3.5 9s-1 6.3-3.5 9c-2.5-2.7-3.5-5.7-3.5-9s1-6.3 3.5-9z",
  chat: "M4 5h16v11H9l-5 4z",
};

export const iconNames = Object.keys(icons);
export const iconPath = (name: string | undefined): string => icons[name ?? ""] ?? icons.star;
