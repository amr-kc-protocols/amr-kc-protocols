// ============================================================
// AMR KC — CE Completion Log  →  Google Sheets
// For: quiz-impella-ecmo.html (and any future PWA CE module)
// Purpose: retain completion records per K.A.R. 109-5-1(f)
//          (provider keeps documentation for at least 3 years).
// ------------------------------------------------------------
// SETUP STEPS:
//   1. Create a new Google Sheet (e.g., "AMR KC — CE Completions").
//   2. Paste its ID into SHEET_ID below
//      (the long string in the URL between /d/ and /edit).
//   3. Set SHEET_TAB to the tab name (default "Completions").
//   4. In Apps Script: Deploy → New deployment → Web app
//        Execute as: Me
//        Who has access: Anyone
//   5. Copy the Web App URL (ends in /exec) and paste it into
//      quiz-impella-ecmo.html  →  CE_CONFIG.logEndpoint
// ============================================================

var SHEET_ID  = 'PASTE_YOUR_SHEET_ID_HERE';
var SHEET_TAB = 'Completions';

// Optional: email notification on each completion ('' to disable)
var NOTIFY_EMAIL = 'jordan.jones@gmr.net';

// ── COLUMN ORDER (matches the params posted by the PWA) ──────
var COLUMNS = [
  'submittedAt',
  'learnerName',
  'courseTitle',
  'courseId',
  'creditHours',
  'location',
  'scoreRaw',
  'scorePercent',
  'passStatus',
  'attestation',
  'completionId'
];

// ── MAIN HANDLER ─────────────────────────────────────────────
function doPost(e) {
  try {
    var ss    = SpreadsheetApp.openById(SHEET_ID);
    var sheet = ss.getSheetByName(SHEET_TAB) || ss.insertSheet(SHEET_TAB);

    // Auto-create a formatted header row if the sheet is empty
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(COLUMNS);
      sheet.getRange(1, 1, 1, COLUMNS.length)
           .setFontWeight('bold')
           .setBackground('#060d1f')
           .setFontColor('#ffffff');
      sheet.setFrozenRows(1);
    }

    var params = e.parameter || {};
    var row = COLUMNS.map(function(col){ return params[col] || ''; });
    sheet.appendRow(row);

    if (NOTIFY_EMAIL) {
      MailApp.sendEmail({
        to: NOTIFY_EMAIL,
        subject: 'CE completion — ' + (params['learnerName'] || '(unknown)') +
                 ' — ' + (params['courseId'] || ''),
        body: [
          'A CE module completion was recorded.',
          '',
          'Name:        ' + (params['learnerName'] || ''),
          'Course:      ' + (params['courseTitle'] || ''),
          'Course ID:   ' + (params['courseId'] || ''),
          'Credit:      ' + (params['creditHours'] || '') + ' hr',
          'Score:       ' + (params['scoreRaw'] || '') + ' (' + (params['scorePercent'] || '') + ')',
          'Status:      ' + (params['passStatus'] || ''),
          'Attestation: ' + (params['attestation'] || ''),
          'Record ID:   ' + (params['completionId'] || ''),
          '',
          'Sheet: https://docs.google.com/spreadsheets/d/' + SHEET_ID
        ].join('\n')
      });
    }

    return ContentService
      .createTextOutput(JSON.stringify({result:'ok'}))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({result:'error', message: err.toString()}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ── TEST (run manually in the Apps Script editor to verify access) ──
function testWrite() {
  var fake = {parameter: {
    submittedAt: new Date().toISOString(),
    learnerName: 'TEST — Jane Medic, NRP',
    courseTitle: 'Impella & ECMO for EMS Transport',
    courseId: 'AMRKC-CE-2026-IE01',
    creditHours: '1.00',
    location: 'Online (distributive)',
    scoreRaw: '9/10',
    scorePercent: '90%',
    passStatus: 'PASS',
    attestation: 'Yes',
    completionId: 'IE-TESTONLY-00000'
  }};
  Logger.log(doPost(fake).getContent());
}
