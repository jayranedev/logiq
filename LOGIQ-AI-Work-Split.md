# LOGIQ.AI — 2-Person Work Split & Complete API/Tool List

## Team Overview

| | Person A (Jay) — "The Engine" | Person B — "The Interface" |
|---|---|---|
| **Owns** | Backend, ML, Real-time, Deployment, Mobile | Frontend, Map, Dashboard, Visualizations |
| **Stack** | FastAPI, PostgreSQL, Redis, OR-Tools, XGBoost, Expo | React, Leaflet, Recharts, Zustand, Tailwind |
| **Communicates via** | API contracts defined upfront on hour 0 | Mock data until backend is ready |

---

## Hour-by-Hour Breakdown

### PHASE 1: Foundation (Hours 0–8)

#### Person A — Backend Scaffold
| Hour | Task | Deliverable |
|------|------|-------------|
| 0–1 | Project setup: FastAPI + Docker Compose (Postgres + Redis) | `docker-compose up` runs clean |
| 1–2 | Database schema: drivers, orders, routes, events tables | Alembic migration + seed script |
| 2–4 | CRUD endpoints: drivers + orders | `GET/POST/PATCH /api/drivers`, `GET/POST/PATCH /api/orders` |
| 4–6 | WebSocket server: driver location broadcast via Redis pub/sub | `ws://localhost:8000/ws/tracking` live |
| 6–8 | GPS simulator script: moves 6 fake drivers along real Mumbai roads | Drivers visibly moving when frontend connects |

**Hour 8 checkpoint:** Backend running, WebSocket streaming fake driver GPS, REST endpoints for CRUD.

#### Person B — Frontend Scaffold
| Hour | Task | Deliverable |
|------|------|-------------|
| 0–1 | Project setup: Vite + React + Tailwind + React Router | Clean dev server running |
| 1–2 | Layout shell: sidebar + main content + header + dark theme | Responsive skeleton |
| 2–4 | Leaflet map integration with Mumbai tiles + driver markers | Map renders with 6 static markers |
| 4–6 | WebSocket client hook: connect to backend, update driver positions | Markers move in real-time on map |
| 6–8 | Fleet sidebar: driver list, status badges, click to select | Click driver → map centers + shows info |

**Hour 8 checkpoint:** Map showing live driver positions from WebSocket, fleet panel working.

---

### PHASE 2: Core Features (Hours 8–20)

#### Person A — Optimization + AI
| Hour | Task | Deliverable |
|------|------|-------------|
| 8–11 | OR-Tools CVRP route optimizer: capacity + priority constraints | `POST /api/routes/optimize` returns optimal routes |
| 11–13 | Order batching: auto-assign pending orders by zone + capacity | `POST /api/orders/batch` groups and assigns |
| 13–15 | Synthetic data generator: 15K delivery history records | `delivery_history` table populated |
| 15–18 | XGBoost model: train classifier (delay yes/no) + regressor (delay minutes) | `model_classifier.pkl` + `model_regressor.pkl` saved |
| 18–20 | Prediction API: single + batch endpoints with factor explainability | `GET /api/predictions/{order_id}` returns risk + factors |

**Hour 20 checkpoint:** Route optimization working, ML model trained and serving predictions.

#### Person B — Dashboard Panels
| Hour | Task | Deliverable |
|------|------|-------------|
| 8–10 | Route visualization: draw optimized routes as polylines on map | Animated dashed lines connecting stops |
| 10–13 | Order management panel: queue view, priority badges, status filters | Sortable/filterable order table |
| 13–16 | AI prediction panel: risk cards, delay bars, factor breakdown (Recharts) | Visual risk dashboard with HIGH/MED/LOW |
| 16–18 | Stats bar: live counters (active drivers, deliveries, pending, savings %) | Top-of-page KPI cards updating in real-time |
| 18–20 | Live event feed: streaming toast notifications + event log | Scrolling feed of deliveries, delays, re-routes |

**Hour 20 checkpoint:** Full dashboard with all panels rendering real backend data.

