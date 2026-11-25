import { StayGuidePage, stayGuideMetadata } from "@/components/StayGuidePage";

const slug = "wildwood-crest-vacation-rentals";

export const generateMetadata = () => stayGuideMetadata(slug);

export default function Page() {
  return <StayGuidePage slug={slug} />;
}
