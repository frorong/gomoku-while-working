# 작업 중 오목 — Hermes Desktop Plugin

Hermes Desktop의 포커스된 대화가 작업 중일 때 사용할 수 있는 15×15 오목 패널이야. 상대 봇은 로컬 휴리스틱으로 동작하고, 별도의 LLM 호출은 하지 않아.

## 설치

Hermes에서 **Capabilities → Plugins → Install from Git**을 열고 `frorong/gomoku-while-working`을 입력한 뒤 Desktop 플러그인 설치를 확인해.

수동 설치라면 `plugin.js`를 다음 위치에 복사해:

```text
$HERMES_HOME/desktop-plugins/gomoku-while-working/plugin.js
```

## 동작

- 대화가 작업 중일 때 패널 표시를 요청해.
- 실제 5목·무승부가 결정되면 결과를 표시해.
- 대화 응답이 5목 완성 전에 끝나면 판을 잠그고 현재 우세만 표시해. 우세를 승리로 오인하지 않아.

## 상태

실험용이야. 현재 Hermes Desktop에서 작업 중 대화에 따른 자동 패널 열기는 아직 end-to-end로 확인되지 않았어. 패널이 자동으로 나타나지 않으면 Hermes의 패널 목록에서 **작업 중 오목**을 직접 열어야 할 수 있어.

## 보안

이 플러그인은 Hermes Desktop 안에서 실행되는 코드야. 설치 전 `plugin.js`를 검토해.
