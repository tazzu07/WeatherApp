
const apiKey = "972e8010ba5f8f27984049016469e1af";
const weatherContainer = document.getElementById("weather-container");
const locationsDiv = document.getElementById("locations");
const searchInput = document.getElementById("search");

const locationsContainer = document.querySelector(".locations-container");
const locations = document.getElementById("locations");
const leftArrow = document.getElementById("left-arrow");
const rightArrow = document.getElementById("right-arrow");

function checkArrows() {
    const containerWidth = locationsContainer.clientWidth;
    const contentWidth = locations.scrollWidth;

    if (contentWidth > containerWidth) {
        leftArrow.style.display = "inline-block";
        rightArrow.style.display = "inline-block";
    } else {
        leftArrow.style.display = "none";
        rightArrow.style.display = "none";
    }
}
leftArrow.addEventListener("click", () => {
    locationsContainer.scrollBy({ left: -100, behavior: "smooth" });
});

rightArrow.addEventListener("click", () => {
    locationsContainer.scrollBy({ left: 100, behavior: "smooth" });
});


const observer = new MutationObserver(checkArrows);
observer.observe(locations, { childList: true });

window.addEventListener("load", checkArrows);
window.addEventListener("resize", checkArrows);

function toggleMode() {
    let body = document.body;
    let currentMode = body.classList.contains("light-mode") ? "dark-mode" : "light-mode";

    body.classList.remove("light-mode", "dark-mode");
    body.classList.add(currentMode);

    localStorage.setItem("theme", currentMode);
}

window.onload = function () {
    let savedTheme = localStorage.getItem("theme") || "dark-mode";
    document.body.classList.add(savedTheme);
};

const map = L.map("map").setView([28.6139, 77.2090], 8);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);
let marker = L.marker([28.6139, 77.2090]).addTo(map);

const tempToggleButton = document.getElementById("toggle-temp");

// Load saved temperature 
let tempUnit = localStorage.getItem("tempUnit") || "metric"; // Default to Celsius
updateTempButton();


function toggleTempUnit() {
    tempUnit = tempUnit === "metric" ? "imperial" : "metric";
    localStorage.setItem("tempUnit", tempUnit);
    updateTempButton();

    let tempSymbol = tempUnit === "metric" ? "°C" : "°F";

    // Function to convert temperature values
    function convertTemperature(value, toUnit) {
        return toUnit === "imperial"
            ? Math.round((value * 9 / 5) + 32) // Convert °C to °F
            : Math.round((value - 32) * 5 / 9); // Convert °F to °C
    }

    // Convert main report temperature
    document.querySelectorAll(".temp").forEach(element => {
        let match = element.textContent.match(/(-?\d+)\s*°[CF]/);
        if (match) {
            let value = parseInt(match[1]);
            element.textContent = `${convertTemperature(value, tempUnit)}${tempSymbol}`;
        }
    });

    // Convert "Feels Like" temperature correctly
    document.querySelectorAll(".feels-like").forEach(element => {
        let match = element.textContent.match(/(-?\d+)\s*°[CF]/);
        if (match) {
            let value = parseInt(match[1]);
            element.textContent = `Feels like ${convertTemperature(value, tempUnit)}${tempSymbol}`;
        }
    });

    // Convert temperatures in location tags
    document.querySelectorAll(".location-tag span").forEach(tag => {
        let match = tag.textContent.match(/(-?\d+)\s*°[CF]/);
        if (match) {
            let value = parseInt(match[1]);
            tag.textContent = tag.textContent.replace(/\d+\s*°[CF]/, `${convertTemperature(value, tempUnit)}${tempSymbol}`);
        }
    });

    // Convert other weather details (Low temp, Dew Point, etc.)
    document.querySelectorAll(".weather-summary, .weather-details p").forEach(element => {
        let match = element.textContent.match(/(-?\d+)\s*°[CF]/);
        if (match) {
            let value = parseInt(match[1]);
            element.textContent = element.textContent.replace(/\d+\s*°[CF]/, `${convertTemperature(value, tempUnit)}${tempSymbol}`);
        }
    });

    // Convert detailed weather section
    document.querySelectorAll("#detailed-weather .weather-card p:last-child").forEach(element => {
        let match = element.textContent.match(/(-?\d+)\s*°[CF]/);
        if (match) {
            let value = parseInt(match[1]);
            element.textContent = `${convertTemperature(value, tempUnit)}${tempSymbol}`;
        }
    });
}

function updateTempButton() {
    tempToggleButton.textContent = tempUnit === "metric" ? "°C" : "°F";
}

