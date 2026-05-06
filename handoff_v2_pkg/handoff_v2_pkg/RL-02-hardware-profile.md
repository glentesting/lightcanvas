# RL-02 — Hardware Profile System

Ask users what sequencing software they use during onboarding. Store that answer as a "hardware profile" on their account. Use it to drive: which export format appears first, what post-export instructions they see, and which controller validation rules apply.

## Why this matters

LightCanvas exports to xLights (.xsq) and Light-O-Rama (.lms). These are completely different workflows post-export. An xLights user needs different instructions than a LOR user. Rather than showing everyone the same generic guidance, we detect what they use and speak their language automatically.

This is not three separate apps — it's one product with intelligent defaults.

## Onboarding question

Add a step to the existing onboarding wizard (before it completes):

**"What sequencing software do you use?"**

Options:
- xLights *(most common — largest community)*
- Light-O-Rama (LOR)
- Vixen Lights
- I'm new / not sure *(defaults to xLights guidance)*

This is the first question in the wizard flow. One screen, four big tap-friendly buttons. Skip button available ("I'll set this up later").

## Data model

Add a `hardware_profile` JSONB column to the `users` table (or a separate `user_profiles` table if cleaner):

```sql
-- Add to users table or user_profiles
hardware_profile jsonb default '{}'::jsonb

-- Shape:
{
  "sequencer": "xlights" | "lor" | "vixen" | "other" | null,
  "controller_type": "falcon_f16v3" | "alphapix" | "wled" | "lor1602" | "pixcon16" | null,
  "setup_completed": boolean,
  "updated_at": timestamp
}
```

RLS: user can read and update their own profile only.

## Controller type (optional, secondary question)

After the sequencer question, optionally ask: **"What controller do you use?"** (skip is fine).

Options: Falcon F16v3 · AlphaPix 16 · WLED (ESP32) · LOR Controller · Other / Not sure

This enables precise channel limit validation. If they skip, use conservative defaults.

## What the profile drives

### 1. Export dialog defaults
- xLights profile → XSQ shown first, checked by default
- LOR profile → .lms shown first, checked by default
- All formats always available — profile sets the default selection only

### 2. Post-export guidance content
- xLights profile → xLights + FPP step-by-step
- LOR profile → LOR-specific steps
- "Not sure" → simplified wizard with screenshots

### 3. Channel/universe validation
- Falcon F16v3: warn if any port exceeds ~1,700 pixels (5,100 channels)
- AlphaPix 16: warn if any port exceeds 680 pixels
- LOR1602: warn if any unit exceeds 16 circuits
- PixCon16: warn if any port exceeds 170 pixels
- Unknown: warn at 512 channels per universe (safe default)

### 4. Terminology (light touch)
- xLights users see "models" mentioned in guidance text
- LOR users see "channels" and "units" mentioned in guidance text
- The editor itself uses LightCanvas terms (fixtures, tracks) throughout — profile only affects export guidance language

## Settings page

Add a "Hardware" section to `/settings` where users can change their profile at any time. Show the current selection. Provide the same four sequencer options + controller type dropdown.

## Acceptance

- New user completing onboarding is asked the sequencer question
- Answer is saved to `hardware_profile` in the DB
- Export dialog pre-selects the right format based on profile
- User with xLights profile sees xLights guidance after export
- User with LOR profile sees LOR guidance after export
- User with no profile sees xLights guidance (safe default)
- Profile can be changed in settings
- Skipping the onboarding question works — defaults apply silently
