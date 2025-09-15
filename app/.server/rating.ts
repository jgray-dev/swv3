import { averageData } from "~/.server/data";
import { AveragedValues, InterpolatedWeather } from "~/.server/interfaces";

/**
 * Improved rating system using point interpolation for specific cloud types and coverage
 * This system uses more nuanced understanding of how different cloud types affect
 * the visual quality of sunrises and sunsets.
 */

// Cloud height constants in feet
const CLOUD_HEIGHTS = {
  LOW_BASE: 0,
  LOW_TOP: 6500,
  MID_BASE: 6500,
  MID_TOP: 23000,
  HIGH_BASE: 23000,
  HIGH_TOP: 45000,
  // Typical heights for specific cloud types
  STRATUS: 1000,
  STRATOCUMULUS: 2500,
  CUMULUS: 3500,
  CUMULONIMBUS_BASE: 1000,
  CUMULONIMBUS_TOP: 35000,
  ALTOCUMULUS: 10000,
  ALTOSTRATUS: 15000,
  NIMBOSTRATUS: 8000,
  CIRRUS: 30000,
  CIRROSTRATUS: 25000,
  CIRROCUMULUS: 23000,
};

/**
 * Optimized version of the interpolation function to avoid code duplication
 * @param input - Cloud coverage percentage (0-100)
 * @param points - Array of [coverage, score] points for interpolation
 */
function interpolatePoints(input: number, points: [number, number][]): number {
  input = Math.max(0, Math.min(100, input));

  let i = 0;
  while (i < points.length - 1 && points[i + 1][0] < input) {
    i++;
  }

  if (points[i][0] === input) {
    return points[i][1];
  }

  const [x1, y1] = points[i];
  const [x2, y2] = points[i + 1];
  const percentage = (input - x1) / (x2 - x1);

  return y1 + (y2 - y1) * percentage;
}

/**
 * Calculates score for far zone drama clouds
 * Far clouds create dramatic backgrounds and silhouettes
 * Moderate coverage (20-40%) is ideal for dramatic effects
 */
function farDramaClouds(input: number): number {
  // Optimized for color reflection and dramatic backgrounds
  const points: [number, number][] = [
    [0, 5], // No clouds: lacks reflective surfaces for color
    [10, 15], // Sparse clouds: beginning to provide reflection surfaces
    [20, 22], // Good coverage: creates dramatic elements and color reflection
    [30, 25], // Ideal: perfect balance of drama and light penetration
    [40, 23], // Still excellent: good drama with adequate light
    [50, 18], // Getting heavy: reduced light penetration affects colors
    [60, 12], // Heavy: significantly limited light for color reflection
    [70, 8], // Very heavy: poor color potential
    [80, 4], // Nearly overcast: minimal color potential
    [90, 2], // Almost completely blocked: very poor conditions
    [100, 0], // Completely overcast: no color potential
  ];

  return interpolatePoints(input, points);
}

/**
 * Mid-level clouds at the horizon create beautiful texture and reflect colors
 * Moderate coverage (20-30%) is ideal for textured appearance without blocking
 */
function horizonMidClouds(input: number): number {
  const points: [number, number][] = [
    [0, 3], // No clouds: lacks reflective surfaces for color
    [5, 8], // Very sparse: minimal color reflection potential
    [10, 16], // Sparse: beginning to provide good color reflection
    [15, 20], // Good: excellent color reflection without blocking
    [25, 22], // Ideal: perfect balance for vibrant colors
    [35, 20], // Still good: adequate color reflection
    [45, 16], // Getting heavy: reduced color potential
    [55, 10], // Heavy: significantly blocked color transmission
    [65, 6], // Very heavy: poor color potential
    [75, 3], // Nearly blocked: minimal color transmission
    [85, 1], // Almost completely blocked
    [100, 0], // Completely blocked: no color potential
  ];

  return interpolatePoints(input, points);
}

/**
 * High-level clouds are excellent for color diffusion and catching early/late light
 * Moderate-to-high coverage (30-50%) provides optimal color distribution
 */
