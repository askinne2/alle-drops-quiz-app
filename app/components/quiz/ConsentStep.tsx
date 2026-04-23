import styles from "../../styles/quiz.module.css";

interface ConsentStepProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}

export function ConsentStep({ checked, onCheckedChange, disabled = false }: ConsentStepProps) {
  return (
    <div className={styles.quizContainer__contact}>
      <h2 className={styles.questionCategory__title}>Informed consent</h2>
      <p className={styles.quizContainer__subtitle}>
        Please read the following sections and confirm before you submit.
      </p>

      {/* TODO: Replace with final William-approved consent language */}
      <div
        className={styles.quizContainer__input}
        style={{
          maxHeight: "360px",
          overflowY: "auto",
          padding: "1rem",
          marginBottom: "1rem",
          fontSize: "0.9rem",
          lineHeight: 1.5,
        }}
      >
        <section style={{ marginBottom: "1.25rem" }}>
          <h3 style={{ fontSize: "1rem", marginBottom: "0.5rem" }}>1. Telehealth Services</h3>
          <p>
            AOD is a technology-enabled care coordination service, not a medical practice. Telehealth differs from
            in-person care. No physical exam techniques. Medical emergencies: call 911.
          </p>
        </section>
        <section style={{ marginBottom: "1.25rem" }}>
          <h3 style={{ fontSize: "1rem", marginBottom: "0.5rem" }}>2. Sublingual Immunotherapy (SLIT)</h3>
          <p>
            SLIT involves placing allergen extracts under the tongue. Custom multi-allergen SLIT drops are not
            FDA-approved finished drug products — compounded under physician prescription as off-label use of
            FDA-approved extracts. Treatment typically 3-5 years. Results vary. May be less effective than SCIT for
            some patients.
          </p>
        </section>
        <section style={{ marginBottom: "1.25rem" }}>
          <h3 style={{ fontSize: "1rem", marginBottom: "0.5rem" }}>3. Risks &amp; Adverse Reactions</h3>
          <p>
            Local (oral itching, mouth swelling, nausea, GI discomfort), Systemic (sneezing, hives, asthma symptoms,
            throat tightness), Severe (ANAPHYLAXIS — rare but possible). Patient advised to: wait monitoring period
            after first dose, discuss EpiPen with provider, not administer drops during active asthma/fever/illness,
            seek emergency care for anaphylaxis signs.
          </p>
        </section>
        <section style={{ marginBottom: "1.25rem" }}>
          <h3 style={{ fontSize: "1rem", marginBottom: "0.5rem" }}>4. Laboratory Testing Authorization</h3>
          <p>
            Provider may recommend IgE testing via Labcorp or Quest. Billed separately by lab. Insurance may not
            cover. [PENDING — Treatment policy page language]
          </p>
        </section>
        <section style={{ marginBottom: "1.25rem" }}>
          <h3 style={{ fontSize: "1rem", marginBottom: "0.5rem" }}>5. No Guarantee of Results</h3>
          <p>
            No guarantee of specific outcomes. Efficacy varies. Clinical improvement typically begins 3-6 months of
            daily use.
          </p>
        </section>
        <section style={{ marginBottom: "1.25rem" }}>
          <h3 style={{ fontSize: "1rem", marginBottom: "0.5rem" }}>6. Patient Responsibilities &amp; Contraindications</h3>
          <p>
            Patient affirms: 18+, no severe/poorly controlled asthma, no prior severe anaphylaxis to immunotherapy
            (unless disclosed), not pregnant/breastfeeding (unless disclosed), will disclose all medications, will
            follow dosing exactly, will report adverse reactions.
          </p>
        </section>
        <section style={{ marginBottom: "1.25rem" }}>
          <h3 style={{ fontSize: "1rem", marginBottom: "0.5rem" }}>7. Assumption of Risk &amp; Release of Liability</h3>
          <p>
            Patient voluntarily assumes all risks. Release of liability for AOD and affiliated providers. Does not
            apply to gross negligence, willful misconduct, or fraud.
          </p>
        </section>
        <section>
          <h3 style={{ fontSize: "1rem", marginBottom: "0.5rem" }}>8. Provider Independence</h3>
          <p>
            Providers are independent, licensed professionals. AOD does not direct clinical decisions.
          </p>
        </section>
      </div>

      <div className={styles.quizContainer__consent}>
        <label className={styles.quizContainer__consentLabel}>
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => onCheckedChange(e.target.checked)}
            disabled={disabled}
          />
          <span>I have read and understand the information above.</span>
        </label>
      </div>
    </div>
  );
}
