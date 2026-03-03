"""Aggregate Arity visit count CSV into GeoJSON for the app."""
import csv
import json
from collections import defaultdict

INPUT = r"D:\1. Project Developments\1. Enterprise Analytics\Arity Car Movement Data\Visit_Counts_Los_Angeles_Fast_Food_and_Hardware_Stores_20260201_to_20260207.csv"
OUTPUT = r"C:\Users\jhon9904\Esri_Arity_App\data\arity_visits.geojson"

locations = defaultdict(lambda: {
    "total_visits": 0,
    "day_count": 0,
    "min_visits": float("inf"),
    "max_visits": 0,
    "dates": set(),
})

with open(INPUT, newline="", encoding="utf-8") as f:
    reader = csv.DictReader(f)
    for row in reader:
        pk = row["placekey"]
        vc = int(row["visit_count"])
        loc = locations[pk]
        loc["total_visits"] += vc
        loc["day_count"] += 1
        loc["min_visits"] = min(loc["min_visits"], vc)
        loc["max_visits"] = max(loc["max_visits"], vc)
        loc["dates"].add(row["tripdate"])
        # store metadata (last wins, all same for same placekey)
        loc["brand"] = row["brand"]
        loc["top_category"] = row["top_category"]
        loc["sub_category"] = row["sub_category"]
        loc["latitude"] = float(row["latitude"])
        loc["longitude"] = float(row["longitude"])
        loc["street_address"] = row["street_address"]
        loc["city"] = row["city"]
        loc["region"] = row["region"]
        loc["postal_code"] = row["postal_code"]

features = []
for pk, loc in locations.items():
    avg = round(loc["total_visits"] / loc["day_count"], 1)
    features.append({
        "type": "Feature",
        "geometry": {
            "type": "Point",
            "coordinates": [loc["longitude"], loc["latitude"]],
        },
        "properties": {
            "placekey": pk,
            "brand": loc["brand"],
            "top_category": loc["top_category"],
            "sub_category": loc["sub_category"],
            "street_address": loc["street_address"],
            "city": loc["city"],
            "region": loc["region"],
            "postal_code": loc["postal_code"],
            "total_visits": loc["total_visits"],
            "avg_daily_visits": avg,
            "max_daily_visits": loc["max_visits"],
            "min_daily_visits": loc["min_visits"] if loc["min_visits"] != float("inf") else 0,
            "days_observed": loc["day_count"],
        },
    })

geojson = {"type": "FeatureCollection", "features": features}

with open(OUTPUT, "w", encoding="utf-8") as f:
    json.dump(geojson, f)

print(f"Wrote {len(features)} features to {OUTPUT}")
# Print some stats
total_visits = sum(f["properties"]["total_visits"] for f in features)
max_v = max(f["properties"]["total_visits"] for f in features)
print(f"Total visit count: {total_visits:,}")
print(f"Max total visits at a location: {max_v}")
brands = set(f["properties"]["brand"] for f in features)
print(f"Unique brands: {len(brands)}")
cats = set(f["properties"]["sub_category"] for f in features)
print(f"Sub-categories: {cats}")
