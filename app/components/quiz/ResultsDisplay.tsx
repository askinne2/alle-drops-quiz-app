import { useState } from "react";
import { type ScoreBracket } from "../../lib/quiz/scoring";
import { getRedirectTarget, REDIRECT_FALLBACK, type QuizRedirectConfig } from "../../lib/quiz/redirects";
import { getProductHandle, type QuizProductConfig } from "../../lib/quiz/product-links";
import { toRelativePath } from "../../lib/quiz/navigation";
import { getScoreScale } from "../../lib/quiz/score-scale";
import styles from "../../styles/quiz.module.css";

export interface ResultsDisplayProps {
  score: number;
  scoreBracket: ScoreBracket;
  patientState: "tennessee" | "texas";
  symptomProfileId: string;
  testingStatus: "needs_testing" | "had_testing";
}

/**
 * Where the "Schedule Allergy Testing" CTA should send the patient: merchant configuration, else
 * the module fallback. Thin browser-global wrapper over `getRedirectTarget`, matching the
 * convention `QuizContainer.tsx` already established for its own copy of this wrapper (see
 * `redirects.ts`'s doc comment: "the thin browser-global wrapper belongs in the calling
 * component") — `ResultsDisplay` is now its own caller, not a delegate of `QuizContainer`.
 */
function getRedirectUrl(): string {
  if (typeof window === "undefined") return REDIRECT_FALLBACK.testOptions;
  const cfg = (window as unknown as { AlleDropsQuizConfig?: QuizRedirectConfig }).AlleDropsQuizConfig;
  return getRedirectTarget("testOptions", cfg);
}

/** The product-handle slice of the runtime config, or undefined when unset or server-side. */
function getProductConfig(): QuizProductConfig {
  if (typeof window === "undefined") return undefined;
  return (
    window as unknown as {
      AlleDropsQuizConfig?: { tnProductHandle?: string; txProductHandle?: string };
    }
  ).AlleDropsQuizConfig;
}

/**
 * Send the storefront to a relative path, whether the quiz is framed or standalone. Duplicated
 * from `QuizContainer.tsx` rather than imported — importing from the component that itself
 * imports `ResultsDisplay` would create a circular dependency, and this is a thin, pure-by-input
 * wrapper with no state of its own.
 */
function navigateParent(path: string): void {
  if (typeof window === "undefined") return;
  const safe = toRelativePath(path);
  if (safe === null) {
    // Diagnosability, not correctness — see QuizContainer.tsx's identical comment. Navigation
    // targets carry no PHI and none may be added to this log line.
    console.warn("[quiz] refused navigation: target is not a same-origin relative path:", path);
    return;
  }
  if (window.self !== window.top) {
    window.parent.postMessage({ type: "quiz:navigate", path: safe }, "*");
  } else {
    window.location.assign(safe);
  }
}

