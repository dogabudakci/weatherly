import { state } from "./state.js";
import { getDescription, getPhoto, weatherIcon } from "./weather-codes.js";

const $ = (id) => document.getElementById(id);

const COMPASS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];


// Formatting

export function formatTemperature(celsius) {
    if (!Number.isFinite(celsius)) return "—";
    const value = state.temperatureUnit === "fahrenheit" ? celsius * 9 / 5 + 32 : celsius;
    return Math.round(value) + "°";
}


function formatNumber(value, suffix) {
    return Number.isFinite(value) ? Math.round(value) + suffix : "—";
}


export function formatTime(timestamp, timezone) {
    return new Intl.DateTimeFormat("en-GB", {
        timeZone: timezone, hour: "2-digit", minute: "2-digit",
    }).format(new Date(timestamp * 1000));
}


// Dashboard

export function showWeather(weather, city) {
    const { current, daily } = weather;

    $("cityname").textContent = city.name;
    $("country").textContent = [city.admin1, city.country].filter(Boolean).join(", ");
    $("temperature").textContent = formatTemperature(current.temperature_2m);
    $("description").textContent = getDescription(current.weather_code);
    $("temperature-range").textContent = "High " + formatTemperature(daily.temperature_2m_max[0])
        + " · Low " + formatTemperature(daily.temperature_2m_min[0]);

    const photo = $("img2");
    photo.src = getPhoto(current.weather_code);
    photo.alt = getDescription(current.weather_code) + " sky";

    $("humidity").textContent = formatNumber(current.relative_humidity_2m, "%");
    $("wind").textContent = formatNumber(current.wind_speed_10m, " km/h");
    $("wind-direction").textContent = Number.isFinite(current.wind_direction_10m)
        ? "From " + COMPASS[Math.round(current.wind_direction_10m / 45) % 8] + " · at 10 m"
        : "At 10 m above ground";
    $("feelslike").textContent = formatTemperature(current.apparent_temperature);
    $("rain-chance").textContent = formatNumber(daily.precipitation_probability_max[0], "%");

    showUvIndex(current.uv_index, daily.uv_index_max?.[0]);
    updateLocalClock(weather);
    showDailyForecast(daily, weather.utc_offset_seconds);
    showHourlyForecast(weather);
}


export function showUnavailable() {
    $("description").textContent = "Weather unavailable";
    $("daily-forecast").textContent = "Search again to load the forecast.";
    $("hourly-forecast").textContent = "Hourly weather will appear after a successful search.";
}


export function updateLocalClock(weather) {
    if (!weather) return;

    const now = new Date();

    $("local-date").textContent = new Intl.DateTimeFormat("en-GB", {
        timeZone: weather.timezone, weekday: "short", day: "numeric", month: "short",
    }).format(now);

    $("local-time").textContent = "Local time " + formatTime(now.getTime() / 1000, weather.timezone);
}


function showUvIndex(uv, todayMax) {
    const marker = $("uv-marker");

    // Round first so the displayed number and its category always agree.
    if (Number.isFinite(uv)) uv = Math.round(uv);

    let level = "";
    if (Number.isFinite(uv)) {
        if (uv < 3) level = "Low";
        else if (uv < 6) level = "Moderate";
        else if (uv < 8) level = "High";
        else if (uv < 11) level = "Very high";
        else level = "Extreme";
    }

    $("uv-index").textContent = Number.isFinite(uv) ? uv : "—";
    $("uv-level").textContent = level;

    marker.hidden = !Number.isFinite(uv);
    if (Number.isFinite(uv)) marker.style.left = Math.min(uv, 11) / 11 * 100 + "%";

    const peak = Math.round(todayMax);
    $("uv-caption").textContent = Number.isFinite(peak)
        ? "Today’s peak " + peak + (peak >= 3 ? " · sun protection recommended" : " · minimal protection needed")
        : "Sun strength right now";
}


// Forecasts

