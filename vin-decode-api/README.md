# VIN Decode API (standalone)

Self-contained Node/Express API that decodes major-manufacturer VINs via NHTSA vPIC and caches results in MariaDB table `Dash_VinDecodes`.

This package is independent of the FFD Dashboard. Copy the whole `vin-decode-api` folder to another host.

## Requirements

- Node.js 20+
- MariaDB/MySQL (for cache table)

## Setup

```bash
cd vin-decode-api
cp .env.example .env
# edit .env: DB_* and API_KEY
npm install
npm run db:migrate
npm start
```

Default port: **3080**

## Auth

Every `/api/v1/*` request needs an API key:

```http
X-API-Key: your-secret
```

or

```http
Authorization: Bearer your-secret
```

## Endpoints

### Health

```http
GET /health
GET /health/db
```

### Decode by path

```http
GET /api/v1/vin/2HKRS4H75TH506893
X-API-Key: your-secret
```

Force refresh (skip cache):

```http
GET /api/v1/vin/2HKRS4H75TH506893?refresh=true
X-API-Key: your-secret
```

### Decode by body

```http
POST /api/v1/vin/decode
Content-Type: application/json
X-API-Key: your-secret

{ "vin": "2HKRS4H75TH506893" }
```

## Example response

```json
{
  "source": "nhtsa-vpic",
  "decodedAt": "2026-07-21T18:00:00.000Z",
  "data": {
    "vin": "2HKRS4H75TH506893",
    "make": "HONDA",
    "model": "CR-V",
    "modelYear": 2026,
    "driveType": "4WD/4-Wheel Drive/4x4",
    "engine": {
      "configuration": "In-Line",
      "cylinders": 4,
      "displacementLiters": 1.5,
      "horsepower": 190,
      "turbo": "Yes"
    },
    "transmission": {
      "style": "Continuously Variable Transmission (CVT)"
    },
    "fuel": { "primary": "Gasoline" }
  }
}
```

## Supported makes

Default major manufacturers include:

`FORD`, `LINCOLN`, `HONDA`, `ACURA`, `SUBARU`, `TOYOTA`, `LEXUS`, `CHEVROLET`, `GMC`, `BUICK`, `CADILLAC`, `RAM`, `DODGE`, `CHRYSLER`, `JEEP`, `NISSAN`, `INFINITI`, `HYUNDAI`, `KIA`, `GENESIS`, `VOLKSWAGEN`, `AUDI`, `BMW`, `MINI`, `MERCEDES-BENZ`, `MAZDA`, `VOLVO`, `PORSCHE`, `TESLA`, `MITSUBISHI`, `LAND ROVER`, `JAGUAR`, `FIAT`, `ALFA ROMEO`

Override with env:

```env
SUPPORTED_MAKES=FORD,HONDA,SUBARU,TOYOTA
```

## Optional DealerTrack enrichment

If this API uses the First Dealer Direct MariaDB and you want engine/transmission codes from inventory lookups:

```env
ENABLE_DEALERTRACK_ENRICHMENT=true
```

## Deploy notes

- Keep `API_KEY` secret and rotate it if leaked
- Put nginx/Caddy in front for HTTPS
- Run under PM2: `pm2 start src/server.js --name vin-decode-api`

## Curl smoke test

```bash
curl -s http://127.0.0.1:3080/health
curl -s -H "X-API-Key: your-secret" http://127.0.0.1:3080/api/v1/vin/2HKRS4H75TH506893
```
