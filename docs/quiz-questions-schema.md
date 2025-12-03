# AlleDrops Symptom Assessment Questions Schema

**Version**: 1.0  
**Last Updated**: 2024-11-28  
**Total Questions**: 35 across 8 categories

---

## Overview

This document defines all questions in the AlleDrops Symptom Assessment quiz. These questions are hardcoded in `assets/quiz-config.js` but can be overridden using Shopify Metaobjects.

## Scoring Summary

- **Maximum Total Score**: 60 points
- **Nasal Symptoms**: 15 points (5 questions)
- **Eye Symptoms**: 12 points (4 questions)
- **Respiratory Symptoms**: 12 points (4 questions)
- **Skin Symptoms**: 12 points (4 questions)
- **Throat Symptoms**: 9 points (3 questions)
- **Non-Scoring Questions**: Region, timing, contact info (7 questions)

---

## Section 1: Demographics & Location

**Category**: `demographics`  
**Display Order**: 10

### Question 1.1: Geographic Region

**ID**: `region`  
**Type**: `single_choice`  
**Required**: Yes  
**Scoring**: No (used for product matching)

**Question**: "Where do you live most of the year?"  
**Subtitle**: "Our Regional Allergy Drops are formulated to specific areas of the United States."

**Options**:
```json
[
  { "value": "northwest", "label": "Northwest" },
  { "value": "southwest", "label": "Southwest" },
  { "value": "north_central", "label": "North Central" },
  { "value": "south_central", "label": "South Central" },
  { "value": "midwest", "label": "Midwest" },
  { "value": "southeast", "label": "Southeast" },
  { "value": "northeast", "label": "Northeast" }
]
```

**Regional Product Mapping**:
- `northwest` → Product handle: `northwest-allergy-drops`
- `southwest` → Product handle: `southwest-allergy-drops`
- `north_central` → Product handle: `north-central-allergy-drops`
- `south_central` → Product handle: `south-central-allergy-drops`
- `midwest` → Product handle: `midwest-allergy-drops`
- `southeast` → Product handle: `southeast-allergy-drops`
- `northeast` → Product handle: `northeast-allergy-drops`

---

## Section 2: Nasal Symptoms

**Category**: `nasal`  
**Display Order**: 20-24  
**Section Title**: "Nasal Symptoms"  
**Section Description**: "How would you rate the following nasal symptoms?"

All questions in this section use `type: severity_scale` with values:
- 0 = None
- 1 = Mild
- 2 = Moderate
- 3 = Severe

### Question 2.1: Runny Nose
- **ID**: `nasal_runny`
- **Order**: 20
- **Text**: "Runny Nose"
- **Points**: 0-3

### Question 2.2: Stuffy/Congested Nose
- **ID**: `nasal_stuffy`
- **Order**: 21
- **Text**: "Stuffy/Congested Nose"
- **Points**: 0-3

### Question 2.3: Sneezing
- **ID**: `nasal_sneezing`
- **Order**: 22
- **Text**: "Sneezing"
- **Points**: 0-3

### Question 2.4: Postnasal Drip
- **ID**: `nasal_postnasal`
- **Order**: 23
- **Text**: "Postnasal Drip"
- **Points**: 0-3

### Question 2.5: Loss of Smell
- **ID**: `nasal_smell_loss`
- **Order**: 24
- **Text**: "Loss of Smell"
- **Points**: 0-3

**Maximum Category Score**: 15 points

---

## Section 3: Eye Symptoms

**Category**: `eye`  
**Display Order**: 30-33  
**Section Title**: "Eye Symptoms"  
**Section Description**: "How would you rate the following eye symptoms?"

### Question 3.1: Watery Eyes
- **ID**: `eye_watery`
- **Order**: 30
- **Text**: "Watery Eyes"
- **Type**: `severity_scale`
- **Points**: 0-3

