// function doGet() {
//   return HtmlService.createHtmlOutputFromFile('Index');
// }

function submitLog(data) {
  // Debug: Write every call to the Debug sheet and log action value and before START_OT if
  try {
    var debugSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Debug');
    if (!debugSheet) {
      debugSheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet('Debug');
    }
    debugSheet.appendRow([new Date(), 'submitLog called', JSON.stringify(data)]);
    debugSheet.appendRow([new Date(), 'data.action value', String(data.action)]);
    debugSheet.appendRow([new Date(), 'Before START_OT if', 'data.action: ' + String(data.action)]);
    debugSheet.appendRow([
      new Date(),
      'data.action details',
      'value: ' + String(data.action),
      'length: ' + String(data.action).length,
      'charCodes: ' + String(data.action).split('').map(function(c){return c.charCodeAt(0);}).join(',')
    ]);
  } catch (e) {}
  console.log('submitLog called with data:', JSON.stringify(data));

  const SHEET_NAME = "CNC LOG";
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sheet) {
    try {
      var debugSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Debug');
      if (!debugSheet) { debugSheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet('Debug'); }
      debugSheet.appendRow([new Date(), 'Early return: Sheet not found']);
    } catch (e) {}
    console.error("Sheet 'CNC LOG' not found");
    try {
      var debugSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Debug');
      if (!debugSheet) { debugSheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet('Debug'); }
      debugSheet.appendRow([new Date(), 'RETURN/THROW before OT block: Sheet not found']);
    } catch (e) {}
    throw new Error("Sheet 'CNC LOG' not found");
  }

  const values = sheet.getDataRange().getValues();

  // Check for duplicate OPEN job with the same key fields
  function isDuplicateOpenJob(data, sheet) {
    const values = sheet.getDataRange().getValues();
    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      if (
        normalizeProjectNo(row[1]) == normalizeProjectNo(data.projectNo) &&
        normalize(row[6]) == normalize(data.processName) &&
        normalize(row[7]) == normalize(data.processNo) &&
        normalize(row[8]) == normalize(data.stepNo) &&
        normalize(row[9]) == normalize(data.machineNo) &&
        normalize(row[18]) == "OPEN"
      ) {
        try {
          var debugSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Debug');
          if (!debugSheet) { debugSheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet('Debug'); }
          debugSheet.appendRow([new Date(), 'Early return: Duplicate OPEN job']);
          debugSheet.appendRow([new Date(), 'RETURN/THROW before OT block: Duplicate OPEN job']);
        } catch (e) {}
        return true;
      }
    }
    return false;
  }

  // Debug: Log right before the START_OT if block
  try {
    var debugSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Debug');
    if (!debugSheet) { debugSheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet('Debug'); }
    debugSheet.appendRow([new Date(), 'RIGHT BEFORE IF START_OT']);
  } catch (e) {}

  // ←—— HERE’S THE ONLY CHANGE: loosen the guard so START_OT/STOP_OT always enter
  if (
    data.status === "OPEN" ||
    data.action === "START_OT" ||
    data.action === "STOP_OT"
  ) {
    // START, CONTINUE, START_OT, STOP_OT, etc.
    console.log('Processing START/OT/STOP logic; action=', data.action);

    // START_OT logic
    if (String(data.action).toUpperCase().replace(/\s+/g, '') === 'START_OT') {
      try {
        var debugSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Debug');
        if (!debugSheet) { debugSheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet('Debug'); }
        debugSheet.appendRow([new Date(), 'AFTER IF START_OT']);
      } catch (e) {}
      try {
        var debugSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Debug');
        if (!debugSheet) {
          debugSheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet('Debug');
        }
        debugSheet.appendRow([new Date(), 'Entering START_OT loop', 'values.length: ' + values.length]);
      } catch (e) {}
      for (let i = values.length - 1; i > 0; i--) {
        const row = values[i];
        try {
          var debugSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Debug');
          if (!debugSheet) {
            debugSheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet('Debug');
          }
          debugSheet.appendRow([
            new Date(),
            'Comparing for OT START',
            'rowIndex: ' + i,
            'projectNo: ' + normalizeProjectNo(String(row[1])) + ' vs ' + normalizeProjectNo(String(data.projectNo)),
            'processName: ' + normalize(String(row[6])) + ' vs ' + normalize(String(data.processName)),
            'processNo: ' + normalize(String(row[7])) + ' vs ' + normalize(String(data.processNo)),
            'stepNo: ' + normalize(String(row[8])) + ' vs ' + normalize(String(data.stepNo)),
            'machineNo: ' + normalize(String(row[9])) + ' vs ' + normalize(String(data.machineNo)),
            'status: ' + row[18]
          ]);
        } catch (e) {}
        if (
          normalizeProjectNo(String(row[1])) == normalizeProjectNo(String(data.projectNo)) &&
          normalize(String(row[6])) == normalize(String(data.processName)) &&
          normalize(String(row[7])) == normalize(String(data.processNo)) &&
          normalize(String(row[8])) == normalize(String(data.stepNo)) &&
          normalize(String(row[9])) == normalize(String(data.machineNo)) &&
          (row[18] == "OPEN" || row[18] == "OT")
        ) {
          let otTimes = [];
          try { otTimes = row[25] ? JSON.parse(row[25]) : []; } catch { otTimes = []; }
          const now = new Date();
          otTimes.push({
            start: now.toISOString(),
            start_local: formatLocalTimestamp(now)
          });
          sheet.getRange(i + 1, 26).setValue(JSON.stringify(otTimes));
          sheet.getRange(i + 1, 19).setValue("OT");
          SpreadsheetApp.flush();
          Utilities.sleep(100);
          return;
        }
      }
      throw new Error("ไม่พบงานที่เปิดอยู่สำหรับการเริ่ม OT");
    }

    // STOP_OT logic
    if (data.action === 'STOP_OT') {
      for (let i = values.length - 1; i > 0; i--) {
        const row = values[i];
        console.log('Comparing for OT STOP:', {
          rowIndex: i,
          projectNo: [normalizeProjectNo(row[1]), normalizeProjectNo(data.projectNo)],
          processName: [normalize(row[6]), normalize(data.processName)],
          processNo: [normalize(row[7]), normalize(data.processNo)],
          stepNo: [normalize(row[8]), normalize(data.stepNo)],
          machineNo: [normalize(row[9]), normalize(data.machineNo)],
          status: row[18]
        });
        if (
          normalizeProjectNo(row[1]) == normalizeProjectNo(data.projectNo) &&
          normalize(row[6]) == normalize(data.processName) &&
          normalize(row[7]) == normalize(data.processNo) &&
          normalize(row[8]) == normalize(data.stepNo) &&
          normalize(row[9]) == normalize(data.machineNo) &&
          row[18] == "OT"
        ) {
          let otTimes = [];
          try { otTimes = row[25] ? JSON.parse(row[25]) : []; } catch { otTimes = []; }
          for (let j = otTimes.length - 1; j >= 0; j--) {
            if (otTimes[j].start && !otTimes[j].end) {
              const now = new Date();
              otTimes[j].end = now.toISOString();
              otTimes[j].end_local = formatLocalTimestamp(now);
              break;
            }
          }
          sheet.getRange(i + 1, 26).setValue(JSON.stringify(otTimes));
          sheet.getRange(i + 1, 19).setValue("OPEN");

          // Update OT Times summary and Total OT Duration
          let totalOtMs = 0;
          let otSummary = [];
          for (let ot of otTimes) {
            if (ot.start && ot.end) {
              const startLocal = ot.start_local || formatLocalTimestamp(ot.start);
              const endLocal = ot.end_local || formatLocalTimestamp(ot.end);
              otSummary.push(startLocal + ' - ' + endLocal);
              const start = new Date(ot.start);
              const end = new Date(ot.end);
              const ms = calculateWorkingTimeMs(start, end);
              totalOtMs += ms;
            }
          }
          sheet.getRange(i + 1, 27).setValue(otSummary.join(", "));
          sheet.getRange(i + 1, 28).setValue(msToHHMMSS(totalOtMs));

          SpreadsheetApp.flush();
          Utilities.sleep(100);
          return;
        }
      }
      throw new Error("ไม่พบงานที่อยู่ในสถานะ OT สำหรับการหยุด OT");
    }

    // CONTINUE logic
    if (data.action === "CONTINUE") {
      console.log('CONTINUE action received. Incoming data:', JSON.stringify(data));
      for (let i = values.length - 1; i > 0; i--) {
        const row = values[i];
        console.log('Checking row', i, {
          projectNo: row[1],
          processName: row[6],
          processNo: row[7],
          stepNo: row[8],
          machineNo: row[9],
          status: row[18],
          norm_projectNo: normalizeProjectNo(row[1]),
          norm_data_projectNo: normalizeProjectNo(data.projectNo),
          norm_processName: normalize(row[6]),
          norm_data_processName: normalize(data.processName),
          norm_processNo: normalize(row[7]),
          norm_data_processNo: normalize(data.processNo),
          norm_stepNo: normalize(row[8]),
          norm_data_stepNo: normalize(data.stepNo),
          norm_machineNo: normalize(row[9]),
          norm_data_machineNo: normalize(data.machineNo)
        });
        if (
          normalizeProjectNo(row[1]) == normalizeProjectNo(data.projectNo) &&
          normalize(row[6]) == normalize(data.processName) &&
          normalize(row[7]) == normalize(data.processNo) &&
          normalize(row[8]) == normalize(data.stepNo) &&
          normalize(row[9]) == normalize(data.machineNo) &&
          row[18] == "PAUSE"
        ) {
          console.log('MATCH FOUND for CONTINUE at row', i);
          sheet.getRange(i + 1, 19).setValue("OPEN");
          let pauseTimes = [];
          try { pauseTimes = JSON.parse(row[23] || "[]"); } catch { pauseTimes = []; }
          let lastPauseIdx = pauseTimes.length - 1;
          while (
            lastPauseIdx >= 0 &&
            (
              !pauseTimes[lastPauseIdx].pause ||
              pauseTimes[lastPauseIdx].resume
            )
          ) {
            lastPauseIdx--;
          }
          if (lastPauseIdx < 0) {
            throw new Error("ไม่พบช่วงเวลาหยุดที่ยังไม่ถูกดำเนินการต่อ");
          }
          const resumeTime = new Date();
          pauseTimes[lastPauseIdx].resume = resumeTime.toISOString();
          pauseTimes[lastPauseIdx].resume_local = formatLocalTimestamp(resumeTime);
          if (!pauseTimes[lastPauseIdx].pause_local && pauseTimes[lastPauseIdx].pause) {
            pauseTimes[lastPauseIdx].pause_local = formatLocalTimestamp(pauseTimes[lastPauseIdx].pause);
          }
          let totalPaused = 0;
          for (let p of pauseTimes) {
            if (p.pause && p.resume) {
              totalPaused += calculateWorkingTimeMs(new Date(p.pause), new Date(p.resume));
            }
          }
          let totalDowntime = msToHHMMSS(sumPauseTypeMs(pauseTimes, 'DOWNTIME'));
          let totalNormalPause = msToHHMMSS(sumPauseTypeMs(pauseTimes, 'PAUSE'));
          let lastDowntimeReason = getLastReasonByType(pauseTimes, 'DOWNTIME');
          let lastPauseReason = getLastReasonByType(pauseTimes, 'PAUSE');
          let reasonSummary = '';
          if (lastDowntimeReason) reasonSummary += 'Downtime: ' + lastDowntimeReason;
          if (lastPauseReason) {
            if (reasonSummary) reasonSummary += ', ';
            reasonSummary += 'Normal Pause: ' + lastPauseReason;
          }
          sheet.getRange(i + 1, 20).setValue(formatPauseTimesSummary(pauseTimes));
          sheet.getRange(i + 1, 21).setValue(totalDowntime);
          sheet.getRange(i + 1, 22).setValue(totalNormalPause);
          sheet.getRange(i + 1, 23).setValue(msToHHMMSS(totalPaused));
          sheet.getRange(i + 1, 24).setValue(JSON.stringify(pauseTimes));
          sheet.getRange(i + 1, 25).setValue(reasonSummary);
          SpreadsheetApp.flush();
          Utilities.sleep(100);
          formatRow(i + 1);
          console.log('Job resumed (PAUSE -> OPEN) at row:', i + 1);
          return;
        }
      }
      throw new Error("ไม่พบงานที่อยู่ในสถานะ PAUSE สำหรับการดำเนินการต่อ");
    }

    // Duplicate‑OPEN check
    if (isDuplicateOpenJob(data, sheet)) {
      throw new Error("พบข้อมูล OPEN ซ้ำกันในระบบ กรุณาตรวจสอบก่อนเริ่มงานใหม่");
    }

    // New OPEN row
    let logNos = [];
    if (sheet.getLastRow() > 1) {
      logNos = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues().flat();
    }
    const maxLogNo = logNos.length ? Math.max(...logNos.filter(n => !isNaN(n) && n !== "")) : 0;
    const logNo = maxLogNo + 1;
    const row = [
      logNo,
      data.projectNo || "",
      data.customerName || "",
      data.partName || "",
      "'" + (data.drawingNo || ""),
      data.quantityOrdered || "",
      data.processName || "",
      data.processNo || "",
      data.stepNo || "",
      data.machineNo || "",
      data.employeeCode || "",
      new Date(),
      "",
      "",
      "",
      "",
      "",
      "",
      "OPEN",
      "",
      0,
      0,
      0,
      JSON.stringify([])
    ];
    console.log("Appending row:", row);
    sheet.appendRow(row);
    console.log("Row appended successfully");
    formatLastRow();
    return;

  } else if (data.status === "PAUSE") {
    // PAUSE logic (unchanged)…
    console.log('PAUSE action received. Incoming data:', JSON.stringify(data));
    for (let i = values.length - 1; i > 0; i--) {
      const row = values[i];
      console.log('Checking row', i, {
        projectNo: row[1],
        processName: row[6],
        processNo: row[7],
        stepNo: row[8],
        machineNo: row[9],
        status: row[18],
        norm_projectNo: normalizeProjectNo(row[1]),
        norm_data_projectNo: normalizeProjectNo(data.projectNo),
        norm_processName: normalize(row[6]),
        norm_data_processName: normalize(data.processName),
        norm_processNo: normalize(row[7]),
        norm_data_processNo: normalize(data.processNo),
        norm_stepNo: normalize(row[8]),
        norm_data_stepNo: normalize(data.stepNo),
        norm_machineNo: normalize(row[9]),
        norm_data_machineNo: normalize(data.machineNo)
      });
      if (
        normalizeProjectNo(row[1]) == normalizeProjectNo(data.projectNo) &&
        normalize(row[6]) == normalize(data.processName) &&
        normalize(row[7]) == normalize(data.processNo) &&
        normalize(row[8]) == normalize(data.stepNo) &&
        normalize(row[9]) == normalize(data.machineNo) &&
        row[18] == "OPEN"
      ) {
        sheet.getRange(i + 1, 19).setValue("PAUSE");
        let pauseTimes = [];
        try { pauseTimes = JSON.parse(row[23] || "[]"); } catch { pauseTimes = []; }
        const now = new Date();
        const pauseType = data.pauseType || "PAUSE";
        const pauseReason = data.pauseReason || "";
        pauseTimes.push({
          type: pauseType,
          reason: pauseReason,
          pause: now.toISOString(),
          pause_local: formatLocalTimestamp(now)
        });
        let totalPaused = 0;
        for (let p of pauseTimes) {
          if (p.pause && p.resume) {
            totalPaused += calculateWorkingTimeMs(new Date(p.pause), new Date(p.resume));
          }
        }
        let totalDowntime = msToHHMMSS(sumPauseTypeMs(pauseTimes, 'DOWNTIME'));
        let totalNormalPause = msToHHMMSS(sumPauseTypeMs(pauseTimes, 'PAUSE'));
        let lastDowntimeReason = getLastReasonByType(pauseTimes, 'DOWNTIME');
        let lastPauseReason = getLastReasonByType(pauseTimes, 'PAUSE');
        let reasonSummary = '';
        if (lastDowntimeReason) reasonSummary += 'Downtime: ' + lastDowntimeReason;
        if (lastPauseReason) {
          if (reasonSummary) reasonSummary += ', ';
          reasonSummary += 'Normal Pause: ' + lastPauseReason;
        }
        sheet.getRange(i + 1, 20).setValue(formatPauseTimesSummary(pauseTimes));
        sheet.getRange(i + 1, 21).setValue(totalDowntime);
        sheet.getRange(i + 1, 22).setValue(totalNormalPause);
        sheet.getRange(i + 1, 23).setValue(msToHHMMSS(totalPaused));
        sheet.getRange(i + 1, 24).setValue(JSON.stringify(pauseTimes));
        sheet.getRange(i + 1, 25).setValue(reasonSummary);
        SpreadsheetApp.flush();
        Utilities.sleep(100);
        formatRow(i + 1);
        console.log('Job paused (OPEN -> PAUSE) at row:', i + 1);
        return;
      }
    }
    throw new Error("ไม่พบงานที่อยู่ในสถานะ OPEN สำหรับการหยุดชั่วคราว");

  } else if (data.status === "CLOSE") {
    // STOP form submission (unchanged)…
    let found = false;
    for (let i = values.length - 1; i > 0; i--) {
      const row = values[i];
      console.log('--- STOP FORM COMPARISON ---', {
        rowIndex: i,
        projectNo: row[1],
        processName: row[6],
        processNo: row[7],
        stepNo: row[8],
        machineNo: row[9],
        status: row[18],
        data: data
      });
      if (
        normalizeProjectNo(row[1]) == normalizeProjectNo(data.projectNo) &&
        normalize(row[6]) == normalize(data.processName) &&
        normalize(row[7]) == normalize(data.processNo) &&
        normalize(row[8]) == normalize(data.stepNo) &&
        normalize(row[9]) == normalize(data.machineNo)
      ) {
        if (row[18] == "PAUSE") {
          throw new Error('กรุณากด "ดำเนินงานต่อ" ก่อนที่จะกดปิดงาน งานที่คุณจะปิด อยู่ในสถานะพักงาน');
        }
        if (row[18] == "OPEN" || row[18] == "OT") {
          // --- CLOSE LOGIC START ---
          // Columns (1-based):
          // 1: Log No.
          // 2: Project No.
          // 3: Customer Name
          // 4: Part Name
          // 5: Drawing No.
          // 6: Quantity Ordered
          // 7: Process Name
          // 8: Process No.
          // 9: Step No.
          // 10: Machine No.
          // 11: รหัสพนักงาน (Start)
          // 12: Start Time
          // 13: รหัสพนักงานที่จบงาน (End Emp)
          // 14: End Time
          // 15: Process Time
          // 16: FG
          // 17: NG
          // 18: Rework
          // 19: Status
          // 20: Pause Times (summary)
          // 21: Total Downtime
          // 22: Total Normal Pause
          // 23: Total Pause Time
          // 24: Pause time Json
          // 25: เหตุผล พักงาน/Downtime
          // 26: OT Times (Json)
          // 27: OT Times (summary)
          // 28: Total OT Duration

          // Set end employee code
          sheet.getRange(i + 1, 13).setValue(data.employeeCode || "");
          // Set end time
          const endTime = new Date();
          sheet.getRange(i + 1, 14).setValue(endTime);

          // Calculate process time (excluding pauses and OT)
          const startTime = row[11] instanceof Date ? row[11] : new Date(row[11]);
          let pauseTimes = [];
          try { pauseTimes = JSON.parse(row[23] || "[]"); } catch { pauseTimes = []; }
          let otTimes = [];
          try { otTimes = row[25] ? JSON.parse(row[25]) : []; } catch { otTimes = []; }

          // Auto-stop any open OT sessions at 22:00
          if (autoStopOtSessions(otTimes)) {
            sheet.getRange(i + 1, 26).setValue(JSON.stringify(otTimes));
          }

          // Calculate total OT duration
          let totalOtMs = 0;
          let otSummary = [];
          for (let ot of otTimes) {
            if (ot.start && ot.end) {
              const startLocal = ot.start_local || formatLocalTimestamp(ot.start);
              const endLocal = ot.end_local || formatLocalTimestamp(ot.end);
              otSummary.push(startLocal + ' - ' + endLocal);
              const start = new Date(ot.start);
              const end = new Date(ot.end);
              const ms = calculateWorkingTimeMs(start, end);
              totalOtMs += ms;
            }
          }
          sheet.getRange(i + 1, 27).setValue(otSummary.join(", "));
          sheet.getRange(i + 1, 28).setValue(msToHHMMSS(totalOtMs));

          // Calculate total pause time
          let totalPaused = 0;
          for (let p of pauseTimes) {
            if (p.pause && p.resume) {
              totalPaused += calculateWorkingTimeMs(new Date(p.pause), new Date(p.resume));
            }
          }
          let totalDowntime = msToHHMMSS(sumPauseTypeMs(pauseTimes, 'DOWNTIME'));
          let totalNormalPause = msToHHMMSS(sumPauseTypeMs(pauseTimes, 'PAUSE'));
          let reasonSummary = '';
          let lastDowntimeReason = getLastReasonByType(pauseTimes, 'DOWNTIME');
          let lastPauseReason = getLastReasonByType(pauseTimes, 'PAUSE');
          if (lastDowntimeReason) reasonSummary += 'Downtime: ' + lastDowntimeReason;
          if (lastPauseReason) {
            if (reasonSummary) reasonSummary += ', ';
            reasonSummary += 'Normal Pause: ' + lastPauseReason;
          }

          // Write pause/OT summaries
          sheet.getRange(i + 1, 20).setValue(formatPauseTimesSummary(pauseTimes));
          sheet.getRange(i + 1, 21).setValue(totalDowntime);
          sheet.getRange(i + 1, 22).setValue(totalNormalPause);
          sheet.getRange(i + 1, 23).setValue(msToHHMMSS(totalPaused));
          sheet.getRange(i + 1, 24).setValue(JSON.stringify(pauseTimes));
          sheet.getRange(i + 1, 25).setValue(reasonSummary);

          // Write FG/NG/Rework
          sheet.getRange(i + 1, 16).setValue(data.fg || 0);
          sheet.getRange(i + 1, 17).setValue(data.ng || 0);
          sheet.getRange(i + 1, 18).setValue(data.rework || 0);

          // Set status to CLOSE
          sheet.getRange(i + 1, 19).setValue("CLOSE");

          // Calculate process time (from start to end, minus total pause and PLUS total OT)
          let processMs = calculateWorkingTimeMs(startTime, endTime) - totalPaused + totalOtMs;
          if (processMs < 0) processMs = 0;
          sheet.getRange(i + 1, 15).setValue(msToHHMMSS(processMs));

          // Format row
          formatRow(i + 1);
          SpreadsheetApp.flush();
          found = true;
          return;
        }
      }
    }
    if (!found) {
      // … your fallback for FAILED CLOSE (append FAILED CLOSE row + throw) remains unchanged …
      throw new Error("ไม่เจอข้อมูลของการเริ่มงาน โปรดลองอีกครั้ง");
    }
  }
}

