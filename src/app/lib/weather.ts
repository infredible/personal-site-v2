export interface WeatherData {
  current: {
    temperature_2m: number;
    time: string;
  };
}

export async function getWeather(): Promise<WeatherData> {
  const OAKLAND_LAT = 37.804324;
  const OAKLAND_LON = -122.271168;
  
  const response = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${OAKLAND_LAT}&longitude=${OAKLAND_LON}&current=temperature_2m`,
    { next: { revalidate: 300 } } // Cache for 5 minutes
  );

  if (!response.ok) {
    throw new Error('Failed to fetch weather data');
  }

  return response.json();
}

export function formatTemperature(celsius: number): string {
  const fahrenheit = Math.round((celsius * 9/5) + 32);
  return `${fahrenheit}°F`;
} 