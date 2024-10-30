import {InterpolatedWeather} from "~/.server/interfaces";

export function skyRating(locations: InterpolatedWeather[]): number {
  // Constants for atmospheric calculations
  const EARTH_RADIUS_KM = 6371;
  const MILES_TO_KM = 1.60934;

  // Heights of cloud layers (in meters)
  const CLOUD_HEIGHTS = {
    low: 2000,    // 0-2km
    mid: 5000,    // 2-6km
    high: 9000    // 6-12km
  };

  // Calculate viewing angle to a point given distance
  function getViewingAngle(distanceMiles: number): number {
    const distanceKm = distanceMiles * MILES_TO_KM;
    return Math.atan2(distanceKm, EARTH_RADIUS_KM) * (180 / Math.PI);
  }

  // Calculate optimal cloud scores based on distance and height
  function getCloudPositionScore(location: InterpolatedWeather, distanceMiles: number): number {
    const { cloud_cover_low, cloud_cover_mid, cloud_cover_high } = location;
    const viewingAngle = getViewingAngle(distanceMiles);

    // Near clouds (0-20 miles) should be minimal to avoid blocking
    if (distanceMiles <= 20) {
      // Severe penalties for any low clouds near the observer
      const lowCloudPenalty = Math.pow(cloud_cover_low / 100, 2) * 100;
      // Moderate penalties for mid clouds
      const midCloudPenalty = Math.pow(cloud_cover_mid / 100, 1.5) * 50;

      return Math.max(0, 100 - lowCloudPenalty - midCloudPenalty);
    }

    // Mid-distance clouds (20-60 miles) are ideal for color reflection
    if (distanceMiles > 20 && distanceMiles <= 60) {
      // High clouds are ideal at this distance
      const highCloudScore = cloud_cover_high <= 70
        ? Math.sin((cloud_cover_high / 70) * Math.PI) * 100  // Peak at ~45%
        : Math.max(0, 100 - (cloud_cover_high - 70) * 3);

      // Mid clouds can add texture if not too dense
      const midCloudScore = cloud_cover_mid <= 40
        ? cloud_cover_mid * 2
        : Math.max(0, 100 - (cloud_cover_mid - 40) * 3);

      // Low clouds should still be minimal
      const lowCloudPenalty = Math.pow(cloud_cover_low / 100, 2) * 70;

      return Math.max(0, (highCloudScore * 0.6 + midCloudScore * 0.4) * (1 - lowCloudPenalty / 100));
    }

    // Far clouds (60-100 miles) need to be properly positioned for sunlight reflection
    const optimalHeight = Math.tan(viewingAngle * (Math.PI / 180)) * (distanceMiles * MILES_TO_KM * 1000);

    // Score based on cloud presence at optimal viewing height
    let heightScore: number;
    if (optimalHeight <= CLOUD_HEIGHTS.low) {
      heightScore = 100 - cloud_cover_low; // Want clear skies at low height
    } else if (optimalHeight <= CLOUD_HEIGHTS.mid) {
      heightScore = cloud_cover_mid <= 60 ? cloud_cover_mid : Math.max(0, 100 - (cloud_cover_mid - 60) * 2);
    } else {
      heightScore = cloud_cover_high <= 70 ? cloud_cover_high : Math.max(0, 100 - (cloud_cover_high - 70) * 2);
    }

    return heightScore;
  }

  // Calculate visibility impact on light transmission
  function getVisibilityScore(visibility: number, distanceMiles: number): number {
    // Convert visibility to km
    const visibilityKm = visibility / 1000;
    const distanceKm = distanceMiles * MILES_TO_KM;

    // Calculate atmospheric attenuation
    const attenuationFactor = Math.exp(-distanceKm / visibilityKm);

    // More forgiving for closer distances
    const distanceWeight = Math.max(0.3, 1 - (distanceMiles / 100));

    return attenuationFactor * 100 * distanceWeight;
  }

  // Calculate light interaction potential based on cloud arrangements
  function getLightInteractionScore(locations: InterpolatedWeather[]): number {
    let score = 0;
    const distances = [0, 20, 40, 60, 80, 100];

    // Look for optimal arrangements of clouds for light reflection
    for (let i = 0; i < locations.length - 1; i++) {
      const curr = locations[i];
      const next = locations[i + 1];
      const distance = distances[i];

      // Check for clear path for initial light entry
      if (distance < 40) {
        // Want minimal low/mid clouds for light to enter
        const clearPath = (100 - curr.cloud_cover_low) * (100 - curr.cloud_cover_mid) / 100;
        score += clearPath * 0.3;
      } else {
        // Want high clouds for reflection but not complete coverage
        const reflectionPotential = curr.cloud_cover_high <= 70
          ? curr.cloud_cover_high
          : Math.max(0, 100 - (curr.cloud_cover_high - 70) * 2);
        score += reflectionPotential * 0.7;
      }
    }

    return Math.min(100, score / locations.length);
  }

  // Calculate final score with distance-weighted components
  const distances = [0, 20, 40, 60, 80, 100];
  let finalScore = 0;
  let totalWeight = 0;

  // Analyze each location with distance-appropriate weighting
  for (let i = 0; i < locations.length; i++) {
    const distance = distances[i];
    // Closer locations matter more for overall visibility
    const distanceWeight = Math.exp(-distance / 60);
    totalWeight += distanceWeight;

    const cloudScore = getCloudPositionScore(locations[i], distance);
    const visibilityScore = getVisibilityScore(locations[i].visibility, distance);

    finalScore += distanceWeight * (
      cloudScore * 0.6 +
      visibilityScore * 0.4
    );
  }

  // Normalize by weights
  finalScore = finalScore / totalWeight;

  // Add light interaction component
  const lightScore = getLightInteractionScore(locations);
  finalScore = finalScore * 0.7 + lightScore * 0.3;

  // Apply slight sigmoid curve to enhance separation
  const curvedScore = (1 / (1 + Math.exp(-0.07 * (finalScore - 50)))) * 100;

  return Math.round(Math.max(0, Math.min(100, curvedScore)));
}