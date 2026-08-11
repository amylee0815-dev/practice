from pathlib import Path
import math
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from moviepy import VideoClip, AudioFileClip

ROOT = Path(__file__).resolve().parent
FRAMES = ROOT / "frames"
AUDIO = ROOT / "narration-qwen3tts.wav"
OUTPUT = ROOT / "global-transshipment-control-intro-qwen.mp4"
SIZE = (1280, 720)
FPS = 24

audio = AudioFileClip(str(AUDIO))
duration = audio.duration

scene_specs = [
    ("00-overview.png", "글로벌 환적 리스크를 한눈에", (350, 80), (660, 350)),
    ("01-singapore-popup.png", "환적항을 클릭해 위험 물량 확인", (760, 260), (665, 294)),
    ("03-events.png", "외부 이벤트와 영향 물동 자동 연결", (410, 50), (395, 570)),
    ("04-event-selected.png", "클릭 한 번으로 탐지 근거와 SOURCE 확인", (400, 570), (925, 150)),
    ("05-scenario.png", "ETA·비용·SLA 기반 대안 비교", (480, 50), (620, 550)),
    ("06-performance.png", "조치 전후 성과를 지속적으로 측정", (575, 50), (1010, 545)),
]

weights = np.array([0.17, 0.15, 0.18, 0.17, 0.18, 0.15])
cuts = np.concatenate([[0], np.cumsum(weights) * duration])
imgs = [Image.open(FRAMES / s[0]).convert("RGB").resize(SIZE, Image.Resampling.LANCZOS) for s in scene_specs]

font_path = Path(r"C:\Windows\Fonts\malgunbd.ttf")
font = ImageFont.truetype(str(font_path), 31) if font_path.exists() else ImageFont.load_default()
small_font = ImageFont.truetype(str(font_path), 18) if font_path.exists() else ImageFont.load_default()
subtitle_font = ImageFont.truetype(r"C:\Windows\Fonts\malgun.ttf", 25) if font_path.exists() else ImageFont.load_default()

subtitles = [
    "글로벌 환적 컨트롤 타워를 소개합니다.",
    "전 세계 환적 화물의 지연 위험을 한눈에 파악하고\n우선 대응이 필요한 물량을 빠르게 찾도록 설계되었습니다.",
    "관제 화면에서는 7일 이상 대기 중인 B/L과 위험 등급,\n선박 위치 데이터의 신선도를 즉시 확인할 수 있습니다.",
    "세계 지도에서 환적항을 선택하면 해당 항만의 위험 물량과\n가장 긴급한 화물을 바로 확인할 수 있습니다.",
    "이벤트 탭은 뉴스, 기상, 항만 혼잡 정보를\n실제 운송 물량과 연결합니다.",
    "이벤트를 클릭하면 탐지 근거와 출처, 예상 지연, 신뢰도,\n영향받는 Shipment와 Container를 상세히 보여줍니다.",
    "시나리오 화면에서는 현재 경로 유지, 대체 환적항과 트럭,\n다음 모선, 긴급 항공 전환을 비교합니다.",
    "ETA, 비용, 서비스 수준, 잔여 위험을 기준으로 평가하며\n추천안은 의사결정을 돕는 내부 참고 아이디어로 제공됩니다.",
    "마지막 성과 화면에서는 조치 전후의 평균 지연과\n위험 비중 변화를 추적합니다.",
    "감지에서 근거 확인, 대안 비교, 성과 측정까지 연결해\n더 빠르고 일관된 물류 의사결정을 지원합니다.",
]

def ease(x):
    x = max(0.0, min(1.0, x))
    return x * x * (3 - 2 * x)

def cursor(draw, x, y, ripple=0.0):
    if ripple > 0:
        radius = 12 + 28 * ripple
        alpha = int(180 * (1-ripple))
        draw.ellipse((x-radius, y-radius, x+radius, y+radius), outline=(0, 157, 179, alpha), width=4)
    pts = [(x, y), (x+6, y+26), (x+12, y+17), (x+22, y+30), (x+28, y+24), (x+17, y+13), (x+28, y+9)]
    draw.polygon(pts, fill=(255,255,255,255), outline=(20,35,45,255))

