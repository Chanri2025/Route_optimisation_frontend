// workers/houseParserWorker.js

importScripts("https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js");

onmessage = (e) => {
    try {
        const data = new Uint8Array(e.data);
        const workbook = XLSX.read(data, {type: "array"});
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, {defval: null});

        const houses = rows.map((r) => ({
            house_id: r.House_Id?.toString() || "",
            lat: r.House_Lat?.toString() || "",
            lon: r.House_Long?.toString() || "",
        }));

        postMessage(houses);
    } catch (error) {
        console.error("Worker error:", error);
        postMessage([]);
    }
};
