import json
import re

with open('scratch/block_data.json', encoding='utf-8') as f:
    blocks = json.load(f)

plots = []
map_wrappers_html = []
tab_buttons_html = []

ofc_plots = {'B-15', 'C-54', 'D-67', 'D-68', 'D-69'}

size_map = {
    "88.89": "20x40", "100.00": "30x30", "111.11": "25x40", "125.00": "25x45",
    "133.33": "30x40", "138.89": "25x50", "150.00": "30x45", "166.67": "30x50",
    "177.78": "32x50", "183.33": "30x55", "194.44": "35x50", "200.00": "30x60",
    "212.89": "Irregular", "216.67": "30x65", "222.22": "40x50", "294.56": "Irregular",
    "302.50": "Irregular", "163.89": "Irregular", "213.89": "Irregular", "397.22": "Irregular",
    "219.14": "Irregular", "136.11": "Irregular", "118.06": "Irregular", "186.11": "Irregular",
    "230.56": "Irregular", "286.11": "Irregular", "144.44": "Irregular", "97.22": "Irregular",
    "175.00": "Irregular", "191.67": "Irregular", "169.44": "Irregular", "202.78": "Irregular",
    "130.56": "Irregular", "197.22": "Irregular", "1066.67": "80x120", "1200.00": "90x120"
}

corner_60 = {
    'A': [33, 56, 57, 80],
    'B': [29, 30, 49, 50, 63, 64, 76, 77, 82, 83],
    'D': [7, 8, 21, 22, 31, 45, 46, 59, 60]
}
corner_30 = {
    'A': [9, 24, 38, 51, 39, 50, 44, 45, 68, 69, 63, 74, 62, 65, 75, 10, 23],
    'C': [6, 8, 19, 20, 31, 32, 42, 44, 71, 62, 61, 55, 49, 50, 52, 51],
    'D': [67]
}

is_first = True

for block_name, block_plots in blocks.items():
    areas = []
    overlays = []
    
    # Process each plot in the block
    for p in block_plots:
        name = p['name']
        cx = p['cx']
        cy = p['cy']
        gaj = p['gaj']
        
        # Determine plot type
        try:
            num_val = int(name.split('-')[1])
            prefix_char = name.split('-')[0]
        except:
            num_val = 0
            prefix_char = name[0]
            
        if name.startswith('A-') and 1 <= num_val <= 10:
            plot_type = '80ft Main road plot'
        elif name.startswith('B-') and 1 <= num_val <= 9:
            plot_type = '80ft Main road plot'
        elif prefix_char in corner_60 and num_val in corner_60[prefix_char]:
            plot_type = '60ft corner plot'
        elif prefix_char in corner_30 and num_val in corner_30[prefix_char]:
            plot_type = '30ft corner plot'
        else:
            plot_type = 'Normal plot'
            
        actual_size = size_map.get(gaj, "Irregular")
        dims = actual_size.split('x')
        
        # Calculate clickable area (zoom is 4.0, so 3.8 gives a tight fit)
        if len(dims) == 2:
            w = float(dims[0]) * 3.8
            h = float(dims[1]) * 3.8
        else:
            w = 120
            h = 160
            
        x0, y0, x1, y1 = cx-w/2, cy-h/2, cx+w/2, cy+h/2
        coords = f"{x0:.0f},{y0:.0f},{x1:.0f},{y0:.0f},{x1:.0f},{y1:.0f},{x0:.0f},{y1:.0f}"
        
        if name in ofc_plots:
            plot_type = 'OFC'
            status_val = 'OFC'
            overlays.append(f'<div style="position: absolute; left: {cx:.0f}px; top: {cy:.0f}px; transform: translate(-50%, -50%); color: red; font-weight: bold; font-size: 28px; pointer-events: none; text-shadow: -1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff, 1px 1px 0 #fff; z-index: 10;">OFC</div>')
        else:
            status_val = 'available'
            
        plots.append({
            "colonyId": "Colony_1",
            "plotNo": name,
            "size": actual_size,
            "gaj": gaj,
            "type": plot_type,
            "status": status_val,
            "block": block_name
        })
        
        areas.append(f'<area alt="{name}" title="{name}" href="#" coords="{coords}" shape="poly" onclick="handleMapClick(event, \'{name}\')">')
        
    # Build Map Wrapper for this Block (display all on 1 page)
    areas_html = "\n".join("                        " + a for a in areas)
    overlays_str = "\n".join("                        " + o for o in overlays)
    
    wrapper = f"""
    <div id="map-block-{block_name}" class="map-wrapper-tab" style="display: block; position: relative; padding: 0; margin-bottom: 20px; text-align: center;">
        <h2 style="font-family: sans-serif; margin-bottom: 10px;">Block {block_name}</h2>
        <div style="position: relative; display: inline-block;">
            <img src="Block_{block_name}_Generated.jpg" usemap="#image-map-{block_name}" alt="Block {block_name}" style="display: block; max-width: none;">
            <map name="image-map-{block_name}" id="image-map-coords-{block_name}">
{areas_html}
            </map>
{overlays_str}
        </div>
    </div>
    """
    map_wrappers_html.append(wrapper)
    
    is_first = False

print(f"Prepared {len(plots)} plots across 4 blocks")

# Patch app.js
with open('app.js', 'r', encoding='utf-8') as f:
    app_js = f.read()

app_js = re.sub(
    r'const globalPlots = \[.*?\];', 
    f'const globalPlots = {json.dumps(plots, indent=4)};', 
    app_js, 
    flags=re.DOTALL
)

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(app_js)

# Patch index.html
with open('index.html', 'r', encoding='utf-8') as f:
    index_html = f.read()

# Create Continuous Layout UI
tabs_ui = f"""
<style>
.map-blocks-wrapper {{
    display: block;
    margin-bottom: 40px;
    text-align: center;
}}
.map-wrapper-tab {{
    display: inline-block;
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    border-radius: 8px;
    overflow: hidden;
    background: #fff;
    padding-bottom: 20px;
    margin-bottom: 40px;
    width: fit-content;
}}
</style>

<div class="map-blocks-wrapper">
    {"".join(map_wrappers_html)}
</div>
"""

index_html = index_html.replace('{{MAPS_HERE}}', tabs_ui)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(index_html)

print("Patched app.js and index.html")
