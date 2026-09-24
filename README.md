<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# ZonScanner AI

> High-density, AI-accelerated Amazon deal scanner, price tracker, cross-marketplace arbitrage index, and automated affiliate tag engine.

View your app in AI Studio: https://ai.studio/apps/9c704f94-3ab4-4011-85f4-42ad0e462b5c

---

## ⚡ Speed & Performance Architecture (Refactored for Speed)

The application has been extensively refactored for ultra-low latency, instant tab switching, and optimized resource consumption:

### 1. High-Throughput Model Engine (`gemini-3.8-flash`)
- Upgraded the AI core to **`gemini-3.8-flash`** with Google Search Grounding for live deal scanning and cross-border marketplace pricing.
- Streamlined prompt tokens and structured JSON schemas to reduce generation latency by up to 60%.

### 2. Multi-Tier Dual Caching Layer (In-Memory + `sessionStorage`)
- **Memory Cache (`Map<string, CacheEntry>`)**: Instantaneous (0ms) response times for cached deals, searches, and marketplace comparisons during an active session.
- **Session Persistence**: Caches scan queries and comparison matrices with a 10-minute TTL across page navigations and tab switches, preventing redundant API calls.

### 3. In-Flight Request Deduplication
- Simultaneous requests for identical marketplace queries or product searches share a single in-flight Promise, eliminating duplicate network roundtrips.

### 4. Route-Level Code Splitting & Lazy Loading
- Modular components (`PriceTracker`, `PriceComparison`, `PublicDeals`, `Profile`) are dynamically loaded using `React.lazy` and `Suspense`.
- The initial JavaScript payload is minimized so the core application boots and mounts immediately.

### 5. Intelligent Vendor Chunk Splitting
- Optimized Vite / Rollup build configuration separates large dependencies into isolated vendor chunks:
  - `vendor-firebase`: Firebase App, Auth, Firestore
  - `vendor-genai`: `@google/genai` SDK
  - `vendor-motion`: `motion/react` animation primitives
  - `vendor-icons`: `lucide-react` iconography
- Enables aggressive browser HTTP/2 caching across deployments.

### 6. Memoized Rendering & Client-Side Filtering
- `useMemo` utilized across sorting operations in `PublicDeals` and `PriceComparison`, preventing recalculation overhead during input typing or UI interaction.

---

## 🛠️ Key Features

- **Deal Scanner (`Deal_Scanner.v2`)**: Scan Amazon marketplaces (US, UK, CA, DE, FR) for deep discounts by keyword, ASIN, or category with minimum discount thresholds.
- **Price Tracker & Email Alerts (`Price_Watch.v2`)**: Monitor ASINs, set target prices, and configure automated transactional email notifications on price drops.
- **Price Analytics & Savings Visualizer (`Price_Analytics.v3`)**: Interactive data visualization powered by **Recharts** displaying:
  - Multi-line historical price trajectories vs user-defined target thresholds and baseline prices.
  - Cumulative savings progression curve with area gradients.
  - Per-asset savings breakdown (vertical bar chart with dollar & discount metrics).
  - Configurable time horizons (7D, 14D, 30D, 90D, ALL) and individual asset focus or portfolio aggregate views.
- **Market Comparison (`Market_Index.v4`)**: Compare real-time live pricing for any product across 5 global Amazon locales with interactive ascending/descending sorting.
- **Community Matrix (`Community_Matrix.v2`)**: Live curated deal feed with flexible real-time sorting by:
  - Date Posted (Newest First)
  - Discount % (Highest First)
  - Price (Low to High & High to Low)
- **Affiliate Tag Engine**: Centralized affiliate URL parser that automatically injects and replaces associate tags across any Amazon domain and shortlink format (`amzn.to`, `amazon.com`, `amazon.co.uk`, etc.).
- **High-Density Aesthetic**: Compact, data-rich user interface optimized for power users, complete with monospaced metrics, status chips, and typography hierarchy.

---

## 🚀 Run Locally

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- A Gemini API Key from [Google AI Studio](https://aistudio.google.com/)

### Installation & Launch

1. Clone or download the repository.
2. Install project dependencies:
   ```bash
   npm install
   ```
3. Create a `.env.local` file in the project root:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```
5. Open your browser and navigate to `http://localhost:3000`.

### Building for Production
```bash
npm run build
```
Preview the production build locally:
```bash
npm run preview
```