function doPost(e) {
  var data = {};
  try {
    data = JSON.parse(e.postData.contents);
  } catch (err) {
    return ContentService.createTextOutput("Invalid JSON")
      .setMimeType(ContentService.MimeType.TEXT);
  }
  try {
    submitLog(data);
    return ContentService.createTextOutput("OK")
      .setMimeType(ContentService.MimeType.TEXT);
  } catch (err) {
    return ContentService.createTextOutput("ERROR: " + err.message)
      .setMimeType(ContentService.MimeType.TEXT);
  }
}

function doGet(e) {
  if (e.parameter.mode === 'openJobs') {
    const projectNo = normalizeProjectNo(e.parameter.projectNo || '');
    const partName = normalize(e.parameter.partName || '');
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("CNC LOG");
    const values = sheet.getDataRange().getValues();
    const openJobs = [];
    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      if (
        normalizeProjectNo(row[1]) == projectNo &&
        normalize(row[3]) == partName &&
        (row[18] == "OPEN" || row[18] == "PAUSE" || row[18] == "OT")
      ) {
        openJobs.push({
          processName: row[6],
          processNo: row[7],
          stepNo: row[8],
          machineNo: row[9],
          status: row[18]
        });
      }
    }
    return ContentService.createTextOutput(JSON.stringify(openJobs))
      .setMimeType(ContentService.MimeType.JSON);
  }
  return ContentService.createTextOutput("Invalid request");
}

