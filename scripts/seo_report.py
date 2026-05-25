#!/usr/bin/env python3
"""
PDFislemleri.com — SEO Data Puller
Search Console + GA4'ten haftalık rapor çeker, JSON'a kaydeder.

Kullanım:
  python3 seo_report.py              # son 7 gün
  python3 seo_report.py --days 30    # son 30 gün
"""

import os, sys, json, argparse
from datetime import date, timedelta
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
PROJECT_DIR = SCRIPT_DIR.parent
SA_KEY = PROJECT_DIR / "secrets" / "ga-sa.json"
REPORTS_DIR = PROJECT_DIR / "reports"
REPORTS_DIR.mkdir(exist_ok=True)

SITE_URL = "sc-domain:pdfislemleri.com"  # domain property (tüm subdomain + protokol)
GA4_PROPERTY_ID = os.environ.get("GA4_PROPERTY_ID", "").strip()  # .env'den veya args'tan

# ── Search Console ─────────────────────────────────────────────────────

def get_search_console():
    from google.oauth2 import service_account
    from googleapiclient.discovery import build
    creds = service_account.Credentials.from_service_account_file(
        str(SA_KEY),
        scopes=["https://www.googleapis.com/auth/webmasters.readonly"]
    )
    return build("searchconsole", "v1", credentials=creds, cache_discovery=False)

def fetch_search_console(days: int = 7):
    end = date.today() - timedelta(days=2)  # SC 2 gün gecikme
    start = end - timedelta(days=days)
    sc = get_search_console()

    # Top queries + sayfalar
    queries = sc.searchanalytics().query(siteUrl=SITE_URL, body={
        "startDate": start.isoformat(),
        "endDate": end.isoformat(),
        "dimensions": ["query"],
        "rowLimit": 50,
    }).execute().get("rows", [])

    pages = sc.searchanalytics().query(siteUrl=SITE_URL, body={
        "startDate": start.isoformat(),
        "endDate": end.isoformat(),
        "dimensions": ["page"],
        "rowLimit": 50,
    }).execute().get("rows", [])

    # Sayfa x keyword (en çok gelen eşleşmeler)
    page_query = sc.searchanalytics().query(siteUrl=SITE_URL, body={
        "startDate": start.isoformat(),
        "endDate": end.isoformat(),
        "dimensions": ["page", "query"],
        "rowLimit": 100,
    }).execute().get("rows", [])

    return {
        "date_range": f"{start} → {end}",
        "days": days,
        "top_queries": [
            {
                "query": r["keys"][0],
                "clicks": r["clicks"],
                "impressions": r["impressions"],
                "ctr": round(r["ctr"] * 100, 2),
                "position": round(r["position"], 1),
            } for r in queries
        ],
        "top_pages": [
            {
                "page": r["keys"][0],
                "clicks": r["clicks"],
                "impressions": r["impressions"],
                "ctr": round(r["ctr"] * 100, 2),
                "position": round(r["position"], 1),
            } for r in pages
        ],
        "page_query_pairs": [
            {
                "page": r["keys"][0],
                "query": r["keys"][1],
                "clicks": r["clicks"],
                "impressions": r["impressions"],
                "ctr": round(r["ctr"] * 100, 2),
                "position": round(r["position"], 1),
            } for r in page_query
        ],
    }

# ── GA4 ─────────────────────────────────────────────────────────────────

def fetch_ga4(days: int = 7):
    if not GA4_PROPERTY_ID:
        return {"error": "GA4_PROPERTY_ID env değişkeni set edilmemiş"}

    from google.oauth2 import service_account
    from google.analytics.data_v1beta import BetaAnalyticsDataClient
    from google.analytics.data_v1beta.types import (
        RunReportRequest, Dimension, Metric, DateRange
    )

    creds = service_account.Credentials.from_service_account_file(
        str(SA_KEY),
        scopes=["https://www.googleapis.com/auth/analytics.readonly"]
    )
    client = BetaAnalyticsDataClient(credentials=creds)

    end = date.today()
    start = end - timedelta(days=days)

    # Sayfa başı metrikler
    req = RunReportRequest(
        property=f"properties/{GA4_PROPERTY_ID}",
        dimensions=[Dimension(name="pagePath")],
        metrics=[
            Metric(name="activeUsers"),
            Metric(name="screenPageViews"),
            Metric(name="averageSessionDuration"),
            Metric(name="bounceRate"),
            Metric(name="engagementRate"),
        ],
        date_ranges=[DateRange(start_date=start.isoformat(), end_date=end.isoformat())],
        limit=50,
    )
    resp = client.run_report(req)

    pages = []
    for row in resp.rows:
        pages.append({
            "page": row.dimension_values[0].value,
            "users": int(row.metric_values[0].value),
            "views": int(row.metric_values[1].value),
            "avg_duration_s": round(float(row.metric_values[2].value), 1),
            "bounce_rate": round(float(row.metric_values[3].value) * 100, 1),
            "engagement_rate": round(float(row.metric_values[4].value) * 100, 1),
        })

    # Trafik kaynağı özeti
    req2 = RunReportRequest(
        property=f"properties/{GA4_PROPERTY_ID}",
        dimensions=[Dimension(name="sessionDefaultChannelGroup")],
        metrics=[Metric(name="activeUsers"), Metric(name="sessions")],
        date_ranges=[DateRange(start_date=start.isoformat(), end_date=end.isoformat())],
    )
    resp2 = client.run_report(req2)
    sources = [
        {
            "channel": row.dimension_values[0].value,
            "users": int(row.metric_values[0].value),
            "sessions": int(row.metric_values[1].value),
        } for row in resp2.rows
    ]

    return {
        "date_range": f"{start} → {end}",
        "days": days,
        "pages": sorted(pages, key=lambda x: -x["users"]),
        "channels": sorted(sources, key=lambda x: -x["users"]),
    }

