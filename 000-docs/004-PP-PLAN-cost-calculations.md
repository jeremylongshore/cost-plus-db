# Detailed Cost Calculation Examples for CostPlusDB

Below, I'll provide detailed cost calculation examples based on the CostPlusDB pricing structure. These are step-by-step breakdowns for various customer configurations, incorporating the base tier prices (fixed for simplicity and transparency), infrastructure upgrades (our cost + 25% markup), and add-ons (also cost + 25%). I've used approximate 2025 pricing data from reliable sources for infrastructure providers, assuming a standard spec of ~4 vCPU, 8GB RAM, and 200GB storage (adjusted where exact matches aren't available). Prices are in USD/month and exclude taxes; actual costs may vary slightly by region or usage.

Note: Base tiers include Contabo by default at our estimated cost of ~$10/month (updated from 2025 data for a comparable plan). For upgrades, I apply the 25% markup directly to our verified costs. Storage add-ons assume $0.02-0.05/GB/month depending on provider. All calculations ensure 25% margins on variable costs while keeping base margins high (~80-85%).

## Calculation Methodology
- **Base Tier Price**: Fixed (e.g., $89 for Dedicated).
- **Infrastructure Upgrade**: Customer Price = Our Cost × 1.25 (added to base).
- **Add-ons**: Customer Price = Our Cost × 1.25.
- **Total**: Sum of base + upgrades + add-ons.
- **Savings Comparison**: Based on equivalent AWS RDS or similar managed DB pricing (~$140-280/month for base specs).
- **Assumptions**: No proration; monthly billing; backups/monitoring amortized at $0.50-1/customer.

## Example 1: Bootstrapped Startup (Basic Dedicated Tier, No Upgrades)
**Scenario**: A solo developer needs a production PostgreSQL DB for a SaaS app. Uses default Contabo infrastructure.

**Step-by-Step Calculation**:
1. Base: Dedicated Tier = $89 (includes management, backups, support).
2. Infrastructure: Contabo (default) – Our Cost = $10 → Customer Price = $0 add-on (included in base).
3. Add-ons: None.
4. **Total Monthly**: $89.
5. Our Margin: Base (85% after $10 infra + $1 overhead = $78 profit) + 25% on any future add-ons.
6. Comparison: AWS RDS equivalent ~$140/month. **Savings**: $51/month (36% cheaper).

**Invoice Breakdown**:
```
Base: Dedicated Tier                                $89.00
Infrastructure (Contabo): Our Cost $10 → Included    $0.00
Total:                                              $89.00
Savings vs. AWS:                                    $51.00
```

## Example 2: EU SaaS Company (Dedicated Tier + Hetzner Upgrade + Region Selection)
**Scenario**: A bootstrapped team in Europe needs GDPR-compliant hosting in Finland.

**Step-by-Step Calculation**:
1. Base: Dedicated Tier = $89.
2. Infrastructure Upgrade: Hetzner (4 vCPU/8GB equiv., ~80-200GB adjusted) – Our Cost = $10.65 (~$9.45 base + $1.20 extra storage). Customer Price = $10.65 × 1.25 = $13.31 (add-on: +$13.31 over default).
3. Region Selection: EU (Finland) – Our Cost = $8 (amortized network/overhead) → Customer Price = $8 × 1.25 = $10.
4. **Total Monthly**: $89 + $13.31 + $10 = $112.31.
5. Our Margin: 25% on upgrades ($13.31 - $10.65 = $2.66) + 25% on region ($10 - $8 = $2) + base 85%.
6. Comparison: AWS RDS EU ~$200/month. **Savings**: $87.69/month (44% cheaper).

**Invoice Breakdown**:
```
Base: Dedicated Tier                                $89.00
Infrastructure (Hetzner): Our Cost $10.65 → $13.31  +$13.31
Region (EU Finland): Our Cost $8 → $10             +$10.00
Total:                                             $112.31
Savings vs. AWS EU:                                $87.69
```

## Example 3: Growing Startup (Pro Tier + High Availability + Read Replicas + Extra Storage)
**Scenario**: A high-traffic app needs scaling with Contabo default.

**Step-by-Step Calculation**:
1. Base: Pro Tier = $129.
2. Infrastructure: Contabo (default) – $0 add-on.
3. High Availability: Primary + replica – Our Cost = $20 (2× $10 VPS + orchestration) → Customer Price = $20 × 1.25 = $25.
4. 2× Read Replicas: Our Cost = $10/replica × 2 = $20 → Customer Price = $20 × 1.25 = $25.
5. Extra 200GB Storage: Our Cost = $4 (~$0.02/GB) → Customer Price = $4 × 1.25 = $5.
6. **Total Monthly**: $129 + $25 + $25 + $5 = $184.
7. Our Margin: 25% on add-ons ($25 - $20 = $5 for HA; similar for others) + base 84%.
8. Comparison: AWS with replicas ~$500/month. **Savings**: $316/month (63% cheaper).

**Invoice Breakdown**:
```
Base: Pro Tier                                      $129.00
High Availability: Our Cost $20 → $25              +$25.00
2× Read Replicas: Our Cost $20 → $25               +$25.00
Extra 200GB: Our Cost $4 → $5                      +$5.00
Total:                                             $184.00
Savings vs. AWS:                                   $316.00
```

## Example 4: Healthcare Startup (Enterprise Tier + AWS Upgrade + Compliance + VPN + Extra Storage)
**Scenario**: HIPAA-compliant setup with global reach.

**Step-by-Step Calculation**:
1. Base: Enterprise Tier = $149.
2. Infrastructure Upgrade: AWS EC2 (m5.large equiv. adjusted to 4 vCPU/8GB + EBS 200GB) – Our Cost = $86 (~$70 instance + $16 storage). Customer Price = $86 × 1.25 = $107.50 (add-on: +$107.50).
3. Compliance Package: Our Cost = $80 (insurance/overhead) → Customer Price = $80 × 1.25 = $100.
4. VPN Access: Our Cost = $12 → Customer Price = $12 × 1.25 = $15.
5. Extra 300GB Storage: Our Cost = $24 (~$0.08/GB on EBS) → Customer Price = $24 × 1.25 = $30.
6. **Total Monthly**: $149 + $107.50 + $100 + $15 + $30 = $401.50.
7. Our Margin: 25% on all add-ons (e.g., $107.50 - $86 = $21.50 for AWS) + base 80%.
8. Comparison: AWS RDS + compliance ~$950/month. **Savings**: $548.50/month (58% cheaper).

**Invoice Breakdown**:
```
Base: Enterprise Tier                               $149.00
Infrastructure (AWS): Our Cost $86 → $107.50       +$107.50
Compliance: Our Cost $80 → $100                    +$100.00
VPN: Our Cost $12 → $15                            +$15.00
Extra 300GB: Our Cost $24 → $30                    +$30.00
Total:                                             $401.50
Savings vs. AWS:                                   $548.50
```

## Example 5: Enterprise CTO (Pro Tier + DigitalOcean Upgrade + Custom Monitoring)
**Scenario**: Brand-conscious team with global needs.

**Step-by-Step Calculation**:
1. Base: Pro Tier = $129.
2. Infrastructure Upgrade: DigitalOcean Droplet (4 vCPU/8GB/160-200GB) – Our Cost = $48. Customer Price = $48 × 1.25 = $60 (add-on: +$60).
3. Custom Monitoring: Our Cost = $50 (Grafana Pro + setup) → Customer Price = $50 × 1.25 = $62.50.
4. **Total Monthly**: $129 + $60 + $62.50 = $251.50.
5. Our Margin: 25% on upgrades ($60 - $48 = $12) + 25% on monitoring + base 84%.
6. Comparison: DigitalOcean Managed DB ~$300/month. **Savings**: $48.50/month (16% cheaper; higher due to premium provider).

**Invoice Breakdown**:
```
Base: Pro Tier                                      $129.00
Infrastructure (DO): Our Cost $48 → $60            +$60.00
Custom Monitoring: Our Cost $50 → $62.50           +$62.50
Total:                                             $251.50
Savings vs. DO Managed:                            $48.50
```

## Additional Calculation Notes

### Formula Reference
For quick calculations:
```
Total = Base Tier + Σ(Infrastructure Upgrades × 1.25) + Σ(Add-ons × 1.25)

Our Margin = (Customer Price - Our Cost) / Customer Price × 100%
```

### Cost Components by Provider

| Provider | Our Base Cost (4vCPU/8GB/200GB) | Storage Cost/GB | Network Cost/GB |
|----------|----------------------------------|-----------------|-----------------|
| Contabo | $10/month | $0.02 | Free |
| Hetzner | $10.65/month | $0.02 | Free |
| DigitalOcean | $48/month | $0.10 | $0.01 |
| AWS | $86/month | $0.08 | $0.09 |
| GCP | $98/month | $0.10 | $0.12 |

### Transparency Commitment

Every invoice shows:
- Base tier cost
- Each infrastructure component with our cost and your price
- Each add-on with our cost and your price
- Total comparison to equivalent managed service
- Your monthly savings

### Custom Quotes

For configurations not listed above:
1. Email support@intentsolutions.io with your requirements
2. We'll provide exact provider costs + 25% markup
3. No hidden fees, no surprises
4. All quotes valid for 30 days

---

These examples demonstrate the transparency of CostPlusDB. For custom quotes, contact support@intentsolutions.io. Prices subject to minor fluctuations; we notify in advance.

**Last Updated:** October 19, 2025
**Version:** 1.0