---

### PHASE 3: Mobile + Polish (Hours 20–36)

#### Person A — Mobile App + Infra
| Hour | Task | Deliverable |
|------|------|-------------|
| 20–24 | Expo mobile app: 3 screens (orders, map, status) + GPS tracking | Driver can see assigned orders + send GPS |
| 24–27 | Background GPS task: push location every 3s to backend | Mobile driver appears on dashboard map |
| 27–30 | Order status flow: picked up → in transit → delivered from mobile | Status changes reflect on dashboard instantly |
| 30–33 | Deploy to AWS: EC2 t3.medium, Docker Compose, nginx reverse proxy | `http://your-ip` serves the full app |
| 33–36 | SSL (optional), seed production data, stress test WebSockets | 50+ orders, 6 drivers, everything stable |

#### Person B — UX Polish + Demo Prep
| Hour | Task | Deliverable |
|------|------|-------------|
| 20–23 | Animations: route drawing, marker transitions, panel slide-ins | Framer Motion transitions throughout |
| 23–26 | Responsive layout: works on projector (1920x1080) + laptop | No overflow/scroll issues at demo resolution |
| 26–29 | "Trigger moment" button: inject traffic spike → AI alerts → re-route | One-click demo wow moment |
| 29–32 | Loading states, error boundaries, reconnect toast for WebSocket | No blank screens or crashes during demo |
| 32–36 | Demo rehearsal, backup video recording, architecture slide | Polished 5-min presentation ready |

---

### PHASE 4: Final Integration + Demo (Hours 36–48)

#### Both People Together
| Hour | Task |
|------|------|
| 36–40 | End-to-end integration testing: frontend ↔ backend ↔ mobile |
| 40–42 | Fix bugs, edge cases, data inconsistencies |
| 42–44 | Seed final demo data: 50 orders, 6 drivers, 3 active routes, varied statuses |
| 44–46 | Full demo rehearsal (x3): practice the 5-minute script |
| 46–48 | Buffer: sleep, eat, last-minute fixes, pre-load everything before presentation |

---

## Complete API & Tool List

### Maps & Geolocation

| API/Tool | Purpose | Free Tier | Link |
|----------|---------|-----------|------|
| **Leaflet.js** | Interactive map rendering (frontend) | Fully free & open source | leafletjs.com |
| **OpenStreetMap Tiles** | Map tile layer (no API key needed) | Free, unlimited | tile.openstreetmap.org |
| **Mapbox GL JS** | Premium map alternative (better styling) | 50K loads/month free | mapbox.com |
| **Mapbox Directions API** | Real road-following route polylines | 100K requests/month free | mapbox.com/directions |
| **OpenRouteService API** | Route directions, distance matrix, isochrones | 2K requests/day free | openrouteservice.org |
| **Google Maps Distance Matrix** | Accurate drive time between points | $200/month free credit | cloud.google.com/maps |
| **OSRM (Open Source Routing)** | Self-hosted routing engine (no limits) | Free, self-hosted | project-osrm.org |
| **Expo Location** | Mobile GPS tracking (foreground + background) | Free with Expo | docs.expo.dev/versions/latest/sdk/location |

### Route Optimization

| API/Tool | Purpose | Free Tier | Link |
|----------|---------|-----------|------|
| **Google OR-Tools** | CVRP solver (capacity, time windows, priority) | Fully free & open source | developers.google.com/optimization |
| **Mapbox Optimization API** | Cloud-based route optimization (simpler setup) | 100K requests/month free | mapbox.com/optimization |
| **OpenRouteService Optimization** | TSP/VRP solver via API | 500 requests/day free | openrouteservice.org |
| **Vroom** | Open source VRP solver (self-hosted, very fast) | Free, self-hosted | github.com/VROOM-Project/vroom |
| **Routific API** | Commercial route optimization API | 10 vehicles free trial | routific.com |

### Traffic & Real-time Data

