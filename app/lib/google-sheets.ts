/**
 * Google Sheets integration
 * Option A: Keep Google Apps Script (simpler for Phase 1)
 * Option B: Use Google Sheets API directly (for later phases)
 */

/**
 * Submit quiz data to Google Sheets via Apps Script
 * Migrated from Google Apps Script integration
 * 
 * @param data - Row data array matching Google Sheets HEADERS format
 * @param webAppUrl - Google Apps Script web app URL
 * @returns Success status and row number
 */
export async function submitToGoogleSheets(
  data: unknown[],
  webAppUrl: string
): Promise<{ success: boolean; rowNumber?: number; error?: string }> {
  try {
    const response = await fetch(webAppUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ data }),
    });

    if (!response.ok) {
      throw new Error(`Google Sheets API error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error("Google Sheets submission error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}



