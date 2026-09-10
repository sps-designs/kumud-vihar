import fitz # PyMuPDF
import json
import os
import re

# Make sure scratch directory exists
os.makedirs('scratch', exist_ok=True)

pdf_path = "assests/kumud_vihar_map.pdf"
doc = fitz.open(pdf_path)
page = doc[0]

# Generate image
zoom = 3.0 # 300% for high quality
mat = fitz.Matrix(zoom, zoom)
pix = page.get_pixmap(matrix=mat)
pix.save("map.jpg")

# Get text dict
text_dict = page.get_text("dict")
blocks = text_dict["blocks"]

parsed_texts = []
for b in blocks:
    if b['type'] == 0: # text block
        for l in b["lines"]:
            for s in l["spans"]:
                text = s["text"].strip()
                if text:
                    # coords scaled to the new image resolution
                    rect = s["bbox"]
                    x0, y0, x1, y1 = [v * zoom for v in rect]
                    parsed_texts.append({
                        "text": text,
                        "rect": [x0, y0, x1, y1],
                        "cx": (x0 + x1)/2,
                        "cy": (y0 + y1)/2
                    })

with open("scratch/blocks.json", "w", encoding='utf-8') as f:
    json.dump(parsed_texts, f, indent=2)

print("Saved map.jpg and scratch/blocks.json")
