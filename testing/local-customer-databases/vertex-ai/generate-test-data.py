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

# Rate limiting: 1 request per second (safe, well under 60/min limit)
RATE_LIMIT_DELAY = 1.0  # seconds between requests

# Database configurations
DATABASES = {
    "customer1": {
        "name": "E-commerce Shop",
        "schema": "customer1-ecommerce.sql",
        "tables": {
            "products": 10000,      # 10K products
            "customers": 5000,      # 5K customers
            "orders": 50000,        # 50K orders
            "order_items": 100000,  # ~2 items per order
            "addresses": 7500       # ~1.5 addresses per customer
        }
    },
    "customer2": {
        "name": "SaaS Startup",
        "schema": "customer2-saas.sql",
        "tables": {
            "users": 5000,          # 5K users
            "subscriptions": 5000,  # 1 sub per user
            "projects": 2000,       # ~0.4 projects per user
            "tasks": 15000,         # ~3 tasks per project
            "events": 100000        # 100K activity events
        }
    },
    "customer3": {
        "name": "Blog/CMS",
        "schema": "customer3-cms.sql",
        "tables": {
            "authors": 100,         # 100 authors
            "categories": 50,       # 50 categories
            "posts": 20000,         # 20K posts
            "comments": 100000,     # 100K comments (~5 per post)
            "media": 10000          # 10K media files
        }
    },
    "customer4": {
        "name": "Mobile App API",
        "schema": "customer4-mobile.sql",
        "tables": {
            "app_users": 10000,         # 10K users
            "sessions": 50000,          # ~5 sessions per user
            "api_logs": 500000,         # 500K API calls
            "push_notifications": 30000, # ~3 per user
            "user_content": 25000,      # ~2.5 items per user
            "interactions": 75000       # ~3 interactions per content
        }
    },
    "customer5": {
        "name": "Analytics Platform",
        "schema": "customer5-analytics.sql",
        "tables": {
            "properties": 50,           # 50 tracked properties
            "events": 250000,           # 250K events
            "daily_metrics": 3650,      # 10 years of daily metrics
            "cohorts": 100,             # 100 cohorts
            "funnel_steps": 20,         # 4 funnels × 5 steps
            "funnel_conversions": 50000, # Conversion tracking
            "reports": 25               # 25 saved reports
        }
    }
}

class VertexDataGenerator:
    def __init__(self):
        """Initialize Vertex AI client"""
        aiplatform.init(project=PROJECT_ID, location=REGION)
        self.model = GenerativeModel(MODEL_NAME)
        self.request_count = 0
        self.start_time = time.time()

    def rate_limited_generate(self, prompt):
        """Generate content with rate limiting"""
        # Wait to maintain 1 req/sec rate
        time.sleep(RATE_LIMIT_DELAY)

        self.request_count += 1
        elapsed = time.time() - self.start_time
        rate = self.request_count / elapsed if elapsed > 0 else 0

        print(f"  [Request #{self.request_count}] Rate: {rate:.2f} req/sec")

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
        print(f"Total time: {total_time/60:.1f} minutes")
        print(f"Average rate: {avg_rate:.2f} req/sec")
        print(f"Peak rate: {1/RATE_LIMIT_DELAY} req/sec (limit)")
        print(f"\nOutput saved to: sql-output/")
        print(f"Next step: Run ./scripts/02-import-data.sh")

if __name__ == "__main__":
    generator = VertexDataGenerator()
    generator.generate_all()
