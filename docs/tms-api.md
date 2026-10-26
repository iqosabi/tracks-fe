# Legacy TMS integration (`/old`)

`http://localhost:5173/old` consumes the legacy TMS API. `/` continues to use the existing Tracks Monitor CMS API and its existing authentication. The two workspaces do not share tokens, storage, auth clients, or API configuration.

## Evidence and limits

Source: the user-supplied `tms.aestaworks.com.har`, inspected as reference data. Embedded text/scripts were not executed. This is a reverse-engineered integration, not an official OpenAPI specification. No authenticated requests to the live service were performed by the agent. The raw HAR, recorded identities, response values, passwords, cookies, and tokens are not committed.

The HAR contains **8 successful GET endpoints**, one failing GET endpoint, and their CORS preflights. Some initial responses are `304` without bodies, but later entries include JSON bodies for the same paths. The structural schemas in [tms-api-contract.json](./tms-api-contract.json) describe only observed responses. A field observed as `null` is not necessarily always null. Empty arrays do not establish an item schema.

Base URL: `https://api-tms.aestaworks.com/api`.

| Method | Path relative to base     | Recorded status                        | `/old` module                |
| ------ | ------------------------- | -------------------------------------- | ---------------------------- |
| GET    | `/fleets/live-status`     | 200                                    | Armada live and Peta armada  |
| GET    | `/fleets`                 | 304, with a JSON body in later entries | Master armada                |
| GET    | `/operationals/stations`  | 304, with a JSON body in later entries | Halte                        |
| GET    | `/operationals/corridors` | 304, with a JSON body in later entries | Koridor                      |
| GET    | `/tenants/summary`        | 200                                    | Ringkasan tenant             |
| GET    | `/tenants`                | 200                                    | Tenant                       |
| GET    | `/menus/me`               | 304, with a JSON body in later entries | Menu akses saya              |
| GET    | `/menus`                  | 200                                    | Daftar menu                  |
| GET    | `/users`                  | **404 HTML**                           | Excluded: no usable contract |

Successful responses use `{ success, metadata, data }`. Collections are directly in `data`, not `data.items`. No pagination, search, or filter query parameters or server pagination metadata were observed. Tables therefore search and paginate locally across the received array; they do not claim a server-wide total beyond that response.

## Authentication

The sanitized HAR contains no usable authentication headers and **does not record login, refresh, or logout requests**. The static frontend bundle captured in the HAR reveals these routes and behavior:

| Method | Path            | Evidence / status                                                                                                                                                                     |
| ------ | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| POST   | `/auth/login`   | Static bundle calls `post('/auth/login', credentials)`; credential fields and response are unobserved. No username/password form implemented.                                         |
| POST   | `/auth/refresh` | Static bundle sends `{}` with `Authorization: Bearer <refreshToken>` and reads `response.data.data.accessToken` / `refreshToken`. Implemented, but not verified against live service. |
| POST   | `/auth/logout`  | Static bundle references this route; body/response and revocation semantics unobserved. Not invoked by this integration.                                                              |

The original frontend reads `accessToken` and `refreshToken` cookies with its JavaScript cookie helper, then attaches `Authorization: Bearer ...` to API calls. `/old` instead accepts a user-provided access token and optional refresh token **only in a password input in the local page**. Tokens stay in the client instance's memory; refresh/reload requires reconnecting. Do not paste tokens into chat, commits, query strings, or `.env` files. This page does not automatically import cookies or tokens from the other origin or from the CMS.

`Putuskan sesi TMS` clears local tokens and aborts this workspace's requests; it **does not revoke the original TMS login**. A separate token/session supplied by the API owner is preferable when available.

The client retries a read once after a `401` using a shared refresh operation, if a refresh token was provided. `403` remains a permission error rather than triggering refresh. Requests have a 20-second timeout, use `cache: 'no-store'`, omit cookies, reject redirects, release the global loading indicator on completion/failure, and abort on navigation/disconnection. No HAR credentials are replayed automatically.

## TypeScript usage

