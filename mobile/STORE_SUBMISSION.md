# App Store and Google Play submission guide

Everything needed to submit the Champaign County Churches app, and an honest
account of what is not ready yet.

Keep this file in step with the code. If the app ever transmits location, adds
an account, or embeds an analytics SDK, the declarations below and
[`/privacy`](../app/privacy/page.tsx) must change in the same commit.

---

## 1. Current submission readiness

Last reviewed 2026-10-10.

| Requirement | State |
|---|---|
| Privacy policy URL | **Ready** — https://www.champaigncountychurches.com/privacy (covers the apps) |
| Support URL | **Ready** — https://www.champaigncountychurches.com/contact |
| In-app privacy and support links | **Ready** — About tab |
| Apple privacy nutrition labels | **Ready** — "Data Not Collected"; answers in §3 |
| Google Data Safety form | **Ready** — answers in §4 |
| Account deletion (Apple 5.1.1(v)) | **Not applicable** — the app has no accounts. See §5 |
| Location purpose string | **Ready** — set in `app.json`, and truthful |
| Bundle ID / application ID | **Set** — `com.champaigncountychurchdirectory.app`. Confirm it matches App Store Connect before the first build; it is permanent |
| App icons and splash | **Ready** — from the Champaign County Churches logo (`node scripts/brand-assets.mjs` at the repo root); the 1024px icon is opaque, as Apple requires |
| Backing data | **Ready** — the live site (Neon Postgres) serves 70 churches through `/api/v1`; the app points at `https://www.champaigncountychurches.com` |
| Web build of the app | **Checked** — every tab loads live data |
| Android release build | See §7 |
| iOS build | **Blocked locally** — Expo SDK 57 needs Xcode 27; this Mac has Xcode 26.3. EAS cloud builds use Xcode 27 |
| Run on a real device / simulator | **Not done** — see §7 |
| Screenshots | **Not ready** — need a simulator or device run |
| Store listing copy | **Draft in §6** |

**Do not submit yet.** Blocking: a native run on iOS and Android, and screenshots.

---

## 2. Guideline 4.2 (Minimum Functionality)

Apple rejects apps that are repackaged websites. This app is not a web view; it
is a native client against a JSON API. Point to these if review pushes back:

- **Location.** "Near me" reads device position to order churches by distance.
  A website cannot do this with the same permission model or precision.
- **Offline.** Saved churches persist on-device and are readable with no
  connection.
- **Native integrations.** Directions open Apple Maps, phone numbers dial
  through the system, the share sheet is native, and websites open in
  `SFSafariViewController`.
- **Platform conventions.** Native tab navigation, system dark mode, Dynamic
  Type-compatible text, and native pull-to-refresh.

Distance sorting is live: 53 of 55 churches are geocoded, and the app orders
them by distance from the device without sending coordinates anywhere.

The honest risk: the core value is browsing a directory, and review may still
consider that web-equivalent. Distance sorting and offline saved churches are
the two genuinely device-dependent capabilities to lead with.

---

## 3. Apple privacy nutlabels (App Store Connect → App Privacy)

Answer: **"Data Not Collected."**

That is accurate as built:

| Data type | Collected? | Why |
|---|---|---|
| Contact info | No | No account, no forms in the app |
| Location | **No** | Read on-device for sorting only. Never transmitted, never persisted. See `mobile/app/(tabs)/nearby.tsx` |
| Identifiers | No | No device ID, no advertising ID, no analytics SDK |
| Usage data | No | No analytics |
| Diagnostics | No | No crash-reporting SDK |
| User content | No | Saved churches never leave the device (`mobile/src/saved.ts`) |

> Apple counts data as "collected" only when it leaves the device. On-device-only
> location does not need to be declared. This is precisely why the location
> transmission was removed from the near-me screen — declaring "Data Not
> Collected" while sending coordinates to a server would be a false declaration.

**Encryption question:** `usesNonExemptEncryption` is set to `false` in
`app.json`. The app uses only standard HTTPS, which is exempt.

---

## 4. Google Play Data Safety

| Section | Answer |
|---|---|
| Does your app collect or share any of the required user data types? | **No** |
| Is all user data encrypted in transit? | **Yes** — all API traffic is HTTPS |
| Do you provide a way for users to request data deletion? | **Yes** — no server-side data exists; on-device data is removed by uninstalling or clearing app storage. The privacy policy documents the listing-removal route |
| Data types | None declared |

