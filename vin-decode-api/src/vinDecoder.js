import { query } from "./db.js";

const DEFAULT_SUPPORTED_MAKES = [
  "FORD",
  "LINCOLN",
  "HONDA",
  "ACURA",
  "SUBARU",
  "TOYOTA",
  "LEXUS",
  "CHEVROLET",
  "GMC",
  "BUICK",
  "CADILLAC",
  "RAM",
  "DODGE",
  "CHRYSLER",
  "JEEP",
  "NISSAN",
  "INFINITI",
  "HYUNDAI",
  "KIA",
  "GENESIS",
  "VOLKSWAGEN",
  "AUDI",
  "BMW",
  "MINI",
  "MERCEDES-BENZ",
  "MAZDA",
  "VOLVO",
  "PORSCHE",
  "TESLA",
  "MITSUBISHI",
  "LAND ROVER",
  "JAGUAR",
  "FIAT",
  "ALFA ROMEO",
];

function getSupportedMakes() {
  const fromEnv = process.env.SUPPORTED_MAKES;
  if (fromEnv) {
    return new Set(
      fromEnv
        .split(",")
        .map((value) => value.trim().toUpperCase())
        .filter(Boolean)
    );
  }
  return new Set(DEFAULT_SUPPORTED_MAKES);
}

function getCacheDays() {
  const days = Number(process.env.VIN_CACHE_DAYS ?? 90);
  return Number.isFinite(days) && days > 0 ? days : 90;
}

function clean(value) {
  if (value == null || value === "" || value === "[]") return null;
  return String(value).trim() || null;
}

function numberOrNull(value) {
  const cleaned = clean(value);
  if (cleaned == null) return null;
  const number = Number(cleaned);
  return Number.isFinite(number) ? number : null;
}

export function normalizeVin(value) {
  const vin = String(value ?? "").trim().toUpperCase();
  if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(vin)) {
    const error = new Error("VIN must be 17 characters and cannot contain I, O, or Q");
    error.statusCode = 400;
    throw error;
  }
  return vin;
}

function parseJson(value) {
  if (!value) return null;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function normalizedResult(raw, dealerTrack = null) {
  const supportedMakes = getSupportedMakes();
  const make = clean(raw.Make)?.toUpperCase() ?? clean(dealerTrack?.Make)?.toUpperCase();

  if (!make || !supportedMakes.has(make)) {
    const allowed = [...supportedMakes].join(", ");
    const error = new Error(
      `Unsupported manufacturer${make ? `: ${make}` : ""}. Supported makes: ${allowed}`
    );
    error.statusCode = 422;
    throw error;
  }

  return {
    vin: clean(raw.VIN) ?? clean(dealerTrack?.VIN),
    make,
    model: clean(raw.Model) ?? clean(dealerTrack?.Model),
    modelYear: numberOrNull(raw.ModelYear) ?? numberOrNull(dealerTrack?.ModelYear),
    trim: clean(raw.Trim) ?? clean(dealerTrack?.Trim),
    series: clean(raw.Series),
    vehicleType: clean(raw.VehicleType),
    bodyClass: clean(raw.BodyClass) ?? clean(dealerTrack?.BodyStyle),
    bodyCabType: clean(raw.BodyCabType),
    driveType: clean(raw.DriveType) ?? clean(dealerTrack?.FourWheelDrive),
    engine: {
      configuration: clean(raw.EngineConfiguration),
      cylinders: numberOrNull(raw.EngineCylinders) ?? numberOrNull(dealerTrack?.Cylinders),
      displacementLiters: numberOrNull(raw.DisplacementL),
      displacementCc: numberOrNull(raw.DisplacementCC),
      model: clean(raw.EngineModel),
      manufacturer: clean(raw.EngineManufacturer),
      horsepower: numberOrNull(raw.EngineHP),
      code: clean(dealerTrack?.EngineCode),
      turbo: clean(raw.Turbo) ?? clean(dealerTrack?.Turbo),
    },
    fuel: {
      primary: clean(raw.FuelTypePrimary) ?? clean(dealerTrack?.FuelType),
      secondary: clean(raw.FuelTypeSecondary),
      electrificationLevel: clean(raw.ElectrificationLevel),
    },
    transmission: {
      style: clean(raw.TransmissionStyle),
      speeds: numberOrNull(raw.TransmissionSpeeds),
      code: clean(dealerTrack?.TransmissionCode),
    },
    dimensions: {
      doors: numberOrNull(raw.Doors),
      seats: numberOrNull(raw.Seats),
      seatRows: numberOrNull(raw.SeatRows),
      gvwr: clean(raw.GVWR),
      bedLengthInches: numberOrNull(raw.BedLengthIN),
    },
    manufacturing: {
      manufacturer: clean(raw.Manufacturer),
      plantCity: clean(raw.PlantCity),
      plantState: clean(raw.PlantState),
      plantCountry: clean(raw.PlantCountry),
    },
    safety: {
      abs: clean(raw.ABS),
      esc: clean(raw.ESC),
      tractionControl: clean(raw.TractionControl),
      tpms: clean(raw.TPMS),
      adaptiveCruiseControl: clean(raw.AdaptiveCruiseControl),
      blindSpotMonitoring: clean(raw.BlindSpotMon),
      forwardCollisionWarning: clean(raw.ForwardCollisionWarning),
      laneDepartureWarning: clean(raw.LaneDepartureWarning),
      laneKeepSystem: clean(raw.LaneKeepSystem),
      rearCrossTrafficAlert: clean(raw.RearCrossTrafficAlert),
    },
    nhtsa: {
      errorCode: clean(raw.ErrorCode),
      errorText: clean(raw.ErrorText),
      additionalErrorText: clean(raw.AdditionalErrorText),
      note: clean(raw.Note),
    },
  };
}

async function getDealerTrackData(vin) {
  if (process.env.ENABLE_DEALERTRACK_ENRICHMENT !== "true") {
    return null;
  }

  try {
    const [row] = await query(
      `
      SELECT response
      FROM vehicle_lookup_api_responses
      WHERE vin = ?
      ORDER BY created_at DESC, id DESC
      LIMIT 1
    `,
      [vin]
    );
    return parseJson(row?.response);
  } catch {
    return null;
  }
}

async function getCachedDecode(vin) {
  const [row] = await query(
    `
    SELECT raw_response, decoded_at
    FROM Dash_VinDecodes
    WHERE vin = ?
      AND decoded_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
    LIMIT 1
  `,
    [vin, getCacheDays()]
  );
  if (!row) return null;

  return {
    raw: parseJson(row.raw_response),
    decodedAt: row.decoded_at,
  };
}

async function fetchNhtsaDecode(vin) {
  const url = `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValuesExtended/${encodeURIComponent(vin)}?format=json`;
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(12000),
  });

  if (!response.ok) {
    const error = new Error(`VIN decoder returned HTTP ${response.status}`);
    error.statusCode = 502;
    throw error;
  }

  const payload = await response.json();
  const raw = payload?.Results?.[0];
  if (!raw) {
    const error = new Error("VIN decoder returned no results");
    error.statusCode = 502;
    throw error;
  }
  return raw;
}

