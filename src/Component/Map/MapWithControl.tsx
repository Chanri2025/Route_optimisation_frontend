"use client";

import {useState, useRef, useEffect} from "react";
import {Map} from "./Map";
import {ControlPanel} from "./controlpanel";
import type {House} from "./controlpanel";
import {Button} from "@/components/ui/button";
import {API_URL} from '@/config.js';

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
    const [pickedLocation, setPickedLocation] = useState<[number, number] | null>(null);
    const [houses, setHouses] = useState<House[]>([{house_id: "", lat: "", lon: ""}]);
    const [pickingHouseIndex, setPickingHouseIndex] = useState<number | null>(null);
    const [routeResult, setRouteResult] = useState<RouteResponse | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);

    // Panel resizing state
    const [panelWidth, setPanelWidth] = useState(25); // Default 25% width
    const [isResizing, setIsResizing] = useState(false);
    const resizeRef = useRef<HTMLDivElement>(null);
    const intervalRef = useRef<number | undefined>(undefined);

    // Handle resize logic
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isResizing) return;

            const containerWidth = window.innerWidth;
            const newWidth = (e.clientX / containerWidth) * 100;

            // Limit the panel width between 15% and 50%
            if (newWidth >= 15 && newWidth <= 50) {
                setPanelWidth(newWidth);
            }
        };

        const handleMouseUp = () => {
            setIsResizing(false);
        };

        if (isResizing) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizing]);

    // Animation logic
    useEffect(() => {
        // Reset animation when route changes
        setCurrentIndex(0);
    }, [routeResult]);

    // Handle animation playback
    useEffect(() => {
        if (isPlaying && routeResult?.route_path?.length > 1) {
            intervalRef.current = window.setInterval(() => {
                setCurrentIndex((i) => {
                    const next = i + 1;
                    if (next >= (routeResult?.route_path?.length || 0)) {
                        // Clear interval and reset playing state when animation completes
                        window.clearInterval(intervalRef.current);
                        setIsPlaying(false); // This enables the play button again
                        return 0; // Reset to beginning for next play
                    }
                    return next;
                });
            }, 1000);
        } else {
            window.clearInterval(intervalRef.current);
        }

        return () => window.clearInterval(intervalRef.current);
    }, [isPlaying, routeResult?.route_path?.length]);

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
                ? {lat: pickedLocation[0], lon: pickedLocation[1]}
                : null,
        };

        try {
            const res = await fetch(`${API_URL}optimize_route`, {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify(payload),
            });
            if (!res.ok) throw new Error(await res.text());
            const data: RouteResponse = await res.json();
            setRouteResult(data);
            // Reset animation state when new route is loaded
            setIsPlaying(false);
            setCurrentIndex(0);
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
        upd[idx] = {...upd[idx], [field]: value};
        setHouses(upd);
    }

    function handleAddHouse() {
        setHouses([...houses, {house_id: "", lat: "", lon: ""}]);
    }

    function handleRemoveHouse(idx: number) {
        setHouses(houses.filter((_, i) => i !== idx));
    }

    // Reset animation function
    function handleResetAnimation() {
        setIsPlaying(false);
        setCurrentIndex(0);
    }

    return (
        <div className="flex h-screen p-4 relative">
            {/* Control Panel + Play/Pause */}
            <div
                className="flex flex-col h-full overflow-hidden"
                style={{width: `${panelWidth}%`}}
            >
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
                    routeResult={routeResult}
                />

                {/* Play / Pause / Reset */}
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
                    <Button
                        onClick={handleResetAnimation}
                        disabled={!routeResult?.route_path?.length}
                        className="flex-1">
                        Reset
                    </Button>
                </div>

                {/* Predict / Optimize Route */}
                <div className="mt-4">
                    <Button
                        variant="secondary"
                        onClick={handleOptimizeRoute}
                        className="w-full transition-all duration-300 bg-blue-400 text-white hover:bg-blue-600 hover:text-white hover:shadow-md active:scale-95">
                        Predict
                    </Button>
                </div>
            </div>

            {/* Resizer handle */}
            <div
                ref={resizeRef}
                className="w-2 h-full cursor-col-resize bg-gray-200 hover:bg-blue-400 active:bg-blue-600 transition-colors"
                onMouseDown={() => setIsResizing(true)}
            />

            {/* Map */}
            <div className="relative h-full" style={{width: `${100 - panelWidth - 0.5}%`}}>
                <Map
                    layer={layer}
                    pickLocationMode={pickMode}
                    onPickLocation={handleLocationPicked}
                    geofence={geofence}
                    houses={houses}
                    routePath={routeResult?.route_path}
                    isPlaying={isPlaying}
                    currentIndex={currentIndex}
                />

                {pickedLocation && (
                    <div className="absolute bottom-4 left-4 bg-white p-3 rounded shadow-lg">
                        <strong>Picked Location:</strong>
                        <div>Lat: {pickedLocation[0].toFixed(6)}</div>
                        <div>Lng: {pickedLocation[1].toFixed(6)}</div>
                    </div>
                )}
            </div>
        </div>
    );
}