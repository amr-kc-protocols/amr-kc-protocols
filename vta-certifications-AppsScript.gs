// ============================================================
// AMR KC — Ventilator Academy Certifications  →  Google Sheets
// For: vta/academy.html  (Final Certification Exam + certificate)
// Purpose: retain a record of every provider who passed the final
//          exam and earned a certificate. The Sheet can be opened
//          or downloaded as Excel at any time
//          (File → Download → Microsoft Excel .xlsx).
// ------------------------------------------------------------
// SETUP STEPS:
//   1. Create a new Google Sheet (e.g., "AMR KC — VTA Certifications").
//   2. Paste its ID into SHEET_ID below
//      (the long string in the URL between /d/ and /edit).
//   3. Set SHEET_TAB to the tab name (default "Certifications").
//   4. In Apps Script: Deploy → New deployment → Web app
//        Execute as: Me
//        Who has access: Anyone
//   5. Copy the Web App URL (ends in /exec) and paste it into
//      vta/app.js  →  const VTA_LOG_ENDPOINT = "...";
// ============================================================

var SHEET_ID  = 'PASTE_YOUR_SHEET_ID_HERE';
var SHEET_TAB = 'Certifications';

// Optional: email notification on each certification ('' to disable)
var NOTIFY_EMAIL = 'jordan.jones@gmr.net';

// ── COLUMN ORDER (matches the params posted by the academy) ──
var COLUMNS = [
  'submittedAt',
  'name',
  'credential',
  'employeeNo',
  'scoreRaw',
  'scorePercent',
  'passStatus',
  'certId'
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
           .setBackground('#1E2761')
           .setFontColor('#ffffff');
      sheet.setFrozenRows(1);
    }

    var params = e.parameter || {};
    var row = COLUMNS.map(function (col) { return params[col] || ''; });
    sheet.appendRow(row);

    if (NOTIFY_EMAIL) {
      MailApp.sendEmail({
        to: NOTIFY_EMAIL,
        subject: 'VTA certification — ' + (params['name'] || '(unknown)') +
                 ' (' + (params['credential'] || '') + ')',
        body: [
          'A Ventilator Academy certification was recorded.',
          '',
          'Name:        ' + (params['name'] || ''),
          'Credential:  ' + (params['credential'] || ''),
          'Employee #:  ' + (params['employeeNo'] || ''),
          'Score:       ' + (params['scoreRaw'] || '') + ' (' + (params['scorePercent'] || '') + ')',
          'Status:      ' + (params['passStatus'] || ''),
          'Cert ID:     ' + (params['certId'] || ''),
          '',
          'Sheet: https://docs.google.com/spreadsheets/d/' + SHEET_ID
        ].join('\n')
      });
    }

    return ContentService
      .createTextOutput(JSON.stringify({ result: 'ok' }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ result: 'error', message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ── TEST (run manually in the Apps Script editor to verify access) ──
function testWrite() {
  var fake = { parameter: {
    submittedAt: new Date().toISOString(),
    name: 'TEST — Jane Medic',
    credential: 'Paramedic',
    employeeNo: '100482',
    scoreRaw: '24/25',
    scorePercent: '96%',
    passStatus: 'PASS',
    certId: 'VTA-2026-TEST00'
  }};
  Logger.log(doPost(fake).getContent());
}
