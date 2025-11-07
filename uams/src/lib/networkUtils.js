// Network utility functions for university WiFi detection and attendance validation

/**
 * Get the client's IP address
 * Note: This will get the public IP, not the local network IP
 */
export const getClientIP = async () => {
  try {
    // Using a free IP detection service
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
  } catch (error) {
    console.error('Error getting client IP:', error);
    
    // Fallback: try alternative service
    try {
      const response = await fetch('https://httpbin.org/ip');
      const data = await response.json();
      return data.origin.split(',')[0].trim(); // httpbin might return multiple IPs
    } catch (fallbackError) {
      console.error('Fallback IP detection failed:', fallbackError);
      return null;
    }
  }
};

/**
 * Get client's approximate location using geolocation API
 */
export const getClientLocation = () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser'));
      return;
    }

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000 // 1 minute cache
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        });
      },
      (error) => {
        let errorMessage = 'Unknown geolocation error';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied by user';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information unavailable';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out';
            break;
        }
        reject(new Error(errorMessage));
      },
      options
    );
  });
};

/**
 * Check if the client is on university network
 * This function checks against known university IP ranges
 */
export const isOnUniversityNetwork = async (supabase) => {
  try {
    const clientIP = await getClientIP();
    if (!clientIP) {
      return { isUniversityNetwork: false, error: 'Could not determine IP address' };
    }

    // Check against university network ranges in database
    const { data, error } = await supabase
      .from('university_network')
      .select('*')
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching university networks:', error);
      return { isUniversityNetwork: false, error: 'Database error checking network' };
    }

    // For development/testing: If no university networks are configured, 
    // we'll do a simple check for common private IP ranges that might indicate campus network
    if (!data || data.length === 0) {
      console.warn('No university networks configured. Using fallback detection.');
      return checkFallbackUniversityNetwork(clientIP);
    }

    // Check if client IP falls within any university network range
    for (const network of data) {
      if (isIPInRange(clientIP, network.ip_range_start, network.ip_range_end)) {
        return {
          isUniversityNetwork: true,
          networkInfo: {
            name: network.network_name,
            location: network.campus_location,
            clientIP: clientIP
          }
        };
      }
    }

    return {
      isUniversityNetwork: false,
      clientIP: clientIP,
      error: `IP ${clientIP} is not in any university network range`
    };

  } catch (error) {
    console.error('Error checking university network:', error);
    return { isUniversityNetwork: false, error: error.message };
  }
};

/**
 * Fallback function for development/testing
 * Checks for common private IP ranges that might indicate campus network
 */
const checkFallbackUniversityNetwork = (clientIP) => {
  // For testing purposes, assume these IP ranges are university networks:
  const testUniversityRanges = [
    { start: '192.168.1.0', end: '192.168.1.255', name: 'Campus WiFi Range 1' },
    { start: '192.168.2.0', end: '192.168.2.255', name: 'Campus WiFi Range 2' },
    { start: '10.0.0.0', end: '10.255.255.255', name: 'Campus Internal Network' },
    { start: '172.16.0.0', end: '172.31.255.255', name: 'Campus Private Network' }
  ];

  for (const range of testUniversityRanges) {
    if (isIPInRange(clientIP, range.start, range.end)) {
      return {
        isUniversityNetwork: true,
        networkInfo: {
          name: range.name,
          location: 'Campus (Testing)',
          clientIP: clientIP
        }
      };
    }
  }

  // For development: Allow localhost/development IPs
  if (clientIP === '127.0.0.1' || clientIP === '::1' || clientIP.startsWith('192.168.') || clientIP.startsWith('10.')) {
    return {
      isUniversityNetwork: true,
      networkInfo: {
        name: 'Development Network',
        location: 'Development Environment',
        clientIP: clientIP
      },
      isDevelopment: true
    };
  }

  return {
    isUniversityNetwork: false,
    clientIP: clientIP,
    error: `IP ${clientIP} is not recognized as university network`
  };
};

/**
 * Check if an IP address is within a given range
 */
const isIPInRange = (ip, rangeStart, rangeEnd) => {
  try {
    const ipNum = ipToNumber(ip);
    const startNum = ipToNumber(rangeStart);
    const endNum = ipToNumber(rangeEnd);
    
    return ipNum >= startNum && ipNum <= endNum;
  } catch (error) {
    console.error('Error checking IP range:', error);
    return false;
  }
};

/**
 * Convert IP address string to number for comparison
 */
const ipToNumber = (ip) => {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
};

/**
 * Validate attendance eligibility
 * Checks both network and time constraints
 */
export const validateAttendanceEligibility = async (lecture, supabase) => {
  const validationResult = {
    canMarkAttendance: false,
    networkCheck: null,
    timeCheck: null,
    locationCheck: null,
    errors: []
  };

  try {
    // 1. Check if on university network
    const networkResult = await isOnUniversityNetwork(supabase);
    validationResult.networkCheck = networkResult;
    
    if (!networkResult.isUniversityNetwork) {
      validationResult.errors.push('You must be connected to university WiFi to mark attendance');
    }

    // 2. Check if within lecture time window
    const now = new Date();
    const lectureDate = new Date(lecture.lecture_date);
    const lectureStart = new Date(`${lecture.lecture_date}T${lecture.start_time}`);
    const lectureEnd = new Date(`${lecture.lecture_date}T${lecture.end_time}`);
    
    // Allow attendance marking 15 minutes before start and up to 30 minutes after start
    const allowedStart = new Date(lectureStart.getTime() - 15 * 60 * 1000);
    const allowedEnd = new Date(lectureStart.getTime() + 30 * 60 * 1000);
    
    const isWithinTimeWindow = now >= allowedStart && now <= allowedEnd;
    validationResult.timeCheck = {
      isWithinWindow: isWithinTimeWindow,
      currentTime: now,
      allowedStart: allowedStart,
      allowedEnd: allowedEnd,
      lecture: {
        start: lectureStart,
        end: lectureEnd
      }
    };

    if (!isWithinTimeWindow) {
      if (now < allowedStart) {
        validationResult.errors.push('Attendance marking will be available 15 minutes before lecture starts');
      } else if (now > allowedEnd) {
        validationResult.errors.push('Attendance marking is no longer available (closed 30 minutes after lecture start)');
      }
    }

    // 3. Optional: Get location for additional verification
    try {
      const location = await getClientLocation();
      validationResult.locationCheck = {
        available: true,
        coordinates: location
      };
    } catch (locationError) {
      validationResult.locationCheck = {
        available: false,
        error: locationError.message
      };
      // Location is optional, so don't add to errors
    }

    // 4. Determine if attendance can be marked
    validationResult.canMarkAttendance = networkResult.isUniversityNetwork && isWithinTimeWindow;

    return validationResult;

  } catch (error) {
    validationResult.errors.push(`Validation error: ${error.message}`);
    return validationResult;
  }
};

/**
 * Get user agent information for logging
 */
export const getUserAgent = () => {
  return navigator.userAgent || 'Unknown';
}; 