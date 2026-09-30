# 작업 중 오목 — Hermes Desktop Plugin

Hermes Desktop에서 포커스된 대화가 작업 중일 때 표시되는 15×15 오목 패널이야. 상대 봇은 로컬 휴리스틱으로 동작하고 별도 LLM 호출은 하지 않아.

## 설치

Hermes에서 **Capabilities → Plugins → Install from Git**을 열고 `frorong/gomoku-while-working`을 입력한 뒤 Desktop 플러그인 설치를 확인해.

수동 설치라면 `plugin.js`를 다음 위치에 복사해:

```text
$HERMES_HOME/desktop-plugins/gomoku-while-working/plugin.js
```

## 기능

- 대화가 작업 중이면 패널을 표시하고, 에이전트 작업이 끝나면 패널을 닫아.
- 패널에 **다시하기** 버튼이 항상 보여. 에이전트가 작업 중이면 진행 중인 판도 새로 시작할 수 있어.
- 난이도는 **어려움·매우 어려움·극악**으로 제공돼. 기본값은 어려움이고, 기존 쉬움·보통 저장값도 어려움으로 올라가. 매우 어려움은 2수, 극악은 3수 앞까지 후보를 탐색해.
- 완료된 승리·패배·무승부를 플러그인 로컬 저장소에 기록해. 우상단에 전적과 승률을 보여주고, 승률은 무승부를 제외한 승·패 기준이야.
- 응답이 5목 완성 전에 끝나면 승패를 만들지 않고 판을 끝내.

## Hermes Desktop 호환성

자동 닫기에는 Desktop Plugin SDK의 `host.dismissPane` 지원이 필요해. 이 SDK API가 없는 구버전에서는 경고를 띄우고 패널 자동 닫기는 작동하지 않아. SDK API가 포함된 Hermes Desktop 빌드에서 사용해.

## 보안

이 플러그인은 Hermes Desktop 안에서 실행되는 코드야. 설치 전 `plugin.js`를 검토해.
