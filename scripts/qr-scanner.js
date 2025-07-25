/**
 * QR Scanner Module for CNC Job Log Application
 * Handles QR code scanning, alternative format parsing, and manual input
 */

// ========== QR SCANNER CORE FUNCTIONS ==========

/**
 * Initialize and start QR code scanner
 */
function startScan() {
  console.log('Starting QR scanner...');
  scanHandled = false;
  const qrReader = document.getElementById('qr-reader');
  
  if (!qrReader) {
    console.error('QR reader element not found!');
    alert('ไม่พบองค์ประกอบสแกน QR กรุณารีเฟรชหน้าเว็บ');
    return;
  }
  
  qrReader.style.display = '';
  qrReader.style.border = '';
  qrReader.classList.add('active');
  
  if (!qrReader.querySelector('.scan-line')) {
    const scanLine = document.createElement('div');
    scanLine.className = 'scan-line';
    qrReader.appendChild(scanLine);
  }
  
  if (window.qrScanner) {
    window.qrScanner.stop().catch(()=>{});
    window.qrScanner = null;
  }
  
  // Check if Html5Qrcode is available
  if (typeof Html5Qrcode === 'undefined') {
    console.error('Html5Qrcode library not loaded!');
    alert('ไลบรารี QR Scanner ไม่ได้โหลด กรุณารีเฟรชหน้าเว็บ');
    return;
  }
  
  try {
    window.qrScanner = new Html5Qrcode("qr-reader");
    console.log('QR Scanner initialized');
    
    // Use configuration from config.js
    const config = { 
      fps: QR_SCANNER_CONFIG.qps, 
      qrbox: { width: 320, height: 320 },
      aspectRatio: QR_SCANNER_CONFIG.aspectRatio,
      disableFlip: QR_SCANNER_CONFIG.disableFlip,
      supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA]
    };
    
    console.log('Starting camera with default settings...');
    
    window.qrScanner.start(
      { facingMode: "environment" }, // Request back camera
      config,
      qr => {
        console.log('QR Code detected:', qr);
        if (scanHandled) return;
        
        // Try to parse as JSON first
        try {
          qrData = JSON.parse(qr);
          console.log('QR Data parsed successfully as JSON:', qrData);
          
          // Validate required fields
          if (!qrData.projectNo || !qrData.customerName || !qrData.partName || 
              !qrData.drawingNo || !qrData.quantityOrdered) {
            throw new Error('Missing required fields in QR data');
          }
          
          handleSuccessfulScan();
          
        } catch (parseError) {
          console.log('JSON parse failed, trying alternative formats:', parseError);
          
          // Try to parse as simple text format (comma-separated or other formats)
          if (tryAlternativeFormats(qr)) {
            handleSuccessfulScan();
          } else {
            handleScanError(qr, parseError);
          }
        }
      },
      errorMessage => {
        // Handle scanning errors more gracefully
        if (errorMessage && !errorMessage.includes('NotFoundException') && 
            !errorMessage.includes('No MultiFormat Readers')) {
          console.log('QR Scanner error:', errorMessage);
        }
        // Don't show alerts for common scanning errors that occur during normal operation
      }
    ).catch(err => {
      handleCameraError(err);
    });
  } catch (initError) {
    console.error('QR Scanner initialization error:', initError);
    alert("ไม่สามารถเริ่มต้น QR Scanner ได้: " + initError);
  }
}

/**
 * Handle successful QR scan
 */
function handleSuccessfulScan() {
  const qrReader = document.getElementById('qr-reader');
  qrReader.style.border = '4px solid #0f0';
  scanHandled = true;
  setTimeout(() => {
    fillInfoScreen();
    showScreen('info-screen');
  }, 150);
  window.qrScanner.stop();
  window.qrScanner = null;
}

/**
 * Handle QR scan error with user-friendly message
 */
function handleScanError(qr, parseError) {
  console.error('All QR parse attempts failed:', parseError);
  const qrReader = document.getElementById('qr-reader');
  qrReader.style.border = '4px solid #e00';
  setTimeout(() => {
    qrReader.style.border = '';
  }, 1000);
  
  // Show more helpful error message using config
  const errorMsg = `${UI_MESSAGES.QR_SCAN_ERROR}\n\nข้อมูลที่สแกนได้: ${qr.substring(0, 100)}${qr.length > 100 ? '...' : ''}\n\n${UI_MESSAGES.QR_RETRY_MESSAGE}`;
  alert(errorMsg);
}

/**
 * Handle camera initialization errors
 */
function handleCameraError(err) {
  console.error('Camera start error:', err);
  console.error('Error details:', err.message || err);
  
  // Try to provide more specific error messages
  let errorMessage = "ไม่สามารถเริ่มกล้องได้: " + (err.message || err);
  
  if (err.message && err.message.includes('Permission')) {
    errorMessage = "ไม่ได้รับอนุญาตให้เข้าถึงกล้อง กรุณาอนุญาตการเข้าถึงกล้องในเบราว์เซอร์";
  } else if (err.message && err.message.includes('NotFoundError')) {
    errorMessage = "ไม่พบกล้อง กรุณาตรวจสอบการเชื่อมต่อกล้อง";
  }
  
  alert(errorMessage);
}

// ========== ALTERNATIVE FORMAT PARSERS ==========

/**
 * Try to parse QR code in alternative formats
 * @param {string} qrText - The QR code text to parse
 * @returns {boolean} - True if parsing was successful
 */
