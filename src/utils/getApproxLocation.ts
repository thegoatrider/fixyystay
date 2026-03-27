/**
 * Generates a slightly randomized location within approximately 1km radius.
 * This is used for "Approximate Location" view to protect privacy.
 * 
 * Logic:
 * lat ± (Math.random() - 0.5) * 0.01
 * lng ± (Math.random() - 0.5) * 0.01
 */
export function getApproxLocation(lat: number, lng: number): { lat: number; lng: number } {
  // Use a fixed seed factor if we want it to be "consistent" for a specific coordinate
  // But the user requested "Run this only in frontend" and "Do NOT store randomized values"
  // So we'll just do it on the fly. 
  
  const randomLat = lat + (Math.random() - 0.5) * 0.01;
  const randomLng = lng + (Math.random() - 0.5) * 0.01;
  
  return {
    lat: randomLat,
    lng: randomLng
  };
}
