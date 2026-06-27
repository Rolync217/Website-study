#!/usr/bin/env python3
"""
Composite two sets of scroll-capture frames into a side-by-side MP4.
Left panel = before, right panel = after. Both synced by frame number.

Usage:
  python3 composite.py <before-dir> <after-dir> <output.mp4>
  python3 composite.py <before-dir> <after-dir> <output.mp4> --fps=30 --label-left="BEFORE" --label-right="AFTER"

Requirements: Pillow + ffmpeg (both installed by setup.sh)
"""

import sys
import os
import subprocess
import tempfile
import argparse
from PIL import Image, ImageDraw, ImageFont

def parse_args():
    p = argparse.ArgumentParser()
    p.add_argument('before_dir')
    p.add_argument('after_dir')
    p.add_argument('output')
    p.add_argument('--fps',         type=int, default=30)
    p.add_argument('--label-left',  default='BEFORE')
    p.add_argument('--label-right', default='AFTER')
    p.add_argument('--width',       type=int, default=1152, help='Width of each panel')
    p.add_argument('--height',      type=int, default=720,  help='Height of each panel')
    return p.parse_args()

def make_label(text, bg_rgba, size=(220, 52), font_size=28):
    """Render a pill-shaped label as a PNG in a temp file."""
    img = Image.new('RGBA', size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    draw.rounded_rectangle([0, 0, size[0]-1, size[1]-1], radius=14, fill=bg_rgba)

    # Try system font, fall back to default
    try:
        font = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial Bold.ttf', font_size)
    except Exception:
        try:
            font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', font_size)
        except Exception:
            font = ImageFont.load_default()

    bbox = draw.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    x = (size[0] - tw) // 2 - bbox[0]
    y = (size[1] - th) // 2 - bbox[1]
    draw.text((x, y), text, font=font, fill=(255, 255, 255, 255))

    tmp = tempfile.NamedTemporaryFile(suffix='.png', delete=False)
    img.save(tmp.name)
    return tmp.name

def count_frames(directory):
    return len([f for f in os.listdir(directory) if f.startswith('f') and f.endswith('.png')])

def main():
    args = parse_args()

    n_before = count_frames(args.before_dir)
    n_after  = count_frames(args.after_dir)

    if n_before == 0 or n_after == 0:
        print(f'ERROR: frames not found. before={n_before} after={n_after}')
        sys.exit(1)

    n_frames = min(n_before, n_after)
    if n_before != n_after:
        print(f'Warning: frame counts differ ({n_before} vs {n_after}). Using {n_frames}.')

    print(f'Compositing {n_frames} frames @ {args.fps}fps → {args.output}')

    # Labels: dark gray for before, cobalt blue for after
    label_before = make_label(args.label_left,  (30, 30, 30, 200))
    label_after  = make_label(args.label_right, (29, 78, 216, 235))

    # ffmpeg: scale each panel, overlay label chip, hstack
    filter_complex = (
        f'[0:v]scale={args.width}:{args.height}[l0];'
        f'[l0][2:v]overlay=24:24[l];'
        f'[1:v]scale={args.width}:{args.height}[r0];'
        f'[r0][3:v]overlay=24:24[r];'
        f'[l][r]hstack=inputs=2[v]'
    )

    cmd = [
        'ffmpeg', '-y', '-loglevel', 'error',
        '-framerate', str(args.fps), '-i', os.path.join(args.before_dir, 'f%04d.png'),
        '-framerate', str(args.fps), '-i', os.path.join(args.after_dir,  'f%04d.png'),
        '-loop', '1', '-i', label_before,
        '-loop', '1', '-i', label_after,
        '-filter_complex', filter_complex,
        '-map', '[v]',
        '-r', str(args.fps),
        '-frames:v', str(n_frames),
        '-pix_fmt', 'yuv420p',
        '-movflags', '+faststart',
        args.output,
    ]

    subprocess.run(cmd, check=True)

    # Cleanup temp label files
    os.unlink(label_before)
    os.unlink(label_after)

    size_mb = os.path.getsize(args.output) / 1_000_000
    duration = n_frames / args.fps
    print(f'Done. {args.output} ({size_mb:.1f}MB, {duration:.1f}s)')

if __name__ == '__main__':
    main()
