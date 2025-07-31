// form-handlers.js - Form submission handlers and form processing functions
// Contains all form submission logic, form data processing, and form-related event handlers

/**
 * Submit handler for start job form
 * @param {Event} event - Form submission event
 */
function submitStart(event) {
    event.preventDefault();
    if (window.isSubmitting) return;
    window.isSubmitting = true;
    
    const form = document.getElementById('start-form');
    const formData = new FormData(form);
    const data = {
        ...qrData,
        processName: formData.get('processName'),
        processNo: formData.get('processNo'),
        stepNo: formData.get('stepNo'),
        machineNo: formData.get('machineNo'),
        employeeCode: formData.get('employeeCode'),
        status: 'OPEN'
    };

    // Check for duplicate before submitting
    if (checkForDuplicateJob(data)) {
        window.isSubmitting = false;
        return;
    }

    showScreen('loading-screen');

    // Use direct fetch approach like stop job
    fetch(GAS_ENDPOINT, {
        method: "POST",
        mode: "cors",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify(data)
    })
    .then(response => response.text())
    .then(text => {
        window.isSubmitting = false;
        if (text.trim().startsWith("ERROR:")) {
            // Check if it's a duplicate job error
            if (text.includes("ซ้ำกัน") || text.includes("duplicate") || text.includes("DUPLICATE")) {
                showDuplicateJobAlert(data);
            } else {
                alert(text.trim().replace("ERROR: ", ""));
            }
            showScreen('info-screen');
        } else {
            // Optimistically update the open jobs list
            optimisticUpdateOpenJobs({type: 'add', job: {
                processName: data.processName,
                processNo: data.processNo,
                stepNo: data.stepNo,
                machineNo: data.machineNo,
                status: 'OPEN'
            }});
            showScreen('confirm-screen');
        }
    })
    .catch((error) => {
        window.isSubmitting = false;
        alert("เกิดข้อผิดพลาดในการส่งข้อมูล: " + error.message);
        showScreen('info-screen');
    });
}

/**
 * Submit handler for stop job form
 * @param {Event} event - Form submission event
 */
function submitStop(event) {
    event.preventDefault();
    if (window.isSubmitting) return;
    window.isSubmitting = true;
    showScreen('loading-screen');
    
    const form = document.getElementById('stop-form');
    const formData = new FormData(form);
    const data = {
        ...qrData,
        processName: formData.get('processName'),
        processNo: formData.get('processNo'),
        stepNo: formData.get('stepNo'),
        machineNo: formData.get('machineNo'),
        employeeCode: formData.get('employeeCode'),
        fg: formData.get('fg'),
        ng: formData.get('ng'),
        rework: formData.get('rework'),
        status: 'CLOSE'
    };

    fetch(GAS_ENDPOINT, {
        method: "POST",
        mode: "cors",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify(data)
    })
    .then(response => response.text())
    .then(text => {
        window.isSubmitting = false;
        if (text.trim().startsWith("ERROR:")) {
            alert(text.trim().replace("ERROR: ", ""));
            showScreen('info-screen');
        } else {
            showScreen('confirm-screen');
        }
    })
    .catch((error) => {
        window.isSubmitting = false;
        alert("เกิดข้อผิดพลาดในการส่งข้อมูล: " + error.message);
        showScreen('info-screen');
    });
}

/**
 * Handles OT start job selection from jobs table
 * @param {number} idx - Index of selected job in open jobs array
 */
function startOTSelectedJob(idx) {
    const job = window._openJobs[idx];
    if (!job) return;
    
    const data = {
        ...qrData,
        processName: job.processName,
        processNo: job.processNo,
        stepNo: job.stepNo,
        machineNo: job.machineNo,
        action: 'START_OT'
    };
    
    closeOpenJobsSelector();
    showScreen('loading-screen');
    
    fetch(GAS_ENDPOINT, {
        method: "POST",
        mode: "cors",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify(data)
    })
    .then(response => response.text())
    .then(text => {
        showCurrentOpenJobs();
        if (text.trim().startsWith("ERROR:")) {
            alert(text.trim().replace("ERROR: ", ""));
            showScreen('info-screen');
        } else {
            alert('เริ่ม OT เรียบร้อยแล้ว');
            showScreen('info-screen');
        }
    })
    .catch((error) => {
        showCurrentOpenJobs();
        alert("เกิดข้อผิดพลาดในการส่งข้อมูล: " + error.message);
        showScreen('info-screen');
    });
}

