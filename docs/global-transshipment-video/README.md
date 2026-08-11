# Global Transshipment Control Tower 소개 영상

글로벌 환적 지연·리스크 관제 대시보드를 약 75초로 소개하는 영상입니다.

## 결과물

- `global-transshipment-control-intro-qwen.mp4`: 1280×720, 24fps, 한국어 자막·나레이션 포함
- `narration-qwen3tts.wav`: Qwen3-TTS Voice Design으로 생성한 한국어 나레이션
- `frames/`: 실제 대시보드 조작 과정에서 캡처한 장면
- `render_video.py`: 화면 전환, 빠른 마우스 커서, 클릭 효과, 자막 및 음성 합성 코드
- `verify_media.py`: 영상 길이, 해상도, FPS, 오디오 포함 여부 검증 코드

대시보드: <https://global-transshipment-control.kpc45.chatgpt.site>

## 다시 렌더링하기

Python 3.10 이상에서 실행합니다.

```bash
pip install -r requirements.txt
python render_video.py
python verify_media.py
```

최종 검증값은 74.88초, 1280×720, 24fps이며 오디오가 포함되어 있습니다.

