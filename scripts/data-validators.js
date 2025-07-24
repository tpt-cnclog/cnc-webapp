// data-validators.js - Input validation and data checking functions
// Contains all validation logic for form inputs and data integrity checks

/**
 * Validates step number input - handles input formatting and validation
 * This function is called onblur from step number input fields
 * @param {HTMLInputElement} input - The input element to validate
 */
function validateStepNo(input) {
    let value = input.value;
    // Remove any non-digit and non-plus characters
    value = value.replace(/[^0-9+]/g, '');
    // Remove leading and trailing plus signs
    value = value.replace(/^\+/, '').replace(/\+$/, '');
    // Replace multiple consecutive plus signs with single plus
    value = value.replace(/\+\+/g, '+');
    input.value = value;
    
    const pattern = VALIDATION_PATTERNS.STEP_NO;
    if (value && !pattern.test(value)) {
        input.setCustomValidity('กรุณาใส่ตัวเลขและเครื่องหมาย + เท่านั้น เช่น 1 หรือ 1+2+3');
    } else {
        input.setCustomValidity('');
    }
}

/**
 * Normalizes job number by removing spaces and converting to uppercase
 * @param {string} jobNo - The job number to normalize
 * @returns {string} - Normalized job number
 */
function normalizeJobNumber(jobNo) {
    return jobNo.replace(/\s+/g, '').toUpperCase();
}

/**
 * Normalizes string for comparison (lowercase, trimmed)
 * @param {string} str - String to normalize
 * @returns {string} - Normalized string
 */
function normalizeStr(str) {
    return (str || '').toString().trim().toLowerCase();
}

/**
 * Normalizes project number by removing leading zeros
 * @param {string} str - Project number to normalize
 * @returns {string} - Normalized project number
 */
function normalizeProjectNo(str) {
    return (str || '').toString().replace(/^0+/, '').trim().toLowerCase();
}

/**
 * Checks for duplicate job in currently displayed open jobs
 * @param {Object} data - Job data object to check
 * @returns {boolean} - True if duplicate found, false otherwise
 */
function checkForDuplicateJob(data) {
    if (!window._lastOpenJobs || window._lastOpenJobs.length === 0) {
        return false;
    }

    const duplicate = window._lastOpenJobs.find(job => {
        return normalizeProjectNo(job.projectNo || '') === normalizeProjectNo(data.projectNo) &&
               normalizeStr(job.partName || '') === normalizeStr(data.partName) &&
               normalizeStr(job.processName || '') === normalizeStr(data.processName) &&
               normalizeStr(job.processNo || '') === normalizeStr(data.processNo) &&
               normalizeStr(job.stepNo || '') === normalizeStr(data.stepNo) &&
               normalizeStr(job.machineNo || '') === normalizeStr(data.machineNo) &&
               normalizeStr(job.status || '') === 'open';
    });

    if (duplicate) {
        showDuplicateJobAlert(data);
        return true;
    }
    return false;
}

/**
 * Shows duplicate job alert with detailed information
 * @param {Object} data - Job data that is duplicated
 */
function showDuplicateJobAlert(data) {
    const message = `พบงานที่เปิดอยู่แล้วในระบบ:\n\n` +
                   `Project: ${qrData.projectNo}\n` +
                   `Part Name: ${qrData.partName}\n` +
                   `Process: ${data.processName} (${data.processNo})\n` +
                   `Step: ${data.stepNo}\n` +
                   `Machine: ${data.machineNo}\n\n` +
                   `ไม่สามารถเริ่มงานใหม่ได้ กรุณา:\n` +
                   `1. ตรวจสอบงานที่เปิดอยู่ในรายการด้านล่าง\n` +
                   `2. ปิดงานเดิมก่อนเริ่มงานใหม่\n` +
                   `3. หรือตรวจสอบข้อมูลที่ใส่ว่าถูกต้อง`;
    
    alert(message);
    
    // Highlight the duplicate job in the open jobs table if visible
    highlightDuplicateInTable(data);
}

/**
 * Highlights duplicate job in the open jobs table
 * @param {Object} data - Job data to highlight
 */
