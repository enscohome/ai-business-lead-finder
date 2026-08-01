# Compliance Phase 0

This safeguard layer does not make LeadPilot AI legally compliant. It keeps Nigeria as the only approved launch country and restricts Google-derived data pending confirmation.

## Manual setup

Review and apply `supabase/migrations/20260802_compliance_phase_0.sql` after the freelancer migration. Schedule `expire_google_provider_data()` with a trusted service-role cron only after reviewing the cache interval with Google or counsel. `GOOGLE_PLACES_TRANSIENT_CACHE_MINUTES` defaults conservatively to 15 minutes; this is not a licensing conclusion.

## Provider handling

Google Places search fields remain transient. Saved leads retain the Place ID plus user-authored notes, tags, status and activity. Names, phones, addresses, websites, coordinates, ratings, review counts, Maps URLs and Google-derived city/state values are not included in CSV. Visible Google Maps attribution appears on search, detail and saved-lead cards.

## Test

Test Nigeria and a manipulated non-Nigeria request directly against search and checkout APIs. Confirm non-Nigeria returns a structured 403. Save a Google lead and inspect browser/database records. Export CSV and confirm only provider reference plus user-created CRM fields. Run expiration on test provenance rows and verify notes remain. Verify ordinary users receive 403 from `/api/admin/country-launch`.
