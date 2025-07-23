// src/workers/routeWorker.js
self.addEventListener("message", function (e) {
    const {type, data} = e.data;

    if (type === 'processHouses') {
        const processed = data.houses.map((h, i) => ({
            house_id: `H${i + 1}`,
            lat: h.lat.toString(),
            lon: h.lon.toString()
        }));
        self.postMessage({type: 'housesProcessed', data: processed});
    }

    if (type === 'processBatches') {
        const {batches} = data;
        self.postMessage({type: 'batchesProcessed', data: batches});
    }
});