def title_overlay(base, text, alpha):
    overlay = Image.new("RGBA", SIZE, (0,0,0,0))
    d = ImageDraw.Draw(overlay)
    box = d.textbbox((0,0), text, font=font)
    w = box[2]-box[0]
    a = int(220*alpha)
    d.rounded_rectangle((38, 625, 74+w, 691), radius=10, fill=(0,31,43,a))
    d.rectangle((38,625,45,691), fill=(0,170,190,int(255*alpha)))
    d.text((60,641), text, font=font, fill=(255,255,255,int(255*alpha)))
    d.text((1080,675), "GLOBAL TRANSSHIPMENT", font=small_font, fill=(255,255,255,int(150*alpha)))
    return Image.alpha_composite(base.convert("RGBA"), overlay)

def subtitle_overlay(base, text):
    overlay = Image.new("RGBA", SIZE, (0,0,0,0))
    d = ImageDraw.Draw(overlay)
    lines = text.split("\n")
    boxes = [d.textbbox((0,0), line, font=subtitle_font) for line in lines]
    max_w = max(b[2]-b[0] for b in boxes)
    line_h = 34
    box_h = 24 + line_h*len(lines)
    x0 = (SIZE[0]-max_w)//2 - 24
    y0 = 602-box_h
    d.rounded_rectangle((x0,y0,x0+max_w+48,602), radius=9, fill=(0,0,0,185))
    for i,line in enumerate(lines):
        w = boxes[i][2]-boxes[i][0]
        d.text(((SIZE[0]-w)//2,y0+11+i*line_h), line, font=subtitle_font,
               fill=(255,255,255,255), stroke_width=1, stroke_fill=(0,0,0,220))
    return Image.alpha_composite(base.convert("RGBA"), overlay)

def make_frame(t):
    idx = min(len(scene_specs)-1, np.searchsorted(cuts[1:], t, side="right"))
    start, end = cuts[idx], cuts[idx+1]
    p = (t-start) / max(end-start, 0.001)
    img = imgs[idx]
    zoom = 1.0 + 0.025 * ease(p)
    zw, zh = int(SIZE[0]*zoom), int(SIZE[1]*zoom)
    z = img.resize((zw,zh), Image.Resampling.LANCZOS)
    left = int((zw-SIZE[0])*(0.25+0.5*p))
    top = int((zh-SIZE[1])*(0.2+0.3*p))
    frame = z.crop((left,top,left+SIZE[0],top+SIZE[1])).convert("RGBA")

    # Cross-fade into the next scene.
    if p > 0.93 and idx < len(imgs)-1:
        q = ease((p-0.93)/0.07)
        frame = Image.blend(frame, imgs[idx+1].convert("RGBA"), q)

    fade = min(1.0, p/0.10, (1-p)/0.08)
    frame = title_overlay(frame, scene_specs[idx][1], fade)
    subtitle_idx = min(len(subtitles)-1, int((t/duration)*len(subtitles)))
    frame = subtitle_overlay(frame, subtitles[subtitle_idx])
    d = ImageDraw.Draw(frame)
    sx, sy = scene_specs[idx][2]
    tx, ty = scene_specs[idx][3]
    # Reach the target quickly, then pause so the click and resulting state are legible.
    m = ease(min(1.0, p/0.24))
    x = sx+(tx-sx)*m
    y = sy+(ty-sy)*m
    click_phase = (p-0.27)/0.14
    ripple = click_phase if 0 <= click_phase <= 1 else 0
    cursor(d, x, y, ripple)
    return np.asarray(frame.convert("RGB"))

clip = VideoClip(make_frame, duration=duration).with_audio(audio)
clip.write_videofile(
    str(OUTPUT), fps=FPS, codec="libx264", audio_codec="aac",
    bitrate="4000k", preset="medium", threads=4, logger="bar"
)
clip.close()
audio.close()
print(OUTPUT)
