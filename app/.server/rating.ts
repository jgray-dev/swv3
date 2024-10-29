interface LocationData {
  temperature: number;
  cloud_cover: number;
  cloud_cover_low: number;
  cloud_cover_mid: number;
  cloud_cover_high: number;
  visibility: number;
}

interface WeatherData {
  "0miles": LocationData;
  "20miles": LocationData;
  "40miles": LocationData;
  "60miles": LocationData;
  "80miles": LocationData;
  "100miles": LocationData;
}

interface WeatherDataResponse {
  "event-type": string;
  "event-time": number;
  data: WeatherData;
}

class SunsetRatingCalculator {
  // Define constants
  private readonly NEAR_ZONE = ["0miles", "20miles", "40miles"];
  private readonly FAR_ZONE = ["60miles", "80miles"];

  /**
   * Calculate sunset rating from 0-100 based on cloud data at multiple distances
   */
  private calculateBlockingPenalty(weatherData: WeatherData): number {
    let blockingScore = 0;

    for (const distance of this.NEAR_ZONE) {
      const location = weatherData[distance as keyof WeatherData];
      // Low clouds are most problematic
      blockingScore += location.cloud_cover_low * 0.8;
      // Mid clouds also contribute to blocking
      blockingScore += location.cloud_cover_mid * 0.4;
    }

    // Average the blocking score across near zone locations
    blockingScore /= this.NEAR_ZONE.length;
    // Convert to penalty (0-100, where 100 means complete blocking)
    return Math.min(100, blockingScore);
  }

  /**
   * Calculate potential for good colors based on high/mid clouds in far zone
   */
  private calculateColorPotential(weatherData: WeatherData): number {
    let colorScore = 0;

    for (const distance of this.FAR_ZONE) {
      const location = weatherData[distance as keyof WeatherData];

      // High clouds are ideal at 40-70% coverage
      const highCloudScore =
        100 -
        Math.min(
          Math.abs(location.cloud_cover_high - 55) * 2, // Centered around 55%
          100
        );

      // Mid clouds can add texture, best at 20-40%
      const midCloudScore =
        100 -
        Math.min(
          Math.abs(location.cloud_cover_mid - 30) * 2, // Centered around 30%
          100
        );

      // Weight high clouds more than mid clouds
      const locationScore = highCloudScore * 0.7 + midCloudScore * 0.3;
      colorScore += locationScore;
    }

    // Average the color score across far zone locations
    return colorScore / this.FAR_ZONE.length;
  }

  /**
   * Calculate if there's a clear path for light to reach the high clouds
   */
  private calculateClearPath(weatherData: WeatherData): number {
    let clearScore = 0;
    const distances = [
      "0miles",
      "20miles",
      "40miles",
      "60miles",
      "80miles",
      "100miles",
    ];

    for (const distance of distances.slice(0, -1)) {
      const location = weatherData[distance as keyof WeatherData];
      // Penalize high coverage or low clouds that might block light path
      const blocking =
        (location.cloud_cover * 0.5 + location.cloud_cover_low * 0.5) / 100;
      clearScore += 1 - blocking;
    }

    return (clearScore / (distances.length - 1)) * 100;
  }

  /**
   * Calculate the overall sunset rating
   */
  public calculateRating(weatherData: WeatherData): number {
    // Calculate main components
    const blockingPenalty = this.calculateBlockingPenalty(weatherData);
    const colorPotential = this.calculateColorPotential(weatherData);
    const clearPath = this.calculateClearPath(weatherData);

    // Base score starts with blocking penalty
    const baseScore = 100 - blockingPenalty;

    // If we're not completely blocked, factor in color potential and clear path
    let weightedScore: number;
    if (baseScore > 0) {
      weightedScore =
        baseScore * 0.4 + // Weight of non-blocking
        colorPotential * 0.4 + // Weight of good cloud conditions
        clearPath * 0.2; // Weight of clear path for light
    } else {
      weightedScore = 0;
    }

    return Math.round(Math.max(0, Math.min(100, weightedScore)));
  }
}

// Main export function that matches your signature
export function skyRating(response: WeatherDataResponse): number {
  const calculator = new SunsetRatingCalculator();
  return calculator.calculateRating(response.data);
}
