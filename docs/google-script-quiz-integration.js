/**
 * Google Apps Script Web App for AlleDrops Symptom Quiz
 * Receives quiz submission data and appends to Google Sheet
 *
 * Setup Instructions:
 * 1. Create a new Google Sheet
 * 2. Add headers in Row 1 (see HEADERS constant below), or leave row 1 empty — ensureHeaders()
 *    will write the canonical headers on first POST.
 * 3. Open Extensions → Apps Script
 * 4. Paste this code
 * 5. Deploy as Web App:
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 6. Copy the web app URL to Shopify theme / quiz settings
 *
 * POST contract:
 * - Request body JSON: `{ "data": [ ...13 values in HEADERS order... ] }`
 * - Success response JSON: `{ "success": true, "rowNumber": <number> }`
 *
 * @author AlleDrops Development Team
 * @version 1.0.0
 */

// Sheet name - change if your sheet tab has a different name
const SHEET_NAME = 'Symptom Responses';

// Column headers — snake_case order must match quiz app rowData (api.quiz.submit)
const HEADERS = [
  'profile_id',
  'name',
  'email',
  'phone',
  'dob',
  'state',
  'score',
  'score_bracket',
  'date',
  'completion_time',
  'answers_json',
  'personal_history_json',
  'family_history_json'
];

/**
 * doPost - Handles POST requests from the quiz
 * This is the main entry point for the web app
 */
function doPost(e) {
  try {
    // Parse incoming JSON data
    const requestData = JSON.parse(e.postData.contents);
    const rowData = requestData.data;

    // Validate data
    if (!rowData || !Array.isArray(rowData)) {
      return createCORSResponse(
        JSON.stringify({ success: false, error: 'Invalid data format' })
      );
    }

    if (rowData.length !== HEADERS.length) {
      return createCORSResponse(JSON.stringify({
        success: false,
        error: 'Invalid row length. Expected ' + HEADERS.length + ' values, got ' + rowData.length
      }));
    }

    // Get the active spreadsheet
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);

    if (!sheet) {
      return createCORSResponse(
        JSON.stringify({ success: false, error: 'Sheet not found: ' + SHEET_NAME })
      );
    }

    // Ensure headers exist
    ensureHeaders(sheet);

    // Append the new row
    const lastRow = sheet.getLastRow();
    sheet.appendRow(rowData);
    const newRowNumber = lastRow + 1;

    // Return success response with CORS headers
    return createCORSResponse(
      JSON.stringify({
        success: true,
        rowNumber: newRowNumber
      })
    );

  } catch (error) {
    // Log error and return error response
    console.error('Error processing request:', error);
    return createCORSResponse(
      JSON.stringify({
        success: false,
        error: error.toString()
      })
    );
  }
}

/**
 * doOptions - Handles OPTIONS requests for CORS preflight
 * IMPORTANT: This function must exist for CORS preflight to work
 * Google Apps Script will call this automatically for OPTIONS requests
 */
function doOptions(e) {
  // Return empty 204 response
  // Google Apps Script web apps deployed as "Anyone" automatically add CORS headers
  return ContentService.createTextOutput('')
    .setMimeType(ContentService.MimeType.TEXT);
}

/**
 * doGet - Handles GET requests (for testing)
 * Returns a simple status message
 */
function doGet(e) {
  return createCORSResponse(
    JSON.stringify({
      status: 'AlleDrops Symptom Quiz Web App is running',
      version: '1.0.0',
      sheet: SHEET_NAME
    })
  );
}

/**
 * Create response with CORS headers
 * IMPORTANT: For CORS to work, the web app MUST be deployed with:
 * - Execute as: "Me"
 * - Who has access: "Anyone" (not "Only myself")
 *
 * Google Apps Script automatically adds CORS headers when deployed as "Anyone"
 * ContentService.setHeaders() doesn't work, so we rely on deployment settings
 */
function createCORSResponse(content) {
  // Return JSON response
  // CORS headers are automatically added by Google Apps Script when deployed correctly
  return ContentService.createTextOutput(content)
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Ensure headers exist in the first row
 * If headers don't exist, add them
 */
function ensureHeaders(sheet) {
  const firstRow = sheet.getRange(1, 1, 1, HEADERS.length).getValues()[0];

  // Check if first row is empty or doesn't match headers
  const isEmpty = firstRow.every(cell => !cell || cell === '');
  const matchesHeaders = firstRow.length === HEADERS.length &&
                         firstRow.every((cell, index) => cell === HEADERS[index]);

  if (isEmpty || !matchesHeaders) {
    // Set headers
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);

    // Format header row
    const headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#4285F4');
    headerRange.setFontColor('#FFFFFF');

    // Freeze header row
    sheet.setFrozenRows(1);
  }
}

/**
 * Test function - Run this manually to test the script
 */
function testSubmission() {
  const testData = {
    data: [
      'AOD_TEST_123',
      'Test User',
      'test@example.com',
      '6155551212',
      '1990-01-02',
      'tennessee',
      9,
      '7+',
      new Date().toISOString(),
      120,
      JSON.stringify({ taking_meds: 'no' }),
      JSON.stringify(['asthma']),
      JSON.stringify(['asthma'])
    ]
  };

  const mockEvent = {
    postData: {
      contents: JSON.stringify(testData)
    }
  };

  const result = doPost(mockEvent);
  Logger.log(result.getContent());
}
