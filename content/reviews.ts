import type { Review } from "@/types/content";
import { reviewSchema, validateCollection } from "./schemas";
// Add only reviews with documented publication permission. Pending reviews never render.
export const reviews: Review[] = validateCollection(reviewSchema, [], "reviews");
