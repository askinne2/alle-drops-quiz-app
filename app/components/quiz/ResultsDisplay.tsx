/**
 * Results Display Component
 * Shows quiz results after submission with product recommendations
 * Matches the two-column layout from quiz-results.liquid
 */

import { useState, useEffect } from "react";
import { type SeverityLevel } from "../../lib/quiz/scoring";
import { getProductByHandle, regionToProductHandle, type ShopifyProduct } from "../../lib/shopify/products";
import styles from "../../styles/quiz.module.css";

/**
 * Format price in cents to currency string
 */
function formatMoney(cents: number, currencyCode: string = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyCode,
  }).format(cents / 100);
}

interface ResultsDisplayProps {
  score: number;
  severityLevel: SeverityLevel;
  region: string;
  customerId?: string;
  symptomProfileId?: string;
}

const SEVERITY_MESSAGES: Record<SeverityLevel, { title: string; text: string }> = {
  minimal: {
    title: "Minimal Symptoms",
    text: "Your symptoms appear minimal. Sublingual immunotherapy may not be necessary at this time.",
  },
  mild: {
    title: "Mild Symptoms",
    text: "You have mild allergy symptoms. We recommend scheduling a consultation before starting treatment.",
  },
  moderate: {
    title: "Moderate Symptoms",
    text: "You're a good candidate for AlleDrops! Your moderate symptoms indicate sublingual immunotherapy could help.",
  },
  severe: {
    title: "Severe Symptoms",
    text: "You're an excellent candidate for AlleDrops! Your severe symptoms strongly indicate a need for immunotherapy.",
  },
};

