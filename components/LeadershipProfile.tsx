import type { LeadershipProfile as LeadershipProfileContent } from "@/types/content";

export function LeadershipProfile({ profile, context }: { profile: LeadershipProfileContent; context: string }) {
  return <article className="leadership-profile"><div className="profile-monogram" aria-hidden="true">{profile.initials}</div><div><p className="eyebrow">{context}</p><h2>{profile.name}</h2><p className="profile-role">{profile.role}</p><p>{profile.summary}</p></div></article>;
}
