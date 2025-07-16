// Map.jsx
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

// Custom icons
const vanIcon = new L.Icon({
    iconUrl: '/van.png',
    iconSize: [20, 40],
    iconAnchor: [25, 25],
});

const arrowIcon = new L.Icon({
    iconUrl: '/Arrow1.png',
    iconSize: [20, 20],
    iconAnchor: [20, 20],
});

const pickupIcon = new L.Icon({
    iconUrl: '/garbage-pickup-point.png',
    iconSize: [40, 60],
    iconAnchor: [20, 32],
});

export function Map({
                        layer,
                        pickLocationMode = false,
                        onPickLocation,
                        geofence,
                        houses = [],
                        routePath = [],
                        isPlaying = false,
                        pickedLoc,
                        showHouses,
                        onAnimationEnd,
                    }) {
    const [map, setMap] = useState(null);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [cursorPos, setCursorPos] = useState(null);

    // Defensive: filter valid geofence coordinates
    const fenceCoords = Array.isArray(geofence)
        ? geofence
        : (typeof geofence === "string"
            ? geofence
                .split(";")
                .map((s) => s.trim())
                .filter(Boolean)
                .map((p) => p.split(",").map(Number))
                .filter(([a, b]) => !isNaN(a) && !isNaN(b))
            : []);

    // Defensive: filter valid route points
    const line = Array.isArray(routePath)
        ? routePath
            .filter(pt => pt && typeof pt.lat === "number" && typeof pt.lon === "number")
            .map(pt => [pt.lat, pt.lon])
        : [];

    // Defensive: choose a safe center
    const center =
        (fenceCoords.length && fenceCoords) ||
        (line.length && line) ||
        [21.1458, 79.0882];

    // Defensive: reset index on route change
    useEffect(() => setCurrentIndex(0), [routePath]);

    // Animate van
    useEffect(() => {
        if (!isPlaying || line.length < 2) return;
        setCurrentIndex(0);
        const int = window.setInterval(() => {
            setCurrentIndex((i) => {
                if (i + 1 < line.length) {
                    return i + 1;
                } else {
                    window.clearInterval(int);
                    onAnimationEnd && onAnimationEnd();
                    return i;
                }
            });
        }, 1000);
        return () => window.clearInterval(int);
    }, [isPlaying, line.length, onAnimationEnd]);

    // Track cursor position when picking
    function CursorHandler() {
        useMapEvents({
            mousemove(e) {
                if (pickLocationMode) {
                    setCursorPos(e.latlng);
                }
            },
            click(e) {
                if (pickLocationMode) {
                    onPickLocation(e.latlng.lat, e.latlng.lng);
                    setCursorPos(null);
                }
            },
        });
        return null;
    }

    return (
        <MapContainer center={center} zoom={13} className="h-full w-full" whenCreated={setMap}>
            <TileLayer
                url={
                    layer === "satellite"
                        ? "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                        : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                }
                attribution={
                    layer === "satellite"
                        ? "Tiles © Esri"
                        : '&copy; OpenStreetMap contributors'
                }
            />

            {fenceCoords.length >= 3 && <Polygon positions={fenceCoords}/>}
            {line.length > 1 && <Polyline positions={line} color="blue" weight={4}/>}

            {/* Van and Arrow */}
            {line[currentIndex] && (
                <>
                    <Marker position={line[currentIndex]} icon={vanIcon}/>
                    <Marker position={line[currentIndex]} icon={arrowIcon}/>
                </>
            )}

            {/* Cursor-following pickup marker */}
            {pickLocationMode && cursorPos && (
                <Marker position={cursorPos} icon={pickupIcon} interactive={false}/>
            )}

            {/* Show the picked location marker after selection */}
            {pickedLoc && Array.isArray(pickedLoc) && pickedLoc.length === 2 && (
                <Marker position={pickedLoc} icon={pickupIcon}>
                    <Popup>Selected Location</Popup>
                </Marker>
            )}

            {/* House markers with numbered icons, only if showHouses is true */}
            {showHouses && Array.isArray(houses) && houses.map((h, i) => {
                const lat = parseFloat(h.lat);
                const lon = parseFloat(h.lon);
                if (isNaN(lat) || isNaN(lon)) return null;

                const icon = L.divIcon({
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
                    className: "",
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

            <CursorHandler/>
        </MapContainer>
    );
}