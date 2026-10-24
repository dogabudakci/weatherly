const GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const TIMEOUT_MS = 15000;

const CURRENT_FIELDS = [
    "temperature_2m", "weather_code", "relative_humidity_2m", "wind_speed_10m",
    "wind_direction_10m", "apparent_temperature", "is_day", "uv_index",
];
const HOURLY_FIELDS = ["temperature_2m", "weather_code", "precipitation_probability", "is_day"];
const DAILY_FIELDS = [
    "weather_code", "temperature_2m_max", "temperature_2m_min",
    "precipitation_probability_max", "uv_index_max",
];


// The controller is shared with the caller so a newer search can cancel this one.
// A timeout aborts with the reason "timeout" so the UI can show a specific message.
export async function fetchJSON(url, controller) {
    const timeout = setTimeout(() => controller.abort("timeout"), TIMEOUT_MS);

    try {
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) throw new Error("Weather service unavailable. Please try again shortly.");
        return await response.json();
    } finally {
        clearTimeout(timeout);
    }
}


export async function searchCities(name, count, controller) {
    const params = new URLSearchParams({ name, count, language: "en" });
    const data = await fetchJSON(GEOCODING_URL + "?" + params, controller);
    return data.results ?? [];
}


export async function fetchForecast(city, controller) {
    const params = new URLSearchParams({
        latitude: city.latitude,
        longitude: city.longitude,
        current: CURRENT_FIELDS.join(","),
        hourly: HOURLY_FIELDS.join(","),
        daily: DAILY_FIELDS.join(","),
        timezone: "auto",
        timeformat: "unixtime",
        forecast_days: 15,
    });

    const data = await fetchJSON(FORECAST_URL + "?" + params, controller);

    if (!Number.isFinite(data.current?.temperature_2m) || !data.daily?.time?.length || !data.hourly?.time?.length) {
        throw new Error("The weather service returned incomplete data. Please try again.");
    }

    return data;
}
