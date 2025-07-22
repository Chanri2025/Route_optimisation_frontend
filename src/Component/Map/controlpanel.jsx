import React from "react";
import {Button} from "@/components/ui/button";
import {Label} from "@/components/ui/label";
import {Input} from "@/components/ui/input";
import {MapPin, Route as RouteIcon, Loader2} from "lucide-react";

export default function ControlPanel({
                                         appName,
                                         userName,
                                         layer,
                                         setLayer,
                                         pickMode,
                                         setPickMode,
                                         dumpYards,
                                         selectedDumpIndex,
                                         setSelectedDumpIndex,
                                         batchSize,
                                         setBatchSize,
                                         handleOptimizeRoute,
                                         loading,
                                         routeResult,
                                         selectedBatchIndex,
                                         setSelectedBatchIndex
                                     }) {
    return (
        <div className="bg-white shadow-md p-4 rounded-b-lg z-10">
            <div className="flex flex-wrap items-center justify-between gap-4">
                {/* Header */}
                <div className="flex items-center gap-3">
                    {appName && <span className="text-2xl font-bold text-red-600">{appName}</span>}
                    {userName && <span className="text-lg font-medium text-blue-600">{userName}</span>}
                </div>

                {/* Main Controls */}
                <div className="flex flex-wrap items-center gap-2">
                    {/* Layer */}
                    <select
                        value={layer}
                        onChange={e => setLayer(e.target.value)}
                        className="w-[140px] p-2 border rounded"
                    >
                        <option value="streets">Streets</option>
                        <option value="satellite">Satellite</option>
                    </select>

                    {/* Pick */}
                    <Button
                        onClick={() => setPickMode(!pickMode)}
                        className="bg-blue-600 hover:bg-blue-500 text-white"
                    >
                        <MapPin className="mr-1 h-4 w-4"/> {pickMode ? "Cancel Pick" : "Pick Location"}
                    </Button>

                    {/* Dump Yard selector */}
                    <div className="flex flex-col">
                        <Label className="mb-1 text-sm">Dump Yard</Label>
                        <select
                            value={selectedDumpIndex ?? ""}
                            onChange={e => setSelectedDumpIndex(Number(e.target.value))}
                            className="p-2 border rounded"
                        >
                            <option value="" disabled>Choose</option>
                            {dumpYards.map((dy, i) => (
                                <option key={i} value={i}>
                                    #{i + 1} — {dy.lat.toFixed(5)}, {dy.lon.toFixed(5)}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Batch Size */}
                    <div className="flex flex-col">
                        <Label className="mb-1 text-sm">Batch Size</Label>
                        <Input
                            type="number"
                            min={1}
                            value={batchSize}
                            onChange={e => setBatchSize(+e.target.value)}
                            className="w-20"
                        />
                    </div>

                    {/* Optimize */}
                    <Button
                        onClick={handleOptimizeRoute}
                        className="bg-blue-600 hover:bg-blue-500 text-white"
                        disabled={loading}
                    >
                        {loading ? (
                            <><Loader2 className="mr-1 h-4 w-4 animate-spin"/> Optimizing…</>
                        ) : (
                            <><RouteIcon className="mr-1 h-4 w-4"/> Optimize Route</>
                        )}
                    </Button>

                    {/* Batch selector */}
                    {routeResult?.batches && (
                        <div className="flex flex-col">
                            <Label className="mb-1 text-sm">Batch</Label>
                            <select
                                className="p-2 border rounded"
                                value={selectedBatchIndex}
                                onChange={e => setSelectedBatchIndex(Number(e.target.value))}
                            >
                                {routeResult.batches.map(b => (
                                    <option key={b.batch_index} value={b.batch_index}>
                                        Batch #{b.batch_index}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}