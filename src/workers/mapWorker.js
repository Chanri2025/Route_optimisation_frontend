// NOTE: no imports of DOM or Leaflet here—just pure data processing
self.onmessage = (e) => {
    const {geofenceRaw, routePath} = e.data;

    // 1) Parse geofence coordinates
    let fenceCoords = [];
    if (typeof geofenceRaw === "string") {
        fenceCoords = geofenceRaw
            .split(";")
            .map(s => s.trim())
            .filter(Boolean)
            .map(p => p.split(",").map(Number))
            .filter(([a, b]) => !isNaN(a) && !isNaN(b));
    }

    // 2) Build plain [lat,lon] line
    const line = Array.isArray(routePath)
        ? routePath
            .filter(pt => pt && typeof pt.lat === "number" && typeof pt.lon === "number")
            .map(pt => [pt.lat, pt.lon])
        : [];

    // 3) Precompute bearings between every consecutive segment
    const toRad = deg => deg * Math.PI / 180;
    const toDeg = rad => rad * 180 / Math.PI;

    function getBearing([lat1, lon1], [lat2, lon2]) {
        const dLon = toRad(lon2 - lon1);
        const y = Math.sin(dLon) * Math.cos(toRad(lat2));
        const x = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2))
            - Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);
        return (toDeg(Math.atan2(y, x)) + 360) % 360;
    }

    const rotations = [];
    for (let i = 0; i + 1 < line.length; i++) {
        rotations[i] = getBearing(line[i], line[i + 1]);
    }

    // Send back all the processed data at once
    self.postMessage({fenceCoords, line, rotations});
};
