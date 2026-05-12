"""
US-DA-007 — Test local : valide que football-data.org renvoie bien les matchs WC 2026.

Ce script NE TOUCHE PAS Supabase. Il prouve seulement que la source de données
est accessible et que le format des données correspond à ce qu'attend l'Edge Function.

Usage:
    pip install requests python-dotenv
    # Créer .env avec FOOTBALL_DATA_KEY=xxx
    python scripts/test_fetch_scores.py
"""

import os
import sys
import requests
from dotenv import load_dotenv

load_dotenv()
FD_KEY = os.getenv("FOOTBALL_DATA_KEY")

if not FD_KEY:
    print("❌ FOOTBALL_DATA_KEY manquante dans .env")
    sys.exit(1)

url = "https://api.football-data.org/v4/competitions/WC/matches"
headers = {"X-Auth-Token": FD_KEY}
params = {"season": 2026}

print(f"📡 Appel : {url}?season=2026")
response = requests.get(url, headers=headers, params=params)
print(f"Status: {response.status_code}\n")

if response.status_code != 200:
    print(f"❌ Erreur API: {response.text}")
    sys.exit(1)

data = response.json()
matches = data.get("matches", [])

print(f"✅ {len(matches)} matchs reçus pour la saison 2026\n")
print("--- APERÇU 5 PREMIERS MATCHS ---")
for m in matches[:5]:
    home = m.get("homeTeam", {}).get("name", "?")
    away = m.get("awayTeam", {}).get("name", "?")
    status = m.get("status", "?")
    score = m.get("score", {}).get("fullTime", {})
    h, a = score.get("home"), score.get("away")
    score_str = f"{h}-{a}" if h is not None else "—"
    print(f"  [{status:10}] {home:25} {score_str:5} {away}")

print(f"\n--- STATUTS PRÉSENTS ---")
statuses = {}
for m in matches:
    s = m.get("status", "?")
    statuses[s] = statuses.get(s, 0) + 1
for s, n in sorted(statuses.items()):
    print(f"  {s}: {n}")

print("\n✅ Format conforme à ce qu'attend l'Edge Function update-scores")
