import type { Campaign, DesignPageContent, Destination, FAQ, Property, PublicLucyContent, Review } from "@/types/content";

export interface CmsAdapter {
  getProperties(): Promise<Property[]>;
  getPropertyBySlug(slug: string): Promise<Property | null>;
  getDestinations(): Promise<Destination[]>;
  getDestinationBySlug(slug: string): Promise<Destination | null>;
  getReviews(propertyId?: string): Promise<Review[]>;
  getFAQs(category?: FAQ["category"]): Promise<FAQ[]>;
  getCampaignBySlug(slug: string): Promise<Campaign | null>;
  getDesignPage(): Promise<DesignPageContent>;
  getPublicLucyContent(): Promise<PublicLucyContent>;
}