function horizonHighClouds(input: number): number {
  const points: [number, number][] = [
    [0, 2], // No clouds: lacks color diffusion surfaces
    [10, 12], // Sparse: beginning color diffusion potential
    [20, 22], // Good: excellent color diffusion and reflection
    [30, 28], // Ideal: perfect for catching and scattering light
    [40, 30], // Ideal: maximum color diffusion potential
    [50, 28], // Still excellent: great color distribution
    [60, 24], // Good: adequate color potential but getting heavy
    [70, 18], // Moderate: reduced color effectiveness
    [80, 10], // Heavy: significant color blocking
    [90, 4], // Too heavy: minimal color potential
    [100, 0], // Completely covered: no color potential
  ];

  return interpolatePoints(input, points);
}

/**
 * Calculates weighted average cloud height based on cloud coverage percentages
 * More accurate representation of where in the atmosphere clouds are concentrated
 */
function calculateAverageCloudHeight(data: AveragedValues) {
  // Convert percentages to decimals (0-1)
  const lowPercent = data.low_clouds / 100;
  const midPercent = data.mid_clouds / 100;
  const highPercent = data.high_clouds / 100;

  // Define cloud heights - more precise representations
  const LOW_HEIGHT = (CLOUD_HEIGHTS.LOW_BASE + CLOUD_HEIGHTS.LOW_TOP) / 2;
  const MID_HEIGHT = (CLOUD_HEIGHTS.MID_BASE + CLOUD_HEIGHTS.MID_TOP) / 2;
  const HIGH_HEIGHT = (CLOUD_HEIGHTS.HIGH_BASE + CLOUD_HEIGHTS.HIGH_TOP) / 2;

  // Calculate total cloud coverage
  const totalCoverage = lowPercent + midPercent + highPercent;

  // If there are no clouds, return 0
  if (totalCoverage === 0) return 0;

  // Calculate weighted sum
  const weightedSum =
    lowPercent * LOW_HEIGHT +
    midPercent * MID_HEIGHT +
    highPercent * HIGH_HEIGHT;

  // Return weighted average
  return weightedSum / totalCoverage;
}

/**
 * Calculates multiplier for total cloud cover
 * Moderate coverage (10-50%) generally provides the best conditions
 */
function totalCoverMulti(input: number): number {
  const points: [number, number][] = [
    [0, 0.8], // Clear sky: lacks reflective surfaces for color
    [10, 0.95], // Minimal clouds: beginning color potential
    [20, 1], // Sparse clouds: good color reflection potential
    [30, 1], // Moderate clouds: excellent color conditions
    [40, 0.98], // Getting moderate: still excellent for colors
    [50, 0.92], // Moderate-heavy: good but reducing color penetration
    [60, 0.82], // Heavy: significant color reduction
    [70, 0.65], // Very heavy: poor color transmission
    [80, 0.4], // Nearly overcast: minimal color potential
    [90, 0.15], // Almost overcast: very poor color conditions
    [100, 0.05], // Completely overcast: essentially no color potential
  ];

  return interpolatePoints(input, points);
}

/**
 * Calculate the cloud diversity score - this rewards having a mix of cloud types
 * rather than just one dominant type, which tends to create more interesting skies
 */
function cloudDiversityScore(data: AveragedValues): number {
  const lowPercent = data.low_clouds / 100;
  const midPercent = data.mid_clouds / 100;
  const highPercent = data.high_clouds / 100;

  // Calculate total cloud coverage
  const totalCoverage = lowPercent + midPercent + highPercent;

  if (totalCoverage < 0.05) return 0; // Not enough clouds for diversity to matter

  // Calculate normalized proportions
  const lowProportion = lowPercent / totalCoverage;
  const midProportion = midPercent / totalCoverage;
  const highProportion = highPercent / totalCoverage;

  // Shannon diversity index (simplified) - higher when distribution is more even
  let diversity = 0;
  if (lowProportion > 0) diversity -= lowProportion * Math.log(lowProportion);
  if (midProportion > 0) diversity -= midProportion * Math.log(midProportion);
  if (highProportion > 0)
    diversity -= highProportion * Math.log(highProportion);

  // Normalize to 0-1 range (max value is log(3) when all proportions are equal)
  return Math.min(1, diversity / Math.log(3));
}

