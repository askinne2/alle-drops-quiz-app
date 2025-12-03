import type { LoaderFunctionArgs } from "react-router";
import { redirect, Form, useLoaderData } from "react-router";

import { login } from "../../shopify.server";

import styles from "./styles.module.css";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);

  if (url.searchParams.get("shop")) {
    throw redirect(`/app?${url.searchParams.toString()}`);
  }

  return { showForm: Boolean(login) };
};

export default function App() {
  const { showForm } = useLoaderData<typeof loader>();

  return (
    <div className={styles.index}>
      <div className={styles.content}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.logo}>
            <svg className={styles.logoIcon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" fill="currentColor"/>
            </svg>
            <span className={styles.logoText}>AlleDrops</span>
          </div>
        </div>

        {/* Hero Section */}
        <div className={styles.hero}>
          <h1 className={styles.heading}>
            Personalized Allergy<br />
            <span className={styles.headingAccent}>Assessment Quiz</span>
          </h1>
          <p className={styles.tagline}>
            Help your customers discover their allergy profile and receive 
            personalized product recommendations with our comprehensive symptom quiz.
        </p>
        </div>

        {/* Login Form */}
        {showForm && (
          <div className={styles.formContainer}>
            <h2 className={styles.formTitle}>Merchant Login</h2>
          <Form className={styles.form} method="post" action="/auth/login">
            <label className={styles.label}>
                <span className={styles.labelText}>Shop domain</span>
                <input 
                  className={styles.input} 
                  type="text" 
                  name="shop" 
                  placeholder="your-store.myshopify.com"
                />
            </label>
            <button className={styles.button} type="submit">
                Access Dashboard
            </button>
          </Form>
          </div>
        )}

        {/* Features */}
        <div className={styles.features}>
          <div className={styles.feature}>
            <div className={styles.featureIcon}>
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" fill="currentColor"/>
              </svg>
            </div>
            <h3 className={styles.featureTitle}>Comprehensive Assessment</h3>
            <p className={styles.featureText}>
              Evidence-based questions covering indoor, outdoor, seasonal, and environmental allergens.
            </p>
          </div>
          <div className={styles.feature}>
            <div className={styles.featureIcon}>
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" fill="currentColor"/>
              </svg>
            </div>
            <h3 className={styles.featureTitle}>Regional Drops</h3>
            <p className={styles.featureText}>
              Personalized product recommendations based on customer location and specific allergen exposure.
            </p>
          </div>
          <div className={styles.feature}>
            <div className={styles.featureIcon}>
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14h-2v-4H6v-2h4V7h2v4h4v2h-4v4z" fill="currentColor"/>
              </svg>
            </div>
            <h3 className={styles.featureTitle}>HIPAA Compliant</h3>
            <p className={styles.featureText}>
              Secure data handling with external storage for sensitive health information.
            </p>
          </div>
        </div>

        {/* Footer */}
        <footer className={styles.footer}>
          <p>© {new Date().getFullYear()} Allergist on Demand. All rights reserved.</p>
          <p className={styles.footerLinks}>
            <a href="https://allergistondemand.com" target="_blank" rel="noopener noreferrer">
              Visit Store
            </a>
          </p>
        </footer>
      </div>
    </div>
  );
}
