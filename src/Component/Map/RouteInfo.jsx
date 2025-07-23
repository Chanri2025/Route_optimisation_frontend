import React, {useState, useMemo} from "react";
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

const PAGE_SIZE = 5;

export default function RouteInfo({batch}) {
    const [pageIndex, setPageIndex] = useState(1);
    if (!batch) return null;

    // paginate stops
    const totalPages = Math.ceil(batch.stops.length / PAGE_SIZE);
    const currentStops = useMemo(() => {
        const start = (pageIndex - 1) * PAGE_SIZE;
        return batch.stops.slice(start, start + PAGE_SIZE);
    }, [batch.stops, pageIndex]);

    return (
        <div className="space-y-6 p-4">
            <Card>
                <CardContent>
                    <h4 className="text-xl font-semibold mb-4">
                        Dump Yard Trip #{batch.batch_index + 1}
                    </h4>

                    {/* Speed Profiles */}
                    <div className="mb-6">
                        <div className="font-medium mb-2">Speed Profiles</div>
                        <Table>
                            <TableHeader>
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
                                            {Math.floor(sp.time_minutes / 60)}h {Math.round(sp.time_minutes % 60)}m
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Stops with Pagination */}
                    <div>
                        <div className="font-medium mb-2">Stops</div>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>#</TableHead>
                                    <TableHead>Label</TableHead>
                                    <TableHead>House ID</TableHead>
                                    <TableHead>Lat</TableHead>
                                    <TableHead>Lon</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {currentStops.map((stop) => (
                                    <TableRow key={stop.stop}>
                                        <TableCell>{stop.stop}</TableCell>
                                        <TableCell>{stop.label}</TableCell>
                                        <TableCell>{stop.house_id ?? "-"}</TableCell>
                                        <TableCell>{stop.lat.toFixed(6)}</TableCell>
                                        <TableCell>{stop.lon.toFixed(6)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>

                        {/* Pagination Controls */}
                        <div className="flex items-center justify-end space-x-2 mt-4">
                            <Button
                                size="sm"
                                variant="outline"
                                disabled={pageIndex === 1}
                                onClick={() => setPageIndex((old) => Math.max(old - 1, 1))}
                            >
                                Prev
                            </Button>
                            <span>
                Page {pageIndex} of {totalPages}
              </span>
                            <Button
                                size="sm"
                                variant="outline"
                                disabled={pageIndex === totalPages}
                                onClick={() => setPageIndex((old) => Math.min(old + 1, totalPages))}
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
