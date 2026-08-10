export type RiskBand = "UNDER7" | "MEDIUM" | "HIGH" | "CRITICAL";
export type StageStatus = "COMPLETED" | "CURRENT" | "PLANNED";

export type TransshipmentStage = {
  sequence: number;
  portCode: string;
  dwellDays: number;
  status: StageStatus;
  dataStatus: "ACTUAL" | "PREDICTED";
  vessel: string;
  mmsi: string;
};

export type ShipmentRecord = {
  shipmentNo: string;
  blNo: string;
  containerNos: string[];
  corporation: string;
  route: string;
  valueUsd: number;
  stages: TransshipmentStage[];
};

export type ShipmentFilters = {
  corporations: string[];
  ports: string[];
  dwellBands: RiskBand[];
  blNos: string[];
  containerNos: string[];
};

export const portCatalog = [
  { code: "SGSIN", name: "Singapore", lon: 103.82, lat: 1.26, permanent: true },
  { code: "CNSHA", name: "Shanghai", lon: 121.49, lat: 31.23, permanent: true },
  { code: "CNNGB", name: "Ningbo", lon: 121.87, lat: 29.87, permanent: true },
  { code: "PAPTY", name: "Panama", lon: -79.52, lat: 9.0, permanent: true },
  { code: "NLRTM", name: "Rotterdam", lon: 4.48, lat: 51.92, permanent: false },
  { code: "AEJEA", name: "Jebel Ali", lon: 55.03, lat: 25.01, permanent: false },
  { code: "KRPUS", name: "Busan", lon: 129.04, lat: 35.1, permanent: false },
  { code: "USLAX", name: "Los Angeles", lon: -118.25, lat: 33.74, permanent: false },
] as const;

const stage = (
  sequence: number,
  portCode: string,
  dwellDays: number,
  status: StageStatus,
  vessel: string,
  mmsi: string,
): TransshipmentStage => ({
  sequence,
  portCode,
  dwellDays,
  status,
  dataStatus: status === "PLANNED" ? "PREDICTED" : "ACTUAL",
  vessel,
  mmsi,
});