function highlightDuplicateInTable(data) {
    const container = document.getElementById('open-jobs-table');
    if (!container) return;

    // Add a warning message above the table
    const existingWarning = container.querySelector('.duplicate-warning');
    if (!existingWarning) {
        const warningDiv = document.createElement('div');
        warningDiv.className = 'duplicate-warning';
        warningDiv.style.cssText = `
            background: #ffebee; 
            border: 2px solid #f44336; 
            border-radius: 8px; 
            padding: 12px; 
            margin: 10px 0; 
            color: #d32f2f; 
            font-weight: bold;
            animation: pulse 2s infinite;
        `;
        warningDiv.innerHTML = `⚠️ พบงานที่ซ้ำกันในรายการด้านล่าง: ${data.processName} (${data.processNo}) - Step ${data.stepNo} - ${data.machineNo}`;
        
        // Add pulsing animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes pulse {
                0% { background-color: #ffebee; }
                50% { background-color: #ffcdd2; }
                100% { background-color: #ffebee; }
            }
        `;
        document.head.appendChild(style);
        
        container.insertBefore(warningDiv, container.firstChild);
        
        // Remove warning after 10 seconds
        setTimeout(() => {
            if (warningDiv.parentNode) {
                warningDiv.parentNode.removeChild(warningDiv);
            }
        }, 10000);
    }
}

/**
 * Checks and warns about potential duplicates when showing start form
 * Called when displaying the start job form
 */
function checkAndWarnAboutPotentialDuplicates() {
    if (!window._lastOpenJobs || window._lastOpenJobs.length === 0) {
        return;
    }

    // Check if there are any open jobs for this project/part combination
    const potentialDuplicates = window._lastOpenJobs.filter(job => {
        return normalizeProjectNo(job.projectNo || '') === normalizeProjectNo(qrData.projectNo) &&
               normalizeStr(job.partName || '') === normalizeStr(qrData.partName) &&
               normalizeStr(job.status || '') === 'open';
    });

    if (potentialDuplicates.length > 0) {
        // Show warning message in the start form
        const startForm = document.getElementById('start-form');
        if (startForm) {
            let warningDiv = startForm.querySelector('.potential-duplicate-warning');
            if (!warningDiv) {
                warningDiv = document.createElement('div');
                warningDiv.className = 'potential-duplicate-warning';
                warningDiv.style.cssText = `
                    background: #fff3e0; 
                    border: 2px solid #ff9800; 
                    border-radius: 8px; 
                    padding: 12px; 
                    margin: 15px 0; 
                    color: #f57c00; 
                    font-weight: bold;
                `;
                warningDiv.innerHTML = `
                    ⚠️ <strong>คำเตือน:</strong> พบงานที่เปิดอยู่แล้ว ${potentialDuplicates.length} งาน สำหรับโปรเจคและชิ้นงานนี้<br>
                    <small>กรุณาตรวจสอบให้แน่ใจว่าข้อมูลที่จะใส่ไม่ซ้ำกับงานที่เปิดอยู่</small>
                `;
                
                // Insert after the job info section
                const jobInfoDiv = startForm.querySelector('#start-job-info');
                if (jobInfoDiv && jobInfoDiv.nextSibling) {
                    startForm.insertBefore(warningDiv, jobInfoDiv.nextSibling);
                } else {
                    startForm.insertBefore(warningDiv, startForm.querySelector('label'));
                }
            }
        }
    }
}

/**
 * Validates job number format (basic validation)
 * @param {string} jobNo - Job number to validate
 * @returns {boolean} - True if valid, false otherwise
 */
function validateJobNumber(jobNo) {
    if (!jobNo || jobNo.trim() === '') {
        alert('กรุณาใส่หมายเลขงาน');
        return false;
    }
    
    // Check minimum length after removing spaces
    const normalized = normalizeJobNumber(jobNo);
    if (normalized.length < 2) {
        alert('หมายเลขงานต้องมีความยาวอย่างน้อย 2 ตัวอักษร');
        return false;
    }
    
    return true;
}

/**
 * Validates operator name
 * @param {string} operatorName - Operator name to validate
 * @returns {boolean} - True if valid, false otherwise
 */
function validateOperatorName(operatorName) {
    if (!operatorName || operatorName.trim() === '') {
        alert('กรุณาใส่ชื่อผู้ปฏิบัติงาน');
        return false;
    }
    
    if (operatorName.trim().length < 2) {
        alert('ชื่อผู้ปฏิบัติงานต้องมีความยาวอย่างน้อย 2 ตัวอักษร');
        return false;
    }
    
    return true;
}

/**
 * Validates machine number format
 * @param {string} machineNo - Machine number to validate
 * @returns {boolean} - True if valid, false otherwise
 */
function validateMachineNumber(machineNo) {
    if (!machineNo || machineNo.trim() === '') {
        alert('กรุณาเลือกหมายเลขเครื่องจักร');
        return false;
    }
    
    return true;
}

/**
 * Validates time format (HH:MM)
 * @param {string} timeStr - Time string to validate
 * @returns {boolean} - True if valid, false otherwise
 */
function validateTimeFormat(timeStr) {
    if (!timeStr) return false;
    
    const timePattern = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timePattern.test(timeStr);
}

/**
 * Validates date format (YYYY-MM-DD)
 * @param {string} dateStr - Date string to validate
 * @returns {boolean} - True if valid, false otherwise
 */
function validateDateFormat(dateStr) {
    if (!dateStr) return false;
    
    const date = new Date(dateStr);
    return date instanceof Date && !isNaN(date) && dateStr === date.toISOString().split('T')[0];
}

/**
 * Validates complete form data for job operations
 * @param {Object} formData - Form data object to validate
 * @returns {Object} - Validation result with isValid flag and errors array
 */
function validateFormData(formData) {
    const errors = [];
    
    if (!validateJobNumber(formData.jobNo)) {
        errors.push('หมายเลขงานไม่ถูกต้อง');
    }
    
    if (!validateStepNo(formData.stepNo)) {
        errors.push('หมายเลขขั้นตอนไม่ถูกต้อง');
    }
    
    if (!validateOperatorName(formData.operatorName)) {
        errors.push('ชื่อผู้ปฏิบัติงานไม่ถูกต้อง');
    }
    
    if (!validateMachineNumber(formData.machineNo)) {
        errors.push('หมายเลขเครื่องจักรไม่ถูกต้อง');
    }
    
    return {
        isValid: errors.length === 0,
        errors: errors
    };
}

// Export functions to global scope for HTML onblur handlers
window.validateStepNo = validateStepNo;
