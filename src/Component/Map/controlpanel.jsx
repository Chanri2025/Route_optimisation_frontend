import {useState, useEffect} from "react";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Card} from "@/components/ui/card";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {MapPin, Loader2} from "lucide-react";

export function ControlPanel({
                                 dumpYards = [],    // default empty array
                                 onLayerChange,
                                 onSetCurrentLocation,
                                 onOptimizeRoute,
                                 // …other props…
                             }) {
    console.log("dumpYards:", dumpYards);

    const [selectedDumpIndex, setSelectedDumpIndex] = useState(null);
    const [batchSize, setBatchSize] = useState(200);
    const [loading, setLoading] = useState(false);

    const handleOptimize = async () => {
        if (selectedDumpIndex === null) {
            alert("Please select a dump yard.");
            return;
        }
        setLoading(true);
        await onOptimizeRoute({
            dumpYard: dumpYards[selectedDumpIndex],
            batchSize
        });
        setLoading(false);
    };

    return (
        <Card className="p-4 space-y-4 max-h-[90vh] overflow-auto">
            <div className="grid grid-cols-2 gap-2">
                {/* Map Layer */}
                <div>
                    <Label className="mb-1">Map Layer</Label>
                    <Select onValueChange={onLayerChange}>
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select layer"/>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="streets">Streets</SelectItem>
                            <SelectItem value="satellite">Satellite</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Pickup Location */}
                <div>
                    <Label className="mb-1">Set Pickup Location</Label>
                    <Button
                        onClick={onSetCurrentLocation}
                        className="w-full flex items-center gap-2 text-white bg-blue-700 hover:bg-blue-500"
                    >
                        <MapPin size={20}/> Pick from Map
                    </Button>
                </div>

                {/* Dump Yard */}
                <div>
                    <Label className="mb-1">Select Dump Yard</Label>
                    <Select onValueChange={(val) => setSelectedDumpIndex(Number(val))}>
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="Choose dump yard"/>
                        </SelectTrigger>
                        <SelectContent>
                            {dumpYards.map((dy, idx) => (
                                <SelectItem key={idx} value={idx}>
                                    Dump {idx + 1}: {dy.lat.toFixed(5)}, {dy.lon.toFixed(5)}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Batch Size */}
                <div>
                    <Label className="mb-1">Batch Size</Label>
                    <Input
                        type="number"
                        value={batchSize}
                        min={1}
                        onChange={(e) => setBatchSize(+e.target.value)}
                        className="w-full"
                    />
                </div>
            </div>

            {/* Optimize Button */}
            <Button
                onClick={handleOptimize}
                className="w-full text-white bg-blue-700 hover:bg-blue-500"
                disabled={loading}
            >
                {loading
                    ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Optimizing…</>
                    : "Optimize Route"}
            </Button>
        </Card>
    );
}
