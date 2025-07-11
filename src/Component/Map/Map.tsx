"use client";

import {
    MapContainer,
    TileLayer,
    Marker,
    Popup,
    Polygon,
    Polyline,
    useMap,
    useMapEvents,
} from "react-leaflet";
import L, {type LatLngTuple} from "leaflet";
import {DefaultIcon} from "@/lib/leaflet-config";
import {useEffect, useRef, useState} from "react";
import type {House} from "./controlpanel";

// Don't set the default icon globally to avoid duplicate markers
// L.Marker.prototype.options.icon = DefaultIcon;

type RoutePoint = { lat: number; lon: number };

const tileLayers: Record<string, { url: string; attribution: string }> = {
    streets: {
        url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    },
    satellite: {
        url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        attribution:
            "Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS community",
    },
};

// Create a custom icon for the current location
const currentLocationIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

type MapProps = {
    layer: string;
    pickLocationMode?: boolean;
    onPickLocation?: (lat: number, lng: number) => void;
    geofence: string;
    houses: House[];
    routePath?: RoutePoint[];
    isPlaying?: boolean;
};

function useCursorStyle(enabled: boolean) {
    const map = useMap();
    useEffect(() => {
        const container = map.getContainer();
        container.style.cursor = enabled ? "crosshair" : "";
        return () => {
            container.style.cursor = "";
        };
    }, [enabled, map]);
}

function ClickHandler({
                          enabled,
                          onPick,
                      }: {
    enabled: boolean;
    onPick: (lat: number, lng: number) => void;
}) {
    useCursorStyle(enabled);
    useMapEvents({
        click(e) {
            if (enabled) onPick(e.latlng.lat, e.latlng.lng);
        },
    });
    return null;
}

export function Map({
                        layer,
                        pickLocationMode = false,
                        onPickLocation,
                        geofence,
                        houses,
                        routePath = [],
                        isPlaying = false,
                    }: MapProps) {
    const [selectedPoint, setSelectedPoint] = useState<[number, number] | null>(
        null
    );
    const [currentIndex, setCurrentIndex] = useState(0);
    const intervalRef = useRef<number | undefined>(undefined);

    // reset animation on new route
    useEffect(() => {
        setCurrentIndex(0);
    }, [routePath]);

    // drive animation when isPlaying toggles
    useEffect(() => {
        if (isPlaying && routePath.length > 1) {
            intervalRef.current = window.setInterval(() => {
                setCurrentIndex((i) => {
                    const next = i + 1;
                    if (next >= routePath.length) {
                        window.clearInterval(intervalRef.current);
                        return i;
                    }
                    return next;
                });
            }, 1000);
        } else {
            window.clearInterval(intervalRef.current);
        }
        return () => window.clearInterval(intervalRef.current);
    }, [isPlaying, routePath]);

    // parse geofence string into LatLng tuples
    const fenceCoords: LatLngTuple[] = geofence
        .split(";")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((pair) => {
            const [lat, lon] = pair.split(",").map(Number);
            return [lat, lon] as LatLngTuple;
        })
        .filter(([lat, lon]) => !isNaN(lat) && !isNaN(lon));

    const handlePick = (lat: number, lng: number) => {
        setSelectedPoint([lat, lng]);
        onPickLocation?.(lat, lng);
    };

    // determine map center
    const center: LatLngTuple =
        selectedPoint ??
        fenceCoords[0] ??
        (routePath.length > 0
            ? [routePath[0].lat, routePath[0].lon]
            : [21.1458, 79.0882]);

    // convert routePath to leaflet format
    const pathLine: LatLngTuple[] = routePath.map((pt) => [pt.lat, pt.lon]);

    // current animated marker position
    const animatedPos: LatLngTuple | null =
        currentIndex < pathLine.length ? pathLine[currentIndex] : null;

    // tile layer selection
    const layerCfg = tileLayers[layer] || tileLayers.streets;

    return (
        <MapContainer
            center={center}
            zoom={13}
            dragging={!pickLocationMode}
            className="h-full w-full rounded-lg border">
            <TileLayer url={layerCfg.url} attribution={layerCfg.attribution}/>

            {/* Geofence polygon */}
            {fenceCoords.length >= 3 && (
                <Polygon
                    positions={fenceCoords}
                    pathOptions={{color: "purple", fillOpacity: 0.2}}
                />
            )}

            {/* Optimized route – always show on any layer */}
            {pathLine.length > 1 && (
                <Polyline
                    positions={pathLine}
                    pathOptions={{color: "blue", weight: 4}}
                />
            )}

            {/* Animated "vehicle" marker */}
            {animatedPos && (
                <Marker
                    position={animatedPos}
                    icon={new L.Icon({
                        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
                        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                        iconSize: [25, 41],
                        iconAnchor: [12, 41],
                        popupAnchor: [1, -34],
                        shadowSize: [41, 41]
                    })}
                />
            )}

            {/* Current-position marker (when picking) - use custom icon */}
            {selectedPoint && (
                <Marker position={selectedPoint} icon={currentLocationIcon}>
                    <Popup>
                        Current Location<br/>
                        {selectedPoint[0].toFixed(6)}, {selectedPoint[1].toFixed(6)}
                    </Popup>
                </Marker>
            )}

            {/* House markers */}
            {houses.map((h, i) => {
                const lat = parseFloat(h.lat),
                    lon = parseFloat(h.lon);
                if (isNaN(lat) || isNaN(lon)) return null;
                const colors = ["red", "blue", "green", "orange", "purple"];
                const icon = L.divIcon({
                    className: "",
                    html: `<div style="
            background:${colors[i % colors.length]};
            width:16px;height:16px;
            border:2px solid white;border-radius:50%;
          "></div>`,
                    iconSize: [16, 16],
                    iconAnchor: [8, 8],
                });
                return (
                    <Marker key={i} position={[lat, lon]} icon={icon}>
                        <Popup>
                            {h.house_id || `House ${i + 1}`}
                            <br/>
                            {lat.toFixed(6)}, {lon.toFixed(6)}
                        </Popup>
                    </Marker>
                );
            })}

            <ClickHandler enabled={pickLocationMode} onPick={handlePick}/>
        </MapContainer>
    );
}