"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { geoMercator, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import world from "@d3-maps/atlas/world/countries/countries-110m";
import { demoShipments, filterShipments, matchingStages, portCatalog, riskBand, riskBandLabels, type RiskBand, type ShipmentFilters, type ShipmentRecord, type TransshipmentStage } from "./dashboard-data";

type Severity = "CRITICAL" | "HIGH" | "MEDIUM";
type RiskMix = {
  under7: number;
  medium: number;
  high: number;
  critical: number;
};
type PortView = (typeof portCatalog)[number] & {
  level: Severity;
  maxWait: number;
  avgWait: number;
  containers7d: number;
  bl7d: number;
  congestion: string;
  resultCount: number;
  criticalBls: number;
};
type ActionRow = {
  id: string;
  route: string;
  port: string;
  wait: string;
  value: string;
  level: Severity;
};
type EventSource = { name: string; type: string; observedAt: string; url: string };
type EventItem = {
  id: number;
  portCodes: string[];
  type: string;
  title: string;
  titleKo?: string;
  scope: string;
  severity: Severity;
  source: string;
  confidence: number;
  delay: string;
  status: "실제" | "예측";
  updated: string;
  publishedAt?: string;
  sourceLinks?: EventSource[];
};
type AgentRun = {
  runId: string;
  mode: "SYNTHETIC";
  orchestratorStatus: "COMPLETED";
  startedAt: string;
  completedAt: string;
  agents: Array<{
    id: string;
    name: string;
    status: string;
    dataStatus: string;
    confidence: number;
    simulatedLatencyMs: number;
    summary: string;
    detail: string;
  }>;
  metrics: {
    shipments: number;
    events: number;
    criticalQueue: number;
    matchedImpact: number;
    sourceLinks: number;
    scenarioIdeas: number;
  };
};

const routes = [
  [[103.82, 1.26], [55.03, 25.01], [4.48, 51.92]],
  [[121.49, 31.23], [121.87, 29.87], [103.82, 1.26]],
  [[-79.52, 9.0], [-118.25, 33.74], [129.04, 35.1]],
];

const shipmentVessels = [
  { shipmentNo: "SHP-2048", vessel: "EVER OCEAN", portCode: "SGSIN", lon: 103.68, lat: 1.18, sog: 6.8 },
  { shipmentNo: "SHP-2051", vessel: "PACIFIC STAR", portCode: "SGSIN", lon: 104.02, lat: 1.35, sog: 2.1 },
  { shipmentNo: "SHP-1182", vessel: "EASTERN BRIDGE", portCode: "CNSHA", lon: 121.72, lat: 31.08, sog: 5.4 },
  { shipmentNo: "SHP-1189", vessel: "BLUE HORIZON", portCode: "CNNGB", lon: 122.06, lat: 29.72, sog: 8.3 },
  { shipmentNo: "SHP-7710", vessel: "CANAL EXPRESS", portCode: "PAPTY", lon: -79.69, lat: 8.86, sog: 3.6 },
  { shipmentNo: "SHP-7721", vessel: "PANAMA LINK", portCode: "PAPTY", lon: -79.38, lat: 9.13, sog: 1.9 },
];

const events: EventItem[] = [
  { id: 1, portCodes: ["SGSIN"], type: "항만 혼잡", title: "싱가포르 환적 대기시간 급증", scope: "SGSIN · ASIA–EUR", severity: "CRITICAL" as Severity, source: "myKN News + 선사 공식 메일 + 3개 출처", confidence: 92, delay: "2.8–3.6일", status: "실제", updated: "12분 전" },
  { id: 2, portCodes: ["CNSHA", "CNNGB"], type: "기상", title: "태풍 마오르 북상, 남중국해 영향", scope: "CNSHA·CNNGB · EAS–SEA", severity: "HIGH" as Severity, source: "공식 기상경보 + 5개 출처", confidence: 88, delay: "1.8–2.7일", status: "예측", updated: "25분 전" },
  { id: 3, portCodes: ["NLRTM"], type: "파업", title: "북유럽 주요 항만 노조 파업 지속", scope: "NLRTM · NWE", severity: "HIGH" as Severity, source: "myKN News + 항만 공지 + 2개 출처", confidence: 96, delay: "1.5–2.4일", status: "실제", updated: "41분 전" },
  { id: 4, portCodes: ["PAPTY", "USLAX"], type: "운하 운영", title: "파나마 운하 갑문 정비·예약 시스템 변경", scope: "PAPTY·USLAX · ASIA–AMERICAS", severity: "MEDIUM" as Severity, source: "파나마 운하청 공지 + myKN News", confidence: 95, delay: "1.0–2.2일", status: "실제", updated: "58분 전" },
  { id: 5, portCodes: ["SGSIN", "AEJEA", "NLRTM"], type: "지정학", title: "홍해 긴장 고조, 희망봉 우회 확대", scope: "ASIA–EUR", severity: "HIGH" as Severity, source: "myKN News + 주요 뉴스 + 6개 출처", confidence: 84, delay: "4.0–7.0일", status: "예측", updated: "1시간 전" },
];

const eventSourceLinks: Record<number, EventSource[]> = {
  1: [
    { name: "Kuehne+Nagel myKN News", type: "물류 뉴스", observedAt: "12분 전", url: "https://mykn.kuehne-nagel.com/news/" },
    { name: "Maritime and Port Authority of Singapore", type: "항만 공식", observedAt: "18분 전", url: "https://www.mpa.gov.sg/media-centre" },
    { name: "PSA Singapore", type: "터미널 운영", observedAt: "31분 전", url: "https://www.singaporepsa.com/newsroom/" },
  ],
  2: [
    { name: "NOAA National Hurricane Center", type: "공식 기상", observedAt: "25분 전", url: "https://www.nhc.noaa.gov/" },
    { name: "WMO Severe Weather Information Centre", type: "국제 기상", observedAt: "28분 전", url: "https://severeweather.wmo.int/" },
    { name: "Kuehne+Nagel myKN News", type: "물류 뉴스", observedAt: "37분 전", url: "https://mykn.kuehne-nagel.com/news/" },
  ],
  3: [
    { name: "Port of Rotterdam News", type: "항만 공식", observedAt: "41분 전", url: "https://www.portofrotterdam.com/en/news-and-press-releases" },
    { name: "Kuehne+Nagel myKN News", type: "물류 뉴스", observedAt: "46분 전", url: "https://mykn.kuehne-nagel.com/news/" },
    { name: "European Transport Workers’ Federation", type: "노동·파업", observedAt: "52분 전", url: "https://www.etf-europe.org/news/" },
  ],
  4: [
    { name: "Panama Canal Authority Advisories", type: "운하 공식 공지", observedAt: "58분 전", url: "https://pancanal.com/en/advisories-to-shipping/" },
    { name: "Panama Canal Transit Reservation System", type: "통항 예약 정보", observedAt: "1시간 전", url: "https://pancanal.com/en/transit-reservation-system/" },
    { name: "Kuehne+Nagel myKN News", type: "물류 뉴스", observedAt: "1시간 8분 전", url: "https://mykn.kuehne-nagel.com/news/" },
  ],
  5: [
    { name: "UK Maritime Trade Operations", type: "해상 보안", observedAt: "1시간 전", url: "https://www.ukmto.org/" },
    { name: "Kuehne+Nagel myKN News", type: "물류 뉴스", observedAt: "1시간 전", url: "https://mykn.kuehne-nagel.com/news/" },
    { name: "International Maritime Organization", type: "국제기구", observedAt: "1시간 12분 전", url: "https://www.imo.org/en/mediacentre/pages/default.aspx" },
  ],
};

const apiSources = [
  { name: "AISStream", status: "정상", timing: "0.8s" },
  { name: "Customs", status: "정상", timing: "1.2s" },
  { name: "Route", status: "정상", timing: "0.6s" },
  { name: "Carbon", status: "정상", timing: "1.1s" },
  { name: "News·Weather·Mail", status: "지연", timing: "18.6s" },
  { name: "myKN News", status: "모니터링", timing: "15분 주기", href: "https://mykn.kuehne-nagel.com/news/" },
];

