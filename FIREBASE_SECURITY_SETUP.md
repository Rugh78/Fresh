# Firebase and edge security setup

The app now signs visitors in anonymously and creates 12-character share codes for new lists. Apply the database rules only after the updated app is deployed, so the current public version does not lose database access.

## Firebase

1. In Firebase Console, enable **Authentication → Sign-in method → Anonymous**.
2. Deploy the updated app so it signs in anonymously before accessing Realtime Database.
3. In **Realtime Database → Rules**, publish the contents of `database.rules.json`.

The rules deny direct root reads and writes, and require a Firebase-authenticated session to access an individual list. The share code remains a bearer link: anyone who has a valid list code can read and edit that list. New list codes are longer and generated with the Web Crypto API. Existing 6-character list codes remain valid for compatibility; rotate any old code that should no longer be shared.

## Cloudflare parser endpoint

Configure a Cloudflare rate-limiting rule for `POST /api/parse` (for example, 20 requests per minute per IP). The function limits request size and input length, but a reliable per-IP limit must be configured at the edge.

The Firebase Console account used during this change did not have permission to manage sign-in methods, so Anonymous sign-in and the live database rules were not changed here.
