// ============================================================
// AMR KC — Orientation Exit Survey → Google Sheets
// ------------------------------------------------------------
// SETUP STEPS:
//   1. Create a new Google Sheet. Name it anything you like.
//   2. Paste the Sheet's ID into SHEET_ID below.
//      (The ID is the long string in the URL between /d/ and /edit)
//   3. Set SHEET_TAB to the tab name (default "Sheet1").
//   4. In Apps Script: Deploy → New deployment → Web app
//        Execute as: Me
//        Who has access: Anyone
//   5. Copy the Web App URL and paste it into orientation-exit-survey.html
//        var SCRIPT_URL = 'https://script.google.com/macros/s/YOUR_ID/exec';
// ============================================================

var SHEET_ID  = 'YOUR_GOOGLE_SHEET_ID_HERE';
var SHEET_TAB = 'Sheet1';

// Optional: get an email notification on each submission
var NOTIFY_EMAIL = 'jordan.jones@gmr.net';  // set to '' to disable

// ── COLUMN ORDER ─────────────────────────────────────────────
// Must match the header row in your Sheet exactly.
// Add a header row to row 1 before first submission, or let
// the script create it automatically on first run.
var COLUMNS = [
  'submittedAt',
  'fullName',
  'employeeNumber',
  'certLevel',
  'station',       // Unit Call Sign (KC210, AD101, etc.)
  'orientationEndDate',  // Date of most recent shift with FTO
  'orientationLength',   // Number of shifts with an FTO
  'overallRating',
  'overallExperience',
  'growthAreas',
  'programImprovements',
  'readinessLevel',
  'nextHireAdvice',
  'ftoList',
  'ftoRating',
  'ftoStandout',
  'ftoConstructiveFeedback',
  'ftoOutstandingQualities',
  'missingPcrComm',
  'pcrTransmission24hr',
  'pcrFinalizeVsPost',
  'ePCROrientation',
  'paperSignatures',
  'unitResponsibility',
  'cleanUnit',
  'assignedEquipmentOnly',
  'fluidChecks',
  'cotSwapping',
  'truckSuppliesLocations',
  'ptoCallOff',
  'uniformConcerns',
  'uniformConcernDetail',
  'fuelPin',
  'metSupervisor',
  'hrPortalAccess',
  'incidentReporting',
  'blsNarcoticCheck',
  'ventOnBlsResponse',
  'additionalQuestions'
];

// ── MAIN HANDLER ─────────────────────────────────────────────
function doPost(e) {
  try {
    var ss    = SpreadsheetApp.openById(SHEET_ID);
    var sheet = ss.getSheetByName(SHEET_TAB);

    // Auto-create header row if sheet is empty
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(COLUMNS);
      sheet.getRange(1, 1, 1, COLUMNS.length)
           .setFontWeight('bold')
           .setBackground('#060d1f')
           .setFontColor('#ffffff');
      sheet.setFrozenRows(1);
    }

    // Build row from posted parameters
    var params = e.parameter;
    var row = COLUMNS.map(function(col) {
      return params[col] || '';
    });

    sheet.appendRow(row);

    // Optional email notification
    if (NOTIFY_EMAIL) {
      var name    = params['fullName']    || '(unknown)';
      var cert    = params['certLevel']   || '';
      var station = params['station']     || '';
      var rating  = params['overallRating'] || '';
      MailApp.sendEmail({
        to: NOTIFY_EMAIL,
        subject: 'New orientation survey — ' + name,
        body: [
          'A new orientation exit survey was submitted.',
          '',
          'Name:     ' + name,
          'Cert:     ' + cert,
          'Station:  ' + station,
          'Rating:   ' + rating + ' / 5',
          '',
          'View the sheet: https://docs.google.com/spreadsheets/d/' + SHEET_ID
        ].join('\n')
      });
    }

    return ContentService
      .createTextOutput(JSON.stringify({result: 'ok'}))
      .setMimeType(ContentService.MimeType.JSON);

  } catch(err) {
    return ContentService
      .createTextOutput(JSON.stringify({result: 'error', message: err.toString()}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ── TEST FUNCTION (run manually to verify sheet access) ──────
function testWrite() {
  var fake = {parameter: {}};
  COLUMNS.forEach(function(c){ fake.parameter[c] = 'TEST — ' + c; });
  fake.parameter['submittedAt'] = new Date().toLocaleString();
  var result = doPost(fake);
  Logger.log(result.getContent());
}
