#!/usr/bin/env python3
"""
CSV → data.json 変換スクリプト

各広告プラットフォーム（Google Ads, Meta, Yahoo!, LINE）からエクスポートした
日別CSVデータを読み込み、レポート用の data.json を生成・更新する。

使い方:
  python csv_to_json.py \
    --google csv/google.csv \
    --meta csv/meta.csv \
    --yahoo csv/yahoo.csv \
    --line csv/line.csv \
    --client "クライアント名" \
    --output ../sample-client/data.json

CSVフォーマット（共通）:
  各CSVには最低限以下のカラムが必要:
    - 日付 (date)
    - キャンペーン名 (campaign)
    - 費用 (cost)
    - 表示回数 (impressions)
    - クリック数 (clicks)
    - コンバージョン数 (conversions)

  カラム名はプラットフォームごとに異なるため、
  --column-map オプションまたは config.json で指定可能。
"""

import argparse
import csv
import json
import os
import sys
from collections import defaultdict
from datetime import datetime, timedelta
from pathlib import Path

# 各プラットフォームのデフォルトカラムマッピング
# CSVのヘッダ名 → 内部キー名
DEFAULT_COLUMN_MAPS = {
    "google": {
        "date": ["日", "Day", "Date", "日付"],
        "campaign": ["キャンペーン", "Campaign", "Campaign name"],
        "cost": ["費用", "Cost", "費用（JPY）"],
        "impressions": ["表示回数", "Impr.", "Impressions", "インプレッション"],
        "clicks": ["クリック数", "Clicks", "クリック"],
        "conversions": ["コンバージョン", "Conversions", "Conv.", "すべてのコンバージョン"],
    },
    "meta": {
        "date": ["日", "Day", "Date", "日付", "Reporting starts"],
        "campaign": [
            "広告セット名",
            "キャンペーン名",
            "Campaign name",
            "Campaign Name",
            "キャンペーン",
        ],
        "cost": [
            "消化金額 (JPY)",
            "消化金額",
            "Amount spent",
            "Amount Spent",
            "費用",
        ],
        "impressions": ["インプレッション", "Impressions", "リーチ"],
        "clicks": [
            "クリック(すべて)",
            "クリック（すべて）",
            "リンクのクリック",
            "Link clicks",
            "Clicks (all)",
        ],
        "conversions": ["結果", "Results", "コンバージョン", "Conversions"],
    },
    "yahoo": {
        "date": ["日", "Day", "Date", "日付"],
        "campaign": ["キャンペーン名", "Campaign Name", "キャンペーン"],
        "cost": ["コスト（税込）", "Cost", "費用", "コスト"],
        "impressions": ["インプレッション数", "Impressions", "表示回数"],
        "clicks": ["クリック数", "Clicks", "クリック"],
        "conversions": ["コンバージョン数", "Conversions", "コンバージョン"],
    },
    "line": {
        "date": ["日付", "Date", "日"],
        "campaign": ["キャンペーン名", "Campaign Name", "キャンペーン"],
        "cost": ["消化金額", "Cost", "費用"],
        "impressions": ["インプレッション", "Impressions", "imp"],
        "clicks": ["クリック数", "Clicks", "クリック"],
        "conversions": ["コンバージョン", "Conversions", "CV"],
    },
}

WEEKDAY_MAP = {
    0: "月",
    1: "火",
    2: "水",
    3: "木",
    4: "金",
    5: "土",
    6: "日",
}


def find_column(headers, candidates):
    """ヘッダ行からカラム名を探す。候補リストの中で最初に見つかったものを返す。"""
    for candidate in candidates:
        for header in headers:
            if header.strip() == candidate:
                return header.strip()
    return None


def parse_number(value):
    """文字列を数値に変換。カンマ・通貨記号を除去。"""
    if value is None:
        return 0
    cleaned = str(value).replace(",", "").replace("¥", "").replace("￥", "")
    cleaned = cleaned.replace("$", "").replace("%", "").strip()
    if cleaned in ("", "--", "-", "N/A", "nan"):
        return 0
    try:
        return float(cleaned)
    except ValueError:
        return 0