async function saveDecode(vin, raw) {
  await query(
    `
    INSERT INTO Dash_VinDecodes (
      vin, source, make, model, model_year, trim_name, vehicle_type, body_class,
      drive_type, engine_configuration, engine_cylinders, engine_displacement_l,
      engine_model, engine_manufacturer, engine_hp, fuel_type_primary,
      fuel_type_secondary, electrification_level, transmission_style,
      transmission_speeds, turbo, doors, seats, gvwr, plant_city, plant_state,
      plant_country, error_code, error_text, raw_response, decoded_at
    )
    VALUES (?, 'nhtsa-vpic', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    ON DUPLICATE KEY UPDATE
      make = VALUES(make),
      model = VALUES(model),
      model_year = VALUES(model_year),
      trim_name = VALUES(trim_name),
      vehicle_type = VALUES(vehicle_type),
      body_class = VALUES(body_class),
      drive_type = VALUES(drive_type),
      engine_configuration = VALUES(engine_configuration),
      engine_cylinders = VALUES(engine_cylinders),
      engine_displacement_l = VALUES(engine_displacement_l),
      engine_model = VALUES(engine_model),
      engine_manufacturer = VALUES(engine_manufacturer),
      engine_hp = VALUES(engine_hp),
      fuel_type_primary = VALUES(fuel_type_primary),
      fuel_type_secondary = VALUES(fuel_type_secondary),
      electrification_level = VALUES(electrification_level),
      transmission_style = VALUES(transmission_style),
      transmission_speeds = VALUES(transmission_speeds),
      turbo = VALUES(turbo),
      doors = VALUES(doors),
      seats = VALUES(seats),
      gvwr = VALUES(gvwr),
      plant_city = VALUES(plant_city),
      plant_state = VALUES(plant_state),
      plant_country = VALUES(plant_country),
      error_code = VALUES(error_code),
      error_text = VALUES(error_text),
      raw_response = VALUES(raw_response),
      decoded_at = NOW()
  `,
    [
      vin,
      clean(raw.Make),
      clean(raw.Model),
      numberOrNull(raw.ModelYear),
      clean(raw.Trim),
      clean(raw.VehicleType),
      clean(raw.BodyClass),
      clean(raw.DriveType),
      clean(raw.EngineConfiguration),
      numberOrNull(raw.EngineCylinders),
      numberOrNull(raw.DisplacementL),
      clean(raw.EngineModel),
      clean(raw.EngineManufacturer),
      numberOrNull(raw.EngineHP),
      clean(raw.FuelTypePrimary),
      clean(raw.FuelTypeSecondary),
      clean(raw.ElectrificationLevel),
      clean(raw.TransmissionStyle),
      numberOrNull(raw.TransmissionSpeeds),
      clean(raw.Turbo),
      numberOrNull(raw.Doors),
      numberOrNull(raw.Seats),
      clean(raw.GVWR),
      clean(raw.PlantCity),
      clean(raw.PlantState),
      clean(raw.PlantCountry),
      clean(raw.ErrorCode),
      clean(raw.ErrorText),
      JSON.stringify(raw),
    ]
  );
}

export async function decodeVin(value, { refresh = false } = {}) {
  const vin = normalizeVin(value);
  const dealerTrack = await getDealerTrackData(vin);

  if (!refresh) {
    const cached = await getCachedDecode(vin);
    if (cached?.raw) {
      return {
        source: "cache",
        decodedAt: cached.decodedAt,
        data: normalizedResult(cached.raw, dealerTrack),
      };
    }
  }

  const raw = await fetchNhtsaDecode(vin);
  const data = normalizedResult(raw, dealerTrack);
  await saveDecode(vin, raw);

  return {
    source: "nhtsa-vpic",
    decodedAt: new Date().toISOString(),
    data,
  };
}