/**
 * Calculate freezing level impact - ice crystals in clouds create more vibrant colors
 * Particularly important for mid and high clouds
 */
function freezingLevelImpact(
  cloudHeight: number,
  freezingHeight: number,
): number {
  if (cloudHeight === 0) return 1; // No clouds, no impact

  // Calculate percentage of clouds likely to contain ice crystals
  const heightDiff = cloudHeight - freezingHeight;

  if (heightDiff <= 0) return 0.9; // Below freezing level - less spectacular

  // Optimal zone is 2000-6000 feet above freezing level
  if (heightDiff > 2000 && heightDiff < 6000) {
    return 1.25; // Ideal zone for ice crystal formation
  }

  // Linear reduction as we move away from optimal zone
  return Math.min(
    1.2,
    Math.max(0.9, 1 + (heightDiff - freezingHeight) / (cloudHeight * 2)),
  );
}

/**
 * Extrapolate discrete points into a continuous sampling
 * When analyzing a sunrise/sunset, having more sample points provides better accuracy
 */
function extrapolatePointData(
  data: InterpolatedWeather[],
): InterpolatedWeather[] {
  // If we already have 7+ points, no need to extrapolate
  if (data.length >= 7) return data;

  // Group the data by zone
  const nearPoints = data.filter((point) => point.zone === "near");
  const horizonPoints = data.filter((point) => point.zone === "horizon");
  const farPoints = data.filter((point) => point.zone === "far");

  // Sort each group by distance
  const sortByDistance = (a: InterpolatedWeather, b: InterpolatedWeather) =>
    a.distance - b.distance;
  nearPoints.sort(sortByDistance);
  horizonPoints.sort(sortByDistance);
  farPoints.sort(sortByDistance);

  // Create a new array to hold all points including extrapolated ones
  const extrapolatedData: InterpolatedWeather[] = [];

  // Helper function to interpolate between two weather points
  const interpolateWeatherPoints = (
    p1: InterpolatedWeather,
    p2: InterpolatedWeather,
    factor: number,
  ): InterpolatedWeather => {
    const lerp = (a: number, b: number, f: number) => a + (b - a) * f;

    return {
      latitude: lerp(p1.latitude, p2.latitude, factor),
      longitude: lerp(p1.longitude, p2.longitude, factor),
      temperature_2m: lerp(p1.temperature_2m, p2.temperature_2m, factor),
      cloud_cover: lerp(p1.cloud_cover, p2.cloud_cover, factor),
      cloud_cover_low: lerp(p1.cloud_cover_low, p2.cloud_cover_low, factor),
      cloud_cover_mid: lerp(p1.cloud_cover_mid, p2.cloud_cover_mid, factor),
      cloud_cover_high: lerp(p1.cloud_cover_high, p2.cloud_cover_high, factor),
      freezing_height: lerp(p1.freezing_height, p2.freezing_height, factor),
      visibility: lerp(p1.visibility, p2.visibility, factor),
      zone: p1.zone,
      distance: lerp(p1.distance, p2.distance, factor),
    };
  };

  // Add original and extrapolated points for each zone
  [
    { points: nearPoints, targetCount: 2, zone: "near" },
    { points: horizonPoints, targetCount: 3, zone: "horizon" },
    { points: farPoints, targetCount: 2, zone: "far" },
  ].forEach(({ points, targetCount, zone }) => {
    if (points.length <= 1) {
      // Just add the original point if we only have one
      extrapolatedData.push(...points);
    } else if (points.length >= targetCount) {
      // Already have enough points
      extrapolatedData.push(...points);
    } else {
      // Need to add interpolated points
      extrapolatedData.push(points[0]); // Add first point

      // Calculate how many points to add between each existing point
      const gaps = points.length - 1;
      const pointsToAdd = targetCount - points.length;
      const pointsPerGap = Math.ceil(pointsToAdd / gaps);

      // Add interpolated points between existing points
      for (let i = 0; i < points.length - 1; i++) {
        const p1 = points[i];
        const p2 = points[i + 1];

        for (let j = 1; j <= pointsPerGap; j++) {
          const factor = j / (pointsPerGap + 1);
          extrapolatedData.push(interpolateWeatherPoints(p1, p2, factor));
        }

        // Add the next original point (except for the last one which we'll add after the loop)
        if (i < points.length - 2) {
          extrapolatedData.push(points[i + 1]);
        }
      }

      // Add the last original point
      extrapolatedData.push(points[points.length - 1]);
    }
  });

  return extrapolatedData;
}