def parse_date(value):
    """日付文字列をdatetimeに変換。複数のフォーマットに対応。"""
    formats = [
        "%Y/%m/%d",
        "%Y-%m-%d",
        "%Y年%m月%d日",
        "%m/%d/%Y",
        "%d/%m/%Y",
        "%Y.%m.%d",
    ]
    cleaned = str(value).strip()
    for fmt in formats:
        try:
            return datetime.strptime(cleaned, fmt)
        except ValueError:
            continue
    raise ValueError(f"日付フォーマットを認識できません: {value}")


def read_csv_file(filepath, platform, column_maps):
    """CSVファイルを読み込み、統一フォーマットのレコードリストを返す。"""
    col_map = column_maps.get(platform, DEFAULT_COLUMN_MAPS.get(platform, {}))
    records = []

    encodings = ["utf-8-sig", "utf-8", "shift_jis", "cp932"]
    content = None

    for enc in encodings:
        try:
            with open(filepath, "r", encoding=enc) as f:
                content = f.read()
            break
        except (UnicodeDecodeError, UnicodeError):
            continue

    if content is None:
        raise ValueError(f"ファイルのエンコーディングを検出できません: {filepath}")

    lines = content.splitlines()

    # メタデータ行・空行をスキップしてCSVヘッダを探す
    # Google Ads等は先頭にタイトル行・期間行があるため、
    # カンマ区切りのフィールド数が多い行をヘッダとみなす
    skip_rows = 0
    min_fields = 4
    for line in lines:
        stripped = line.strip()
        if stripped == "" or stripped.startswith("#"):
            skip_rows += 1
        elif stripped.count(",") < min_fields - 1:
            skip_rows += 1
        else:
            break

    reader = csv.DictReader(lines[skip_rows:])
    headers = reader.fieldnames
    if headers is None:
        raise ValueError(f"CSVヘッダが見つかりません: {filepath}")

    # カラムマッピング解決
    resolved = {}
    for key, candidates in col_map.items():
        col_name = find_column(headers, candidates)
        if col_name is None:
            if key in ("date", "cost"):
                raise ValueError(
                    f"必須カラム '{key}' がCSV内に見つかりません。"
                    f"\n  ファイル: {filepath}"
                    f"\n  検索した候補: {candidates}"
                    f"\n  CSVヘッダ: {headers}"
                )
        resolved[key] = col_name

    for row in reader:
        date_val = row.get(resolved.get("date"))
        if date_val is None or str(date_val).strip() in ("", "合計", "Total"):
            continue

        try:
            dt = parse_date(date_val)
        except ValueError:
            continue

        record = {
            "date": dt,
            "platform": platform,
            "campaign": (
                row.get(resolved.get("campaign"), "").strip()
                if resolved.get("campaign")
                else "全体"
            ),
            "cost": round(parse_number(row.get(resolved.get("cost"), 0))),
            "impressions": round(
                parse_number(row.get(resolved.get("impressions"), 0))
            ),
            "clicks": round(parse_number(row.get(resolved.get("clicks"), 0))),
            "conversions": round(
                parse_number(row.get(resolved.get("conversions"), 0))
            ),
        }
        records.append(record)

    return records


