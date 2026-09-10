import pymupdf
import json
import re
import math

doc = pymupdf.open('assests/kumud_vihar_gulabpura.pdf')
page = doc[0]

words = page.get_text("words")

parsed_plots = []
sizes = []

def distance(x1, y1, x2, y2):
    return math.sqrt((x1-x2)**2 + (y1-y2)**2)

# First pass: find all standalone sizes
for w in words:
    text = w[4].strip()
    if text.replace('.','',1).isdigit() and '.' in text:
        # It's a float like 150.00
        cx = (w[0] + w[2]) / 2
        cy = (w[1] + w[3]) / 2
        sizes.append({
            "size": text,
            "cx": cx,
            "cy": cy
        })

# Second pass: find all prefixes and exact matches
unmatched_prefixes = []
for w in words:
    text = w[4].strip()
    
    # Exact match like "B-15"
    if re.match(r'^[A-D]-\d+$', text):
        cx = (w[0] + w[2]) / 2
        cy = (w[1] + w[3]) / 2
        parsed_plots.append({
            "name": text,
            "cx": cx,
            "cy": cy,
            "w": w[2] - w[0],
            "h": w[3] - w[1]
        })
    # Prefix like "B-"
    elif re.match(r'^[A-D]-$', text):
        unmatched_prefixes.append(w)

# Third pass: find numbers for unmatched prefixes
numbers = [w for w in words if w[4].strip().isdigit()]

for p in unmatched_prefixes:
    p_cx = (p[0] + p[2]) / 2
    p_cy = (p[1] + p[3]) / 2
    
    # Find closest number
    closest_num = None
    min_dist = 999999
    
    for n in numbers:
        n_cx = (n[0] + n[2]) / 2
        n_cy = (n[1] + n[3]) / 2
        dist = distance(p_cx, p_cy, n_cx, n_cy)
        
        # Must be very close (e.g., within 20 points)
        if dist < min_dist and dist < 25:
            min_dist = dist
            closest_num = n
            
    if closest_num:
        n_cx = (closest_num[0] + closest_num[2]) / 2
        n_cy = (closest_num[1] + closest_num[3]) / 2
        
        # Average center
        cx = (p_cx + n_cx) / 2
        cy = (p_cy + n_cy) / 2
        
        # Bounding box
        min_x = min(p[0], closest_num[0])
        min_y = min(p[1], closest_num[1])
        max_x = max(p[2], closest_num[2])
        max_y = max(p[3], closest_num[3])
        
        parsed_plots.append({
            "name": p[4].strip() + closest_num[4].strip(),
            "cx": cx,
            "cy": cy,
            "w": max_x - min_x,
            "h": max_y - min_y
        })

print(f"Extracted {len(parsed_plots)} plots using exact word matching.")
print(f"Extracted {len(sizes)} sizes.")

with open('scratch/exact_vector_data.json', 'w', encoding='utf-8') as f:
    json.dump({
        "plots": parsed_plots,
        "sizes": sizes
    }, f, indent=2)

print("Saved exact_vector_data.json")
