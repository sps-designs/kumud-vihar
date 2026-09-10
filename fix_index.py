import re

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

start = html.find('<style>\n.map-blocks-wrapper {')
if start == -1:
    start = html.find('<div class="map-blocks-wrapper">')
end = html.find('</main>')

if start != -1 and end != -1:
    new_html = html[:start] + '{{MAPS_HERE}}\n                </div>\n            </div>\n        </main>' + html[end+7:]
    with open('index.html', 'w', encoding='utf-8') as f:
        f.write(new_html)
    print("Successfully cleaned index.html")
else:
    print("Could not find boundaries")
