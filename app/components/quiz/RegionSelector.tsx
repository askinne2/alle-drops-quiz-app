/**
 * Region Selector Component
 * Allows user to select their US region
 * Matches regions from quiz-questions-schema.md
 */

import styles from "../../styles/quiz.module.css";

const US_REGIONS = [
  { value: "northwest", label: "Northwest" },
  { value: "southwest", label: "Southwest" },
  { value: "north_central", label: "North Central" },
  { value: "south_central", label: "South Central" },
  { value: "midwest", label: "Midwest" },
  { value: "southeast", label: "Southeast" },
  { value: "northeast", label: "Northeast" },
] as const;

export type USRegion = typeof US_REGIONS[number]["value"];

interface RegionSelectorProps {
  value: USRegion | "";
  onChange: (region: USRegion) => void;
  disabled?: boolean;
  required?: boolean;
}

export function RegionSelector({
  value,
  onChange,
  disabled = false,
  required = true,
}: RegionSelectorProps) {
  return (
    <div className={styles.questionCard__optionsVertical}>
      {US_REGIONS.map((region) => (
        <label
          key={region.value}
          className={`${styles.questionCard__optionVertical} ${
            value === region.value ? styles.questionCard__optionSelected : ""
          }`}
        >
          <input
            type="radio"
            name="quiz_region"
            value={region.value}
            checked={value === region.value}
            onChange={(e) => onChange(e.target.value as USRegion)}
            disabled={disabled}
            required={required}
          />
          <span>{region.label}</span>
        </label>
      ))}
    </div>
  );
}
