# 글로벌 환적 지연 리스크 관제 대시보드 기술세부문서 v2.2

## 1. 문서 정보

| 항목 | 내용 |
|---|---|
| 제품명 | Global Transshipment Control Tower |
| 문서 유형 | 기술세부문서 |
| 버전 | v2.2 |
| 기준일 | 2026-08-03 |
| 기준 PRD | 글로벌 환적 리스크 관제 대시보드 PRD v2.2 |
| 배포 URL | <https://global-transshipment-control.kpc45.chatgpt.site> |
| 대상 독자 | 프론트엔드·백엔드·데이터·QA·운영·보안 담당자 |
| 현재 데이터 상태 | DEMO DATA |

### 1.1 목적

본 문서는 대시보드 v2.2에 구현된 다단계 환적 데이터 모델, 전역 필터, 위험등급 계산, 지도·이벤트·멀티에이전트 연계 및 Excel Raw Data 계약을 정의한다. 실제 물동과 외부 API를 연결할 때에도 동일한 판정 규칙과 화면 계약을 유지하는 것을 목표로 한다.

### 1.2 구현 원칙

1. 환적 대기는 Shipment 전체가 아니라 TS1, TS2, TS3 등 개별 환적 단계에서 계산한다.
2. 환적항과 대기구간 조건은 반드시 동일한 TS 단계에서 일치해야 한다.
3. 예정 단계도 예측 대기일수를 이용하여 경보와 KPI에 포함한다.
4. 같은 필드의 복수 값은 OR, 서로 다른 필드는 AND로 결합한다.
5. KPI 집계 시 한 B/L의 여러 단계가 중복 집계되지 않도록 최악 등급을 대표값으로 사용한다.
6. 원본, 실제, 예측 데이터를 명시적으로 구분한다.
7. API 키와 인증정보는 클라이언트 코드나 Git 저장소에 기록하지 않는다.

## 2. 기술 스택과 배포 구조

| 계층 | 현재 구현 |
|---|---|
| UI | React 19, Next.js App Router |
| 지도 | D3 Geo, TopoJSON, World Atlas |
| 스타일 | CSS 기반 반응형 대시보드 |
| API | Next.js Route Handler |
| 빌드 | Vinext, Vite |
| 배포 | OpenAI Sites / Cloudflare 기반 런타임 |
| Excel | XLSX 정적 산출물, `@oai/artifact-tool` 생성 |
| 데이터 | 프론트엔드 내 정규화된 DEMO DATA |

```text
Browser
  ├─ Global Filter
  ├─ KPI / Map / Event TOP5 / Impact / Action Queue
  ├─ Multi-Agent Run API
  └─ XLSX Download
          │
          ▼
Next.js Application
  ├─ Dashboard Data & TS-stage Rules
  ├─ Client-side Aggregation
  └─ POST /api/agents/run
          │
          ▼
Sites Runtime
```

현재 버전은 기능 검증용 데모 구조다. 실제 운영 전에는 Shipment 원장, 환적 계획, AIS, 뉴스·기상 및 선사 메일을 서버 측 수집·정규화 계층으로 이전해야 한다.

## 3. 핵심 데이터 모델

### 3.1 Shipment

```ts
type ShipmentRecord = {
  shipmentNo: string;
  blNo: string;
  containerNos: string[];
  corporation: string;
  route: string;
  valueUsd: number;
  stages: TransshipmentStage[];
};
```

| 필드 | 설명 | 필수 |
|---|---|---|
| `shipmentNo` | 내부 Shipment 식별자 | Y |
| `blNo` | B/L 번호 | Y |
| `containerNos` | Container 번호 배열 | Y |
| `corporation` | 생산법인 | Y |
| `route` | 전체 운송 경로 표시값 | Y |
| `valueUsd` | 화물가액. 현재 조치 우선순위 참고용 | N |
| `stages` | 순서가 있는 환적 단계 배열 | Y |

### 3.2 Transshipment Stage

```ts
type TransshipmentStage = {
  sequence: number;
  portCode: string;
  dwellDays: number;
  status: "COMPLETED" | "CURRENT" | "PLANNED";
  dataStatus: "ACTUAL" | "PREDICTED";
  vessel: string;
  mmsi: string;
};
```

