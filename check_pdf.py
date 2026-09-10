import fitz
doc = fitz.open('assests/Kumud_vihar_Gulabpura.pdf')
print(f'Total pages: {len(doc)}')
for i in range(len(doc)):
    page = doc[i]
    blocks = page.get_text('blocks')
    images = page.get_images()
    print(f'Page {i} blocks: {len(blocks)}, images: {len(images)}')