/**
 * Calculate the visibility quality for near zone
 * Poor visibility drastically reduces rating regardless of cloud conditions
 */
function visibilityQuality(visibility: number): number {
  // visibility is in meters
  if (visibility >= 20000) return 1; // Excellent visibility
  if (visibility <= 1000) return 0.4; // Very poor visibility

  // Linear scale between poor and excellent
  return 0.4 + ((visibility - 1000) * 0.6) / 19000;
}

/**
 * Calculate temperature impact - certain temperature ranges
 * tend to create better atmospheric conditions
 */
function temperatureImpact(temp: number, freezingHeight: number): number {
  // temperature in Fahrenheit

  // Temperature very close to freezing is often good for interesting conditions
  if (Math.abs(temp - 32) < 5 && freezingHeight < 5000) {
    return 1.1; // Slightly boost rating for near-freezing temperatures at low altitude
  }

  // Extremely cold or hot temperatures can affect air quality and visibility
  if (temp < 0 || temp > 100) {
    return 0.9;
  }

  return 1; // Neutral impact for moderate temperatures
}

/**
 * Main rating function - calculates the quality score for sunrise/sunset
 */
export function skyRating(data: InterpolatedWeather[]): {
  rating: number;
  debugData: any;
} {
  // Extrapolate to more points if needed for better analysis
  const processedData = extrapolatePointData(data);

  // Group data by zones
  const nearData = averageData(
    processedData.filter((point) => point.zone === "near"),
  );
  const horizonData = averageData(
    processedData.filter((point) => point.zone === "horizon"),
  );
  const farData = averageData(
    processedData.filter((point) => point.zone === "far"),
  );

  // Near zone calculation (25 points max)
  let nearRating = 12.5; // Default if data missing
  let nearMulti = 1;

  if (
    "high_clouds" in nearData &&
    "mid_clouds" in nearData &&
    "low_clouds" in nearData &&
    "visibility" in nearData
  ) {
    // Start with max points
    nearRating = 25;

    // Penalize based on cloud cover - low clouds block visibility more than they help
    nearRating -=
      nearData.mid_clouds / 30 + // Mid clouds have minimal impact on near visibility
      nearData.high_clouds / 30 + // High clouds have minimal impact on near visibility
      Math.max(0, nearData.low_clouds - 5) / 4; // Allow 5% low clouds, then penalize heavily

    // Add bonus for cloud diversity in near zone (up to 3 points)
    nearRating += cloudDiversityScore(nearData) * 3;

    // Calculate visibility multiplier (poor visibility significantly reduces rating)
    const visibilityMulti = visibilityQuality(nearData.visibility);

    // Low clouds reduce visibility, but small amounts are acceptable
    const lowCloudMulti =
      nearData.low_clouds <= 10
        ? 1
        : 1 - (0.4 * (nearData.low_clouds - 10)) / 100;

    // Combined multiplier effect
    nearMulti = visibilityMulti * lowCloudMulti;

    // Temperature can slightly affect conditions
    nearMulti *= temperatureImpact(
      nearData.temperature,
      nearData.freezing_height,
    );
  }

  // Horizon zone calculation (50 points max) - most important zone
  let horizonRating = 25; // Default if data missing
  let horizonMulti = 1;

  if (
    "high_clouds" in horizonData &&
    "mid_clouds" in horizonData &&
    "low_clouds" in horizonData &&
    "freezing_height" in horizonData
  ) {
    // Calculate points from different cloud types
    // High clouds are excellent for catching and reflecting colors
    const highCloudPoints = horizonHighClouds(horizonData.high_clouds);

    // Mid clouds provide texture and reflect colors well
    const midCloudPoints = horizonMidClouds(horizonData.mid_clouds);

    // Low clouds block critical horizon light, but small amounts can add color layers
    const lowCloudPenalty = Math.max(0, horizonData.low_clouds - 10) / 3; // Allow 10% for color, then penalize heavily

    // Cloud diversity bonus - reduced when total coverage is excessive
    const totalHorizonCoverage =
      horizonData.high_clouds + horizonData.mid_clouds + horizonData.low_clouds;
    const diversityMultiplier = totalHorizonCoverage > 60 ? 2 : 3; // Reduce bonus when too cloudy
    const diversityBonus =
      cloudDiversityScore(horizonData) * diversityMultiplier;

    // Calculate average cloud height
    const horizonHeight = calculateAverageCloudHeight(horizonData);

    // Calculate freezing level impact - ice crystals create more vibrant colors
    horizonMulti = freezingLevelImpact(
      horizonHeight,
      horizonData.freezing_height,
    );

    // Total horizon rating
    horizonRating =
      highCloudPoints + midCloudPoints + diversityBonus - lowCloudPenalty;

    // Apply small bonus if there's a good balance between high and mid clouds
    const highMidRatio =
      horizonData.high_clouds / Math.max(1, horizonData.mid_clouds);
    if (highMidRatio > 0.7 && highMidRatio < 1.3) {
      horizonRating += 3; // Bonus for balanced distribution
    }
  }

  // Far zone calculation (25 points max)
  let farRating = 12.5; // Default if data missing
  let farMulti = 1;

  if (
    "low_clouds" in farData &&
    "mid_clouds" in farData &&
    "high_clouds" in farData &&
    "freezing_height" in farData
  ) {
    // Calculate average cloud height
    const farHeight = calculateAverageCloudHeight(farData);

    // Calculate freezing level impact
    farMulti = freezingLevelImpact(farHeight, farData.freezing_height);

    // Calculate drama cloud score based on overall coverage
    // Far clouds create silhouettes and dramatic backgrounds
    const farCoverage = farDramaClouds(
      (farData.low_clouds + farData.mid_clouds + farData.high_clouds) / 3,
    );

    // Cloud diversity bonus - reduced when conditions are too cloudy
    const totalFarCoverage =
      farData.high_clouds + farData.mid_clouds + farData.low_clouds;
    const farDiversityMultiplier = totalFarCoverage > 70 ? 1.5 : 2.5; // Reduce bonus when very cloudy
    const diversityBonus =
      cloudDiversityScore(farData) * farDiversityMultiplier;

    // Calculate total far rating
    farRating = (farCoverage + diversityBonus) * farMulti;
  }

  // Ensure all values are within proper ranges
  nearMulti = Math.min(Math.max(0.2, nearMulti), 1);
  nearRating = Math.min(Math.max(0, nearRating), 25);
  horizonRating = Math.min(Math.max(0, horizonRating), 50);
  farRating = Math.min(Math.max(0, farRating), 25);

  // Calculate average cloud cover across all data points
  const averageCloudCover =
    processedData.reduce((acc, curr) => acc + curr.cloud_cover, 0) /
    processedData.length;

  // Get multiplier for overall cloud coverage
  const totalMulti = totalCoverMulti(averageCloudCover);

  // Calculate final rating
  const final = Math.round(
    (nearRating + horizonRating + farRating) *
      nearMulti *
      horizonMulti *
      totalMulti,
  );

  return {
    rating: Math.min(Math.max(0, final), 100),
    debugData: {
      data: {
        nearData,
        horizonData,
        farData,
        extrapolatedPoints: processedData.length,
      },
      ratings: {
        nearRating,
        nearMulti,
        horizonRating,
        horizonMulti,
        farRating,
        farMulti,
        totalMulti,
        cloudDiversity: {
          near: cloudDiversityScore(nearData),
          horizon: cloudDiversityScore(horizonData),
          far: cloudDiversityScore(farData),
        },
      },
    },
  };
}