| API/Tool | Purpose | Free Tier | Link |
|----------|---------|-----------|------|
| **TomTom Traffic Flow API** | Real-time traffic speed/congestion data | 2,500 requests/day free | developer.tomtom.com |
| **HERE Traffic API** | Traffic incidents, flow, jam factors | 250K requests/month free | developer.here.com |
| **Mapbox Traffic Tileset** | Traffic overlay on map tiles | Included with Mapbox free tier | mapbox.com |
| **OpenWeatherMap API** | Weather data (rain = delivery delays) | 1,000 calls/day free | openweathermap.org |
| **Google Maps Traffic Layer** | Visual traffic overlay | Included with Maps JS API | cloud.google.com/maps |

### AI / Machine Learning

| API/Tool | Purpose | Free Tier | Link |
|----------|---------|-----------|------|
| **XGBoost** | Delay prediction classifier + regressor | Fully free & open source | xgboost.readthedocs.io |
| **scikit-learn** | Feature engineering, train/test split, metrics | Fully free & open source | scikit-learn.org |
| **Google Gemini Flash** | Natural language order parsing, smart alerts | Free tier available | ai.google.dev |
| **OpenAI GPT-4o-mini** | Alternative for NL order parsing | $0.15/1M input tokens | platform.openai.com |
| **Hugging Face Transformers** | Pre-trained models for text classification | Free & open source | huggingface.co |
| **SHAP** | ML model explainability (factor breakdowns) | Free & open source | shap.readthedocs.io |

### Real-time Communication

| API/Tool | Purpose | Free Tier | Link |
|----------|---------|-----------|------|
| **FastAPI WebSockets** | Native WebSocket support in backend | Built into FastAPI | fastapi.tiangolo.com |
| **Redis Pub/Sub** | Message broker for real-time event distribution | Free (self-hosted via Docker) | redis.io |
| **Socket.IO** | Alternative real-time library (auto-reconnect) | Free & open source | socket.io |
| **Pusher** | Managed WebSocket service (easier setup) | 200K messages/day free | pusher.com |
| **Ably** | Managed real-time messaging | 6M messages/month free | ably.com |

### Backend & Database

| API/Tool | Purpose | Free Tier | Link |
|----------|---------|-----------|------|
| **FastAPI** | Backend framework (async, auto-docs, WebSocket) | Free & open source | fastapi.tiangolo.com |
| **PostgreSQL** | Primary database | Free (Docker or Supabase free tier) | postgresql.org |
| **Redis** | Caching, pub/sub, session store | Free (Docker) | redis.io |
| **SQLAlchemy (async)** | ORM with async PostgreSQL support | Free & open source | sqlalchemy.org |
| **Alembic** | Database migrations | Free & open source | alembic.sqlalchemy.org |
| **Celery** | Background task queue (batching, optimization) | Free & open source | celeryproject.org |
| **Supabase** | Managed PostgreSQL + Auth (if you skip self-hosted) | 500MB free | supabase.com |

### Frontend

| API/Tool | Purpose | Free Tier | Link |
|----------|---------|-----------|------|
| **React 18** | UI framework | Free & open source | react.dev |
| **Vite** | Build tool (fast HMR) | Free & open source | vitejs.dev |
| **Tailwind CSS** | Utility-first styling | Free & open source | tailwindcss.com |
| **Zustand** | Lightweight state management | Free & open source | zustand-demo.pmnd.rs |
| **React Query (TanStack)** | Server state management + caching | Free & open source | tanstack.com/query |
| **Recharts** | Charts for AI prediction panel + analytics | Free & open source | recharts.org |
| **Framer Motion** | Animations and transitions | Free & open source | motion.dev |
| **Lucide React** | Icons | Free & open source | lucide.dev |
| **react-leaflet** | React wrapper for Leaflet maps | Free & open source | react-leaflet.js.org |

### Mobile

