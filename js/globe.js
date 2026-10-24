import { state } from "./state.js";

const GLOBE_LIBRARY_URL = "https://cdn.jsdelivr.net/npm/globe.gl@2.46.2/dist/globe.gl.min.js";
const TEXTURE_URL = "https://cdn.jsdelivr.net/npm/three-globe@2.45.3/example/img/earth-night.jpg";
const BUMP_URL = "https://cdn.jsdelivr.net/npm/three-globe@2.45.3/example/img/earth-topology.png";
const DOWNLOAD_TIMEOUT_MS = 15000;
const ALTITUDE = 2.15;

const container = document.getElementById("globe");
const statusElement = document.getElementById("globe-status");
const helpElement = document.getElementById("globe-help");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

let globe = null;
let loading = false;
let visible = true;


// The weather dashboard works without the globe, so any failure here is non-fatal
// and the next search retries.
export async function initGlobe() {
    if (globe || loading) return;
    loading = true;
    statusElement.textContent = "Loading Earth…";

    try {
        await Promise.all([loadScript(GLOBE_LIBRARY_URL), preloadImage(TEXTURE_URL)]);

        globe = new window.Globe(container)
            .width(container.clientWidth)
            .height(container.clientHeight)
            .backgroundColor("rgba(0,0,0,0)")
            .globeImageUrl(TEXTURE_URL)
            .bumpImageUrl(BUMP_URL)
            .showAtmosphere(true)
            .atmosphereColor("#8cbce5")
            .atmosphereAltitude(0.12)
            .pointColor(() => "#ffcf76")
            .pointAltitude(0.015)
            .pointRadius(0.7)
            .pointResolution(32)
            .pointsTransitionDuration(reducedMotion.matches ? 0 : 400)
            .pointOfView({ lat: 48.14, lng: 11.58, altitude: ALTITUDE });

        const controls = globe.controls();
        controls.autoRotate = false;
        controls.enableZoom = false; // Lets the page scroll normally over the globe
        controls.enablePan = false;
        controls.enableDamping = !reducedMotion.matches;
        controls.dampingFactor = 0.08;
        controls.rotateSpeed = 0.6;

        // The city may have changed while the library was downloading.
        updateGlobe(state.selectedCity);

        statusElement.textContent = state.selectedCity ? "City linked" : "Earth ready";
        helpElement.textContent = "Your searched city, marked in gold. Drag to look around.";

        new ResizeObserver(() => {
            globe.width(container.clientWidth);
            globe.height(container.clientHeight);
        }).observe(container);

        // Stop rendering WebGL frames when nobody can see them.
        new IntersectionObserver((entries) => {
            visible = entries[0].isIntersecting;
            updateAnimation();
        }).observe(container);

        document.addEventListener("visibilitychange", updateAnimation);
    } catch (error) {
        if (globe) globe.pauseAnimation();
        globe = null;
        container.replaceChildren();
        statusElement.textContent = "3D unavailable";
        helpElement.textContent = "Your city and coordinates are shown below. The next search retries the 3D view.";
    } finally {
        loading = false;
    }
}


export function updateGlobe(city) {
    if (!city) return;

    const { latitude, longitude } = city;
    const coordinates = Math.abs(latitude).toFixed(2) + "° " + (latitude >= 0 ? "N" : "S")
        + " · " + Math.abs(longitude).toFixed(2) + "° " + (longitude >= 0 ? "E" : "W");

    document.getElementById("globe-city").textContent = [city.name, city.country].filter(Boolean).join(", ");
    document.getElementById("coordinates").textContent = coordinates;
    container.setAttribute("aria-label", "Globe showing " + city.name + ". " + coordinates);

    if (!globe) {
        initGlobe();
        return;
    }

    globe.pointsData([{ lat: latitude, lng: longitude }]);

    const duration = reducedMotion.matches || !visible || document.hidden ? 0 : 900;
    globe.pointOfView({ lat: latitude, lng: longitude, altitude: ALTITUDE }, duration);

    statusElement.textContent = "City linked";
}


function updateAnimation() {
    if (!globe) return;
    if (visible && !document.hidden) globe.resumeAnimation();
    else globe.pauseAnimation();
}


function loadScript(url) {
    if (window.Globe) return Promise.resolve();

    return new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = url;

        const timeout = setTimeout(() => {
            script.remove();
            reject(new Error("Globe download timed out"));
        }, DOWNLOAD_TIMEOUT_MS);

        script.onload = () => {
            clearTimeout(timeout);
            resolve();
        };
        script.onerror = () => {
            clearTimeout(timeout);
            script.remove();
            reject(new Error("Globe download failed"));
        };

        document.head.append(script);
    });
}


// Checking the texture first means a blocked CDN shows the fallback instead of a blank sphere.
function preloadImage(url) {
    return new Promise((resolve, reject) => {
        const image = new Image();

        const timeout = setTimeout(() => reject(new Error("Earth texture download timed out")), DOWNLOAD_TIMEOUT_MS);

        image.crossOrigin = "anonymous"; // Must match the WebGL texture request so the cache is reused
        image.onload = () => {
            clearTimeout(timeout);
            resolve();
        };
        image.onerror = () => {
            clearTimeout(timeout);
            reject(new Error("Earth texture download failed"));
        };

        image.src = url;
    });
}
