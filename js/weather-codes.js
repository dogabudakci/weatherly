// WMO weather codes used by Open-Meteo: https://open-meteo.com/en/docs
// Each entry: description, background photo, day icon, night icon.
const CONDITIONS = {
    0: ["Clear sky", "clear_sky", "sun", "moon"],
    1: ["Mainly clear", "sunny", "partly", "partly-night"],
    2: ["Partly cloudy", "cloudy", "mostly-cloudy", "cloudy-night"],
    3: ["Cloudy", "cloudy", "cloud", "cloud"],
    45: ["Foggy", "foggy", "fog", "fog"],
    48: ["Foggy", "foggy", "fog", "fog"],
    51: ["Drizzle", "rainy", "drizzle", "rain-night"],
    53: ["Drizzle", "rainy", "drizzle", "rain-night"],
    55: ["Drizzle", "rainy", "drizzle", "rain-night"],
    56: ["Freezing drizzle", "rainy", "hail", "hail"],
    57: ["Freezing drizzle", "rainy", "hail", "hail"],
    61: ["Rainy", "rainy", "rain", "rain-night"],
    63: ["Rainy", "rainy", "rain", "rain-night"],
    65: ["Rainy", "rainy", "heavy-rain", "heavy-rain"],
    66: ["Freezing rain", "rainy", "hail", "hail"],
    67: ["Freezing rain", "rainy", "hail", "hail"],
    71: ["Snowy", "snowy", "snow", "snow-night"],
    73: ["Snowy", "snowy", "snow", "snow-night"],
    75: ["Snowy", "snowy", "snow", "snow-night"],
    77: ["Snowy", "snowy", "snow", "snow-night"],
    80: ["Rain showers", "rainy", "showers", "rain-night"],
    81: ["Rain showers", "rainy", "showers", "rain-night"],
    82: ["Rain showers", "rainy", "heavy-rain", "heavy-rain"],
    85: ["Snow showers", "snowy", "snow", "snow-night"],
    86: ["Snow showers", "snowy", "snow", "snow-night"],
    95: ["Thunderstorm", "thunderstorm", "storm", "storm"],
    96: ["Thunderstorm", "thunderstorm", "storm", "storm"],
    99: ["Thunderstorm", "thunderstorm", "storm", "storm"],
};

const UNKNOWN = ["Unknown weather", "cloudy", "cloud", "cloud"];


export function getDescription(code) {
    return (CONDITIONS[code] ?? UNKNOWN)[0];
}


export function getPhoto(code) {
    return "photos/" + (CONDITIONS[code] ?? UNKNOWN)[1] + ".jpg";
}


// Returns markup for a decorative icon; the surrounding row provides the accessible label.
export function weatherIcon(code, isDay = 1) {
    const [, , dayIcon, nightIcon] = CONDITIONS[code] ?? UNKNOWN;
    const icon = isDay ? dayIcon : nightIcon;
    return '<img class="weather-symbol" src="photos/weather-icons/' + icon + '.png" width="36" height="36" alt="" aria-hidden="true">';
}
