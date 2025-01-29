import { averageData } from "~/.server/data";
import { AveragedValues, InterpolatedWeather } from "~/.server/interfaces";

function farDramaClouds(input: number): number {
  input = Math.max(0, Math.min(100, input));
  const points: [number, number][] = [
    [0, 10],
    [10, 20],
    [20, 25],
    [30, 25],
    [40, 20],
    [50, 20],
    [60, 20],
    [70, 15],
    [80, 10],
    [90, 5],
    [100, 0],
  ];
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

function horizonMidClouds(input: number): number {
  input = Math.max(0, Math.min(100, input));
  const points: [number, number][] = [
    [0, 5],
    [10, 15],
    [20, 20],
    [30, 20],
    [40, 15],
    [50, 10],
    [60, 8],
    [70, 7],
    [80, 5],
    [90, 5],
    [100, 0],
  ];
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

function horizonHighClouds(input: number): number {
  input = Math.max(0, Math.min(100, input));
  const points: [number, number][] = [
    [0, 5],
    [10, 15],
    [20, 20],
    [30, 30],
    [40, 30],
    [50, 30],
    [60, 25],
    [70, 20],
    [80, 15],
    [90, 5],
    [100, 0],
  ];
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

function calculateAverageCloudHeight(horizonData: AveragedValues) {
  // Convert percentages to decimals (0-1)
  const lowPercent = horizonData.low_clouds / 100;
  const midPercent = horizonData.mid_clouds / 100;
  const highPercent = horizonData.high_clouds / 100;

  // Define cloud heights
  const LOW_HEIGHT = 5000;
  const MID_HEIGHT = 18000;
  const HIGH_HEIGHT = 30000;

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

function totalCoverMulti(input: number): number {
  input = Math.max(0, Math.min(100, input));
  const points: [number, number][] = [
    [0, 0.9],
    [10, 1],
    [20, 1],
    [30, 1],
    [40, 1],
    [50, 1],
    [60, 0.9],
    [70, 0.9],
    [80, 0.8],
    [90, 0.8],
    [100, 0.7],
  ];
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

export function skyRating(data: InterpolatedWeather[]): {
  rating: number;
  debugData: any;
} {
  const nearData = averageData(data.filter((data) => data.zone === "near"));
  const horizonData = averageData(
    data.filter((data) => data.zone === "horizon"),
  );
  const farData = averageData(data.filter((data) => data.zone === "far"));

  let nearRating = 12.5;
  let nearMulti = 1;
  if (
    "high_clouds" in nearData &&
    "mid_clouds" in nearData &&
    "low_clouds" in nearData &&
    "visibility" in nearData
  ) {
    nearRating = 25;
    nearRating -=
      nearData.mid_clouds / 25 +
      nearData.high_clouds / 25 +
      nearData.low_clouds / 6;
    nearMulti =
      (1 - (0.3 * Math.max(0, Math.min(100, nearData.low_clouds))) / 100) *
      (1 -
        (0.3 *
          Math.max(
            0,
            Math.min(
              100,
              100 - Math.max(0, Math.min(50000, nearData.visibility)) * 0.002,
            ),
          )) /
          100);
  }

  let horizonRating = 25;
  let horizonMulti = 1;
  if (
    "high_clouds" in horizonData &&
    "mid_clouds" in horizonData &&
    "low_clouds" in horizonData &&
    "freezing_height" in horizonData
  ) {
    horizonRating = 50;
    horizonRating =
      horizonHighClouds(horizonData.high_clouds) +
      horizonMidClouds(horizonData.mid_clouds);
    horizonRating -= horizonData.low_clouds / 10;
    const horizonHeight = calculateAverageCloudHeight(horizonData);
    horizonMulti =
      horizonHeight === 0
        ? 1
        : Math.min(
            1.2,
            Math.max(
              0.8,
              1 + (horizonHeight - horizonData.freezing_height) / horizonHeight,
            ),
          );
  }

  let farRating = 12.5;
  if (
    "low_clouds" in farData &&
    "mid_clouds" in farData &&
    "high_clouds" in farData
  ) {
    const farHeight = calculateAverageCloudHeight(farData);
    let freezeMulti = 0.8;
    if (farData.freezing_height * 1.2 > farHeight) {
      freezeMulti = 1;
    }
    const farCoverage = farDramaClouds(
      (farData.low_clouds + farData.mid_clouds + farData.high_clouds) / 3,
    );
    farRating = farCoverage * freezeMulti;
  }

  nearMulti = Math.min(Math.max(0, nearMulti), 1);
  nearRating = Math.min(Math.max(0, nearRating), 25);
  horizonRating = Math.min(Math.max(0, horizonRating), 50);
  farRating = Math.min(Math.max(0, farRating), 25);

  const averageCloudCover =
    data.reduce((acc, curr) => acc + curr.cloud_cover, 0) / data.length;

  const totalMulti = totalCoverMulti(averageCloudCover);

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
        nearData: nearData,
        horizonData: horizonData,
        farData: farData,
      },
      ratings: {
        nearRating: nearRating,
        nearMulti: nearMulti,
        horizonRating: horizonRating,
        horizonMulti: horizonMulti,
        farRating: farRating,
      },
    },
  };
}