export function ResultsDisplay({
  score,
  scoreBracket,
  patientState,
  symptomProfileId,
  testingStatus,
}: ResultsDisplayProps) {
  const [copied, setCopied] = useState(false);
  const scale = getScoreScale();

  /*
    EQUAL-SHARE ZONES, INTERPOLATED MARKER. Every zone gets 1/N of the track regardless of how many
    score points it spans, and the marker is placed by interpolating within its own zone.

    This pairing is load-bearing and the two halves must change together. The zone boundaries are
    now the clinical bracket boundaries (see score-scale.ts), and `7+` spans 54 of the 60 possible
    points. Rendering these boundaries at span-proportional widths — the previous behaviour, and the
    obvious "simplification" — paints 90% of the bar red and puts a 7-of-60 patient deep inside it.
    That outcome is what D-05 (05-CONTEXT.md) was written to prevent and it is the one arrangement
    nobody chose. Equal shares hold red to one third.

    Interpolation is what stops equal shares from throwing away ordering: within the red third,
    score 7 lands at its far-left edge and score 60 at its far right, so two `7+` patients at
    opposite ends of the bracket still read as visibly different. The trade-off Andrew accepted on
    2026-08-12 is that marker position is no longer a linear reading of the raw score — the number
    itself carries that, in the circle and in the "{score} of {max}" readout.

    KNOWN LIMITATION, MEASURED AND ACCEPTED (2026-08-12) — do not file this as a bug. Because
    interpolation makes position continuous, scores on opposite sides of a zone seam land on top of
    each other. Rendered and screenshotted at every score: 6 sits at 66.67%, 7 at 67.28%, 8 at
    67.90% — roughly three pixels apart on a 520px bar. So the 6 -> 7 crossing, the most
    consequential clinical threshold in the quiz, produces no perceptible marker movement; the
    colour beneath it, the bolded legend label, and the recommendation copy carry that change
    instead. Two alternatives were costed and declined: centring the marker in its band (makes the
    threshold a third-of-the-bar jump, but collapses every 7+ patient onto one position), and
    insetting each band's usable range away from the seams (preserves both, but needs an arbitrary
    tuning constant and stops score 0 and score 60 from reaching the bar's ends).
  */
  const zoneIndexRaw = scale.zones.findIndex((z) => score <= z.upTo);
  const zoneIndex = zoneIndexRaw === -1 ? scale.zones.length - 1 : zoneIndexRaw;
  const currentZone = scale.zones[zoneIndex];
  const zoneFloor = zoneIndex === 0 ? 0 : scale.zones[zoneIndex - 1].upTo;
  const zoneSpan = currentZone.upTo - zoneFloor;
  // Clamped so a score above the ceiling (impossible today, cheap to guard) cannot push the marker
  // past the track's right edge.
  const withinZone =
    zoneSpan > 0 ? Math.min(1, Math.max(0, (score - zoneFloor) / zoneSpan)) : 1;
  const markerPercent =
    scale.zones.length > 0 ? ((zoneIndex + withinZone) / scale.zones.length) * 100 : 0;

  const handleCopy = () => {
    navigator.clipboard.writeText(symptomProfileId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className={styles.quizResults} data-patient-state={patientState}>
      <div className={styles.quizResults__header}>
        <h2 className={styles.quizResults__title}>Preliminary Score</h2>
        <p className={styles.quizResults__subtitle}>
          Our Clinical Team is reviewing your information, and will send you email confirmation of
          your final results within the next 1-2 business days.
        </p>
      </div>

      <div className={styles.quizResults__mainGrid}>
        <div className={styles.quizResults__leftColumn}>
          <div className={styles.quizResults__scoreContainer}>
            <div className={styles.quizResults__scoreCircle}>
              <span className={styles.quizResults__scoreNumber}>{score}</span>
            </div>
            {/*
              Immediate meaning for the naked number: the current symptom-burden zone label
              (same vocabulary as the bar legend), not the clinical bracket. Keeps D-05/D-06 —
              circle and bar stay on the raw-score axis; recommendation stays on scoreBracket.
            */}
            <p className={styles.quizResults__scoreBurdenCaption}>
              {currentZone.label} symptom burden
            </p>
            <div className={styles.scaleBar}>
              <div className={styles.scaleBar__axisRow}>
                <span className={styles.scaleBar__axisLabel}>Symptom burden</span>
                <span className={styles.scaleBar__value}>{score} of {scale.max}</span>
              </div>
              <div
                className={styles.scaleBar__track}
                role="img"
                aria-label={`Symptom burden position: ${currentZone.label.toLowerCase()} zone, ${score} of ${scale.max} on a 0 to ${scale.max} scale.`}
              >
                <div className={styles.scaleBar__zones} aria-hidden="true">
                  {/* Equal share per zone, NOT `upTo - previousUpTo` — see the comment above. */}
                  {scale.zones.map((zone) => (
                    <div
                      key={zone.tone + zone.upTo}
                      className={styles.scaleBar__zone}
                      data-tone={zone.tone}
                      style={{ flex: "1 0 0" }}
                    />
                  ))}
                </div>
                <div
                  className={styles.scaleBar__marker}
                  aria-hidden="true"
                  style={{ left: `${markerPercent}%` }}
                />
              </div>
              <div className={styles.scaleBar__legend}>
                {/* Widths must match the zones above exactly, or every label drifts off its band. */}
                {scale.zones.map((zone) => (
                  <span
                    key={zone.tone + zone.upTo}
                    className={styles.scaleBar__legendItem}
                    style={{ flex: "1 0 0" }}
                    {...(zone === currentZone ? { "data-current": "true" } : {})}
                  >
                    {zone.label}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/*
            D-06's two-axes boundary. The wrapper's top border is the visual line between "here is
            your number on a scale" and "here is what a human recommends" — it is not decoration and
            must not be removed in a future tidy-up.

            AMENDED 2026-08-12. D-06 originally required a separate "What this means for you"
            heading here, with a "{zone} on the symptom scale" context line under it. Both were
            removed on Andrew's call after seeing the shipped page: with the zones now aligned to
            the clinical brackets, the context line was the third appearance of the same word within
            about two inches — "High symptom burden" under the circle, the bolded "High" in the
            legend, then "High on the symptom scale" — and the heading sat between two sentences
            that already said what it said.

            D-06's requirement is still met, by the bridge sentence instead of by a heading: it
            names both axes in order ("The bar shows how many symptoms you reported" / "Below is
            what that usually means for care") and hands off directly to the clinical paragraph. If
            that sentence is ever cut, the two axes lose their only label and something must replace
            it — do not delete it as redundant prose.
          */}
          <div className={styles.scaleBar__meaningSection}>
            <p className={styles.scaleBar__axisBridge}>
              The bar shows how many symptoms you reported. Below is what that usually means for care.
            </p>

            {scoreBracket === "0-2" && (
              <div className={styles.quizResults__recommendation}>
                <div className={styles.quizResults__message}>
                  <h3>Your Symptoms Appear Mild and Well-Controlled</h3>
                  <p>
                    Based on your responses, your allergy symptoms appear to be mild and well-controlled. Continue your
                    current management approach with over-the-counter medications as needed. However, if your symptoms
                    worsen, occur more frequently, or begin to interfere with your daily activities, consider completing
                    this questionnaire again or scheduling an appointment with an allergist.
                  </p>
                </div>
              </div>
            )}

            {scoreBracket === "3-8" && (
              <div className={styles.quizResults__recommendation}>
                <div className={styles.quizResults__message}>
                  <h3>You May Benefit From Seeing an Allergist</h3>
                  <p>
                    Based on your responses, you may benefit from seeing an allergist. While your symptoms are not
                    severe, they are affecting your daily life and could be better controlled. An allergist can help
                    identify your triggers and optimize your treatment plan.
                  </p>
                </div>
              </div>
            )}

            {scoreBracket === "9+" && (
              <div className={styles.quizResults__recommendation}>
                <div className={styles.quizResults__message}>
                  <h3>Sublingual Immunotherapy May Significantly Help You</h3>
                  <p>
                    Based on your responses, you would likely benefit from beginning sublingual immunotherapy. Your
                    symptoms are moderate-to-severe, significantly affecting your quality of life, or not adequately
                    controlled with current treatment. An allergist can perform testing to identify your specific triggers
                    and develop a comprehensive treatment plan, which may include prescription medications or
                    immunotherapy.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/*
            One shared action area, conditioned on testingStatus and independent of scoreBracket
            (04-UI-SPEC.md Component Inventory §5). Every action is a plain <a> or a
            navigateParent() call — no callback prop is reintroduced; that is what makes this
            screen terminal (TEST-05).

            needs_testing omits the "Go to AlleDrops Product Page" link. This is a
            PLANNER-RATIFIED decision, not a CONTEXT.md lock (04-UI-SPEC.md §5 flagged it for
            ratification): showing a direct path to the purchasable SLIT product to a patient who
            just told the quiz they have not yet been tested reads as implying a purchase path
            exists before testing is done — precisely what TEST-06 exists to prevent ("no
            surface... offers or implies a path to purchase without testing"). Surfaced for
            override at plan 04-19's UAT checkpoint.
          */}
          <div className={styles.quizResults__actions}>
            {testingStatus === "needs_testing" ? (
              <>
                <a
                  className={`${styles.quizNavigation__button} ${styles.quizNavigation__buttonNext}`}
                  href={getRedirectUrl()}
                >
                  Schedule Allergy Testing
                </a>
                <button
                  type="button"
                  className={`${styles.quizNavigation__button} ${styles.quizNavigation__buttonPrev}`}
                  onClick={() => navigateParent("/")}
                >
                  Return Home
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className={`${styles.quizNavigation__button} ${styles.quizNavigation__buttonNext}`}
                  onClick={() => navigateParent("/")}
                >
                  Return Home
                </button>
                <a
                  className={`${styles.quizNavigation__button} ${styles.quizNavigation__buttonPrev}`}
                  href={`/products/${getProductHandle(patientState, getProductConfig())}`}
                >
                  Go to AlleDrops Product Page
                </a>
              </>
            )}
          </div>

          <div className={styles.quizResults__profile}>
            <p className={styles.quizResults__profileText}>Your Symptom Profile ID:</p>
            <div className={styles.quizResults__profileId}>
              <strong className={styles.quizResults__profileIdValue}>{symptomProfileId}</strong>
              <button
                type="button"
                className={styles.quizResults__copyButton}
                onClick={handleCopy}
                aria-label="Copy Symptom Profile ID"
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
            <p className={styles.quizResults__profileNote}>
              Save this ID for your records. Share it with our team if needed.
            </p>
          </div>

          <div className={styles.quizResults__disclaimer}>
            <p>
              <strong>Disclaimer:</strong> This assessment is a clinical symptom screening tool. Results are used to determine whether sublingual immunotherapy may be appropriate for you. This tool does not diagnose conditions and does not replace evaluation by a licensed healthcare provider.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