//  update all stored location tags
function updateAllTags() {
    document.querySelectorAll(".location-tag").forEach(tag => {
        const city = tag.dataset.city;
        if (city) {
            fetchWeather(city, null, null, false); // Fetch without adding a new tag
        }
    });
}

tempToggleButton.addEventListener("click", toggleTempUnit);


async function fetchWeather(city, lat = null, lon = null, addTag = true) {
    try {
        let url = city
            ? `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=${tempUnit}`
            : `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=${tempUnit}`;

        const response = await fetch(url);
        if (!response.ok) throw new Error("Location not found");

        const data = await response.json();
        let tempSymbol = tempUnit === "metric" ? "°C" : "°F";

        let mappedDescription = mapWeatherDescription(data.weather[0].main, data.weather[0].description);

        // Get UV Index from OpenUV API
        let uvIndex = "N/A";
        try {
            const uvResponse = await fetch(`https://api.openuv.io/api/v1/uv?lat=${data.coord.lat}&lng=${data.coord.lon}`, {
                headers: {
                    "x-access-token": "openuv-dmly5rm96tpget-io"
                }
            });

            if (uvResponse.ok) {
                const uvData = await uvResponse.json();
                uvIndex = uvData.result.uv.toFixed(1);
            } else {
                console.warn("UV API request failed.");
            }
        } catch (uvError) {
            console.error("UV Index fetch error:", uvError);
        }


        // Get Moon Phase from Farmsense API
        const timestamp = Math.floor(Date.now() / 1000);
        const moonResponse = await fetch(`https://api.farmsense.net/v1/moonphases/?d=${timestamp}`);
        const moonData = await moonResponse.json();
        const moonPhase = moonData[0]?.Phase || "Unknown";

        // UI rendering (unchanged)
        weatherContainer.innerHTML = `
<div class="weather">
    <div class="weather-header">
        <span class="weather-title">Current Weather</span>
        <span class="weather-location"><i id="loc-icon" class="fa-solid fa-location-dot"></i>  ${data.name}</span>
    </div>
    <div class="weather-time">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
    <div class="weather-main">
        <img src="https://openweathermap.org/img/wn/${data.weather[0].icon}@4x.png" class="weather-icon">
        <div class="weather-temp">
            <span class="temp">${Math.round(data.main.temp)}${tempSymbol}</span>
            <span class="condition">${mappedDescription}</span> 
            <span class="feels-like">Feels like ${Math.round(data.main.feels_like)}${tempSymbol}</span>
        </div>
    </div>
    <div class="weather-summary">The skies will be mostly clear. The low will be ${Math.round(data.main.temp_min)}${tempSymbol}.</div>
    <div class="weather-details">
        <p><strong>Air Quality:</strong> 92</p>
        <p><strong>Wind:</strong> ${data.wind.speed} km/h</p>
        <p><strong>Humidity:</strong> ${data.main.humidity}%</p>
        <p><strong>Visibility:</strong> ${data.visibility / 1000} km</p>
        <p><strong>Pressure:</strong> ${data.main.pressure} mb</p>
        <p><strong>Dew Point:</strong> 18°C</p>
    </div>
</div>`;

        document.querySelectorAll(".location-tag").forEach(tag => {
            if (tag.dataset.city === data.name) {
                tag.querySelector("span").textContent = `${data.name} ${Math.round(data.main.temp)}${tempSymbol}`;
            }
        });

        if (addTag && !document.querySelector(`[data-city="${data.name}"]`)) {
            const locationTag = document.createElement("div");
            locationTag.classList.add("location-tag");
            const tagText = document.createElement("span");
            tagText.textContent = `${data.name} ${Math.round(data.main.temp)}${tempSymbol}`;
            const closeButton = document.createElement("button");
            closeButton.textContent = "✖";
            closeButton.classList.add("close-btn");
            closeButton.addEventListener("click", (event) => {
                event.stopPropagation();
                locationTag.remove();
            });

            locationTag.appendChild(tagText);
            locationTag.appendChild(closeButton);

            locationTag.dataset.city = data.name;
            locationTag.dataset.lat = data.coord.lat;
            locationTag.dataset.lon = data.coord.lon;

            locationTag.addEventListener("click", () => {
                fetchWeather(null, data.coord.lat, data.coord.lon);
            });

            locationsDiv.appendChild(locationTag);
        }


        async function fetchForecast(lat, lon) {
            const apiKey = '972e8010ba5f8f27984049016469e1af';
            const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;

            try {
                const res = await fetch(url);
                const data = await res.json();

                let currentMode = '5day';

                const forecastContainer = document.getElementById('forecast');
                const btn5Day = document.getElementById('btn-5day');
                const btnHourly = document.getElementById('btn-hourly');

                function renderForecast(mode) {
                    forecastContainer.innerHTML = '';

                    if (mode === '5day') {
                        const addedDates = new Set();
                        let count = 0;

                        for (let i = 0; i < data.list.length && count < 8; i++) {
                            const item = data.list[i];
                            const dateStr = item.dt_txt.split(" ")[0];

                            if (!addedDates.has(dateStr)) {
                                addedDates.add(dateStr);

                                const isToday = (dateStr === new Date().toISOString().split("T")[0]);
                                addForecastCard(item, true, isToday);
                                count++;
                            }
                        }
                    } else {
                        for (let i = 0; i < 8 && i < data.list.length; i++) {
                            const item = data.list[i];
                            addForecastCard(item, false, false);
                        }
                    }
                }




                function addForecastCard(item, is5Day, isToday) {
                    const date = new Date(item.dt_txt);
                    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

                    const dayLabel = is5Day
                        ? (isToday ? 'Today' : weekdays[date.getDay()])
                        : date.toLocaleTimeString(undefined, { hour: 'numeric', hour12: true });

                    const formattedDate = is5Day ? `${months[date.getMonth()]} ${date.getDate()}` : '';
                    const icon = `https://openweathermap.org/img/wn/${item.weather[0].icon}@2x.png`;
                    const temp = Math.round(item.main.temp);
                    const feelsLike = Math.round(item.main.feels_like);

                    const card = document.createElement('div');
                    card.classList.add('forecast-day');
                    card.innerHTML = `
<div class="card-top">
    <span class="day-label1">${dayLabel}</span>
    ${is5Day ? `<span class="date-label2">${formattedDate}</span>` : ''}
</div>
<div class="forecast-icon-temp">
    <img src="${icon}" alt="${item.weather[0].main}">
    <div class="temp-details">
        <div class="main-temp">${temp}°C</div>
        <div class="feels-like">Feels like ${feelsLike}°</div>
    </div>
</div>
`;
                    forecastContainer.appendChild(card);
                }


                btn5Day.addEventListener('click', () => {
                    currentMode = '5day';
                    btn5Day.classList.add('active');
                    btnHourly.classList.remove('active');
                    renderForecast(currentMode);
                });

                btnHourly.addEventListener('click', () => {
                    currentMode = 'hourly';
                    btnHourly.classList.add('active');
                    btn5Day.classList.remove('active');
                    renderForecast(currentMode);
                });

                renderForecast(currentMode);
            } catch (err) {
                console.error('Forecast error:', err);
            }
        }

        function updateWeatherTime() {
            const now = new Date();
            const hours = now.getHours() % 12 || 12;
            const minutes = now.getMinutes().toString().padStart(2, "0");
            const ampm = now.getHours() >= 12 ? "PM" : "AM";
            const formattedTime = `${hours}:${minutes} ${ampm}`;

            document.getElementById("weather-time").textContent = ` ${formattedTime}`;
        }

        updateWeatherTime(); // Call it once when page loads


        const detailedCards = [
            {
                label: "Feels Like",
                icon: "icon/temperaturee.png",
                value: `${Math.round(data.main.feels_like)}${tempSymbol}`,
                description: "Perceived temperature"
            },
            {
                label: "Cloud Cover",
                icon: `https://openweathermap.org/img/wn/${data.weather[0].icon}@4x.png`,
                value: `${data.clouds.all}%`,
                description: data.clouds.all > 50 ? "Mostly cloudy" : "Partly cloudy"
            },
            {
                label: "Precipitation",
                icon: "icon/precipitation.png",
                value: data.rain?.["1h"] ? `${data.rain["1h"]} mm` : "0 mm",
                description: data.rain?.["1h"] ? "Rain expected" : "No rain"
            },
            {
                label: "Wind",
                icon: "icon/wind.png",
                value: `${data.wind.speed} km/h`,
                description: `From the ${getWindDirection(data.wind.deg)}`
            },
            {
                label: "Humidity",
                icon: "icon/humidity.png",
                value: `${data.main.humidity}%`,
                description: data.main.humidity > 70 ? "Very humid" : "Comfortable humidity"
            },
            {
                label: "UV Index",
                icon: "icon/uv.png",
                value: uvIndex,
                description: getUVDescription(uvIndex)
            },
            {
                label: "Visibility",
                icon: "icon/visibility.png",
                value: `${data.visibility / 1000} km`,
                description: data.visibility > 5000 ? "Clear visibility" : "Low visibility"
            },
            {
                label: "Pressure",
                icon: "icon/pressure.png",
                value: `${data.main.pressure} hPa`,
                description: data.main.pressure > 1013 ? "High pressure" : "Low pressure"
            },
            {
                label: "Sunrise",
                icon: "icon/sunrise.png",
                value: formatTime(data.sys.sunrise),
                description: "Morning sunshine"
            },
            {
                label: "Sunset",
                icon: "icon/sunset.png",
                value: formatTime(data.sys.sunset),
                description: "Evening calm"
            },
            {
                label: "Moon Phase",
                icon: "icon/moon.png",
                value: moonPhase,
                description: "Tonight's lunar phase"
            }
        ];

        // Generate the cards HTML
        let cardsHtml = detailedCards.map(card => `
<div class="weather-detail-card">
<div class="card-title">${card.label}</div>
<img src="${card.icon}" class="card-icon" alt="${card.label}">
<div class="card-value">${card.value}</div>
<div class="card-description">${card.description}</div>
</div>
`).join("");

        // Calculate dummy cards needed
        const cardsPerRow = 4;
        const remainder = detailedCards.length % cardsPerRow;
        if (remainder !== 0) {
            const dummiesNeeded = cardsPerRow - remainder;
            for (let i = 0; i < dummiesNeeded; i++) {
                cardsHtml += `<div class="weather-detail-card dummy"></div>`;
            }
        }

        // Now set the innerHTML inside a container with class "weather-grid"
        document.getElementById("detailed-weather").innerHTML = `<div class="weather-grid">${cardsHtml}</div>`;


        fetchForecast(data.coord.lat, data.coord.lon);


        map.setView([data.coord.lat, data.coord.lon], 8);
        marker.setLatLng([data.coord.lat, data.coord.lon])
            .bindPopup(`${data.name}`)
            .openPopup();
    } catch (error) {
        console.error("Error fetching weather:", error);
        alert("Could not fetch weather. Please check the city name or try again later.");
    }
}


