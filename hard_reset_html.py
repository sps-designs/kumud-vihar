import re

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

header_end = html.find('<div id="map-view"')
footer_start = html.find('<!-- Plot Details Pop-up')

if header_end != -1 and footer_start != -1:
    header = html[:header_end]
    footer = html[footer_start:]
    
    middle = """<div id="map-view" class="view-section animate-fade-in" style="display: none;">
                <p class="map-instruction" style="text-align: center; margin-bottom: 20px;">Interactive Map: Click a highlighted plot to see details.</p>
                <div class="map-container glass-panel" style="overflow: auto; max-height: 80vh; padding: 20px;">
                    {{MAPS_HERE}}
                </div>
            </div>
        </main>
    </div>

    """
    
    new_html = header + middle + footer
    with open('index.html', 'w', encoding='utf-8') as f:
        f.write(new_html)
    print("Hard reset index.html successfully")
else:
    print("Failed to find boundaries for hard reset")
