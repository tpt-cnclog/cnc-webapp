// app.js - Main application initialization and remaining core functions
// Contains application startup logic, remaining utility functions, and event listeners setup

/**
 * Check if OT start time is valid before showing OT modal
 */
function checkOTStartTime() {
    const now = new Date();
    const startTime = new Date();
    startTime.setHours(OT_START_TIME.hours, OT_START_TIME.minutes, 0);

    if (now < startTime) {
        alert(UI_MESSAGES.OT_EARLY_WARNING);
        return;
    }
    
    document.getElementById('ot-modal').style.display = 'flex';
}

/**
 * Fills the info screen with job information and current open jobs
 */
function fillInfoScreen() {
    document.getElementById('job-info').innerHTML = `
        <p><strong>Project Number:</strong> ${qrData.projectNo||''}</p>
        <p><strong>Customer Name:</strong> ${qrData.customerName||''}</p>
        <p><strong>Part Name:</strong> ${qrData.partName||''}</p>
        <p><strong>Drawing Number:</strong> ${qrData.drawingNo||''}</p>
        <p><strong>Quantity Ordered:</strong> ${qrData.quantityOrdered||''}</p>
        <div id="open-jobs-table"></div>
    `;
    // Always fetch fresh data from backend when showing job info screen
    showCurrentOpenJobs();
}

/**
 * Resets all application data and forms
 */
function resetAll() {
    qrData = {};
    document.getElementById('start-form').reset();
    document.getElementById('stop-form').reset();
    
    // Reset manual input form
    const manualInput = document.getElementById('manual-input');
    if (manualInput) {
        manualInput.style.display = 'none';
        manualInput.querySelector('form').reset();
    }
    
    // Reset QR reader display
    const qrReader = document.getElementById('qr-reader');
    if (qrReader) {
        qrReader.style.display = '';
    }
    
    showScreen('scan-screen');
    if (window.qrScanner) {
        window.qrScanner.stop().catch(()=>{});
        window.qrScanner = null;
    }
}

/**
 * Shows scan screen only with a slight delay to ensure scanner initialization
 */
function showScanOnly() {
    showScreen('scan-screen');
    setTimeout(() => {
        scanHandled = false;
        startScan();
    }, 100);
}

/**
 * Clears QR data
 */
function clearData() {
    qrData = {};
}

/**
 * Fetches open jobs and shows pause selector
 */
function fetchOpenJobsAndShowPauseSelector() {
    showOpenJobsLoading();
    
    fetchOpenJobs(qrData.projectNo, qrData.partName)
        .then(openJobs => {
            hideOpenJobsLoading();
            // Show jobs with status OPEN or OT
            const pausableJobs = openJobs.filter(job => job.status === 'OPEN' || job.status === 'OT');
            showPauseJobsTableSelector(pausableJobs);
        })
        .catch(error => {
            hideOpenJobsLoading();
            handleApiError(error, 'Loading open jobs for pause');
        });
}

/**
 * Handles open job selection for stop operations
 * @param {number} idx - Index of selected job
 */
function selectOpenJob(idx) {
    const job = window._openJobs[idx];
    // Prefill STOP form fields
    document.querySelector('#stop-form [name="processName"]').value = job.processName;
    document.querySelector('#stop-form [name="processNo"]').value = job.processNo;
    document.querySelector('#stop-form [name="stepNo"]').value = job.stepNo;
    document.querySelector('#stop-form [name="machineNo"]').value = job.machineNo;
    document.querySelector('#stop-form [name="employeeCode"]').value = job.employeeCode || '';
    
    closeOpenJobsSelector();
    showScreen('stop-form');
}

/**
 * Fetches paused jobs and shows continue selector
 */
function fetchPausedJobsAndShowContinueSelector() {
    showOpenJobsLoading();
    
    fetchOpenJobs(qrData.projectNo, qrData.partName)
        .then(openJobs => {
            hideOpenJobsLoading();
            // Show jobs with status PAUSE or DOWNTIME
            const pausedJobs = openJobs.filter(job => job.status === 'PAUSE' || job.status === 'DOWNTIME');
            showContinueJobsTableSelector(pausedJobs);
        })
        .catch(error => {
            hideOpenJobsLoading();
            handleApiError(error, 'Loading paused jobs for continue');
        });
}

/**
 * Fetches open jobs and shows stop selector
 */
