import React, {useState, useMemo, useEffect} from "react";
import {Card, CardContent} from "@/components/ui/card";
import {
    Table,
    TableHeader,
    TableRow,
    TableHead,
    TableBody,
    TableCell,
} from "@/components/ui/table";
import {Button} from "@/components/ui/button";
import * as XLSX from "xlsx";

const PAGE_SIZE = 10;

export default function RouteInfo({batch}) {
    const [pageIndex, setPageIndex] = useState(1);
    const [batchNumber, setBatchNumber] = useState(batch?.batch_number ?? 1);

    useEffect(() => {
        if (batch && batch.batch_number !== batchNumber) {
            setBatchNumber(batch.batch_number);
        }
    }, [batch, batchNumber]);

    if (!batch) return null;

    const totalPages = Math.ceil(batch.stops.length / PAGE_SIZE);
    const currentStops = useMemo(() => {
        const start = (pageIndex - 1) * PAGE_SIZE;
        return batch.stops.slice(start, start + PAGE_SIZE);
    }, [batch.stops, pageIndex]);

    const handleDownloadExcel = () => {
        if (!batch) return;

        // Speed Profiles Sheet
        const speedSheetData = [
            ["Speed (km/h)", "Distance (km)", "Time (hh:mm)"],
            ...batch.speed_profiles.map((sp) => [
                sp.speed_kmph,
                sp.distance_km.toFixed(2),
                `${Math.floor(sp.time_minutes / 60)}h ${Math.round(sp.time_minutes % 60)}m`,
            ]),
        ];

        // Stops Sheet
        const stopsSheetData = [
            ["#", "House ID", "Latitude", "Longitude"],
            ...batch.stops.map((stop, idx) => [
                stop.stop + 1,
                stop.label,
                stop.lat,
                stop.lon,
            ]),
        ];

        const wb = XLSX.utils.book_new();
        const speedWS = XLSX.utils.aoa_to_sheet(speedSheetData);
        const stopsWS = XLSX.utils.aoa_to_sheet(stopsSheetData);

        XLSX.utils.book_append_sheet(wb, speedWS, "SpeedProfiles");
        XLSX.utils.book_append_sheet(wb, stopsWS, "Stops");

        XLSX.writeFile(wb, `Route_Trip_${batchNumber}.xlsx`);
    };

    return (
        <div className="space-y-6">
            <Card className="shadow-lg border border-blue-200 p-0 pb-5">
                <div
                    className="rounded-t-lg px-4 py-3 text-white text-xl font-bold bg-gradient-to-r from-sky-400 to-blue-600">
                    Route Information
                </div>

                <CardContent>
                    <div className="flex items-center justify-between mb-4">
                        <h4 className="text-xl font-semibold text-blue-600">
                            Dump Yard Trip - {batchNumber}
                        </h4>
                        <Button
                            className="bg-green-600 hover:bg-green-700 text-white"
                            size="sm"
                            onClick={handleDownloadExcel}
                        >
                            Download as Excel
                        </Button>
                    </div>

                    {/* Speed Profiles */}
                    <div className="mb-6">
                        <div className="font-medium mb-2 text-sky-700">Speed Profiles</div>
                        <Table>
                            <TableHeader className="bg-blue-100">
                                <TableRow>
                                    <TableHead>Speed (km/h)</TableHead>
                                    <TableHead>Distance</TableHead>
                                    <TableHead>Time</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {batch.speed_profiles.map((sp, i) => (
                                    <TableRow key={i}>
                                        <TableCell>{sp.speed_kmph}</TableCell>
                                        <TableCell>{sp.distance_km.toFixed(2)} km</TableCell>
                                        <TableCell>
                                            {Math.floor(sp.time_minutes / 60)}h{" "}
                                            {Math.round(sp.time_minutes % 60)}m
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Stops with Pagination */}
                    <div>
                        <div className="font-medium mb-2 text-sky-700">Stops</div>
                        <Table>
                            <TableHeader className="bg-yellow-100">
                                <TableRow>
                                    <TableHead>#</TableHead>
                                    <TableHead>House ID</TableHead>
                                    <TableHead>Lat</TableHead>
                                    <TableHead>Lon</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {currentStops.map((stop, idx) => (
                                    <TableRow key={idx}>
                                        <TableCell>{stop.stop + 1}</TableCell>
                                        <TableCell>{stop.label}</TableCell>
                                        <TableCell>{stop.lat}</TableCell>
                                        <TableCell>{stop.lon}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>

                        {/* Pagination Controls */}
                        <div className="flex items-center justify-end space-x-3 mt-4">
                            <Button
                                size="sm"
                                className="bg-yellow-500 text-white hover:bg-yellow-600"
                                disabled={pageIndex === 1}
                                onClick={() => setPageIndex((old) => Math.max(old - 1, 1))}
                            >
                                Prev
                            </Button>
                            <span className="text-gray-700 font-medium">
                Page {pageIndex} of {totalPages}
              </span>
                            <Button
                                size="sm"
                                className="bg-yellow-500 text-white hover:bg-yellow-600"
                                disabled={pageIndex === totalPages}
                                onClick={() =>
                                    setPageIndex((old) => Math.min(old + 1, totalPages))
                                }
                            >
                                Next
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
