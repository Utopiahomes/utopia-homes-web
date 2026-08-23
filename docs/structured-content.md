# Version-controlled V1 content

The `/content` directory is the production V1 content source: properties, destinations, reviews, FAQs, campaigns, global site values, and runtime schemas.

`lib/cms/repository.ts` implements the existing `CmsAdapter`. Pages never import content modules directly. A future CMS/database can replace the adapter binding without changing routes or components.

Property records require stable IDs, branded names/slugs, status, destination/location, descriptions, capacity, rooms, amenities/features, images/alt text, pet/parking/accessibility notes, sources, external booking URL, and SEO metadata.
