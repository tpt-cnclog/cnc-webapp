/**
 * Configuration and Global Variables for CNC Job Log Application
 * Contains critical backend endpoints and application state variables
 */

// ========== CRITICAL BACKEND CONFIGURATION ==========
// WARNING: GAS_ENDPOINT is essential for all backend communication
const url = "https://script.google.com/macros/s/AKfycbzJQYUFo_oMQzdYC0fXFdm3nrUDoEGE0GAjvcvMxwMqRiO_APDn1C2r3Q5m3zSgxNL-sw/exec";
const GAS_ENDPOINT = url;

// ========== GLOBAL APPLICATION STATE ==========
// Global QR data object
let qrData = {};
let scanHandled = false;
let isSubmitting = false;

// ========== APPLICATION CONSTANTS ==========
// OT (Overtime) Configuration
const OT_START_TIME = {
  hours: 17,
  minutes: 30
};

// QR Scanner Configuration
const QR_SCANNER_CONFIG = {
  qps: 10,
  disableFlip: false,
  aspectRatio: 1.0
};

// UI Messages (Thai)
const UI_MESSAGES = {
  OT_EARLY_WARNING: "ไม่สามารถเริ่ม OT ก่อนเวลา 17:30 น.",
  QR_SCAN_ERROR: "QR Code ไม่สามารถอ่านได้",
  QR_RETRY_MESSAGE: "กรุณาลองใหม่หรือใช้การใส่ข้อมูลด้วยตนเอง",
  STEP_NO_VALIDATION_ERROR: "รูปแบบ Step No. ไม่ถูกต้อง"
};

// Validation Patterns
const VALIDATION_PATTERNS = {
  STEP_NO: /^[0-9]+(\+[0-9]+)*$/
};

// Export for module compatibility (if needed)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    GAS_ENDPOINT,
    qrData,
    scanHandled,
    isSubmitting,
    OT_START_TIME,
    QR_SCANNER_CONFIG,
    UI_MESSAGES,
    VALIDATION_PATTERNS
  };
}
