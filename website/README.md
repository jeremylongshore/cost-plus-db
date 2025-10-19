# CostPlusDB Website

**Database hosting at cost + 25%. Transparent, honest pricing.**

Built with [The Monospace Web](https://github.com/owickstrom/the-monospace-web) by Oskar Wickström
Using [Fira Code](https://github.com/tonsky/FiraCode) font by Nikita Prokopov

---

## 🎨 Design

- **Framework:** The Monospace Web (MIT License)
- **Font:** Fira Code (SIL Open Font License 1.1)
- **Colors:** IBM Blue (#0f62fe) background, White (#ffffff) text
- **Philosophy:** Brutally simple, fast, honest

## 📂 File Structure

```
website/
├── index.html              # Homepage (transparency focus)
├── calculator.html         # Live pricing calculator
├── about.html              # Trucker story + long-term vision
├── privacy.html            # Privacy policy (placeholder)
├── terms.html              # Terms of service (placeholder)
│
├── css/
│   ├── reset.css           # Monospace Web reset
│   ├── monospace-base.css  # Monospace Web base styles
│   └── costplusdb-theme.css # Blue/white theme + Fira Code
│
├── transparency/
│   └── index.html          # Links to all internal docs
│
├── temp/                   # Monospace Web source (can delete after deploy)
├── fira-code-temp/         # Fira Code source (can delete - using CDN)
│
└── README.md               # This file
```

## 🚀 Quick Start

### Local Development

```bash
# Navigate to website directory
cd /home/admincostplus/projects/costplusdb/website

# Serve with Python (or any static server)
python3 -m http.server 8000

# Open browser
open http://localhost:8000
```

### Deploy to Netlify

1. **Install Netlify CLI** (optional, or use web UI):
   ```bash
   npm install -g netlify-cli
   ```

2. **Login to Netlify**:
   ```bash
   netlify login
   ```

3. **Deploy**:
   ```bash
   netlify deploy --prod --dir=.
   ```

4. **Or use Netlify web UI**:
   - Drag and drop the `website/` folder
   - Configure custom domain: `costplusdb.dev`

### Deploy to GitHub Pages

```bash
# Create gh-pages branch
git checkout -b gh-pages

# Push website files
git add .
git commit -m "Deploy website"
git push origin gh-pages

# Configure in GitHub settings:
# Settings → Pages → Source: gh-pages branch
```

---

## 🔗 Pages

### Core Pages
- **/** - Homepage (transparency focus, problem/solution)
- **/calculator.html** - Live pricing calculator with real-time updates
- **/about.html** - Trucker story, long-term vision, customer selection

### Supporting Pages
- **/transparency/** - Links to all internal business docs (SOPs, costs, plans)
- **/privacy.html** - Privacy policy (placeholder)
- **/terms.html** - Terms of service (placeholder)

---

## 💰 Pricing Calculator

The calculator (`calculator.html`) uses vanilla JavaScript to calculate pricing in real-time:

### How It Works

1. User selects RAM, storage, provider, region
2. JavaScript calculates:
   - VPS cost (from hardcoded provider pricing)
   - Backup cost (storage × $0.0059/GB)
   - Monitoring cost ($1/month fixed)
   - Add-ons (if selected)
3. Shows transparent breakdown:
   - Our total cost
   - 25% markup
   - Your monthly price
   - AWS comparison
   - Savings

### Cost Data

Located in `<script>` tag in `calculator.html`:

```javascript
const COSTS = {
  vps: {
    contabo: { 2: 6, 4: 8, 8: 12, 16: 20, 32: 36, 64: 60 },
    hetzner: { 2: 10, 4: 15, 8: 25, 16: 40, 32: 70, 64: 120 },
    // etc.
  },
  backup_per_gb: 0.0059,
  monitoring: 1.00,
  addons: { ha: 99, replicas: 15, vpn: 15, compliance: 100 }
};
```

**Update these values** when provider pricing changes.

---

## 🔧 Customization

### Change Colors

Edit `css/costplusdb-theme.css`:

```css
:root {
  --background-color: #0f62fe;  /* Change background */
  --text-color: #ffffff;         /* Change text */
}
```

### Change Font

Edit `css/costplusdb-theme.css`:

```css
/* Replace Fira Code with another font */
@import url('https://fonts.googleapis.com/css2?family=YOUR_FONT&display=swap');

:root {
  --font-family: 'YOUR_FONT', monospace;
}
```

### Update Pricing

Edit the `COSTS` object in `calculator.html` (line ~200).

### Add Transparency Docs

The transparency section currently links to placeholder pages. To add real docs:

1. Convert your markdown docs to HTML
2. Place in `transparency/` directory
3. Update links in `transparency/index.html`

Example:
```bash
# Convert markdown to HTML (use pandoc or similar)
pandoc ../000-docs/005-DR-SOPS-postgresql-operations.md \
  -o transparency/operations-manual.html \
  --template=transparency-template.html
```

---

## 📋 TODO Before Launch

- [ ] Replace privacy.html with real privacy policy
- [ ] Replace terms.html with real terms of service
- [ ] Convert 000-docs/*.md to HTML and place in transparency/
- [ ] Set up Netlify Functions for form submission (optional)
- [ ] Set up Stripe payment links (if using instant checkout)
- [ ] Configure DNS (costplusdb.dev → Netlify)
- [ ] Test all links
- [ ] Test calculator math
- [ ] Mobile testing
- [ ] Spell check all pages

---

## 🌐 Deployment Checklist

### Netlify Setup

1. **Sign up**: https://netlify.com
2. **New site from Git** or drag-and-drop `website/` folder
3. **Build settings**:
   - Build command: (none)
   - Publish directory: `.`
4. **Domain settings**:
   - Add custom domain: `costplusdb.dev`
   - Enable HTTPS (automatic)
5. **Form notifications** (optional):
   - Site settings → Forms → Notifications
   - Email: `hello@intentsolutions.io`

### DNS Configuration

Point `costplusdb.dev` to Netlify:

```
A record:    @    → 75.2.60.5
CNAME:       www  → your-site.netlify.app
```

Or use Netlify DNS for simpler setup.

---

## 🎯 Key Features

### Transparency First
- Links to all internal docs (SOPs, costs, business plan)
- Real-time pricing calculator shows OUR costs
- No hidden fees or surprise charges

### Bootstrapped Story
- About page tells the trucker story
- Long-term vision (buying own hardware)
- Customer selection criteria (we pick who we work with)

### Simple Tech Stack
- Static HTML/CSS/JS (no frameworks)
- Vanilla JavaScript for calculator
- Monospace Web for layout
- Fira Code for typography

### Mobile Responsive
- Character-sized breakpoints
- Works on all screen sizes
- Fast loading (no heavy assets)

---

## 📊 Analytics (Optional)

Currently **no tracking** is installed. To add simple analytics:

### Option 1: Netlify Analytics (privacy-friendly)
- Enable in Netlify dashboard
- $9/month
- No cookies, fully server-side

### Option 2: Plausible (privacy-friendly)
- Self-hosted or $9/month
- GDPR compliant
- No cookies

**DO NOT USE**: Google Analytics (privacy nightmare)

---

## 🔒 Security Headers

Add to `netlify.toml` (create if doesn't exist):

```toml
[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
    Permissions-Policy = "geolocation=(), microphone=(), camera=()"
```

---

## 📝 Credits

Built with:
- [The Monospace Web](https://github.com/owickstrom/the-monospace-web) by Oskar Wickström (MIT License)
- [Fira Code](https://github.com/tonsky/FiraCode) by Nikita Prokopov (SIL OFL 1.1)

Both are credited in page footers.

---

## 📧 Contact

**Jeremy Longshore**
Email: hello@intentsolutions.io
GitHub: [jeremylongshore](https://github.com/jeremylongshore)
Website: [jeremylongshore.com](https://jeremylongshore.com)

---

## License

Website code: MIT License
Content: © 2025 intent solutions io