export function ResultsDisplay({
  score,
  severityLevel,
  region,
  customerId,
  symptomProfileId,
}: ResultsDisplayProps) {
  const [product, setProduct] = useState<ShopifyProduct | null>(null);
  const [productLoading, setProductLoading] = useState(false);
  const [productError, setProductError] = useState<string | null>(null);

  // Determine what to show based on score
  const showProduct = score >= 10; // Moderate or Severe
  const showConsultation = score >= 5 && score < 10; // Mild
  const showEducation = score < 5; // Minimal

  // Fetch product if score warrants it
  // Uses Shopify's /products/{handle}.js endpoint (no auth required)
  useEffect(() => {
    if (showProduct && region) {
      setProductLoading(true);
      setProductError(null);

      const productHandle = regionToProductHandle(region);
      console.log("Fetching product for region:", region, "-> handle:", productHandle);

      getProductByHandle(productHandle)
        .then((productData) => {
          if (productData) {
            console.log("Product found:", productData.title);
            setProduct(productData);
          } else {
            console.warn("Product not found:", productHandle);
            setProductError("Product not found for your region");
          }
          setProductLoading(false);
        })
        .catch((error) => {
          console.error("Error fetching product:", error);
          setProductError("Unable to load product recommendation");
          setProductLoading(false);
        });
    }
  }, [showProduct, region]);

  const handleAddToCart = async (variantId: number) => {
    try {
      const response = await fetch("/cart/add.js", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items: [
            {
              id: variantId,
              quantity: 1,
            },
          ],
        }),
      });

      if (response.ok) {
        // Trigger cart drawer update if available
        if ((window as any).Shopify && (window as any).Shopify.theme) {
          (window as any).Shopify.theme.cartDrawer?.open();
        } else {
          // Fallback: redirect to cart
          window.location.href = "/cart";
        }
      } else {
        alert("Unable to add product to cart. Please try again.");
      }
    } catch (error) {
      console.error("Error adding to cart:", error);
      alert("Unable to add product to cart. Please try again.");
    }
  };

  const severityInfo = SEVERITY_MESSAGES[severityLevel];

  return (
    <div className={styles.quizResults}>
      {/* Header */}
      <div className={styles.quizResults__header}>
        <h2 className={styles.quizResults__title}>Your Assessment Results</h2>
      </div>

      {/* Two Column Layout: Results (Left) | Product (Right) */}
      <div className={styles.quizResults__mainGrid}>
        {/* Left Column: Score and Recommendation */}
        <div className={styles.quizResults__leftColumn}>
          {/* Score Display */}
          <div className={styles.quizResults__scoreContainer}>
            <div className={styles.quizResults__scoreCircle}>
              <span className={styles.quizResults__scoreNumber}>{score}</span>
              <span className={styles.quizResults__scoreMax}>/60</span>
        </div>
        <div className={styles.quizResults__severity}>
              <span className={styles.quizResults__severityLabel}>Severity Level:</span>
              <span
            className={`${styles.quizResults__severityValue} ${
                  severityLevel === "minimal"
                    ? styles.quizResults__severityValueMinimal
                    : severityLevel === "mild"
                    ? styles.quizResults__severityValueMild
                    : severityLevel === "moderate"
                    ? styles.quizResults__severityValueModerate
                    : styles.quizResults__severityValueSevere
            }`}
          >
                {severityInfo.title}
              </span>
            </div>
          </div>

          {/* Recommendation Message */}
          <div className={styles.quizResults__recommendation}>
            <div className={styles.quizResults__message}>
              <h3>{severityInfo.title}</h3>
              <p>{severityInfo.text}</p>
            </div>
          </div>

          {/* Profile ID Display */}
          {symptomProfileId && (
            <div className={styles.quizResults__profile}>
              <p className={styles.quizResults__profileText}>
                Your Symptom Profile ID: <strong>{symptomProfileId}</strong>
              </p>
              <p className={styles.quizResults__profileNote}>
                Save this ID for your records. Our customer service team can reference it to view
                your detailed assessment.
              </p>
            </div>
          )}

          {/* Privacy & Disclaimer */}
          <div className={styles.quizResults__disclaimer}>
            <p>
              <strong>Important:</strong> This assessment provides product recommendations only and
              is not a medical diagnosis. Always consult with a qualified healthcare provider before
              starting any new treatment.
          </p>
        </div>

          {/* Retake Button */}
          <div className={styles.quizResults__actions}>
            <button
              type="button"
              className={styles.button}
              onClick={() => window.location.reload()}
            >
              Retake Assessment
            </button>
          </div>
        </div>

        {/* Right Column: Product Recommendation */}
        {showProduct && (
          <div className={styles.quizResults__rightColumn}>
            <div className={styles.quizResults__product}>
              <h3 className={styles.quizResults__productTitle}>Recommended for You</h3>
              {productLoading && (
                <div className={styles.quizResults__productLoading}>Loading product...</div>
              )}
              {productError && (
                <div className={styles.quizResults__productError}>{productError}</div>
              )}
              {product && !productLoading && (
                <div className={styles.quizResults__productCard}>
                  {product.featured_image && (
                    <div className={styles.quizResults__productImage}>
                      <img
                        src={product.featured_image}
                        alt={product.title}
                      />
                    </div>
                  )}
                  <div className={styles.quizResults__productInfo}>
                    <h4 className={styles.quizResults__productName}>
                      <a href={`/products/${product.handle}`}>{product.title}</a>
                    </h4>
                    <div className={styles.quizResults__productPrice}>
                      {product.compare_at_price && product.compare_at_price > product.price && (
                        <span className={styles.quizResults__comparePrice}>
                          {formatMoney(product.compare_at_price)}
                        </span>
                      )}
                      <span>{formatMoney(product.price)}</span>
                    </div>
                    {product.variants.length > 0 && (
                      <button
                        type="button"
                        className={styles.button}
                        onClick={() => handleAddToCart(product.variants[0].id)}
                        disabled={!product.variants[0].available}
                      >
                        {product.variants[0].available ? "Add to Cart" : "Sold Out"}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Consultation CTA (Score 5-9) */}
      {showConsultation && (
        <div className={styles.quizResults__consultation}>
          <h3 className={styles.quizResults__consultationTitle}>Schedule a Consultation</h3>
          <p className={styles.quizResults__consultationText}>
            We recommend speaking with one of our allergists before starting treatment.
          </p>
          <a href="/pages/contact" className={styles.button}>
            Book Free Consultation
          </a>
        </div>
      )}

      {/* Educational Content CTA (Score 0-4) */}
      {showEducation && (
        <div className={styles.quizResults__education}>
          <h3 className={styles.quizResults__educationTitle}>Learn More About Allergies</h3>
          <p className={styles.quizResults__educationText}>
            Your symptoms appear minimal at this time. Learn more about managing allergies.
        </p>
          <a href="/pages/about" className={styles.button}>
            View Resources
          </a>
      </div>
      )}
    </div>
  );
}

