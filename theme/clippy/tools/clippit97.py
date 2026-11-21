"""Build WebP clips from the Microsoft Office 97 Clippit.act, not an Agent ACS."""

import argparse
import json
import pathlib
import random
import struct

from PIL import Image, ImageDraw

CLIPS = {
    "idle": 1,    # Original idling and blinking
    "plan": 4,    # Glances up and thinks
    "read": 13,   # Unfolds a document
    "edit": 22,   # Pulls out a notepad
    "check": 26,  # Looks back and forth
    "wrap": 12,   # Straightens up
    "ask": 11,    # Leans toward the user
    "done": 102,  # Turns into a star
}
REST = 526
# Render the original layers into a slightly smaller bitmap than the 88x66
# display size. The dock uses nearest-neighbor scaling, not lossy compression.
BITMAP = (80, 60)


def parse_actor(data):
    if data[:6] != b"LP\x02\x00\x02\x00":
        raise ValueError("Expected the Office 97 Actor pack")
    start, end = struct.unpack_from("<II", data, 10)
    data = data[start:end]
    width, height = struct.unpack_from("<hh", data, 8)
    payload, index, riff, _, anim, anim_index, strings = struct.unpack_from("<7I", data, 0x26)
    offsets = list(struct.iter_unpack("<I", data[index:riff]))
    pieces, poses = {}, {}
    for i, (a, b) in enumerate(zip(offsets, offsets[1:])):
        blob = data[payload + a[0]:payload + b[0]]
        if blob.startswith(b"\xd7\xcd\xc6\x9a"):
            pieces[i] = len(pieces)
        else:
            count = struct.unpack_from("<H", blob, 2)[0]
            poses[i] = list(struct.iter_unpack("<Hhhhh", blob[4:4 + 10 * count]))
    groups = {}
    count = struct.unpack_from("<I", data, anim_index)[0]
    group_start = anim_index + 4
    for group, size, first in struct.iter_unpack("<HHH", data[group_start:group_start + count * 6]):
        offset = group_start + (count + first) * 6
        entries = data[offset:offset + size * 6]
        groups[group] = []
        for position, length in struct.iter_unpack("<IH", entries):
            if anim + position + length > strings:
                raise ValueError("Animation exceeds its section")
            blob = data[anim + position:anim + position + length]
            commands = struct.unpack_from("<H", blob, 2)[0]
            groups[group].append(list(struct.iter_unpack("<HHH", blob[4:4 + commands * 6])))
    return width, height, pieces, poses, groups


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("act", type=pathlib.Path)
    parser.add_argument("frames", type=pathlib.Path)
    parser.add_argument("output", type=pathlib.Path)
    parser.add_argument("--inspect", action="store_true")
    args = parser.parse_args()
    w, h, ids, poses, groups = parse_actor(args.act.read_bytes())
    args.output.mkdir(parents=True, exist_ok=True)
    images = {i: Image.open(args.frames / f"{index:03}.png").convert("RGBA") for i, index in ids.items()}

    def pose(frame):
        scale = 1 / 20
        image = Image.new("RGBA", (round(w * scale), round(h * scale)))
        for part, left, top, right, bottom in poses[frame]:
            x1, y1, x2, y2 = (round(v * scale) for v in (left, top, right, bottom))
            if x1 == x2 or y1 == y2:
                continue
            layer = images[part].resize((abs(x2-x1), abs(y2-y1)), Image.Resampling.LANCZOS)
            if x1 > x2:
                layer = layer.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
            if y1 > y2:
                layer = layer.transpose(Image.Transpose.FLIP_TOP_BOTTOM)
            image.alpha_composite(layer, (min(x1, x2), min(y1, y2)))
        return image

    def display_frame(frame):
        return pose(frame).resize(BITMAP, Image.Resampling.LANCZOS)

    if args.inspect:
        print(json.dumps({g: [[(p, ms) for op, p, ms in entry if op == 0] for entry in v] for g, v in groups.items()}))
        for g, entries in groups.items():
            previews = []
            labels = []
            for i, entry in enumerate(entries):
                frames = list(dict.fromkeys(p for cmd, p, duration in entry if cmd == 0 and duration > 0 and p in poses))
                if len(frames) > 9:
                    frames = [frames[j * (len(frames)-1) // 8] for j in range(9)]
                previews.extend(pose(p) for p in frames)
                labels.extend(f"{i}: {p}" for p in frames)
            sheet = Image.new("RGB", (850, 90 * ((len(previews)+9)//10)), "#d0d0d0")
            draw = ImageDraw.Draw(sheet)
            for i, image in enumerate(previews):
                image.thumbnail((83, 70))
                x, y = i % 10 * 85, i // 10 * 90
                sheet.paste(image, (x, y), image)
                draw.text((x + 3, y + 71), labels[i], fill="#000000")
            sheet.save(args.output / f"group-{g}.png")
        return

    display_frame(REST).save(args.output / "still.webp", lossless=True)
    for name, group in CLIPS.items():
        rng = random.Random(97)
        entry = groups[group][0]
        sequence = []
        pc = duration = 0
        for _ in range(200):
            if not 0 <= pc < len(entry) or duration > 9500:
                break
            op, first, second = entry[pc]
            pc += 1
            if op == 1 and rng.randrange(0x7fff) < second:
                pc = first
            if op == 0 and first in poses and second:
                sequence.append((first, second))
                duration += second
        sequence = [(REST, 2100 if name == "idle" else 120), *sequence,
                    (REST, 3000 if name == "idle" else 1400)]
        frames = [display_frame(frame) for frame, _ in sequence]
        frames[0].save(args.output / f"{name}.webp", save_all=True, append_images=frames[1:],
                       duration=[ms for _, ms in sequence], loop=0 if name == "idle" else 1,
                       lossless=True, method=6)


if __name__ == "__main__":
    main()
