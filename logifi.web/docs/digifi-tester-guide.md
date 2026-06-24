# Digifi web tester guide (Phase 1)

Use this flow for Murray and first testers. **v1 official path is web + QR**, not the native Digifi Eye app.

## Before the session

- [ ] Tester has a Logifi account (same email on laptop and phone if using account features later; QR only needs the session token)
- [ ] Host machine runs the app with Digifi API keys configured (see [digifi-beta-env-checklist.md](./digifi-beta-env-checklist.md))
- [ ] `SUPABASE_SERVICE_ROLE_KEY` set (companion capture + credits)
- [ ] Tester has credits (use **Add Credits** in Settings → Digifi — mock checkout on `dev`)

### Dev / LAN / hotspot

1. Start dev server: `pnpm dev:lan` from `logifi.web`
2. Open Add Pages on the **laptop** using the LAN URL (not `0.0.0.0`), e.g. `http://192.168.x.x:3000/logbook-builder`
3. If phone cannot load the QR URL, set in `.env` and restart:
   ```bash
   NUXT_PUBLIC_COMPANION_CAPTURE_ORIGIN=http://YOUR_LAPTOP_IP:3000
   ```
4. On phone: use **Safari** to scan the QR or open the link under the QR code
5. macOS: allow incoming connections on port 3000 if the phone cannot reach the laptop

## Test flow (checklist)

### Setup

- [ ] Laptop: **Add Pages** → open **Digifi scanner**
- [ ] Set toolbar: rows, layout (single/two-page), columns match paper logbook
- [ ] Click **Connect phone**
- [ ] Desktop shows QR + “Session active”

### Phone capture (Safari)

- [ ] Scan QR (or open printed URL under QR)
- [ ] Tap **Left page** → take photo
- [ ] Tap **Right page** → take photo (two-page layout)
- [ ] Phone shows upload success

### Desktop review

- [ ] Photos appear in Digifi panel (realtime); scans run automatically
- [ ] Review grid cells (yellow = needs review)
- [ ] Edit mistakes
- [ ] **Validate** → **Import** into logbook

### Credits

- [ ] Balance decreases by 1 credit per spread scanned
- [ ] If blocked, use Settings → Digifi → Add Credits (mock on `dev`)

## Sign-off (before merging `payment` → `dev`)

- [ ] End-to-end flow completed once without blocking bugs
- [ ] Tester name: _______________
- [ ] Date: _______________
- [ ] Notes / issues: _______________

## Out of scope for Phase 1 testers

- Digifi Eye in the iOS app (Beta; requires production API wiring)
- Real Stripe / Lightning (on `payment` branch until merged)
- FC View import same day as Digifi

## Troubleshooting

| Symptom | Likely cause |
|---------|----------------|
| Phone cannot open QR URL | Wrong IP in QR; set `NUXT_PUBLIC_COMPANION_CAPTURE_ORIGIN`; firewall |
| “Session closed or expired” | Session &gt; 20 min or old QR; click **Connect phone** again |
| No scan on desktop | Check server logs; Gemini/Anthropic key; credits balance |
| Empty / wrong rows | Row count in toolbar should match **flight lines**, not totals row |
