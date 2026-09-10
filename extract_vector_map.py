import fitz
import json

doc = fitz.open('assests/kumud_vihar_gulabpura.pdf')
page = doc[0]

# Render base map for reference (if needed)
zoom = 3.0
mat = fitz.Matrix(zoom, zoom)
page.get_pixmap(matrix=mat).save('scratch/full_map_new.jpg')

blocks = []
for block in page.get_text("blocks"):
    text = block[4].strip()
    if text:
        cx = (block[0] + block[2]) / 2 * zoom
        cy = (block[1] + block[3]) / 2 * zoom
        blocks.append({
            "text": text,
            "cx": cx,
            "cy": cy,
            "w": (block[2] - block[0]) * zoom,
            "h": (block[3] - block[1]) * zoom
        })

print(f"Extracted {len(blocks)} raw text blocks.")

# The new map formats plot numbers as "82\nB-\n" or groups them "78\nB-\n76\nB-\n"
parsed_plots = []
sizes = []

for b in blocks:
    lines = [line.strip() for line in b['text'].split('\n') if line.strip()]
    
    # Check if this block contains size data (Sq.Yds.)
    if any('Sq.Yds' in line or 'Sq. Yds' in line for line in lines):
        # Find the number
        size_val = next((line for line in lines if line.replace('.','',1).isdigit()), None)
        if size_val:
            sizes.append({
                "size": size_val,
                "cx": b['cx'],
                "cy": b['cy']
            })
        continue

    # Try to extract plot prefixes and numbers
    # We iterate through lines and if we see a number followed by a prefix (or vice versa), pair them
    i = 0
    while i < len(lines):
        if lines[i].isdigit() and i+1 < len(lines) and lines[i+1].endswith('-'):
            plot_num = lines[i]
            prefix = lines[i+1]
            parsed_plots.append({
                "name": prefix + plot_num,
                "cx": b['cx'],
                "cy": b['cy']
            })
            i += 2
        elif lines[i].endswith('-') and i+1 < len(lines) and lines[i+1].isdigit():
            prefix = lines[i]
            plot_num = lines[i+1]
            parsed_plots.append({
                "name": prefix + plot_num,
                "cx": b['cx'],
                "cy": b['cy']
            })
            i += 2
        else:
            i += 1

print(f"Extracted {len(parsed_plots)} plot locations.")
print(f"Extracted {len(sizes)} plot sizes.")

with open('scratch/vector_data.json', 'w', encoding='utf-8') as f:
    json.dump({
        "plots": parsed_plots,
        "sizes": sizes
    }, f, indent=2)

print("Saved vector_data.json")
