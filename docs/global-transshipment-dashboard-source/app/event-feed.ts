export type LiveEvent = {
  id: number;
  portCodes: string[];
  type: string;
  title: string;
  titleKo: string;
  summary: string;
  scope: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM";
  source: string;
  confidence: number;
  delay: string;
  status: "실제";
  updated: string;
  publishedAt: string;
  sourceLinks: Array<{ name: string; type: string; observedAt: string; url: string }>;
};

const ports: Array<[string, RegExp]> = [
  ["SGSIN", /singapore|sgsin/i],
  ["CNSHA", /shanghai|cnsha/i],
  ["CNNGB", /ningbo|cnngb/i],
  ["PAPTY", /panama|papty/i],
  ["NLRTM", /rotterdam|nlrtm/i],
  ["AEJEA", /jebel ali|dubai|aejea/i],
  ["KRPUS", /busan|pusan|krpus/i],
  ["USLAX", /los angeles|uslax/i],
];

const portNames: Record<string, string> = {
  SGSIN: "싱가포르",
  CNSHA: "상하이",
  CNNGB: "닝보",
  PAPTY: "파나마",
  NLRTM: "로테르담",
  AEJEA: "제벨알리",
  KRPUS: "부산",
  USLAX: "로스앤젤레스",
};

const normalizedTitle = (title: string) => title.toLowerCase().replace(/[^a-z0-9가-힣]/g, "").slice(0, 80);

const allPortCodes = ports.map(([code]) => code);

const relevantSignal = /port|terminal|shipping|maritime|vessel|container|transshipment|canal|freight|logistics|trucker|truck driver|dockworker|longshore|typhoon|hurricane|storm|cyclone|flood|earthquake|tsunami|volcano|wildfire|drought|strike|labor|union|industrial action|protest|blockade|sanction|tariff|war|attack|conflict|security|geopolit|election|coup|red sea|suez|houthi|bab el.mandeb|strait/i;

const eventFamily = (title: string) => {
  if (/red sea|suez|cape of good hope|houthi|bab el.mandeb/i.test(title)
    || (/(middle east|gulf of aden)/i.test(title) && /rerout|diversion|shipping|vessel|carrier/i.test(title))) return "RED_SEA_SECURITY";
  if (/earthquake|tsunami|volcano|wildfire|flood|landslide|natural disaster/i.test(title)) return "NATURAL_DISASTER";
  if (/typhoon|hurricane|storm|weather|cyclone|monsoon|blizzard|heatwave|fog/i.test(title)) return "SEVERE_WEATHER";
  if (/strike|labor|union|industrial action|dockworker|longshore|trucker|truck driver|walkout/i.test(title)) return "LABOR_DISRUPTION";
  if (/panama canal|drought|water level|transit reservation/i.test(title)) return "PANAMA_CANAL";
  if (/sanction|tariff|election|coup|protest|blockade|politic|geopolit/i.test(title)) return "POLITICAL_DISRUPTION";
  if (/attack|war|security|conflict|piracy/i.test(title)) return "SECURITY_DISRUPTION";
  if (/closed|closure|blocked/i.test(title)) return "PORT_CLOSURE";
  if (/rerout|route change|diversion/i.test(title)) return "ROUTE_DIVERSION";
  if (/congestion|delay|disruption|transshipment/i.test(title)) return "PORT_CONGESTION";
  return `STORY:${normalizedTitle(title)}`;
};

