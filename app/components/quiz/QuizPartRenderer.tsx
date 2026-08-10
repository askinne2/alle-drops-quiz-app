import { useEffect, useState } from "react";
import { type QuizAnswers, type QuizInfoBlock, type QuizItem, type QuizQuestion } from "../../lib/quiz/types";
import {
  isAnswered,
  isQuestion,
  selectedValues,
  toggleOption,
  visibleItems,
} from "../../lib/quiz/schema";
import { MAX_FILE_BYTES, MAX_TOTAL_BYTES } from "../../lib/storage/upload-validation";
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

// ─────────────────────────────────────────────────────────────────────────
// file_multi (04-16 / TEST-04) — the multi-file upload widget's support
// code. Every value/message here is pure and testable independent of the
// component. See tests/quiz-file-upload-dom.test.ts for DOM coverage of the
// gate rule (T-4-80: only status: "uploaded" entries ever write a token).
// ─────────────────────────────────────────────────────────────────────────

type FileUploadStatus = "uploading" | "uploaded" | "failed";

interface FileUploadEntry {
  localId: string;
  filename: string;
  sizeBytes: number;
  status: FileUploadStatus;
  token?: string;
  errorMessage?: string;
  /** Only the generic network/server-error case (never wrong-type/too-large/total-exceeded,
   *  which retrying the same bytes cannot fix) shows a Retry action, per the Copywriting
   *  Contract — only the "upload failed" copy names a Retry action. */
  retryable?: boolean;
  /** Kept so Retry can re-POST the exact same bytes without asking the patient to re-pick. */
  file?: File;
}

const MAX_FILE_MB = Math.round(MAX_FILE_BYTES / (1024 * 1024));
const MAX_TOTAL_MB = Math.round(MAX_TOTAL_BYTES / (1024 * 1024));

// Verbatim UI-SPEC copy (04-UI-SPEC.md Copywriting Contract), ratified caps substituted. Every
// string is prefixed with "⚠" so the signal is never colour-only (T-4-85).
function wrongTypeMessage(filename: string): string {
  return `⚠ ${filename} isn't a supported file type. Please upload a PDF, JPEG, PNG, or HEIC file.`;
}
function perFileTooLargeMessage(filename: string): string {
  return `⚠ ${filename} is over the ${MAX_FILE_MB} MB limit. Try a smaller photo or a lower-resolution scan.`;
}
function totalExceededMessage(): string {
  return `⚠ Adding this file would put you over the ${MAX_TOTAL_MB} MB total limit. Remove a file first.`;
}
function uploadFailedMessage(filename: string): string {
  return `⚠ ${filename} didn't upload. Check your connection and tap Retry.`;
}
function requiredEmptyMessage(): string {
  return "⚠ Add at least one file to continue.";
}

/** Maps POST /api/quiz/upload's status/body-error contract (plan 04-13) to the UI-SPEC's
 *  client-interpolated copy. The server never echoes the filename back — it is held in
 *  component state and interpolated here. Any response shape this function does not
 *  specifically recognize falls through to the generic "didn't upload" copy, which is also
 *  the only variant carrying a Retry action. */
function classifyUploadError(
  filename: string,
  status: number,
  bodyError: string
): { message: string; retryable: boolean } {
  if (status === 415) return { message: wrongTypeMessage(filename), retryable: false };
  if (status === 413 && bodyError === "File too large") {
    return { message: perFileTooLargeMessage(filename), retryable: false };
  }
  if (status === 413 && bodyError === "Total upload size exceeded") {
    return { message: totalExceededMessage(), retryable: false };
  }
  return { message: uploadFailedMessage(filename), retryable: true };
}

function fileTypeChipLabel(filename: string): string {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".pdf")) return "PDF";
  if (lower.endsWith(".png")) return "PNG";
  if (lower.endsWith(".heic") || lower.endsWith(".heif")) return "HEIC";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "JPG";
  return "FILE";
}

