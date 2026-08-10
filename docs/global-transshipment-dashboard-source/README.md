# 글로벌 환적 리스크 관제 대시보드 소스

현재 배포된 대시보드를 다른 컴퓨터에서 내려받아 수정·확장할 수 있도록 정리한 편집용 소스입니다.

## 포함 기능

- 관제, 외부 리스크 분석, 대체 경로 비교, 개선 추이 탭
- 생산법인·환적항·대기일수·B/L·컨테이너 복수 필터
- 필터 결과 기준 Raw Data CSV 다운로드
- 지도 확대·축소·이동 및 항만 복수 선택/재선택 해제
- 항만별 영향 물동 및 우선조치 큐
- 뉴스 RSS 수집과 데모 이벤트 병합
- A1~A5 데모 에이전트 실행 API
- 필터 및 이벤트 처리 단위 테스트

## 다른 컴퓨터에서 실행

필수 환경: Node.js 22.13 이상, Git

```bash
git clone https://github.com/amylee0815-dev/practice.git
cd practice/docs/global-transshipment-dashboard-source
npm install
npm run dev
```

터미널에 표시되는 로컬 주소를 브라우저에서 열면 됩니다. 배포 전에는 다음 명령으로 빌드를 확인하세요.

```bash
npm run build
node --test tests/dashboard-filtering.test.ts tests/event-feed.test.ts
```

## 주로 수정할 파일

| 파일 | 역할 |
|---|---|
| `app/page.tsx` | 화면, 탭, 지도, 필터, 다운로드 동작 |
| `app/globals.css` | 전체 디자인과 반응형 스타일 |
| `app/dashboard-data.ts` | 데모 물동 데이터, 위험 등급, 필터 규칙 |
| `app/event-feed.ts` | 뉴스 정규화, 중복 제거, 이벤트 점수화 |
| `app/api/events/route.ts` | 외부 뉴스 RSS 수집 API |
| `app/api/agents/run/route.ts` | A1~A5 에이전트 데모 실행 API |

## 위험 등급 기준

- 7일 미만: 기타/정상
- 7일 이상 14일 미만: Medium
- 14일 이상 21일 미만: High
- 21일 이상: Critical
- KPI Fail: 특정 환적항에서 7일 이상 대기하는 물량

환적항과 대기일수 조건은 같은 TS 단계에서 동시에 일치해야 합니다. 지도에서 고른 항만은 관제 탭에만 적용되고, 상단 글로벌 필터는 모든 탭에 적용됩니다.

## 실데이터 연결 위치

현재 저장소의 물동·AIS·에이전트 응답 일부는 데모 데이터입니다.

- Cello 물동 데이터: `app/dashboard-data.ts`의 `demoShipments`를 API 응답으로 교체
- AIS: 선박 MMSI 기준 위치 API를 추가하고 `app/page.tsx`의 선박 표시 데이터와 연결
- 뉴스: `app/api/events/route.ts`의 `feeds` 배열에 허용된 RSS/API 추가
- 주간 성과: 날짜별 스냅샷 저장소를 연결해 DEMO 추정값을 실제 일주일 전 값으로 교체

API 키는 소스에 직접 쓰지 말고 로컬 `.env.local`에 저장하세요. `.env*`는 Git에서 제외되어 있습니다. 배포 플랫폼의 환경변수에도 같은 이름으로 등록해야 합니다.

```env
AISSTREAM_API_KEY=replace_with_your_key
```

## 저장소에 포함하지 않은 파일

- `node_modules`, `dist`, `.wrangler`: 설치·빌드 시 자동 생성
- 기존 Sites 프로젝트 ID: 다른 환경에서 실수로 기존 배포를 덮어쓰지 않도록 제외
- 데모 XLSX와 소셜 미리보기 PNG: 실행에 필수인 소스가 아니므로 제외

항만 팝업의 과거 XLSX 링크는 데모 자료용입니다. 실제 운영에서는 현재 글로벌 필터 기반 `Raw Data ↓` 다운로드 또는 서버 측 Excel 생성 API로 통합하는 것을 권장합니다.
