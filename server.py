import json
import os
import re
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from email.utils import parsedate_to_datetime
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


PORT = int(os.environ.get("PORT", "4173"))
HOST = os.environ.get("HOST", "0.0.0.0")
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

FEEDS = [
    {
        "source": "BBC",
        "url": "https://feeds.bbci.co.uk/news/rss.xml",
    },
]


class StartMenuHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=BASE_DIR, **kwargs)

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        super().end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == "/api/news":
            self.handle_news_api()
            return
        if parsed.path == "/api/wallpapers":
            self.handle_wallpapers_api()
            return
        super().do_GET()

    def handle_news_api(self):
        try:
            payload = {"items": collect_news_items()}
            body = json.dumps(payload).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        except Exception as error:
            body = json.dumps({"items": [], "error": str(error)}).encode("utf-8")
            self.send_response(500)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

    def handle_wallpapers_api(self):
        try:
            payload = {"items": collect_wallpapers()}
            body = json.dumps(payload).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        except Exception as error:
            body = json.dumps({"items": [], "error": str(error)}).encode("utf-8")
            self.send_response(500)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)


def collect_news_items():
    items = []
    for feed in FEEDS:
        items.extend(fetch_feed_items(feed["source"], feed["url"]))

    items.sort(key=lambda item: item["timestamp"], reverse=True)
    return items[:4]


def fetch_feed_items(source, url):
    request = urllib.request.Request(
        url,
        headers={
            "User-Agent": "Mozilla/5.0",
            "Accept": "application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8",
        },
    )
    with urllib.request.urlopen(request, timeout=15) as response:
        xml_bytes = response.read()

    root = ET.fromstring(xml_bytes)
    channel = root.find("channel")
    if channel is None:
        return []

    channel_image = clean_text(channel.findtext("image/url", default=""))
    results = []
    media_ns = {"media": "http://search.yahoo.com/mrss/"}
    for item in channel.findall("item")[:4]:
        title = clean_text(item.findtext("title", default=source))
        link = clean_text(item.findtext("link", default="#"))
        pub_date = clean_text(item.findtext("pubDate", default=""))
        description = item.findtext("description", default="")
        source_url = ""
        source_node = item.find("source")
        if source_node is not None and source_node.get("url"):
            source_url = clean_text(source_node.get("url"))
        image = extract_item_image(item, link, description, media_ns, source_url, channel_image)
        results.append(
            {
                "source": source,
                "title": title,
                "link": link,
                "image": image,
                "timestamp": parse_timestamp(pub_date),
            }
        )
    return results


def parse_timestamp(value):
    if not value:
        return 0
    try:
        return int(parsedate_to_datetime(value).timestamp())
    except Exception:
        return 0


def clean_text(value):
    return " ".join((value or "").split())


def extract_item_image(item, link, description, media_ns, source_url="", channel_image=""):
    thumbnail = item.find("media:thumbnail", media_ns)
    if thumbnail is not None and thumbnail.get("url"):
        return thumbnail.get("url")

    content = item.find("media:content", media_ns)
    if content is not None and content.get("url"):
        return content.get("url")

    description_match = re.search(r'<img[^>]+src="([^"]+)"', description or "", re.IGNORECASE)
    if description_match:
        return description_match.group(1)

    image = fetch_page_image(link)
    if image:
        return image

    image = fetch_page_image(source_url)
    if image:
        return image

    return channel_image


def fetch_page_image(link):
    if not link or link == "#":
        return ""

    try:
        request = urllib.request.Request(
            link,
            headers={
                "User-Agent": "Mozilla/5.0",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            },
        )
        with urllib.request.urlopen(request, timeout=12) as response:
            html = response.read(200000).decode("utf-8", "ignore")
    except Exception:
        return ""

    for pattern in (
        r'<meta[^>]+property="og:image"[^>]+content="([^"]+)"',
        r'<meta[^>]+name="twitter:image"[^>]+content="([^"]+)"',
        r'<meta[^>]+content="([^"]+)"[^>]+property="og:image"',
        r'<meta[^>]+content="([^"]+)"[^>]+name="twitter:image"',
    ):
        match = re.search(pattern, html, re.IGNORECASE)
        if match:
            return html_unescape(match.group(1))

    return ""


def html_unescape(value):
    return (
        (value or "")
        .replace("&amp;", "&")
        .replace("&quot;", '"')
        .replace("&#39;", "'")
    )


def collect_wallpapers():
    wallpaper_dir = os.path.join(BASE_DIR, "AeroVistaX Wallpapers")
    if not os.path.isdir(wallpaper_dir):
        return []

    items = []
    def wallpaper_sort_key(name):
        lower_name = name.lower()
        return (0 if lower_name == "null0.jpg" else 1, lower_name)

    for name in sorted(os.listdir(wallpaper_dir), key=wallpaper_sort_key):
        lower_name = name.lower()
        if not lower_name.endswith((".jpg", ".jpeg", ".png", ".webp")):
            continue
        relative_path = os.path.join("AeroVistaX Wallpapers", name).replace("\\", "/")
        items.append(
            {
                "name": name,
                "path": "/" + urllib.parse.quote(relative_path, safe="/"),
            }
        )
    return items


if __name__ == "__main__":
    server = ThreadingHTTPServer((HOST, PORT), StartMenuHandler)
    print(f"Serving 4 Studios Start Menu on http://{HOST}:{PORT}")
    server.serve_forever()