function formatFileSizeLabel(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function statusText(status: FileUploadStatus): string {
  switch (status) {
    case "uploading":
      return "Uploading";
    case "uploaded":
      return "Uploaded";
    case "failed":
      return "Upload failed";
  }
}

function statusIconClassName(status: FileUploadStatus): string {
  switch (status) {
    case "uploading":
      return styles.fileUpload__statusUploading;
    case "uploaded":
      return styles.fileUpload__statusUploaded;
    case "failed":
      return styles.fileUpload__statusFailed;
  }
}

/** The row-level status indicator. `aria-hidden="true"` — the visually-hidden text sibling
 *  (`statusText` above) is the actual accessible name, so a screen-reader user learns whether a
 *  file actually succeeded, not just that a row exists (Interaction Contract Summary). */
function StatusIcon({ status }: { status: FileUploadStatus }) {
  if (status === "uploading") {
    return (
      <svg viewBox="0 0 24 24" fill='none' xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <circle
          cx="12"
          cy="12"
          r="9"
          stroke="currentColor"
          strokeWidth="2"
          strokeDasharray="42"
          strokeDashoffset="14"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  if (status === "uploaded") {
    return (
      <svg viewBox="0 0 24 24" fill='none' xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path
          d="M5 13l4 4L19 7"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill='none' xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M12 3L2 20h20L12 3z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <line x1="12" y1="9" x2="12" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="16" r="1" fill="currentColor" />
    </svg>
  );
}

function replaceFileEntry(
  prev: Record<string, FileUploadEntry[]>,
  questionId: string,
  localId: string,
  patch: Partial<FileUploadEntry>
): Record<string, FileUploadEntry[]> {
  const entries = prev[questionId] ?? [];
  return {
    ...prev,
    [questionId]: entries.map((entry) => (entry.localId === localId ? { ...entry, ...patch } : entry)),
  };
}

/** POSTs one file to /api/quiz/upload (plan 04-13's contract — one file per request, field name
 *  "file"). Never throws outward: every failure path (non-2xx response, a 2xx body missing
 *  `token`, or a thrown network error) resolves to a "failed" entry via the functional `setState`
 *  form, which is what safely merges concurrent uploads landing in any order (T-4-80's "only
 *  status: 'uploaded' writes a token" guarantee depends on this staying race-safe). */
async function uploadFileToServer(
  file: File,
  localId: string,
  questionId: string,
  setFileEntriesByQuestion: React.Dispatch<React.SetStateAction<Record<string, FileUploadEntry[]>>>
): Promise<void> {
  try {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/quiz/upload", { method: "POST", body: formData });

    if (!res.ok) {
      let bodyError = "";
      try {
        const body = await res.json();
        if (body && typeof body.error === "string") bodyError = body.error;
      } catch {
        // Non-JSON or empty error body — falls through to the generic "didn't upload" copy.
      }
      const { message, retryable } = classifyUploadError(file.name, res.status, bodyError);
      setFileEntriesByQuestion((prev) =>
        replaceFileEntry(prev, questionId, localId, { status: "failed", errorMessage: message, retryable })
      );
      return;
    }

    const body = await res.json();
    const token = body && typeof body.token === "string" ? body.token : undefined;
    if (!token) {
      setFileEntriesByQuestion((prev) =>
        replaceFileEntry(prev, questionId, localId, {
          status: "failed",
          errorMessage: uploadFailedMessage(file.name),
          retryable: true,
        })
      );
      return;
    }

    setFileEntriesByQuestion((prev) => replaceFileEntry(prev, questionId, localId, { status: "uploaded", token }));
  } catch {
    setFileEntriesByQuestion((prev) =>
      replaceFileEntry(prev, questionId, localId, {
        status: "failed",
        errorMessage: uploadFailedMessage(file.name),
        retryable: true,
      })
    );
  }
}

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

  // file_multi (04-16) local state — kept at THIS component's level, not per-item, so it survives
  // a testing_status flip away and back within the same mounted part (hidden-answer retention,
  // D-03's file analogue). `items` here is the full, UNFILTERED part list (not `visible`), so this
  // state and its sync effect below stay correct even while the question itself is hidden.
  const [fileEntriesByQuestion, setFileEntriesByQuestion] = useState<Record<string, FileUploadEntry[]>>({});
  const [requiredEmptyTouched, setRequiredEmptyTouched] = useState<Record<string, boolean>>({});

  // The single place tokens are ever written into `answers` (T-4-80): derives each file_multi
  // question's token array from ONLY its "uploaded" entries and calls onAnswerChange only when
  // that array actually changed, so this never loops against the parent's own re-render.
  useEffect(() => {
    for (const candidate of items) {
      if (!isQuestion(candidate) || candidate.type !== "file_multi") continue;
      const entries = fileEntriesByQuestion[candidate.id];
      if (!entries) continue; // never interacted with — nothing to sync
      const tokens = entries
        .filter((entry) => entry.status === "uploaded" && entry.token)
        .map((entry) => entry.token as string);
      const current = Array.isArray(answers[candidate.id]) ? (answers[candidate.id] as string[]) : [];
      const changed = tokens.length !== current.length || tokens.some((tok, i) => tok !== current[i]);
      if (changed) onAnswerChange(candidate.id, tokens);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileEntriesByQuestion, items]);

  function handleFilesPicked(question: QuizQuestion, currentEntries: FileUploadEntry[], fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const incoming = Array.from(fileList);

    // Additive picking (Interaction Contract): a native <input type="file">'s onChange FileList
    // holds only the latest selection, so union with prior state. Dedup by name+size.
    const existingKeys = new Set(currentEntries.map((entry) => `${entry.filename}::${entry.sizeBytes}`));
    let runningTotal = currentEntries
      .filter((entry) => entry.status !== "failed")
      .reduce((sum, entry) => sum + entry.sizeBytes, 0);

    const newEntries: FileUploadEntry[] = [];
    const toUpload: { entry: FileUploadEntry; file: File }[] = [];

    for (const file of incoming) {
      const key = `${file.name}::${file.size}`;
      if (existingKeys.has(key)) continue;
      existingKeys.add(key);
      const localId = `fu-${Date.now()}-${Math.random().toString(36).slice(2)}`;

      // Client-side pre-checks (courtesy only; POST /api/quiz/upload's own caps are
      // authoritative — T-4-81). Shows the UI-SPEC copy immediately, no round trip.
      if (file.size > MAX_FILE_BYTES) {
        newEntries.push({
          localId,
          filename: file.name,
          sizeBytes: file.size,
          status: "failed",
          errorMessage: perFileTooLargeMessage(file.name),
          retryable: false,
          file,
        });
        continue;
      }
      if (runningTotal + file.size > MAX_TOTAL_BYTES) {
        newEntries.push({
          localId,
          filename: file.name,
          sizeBytes: file.size,
          status: "failed",
          errorMessage: totalExceededMessage(),
          retryable: false,
          file,
        });
        continue;
      }
      runningTotal += file.size;
      const entry: FileUploadEntry = {
        localId,
        filename: file.name,
        sizeBytes: file.size,
        status: "uploading",
        file,
      };
      newEntries.push(entry);
      toUpload.push({ entry, file });
    }

    if (newEntries.length === 0) return;

    setFileEntriesByQuestion((prev) => ({
      ...prev,
      [question.id]: [...(prev[question.id] ?? []), ...newEntries],
    }));
    setRequiredEmptyTouched((prev) => ({ ...prev, [question.id]: false }));

    // Side effects (the real network calls) run OUTSIDE the setState updater above, in this
    // event handler body — not inside a reducer-style callback.
    for (const { entry, file } of toUpload) {
      void uploadFileToServer(file, entry.localId, question.id, setFileEntriesByQuestion);
    }
  }

  function handleRemoveFile(questionId: string, localId: string) {
    // Available at any state (uploading, uploaded, failed), immediate, no confirmation — removing
    // a picked-but-not-yet-submitted file is reversible (Copywriting Contract).
    setFileEntriesByQuestion((prev) => ({
      ...prev,
      [questionId]: (prev[questionId] ?? []).filter((entry) => entry.localId !== localId),
    }));
  }

  function handleRetryFile(questionId: string, entry: FileUploadEntry) {
    if (!entry.file) return;
    setFileEntriesByQuestion((prev) =>
      replaceFileEntry(prev, questionId, entry.localId, {
        status: "uploading",
        errorMessage: undefined,
        retryable: false,
      })
    );
    void uploadFileToServer(entry.file, entry.localId, questionId, setFileEntriesByQuestion);
  }

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

          // Single-line variant of `text_input` (Part 7 / TEST-03). Same label/subtitle/wiring
          // shape as `text_input` above — the only difference is a single-line `<input
          // type="text">` in place of the 4-row `<textarea>`, reusing `.quizContainer__input`,
          // the same class `PatientInfoStep.tsx` already applies to single-line text inputs.
          case "text_input_short": {
            const question = item;
            const val = typeof answers[question.id] === "string" ? answers[question.id] : "";
            return (
              <div key={question.id} className={cardClassName}>
                <label className={styles.questionCard__label} htmlFor={question.id}>
                  {question.text}
                </label>
                {question.subtitle && <p className={styles.questionCard__subtitle}>{question.subtitle}</p>}
                <input
                  type="text"
                  id={question.id}
                  className={styles.quizContainer__input}
                  value={val as string}
                  disabled={disabled}
                  onChange={(ev) => onAnswerChange(question.id, ev.target.value)}
                />
              </div>
            );
          }

          // `radio_single` (Part 7 / TEST-01) shares this block with `control_0_3` via case
          // fallthrough — same card structure, same radiogroup, same options map, same
          // onAnswerChange wiring. Keep the two case labels falling through to one block rather
          // than duplicating the ~28 lines below; if you ever need to diverge them, duplicate and
          // cross-reference instead of letting them silently drift apart.
          case "control_0_3":
          case "radio_single": {
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

          // file_multi (04-16 / TEST-04) — the multi-file upload widget. Answer shape is
          // string[] of opaque tokens (same shape checkbox_multi/radio_multi already use), so
          // required/showIf/visibleAnswers/scoring all need zero new code (04-UI-SPEC.md
          // Component Inventory §1) — everything below is UI/interaction, not schema plumbing.
          case "file_multi": {
            const question = item;
            const entries = fileEntriesByQuestion[question.id] ?? [];
            const tokens = Array.isArray(answers[question.id]) ? (answers[question.id] as string[]) : [];
            const isRequired = question.required !== false;
            const anyUploading = entries.some((entry) => entry.status === "uploading");
            // The one deliberate exception to the quiz-wide silent-disable pattern (04-UI-SPEC.md
            // Copywriting Contract). QuizContainer.tsx's Next button is out of this plan's scope
            // (files_modified), so "attempts Next" is approximated here by "the picker lost focus
            // while the field is still required-and-empty" — a real, testable trigger a patient
            // reaches naturally by tabbing (or tapping) past the widget toward the Next button.
            const showRequiredEmptyError =
              isRequired && tokens.length === 0 && !anyUploading && Boolean(requiredEmptyTouched[question.id]);

            return (
              <div key={question.id} className={styles.fileUpload}>
                <label className={styles.questionCard__label} id={key}>
                  {question.text}
                </label>
                {question.subtitle && <p className={styles.fileUpload__requirements}>{question.subtitle}</p>}

                <label className={styles.fileUpload__dropzone}>
                  <svg
                    className={styles.fileUpload__dropzone__icon}
                    viewBox="0 0 24 24"
                    fill='none'
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                  >
                    <line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    <line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  <span className={styles.fileUpload__dropzone__label}>Add files</span>
                  {/* Visually hidden via the clip technique (styles.fileUpload__input) — NEVER
                      display: none, which would break Tab reachability. */}
                  <input
                    type="file"
                    multiple
                    className={styles.fileUpload__input}
                    aria-label="Upload allergy test results"
                    accept="application/pdf, image/jpeg, image/png, image/heic, image/heif"
                    disabled={disabled}
                    onChange={(ev) => {
                      handleFilesPicked(question, entries, ev.target.files);
                      // Allow re-picking the same filename later (e.g. after removal) — without
                      // this, a browser won't fire onChange again for an identical selection.
                      ev.target.value = "";
                    }}
                    onBlur={() => {
                      if (tokens.length === 0) {
                        setRequiredEmptyTouched((prev) => ({ ...prev, [question.id]: true }));
                      }
                    }}
                  />
                </label>

                <div aria-live="polite">
                  {entries.length === 0 ? (
                    <p className={styles.fileUpload__empty}>No files added yet.</p>
                  ) : (
                    <ul role="list" className={styles.fileUpload__list}>
                      {entries.map((entry) => (
                        <li
                          key={entry.localId}
                          className={`${styles.fileUpload__item} ${styles.questionCard__optionVertical}`}
                        >
                          <div className={styles.fileUpload__item__meta}>
                            <span className={styles.fileUpload__chip}>{fileTypeChipLabel(entry.filename)}</span>
                            <span className={styles.fileUpload__filename}>{entry.filename}</span>
                            <span className={styles.fileUpload__chip}>{formatFileSizeLabel(entry.sizeBytes)}</span>
                            <span
                              className={`${styles.fileUpload__status} ${statusIconClassName(entry.status)}`}
                              aria-hidden="true"
                            >
                              <StatusIcon status={entry.status} />
                            </span>
                            <span className={styles.fileUpload__visuallyHidden}>{statusText(entry.status)}</span>
                          </div>
                          <button
                            type="button"
                            className={styles.fileUpload__remove}
                            aria-label={`Remove ${entry.filename}`}
                            disabled={disabled}
                            onClick={() => handleRemoveFile(question.id, entry.localId)}
                          >
                            ×
                          </button>
                          {entry.status === "failed" && entry.errorMessage && (
                            <p className={styles.fileUpload__item__error} role="alert">
                              {entry.errorMessage}{" "}
                              {entry.retryable && (
                                <button
                                  type="button"
                                  className={styles.fileUpload__retry}
                                  disabled={disabled}
                                  onClick={() => handleRetryFile(question.id, entry)}
                                >
                                  Retry
                                </button>
                              )}
                            </p>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {showRequiredEmptyError && (
                  <p className={styles.fileUpload__error} role="alert">
                    {requiredEmptyMessage()}
                  </p>
                )}
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
