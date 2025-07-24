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
    // Filter only jobs with status OPEN (not PAUSE or DOWNTIME)
    const pausableJobs = openJobs.filter(job => job.status === 'OPEN');
    
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
                    <th></th>
                </tr>
            </thead>
            <tbody>`;
        
        pausableJobs.forEach((job, idx) => {
            html += `<tr>
                <td style="text-align:center; padding:4px 8px;">${job.processName}</td>
                <td style="text-align:center; padding:4px 8px;">${job.processNo}</td>
                <td style="text-align:center; padding:4px 8px;">${job.stepNo}</td>
                <td style="text-align:center; padding:4px 8px;">${job.machineNo || ''}</td>
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
    
    console.log('UI Manager initialized');
}

// Initialize UI manager when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeUIManager);
