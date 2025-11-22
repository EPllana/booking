// Helper function to format time to 24-hour format (HH:MM)
// Removes any AM/PM indicators and ensures 24-hour format
export const formatTime24 = (timeString) => {
  if (!timeString) return '';
  
  // Remove any AM/PM indicators (case insensitive)
  let cleanTime = timeString.trim().replace(/\s*(AM|PM|am|pm)\s*/gi, '');
  
  // If already in 24-hour format (HH:MM), return as is
  if (/^\d{2}:\d{2}$/.test(cleanTime)) {
    return cleanTime;
  }
  
  // If in 12-hour format without AM/PM, try to parse
  const timeMatch = cleanTime.match(/(\d{1,2}):(\d{2})/);
  if (!timeMatch) return cleanTime; // Return cleaned if can't parse
  
  let hours = parseInt(timeMatch[1], 10);
  const minutes = timeMatch[2];
  
  // If original had PM indicator, convert to 24-hour
  const originalUpper = timeString.toUpperCase();
  if (originalUpper.includes('PM') && hours !== 12) {
    hours += 12;
  } else if (originalUpper.includes('AM') && hours === 12) {
    hours = 0;
  }
  
  // Format as HH:MM (24-hour format)
  return `${hours.toString().padStart(2, '0')}:${minutes}`;
};

// Helper to ensure time is always displayed in 24-hour format (European format)
export const displayTime24 = (timeString) => {
  return formatTime24(timeString);
};

