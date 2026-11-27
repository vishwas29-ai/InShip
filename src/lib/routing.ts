
import "server-only";

// ============================================
// TYPES
// ============================================

type Coordinates = {
  latitude: number;
  longitude: number;
};

type PostOffice = {
  Name: string;
  District: string;
  State: string;
};

type PinApiResponse = {
  Status: string;
  PostOffice: PostOffice[] | null;
};

type PinInfo = {
  pin: string;
  district: string;
  state: string;
  offices: string[];
};

type GeoFeature = {
  geometry?: {
    coordinates?: number[];
  };
  properties?: {
    name?: string;
    locality?: string;
    region?: string;
    country_a?: string;
    confidence?: number;
    layer?: string;
  };
};

type GeoResponse = {
  features?: GeoFeature[];
};

type DirectionsResponse = {
  routes?: Array<{
    summary?: {
      distance?: number;
    };
  }>;
};

// ============================================
// CONFIGURATION
// ============================================

const PIN_CACHE_TTL = 24 * 60 * 60 * 1000;

const pinCache = new Map<
  string,
  {
    data: PinInfo;
    expiresAt: number;
  }
>();

function getApiKey(): string {
  const key = process.env.OPENROUTESERVICE_API_KEY;

  if (!key) {
    throw new Error("ORS API key missing");
  }

  return key;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

// ============================================
// STEP 1: VALIDATE INDIAN PIN CODE
// ============================================

export async function validatePin(
  pin: string
): Promise<PinInfo> {
  // Check PIN format
  if (!/^[1-9][0-9]{5}$/.test(pin)) {
    throw new Error(`Invalid PIN: ${pin}`);
  }

  // Return cached result when available
  const cached = pinCache.get(pin);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const url = `https://api.postalpincode.in/pincode/${pin}`;

  // Maximum 3 attempts
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch(url, {
        cache: "no-store",
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        const retryableStatus = [
          429, 500, 502, 503, 504,
        ].includes(response.status);

        if (retryableStatus && attempt < 3) {
          await sleep(attempt * 500);
          continue;
        }

        throw new Error(
          `PIN verification service returned HTTP ${response.status}`
        );
      }

      const data: PinApiResponse[] = await response.json();

      const offices = data[0]?.PostOffice;

      if (
        data[0]?.Status !== "Success" ||
        !offices?.length
      ) {
        throw new Error(`PIN ${pin} not found`);
      }

      const result: PinInfo = {
        pin,
        district: offices[0].District,
        state: offices[0].State,
        offices: offices.map(
          (office) => office.Name
        ),
      };

      // Save successful verification in memory
      pinCache.set(pin, {
        data: result,
        expiresAt: Date.now() + PIN_CACHE_TTL,
      });

      return result;
    } catch (error) {
      const isNetworkError =
        error instanceof TypeError ||
        (error instanceof Error &&
          ["TimeoutError", "AbortError"].includes(
            error.name
          ));

      if (isNetworkError && attempt < 3) {
        await sleep(attempt * 500);
        continue;
      }

      if (
        error instanceof Error &&
        error.message.startsWith("PIN ")
      ) {
        throw error;
      }

      throw new Error(
        "PIN verification service is temporarily unavailable. Please try again.",
        { cause: error }
      );
    }
  }

  throw new Error(
    "PIN verification service is temporarily unavailable."
  );
}

// ============================================
// STEP 2: GEOCODE AND VERIFY ADDRESS
// ============================================

