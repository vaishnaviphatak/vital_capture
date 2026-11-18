"""
Migration script: SQLite (patients.db) → Supabase
Run once: python migrate_to_supabase.py
"""
import sqlite3
import json
import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

DB_PATH = "patients.db"

print("Connecting to SQLite...")
conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

# --- Migrate Users ---
cursor.execute("SELECT id, user_name, face_encoding FROM Users")
users = cursor.fetchall()
print(f"Found {len(users)} user(s) in SQLite.")

user_id_map = {}  # old_sqlite_id -> new_supabase_id

for old_id, name, encoding in users:
    result = supabase.table("users").insert({
        "user_name": name,
        "face_encoding": encoding
    }).execute()

    if result.data:
        new_id = result.data[0]["id"]
        user_id_map[old_id] = new_id
        print(f"  [OK] Migrated user '{name}' (old id={old_id} -> new id={new_id})")
    else:
        print(f"  [FAIL] Failed to migrate user '{name}'")

# --- Migrate History ---
cursor.execute("SELECT id, user_id, timestamp, bpm, rmssd, resp_rate, stress_lvl FROM History")
history_rows = cursor.fetchall()
print(f"\nFound {len(history_rows)} history record(s) in SQLite.")

for row in history_rows:
    old_id, old_user_id, timestamp, bpm, rmssd, resp_rate, stress_lvl = row
    new_user_id = user_id_map.get(old_user_id)

    if not new_user_id:
        print(f"  [SKIP] Skipping history id={old_id}, user_id={old_user_id} not mapped.")
        continue

    result = supabase.table("history").insert({
        "user_id": new_user_id,
        "timestamp": timestamp,
        "bpm": bpm,
        "rmssd": rmssd,
        "resp_rate": resp_rate,
        "stress_lvl": stress_lvl
    }).execute()

    if result.data:
        print(f"  [OK] Migrated history id={old_id} for user_id={new_user_id}")
    else:
        print(f"  [FAIL] Failed to migrate history id={old_id}")

conn.close()
print("\nMigration complete!")
