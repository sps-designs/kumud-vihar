import json
import re

with open('scratch/plots.json', 'r') as f:
    data = json.load(f)

plots_js = json.dumps(data['plots'], indent=4)
areas_html = "\n".join("                        " + a for a in data['areas'])

# Patch app.js
with open('app.js', 'r', encoding='utf-8') as f:
    app_js = f.read()

# Replace the globalPlots array
app_js = re.sub(
    r'const globalPlots = \[.*?\];', 
    f'const globalPlots = {plots_js};', 
    app_js, 
    flags=re.DOTALL
)

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(app_js)

# Patch index.html
with open('index.html', 'r', encoding='utf-8') as f:
    index_html = f.read()

# Replace the embed with img and map
map_html = f"""<img id="colony-map-img" src="map.jpg" usemap="#image-map" alt="Colony Master Plan" style="max-width: 100%; height: auto; border-radius: var(--radius-md);">
                    <map name="image-map" id="image-map-coords">
{areas_html}
                    </map>"""

index_html = re.sub(
    r'<embed src="assests/kumud_vihar_map.pdf".*?/>',
    map_html,
    index_html,
    flags=re.DOTALL
)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(index_html)

print("Successfully patched app.js and index.html")