// … all your helper functions (formatLastRow, formatRow, fixDrawingNoColumn, calculateWorkingTime, calculateWorkingTimeMs, msToHHMMSS, isWorkingDay, setTime, normalize, normalizeDrawingNo, normalizeProjectNo, formatLocalTimestamp, formatPauseTimesSummary, sumPauseTypeMs, getLastReasonByType, autoStopOtSessions) stay exactly as in your original file.

// Add borders and color to the last row based on status
function formatLastRow() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("CNC LOG");
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();

  // Add borders to the last row
  sheet.getRange(lastRow, 1, 1, lastCol).setBorder(true, true, true, true, true, true);

  // Center all columns except Part Name (column 4), Pause Times (col 20), and Pause Times Json (col 24), and Reason Summary (col 25)
  for (var col = 1; col <= lastCol; col++) {
    if (col === 4 || col === 20 || col === 24 || col === 25 || col === 27) {
      sheet.getRange(lastRow, col).setHorizontalAlignment("left");
    } else {
      sheet.getRange(lastRow, col).setHorizontalAlignment("center");
    }
  }

  // Get the value of the Status column (now column 19)
  var statusCell = sheet.getRange(lastRow, 19);
  var status = statusCell.getValue();
  status = (status || '').toString().trim().toUpperCase();

  // Set background and font color based on status (only the status cell)
  if (status === "OPEN") {
    statusCell.setBackground("#FFF59D"); // Yellow
    statusCell.setFontColor("#222");
    statusCell.setFontWeight("bold");
  } else if (status === "CLOSE") {
    statusCell.setBackground("#00C853"); // Vivid green
    statusCell.setFontColor("#fff");
    statusCell.setFontWeight("bold");
  } else if (status === "FAILED CLOSE") {
    statusCell.setBackground("#FF5252"); // Vivid red
    statusCell.setFontColor("#fff");
    statusCell.setFontWeight("bold");
  } else if (status === "PAUSE") {
    statusCell.setBackground("#90caf9"); // Light blue for PAUSE
    statusCell.setFontColor("#222");
    statusCell.setFontWeight("bold");
  } else if (status === "OT") {
    statusCell.setBackground("#90caf9"); // Light blue for OT
    statusCell.setFontColor("#222");
    statusCell.setFontWeight("bold");
  } else {
    statusCell.setBackground(null); // Default
    statusCell.setFontColor("#222");
    statusCell.setFontWeight("normal");
  }
}

