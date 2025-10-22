# GCP Project Setup for CostPlusDB Testing

## Create New GCP Project: `cost-plus-db`

### Step 1: Create Project via gcloud CLI

```bash
# Set your billing account ID (find at: console.cloud.google.com/billing)
export BILLING_ACCOUNT_ID="your-billing-account-id"

# Create the project
gcloud projects create cost-plus-db \
  --name="CostPlusDB Testing" \
  --set-as-default

# Link billing account (required for Vertex AI)
gcloud billing projects link cost-plus-db \
  --billing-account=$BILLING_ACCOUNT_ID

# Set as default project
gcloud config set project cost-plus-db
```

### Alternative: Create via Web Console

1. Go to: https://console.cloud.google.com/projectcreate
2. **Project name:** CostPlusDB Testing
3. **Project ID:** `cost-plus-db`
4. Click **Create**
5. Link your billing account

---

## Step 2: Enable Required APIs

```bash
# Enable Vertex AI API
gcloud services enable aiplatform.googleapis.com

# Enable Cloud Storage (for outputs)
gcloud services enable storage.googleapis.com

# Verify APIs are enabled
gcloud services list --enabled
```

---

## Step 3: Configure Vertex AI

```bash
# Set your region (use closest to you)
export REGION="us-central1"  # or us-east1, europe-west1, etc.

# Configure gcloud for Vertex AI
gcloud config set ai/region $REGION

# Verify configuration
gcloud config list
```

---

## Step 4: Test Vertex AI Access

```bash
# Test with a simple API call
gcloud ai models list --region=$REGION
```

If you see a list (or empty list), Vertex AI is working!

---

## Step 5: Set Up Application Default Credentials

```bash
# Authenticate for local development
gcloud auth application-default login

# This allows the Python script to use your credentials
```

---

## Your Project Info

After setup, note these values:

```bash
# View project details
gcloud config list

# You should see:
# project = cost-plus-db
# ai/region = us-central1 (or your chosen region)
```

---

## Free Tier Limits (Vertex AI)

**Gemini Flash 2.0:**
- **Free:** Up to 2M tokens per month
- **Rate limit:** 60 requests per minute
- **Our usage:** ~500K tokens (well within free tier)

**No credit card charges** as long as you stay within free tier.

---

## Verify Setup Checklist

- [ ] Project `cost-plus-db` created
- [ ] Billing account linked
- [ ] Vertex AI API enabled
- [ ] Cloud Storage API enabled
- [ ] Region configured
- [ ] Application default credentials set
- [ ] Test API call successful

---

## Ready to Generate Test Data

Once all steps are complete, you can run:

```bash
cd testing/local-customer-databases/vertex-ai
python generate-test-data.py
```

This will use your free Vertex AI quota to generate realistic data for all 5 databases.

---

**Next:** Return to main [README.md](README.md) to continue setup.