| 필드 | 설명 |
|---|---|
| `sequence` | 환적 순서. 화면과 Raw Data에서 `TS1`, `TS2` 형식으로 표시 |
| `portCode` | UN/LOCODE 기반 환적항 코드 |
| `dwellDays` | 실제 또는 예측 환적 대기일수 |
| `status` | 완료, 현재 진행 또는 예정 단계 |
| `dataStatus` | 실측·원장 기반 `ACTUAL` 또는 예측 기반 `PREDICTED` |
| `vessel` | 해당 단계 선박명 |
| `mmsi` | AIS 선박 식별번호 |

### 3.3 상태 규칙

| TS 상태 | 데이터 상태 | 경보 포함 | 설명 |
|---|---|---|---|
| `COMPLETED` | `ACTUAL` | Y | 완료된 단계의 실제 대기 |
| `CURRENT` | `ACTUAL` | Y | 현재 환적항에서 진행 중인 대기 |
| `PLANNED` | `PREDICTED` | Y | 예정 환적항의 예측 대기 |

운영 데이터에서는 `dwellDays`, `dataStatus`, 예측모델 버전, 계산시각 및 신뢰도를 함께 저장해야 한다.

## 4. 위험등급과 KPI 계산

### 4.1 위험등급 함수

```text
0 ≤ dwellDays < 7   → UNDER7 / KPI PASS
7 ≤ dwellDays < 14  → MEDIUM / KPI FAIL
14 ≤ dwellDays < 21 → HIGH / KPI FAIL
21 ≤ dwellDays      → CRITICAL / KPI FAIL
```

경계값은 각각 7.0일, 14.0일, 21.0일부터 상위 구간에 포함한다.

### 4.2 B/L 대표 등급

하나의 B/L에 여러 TS 단계가 있으면 현재 필터 범위에 포함된 단계 중 최악 등급을 B/L 대표 등급으로 사용한다.

```text
CRITICAL 존재 → CRITICAL 1건
그 외 HIGH 존재 → HIGH 1건
그 외 MEDIUM 존재 → MEDIUM 1건
그 외 → KPI PASS
```

따라서 다음 식이 성립해야 한다.

```text
KPI FAIL B/L = MEDIUM B/L + HIGH B/L + CRITICAL B/L
```

## 5. 전역 복수 필터

### 5.1 필터 항목

| 필터 | 값 | 선택 방식 |
|---|---|---|
| 생산법인 | Shipment의 `corporation` | 복수 선택 |
| 환적항 | TS 단계의 `portCode` | 복수 선택 |
| 환적 대기 일수 | UNDER7, MEDIUM, HIGH, CRITICAL | 복수 선택 |
| B/L 번호 | Shipment의 `blNo` | 복수 선택 |
| Container 번호 | `containerNos`의 원소 | 복수 선택 |

### 5.2 논리 결합

- 동일 필드의 선택값: OR
- 서로 다른 필드: AND
- 선택값이 없는 필드: 전체 허용

```text
ShipmentMatch =
  CorporationMatch
  AND BLMatch
  AND ContainerMatch
  AND EXISTS(StageMatch)

StageMatch =
  PortMatch
  AND DwellBandMatch
```

### 5.3 동일 TS 단계 매칭

환적항과 대기구간이 동시에 선택되면 하나의 동일한 TS 단계가 두 조건을 모두 충족해야 한다.

예시:

```text
SHP-2048
  TS1 Singapore  5일
  TS2 Rotterdam 22일
```

- `Singapore + 21일 이상`: 미포함
- `Rotterdam + 21일 이상`: 포함
- 환적항 미선택 + `21일 이상`: 포함, Rotterdam을 결과 항만으로 표시

### 5.4 전역 반영 범위

필터 결과는 다음 화면과 처리에 동시에 반영된다.

1. KPI 카드
2. 글로벌 환적 위험망
3. 확대 시 AIS 연계 Shipment 선박
4. 우선조치 큐
5. 이벤트·뉴스 TOP5
6. 선택 이벤트 영향물동
7. 멀티에이전트 실행 범위

필터가 변경되면 이전 멀티에이전트 결과는 초기화하여 과거 범위의 분석 결과가 현재 범위처럼 보이지 않게 한다.

## 6. 화면별 처리 계약

### 6.1 KPI