### Question 3.2: Itchy Eyes
- **ID**: `eye_itchy`
- **Order**: 31
- **Text**: "Itchy Eyes"
- **Type**: `severity_scale`
- **Points**: 0-3

### Question 3.3: Red/Bloodshot Eyes
- **ID**: `eye_red`
- **Order**: 32
- **Text**: "Red/Bloodshot Eyes"
- **Type**: `severity_scale`
- **Points**: 0-3

### Question 3.4: Swollen Eyelids
- **ID**: `eye_swollen`
- **Order**: 33
- **Text**: "Swollen Eyelids"
- **Type**: `severity_scale`
- **Points**: 0-3

**Maximum Category Score**: 12 points

---

## Section 4: Respiratory Symptoms

**Category**: `respiratory`  
**Display Order**: 40-43  
**Section Title**: "Respiratory Symptoms"  
**Section Description**: "How would you rate the following respiratory symptoms?"

### Question 4.1: Cough
- **ID**: `respiratory_cough`
- **Order**: 40
- **Text**: "Cough"
- **Type**: `severity_scale`
- **Points**: 0-3

### Question 4.2: Wheezing
- **ID**: `respiratory_wheeze`
- **Order**: 41
- **Text**: "Wheezing"
- **Type**: `severity_scale`
- **Points**: 0-3

### Question 4.3: Chest Tightness
- **ID**: `respiratory_tight`
- **Order**: 42
- **Text**: "Chest Tightness"
- **Type**: `severity_scale`
- **Points**: 0-3

### Question 4.4: Shortness of Breath
- **ID**: `respiratory_breath`
- **Order**: 43
- **Text**: "Shortness of Breath"
- **Type**: `severity_scale`
- **Points**: 0-3

**Maximum Category Score**: 12 points

---

## Section 5: Skin Symptoms

**Category**: `skin`  
**Display Order**: 50-53  
**Section Title**: "Skin Symptoms"  
**Section Description**: "How would you rate the following skin symptoms?"

### Question 5.1: Rash
- **ID**: `skin_rash`
- **Order**: 50
- **Text**: "Rash"
- **Type**: `severity_scale`
- **Points**: 0-3

### Question 5.2: Hives
- **ID**: `skin_hives`
- **Order**: 51
- **Text**: "Hives"
- **Type**: `severity_scale`
- **Points**: 0-3

### Question 5.3: Itching
- **ID**: `skin_itching`
- **Order**: 52
- **Text**: "Itching"
- **Type**: `severity_scale`
- **Points**: 0-3

### Question 5.4: Eczema/Dry Patches
- **ID**: `skin_eczema`
- **Order**: 53
- **Text**: "Eczema/Dry Patches"
- **Type**: `severity_scale`
- **Points**: 0-3

**Maximum Category Score**: 12 points

---

## Section 6: Throat & Mouth Symptoms

**Category**: `throat`  
**Display Order**: 60-62  
**Section Title**: "Throat & Mouth Symptoms"  
**Section Description**: "How would you rate the following throat and mouth symptoms?"

### Question 6.1: Itchy Throat
- **ID**: `throat_itchy`
- **Order**: 60
- **Text**: "Itchy Throat"
- **Type**: `severity_scale`
- **Points**: 0-3

### Question 6.2: Sore Throat
- **ID**: `throat_sore`
- **Order**: 61
- **Text**: "Sore Throat"
- **Type**: `severity_scale`
- **Points**: 0-3

### Question 6.3: Itchy Mouth or Tongue
- **ID**: `throat_mouth_itchy`
- **Order**: 62
- **Text**: "Itchy Mouth or Tongue"
- **Type**: `severity_scale`
- **Points**: 0-3

**Maximum Category Score**: 9 points

---

## Section 7: Timing & Pattern

**Category**: `demographics`  
**Display Order**: 70-71

### Question 7.1: Seasonal Timing

