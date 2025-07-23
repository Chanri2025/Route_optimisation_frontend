// src/components/Map.jsx
import React, {useEffect, useState, useMemo} from "react";
import {
    MapContainer,
    TileLayer,
    Marker,
    Popup,
    Polygon,
    Polyline,
    useMap,
    useMapEvents,
    ZoomControl
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

// Utility: Attach a button to the zoom control bar
function useGroupedControl(renderButton, deps = []) {
    const map = useMap();
    useEffect(() => {
        const zoomBar = document.querySelector('.leaflet-control-zoom.leaflet-bar');
        if (!zoomBar) return;
        const btn = renderButton();
        zoomBar.appendChild(btn);
        return () => {
            if (btn && btn.parentNode === zoomBar) {
                zoomBar.removeChild(btn);
            }
        };
    }, [map, ...deps]);
}

// Home/Fit button: fits the geofence bounds if available, else centers
function GroupedFitBoundsButton({homeCoords, homeZoom = 15}) {
    useGroupedControl(() => {
        const btn = document.createElement('a');
        btn.className = 'leaflet-control-zoom-home';
        btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 0 24 24" width="20">
            <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
        </svg>`;
        btn.title = "Fit to Area";
        btn.href = "#";
        btn.style.display = "flex";
        btn.style.alignItems = "center";
        btn.style.justifyContent = "center";
        btn.onclick = (e) => {
            e.preventDefault();
            const map = window._leafletMapRef;
            if (!map) {
                alert("Map is not ready yet!");
                return;
            }
            if (
                Array.isArray(window._leafletGeofenceBounds) &&
                window._leafletGeofenceBounds.length >= 2
            ) {
                map.fitBounds(window._leafletGeofenceBounds, {padding: [20, 20]});
            } else if (Array.isArray(homeCoords) && homeCoords.length === 2 && !homeCoords.some(isNaN)) {
                map.setView(homeCoords, homeZoom);
            } else {
                alert("No valid geofence or center coordinates available.");
            }
        };
        return btn;
    }, [homeCoords, homeZoom]);
    return null;
}

// Grouped Locate/House button
function GroupedLocateButton({target, zoomLevel = 17}) {
    useGroupedControl(() => {
        const btn = document.createElement('a');
        btn.className = 'leaflet-control-zoom-locate';
        btn.innerHTML = '📍';
        btn.title = "Go to House 1";
        btn.href = "#";
        btn.style.fontSize = "1.25em";
        btn.onclick = (e) => {
            e.preventDefault();
            if (!target || target.some(isNaN)) return;
            const map = window._leafletMapRef;
            if (map) map.setView(target, zoomLevel);
        };
        return btn;
    }, [target, zoomLevel]);
    return null;
}

// Map click picker
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
                                pickedLoc
                            }) {
    // Memoize parsed fence
    const parsedFence = useMemo(() => {
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

    // Store geofence bounds globally for the fit button
    useEffect(() => {
        if (parsedFence.length >= 2) {
            window._leafletGeofenceBounds = parsedFence.map(p => [p.lat, p.lon]);
        } else {
            window._leafletGeofenceBounds = undefined;
        }
    }, [parsedFence]);

    // Fit bounds effect for initial load or geofence change
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

    // First house coordinate
    const firstHouseCoords = showHouses && houses.length > 0
        ? [parseFloat(houses[0].lat), parseFloat(houses[0].lon)]
        : null;

    // ---- Map ready state ----
    const [mapReady, setMapReady] = useState(false);

    return (
        <div className="h-full w-full shadow-2xl rounded-2xl overflow-hidden">
            <MapContainer
                center={center}
                zoom={15}
                zoomControl={true}
                className="h-full w-full"
                whenCreated={mapInstance => {
                    window._leafletMapRef = mapInstance;
                    setMapReady(true);
                }}
            >
                {/* Controls grouped with zoom */}
                {/*<ZoomControl position="topright"/>*/}
                {mapReady && (
                    <>
                        <GroupedFitBoundsButton homeCoords={center} homeZoom={20}/>
                        {firstHouseCoords && <GroupedLocateButton target={firstHouseCoords} zoomLevel={17}/>}
                    </>
                )}

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
                <MapClickHandler pickLocationMode={pickLocationMode} onPickLocation={onPickLocation}/>

                {/* Geofence */}
                {parsedFence.length >= 2 && (
                    <Polygon
                        positions={parsedFence.map(p => [p.lat, p.lon])}
                        pathOptions={{color: "blue", weight: 2, fillOpacity: 0.1}}
                    />
                )}

                {/* Houses */}
                {showHouses && houses.map(h => (
                    <Marker key={h.house_id} position={[parseFloat(h.lat), parseFloat(h.lon)]} icon={defaultIcon}>
                        <Popup>{h.house_id}</Popup>
                    </Marker>
                ))}

                {/* Selected dump yard */}
                {selectedDumpIndex != null && dumpYards[selectedDumpIndex] && (
                    <Marker
                        position={[dumpYards[selectedDumpIndex].lat, dumpYards[selectedDumpIndex].lon]}
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
                    <Marker key={s.stop} position={[s.lat, s.lon]} icon={defaultIcon}>
                        <Popup>{s.label} {s.house_id ? `(ID: ${s.house_id})` : ""}</Popup>
                    </Marker>
                ))}

                {/* Picked location */}
                {pickedLoc && (
                    <Marker position={[pickedLoc[0], pickedLoc[1]]} icon={defaultIcon}>
                        <Popup>
                            Start Location: {pickedLoc[0].toFixed(6)}, {pickedLoc[1].toFixed(6)}
                        </Popup>
                    </Marker>
                )}
            </MapContainer>
        </div>
    );
}
