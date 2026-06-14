import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const sourceDir = path.join(rootDir, "data", "source");
const outputPath = path.join(sourceDir, "observer-cities.json");
const loaderPath = path.join(rootDir, "src", "data", "observer-cities.ts");

const MAX_CITIES = 1000;

const SOURCES = {
  worldCities: {
    url: "https://raw.githubusercontent.com/meilisearch/datasets/main/datasets/world_cities/world-cities.json",
    file: "world-cities.json",
  },
  countries: {
    url: "https://raw.githubusercontent.com/dr5hn/countries-states-cities-database/master/json/countries.json",
    file: "countries.json",
  },
  usStateCapitals: {
    url: "https://gist.githubusercontent.com/bradtraversy/20dee7787486d10db3bd1f55fae5fdf4/raw",
    file: "us-state-capitals.json",
  },
};

const NATIONAL_CAPITAL_FALLBACKS = [
  {
    city: "Vatican City",
    country: "Vatican City",
    latitude: 41.9,
    longitude: 12.45,
  },
  { city: "Monaco", country: "Monaco", latitude: 43.73, longitude: 7.42 },
  {
    city: "San Marino",
    country: "San Marino",
    latitude: 43.94,
    longitude: 12.45,
  },
  {
    city: "Andorra la Vella",
    country: "Andorra",
    latitude: 42.51,
    longitude: 1.52,
  },
  { city: "Palikir", country: "Micronesia", latitude: 6.92, longitude: 158.16 },
  {
    city: "Majuro",
    country: "Marshall Islands",
    latitude: 7.09,
    longitude: 171.38,
  },
  { city: "Yaren", country: "Nauru", latitude: -0.55, longitude: 166.92 },
  { city: "Funafuti", country: "Tuvalu", latitude: -8.52, longitude: 179.2 },
  {
    city: "Honiara",
    country: "Solomon Islands",
    latitude: -9.43,
    longitude: 159.95,
  },
  {
    city: "Port Vila",
    country: "Vanuatu",
    latitude: -17.73,
    longitude: 168.32,
  },
  { city: "Nuku'alofa", country: "Tonga", latitude: -21.13, longitude: -175.2 },
  { city: "Apia", country: "Samoa", latitude: -13.83, longitude: -171.76 },
  { city: "Tarawa", country: "Kiribati", latitude: 1.33, longitude: 172.98 },
  { city: "Suva", country: "Fiji", latitude: -18.14, longitude: 178.44 },
  {
    city: "Port Moresby",
    country: "Papua New Guinea",
    latitude: -9.44,
    longitude: 147.18,
  },
  { city: "Thimphu", country: "Bhutan", latitude: 27.47, longitude: 89.64 },
  { city: "Male", country: "Maldives", latitude: 4.17, longitude: 73.51 },
  { city: "Naypyidaw", country: "Myanmar", latitude: 19.76, longitude: 96.07 },
  {
    city: "Sri Jayawardenepura Kotte",
    country: "Sri Lanka",
    latitude: 6.89,
    longitude: 79.91,
  },
  {
    city: "Bandar Seri Begawan",
    country: "Brunei",
    latitude: 4.94,
    longitude: 114.95,
  },
  { city: "Dili", country: "Timor-Leste", latitude: -8.56, longitude: 125.57 },
  { city: "Pristina", country: "Kosovo", latitude: 42.66, longitude: 21.17 },
  {
    city: "Podgorica",
    country: "Montenegro",
    latitude: 42.43,
    longitude: 19.26,
  },
  {
    city: "Skopje",
    country: "North Macedonia",
    latitude: 41.99,
    longitude: 21.43,
  },
  { city: "Tirana", country: "Albania", latitude: 41.33, longitude: 19.82 },
  { city: "Valletta", country: "Malta", latitude: 35.9, longitude: 14.51 },
  { city: "Nicosia", country: "Cyprus", latitude: 35.17, longitude: 33.36 },
  {
    city: "Luxembourg",
    country: "Luxembourg",
    latitude: 49.61,
    longitude: 6.13,
  },
  { city: "Vaduz", country: "Liechtenstein", latitude: 47.14, longitude: 9.52 },
  { city: "Bishkek", country: "Kyrgyzstan", latitude: 42.87, longitude: 74.59 },
  {
    city: "Dushanbe",
    country: "Tajikistan",
    latitude: 38.56,
    longitude: 68.77,
  },
  {
    city: "Ashgabat",
    country: "Turkmenistan",
    latitude: 37.95,
    longitude: 58.38,
  },
  { city: "Tashkent", country: "Uzbekistan", latitude: 41.3, longitude: 69.24 },
  { city: "Astana", country: "Kazakhstan", latitude: 51.17, longitude: 71.45 },
  {
    city: "Ulaanbaatar",
    country: "Mongolia",
    latitude: 47.92,
    longitude: 106.91,
  },
  {
    city: "Pyongyang",
    country: "North Korea",
    latitude: 39.03,
    longitude: 125.75,
  },
  { city: "Taipei", country: "Taiwan", latitude: 25.03, longitude: 121.57 },
  { city: "Ramallah", country: "Palestine", latitude: 31.9, longitude: 35.2 },
  { city: "Jerusalem", country: "Israel", latitude: 31.77, longitude: 35.22 },
  { city: "Amman", country: "Jordan", latitude: 31.95, longitude: 35.93 },
  { city: "Beirut", country: "Lebanon", latitude: 33.89, longitude: 35.5 },
  { city: "Damascus", country: "Syria", latitude: 33.51, longitude: 36.29 },
  { city: "Baghdad", country: "Iraq", latitude: 33.31, longitude: 44.37 },
  { city: "Tehran", country: "Iran", latitude: 35.69, longitude: 51.42 },
  { city: "Kabul", country: "Afghanistan", latitude: 34.53, longitude: 69.17 },
  { city: "Islamabad", country: "Pakistan", latitude: 33.69, longitude: 73.04 },
  { city: "Kathmandu", country: "Nepal", latitude: 27.72, longitude: 85.32 },
  { city: "Dhaka", country: "Bangladesh", latitude: 23.71, longitude: 90.41 },
  {
    city: "Phnom Penh",
    country: "Cambodia",
    latitude: 11.56,
    longitude: 104.92,
  },
  { city: "Vientiane", country: "Laos", latitude: 17.97, longitude: 102.6 },
];