**Permissions declared:** `ACCESS_COARSE_LOCATION`, `ACCESS_FINE_LOCATION`.
Play will ask why. Answer: approximate/precise location is used solely to sort
the church list by distance on the device; it is not transmitted or stored. No
background location is requested.

---

## 5. Account deletion (Apple guideline 5.1.1(v))

Apps that **support account creation** must offer in-app account deletion.

This app has no sign-in, no registration, and no server-side user record, so the
requirement does not apply to version 1.0.

**This changes the moment church-staff login is added to the app.** Before that
ships, all of the following are required:

1. An in-app path to permanently delete the account, not merely deactivate it.
2. Deletion reachable without contacting support.
3. A server endpoint that erases the `User` row, its `ChurchMembership` rows, and
   its `ClaimRequest` association.
4. A documented retention window for anything kept for legal reasons.

Recommendation: keep church-staff editing on the web for 1.0. It removes this
blocker entirely and shrinks the review surface.

---

## 6. Store listing copy (draft)

**Name:** Champaign County Churches
**Subtitle (iOS, ≤30 chars):** Find a church near you
**Short description (Play, ≤80 chars):** Browse churches across Champaign County, Illinois — times, contact, directions.

**Description:**

> Find a church in Champaign County, Illinois.
>
> Browse congregations across Champaign, Urbana, Savoy, Rantoul, Mahomet, and
> the surrounding communities. See service times, ministries, and pastoral
> leadership, then call, get directions, visit a website, or watch a livestream
> in a couple of taps.
>
> • Search by church name, pastor, denomination, or city
> • Filter for checked listings, livestreams, and church apps
> • Browse by city
> • Sort by distance using your location, which never leaves your device
> • Save churches to read offline
> • Directions, calling, and sharing through your device's own apps
>
> No account required. No ads. No tracking.
>
> Is your church listed incorrectly, or missing? Contact us and we will fix it.

**Category:** Reference (primary). Lifestyle is a reasonable secondary.
**Content rating:** Everyone / 4+.

**Review notes (paste into App Store Connect):**

> No account is required; every feature is reachable without signing in.
> Location is optional, used only to sort the list by distance, and is never
> transmitted off the device. To test: open the app, browse the Directory tab,
> tap any church for details, then try Directions or Save.

---

## 7. Known gaps to close before release

1. **iOS toolchain.** Expo SDK 57's native code requires Xcode 27 (its Swift
   6.3 compiler). Either update Xcode from the Mac App Store and run
   `sudo xcode-select -s /Applications/Xcode.app/Contents/Developer`, or build
   in the cloud with EAS (§8), which already uses Xcode 27.
2. **Android emulator.** This Mac is Apple Silicon, but the installed Android
   system images are x86_64 only. In Android Studio → Device Manager, create a
   phone (e.g. Pixel 9) with an **arm64-v8a** Google Play image.
3. **Screenshots.** Needed for both stores: iPhone 6.9" (1320×2868), iPad 13"
   if tablets stay enabled (`supportsTablet: true`), and Android phone.
4. **Two ungeocoded churches.** Temple Baptist and New Covenant Fellowship did
   not match the Census geocoder; they sort last in Near me.
5. **Accounts the owner must hold:** Apple Developer Program ($99/year),
   Google Play Console ($25 once), and an Expo account for EAS builds. Store
   credentials stay with EAS or the owner; never commit them.

---

## 8. Build and submit

Cloud builds need no local Xcode.

```bash
cd mobile
npx eas-cli login
npx eas-cli build:configure

# Internal test builds
npx eas-cli build --profile preview --platform ios
npx eas-cli build --profile preview --platform android

# Store builds
npx eas-cli build --profile production --platform ios
npx eas-cli build --profile production --platform android

# Submit
npx eas-cli submit --platform ios
npx eas-cli submit --platform android
```

Credentials are deliberately not committed. Apple signing certificates and the
Play service-account key should be held by EAS or supplied interactively; never
add them to this repository.

To build locally on macOS instead, Xcode must be selected first:

```bash
sudo xcode-select -s /Applications/Xcode.app
```
