const searchForm = document.querySelector("#searchForm");
const locationInput = document.querySelector("#locationInput");
const locationButton = document.querySelector("#locationButton");
const statusMessage = document.querySelector("#statusMessage");
const unitButtons = Array.from(document.querySelectorAll(".unit-button"));
const conditionVisual = document.querySelector("#conditionVisual");

const elements = {
  locationName: document.querySelector("#locationName"),
  updatedTime: document.querySelector("#updatedTime"),
  conditionText: document.querySelector("#conditionText"),
  temperature: document.querySelector("#temperature"),
  feelsLike: document.querySelector("#feelsLike"),
  humidity: document.querySelector("#humidity"),
  wind: document.querySelector("#wind"),
  cloudCover: document.querySelector("#cloudCover"),
  pressure: document.querySelector("#pressure"),
  timezoneLabel: document.querySelector("#timezoneLabel"),
  forecastRow: document.querySelector("#forecastRow"),
};

const weatherDescriptions = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Depositing rime fog",
  51: "Light drizzle",
  53: "Moderate drizzle",
  55: "Dense drizzle",
  56: "Light freezing drizzle",
  57: "Dense freezing drizzle",
  61: "Slight rain",
  63: "Moderate rain",
  65: "Heavy rain",
  66: "Light freezing rain",
  67: "Heavy freezing rain",
  71: "Slight snow",
  73: "Moderate snow",
  75: "Heavy snow",
  77: "Snow grains",
  80: "Slight showers",
  81: "Moderate showers",
  82: "Violent showers",
  85: "Slight snow showers",
  86: "Heavy snow showers",
  95: "Thunderstorm",
  96: "Thunderstorm with hail",
  99: "Thunderstorm with heavy hail",
};

let activeUnit = "celsius";
let activeWeather = null;

function setStatus(message, isError = false) {
  statusMessage.textContent = message;
  statusMessage.classList.toggle("error", isError);
}

function unitSymbol() {
  return activeUnit === "celsius" ? "C" : "F";
}

function convertTemperature(value) {
  if (typeof value !== "number") {
    return "--";
  }

  const converted = activeUnit === "fahrenheit" ? (value * 9) / 5 + 32 : value;
  return `${Math.round(converted)}\u00b0${unitSymbol()}`;
}

function formatWind(speed, direction) {
  if (typeof speed !== "number") {
    return "--";
  }

  const roundedSpeed = Math.round(speed);
  return typeof direction === "number" ? `${roundedSpeed} km/h ${directionToCompass(direction)}` : `${roundedSpeed} km/h`;
}

function directionToCompass(degrees) {
  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return directions[Math.round(degrees / 45) % 8];
}

function getConditionClass(code, isDay) {
  if (!isDay) {
    return "night";
  }

  if ([95, 96, 99].includes(code)) {
    return "stormy";
  }

  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) {
    return "rainy";
  }

  if ((code >= 71 && code <= 77) || code >= 85) {
    return "snowy";
  }

  return "sunny";
}

function formatDateTime(value, timezone) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: timezone,
  }).format(new Date(value));
}

function formatDay(value, timezone) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: timezone,
  }).format(new Date(`${value}T12:00:00`));
}

async function fetchJson(url, message) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(message);
  }

  return response.json();
}

async function geocodeLocation(query) {
  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.search = new URLSearchParams({
    name: query,
    count: "1",
    language: "en",
    format: "json",
  });

  const data = await fetchJson(url, "Location search failed.");

  if (!data.results || data.results.length === 0) {
    throw new Error("No matching location found.");
  }

  const [result] = data.results;
  return {
    latitude: result.latitude,
    longitude: result.longitude,
    label: [result.name, result.admin1, result.country].filter(Boolean).join(", "),
  };
}

