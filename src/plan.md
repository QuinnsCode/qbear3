# QNTBR Financial Model

## Revenue Projections

### Subscription Revenue

| Tier | Conversion | 1K Users | 10K Users | 100K Users | 1M Users |
|------|------------|----------|-----------|------------|----------|
| **Free** | 80% | 800 | 8,000 | 80,000 | 800,000 |
| **Basic ($1/mo)** | 15% | $150 | $1,500 | $15,000 | $150,000 |
| **Pro ($5/mo)** | 5% | $250 | $2,500 | $25,000 | $250,000 |
| **Total Subscriptions** | | **$400** | **$4,000** | **$40,000** | **$400,000** |

### Sponsorship & Ad Revenue

| Source | 1K Users | 10K Users | 100K Users | 1M Users |
|--------|----------|-----------|------------|----------|
| **Premium Sponsors** | $900 | $900 | $2,700 | $9,000 |
| (3 @ $300/mo) | | | (9 slots) | (30 slots) |
| **Regular Sponsors** | $375 | $375 | $1,125 | $3,750 |
| (5 @ $75/mo) | | | (15 slots) | (50 slots) |
| **AdSense (Free Tier)** | $150 | $1,500 | $15,000 | $150,000 |
| **Total Ads/Sponsors** | **$1,425** | **$2,775** | **$18,825** | **$162,750** |

### Total Revenue

| Scale | Subscriptions | Ads/Sponsors | **Total** |
|-------|---------------|--------------|-----------|
| **1K users** | $400 | $1,425 | **$1,825/mo** |
| **10K users** | $4,000 | $2,775 | **$6,775/mo** |
| **100K users** | $40,000 | $18,825 | **$58,825/mo** |
| **1M users** | $400,000 | $162,750 | **$562,750/mo** |

---

## Infrastructure Costs

### Cloudflare Usage (with Hibernation API)

| Metric | 1K Users | 10K Users | 100K Users | 1M Users |
|--------|----------|-----------|------------|----------|
| **Games/month** | 3,000 | 30,000 | 300,000 | 3,000,000 |
| **Active DO time** | 150 hrs | 1,500 hrs | 15,000 hrs | 150,000 hrs |
| **GB-seconds (total)** | 1.15M | 11.5M | 115M | 1,150M |
| Free tier | -400K | -400K | -400K | -400K |
| **Billable GB-sec** | 750K | 11.1M | 114.6M | 1,149.6M |
| **Duration cost** | $9.38 | $138.75 | $1,432.50 | $14,370 |

### Request Costs

| Metric | 1K Users | 10K Users | 100K Users | 1M Users |
|--------|----------|-----------|------------|----------|
| **Requests/month** | 100K | 1M | 10M | 100M |
| Free tier | -1M | -1M | -1M | -1M |
| **Billable requests** | 0 | 0 | 9M | 99M |
| **Request cost** | $0 | $0 | $1.35 | $14.85 |

### Total Monthly Costs

| Component | 1K | 10K | 100K | 1M |
|-----------|----|----|------|-----|
| Duration | $9.38 | $138.75 | $1,432.50 | $14,370 |
| Requests | $0 | $0 | $1.35 | $14.85 |
| KV Operations | $10 | $50 | $300 | $2,000 |
| **TOTAL** | **$20** | **$189** | **$1,734** | **$16,385** |

---

## Profitability Analysis

| Users | Monthly Revenue | Monthly Costs | **Net Profit** | Margin |
|-------|-----------------|---------------|----------------|--------|
| **1,000** | $1,825 | $20 | **$1,805** | 99% |
| **10,000** | $6,775 | $189 | **$6,586** | 97% |
| **100,000** | $58,825 | $1,734 | **$57,091** | 97% |
| **1,000,000** | $562,750 | $16,385 | **$546,365** | 97% |

### Annual Projections

| Scale | Monthly Profit | **Annual Profit** |
|-------|----------------|-------------------|
| 1K users | $1,805 | **$21,660** |
| 10K users | $6,586 | **$79,032** |
| 100K users | $57,091 | **$685,092** |
| 1M users | $546,365 | **$6,556,380** |

---

## Key Insights

### 🎯 Business Viability
- ✅ **Break-even at ~100 users** (with sponsor deals)
- ✅ **Profitable at 1,000 users** ($1,805/month profit)
- ✅ **97% profit margins** (SaaS dream metrics)
- ✅ **Linear cost scaling** (thanks to Hibernation API)

### 💰 Revenue Mix
- **Early stage (1K-10K):** Sponsors dominate revenue
- **Growth stage (10K-100K):** Subscriptions overtake sponsors
- **Scale (100K+):** Subscriptions + AdSense drive growth

### 🚀 Growth Potential
- **At 10K users:** $79K/year profit (full-time viable)
- **At 100K users:** $685K/year profit (serious business)
- **At 1M users:** $6.5M/year profit (venture-scale)

### 🔧 Technical Advantages
- **Hibernation API** reduces costs by 90%+
- **Cloudflare free tier** covers first 1K users almost entirely
- **No database costs** (DO + KV only)
- **Global CDN included** (no bandwidth charges)

---

## Assumptions

### User Behavior
- Free tier: 3 games/month per user
- Average game duration: 30 minutes
- Hibernation reduces active time to ~10% of wall-clock time
- 80% free, 15% paid basic, 5% paid pro

### Sponsorships
- Premium sponsors: $300/month per slot
- Regular sponsors: $75/month per slot
- Sponsor slots scale with user base (more users = more sponsor interest)

### AdSense
- $3 CPM for gaming niche
- Free users only (paid users see no ads)
- 10 impressions per hour of gameplay

### Infrastructure
- Cloudflare Workers Paid plan: $5/month base
- DO duration: $12.50 per million GB-seconds
- DO requests: $0.15 per million requests
- KV operations: estimated based on usage patterns

---

## Risk Factors

### Downside Scenarios
- **Lower conversion:** If only 5% paid → revenue cut in half
- **Higher usage:** Power users playing 10x games → costs increase
- **Sponsor churn:** Losing 2-3 sponsors → $500-900/mo impact

### Mitigation Strategies
- ✅ Aggressive free tier limits (push conversions)
- ✅ Auto-close games after 4 hours (prevent abuse)
- ✅ Multiple sponsor tiers (reduce single-sponsor risk)
- ✅ "Donate" option (backup revenue stream)

---

**Last Updated:** December 2024  
**Model Version:** 1.0