function formatRow(rowNum) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("CNC LOG");
  var lastCol = sheet.getLastColumn();

  // Add borders to the row
  sheet.getRange(rowNum, 1, 1, lastCol).setBorder(true, true, true, true, true, true);

  // Center all columns except Part Name (column 4), Pause Times (col 20), and Pause Times Json (col 24), and Reason Summary (col 25)
  for (var col = 1; col <= lastCol; col++) {
    if (col === 4 || col === 20 || col === 24 || col === 25 || col === 27) {
      sheet.getRange(rowNum, col).setHorizontalAlignment("left");
    } else {
      sheet.getRange(rowNum, col).setHorizontalAlignment("center");
    }
  }

  // Get the value of the Status column (now column 19)
  var statusCell = sheet.getRange(rowNum, 19);
  var status = statusCell.getValue();
  status = (status || '').toString().trim().toUpperCase();

  // Set background and font color based on status (only the status cell)
  if (status === "OPEN") {
    statusCell.setBackground("#FFF59D"); // Yellow
    statusCell.setFontColor("#222");
    statusCell.setFontWeight("bold");
  } else if (status === "CLOSE") {
    statusCell.setBackground("#00C853"); // Vivid green
    statusCell.setFontColor("#fff");
    statusCell.setFontWeight("bold");
  } else if (status === "FAILED CLOSE") {
    statusCell.setBackground("#FF5252"); // Vivid red
    statusCell.setFontColor("#fff");
    statusCell.setFontWeight("bold");
  } else if (status === "PAUSE") {
    statusCell.setBackground("#90caf9"); // Light blue for PAUSE
    statusCell.setFontColor("#222");
    statusCell.setFontWeight("bold");
  } else if (status === "OT") {
    statusCell.setBackground("#90caf9"); // Light blue for OT
    statusCell.setFontColor("#222");
    statusCell.setFontWeight("bold");
  } else {
    statusCell.setBackground(null); // Default
    statusCell.setFontColor("#222");
    statusCell.setFontWeight("normal");
  }
}

