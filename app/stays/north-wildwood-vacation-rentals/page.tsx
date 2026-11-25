import { StayGuidePage, stayGuideMetadata } from "@/components/StayGuidePage";

const slug = "north-wildwood-vacation-rentals";

export const generateMetadata = () => stayGuideMetadata(slug);

export default function Page() {
  return <StayGuidePage slug={slug} />;
}