/**
 * Handles OT stop job selection from jobs table
 * @param {number} idx - Index of selected job in open jobs array
 */
function stopOTSelectedJob(idx) {
    const job = window._openJobs[idx];
    if (!job) return;
    
    const data = {
        ...qrData,
        processName: job.processName,
        processNo: job.processNo,
        stepNo: job.stepNo,
        machineNo: job.machineNo,
        action: 'STOP_OT'
    };
    
    closeOpenJobsSelector();
    showScreen('loading-screen');
    
    fetch(GAS_ENDPOINT, {
        method: "POST",
        mode: "cors",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify(data)
    })
    .then(response => response.text())
    .then(text => {
        showCurrentOpenJobs();
        if (text.trim().startsWith("ERROR:")) {
            alert(text.trim().replace("ERROR: ", ""));
            showScreen('info-screen');
        } else {
            alert('ปิด OT เรียบร้อยแล้ว');
            showScreen('info-screen');
        }
    })
    .catch((error) => {
        showCurrentOpenJobs();
        alert("เกิดข้อผิดพลาดในการส่งข้อมูล: " + error.message);
        showScreen('info-screen');
    });
}

/**
 * Handles stop job selection from jobs table
 * @param {number} idx - Index of selected job in open jobs array
 */
function stopSelectedJob(idx) {
    const job = window._openJobs[idx];
    if (!job) return;
    
    // Prefill STOP form fields
    document.querySelector('#stop-form [name="processName"]').value = job.processName;
    document.querySelector('#stop-form [name="processNo"]').value = job.processNo;
    document.querySelector('#stop-form [name="stepNo"]').value = job.stepNo;
    document.querySelector('#stop-form [name="machineNo"]').value = job.machineNo;
    document.querySelector('#stop-form [name="employeeCode"]').value = job.employeeCode || '';
    
    // Update the form fields display based on process name
    updateStopFormFields();
    
    closeOpenJobsSelector();
    showScreen('stop-form');
}

/**
 * Handles pause job selection from jobs table
 * @param {number} idx - Index of selected job in pause jobs array
 */
function pauseSelectedJob(idx) {
    const job = window._pauseJobs[idx];
    if (!job) return;
    closePauseJobsSelector(); // Close the job selection modal before showing the reason modal
    showPauseReasonModal(job);
}

/**
 * Shows pause reason modal for selected job
 * @param {Object} job - Job object to pause
 */
