#!/usr/bin/env python3
"""
Gemini API Test Data Generator for CostPlusDB
Generates realistic test data for 5 Shared tier databases using Gemini 1.5 Flash
Rate limited to stay within free tier (200 requests/day)
"""

import time
import os
from pathlib import Path
import google.generativeai as genai

# Configuration
API_KEY = "AIzaSyBbSWySlWh44sW3Kl-SGln_v-4CTH6Tvlw"
MODEL_NAME = "gemini-2.5-flash"

# CRITICAL FREE TIER LIMITS (2025)
FREE_TIER_DAILY_LIMIT = 200  # Gemini API: 200 requests/day
SAFETY_STOP_AT = 190         # Stop at 190 to leave margin for errors

# Rate limiting: 2 seconds per request (SAFE - well under free tier limits)
# At 2 sec/request: 159 requests = 5.3 minutes total
RATE_LIMIT_DELAY = 2.0  # seconds between requests

# Database configurations - OPTIMIZED FOR FREE TIER
# 100 rows per batch, targeting ~180 requests total
DATABASES = {
    "customer1": {
        "name": "E-commerce Shop",
        "schema": "customer1-ecommerce.sql",
        "tables": {
            "products": 500,       # 500 products = 5 requests
            "customers": 300,      # 300 customers = 3 requests
            "orders": 1000,        # 1K orders = 10 requests
            "order_items": 2000,   # 2K items = 20 requests
            "addresses": 400       # 400 addresses = 4 requests
            # SUBTOTAL: 42 requests
        }
    },
    "customer2": {
        "name": "SaaS Startup",
        "schema": "customer2-saas.sql",
        "tables": {
            "users": 300,          # 300 users = 3 requests
            "subscriptions": 300,  # 300 subs = 3 requests
            "projects": 200,       # 200 projects = 2 requests
            "tasks": 800,          # 800 tasks = 8 requests
            "events": 3000         # 3K events = 30 requests
            # SUBTOTAL: 46 requests
        }
    },
    "customer3": {
        "name": "Blog/CMS",
        "schema": "customer3-cms.sql",
        "tables": {
            "authors": 50,         # 50 authors = 1 request
            "categories": 30,      # 30 categories = 1 request
            "posts": 500,          # 500 posts = 5 requests
            "comments": 2000,      # 2K comments = 20 requests
            "media": 400           # 400 media = 4 requests
            # SUBTOTAL: 31 requests
        }
    },
    "customer4": {
        "name": "Mobile App API",
        "schema": "customer4-mobile.sql",
        "tables": {
            "app_users": 300,          # 300 users = 3 requests
            "sessions": 1000,          # 1K sessions = 10 requests
            "api_logs": 2000,          # 2K API calls = 20 requests
            "push_notifications": 500,  # 500 notifs = 5 requests
            "user_content": 400,       # 400 content = 4 requests
            "interactions": 1000       # 1K interactions = 10 requests
            # SUBTOTAL: 52 requests
        }
    },
    "customer5": {
        "name": "Analytics Platform",
        "schema": "customer5-analytics.sql",
        "tables": {
            "properties": 25,          # 25 properties = 1 request
            "events": 1000,            # 1K events = 10 requests
            "daily_metrics": 200,      # 200 days = 2 requests
            "cohorts": 50,             # 50 cohorts = 1 request
            "funnel_steps": 15,        # 15 funnel steps = 1 request
            "funnel_conversions": 500, # 500 conversions = 5 requests
            "reports": 20              # 20 reports = 1 request
            # SUBTOTAL: 21 requests
        }
    }
}
# GRAND TOTAL: ~192 requests (at 100 rows/batch)
# FREE TIER LIMIT: 200/day
# SAFETY MARGIN: 8 requests