async function fetchMoonPhase(date) {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const LDZ = date.getTime();

    const url = `https://www.icalendar37.net/lunar/api/?lang=en&month=${month}&year=${year}&LDZ=${LDZ}`;

    try {
        const res = await fetch(url);
        const data = await res.json();
        const day = date.getDate();
        return data.phase[day]; // Contains svg, phaseName, etc.
    } catch (err) {
        console.error('Moon phase fetch error:', err);
        return null;
    }
}



function getWindDirection(degree) {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(degree / 45) % 8;
    return directions[index];
}

function getUVDescription(uvi) {
    if (uvi < 3) return "Low";
    if (uvi < 6) return "Moderate";
    if (uvi < 8) return "High";
    if (uvi < 11) return "Very High";
    return "Extreme";
}

function getMoonPhaseDescription(phase) {
    if (phase === 0 || phase === 1) return "New Moon";
    if (phase < 0.25) return "Waxing Crescent";
    if (phase === 0.25) return "First Quarter";
    if (phase < 0.5) return "Waxing Gibbous";
    if (phase === 0.5) return "Full Moon";
    if (phase < 0.75) return "Waning Gibbous";
    if (phase === 0.75) return "Last Quarter";
    return "Waning Crescent";
}



function mapWeatherDescription(mainCondition, description) {
    const weatherMap = {
        "Clear": "Clear skies",
        "Clouds": {
            "few clouds": "Partly cloudy",
            "scattered clouds": "Mostly clear",
            "broken clouds": "Partly sunny",
            "overcast clouds": "Overcast"
        },
        "Rain": {
            "light rain": "Drizzle",
            "moderate rain": "Rain showers",
            "heavy intensity rain": "Heavy rain",
            "very heavy rain": "Torrential rain",
            "extreme rain": "Severe rain"
        },
        "Thunderstorm": {
            "thunderstorm with light rain": "Scattered thunderstorms",
            "thunderstorm with rain": "Thunderstorms",
            "thunderstorm with heavy rain": "Severe thunderstorms",
            "light thunderstorm": "Isolated thunderstorms",
            "heavy thunderstorm": "Heavy thunderstorms"
        },
        "Drizzle": {
            "light intensity drizzle": "Light drizzle",
            "drizzle": "Drizzle",
            "heavy intensity drizzle": "Heavy drizzle",
            "shower drizzle": "Showers"
        },
        "Snow": {
            "light snow": "Light snowfall",
            "snow": "Snow",
            "heavy snow": "Heavy snowfall",
            "sleet": "Sleet",
            "light shower sleet": "Light sleet",
            "shower sleet": "Sleet showers",
            "light rain and snow": "Mix of rain and snow",
            "rain and snow": "Wintry mix"
        },
        "Mist": "Misty conditions",
        "Smoke": "Hazy skies",
        "Haze": "Hazy conditions",
        "Dust": "Dusty conditions",
        "Fog": "Foggy",
        "Sand": "Sandy conditions",
        "Ash": "Volcanic ash",
        "Squall": "Windy squalls",
        "Tornado": "Tornado alert!"
    };

    if (weatherMap[mainCondition]) {
        if (typeof weatherMap[mainCondition] === "object") {
            return weatherMap[mainCondition][description] || mainCondition;
        }
        return weatherMap[mainCondition];
    }

    return description.charAt(0).toUpperCase() + description.slice(1); // Default fallback with capitalization
}