async function reverseGeocode(latitude, longitude) {
  const url = new URL("https://geocoding-api.open-meteo.com/v1/reverse");
  url.search = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    count: "1",
    language: "en",
    format: "json",
  });

  try {
    const data = await fetchJson(url, "Reverse geocoding failed.");
    const result = data.results && data.results[0];
    return result ? [result.name, result.admin1, result.country].filter(Boolean).join(", ") : "Your location";
  } catch {
    return "Your location";
  }
}

async function fetchWeather(place) {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.search = new URLSearchParams({
    latitude: String(place.latitude),
    longitude: String(place.longitude),
    current: [
      "temperature_2m",
      "relative_humidity_2m",
      "apparent_temperature",
      "is_day",
      "precipitation",
      "weather_code",
      "cloud_cover",
      "pressure_msl",
      "wind_speed_10m",
      "wind_direction_10m",
      "wind_gusts_10m",
    ].join(","),
    daily: ["weather_code", "temperature_2m_max", "temperature_2m_min"].join(","),
    timezone: "auto",
    forecast_days: "5",
  });

  const data = await fetchJson(url, "Weather data failed to load.");
  activeWeather = { ...data, label: place.label };
  renderWeather();
}

function renderWeather() {
  if (!activeWeather) {
    return;
  }

  const { current, daily, timezone, label } = activeWeather;
  const description = weatherDescriptions[current.weather_code] || "Current conditions";

  elements.locationName.textContent = label;
  elements.updatedTime.textContent = `Updated ${formatDateTime(current.time, timezone)}`;
  elements.conditionText.textContent = description;
  elements.temperature.textContent = convertTemperature(current.temperature_2m);
  elements.feelsLike.textContent = `Feels like ${convertTemperature(current.apparent_temperature)}`;
  elements.humidity.textContent = `${current.relative_humidity_2m}%`;
  elements.wind.textContent = formatWind(current.wind_speed_10m, current.wind_direction_10m);
  elements.cloudCover.textContent = `${current.cloud_cover}%`;
  elements.pressure.textContent = `${Math.round(current.pressure_msl)} hPa`;
  elements.timezoneLabel.textContent = timezone.replace("_", " ");

  conditionVisual.className = `condition-visual ${getConditionClass(current.weather_code, current.is_day)}`;

  elements.forecastRow.innerHTML = daily.time
    .map((day, index) => {
      const forecastDescription = weatherDescriptions[daily.weather_code[index]] || "Forecast";
      return `
        <article class="forecast-card">
          <time datetime="${day}">${formatDay(day, timezone)}</time>
          <span class="forecast-condition">${forecastDescription}</span>
          <div class="forecast-temp">
            <strong>${convertTemperature(daily.temperature_2m_max[index])}</strong>
            <span>${convertTemperature(daily.temperature_2m_min[index])}</span>
          </div>
        </article>
      `;
    })
    .join("");
}

async function searchByText(query) {
  setStatus("Searching weather...");
  const place = await geocodeLocation(query);
  await fetchWeather(place);
  setStatus("");
}

function getBrowserLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Location is not available in this browser."));
      return;
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 300000,
    });
  });
}

searchForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const query = locationInput.value.trim();

  if (!query) {
    setStatus("Enter a location to search.", true);
    return;
  }

  try {
    await searchByText(query);
  } catch (error) {
    setStatus(error.message, true);
  }
});

locationButton.addEventListener("click", async () => {
  try {
    setStatus("Requesting your location...");
    const position = await getBrowserLocation();
    const { latitude, longitude } = position.coords;
    const label = await reverseGeocode(latitude, longitude);
    await fetchWeather({ latitude, longitude, label });
    setStatus("");
  } catch (error) {
    setStatus(error.message || "Location permission was not granted.", true);
  }
});

unitButtons.forEach((button) => {
  button.addEventListener("click", () => {
    activeUnit = button.dataset.unit;
    unitButtons.forEach((unitButton) => {
      const isActive = unitButton === button;
      unitButton.classList.toggle("active", isActive);
      unitButton.setAttribute("aria-pressed", String(isActive));
    });
    renderWeather();
  });
});

searchByText("New Delhi").catch((error) => {
  setStatus(error.message, true);
});