class GeminiDataGenerator:
    def __init__(self):
        """Initialize Gemini API client"""
        genai.configure(api_key=API_KEY)
        self.model = genai.GenerativeModel(MODEL_NAME)
        self.request_count = 0
        self.start_time = time.time()
        print(f"✓ Gemini API configured with model: {MODEL_NAME}", flush=True)

    def rate_limited_generate(self, prompt):
        """Generate content with rate limiting and safety checks"""
        # SAFETY CHECK: Stop before hitting daily limit
        if self.request_count >= SAFETY_STOP_AT:
            raise Exception(
                f"\n⚠️  SAFETY STOP at {self.request_count} requests!\n"
                f"   Free tier limit: {FREE_TIER_DAILY_LIMIT}/day\n"
                f"   Stopping at {SAFETY_STOP_AT} for safety margin.\n"
                f"   Wait until midnight PT for quota reset."
            )

        # Wait to maintain safe rate (2 sec/request)
        time.sleep(RATE_LIMIT_DELAY)

        self.request_count += 1
        elapsed = time.time() - self.start_time
        rate = self.request_count / elapsed if elapsed > 0 else 0
        remaining = FREE_TIER_DAILY_LIMIT - self.request_count

        print(f"  [Request #{self.request_count}/{FREE_TIER_DAILY_LIMIT}] "
              f"Rate: {rate:.2f} req/sec | Remaining today: {remaining}", flush=True)

        response = self.model.generate_content(prompt)
        return response.text

    def read_schema(self, schema_file):
        """Read schema file"""
        schema_path = Path(__file__).parent.parent / "schemas" / schema_file
        with open(schema_path, 'r') as f:
            return f.read()

    def generate_inserts_for_table(self, db_name, table_name, row_count, schema_context):
        """Generate INSERT statements for a table"""
        print(f"\n  Generating {row_count:,} rows for {table_name}...", flush=True)

        # Extract just the table definition for this specific table to keep prompt smaller
        table_def = ""
        for line in schema_context.split('\n'):
            if f"CREATE TABLE {table_name}" in line:
                # Found the start, capture until the closing );
                in_table = True
                table_def = line + '\n'
            elif 'table_def' in locals() and table_def and in_table:
                table_def += line + '\n'
                if ')' in line and ';' in line:
                    break

        prompt = f"""You are a PostgreSQL test data generator.

Database: {db_name}
Table: {table_name}
Rows needed: {min(row_count, 1000)}

Table definition:
{table_def if table_def else schema_context[:500]}

Generate exactly {min(row_count, 100)} realistic INSERT statements for the {table_name} table.
- Use realistic, varied data appropriate for the table
- Use proper PostgreSQL syntax
- Include realistic timestamps from the past year
- Make data internally consistent
- Foreign key IDs should be realistic (e.g., 1-1000 for most tables)

Return ONLY the INSERT statements, no markdown, no explanations.
Format: INSERT INTO {table_name} VALUES (...);
"""

        return self.rate_limited_generate(prompt)

    def generate_database_data(self, db_key, db_config):
        """Generate all data for a database"""
        print(f"\n{'='*60}")
        print(f"Database: {db_config['name']} ({db_key})")
        print(f"{'='*60}")

        # Read schema
        schema = self.read_schema(db_config['schema'])

        # Create output directory
        output_dir = Path(__file__).parent.parent / "sql-output" / db_key
        output_dir.mkdir(parents=True, exist_ok=True)

        # Generate data for each table
        for table_name, row_count in db_config['tables'].items():
            output_file = output_dir / f"{table_name}.sql"

            # Calculate batches (100 rows per batch for faster generation)
            batches = (row_count + 99) // 100

            with open(output_file, 'w') as f:
                f.write(f"-- {db_config['name']}: {table_name}\n")
                f.write(f"-- Generated: {time.strftime('%Y-%m-%d %H:%M:%S')}\n")
                f.write(f"-- Total rows: {row_count:,}\n\n")

                for batch in range(batches):
                    batch_size = min(100, row_count - (batch * 100))
                    print(f"  Batch {batch + 1}/{batches} ({batch_size} rows)", flush=True)

                    inserts = self.generate_inserts_for_table(
                        db_config['name'],
                        table_name,
                        batch_size,
                        schema
                    )

                    f.write(inserts)
                    f.write("\n\n")

            print(f"  ✓ Saved to {output_file}")

    def generate_all(self):
        """Generate data for all databases"""
        print(f"\n{'#'*60}")
        print("# Gemini API Test Data Generator")
        print(f"# Model: {MODEL_NAME}")
        print(f"# Rate limit: {RATE_LIMIT_DELAY} sec/request")
        print(f"{'#'*60}\n")

        total_start = time.time()

        for db_key, db_config in DATABASES.items():
            self.generate_database_data(db_key, db_config)

        total_time = time.time() - total_start
        avg_rate = self.request_count / total_time

        print(f"\n{'='*60}")
        print(f"COMPLETE!")
        print(f"{'='*60}")
        print(f"Total requests: {self.request_count}")
        print(f"Total time: {total_time/60:.1f} minutes ({total_time:.0f} seconds)")
        print(f"Average rate: {avg_rate:.2f} req/sec")
        print(f"Configured rate: {1/RATE_LIMIT_DELAY} req/sec (2 sec delay)")
        print(f"\nFree tier status:")
        print(f"  Daily limit: {FREE_TIER_DAILY_LIMIT} requests")
        print(f"  Used today: {self.request_count} requests")
        print(f"  Remaining: {FREE_TIER_DAILY_LIMIT - self.request_count} requests")
        print(f"  Safety margin: ✓ {SAFETY_STOP_AT - self.request_count} requests under safety limit")
        print(f"\nOutput saved to: sql-output/")
        print(f"Next step: Run ../scripts/02-import-data.sh")

if __name__ == "__main__":
    generator = GeminiDataGenerator()
    generator.generate_all()