function tryAlternativeFormats(qrText) {
  try {
    console.log('Trying alternative QR formats for:', qrText);
    
    // Format 1: Comma-separated values
    // Expected: projectNo,customerName,partName,drawingNo,quantityOrdered
    if (qrText.includes(',')) {
      const parts = qrText.split(',');
      if (parts.length >= 5) {
        qrData = {
          projectNo: parts[0].trim(),
          customerName: parts[1].trim(),
          partName: parts[2].trim(),
          drawingNo: parts[3].trim(),
          quantityOrdered: parts[4].trim()
        };
        console.log('Parsed as CSV format:', qrData);
        return true;
      }
    }
    
    // Format 2: Pipe-separated values
    if (qrText.includes('|')) {
      const parts = qrText.split('|');
      if (parts.length >= 5) {
        qrData = {
          projectNo: parts[0].trim(),
          customerName: parts[1].trim(),
          partName: parts[2].trim(),
          drawingNo: parts[3].trim(),
          quantityOrdered: parts[4].trim()
        };
        console.log('Parsed as pipe-separated format:', qrData);
        return true;
      }
    }
    
    // Format 3: Key-value pairs (simple format)
    // Expected: PROJECT:123\nCUSTOMER:ABC\nPART:XYZ\nDRAWING:456\nQTY:100
    if (qrText.includes(':') && qrText.includes('\n')) {
      const lines = qrText.split('\n');
      const data = {};
      for (const line of lines) {
        const [key, value] = line.split(':');
        if (key && value) {
          const trimmedKey = key.trim().toUpperCase();
          const trimmedValue = value.trim();
          
          if (trimmedKey.includes('PROJECT') || trimmedKey.includes('PROJ')) {
            data.projectNo = trimmedValue;
          } else if (trimmedKey.includes('CUSTOMER') || trimmedKey.includes('CUST')) {
            data.customerName = trimmedValue;
          } else if (trimmedKey.includes('PART')) {
            data.partName = trimmedValue;
          } else if (trimmedKey.includes('DRAWING') || trimmedKey.includes('DWG')) {
            data.drawingNo = trimmedValue;
          } else if (trimmedKey.includes('QUANTITY') || trimmedKey.includes('QTY')) {
            data.quantityOrdered = trimmedValue;
          }
        }
      }
      
      if (data.projectNo && data.customerName && data.partName && data.drawingNo && data.quantityOrdered) {
        qrData = data;
        console.log('Parsed as key-value format:', qrData);
        return true;
      }
    }
    
    // Format 4: Try to extract from any text that might contain the data
    // Look for patterns like numbers and text that could be our data
    const words = qrText.split(/[\s,|;:\n\t]+/).filter(w => w.trim().length > 0);
    if (words.length >= 5) {
      // Assume first 5 non-empty words are our data fields
      qrData = {
        projectNo: words[0],
        customerName: words[1],
        partName: words[2],
        drawingNo: words[3],
        quantityOrdered: words[4]
      };
      console.log('Parsed as space-separated format:', qrData);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error in alternative format parsing:', error);
    return false;
  }
}

// ========== MANUAL INPUT FUNCTIONS ==========

/**
 * Toggle between QR scanner and manual input form
 */
function toggleManualInput() {
  const manualInput = document.getElementById('manual-input');
  const qrReader = document.getElementById('qr-reader');
  if (manualInput.style.display === 'none') {
    manualInput.style.display = 'block';
    qrReader.style.display = 'none';
    // Stop camera when switching to manual input
    if (window.qrScanner) {
      window.qrScanner.stop().catch(()=>{});
      window.qrScanner = null;
    }
  } else {
    manualInput.style.display = 'none';
    qrReader.style.display = '';
    // Restart camera when switching back to QR scan
    setTimeout(() => startScan(), 100);
  }
}

/**
 * Process manual input form submission
 * @param {Event} event - Form submission event
 */
function processManualInput(event) {
  event.preventDefault();
  try {
    qrData = {
      projectNo: document.getElementById('manual-project').value.trim(),
      customerName: document.getElementById('manual-customer').value.trim(),
      partName: document.getElementById('manual-part').value.trim(),
      drawingNo: document.getElementById('manual-drawing').value.trim(),
      quantityOrdered: document.getElementById('manual-quantity').value.trim()
    };
    
    // Validate required fields
    if (!qrData.projectNo || !qrData.customerName || !qrData.partName || 
        !qrData.drawingNo || !qrData.quantityOrdered) {
      alert('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }
    
    console.log('Manual input data:', qrData);
    fillInfoScreen();
    showScreen('info-screen');
  } catch (error) {
    console.error('Manual input error:', error);
    alert('เกิดข้อผิดพลาดในการประมวลผลข้อมูล');
  }
}

// ========== QR SCANNER UTILITIES ==========

/**
 * Stop QR scanner if running
 */
function stopQRScanner() {
  if (window.qrScanner) {
    window.qrScanner.stop().catch(()=>{});
    window.qrScanner = null;
  }
}

/**
 * Check if QR scanner is currently active
 * @returns {boolean} - True if scanner is active
 */
function isQRScannerActive() {
  return window.qrScanner !== null && window.qrScanner !== undefined;
}

// Export functions for module compatibility (if needed)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    startScan,
    tryAlternativeFormats,
    toggleManualInput,
    processManualInput,
    stopQRScanner,
    isQRScannerActive,
    handleSuccessfulScan,
    handleScanError,
    handleCameraError
  };
}

// Export functions to global scope for HTML onclick handlers
window.toggleManualInput = toggleManualInput;
window.processManualInput = processManualInput;