function summarizeRisk(shipments: ShipmentRecord[], stagesFor: (shipment: ShipmentRecord) => TransshipmentStage[]) {
  const counts = { MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
  shipments.forEach(shipment => {
    const bands = stagesFor(shipment).map(stage => riskBand(stage.dwellDays));
    if (bands.includes("CRITICAL")) counts.CRITICAL += 1;
    else if (bands.includes("HIGH")) counts.HIGH += 1;
    else if (bands.includes("MEDIUM")) counts.MEDIUM += 1;
  });
  return { ...counts, fail: counts.MEDIUM + counts.HIGH + counts.CRITICAL };
}

function buildActions(shipments: ShipmentRecord[], stagesFor: (shipment: ShipmentRecord) => TransshipmentStage[]): ActionRow[] {
  return shipments.flatMap(shipment => {
    const failed = stagesFor(shipment).filter(stage => stage.dwellDays >= 7);
    if (!failed.length) return [];
    const stage = [...failed].sort((a, b) => b.dwellDays - a.dwellDays)[0];
    const port = portCatalog.find(item => item.code === stage.portCode)!;
    return [{
      id: shipment.shipmentNo,
      route: shipment.route,
      port: `${port.name} · TS${stage.sequence}${stage.status === "PLANNED" ? " 예정" : ""}`,
      wait: `${stage.dwellDays}일`,
      value: shipment.blNo,
      level: riskBand(stage.dwellDays) as Severity,
    }];
  }).sort((a, b) => Number.parseFloat(b.wait) - Number.parseFloat(a.wait));
}

function SeverityBadge({ level }: { level: Severity }) {
  return <span className={`severity severity-${level.toLowerCase()}`}>{level}</span>;
}

const riskBands = [
  { key: "under7" as const, label: "7일 미만", className: "under7" },
  { key: "medium" as const, label: "Medium", className: "medium" },
  { key: "high" as const, label: "High", className: "high" },
  { key: "critical" as const, label: "Critical", className: "critical" },
];

function RiskDistribution({ title, counts }: { title: string; counts: RiskMix }) {
  const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
  const percentage = (count: number) => total === 0 ? 0 : Math.round((count / total) * 100);

  return (
    <section className="risk-distribution" aria-label={`${title} 위험등급 분포`}>
      <div className="risk-distribution-head">
        <strong>{title}</strong>
        <span>총 {total.toLocaleString()}건</span>
      </div>
      <div className="risk-stack" role="img" aria-label={riskBands.map(band => `${band.label} ${percentage(counts[band.key])}%`).join(", ")}>
        {riskBands.map(band => (
          <i
            key={band.key}
            className={`risk-segment risk-${band.className}`}
            style={{ width: `${percentage(counts[band.key])}%` }}
            title={`${band.label}: ${counts[band.key]}건 (${percentage(counts[band.key])}%)`}
          >
            {percentage(counts[band.key]) >= 10 && <span>{percentage(counts[band.key])}%</span>}
          </i>
        ))}
      </div>
      <div className="risk-breakdown">
        {riskBands.map(band => (
          <div key={band.key}>
            <span><i className={`breakdown-dot risk-${band.className}`}/>{band.label}</span>
            <strong>{counts[band.key]}<small>{percentage(counts[band.key])}%</small></strong>
          </div>
        ))}
      </div>
    </section>
  );
}

function MultiSelectFilter({ label, options, selected, onChange }: {
  label: string;
  options: Array<{ value: string; label: string }>;
  selected: string[];
  onChange: (values: string[]) => void;
}) {
  return (
    <details className="multi-filter">
      <summary><span>{label}</span><b>{selected.length ? `${selected.length}개 선택` : "전체"}</b></summary>
      <div className="multi-filter-menu">
        <div className="multi-filter-actions">
          <button type="button" onClick={() => onChange(options.map(option => option.value))}>전체 선택</button>
          <button type="button" onClick={() => onChange([])}>전체 선택 해제</button>
        </div>
        <div>
          {options.map(option => (
            <label key={option.value}>
              <input
                type="checkbox"
                checked={selected.includes(option.value)}
                onChange={() => onChange(selected.includes(option.value)
                  ? selected.filter(value => value !== option.value)
                  : [...selected, option.value])}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </div>
    </details>
  );
}

function WorldMap({ ports, visibleShipmentNos, selectedPortCodes, onTogglePort }: {
  ports: PortView[];
  visibleShipmentNos: string[];
  selectedPortCodes: string[];
  onTogglePort: (portCode: string) => void;
}) {
  const [hoveredPort, setHoveredPort] = useState<PortView | null>(null);
  const [zoom, setZoom] = useState(1);
  const [focus, setFocus] = useState<[number, number]>([10, 15]);
  const [isDragging, setIsDragging] = useState(false);
  const hoverCloseTimer = useRef<number | null>(null);
  const dragStart = useRef<{
    x: number;
    y: number;
    focus: [number, number];
    moved: boolean;
  } | null>(null);
  const setMapZoom = (nextZoom: number) => {
    setZoom(Math.max(1, Math.min(5, Number(nextZoom.toFixed(1)))));
  };

  const resetMap = () => {
    setZoom(1);
    setFocus([10, 15]);
  };

  const startDragging = (event: React.PointerEvent<SVGSVGElement>) => {
    if (event.button !== 0) return;
    const target = event.target;
    if (target instanceof Element && target.closest(".map-mark, .shipment-vessel")) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStart.current = {
      x: event.clientX,
      y: event.clientY,
      focus,
      moved: false,
    };
    setHoveredPort(null);
    setIsDragging(true);
  };

  const moveMap = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!dragStart.current) return;
    const dx = event.clientX - dragStart.current.x;
    const dy = event.clientY - dragStart.current.y;
    if (Math.abs(dx) + Math.abs(dy) > 3) dragStart.current.moved = true;
    const degreesPerPixel = 180 / (Math.PI * 145 * zoom);
    const nextLon = Math.max(
      -175,
      Math.min(175, dragStart.current.focus[0] - dx * degreesPerPixel),
    );
    const nextLat = Math.max(
      -70,
      Math.min(75, dragStart.current.focus[1] + dy * degreesPerPixel),
    );
    setFocus([nextLon, nextLat]);
  };

  const stopDragging = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!dragStart.current) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    window.setTimeout(() => {
      dragStart.current = null;
    }, 0);
    setIsDragging(false);
  };

  const map = useMemo(() => {
    const projection = geoMercator().center(focus).scale(145 * zoom).translate([480, 245]);
    const path = geoPath(projection);
    const countries = feature(
      world as never,
      (world as unknown as { objects: { features: never } }).objects.features,
    ) as unknown as { features: Array<GeoJSON.Feature> };
    return { projection, path, countries: countries.features };
  }, [focus, zoom]);

  const hoveredPosition = hoveredPort
    ? map.projection([hoveredPort.lon, hoveredPort.lat])
    : null;

  const portColorClass = (port: PortView) => {
    if (port.maxWait < 7) return "healthy";
    return port.level.toLowerCase();
  };

  const openPortTooltip = (port: PortView) => {
    if (hoverCloseTimer.current !== null) {
      window.clearTimeout(hoverCloseTimer.current);
    }
    if (!isDragging) setHoveredPort(port);
  };

  const keepPortTooltipOpen = () => {
    if (hoverCloseTimer.current !== null) {
      window.clearTimeout(hoverCloseTimer.current);
      hoverCloseTimer.current = null;
    }
  };

  const schedulePortTooltipClose = () => {
    keepPortTooltipOpen();
    hoverCloseTimer.current = window.setTimeout(() => {
      setHoveredPort(null);
      hoverCloseTimer.current = null;
    }, 280);
  };

  const focusPort = (port: PortView) => {
    if (dragStart.current?.moved) return;
    onTogglePort(port.code);
  };

  return (
    <section className="panel map-panel" aria-label="Ocean Live Operations 지도">
      <div className="panel-head">
        <div>
          <p className="eyebrow">OCEAN LIVE OPERATIONS</p>
          <h2>글로벌 환적 위험망</h2>
        </div>
        <span className="demo-label">{selectedPortCodes.length ? `${selectedPortCodes.length}개 항만 선택 · 재클릭 해제` : "AIS 연계 Shipment"}</span>
      </div>
      <div className={`map-canvas ${isDragging ? "is-dragging" : ""}`}>
        <div className="zoom-controls" aria-label="지도 확대 축소">
          <button onClick={() => setMapZoom(zoom + 0.5)} aria-label="확대">+</button>
          <span>{zoom.toFixed(1)}×</span>
          <button onClick={() => setMapZoom(zoom - 0.5)} aria-label="축소">−</button>
          <button onClick={resetMap}>전체</button>
        </div>
        <svg
          viewBox="0 0 960 500"
          role="img"
          aria-label="확대 가능한 세계 환적항 위험지도"
          onWheel={event => {
            event.preventDefault();
            setMapZoom(zoom + (event.deltaY < 0 ? 0.35 : -0.35));
          }}
          onPointerDown={startDragging}
          onPointerMove={moveMap}
          onPointerUp={stopDragging}
          onPointerCancel={stopDragging}
        >
          <defs>
            <radialGradient id="oceanGlow"><stop offset="0" stopColor="#0a5572" stopOpacity=".44"/><stop offset="1" stopColor="#061a2d" stopOpacity="0"/></radialGradient>
            <filter id="dotGlow"><feGaussianBlur stdDeviation="3" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
          </defs>
          <rect width="960" height="500" fill="url(#oceanGlow)" />
          {map.countries.map((country, i) => <path key={i} d={map.path(country) ?? ""} className="country" />)}
          {routes.map((route, i) => {
            const line = { type: "LineString", coordinates: route } as GeoJSON.LineString;
            return <path key={i} d={map.path(line) ?? ""} className="sea-route" />;
          })}
          {ports.map(port => {
            const p = map.projection([port.lon, port.lat]);
            if (!p) return null;
            return (
              <g
                key={port.code}
                className={`map-mark port-${portColorClass(port)} ${selectedPortCodes.includes(port.code) ? "is-selected" : ""} ${port.resultCount === 0 ? "no-results" : ""}`}
                onClick={() => focusPort(port)}
                onKeyDown={event => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    focusPort(port);
                  }
                }}
                onMouseEnter={() => openPortTooltip(port)}
                onMouseLeave={schedulePortTooltipClose}
                role="button"
                tabIndex={0}
                aria-pressed={selectedPortCodes.includes(port.code)}
                aria-label={`${port.name}, 최대 환적 대기 ${port.maxWait}일, 7일 이상 컨테이너 ${port.containers7d}개, B/L ${port.bl7d}건`}
              >
                <circle cx={p[0]} cy={p[1]} r={port.permanent ? 17 : 13} className="risk-pulse"/>
                <circle cx={p[0]} cy={p[1]} r={port.permanent ? 6 : 4.5} className="risk-dot"/>
                <text x={p[0] + 10} y={p[1] - 8}>{port.name}</text>
              </g>
            );
          })}
          {zoom >= 2 && shipmentVessels.filter(vessel => visibleShipmentNos.includes(vessel.shipmentNo)).map(vessel => {
            const p = map.projection([vessel.lon, vessel.lat]);
            if (!p) return null;
            return (
              <g key={vessel.shipmentNo} className="shipment-vessel" role="img" aria-label={`${vessel.shipmentNo}, ${vessel.vessel}, AIS 연계 데모`}>
                <path d={`M ${p[0] - 6} ${p[1] + 3} L ${p[0] + 6} ${p[1] + 3} L ${p[0] + 3} ${p[1] + 7} L ${p[0] - 3} ${p[1] + 7} Z`}/>
                <text x={p[0] + 9} y={p[1] + 5}>{vessel.shipmentNo}</text>
              </g>
            );
          })}
        </svg>
        {hoveredPort && hoveredPosition && (
          <div
            className="port-tooltip"
            onMouseEnter={keepPortTooltipOpen}
            onMouseLeave={schedulePortTooltipClose}
            style={{
              left: `${Math.max(18, Math.min(82, (hoveredPosition[0] / 960) * 100))}%`,
              top: `${Math.max(12, Math.min(68, (hoveredPosition[1] / 500) * 100))}%`,
            }}
          >
            <div><strong>{hoveredPort.name}</strong><span>{hoveredPort.code}</span></div>
            <p>{hoveredPort.congestion} · 평균 대기 {hoveredPort.avgWait}일</p>
            <dl>
              <div><dt>7일 이상 Container</dt><dd>{hoveredPort.containers7d}</dd></div>
              <div><dt>7일 이상 B/L</dt><dd>{hoveredPort.bl7d}</dd></div>
              <div><dt>최대 환적 대기</dt><dd>{hoveredPort.maxWait}일</dd></div>
            </dl>
            <small>DEMO DATA · 실제 물동 연계 예정</small>
            <a
              className="port-export-button"
              href={`/exports/transshipment-risk-${hoveredPort.code}-2026-08-03.xlsx`}
              download
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => event.stopPropagation()}
            >
              <span>전체 데이터 보기</span>
              <b>↓ XLSX</b>
            </a>
          </div>
        )}
        <div className="map-legend">
          <span><i className="dot healthy"/>원활</span><span><i className="dot medium"/>Medium 7–&lt;14일</span><span><i className="dot high"/>High 14–&lt;21일</span><span><i className="dot critical"/>Critical ≥21일</span>
        </div>
        {zoom >= 2 && <span className="map-demo-note">Shipment 선박: AIS 연계 UI DEMO</span>}
      </div>
    </section>
  );
}