function fetchOpenJobsAndShowStopSelector() {
    showOpenJobsLoading();
    
    fetchOpenJobs(qrData.projectNo, qrData.partName)
        .then(openJobs => {
            hideOpenJobsLoading();
            // Only show jobs with status OPEN
            const openOnlyJobs = openJobs.filter(job => job.status === 'OPEN');
            showOpenJobsTableSelector(openOnlyJobs, 'stop');
        })
        .catch(error => {
            hideOpenJobsLoading();
            handleApiError(error, 'Loading open jobs for stop');
        });
}

/**
 * Sets up machine setting button handlers
 */
function setupMachineSettingHandlers() {
    document.getElementById('machine-setting-start-btn').onclick = function() {
        closeMachineSettingModal();
        // Prefill and show start form
        showScreen('start-form');
        const form = document.getElementById('start-form');
        if (form) {
            form.processName.value = 'Machine Setting';
            // Optionally, trigger change event if logic depends on it
            if (typeof form.processName.onchange === 'function') form.processName.onchange();
        }
    };
    
    document.getElementById('machine-setting-stop-btn').onclick = function() {
        closeMachineSettingModal();
        // Fetch open jobs and show stop selector, but only for Machine Setting jobs
        showOpenJobsLoading();

        const params = new URLSearchParams({
            mode: 'openJobs',
            projectNo: qrData.projectNo,
            partName: qrData.partName
        });
        fetch(`${GAS_ENDPOINT}?${params.toString()}`)
            .then(res => res.json())
            .then(openJobs => {
                hideOpenJobsLoading();
                // Only show jobs with processName 'Machine Setting'
                const msJobs = openJobs.filter(job => job.processName && job.processName.trim().toLowerCase() === 'machine setting' && job.status === 'OPEN');
                showOpenJobsTableSelector(msJobs, 'stop');
            })
            .catch(() => {
                hideOpenJobsLoading();
                alert('เกิดข้อผิดพลาดในการโหลดข้อมูล');
            });
    };
}

/**
 * Sets up OT button handlers
 */
function setupOTHandlers() {
    document.getElementById('ot-start-btn').onclick = function() {
        closeOTModal();
        // Fetch open jobs and show selector for OT start
        showOpenJobsLoading();

        fetchOpenJobs(qrData.projectNo, qrData.partName)
            .then(openJobs => {
                hideOpenJobsLoading();
                // Filter jobs that can be started for OT (OPEN status)
                const otJobs = openJobs.filter(job => job.status === 'OPEN');
                
                if (otJobs.length === 0) {
                    alert('ไม่มีงานที่สามารถเริ่ม OT ได้');
                    showScreen('info-screen');
                    return;
                }
                
                // Show jobs table for OT selection
                showOpenJobsTableSelector(otJobs, 'ot');
            })
            .catch(error => {
                hideOpenJobsLoading();
                handleApiError(error, 'Loading jobs for OT');
            });
    };
    
    document.getElementById('ot-stop-btn').onclick = function() {
        closeOTModal();
        // Fetch open jobs and show selector for OT stop
        showOpenJobsLoading();

        fetchOpenJobs(qrData.projectNo, qrData.partName)
            .then(openJobs => {
                hideOpenJobsLoading();
                // Filter jobs with OT status
                const otJobs = openJobs.filter(job => job.status === 'OT');
                
                if (otJobs.length === 0) {
                    alert('ไม่มีงาน OT ที่สามารถปิดได้');
                    showScreen('info-screen');
                    return;
                }
                
                // Show jobs table for OT stop selection
                showOpenJobsTableSelector(otJobs, 'stop-ot');
            })
            .catch(error => {
                hideOpenJobsLoading();
                handleApiError(error, 'Loading OT jobs for stop');
            });
    };
}

/**
 * Initializes the main application
 */
function initializeApp() {
    // Set up button handlers
    setupMachineSettingHandlers();
    setupOTHandlers();
    
    // Make functions globally available for onclick handlers
    window.checkOTStartTime = checkOTStartTime;
    window.fillInfoScreen = fillInfoScreen;
    window.resetAll = resetAll;
    window.showScanOnly = showScanOnly;
    window.clearData = clearData;
    window.fetchOpenJobsAndShowPauseSelector = fetchOpenJobsAndShowPauseSelector;
    window.selectOpenJob = selectOpenJob;
    window.fetchPausedJobsAndShowContinueSelector = fetchPausedJobsAndShowContinueSelector;
    window.fetchOpenJobsAndShowStopSelector = fetchOpenJobsAndShowStopSelector;
    
    // Initialize the scan screen on app start
    showScreen('scan-screen');
    
    console.log('CNC Job Log Application initialized');
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Wait a bit for all modules to be loaded and initialized
    setTimeout(initializeApp, 100);
});