| KPI | 집계 단위 | 계산 |
|---|---|---|
| KPI FAIL | 고유 B/L | 대표 등급이 MEDIUM 이상 |
| MEDIUM | 고유 B/L | 최악 단계가 7일 이상 14일 미만 |
| HIGH | 고유 B/L | 최악 단계가 14일 이상 21일 미만 |
| CRITICAL | 고유 B/L | 21일 이상 단계 존재 |
| AIS 신선도 | 위치 메시지 | 기준 시간창 내 최신 위치 비율 |

### 6.2 글로벌 환적 위험망

항만별로 필터에 포함된 관련 TS 단계를 집계한다.

| 항목 | 계산 |
|---|---|
| 최대 대기 | 해당 항만 관련 단계의 `MAX(dwellDays)` |
| 평균 대기 | 해당 항만 관련 단계의 `AVG(dwellDays)` |
| 7일 이상 B/L | 실패 단계와 연결된 고유 B/L 수 |
| 7일 이상 Container | 실패 단계와 연결된 고유 Container 수 |
| 항만 색상 | 최대 대기의 위험등급 기준 |

싱가포르, 상해, 닝보, 파나마는 결과가 0이어도 상시 표시한다. 위험이 없거나 7일 미만이면 초록색으로 표시한다. 나머지 항만의 결과가 없으면 비활성 상태로 표시할 수 있다.

지도는 다음 상호작용을 지원한다.

- 마우스 휠 및 `+`, `-` 버튼 확대·축소
- 포인터 드래그 이동
- 항만 클릭 시 중심 이동과 확대
- 항만 Hover 시 요약 팝업
- 확대 배율 2배 이상에서 필터 대상 Shipment 선박 표시

### 6.3 이벤트·뉴스 TOP5

이벤트는 하나 이상의 관련 항만 코드를 가진다.

```ts
type DashboardEvent = {
  id: number;
  portCodes: string[];
  title: string;
  type: string;
  severity: "MEDIUM" | "HIGH" | "CRITICAL";
  confidence: number;
  source: string;
};
```

처리 순서:

1. 전역 필터를 Shipment와 TS 단계에 적용한다.
2. 이벤트 관련 항만과 일치하는 TS 단계가 있는 Shipment를 찾는다.
3. 일치 물동이 없는 이벤트는 제외한다.
4. 영향 Container 수와 신뢰도를 기준으로 재정렬한다.
5. 상위 5건만 표시한다.
6. 이벤트 클릭 시 근거 SOURCE 링크 팝업을 연다.

운영 버전에서는 뉴스, 공식 기상 경보, 선사 공유메일 및 myKN News를 수집한 뒤 중복 제거, 이벤트 군집화, 항만·시간창·항로 매칭을 수행한다.

### 6.4 영향물동 요약

선택 이벤트 기준으로 다음 값을 재계산한다.

- Shipment 수
- 고유 Container 수
- 고유 B/L 수
- 영향 생산법인 수
- 예정 TS 단계 수
- Shipment 위험등급 구성비
- Container 위험등급 구성비

중량과 TEU는 v2.2 영향요약의 필수 지표에서 제외한다.

### 6.5 우선조치 큐

필터 범위에서 7일 이상인 TS 단계만 대상으로 한다. Shipment별 최악 단계를 대표 조치로 만들고 대기일수 내림차순으로 정렬한다. 예정 단계는 항만명 옆에 `TSn 예정`으로 표시한다.

## 7. 멀티에이전트 API

### 7.1 Endpoint

```http
POST /api/agents/run
Content-Type: application/json
```

### 7.2 요청

```json
{
  "scope": {
    "shipments": 18,
    "events": 5,
    "criticalQueue": 4,
    "confirmedImpact": 8,
    "reviewLinks": 3,
    "approvalPending": 15
  }
}
```

`scope`는 현재 전역 필터로 계산된 범위다. 서버는 이 범위를 A1~A5 결과 요약에 사용한다.

### 7.3 응답 핵심 필드

```json
{
  "runId": "RUN-...",
  "mode": "SYNTHETIC",
  "orchestratorStatus": "COMPLETED",
  "agents": [],
  "metrics": {
    "shipments": 18,
    "events": 5,
    "criticalQueue": 4,
    "confirmedImpact": 8,
    "reviewLinks": 3,
    "approvalPending": 15
  }
}
```

