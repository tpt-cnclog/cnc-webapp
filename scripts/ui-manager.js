// ui-manager.js - UI management and navigation functions
// Contains all screen navigation, modal handling, loading states, and display functions

/**
 * Shows a specific screen and hides all others
 * @param {string} id - The ID of the screen to show
 */
function showScreen(id) {
    document.querySelectorAll('main > *').forEach(el => el.style.display = 'none');
    document.getElementById(id).style.display = '';
    
    if (id === 'scan-screen') {
        scanHandled = false;
        startScan();
        document.getElementById('start-job-info').innerHTML = '';
        document.getElementById('stop-job-info').innerHTML = '';
        document.getElementById('job-info').innerHTML = '';
    } else {
        // Stop QR scanner when leaving scan screen
        if (window.qrScanner) {
            window.qrScanner.stop().catch(()=>{});
            window.qrScanner = null;
        }
        const qrReader = document.getElementById('qr-reader');
        qrReader.classList.remove('active');
        if (qrReader.querySelector('.scan-line')) qrReader.querySelector('.scan-line').remove();
    }
    
    if (id === 'start-form') {
        fillJobInfo('start-job-info');
        // Check for potential duplicates when showing start form
        checkAndWarnAboutPotentialDuplicates();
    }
    
    if (id === 'stop-form') {
        fillJobInfo('stop-job-info');
        updateStopFormFields();
    }
}

/**
 * Fills job information into a container
 * @param {string} containerId - The ID of the container to fill
 */
function fillJobInfo(containerId) {
    const el = document.getElementById(containerId);
    el.innerHTML = `
        <p><strong>Project Number:</strong> <input readonly value="${qrData.projectNo||''}"></p>
        <p><strong>Customer Name:</strong> <input readonly value="${qrData.customerName||''}"></p>
        <p><strong>Part Name:</strong> <input readonly value="${qrData.partName||''}"></p>
        <p><strong>Drawing Number:</strong> <input readonly value="${qrData.drawingNo||''}"></p>
        <p><strong>Quantity Ordered:</strong> <input readonly value="${qrData.quantityOrdered||''}"></p>
    `;
}

/**
 * Shows loading overlay for open jobs operations
 */
function showOpenJobsLoading() {
    closeOpenJobsSelector(); // Remove any previous modal/overlay
    let overlay = document.createElement('div');
    overlay.id = 'open-jobs-overlay';
    overlay.style = 'position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.35); z-index:999;';
    document.body.appendChild(overlay);
    
    let loader = document.createElement('div');
    loader.id = 'open-jobs-loading';
    loader.style = 'position:fixed; left:0; right:0; top:40vh; margin:0 auto; z-index:1000; display:flex; flex-direction:column; align-items:center;';
    loader.innerHTML = `<div class="loader-spinner" style="width:56px; height:56px; border-width:7px;"></div><div style="margin-top:18px; color:#fff; font-size:1.2rem;">กำลังโหลดข้อมูล...</div>`;
    document.body.appendChild(loader);
}

/**
 * Hides loading overlay for open jobs operations
 */
function hideOpenJobsLoading() {
    let loader = document.getElementById('open-jobs-loading');
    if (loader) loader.remove();
    let overlay = document.getElementById('open-jobs-overlay');
    if (overlay) overlay.remove();
}

/**
 * Shows open jobs table selector modal
 * @param {Array} openJobs - Array of open job objects
 * @param {string} mode - Mode: 'stop' or 'pause'
 */
