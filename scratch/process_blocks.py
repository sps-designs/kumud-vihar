import json
import math

with open('scratch/blocks.json', encoding='utf-8') as f:
    blocks = json.load(f)

plots = []
areas = []

prefixes = [b for b in blocks if b['text'].strip() in ['A-', 'B-', 'C-', 'D-', 'E-']]
commercials = [b for b in blocks if b['text'].strip() == 'COMMERCIAL']
numbers = [b for b in blocks if b['text'].strip().isdigit()]
sizes = [b for b in blocks if b['text'].strip().replace('.', '', 1).isdigit() and '.' in b['text']]

for p in prefixes + commercials:
    # find closest number below it
    closest_n = None
    min_dist = 999999
    for n in numbers:
        dx = p['cx'] - n['cx']
        dy = n['cy'] - p['cy'] # number is usually below or slightly above
        
        if abs(dy) < 50 and abs(dx) < 50:
            dist = dx*dx + dy*dy
            if dist < min_dist:
                min_dist = dist
                closest_n = n
                
    if closest_n:
        if p['text'] == 'COMMERCIAL':
            name = 'COM-' + closest_n['text']
            plot_type = 'Commercial plot'
        else:
            name = p['text'].replace('-', '') + '-' + closest_n['text']
            # Determine type based loosely on location or just set to Normal
            plot_type = 'Normal plot'
            if 'A-' in name: plot_type = '30ft corner plot'
            if 'B-' in name: plot_type = '80ft Main road plot'
            
        # Find closest size
        closest_s = None
        s_dist = 999999
        for s in sizes:
            dx = p['cx'] - s['cx']
            dy = s['cy'] - p['cy']
            if abs(dy) < 80 and abs(dx) < 50:
                dist = dx*dx + dy*dy
                if dist < s_dist:
                    s_dist = dist
                    closest_s = s
        
        gaj = closest_s['text'] if closest_s else "150.00"
        
        # Approximate clickable area (a box around the text)
        cx, cy = p['cx'], (p['cy'] + closest_n['cy']) / 2
        w = 60
        h = 90
        x0, y0, x1, y1 = cx-w/2, cy-h/2, cx+w/2, cy+h/2
        coords = f"{x0:.0f},{y0:.0f},{x1:.0f},{y0:.0f},{x1:.0f},{y1:.0f},{x0:.0f},{y1:.0f}"
        
        plots.append({
            "colonyId": "Colony_1",
            "plotNo": name,
            "size": "Variable",
            "gaj": gaj,
            "type": plot_type,
            "status": "available"
        })
        areas.append(f'<area alt="{name}" title="{name}" href="#" coords="{coords}" shape="poly" onclick="handleMapClick(event, \'{name}\')">')

print(f"Extracted {len(plots)} plots")
with open('scratch/plots.json', 'w') as f:
    json.dump({"plots": plots, "areas": areas}, f, indent=2)