export function koreanHeadline(title: string, portCodes: string[]) {
  if (/[가-힣]/.test(title)) return title;
  const place = portCodes.map(code => portNames[code] ?? code).join("·") || "글로벌";
  const family = eventFamily(title);
  if (family === "RED_SEA_SECURITY") return "홍해·수에즈 해역 긴장에 따른 우회 운항 확대";
  if (family === "SECURITY_DISRUPTION") return `${place} 지정학·해상 보안 리스크 확대`;
  if (family === "POLITICAL_DISRUPTION") return `${place} 정치·통상 이슈에 따른 물류 리스크`;
  if (family === "NATURAL_DISASTER") return `${place} 자연재해에 따른 항만·운송 차질`;
  if (/typhoon|hurricane|storm|weather|cyclone|monsoon|blizzard|heatwave|fog/i.test(title)) return `${place} 기상 악화에 따른 해상운송 차질`;
  if (/strike|labor|union|dockworker|longshore|trucker|truck driver|walkout/i.test(title)) return `${place} 항만·육상운송 노사 이슈`;
  if (/canal/i.test(title)) return `${place} 운하 운영 변경 및 통항 지연`;
  if (/closed|closure|blocked/i.test(title)) return `${place} 항만 폐쇄 및 운영 차질`;
  if (/rerout|route change|diversion/i.test(title)) return `${place} 항로 우회 및 운항 일정 변경`;
  if (/congestion|delay|disruption|transshipment/i.test(title)) return `${place} 항만 혼잡 및 환적 지연`;
  return `${place} 해상운송 리스크 동향`;
}

const text = (xml: string, tag: string) => {
  const value = xml.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "i"))?.[1] ?? "";
  return value.replace(/^<!\[CDATA\[|\]\]>$/g, "").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/\s+/g, " ").trim();
};

const classify = (title: string) => {
  if (/earthquake|tsunami|volcano|wildfire|flood|landslide|natural disaster/i.test(title)) return "자연재해";
  if (/typhoon|hurricane|storm|weather|cyclone|monsoon|blizzard|heatwave|fog/i.test(title)) return "기상";
  if (/strike|labor|union|industrial action|dockworker|longshore|trucker|truck driver|walkout/i.test(title)) return "노사·파업";
  if (/canal|suez|panama/i.test(title)) return "운하 운영";
  if (/sanction|tariff|election|coup|protest|blockade|politic|geopolit/i.test(title)) return "정치·통상";
  if (/attack|war|red sea|security|conflict/i.test(title)) return "지정학";
  return "항만·운송";
};

const inferAffectedPorts = (title: string, detected: string[]) => {
  if (detected.length) return detected;
  if (/red sea|suez|houthi|bab el.mandeb|middle east|gulf of aden/i.test(title)) return ["SGSIN", "AEJEA", "NLRTM"];
  if (/europe|european|north sea|uk|britain|germany|france|belgium|netherlands/i.test(title)) return ["NLRTM"];
  if (/us west coast|california|united states|u\.s\.|america|trucker|longshore/i.test(title)) return ["USLAX"];
  if (/china|east china|yangtze/i.test(title)) return ["CNSHA", "CNNGB"];
  if (/southeast asia|malacca|indonesia|malaysia/i.test(title)) return ["SGSIN"];
  if (/panama|latin america|central america/i.test(title)) return ["PAPTY", "USLAX"];
  return /shipping|maritime|canal|vessel|container|freight|logistics/i.test(title) ? allPortCodes : [];
};

const buildSummary = (event: Pick<LiveEvent, "titleKo" | "type" | "portCodes" | "sourceLinks">) => {
  const place = event.portCodes.map(code => portNames[code] ?? code).join("·") || "글로벌 항로";
  const sources = event.sourceLinks.length;
  return `${sources}개 출처를 종합하면 ${event.titleKo}에 따라 ${place} 관련 환적·운항 일정의 변동 가능성이 탐지됩니다. 현재 영향 물동과 후속 공지를 함께 모니터링해야 합니다.`;
};