function showOpenJobsTableSelector(openJobs, mode = 'stop') {
    // Sort by processName, then processNo (numeric), then stepNo (numeric)
    openJobs.sort((a, b) => {
        if (a.processName < b.processName) return -1;
        if (a.processName > b.processName) return 1;
        const aProcNo = parseInt(a.processNo, 10);
        const bProcNo = parseInt(b.processNo, 10);
        if (aProcNo !== bProcNo) return aProcNo - bProcNo;
        const aStepNo = parseInt(a.stepNo, 10);
        const bStepNo = parseInt(b.stepNo, 10);
        return aStepNo - bStepNo;
    });
    
    // Remove any existing selector or overlay
    let selectorDiv = document.getElementById('open-jobs-selector');
    if (selectorDiv) selectorDiv.remove();
    let overlay = document.getElementById('open-jobs-overlay');
    if (overlay) overlay.remove();

    // Add semi-transparent overlay
    overlay = document.createElement('div');
    overlay.id = 'open-jobs-overlay';
    overlay.style = 'position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.35); z-index:999;';
    document.body.appendChild(overlay);

    selectorDiv = document.createElement('div');
    selectorDiv.id = 'open-jobs-selector';
    selectorDiv.style = 'background: #fff; border-radius: 18px; padding: 24px; box-shadow: 0 2px 24px #0005; max-width: 500px; margin: 30px auto; position: fixed; left: 0; right: 0; top: 10vh; z-index: 1000;';

    let headerText = 'เลือกงานที่ต้องการจะปิด';
    if (mode === 'pause') {
        headerText = 'เลือกงานที่ต้องการจะหยุดชั่วคราว';
    } else if (mode === 'ot') {
        headerText = 'เลือกงานที่ต้องการเริ่ม OT';
    } else if (mode === 'stop-ot') {
        headerText = 'เลือกงานที่ต้องการปิด OT';
    }
    let html = `<h2 style="text-align:center;">${headerText}</h2>`;
    
    if (openJobs.length === 0) {
        html += `<div style="text-align:center; padding: 32px 0;">
            <div style="font-size:1.3rem; color:#b71c1c; margin-bottom:24px;">ไม่พบข้อมูลการเริ่มของงานนี้</div>
            <button onclick="closeOpenJobsSelector(); showScreen('info-screen');" style="padding:10px 32px; border-radius:10px; background:#1976d2; color:#fff; border:none; font-size:1.1rem; cursor:pointer;">กลับ</button>
        </div>`;
    } else {
        html += `<table style="width:100%; border-collapse:collapse; margin: 0 auto;">
            <thead>
                <tr>
                    <th>Process Name</th>
                    <th>Process No.</th>
                    <th>Step No.</th>
                    <th>Machine No.</th>
                    <th></th>
                </tr>
            </thead>
            <tbody>`;
        
        openJobs.forEach((job, idx) => {
            let actionFunction = 'stopSelectedJob';
            let buttonText = 'ปิดงาน';
            let buttonColor = '#ff5722';
            
            if (mode === 'pause') {
                actionFunction = 'pauseSelectedJob';
                buttonText = 'หยุดชั่วคราว';
                buttonColor = '#ff9800';
            } else if (mode === 'ot') {
                actionFunction = 'startOTSelectedJob';
                buttonText = 'เริ่ม OT';
                buttonColor = '#2196f3';
            } else if (mode === 'stop-ot') {
                actionFunction = 'stopOTSelectedJob';
                buttonText = 'ปิด OT';
                buttonColor = '#f44336';
            }
            
            html += `<tr>
                <td style="text-align:center; padding:4px 8px;">${job.processName}</td>
                <td style="text-align:center; padding:4px 8px;">${job.processNo}</td>
                <td style="text-align:center; padding:4px 8px;">${job.stepNo}</td>
                <td style="text-align:center; padding:4px 8px;">${job.machineNo || ''}</td>
                <td style="text-align:center; padding:4px 8px;">
                    <button onclick="${actionFunction}(${idx})" style="padding:4px 12px; border-radius:6px; background:${buttonColor}; color:#fff; border:none; cursor:pointer;">${buttonText}</button>
                </td>
            </tr>`;
        });
        
        html += `</tbody></table>
            <div style="text-align:center; margin-top:18px;">
                <button onclick="closeOpenJobsSelector()" style="padding:8px 24px; border-radius:8px; background:#aaa; color:#fff; border:none; cursor:pointer;">ยกเลิก</button>
            </div>`;
    }
    
    selectorDiv.innerHTML = html;
    document.body.appendChild(selectorDiv);
    
    // Store jobs globally for selection
    window._openJobs = openJobs;
}

/**
 * Shows pause jobs table selector modal
 * @param {Array} openJobs - Array of open job objects that can be paused
 */
