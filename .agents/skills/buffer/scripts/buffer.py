#!/usr/bin/env python3
"""Buffer API CLI. Zero dependencies beyond Python stdlib."""

import argparse, json, os, sys, urllib.request, urllib.error, urllib.parse


def get_token():
    token = os.environ.get("BUFFER_ACCESS_TOKEN", "")
    if not token:
        env_path = os.path.join(os.environ.get("WORKSPACE", os.path.expanduser("~/.openclaw/workspace")), ".env")
        if os.path.exists(env_path):
            with open(env_path) as f:
                for line in f:
                    line = line.strip()
                    if line.startswith("BUFFER_ACCESS_TOKEN="):
                        token = line.split("=", 1)[1].strip().strip('"').strip("'")
    if not token:
        print("Error: BUFFER_ACCESS_TOKEN not set", file=sys.stderr)
        sys.exit(1)
    return token


def api(method, path, data=None, params=None):
    url = "https://api.bufferapp.com/1" + path
    if params: url += ("&" if "?" in url else "?") + urllib.parse.urlencode(params)
    body = json.dumps(data).encode() if data else None
    req = urllib.request.Request(url, data=body, method=method)
    req.add_header("Authorization", f"Bearer {get_token()}")
    req.add_header("Content-Type", "application/json")
    try:
        resp = urllib.request.urlopen(req, timeout=30)
        raw = resp.read().decode()
        return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        print(f"API Error {e.code}: {e.read().decode()}", file=sys.stderr); sys.exit(1)


def cmd_profiles(a):
    d = api("GET", "/profiles.json")
    for p in (d if isinstance(d,list) else []): print(json.dumps({"id":p["id"],"service":p.get("service"),"service_username":p.get("service_username"),"counts":p.get("counts")}))

def cmd_pending(a):
    d = api("GET", f"/profiles/{a.profile_id}/updates/pending.json")
    for u in d.get("updates",[]): print(json.dumps({"id":u["id"],"text":u.get("text","")[:100],"due_at":u.get("due_at")}))

def cmd_sent(a):
    d = api("GET", f"/profiles/{a.profile_id}/updates/sent.json", params={"count": str(a.limit)})
    for u in d.get("updates",[]): print(json.dumps({"id":u["id"],"text":u.get("text","")[:100],"sent_at":u.get("sent_at"),"statistics":u.get("statistics",{})}))

def cmd_create(a):
    d = urllib.parse.urlencode({"text": a.text, "profile_ids[]": a.profile_ids}, doseq=True).encode()
    url = "https://api.bufferapp.com/1/updates/create.json"
    req = urllib.request.Request(url, data=d, method="POST")
    req.add_header("Authorization", f"Bearer {get_token()}")
    req.add_header("Content-Type", "application/x-www-form-urlencoded")
    try:
        resp = urllib.request.urlopen(req, timeout=30)
        print(json.dumps(json.loads(resp.read().decode()), indent=2))
    except urllib.error.HTTPError as e:
        print(f"API Error: {e.read().decode()}", file=sys.stderr); sys.exit(1)

def cmd_update_get(a): print(json.dumps(api("GET", f"/updates/{a.id}.json"), indent=2))

def cmd_delete(a):
    api("POST", f"/updates/{a.id}/destroy.json"); print(json.dumps({"ok":True}))

def cmd_shuffle(a):
    api("POST", f"/profiles/{a.profile_id}/updates/shuffle.json"); print(json.dumps({"ok":True}))

def cmd_me(a): print(json.dumps(api("GET", "/user.json"), indent=2))

def main():
    p = argparse.ArgumentParser(description="Buffer Social Media CLI")
    s = p.add_subparsers(dest="command")
    s.add_parser("profiles")
    x = s.add_parser("pending"); x.add_argument("profile_id")
    x = s.add_parser("sent"); x.add_argument("profile_id"); x.add_argument("--limit", type=int, default=20)
    x = s.add_parser("create"); x.add_argument("text"); x.add_argument("profile_ids", help="Comma-separated profile IDs")
    x = s.add_parser("update"); x.add_argument("id")
    x = s.add_parser("delete"); x.add_argument("id")
    x = s.add_parser("shuffle"); x.add_argument("profile_id")
    s.add_parser("me")
    a = p.parse_args()
    c = {"profiles":cmd_profiles,"pending":cmd_pending,"sent":cmd_sent,"create":cmd_create,"update":cmd_update_get,"delete":cmd_delete,"shuffle":cmd_shuffle,"me":cmd_me}
    if a.command in c: c[a.command](a)
    else: p.print_help()

if __name__ == "__main__": main()
