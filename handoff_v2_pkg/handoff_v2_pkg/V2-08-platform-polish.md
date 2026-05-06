# V2-08 — Platform Polish

Telemetry, accessibility, settings, billing placeholder, mobile handling, and public share links.

## Telemetry

### Sentry (error monitoring)
Install `@sentry/nextjs`. Configure for both client and server. Captures:
- Unhandled exceptions
- Slow page loads (performance monitoring)
- API errors

Do not log: user audio files, project content, email addresses.

### PostHog (product analytics)
Install `posthog-js`. Consent-gated (see cookie banner below).

Events to track:
- `signup_completed`
- `onboarding_completed`
- `first_audio_uploaded`
- `first_effect_added`
- `first_export` (with format: xsq / lms / json)
- `ai_generate_triggered`
- `ai_generate_completed`
- `show_created`

### Cookie banner
Simple banner on first visit. Three actions: Accept All / Reject All / Customize.
- Accept All: enables PostHog
- Reject All: Sentry only (legitimate interest, no consent required for error monitoring)
- Customize: toggle PostHog on/off

Preference stored in localStorage.

## Accessibility

- Focus-visible rings on all interactive elements (use Tailwind `focus-visible:ring-2`)
- Skip-to-content link at top of every page
- `aria-label` on all icon-only buttons
- `aria-live` region for autosave status indicator
- Timeline: `role="region"`, `aria-label="Sequence editor"`. Playhead: `aria-label="Playhead at [time]"`
- `prefers-reduced-motion`: disable all CSS transitions + JS animations. Hero animation falls back to static lit house.
- Color contrast: all text at WCAG AA minimum (4.5:1 for normal, 3:1 for large)

## Settings page

Route: `/settings` with nested routes.

### Account (`/settings/account`)
- Display name, avatar
- Email (read-only, change via Clerk)
- Active sessions list with revoke
- Download my data (exports ZIP of all user data)
- Delete account (14-day grace period)

### Hardware (`/settings/hardware`)
- Hardware profile (sequencer + controller type — same as onboarding, editable)
- Connected Bridge devices (if Bridge is built)

### Billing (`/settings/billing`)
- Current plan display
- "Upgrade" CTAs (link to pricing page for now — no Stripe)
- Usage: credits used this month / total

## Billing placeholder

No Stripe integration yet. The billing settings page shows:
- Current plan name and features
- "Upgrade to [next tier]" button → routes to `/pricing` page
- Clear label: "Billing powered by Stripe — coming soon"

## Mobile handling

The editor is desktop-only. On screens under 768px:
- Show a full-screen "LightCanvas works best on desktop" screen
- Show a link: "View preview on this device →" (read-only preview, no editing)
- Show remote PWA link if user has an active show running via Bridge

### Read-only preview (mobile)
Route: `/project/[id]/preview` — mobile-friendly
- House animation playing (simplified, no controls)
- Play/pause button
- "Open on desktop to edit"

## Public share link

Route: `/p/[shareToken]` — public, no auth required.

Share button in the top bar of the editor. Generates a unique share token (stored in projects table). Anyone with the link can:
- See the project name and fixture list
- Watch the preview animation
- See the effect blocks on the timeline (read-only)
- Cannot edit, cannot export

"Copy share link" copies the URL. "Disable sharing" revokes the token.

## Acceptance

- Sentry captures a test error and it appears in the Sentry dashboard
- PostHog fires `first_export` event on first export
- Cookie banner works — PostHog is blocked until accepted
- All buttons have visible focus rings in keyboard navigation
- Skip-to-content link works
- `prefers-reduced-motion` turns off all animations
- Settings page renders all three sections
- Mobile shows desktop redirect at <768px
- Share link renders read-only preview for an unauthenticated user
- Share can be disabled