| API/Tool | Purpose | Free Tier | Link |
|----------|---------|-----------|------|
| **Expo (React Native)** | Mobile app framework | Free | expo.dev |
| **expo-location** | GPS tracking (foreground + background) | Free | docs.expo.dev |
| **expo-task-manager** | Background tasks for GPS push | Free | docs.expo.dev |
| **React Navigation** | Mobile screen navigation | Free & open source | reactnavigation.org |
| **react-native-maps** | Map view in mobile app | Free & open source | github.com/react-native-maps |

### Deployment & DevOps

| API/Tool | Purpose | Free Tier | Link |
|----------|---------|-----------|------|
| **Docker + Docker Compose** | Container orchestration | Free | docker.com |
| **AWS EC2 (t3.medium)** | Server hosting | 750 hrs/month free (t2.micro) | aws.amazon.com |
| **Railway** | One-click deploy alternative to EC2 | $5 free credit | railway.app |
| **Render** | Another deploy alternative | 750 hrs/month free | render.com |
| **Nginx** | Reverse proxy + static file serving | Free & open source | nginx.org |
| **Let's Encrypt / Certbot** | Free SSL certificate | Free | letsencrypt.org |
| **GitHub Actions** | CI/CD pipeline | 2,000 min/month free | github.com/features/actions |

### Notifications & Communication

| API/Tool | Purpose | Free Tier | Link |
|----------|---------|-----------|------|
| **Firebase Cloud Messaging** | Push notifications to mobile driver app | Free | firebase.google.com |
| **Twilio SMS** | SMS alerts for delivery status | $15 free credit | twilio.com |
| **Resend** | Email notifications (order confirmation) | 3,000 emails/month free | resend.com |

### Monitoring & Analytics (Bonus Points)

| API/Tool | Purpose | Free Tier | Link |
|----------|---------|-----------|------|
| **Sentry** | Error tracking (frontend + backend) | 5K events/month free | sentry.io |
| **Grafana + Prometheus** | Metrics dashboard (show during demo) | Free & open source | grafana.com |
| **PostHog** | Product analytics | 1M events/month free | posthog.com |

---

## Recommended API Stack (Pick This)

For the hackathon, don't over-engineer. Use this exact combo:

### Must-Have (Use These)
| Category | Pick | Why |
|----------|------|-----|
| Map tiles | **OpenStreetMap + Leaflet** | Zero setup, no API key, looks great |
| Route directions | **OpenRouteService API** | Free, no credit card, returns GeoJSON polylines |
| Route optimization | **Google OR-Tools** | Best open-source solver, runs locally, no API limits |
| Traffic data | **TomTom Traffic Flow** | Best free tier (2,500/day), actual real-time speeds |
| Weather | **OpenWeatherMap** | Simple, 1K calls/day free, feeds into ML model |
| ML model | **XGBoost (local)** | No API calls, fast inference, great explainability |
| Real-time | **FastAPI WebSocket + Redis** | Native, no third-party dependency |
| Database | **PostgreSQL (Docker)** | Your comfort zone, async with SQLAlchemy |
| Mobile GPS | **Expo Location** | Works on Android + iOS, background tracking |
| Deploy | **AWS EC2 + Docker Compose** | You already know this stack |

### Nice-to-Have (If Time Permits)
| Category | Pick | Why |
|----------|------|-----|
| Premium map | **Mapbox GL JS** | Better visual styling for demo |
| Push notifications | **Firebase FCM** | Free, easy Expo integration |
| Error tracking | **Sentry** | Shows judges you think about production |
| Monitoring | **Grafana** | One dashboard screenshot = "production-ready" credibility |

---

## API Keys to Get BEFORE the Hackathon

Get these accounts set up the night before so you don't waste hackathon hours on registration:

1. **OpenRouteService** → openrouteservice.org/dev → Sign up → Get API key
2. **TomTom** → developer.tomtom.com → Register → Get API key
3. **OpenWeatherMap** → openweathermap.org/api → Sign up → Get API key (takes a few hours to activate)
4. **Mapbox** (optional) → mapbox.com → Sign up → Get access token
5. **Firebase** (optional) → console.firebase.google.com → Create project → Enable FCM
6. **Sentry** (optional) → sentry.io → Create project → Get DSN
7. **AWS** → Ensure EC2 access, security groups allow ports 80, 443, 8000, 3000

