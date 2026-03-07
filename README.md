# Will I Get Wet?

A bicycle weather routing app that plots routes and fetches specific weather forecasts for the exact arrival time at interval points.

## Built with
- React + Vite
- Nominatim API (Geocoding)
- OSRM API (Bicycle Routing)
- Open-Meteo API (Hourly Weather)

## How to run
Run `yarn` to install dependencies and `yarn dev` to start the local development server.

## Deployment (Firebase Hosting)
This project is configured to deploy as a static site to Google Firebase Hosting.

1. Install the Firebase CLI globally if you haven't already:
   ```bash
   npm install -g firebase-tools
   ```
2. Login to your Google account:
   ```bash
   firebase login
   ```
3. Initialize the project ID. Open `.firebaserc` and replace `"will-i-get-wet"` with your actual Google Cloud / Firebase project ID.
4. Build the production application:
   ```bash
   yarn build
   ```
5. Deploy to the edge:
   ```bash
   firebase deploy
   ```
