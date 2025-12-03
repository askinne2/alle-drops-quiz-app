# Fly.io Performance Optimization Guide

## Current Cold Start Issue

Your app experiences **2-10 second delays** when waking up from idle state. This is normal for:
- ✅ Single shared CPU machines
- ✅ Apps that haven't had recent traffic
- ✅ React SSR apps with larger bundles

## Solutions Implemented

### 1. ✅ Health Check Endpoint

Created `/health` endpoint at `app/routes/health.tsx`:
- Lightweight (no authentication required)
- Fast response (~50ms)
- Perfect for ping services

**Test it:**
```bash
curl https://alle-drops-quiz-app.fly.dev/health
```

### 2. ✅ Fly.io Health Checks

Added health check configuration to `fly.toml`:
- Checks `/health` every 30 seconds
- Helps Fly.io detect when app is ready
- 10s grace period for startup

### 3. ✅ Keep Machine Running

Updated `min_machines_running = 1`:
- Keeps at least 1 machine always running
- Prevents cold starts for first request
- Costs ~$5-10/month (1GB shared CPU)

## Recommended: Keep App Warm with UptimeRobot

### Setup UptimeRobot (Free)

1. **Sign up**: https://uptimerobot.com (free tier: 50 monitors)

2. **Create Monitor**:
   - **Type**: HTTP(s)
   - **URL**: `https://alle-drops-quiz-app.fly.dev/health`
   - **Interval**: 5 minutes (free tier minimum)
   - **Status Pages**: Optional (public status page)

3. **Benefits**:
   - ✅ Keeps machine warm (no cold starts)
   - ✅ Free for 5-minute intervals
   - ✅ Email alerts if app goes down
   - ✅ Public status page (optional)

### Alternative: Fly.io Cron Jobs

You can also use Fly.io's built-in cron:

```toml
# Add to fly.toml
[[services]]
  [[services.http_checks]]
    interval = "5m"
    timeout = "10s"
    grace_period = "1s"
    method = "GET"
    path = "/health"
```

## VM Upgrade Options

### Current Setup (Shared CPU, 1GB RAM)
- **Cost**: ~$5-10/month
- **Cold Start**: 2-10 seconds
- **Good for**: Low-medium traffic

### Option 1: Dedicated CPU (Recommended for Production)
```toml
[[vm]]
  memory = '1gb'
  cpu_kind = 'dedicated'  # Faster cold starts
  cpus = 1
```
- **Cost**: ~$15-20/month
- **Cold Start**: 1-3 seconds
- **Benefit**: Faster startup, more consistent performance

### Option 2: More RAM (Better for React SSR)
```toml
[[vm]]
  memory = '2gb'  # More RAM for React bundle
  cpu_kind = 'shared'
  cpus = 1
```
- **Cost**: ~$10-15/month
- **Cold Start**: 2-5 seconds
- **Benefit**: Faster React SSR, less memory pressure

### Option 3: Dedicated CPU + More RAM (Best Performance)
```toml
[[vm]]
  memory = '2gb'
  cpu_kind = 'dedicated'
  cpus = 2
```
- **Cost**: ~$25-30/month
- **Cold Start**: <1 second
- **Benefit**: Fastest startup, best for production

## React Bundle Optimization

### Current Bundle Analysis

Check your bundle size:
```bash
npm run build
# Look for build output showing bundle sizes
```

### Optimization Strategies

1. **Code Splitting** (Already implemented):
   - Quiz bundle loads separately
   - Admin routes load on demand

2. **Lazy Loading**:
   ```typescript
   // In QuizContainer.tsx
   const ResultsDisplay = lazy(() => import('./ResultsDisplay'));
   ```

3. **Tree Shaking**:
   - Remove unused dependencies
   - Use ES modules where possible

4. **Compression**:
   - Fly.io automatically gzips responses
   - Ensure `Content-Encoding: gzip` is set

## Monitoring Cold Starts

### Check Fly.io Logs

```bash
fly logs
```

Look for:
```
Starting machine...
App started in 4200ms  ← This is your cold start time
```

### Monitor Response Times

Use Fly.io dashboard:
1. Go to **Machines** tab
2. Click on your machine
3. View **Metrics** → **Response Time**

## Recommended Production Setup

### For Low-Medium Traffic (<1000 requests/day):

```toml
# fly.toml
[http_service]
  min_machines_running = 1
  auto_stop_machines = 'stop'
  auto_start_machines = true

[[vm]]
  memory = '1gb'
  cpu_kind = 'shared'
  cpus = 1
```

**Plus**: UptimeRobot pinging `/health` every 5 minutes

**Cost**: ~$5-10/month + free UptimeRobot

### For Medium-High Traffic (1000-10000 requests/day):

```toml
[[vm]]
  memory = '2gb'
  cpu_kind = 'dedicated'
  cpus = 1
```

**Plus**: UptimeRobot pinging `/health` every 5 minutes

**Cost**: ~$15-20/month + free UptimeRobot

### For High Traffic (>10000 requests/day):

```toml
[http_service]
  min_machines_running = 2  # Multiple machines

[[vm]]
  memory = '2gb'
  cpu_kind = 'dedicated'
  cpus = 2
```

**Plus**: Migrate to PostgreSQL (SQLite doesn't work with multiple machines)

**Cost**: ~$50-60/month

## Quick Wins Summary

1. ✅ **Health check endpoint** - Created `/health`
2. ✅ **Keep 1 machine running** - `min_machines_running = 1`
3. 🔄 **Set up UptimeRobot** - Ping every 5 minutes (free)
4. ⚠️ **Consider VM upgrade** - If traffic grows or cold starts are unacceptable

## Testing Performance

### Test Cold Start:
1. Stop pinging the app for 10+ minutes
2. Make a request
3. Measure time to first byte (TTFB)

### Test Warm Performance:
1. Ping `/health` every 5 minutes
2. Make a request
3. Should be <500ms response time

## Cost Comparison

| Setup | Monthly Cost | Cold Start | Best For |
|-------|-------------|------------|----------|
| Current (1GB shared) | $5-10 | 2-10s | Development/Low traffic |
| + UptimeRobot | $5-10 | <1s | **Recommended MVP** |
| Dedicated CPU | $15-20 | 1-3s | Medium traffic |
| Dedicated + 2GB | $25-30 | <1s | High traffic |

## Next Steps

1. ✅ Deploy health check endpoint
2. 🔄 Set up UptimeRobot (5-minute ping)
3. 📊 Monitor cold start times in Fly.io dashboard
4. ⚙️ Upgrade VM if needed based on traffic

