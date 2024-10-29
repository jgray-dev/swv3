// New interfaces for API response
import {LocationData} from "~/components/LocationComponent";

export interface WeatherLocation {
  latitude: number;
  longitude: number;
  hourly: {
    time: number[];
    temperature_2m: number[];
    cloud_cover: number[];
    cloud_cover_low: number[];
    cloud_cover_mid: number[];
    cloud_cover_high: number[];
    visibility: number[];
  };
}

class SunsetRatingCalculator {
  // Define constants for array indices corresponding to distances
  private readonly NEAR_ZONE = [0, 1, 2]; // 0-40 miles
  private readonly FAR_ZONE = [3, 4]; // 60-80 miles

  /**
   * Extract current hour's data from location
   */
  private getCurrentHourData(location: WeatherLocation, targetHour: number): LocationData {
    const hourIndex = location.hourly.time.findIndex(time => time === targetHour);
    if (hourIndex === -1) {
      throw new Error('Target hour not found in weather data');
    }

    return {
      temperature: location.hourly.temperature_2m[hourIndex],
      cloud_cover: location.hourly.cloud_cover[hourIndex],
      cloud_cover_low: location.hourly.cloud_cover_low[hourIndex],
      cloud_cover_mid: location.hourly.cloud_cover_mid[hourIndex],
      cloud_cover_high: location.hourly.cloud_cover_high[hourIndex],
      visibility: location.hourly.visibility[hourIndex]
    };
  }

  /**
   * Calculate blocking penalty using array indices
   */
  private calculateBlockingPenalty(locations: WeatherLocation[], targetHour: number): number {
    let blockingScore = 0;

    for (const index of this.NEAR_ZONE) {
      const locationData = this.getCurrentHourData(locations[index], targetHour);
      blockingScore += locationData.cloud_cover_low * 0.8;
      blockingScore += locationData.cloud_cover_mid * 0.4;
    }

    return Math.min(100, blockingScore / this.NEAR_ZONE.length);
  }

  /**
   * Calculate color potential using array indices
   */
  private calculateColorPotential(locations: WeatherLocation[], targetHour: number): number {
    let colorScore = 0;

    for (const index of this.FAR_ZONE) {
      const locationData = this.getCurrentHourData(locations[index], targetHour);

      const highCloudScore = 100 - Math.min(
        Math.abs(locationData.cloud_cover_high - 55) * 2,
        100
      );

      const midCloudScore = 100 - Math.min(
        Math.abs(locationData.cloud_cover_mid - 30) * 2,
        100
      );

      const locationScore = highCloudScore * 0.7 + midCloudScore * 0.3;
      colorScore += locationScore;
    }

    return colorScore / this.FAR_ZONE.length;
  }

  /**
   * Calculate clear path using array indices
   */
  private calculateClearPath(locations: WeatherLocation[], targetHour: number): number {
    let clearScore = 0;

    for (let i = 0; i < locations.length - 1; i++) {
      const locationData = this.getCurrentHourData(locations[i], targetHour);
      const blocking = (locationData.cloud_cover * 0.5 + locationData.cloud_cover_low * 0.5) / 100;
      clearScore += 1 - blocking;
    }

    return (clearScore / (locations.length - 1)) * 100;
  }

  /**
   * Calculate the overall sunset rating
   */
  public calculateRating(locations: WeatherLocation[], targetHour: number): number {
    const blockingPenalty = this.calculateBlockingPenalty(locations, targetHour);
    const colorPotential = this.calculateColorPotential(locations, targetHour);
    const clearPath = this.calculateClearPath(locations, targetHour);

    const baseScore = 100 - blockingPenalty;

    let weightedScore: number;
    if (baseScore > 0) {
      weightedScore =
        baseScore * 0.4 +
        colorPotential * 0.4 +
        clearPath * 0.2;
    } else {
      weightedScore = 0;
    }

    return Math.round(Math.max(0, Math.min(100, weightedScore)));
  }
}

// Main export function
export function skyRating(locations: WeatherLocation[]): number {
  const calculator = new SunsetRatingCalculator();
  const currentHour = locations[0].hourly.time[0]; // Use first hour from the data
  return calculator.calculateRating(locations, currentHour);
}