function showPauseReasonModal(job) {
    const modal = document.getElementById('pause-reason-modal');
    const form = document.getElementById('pause-reason-form');
    modal.style.display = 'flex';
    
    // Reset form
    form.reset();
    document.getElementById('pause-other-reason').style.display = 'none';

    // Handle pause reason select change
    form.pauseReasonSelect.onchange = function() {
        const otherReasonDiv = document.getElementById('pause-other-reason');
        const otherReasonInput = otherReasonDiv.querySelector('input');
        
        if (this.value === 'อื่นๆ โปรดระบุ') {
            otherReasonDiv.style.display = '';
            otherReasonInput.required = true;
        } else {
            otherReasonDiv.style.display = 'none';
            otherReasonInput.required = false;
            otherReasonInput.value = '';
        }
    };

    // Form submission handler
    form.onsubmit = function(e) {
        e.preventDefault();
        
        let selectedReason = form.pauseReasonSelect.value;
        if (!selectedReason) { 
            alert('กรุณาเลือกเหตุผลการหยุดงาน'); 
            return; 
        }
        
        let finalReason = selectedReason;
        let pauseType = getPauseType(selectedReason);
        
        // Handle "Other" option
        if (selectedReason === 'อื่นๆ โปรดระบุ') {
            let customReason = form.pauseOtherReason.value.trim();
            if (!customReason) { 
                alert('กรุณาระบุเหตุผลอื่น ๆ'); 
                return; 
            }
            finalReason = 'Other: ' + customReason;
            // Default to PAUSE type for custom reasons
            pauseType = 'PAUSE';
        }
        
        // Optimistic update for pause
        optimisticUpdateOpenJobs({type: 'update', job: {
            processName: job.processName,
            processNo: job.processNo,
            stepNo: job.stepNo,
            machineNo: job.machineNo,
            status: pauseType
        }});
        
        closePauseReasonModal();
        showScreen('loading-screen');
        
        // Add timestamp and working hours context for proper duration calculation
        const pauseTimestamp = new Date();
        const otStart = new Date();
        otStart.setHours(OT_START_TIME.hours, OT_START_TIME.minutes, 0);
        
        fetch(GAS_ENDPOINT, {
            method: "POST",
            mode: "cors",
            headers: { "Content-Type": "text/plain" },
            body: JSON.stringify({
                ...qrData,
                processName: job.processName,
                processNo: job.processNo,
                stepNo: job.stepNo,
                machineNo: job.machineNo,
                status: 'PAUSE',
                pauseType: pauseType,
                pauseReason: finalReason,
                pauseTimestamp: pauseTimestamp.toISOString(),
                otStartTime: otStart.toISOString(),
                currentlyInOT: pauseTimestamp >= otStart,
                action: 'PAUSE'
            })
        })
        .then(response => response.text())
        .then(text => {
            if (text.trim().startsWith("ERROR:")) {
                alert(text.trim().replace("ERROR: ", ""));
                showScreen('info-screen');
            } else {
                showScreen('confirm-screen');
            }
        })
        .catch((error) => {
            alert("เกิดข้อผิดพลาดในการส่งข้อมูล: " + error.message);
            showScreen('info-screen');
        });
    };
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
 * Handles continue job selection from paused jobs table
 * @param {number} idx - Index of selected job in continue jobs array
 */
function continueSelectedJob(idx) {
    const job = window._continueJobs[idx];
    if (!job) return;
    if (!confirm('คุณต้องการดำเนินงานนี้ต่อใช่หรือไม่?')) return;
    
    closeContinueJobsSelector();
    showScreen('loading-screen');
    
    // Check if current time is during OT hours
    const now = new Date();
    const startTime = new Date();
    startTime.setHours(OT_START_TIME.hours, OT_START_TIME.minutes, 0);
    
    // Set status based on current time - OT if after start time, OPEN otherwise
    const status = now >= startTime ? 'OT' : 'OPEN';
    
    const data = {
        ...qrData,
        processName: job.processName,
        processNo: job.processNo,
        stepNo: job.stepNo,
        machineNo: job.machineNo,
        status: status,
        action: 'CONTINUE',
        continueTimestamp: now.toISOString(),
        otStartTime: startTime.toISOString(),
        currentlyInOT: now >= startTime
    };

    fetch(GAS_ENDPOINT, {
        method: "POST",
        mode: "cors",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify(data)
    })
    .then(response => response.text())
    .then(text => {
        showCurrentOpenJobs();
        if (text.trim().startsWith("ERROR:")) {
            alert(text.trim().replace("ERROR: ", ""));
            showScreen('info-screen');
        } else {
            alert('งานถูกดำเนินการต่อแล้ว');
            showScreen('info-screen');
        }
    })
    .catch((error) => {
        showCurrentOpenJobs();
        alert("เกิดข้อผิดพลาดในการส่งข้อมูล: " + error.message);
        showScreen('info-screen');
    });
}

/**
 * Calculates pause duration split between regular hours and OT hours
 * This helps the backend understand how to properly account for pause time
 * @param {Date} pauseTime - When the job was paused
 * @param {Date} continueTime - When the job was continued
 * @param {Date} otStartTime - When OT starts for the day
 * @returns {Object} Duration breakdown
 */
function calculatePauseDurationBreakdown(pauseTime, continueTime, otStartTime) {
    const pauseTimestamp = new Date(pauseTime);
    const continueTimestamp = new Date(continueTime);
    const otStart = new Date(otStartTime);
    
    let regularHoursPause = 0; // minutes
    let otHoursPause = 0; // minutes
    
    // Case 1: Both pause and continue are before OT
    if (continueTimestamp <= otStart) {
        regularHoursPause = (continueTimestamp - pauseTimestamp) / (1000 * 60);
    }
    // Case 2: Both pause and continue are during OT
    else if (pauseTimestamp >= otStart) {
        otHoursPause = (continueTimestamp - pauseTimestamp) / (1000 * 60);
    }
    // Case 3: Pause starts before OT, continue during OT (crosses boundary)
    else if (pauseTimestamp < otStart && continueTimestamp > otStart) {
        regularHoursPause = (otStart - pauseTimestamp) / (1000 * 60);
        otHoursPause = (continueTimestamp - otStart) / (1000 * 60);
    }
    
    return {
        totalMinutes: regularHoursPause + otHoursPause,
        regularHoursMinutes: regularHoursPause,
        otHoursMinutes: otHoursPause,
        crossesOTBoundary: regularHoursPause > 0 && otHoursPause > 0
    };
}

/**
 * Updates stop form fields based on process name selection
 * Shows/hides FG, NG, Rework fields based on whether "Machine Setting" is selected
 */
function updateStopFormFields() {
    const stopForm = document.getElementById('stop-form');
    if (!stopForm) return;
    
    const processNameSelect = stopForm.querySelector('[name="processName"]');
    const fgInput = stopForm.querySelector('[name="fg"]');
    const ngInput = stopForm.querySelector('[name="ng"]');
    const reworkInput = stopForm.querySelector('[name="rework"]');
    const fgRow = document.getElementById('fg-row');
    const ngRow = document.getElementById('ng-row');
    const reworkRow = document.getElementById('rework-row');
    
    if (!processNameSelect || !fgInput || !ngInput || !reworkInput || !fgRow || !ngRow || !reworkRow) return;
    
    function updateFields() {
        const selected = processNameSelect.value.replace(/\s+/g, ' ').trim().toLowerCase();
        if (selected === 'machine setting') {
            fgInput.required = false;
            ngInput.required = false;
            reworkInput.required = false;
            fgRow.style.display = 'none';
            ngRow.style.display = 'none';
            reworkRow.style.display = 'none';
        } else {
            fgInput.required = true;
            ngInput.required = true;
            reworkInput.required = true;
            fgRow.style.display = '';
            ngRow.style.display = '';
            reworkRow.style.display = '';
        }
    }
    
    processNameSelect.removeEventListener('change', updateFields);
    processNameSelect.addEventListener('change', updateFields);
    updateFields();
}

/**
 * Optimistically updates the open jobs list in the UI
 * Updates the displayed jobs list before server confirmation
 * @param {Object} expectedChange - Expected change object with type and job data
 * @param {string} expectedChange.type - Type of change: 'add', 'update', 'remove'
 * @param {Object} expectedChange.job - Job object with the change data
 */
function optimisticUpdateOpenJobs(expectedChange) {
    if (!window._lastOpenJobs) {
        window._lastOpenJobs = [];
    }

    const jobs = [...window._lastOpenJobs];
    
    if (expectedChange.type === 'add') {
        // Add new job to the list
        jobs.push({
            ...expectedChange.job,
            projectNo: qrData.projectNo,
            partName: qrData.partName
        });
    } else if (expectedChange.type === 'update') {
        // Update existing job status
        const jobToUpdate = jobs.find(job => 
            job.processName === expectedChange.job.processName &&
            job.processNo === expectedChange.job.processNo &&
            job.stepNo === expectedChange.job.stepNo &&
            job.machineNo === expectedChange.job.machineNo
        );
        if (jobToUpdate) {
            jobToUpdate.status = expectedChange.job.status;
        }
    } else if (expectedChange.type === 'remove') {
        // Remove job from list
        const indexToRemove = jobs.findIndex(job => 
            job.processName === expectedChange.job.processName &&
            job.processNo === expectedChange.job.processNo &&
            job.stepNo === expectedChange.job.stepNo &&
            job.machineNo === expectedChange.job.machineNo
        );
        if (indexToRemove !== -1) {
            jobs.splice(indexToRemove, 1);
        }
    }

    // Update the global jobs list
    window._lastOpenJobs = jobs;
    
    // Refresh the open jobs display if currently visible
    const openJobsTable = document.getElementById('open-jobs-table');
    if (openJobsTable && openJobsTable.style.display !== 'none') {
        renderOpenJobsTable(jobs, openJobsTable);
    }
}

/**
 * Submit handler for daily report form
 * @param {Event} event - Form submission event
 */
function submitDailyReport(event) {
    event.preventDefault();
    if (window.isSubmitting) return;
    window.isSubmitting = true;
    
    const form = document.getElementById('daily-report-form');
    const formData = new FormData(form);
    
    // Collect form data
    const data = {
        date: document.getElementById('daily-report-date-display').textContent,
        projectNo: document.getElementById('daily-report-project-no-display').textContent,
        customerName: document.getElementById('daily-report-customer-name-display').textContent,
        partName: document.getElementById('daily-report-part-name-display').textContent,
        drawingNo: document.getElementById('daily-report-drawing-no-display').textContent,
        quantityOrdered: document.getElementById('daily-report-quantity-ordered-display').textContent,
        processName: document.getElementById('daily-report-process-name-display').textContent,
        processNo: document.getElementById('daily-report-process-no-display').textContent,
        stepNo: document.getElementById('daily-report-step-no-display').textContent,
        machineNo: document.getElementById('daily-report-machine-no-display').textContent,
        employeeCode: formData.get('employeeCode').trim().toUpperCase(),
        fg: parseInt(formData.get('fg')) || 0,
        ng: parseInt(formData.get('ng')) || 0,
        rework: parseInt(formData.get('rework')) || 0,
        remark: formData.get('remark').trim(),
        action: 'DAILY_REPORT'
    };
    
    // Validate required fields
    if (!data.employeeCode) {
        alert('กรุณาใส่รหัสพนักงาน');
        window.isSubmitting = false;
        return;
    }
    
    if (data.fg === 0 && data.ng === 0 && data.rework === 0) {
        alert('กรุณาใส่จำนวนชิ้นงานอย่างน้อย 1 รายการ');
        window.isSubmitting = false;
        return;
    }
    
    // Close the daily report modal first, then show loading
    closeDailyReportModal();
    showScreen('loading-screen');
    
    // Submit to backend using same pattern as other forms
    fetch(GAS_ENDPOINT, {
        method: "POST",
        mode: "cors",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify(data)
    })
    .then(response => response.text())
    .then(text => {
        window.isSubmitting = false;
        if (text.trim().startsWith("ERROR:")) {
            alert(text.trim().replace("ERROR: ", ""));
            showScreen('info-screen');
        } else {
            alert('บันทึกรายงานประจำวันเรียบร้อยแล้ว');
            showScreen('info-screen');
        }
    })
    .catch((error) => {
        window.isSubmitting = false;
        alert("เกิดข้อผิดพลาดในการส่งข้อมูล: " + error.message);
        showScreen('info-screen');
    });
}

/**
 * Initializes form handlers when DOM is loaded
 */
function initializeFormHandlers() {
    // Initialize stop form fields on DOM load
    updateStopFormFields();
    
    // Set up machine setting button handler
    const machineSettingBtn = document.getElementById('machine-setting-btn');
    if (machineSettingBtn) {
        machineSettingBtn.onclick = function() {
            document.getElementById('machine-setting-modal').style.display = 'flex';
        };
    }
    
    // Make functions globally available for onclick handlers
    window.submitStart = submitStart;
    window.submitStop = submitStop;
    window.stopSelectedJob = stopSelectedJob;
    window.startOTSelectedJob = startOTSelectedJob;
    window.stopOTSelectedJob = stopOTSelectedJob;
    window.pauseSelectedJob = pauseSelectedJob;
    window.continueSelectedJob = continueSelectedJob;
    window.submitDailyReport = submitDailyReport;
    
    // Initialize other form-related event listeners as needed
    console.log('Form handlers initialized');
}

// Initialize form handlers when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeFormHandlers);