export function parseNewsRss(xml: string, now = new Date()): LiveEvent[] {
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].map((match, index) => {
    const item = match[1];
    const title = text(item, "title");
    const link = text(item, "link");
    const source = text(item, "source") || "Google News";
    const sourceUrl = item.match(/<source[^>]*url=["']([^"']+)["']/i)?.[1] || link;
    const publishedAt = new Date(text(item, "pubDate"));
    const ageMinutes = Number.isNaN(publishedAt.getTime()) ? 0 : Math.max(0, Math.round((now.getTime() - publishedAt.getTime()) / 60_000));
    const portCodes = inferAffectedPorts(title, ports.filter(([, pattern]) => pattern.test(title)).map(([code]) => code));
    const severe = /closed|closure|blocked|attack|war|emergency|earthquake|tsunami|major flood|coup/i.test(title);
    const elevated = /delay|congestion|strike|storm|cyclone|flood|wildfire|protest|sanction|tariff|disruption|rerout/i.test(title);
    const official = /authority|government|port of|canal|maersk|msc|cma cgm|kuehne|nagel/i.test(source);
    const event = {
      id: 10_000 + index,
      portCodes,
      type: classify(title),
      title,
      titleKo: koreanHeadline(title, portCodes),
      summary: "",
      scope: portCodes.length ? portCodes.join("·") : "GLOBAL",
      severity: severe ? "CRITICAL" as const : elevated ? "HIGH" as const : "MEDIUM" as const,
      source,
      confidence: official ? 92 : 82,
      delay: "산출 대기",
      status: "실제" as const,
      updated: ageMinutes < 60 ? `${ageMinutes}분 전` : `${Math.floor(ageMinutes / 60)}시간 전`,
      publishedAt: Number.isNaN(publishedAt.getTime()) ? now.toISOString() : publishedAt.toISOString(),
      sourceLinks: [{ name: source, type: official ? "공식·선사 SOURCE" : "뉴스 SOURCE", observedAt: ageMinutes < 60 ? `${ageMinutes}분 전` : `${Math.floor(ageMinutes / 60)}시간 전`, url: sourceUrl }],
    };
    return { ...event, summary: buildSummary(event) };
  }).filter(event => event.title && relevantSignal.test(event.title) && event.portCodes.length > 0);
}

export function mergeLiveEvents(groups: LiveEvent[][]) {
  const severityRank = { MEDIUM: 1, HIGH: 2, CRITICAL: 3 } as const;
  const eventLocation = (event: LiveEvent) => {
    if (eventFamily(event.title) === "RED_SEA_SECURITY") return "RED_SEA_SUEZ";
    return [...event.portCodes].sort().join("+") || "GLOBAL";
  };
  const sourceKey = (source: LiveEvent["sourceLinks"][number]) => source.url || `${source.name}:${source.observedAt}`;
  const clusters: Array<LiveEvent & { clusterFamily: string; clusterLocation: string }> = [];

  for (const event of groups.flat().sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))) {
    const family = eventFamily(event.title);
    const location = eventLocation(event);
    const cluster = clusters.find(candidate => {
      return candidate.clusterFamily === family
        && candidate.clusterLocation === location;
    });

    if (!cluster) {
      clusters.push({ ...event, sourceLinks: [...event.sourceLinks], clusterFamily: family, clusterLocation: location });
      continue;
    }

    const sourceLinks = [...cluster.sourceLinks, ...event.sourceLinks]
      .filter((source, index, all) => all.findIndex(candidate => sourceKey(candidate) === sourceKey(source)) === index);
    cluster.sourceLinks = sourceLinks;
    cluster.portCodes = [...new Set([...cluster.portCodes, ...event.portCodes])];
    cluster.scope = cluster.portCodes.join("·") || "GLOBAL";
    cluster.confidence = Math.min(98, Math.max(cluster.confidence, event.confidence) + Math.min(6, (sourceLinks.length - 1) * 2));
    if (severityRank[event.severity] > severityRank[cluster.severity]) cluster.severity = event.severity;
    cluster.source = sourceLinks.length > 1 ? `${sourceLinks[0].name} + ${sourceLinks.length - 1}개 SOURCE` : sourceLinks[0]?.name ?? cluster.source;
    cluster.summary = buildSummary(cluster);
  }

  return clusters.slice(0, 20).map(({ clusterFamily: _family, clusterLocation: _location, ...event }, index) => ({
    ...event,
    summary: buildSummary(event),
    id: 10_000 + index,
  }));
}
