"""F-005 spike（sprint-9/spike-douban-rexxar）：从豆瓣 Rexxar 录制识别用测试夹具。

用法：python scripts/spike/douban-rexxar.py            # 识别夹具（条目、标签、封面）
      python scripts/spike/douban-rexxar.py interests  # 导入夹具 interests-*.json（US-04，作者公开账号）
输出：tests/fixtures/douban/*.json（只保留识别 / 导入用到的字段）与封面样本 *.jpg

Worker 出口可达性另用临时 Worker（wrangler dev --remote）验证，结论见 specs/tasks/sprint-9/spike-douban-rexxar.md。
"""
import copy
import json
import os
import sys
import time
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


# ---- US-04 导入夹具（ADR-014）：标记列表 user/{uid}/interests ----
UID = "189806038"
INTEREST_KEEP = ["id", "status", "rating", "create_time", "comment", "platforms"]
SUBJECT_KEEP = ["id", "type", "title", "year", "pubdate", "author", "directors", "genres", "release_date", "cover_url", "pic", "url"]


def interests(kind, status, count):
    url = f"https://m.douban.com/rexxar/api/v2/user/{UID}/interests?type={kind}&status={status}&start=0&count={count}"
    data = json.loads(get(url))
    time.sleep(1)
    return data["interests"]


def trim(interest):
    out = {k: interest[k] for k in INTEREST_KEEP if k in interest}
    if out.get("rating"):
        out["rating"] = {"value": out["rating"].get("value")}
    out["platforms"] = [{"abbreviation": p.get("abbreviation")} for p in interest.get("platforms") or []]
    subject = interest["subject"]
    s = {k: subject[k] for k in SUBJECT_KEEP if k in subject}
    if "directors" in s:
        s["directors"] = [{"name": d.get("name")} for d in s["directors"]]
    if "pic" in s:
        s["pic"] = {"large": s["pic"].get("large")}
    out["subject"] = s
    return out


def pick(items, ids):
    by_id = {i["subject"]["id"]: i for i in items}
    missing = [i for i in ids if i not in by_id]
    if missing:
        raise SystemExit(f"录制页里找不到 {missing}：作者标记已变化，请改选样本")
    return [trim(by_id[i]) for i in ids]


def with_(item, **changes):
    item = copy.deepcopy(item)
    subject = changes.pop("subject", {})
    for k, v in changes.items():
        if v is None:
            item.pop(k, None)
        else:
            item[k] = v
    for k, v in subject.items():
        if v is None:
            item["subject"].pop(k, None)
        else:
            item["subject"][k] = v
    return item


def page(items, total, start=0):
    items = sorted(items, key=lambda i: i["create_time"], reverse=True)  # 与豆瓣一致：按标记时间倒序
    return {"start": start, "count": 20, "total": total, "interests": items}


def record_interests():
    movie_done = interests("movie", "done", 50)
    movie_doing = interests("movie", "doing", 20)
    book_done = interests("book", "done", 50)
    game_done = interests("game", "done", 50)

    # 影视·看过第 1 页（TC-US04-01、04、05、08）：评 4 星带短评的电影、剧集、未评分电影；构造 status: mark 与缺标题各 1 条
    m = pick(movie_done, ["25765735", "30513783", "25786060", "1305724", "1401524"])
    m[3] = with_(m[3], status="mark")
    m[4] = with_(m[4], subject={"title": None})
    write("interests-movie-done.json", page(m, 45))
    write("interests-movie-done-p2.json", page(pick(movie_done, ["1295250", "1792928", "3026988"]), 45, 20))
    write("interests-movie-done-p3.json", page(pick(movie_done, ["36846801", "37116446"]), 45, 40))
    write("interests-movie-doing.json", page(pick(movie_doing, ["36189165"]), 1))

    # 书·读过（TC-US04-02）：作者带国籍括号、pubdate 年月、pubdate 为空；漫画由测试打桩 tags 判定
    write("interests-book-done.json", page(pick(book_done, ["10594787", "36667314", "35053236", "36484713"]), 4))

    # 游戏·玩过（TC-US04-03）：平台 PS5 / PC / NS 2 / 空；构造 genres 含"桌游"的 1 款
    g = pick(game_done, ["37380017", "36087617", "37303074", "36721901", "26436096"])
    g[4] = with_(g[4], subject={"genres": ["问答/桌游"]})
    write("interests-game-done.json", page(g, 5))

    # 增量（TC-US04-18）：水位 2026-10-18 08:25:08；3 条晚于水位、2 条恰为水位、1 条更早（标记时间为构造）
    later = pick(movie_done, ["36146114", "37185797", "36808876"])
    for item, t in zip(later, ["2026-10-25 21:10:00", "2026-10-22 19:30:00", "2026-10-20 08:00:00"]):
        item["create_time"] = t
    same = pick(movie_done, ["30513783", "36767846"])
    same[1]["create_time"] = "2026-10-18 08:25:08"
    write("interests-movie-done-incr.json", page(later + same + pick(movie_done, ["36367195"]), 614))

    # 在看改看过（TC-US04-21）：在看页那部剧集出现在看过最前（标记时间为构造）
    moved = with_(pick(movie_doing, ["36189165"])[0], status="done", create_time="2026-10-26 20:00:00", rating={"value": 5})
    write("interests-movie-done-doing2done.json", page([moved] + pick(movie_done, ["30513783"]), 615))

    # 类别过滤（TC-US04-24）：真实看过页中 12 部电影 + 8 部剧集；书 20 本（漫画 / tags 失败由测试按 ID 打桩）
    films = [i["subject"]["id"] for i in movie_done if i["subject"]["type"] == "movie"][:12]
    shows = [i["subject"]["id"] for i in movie_done if i["subject"]["type"] == "tv"][:8]
    chosen = set(films + shows)
    mixed = [trim(i) for i in movie_done if i["subject"]["id"] in chosen]
    write("interests-movie-done-mixed.json", page(mixed, 20))
    write("interests-book-done-manga.json", page([trim(i) for i in book_done[:20]], 20))


if __name__ == "__main__":
    if sys.argv[1:] == ["interests"]:
        record_interests()
    else:
        main()
