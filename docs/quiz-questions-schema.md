# AlleDrops Clinical Quiz Questions Schema

**Version**: 2.0  
**Last Updated**: 2026-04-23

---

## Overview

This document describes the current hardcoded clinical questionnaire used by the app in `app/lib/quiz/questions.ts`.

The live flow is not the retired region-based quiz. It now:

- gates patients to Tennessee or Texas before the questionnaire
- collects patient info before scoring begins
- scores Parts 1-5
- groups outcomes into score brackets:
  - `0-2`
  - `3-6`
  - `7+`
- optionally shows Part 6 medical history for the higher-acuity branch

---

## Flow Before Questions

### State Gate

Before the clinical questionnaire starts, the user must select:

- `tennessee`
- `texas`

Patients outside those states are not eligible to continue.

### Patient Information Step

Before Parts 1-5, the quiz collects:

- full name
- date of birth
- email
- phone

This step is required before the questionnaire begins and is not part of the scored question set.

---

## Scoring Summary

The current quiz no longer uses the old minimal/mild/moderate/severe bands as its live decision model.

### Current score brackets

| Score | Bracket | Current outcome path |
|-------|---------|----------------------|
| `0-2` | `0-2` | Mild / well-controlled guidance plus consultation option |
| `3-6` | `3-6` | Allergist guidance with consultation or purchase continuation |
| `7+` | `7+` | Higher-acuity branch that can continue to testing or medical history / consent |

### Current bracket logic

```ts
if (score <= 2) return "0-2";
if (score <= 6) return "3-6";
return "7+";
```

### Deprecated scoring note

Older documentation referenced a `0-60` total and the legacy bands `minimal`, `mild`, `moderate`, and `severe`. That model is deprecated for the live app and should only be treated as historical context when interpreting legacy customer data or legacy docs.

---

## Question Parts

## Part 1: Symptom Checklist

**Question type**: `checkbox_multi`  
**Scoring**: 1 point per checked value

### `symptoms_nasal`

- Sneezing (especially in episodes)
- Runny nose or nasal drainage
- Nasal congestion or stuffiness
- Itchy nose
- Postnasal drip

### `symptoms_eye`

- Itchy eyes
- Red or bloodshot eyes
- Watery eyes
- Swollen eyelids

### `symptoms_sinus`

- Facial pressure or pain
- Headaches
- Reduced sense of smell

---

## Part 2: Symptom Timing and Triggers

**Question type**: `radio_multi`  
**Scoring**: 1 point per selected value unless excluded

### `timing_season`

Options:

- spring
- summer
- fall
- year_round
- certain_times
- only_rarely

Excluded from score:

- `only_rarely`

### `timing_triggers`

Options:

- pets
- dust
- mold
- grass
- environments
- none

Excluded from score:

- `none`

`timing_triggers` treats `none` as exclusive in the UI.

---

## Part 3: Symptom Severity

**Question type**: `severity_0_3`

Scale:

- `0` = None
- `1` = Mild
- `2` = Moderate
- `3` = Severe

Questions:

- `severity_nasal_congestion`
- `severity_sneezing`
- `severity_runny_nose`
- `severity_nasal_itching`
- `severity_eye_itching`

These severity labels are still used at the individual-question level. They are not the live storefront result bands.

---

## Part 4: Daily Life Impact

### Frequency questions

**Question type**: `frequency_0_4`

Scale:

- `0` = Not at all
- `1` = Rarely
- `2` = Sometimes
- `3` = Often
- `4` = Very often

Questions:

- `impact_sleep`
- `impact_daily`
- `impact_concentrate`
- `impact_social`

### Overall bother question

**Question type**: `bother_0_4`

Scale:

- `0` = Not bothersome
- `1` = Slightly bothersome
- `2` = Moderately bothersome
- `3` = Very bothersome
- `4` = Extremely bothersome

Question:

- `bother_overall`

---

## Part 5: Current Treatment

### `taking_meds`

**Question type**: `yesno`  
**Scoring**: none directly

### `med_list`

**Question type**: `text_input`  
**Scoring**: none  
**Display rule**: shown only when `taking_meds = yes`

### `med_control`

**Question type**: `control_0_3`  
**Display rule**: shown only when `taking_meds = yes`

Options:

- `completely` -> 0
- `well` -> 0
- `somewhat` -> 1
- `poorly` -> 2
- `not_at_all` -> 3

---

## Part 6: Medical History

Part 6 is not part of the main scored questionnaire. It is shown only for the higher-acuity path after results.

### `history_personal`

**Question type**: `checkbox_multi`  
**Scoring**: none for bracket calculation

Options:

- asthma
- eczema
- food_allergies
- positive_allergy_test
- ed_visits

### `history_family`

**Question type**: `checkbox_multi`  
**Scoring**: none for bracket calculation

Options:

- rhinitis
- asthma
- eczema

---

## Scored Question Set

The total score is calculated from Parts 1-5 only:

```ts
ALL_SCORED_QUESTIONS = [
  ...PART1_SYMPTOM_CHECKLIST,
  ...PART2_TIMING_TRIGGERS,
  ...PART3_SEVERITY,
  ...PART4_IMPACT,
  ...PART5_TREATMENT,
];
```

Part 6 is collected separately and only when the flow requires it.

---

## Submission and Stored Values

The submitted payload includes:

- `state`
- `name`
- `dob`
- `email`
- `phone`
- `symptom_profile_id`
- `quiz_score`
- `score_bracket`
- `quiz_date`
- `answers`
- optional `personal_history`
- optional `family_history`

Shopify summary storage uses:

- `symptom_profile_id`
- `quiz_score`
- `state`
- `score_bracket`
- `quiz_date`
- `quiz_history`

Legacy customers may still have:

- `quiz_region`
- `severity_level`

Legacy `quiz_history` entries may still contain `region` or `severity`.

---

## Validation Rules

- `state` must be `tennessee` or `texas`
- DOB must be a valid ISO date and age must be 18+
- email must be valid
- phone must contain at least 10 digits
- `score_bracket` must be one of `0-2`, `3-6`, or `7+`
- `answers` must be an object
- `personal_history` and `family_history` must be arrays when provided

---

## Testing Scenarios

### Bracket test coverage

- Build a submission that lands in `0-2`
- Build a submission that lands in `3-6`
- Build a submission that lands in `7+`

### State coverage

- Run at least one successful path for Tennessee
- Run at least one successful path for Texas
- Confirm out-of-state users stop at the gate

### Legacy data coverage

- Confirm old customers with `severity_level` / `quiz_region` still display sensibly in admin
- Confirm new quiz history entries append using `score_bracket` / `state`