def get_week_number(dt, month_start):
    """月初からの週番号を返す（1始まり）。"""
    day_offset = (dt - month_start).days
    return (day_offset // 7) + 1


def get_week_dates(year, month, week_num):
    """指定月の week_num 番目の週の開始日・終了日を返す。"""
    month_start = datetime(year, month, 1)
    if month == 12:
        next_month = datetime(year + 1, 1, 1)
    else:
        next_month = datetime(year, month + 1, 1)
    month_end = next_month - timedelta(days=1)

    week_start = month_start + timedelta(days=(week_num - 1) * 7)
    week_end = min(week_start + timedelta(days=6), month_end)

    return week_start, week_end


def safe_div(a, b):
    """ゼロ除算を防ぐ除算。"""
    if b == 0:
        return 0
    return a / b


def calc_change(current, previous):
    """前期比の変化率（%）を算出。"""
    if previous == 0:
        return 0 if current == 0 else 100.0
    return round((current - previous) / previous * 100, 1)


def build_data_json(all_records, client_name, client_id, existing_data=None):
    """全レコードからdata.json構造を構築する。"""
    # 既存データがあればベースにする
    if existing_data is not None:
        data = {
            "client": dict(existing_data.get("client", {})),
            "months": {k: dict(v) for k, v in existing_data.get("months", {}).items()},
        }
    else:
        data = {"client": {"name": client_name, "id": client_id}, "months": {}}

    # クライアント情報を更新
    if client_name:
        data["client"] = {
            **data["client"],
            "name": client_name,
            "id": client_id,
        }

    # 月ごとにグループ化
    months_data = defaultdict(list)
    for rec in all_records:
        month_key = rec["date"].strftime("%Y-%m")
        months_data[month_key].append(rec)

    sorted_month_keys = sorted(months_data.keys())

    for month_key in sorted_month_keys:
        records = months_data[month_key]
        year = int(month_key[:4])
        month = int(month_key[5:7])
        month_start = datetime(year, month, 1)

        # --- 月次集計 ---
        month_cost = sum(r["cost"] for r in records)
        month_imp = sum(r["impressions"] for r in records)
        month_clicks = sum(r["clicks"] for r in records)
        month_cv = sum(r["conversions"] for r in records)

        month_summary = {
            "cost": month_cost,
            "impressions": month_imp,
            "clicks": month_clicks,
            "conversions": month_cv,
            "ctr": round(safe_div(month_clicks, month_imp) * 100, 2),
            "cvr": round(safe_div(month_cv, month_clicks) * 100, 2),
            "cpc": int(safe_div(month_cost, month_clicks)),
            "cpa": int(safe_div(month_cost, month_cv)),
        }

        # --- プラットフォーム別 ---
        platform_records = defaultdict(list)
        for r in records:
            platform_records[r["platform"]].append(r)

        platforms = {}
        for pf, pf_records in platform_records.items():
            pf_cost = sum(r["cost"] for r in pf_records)
            pf_imp = sum(r["impressions"] for r in pf_records)
            pf_clicks = sum(r["clicks"] for r in pf_records)
            pf_cv = sum(r["conversions"] for r in pf_records)

            # キャンペーン別
            campaign_records = defaultdict(list)
            for r in pf_records:
                campaign_records[r["campaign"]].append(r)

            campaigns = []
            for camp_name, camp_records in sorted(campaign_records.items()):
                c_cost = sum(r["cost"] for r in camp_records)
                c_imp = sum(r["impressions"] for r in camp_records)
                c_clicks = sum(r["clicks"] for r in camp_records)
                c_cv = sum(r["conversions"] for r in camp_records)
                campaigns.append(
                    {
                        "name": camp_name,
                        "cost": c_cost,
                        "impressions": c_imp,
                        "clicks": c_clicks,
                        "conversions": c_cv,
                        "cpa": int(safe_div(c_cost, c_cv)),
                    }
                )

            pf_data = {
                "cost": pf_cost,
                "impressions": pf_imp,
                "clicks": pf_clicks,
                "conversions": pf_cv,
                "ctr": round(safe_div(pf_clicks, pf_imp) * 100, 2),
                "cvr": round(safe_div(pf_cv, pf_clicks) * 100, 2),
                "cpa": int(safe_div(pf_cost, pf_cv)),
                "cpaChange": 0,
                "campaigns": campaigns,
            }
            platforms[pf] = pf_data

        # --- 週次集計 ---
        week_groups = defaultdict(list)
        for r in records:
            wn = get_week_number(r["date"], month_start)
            week_groups[wn].append(r)

        weeks = {}
        for wn in sorted(week_groups.keys()):
            w_records = week_groups[wn]
            w_start, w_end = get_week_dates(year, month, wn)

            w_cost = sum(r["cost"] for r in w_records)
            w_imp = sum(r["impressions"] for r in w_records)
            w_clicks = sum(r["clicks"] for r in w_records)
            w_cv = sum(r["conversions"] for r in w_records)

            # 日別データ集計
            daily_map = defaultdict(
                lambda: {
                    "cost": 0,
                    "impressions": 0,
                    "clicks": 0,
                    "conversions": 0,
                }
            )
            for r in w_records:
                day_key = r["date"].strftime("%Y-%m-%d")
                daily_map[day_key]["cost"] += r["cost"]
                daily_map[day_key]["impressions"] += r["impressions"]
                daily_map[day_key]["clicks"] += r["clicks"]
                daily_map[day_key]["conversions"] += r["conversions"]
                daily_map[day_key]["_dt"] = r["date"]

            daily = []
            for day_key in sorted(daily_map.keys()):
                d = daily_map[day_key]
                dt = d.get("_dt", parse_date(day_key))
                daily.append(
                    {
                        "date": day_key,
                        "dayOfWeek": WEEKDAY_MAP[dt.weekday()],
                        "cost": d["cost"],
                        "impressions": d["impressions"],
                        "clicks": d["clicks"],
                        "conversions": d["conversions"],
                    }
                )

            # 週別の媒体別集計
            week_platform_data = defaultdict(
                lambda: {
                    "cost": 0,
                    "impressions": 0,
                    "clicks": 0,
                    "conversions": 0,
                }
            )
            for r in w_records:
                wp = week_platform_data[r["platform"]]
                wp["cost"] += r["cost"]
                wp["impressions"] += r["impressions"]
                wp["clicks"] += r["clicks"]
                wp["conversions"] += r["conversions"]

            week_platforms = {}
            for pf_name, wp in week_platform_data.items():
                week_platforms[pf_name] = {
                    "cost": wp["cost"],
                    "impressions": wp["impressions"],
                    "clicks": wp["clicks"],
                    "conversions": wp["conversions"],
                    "ctr": round(
                        safe_div(wp["clicks"], wp["impressions"]) * 100, 2
                    ),
                    "cvr": round(
                        safe_div(wp["conversions"], wp["clicks"]) * 100, 2
                    ),
                    "cpa": int(safe_div(wp["cost"], wp["conversions"])),
                }

            date_format = "%Y-%m-%d"
            weeks[f"week{wn}"] = {
                "dates": f"{w_start.strftime(date_format)} ~ {w_end.strftime(date_format)}",
                "summary": {
                    "cost": w_cost,
                    "impressions": w_imp,
                    "clicks": w_clicks,
                    "conversions": w_cv,
                    "cpa": int(safe_div(w_cost, w_cv)),
                },
                "daily": daily,
                "platforms": week_platforms if week_platforms else None,
            }

        # 週別データからplatformsがNoneのものを除去
        for wk_key, wk_val in weeks.items():
            if wk_val.get("platforms") is None:
                del wk_val["platforms"]

        month_data = {
            "summary": month_summary,
            "previousMonthChange": {},
            "platforms": platforms,
            "weeks": weeks,
        }

        data["months"][month_key] = month_data

    # --- 前月比の計算 ---
    all_month_keys = sorted(data["months"].keys())
    for i, mk in enumerate(all_month_keys):
        if i == 0:
            data["months"][mk]["previousMonthChange"] = {
                "cost": 0,
                "impressions": 0,
                "clicks": 0,
                "conversions": 0,
                "ctr": 0,
                "cvr": 0,
                "cpc": 0,
                "cpa": 0,
            }
            continue

        prev_mk = all_month_keys[i - 1]
        curr = data["months"][mk]["summary"]
        prev = data["months"][prev_mk]["summary"]

        data["months"][mk]["previousMonthChange"] = {
            "cost": calc_change(curr["cost"], prev["cost"]),
            "impressions": calc_change(curr["impressions"], prev["impressions"]),
            "clicks": calc_change(curr["clicks"], prev["clicks"]),
            "conversions": calc_change(
                curr["conversions"], prev["conversions"]
            ),
            "ctr": calc_change(curr["ctr"], prev["ctr"]),
            "cvr": calc_change(curr["cvr"], prev["cvr"]),
            "cpc": calc_change(curr["cpc"], prev["cpc"]),
            "cpa": calc_change(curr["cpa"], prev["cpa"]),
        }

        # プラットフォーム別CPA変化率
        for pf in data["months"][mk].get("platforms", {}):
            curr_pf = data["months"][mk]["platforms"][pf]
            prev_pf = data["months"][prev_mk].get("platforms", {}).get(pf)
            if prev_pf:
                curr_pf["cpaChange"] = calc_change(
                    curr_pf["cpa"], prev_pf["cpa"]
                )

    return data


def main():
    parser = argparse.ArgumentParser(
        description="広告CSVデータ → data.json 変換ツール",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
使用例:
  # 全プラットフォームのCSVを指定
  python csv_to_json.py \\
    --google data/google_ads.csv \\
    --meta data/meta_ads.csv \\
    --output ../sample-client/data.json

  # 1つのプラットフォームだけ更新
  python csv_to_json.py \\
    --google data/google_ads_feb.csv \\
    --merge \\
    --output ../sample-client/data.json

  # クライアント名を指定
  python csv_to_json.py \\
    --google data/google.csv \\
    --client "株式会社ABC" \\
    --output ../sample-client/data.json
        """,
    )

    parser.add_argument("--google", help="Google Ads CSVファイルパス")
    parser.add_argument("--meta", help="Meta (Facebook/Instagram) Ads CSVファイルパス")
    parser.add_argument("--yahoo", help="Yahoo! Ads CSVファイルパス")
    parser.add_argument("--line", help="LINE Ads CSVファイルパス")

    parser.add_argument(
        "--client",
        default="クライアント名",
        help="クライアント名 (デフォルト: クライアント名)",
    )
    parser.add_argument(
        "--client-id",
        default="client",
        help="クライアントID (デフォルト: client)",
    )

    parser.add_argument(
        "--output",
        "-o",
        default="data.json",
        help="出力先 data.json パス (デフォルト: data.json)",
    )

    parser.add_argument(
        "--merge",
        action="store_true",
        help="既存のdata.jsonにマージする（新しい月のデータを追加）",
    )

    parser.add_argument(
        "--config",
        help="カラムマッピング設定ファイル（JSON）",
    )

    args = parser.parse_args()

    # CSVファイルが1つも指定されていない場合
    platforms_input = {
        "google": args.google,
        "meta": args.meta,
        "yahoo": args.yahoo,
        "line": args.line,
    }

    active_platforms = {k: v for k, v in platforms_input.items() if v}
    if not active_platforms:
        parser.error(
            "CSVファイルを最低1つ指定してください（--google, --meta, --yahoo, --line）"
        )

    # カラムマッピング読み込み
    column_maps = dict(DEFAULT_COLUMN_MAPS)
    if args.config:
        try:
            with open(args.config, "r", encoding="utf-8") as f:
                custom_maps = json.load(f)
            for platform, mapping in custom_maps.items():
                if platform in column_maps:
                    column_maps[platform] = {**column_maps[platform], **mapping}
                else:
                    column_maps[platform] = mapping
        except (json.JSONDecodeError, FileNotFoundError) as e:
            print(f"設定ファイルの読み込みに失敗: {e}", file=sys.stderr)
            sys.exit(1)

    # 既存データの読み込み（マージモード）
    existing_data = None
    if args.merge and os.path.exists(args.output):
        try:
            with open(args.output, "r", encoding="utf-8") as f:
                existing_data = json.load(f)
            print(f"既存データを読み込みました: {args.output}")
        except (json.JSONDecodeError, FileNotFoundError) as e:
            print(f"既存データの読み込みに失敗（新規作成します）: {e}")

    # CSV読み込み
    all_records = []
    for platform, filepath in active_platforms.items():
        if not os.path.exists(filepath):
            print(f"ファイルが見つかりません: {filepath}", file=sys.stderr)
            sys.exit(1)

        try:
            records = read_csv_file(filepath, platform, column_maps)
            all_records.extend(records)
            print(f"  {platform}: {len(records)}行 読み込み ({filepath})")
        except ValueError as e:
            print(f"エラー [{platform}]: {e}", file=sys.stderr)
            sys.exit(1)

    if not all_records:
        print("有効なデータが見つかりませんでした。", file=sys.stderr)
        sys.exit(1)

    # data.json構築
    data = build_data_json(
        all_records,
        client_name=args.client,
        client_id=args.client_id,
        existing_data=existing_data,
    )

    # 出力
    output_dir = os.path.dirname(args.output)
    if output_dir:
        os.makedirs(output_dir, exist_ok=True)

    with open(args.output, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    months = sorted(data["months"].keys())
    total_weeks = sum(
        len(data["months"][m].get("weeks", {})) for m in months
    )
    platforms_found = set()
    for m in months:
        for pf in data["months"][m].get("platforms", {}):
            platforms_found.add(pf)

    print(f"\ndata.json を生成しました: {args.output}")
    print(f"  クライアント: {data['client']['name']}")
    print(f"  対象月: {', '.join(months)}")
    print(f"  週数: {total_weeks}")
    print(f"  媒体: {', '.join(sorted(platforms_found))}")
    print(f"  レコード数: {len(all_records)}")


if __name__ == "__main__":
    main()