export async function geocodeAddress(
  address: string,
  pin: string
): Promise<Coordinates> {
  // Verify PIN and retrieve district/state
  const pinInfo = await validatePin(pin);

  const normalizedAddress = normalize(address);

  const locationNames = [
    pinInfo.district,
    pinInfo.state,
    ...pinInfo.offices,
  ];

  // Ensure address mentions matching location
  const locationMentioned = locationNames.some(
    (name) =>
      normalizedAddress.includes(normalize(name))
  );

  if (!locationMentioned) {
    throw new Error(
      `Address does not match PIN ${pin}. Expected district/state: ${pinInfo.district}, ${pinInfo.state}`
    );
  }

  // Prepare OpenRouteService geocoding URL
  const url = new URL(
    "https://api.openrouteservice.org/geocode/search"
  );

  url.searchParams.set(
    "text",
    `${address}, ${pinInfo.state}, India`
  );

  url.searchParams.set("size", "10");
  url.searchParams.set("boundary.country", "IND");

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: getApiKey(),
    },
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    throw new Error(
      `ORS geocoding failed: HTTP ${response.status}`
    );
  }

  const data: GeoResponse = await response.json();

  const expectedState = pinInfo.state.toLowerCase();

  // Filter coordinates by country and state
  const candidates = (data.features ?? []).filter(
    (feature) => {
      const properties = feature.properties;
      const coords = feature.geometry?.coordinates;

      return (
        properties?.country_a === "IND" &&
        properties.region?.toLowerCase() === expectedState &&
        coords?.length === 2 &&
        coords.every(Number.isFinite) &&
        properties.layer !== "country" &&
        properties.layer !== "region"
      );
    }
  );

  if (candidates.length === 0) {
    throw new Error(
      `Could not locate a matching address for PIN ${pin}`
    );
  }

  // Match district or post-office name
  const expectedNames = locationNames.map(normalize);

  const match = candidates.find((feature) => {
    const name = normalize(
      feature.properties?.name ?? ""
    );

    const locality = normalize(
      feature.properties?.locality ?? ""
    );

    return expectedNames.some(
      (expected) =>
        expected.length > 0 &&
        (
          name === expected ||
          locality === expected ||
          name.includes(expected) ||
          locality.includes(expected)
        )
    );
  });

  if (!match?.geometry?.coordinates) {
    throw new Error(
      `Location could not be verified for PIN ${pin}`
    );
  }

  const [longitude, latitude] =
    match.geometry.coordinates;

  return {
    latitude,
    longitude,
  };
}

// ============================================
// STEP 3: CALCULATE ACTUAL ROAD DISTANCE
// ============================================

export async function getRoadDistance(
  pickup: Coordinates,
  delivery: Coordinates
): Promise<number> {
  const response = await fetch(
    "https://api.openrouteservice.org/v2/directions/driving-car",
    {
      method: "POST",
      headers: {
        Authorization: getApiKey(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        coordinates: [
          [pickup.longitude, pickup.latitude],
          [delivery.longitude, delivery.latitude],
        ],
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    }
  );

  if (!response.ok) {
    throw new Error(
      `ORS directions request failed: HTTP ${response.status}`
    );
  }

  const data: DirectionsResponse = await response.json();

  const meters =
    data.routes?.[0]?.summary?.distance;

  if (
    typeof meters !== "number" ||
    !Number.isFinite(meters) ||
    meters <= 0
  ) {
    throw new Error(
      "No valid driving route found"
    );
  }

  // Convert meters into kilometers
  return meters / 1000;
}

export async function geocodePin(
  pin: string
): Promise<Coordinates> {
  // Validate PIN and retrieve its official district/state.
  const pinInfo = await validatePin(pin);

  const searchQueries = [
    `${pinInfo.district}, ${pinInfo.state}, India`,
    `${pinInfo.state}, India`,
  ];

  for (const query of searchQueries) {
    const url = new URL(
      "https://api.openrouteservice.org/geocode/search"
    );

    url.searchParams.set("text", query);
    url.searchParams.set("size", "10");
    url.searchParams.set("boundary.country", "IND");

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: getApiKey(),
      },
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(
        `ORS PIN geocoding failed: HTTP ${response.status}`
      );
    }

    const data: GeoResponse = await response.json();

    const expectedState = normalize(pinInfo.state);
    const expectedDistrict = normalize(pinInfo.district);

    const candidates = (data.features ?? []).filter(
      (feature) => {
        const props = feature.properties;
        const coords = feature.geometry?.coordinates;

        return (
          props?.country_a === "IND" &&
          normalize(props.region ?? "") === expectedState &&
          coords?.length === 2 &&
          coords.every(Number.isFinite)
        );
      }
    );

    // Prefer the district rather than a state-level point.
    const districtMatch = candidates.find((feature) => {
      const props = feature.properties;
      const name = normalize(props?.name ?? "");
      const locality = normalize(props?.locality ?? "");

      return (
        props?.layer !== "region" &&
        (name.includes(expectedDistrict) ||
          locality.includes(expectedDistrict))
      );
    });

    const coords = districtMatch?.geometry?.coordinates;

    if (coords) {
      return {
        longitude: coords[0],
        latitude: coords[1],
      };
    }
  }

  throw new Error(
    `Could not locate district for PIN ${pin}`
  );
}
