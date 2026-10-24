import { state } from "./state.js";
import { searchCities, fetchForecast } from "./api.js";
import { showWeather, showDailyForecast, showUnavailable, updateLocalClock, formatTime } from "./render.js";
import { initGlobe, updateGlobe } from "./globe.js";

const cityInput = document.getElementById("cityinput");
const searchButton = document.getElementById("searchbutton");
const searchMessage = document.getElementById("search-message");
const resultsContainer = document.getElementById("search-results");

const UNIT_STORAGE_KEY = "weatherly-unit";

let activeRequest = null;


// Search flow

async function findCity(useFirstResult = false) {
    const query = cityInput.value.trim();

    if (query === "") {
        showMessage("Please enter a city to see its weather.", true);
        cityInput.focus();
        return;
    }

    const request = startRequest();

    try {
        // Asking for several matches lets the user pick between e.g. Paris, France and Paris, Texas.
        const cities = await searchCities(query, useFirstResult ? 1 : 5, request);
        if (request !== activeRequest) return;

        if (cities.length === 0) throw new Error("No matching city found. Check the spelling or try a nearby city.");

        if (cities.length > 1) {
            showCityChoices(cities);
            return;
        }

        await loadCity(cities[0], request);
    } catch (error) {
        handleError(error, request);
    } finally {
        if (request === activeRequest) setLoading(false);
    }
}


// Cancels any in-flight search so a slow, older response can never overwrite a newer one.
function startRequest() {
    if (activeRequest) activeRequest.abort();
    activeRequest = new AbortController();

    resultsContainer.hidden = true;
    searchMessage.hidden = true;
    setLoading(true);

    return activeRequest;
}


async function loadCity(city, request) {
    const weather = await fetchForecast(city, request);
    if (request !== activeRequest) return;

    // State changes only after a successful response, so a failed search keeps the old forecast.
    state.selectedCity = city;
    state.lastWeather = weather;

    showWeather(weather, city);
    updateGlobe(city);
    showMessage("Forecast updated for " + city.name + ".");
}


function showCityChoices(cities) {
    resultsContainer.replaceChildren();

    const heading = document.createElement("h2");
    heading.textContent = "Which city did you mean?";
    resultsContainer.append(heading);

    cities.forEach((city) => {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = [city.name, city.admin1, city.country].filter(Boolean).join(", ");

        button.addEventListener("click", async () => {
            cityInput.focus(); // Keeps focus visible after the choices disappear
            const request = startRequest();

            try {
                await loadCity(city, request);
            } catch (error) {
                handleError(error, request);
            } finally {
                if (request === activeRequest) setLoading(false);
            }
        });

        resultsContainer.append(button);
    });

    resultsContainer.hidden = false;
    showMessage("Choose a location below to load its forecast.");
    resultsContainer.querySelector("button").focus();
}


// Status and errors

function setLoading(isLoading) {
    const status = document.getElementById("update-status");
    const weather = state.lastWeather;

    searchButton.disabled = isLoading;
    searchButton.textContent = isLoading ? "Loading…" : "Search ↗";
    document.getElementById("weather-content").setAttribute("aria-busy", String(isLoading));

    if (isLoading) status.textContent = "Updating forecast…";
    else status.textContent = weather
        ? "Weather updated at " + formatTime(weather.current.time, weather.timezone)
        : "Search a city to get started";
}


function showMessage(message, isError = false) {
    searchMessage.textContent = message;
    searchMessage.classList.toggle("error", isError);
    searchMessage.hidden = false;
}


function handleError(error, request) {
    if (request !== activeRequest) return; // Superseded by a newer search, not a real failure

    let message = error.message;
    if (request.signal.reason === "timeout") message = "The connection took too long. Please try again.";
    else if (error instanceof TypeError) message = "Could not connect. Check your internet connection and try again.";

    showMessage(message + (state.lastWeather ? " Your previous forecast is still displayed." : ""), true);

    if (!state.lastWeather) showUnavailable();
}


// Controls

function updateUnitButtons() {
    document.querySelectorAll("[data-unit]").forEach((button) => {
        button.setAttribute("aria-pressed", String(button.dataset.unit === state.temperatureUnit));
    });
}


function readSavedUnit() {
    try {
        return localStorage.getItem(UNIT_STORAGE_KEY) === "fahrenheit" ? "fahrenheit" : "celsius";
    } catch {
        return "celsius"; // Storage can be blocked in private browsing
    }
}


document.getElementById("search-form").addEventListener("submit", (event) => {
    event.preventDefault();
    findCity();
});


document.querySelectorAll("[data-unit]").forEach((button) => {
    button.addEventListener("click", () => {
        state.temperatureUnit = button.dataset.unit;
        updateUnitButtons();

        try {
            localStorage.setItem(UNIT_STORAGE_KEY, state.temperatureUnit);
        } catch {
            // The toggle still works for this visit.
        }

        // Repaint from cached data; no new request needed.
        if (state.lastWeather) showWeather(state.lastWeather, state.selectedCity);
    });
});


document.querySelectorAll("[data-days]").forEach((button) => {
    button.addEventListener("click", () => {
        state.forecastDays = Number(button.dataset.days);

        document.querySelectorAll("[data-days]").forEach((tab) => {
            tab.setAttribute("aria-pressed", String(Number(tab.dataset.days) === state.forecastDays));
        });

        document.getElementById("forecast-range-label").textContent = state.forecastDays + " days";

        if (state.lastWeather) showDailyForecast(state.lastWeather.daily, state.lastWeather.utc_offset_seconds);

        document.getElementById("daily-forecast").scrollTop = 0;
    });
});


document.getElementById("hourly-toggle").addEventListener("click", function () {
    const expanded = this.getAttribute("aria-expanded") !== "true";

    this.setAttribute("aria-expanded", String(expanded));
    this.textContent = expanded ? "Collapse hours ↑" : "Show all 24 hours ↓";
    document.getElementById("hourly-forecast").classList.toggle("expanded", expanded);
});


// Startup

state.temperatureUnit = readSavedUnit();
updateUnitButtons();

cityInput.value = "Munich";
findCity(true);
initGlobe();

setInterval(() => updateLocalClock(state.lastWeather), 60000);