**ID**: `timing_seasonal`  
**Type**: `single_choice`  
**Required**: Yes  
**Scoring**: No (informational only)

**Question**: "When do your allergy symptoms usually flare up?"  
**Subtitle**: "This helps us understand your allergy pattern."

**Options**:
```json
[
  { "value": "spring", "label": "Primarily Spring (March-May)" },
  { "value": "summer", "label": "Primarily Summer (June-August)" },
  { "value": "fall", "label": "Primarily Fall (September-November)" },
  { "value": "winter", "label": "Primarily Winter (December-February)" },
  { "value": "year_round", "label": "Year-Round" },
  { "value": "multiple_seasons", "label": "Multiple Seasons" }
]
```

### Question 7.2: Duration

**ID**: `timing_duration`  
**Type**: `single_choice`  
**Required**: Yes  
**Scoring**: No (informational only)

**Question**: "How long have you been experiencing allergy symptoms?"

**Options**:
```json
[
  { "value": "less_than_1yr", "label": "Less than 1 year" },
  { "value": "1_3yrs", "label": "1-3 years" },
  { "value": "3_5yrs", "label": "3-5 years" },
  { "value": "5_10yrs", "label": "5-10 years" },
  { "value": "over_10yrs", "label": "More than 10 years" }
]
```

---

## Section 8: Contact Information

**Category**: `contact`  
**Display Order**: 80-82  
**Section Title**: "Contact Information"  
**Section Description**: "We need your information to provide personalized recommendations"

### Question 8.1: Full Name

**ID**: `customer_name`  
**Type**: `text_input`  
**Required**: Yes  
**Scoring**: No

**Question**: "Your Full Name"  
**Placeholder**: "John Smith"

### Question 8.2: Email Address

**ID**: `customer_email`  
**Type**: `email_input`  
**Required**: Yes  
**Scoring**: No

**Question**: "Your Email Address"  
**Placeholder**: "john.smith@example.com"  
**Validation**: Must be valid email format (`/^[^\s@]+@[^\s@]+\.[^\s@]+$/`)

### Question 8.3: Consent

**ID**: `consent`  
**Type**: `checkbox`  
**Required**: Yes  
**Scoring**: No

**Question**: "I consent to AlleDrops storing my symptom information for product recommendation purposes. I understand this assessment does not constitute medical advice and does not replace consultation with a healthcare provider."

---

## Scoring Algorithm

### Total Score Calculation

```javascript
totalScore = sum of all severity_scale question values

// Example calculation:
nasal_score = nasal_runny + nasal_stuffy + nasal_sneezing + nasal_postnasal + nasal_smell_loss
eye_score = eye_watery + eye_itchy + eye_red + eye_swollen
respiratory_score = respiratory_cough + respiratory_wheeze + respiratory_tight + respiratory_breath
skin_score = skin_rash + skin_hives + skin_itching + skin_eczema
throat_score = throat_itchy + throat_sore + throat_mouth_itchy

totalScore = nasal_score + eye_score + respiratory_score + skin_score + throat_score
```

### Score Interpretation

| Score Range | Severity Level | Action | CTA |
|-------------|----------------|--------|-----|
| 0-4 | Minimal | Educational content | "Learn More About Allergies" |
| 5-9 | Mild | Consultation recommended | "Book Free Consultation" |
| 10-19 | Moderate | Product recommendation | Show regional product + "Add to Cart" |
| 20-60 | Severe | Strong product recommendation | Show regional product + "Add to Cart" |

### Product Matching Logic

```javascript
if (score >= 10 && region) {
  // Show regional product
  const productHandle = `${region.replace('_', '-')}-allergy-drops`;
  // Example: "southeast-allergy-drops"
  showProduct(productHandle);
} else if (score >= 5 && score < 10) {
  // Show consultation CTA
  showConsultationCTA();
} else {
  // Show educational content
  showEducationalCTA();
}
```

---

## Question Update Instructions

