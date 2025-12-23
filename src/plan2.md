# QNTBR Financial Model - Conservative Scenario

## Revenue Projections (95/4/1 Split)

### Subscription Revenue

| Tier | Conversion | 1K Users | 10K Users | 100K Users | 1M Users |
|------|------------|----------|-----------|------------|----------|
| **Free** | 95% | 950 | 9,500 | 95,000 | 950,000 |
| **Basic ($1/mo)** | 4% | $40 | $400 | $4,000 | $40,000 |
| **Pro ($5/mo)** | 1% | $50 | $500 | $5,000 | $50,000 |
| **Total Subscriptions** | | **$90** | **$900** | **$9,000** | **$90,000** |

### Sponsorship & Ad Revenue

| Source | 1K Users | 10K Users | 100K Users | 1M Users |
|--------|----------|-----------|------------|----------|
| **Premium Sponsors** | $900 | $900 | $2,700 | $9,000 |
| (3 @ $300/mo) | | | (9 slots) | (30 slots) |
| **Regular Sponsors** | $375 | $375 | $1,125 | $3,750 |
| (5 @ $75/mo) | | | (15 slots) | (50 slots) |
| **AdSense (Free Tier)** | $143 | $1,425 | $14,250 | $142,500 |
| (95% free users) | | | | |
| **Total Ads/Sponsors** | **$1,418** | **$2,700** | **$18,075** | **$155,250** |

### Total Revenue

| Scale | Subscriptions | Ads/Sponsors | **Total** |
|-------|---------------|--------------|-----------|
| **1K users** | $90 | $1,418 | **$1,508/mo** |
| **10K users** | $900 | $2,700 | **$3,600/mo** |
| **100K users** | $9,000 | $18,075 | **$27,075/mo** |
| **1M users** | $90,000 | $155,250 | **$245,250/mo** |

---

## Infrastructure Costs

### Cloudflare Usage (with Hibernation API)

| Metric | 1K Users | 10K Users | 100K Users | 1M Users |
|--------|----------|-----------|------------|----------|
| **Games/month** | 2,850 | 28,500 | 285,000 | 2,850,000 |
| (95% × 3 games) | | | | |
| **Active DO time** | 143 hrs | 1,425 hrs | 14,250 hrs | 142,500 hrs |
| **GB-seconds (total)** | 1.09M | 10.9M | 109M | 1,092M |
| Free tier | -400K | -400K | -400K | -400K |
| **Billable GB-sec** | 690K | 10.5M | 108.6M | 1,091.6M |
| **Duration cost** | $8.63 | $131.25 | $1,357.50 | $13,645 |

### Request Costs

| Metric | 1K Users | 10K Users | 100K Users | 1M Users |
|--------|----------|-----------|------------|----------|
| **Requests/month** | 95K | 950K | 9.5M | 95M |
| Free tier | -1M | -950K | -1M | -1M |
| **Billable requests** | 0 | 0 | 8.5M | 94M |
| **Request cost** | $0 | $0 | $1.28 | $14.10 |

### Total Monthly Costs

| Component | 1K | 10K | 100K | 1M |
|-----------|----|----|------|-----|
| Duration | $8.63 | $131.25 | $1,357.50 | $13,645 |
| Requests | $0 | $0 | $1.28 | $14.10 |
| KV Operations | $10 | $50 | $300 | $2,000 |
| **TOTAL** | **$19** | **$181** | **$1,659** | **$15,659** |

---

## Profitability Analysis (95/4/1 Split)

| Users | Monthly Revenue | Monthly Costs | **Net Profit** | Margin |
|-------|-----------------|---------------|----------------|--------|
| **1,000** | $1,508 | $19 | **$1,489** | 99% |
| **10,000** | $3,600 | $181 | **$3,419** | 95% |
| **100,000** | $27,075 | $1,659 | **$25,416** | 94% |
| **1,000,000** | $245,250 | $15,659 | **$229,591** | 94% |

### Annual Projections

| Scale | Monthly Profit | **Annual Profit** |
|-------|----------------|-------------------|
| 1K users | $1,489 | **$17,868** |
| 10K users | $3,419 | **$41,028** |
| 100K users | $25,416 | **$304,992** |
| 1M users | $229,591 | **$2,755,092** |

---

## Comparison: Optimistic vs Conservative

### Revenue Comparison

| Scale | Optimistic (80/15/5) | Conservative (95/4/1) | Difference |
|-------|----------------------|------------------------|------------|
| **1K users** | $1,825/mo | $1,508/mo | -$317 (-17%) |
| **10K users** | $6,775/mo | $3,600/mo | -$3,175 (-47%) |
| **100K users** | $58,825/mo | $27,075/mo | -$31,750 (-54%) |
| **1M users** | $562,750/mo | $245,250/mo | -$317,500 (-56%) |

### Profit Comparison

