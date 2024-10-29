import {InterpolatedWeather} from "~/.server/interfaces";

class SunsetRatingCalculator {
  private readonly NEAR_ZONE = [0, 1, 2];
  private readonly FAR_ZONE = [3, 4];
  private calculateBlockingPenalty(locations: InterpolatedWeather[]): number {
    let blockingScore = 0;
    for (const index of this.NEAR_ZONE) {
      const location = locations[index];
      blockingScore += location.cloud_cover_low * 0.8;
      blockingScore += location.cloud_cover_mid * 0.4;
    }
    return Math.min(100, blockingScore / this.NEAR_ZONE.length);
  }
  private calculateColorPotential(locations: InterpolatedWeather[]): number {
    let colorScore = 0;
    for (const index of this.FAR_ZONE) {
      const location = locations[index];

      const highCloudScore = 100 - Math.min(
        Math.abs(location.cloud_cover_high - 55) * 2,
        100
      );

      const midCloudScore = 100 - Math.min(
        Math.abs(location.cloud_cover_mid - 30) * 2,
        100
      );

      const locationScore = highCloudScore * 0.7 + midCloudScore * 0.3;
      colorScore += locationScore;
    }

    return colorScore / this.FAR_ZONE.length;
  }
  private calculateClearPath(locations: InterpolatedWeather[]): number {
    let clearScore = 0;
    for (let i = 0; i < locations.length - 1; i++) {
      const location = locations[i];
      const blocking = (location.cloud_cover * 0.5 + location.cloud_cover_low * 0.5) / 100;
      clearScore += 1 - blocking;
    }

    return (clearScore / (locations.length - 1)) * 100;
  }
  public calculateRating(locations: InterpolatedWeather[]): number {
    const blockingPenalty = this.calculateBlockingPenalty(locations);
    const colorPotential = this.calculateColorPotential(locations);
    const clearPath = this.calculateClearPath(locations);
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
export function skyRating(locations: InterpolatedWeather[]): number {
  const calculator = new SunsetRatingCalculator();
  return calculator.calculateRating(locations);
}