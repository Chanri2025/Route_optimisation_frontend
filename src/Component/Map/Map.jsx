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

// Custom pickup icon from public folder
const pickupIcon = new L.Icon({
    iconUrl: '/garbage-pickup-point.png',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
});

export function Map({
                        layer,
                        pickLocationMode = false,
                        onPickLocation,
                        geofence,
                        houses,
                        routePath = [],
                        isPlaying = false,
                    }) {
    const [map, setMap] = useState(null);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [cursorPos, setCursorPos] = useState(null);

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

    // Parse geofence
    const fenceCoords = geofence
        .split(";")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((p) => p.split(",").map(Number))
        .filter(([a, b]) => !isNaN(a) && !isNaN(b));

    useEffect(() => {
        if (!map || fenceCoords.length < 3) return;
        const poly = L.polygon(fenceCoords, {color: "purple", fillOpacity: 0.2}).addTo(map);
        map.fitBounds(poly.getBounds());
        return () => void map.removeLayer(poly);
    }, [map, geofence]);

    useEffect(() => setCurrentIndex(0), [routePath]);

    useEffect(() => {
        if (!isPlaying || routePath.length < 2) return;
        const int = window.setInterval(() => {
            setCurrentIndex((i) => (i + 1 < routePath.length ? i + 1 : (window.clearInterval(int), i)));
        }, 1000);
        return () => window.clearInterval(int);
    }, [isPlaying, routePath]);

    const line = routePath.map((pt) => [pt.lat, pt.lon]);
    const center = fenceCoords[0] || line[0] || [21.1458, 79.0882];

    return (
        <MapContainer center={center} zoom={13} className="h-full w-full" whenCreated={setMap}>
            <TileLayer url={tileLayers[layer].url} attribution={tileLayers[layer].attribution}/>

            {fenceCoords.length >= 3 && <Polygon positions={fenceCoords}/>}
            {line.length > 1 && <Polyline positions={line} color="blue" weight={4}/>}
            {line[currentIndex] && <Marker position={line[currentIndex]} icon={currentIcon}/>}

            {/* Cursor-following pickup marker */}
            {pickLocationMode && cursorPos && (
                <Marker position={cursorPos} icon={pickupIcon} interactive={false}/>
            )}

            {/* House markers with numbered icons */}
            {houses.map((h, i) => {
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