function createWeatherCard(icon, label, value) {
    return `
<div class="weather-card">
    <p>${icon}</p>
    <p><strong>${label}</strong></p>
    <p>${value}</p>
</div>
`;
}

function formatTime(timestamp) {
    const date = new Date(timestamp * 1000);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function debounce(func, delay) {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), delay);
    };
}


function searchLocation() {
    const city = searchInput.value.trim();
    if (city) {
        fetchWeather(city);
        searchInput.value = "";
    }
}

document.getElementById("search-icon").addEventListener("click", searchLocation);

searchInput.addEventListener("keypress", debounce((event) => {
    if (event.key === "Enter") searchLocation();
}, 500));


function getUserLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                fetchWeather(null, position.coords.latitude, position.coords.longitude);
            },
            () => {
                fetchWeather("New Delhi", null, null, false);
            }
        );
    } else {
        fetchWeather("New Delhi", null, null, true);

    }
}


let currentIndex = 0;
let newsArticles = [];

async function fetchNews() {
    const apiKey = "a2a9a0551c04105f61c02bbfacdfab26";
    const url = `https://gnews.io/api/v4/search?q=weather&lang=en&country=us&max=30&apikey=${apiKey}`;
    const res = await fetch(url);
    const data = await res.json();
    newsArticles = data.articles;
    renderWeatherNews();
    renderTrendingNews();
}

