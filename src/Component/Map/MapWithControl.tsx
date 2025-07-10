"use client";

import { useState } from "react";
import { Map } from "./Map";
import { ControlPanel } from "./controlpanel";
import type { House } from "./controlpanel";
import { Button } from "@/components/ui/button";

type RoutePoint = { lat: number; lon: number };

type RouteResponse = {
  depot: { lat: number; lon: number };
  google_maps_url: string;
  pathway: string[];
  route_path: RoutePoint[];
  status: string;
  stops: unknown[];
};

export default function MapWithControl() {
  const [layer, setLayer] = useState("streets");
  const [pickMode, setPickMode] = useState(false);
  const [geofence, setGeofence] = useState("");
  const [pickedLocation, setPickedLocation] = useState<[number, number] | null>(
    null
  );

  const [houses, setHouses] = useState<House[]>([
    { house_id: "", lat: "", lon: "" },
  ]);
  const [pickingHouseIndex, setPickingHouseIndex] = useState<number | null>(
    null
  );

  // full response
  const [routeResult, setRouteResult] = useState<RouteResponse | null>(null);

  // play/pause state
  const [isPlaying, setIsPlaying] = useState(false);

  function handleGeofenceConfirm() {
    console.log("Fence confirmed:", geofence);
  }

  async function handleOptimizeRoute() {
    const payload = {
      geofence,
      houses: houses.map((h) => ({
        lat: parseFloat(h.lat),
        lon: parseFloat(h.lon),
      })),
      nn_steps: 0,
      center: null,
      current_location: pickedLocation
        ? { lat: pickedLocation[0], lon: pickedLocation[1] }
        : null,
    };

    try {
      const res = await fetch("http://192.168.1.90:5000/optimize_route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      const data: RouteResponse = await res.json();
      setRouteResult(data);
    } catch (err) {
      console.error("Route optimization failed:", err);
      alert("Failed to optimize route");
    }
  }

  function handleSetCurrentLocation() {
    setPickingHouseIndex(null);
    setPickMode(true);
  }

  function startHousePick(idx: number) {
    setPickingHouseIndex(idx);
    setPickMode(true);
  }

  function handleLocationPicked(lat: number, lng: number) {
    if (pickingHouseIndex != null) {
      const upd = [...houses];
      upd[pickingHouseIndex] = {
        ...upd[pickingHouseIndex],
        lat: lat.toString(),
        lon: lng.toString(),
      };
      setHouses(upd);
    } else {
      setPickedLocation([lat, lng]);
    }
    setPickMode(false);
    setPickingHouseIndex(null);
  }

  function handleHouseChange(idx: number, field: keyof House, value: string) {
    const upd = [...houses];
    upd[idx] = { ...upd[idx], [field]: value };
    setHouses(upd);
  }

  function handleAddHouse() {
    setHouses([...houses, { house_id: "", lat: "", lon: "" }]);
  }

  function handleRemoveHouse(idx: number) {
    setHouses(houses.filter((_, i) => i !== idx));
  }

  return (
    <div className="grid md:grid-cols-4 gap-4 p-4 h-screen">
      {/* Control Panel + Play/Pause */}
      <div className="col-span-1 flex flex-col">
        <ControlPanel
          geofence={geofence}
          onGeofenceChange={setGeofence}
          onGeofenceConfirm={handleGeofenceConfirm}
          onOptimizeRoute={handleOptimizeRoute}
          houses={houses}
          onHouseChange={handleHouseChange}
          onAddHouse={handleAddHouse}
          onRemoveHouse={handleRemoveHouse}
          onHousePickLocation={startHousePick}
          onLayerChange={setLayer}
          onSetCurrentLocation={handleSetCurrentLocation}
        />

        {/* Play / Pause */}
        <div className="mt-4 flex space-x-2">
          <Button
            onClick={() => setIsPlaying(true)}
            disabled={isPlaying || !(routeResult?.route_path?.length > 1)}
            className="flex-1">
            Play
          </Button>
          <Button
            onClick={() => setIsPlaying(false)}
            disabled={!isPlaying}
            className="flex-1">
            Pause
          </Button>
        </div>

        {/* Predict / Optimize Route */}
        <div className="mt-4">
          <Button
            variant="secondary"
            onClick={handleOptimizeRoute}
            className="w-full">
            Predict
          </Button>
        </div>
      </div>

      {/* Map */}
      <div className="col-span-3 relative h-full">
        <Map
          layer={layer}
          pickLocationMode={pickMode}
          onPickLocation={handleLocationPicked}
          geofence={geofence}
          houses={houses}
          routePath={routeResult?.route_path}
          isPlaying={isPlaying}
        />

        {pickedLocation && (
          <div className="absolute bottom-4 left-4 bg-white p-3 rounded shadow-lg">
            <strong>Picked Location:</strong>
            <div>Lat: {pickedLocation[0].toFixed(6)}</div>
            <div>Lng: {pickedLocation[1].toFixed(6)}</div>
          </div>
        )}

        {routeResult && (
          <div className="absolute top-4 right-4 bg-white p-4 rounded shadow-lg max-h-[80%] overflow-auto">
            <h3 className="font-semibold mb-2">Optimized Path</h3>
            <ol className="list-decimal list-inside space-y-1">
              {routeResult.pathway.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}
