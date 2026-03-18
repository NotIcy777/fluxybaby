import os
import re

# Paths
games_root = r"C:\Users\Lunar\Documents\scram\Flux\public\games"
images_root = r"C:\Users\Lunar\Documents\scram\Flux\public\images"
output_file = "games.txt"

game_entries = []

# Allowed image extensions (priority order)
image_extensions = [".jpg", ".jpeg", ".png"]

for folder_name in os.listdir(games_root):
    game_folder = os.path.join(games_root, folder_name)
    index_file = os.path.join(game_folder, "index.html")

    if os.path.isdir(game_folder) and os.path.exists(index_file):
        with open(index_file, "r", encoding="utf-8") as f:
            content = f.read()

        # Extract title
        title_match = re.search(r"<title>(.*?)</title>", content, re.IGNORECASE)
        title = title_match.group(1).strip() if title_match else folder_name
        title = title.replace("| Seraph", "").strip()

        # Special case handling
        if title == "YT Game Wrapper WebGL Template":
            clean_id = folder_name.replace("-", "")
            clean_title = folder_name.replace("-", " ")
        else:
            clean_id = folder_name
            clean_title = title

        # Check for image in images folder
        image_url = "/images/imagenotfound.png"
        for ext in image_extensions:
            image_path = os.path.join(images_root, f"{folder_name}{ext}")
            if os.path.exists(image_path):
                image_url = f"/images/{folder_name}{ext}"
                break

        # URL to index.html
        url = f"/games/{folder_name}/index.html"

        # Create entry
        entry = f'{{id:"{clean_id}", title:"{clean_title}", url:"{url}", image:"{image_url}"}},'
        game_entries.append(entry)

# Write to games.txt
with open(output_file, "w", encoding="utf-8") as f:
    f.write("\n".join(game_entries))

print(f"{len(game_entries)} game entries exported to {output_file}")