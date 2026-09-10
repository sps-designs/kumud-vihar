import fitz # PyMuPDF
import json
import os

pdf_path = "assests/kumud_vihar_gulabpura.pdf"
doc = fitz.open(pdf_path)
page = doc[0]

# Render map image at 300% zoom
zoom = 3.0
mat = fitz.Matrix(zoom, zoom)
pix = page.get_pixmap(matrix=mat)
img_path = "map.jpg"
pix.save(img_path)
print(f"Saved new map image to {img_path}")

# Extract text blocks
blocks = []
for block in page.get_text("blocks"):
    text = block[4].strip()
    if text:
        cx = (block[0] + block[2]) / 2 * zoom
        cy = (block[1] + block[3]) / 2 * zoom
        blocks.append({
            "text": text,
            "cx": cx,
            "cy": cy
        })

with open("scratch/blocks_new.json", "w", encoding='utf-8') as f:
    json.dump(blocks, f, indent=2)

print(f"Extracted {len(blocks)} text blocks to scratch/blocks_new.json")

# Quick Analysis
prefixes = [b for b in blocks if b['text'].strip() in ['A-', 'B-', 'C-', 'D-', 'E-']]
numbers = [b for b in blocks if b['text'].strip().isdigit()]
sizes = [b for b in blocks if '.' in b['text'] and b['text'].replace('.','',1).isdigit()]

print(f"Found {len(prefixes)} prefixes")
print(f"Found {len(numbers)} numbers")
print(f"Found {len(sizes)} exact size labels")
