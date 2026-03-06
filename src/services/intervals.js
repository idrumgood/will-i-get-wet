/**
 * Calculates intervals along a GeoJSON LineString coordinates array.
 * We want a weather point roughly every X minutes of travel time.
 * Assumes a constant speed along the path for simplicity.
 * 
 * @param {[number, number][]} coordinates Array of [lon, lat] from OSRM
 * @param {number} totalDurationSeconds Overall trip duration
 * @param {Date} departureTime The time the user leaves
 * @param {number} intervalMinutes How often we want a weather point (default: 30 mins)
 * @returns {Array<{lat: number, lon: number, arrivalTime: Date}>}
 */
export function calculateWeatherIntervals(coordinates, totalDurationSeconds, departureTime, intervalMinutes = 30) {
  if (!coordinates || coordinates.length === 0) return [];
  
  const intervals = [];
  const durationMinutes = totalDurationSeconds / 60;
  
  // Number of intervals we want (minimum 2: start and end)
  const numIntervals = Math.max(2, Math.floor(durationMinutes / intervalMinutes) + 1);
  
  // We'll distribute the intervals evenly across the coordinate array index.
  // A mathematically perfect implementation would measure distance between each coord, 
  // but for bike routes a linear index distribution is a very close and much faster approximation.
  
  for (let i = 0; i < numIntervals; i++) {
    // Calculate the percentage of the trip for this interval
    const percent = numIntervals === 1 ? 0 : i / (numIntervals - 1);
    
    // Find the closest coordinate index
    const coordIndex = Math.min(
      coordinates.length - 1, 
      Math.floor(percent * (coordinates.length - 1))
    );
    
    const [lon, lat] = coordinates[coordIndex];
    
    // Calculate arrival time for this point
    const arrivalSeconds = totalDurationSeconds * percent;
    const arrivalTime = new Date(departureTime.getTime() + arrivalSeconds * 1000);
    
    intervals.push({
      lat,
      lon,
      arrivalTime,
      percentComplete: percent * 100
    });
  }
  
  return intervals;
}
