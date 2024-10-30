// Constants remain the same as before...
import {InterpolatedWeather} from "~/.server/interfaces";

const EARTH_RADIUS = 6371000;
const RAYLEIGH_COEFF = {
  red: 0.059,
  green: 0.124,
  blue: 0.288
};
const MILES_TO_METERS = 1609.34;
const CLOUD_HEIGHTS = {
  low: 2000,
  mid: 6000,
  high: 10000
};
const CLOUD_ALBEDO = {
  low: 0.75,
  mid: 0.55,
  high: 0.30
};


export function skyRating(locations: InterpolatedWeather[]): number {
  console.log('Starting sky rating calculation with locations:', locations);

  const sunAngleRadians = -0.0145;
  let totalIntensity = {
    red: 0,
    green: 0,
    blue: 0
  };
  let validSamples = 0;

  locations.forEach((location, index) => {
    console.log(`\nProcessing location ${index}:`, location);

    const distance = index * 20 * MILES_TO_METERS;
    console.log('Distance (meters):', distance);

    const pathLength = calculateAtmosphericPathLength(distance, sunAngleRadians);
    console.log('Atmospheric path length:', pathLength);

    if (isNaN(pathLength)) {
      console.log('WARNING: Invalid path length calculated');
      return;
    }

    const baseIntensity = calculateBaseIntensity(pathLength, location.visibility);
    console.log('Base light intensity:', baseIntensity);

    const cloudEffects = processCloudLayers(
      location,
      distance,
      pathLength,
      sunAngleRadians
    );
    console.log('Cloud effects:', cloudEffects);

    if (!isNaN(cloudEffects.reflection) && !isNaN(baseIntensity.red)) {
      validSamples++;
      const distanceWeight = 1 / (1 + index * 0.2);
      console.log('Distance weight:', distanceWeight);

      Object.keys(totalIntensity).forEach(channel => {
        const contribution =
          // @ts-ignore
          baseIntensity[channel] *
          cloudEffects.reflection *
          (1 - cloudEffects.obstruction) *
          distanceWeight;

        console.log(`${channel} contribution:`, contribution);
        // @ts-ignore
        totalIntensity[channel] += contribution;
      });

      console.log('Running total intensity:', totalIntensity);
    } else {
      console.log('WARNING: Invalid values detected, skipping this sample');
    }
  });

  console.log('\nValid samples:', validSamples);

  if (validSamples > 0) {
    Object.keys(totalIntensity).forEach(channel => {
      // @ts-ignore
      totalIntensity[channel] = totalIntensity[channel] / validSamples;
    });
  }

  console.log('Normalized total intensity:', totalIntensity);

  const finalRating = calculateFinalRating(totalIntensity);
  console.log('Final rating:', finalRating);

  return finalRating;
}

function calculateAtmosphericPathLength(distance: number, sunAngle: number): number {
  console.log('\nCalculating atmospheric path length:');
  console.log('Input distance:', distance);
  console.log('Sun angle:', sunAngle);

  if (distance < 1000) {
    console.log('Short distance, using direct path');
    return distance;
  }

  const apparentHeight = Math.sqrt(
    Math.pow(EARTH_RADIUS + distance * Math.sin(sunAngle), 2) +
    Math.pow(distance * Math.cos(sunAngle), 2)
  ) - EARTH_RADIUS;

  console.log('Apparent height:', apparentHeight);

  const pathLength = Math.max(
    distance / Math.cos(Math.atan2(apparentHeight, distance)),
    distance
  );

  console.log('Calculated path length:', pathLength);
  return pathLength;
}

