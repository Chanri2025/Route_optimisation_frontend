// src/components/Map.jsx
import React, {useEffect} from "react";
import {
    MapContainer,
    TileLayer,
    Marker,
    Popup,
    Polygon,
    Polyline,
    useMap,
    useMapEvents
} from "react-leaflet";
import L from "leaflet";

// Fix for default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const defaultIcon = new L.Icon.Default();

// Component to handle map clicks
function MapClickHandler({pickLocationMode, onPickLocation}) {
    useMapEvents({
        click: (e) => {
            if (pickLocationMode) {
                onPickLocation(e.latlng.lat, e.latlng.lng);
            }
        }
    });
    return null;
}

export default function Map({
                                center,
                                layer,
                                geofence,
                                houses,
                                showHouses,
                                dumpYards,
                                selectedDumpIndex,
                                routePath,
                                stops,
                                pickLocationMode,
                                onPickLocation,
                                pickedLoc,
                                onAnimationEnd
                            }) {
    // Memoize parsed fence
    const parsedFence = React.useMemo(() => {
        if (typeof geofence !== "string") {
            return Array.isArray(geofence) ? geofence : [];
        }
        return geofence
            .split(";")
            .map(segment => {
                const parts = segment.split(",");
                if (parts.length !== 2) return null;
                const lat = parseFloat(parts[0]);
                const lon = parseFloat(parts[1]);
                if (isNaN(lat) || isNaN(lon)) return null;
                return {lat, lon};
            })
            .filter(point => point !== null);
    }, [geofence]);

    // Fit bounds component
    function FitBounds() {
        const map = useMap();
        useEffect(() => {
            if (parsedFence.length >= 2) {
                const bounds = parsedFence.map(p => [p.lat, p.lon]);
                map.fitBounds(bounds, {padding: [20, 20]});
            }
        }, [map]);
        return null;
    }

    return (
        <MapContainer center={center} zoom={15} className="h-full w-full">
            <TileLayer
                url={
                    layer === "satellite"
                        ? "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                        : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                }
                attribution={
                    layer === "satellite"
                        ? 'Tiles &copy; <a href="https://www.esri.com/">Esri</a>'
                        : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                }
            />


            <FitBounds/>
            <MapClickHandler
                pickLocationMode={pickLocationMode}
                onPickLocation={onPickLocation}
            />

            {/* Geofence */}
            {parsedFence.length >= 2 && (
                <Polygon
                    positions={parsedFence.map(p => [p.lat, p.lon])}
                    pathOptions={{color: "blue", weight: 2, fillOpacity: 0.1}}
                />
            )}

            {/* Houses - only show if needed */}
            {showHouses &&
                houses.map(h => (
                    <Marker
                        key={h.house_id}
                        position={[parseFloat(h.lat), parseFloat(h.lon)]}
                        icon={defaultIcon}
                    >
                        <Popup>{h.house_id}</Popup>
                    </Marker>
                ))}

            {/* Selected dump yard */}
            {selectedDumpIndex != null && dumpYards[selectedDumpIndex] && (
                <Marker
                    position={[
                        dumpYards[selectedDumpIndex].lat,
                        dumpYards[selectedDumpIndex].lon
                    ]}
                    icon={defaultIcon}
                >
                    <Popup>Dump Yard #{selectedDumpIndex + 1}</Popup>
                </Marker>
            )}

            {/* Route path */}
            {routePath.length > 0 && (
                <Polyline
                    positions={routePath.map(p => [p.lat, p.lon])}
                    pathOptions={{color: "green", weight: 4}}
                />
            )}

            {/* Stops */}
            {stops.map(s => (
                <Marker
                    key={s.stop}
                    position={[s.lat, s.lon]}
                    icon={defaultIcon}
                >
                    <Popup>
                        {s.label} {s.house_id ? `(ID: ${s.house_id})` : ""}
                    </Popup>
                </Marker>
            ))}

            {/* Picked location */}
            {pickedLoc && (
                <Marker
                    position={[pickedLoc[0], pickedLoc[1]]}
                    icon={defaultIcon}
                >
                    <Popup>
                        Start Location: {pickedLoc[0].toFixed(6)}, {pickedLoc[1].toFixed(6)}
                    </Popup>
                </Marker>
            )}
        </MapContainer>
    );
}