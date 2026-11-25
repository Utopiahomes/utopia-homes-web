import type { Review } from "../types/content.js";
import { reviewSchema, validateCollection } from "./schemas.js";
// Add only reviews with documented publication permission. Pending reviews never render.
export const reviews: Review[] = validateCollection(reviewSchema, [], "reviews");
