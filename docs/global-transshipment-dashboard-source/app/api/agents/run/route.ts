type RiskLevel = "MISSED" | "CRITICAL" | "HIGH" | "WATCH" | "NORMAL";

const shipmentBuffers = [-5, 4, 11, 12, 23, 24, 36, 47, 48, 60, 18, 8];
const eventClusterScores = [91, 88, 72];

function riskLevel(bufferHours: number): RiskLevel {
  if (bufferHours < 0) return "MISSED";
  if (bufferHours < 12) return "CRITICAL";
  if (bufferHours < 24) return "HIGH";
  if (bufferHours < 48) return "WATCH";
  return "NORMAL";
}

type Scope = {
  shipments: number;
  events: number;
  criticalQueue: number;
  matchedImpact: number;
  sourceLinks: number;
  scenarioIdeas: number;
};

export async function POST(request: Request) {
  const startedAt = new Date();
  const payload = await request.json().catch(() => ({})) as { scope?: Partial<Scope> };
  const riskRows = shipmentBuffers.map((bufferHours, index) => ({
    shipmentId: `SHP-${String(index + 1).padStart(3, "0")}`,
    bufferHours,
    riskLevel: riskLevel(bufferHours),
  }));
  const criticalOrMissed = riskRows.filter(row =>
    row.riskLevel === "CRITICAL" || row.riskLevel === "MISSED",
  );
  const riskCounts = riskRows.reduce<Record<RiskLevel, number>>(
    (counts, row) => {
      counts[row.riskLevel] += 1;
      return counts;
    },
    { MISSED: 0, CRITICAL: 0, HIGH: 0, WATCH: 0, NORMAL: 0 },
  );
  const autoClustered = eventClusterScores.filter(score => score >= 85).length;
  const fallback: Scope = {
    shipments: riskRows.length,
    events: eventClusterScores.length,
    criticalQueue: criticalOrMissed.length,
    matchedImpact: riskRows.length,
    sourceLinks: 2,
    scenarioIdeas: criticalOrMissed.length,
  };
  const scope: Scope = { ...fallback, ...payload.scope };
  const alternatives = scope.scenarioIdeas;

  const agents = [
    {
      id: "A1",
      name: "환적 위험 분석",
      status: "SUCCESS",
      dataStatus: "PREDICTED",
      confidence: 92,
      simulatedLatencyMs: 4200,
      summary: `Critical ${scope.criticalQueue}건`,
      detail: `필터 범위 Shipment ${scope.shipments}건`,
    },
    {
      id: "A2",
      name: "물류사건 감지",
      status: "SUCCESS",
      dataStatus: "PREDICTED",
      confidence: 89,
      simulatedLatencyMs: 6100,
      summary: `매칭 사건 ${scope.events}건`,
      detail: `자동군집 ${autoClustered} · 전체 사건 ${eventClusterScores.length}`,
    },
    {
      id: "A3",
      name: "영향물동 분석",
      status: "SUCCESS",
      dataStatus: "PREDICTED",
      confidence: 94,
      simulatedLatencyMs: 2300,
      summary: `영향 Shipment ${scope.matchedImpact}건`,
      detail: `SOURCE 링크 ${scope.sourceLinks}건`,
    },
    {
      id: "A4",
      name: "운송대안 추천",
      status: "SUCCESS",
      dataStatus: "ESTIMATED",
      confidence: 84,
      simulatedLatencyMs: 3400,
      summary: `대응 아이디어 ${alternatives}건`,
      detail: "내부 참고용",
    },
    {
      id: "A5",
      name: "센싱·보고",
      status: "SUCCESS",
      dataStatus: "ESTIMATED",
      confidence: 90,
      simulatedLatencyMs: 740,
      summary: `요약 인사이트 ${alternatives}건`,
      detail: `TOP 이벤트 ${eventClusterScores.length}건 반영`,
    },
  ];

  return Response.json({
    runId: `RUN-${startedAt.getTime()}`,
    mode: "SYNTHETIC",
    orchestratorStatus: "COMPLETED",
    startedAt: startedAt.toISOString(),
    completedAt: new Date().toISOString(),
    agents,
    metrics: {
      shipments: scope.shipments,
      events: scope.events,
      criticalQueue: scope.criticalQueue,
      matchedImpact: scope.matchedImpact,
      sourceLinks: scope.sourceLinks,
      scenarioIdeas: scope.scenarioIdeas,
      riskCounts,
    },
  });
}
