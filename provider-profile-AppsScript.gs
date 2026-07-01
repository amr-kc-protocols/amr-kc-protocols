// ============================================================
// AMR KC — Provider Profile Directory  →  Google Sheets
// For: index.html (Field Guide Home dashboard personalization)
// Purpose: remember a provider's last name against their employee
//          number so the Home dashboard can greet them by name,
//          recognized across devices — no accounts/passwords.
// ------------------------------------------------------------
// SETUP STEPS:
//   1. Create a new Google Sheet (e.g., "AMR KC — Provider Profiles").
//   2. Paste its ID into SHEET_ID below
//      (the long string in the URL between /d/ and /edit).
//   3. Set SHEET_TAB to the tab name (default "Providers").
//   4. In Apps Script: Deploy → New deployment → Web app
//        Execute as: Me
//        Who has access: Anyone
//   5. Copy the Web App URL (ends in /exec) and paste it into
//      index.html  →  PROFILE_ENDPOINT
// ------------------------------------------------------------
// NOTE: employee number is accepted as entered — this script does
// NOT validate it against a real HR roster. It's a lightweight
// self-reported directory, not an authentication system.
// ============================================================

var SHEET_ID  = 'PASTE_YOUR_SHEET_ID_HERE';
var SHEET_TAB = 'Providers';

var COLUMNS = ['employeeNumber', 'lastName', 'createdAt', 'lastSeen'];

// ── LOOKUP — GET ?employeeNumber=1234 ───────────────────────
function doGet(e) {
  try {
    var empNum = String((e.parameter && e.parameter.employeeNumber) || '').trim();
    if (!empNum) return jsonOut({ result: 'error', message: 'Missing employeeNumber' });

    var sheet = getSheet_();
    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim().toLowerCase() === empNum.toLowerCase()) {
        return jsonOut({
          result: 'ok',
          found: true,
          profile: {
            employeeNumber: data[i][0],
            lastName: data[i][1],
            createdAt: data[i][2],
            lastSeen: data[i][3]
          }
        });
      }
    }
    return jsonOut({ result: 'ok', found: false });

  } catch (err) {
    return jsonOut({ result: 'error', message: err.toString() });
  }
}

// ── CREATE / UPDATE — POST employeeNumber, lastName ─────────
function doPost(e) {
  try {
    var params = e.parameter || {};
    var empNum = String(params.employeeNumber || '').trim();
    var lastName = String(params.lastName || '').trim();
    if (!empNum || !lastName) {
      return jsonOut({ result: 'error', message: 'Missing employeeNumber or lastName' });
    }

    var sheet = getSheet_();
    var data = sheet.getDataRange().getValues();
    var now = new Date().toISOString();

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim().toLowerCase() === empNum.toLowerCase()) {
        // Existing provider — refresh last name (in case of correction) and last-seen time
        sheet.getRange(i + 1, 2).setValue(lastName);
        sheet.getRange(i + 1, 4).setValue(now);
        return jsonOut({ result: 'ok', created: false });
      }
    }

    // New provider
    sheet.appendRow([empNum, lastName, now, now]);
    return jsonOut({ result: 'ok', created: true });

  } catch (err) {
    return jsonOut({ result: 'error', message: err.toString() });
  }
}

// ── SHEET HELPER ─────────────────────────────────────────────
function getSheet_() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName(SHEET_TAB) || ss.insertSheet(SHEET_TAB);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(COLUMNS);
    sheet.getRange(1, 1, 1, COLUMNS.length)
         .setFontWeight('bold')
         .setBackground('#173a68')
         .setFontColor('#ffffff');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function jsonOut(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── TEST (run manually in the Apps Script editor to verify access) ──
function testRoundTrip() {
  var created = doPost({ parameter: { employeeNumber: 'TEST-0001', lastName: 'Medic' } });
  Logger.log('create: ' + created.getContent());
  var found = doGet({ parameter: { employeeNumber: 'TEST-0001' } });
  Logger.log('lookup: ' + found.getContent());
}
