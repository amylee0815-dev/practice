import assert from "node:assert/strict";
import test from "node:test";
import { demoShipments, filterShipments, matchingStages, type ShipmentFilters } from "../app/dashboard-data.ts";

const filters = (overrides: Partial<ShipmentFilters> = {}): ShipmentFilters => ({
  corporations: [],
  ports: [],
  dwellBands: [],
  blNos: [],
  containerNos: [],
  ...overrides,
});

test("port and dwell filters must match the same transshipment stage", () => {
  const result = filterShipments(demoShipments, filters({ ports: ["CNSHA"], dwellBands: ["HIGH"] }));
  assert.deepEqual(result.map(shipment => shipment.shipmentNo).sort(), ["SHP-1182", "SHP-4409"]);
  assert.ok(result.every(shipment => matchingStages(shipment, filters({ ports: ["CNSHA"], dwellBands: ["HIGH"] })).every(stage => stage.portCode === "CNSHA")));
});

test("same-field choices use OR and container filtering is exact", () => {
  const result = filterShipments(demoShipments, filters({
    corporations: ["한국생산법인", "베트남생산법인"],
    containerNos: ["MSCU2048002"],
  }));
  assert.deepEqual(result.map(shipment => shipment.shipmentNo), ["SHP-2048"]);
});