function showPauseJobsTableSelector(openJobs) {
    // Filter jobs with status OPEN or OT (both can be paused)
    const pausableJobs = openJobs.filter(job => job.status === 'OPEN' || job.status === 'OT');
    
    // Remove any existing selector or overlay
    let selectorDiv = document.getElementById('pause-jobs-selector');
    if (selectorDiv) selectorDiv.remove();
    let overlay = document.getElementById('open-jobs-overlay');
    if (overlay) overlay.remove();

    // Add semi-transparent overlay
    overlay = document.createElement('div');
    overlay.id = 'open-jobs-overlay';
    overlay.style = 'position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.35); z-index:999;';
    document.body.appendChild(overlay);

    selectorDiv = document.createElement('div');
    selectorDiv.id = 'pause-jobs-selector';
    selectorDiv.style = 'background: #fff; border-radius: 18px; padding: 24px; box-shadow: 0 2px 24px #0005; max-width: 500px; margin: 30px auto; position: fixed; left: 0; right: 0; top: 10vh; z-index: 1000;';

    let html = `<h2 style="text-align:center;">เลือกงานที่ต้องการหยุดชั่วคราว</h2>`;
    
    if (pausableJobs.length === 0) {
        html += `<div style="text-align:center; padding: 32px 0;">
            <div style="font-size:1.3rem; color:#b71c1c; margin-bottom:24px;">ไม่มีงานที่สามารถหยุดชั่วคราวได้</div>
            <button onclick="closePauseJobsSelector(); showScreen('info-screen');" style="padding:10px 32px; border-radius:10px; background:#1976d2; color:#fff; border:none; font-size:1.1rem; cursor:pointer;">กลับ</button>
        </div>`;
    } else {
        html += `<table style="width:100%; border-collapse:collapse; margin: 0 auto;">
            <thead>
                <tr>
                    <th>Process Name</th>
                    <th>Process No.</th>
                    <th>Step No.</th>
                    <th>Machine No.</th>
                    <th>Status</th>
                    <th></th>
                </tr>
            </thead>
            <tbody>`;
        
        pausableJobs.forEach((job, idx) => {
            // Style status cell based on job status
            const statusStyle = job.status === 'OT' 
                ? 'background:#42a5f5; color:#000; font-weight:bold; padding:4px 8px; border-radius:4px;'
                : 'background:#FFF59D; color:#222; font-weight:bold; padding:4px 8px; border-radius:4px;';
            
            html += `<tr>
                <td style="text-align:center; padding:4px 8px;">${job.processName}</td>
                <td style="text-align:center; padding:4px 8px;">${job.processNo}</td>
                <td style="text-align:center; padding:4px 8px;">${job.stepNo}</td>
                <td style="text-align:center; padding:4px 8px;">${job.machineNo || ''}</td>
                <td style="text-align:center; padding:4px 8px;">
                    <span style="${statusStyle}">${job.status}</span>
                </td>
                <td style="text-align:center; padding:4px 8px;">
                    <button onclick="pauseSelectedJob(${idx})" style="padding:4px 12px; border-radius:6px; background:#ff9800; color:#fff; border:none; cursor:pointer;">หยุดชั่วคราว</button>
                </td>
            </tr>`;
        });
        
        html += `</tbody></table>
            <div style="text-align:center; margin-top:18px;">
                <button onclick="closePauseJobsSelector()" style="padding:8px 24px; border-radius:8px; background:#aaa; color:#fff; border:none; cursor:pointer;">ยกเลิก</button>
            </div>`;
    }
    
    selectorDiv.innerHTML = html;
    document.body.appendChild(selectorDiv);
    
    // Store jobs globally for selection
    window._pauseJobs = pausableJobs;
}

/**
 * Shows continue jobs table selector modal
 * @param {Array} pausedJobs - Array of paused job objects
 */