# ── Main ───────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--days", type=int, default=7)
    parser.add_argument("--skip-ga4", action="store_true")
    args = parser.parse_args()

    today = date.today().isoformat()
    report = {
        "generated_at": today,
        "site": SITE_URL,
        "search_console": None,
        "ga4": None,
    }

    print(f"→ Search Console ({args.days} gün) çekiliyor...")
    try:
        report["search_console"] = fetch_search_console(args.days)
        sc = report["search_console"]
        print(f"  ✓ {len(sc['top_queries'])} query, {len(sc['top_pages'])} sayfa")
    except Exception as e:
        report["search_console"] = {"error": str(e)}
        print(f"  ✗ SC hata: {e}")

    if not args.skip_ga4:
        print(f"→ GA4 ({args.days} gün) çekiliyor...")
        try:
            report["ga4"] = fetch_ga4(args.days)
            if "error" in report["ga4"]:
                print(f"  ! {report['ga4']['error']}")
            else:
                ga = report["ga4"]
                print(f"  ✓ {len(ga['pages'])} sayfa, {len(ga['channels'])} kanal")
        except Exception as e:
            report["ga4"] = {"error": str(e)}
            print(f"  ✗ GA4 hata: {e}")

    # Kaydet
    out_file = REPORTS_DIR / f"seo-{today}.json"
    out_file.write_text(json.dumps(report, indent=2, ensure_ascii=False))
    print(f"\n✓ Rapor: {out_file}")

    # Özet
    print("\n─── ÖZET ───")
    if report["search_console"] and "top_queries" in report["search_console"]:
        sc = report["search_console"]
        total_clicks = sum(q["clicks"] for q in sc["top_queries"])
        total_impressions = sum(q["impressions"] for q in sc["top_queries"])
        print(f"Search Console: {total_clicks} tıklama, {total_impressions} gösterim")
        if sc["top_queries"]:
            print("Top 5 query:")
            for q in sc["top_queries"][:5]:
                print(f"  • {q['query']:<35} {q['clicks']}tk / {q['impressions']}gz / pos {q['position']}")
    if report["ga4"] and "pages" in report["ga4"]:
        ga = report["ga4"]
        total_users = sum(p["users"] for p in ga["pages"])
        print(f"GA4: {total_users} aktif kullanıcı")
        if ga["pages"]:
            print("Top 5 sayfa:")
            for p in ga["pages"][:5]:
                print(f"  • {p['page']:<35} {p['users']}u / {p['views']}pv / eng%{p['engagement_rate']}")

    # ── Regression alarm (cron mail tetikler) ──────────────────────────
    # En yakın geçmiş raporu bul (kendi raporumuz hariç), total_impressions'ı
    # karşılaştır. %50 veya daha fazla düşüş varsa stderr'e WARN bas; cron MAILTO
    # bunu yakalayıp e-posta atar.
    try:
        check_regression(report, REPORTS_DIR, today)
    except Exception as e:
        # Regression kontrolünün kendisi raporu bozmamalı.
        print(f"[regression] check failed: {e}", file=sys.stderr)


def _total_impressions(rep: dict) -> int | None:
    sc = rep.get("search_console") or {}
    qs = sc.get("top_queries")
    if not isinstance(qs, list) or not qs:
        return None
    try:
        return sum(int(q.get("impressions", 0)) for q in qs)
    except (TypeError, ValueError):
        return None


def check_regression(current: dict, reports_dir: Path, today: str, threshold_pct: float = 50.0) -> None:
    """Compare current total_impressions to the latest previous report. Emit
    WARN on stderr if drop >= threshold_pct percent."""
    current_imps = _total_impressions(current)
    if current_imps is None:
        print("[regression] current report has no impressions data, skipping", file=sys.stderr)
        return

    # En yakın önceki rapor (kendi today raporu hariç)
    prev_files = sorted(
        (p for p in reports_dir.glob("seo-*.json") if p.stem != f"seo-{today}"),
        key=lambda p: p.stat().st_mtime,
        reverse=True,
    )
    if not prev_files:
        print("[regression] no prior report found, baseline established", file=sys.stderr)
        return

    prev_path = prev_files[0]
    try:
        prev_rep = json.loads(prev_path.read_text(encoding="utf-8"))
    except Exception as e:
        print(f"[regression] could not parse {prev_path.name}: {e}", file=sys.stderr)
        return

    prev_imps = _total_impressions(prev_rep)
    if not prev_imps:
        print(f"[regression] {prev_path.name} has no impressions, skipping", file=sys.stderr)
        return

    drop_pct = (prev_imps - current_imps) / prev_imps * 100.0
    print(
        f"[regression] impressions: prev={prev_imps} ({prev_path.stem}) "
        f"-> curr={current_imps}  delta={-drop_pct:+.1f}%"
    )
    if drop_pct >= threshold_pct:
        print(
            f"WARN: SEO impressions düşüşü {drop_pct:.1f}% "
            f"(önceki {prev_imps} -> şimdiki {current_imps}, eşik {threshold_pct}%)",
            file=sys.stderr,
        )


if __name__ == "__main__":
    main()
