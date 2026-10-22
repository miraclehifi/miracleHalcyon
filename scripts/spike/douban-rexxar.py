"""F-005 spike（sprint-9/spike-douban-rexxar）：从豆瓣 Rexxar 录制识别用测试夹具。

用法：python scripts/spike/douban-rexxar.py
输出：tests/fixtures/douban/*.json（只保留识别用到的字段）与封面样本 *.jpg

Worker 出口可达性另用临时 Worker（wrangler dev --remote）验证，结论见 specs/tasks/sprint-9/spike-douban-rexxar.md。
"""
import json
import os
import urllib.request

UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
HEADERS = {"Referer": "https://m.douban.com/", "User-Agent": UA}
OUT = os.path.join(os.path.dirname(__file__), "..", "..", "tests", "fixtures", "douban")
KEEP = ["id", "type", "subtype", "is_tv", "title", "year", "pubdate", "author", "directors", "developers", "genres",
        "pic", "cover_url", "url", "sharing_url", "card_subtitle", "release_date"]

SAMPLES = {
    "book-principles": "book/27608239",
    "book-manga": "book/2025999",
    "movie-shawshank": "movie/1292052",
    "movie-animated": "movie/1291561",
    "tv-drama": "movie/26302614",
    "tv-anime": "movie/36093351",
    "tv-dispatch": "movie/37501131",  # 作者提供的真实 App 分享链接 dispatch/movie/37501131
    "game-video": "game/10734307",
    "game-board": "game/10757298",
}
TAGS = {"book-principles-tags": "book/27608239/tags", "book-manga-tags": "book/2025999/tags"}
COVERS = {"cover-ok.jpg": "https://img2.doubanio.com/view/subject/l/public/s29643861.jpg"}


def get(url):
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=20) as r:
        return r.read()


def main():
    os.makedirs(OUT, exist_ok=True)
    for name, path in SAMPLES.items():
        data = json.loads(get("https://m.douban.com/rexxar/api/v2/" + path))
        trimmed = {k: data[k] for k in KEEP if k in data}
        write(name + ".json", trimmed)
    for name, path in TAGS.items():
        write(name + ".json", json.loads(get("https://m.douban.com/rexxar/api/v2/" + path)))
    for name, url in COVERS.items():
        with open(os.path.join(OUT, name), "wb") as f:
            f.write(get(url))
    no_year = json.load(open(os.path.join(OUT, "book-principles.json"), encoding="utf-8"))
    no_year.pop("pubdate", None)
    write("book-no-year.json", no_year)
    no_title = json.load(open(os.path.join(OUT, "book-principles.json"), encoding="utf-8"))
    no_title.pop("title", None)
    write("no-title.json", no_title)


def write(name, obj):
    with open(os.path.join(OUT, name), "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)
        f.write("\n")


if __name__ == "__main__":
    main()
