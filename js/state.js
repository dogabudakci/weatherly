// Shared app state. Weather is stored in Celsius and converted only for display.
export const state = {
    selectedCity: null,
    lastWeather: null,
    forecastDays: 5,
    temperatureUnit: "celsius",
};
