# Riyadh School Planning Dashboard

A comprehensive dashboard for the Riyadh Ministry of Education to analyze school capacity, plan new facilities, and make data-driven decisions.

## Features

- 📊 **Overview Tab**: System-wide KPIs, critical alerts, and top priority districts
- 🗺️ **Interactive Map Tab**: School locations, heatmaps, and optimal new locations
- 📈 **Forecasting Tab**: Scenario analysis and capacity projections (2025-2030)
- 💰 **Budget Planning Tab**: Interactive budget optimizer and ROI calculator
- 🎯 **District Analysis Tab**: Priority scoring and district comparisons

## Tech Stack

- **Frontend**: React + Vite
- **Styling**: Tailwind CSS
- **Maps**: Leaflet + React-Leaflet
- **Charts**: Recharts
- **Icons**: Lucide React
- **Backend APIs**: n8n workflows at `https://n8n.hantoush.space/webhook/`

## Installation

```bash
npm install
```

## Development

```bash
npm run dev
```

## Build

```bash
npm run build
```

## Deployment to Coolify

1. Push this repository to GitHub
2. Open Coolify at `new.contabo.com`
3. Go to "production" project
4. Click "+ New" → "Application"
5. Select "Public Repository"
6. Enter your GitHub repo URL
7. Configure:
   - Build Pack: Nixpacks (auto-detect)
   - Port: 5173 (or 3000)
   - Start Command: (leave empty)
8. Click "Save" and "Deploy"

## API Endpoints

- Capacity Analysis: `/webhook/analyze-capacity`
- Optimal Locations: `/webhook/find-optimal-locations`
- Travel Time Heatmap: `/webhook/travel-time-heatmap`
- Budget Optimizer: `/webhook/budget-optimizer`
- Forecast Scenarios: `/webhook/forecast-scenarios`
- District Priorities: `/webhook/district-priorities`

## License

© 2025 Riyadh Ministry of Education
