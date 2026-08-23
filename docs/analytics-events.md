# Analytics event dictionary

- `page_view`: route, referrer, and UTM parameters.
- `property_view`: property ID, slug, and destination.
- `outbound_booking_click`: property ID, slug, booking host, CTA location, and UTM data.
- `owner_page_view`, `owner_lead_start`, `owner_lead_submit`: owner-funnel activity; never include sensitive form values.
- `membership_signup`, `design_service_interest`, `campaign_view`, `campaign_conversion`, `contact_submit`: future V1 conversion events.

The local adapter emits a browser event and logs in development. Replace it behind `lib/analytics` when the production provider is approved.

Implemented hooks cover property views, outbound booking clicks, all four V1 submissions, and campaign views. `campaign_conversion` is typed and should attach to the final approved campaign conversion action.
