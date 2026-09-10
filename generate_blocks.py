import fitz
import json
import os
import math

doc = fitz.open('assests/kumud_vihar_gulabpura.pdf')
page = doc[0]

with open('scratch/vector_data.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

plots = data['plots']
sizes = data['sizes']

blocks = ['A', 'B', 'C', 'D']
zoom = 4.0
margin = 50 # pixels in unzoomed space

output_data = {}

for block in blocks:
    # Get all plots in this block
    block_plots = [p for p in plots if p['name'].startswith(block + '-')]
    if not block_plots:
        continue
        
    # Unzoom the coordinates to match the PDF native space
    min_x = min(p['cx'] for p in block_plots) / 3.0
    min_y = min(p['cy'] for p in block_plots) / 3.0
    max_x = max(p['cx'] for p in block_plots) / 3.0
    max_y = max(p['cy'] for p in block_plots) / 3.0
    
    # Add margins
    clip_rect = fitz.Rect(min_x - margin, min_y - margin, max_x + margin, max_y + margin)
    
    # Render the specific block
    mat = fitz.Matrix(zoom, zoom)
    pix = page.get_pixmap(matrix=mat, clip=clip_rect)
    img_path = f'Block_{block}_Generated.jpg'
    pix.save(img_path)
    
    print(f"Generated {img_path} for Block {block} with {len(block_plots)} plots")
    
    # Recalculate coordinates for this block image
    transformed_plots = []
    for p in block_plots:
        # The new coordinate on the image:
        # Original native coordinate = p['cx'] / 3.0
        # Relative to clip rect = (p['cx']/3.0) - clip_rect.x0
        # Scaled by zoom = ((p['cx']/3.0) - clip_rect.x0) * zoom
        
        new_cx = ((p['cx'] / 3.0) - clip_rect.x0) * zoom
        new_cy = ((p['cy'] / 3.0) - clip_rect.y0) * zoom
        
        # Find closest size
        closest_s = None
        s_dist = 999999
        for s in sizes:
            # Note: sizes are also zoomed by 3.0 in vector_data.json
            dx = p['cx'] - s['cx']
            dy = s['cy'] - p['cy']
            if abs(dy) < 100 and abs(dx) < 30:
                dist = dx*dx + dy*dy
                if dist < s_dist:
                    s_dist = dist
                    closest_s = s
                    
        actual_size = closest_s['size'] if closest_s else "150.00"
        
        transformed_plots.append({
            "name": p['name'],
            "cx": new_cx,
            "cy": new_cy,
            "gaj": actual_size
        })
        
    output_data[block] = transformed_plots

with open('scratch/block_data.json', 'w', encoding='utf-8') as f:
    json.dump(output_data, f, indent=2)
    
print("Saved block data to block_data.json")
