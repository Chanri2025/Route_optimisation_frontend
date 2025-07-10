"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// —— Export House type so it can be imported elsewhere ——
export type House = {
  house_id: string;
  lat: string;
  lon: string;
};

interface ControlPanelProps {
  geofence: string;
  onGeofenceChange: (value: string) => void;
  onGeofenceConfirm: () => void;
  onOptimizeRoute: () => void;
  houses: House[];
  onHouseChange: (idx: number, field: keyof House, value: string) => void;
  onAddHouse: () => void;
  onRemoveHouse: (idx: number) => void;
  onHousePickLocation: (idx: number) => void;
  onLayerChange: (layer: string) => void;
  onSetCurrentLocation: () => void;
}

export function ControlPanel({
  geofence,
  onGeofenceChange,
  onGeofenceConfirm,
  onOptimizeRoute,
  houses,
  onHouseChange,
  onAddHouse,
  onRemoveHouse,
  onHousePickLocation,
  onLayerChange,
  onSetCurrentLocation,
}: ControlPanelProps) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <Card className="p-4 space-y-6 max-h-[90vh] overflow-auto">
        {/* Map Layer */}
        <div className="space-y-2">
          <Label>Map Layer</Label>
          <Select onValueChange={onLayerChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select layer" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="streets">Streets</SelectItem>
              <SelectItem value="satellite">Satellite</SelectItem>
              <SelectItem value="terrain">Terrain</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Geofence */}
        <div className="space-y-2">
          <Label htmlFor="geofence">Geofence Coordinates</Label>
          <Input
            id="geofence"
            placeholder="lat,lon;lat,lon;…"
            value={geofence}
            onChange={(e) => onGeofenceChange(e.target.value)}
          />
          <Button type="button" onClick={() => setShowModal(true)}>
            Confirm Geofence
          </Button>
        </div>

        {/* Houses */}
        <div className="space-y-2">
          <Label>Houses</Label>
          {houses.map((h, idx) => (
            <div key={idx} className="grid grid-cols-5 gap-2 mb-2 items-center">
              <Input
                placeholder="House ID"
                value={h.house_id}
                onChange={(e) => onHouseChange(idx, "house_id", e.target.value)}
              />
              <Input
                placeholder="Lat"
                value={h.lat}
                onChange={(e) => onHouseChange(idx, "lat", e.target.value)}
              />
              <Input
                placeholder="Lon"
                value={h.lon}
                onChange={(e) => onHouseChange(idx, "lon", e.target.value)}
              />
              <Button
                variant="outline"
                onClick={() => onHousePickLocation(idx)}>
                Pick
              </Button>
              <Button variant="destructive" onClick={() => onRemoveHouse(idx)}>
                Remove
              </Button>
            </div>
          ))}
          <Button onClick={onAddHouse}>+ Add House</Button>
        </div>

        {/* Current Location */}
        <div className="space-y-2">
          <Label>Set Current Location</Label>
          <Button onClick={onSetCurrentLocation}>Pick from Map</Button>
        </div>
      </Card>

      {/* Confirm Geofence Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setShowModal(false)}>
          <div
            className="bg-white rounded-lg p-6 w-80 space-y-4"
            onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold">Confirm Geofence</h2>
            <p>Apply these geofence coordinates?</p>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowModal(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  onGeofenceConfirm();
                  setShowModal(false);
                }}>
                Confirm
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
