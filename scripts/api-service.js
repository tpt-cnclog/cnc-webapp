/**
 * API Service Module for CNC Job Log Application
 * Handles all backend communication with Google Apps Script
 */

// ========== CORE API FUNCTIONS ==========

/**
 * Fetch open jobs from backend
 * @param {string} projectNo - Project number filter
 * @param {string} partName - Part name filter
 * @returns {Promise<Array>} Array of open jobs
 */
async function fetchOpenJobs(projectNo, partName) {
  const params = new URLSearchParams({
    mode: 'openJobs',
    projectNo: projectNo || '',
    partName: partName || ''
  });
  
  try {
    const response = await fetch(`${GAS_ENDPOINT}?${params.toString()}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching open jobs:', error);
    throw error;
  }
}

/**
 * Fetch paused jobs from backend
 * @param {string} projectNo - Project number filter
 * @param {string} partName - Part name filter
 * @returns {Promise<Array>} Array of paused jobs
 */
async function fetchPausedJobs(projectNo, partName) {
  const params = new URLSearchParams({
    mode: 'pausedJobs',
    projectNo: projectNo || '',
    partName: partName || ''
  });
  
  try {
    const response = await fetch(`${GAS_ENDPOINT}?${params.toString()}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching paused jobs:', error);
    throw error;
  }
}

/**
 * Submit start job data to backend
 * @param {Object} jobData - Job data to submit
 * @returns {Promise<Object>} Backend response
 */
async function submitStartJob(jobData) {
  try {
    const response = await fetch(GAS_ENDPOINT, {
      method: "POST",
      mode: "cors",
      headers: {
        "Content-Type": "text/plain",
      },
      body: JSON.stringify({
        ...jobData
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const text = await response.text();
    
    // Handle error responses that start with "ERROR:"
    if (text.trim().startsWith("ERROR:")) {
      return { error: text.trim().replace("ERROR: ", "") };
    }
    
    // For successful responses, return the text as success
    return { success: text.trim() };
  } catch (error) {
    console.error('Error submitting start job:', error);
    throw error;
  }
}

/**
 * Submit stop job data to backend
 * @param {Object} jobData - Job data to submit
 * @returns {Promise<Object>} Backend response
 */
async function submitStopJob(jobData) {
  try {
    const response = await fetch(GAS_ENDPOINT, {
      method: "POST",
      mode: "cors",
      headers: {
        "Content-Type": "text/plain",
      },
      body: JSON.stringify({
        ...jobData
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const text = await response.text();
    
    // Handle error responses that start with "ERROR:"
    if (text.trim().startsWith("ERROR:")) {
      return { error: text.trim().replace("ERROR: ", "") };
    }
    
    // For successful responses, return the text as success
    return { success: text.trim() };
  } catch (error) {
    console.error('Error submitting stop job:', error);
    throw error;
  }
}

/**
 * Submit pause job data to backend
 * @param {Object} jobData - Job data to submit
 * @returns {Promise<Object>} Backend response
 */
async function submitPauseJob(jobData) {
  try {
    const response = await fetch(GAS_ENDPOINT, {
      method: "POST",
      mode: "cors",
      headers: {
        "Content-Type": "text/plain",
      },
      body: JSON.stringify({
        ...jobData
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const text = await response.text();
    
    // Handle error responses that start with "ERROR:"
    if (text.trim().startsWith("ERROR:")) {
      return { error: text.trim().replace("ERROR: ", "") };
    }
    
    // For successful responses, return the text as success
    return { success: text.trim() };
  } catch (error) {
    console.error('Error submitting pause job:', error);
    throw error;
  }
}

/**
 * Submit continue/resume job data to backend
 * @param {Object} jobData - Job data to submit
 * @returns {Promise<Object>} Backend response
 */
async function submitContinueJob(jobData) {
  try {
    const response = await fetch(GAS_ENDPOINT, {
      method: "POST",
      mode: "cors",
      headers: {
        "Content-Type": "text/plain",
      },
      body: JSON.stringify({
        ...jobData
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const text = await response.text();
    
    // Handle error responses that start with "ERROR:"
    if (text.trim().startsWith("ERROR:")) {
      return { error: text.trim().replace("ERROR: ", "") };
    }
    
    // For successful responses, return the text as success
    return { success: text.trim() };
  } catch (error) {
    console.error('Error submitting continue job:', error);
    throw error;
  }
}

/**
 * Fetch current open jobs for display
 * @param {string} projectNo - Project number filter
 * @param {string} partName - Part name filter
 * @returns {Promise<Array>} Array of current open jobs
 */
async function fetchCurrentOpenJobs(projectNo, partName) {
  const params = new URLSearchParams({
    mode: 'currentOpenJobs',
    projectNo: projectNo || '',
    partName: partName || ''
  });
  
  try {
    const response = await fetch(`${GAS_ENDPOINT}?${params.toString()}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching current open jobs:', error);
    throw error;
  }
}

/**
 * Check for potential duplicate jobs
 * @param {Object} jobData - Job data to check
 * @returns {Promise<Array>} Array of potential duplicates
 */
async function checkForDuplicates(jobData) {
  const params = new URLSearchParams({
    mode: 'checkDuplicates',
    projectNo: jobData.projectNo || '',
    partName: jobData.partName || '',
    processName: jobData.processName || '',
    machineNo: jobData.machineNo || ''
  });
  
  try {
    const response = await fetch(`${GAS_ENDPOINT}?${params.toString()}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error checking for duplicates:', error);
    throw error;
  }
}

// ========== UTILITY FUNCTIONS ==========

/**
 * Generic API call with retry logic
 * @param {string} url - API endpoint URL
 * @param {Object} options - Fetch options
 * @param {number} retries - Number of retry attempts
 * @returns {Promise<Object>} API response
 */
async function apiCallWithRetry(url, options = {}, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`API call attempt ${i + 1} failed:`, error);
      if (i === retries - 1) throw error;
      
      // Wait before retry (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
    }
  }
}

/**
 * Handle API errors with user-friendly messages
 * @param {Error} error - The error object
 * @param {string} operation - Description of the operation that failed
 */
function handleApiError(error, operation = 'API operation') {
  console.error(`${operation} failed:`, error);
  
  let userMessage = 'เกิดข้อผิดพลาดในการติดต่อเซิร์ฟเวอร์';
  
  if (error.message.includes('fetch')) {
    userMessage = 'ไม่สามารถติดต่อเซิร์ฟเวอร์ได้ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต';
  } else if (error.message.includes('timeout')) {
    userMessage = 'การเชื่อมต่อใช้เวลานานเกินไป กรุณาลองใหม่อีกครั้ง';
  } else if (error.message.includes('401')) {
    userMessage = 'ไม่มีสิทธิ์เข้าถึงข้อมูล กรุณาติดต่อผู้ดูแลระบบ';
  } else if (error.message.includes('500')) {
    userMessage = 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์ กรุณาลองใหม่ภายหลัง';
  }
  
  alert(userMessage);
}

// Export functions for module compatibility (if needed)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    fetchOpenJobs,
    fetchPausedJobs,
    submitStartJob,
    submitStopJob,
    submitPauseJob,
    submitContinueJob,
    fetchCurrentOpenJobs,
    checkForDuplicates,
    apiCallWithRetry,
    handleApiError
  };
}