function createCard(article, size) {
    const div = document.createElement("div");
    div.className = `news-card ${size}`;
  
    // Use fallback image if article.image is null/undefined
    const imageUrl = article.image || 'fallback.jpg';
  
    div.innerHTML = `
      <a href="${article.url}" target="_blank" class="card-link">
        <div class="image-container">
          <img src="${imageUrl}" alt="News Image" onerror="this.onerror=null;this.src='fallback.jpg';" />
          <div class="title-inside">${article.title}</div>
        </div>
      </a>`;
    return div;
  }
  

function renderWeatherNews() {
    const container = document.getElementById("weather-news");
    const layout = [
        ['large', 'small', 'small'],     
        ['small', 'small', 'large'],    
        ['small', 'small', 'small', 'small']  
    ];

    layout.forEach(row => {
        const rowDiv = document.createElement("div");
        rowDiv.className = "news-row";
        row.forEach(size => {
            if (currentIndex >= newsArticles.length) return;
            const article = newsArticles[currentIndex++];
            rowDiv.appendChild(createCard(article, size));
        });
        container.appendChild(rowDiv);
    });
}

function renderTrendingNews() {
    const container = document.getElementById("trending-news");
    const layout = [
        ['large', 'small', 'small'],    
        ['small', 'small', 'small', 'small'],
        ['small', 'small', 'small', 'small']
    ];

    layout.forEach(row => {
        const rowDiv = document.createElement("div");
        rowDiv.className = "news-row";
        let cardsAdded = 0;

        row.forEach(size => {
            if (currentIndex >= newsArticles.length) return;
            const article = newsArticles[currentIndex++];
            rowDiv.appendChild(createCard(article, size));
            cardsAdded++;
        });

        if (cardsAdded > 0) {
            container.appendChild(rowDiv);
        }
    });
}


// Infinite Scroll Pattern
window.addEventListener("scroll", () => {
    if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 500) {
        if (currentIndex < newsArticles.length) {
            renderTrendingNews(); 
        }
    }
});


window.onload = function () {
    getUserLocation();
    fetchNews();
};
