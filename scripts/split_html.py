import os
import re

with open("src/index.html", "r") as f:
    html = f.read()

# We will extract specific sections from the HTML based on class names or IDs.
# For example, <div class="header">...</div>
# <div class="content-area">...</div>
# <div class="tabs">...</div>

header_match = re.search(r'(<div class="header">.*?</style>\s*</div>\s*</div>)', html, re.DOTALL)
content_match = re.search(r'(<div class="content-area".*?</div>\s*</div>)', html, re.DOTALL)
tabs_match = re.search(r'(<div class="tabs">.*?</div>\s*</div>)', html, re.DOTALL)
modals_match = re.search(r'(<!-- 图片全屏放大遮罩层 -->.*?)<script', html, re.DOTALL)

os.makedirs("src/components/html", exist_ok=True)

def write_and_replace(match_obj, name):
    if not match_obj: return html
    content = match_obj.group(1)
    with open(f"src/components/html/{name}.html", "w") as out:
        out.write(content)
    return html.replace(content, f'<!-- INJECT_{name.upper()} -->')

html = write_and_replace(header_match, "header")
html = write_and_replace(content_match, "content")
html = write_and_replace(tabs_match, "tabs")
html = write_and_replace(modals_match, "modals")

with open("src/index.html", "w") as f:
    f.write(html)

print("HTML splitting done.")