export function showDailyForecast(daily, utcOffset) {
    const container = $("daily-forecast");
    container.replaceChildren();

    const days = state.forecastDays;
    const minimum = Math.min(...daily.temperature_2m_min.slice(0, days).filter(Number.isFinite));
    const maximum = Math.max(...daily.temperature_2m_max.slice(0, days).filter(Number.isFinite));
    const spread = maximum - minimum || 1;
    const availableDays = Math.min(days, daily.time.length);

    $("forecast-summary").textContent = availableDays < days
        ? "Only " + availableDays + " days are available for this location."
        : "Showing " + availableDays + " days · scroll to explore.";

    container.setAttribute("aria-label", availableDays + "-day forecast; scroll for more days");

    daily.time.slice(0, days).forEach((timestamp, index) => {
        // Shifting by the UTC offset and formatting in UTC keeps the API's calendar day,
        // even across daylight-saving changes.
        const calendarDate = new Date((timestamp + utcOffset) * 1000);
        const day = index === 0 ? "Today" : new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", weekday: "short" }).format(calendarDate);
        const low = daily.temperature_2m_min[index];
        const high = daily.temperature_2m_max[index];

        const row = document.createElement("div");
        row.className = "daily-row";
        row.innerHTML = '<span class="day-label"></span><span class="day-icon"></span><span class="daily-low"></span><span class="range-track"><span class="range-fill"></span></span><span class="daily-high"></span>';

        const dateLabel = document.createElement("span");
        dateLabel.className = "day-date";
        dateLabel.textContent = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", day: "numeric", month: "short" }).format(calendarDate);

        row.querySelector(".day-label").textContent = day;
        row.querySelector(".day-label").append(dateLabel);
        row.querySelector(".day-icon").innerHTML = weatherIcon(daily.weather_code[index]);
        row.querySelector(".daily-low").textContent = formatTemperature(low);
        row.querySelector(".daily-high").textContent = formatTemperature(high);

        // All bars share one scale so days can be compared at a glance.
        const bar = row.querySelector(".range-fill");
        if (Number.isFinite(low) && Number.isFinite(high)) {
            bar.style.marginLeft = ((low - minimum) / spread * 100) + "%";
            bar.style.width = ((high - low) / spread * 100) + "%";
        } else {
            bar.hidden = true;
        }

        row.setAttribute("aria-label", day + ": " + getDescription(daily.weather_code[index]) + ", low " + formatTemperature(low) + ", high " + formatTemperature(high));

        container.append(row);
    });
}


function showHourlyForecast(weather) {
    const container = $("hourly-forecast");
    const previousScroll = container.scrollLeft; // Preserved when repainting after a unit change
    container.replaceChildren();

    const { hourly, timezone } = weather;

    let firstHour = 0;
    hourly.time.forEach((timestamp, index) => {
        if (timestamp <= weather.current.time) firstHour = index;
    });

    hourly.time.slice(firstHour, firstHour + 24).forEach((timestamp, index) => {
        const i = firstHour + index;
        const temperature = formatTemperature(hourly.temperature_2m[i]);

        const card = document.createElement("div");
        card.className = "hour-card";
        card.innerHTML = '<span class="hour-label"></span><span class="hour-icon"></span><span class="hour-temperature"></span><span class="hour-rain"></span>';

        card.querySelector(".hour-label").textContent = index === 0 ? "Now" : formatTime(timestamp, timezone);
        card.querySelector(".hour-icon").innerHTML = weatherIcon(hourly.weather_code[i], hourly.is_day[i]);
        card.querySelector(".hour-temperature").textContent = temperature;
        card.querySelector(".hour-rain").textContent = formatNumber(hourly.precipitation_probability[i], "% rain");

        card.setAttribute("aria-label", formatTime(timestamp, timezone) + ": " + getDescription(hourly.weather_code[i]) + ", " + temperature + ", rain chance " + formatNumber(hourly.precipitation_probability[i], "%"));

        container.append(card);
    });

    container.scrollLeft = previousScroll;
    $("hourly-toggle").disabled = false;
}
