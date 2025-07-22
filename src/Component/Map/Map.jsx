// Map.jsx
import {
    MapContainer,
    TileLayer,
    Marker,
    Popup,
    Polygon,
    Polyline,
    CircleMarker,
    useMapEvents,
    useMap
} from "react-leaflet";
import L from "leaflet";
import {useState, useEffect} from "react";

// Leaflet CSS + default icon fix
import "leaflet/dist/leaflet.css";
import iconUrl from "leaflet/dist/images/marker-icon.png";
import iconShadowUrl from "leaflet/dist/images/marker-shadow.png";

const DefaultIcon = L.icon({
    iconUrl,
    shadowUrl: iconShadowUrl,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// Pickup‐mode icon
const pickupIcon = new L.Icon({
    iconUrl: "/garbage-pickup-point.png",
    iconSize: [40, 60],
    iconAnchor: [20, 60]
});

// Bearing helper
function getBearing([lat1, lon1], [lat2, lon2]) {
    const toRad = (d) => (d * Math.PI) / 180;
    const toDeg = (r) => (r * 180) / Math.PI;
    const dLon = toRad(lon2 - lon1);
    const y = Math.sin(dLon) * Math.cos(toRad(lat2));
    const x =
        Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
        Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);
    return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

// Keep map centered
function MapCenterHandler({center}) {
    const map = useMap();
    useEffect(() => {
        if (center) map.setView(center, map.getZoom());
    }, [center, map]);
    return null;
}

// Cursor & click for pick mode
function CursorHandler({pickMode, onPick}) {
    useMapEvents({
        mousemove(e) {
            if (pickMode) onPick({lat: e.latlng.lat, lon: e.latlng.lng});
        },
        click(e) {
            if (pickMode) onPick({lat: e.latlng.lat, lon: e.latlng.lng});
        }
    });
    return null;
}

export default function Map({
                        layer,
                        pickLocationMode = false,
                        onPickLocation,
                        geofence,
                        houses = [],
                        dumpYards = [],
                        selectedDumpIndex = null,
                        routePath = [],
                        stops = [],
                        showHouses,
                        isPlaying,
                        pickedLoc,
                        onAnimationEnd,
                        center
                    }) {
    const [cursorPos, setCursorPos] = useState(null);
    const [vanIndex, setVanIndex] = useState(0);

    // Parse geofence string
    const fenceCoords =
        typeof geofence === "string"
            ? geofence
                .split(";")
                .map((pt) => pt.trim().split(",").map(Number))
                .filter(([a, b]) => !isNaN(a) && !isNaN(b))
            : [];

    // Build polyline
    const line = Array.isArray(routePath)
        ? routePath.map((p) => [p.lat, p.lon])
        : [];

    // Reset van on route change
    useEffect(() => setVanIndex(0), [routePath]);

    // Animate van
    useEffect(() => {
        if (!isPlaying || line.length < 2) return;
        const iv = setInterval(() => {
            setVanIndex((i) => {
                if (i + 1 < line.length) return i + 1;
                clearInterval(iv);
                onAnimationEnd?.();
                return i;
            });
        }, 1000);
        return () => clearInterval(iv);
    }, [isPlaying, line.length, onAnimationEnd]);

    // Van rotation
    const rotation =
        line[vanIndex] && line[vanIndex + 1]
            ? getBearing(line[vanIndex], line[vanIndex + 1])
            : 0;

    const vanIcon = L.divIcon({
        html: `<img src="/van.png" style="width:40px;height:40px;transform:rotate(${rotation}deg)" />`,
        iconSize: [40, 40],
        iconAnchor: [20, 20]
    });

    return (
        <MapContainer
            center={center}
            zoom={15}
            style={{height: "100%", width: "100%"}}
        >
            <MapCenterHandler center={center}/>
            <TileLayer
                url={
                    layer === "satellite"
                        ? "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                        : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                }
            />

            {/* Geofence */}
            {fenceCoords.length >= 3 && (
                <Polygon positions={fenceCoords} color="red" weight={2} fillOpacity={0}/>
            )}

            {/* Route */}
            {line.length > 1 && <Polyline positions={line} color="blue" weight={4}/>}

            {/* Moving van */}
            {line[vanIndex] && <Marker position={line[vanIndex]} icon={vanIcon}/>}

            {/* Stops */}
            {stops.map((s, i) => (
                <CircleMarker
                    key={i}
                    center={[s.lat, s.lon]}
                    radius={6}
                    color={s.stop === 0 ? "green" : s.house_id ? "blue" : "gray"}
                    fillOpacity={0.8}
                >
                    <Popup>
                        <strong>{s.label}</strong>
                        {s.house_id && <div>House: {s.house_id}</div>}
                        <div>
                            {s.lat.toFixed(6)}, {s.lon.toFixed(6)}
                        </div>
                    </Popup>
                </CircleMarker>
            ))}

            {/* Selected dump yard */}
            {selectedDumpIndex != null && dumpYards[selectedDumpIndex] && (
                <CircleMarker
                    center={[
                        dumpYards[selectedDumpIndex].lat,
                        dumpYards[selectedDumpIndex].lon
                    ]}
                    radius={10}
                    fillColor="red"
                    color="#000"
                    fillOpacity={0.8}
                >
                    <Popup>
                        Dump Yard<br/>
                        {dumpYards[selectedDumpIndex].lat.toFixed(6)},{" "}
                        {dumpYards[selectedDumpIndex].lon.toFixed(6)}
                    </Popup>
                </CircleMarker>
            )}

            {/* Houses with custom divIcon */}
            {showHouses &&
                houses.map((h, i) => {
                    const lat = parseFloat(h.lat),
                        lon = parseFloat(h.lon);
                    if (isNaN(lat) || isNaN(lon)) return null;

                    const houseIcon = L.divIcon({
                        html: `<div style="
               background: #1e88e5;
               color: white;
               font-size: 12px;
               font-weight: bold;
               display: flex;
               justify-content: center;
               align-items: center;
               width: 35px;
               height: 35px;
               border: 1px solid white;
               border-radius: 50%;
               box-shadow: 0 0 3px rgba(0,0,0,0.5);
            ">${h.house_id}</div>`,
                        className: ""
                    });

                    return (
                        <Marker key={i} position={[lat, lon]} icon={houseIcon}>
                            <Popup>
                                {h.house_id}
                                <br/>
                                {lat.toFixed(6)}, {lon.toFixed(6)}
                            </Popup>
                        </Marker>
                    );
                })}

            {/* Cursor & pick */}
            <CursorHandler
                pickMode={pickLocationMode}
                onPick={({lat, lon}) => {
                    setCursorPos({lat, lon});
                    onPickLocation(lat, lon);
                }}
            />
            {cursorPos && pickLocationMode && (
                <Marker position={[cursorPos.lat, cursorPos.lon]} icon={pickupIcon}/>
            )}

            {/* Final picked loc */}
            {pickedLoc && (
                <Marker position={pickedLoc} icon={pickupIcon}>
                    <Popup>Selected Location</Popup>
                </Marker>
            )}
        </MapContainer>
    );
}