function showContinueJobsTableSelector(pausedJobs) {
    // Remove any existing selector or overlay
    let selectorDiv = document.getElementById('continue-jobs-selector');
    if (selectorDiv) selectorDiv.remove();
    let overlay = document.getElementById('open-jobs-overlay');
    if (overlay) overlay.remove();

    // Add semi-transparent overlay
    overlay = document.createElement('div');
    overlay.id = 'open-jobs-overlay';
    overlay.style = 'position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.35); z-index:999;';
    document.body.appendChild(overlay);

    selectorDiv = document.createElement('div');
    selectorDiv.id = 'continue-jobs-selector';
    selectorDiv.style = 'background: #fff; border-radius: 18px; padding: 24px; box-shadow: 0 2px 24px #0005; max-width: 500px; margin: 30px auto; position: fixed; left: 0; right: 0; top: 10vh; z-index: 1000;';

    let html = `<h2 style="text-align:center;">เลือกงานที่ต้องการดำเนินการต่อ</h2>`;
    
    if (pausedJobs.length === 0) {
        html += `<div style="text-align:center; padding: 32px 0;">
            <div style="font-size:1.3rem; color:#b71c1c; margin-bottom:24px;">ไม่มีงานที่หยุดชั่วคราว</div>
            <button onclick="closeContinueJobsSelector(); showScreen('info-screen');" style="padding:10px 32px; border-radius:10px; background:#1976d2; color:#fff; border:none; font-size:1.1rem; cursor:pointer;">กลับ</button>
        </div>`;
    } else {
        html += `<table style="width:100%; border-collapse:collapse; margin: 0 auto;">
            <thead>
                <tr>
                    <th>Process Name</th>
                    <th>Process No.</th>
                    <th>Step No.</th>
                    <th>Machine No.</th>
                    <th>Status</th>
                    <th></th>
                </tr>
            </thead>
            <tbody>`;
        
        pausedJobs.forEach((job, idx) => {
            html += `<tr>
                <td style="text-align:center; padding:4px 8px;">${job.processName}</td>
                <td style="text-align:center; padding:4px 8px;">${job.processNo}</td>
                <td style="text-align:center; padding:4px 8px;">${job.stepNo}</td>
                <td style="text-align:center; padding:4px 8px;">${job.machineNo || ''}</td>
                <td style="text-align:center; padding:4px 8px; font-weight:bold; color:${job.status === 'PAUSE' ? '#ff9800' : '#f44336'};">${job.status}</td>
                <td style="text-align:center; padding:4px 8px;">
                    <button onclick="continueSelectedJob(${idx})" style="padding:4px 12px; border-radius:6px; background:#4caf50; color:#fff; border:none; cursor:pointer;">ดำเนินการต่อ</button>
                </td>
            </tr>`;
        });
        
        html += `</tbody></table>
            <div style="text-align:center; margin-top:18px;">
                <button onclick="closeContinueJobsSelector()" style="padding:8px 24px; border-radius:8px; background:#aaa; color:#fff; border:none; cursor:pointer;">ยกเลิก</button>
            </div>`;
    }
    
    selectorDiv.innerHTML = html;
    document.body.appendChild(selectorDiv);
    
    // Store jobs globally for selection
    window._continueJobs = pausedJobs;
}

/**
 * Closes the open jobs selector modal
 */
function closeOpenJobsSelector() {
    let selectorDiv = document.getElementById('open-jobs-selector');
    if (selectorDiv) selectorDiv.remove();
    let overlay = document.getElementById('open-jobs-overlay');
    if (overlay) overlay.remove();
    let loader = document.getElementById('open-jobs-loading');
    if (loader) loader.remove();
}

/**
 * Closes the pause jobs selector modal
 */
function closePauseJobsSelector() {
    let selectorDiv = document.getElementById('pause-jobs-selector');
    if (selectorDiv) selectorDiv.remove();
    let overlay = document.getElementById('open-jobs-overlay');
    if (overlay) overlay.remove();
    let loader = document.getElementById('open-jobs-loading');
    if (loader) loader.remove();
}

/**
 * Closes the continue jobs selector modal
 */
function closeContinueJobsSelector() {
    let selectorDiv = document.getElementById('continue-jobs-selector');
    if (selectorDiv) selectorDiv.remove();
    let overlay = document.getElementById('open-jobs-overlay');
    if (overlay) overlay.remove();
    let loader = document.getElementById('open-jobs-loading');
    if (loader) loader.remove();
}

/**
 * Closes the pause reason modal
 */