function fixDrawingNoColumn() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("CNC LOG");
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) { // skip header
    var cell = data[i][4]; // Drawing No. is column 5 (index 4)
    if (cell instanceof Date) {
      // Convert date to d/m format
      var asString = cell.getDate() + '/' + (cell.getMonth() + 1);
      // Write back as a string with a leading single quote
      sheet.getRange(i + 1, 5).setValue("'" + asString);
    }
  }
}

// Helper: Calculate working time between two dates, only counting working hours
function calculateWorkingTime(start, end) {
  // Working hours: Mon-Sat, 08:30–12:00 and 13:00–16:45
  // Break: 15:00–15:10 (excluded)
  const WORK_START = { h: 8, m: 30 };
  const LUNCH_START = { h: 12, m: 0 };
  const LUNCH_END = { h: 13, m: 0 };
  const BREAK_START = { h: 15, m: 0 };
  const BREAK_END = { h: 15, m: 10 };
  const WORK_END = { h: 16, m: 45 };

  let totalMs = 0;
  let current = new Date(start);

  while (current < end) {
    if (isWorkingDay(current)) {
      // Morning session: 08:30–12:00
      let morningStart = setTime(current, WORK_START.h, WORK_START.m);
      let morningEnd = setTime(current, LUNCH_START.h, LUNCH_START.m);
      if (end > morningStart && start < morningEnd) {
        let sessionStart = new Date(Math.max(current, morningStart));
        let sessionEnd = new Date(Math.min(end, morningEnd));
        if (sessionEnd > sessionStart) totalMs += sessionEnd - sessionStart;
      }

      // Afternoon session 1: 13:00–15:00
      let afternoonStart = setTime(current, LUNCH_END.h, LUNCH_END.m);
      let breakStart = setTime(current, BREAK_START.h, BREAK_START.m);
      if (end > afternoonStart && start < breakStart) {
        let sessionStart = new Date(Math.max(current, afternoonStart));
        let sessionEnd = new Date(Math.min(end, breakStart));
        if (sessionEnd > sessionStart) totalMs += sessionEnd - sessionStart;
      }

      // Afternoon session 2: 15:10–16:45
      let breakEnd = setTime(current, BREAK_END.h, BREAK_END.m);
      let afternoonEnd = setTime(current, WORK_END.h, WORK_END.m);
      if (end > breakEnd && start < afternoonEnd) {
        let sessionStart = new Date(Math.max(current, breakEnd));
        let sessionEnd = new Date(Math.min(end, afternoonEnd));
        if (sessionEnd > sessionStart) totalMs += sessionEnd - sessionStart;
      }
    }
    // Move to next day
    current = setTime(new Date(current.getFullYear(), current.getMonth(), current.getDate() + 1), WORK_START.h, WORK_START.m);
  }

  // Convert ms to HH:mm:ss
  const totalSeconds = Math.floor(totalMs / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

// Helper: Calculate working time in ms between two dates, only counting working hours
function calculateWorkingTimeMs(start, end) {
  // Working hours: Mon-Sat, 08:30–12:00 and 13:00–16:45
  // Break: 15:00–15:10 (excluded)
  const WORK_START = { h: 8, m: 30 };
  const LUNCH_START = { h: 12, m: 0 };
  const LUNCH_END = { h: 13, m: 0 };
  const BREAK_START = { h: 15, m: 0 };
  const BREAK_END = { h: 15, m: 10 };
  const WORK_END = { h: 16, m: 45 };

  let totalMs = 0;
  let current = new Date(start);

  while (current < end) {
    if (isWorkingDay(current)) {
      // Morning session: 08:30–12:00
      let morningStart = setTime(current, WORK_START.h, WORK_START.m);
      let morningEnd = setTime(current, LUNCH_START.h, LUNCH_START.m);
      if (end > morningStart && start < morningEnd) {
        let sessionStart = new Date(Math.max(current, morningStart));
        let sessionEnd = new Date(Math.min(end, morningEnd));
        if (sessionEnd > sessionStart) totalMs += sessionEnd - sessionStart;
      }

      // Afternoon session 1: 13:00–15:00
      let afternoonStart = setTime(current, LUNCH_END.h, LUNCH_END.m);
      let breakStart = setTime(current, BREAK_START.h, BREAK_START.m);
      if (end > afternoonStart && start < breakStart) {
        let sessionStart = new Date(Math.max(current, afternoonStart));
        let sessionEnd = new Date(Math.min(end, breakStart));
        if (sessionEnd > sessionStart) totalMs += sessionEnd - sessionStart;
      }

      // Afternoon session 2: 15:10–16:45
      let breakEnd = setTime(current, BREAK_END.h, BREAK_END.m);
      let afternoonEnd = setTime(current, WORK_END.h, WORK_END.m);
      if (end > breakEnd && start < afternoonEnd) {
        let sessionStart = new Date(Math.max(current, breakEnd));
        let sessionEnd = new Date(Math.min(end, afternoonEnd));
        if (sessionEnd > sessionStart) totalMs += sessionEnd - sessionStart;
      }
    }
    // Move to next day
    current = setTime(new Date(current.getFullYear(), current.getMonth(), current.getDate() + 1), WORK_START.h, WORK_START.m);
  }
  return totalMs;
}

// Helper: Convert ms to HH:mm:ss
function msToHHMMSS(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function isWorkingDay(date) {
  const day = date.getDay();
  // Sunday = 0, Saturday = 6
  return day >= 1 && day <= 6;
}

function setTime(date, h, m) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), h, m, 0, 0);
}

