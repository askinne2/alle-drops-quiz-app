import { type QuizAnswers, type QuizQuestion } from "../../lib/quiz/types";
import styles from "../../styles/quiz.module.css";

interface QuizPartRendererProps {
  questions: QuizQuestion[];
  answers: QuizAnswers;
  onAnswerChange: (questionId: string, value: string | string[] | number) => void;
  disabled?: boolean;
}

const FREQUENCY_LABELS = ["Not at all", "Rarely", "Sometimes", "Often", "Very often"] as const;

const BOTHER_LABELS = [
  "Not bothersome",
  "Slightly bothersome",
  "Moderately bothersome",
  "Very bothersome",
  "Extremely bothersome",
] as const;

function getMultiAnswer(answer: string | string[] | number | undefined): string[] {
  if (Array.isArray(answer)) return answer;
  return [];
}

function isExclusiveNoneQuestion(q: QuizQuestion): boolean {
  return ["timing_triggers", "symptoms_nasal", "symptoms_eye", "symptoms_sinus"].includes(q.id);
}

export function QuizPartRenderer({ questions, answers, onAnswerChange, disabled = false }: QuizPartRendererProps) {
  const takingMeds = answers.taking_meds;

  return (
    <div className={styles.questionCategory}>
      {questions.map((question) => {
        if (question.part === 5 && (question.id === "med_list" || question.id === "med_control")) {
          if (takingMeds !== "yes") return null;
        }

        const key = `q-${question.id}`;

        switch (question.type) {
          case "checkbox_multi":
          case "radio_multi": {
            const raw = getMultiAnswer(answers[question.id]);
            const exclusiveNone = isExclusiveNoneQuestion(question);
            const hasNone = exclusiveNone && raw.includes("none");

            return (
              <div key={question.id} className={styles.questionCard}>
                <label className={styles.questionCard__label} id={key}>
                  {question.text}
                </label>
                <div className={styles.questionCard__optionsVertical} role="group" aria-labelledby={key}>
                  {(question.options || []).map((opt) => {
                    const selected = raw.includes(opt.value);
                    const isNone = opt.value === "none";
                    const disableOthers = exclusiveNone && hasNone && !isNone;
                    return (
                      <label
                        key={opt.value}
                        className={`${styles.questionCard__optionVertical} ${selected ? styles.questionCard__optionSelected : ""}`}
                      >
                        <input
                          type="checkbox"
                          checked={selected}
                          disabled={disabled || disableOthers}
                          onChange={() => {
                            let cur = getMultiAnswer(answers[question.id]);
                            if (exclusiveNone && isNone) {
                              onAnswerChange(question.id, selected ? [] : ["none"]);
                              return;
                            }
                            if (exclusiveNone && cur.includes("none")) {
                              cur = cur.filter((v) => v !== "none");
                            }
                            const next = selected ? cur.filter((v) => v !== opt.value) : [...cur, opt.value];
                            onAnswerChange(question.id, next);
                          }}
                        />
                        <span>{opt.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          }

          case "severity_0_3": {
            const val = typeof answers[question.id] === "number" ? (answers[question.id] as number) : undefined;
            const opts = ["None", "Mild", "Moderate", "Severe"];
            return (
              <div key={question.id} className={styles.questionCard}>
                <label className={styles.questionCard__label} id={key}>
                  {question.text}
                </label>
                {question.subtitle && <p className={styles.questionCard__subtitle}>{question.subtitle}</p>}
                <div className={styles.questionCard__options} role="radiogroup" aria-labelledby={key}>
                  {opts.map((label, idx) => (
                    <label
                      key={label}
                      className={`${styles.questionCard__option} ${val === idx ? styles.questionCard__optionSelected : ""}`}
                    >
                      <input
                        type="radio"
                        name={question.id}
                        checked={val === idx}
                        disabled={disabled}
                        onChange={() => onAnswerChange(question.id, idx)}
                        className={styles.questionCard__input}
                      />
                      <span className={styles.questionCard__optionLabel}>{label}</span>
                    </label>
                  ))}
                </div>
              </div>
            );
          }

          case "frequency_0_4": {
            const val = typeof answers[question.id] === "number" ? (answers[question.id] as number) : undefined;
            return (
              <div key={question.id} className={styles.questionCard}>
                <label className={styles.questionCard__label} id={key}>
                  {question.text}
                </label>
                <div className={styles.questionCard__options} role="radiogroup" aria-labelledby={key}>
                  {FREQUENCY_LABELS.map((label, idx) => (
                    <label
                      key={label}
                      className={`${styles.questionCard__option} ${val === idx ? styles.questionCard__optionSelected : ""}`}
                    >
                      <input
                        type="radio"
                        name={question.id}
                        checked={val === idx}
                        disabled={disabled}
                        onChange={() => onAnswerChange(question.id, idx)}
                        className={styles.questionCard__input}
                      />
                      <span className={styles.questionCard__optionLabel}>{label}</span>
                    </label>
                  ))}
                </div>
              </div>
            );
          }

          case "bother_0_4": {
            const val = typeof answers[question.id] === "number" ? (answers[question.id] as number) : undefined;
            return (
              <div key={question.id} className={styles.questionCard}>
                <label className={styles.questionCard__label} id={key}>
                  {question.text}
                </label>
                <div className={styles.questionCard__options} role="radiogroup" aria-labelledby={key}>
                  {BOTHER_LABELS.map((label, idx) => (
                    <label
                      key={label}
                      className={`${styles.questionCard__option} ${val === idx ? styles.questionCard__optionSelected : ""}`}
                    >
                      <input
                        type="radio"
                        name={question.id}
                        checked={val === idx}
                        disabled={disabled}
                        onChange={() => onAnswerChange(question.id, idx)}
                        className={styles.questionCard__input}
                      />
                      <span className={styles.questionCard__optionLabel}>{label}</span>
                    </label>
                  ))}
                </div>
              </div>
            );
          }

          case "yesno": {
            const val = answers[question.id];
            const y = val === "yes";
            const n = val === "no";
            return (
              <div key={question.id} className={styles.questionCard}>
                <label className={styles.questionCard__label} id={key}>
                  {question.text}
                </label>
                <div className={styles.questionCard__optionsVertical} role="radiogroup" aria-labelledby={key}>
                  <label className={`${styles.questionCard__optionVertical} ${y ? styles.questionCard__optionSelected : ""}`}>
                    <input
                      type="radio"
                      name={question.id}
                      checked={y}
                      disabled={disabled}
                      onChange={() => onAnswerChange(question.id, "yes")}
                    />
                    <span>Yes</span>
                  </label>
                  <label className={`${styles.questionCard__optionVertical} ${n ? styles.questionCard__optionSelected : ""}`}>
                    <input
                      type="radio"
                      name={question.id}
                      checked={n}
                      disabled={disabled}
                      onChange={() => onAnswerChange(question.id, "no")}
                    />
                    <span>No</span>
                  </label>
                </div>
              </div>
            );
          }

          case "text_input": {
            const val = typeof answers[question.id] === "string" ? answers[question.id] : "";
            return (
              <div key={question.id} className={styles.questionCard}>
                <label className={styles.questionCard__label} htmlFor={question.id}>
                  {question.text}
                </label>
                {question.subtitle && <p className={styles.questionCard__subtitle}>{question.subtitle}</p>}
                <textarea
                  id={question.id}
                  className={styles.quizContainer__input}
                  rows={4}
                  value={val as string}
                  disabled={disabled}
                  onChange={(ev) => onAnswerChange(question.id, ev.target.value)}
                />
              </div>
            );
          }

          case "control_0_3": {
            const val = typeof answers[question.id] === "string" ? answers[question.id] : "";
            return (
              <div key={question.id} className={styles.questionCard}>
                <label className={styles.questionCard__label} id={key}>
                  {question.text}
                </label>
                {question.subtitle && <p className={styles.questionCard__subtitle}>{question.subtitle}</p>}
                <div className={styles.questionCard__optionsVertical} role="radiogroup" aria-labelledby={key}>
                  {(question.options || []).map((opt) => (
                    <label
                      key={opt.value}
                      className={`${styles.questionCard__optionVertical} ${val === opt.value ? styles.questionCard__optionSelected : ""}`}
                    >
                      <input
                        type="radio"
                        name={question.id}
                        checked={val === opt.value}
                        disabled={disabled}
                        onChange={() => onAnswerChange(question.id, opt.value)}
                      />
                      <span>{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            );
          }

          default:
            return null;
        }
      })}
    </div>
  );
}

/** Whether every question in the part that is shown has a valid answer */
export function isPartComplete(questions: QuizQuestion[], answers: QuizAnswers): boolean {
  const takingMeds = answers.taking_meds;

  for (const question of questions) {
    if (question.part === 5 && (question.id === "med_list" || question.id === "med_control")) {
      if (takingMeds !== "yes") continue;
    }

    const a = answers[question.id];

    switch (question.type) {
      case "checkbox_multi":
      case "radio_multi":
        if (!Array.isArray(a)) return false;
        break;
      case "severity_0_3":
      case "frequency_0_4":
      case "bother_0_4":
        if (typeof a !== "number") return false;
        break;
      case "yesno":
        if (a !== "yes" && a !== "no") return false;
        break;
      case "text_input":
        if (takingMeds === "yes" && question.id === "med_list") {
          if (typeof a !== "string" || !a.trim()) return false;
        }
        break;
      case "control_0_3":
        if (takingMeds === "yes" && question.id === "med_control") {
          if (typeof a !== "string" || !a) return false;
        }
        break;
      default:
        break;
    }
  }
  return true;
}
