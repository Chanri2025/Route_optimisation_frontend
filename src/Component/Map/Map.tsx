"use client";

import {
    MapContainer,
    TileLayer,
    Marker,
    Popup,
    Polygon,
    Polyline,
    useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import {useState, useEffect} from "react";
import type {House} from "./controlpanel";

const tileLayers = {
    streets: {
        url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        attribution: '&copy; OpenStreetMap contributors',
    },
    satellite: {
        url:
            "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        attribution: "Tiles © Esri",
    },
};

const currentIcon = new L.Icon({
    iconUrl:
        "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
    shadowUrl:
        "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    shadowSize: [41, 41],
    popupAnchor: [1, -34],
});

export type RoutePoint = { lat: number; lon: number };

type MapProps = {
    layer: string;
    pickLocationMode?: boolean;
    onPickLocation?: (lat: number, lng: number) => void;
    geofence: string;
    houses: House[];
    routePath?: RoutePoint[];
    isPlaying?: boolean;
};

function ClickHandler({
                          enabled,
                          onPick,
                      }: {
    enabled: boolean;
    onPick: (lat: number, lng: number) => void;
}) {
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
    const [map, setMap] = useState<L.Map | null>(null);
    const [currentIndex, setCurrentIndex] = useState(0);

    // parse geofence string
    const fenceCoords = geofence
        .split(";")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((p) => p.split(",").map(Number) as [number, number])
        .filter(([a, b]) => !isNaN(a) && !isNaN(b));

    // draw polygon when map and fenceCoords ready
    useEffect(() => {
        if (!map || fenceCoords.length < 3) return;
        const poly = L.polygon(fenceCoords, {color: "purple", fillOpacity: 0.2}).addTo(map);
        map.fitBounds(poly.getBounds());
        return () => void map.removeLayer(poly);
    }, [map, geofence]);

    // reset on new route
    useEffect(() => setCurrentIndex(0), [routePath]);

    // animate marker
    useEffect(() => {
        if (!isPlaying || routePath.length < 2) return;
        const int = window.setInterval(() => {
            setCurrentIndex((i) => (i + 1 < routePath.length ? i + 1 : (window.clearInterval(int), i)));
        }, 1000);
        return () => window.clearInterval(int);
    }, [isPlaying, routePath]);

    const line = routePath.map((pt) => [pt.lat, pt.lon] as [number, number]);
    const center: [number, number] =
        fenceCoords[0] || line[0] || [21.1458 /* default lat */, 79.0882 /* default lon */];

    return (
        <MapContainer
            center={center}
            zoom={13}
            className="h-full w-full"
            whenCreated={setMap}
        >
            <TileLayer url={tileLayers[layer].url} attribution={tileLayers[layer].attribution}/>

            {fenceCoords.length >= 3 && <Polygon positions={fenceCoords}/>}

            {line.length > 1 && <Polyline positions={line} color="blue" weight={4}/>}

            {line[currentIndex] && <Marker position={line[currentIndex]} icon={currentIcon}/>}

            {houses.map((h, i) => {
                const lat = parseFloat(h.lat),
                    lon = parseFloat(h.lon);
                if (isNaN(lat) || isNaN(lon)) return null;
                const icon = L.divIcon({
                    html: `<div style="
            background: red;
            width:16px;height:16px;
            border:2px solid white;
            border-radius:50%;
          "/>`,
                });
                return (
                    <Marker key={i} position={[lat, lon]} icon={icon}>
                        <Popup>
                            {h.house_id}
                            <br/>
                            {lat.toFixed(6)}, {lon.toFixed(6)}
                        </Popup>
                    </Marker>
                );
            })}

            <ClickHandler
                enabled={pickLocationMode}
                onPick={(lat, lng) => onPickLocation?.(lat, lng)}
            />
        </MapContainer>
    );
}