export default function Home() {
  const [selectedEventId, setSelectedEventId] = useState(events[0].id);
  const [sourceEvent, setSourceEvent] = useState<EventItem | null>(null);
  const [liveEvents, setLiveEvents] = useState<EventItem[]>([]);
  const [liveEventSources, setLiveEventSources] = useState<Record<number, EventSource[]>>({});
  const [eventFeed, setEventFeed] = useState({ status: "idle", collectedAt: "", latencyMs: 0, sources: "0/0" });
  const eventFetchStarted = useRef(false);
  const [filter, setFilter] = useState<"ALL" | Severity>("ALL");
  const [activeNav, setActiveNav] = useState("관제");
  const [scenarioOpen, setScenarioOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [agentRun, setAgentRun] = useState<AgentRun | null>(null);
  const [agentsRunning, setAgentsRunning] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState("대체 환적항 + 트럭");
  const [mapPortCodes, setMapPortCodes] = useState<string[]>([]);
  const [dashboardFilters, setDashboardFilters] = useState<ShipmentFilters>({
    corporations: [], carriers: [], ports: [], dwellBands: [], blNos: [], containerNos: [],
  });

  useEffect(() => {
    if (activeNav !== "이벤트" || eventFetchStarted.current) return;
    eventFetchStarted.current = true;
    const controller = new AbortController();
    setEventFeed(current => ({ ...current, status: "loading" }));
    fetch("/api/events", { signal: controller.signal, cache: "no-store" })
      .then(async response => {
        if (!response.ok) throw new Error("event feed failed");
        return response.json() as Promise<{ mode: string; collectedAt: string; latencyMs: number; sourcesSucceeded: number; sourcesTotal: number; events: EventItem[] }>;
      })
      .then(result => {
        if (!result.events.length) throw new Error("event feed empty");
        setLiveEvents(result.events);
        setLiveEventSources(Object.fromEntries(result.events.map(event => [event.id, event.sourceLinks ?? []])));
        setSelectedEventId(result.events[0].id);
        setEventFeed({ status: "live", collectedAt: result.collectedAt, latencyMs: result.latencyMs, sources: `${result.sourcesSucceeded}/${result.sourcesTotal}` });
      })
      .catch(error => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setEventFeed(current => ({ ...current, status: "fallback" }));
      });
    return () => controller.abort();
  }, [activeNav]);

  const eventPool = liveEvents.length ? liveEvents : events;
  const allEventSources = { ...eventSourceLinks, ...liveEventSources };
  const displayedApiSources = apiSources.map(source => source.name === "News·Weather·Mail" ? {
    ...source,
    status: eventFeed.status === "live" ? "정상" : eventFeed.status === "loading" ? "수집 중" : "대체 데이터",
    timing: eventFeed.status === "live" ? `${eventFeed.latencyMs}ms · ${eventFeed.sources}` : "라이브 SOURCE 확인 필요",
  } : source);

  const filteredShipments = useMemo(() => filterShipments(demoShipments, dashboardFilters), [dashboardFilters]);
  const relevantStages = useCallback((shipment: ShipmentRecord) => matchingStages(shipment, dashboardFilters), [dashboardFilters]);
  const controlStages = useCallback((shipment: ShipmentRecord) => {
    const stages = relevantStages(shipment);
    return mapPortCodes.length ? stages.filter(stage => mapPortCodes.includes(stage.portCode)) : stages;
  }, [mapPortCodes, relevantStages]);
  const controlShipments = useMemo(() => mapPortCodes.length
    ? filteredShipments.filter(shipment => controlStages(shipment).length > 0)
    : filteredShipments,
  [controlStages, filteredShipments, mapPortCodes.length]);
  const globalKpiCounts = useMemo(() => summarizeRisk(filteredShipments, relevantStages), [filteredShipments, relevantStages]);
  const controlKpiCounts = useMemo(() => summarizeRisk(controlShipments, controlStages), [controlShipments, controlStages]);

  const portViews = useMemo<PortView[]>(() => portCatalog.map(port => {
    const linked = filteredShipments.flatMap(shipment => relevantStages(shipment)
      .filter(stage => stage.portCode === port.code)
      .map(stage => ({ shipment, stage })));
    const waits = linked.map(row => row.stage.dwellDays);
    const failed = linked.filter(row => row.stage.dwellDays >= 7);
    const maxWait = waits.length ? Math.max(...waits) : 0;
    const avgWait = waits.length ? waits.reduce((sum, days) => sum + days, 0) / waits.length : 0;
    const worstBand = riskBand(maxWait);
    const level: Severity = worstBand === "CRITICAL" ? "CRITICAL" : worstBand === "HIGH" ? "HIGH" : "MEDIUM";
    return {
      ...port,
      maxWait: Number(maxWait.toFixed(1)),
      avgWait: Number(avgWait.toFixed(1)),
      containers7d: new Set(failed.flatMap(row => row.shipment.containerNos)).size,
      bl7d: new Set(failed.map(row => row.shipment.blNo)).size,
      criticalBls: new Set(linked.filter(row => row.stage.dwellDays >= 21).map(row => row.shipment.blNo)).size,
      level,
      congestion: maxWait >= 21 ? "혼잡 심각" : maxWait >= 14 ? "혼잡" : maxWait >= 7 ? "주의" : "원활",
      resultCount: linked.length,
    };
  }), [filteredShipments, relevantStages]);

  const derivedEvents = useMemo(() => eventPool.map(event => {
    const impacted = filteredShipments.filter(shipment => relevantStages(shipment).some(stage => event.portCodes.includes(stage.portCode)));
    const eventStages = impacted.flatMap(shipment => relevantStages(shipment)
      .filter(stage => event.portCodes.includes(stage.portCode))
      .map(stage => ({ shipment, stage })));
    const mix = (byContainer: boolean): RiskMix => eventStages.reduce<RiskMix>((acc, row) => {
      const key = riskBand(row.stage.dwellDays).toLowerCase() as keyof RiskMix;
      acc[key] += byContainer ? row.shipment.containerNos.length : 1;
      return acc;
    }, { under7: 0, medium: 0, high: 0, critical: 0 });
    return {
      ...event,
      shipments: impacted.length,
      bls: new Set(impacted.map(row => row.blNo)).size,
      containers: new Set(impacted.flatMap(row => row.containerNos)).size,
      corporations: new Set(impacted.map(row => row.corporation)).size,
      shipmentRisk: mix(false),
      containerRisk: mix(true),
    };
  }).filter(event => event.shipments > 0)
    .sort((a, b) => b.containers - a.containers || b.confidence - a.confidence)
    .slice(0, 5), [eventPool, filteredShipments, relevantStages]);

  const selectedEvent = derivedEvents.find(event => event.id === selectedEventId) ?? derivedEvents[0] ?? {
    ...eventPool[0], shipments: 0, bls: 0, containers: 0, corporations: 0,
    shipmentRisk: { under7: 0, medium: 0, high: 0, critical: 0 },
    containerRisk: { under7: 0, medium: 0, high: 0, critical: 0 },
  };
  const actions = useMemo(() => buildActions(filteredShipments, relevantStages), [filteredShipments, relevantStages]);
  const controlActions = useMemo(() => buildActions(controlShipments, controlStages), [controlShipments, controlStages]);
  const filteredActions = filter === "ALL" ? controlActions : controlActions.filter(action => action.level === filter);

  const filterOptions = useMemo(() => ({
    corporations: [...new Set(demoShipments.map(row => row.corporation))].sort().map(value => ({ value, label: value })),
    carriers: [...new Set(demoShipments.map(row => row.carrier))].sort().map(value => ({ value, label: value })),
    ports: portCatalog.map(port => ({ value: port.code, label: `${port.name} (${port.code})` })),
    dwellBands: (Object.keys(riskBandLabels) as RiskBand[]).map(value => ({ value, label: riskBandLabels[value] })),
    blNos: demoShipments.map(row => ({ value: row.blNo, label: row.blNo })),
    containerNos: demoShipments.flatMap(row => row.containerNos).map(value => ({ value, label: value })),
  }), []);
  const activeFilterCount = Object.values(dashboardFilters).reduce((sum, values) => sum + values.length, 0);
  const activeAction = actions[0];
  const performancePeriod = useMemo(() => {
    const format = (date: Date) => new Intl.DateTimeFormat("ko-KR", {
      timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit",
    }).format(date);
    const today = new Date();
    return { today: format(today), weekAgo: format(new Date(today.getTime() - 7 * 86_400_000)) };
  }, []);
  const performanceData = useMemo(() => {
    const stages = filteredShipments.flatMap(relevantStages);
    const shipmentCount = filteredShipments.length;
    const averageWait = stages.length ? stages.reduce((sum, stage) => sum + stage.dwellDays, 0) / stages.length : 0;
    // ponytail: demo data has no dated history; use one deterministic comparison baseline until weekly snapshots arrive.
    const waitReduction = stages.length ? Math.max(0.8, averageWait * 0.28) : 0;
    const weekAgoWait = averageWait + waitReduction;
    const weekAgoFail = globalKpiCounts.fail ? Math.min(shipmentCount, globalKpiCounts.fail + Math.max(1, Math.round(shipmentCount * 0.18))) : 0;
    const weekAgoCritical = globalKpiCounts.CRITICAL ? Math.min(shipmentCount, globalKpiCounts.CRITICAL + Math.max(1, Math.round(shipmentCount * 0.1))) : 0;
    const percentage = (current: number, previous: number) => previous ? ((previous - current) / previous) * 100 : 0;
    const failReduction = percentage(globalKpiCounts.fail, weekAgoFail);
    const currentCriticalRate = shipmentCount ? (globalKpiCounts.CRITICAL / shipmentCount) * 100 : 0;
    const weekAgoCriticalRate = shipmentCount ? (weekAgoCritical / shipmentCount) * 100 : 0;
    const trend = Array.from({ length: 8 }, (_, index) => ({
      week: `W${index + 1}`,
      value: Math.round(weekAgoFail + ((globalKpiCounts.fail - weekAgoFail) * index) / 7),
    }));
    const trendMax = Math.max(1, ...trend.map(point => point.value));
    return {
      averageWait,
      waitReduction,
      weekAgoWait,
      weekAgoFail,
      weekAgoCritical,
      failReduction,
      currentCriticalRate,
      weekAgoCriticalRate,
      criticalResolved: Math.max(0, weekAgoCritical - globalKpiCounts.CRITICAL),
      trend,
      trendMax,
      portRows: portViews
        .filter(port => port.resultCount > 0)
        .map(port => ({
          name: port.name,
          averageWait: port.avgWait,
          change: port.avgWait ? -Math.max(0.4, port.avgWait * 0.22) : 0,
          critical: port.criticalBls,
          status: port.maxWait >= 21 ? "주의" : port.maxWait >= 7 ? "개선" : "정상",
        }))
        .sort((a, b) => b.averageWait - a.averageWait || b.critical - a.critical || a.name.localeCompare(b.name)),
    };
  }, [filteredShipments, globalKpiCounts, portViews, relevantStages]);
  const pageSubjects: Record<string, { title: string; subtitle: string; note?: string }> = {
    관제: {
      title: "환적 리스크 센싱",
      subtitle: "7일 이상 환적 대기 물량을 발견하고 우선순위를 정합니다.",
    },
    이벤트: {
      title: "외부 리스크 분석",
      subtitle: "뉴스·기상·항만 혼잡의 근거와 영향물동을 함께 검증합니다.",
    },
    시나리오: {
      title: "대체 경로 비교",
      subtitle: "위험 Shipment의 대응 아이디어를 비교합니다.",
    },
    성과: {
      title: "개선 추이",
      subtitle: "조치 전후의 지연 감소와 운영 품질을 측정합니다.",
      note: "※ 비교 기준: 일주일 전 수치와 오늘 수치",
    },
  };
  const updateDashboardFilters = (next: ShipmentFilters | ((current: ShipmentFilters) => ShipmentFilters)) => {
    setDashboardFilters(next);
    setAgentRun(null);
  };

  const downloadRawData = () => {
    const headers = ["Shipment No.", "B/L No.", "Container No.", "생산법인", "선사", "Route", "TS 단계", "환적항", "환적항 코드", "대기일수", "위험등급", "단계 상태", "데이터 상태", "Vessel", "MMSI"];
    const rows = filteredShipments.flatMap(shipment => {
      const containers = dashboardFilters.containerNos.length
        ? shipment.containerNos.filter(container => dashboardFilters.containerNos.includes(container))
        : shipment.containerNos;
      return relevantStages(shipment).flatMap(stage => containers.map(container => [
        shipment.shipmentNo,
        shipment.blNo,
        container,
        shipment.corporation,
        shipment.carrier,
        shipment.route,
        `TS${stage.sequence}`,
        portCatalog.find(port => port.code === stage.portCode)?.name ?? stage.portCode,
        stage.portCode,
        stage.dwellDays,
        riskBandLabels[riskBand(stage.dwellDays)],
        stage.status,
        stage.dataStatus,
        stage.vessel,
        stage.mmsi,
      ]));
    });
    const csvCell = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`;
    const csv = `\uFEFF${[headers, ...rows].map(row => row.map(csvCell).join(",")).join("\r\n")}`;
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `transshipment-risk-${new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul" }).format(new Date())}.csv`;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
    notify(`현재 필터 기준 Raw Data ${rows.length}행을 다운로드했습니다.`);
  };

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2400);
  };

  const runMultiAgents = async () => {
    setAgentsRunning(true);
    try {
      const response = await fetch("/api/agents/run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ scope: {
          shipments: filteredShipments.length,
          events: derivedEvents.length,
          criticalQueue: globalKpiCounts.CRITICAL,
          matchedImpact: selectedEvent.shipments,
          sourceLinks: allEventSources[selectedEvent.id]?.length ?? 0,
          scenarioIdeas: actions.length,
        } }),
      });
      if (!response.ok) throw new Error("Agent run failed");
      const result = await response.json() as AgentRun;
      setAgentRun(result);
      notify(`A1~A5 실행 완료 · 대응 아이디어 ${result.metrics.scenarioIdeas}건`);
    } catch {
      notify("멀티에이전트 실행에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setAgentsRunning(false);
    }
  };

  return (
    <main className="dashboard-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">GT</div>
          <div><strong>Global Transshipment</strong><span>CONTROL TOWER</span></div>
        </div>
        <nav aria-label="주요 메뉴">
          {["관제", "이벤트", "시나리오", "성과"].map(item => (
            <button key={item} className={activeNav === item ? "active" : ""} onClick={() => setActiveNav(item)}>{item}</button>
          ))}
        </nav>
        <div className="top-actions">
          <span className="live-indicator"><i/>LIVE</span>
          <span className="timestamp">2026.07.28 12:50 KST</span>
          <button className="icon-button" onClick={() => notify("새로운 경보 12건을 확인했습니다.")} aria-label="알림">12</button>
        </div>
      </header>

      <section className="page-intro">
        <div className="page-intro-copy">
          <p className="eyebrow">GLOBAL OPERATIONS / {activeNav}</p>
          <h1>{pageSubjects[activeNav].title}</h1>
          <p className="page-subtitle">{pageSubjects[activeNav].subtitle}</p>
          {pageSubjects[activeNav].note && <small className="page-comparison-note">{pageSubjects[activeNav].note}</small>}
        </div>
        <div className="freshness"><span>KPI FAIL ≥7일</span><span>AISStream 실측</span><span>글로벌 물동 DEMO</span></div>
      </section>

      <section className="global-filter-panel" aria-label="대시보드 전역 필터">
        <div className="global-filter-head">
          <div><p className="eyebrow">GLOBAL FILTER</p><strong>{filteredShipments.length} Shipment · {new Set(filteredShipments.map(row => row.blNo)).size} B/L</strong></div>
          <div><span>동일 필드 OR · 필드 간 AND · 환적항/대기일수 동일 TS 단계 매칭</span><button onClick={downloadRawData}>Raw Data ↓</button><button onClick={() => updateDashboardFilters({ corporations: [], carriers: [], ports: [], dwellBands: [], blNos: [], containerNos: [] })} disabled={!activeFilterCount}>전체 초기화</button></div>
        </div>
        <div className="global-filter-grid">
          <MultiSelectFilter label="생산법인" options={filterOptions.corporations} selected={dashboardFilters.corporations} onChange={corporations => updateDashboardFilters(current => ({ ...current, corporations }))}/>
          <MultiSelectFilter label="선사" options={filterOptions.carriers} selected={dashboardFilters.carriers} onChange={carriers => updateDashboardFilters(current => ({ ...current, carriers }))}/>
          <MultiSelectFilter label="환적항" options={filterOptions.ports} selected={dashboardFilters.ports} onChange={ports => updateDashboardFilters(current => ({ ...current, ports }))}/>
          <MultiSelectFilter label="환적 대기 일수" options={filterOptions.dwellBands} selected={dashboardFilters.dwellBands} onChange={dwellBands => updateDashboardFilters(current => ({ ...current, dwellBands: dwellBands as RiskBand[] }))}/>
          <MultiSelectFilter label="B/L 번호" options={filterOptions.blNos} selected={dashboardFilters.blNos} onChange={blNos => updateDashboardFilters(current => ({ ...current, blNos }))}/>
          <MultiSelectFilter label="Container 번호" options={filterOptions.containerNos} selected={dashboardFilters.containerNos} onChange={containerNos => updateDashboardFilters(current => ({ ...current, containerNos }))}/>
        </div>
        {activeFilterCount > 0 && <div className="active-filter-chips">
          {Object.entries(dashboardFilters).flatMap(([key, values]) => values.map(value => <span key={`${key}-${value}`}>{key === "dwellBands" ? riskBandLabels[value as RiskBand] : value}</span>))}
        </div>}
      </section>

      {activeNav === "이벤트" && <section className="kpi-grid tab-summary-grid" aria-label="이벤트 핵심 지표">
        {[
          ["활성 이벤트", String(derivedEvents.length), "건", "필터 물동 매칭", "neutral"],
          ["Critical 이벤트", String(derivedEvents.filter(event => event.severity === "CRITICAL").length), "건", "즉시 확인", "danger"],
          ["영향 Shipment", String(selectedEvent.shipments), "건", "선택 이벤트", "warning"],
        ].map(([label, value, unit, delta, tone]) => <article className={`kpi-card ${tone}`} key={label}><div><span>{label}</span><i/></div><strong>{value}<small>{unit}</small></strong><p>{delta}</p></article>)}
      </section>}

      <section className={`kpi-grid ${activeNav === "관제" ? "" : "tab-hidden"}`} aria-label="핵심 지표">
        {[
          ["KPI FAIL", String(controlKpiCounts.fail), "B/L", "환적 대기 7일 이상", "neutral"],
          ["MEDIUM", String(controlKpiCounts.MEDIUM), "B/L", "7일 이상 14일 미만", "medium"],
          ["HIGH", String(controlKpiCounts.HIGH), "B/L", "14일 이상 21일 미만", "warning"],
          ["CRITICAL", String(controlKpiCounts.CRITICAL), "B/L", "21일 이상", "danger"],
          ["AIS 신선도", "96.7", "%", "선박 위치 최신성", "good"],
        ].map(([label, value, unit, delta, tone]) => (
          <article className={`kpi-card ${tone}`} key={label}>
            <div><span>{label}</span><i/></div>
            <strong>{value}<small>{unit}</small></strong>
            <p>{delta}</p>
          </article>
        ))}
      </section>

      <section className={`operations-grid ${activeNav === "관제" ? "" : "tab-hidden"}`}>
        <WorldMap
          ports={portViews}
          visibleShipmentNos={controlShipments.map(row => row.shipmentNo)}
          selectedPortCodes={mapPortCodes}
          onTogglePort={portCode => setMapPortCodes(current => current.includes(portCode)
            ? current.filter(code => code !== portCode)
            : [...current, portCode])}
        />
        <section className="panel action-panel">
          <div className="panel-head">
            <div><p className="eyebrow">ACTION QUEUE</p><h2>우선조치 큐</h2></div>
            <button className="text-button" onClick={() => notify("우선순위 기준: 환적 대기일 → SLA → 화물가액")}>정렬 기준</button>
          </div>
          <div className="filter-row">
            {(["ALL", "CRITICAL", "HIGH", "MEDIUM"] as const).map(level => (
              <button key={level} className={filter === level ? "active" : ""} onClick={() => setFilter(level)}>{level}</button>
            ))}
          </div>
          <div className="action-list">
            {filteredActions.map((action, index) => (
              <article className="action-row" key={action.id}>
                <div className="rank">{index + 1}</div>
                <div className="action-main">
                  <div><strong>{action.id}</strong><SeverityBadge level={action.level}/></div>
                  <p>{action.port} · {action.route}</p>
                  <div className="action-meta"><span>환적 대기 <b>{action.wait}</b></span><span>판정 <b>KPI FAIL</b></span><span>B/L <b>{action.value}</b></span></div>
                </div>
              </article>
            ))}
            {filteredActions.length === 0 && <p className="empty-state">현재 필터 범위에 KPI FAIL 물량이 없습니다.</p>}
          </div>
          <button className="scenario-button" onClick={() => setScenarioOpen(true)}>선택 건 대안 시나리오 비교</button>
        </section>
      </section>

      <section className={`lower-grid ${activeNav === "이벤트" ? "" : "tab-hidden"}`}>
        <section className="panel events-panel">
          <div className="panel-head">
            <div><p className="eyebrow">EXTERNAL EVENT INTELLIGENCE</p><h2>이벤트·뉴스 TOP 5</h2></div>
            <span className="demo-label">{eventFeed.status === "live" ? `LIVE · SOURCE ${eventFeed.sources}` : eventFeed.status === "loading" ? "수집 중" : "DEMO FALLBACK"}</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>#</th><th>이벤트</th><th>영향물동</th><th>예상지연</th><th>신뢰도</th><th>상태</th></tr></thead>
              <tbody>
                {derivedEvents.map((event, index) => (
                  <tr
                    key={event.id}
                    className={selectedEvent.id === event.id ? "selected" : ""}
                    onClick={() => {
                      setSelectedEventId(event.id);
                      setSourceEvent(event);
                    }}
                    onKeyDown={keyEvent => {
                      if (keyEvent.key === "Enter" || keyEvent.key === " ") {
                        keyEvent.preventDefault();
                        setSelectedEventId(event.id);
                        setSourceEvent(event);
                      }
                    }}
                    tabIndex={0}
                    aria-label={`${event.titleKo ?? event.title} 출처 링크 보기`}
                  >
                    <td>{index + 1}</td>
                    <td><div className="event-title"><span>{event.type}</span><strong>{event.titleKo ?? event.title}</strong><small>{event.source} · {event.updated} · SOURCE 보기</small></div></td>
                    <td><b>{event.containers} Container</b><small>{event.shipments} Shipment · {event.bls} B/L</small></td>
                    <td>{event.delay}</td>
                    <td><div className="confidence"><span style={{width: `${event.confidence}%`}}/><b>{event.confidence}%</b></div></td>
                    <td><span className={`data-status status-${event.status}`}>{event.status}</span></td>
                  </tr>
                ))}
                {derivedEvents.length === 0 && <tr><td colSpan={6} className="empty-state">현재 필터와 매칭되는 이벤트가 없습니다.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel impact-panel">
          <div className="panel-head">
            <div><p className="eyebrow">SELECTED EVENT</p><h2>영향물동 요약</h2></div>
            <SeverityBadge level={selectedEvent.severity}/>
          </div>
          <div className="selected-event">
            <strong>{selectedEvent.titleKo ?? selectedEvent.title}</strong><span>{selectedEvent.scope}</span>
          </div>
          <div className="impact-metrics">
            <div><span>Shipment</span><strong>{selectedEvent.shipments}</strong></div>
            <div><span>Container</span><strong>{selectedEvent.containers}</strong></div>
            <div><span>B/L</span><strong>{selectedEvent.bls}</strong></div>
            <div><span>영향 법인 수</span><strong>{selectedEvent.corporations}</strong></div>
          </div>
          <div className="risk-distributions">
            <div className="risk-policy"><span>위험등급별 구성비</span><small>Medium 7–&lt;14일 · High 14–&lt;21일 · Critical ≥21일</small></div>
            <RiskDistribution title="Shipment" counts={selectedEvent.shipmentRisk}/>
            <RiskDistribution title="Container" counts={selectedEvent.containerRisk}/>
          </div>
          <div className="evidence">
            <div><span>매칭 근거</span><strong>항만 100 · 시간창 90 · 항로 85</strong></div>
            <div><span>대표 출처</span><strong>{selectedEvent.source}</strong></div>
          </div>
          <div className="impact-actions">
            <button onClick={() => notify(`영향 Shipment ${selectedEvent.shipments}건을 불러왔습니다.`)}>Shipment 보기</button>
          </div>
        </section>
      </section>

      {activeNav === "이벤트" && <section className="event-detail-grid">
        <article className="panel event-timeline-panel">
          <div className="panel-head"><div><p className="eyebrow">EVENT TIMELINE</p><h2>탐지·검증 타임라인</h2></div><button className="text-button" onClick={() => setSourceEvent(eventPool.find(event => event.id === selectedEvent.id) ?? eventPool[0])}>SOURCE 전체 보기</button></div>
          <div className="event-timeline">
            {[
              ["12:18", "최초 탐지", "myKN News에서 항만 혼잡 신호 수집", "complete"],
              ["12:24", "교차 검증", "항만 공식 공지·선사 메일과 동일 이슈 확인", "complete"],
              ["12:31", "영향 매칭", `${selectedEvent.shipments} Shipment · ${selectedEvent.containers} Container 연결`, "complete"],
              ["12:42", "센싱 요약", "영향물동과 대응 아이디어 자동 생성", "current"],
            ].map(row => <div className={`timeline-row ${row[3]}`} key={row[0]}><time>{row[0]}</time><i/><div><strong>{row[1]}</strong><span>{row[2]}</span></div></div>)}
          </div>
        </article>
        <article className="panel matching-panel">
          <div className="panel-head"><div><p className="eyebrow">MATCHING EVIDENCE</p><h2>자동 매칭 근거</h2></div><span className="demo-label">신뢰도 {selectedEvent.confidence}%</span></div>
          <div className="matching-scores">
            {[["항만 일치",100],["발생 시간창",90],["항로 일치",85],["선사·선박",72]].map(([label, score]) => <div key={String(label)}><span>{label}</span><div><i style={{width:`${score}%`}}/></div><b>{score}</b></div>)}
          </div>
        </article>
      </section>}

      {activeNav === "시나리오" && <section className="scenario-dashboard">
        <div className="scenario-context-grid">
          <article className="panel scenario-target">
            <div className="panel-head"><div><p className="eyebrow">DECISION TARGET</p><h2>대응 대상 화물</h2></div>{activeAction && <SeverityBadge level={activeAction.level}/>}</div>
            {activeAction ? <div className="target-body"><div><strong>{activeAction.id}</strong><span>{activeAction.value}</span></div><p>{activeAction.route}</p><dl><div><dt>위험 단계</dt><dd>{activeAction.port}</dd></div><div><dt>환적 대기</dt><dd>{activeAction.wait}</dd></div><div><dt>연관 이벤트</dt><dd>{selectedEvent.titleKo ?? selectedEvent.title}</dd></div><div><dt>판정</dt><dd>KPI FAIL</dd></div></dl></div> : <p className="empty-state">현재 필터 범위에 시나리오 대상이 없습니다.</p>}
          </article>
          <article className="panel decision-guardrail">
            <div className="panel-head"><div><p className="eyebrow">IDEA CRITERIA</p><h2>아이디어 평가 기준</h2></div><span className="demo-label">내부 참고용</span></div>
            <div className="guardrail-list"><div><span>SLA 회복</span><b>최우선</b></div><div><span>추가비용 한도</span><b>$5K</b></div><div><span>예상 위험등급</span><b>High 이하</b></div><div><span>데이터 신뢰도</span><b>80% 이상</b></div></div>
          </article>
        </div>
        <section className="panel scenario-workbench">
          <div className="panel-head"><div><p className="eyebrow">ALTERNATIVE COMPARISON</p><h2>대안 비교 워크벤치</h2></div><span className="demo-label">Route · 일정 추정</span></div>
          <div className="scenario-comparison">
            {[
              {name:"현재 경로 유지",eta:"8/10 18:00",delay:"+6.2일",sla:"FAIL",cost:"$0",risk:"CRITICAL",score:38},
              {name:"대체 환적항 + 트럭",eta:"8/05 09:00",delay:"+0.8일",sla:"PASS",cost:"$3.8K",risk:"MEDIUM",score:91,recommended:true},
              {name:"다음 모선",eta:"8/08 15:00",delay:"+3.4일",sla:"FAIL",cost:"$1.1K",risk:"HIGH",score:67},
              {name:"긴급 항공 전환",eta:"8/04 22:00",delay:"+0.2일",sla:"PASS",cost:"$16.2K",risk:"MEDIUM",score:73},
            ].map(option => <button className={`${selectedScenario === option.name ? "selected" : ""} ${option.recommended ? "recommended" : ""}`} onClick={() => setSelectedScenario(option.name)} key={option.name}><header><strong>{option.name}</strong>{option.recommended && <span>추천</span>}</header><dl><div><dt>ETA</dt><dd>{option.eta}</dd></div><div><dt>예상 지연</dt><dd>{option.delay}</dd></div><div><dt>SLA</dt><dd className={option.sla === "PASS" ? "positive" : "negative"}>{option.sla}</dd></div><div><dt>추가비용</dt><dd>{option.cost}</dd></div><div><dt>잔여 위험</dt><dd>{option.risk}</dd></div></dl><footer><span>종합점수</span><b>{option.score}</b></footer></button>)}
          </div>
        </section>
        <section className="panel insight-panel">
          <div><p className="eyebrow">SELECTED IDEA</p><h2>{selectedScenario}</h2><span>센싱 데이터가 제안한 내부 참고 아이디어이며 실제 운송을 실행하지 않습니다.</span></div>
        </section>
      </section>}

      {activeNav === "성과" && <section className="performance-dashboard">
        <section className="performance-kpis">
          {[
            ["KPI FAIL 감소율", `${performanceData.failReduction.toFixed(1)}%`, `${performanceData.weekAgoFail}건 → ${globalKpiCounts.fail}건`, "good"],
            ["Critical 해소", `${performanceData.criticalResolved}건`, `${performanceData.weekAgoCritical}건 → ${globalKpiCounts.CRITICAL}건`, "good"],
            ["평균 대기 감소", `${performanceData.waitReduction.toFixed(1)}일`, "필터 물동 기준", "neutral"],
          ].map(row => <article className={`performance-card ${row[3]}`} key={row[0]}><span>{row[0]}</span><strong>{row[1]}</strong><small>{row[2]}</small></article>)}
        </section>
        <section className="performance-main-grid">
          <article className="panel trend-panel"><div className="panel-head"><div><p className="eyebrow">RISK TREND</p><h2>주간 KPI FAIL 추이</h2></div><span className="demo-label">필터 범위 · DEMO 추정</span></div><div className="trend-chart">{performanceData.trend.map(point => <div key={point.week}><b>{point.value}</b><i style={{height:`${(point.value / performanceData.trendMax) * 100}%`}}/><span>{point.week}</span></div>)}</div><div className="trend-legend"><span><i className="risk-critical"/>Critical·High 포함</span><b>−{performanceData.failReduction.toFixed(1)}%</b></div></article>
          <article className="panel before-after-panel"><div className="panel-head"><div><p className="eyebrow">WEEKLY COMPARISON</p><h2>조치 전후 비교 · 7일 전 VS 오늘</h2></div><span className="demo-label">필터 범위 · DEMO 추정</span></div><div className="before-after"><div className="comparison-labels"><span>지표</span><strong>{performancePeriod.weekAgo}</strong><i>→</i><b>{performancePeriod.today}</b><small>변화</small></div><div><span>평균 예상 지연</span><strong>{performanceData.weekAgoWait.toFixed(1)}일</strong><i>→</i><b>{performanceData.averageWait.toFixed(1)}일</b><small>{performanceData.waitReduction.toFixed(1)}일 감소</small></div><div><span>Critical 비중</span><strong>{performanceData.weekAgoCriticalRate.toFixed(1)}%</strong><i>→</i><b>{performanceData.currentCriticalRate.toFixed(1)}%</b><small>{Math.max(0, performanceData.weekAgoCriticalRate - performanceData.currentCriticalRate).toFixed(1)}%p 개선</small></div><div><span>SLA FAIL</span><strong>{performanceData.weekAgoFail}건</strong><i>→</i><b>{globalKpiCounts.fail}건</b><small>{Math.max(0, performanceData.weekAgoFail - globalKpiCounts.fail)}건 회복</small></div></div></article>
        </section>
        <section className="performance-lower-grid">
          <article className="panel port-performance"><div className="panel-head"><div><p className="eyebrow">PORT PERFORMANCE</p><h2>항만별 개선 현황</h2></div><button className="text-button" onClick={() => notify("성과 보고서 Excel을 준비했습니다.")}>보고서 다운로드</button></div><table><thead><tr><th>항만</th><th>평균 대기</th><th>전월 대비</th><th>Critical</th><th>상태</th></tr></thead><tbody>{performanceData.portRows.map(row => <tr key={row.name}><td><strong>{row.name}</strong></td><td>{row.averageWait.toFixed(1)}일</td><td className="positive">−{Math.abs(row.change).toFixed(1)}일</td><td>{row.critical}</td><td><span className={`performance-status status-${row.status}`}>{row.status}</span></td></tr>)}{performanceData.portRows.length === 0 && <tr><td colSpan={5} className="empty-state">현재 필터와 일치하는 항만 데이터가 없습니다.</td></tr>}</tbody></table></article>
          <article className="panel quality-panel"><div className="panel-head"><div><p className="eyebrow">OPERATING QUALITY</p><h2>데이터 분석 품질·신뢰도</h2></div><span className="demo-label">월간</span></div><div className="quality-list">{[["이벤트 매칭 정확도",87],["AIS 데이터 신선도",97],["뉴스·메일 수집 성공률",94],["예정 대기 예측 적중률",81]].map(([label,value]) => <div key={String(label)}><span>{label}</span><div><i style={{width:`${value}%`}}/></div><b>{value}%</b></div>)}</div></article>
        </section>
      </section>}

      <section className={`panel agent-panel ${activeNav === "이벤트" ? "" : "tab-hidden"}`}>
        <div className="panel-head">
          <div>
            <p className="eyebrow">MULTI-AGENT ORCHESTRATION</p>
            <h2>환적 리스크 전문 Agent 연계</h2>
          </div>
          <div className="agent-run-actions">
            <span className={`agent-orchestrator-status ${agentRun ? "ready" : ""}`}>
              A0 {agentRun?.orchestratorStatus ?? "READY"}
            </span>
            <button onClick={runMultiAgents} disabled={agentsRunning}>
              {agentsRunning ? "실행 중…" : "A1~A5 실행"}
            </button>
          </div>
        </div>
        <div className="agent-context">
          <span>합성 데이터 모드</span>
          <p>A1·A2 병렬 감지 → A3 영향물동 → A4 아이디어 → A5 센싱 요약 · 현재 전역 필터 범위 적용</p>
          {agentRun && <small>최근 실행 {new Date(agentRun.completedAt).toLocaleString("ko-KR")} · {agentRun.runId}</small>}
        </div>
        <div className="agent-flow" aria-label="멀티에이전트 실행 흐름">
          {(agentRun?.agents ?? [
            { id: "A1", name: "환적 위험 분석", status: "READY", dataStatus: "PREDICTED", confidence: 0, simulatedLatencyMs: 0, summary: "AIS·연결여유", detail: "Critical 탐지" },
            { id: "A2", name: "물류사건 감지", status: "READY", dataStatus: "PREDICTED", confidence: 0, simulatedLatencyMs: 0, summary: "뉴스·기상·메일", detail: "사건 군집화" },
            { id: "A3", name: "영향물동 분석", status: "WAITING", dataStatus: "PREDICTED", confidence: 0, simulatedLatencyMs: 0, summary: "Shipment 매칭", detail: "자동 영향 요약" },
            { id: "A4", name: "운송대안 추천", status: "WAITING", dataStatus: "ESTIMATED", confidence: 0, simulatedLatencyMs: 0, summary: "ETA·비용·탄소", detail: "대응 아이디어" },
            { id: "A5", name: "센싱·보고", status: "WAITING", dataStatus: "ESTIMATED", confidence: 0, simulatedLatencyMs: 0, summary: "센싱 인사이트", detail: "대시보드 반영" },
          ]).map((agent, index) => (
            <article className={`agent-card ${agent.status === "SUCCESS" ? "success" : ""}`} key={agent.id}>
              <div className="agent-card-head">
                <b>{agent.id}</b>
                <span>{agent.status}</span>
              </div>
              <strong>{agent.name}</strong>
              <p>{agent.summary}</p>
              <small>{agent.detail}</small>
              <div className="agent-confidence">
                <i style={{ width: `${agent.confidence}%` }}/>
              </div>
              <footer>
                <span>{agent.dataStatus}</span>
                <span>{agent.confidence ? `신뢰도 ${agent.confidence}%` : index < 2 ? "병렬 시작" : "선행 결과 대기"}</span>
              </footer>
            </article>
          ))}
        </div>
        {agentRun && (
          <div className="agent-linked-results">
            <span><b>{agentRun.metrics.criticalQueue}</b> Critical·Missed</span>
            <span><b>{agentRun.metrics.events}</b> 외부 사건</span>
            <span><b>{agentRun.metrics.matchedImpact}</b> 영향 Shipment</span>
            <span><b>{agentRun.metrics.sourceLinks}</b> SOURCE 링크</span>
            <span><b>{agentRun.metrics.scenarioIdeas}</b> 대응 아이디어</span>
          </div>
        )}
      </section>

      <section className="panel api-panel">
        <div className="api-title"><p className="eyebrow">SOURCE HEALTH</p><h2>데이터 소스 상태</h2></div>
        <div className="api-grid">
          {displayedApiSources.map(source => (
            <div className={`api-source ${source.status === "지연" || source.status === "대체 데이터" ? "delayed" : ""} ${source.href ? "monitored" : ""}`} key={source.name}>
              <i/>
              <div>
                {source.href
                  ? <a href={source.href} target="_blank" rel="noreferrer">{source.name} ↗</a>
                  : <strong>{source.name}</strong>}
                <span>{source.status} · {source.timing}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {scenarioOpen && (
        <div className="modal-backdrop" onClick={() => setScenarioOpen(false)}>
          <section className="scenario-modal" onClick={event => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="scenario-title">
            <div className="panel-head">
              <div><p className="eyebrow">DECISION WORKBENCH</p><h2 id="scenario-title">SHP-2048 대안 비교</h2></div>
              <button className="close-button" onClick={() => setScenarioOpen(false)} aria-label="닫기">×</button>
            </div>
            <div className="scenario-list">
              {[
                ["기준안", "8/03 14:00", "18h 초과", "$0", "1.2t", "제외"],
                ["대체항 + 트럭", "8/02 09:00", "충족", "$3.8K", "1.7t", "추천"],
                ["다음 모선", "8/05 18:00", "3일 초과", "$1.1K", "1.1t", "비용 우선"],
                ["긴급 항공", "8/01 22:00", "충족", "$16.2K", "9.8t", "긴급 대안"],
              ].map(row => (
                <article className={row[5] === "추천" ? "recommended" : ""} key={row[0]}>
                  <div><strong>{row[0]}</strong><span>{row[5]}</span></div>
                  <dl><div><dt>도착예정</dt><dd>{row[1]}</dd></div><div><dt>SLA</dt><dd>{row[2]}</dd></div><div><dt>추가비용</dt><dd>{row[3]}</dd></div><div><dt>CO₂e</dt><dd>{row[4]}</dd></div></dl>
                  <button onClick={() => { notify(`${row[0]} 아이디어를 선택했습니다.`); setScenarioOpen(false); }}>아이디어 선택</button>
                </article>
              ))}
            </div>
            <p className="scenario-note">Route · Carbon API 기반 추정값 · 자동 실행 없음</p>
          </section>
        </div>
      )}
      {sourceEvent && (
        <div className="modal-backdrop" onClick={() => setSourceEvent(null)}>
          <section
            className="source-modal"
            onClick={modalEvent => modalEvent.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="source-modal-title"
          >
            <div className="panel-head">
              <div>
                <p className="eyebrow">EVENT EVIDENCE / SOURCE LINKS</p>
                <h2 id="source-modal-title">이벤트 탐지 SOURCE</h2>
              </div>
              <button className="close-button" onClick={() => setSourceEvent(null)} aria-label="닫기">×</button>
            </div>
            <div className="source-event-summary">
              <div><SeverityBadge level={sourceEvent.severity}/><span>{sourceEvent.type}</span><span>{sourceEvent.scope}</span></div>
              <strong>{sourceEvent.titleKo ?? sourceEvent.title}</strong>
              {sourceEvent.titleKo && sourceEvent.titleKo !== sourceEvent.title && <small className="source-original-title">원문: {sourceEvent.title}</small>}
              <p>탐지 신뢰도 {sourceEvent.confidence}% · {sourceEvent.updated} 갱신</p>
            </div>
            <div className="source-link-list">
              {(allEventSources[sourceEvent.id] ?? []).map((source, index) => (
                <a href={source.url} target="_blank" rel="noreferrer" key={`${sourceEvent.id}-${source.name}`}>
                  <span className="source-rank">{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <strong>{source.name}</strong>
                    <small>{source.type} · 확인 {source.observedAt}</small>
                  </div>
                  <b>원문 열기 ↗</b>
                </a>
              ))}
            </div>
            <p className="source-modal-note">{liveEventSources[sourceEvent.id] ? `LIVE SOURCE · ${eventFeed.collectedAt ? new Date(eventFeed.collectedAt).toLocaleString("ko-KR") : "방금"} 수집` : "DEMO FALLBACK · 라이브 수집 실패 시에만 표시"}</p>
          </section>
        </div>
      )}
      {toast && <div className="toast" role="status">{toast}</div>}
    </main>
  );
}
