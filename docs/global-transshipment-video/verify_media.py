from pathlib import Path
from moviepy import VideoFileClip

path = Path(__file__).resolve().parent / "global-transshipment-control-intro-qwen.mp4"
clip = VideoFileClip(str(path))
print({
    "duration_seconds": round(clip.duration, 2),
    "size": list(clip.size),
    "fps": clip.fps,
    "has_audio": clip.audio is not None,
    "bytes": path.stat().st_size,
})
clip.close()