function normalize(str) {
  // Convert to string, trim, remove invisible/zero-width chars, normalize Unicode, and lowercase
  return (str || '')
    .toString()
    .normalize('NFKC')
    .replace(/[\u200B-\u200D\uFEFF\u00A0\u202F\u2060\u180E]/g, '') // Remove zero-width/invisible spaces
    .replace(/\s+/g, ' ') // Collapse multiple spaces
    .trim()
    .toLowerCase();
}

function normalizeDrawingNo(str) {
  return (str || '').toString().replace(/^'/, '').trim().toLowerCase();
}

// Robust normalization for project numbers: remove leading zeros, invisible chars, normalize Unicode, trim, lowercase
function normalizeProjectNo(str) {
  return (str || '')
    .toString()
    .replace(/^0+/, '') // Remove leading zeros
    .normalize('NFKC')
    .replace(/[\u200B-\u200D\uFEFF\u00A0\u202F\u2060\u180E]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

// Helper: Format date as 'M/D/YYYY HH:mm:ss' in local time
function formatLocalTimestamp(date) {
  const d = new Date(date);
  const M = d.getMonth() + 1;
  const D = d.getDate();
  const Y = d.getFullYear();
  const h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, '0');
  const s = d.getSeconds().toString().padStart(2, '0');
  return `${M}/${D}/${Y} ${h}:${m}:${s}`;
}

// Helper: Format pause/resume summary for sheet
function formatPauseTimesSummary(pauseTimes) {
  if (!pauseTimes || !pauseTimes.length) return '';
  return pauseTimes.map(p => {
    if (p.pause && p.resume) {
      var duration = msToHHMMSS(calculateWorkingTimeMs(new Date(p.pause), new Date(p.resume)));
      var typeLabel = (p.type === 'DOWNTIME') ? 'Downtime' : 'Normal Pause';
      return duration + ' (' + typeLabel + ')';
    }
    return '';
  }).filter(Boolean).join(', ');
}

function sumPauseTypeMs(pauseTimes, type) {
  if (!pauseTimes) return 0;
  return pauseTimes.reduce(function(sum, p) {
    if (p.type === type && p.pause && p.resume) {
      return sum + calculateWorkingTimeMs(new Date(p.pause), new Date(p.resume));
    }
    return sum;
  }, 0);
}

function getLastReasonByType(pauseTimes, type) {
  if (!pauseTimes) return '';
  for (let i = pauseTimes.length - 1; i >= 0; i--) {
    if (pauseTimes[i].type === type && pauseTimes[i].reason) {
      return pauseTimes[i].reason;
    }
  }
  return '';
}

// Helper: Set OT end to 22:00 if not stopped, and add a note
function autoStopOtSessions(otTimes) {
  let changed = false;
  otTimes.forEach(ot => {
    if (ot.start && !ot.end) {
      const startDate = new Date(ot.start);
      const now = new Date();
      // 22:30 of the same day as OT start
      const otEnd = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), 22, 30, 0, 0);
      if (now > otEnd) {
        ot.end = otEnd.toISOString();
        ot.end_local = formatLocalTimestamp(otEnd);
        ot.autoStopped = true;
        ot.note = 'OT stopped automatically at 22:00';
        changed = true;
      }
    }
  });
  return changed;
}