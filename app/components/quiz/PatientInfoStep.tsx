import { useMemo } from "react";
import styles from "../../styles/quiz.module.css";
import { isValidEmail } from "../../lib/quiz-validation";

export interface PatientInfoValues {
  name: string;
  dob: string;
  email: string;
  phone: string;
}

interface PatientInfoStepProps {
  values: PatientInfoValues;
  onChange: (field: keyof PatientInfoValues, value: string) => void;
  showErrors?: boolean;
  disabled?: boolean;
}

function digitsOnly(s: string): string {
  return s.replace(/\D/g, "");
}

function ageFromDob(isoDob: string, ref: Date = new Date()): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDob)) return null;
  const [y, m, day] = isoDob.split("-").map(Number);
  const birth = new Date(y, m - 1, day);
  if (Number.isNaN(birth.getTime())) return null;
  let age = ref.getFullYear() - birth.getFullYear();
  const md = ref.getMonth() - birth.getMonth();
  if (md < 0 || (md === 0 && ref.getDate() < birth.getDate())) age--;
  return age;
}

export function PatientInfoStep({ values, onChange, showErrors = false, disabled = false }: PatientInfoStepProps) {
  const errors = useMemo(() => {
    const e: Partial<Record<keyof PatientInfoValues, string>> = {};
    if (!values.name.trim()) e.name = "Full name is required";
    if (!values.dob) e.dob = "Date of birth is required";
    else if (ageFromDob(values.dob) === null) e.dob = "Enter a valid date";
    else if ((ageFromDob(values.dob) ?? 0) < 18) e.dob = "You must be 18 or older";
    if (!values.email.trim()) e.email = "Email is required";
    else if (!isValidEmail(values.email)) e.email = "Enter a valid email address";
    if (digitsOnly(values.phone).length < 10) e.phone = "Enter a phone number with at least 10 digits";
    return e;
  }, [values]);

  return (
    <div className={styles.quizContainer__contact}>
      <h2 className={styles.questionCategory__title}>Patient information</h2>
      <p className={styles.quizContainer__subtitle}>All fields are required to continue.</p>

      <div className={styles.quizContainer__field}>
        <label htmlFor="pi-name">
          Full name <span className={styles.required}>*</span>
        </label>
        <input
          id="pi-name"
          type="text"
          value={values.name}
          onChange={(ev) => onChange("name", ev.target.value)}
          disabled={disabled}
          className={styles.quizContainer__input}
          autoComplete="name"
        />
        {showErrors && errors.name && (
          <p style={{ color: "var(--quiz-color-error, #c62828)", fontSize: "0.875rem", marginTop: "0.25rem" }}>{errors.name}</p>
        )}
      </div>

      <div className={styles.quizContainer__field}>
        <label htmlFor="pi-dob">
          Date of birth <span className={styles.required}>*</span>
        </label>
        <input
          id="pi-dob"
          type="date"
          value={values.dob}
          onChange={(ev) => onChange("dob", ev.target.value)}
          disabled={disabled}
          className={styles.quizContainer__input}
        />
        <p className={styles.questionCard__subtitle} style={{ marginTop: "0.5rem" }}>
          Your date of birth is used for medical eligibility verification and is stored securely. It will not be
          shared with third parties or stored in your shopping account.
        </p>
        {showErrors && errors.dob && (
          <p style={{ color: "var(--quiz-color-error, #c62828)", fontSize: "0.875rem", marginTop: "0.25rem" }}>{errors.dob}</p>
        )}
      </div>

      <div className={styles.quizContainer__field}>
        <label htmlFor="pi-email">
          Email <span className={styles.required}>*</span>
        </label>
        <input
          id="pi-email"
          type="email"
          value={values.email}
          onChange={(ev) => onChange("email", ev.target.value)}
          disabled={disabled}
          className={styles.quizContainer__input}
          autoComplete="email"
        />
        {showErrors && errors.email && (
          <p style={{ color: "var(--quiz-color-error, #c62828)", fontSize: "0.875rem", marginTop: "0.25rem" }}>{errors.email}</p>
        )}
      </div>

      <div className={styles.quizContainer__field}>
        <label htmlFor="pi-phone">
          Phone number <span className={styles.required}>*</span>
        </label>
        <input
          id="pi-phone"
          type="tel"
          value={values.phone}
          onChange={(ev) => onChange("phone", ev.target.value)}
          disabled={disabled}
          className={styles.quizContainer__input}
          autoComplete="tel"
        />
        {showErrors && errors.phone && (
          <p style={{ color: "var(--quiz-color-error, #c62828)", fontSize: "0.875rem", marginTop: "0.25rem" }}>{errors.phone}</p>
        )}
      </div>
    </div>
  );
}

export function validatePatientInfoStep(values: PatientInfoValues): boolean {
  if (!values.name.trim()) return false;
  if (!values.dob || ageFromDob(values.dob) === null || (ageFromDob(values.dob) ?? 0) < 18) return false;
  if (!isValidEmail(values.email)) return false;
  if (digitsOnly(values.phone).length < 10) return false;
  return true;
}