---

## File Structure (Both Repos)

```
logiq-ai/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── models/
│   │   │   ├── driver.py
│   │   │   ├── order.py
│   │   │   ├── route.py
│   │   │   └── event.py
│   │   ├── schemas/
│   │   │   ├── driver.py
│   │   │   ├── order.py
│   │   │   └── route.py
│   │   ├── api/
│   │   │   ├── drivers.py
│   │   │   ├── orders.py
│   │   │   ├── routes.py
│   │   │   ├── predictions.py
│   │   │   └── websocket.py
│   │   ├── services/
│   │   │   ├── driver_service.py
│   │   │   ├── order_service.py
│   │   │   ├── route_optimizer.py
│   │   │   ├── batch_service.py
│   │   │   ├── prediction_service.py
│   │   │   └── realtime_service.py
│   │   ├── ml/
│   │   │   ├── generate_data.py
│   │   │   ├── train_model.py
│   │   │   ├── model_classifier.pkl
│   │   │   └── model_regressor.pkl
│   │   └── workers/
│   │       └── tasks.py
│   ├── scripts/
│   │   ├── seed_data.py
│   │   └── gps_simulator.py
│   ├── init.sql
│   ├── Dockerfile
│   ├── requirements.txt
│   └── alembic/
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   ├── components/
│   │   │   ├── Map/
│   │   │   │   ├── MapView.jsx
│   │   │   │   ├── DriverMarker.jsx
│   │   │   │   └── RoutePolyline.jsx
│   │   │   ├── Fleet/
│   │   │   │   ├── FleetPanel.jsx
│   │   │   │   └── DriverCard.jsx
│   │   │   ├── Orders/
│   │   │   │   ├── OrderQueue.jsx
│   │   │   │   └── OrderRow.jsx
│   │   │   ├── AI/
│   │   │   │   ├── PredictionPanel.jsx
│   │   │   │   ├── RiskCard.jsx
│   │   │   │   └── FactorChart.jsx
│   │   │   ├── Route/
│   │   │   │   ├── RoutePanel.jsx
│   │   │   │   └── RouteStats.jsx
│   │   │   ├── Dashboard/
│   │   │   │   ├── StatsBar.jsx
│   │   │   │   └── LiveFeed.jsx
│   │   │   └── Layout/
│   │   │       ├── Header.jsx
│   │   │       └── Sidebar.jsx
│   │   ├── hooks/
│   │   │   ├── useWebSocket.js
│   │   │   ├── useDrivers.js
│   │   │   └── useOrders.js
│   │   ├── stores/
│   │   │   └── appStore.js
│   │   ├── services/
│   │   │   └── api.js
│   │   └── utils/
│   │       ├── constants.js
│   │       └── helpers.js
│   ├── Dockerfile
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.js
├── mobile/
│   ├── App.js
│   ├── screens/
│   │   ├── OrdersScreen.js
│   │   ├── MapScreen.js
│   │   └── StatusScreen.js
│   ├── services/
│   │   ├── api.js
│   │   └── gpsTracker.js
│   ├── app.json
│   └── package.json
├── docker-compose.yml
├── nginx.conf
└── README.md
```

---

## Integration Checkpoints (Both People Meet)

| Hour | Checkpoint | Test |
|------|-----------|------|
| 8 | WebSocket handshake | Frontend map shows moving drivers from backend |
| 14 | REST API integration | Orders panel fetches real data from backend |
| 20 | Route optimization | "Optimize" button calls backend, polylines render on map |
| 24 | AI predictions | Prediction panel shows real model output with factors |
| 30 | Mobile → Dashboard | Driver marks "delivered" on phone, dashboard updates live |
| 36 | Full E2E on deployed URL | Everything works on EC2, not just localhost |
| 44 | Demo dry run | Complete 5-minute presentation with no crashes |

---

*Team Silent Minds — LOGIQ.AI*
