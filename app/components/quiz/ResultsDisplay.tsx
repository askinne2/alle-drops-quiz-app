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
function getTestOptionsUrl(): string {
  if (typeof window === "undefined") return REDIRECT_FALLBACK.testOptions;
  const cfg = (window as unknown as { AlleDropsQuizConfig?: QuizRedirectConfig }).AlleDropsQuizConfig;
  return getRedirectTarget("testOptions", cfg);
}

function getConsultUrl(): string {
  // TELE-01 destination: `/products/allergy-consultation`. Appointly's booking
  // widget opens from that page's Schedule CTA; calendar mapping is a go-live
  // clinic config, not a quiz-bundle concern.
  if (typeof window === "undefined") return REDIRECT_FALLBACK.consult;
  const cfg = (window as unknown as { AlleDropsQuizConfig?: QuizRedirectConfig }).AlleDropsQuizConfig;
  return getRedirectTarget("consult", cfg);
}

const LEARN_MORE_SLIT_PATH = "/pages/how-it-works";
const CONTACT_PATH = "/pages/contact";

function telehealthCtaLabel(bracket: ScoreBracket): string {
  switch (bracket) {
    case "0-2":
      return "Schedule a Telehealth Appointment";
    case "3-8":
      return "We recommend scheduling a Telehealth Appointment";
    case "9+":
      return "(Optional) Schedule a Telehealth appointment";
  }
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
    score 9 lands at its far-left edge and score 60 at its far right, so two `9+` patients at
    opposite ends of the bracket still read as visibly different. The trade-off Andrew accepted on
    2026-08-12 is that marker position is no longer a linear reading of the raw score.

    AMENDED 2026-08-13 — interpolation is now load-bearing, not a refinement. That original
    trade-off was acceptable because the number carried the linear reading, in the circle and the
    "{score} of {max}" readout. **Both are gone**: SCORE-06 removed the denominator and Andrew then
    removed the number itself. Marker position is now the ONLY signal distinguishing a patient at 9
    from one at 60, since both read "High" everywhere else on the page. Do not replace interpolation
    with a fixed per-zone marker position — that would erase within-bracket ordering completely,
    which was survivable while the number was visible and is not survivable now.

    KNOWN LIMITATION, MEASURED AND ACCEPTED (2026-08-12) — do not file this as a bug. Because
    interpolation makes position continuous, scores on opposite sides of a zone seam land on top of
    each other. **Seam positions recomputed 2026-08-13 for the 0–2 / 3–8 / 9+ boundaries**: score 8
    sits at 66.67%, 9 at 67.31%, 10 at 67.95% — still roughly three pixels apart on a 520px bar. The
    boundary move relocated the seam from 6 -> 7 to 8 -> 9; it did not remove it. So the 8 -> 9
    crossing, the most consequential clinical threshold in the quiz, produces no perceptible marker
    movement; the colour beneath it, the bolded legend label, and the recommendation copy carry that
    change instead. Two alternatives were costed and declined: centring the marker in its band
    (makes the threshold a third-of-the-bar jump, but collapses every 9+ patient onto one position),
    and insetting each band's usable range away from the seams (preserves both, but needs an
    arbitrary tuning constant and stops score 0 and score 60 from reaching the bar's ends).
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
            {/*
              NO NUMBER IS SHOWN TO THE PATIENT. Andrew removed the numeric score entirely on
              2026-08-13, after seeing the deployed page: with the `/60` denominator gone (SCORE-06),
              a bare "30" sat above a scale whose top band means "9+" — three times the threshold,
              with nothing left to make its magnitude readable. Removing the denominator made the
              number less interpretable, not more, so the number goes too.

              DECIDED by Andrew on 2026-08-13, reading William's email as "no number of 60 displayed
              anywhere, just the scale". The source sentence is genuinely ambiguous and both readings
              are recorded so nobody re-litigates this from half the quote: William wrote that
              patients "will still receive a number, and then fall on the scale, but they would not
              see the total of 60", and also "the main part is utilizing the scale so they can
              understand". The second half is what governs. Verbatim source:
              05.2-SOURCE-william-2026-08-13.md.

              What carries the result now: this caption, the colour band, the bolded legend word,
              and the recommendation copy below. The zone label uses the symptom-burden vocabulary,
              not the clinical bracket — D-05/D-06 still hold, and the recommendation still keys off
              scoreBracket.

              The raw score is NOT gone from the system — it is still scored, still stored, and
              still shown to providers in the clinical PDF and the admin table. This is a
              patient-facing display decision only.
            */}
            <p className={styles.quizResults__scoreBurdenCaption}>
              {currentZone.label} symptom burden
            </p>
            <div className={styles.scaleBar}>
              <div className={styles.scaleBar__axisRow}>
                <span className={styles.scaleBar__axisLabel}>Symptom burden</span>
              </div>
              <div
                className={styles.scaleBar__track}
                role="img"
                aria-label={`Symptom burden position: ${currentZone.label.toLowerCase()} zone.`}
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
                    Based on your responses, your allergy symptoms appear to be well-controlled. Continue your
                    current management approach with over-the-counter medications as needed. However, if your symptoms
                    worsen, occur more frequently, or begin to interfere with your daily activities, consider completing
                    this questionnaire again. You can always schedule a telehealth appointment with our board-certified
                    allergist if you would like to discuss this further.
                  </p>
                </div>
              </div>
            )}

            {scoreBracket === "3-8" && (
              <div className={styles.quizResults__recommendation}>
                <div className={styles.quizResults__message}>
                  <h3>You May Benefit From Seeing an Allergist Prior to Starting Treatment</h3>
                  <p>
                    Based on your responses, you may benefit from seeing an allergist to help make a decision on
                    whether or not SLIT treatment is appropriate for you. We recommend scheduling a Telehealth
                    appointment with our board-certified allergist. While your symptoms are not severe, they are
                    affecting your daily life and could be better controlled. An allergist can help identify your
                    triggers and optimize your treatment plan.
                  </p>
                </div>
              </div>
            )}

            {scoreBracket === "9+" && (
              <div className={styles.quizResults__recommendation}>
                <div className={styles.quizResults__message}>
                  <h3>Sublingual Immunotherapy May Significantly Help Manage Your Symptoms</h3>
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
            Next Steps — William Miller, 2026-08-13. Replaces the two-button action row that was
            keyed only on testingStatus. Every action is a plain <a href> (iframe click interceptor
            in quiz-embed.tsx forwards it to the parent storefront) or navigateParent() — no
            callback prop is reintroduced; that is what keeps this screen terminal (TEST-05).

            High-score "Explore Our Products" is shown even when testingStatus is needs_testing.
            That reverses the Phase 4 TEST-06 omission of a product CTA for untested patients.
            William asked for it explicitly, gated by the do-not-buy-until-report disclaimer
            below. That disclaimer is clinic-action copy (we will recommend), not a promise that
            a later review entitles the patient to buy — DEC-no-approval-promise-copy still binds.
          */}
          <div className={styles.quizResults__nextSteps}>
            <h3 className={styles.quizResults__nextStepsHeading}>Next Steps</h3>
            <p className={styles.quizResults__nextStepsIntro}>
              While our clinical team is reviewing information, here are your next steps:
            </p>
            <ol className={styles.quizResults__nextStepsList}>
              <li>
                <a
                  className={`${styles.quizNavigation__button} ${styles.quizNavigation__buttonNext}`}
                  href={getConsultUrl()}
                >
                  {telehealthCtaLabel(scoreBracket)}
                </a>
              </li>
              {testingStatus === "needs_testing" && (
                <li>
                  <a
                    className={`${styles.quizNavigation__button} ${styles.quizNavigation__buttonPrev}`}
                    href={getTestOptionsUrl()}
                  >
                    Schedule Allergy Testing
                  </a>
                </li>
              )}
              <li>
                <a
                  className={`${styles.quizNavigation__button} ${styles.quizNavigation__buttonPrev}`}
                  href={LEARN_MORE_SLIT_PATH}
                >
                  Learn More About SLIT
                </a>
              </li>
              {scoreBracket === "9+" && (
                <li>
                  <a
                    className={`${styles.quizNavigation__button} ${styles.quizNavigation__buttonPrev}`}
                    href={`/products/${getProductHandle(patientState, getProductConfig())}`}
                  >
                    Explore Our Products
                  </a>
                  <p className={styles.quizResults__nextStepsDisclaimer}>
                    Please do not complete your product purchase until our clinical team has emailed
                    your final Clinical Report. At that time, we will recommend whether or not SLIT
                    will be appropriate for you.
                  </p>
                </li>
              )}
              <li>
                <a
                  className={`${styles.quizNavigation__button} ${styles.quizNavigation__buttonPrev}`}
                  href={CONTACT_PATH}
                >
                  Contact Our Team
                </a>
              </li>
            </ol>
            <button
              type="button"
              className={`${styles.quizNavigation__button} ${styles.quizNavigation__buttonPrev} ${styles.quizResults__nextStepsHome}`}
              onClick={() => navigateParent("/")}
            >
              Return Home
            </button>
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