현재 API는 합성 실행 결과를 반환한다. 운영 전환 시 A1~A5 작업은 비동기 Job으로 실행하고 `runId` 기반 상태조회 및 감사로그를 추가해야 한다.

## 8. Excel Raw Data 계약

### 8.1 제공 파일

- 전체 환적 데이터 파일
- 항만별 관련 Shipment 파일

항만별 파일은 선택 항만 단계만 내보내는 것이 아니라, 해당 항만과 연결된 Shipment의 모든 TS 단계를 포함한다. 이를 통해 TS1에서 TS3까지 전체 환적 맥락을 확인할 수 있다.

### 8.2 Raw Data 컬럼

| 순서 | 컬럼 | 설명 |
|---:|---|---|
| 1 | Snapshot Date | 데이터 기준일 |
| 2 | Data Status | DEMO·ACTUAL 또는 DEMO·PREDICTED |
| 3 | Production Corporation | 생산법인 |
| 4 | Shipment No. | Shipment 번호 |
| 5 | B/L No. | B/L 번호 |
| 6 | Container No. | Container 번호 |
| 7 | TS Sequence | TS1, TS2, TS3 등 |
| 8 | TS Status | COMPLETED, CURRENT, PLANNED |
| 9 | Port Code | 환적항 코드 |
| 10 | Port Name | 환적항명 |
| 11 | Dwell Days | 실제 또는 예측 대기일수 |
| 12 | Risk Level | UNDER 7 DAYS, MEDIUM, HIGH, CRITICAL |
| 13 | Selected Port Match | 항만별 파일의 기준 항만 일치 여부 |
| 14 | Vessel Name | 선박명 |
| 15 | MMSI | AIS 식별번호 |
| 16 | Route | 전체 경로 |

Raw Data는 Container × TS 단계의 Long Format을 사용한다. 동일 Shipment에 Container가 2개이고 TS 단계가 3개이면 6행이 생성된다.

### 8.3 Summary 시트

다음 항목을 제공한다.

- 데이터 상태와 기준일
- 파일 범위
- 고유 Shipment, B/L, Container 수
- TS 단계-Container 행 수
- 예측 행 수
- 위험등급 정책
- 필터 결합 규칙
- DEMO DATA 경고

## 9. 실제 데이터 및 외부 API 연계

### 9.1 권장 서버 측 파이프라인

```text
Cello Shipment ───┐
Carrier Schedule ─┼─> Canonical Shipment/TS Store
AIS Stream ───────┘               │
                                  ├─> Dwell Prediction
News/Weather/Mail/myKN ─> Event Store ─> Event Matching
                                  │
                                  └─> KPI / Map / Alert / Export API
```

### 9.2 필요한 운영 API

| Method | Endpoint | 용도 |
|---|---|---|
| GET | `/api/shipments` | 필터 조건별 Shipment 조회 |
| GET | `/api/ports/risks` | 항만별 위험 집계 |
| GET | `/api/events/top` | 필터 범위 이벤트 TOP5 |
| GET | `/api/events/{id}/impact` | 선택 이벤트 영향물동 |
| GET | `/api/vessels` | AIS 기반 대상 선박 위치 |
| POST | `/api/exports/xlsx` | 현재 필터 범위 Excel 생성 |
| POST | `/api/agents/run` | 멀티에이전트 실행 |
| GET | `/api/agents/runs/{runId}` | 비동기 실행 상태조회 |

### 9.3 AIS 연계 주의사항

- AIS API 키는 서버 런타임 Secret으로 저장한다.
- 브라우저에서 AIS 공급자 WebSocket으로 직접 연결하지 않는다.
- MMSI와 Shipment의 선박 연결 이력을 시간 유효구간과 함께 저장한다.
- 오래된 위치는 신선도 기준을 넘으면 `STALE`로 표시한다.
- AIS 단절이 환적 원장과 예정 단계 계산을 중단시키지 않도록 격리한다.

## 10. 보안 및 권한

