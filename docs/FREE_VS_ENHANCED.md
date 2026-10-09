# Free listing vs. Enhanced Church Profile ($29/month)

The price is unchanged at $29/month. Placement is defined once in `lib/plans.ts`
(`ENHANCED_ONLY`) and enforced the same way on web pages, the `/api/v1` API used
by the mobile app, directory filters, and the events calendar. Entitlement comes
only from server-side state: an active/trialing/past-due Stripe subscription
(written by verified webhooks) or an administrator’s complimentary grant.

| Feature | Free | Enhanced | Why |
| --- | :-: | :-: | --- |
| Name, address, directions link, phone, email | ✓ | ✓ | Visitors need these to decide and to arrive. |
| **Website link** | ✓ | ✓ | **Changed:** the previous paywall hid the website on free listings. The website is how visitors verify a church; hiding it made free listings less useful and less trustworthy. |
| Service times, lead pastor, denomination | ✓ | ✓ | Core discovery information. |
| Plan your first visit (parking, accessibility, children, dress, languages) | ✓ | ✓ | Directly serves visitors and drives Find-a-Service filters; charging would leave gaps that make the directory worse for everyone. |
| Community resources (pantries, meals, support groups) | ✓ | ✓ | Public good; moderated before publishing. |
| Find-a-Service inclusion, QR code, share link, report outdated info | ✓ | ✓ | Participation tools that improve data quality. |
| Total profile views (30 days) | ✓ | ✓ | Gives every church a reason to claim and maintain its listing. |
| Livestream button | | ✓ | Kept paid as previously decided. **Owner decision to revisit:** homebound visitors benefit; removing `livestream` from `ENHANCED_ONLY` makes it free everywhere. |
| Apple App Store / Google Play / other app buttons | | ✓ | Promotion of the church’s own channels. |
| Social media links | | ✓ | Promotion. |
| Ministries list and full leadership team | | ✓ | Promotion; the lead pastor stays free. |
| Embedded map | | ✓ | Free listings still have a Directions link. |
| Events on the profile and county calendar (with ICS) | | ✓ | Ongoing engagement tool with clear value. |
| 90-day activity breakdown (directions, website, phone, livestream, share…) | | ✓ | Insight for church staff. |

Data entered for paid features while a church is on the free plan is saved and
appears immediately if the church upgrades. When a subscription ends, the data
is kept but hidden; events leave the public calendar.

## Existing manual premium profiles

Before billing existed, `Church.premiumProfile = true` was set by hand (only
Sheriff Temple, in the local preview data, and it was never imported). The
production migration converts any such database flag into a **complimentary
enhanced profile with no end date** and an audit entry. Administrators see and
can end complimentary grants on Admin → Churches → (church). The importer never
grants enhanced status.
