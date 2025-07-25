// this runs off the main thread
self.onmessage = async function (e) {
    const {
        API_URL,
        geofence,
        houses,
        dumpYards,
        selectedDumpIndex,
        batchSize,
        pickedLoc,
    } = e.data;

    const dump = dumpYards[selectedDumpIndex];
    const userStart = {lat: +pickedLoc[0], lon: +pickedLoc[1]};
    const dumpLoc = {lat: +dump.lat, lon: +dump.lon};

    // split into batches
    const coords = houses.map((h) => ({...h, lat: +h.lat, lon: +h.lon}));
    const houseBatches = [];
    for (let i = 0; i < coords.length; i += batchSize) {
        houseBatches.push(coords.slice(i, i + batchSize));
    }

    for (let idx = 0; idx < houseBatches.length; idx++) {
        const batchHouses = houseBatches[idx];
        const startLoc = idx === 0 ? userStart : dumpLoc;
        const payload = {
            geofence: geofence.trim(),
            houses: batchHouses.map((h) => ({lat: h.lat, lon: h.lon})),
            start_location: startLoc,
            dump_location: dumpLoc,
            batch_size: batchHouses.length,
            nn_steps: 0,
        };

        try {
            const res = await fetch(`${API_URL}/optimize_route`, {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify(payload),
            });
            if (!res.ok) throw new Error(`Batch ${idx + 1} failed`);
            const data = await res.json();
            const b = data.batches[0];
            self.postMessage({
                type: "batch",
                batch: {
                    ...b,
                    batch_number: idx + 1,
                    total_batches: houseBatches.length,
                    start_type: idx === 0 ? "User Location" : "Dump Yard",
                    houses_in_batch: batchHouses.length,
                    stops: b.stops.map((s, i) => ({
                        ...s,
                        house_id: batchHouses[i]?.house_id,
                    })),
                },
            });
        } catch (err) {
            self.postMessage({type: "error", message: err.message});
            break;
        }
    }

    self.postMessage({type: "done"});
};
