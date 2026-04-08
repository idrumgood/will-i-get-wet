# Will I Get Wet?

A bicycle weather routing app that plots routes and fetches specific weather forecasts for the exact arrival time at interval points.

## Built with
- React + Vite (Frontend)
- Express + Node.js (Backend)
- Google Maps Routes API (Routing & Directions)
- Google Maps JS API (Geocoding & Map Display)
- Open-Meteo API (Hourly Weather)

## Prerequisites
You will need a valid Google Maps API Key with the **Routes API** and **Maps JavaScript API** enabled.

Create a `.env` file in the root directory and add your key:
```env
GOOGLE_MAPS_API_KEY=your_google_maps_api_key
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

## How to run
Run `yarn` to install dependencies and `yarn dev` to start the local development server. This will launch both the Vite frontend and the Express backend concurrently.

## Deployment
This project is configured to deploy as a static site to Google Firebase Hosting, but you will now also need to deploy the Express backend to a suitable Node.js hosting provider (such as Google Cloud Run or Firebase Cloud Functions) and update the Vite proxy settings for production.