const LONDON_OVERRIDE = { latitude: 51.5, longitude: -0.12 };

const LOADER_SOURCE = `// Generated by scripts/generate-observer-cities.mjs — do not edit manually.
// City data lives in data/source/observer-cities.json.

export interface ObserverCity {
  city: string;
  country: string;
  latitude: number;
  longitude: number;
}

export const CUSTOM_LOCATION_ID = "custom";

let cachedCities: ObserverCity[] | null = null;

export function formatObserverCityLabel(city: ObserverCity): string {
  return \`\${city.city}, \${city.country}\`;
}

export function observerCityKey(city: ObserverCity): string {
  return \`\${city.latitude},\${city.longitude}\`;
}

export async function loadObserverCities(): Promise<ObserverCity[]> {
  if (cachedCities) {
    return cachedCities;
  }

  const data = await import("../../data/source/observer-cities.json");
  const cities = (data.default ?? data) as ObserverCity[];
  cachedCities = [...cities].sort((a, b) =>
    formatObserverCityLabel(a).localeCompare(formatObserverCityLabel(b)),
  );
  return cachedCities;
}

export function findObserverCity(
  latitude: number,
  longitude: number,
  cities: ObserverCity[],
): ObserverCity | undefined {
  return cities.find(
    (city) => city.latitude === latitude && city.longitude === longitude,
  );
}

export function findObserverCityByKey(
  key: string,
  cities: ObserverCity[],
): ObserverCity | undefined {
  return cities.find((city) => observerCityKey(city) === key);
}
`;

function ensureSourceDir() {
  fs.mkdirSync(sourceDir, { recursive: true });
}