### Adding a New Symptom Question

1. Decide on the category (nasal, eye, respiratory, skin, throat)
2. Choose an order number (use increments of 10 for flexibility)
3. Create the question in Metaobjects or add to `HARDCODED_QUESTIONS` array
4. Update scoring calculations if needed
5. Update Google Sheet with new column (if needed)

**Example**: Adding "Nasal Bleeding"

```javascript
{
  id: 'nasal_bleeding',
  type: 'severity_scale',
  text: 'Nasal Bleeding',
  category: 'nasal',
  order: 25, // After loss of smell (24)
  required: true
}
```

Then add column to Google Sheet:
- Column name: "Nasal - Bleeding"
- Format: Number (0-3)
- Update `google-apps-script/Code.gs` HEADERS array to include new column

### Modifying Scoring Thresholds

Edit `assets/symptom-quiz.js`:

```javascript
const SCORE_THRESHOLDS = {
  minimal: { min: 0, max: 4 },
  mild: { min: 5, max: 9 },
  moderate: { min: 10, max: 19 },
  severe: { min: 20, max: 60 }
};
```

### Removing a Question

1. If using Metaobjects: Delete the metaobject entry
2. If using hardcoded: Remove from `HARDCODED_QUESTIONS` array
3. Update Google Sheet column (optional - can keep for historical data)
4. Update maximum score calculations

---

## Data Privacy Notes

### What is Stored Where

**Google Sheets** (Detailed Data):
- All individual symptom severity ratings (0-3)
- Full name and email
- Timing and duration information
- Complete response JSON backup
- Submission timestamp

**Shopify Customer Metafields** (Summary Only):
- Symptom Profile ID (reference to Google Sheets row)
- Total score (number)
- Region (text)
- Quiz date
- Severity level (minimal/mild/moderate/severe)

### Privacy Benefits

- Shopify doesn't contain detailed health information
- Customer service can reference Profile ID for details
- Meets HIPAA-adjacent privacy requirements
- Easy to export or delete from Google Sheets (File → Download)

---

## Question Translation (Future Enhancement)

This schema can be extended for multi-language support:

```javascript
{
  id: 'nasal_runny',
  type: 'severity_scale',
  text: {
    en: 'Runny Nose',
    es: 'Nariz que moquea',
    fr: 'Nez qui coule'
  },
  category: 'nasal',
  order: 20,
  required: true
}
```

Currently not implemented, but structure allows for future expansion.

---

## Validation Rules

### Email Validation
```javascript
/^[^\s@]+@[^\s@]+\.[^\s@]+$/
```

### Required Fields
All questions with `required: true` must be answered before proceeding.

### Score Validation
Severity scale values must be 0, 1, 2, or 3. Any other value is rejected.

### Honeypot Validation
The hidden `quiz_website` field must remain empty. If filled, submission is silently rejected (bot detection).

---

## Testing Scenarios

### Test Case 1: Minimal Score (0-4)
- Set all severity_scale questions to 0
- Expected: Educational content CTA
- Expected severity: "Minimal"

### Test Case 2: Mild Score (5-9)
- Set 2-3 symptoms to "Mild" (1)
- Expected: Consultation CTA
- Expected severity: "Mild"

### Test Case 3: Moderate Score (10-19)
- Set 4-6 symptoms to "Moderate" (2)
- Expected: Product recommendation for selected region
- Expected severity: "Moderate"

### Test Case 4: Severe Score (20+)
- Set 7+ symptoms to "Severe" (3) or many to "Moderate" (2)
- Expected: Product recommendation with strong messaging
- Expected severity: "Severe"

### Test Case 5: All Regions
- Complete quiz for each region
- Verify correct product is recommended
- Check product handles match pattern

---

**Version**: 1.0.0  
**Last Updated**: 2024-11-28  
**Questions**: 35 total (28 scoring, 7 non-scoring)