function closePauseReasonModal() {
    const modal = document.getElementById('pause-reason-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

/**
 * Closes the machine setting modal
 */
function closeMachineSettingModal() {
    document.getElementById('machine-setting-modal').style.display = 'none';
}

/**
 * Closes the OT modal
 */
function closeOTModal() {
    document.getElementById('ot-modal').style.display = 'none';
}

/**
 * Shows the daily report open jobs selector first
 */
function showDailyReportModal() {
    if (!qrData || Object.keys(qrData).length === 0) {
        alert('กรุณาสแกน QR Code หรือใส่ข้อมูลงานก่อน');
        return;
    }
    
    // First show open jobs selector for daily report
    fetchOpenJobsAndShowDailyReportSelector();
}

/**
 * Fetches open jobs and shows daily report job selector
 */
function fetchOpenJobsAndShowDailyReportSelector() {
    showOpenJobsLoading();
    
    fetchOpenJobs(qrData.projectNo, qrData.partName)
        .then(openJobs => {
            hideOpenJobsLoading();
            // Show all open jobs for daily report selection
            const reportableJobs = openJobs.filter(job => job.status === 'OPEN' || job.status === 'OT');
            showDailyReportJobsSelector(reportableJobs);
        })
        .catch(error => {
            hideOpenJobsLoading();
            handleApiError(error, 'Loading open jobs for daily report');
        });
}

/**
 * Shows the daily report jobs selector modal
 */
function showDailyReportJobsSelector(openJobs) {
    window._dailyReportJobs = openJobs;
    
    let html = `
        <div style="position:fixed; left:0; top:0; width:100vw; height:100vh; background:rgba(0,0,0,0.6); z-index:3000; display:flex; align-items:center; justify-content:center;">
            <div style="background:#fff; border-radius:18px; padding:24px; max-width:700px; width:95%; max-height:80vh; overflow-y:auto; box-shadow:0 4px 24px rgba(0,0,0,0.2);">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; border-bottom:2px solid #4CAF50; padding-bottom:12px;">
                    <h2 style="margin:0; color:#2E7D32;">📊 เลือกงานสำหรับรายงานประจำวัน</h2>
                    <button onclick="closeDailyReportJobsSelector()" style="background:none; border:none; font-size:1.5rem; cursor:pointer; color:#666;">&times;</button>
                </div>`;
    
    if (openJobs.length === 0) {
        html += `<div style="text-align:center; padding:40px; color:#666;">
            <p style="font-size:1.2rem; margin-bottom:20px;">ไม่พบงานที่เปิดอยู่สำหรับโครงการนี้</p>
            <button onclick="closeDailyReportJobsSelector()" style="padding:10px 32px; border-radius:10px; background:#1976d2; color:#fff; border:none; font-size:1.1rem; cursor:pointer;">กลับ</button>
        </div>`;
    } else {
        html += `<table style="width:100%; border-collapse:collapse; margin: 0 auto;">
            <thead>
                <tr style="background:#E8F5E8;">
                    <th style="border:1px solid #4CAF50; padding:8px; text-align:left;">Process Name</th>
                    <th style="border:1px solid #4CAF50; padding:8px; text-align:left;">Process No.</th>
                    <th style="border:1px solid #4CAF50; padding:8px; text-align:left;">Step No.</th>
                    <th style="border:1px solid #4CAF50; padding:8px; text-align:left;">Machine No.</th>
                    <th style="border:1px solid #4CAF50; padding:8px; text-align:center;">Action</th>
                </tr>
            </thead>
            <tbody>`;
        
        openJobs.forEach((job, idx) => {
            html += `
                <tr style="border-bottom:1px solid #ddd;">
                    <td style="border:1px solid #ddd; padding:8px;">${job.processName || ''}</td>
                    <td style="border:1px solid #ddd; padding:8px;">${job.processNo || ''}</td>
                    <td style="border:1px solid #ddd; padding:8px;">${job.stepNo || ''}</td>
                    <td style="border:1px solid #ddd; padding:8px;">${job.machineNo || ''}</td>
                    <td style="border:1px solid #ddd; padding:8px; text-align:center;">
                        <button onclick="selectJobForDailyReport(${idx})" style="padding:6px 16px; border-radius:6px; background:#4CAF50; color:#fff; border:none; cursor:pointer; font-size:0.9rem;">เลือก</button>
                    </td>
                </tr>`;
        });
        
        html += `
            </tbody>
        </table>
        <div style="text-align:center; margin-top:20px;">
            <button onclick="closeDailyReportJobsSelector()" style="padding:10px 32px; border-radius:10px; background:#757575; color:#fff; border:none; font-size:1.1rem; cursor:pointer;">ยกเลิก</button>
        </div>`;
    }
    
    html += `
            </div>
        </div>`;
    
    const modalDiv = document.createElement('div');
    modalDiv.id = 'daily-report-jobs-selector';
    modalDiv.innerHTML = html;
    document.body.appendChild(modalDiv);
}

/**
 * Closes the daily report jobs selector
 */
function closeDailyReportJobsSelector() {
    const modal = document.getElementById('daily-report-jobs-selector');
    if (modal) {
        modal.remove();
    }
}

/**
 * Selects a job for daily report and opens the daily report modal
 */
function selectJobForDailyReport(idx) {
    const job = window._dailyReportJobs[idx];
    window._selectedDailyReportJob = job;
    
    // Close the job selector
    closeDailyReportJobsSelector();
    
    // Open the daily report modal with selected job info
    showDailyReportModalWithJob(job);
}

/**
 * Shows the daily report modal with selected job information
 */
function showDailyReportModalWithJob(job) {
    // Pre-fill job information
    populateDailyReportFormWithJob(job);
    
    // Show modal
    document.getElementById('daily-report-modal').style.display = 'flex';
    
    // Focus on employee code field
    setTimeout(() => {
        const employeeField = document.getElementById('daily-report-employee-code');
        if (employeeField) employeeField.focus();
    }, 100);
}

/**
 * Closes the daily report modal and resets form
 */
function closeDailyReportModal() {
    document.getElementById('daily-report-modal').style.display = 'none';
    document.getElementById('daily-report-form').reset();
    updateDailyReportTotal();
}

/**
 * Populates the daily report form with selected job data and date
 */
function populateDailyReportFormWithJob(job) {
    // Format current date as DD/MM/YYYY
    const today = new Date();
    const formattedDate = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear()}`;
    
    // Pre-fill display elements with job data (display format like main info screen)
    const displayElements = {
        'daily-report-date-display': formattedDate,
        'daily-report-project-no-display': qrData.projectNo || '',
        'daily-report-customer-name-display': qrData.customerName || '',
        'daily-report-part-name-display': qrData.partName || '',
        'daily-report-drawing-no-display': qrData.drawingNo || '',
        'daily-report-quantity-ordered-display': qrData.quantityOrdered || '',
        'daily-report-process-name-display': job.processName || '',
        'daily-report-process-no-display': job.processNo || '',
        'daily-report-step-no-display': job.stepNo || '',
        'daily-report-machine-no-display': job.machineNo || ''
    };
    
    // Set the text content for each display element
    Object.entries(displayElements).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    });
    
    // Reset production form fields
    const productionFields = ['daily-report-employee-code', 'daily-report-fg', 'daily-report-ng', 'daily-report-rework', 'daily-report-remark'];
    productionFields.forEach(id => {
        const element = document.getElementById(id);
        if (element) element.value = '';
    });
    
    // Reset total counter
    updateDailyReportTotal();
}

/**
 * Populates the daily report form with current job data and date
 */
function populateDailyReportForm() {
    // Format current date as DD/MM/YYYY
    const today = new Date();
    const formattedDate = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear()}`;
    
    // Pre-fill form fields with job data
    const elements = {
        'daily-report-date': formattedDate,
        'daily-report-project-no': qrData.projectNo || '',
        'daily-report-customer-name': qrData.customerName || '',
        'daily-report-part-name': qrData.partName || '',
        'daily-report-drawing-no': qrData.drawingNo || '',
        'daily-report-quantity-ordered': qrData.quantityOrdered || ''
    };
    
    // Set the values for each element
    Object.entries(elements).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) element.value = value;
    });
    
    // Clear production fields and process fields (these will be filled manually)
    const clearFields = [
        'daily-report-process-name', 'daily-report-process-no', 
        'daily-report-step-no', 'daily-report-machine-no'
    ];
    clearFields.forEach(id => {
        const element = document.getElementById(id);
        if (element) element.value = '';
    });
    
    // Reset total counter
    updateDailyReportTotal();
}

