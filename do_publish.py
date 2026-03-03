"""Publish Arity data to ArcGIS Online via REST API."""
import json
import urllib.request
import urllib.parse
import os
import sys

USERNAME = "modelhealthorg"
PASSWORD = "Healthy#2023"
PORTAL = "https://www.arcgis.com"
GEOJSON = os.path.join(os.path.dirname(__file__), "data", "arity_visits.geojson")

def post(url, data):
    encoded = urllib.parse.urlencode(data).encode()
    req = urllib.request.Request(url, data=encoded)
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read())

def post_multipart(url, fields, files):
    import http.client
    import mimetypes
    boundary = "----PythonFormBoundary7MA4YWxkTrZu0gW"
    body = b""
    for key, val in fields.items():
        body += f"--{boundary}\r\nContent-Disposition: form-data; name=\"{key}\"\r\n\r\n{val}\r\n".encode()
    for key, (filename, data, mime) in files.items():
        body += f"--{boundary}\r\nContent-Disposition: form-data; name=\"{key}\"; filename=\"{filename}\"\r\nContent-Type: {mime}\r\n\r\n".encode()
        body += data + b"\r\n"
    body += f"--{boundary}--\r\n".encode()
    req = urllib.request.Request(url, data=body)
    req.add_header("Content-Type", f"multipart/form-data; boundary={boundary}")
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read())

# 1. Generate token
print("1. Generating token...")
token_data = post(f"{PORTAL}/sharing/rest/generateToken", {
    "username": USERNAME, "password": PASSWORD,
    "client": "referer", "referer": "http://localhost",
    "expiration": 120, "f": "json"
})
if "token" not in token_data:
    print(f"ERROR: {token_data}")
    sys.exit(1)
token = token_data["token"]
print(f"   Token obtained ({len(token)} chars)")

# 2. Upload GeoJSON
print("2. Uploading GeoJSON...")
with open(GEOJSON, "rb") as f:
    geojson_bytes = f.read()
print(f"   File size: {len(geojson_bytes):,} bytes")

result = post_multipart(
    f"{PORTAL}/sharing/rest/content/users/{USERNAME}/addItem",
    {
        "f": "json",
        "token": token,
        "type": "GeoJson",
        "title": "Arity Car Movement Data - LA Metro Feb 2026",
        "snippet": "Aggregated weekly visit counts for 7,964 locations from Arity connected car data",
        "tags": "Arity,connected car,visit counts,foot traffic,Los Angeles,retail,site analysis",
        "description": "Aggregated visit counts for 7,964 fast food and hardware store locations in Greater LA, from Arity connected car data (Feb 1-7, 2026). 186 brands, 3.65M total weekly visits.",
    },
    {
        "file": ("arity_visits.geojson", geojson_bytes, "application/json")
    }
)
print(f"   Upload result: success={result.get('success')}, id={result.get('id')}")
if not result.get("success"):
    print(f"   ERROR: {result}")
    sys.exit(1)
item_id = result["id"]

# 3. Publish as Feature Service
print("3. Publishing as Feature Service...")
publish_params = {
    "f": "json",
    "token": token,
    "itemID": item_id,
    "filetype": "geojson",
    "publishParameters": json.dumps({
        "name": "Arity_Visit_Data_LA_Metro_2026",
        "targetSR": {"wkid": 102100},
        "maxRecordCount": 10000,
        "layerInfo": {"capabilities": "Query,Extract"}
    }),
    "outputType": "featureService"
}
pub_result = post(f"{PORTAL}/sharing/rest/content/users/{USERNAME}/publish", publish_params)
print(f"   Publish result: {json.dumps(pub_result, indent=2)[:500]}")

if pub_result.get("services"):
    svc = pub_result["services"][0]
    service_id = svc.get("serviceItemId", "")
    service_url = svc.get("serviceurl", "")
    print(f"\n   SERVICE ITEM ID: {service_id}")
    print(f"   SERVICE URL: {service_url}")
    print(f"   PORTAL ITEM: {PORTAL}/home/item.html?id={service_id}")

    # 4. Apply renderer
    print("\n4. Applying symbology...")
    renderer = {
        "visualVariables": [
            {"type": "sizeInfo", "field": "total_visits",
             "stops": [{"value":20,"size":4},{"value":300,"size":10},{"value":1500,"size":18},{"value":5000,"size":28}]},
            {"type": "colorInfo", "field": "avg_daily_visits",
             "stops": [
                 {"value":5,"color":[69,117,180,180]},{"value":40,"color":[254,224,144,200]},
                 {"value":120,"color":[244,109,67,220]},{"value":350,"color":[165,0,38,255]}
             ]}
        ],
        "type": "simple",
        "symbol": {"type":"esriSMS","style":"esriSMSCircle","size":8,
                   "color":[255,138,101,180],"outline":{"color":[255,87,34,100],"width":0.5}}
    }
    try:
        admin_url = service_url.replace("/rest/services/", "/rest/admin/services/")
        update_url = f"{admin_url}/0/updateDefinition"
        update_data = {
            "f": "json", "token": token,
            "updateDefinition": json.dumps({"drawingInfo": {"renderer": renderer}})
        }
        upd_result = post(update_url, update_data)
        print(f"   Renderer update: {upd_result}")
    except Exception as e:
        print(f"   Renderer update skipped: {e}")

    # 5. Share publicly
    print("\n5. Sharing publicly...")
    try:
        share_result = post(f"{PORTAL}/sharing/rest/content/users/{USERNAME}/items/{service_id}/share", {
            "f": "json", "token": token, "everyone": "true", "org": "true"
        })
        print(f"   Share result: {share_result}")
        # Also share the source item
        post(f"{PORTAL}/sharing/rest/content/users/{USERNAME}/items/{item_id}/share", {
            "f": "json", "token": token, "everyone": "true", "org": "true"
        })
    except Exception as e:
        print(f"   Share skipped: {e}")

    print("\n" + "="*60)
    print("DONE! Published to ArcGIS Online")
    print(f"Item URL: {PORTAL}/home/item.html?id={service_id}")
    print(f"Service URL: {service_url}")
    print("="*60)
else:
    print(f"Publish may be processing. Check AGOL portal.")
    print(f"Source item: {PORTAL}/home/item.html?id={item_id}")