| Scale | Optimistic Profit | Conservative Profit | Difference |
|-------|-------------------|---------------------|------------|
| **1K users** | $1,805/mo | $1,489/mo | -$316 (-18%) |
| **10K users** | $6,586/mo | $3,419/mo | -$3,167 (-48%) |
| **100K users** | $57,091/mo | $25,416/mo | -$31,675 (-55%) |
| **1M users** | $546,365/mo | $229,591/mo | -$316,774 (-58%) |

### Annual Profit Comparison

| Scale | Optimistic Annual | Conservative Annual | Difference |
|-------|-------------------|---------------------|------------|
| **1K users** | $21,660 | $17,868 | -$3,792 (-18%) |
| **10K users** | $79,032 | $41,028 | -$38,004 (-48%) |
| **100K users** | $685,092 | $304,992 | -$380,100 (-55%) |
| **1M users** | $6.56M | $2.76M | -$3.8M (-58%) |

---

## Key Insights - Conservative Model

### 🎯 Business Viability
- ✅ **Still profitable at 1K users** ($1,489/month)
- ✅ **Break-even at ~50-100 users** (with sponsors)
- ✅ **94-99% margins maintained** (still excellent)
- ⚠️ **Need 2-3x more users** for same revenue as optimistic

### 💰 Revenue Reality Check
- **Subscriptions drop 77%** vs optimistic model
- **Sponsors become MORE critical** early on
- **AdSense barely changes** (95% vs 80% free)
- **Need aggressive growth** to hit profitability targets

### 🚀 Growth Requirements
- **10K users:** $41K/year (side project income)
- **25K users:** ~$100K/year (full-time viable)
- **100K users:** $305K/year (good business)
- **350K users:** ~$1M/year (serious revenue)

### 📊 Revenue Mix Changes
| Scale | Subscriptions | Sponsors/Ads | Dominant Source |
|-------|---------------|--------------|-----------------|
| 1K | 6% | 94% | **Sponsors dominate** |
| 10K | 25% | 75% | **Still sponsor-heavy** |
| 100K | 33% | 67% | **Sponsors still lead** |
| 1M | 37% | 63% | **Sponsors still critical** |

### 🎲 Reality Check
**Conservative (95/4/1) is more realistic because:**
- ✅ Most freemium apps see 2-5% paid conversion
- ✅ Gaming apps typically <5% paid users
- ✅ $1 tier is very accessible (increases volume)
- ✅ $5 tier is for superfans only (1% realistic)

**But you can improve conversion with:**
- 🎯 Aggressive free tier limits (3 games → pain point)
- 💎 Better Pro tier value (exclusive features)
- 🔥 Time-limited promotions ("$1 first month")
- 💬 Social proof ("10K+ players upgraded")

---

## Break-Even Analysis

### Conservative Scenario (95/4/1)

| Milestone | Users Needed | Monthly Profit | Notes |
|-----------|--------------|----------------|-------|
| **Cover costs** | ~50 users | $0 | With 1-2 sponsors |
| **Ramen profitable** | ~500 users | $500-800 | Side income |
| **Part-time viable** | ~2,500 users | $2,000 | $24K/year |
| **Full-time viable** | ~10,000 users | $3,400 | $41K/year |
| **Comfortable living** | ~25,000 users | $8,500 | $102K/year |
| **Serious business** | ~100,000 users | $25,400 | $305K/year |

---

## Risk Mitigation Strategies

### If Conversion is Even Lower (97/2.5/0.5)

**Backup revenue sources:**
1. ☕ **"Buy me a coffee" donations**
   - Target: 5% of users donate $3
   - At 10K users: 500 × $3 = $1,500/mo extra

2. 🎨 **Asset marketplace** (future)
   - Sell custom card backs, playmats
   - 30% platform cut

3. 🏢 **B2B tier** ($50/mo for game stores)
   - Host tournaments, leagues
   - 10 stores = $500/mo

4. 📺 **Twitch/YouTube integration**
   - Sponsored streams
   - $200-500/mo partnerships

### Growth Acceleration Tactics

**To push 95% → 90% conversion:**
- ❌ Show "3/3 games used" prominently
- 💎 Highlight Pro features during gameplay
- 🎁 "Friend played 50 games this month" social proof
- ⏰ "Upgrade expires in 2 days" urgency
- 🎯 Target power users (>10 games/mo)

**Result:** Moving 5% to paid = doubles subscription revenue

---

## Recommended Pricing Strategy

### Phase 1: Launch (Month 1-6)
- ✅ Conservative model (95/4/1)
- ✅ Focus on sponsors + growth
- ✅ Test pricing sensitivity

### Phase 2: Optimization (Month 7-12)
- 🎯 A/B test free tier limits
- 🎯 Introduce annual plans ($10/year = 2 months free)
- 🎯 Push conversion to 92/6/2

### Phase 3: Scale (Year 2+)
- 🚀 Add marketplace revenue
- 🚀 B2B tier for game stores
- 🚀 Target 90/8/2 split

---

**Model Version:** Conservative v1.0  
**Assumption:** 95% free, 4% basic, 1% pro  
**Last Updated:** December 2025