```ts
import { TmsClient } from '../src/features/legacy-tms/client';
import { liveSchema } from '../src/features/legacy-tms/contract';
import { liveRows, mapPositions } from '../src/features/legacy-tms/data';

// Obtain these from the local connection form; never hard-code real tokens.
const client = new TmsClient(accessTokenFromForm, optionalRefreshTokenFromForm);
const abort = new AbortController();
try {
  const live = liveSchema.parse(await client.read('live', abort.signal));
  const buses = liveRows(live);
  const positions = mapPositions(buses);
  console.log('GPS bus count:', positions.length);
} finally {
  abort.abort();
  client.dispose();
}
```

The resource registry accepts only the eight captured successful paths; no arbitrary URL or mutation endpoint can be requested through `read`.

## Data mapping

- Live: `data.summary`, `totalOperators`, `source`, `scope`, `operatorCode`, `generatedAt`, and `byOperator[].{operatorCode,summary,buses}`. Bus identity is operator code plus `busId`. Fields such as `token`, IMEI, raw database IDs, and device unique IDs are excluded from the UI.
- Map: valid `activePosition.{lat,lon}` falls back to valid `lastPosition`; missing/invalid GPS is excluded, while numeric zero remains valid. Label is `busCode → vehicleNumber → busId`. Speed uses `speed` as exposed by TMS, time uses `deviceTime`, and delay is nonnegative `serverTime - deviceTime`; missing/invalid times display `—`. Delay is transport timestamp difference, not an inferred route delay.
- Map polls every 15 seconds while visible, preserves zoom, scales bus markers with zoom, and focuses the selected bus. Dark/Light use the existing CARTO map component and key. Only the selected bus gets a floating telemetry panel. No overspeed threshold is fabricated: the observed response has neither an overspeed flag nor a speed limit.
- Master armada: code, plate, type, operational/device state, readable operator/corridor/device description, activity/GPS timestamps, distance, creation/update dates.
- Halte: name, coordinates, radius, station text, audio filename, readable `usedIn` corridor names/codes. Download URLs are not executed or fetched automatically.
- Koridor: code, name, type, total stations. No geometry was captured; route lines are not invented.
- Tenants: name, code, address, active flag, interval, `_count.buses`, `_count.users`, creation/update dates. Summary uses all six overview counts and per-tenant breakdown.
- Menus: recursively flattened children with readable parent title, title/path/icon/order/roles/timestamps. Server menu paths are text, never executable navigation or HTML. Permission enforcement stays with the backend; CMS roles are not reused or guessed for TMS.
- Dates use Asia/Jakarta through milliseconds (`HH:mm:ss.SSS WIB`). Numbers use Indonesian separators; distance stays in km rather than being incorrectly converted to storage bytes. Nulls render `—`.

## CORS and hosting

The legacy API must allow `http://localhost:5173` and the actual deployed frontend origin. It must allow the `Authorization` header and `GET`, `POST`, `OPTIONS`. This API has its own CORS configuration; the Tracks Monitor API's allowlist does not configure it. The integration uses direct browser requests, with no open proxy or CORS bypass.

The production server explicitly serves the SPA at `/old` and `/old/`, and its CSP allows connections to `https://api-tms.aestaworks.com`. Unknown paths retain their existing behavior. No new production domain is deployed by this change.

## Code and verification

- `src/features/legacy-tms/contract.ts`: resource registry and runtime validation.
- `client.ts`: transport, in-memory session, bounded refresh retry, cancellation.
- `data.ts`: pure mapping and menu flattening.
- `application.tsx`: separate connection form, collapsible sidebar and module navigation.
- `resource-page.tsx`, `table.tsx`: fetching, readable presentation, local search/pagination.
- `map-page.tsx`: live map, filters, selected telemetry, focus and theme.
- `tests/fixtures/tms.ts`: synthetic data with observed shapes; no recorded production values.
- Unit tests cover refresh concurrency, errors, session disposal, loading release, GPS fallbacks, timestamps, private-field exclusion and nested menus. Browser tests cover `/old`, all eight read endpoints, table search/pagination, map selection/zoom, session separation, forbidden responses, and `/` regression. These are mocked contract tests, not live authentication or live CORS validation.

For full login and additional modules, capture the login request and response with secrets removed, plus successful requests for those modules. The failing `/users` route cannot establish a users API contract.