1. API 키, 메일 인증정보 및 토큰은 환경변수 Secret으로 관리한다.
2. B/L과 Container 번호는 사용자 역할에 따라 마스킹할 수 있어야 한다.
3. Excel 다운로드는 화면 조회와 별도의 Export 권한을 적용한다.
4. 이벤트 원문 링크는 `https` allowlist와 URL 검증을 거친다.
5. 선사 메일 수집 시 본문과 첨부파일의 개인정보를 제거한다.
6. 필터, 조회, 다운로드 및 Agent 실행 행위를 감사로그로 저장한다.
7. 공개 배포에는 실제 물동이나 비밀정보를 포함하지 않는다.

## 11. 성능 및 운영 요구사항

| 항목 | MVP 목표 |
|---|---:|
| 필터 적용 응답 | P95 2초 이하 |
| 지도 항만 집계 | P95 2초 이하 |
| 이벤트 TOP5 | P95 3초 이하 |
| AIS 위치 신선도 | 주요 선박 5분 이내 |
| Excel 생성 | 10만 행 기준 30초 이하 |
| API 가용성 | 월 99.5% 이상 |

대량 데이터에서는 브라우저 전체 재집계를 피하고 서버 집계, 페이지네이션, 캐시 및 비동기 Excel Job을 사용한다.

## 12. 테스트 및 인수 기준

### 12.1 필수 기능 테스트

1. 다섯 필터가 모두 복수 선택된다.
2. 동일 필드 복수 값은 OR로 처리된다.
3. 다른 필드는 AND로 처리된다.
4. 환적항과 대기구간은 같은 TS 단계에서 일치한다.
5. 환적항 없이 `21일 이상`만 선택하면 조건을 만족하는 모든 환적항이 표시된다.
6. `PLANNED` 단계가 예측값으로 KPI와 경보에 포함된다.
7. B/L별 최악 등급 집계로 위험등급 합계가 KPI FAIL과 일치한다.
8. 필터 변경이 지도, 이벤트, 영향요약, 조치 큐 및 Agent 범위에 반영된다.
9. 상시 표시 항만의 결과가 0이면 정상 또는 비활성 상태로 보인다.
10. 이벤트 클릭 시 등록된 SOURCE 링크 팝업이 열린다.
11. 항만별 Excel에서 관련 Shipment의 모든 TS 단계가 확인된다.

### 12.2 기준 시나리오

```text
입력 Shipment
  TS1 Singapore  5일  COMPLETED / ACTUAL
  TS2 Rotterdam 22일  CURRENT   / ACTUAL

검증
  Singapore + Critical  → 0건
  Rotterdam + Critical  → 1건
  환적항 없음 + Critical → 1건, Rotterdam 표시
```

### 12.3 배포 전 품질 게이트

- TypeScript 및 ESLint 오류 0건
- 프로덕션 빌드 성공
- 위험 경계값 단위 테스트 성공
- 동일 TS 단계 필터 테스트 성공
- Agent API 필터 범위 전달 테스트 성공
- Excel 수식 오류 검색 결과 0건
- Summary 및 Raw Data 렌더링 육안 검수 완료
- API 키와 비밀정보 저장소 유입 검사 완료

## 13. 현재 한계와 다음 단계

### 현재 한계

- 물동과 환적 대기 데이터는 데모 데이터다.
- AIS 지도는 실제 연결을 위한 UI와 식별자 구조를 시연한다.
- 이벤트 자동매칭과 Agent 실행은 운영 파이프라인이 아닌 합성 결과다.
- 다운로드 파일은 사전 생성된 전체·항만별 XLSX이며 현재 선택 필터의 동적 파일은 아니다.

### 다음 단계

1. Cello 시스템에서 Shipment, B/L, Container 및 TS 계획을 수집한다.
2. 실제·예정 대기일수 산식과 예측모델을 정의한다.
3. AIS 서버 프록시와 Shipment–MMSI 시간 이력 테이블을 구축한다.
4. 뉴스·기상·선사 메일·myKN 수집과 이벤트 군집화를 운영화한다.
5. 현재 필터 조건을 서버 Export Job에 전달하여 동적 Excel을 제공한다.
6. SSO, 역할 기반 권한, 다운로드 권한 및 감사로그를 적용한다.
7. A1~A5를 비동기 실행하고 센싱 인사이트를 대시보드에 반영한다.

---

본 문서는 v2.2 공개 데모의 실제 구현 계약을 기준으로 작성되었다. 운영 적용 시 데이터 소유자, 보안 담당자 및 물류 운영팀과 적용 범위를 확인한다.
