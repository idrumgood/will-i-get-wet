# Future Features & Enhancements

This document tracks ideas and planned features for Future versions of "Will I Get Wet?".

## Phase 5: Routing & Interaction Enhancements
- [ ] **Multi-modal Transportation:** Allow users to switch between Bicycle, Car, and Walking profiles. Travel time (and therefore interval timestamps) must recalibrate correctly for each mode.
- [ ] **Custom Draggable Routes:** Implement Leaflet Routing Machine or a custom polyline editor so users can click/drag the generated route to force it down a specific road.
- [ ] **Multi-stop Routing:** Add the ability to add `N` number of waypoints between the Start and Destination.
- [ ] **Weather Avoidance Routing:** "Route Around" feature. If an interval point shows severe weather, the app automatically checks secondary and tertiary route alternatives to try and navigate around the storm cell.

## Phase 6: Deep Weather Analytics
- [ ] **Time-Shifting Optimizer:** Add a "Leave Later" slider. Dragging the slider recalibrates the start time and instantly updates the route's weather icons, helping users find the driest time to leave.
- [ ] **Wind & Headwind Warnings:** Overlay wind direction vectors (arrows) on the route to indicate if the cyclist will be fighting a headwind or flying with a tailwind.
- [ ] **Sun Glare & UV Warnings:** Calculate sun position vs route heading to flag points where the rider will be directly facing the sunrise/sunset glare.
- [ ] **Elevation & Temperature Profile:** An elevation graph that is color-coded by the interval temperature (e.g., warning riders of hot climbs).

## Phase 7: Trip Utilities
- [ ] **Return Trip Generator:** Quick toggle to generate the exact reverse route, including a "Time spent at destination" input to correctly calculate the return timestamps.
- [ ] **Smart Gear Recommendations:** Analyze the full path's weather array and suggest clothing (e.g., "Bring a windbreaker", "Pack sunglasses", "Wear full rain gear").
