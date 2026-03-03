"""
Publish Arity Visit Data to ArcGIS Online as a Hosted Feature Service.
Requires: pip install arcgis

Usage:
  python publish_to_agol.py

You will be prompted for your ArcGIS Online credentials.
"""
import os
import sys

try:
    from arcgis.gis import GIS
    from arcgis.features import FeatureLayerCollection
except ImportError:
    print("ERROR: arcgis package not found. Install with: pip install arcgis")
    sys.exit(1)

CSV_PATH = os.path.join(
    "D:\\", "1. Project Developments", "1. Enterprise Analytics",
    "Arity Car Movement Data",
    "Visit_Counts_Los_Angeles_Fast_Food_and_Hardware_Stores_20260201_to_20260207.csv"
)
GEOJSON_PATH = os.path.join(os.path.dirname(__file__), "data", "arity_visits.geojson")

def main():
    print("=" * 60)
    print("Arity Visit Data — ArcGIS Online Publisher")
    print("=" * 60)

    # Connect
    print("\nConnecting to ArcGIS Online...")
    username = input("Username: ").strip()
    password = input("Password: ").strip()
    portal = input("Portal URL (press Enter for https://www.arcgis.com): ").strip()
    if not portal:
        portal = "https://www.arcgis.com"

    gis = GIS(portal, username, password)
    print(f"Connected as: {gis.properties.user.username}")

    # Upload GeoJSON (aggregated data — smaller, better for web)
    print(f"\nUploading aggregated GeoJSON: {GEOJSON_PATH}")
    if not os.path.exists(GEOJSON_PATH):
        print("ERROR: GeoJSON not found. Run aggregate_data.py first.")
        sys.exit(1)

    item_props = {
        "title": "Arity Car Movement Data — LA Metro (Feb 2026)",
        "description": (
            "Aggregated weekly visit counts for 7,964 fast food restaurants and "
            "hardware stores in the Greater Los Angeles area, derived from Arity "
            "connected car data (Feb 1-7, 2026). Fields include total weekly visits, "
            "average daily visits, peak visits, brand, and category."
        ),
        "tags": "Arity, connected car, visit counts, foot traffic, Los Angeles, retail, site analysis",
        "type": "GeoJson",
        "snippet": "Arity connected car visit data for LA metro restaurants and hardware stores."
    }

    geojson_item = gis.content.add(item_props, data=GEOJSON_PATH)
    print(f"Uploaded item: {geojson_item.title} (ID: {geojson_item.id})")

    # Publish as Feature Service
    print("\nPublishing as Hosted Feature Service...")
    publish_params = {
        "name": "Arity_Visit_Data_LA_Metro",
        "layerInfo": {"capabilities": "Query"}
    }
    feature_service = geojson_item.publish(publish_parameters=publish_params)
    print(f"Published: {feature_service.title}")
    print(f"URL: {feature_service.url}")

    # Apply renderer (graduated symbol by total_visits)
    print("\nApplying symbology...")
    flc = FeatureLayerCollection.fromitem(feature_service)
    layer = flc.layers[0]

    renderer = {
        "type": "simple",
        "symbol": {
            "type": "esriSMS", "style": "esriSMSCircle", "size": 8,
            "color": [255, 138, 101, 180],
            "outline": {"color": [255, 87, 34, 100], "width": 0.5}
        },
        "visualVariables": [
            {
                "type": "sizeInfo", "field": "total_visits",
                "stops": [
                    {"value": 20, "size": 4},
                    {"value": 300, "size": 10},
                    {"value": 1500, "size": 18},
                    {"value": 5000, "size": 28}
                ]
            },
            {
                "type": "colorInfo", "field": "avg_daily_visits",
                "stops": [
                    {"value": 5,   "color": [69, 117, 180, 180]},
                    {"value": 40,  "color": [254, 224, 144, 200]},
                    {"value": 120, "color": [244, 109, 67, 220]},
                    {"value": 350, "color": [165, 0, 38, 255]}
                ]
            }
        ]
    }

    drawing_info = {"renderer": renderer}
    update_result = layer.manager.update_definition({"drawingInfo": drawing_info})
    print(f"Symbology applied: {update_result}")

    # Share publicly (optional)
    share = input("\nShare publicly? (y/n): ").strip().lower()
    if share == "y":
        feature_service.share(everyone=True)
        print("Shared publicly.")

    print("\n" + "=" * 60)
    print("DONE!")
    print(f"Item URL: {portal}/home/item.html?id={feature_service.id}")
    print(f"Feature Service URL: {feature_service.url}")
    print("=" * 60)

if __name__ == "__main__":
    main()
