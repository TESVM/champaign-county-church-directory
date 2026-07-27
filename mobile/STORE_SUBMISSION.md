# App Store and Google Play submission guide

Everything needed to submit the Champaign County Churches app, and an honest
account of what is not ready yet.

Keep this file in step with the code. If the app ever transmits location, adds
an account, or embeds an analytics SDK, the declarations below and
[`/privacy`](../app/privacy/page.tsx) must change in the same commit.

---

## 1. Current submission readiness

| Requirement | State |
|---|---|
| Privacy policy URL | **Ready** — `/privacy` |
| Apple privacy nutrition labels | **Ready** — answers in §3 |
| Google Data Safety form | **Ready** — answers in §4 |
| Account deletion (Apple 5.1.1(v)) | **Not applicable** — the app has no accounts. See §5 |
| Location purpose string | **Ready** — set in `app.json`, and truthful |
| Bundle ID / application ID | **Set** — `com.champaigncountychurchdirectory.app`. Confirm it matches App Store Connect before the first build; it is permanent |
| App icons | **Not ready** — still the Expo template. Apple rejects placeholders under 2.3.7 |
| Screenshots | **Not ready** |
| Store listing copy | **Draft in §6** |
| Backing data | **Not ready** — the API still serves in-repo mock records, not a database |
| Run on a real device | **Not done** — no simulator available on the build machine |

**Do not submit yet.** The blocking items are icons, screenshots, real data, and
at minimum one full pass on a physical device.

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

The honest risk: the core value is browsing a directory, and review may still
consider that web-equivalent. The strongest mitigations are shipping geocoded
distance sorting (currently unimplemented — see §7) and offline-first caching,
both of which are genuinely device-dependent.

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
> • Filter for verified listings, livestreams, and church apps
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

1. **Real data.** The API serves in-repo mock records. Some listings are real
   churches; some are fictional. Shipping fictional churches in a real directory
   would mislead users and risks a factual-accuracy rejection.
2. **Geocoding.** No church has coordinates, so "Near me" cannot sort by
   distance. The screen says so plainly rather than pretending. This is also the
   strongest 4.2 argument, so it is worth closing first.
3. **Icons and screenshots.** Template assets only.
4. **Device testing.** Never run on hardware or a simulator.
5. **Verified badge.** The listing copy does not explain what "verified" means.
   Define it before the badge is visible in a store screenshot.

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
