# RL-07 — Legal Pages + Audio Rights

Build the legal pages and add the audio rights acknowledgment. Required before any public launch. All copy is placeholder — flagged clearly for legal review.

## Pages to create

All live under `/legal/*` as server-rendered pages. Link from the footer.

### `/legal/terms`
Terms of Service. Sections:
- Acceptance of Terms
- Description of Service
- User Accounts
- User Content (what you own, what you grant us)
- Prohibited Uses
- Intellectual Property
- Disclaimer of Warranties
- Limitation of Liability
- Termination
- Governing Law
- Changes to Terms
- Contact

Every section has placeholder content clearly marked `[PLACEHOLDER — AWAITING LEGAL REVIEW]`.

### `/legal/privacy`
Privacy Policy. Sections:
- What We Collect (account data, uploaded audio, usage data)
- How We Use It
- Third-Party Services (Clerk, Supabase, Vercel, PostHog when added)
- Data Retention
- Your Rights (access, deletion, portability)
- Cookies
- Children's Privacy (13+ only)
- Changes to This Policy
- Contact

Placeholder content clearly marked for legal review.

### `/legal/copyright`
Copyright / DMCA Notice. Sections:
- Our Respect for IP
- DMCA Takedown Process (who to contact, what to include)
- Counter-Notice Process
- Repeat Infringer Policy
- Audio Rights (what users are responsible for)

### `/legal/cookies`
Cookie Policy — brief. What cookies we use, why, how to opt out.

## Audio rights acknowledgment

Add a checkbox to the audio upload flow (the upload dialog in the editor):

**Before the upload button becomes active:**

> ☐ I confirm I have the right to use this audio file in my light show (personal use, licensed, or original).

The button is disabled until the checkbox is checked. This is stored in the upload metadata — not in the DB separately.

The checkbox has a small help link: "What does this mean? →" which opens a tooltip or small modal explaining:
- "You own the music (you made it)"
- "You have a license to use it (Spotify, Apple Music do NOT count — you need a direct license)"
- "It's royalty-free / Creative Commons"
- "It's for personal home use only and you won't be distributing the show commercially"

## Footer links

Update the footer to include:
- Terms of Service → `/legal/terms`
- Privacy Policy → `/legal/privacy`
- Copyright → `/legal/copyright`

## Nav / auth flows

Add small "By continuing you agree to our Terms of Service and Privacy Policy" text to the sign-up page. Links to the relevant pages.

## Acceptance

- All four `/legal/*` pages render without errors
- Footer links to Terms, Privacy, Copyright
- Audio upload checkbox is required before upload proceeds
- Checkbox text is accurate and the help tooltip is present
- Sign-up page has ToS/Privacy acknowledgment
- All placeholder content is clearly marked for legal review
- Pages are readable on mobile
