// Constants remain the same as before...
import { InterpolatedWeather } from "~/.server/interfaces";

const EARTH_RADIUS = 6371000;
const RAYLEIGH_COEFF = {
  red: 0.059,
  green: 0.124,
  blue: 0.288,
};
const MILES_TO_METERS = 1609.34;
const CLOUD_HEIGHTS = {
  low: 2000,
  mid: 6000,
  high: 10000,
};
const CLOUD_ALBEDO = {
  low: 0.75,
  mid: 0.55,
  high: 0.3,
};

export function skyRating(locations: InterpolatedWeather[]): number {
  const sunAngleRadians = -0.0145;
  let totalIntensity = {
    red: 0,
    green: 0,
    blue: 0,
  };
  let validSamples = 0;

  locations.forEach((location, index) => {
    const distance = index * 20 * MILES_TO_METERS;

    const pathLength = calculateAtmosphericPathLength(
      distance,
      sunAngleRadians
    );

    if (isNaN(pathLength)) {
      return;
    }

    const baseIntensity = calculateBaseIntensity(
      pathLength,
      location.visibility
    );

    const cloudEffects = processCloudLayers(
      location,
      distance,
      pathLength,
      sunAngleRadians
    );

    if (!isNaN(cloudEffects.reflection) && !isNaN(baseIntensity.red)) {
      validSamples++;
      const distanceWeight = 1 / (1 + index * 0.2);

      Object.keys(totalIntensity).forEach((channel) => {
        const contribution =
          // @ts-ignore
          baseIntensity[channel] *
          cloudEffects.reflection *
          (1 - cloudEffects.obstruction) *
          distanceWeight;

        // @ts-ignore
        totalIntensity[channel] += contribution;
      });
    }
  });

  if (validSamples > 0) {
    Object.keys(totalIntensity).forEach((channel) => {
      // @ts-ignore
      totalIntensity[channel] = totalIntensity[channel] / validSamples;
    });
  }

  return calculateFinalRating(totalIntensity);
}

function calculateAtmosphericPathLength(
  distance: number,
  sunAngle: number
): number {
  if (distance < 1000) {
    return distance;
  }

  const apparentHeight =
    Math.sqrt(
      Math.pow(EARTH_RADIUS + distance * Math.sin(sunAngle), 2) +
        Math.pow(distance * Math.cos(sunAngle), 2)
    ) - EARTH_RADIUS;

  return Math.max(
    distance / Math.cos(Math.atan2(apparentHeight, distance)),
    distance
  );
}

function calculateBaseIntensity(pathLength: number, visibility: number) {
  const intensity = {
    red: 0,
    green: 0,
    blue: 0,
  };

  const visibilityFactor = Math.max(visibility / 10, 0.1);
  Object.keys(RAYLEIGH_COEFF).forEach((channel) => {
    // @ts-ignore
    const scatteringCoeff = RAYLEIGH_COEFF[channel];
    const extinction = Math.exp(
      ((-scatteringCoeff * pathLength) / 1000) * (1 / visibilityFactor)
    );

    const scattering = (1 - extinction) * visibilityFactor;

    // @ts-ignore
    intensity[channel] = Math.min(extinction + scattering, 1);
  });

  return intensity;
}

function processCloudLayers(
  weather: InterpolatedWeather,
  distance: number,
  pathLength: number,
  sunAngle: number
): { reflection: number; obstruction: number } {
  let totalReflection = 0;
  let totalObstruction = 0;
  let availableLight = 1.0;

  const layers = [
    {
      height: CLOUD_HEIGHTS.low,
      coverage: weather.cloud_cover_low,
      albedo: CLOUD_ALBEDO.low,
    },
    {
      height: CLOUD_HEIGHTS.mid,
      coverage: weather.cloud_cover_mid,
      albedo: CLOUD_ALBEDO.mid,
    },
    {
      height: CLOUD_HEIGHTS.high,
      coverage: weather.cloud_cover_high,
      albedo: CLOUD_ALBEDO.high,
    },
  ];

  layers.forEach((layer, idx) => {
    if (layer.coverage <= 0) {
      return;
    }

    const incidenceAngle = Math.abs(
      Math.atan2(layer.height, distance) + sunAngle
    );

    const fresnelFactor = Math.pow(Math.sin(incidenceAngle), 2);

    const cloudPathLength = layer.height / Math.cos(incidenceAngle);

    const coverageFactor = layer.coverage / 100;

    const reflection =
      availableLight * coverageFactor * layer.albedo * (1 + fresnelFactor);

    const obstruction =
      availableLight *
      coverageFactor *
      (1 - layer.albedo) *
      (cloudPathLength / Math.max(pathLength, 1));

    totalReflection += reflection;
    totalObstruction += obstruction;
    availableLight *= 1 - coverageFactor;
  });

  return {
    reflection: Math.min(Math.max(totalReflection, 0), 1),
    obstruction: Math.min(Math.max(totalObstruction, 0), 1),
  };
}

function calculateFinalRating(intensity: {
  red: number;
  green: number;
  blue: number;
}): number {
  const colorScore = Math.max(
    intensity.red * 0.5 + intensity.green * 0.3 + intensity.blue * 0.2,
    0.001
  );

  const redToBlueRatio = intensity.red / Math.max(intensity.blue, 0.001);
  const redToGreenRatio = intensity.red / Math.max(intensity.green, 0.001);

  const colorBalance = Math.min((redToBlueRatio + redToGreenRatio) / 4, 1);

  const rating = colorScore * 70 + colorBalance * 30;

  return Math.min(Math.max(rating, 0), 100);
}