export const demoShipments: ShipmentRecord[] = [
  { shipmentNo: "SHP-2048", blNo: "BL-KR-2048", containerNos: ["MSCU2048001", "MSCU2048002"], corporation: "한국생산법인", route: "KRPUS–SGSIN–NLRTM", valueUsd: 3120000, stages: [stage(1, "SGSIN", 5, "COMPLETED", "EVER OCEAN", "563118900"), stage(2, "NLRTM", 22, "CURRENT", "EVER OCEAN", "563118900")] },
  { shipmentNo: "SHP-1182", blNo: "BL-CN-1182", containerNos: ["OOLU1182001", "OOLU1182002", "OOLU1182003"], corporation: "상해생산법인", route: "CNSHA–SGSIN–AEJEA", valueUsd: 2450000, stages: [stage(1, "CNSHA", 16.8, "CURRENT", "EASTERN BRIDGE", "477118200"), stage(2, "SGSIN", 9.4, "PLANNED", "EASTERN BRIDGE", "477118200"), stage(3, "AEJEA", 6.2, "PLANNED", "GULF LINK", "636118200")] },
  { shipmentNo: "SHP-7710", blNo: "BL-EU-7710", containerNos: ["MAEU7710001", "MAEU7710002"], corporation: "폴란드생산법인", route: "NLRTM–PAPTY–USLAX", valueUsd: 1860000, stages: [stage(1, "NLRTM", 12.2, "CURRENT", "CANAL EXPRESS", "244771000"), stage(2, "PAPTY", 4.1, "PLANNED", "CANAL EXPRESS", "244771000")] },
  { shipmentNo: "SHP-3901", blNo: "BL-CN-3901", containerNos: ["COSU3901001"], corporation: "닝보생산법인", route: "CNNGB–PAPTY–USLAX", valueUsd: 1270000, stages: [stage(1, "CNNGB", 7.6, "CURRENT", "PACIFIC STAR", "477390100"), stage(2, "PAPTY", 15.3, "PLANNED", "PACIFIC STAR", "477390100")] },
  { shipmentNo: "SHP-2051", blNo: "BL-VN-2051", containerNos: ["HLCU2051001", "HLCU2051002"], corporation: "베트남생산법인", route: "SGSIN–NLRTM", valueUsd: 980000, stages: [stage(1, "SGSIN", 23.4, "CURRENT", "PACIFIC STAR", "563205100"), stage(2, "NLRTM", 11.1, "PLANNED", "PACIFIC STAR", "563205100")] },
  { shipmentNo: "SHP-1189", blNo: "BL-CN-1189", containerNos: ["EISU1189001"], corporation: "상해생산법인", route: "CNNGB–SGSIN", valueUsd: 760000, stages: [stage(1, "CNNGB", 14.2, "CURRENT", "BLUE HORIZON", "477118900"), stage(2, "SGSIN", 8.1, "PLANNED", "BLUE HORIZON", "477118900")] },
  { shipmentNo: "SHP-7721", blNo: "BL-MX-7721", containerNos: ["TGHU7721001", "TGHU7721002"], corporation: "멕시코생산법인", route: "PAPTY–USLAX", valueUsd: 1430000, stages: [stage(1, "PAPTY", 21.5, "CURRENT", "PANAMA LINK", "354772100"), stage(2, "USLAX", 8.6, "PLANNED", "PANAMA LINK", "354772100")] },
  { shipmentNo: "SHP-4402", blNo: "BL-KR-4402", containerNos: ["HDMU4402001"], corporation: "한국생산법인", route: "KRPUS–SGSIN", valueUsd: 540000, stages: [stage(1, "KRPUS", 3.2, "COMPLETED", "KOREA GLORY", "440440200"), stage(2, "SGSIN", 13.8, "PLANNED", "KOREA GLORY", "440440200")] },
  { shipmentNo: "SHP-4409", blNo: "BL-KR-4409", containerNos: ["HDMU4409001", "HDMU4409002"], corporation: "한국생산법인", route: "KRPUS–CNSHA–USLAX", valueUsd: 1720000, stages: [stage(1, "KRPUS", 6.4, "COMPLETED", "BUSAN TRADER", "440440900"), stage(2, "CNSHA", 18.7, "PLANNED", "BUSAN TRADER", "440440900")] },
  { shipmentNo: "SHP-5510", blNo: "BL-IN-5510", containerNos: ["ONEU5510001"], corporation: "인도생산법인", route: "AEJEA–NLRTM", valueUsd: 890000, stages: [stage(1, "AEJEA", 24.6, "CURRENT", "GULF SUN", "636551000"), stage(2, "NLRTM", 7.2, "PLANNED", "GULF SUN", "636551000")] },
  { shipmentNo: "SHP-5522", blNo: "BL-IN-5522", containerNos: ["ONEU5522001", "ONEU5522002"], corporation: "인도생산법인", route: "AEJEA–SGSIN", valueUsd: 1110000, stages: [stage(1, "AEJEA", 10.4, "CURRENT", "DESERT WIND", "636552200"), stage(2, "SGSIN", 19.3, "PLANNED", "DESERT WIND", "636552200")] },
  { shipmentNo: "SHP-6103", blNo: "BL-PL-6103", containerNos: ["MSKU6103001"], corporation: "폴란드생산법인", route: "NLRTM–SGSIN", valueUsd: 690000, stages: [stage(1, "NLRTM", 4.8, "COMPLETED", "NORTH SEA", "244610300"), stage(2, "SGSIN", 7.1, "CURRENT", "NORTH SEA", "244610300")] },
  { shipmentNo: "SHP-6207", blNo: "BL-VN-6207", containerNos: ["TEMU6207001", "TEMU6207002"], corporation: "베트남생산법인", route: "SGSIN–CNSHA", valueUsd: 1340000, stages: [stage(1, "SGSIN", 6.8, "COMPLETED", "ASIA PEARL", "563620700"), stage(2, "CNSHA", 21, "PLANNED", "ASIA PEARL", "563620700")] },
  { shipmentNo: "SHP-6308", blNo: "BL-CN-6308", containerNos: ["CSNU6308001"], corporation: "닝보생산법인", route: "CNNGB–SGSIN–NLRTM", valueUsd: 820000, stages: [stage(1, "CNNGB", 5.4, "COMPLETED", "NINGBO SKY", "477630800"), stage(2, "SGSIN", 14.6, "CURRENT", "NINGBO SKY", "477630800"), stage(3, "NLRTM", 8.5, "PLANNED", "EURO STAR", "244630800")] },
  { shipmentNo: "SHP-6404", blNo: "BL-MX-6404", containerNos: ["CMAU6404001"], corporation: "멕시코생산법인", route: "PAPTY–NLRTM", valueUsd: 590000, stages: [stage(1, "PAPTY", 6.2, "CURRENT", "CANAL MOON", "354640400"), stage(2, "NLRTM", 20.6, "PLANNED", "CANAL MOON", "354640400")] },
  { shipmentNo: "SHP-6506", blNo: "BL-VN-6506", containerNos: ["YMLU6506001"], corporation: "베트남생산법인", route: "SGSIN–AEJEA", valueUsd: 710000, stages: [stage(1, "SGSIN", 11.7, "CURRENT", "SEA DRAGON", "563650600"), stage(2, "AEJEA", 15.8, "PLANNED", "SEA DRAGON", "563650600")] },
  { shipmentNo: "SHP-6601", blNo: "BL-CN-6601", containerNos: ["OOLU6601001", "OOLU6601002"], corporation: "상해생산법인", route: "CNSHA–CNNGB–SGSIN", valueUsd: 1510000, stages: [stage(1, "CNSHA", 5.9, "COMPLETED", "EASTERN LIGHT", "477660100"), stage(2, "CNNGB", 9.8, "CURRENT", "EASTERN LIGHT", "477660100"), stage(3, "SGSIN", 22.2, "PLANNED", "EASTERN LIGHT", "477660100")] },
  { shipmentNo: "SHP-6705", blNo: "BL-KR-6705", containerNos: ["HMMU6705001"], corporation: "한국생산법인", route: "KRPUS–PAPTY", valueUsd: 630000, stages: [stage(1, "KRPUS", 2.7, "COMPLETED", "OCEAN KOREA", "440670500"), stage(2, "PAPTY", 7.9, "PLANNED", "OCEAN KOREA", "440670500")] },
];