/**
 * Updates the total pieces counter in daily report modal
 */
function updateDailyReportTotal() {
    const fg = parseInt(document.getElementById('daily-report-fg')?.value) || 0;
    const ng = parseInt(document.getElementById('daily-report-ng')?.value) || 0;
    const rework = parseInt(document.getElementById('daily-report-rework')?.value) || 0;
    
    const total = fg + ng + rework;
    const totalElement = document.getElementById('daily-report-total-pieces');
    if (totalElement) {
        totalElement.textContent = total;
    }
}

/**
 * Shows current open jobs in the info screen
 * @param {Array} optimisticJobs - Optional pre-filtered jobs array
 */
function showCurrentOpenJobs(optimisticJobs) {
    const container = document.getElementById('open-jobs-table');
    if (!container) return;

    if (optimisticJobs) {
        // Use provided optimistic jobs
        renderOpenJobsTable(optimisticJobs, container);
        window._lastOpenJobs = optimisticJobs;
        return;
    }

    // Show loading state
    container.innerHTML = '<div style="margin-top:10px; color:#888;">กำลังโหลดข้อมูล...</div>';

    // Fetch current open jobs
    fetchOpenJobs(qrData.projectNo, qrData.partName)
        .then(openJobs => {
            renderOpenJobsTable(openJobs, container);
            window._lastOpenJobs = openJobs;
        })
        .catch(error => {
            container.innerHTML = '<div style="margin-top:10px; color:#b71c1c;">เกิดข้อผิดพลาดในการโหลดงานที่เปิดอยู่</div>';
            console.error('Error loading current open jobs:', error);
        });
}

