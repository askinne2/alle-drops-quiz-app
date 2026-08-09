import { type QuizAnswers, type QuizInfoBlock, type QuizItem } from "../../lib/quiz/types";
import {
  isAnswered,
  isQuestion,
  selectedValues,
  toggleOption,
  visibleItems,
} from "../../lib/quiz/schema";
import styles from "../../styles/quiz.module.css";

interface QuizPartRendererProps {
  items: QuizItem[];
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

/**
 * Static content block (D-09 / D-10 / D-11). Renders an optional heading, one `<p>` per
 * paragraph, and an optional bullet list — all as plain React children, so escaping is
 * automatic and there is no HTML injection sink here (no raw-HTML-setting React prop, no
 * markdown, no sanitizer). Phase 1 closed a reflected XSS on this exact page; this component
 * does not reopen that surface. It never reads `answers` and never calls `onAnswerChange`, so
 * it has no way to produce an `answers` entry (D-11's "leaves no trace in the submission").
 *
 * Uses its own `.infoBlockCard*` class family — NOT `.questionCard`/`.questionCard__label`/
 * `.questionCard__subtitle` — so a patient cannot mistake a clinical recommendation for a
 * question asking for input (the session-32 defect this DOM test infra exists to catch).
 * The outer div carries the ARIA note role, announcing supplementary information to a screen
 * reader and giving the DOM test a stable, non-brittle query handle. The card stays fully
 * inert: no focus stop, no click target, no hover state (`.infoBlockCard` carries no `cursor`
 * or `:hover` rule).
 */
function InfoBlockCard({ block }: { block: QuizInfoBlock }) {
  return (
    <div className={styles.infoBlockCard} role="note">
      <div className={styles.infoBlockCard__icon} aria-hidden="true">
        {/* fill uses single quotes deliberately — tests/quiz-part-renderer-no-literals.test.ts
            guards a quoted option-value literal elsewhere in this file, and a double-quoted
            attribute value here would be an unrelated false-positive match against that needle. */}
        <svg viewBox="0 0 24 24" fill='none' xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="10" stroke="rgb(var(--color-button, 0, 123, 255))" strokeWidth="2" />
          <line
            x1="12"
            y1="11"
            x2="12"
            y2="16"
            stroke="rgb(var(--color-button, 0, 123, 255))"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <circle cx="12" cy="7.5" r="1.25" fill="rgb(var(--color-button, 0, 123, 255))" />
        </svg>
      </div>
      <div>
        {block.heading && <label className={styles.infoBlockCard__heading}>{block.heading}</label>}
        {block.paragraphs.map((paragraph, idx) => (
          <p key={idx} className={styles.infoBlockCard__paragraph}>
            {paragraph}
          </p>
        ))}
        {block.bullets && block.bullets.length > 0 && (
          <ul className={styles.infoBlockCard__bullets}>
            {block.bullets.map((bullet, idx) => (
              <li key={idx}>{bullet}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/**
 * D-06's exact reveal signature: `showIf` present AND `required` explicitly `false`. True of
 * only the three HIST-03 reveals today, and no question-ID literal is needed to detect it —
 * both flags already live on the schema item.
 */
function isRevealItem(item: QuizItem): boolean {
  return isQuestion(item) && Boolean(item.showIf) && item.required === false;
}

/**
 * A GATE is any item whose next visible sibling is a reveal (per `isRevealItem`) whose
 * `showIf.questionId` points back at this item's `id`. Purely data-driven lookahead — no
 * question-ID literal. When true, the gate gets `styles.questionCard__gateParent` and its
 * paired reveal gets `styles.questionCard__revealChild`, fusing the pair into one visual card
 * per UI-SPEC.md's HIST-03 gate+reveal contract.
 */
function isGateItem(item: QuizItem, nextItem: QuizItem | undefined): boolean {
  if (!nextItem || !isRevealItem(nextItem) || !isQuestion(nextItem)) return false;
  return nextItem.showIf?.questionId === item.id;
}

export function QuizPartRenderer({ items, answers, onAnswerChange, disabled = false }: QuizPartRendererProps) {
  const visible = visibleItems(items, answers);

  return (
    <div className={styles.questionCategory}>
      {visible.map((item, idx) => {
        // Visibility is fully data-driven now — no per-ID part/id guard here. `visibleItems`
        // filters both hidden questions and hidden info blocks from a single evaluator (D-01/D-07).
        if (item.kind === "info") {
          return <InfoBlockCard key={`info-${item.id}`} block={item} />;
        }

        const key = `q-${item.id}`;

        // HIST-03 gate+reveal fusion (D-06 / UI-SPEC.md): a gate's card loses its bottom
        // rounding and margin, its reveal's card loses its top rounding and margin and gains a
        // dashed top divider — together they read as one continuous two-part card.
        const nextItem = visible[idx + 1];
        const cardClassName = [
          styles.questionCard,
          isGateItem(item, nextItem) ? styles.questionCard__gateParent : "",
          isRevealItem(item) ? styles.questionCard__revealChild : "",
        ]
          .filter(Boolean)
          .join(" ");

        switch (item.type) {
          case "checkbox_multi":
          case "radio_multi": {
            const question = item;
            const raw = selectedValues(answers[question.id]);

            return (
              <div key={question.id} className={cardClassName}>
                <label className={styles.questionCard__label} id={key}>
                  {question.text}
                </label>
                <div className={styles.questionCard__optionsVertical} role="group" aria-labelledby={key}>
                  {(question.options || []).map((opt) => {
                    const selected = raw.includes(opt.value);
                    return (
                      <label
                        key={opt.value}
                        className={`${styles.questionCard__optionVertical} ${selected ? styles.questionCard__optionSelected : ""}`}
                      >
                        <input
                          type="checkbox"
                          checked={selected}
                          disabled={disabled}
                          onChange={() => onAnswerChange(question.id, toggleOption(question, raw, opt.value))}
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
            const question = item;
            const val = typeof answers[question.id] === "number" ? (answers[question.id] as number) : undefined;
            const opts = ["None", "Mild", "Moderate", "Severe"];
            return (
              <div key={question.id} className={cardClassName}>
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
            const question = item;
            const val = typeof answers[question.id] === "number" ? (answers[question.id] as number) : undefined;
            return (
              <div key={question.id} className={cardClassName}>
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
            const question = item;
            const val = typeof answers[question.id] === "number" ? (answers[question.id] as number) : undefined;
            return (
              <div key={question.id} className={cardClassName}>
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
            const question = item;
            const val = answers[question.id];
            const y = val === "yes";
            const n = val === "no";
            return (
              <div key={question.id} className={cardClassName}>
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
            const question = item;
            const val = typeof answers[question.id] === "string" ? answers[question.id] : "";
            return (
              <div key={question.id} className={cardClassName}>
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
            const question = item;
            const val = typeof answers[question.id] === "string" ? answers[question.id] : "";
            return (
              <div key={question.id} className={cardClassName}>
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

/**
 * Whether every visible item in the part that is a question has a valid answer. Non-question
 * items (info blocks) are skipped without a required check — the `isQuestion` narrow is the
 * first statement in the loop body, before any required logic runs, so an info block can never
 * acquire required-ness (D-12). Required-ness defaults to true; only an explicit
 * `required: false` opts a question out (D-05).
 */
export function isPartComplete(items: QuizItem[], answers: QuizAnswers): boolean {
  for (const item of visibleItems(items, answers)) {
    if (!isQuestion(item)) continue;
    if (item.required === false) continue;
    if (!isAnswered(item, answers[item.id])) return false;
  }
  return true;
}