async function downloadSource({ url, file }) {
  const filePath = path.join(sourceDir, file);
  if (fs.existsSync(filePath)) {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  }

  console.log(`Downloading ${file}...`);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download ${url}: ${response.status}`);
  }
  const text = await response.text();
  fs.writeFileSync(filePath, text, "utf8");
  return JSON.parse(text);
}

function roundCoord(value) {
  return Math.round(value * 100) / 100;
}

function normalizeName(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function cityCountryKey(city, country) {
  return `${normalizeName(city)}|${normalizeName(country)}`;
}

function coordKey(latitude, longitude) {
  return `${roundCoord(latitude).toFixed(2)},${roundCoord(longitude).toFixed(2)}`;
}

function makeEntry({ city, country, latitude, longitude }) {
  let finalLat = roundCoord(latitude);
  let finalLng = roundCoord(longitude);

  if (normalizeName(city) === "london" && country === "United Kingdom") {
    finalLat = LONDON_OVERRIDE.latitude;
    finalLng = LONDON_OVERRIDE.longitude;
  }

  return {
    city,
    country,
    latitude: finalLat,
    longitude: finalLng,
    cityCountryKey: cityCountryKey(city, country),
    coordKey: coordKey(finalLat, finalLng),
  };
}

function addEntry(collection, seenCityCountry, seenCoords, entry) {
  if (seenCityCountry.has(entry.cityCountryKey)) {
    return false;
  }
  if (seenCoords.has(entry.coordKey)) {
    return false;
  }
  if (collection.length >= MAX_CITIES) {
    return false;
  }

  seenCityCountry.add(entry.cityCountryKey);
  seenCoords.add(entry.coordKey);
  collection.push({
    city: entry.city,
    country: entry.country,
    latitude: entry.latitude,
    longitude: entry.longitude,
  });
  return true;
}

function matchCapitalInWorldCities(capitalName, countryName, worldCities) {
  const normalizedCapital = normalizeName(capitalName);
  const countryMatches = worldCities.filter(
    (city) => normalizeName(city.country) === normalizeName(countryName),
  );

  const exact = countryMatches.find(
    (city) => normalizeName(city.name) === normalizedCapital,
  );
  if (exact) {
    return exact;
  }

  const startsWith = countryMatches.find((city) =>
    normalizeName(city.name).startsWith(normalizedCapital),
  );
  if (startsWith) {
    return startsWith;
  }

  return (
    countryMatches.find((city) =>
      normalizeName(city.name).includes(normalizedCapital),
    ) ?? null
  );
}

async function main() {
  ensureSourceDir();

  const adminCapitals = JSON.parse(
    fs.readFileSync(path.join(sourceDir, "admin-capitals.json"), "utf8"),
  );
  const worldCities = await downloadSource(SOURCES.worldCities);
  const countries = await downloadSource(SOURCES.countries);
  const usStateCapitals = await downloadSource(SOURCES.usStateCapitals);

  const selected = [];
  const seenCityCountry = new Set();
  const seenCoords = new Set();

  for (const state of usStateCapitals) {
    addEntry(
      selected,
      seenCityCountry,
      seenCoords,
      makeEntry({
        city: state.capital,
        country: "United States",
        latitude: Number.parseFloat(state.lat),
        longitude: Number.parseFloat(state.long),
      }),
    );
  }

  for (const admin of adminCapitals) {
    addEntry(
      selected,
      seenCityCountry,
      seenCoords,
      makeEntry({
        city: admin.city,
        country: admin.country,
        latitude: admin.latitude,
        longitude: admin.longitude,
      }),
    );
  }

  for (const country of countries) {
    if (!country.capital || selected.length >= MAX_CITIES) {
      continue;
    }

    const match = matchCapitalInWorldCities(
      country.capital,
      country.name,
      worldCities,
    );

    if (match) {
      addEntry(
        selected,
        seenCityCountry,
        seenCoords,
        makeEntry({
          city: match.name,
          country: match.country,
          latitude: match._geo.lat,
          longitude: match._geo.lng,
        }),
      );
      continue;
    }

    const fallback = NATIONAL_CAPITAL_FALLBACKS.find(
      (entry) =>
        normalizeName(entry.city) === normalizeName(country.capital) &&
        normalizeName(entry.country) === normalizeName(country.name),
    );

    if (fallback) {
      addEntry(selected, seenCityCountry, seenCoords, makeEntry(fallback));
    }
  }

  for (const fallback of NATIONAL_CAPITAL_FALLBACKS) {
    if (selected.length >= MAX_CITIES) {
      break;
    }
    addEntry(selected, seenCityCountry, seenCoords, makeEntry(fallback));
  }

  const sortedWorldCities = [...worldCities].sort(
    (a, b) => (b.population ?? 0) - (a.population ?? 0),
  );

  for (const city of sortedWorldCities) {
    if (selected.length >= MAX_CITIES) {
      break;
    }
    addEntry(
      selected,
      seenCityCountry,
      seenCoords,
      makeEntry({
        city: city.name,
        country: city.country,
        latitude: city._geo.lat,
        longitude: city._geo.lng,
      }),
    );
  }

  const observerCities = [...selected].sort((a, b) => {
    const labelA = `${a.city}, ${a.country}`;
    const labelB = `${b.city}, ${b.country}`;
    return labelA.localeCompare(labelB);
  });

  fs.writeFileSync(
    outputPath,
    `${JSON.stringify(observerCities, null, 2)}\n`,
    "utf8",
  );
  fs.writeFileSync(loaderPath, LOADER_SOURCE, "utf8");

  const duplicateCityCountry =
    observerCities.length -
    new Set(
      observerCities.map((city) => cityCountryKey(city.city, city.country)),
    ).size;

  console.log(`Wrote ${observerCities.length} cities to ${outputPath}`);
  console.log(`Wrote loader to ${loaderPath}`);
  if (duplicateCityCountry > 0) {
    throw new Error(
      `Duplicate city/country pairs remain: ${duplicateCityCountry}`,
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