function calculateBaseIntensity(pathLength: number, visibility: number) {
  console.log('\nCalculating base intensity:');
  console.log('Path length:', pathLength);
  console.log('Visibility:', visibility);

  const intensity = {
    red: 0,
    green: 0,
    blue: 0
  };

  const visibilityFactor = Math.max(visibility / 10, 0.1);
  console.log('Visibility factor:', visibilityFactor);

  Object.keys(RAYLEIGH_COEFF).forEach(channel => {
    // @ts-ignore
    const scatteringCoeff = RAYLEIGH_COEFF[channel];
    const extinction = Math.exp(
      -scatteringCoeff * pathLength / 1000 * (1 / visibilityFactor)
    );

    console.log(`${channel} extinction:`, extinction);

    const scattering = (1 - extinction) * visibilityFactor;
    console.log(`${channel} scattering:`, scattering);

    // @ts-ignore
    intensity[channel] = Math.min(extinction + scattering, 1);
    // @ts-ignore
    console.log(`${channel} final intensity:`, intensity[channel]);
  });

  return intensity;
}

function processCloudLayers(
  weather: InterpolatedWeather,
  distance: number,
  pathLength: number,
  sunAngle: number
): { reflection: number; obstruction: number } {
  console.log('\nProcessing cloud layers:');
  console.log('Weather data:', weather);
  console.log('Distance:', distance);
  console.log('Path length:', pathLength);
  console.log('Sun angle:', sunAngle);

  let totalReflection = 0;
  let totalObstruction = 0;
  let availableLight = 1.0;

  const layers = [
    { height: CLOUD_HEIGHTS.low, coverage: weather.cloud_cover_low, albedo: CLOUD_ALBEDO.low },
    { height: CLOUD_HEIGHTS.mid, coverage: weather.cloud_cover_mid, albedo: CLOUD_ALBEDO.mid },
    { height: CLOUD_HEIGHTS.high, coverage: weather.cloud_cover_high, albedo: CLOUD_ALBEDO.high }
  ];

  layers.forEach((layer, idx) => {
    if (layer.coverage <= 0) {
      console.log(`Layer ${idx}: No clouds, skipping`);
      return;
    }

    console.log(`\nProcessing layer ${idx}:`);
    console.log('Layer data:', layer);
    console.log('Available light:', availableLight);

    const incidenceAngle = Math.abs(
      Math.atan2(layer.height, distance) + sunAngle
    );
    console.log('Incidence angle:', incidenceAngle);

    const fresnelFactor = Math.pow(Math.sin(incidenceAngle), 2);
    console.log('Fresnel factor:', fresnelFactor);

    const cloudPathLength = layer.height / Math.cos(incidenceAngle);
    console.log('Cloud path length:', cloudPathLength);

    const coverageFactor = layer.coverage / 100;
    console.log('Coverage factor:', coverageFactor);

    const reflection = availableLight * coverageFactor * layer.albedo * (1 + fresnelFactor);
    console.log('Layer reflection:', reflection);

    const obstruction = availableLight * coverageFactor * (1 - layer.albedo) *
      (cloudPathLength / Math.max(pathLength, 1));
    console.log('Layer obstruction:', obstruction);

    totalReflection += reflection;
    totalObstruction += obstruction;
    availableLight *= (1 - coverageFactor);
  });

  const result = {
    reflection: Math.min(Math.max(totalReflection, 0), 1),
    obstruction: Math.min(Math.max(totalObstruction, 0), 1)
  };

  console.log('Final cloud effects:', result);
  return result;
}

function calculateFinalRating(intensity: { red: number; green: number; blue: number }): number {
  console.log('\nCalculating final rating:');
  console.log('Input intensities:', intensity);

  const colorScore = Math.max(
    intensity.red * 0.5 +
    intensity.green * 0.3 +
    intensity.blue * 0.2,
    0.001
  );
  console.log('Color score:', colorScore);

  const redToBlueRatio = intensity.red / Math.max(intensity.blue, 0.001);
  const redToGreenRatio = intensity.red / Math.max(intensity.green, 0.001);
  console.log('Red/Blue ratio:', redToBlueRatio);
  console.log('Red/Green ratio:', redToGreenRatio);

  const colorBalance = Math.min((redToBlueRatio + redToGreenRatio) / 4, 1);
  console.log('Color balance:', colorBalance);

  const rating = (colorScore * 70 + colorBalance * 30);
  console.log('Raw rating:', rating);

  const finalRating = Math.min(Math.max(rating, 0), 100);
  console.log('Final bounded rating:', finalRating);

  return finalRating;
}