import type { AmenityGroup } from "@/types/content";

export function AmenityGroups({ groups }: { groups: AmenityGroup[] }) {
  if (!groups.length) return <p className="content-note">The verified amenity list is pending content review.</p>;
  return <div className="amenity-groups">{groups.map((group) => <section key={group.name}><h3>{group.name}</h3><ul>{group.amenities.map((amenity) => <li key={amenity}>{amenity}</li>)}</ul></section>)}</div>;
}