export function riskBand(days: number): RiskBand {
  if (days >= 21) return "CRITICAL";
  if (days >= 14) return "HIGH";
  if (days >= 7) return "MEDIUM";
  return "UNDER7";
}

export const riskBandLabels: Record<RiskBand, string> = {
  UNDER7: "7일 미만",
  MEDIUM: "7일 이상 14일 미만",
  HIGH: "14일 이상 21일 미만",
  CRITICAL: "21일 이상",
};

export function matchingStages(shipment: ShipmentRecord, filters: ShipmentFilters) {
  const hasStageFilter = filters.ports.length > 0 || filters.dwellBands.length > 0;
  if (!hasStageFilter) return shipment.stages;
  return shipment.stages.filter(stage =>
    (filters.ports.length === 0 || filters.ports.includes(stage.portCode))
    && (filters.dwellBands.length === 0 || filters.dwellBands.includes(riskBand(stage.dwellDays))),
  );
}

export function filterShipments(shipments: ShipmentRecord[], filters: ShipmentFilters) {
  return shipments.filter(shipment =>
    (filters.corporations.length === 0 || filters.corporations.includes(shipment.corporation))
    && (filters.blNos.length === 0 || filters.blNos.includes(shipment.blNo))
    && (filters.containerNos.length === 0 || shipment.containerNos.some(no => filters.containerNos.includes(no)))
    && matchingStages(shipment, filters).length > 0,
  );
}

