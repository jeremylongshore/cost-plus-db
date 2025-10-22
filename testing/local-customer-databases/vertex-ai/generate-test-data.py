#!/usr/bin/env python3
"""
Vertex AI Test Data Generator for CostPlusDB
Generates realistic test data for 5 Shared tier databases using Gemini Flash 2.0
Rate limited to avoid API quotas (1 request/second = 60/min, well under limit)
"""

import time
import os
from pathlib import Path
from google.cloud import aiplatform
from vertexai.preview.generative_models import GenerativeModel

# Configuration
PROJECT_ID = "cost-plus-db"
REGION = "us-central1"
MODEL_NAME = "gemini-2.0-flash-exp"  # Flash 2.0 - free tier eligible

# CRITICAL FREE TIER LIMITS (2025)
FREE_TIER_DAILY_LIMIT = 200  # Gemini 2.0 Flash: 200 requests/day
SAFETY_STOP_AT = 190         # Stop at 190 to leave margin for errors

# Rate limiting: 2 seconds per request (SAFE - well under free tier limits)
# At 2 sec/request: 159 requests = 5.3 minutes total
RATE_LIMIT_DELAY = 2.0  # seconds between requests

# Database configurations - OPTIMIZED FOR FREE TIER
# Total: 159 requests (41-request safety margin)
DATABASES = {
    "customer1": {
        "name": "E-commerce Shop",
        "schema": "customer1-ecommerce.sql",
        "tables": {
            "products": 2000,      # 2K products = 2 requests
            "customers": 1500,     # 1.5K customers = 2 requests
            "orders": 6000,        # 6K orders = 6 requests
            "order_items": 12000,  # 12K items = 12 requests
            "addresses": 2000      # 2K addresses = 2 requests
            # SUBTOTAL: 24 requests
        }
    },
    "customer2": {
        "name": "SaaS Startup",
        "schema": "customer2-saas.sql",
        "tables": {
            "users": 1500,         # 1.5K users = 2 requests
            "subscriptions": 1500, # 1.5K subs = 2 requests
            "projects": 800,       # 800 projects = 1 request
            "tasks": 4000,         # 4K tasks = 4 requests
            "events": 15000        # 15K events = 15 requests
            # SUBTOTAL: 24 requests
        }
    },
    "customer3": {
        "name": "Blog/CMS",
        "schema": "customer3-cms.sql",
        "tables": {
            "authors": 50,         # 50 authors = 1 request
            "categories": 30,      # 30 categories = 1 request
            "posts": 3000,         # 3K posts = 3 requests
            "comments": 15000,     # 15K comments = 15 requests
            "media": 2000          # 2K media = 2 requests
            # SUBTOTAL: 22 requests
        }
    },
    "customer4": {
        "name": "Mobile App API",
        "schema": "customer4-mobile.sql",
        "tables": {
            "app_users": 2000,         # 2K users = 2 requests
            "sessions": 8000,          # 8K sessions = 8 requests
            "api_logs": 25000,         # 25K API calls = 25 requests
            "push_notifications": 5000, # 5K notifications = 5 requests
            "user_content": 4000,      # 4K content items = 4 requests
            "interactions": 10000      # 10K interactions = 10 requests
            # SUBTOTAL: 54 requests
        }
    },
    "customer5": {
        "name": "Analytics Platform",
        "schema": "customer5-analytics.sql",
        "tables": {
            "properties": 25,           # 25 properties = 1 request
            "events": 25000,            # 25K events = 25 requests
            "daily_metrics": 730,       # 2 years daily = 1 request
            "cohorts": 50,              # 50 cohorts = 1 request
            "funnel_steps": 15,         # 15 funnel steps = 1 request
            "funnel_conversions": 5000, # 5K conversions = 5 requests
            "reports": 20               # 20 reports = 1 request
            # SUBTOTAL: 35 requests
        }
    }
}
# GRAND TOTAL: 159 requests
# FREE TIER LIMIT: 200/day
# SAFETY MARGIN: 41 requests

class VertexDataGenerator:
    def __init__(self):
        """Initialize Vertex AI client"""
        aiplatform.init(project=PROJECT_ID, location=REGION)
        self.model = GenerativeModel(MODEL_NAME)
        self.request_count = 0
        self.start_time = time.time()

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
              f"Rate: {rate:.2f} req/sec | Remaining today: {remaining}")

        response = self.model.generate_content(prompt)
        return response.text

    def read_schema(self, schema_file):
        """Read schema file"""
        schema_path = Path(__file__).parent.parent / "schemas" / schema_file
        with open(schema_path, 'r') as f:
            return f.read()

    def generate_inserts_for_table(self, db_name, table_name, row_count, schema_context):
        """Generate INSERT statements for a table"""
        print(f"\n  Generating {row_count:,} rows for {table_name}...")

        prompt = f"""You are a PostgreSQL test data generator.

Database: {db_name}
Table: {table_name}
Rows needed: {row_count}

Schema context:
{schema_context}

Generate realistic INSERT statements for the {table_name} table.
- Generate exactly {min(row_count, 1000)} INSERT statements (we'll batch larger sets)
- Use realistic, varied data
- Ensure foreign keys reference realistic IDs
- Use proper SQL syntax for PostgreSQL
- Include realistic timestamps (spread over past year)
- Make data internally consistent

Return ONLY the INSERT statements, no explanations.
Format: INSERT INTO {table_name} (column1, column2, ...) VALUES (val1, val2, ...);
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

            # Calculate batches (1000 rows per batch to stay under token limits)
            batches = (row_count + 999) // 1000

            with open(output_file, 'w') as f:
                f.write(f"-- {db_config['name']}: {table_name}\n")
                f.write(f"-- Generated: {time.strftime('%Y-%m-%d %H:%M:%S')}\n")
                f.write(f"-- Total rows: {row_count:,}\n\n")

                for batch in range(batches):
                    batch_size = min(1000, row_count - (batch * 1000))
                    print(f"  Batch {batch + 1}/{batches} ({batch_size} rows)")

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
        print("# Vertex AI Test Data Generator")
        print(f"# Project: {PROJECT_ID}")
        print(f"# Region: {REGION}")
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
    generator = VertexDataGenerator()
    generator.generate_all()