/**
 * Renders open jobs table in the provided container
 * @param {Array} openJobs - Array of open job objects
 * @param {HTMLElement} container - Container element to render the table in
 */
function renderOpenJobsTable(openJobs, container) {
    if (!container) return; // Prevent error if element is not in DOM
    
    if (!openJobs || !openJobs.length) {
        container.innerHTML = '<div style="margin-top:10px; color:#888;">ไม่มีงานที่เปิดอยู่สำหรับโปรเจคนี้</div>';
        return;
    }
    
    let html = `<div style="margin-top:18px;">
        <strong>งานที่เปิดอยู่:</strong>
        <table style="width:100%; border-collapse:collapse; margin-top:8px;">
            <thead>
                <tr style="background:#f4f4f4;">
                    <th style="padding:4px 8px;">Process Name</th>
                    <th style="padding:4px 8px;">Process No.</th>
                    <th style="padding:4px 8px;">Step No.</th>
                    <th style="padding:4px 8px;">Machine No.</th>
                    <th style="padding:4px 8px;">Status</th>
                </tr>
            </thead>
            <tbody>`;
    
    openJobs.forEach(job => {
        html += `<tr>
            <td style="text-align:center; padding:2px 8px;">${job.processName}</td>
            <td style="text-align:center; padding:2px 8px;">${job.processNo}</td>
            <td style="text-align:center; padding:2px 8px;">${job.stepNo}</td>
            <td style="text-align:center; padding:2px 8px;">${job.machineNo || ''}</td>
            <td style="text-align:center; padding:2px 8px; font-weight:bold;">${job.status}</td>
        </tr>`;
    });
    
    html += `</tbody></table></div>`;
    container.innerHTML = html;
}

/**
 * Initializes UI manager when DOM is loaded
 */
function initializeUIManager() {
    // Make functions globally available for onclick handlers
    window.showScreen = showScreen;
    window.closeOpenJobsSelector = closeOpenJobsSelector;
    window.closePauseJobsSelector = closePauseJobsSelector;
    window.closeContinueJobsSelector = closeContinueJobsSelector;
    window.closePauseReasonModal = closePauseReasonModal;
    window.closeMachineSettingModal = closeMachineSettingModal;
    window.closeOTModal = closeOTModal;
    window.showDailyReportModal = showDailyReportModal;
    window.closeDailyReportModal = closeDailyReportModal;
    window.updateDailyReportTotal = updateDailyReportTotal;
    window.closeDailyReportJobsSelector = closeDailyReportJobsSelector;
    window.selectJobForDailyReport = selectJobForDailyReport;
    window.populateDailyReportFormWithJob = populateDailyReportFormWithJob;
    
    console.log('UI Manager initialized');
}

// Initialize UI manager when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeUIManager);
