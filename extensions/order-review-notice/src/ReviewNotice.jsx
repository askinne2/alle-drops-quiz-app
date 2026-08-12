/**
 * Static clinical-review notice for thank-you + order-status (SHOP-04 / D-10).
 * No fetch, no order-id clinical lookup, no quiz/PHI fields.
 */
export function ReviewNotice() {
  return (
    <s-banner heading="What happens next" tone="info">
      <s-stack direction="block" gap="base">
        <s-text>
          Dr. Sullivan reviews your intake before your order ships. This
          typically takes 2–3 business days.
        </s-text>
        <s-text>
          If allergy testing results are not yet on file, complete your symptom
          assessment upload (or finish the assessment) before we can ship. Need
          help? Contact the clinic using the support details on your order confirmation email.
        </s-text>
      </s-stack>
    </s-banner>
  );
}
