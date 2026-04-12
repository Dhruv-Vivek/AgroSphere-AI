# AgroSphere — Frontend UI Cursor Prompt
## Concept D (Wizard Onboarding) + Concept A (Split Panel Dashboard)
> Paste this entire file into Cursor AI as your implementation prompt.

---

## WHAT TO BUILD

Two connected UI flows that together form the complete AgroSphere frontend:

1. **FLOW 1 — Farm Setup Wizard (Concept D)**
   First-run experience. 5-step guided form with a live mini-map preview on the right.
   After completion → redirects to the main dashboard.

2. **FLOW 2 — Split Panel Dashboard (Concept A)**
   Main app experience. Left = interactive farm map with clickable zone polygons.
   Right = live stats panel that updates when a zone is clicked.
   Includes drone scan button, satellite image upload, and all zone analytics.

---

## TECH STACK (Frontend Only)

```
Framework:    React 18 + Vite
Styling:      TailwindCSS + custom CSS variables
Animation:    Framer Motion
Map:          React-Leaflet (for satellite tile layer + zone polygons)
Charts:       Recharts (radar, line, bar charts in stats panel)
State:        Zustand (global farm state)
API calls:    Axios with React Query
Icons:        Lucide React
File upload:  react-dropzone (drone/satellite image upload)
Routing:      React Router v6
Fonts:        Syne (headings) + DM Sans (UI) + JetBrains Mono (sensor data)
```

Install all at once:
```bash
npm create vite@latest agrosphere-ui -- --template react
cd agrosphere-ui
npm install tailwindcss @tailwindcss/vite framer-motion react-leaflet leaflet recharts zustand axios @tanstack/react-query lucide-react react-dropzone react-router-dom
npm install -D @types/leaflet
```

---

## DESIGN SYSTEM

### CSS Variables (add to `index.css`)

```css
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700&family=DM+Sans:wght@400;500&family=JetBrains+Mono:wght@400;500&display=swap');

:root {
  --bg-deep:        #0D1A0F;
  --bg-surface:     #152318;
  --bg-card:        #1C2E1F;
  --bg-card-hover:  #223525;
  --border:         #2A4030;
  --border-light:   #1E3224;

  --green-500:      #4ADE80;
  --green-400:      #1D9E75;
  --amber-400:      #F59E0B;
  --amber-300:      #EF9F27;
  --red-500:        #EF4444;
  --red-400:        #E24B4A;
  --blue-400:       #378ADD;
  --blue-300:       #85B7EB;
  --ochre:          #D97706;

  --text-primary:   #E8F5E9;
  --text-secondary: #9CA3AF;
  --text-dim:       #4B6955;

  --font-display:   'Syne', sans-serif;
  --font-ui:        'DM Sans', sans-serif;
  --font-mono:      'JetBrains Mono', monospace;

  /* Zone colors */
  --zone-maize:     rgba(239,159,39,0.25);
  --zone-wheat:     rgba(29,158,117,0.20);
  --zone-tomato:    rgba(226,75,74,0.28);
  --zone-rice:      rgba(55,138,221,0.22);
  --zone-cotton:    rgba(167,139,250,0.22);
  --zone-sugarcane: rgba(52,211,153,0.22);
  --zone-onion:     rgba(251,146,60,0.22);
}

body {
  background: var(--bg-deep);
  color: var(--text-primary);
  font-family: var(--font-ui);
}

h1, h2, h3, h4 {
  font-family: var(--font-display);
}

.mono {
  font-family: var(--font-mono);
}
```

### Tailwind config (`tailwind.config.js`)
```js
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        'bg-deep':    '#0D1A0F',
        'bg-surface': '#152318',
        'bg-card':    '#1C2E1F',
        'border-farm':'#2A4030',
        'green-farm': '#4ADE80',
        'green-mid':  '#1D9E75',
      },
      fontFamily: {
        display: ['Syne', 'sans-serif'],
        ui:      ['DM Sans', 'sans-serif'],
        mono:    ['JetBrains Mono', 'monospace'],
      }
    }
  }
}
```

---

## FOLDER STRUCTURE

```
src/
├── main.jsx
├── App.jsx                          # Router setup
├── index.css                        # Design system variables
│
├── store/
│   └── farmStore.js                 # Zustand: farm, zones, selectedZone, scanState
│
├── data/
│   └── syntheticFarm.js             # Demo farm data (Sharma Farm)
│   └── cropConfig.js                # Crop colors, thresholds, icons
│
├── components/
│   │
│   ├── wizard/                      # FLOW 1 — Setup Wizard
│   │   ├── WizardShell.jsx          # Layout: stepper + body + mini map
│   │   ├── StepIndicator.jsx        # Top progress bar (5 steps)
│   │   ├── Step1_FarmInfo.jsx       # Farm name, location, acreage
│   │   ├── Step2_ZoneSplit.jsx      # Choose zone layout (4 equal / custom)
│   │   ├── Step3_CropDetails.jsx    # Per-zone crop form (loops each zone)
│   │   ├── Step4_Borewell.jsx       # Borewell setup form
│   │   ├── Step5_Review.jsx         # Summary + submit
│   │   └── MiniMapPreview.jsx       # Live 2x2 grid map (right side of wizard)
│   │
│   ├── dashboard/                   # FLOW 2 — Split Panel Dashboard
│   │   ├── DashboardLayout.jsx      # Sidebar nav + main content area
│   │   ├── Sidebar.jsx              # Left nav: logo, links, demo badge
│   │   ├── TopBar.jsx               # Farm name, refresh, alert bell
│   │   │
│   │   ├── FarmMap/                 # LEFT PANEL — Interactive Map
│   │   │   ├── FarmMapPanel.jsx     # Container for the map
│   │   │   ├── ZoneGrid.jsx         # 2x2 (or NxM) grid of clickable zones
│   │   │   ├── ZoneCell.jsx         # Individual zone: color, name, pulse anim
│   │   │   ├── BorewellMarker.jsx   # Borewell icon on map + click handler
│   │   │   ├── DroneButton.jsx      # "Drone scan" button overlay on map
│   │   │   ├── DroneAnimation.jsx   # Scan line sweeping across zones
│   │   │   └── SatelliteUpload.jsx  # Upload drone/satellite image overlay
│   │   │
│   │   └── StatsPanel/              # RIGHT PANEL — Zone Stats
│   │       ├── StatsPanelShell.jsx  # Right panel container + transitions
│   │       ├── ZoneHeader.jsx       # Zone name, crop, status badge
│   │       ├── QuickStats.jsx       # Moisture, pH, temp, humidity pills
│   │       ├── SoilRadar.jsx        # Recharts radar: pH/N/P/K/moisture
│   │       ├── GrowthChart.jsx      # Line chart: actual vs expected growth
│   │       ├── IrrigationCard.jsx   # Next irrigation + borewell controls
│   │       ├── CareTaskList.jsx     # AI care tasks (fertilizer, weeding)
│   │       ├── YieldForecast.jsx    # Expected yield bar + risk factors
│   │       ├── LiveSensorTicker.jsx # Real-time sensor readings (WebSocket)
│   │       └── BorewellPanel.jsx    # Borewell slide-over (from marker click)
│
└── hooks/
    ├── useFarm.js                   # Fetch farm data from API
    ├── useZone.js                   # Fetch zone stats
    ├── useWebSocket.js              # Live sensor WebSocket connection
    └── useDroneScan.js              # Drone scan state machine
```

---

## FLOW 1 — WIZARD IMPLEMENTATION

### `WizardShell.jsx`

Layout: two-column. Left = form (flex:1). Right = MiniMapPreview (fixed 280px).

```jsx
// Structure:
// <div className="min-h-screen bg-bg-deep flex flex-col">
//   <StepIndicator currentStep={step} totalSteps={5} />
//   <div className="flex flex-1 gap-0">
//     <div className="flex-1 p-8 overflow-y-auto">
//       {renderStep(step)}   // renders Step1–Step5
//     </div>
//     <div className="w-72 border-l border-border-farm sticky top-0 h-screen">
//       <MiniMapPreview zones={farmData.zones} activeZone={currentEditingZone} />
//     </div>
//   </div>
// </div>
```

### `StepIndicator.jsx`

Horizontal row of 5 steps. Each step = circle number + label below.
- Completed steps: filled green circle with checkmark
- Current step: green outline circle with number, label bold green
- Future steps: gray circle, gray label

Steps: "Farm info" → "Zone split" → "Crop details" → "Borewell" → "Review"

Animate progress bar line between steps using Framer Motion `scaleX`.

### `Step1_FarmInfo.jsx`

Form fields:
```
Farm name          [text input]          e.g. "Sharma Farm"
Your name          [text input]          Farmer's name
Phone number       [text input]          For alerts
Total acreage      [number input]        e.g. 20
Location           [text input]          Village/Taluk/District
State              [select dropdown]     All Indian states
Water source       [multi-checkbox]      Borewell / Canal / Rainwater / Tank
```

Bottom of form:
```
[Use demo data — skip setup]  (fills entire wizard with Sharma Farm defaults)
[Next →]
```

Demo data toggle: when clicked, pre-fill ALL steps with Sharma Farm data and jump directly to Step 5 (review).

### `Step2_ZoneSplit.jsx`

Header: "How is your farm divided?"

Three preset options shown as clickable cards:
```
[4 equal zones]    [2 zones]    [Custom (draw)]
   2×2 grid          1×2          (text: "tell us manually")
```

Below selected option:
- Show a visual grid preview (matching the mini map on right)
- For each zone: input for acreage (auto-filled = total/4 for equal split)
- Zone names: auto-labeled A, B, C, D (editable)

"Custom" option: show a simple zone count selector (2–8 zones) + name each one.

### `Step3_CropDetails.jsx`

This step LOOPS over each zone. Show "Zone A of 4", "Zone B of 4" etc.
Previous/Next zone navigation inside this step.

Per-zone form:
```
Crop type          [select]    Maize / Wheat / Rice / Cotton / Sugarcane / Tomato / Onion
Variety/Cultivar   [text]      e.g. "Hybrid 614"
Sowing date        [date]
Growth stage       [select]    Germination / Vegetative / Flowering / Fruiting / Maturity
Acreage            [number]    (pre-filled from Step 2)

── Soil Health ──────────────────────────────────────
Soil pH            [slider 4.0–9.0]     shows value live
Moisture %         [slider 0–100]
Humidity %         [slider 0–100]
Temperature °C     [slider 10–50]
Nitrogen (N)       [number input]   mg/kg
Phosphorus (P)     [number input]   mg/kg
Potassium (K)      [number input]   mg/kg

── Care history ─────────────────────────────────────
Last fertilizer date   [date]
Irrigation method      [select]   Drip / Flood / Sprinkler / Borewell-fed
```

Right side of each slider: show colored indicator
- Green = within optimal range for selected crop
- Amber = slightly off
- Red = critical deviation

Below the form: toggle "Auto-fill optimal values for [crop]"
When toggled: sliders animate to the crop's ideal values.

When a zone is being edited → MiniMapPreview highlights that zone with a pulsing border.

### `Step4_Borewell.jsx`

```
Borewell depth     [number]    feet
Motor HP           [select]    1 / 2 / 3 / 5 / 7.5 / 10 HP
Flow rate          [number]    L/min (auto-estimate from HP if blank)
Water table level  [number]    feet below ground
Connected zones    [multi-checkbox]   Zone A / B / C / D
Electricity source [select]    Grid / Solar / Generator
```

Show a simple vertical diagram of the borewell:
- Ground surface line
- Dotted line going down = depth
- Blue fill at bottom = water table level
- Updates live as sliders change

If no borewell: "No borewell — using other source" checkbox skips this step.

### `Step5_Review.jsx`

Summary cards, one per zone:
```
┌─────────────────────────────────────┐
│ Zone A                    [Edit]    │
│ Maize · 5 acres · Hybrid 614       │
│ Vegetative stage · Sown 45 days ago │
│ pH 6.4 · Moisture 52% · N:120      │
└─────────────────────────────────────┘
```

Below all zone cards:
```
Borewell: 400ft · 3HP · 180 L/min · Connected to all zones
```

"Submit farm" button → POST to /api/farms → on success: animate transition to Dashboard.

Use Framer Motion `layoutId` to animate the mini map preview expanding into the full dashboard map.

### `MiniMapPreview.jsx`

Right sidebar of wizard. Fixed 280px wide. Dark background (#0D1A0F).

Shows a 2×2 (or N-zone) grid:
- Each zone = colored rectangle with zone name + crop icon
- Zone colors: Maize=amber, Wheat=teal, Tomato=red, Rice=blue, Cotton=purple
- Currently-editing zone: pulsing green border + slightly brighter fill
- Completed zones: solid fill, checkmark overlay
- Empty zones: dim gray with "?" label

At the bottom: "Borewell" marker appears in Step 4 (blue pump icon).

This component is LIVE — it re-renders as the farmer types, showing the farm building in real time.

---

## FLOW 2 — SPLIT PANEL DASHBOARD

### `DashboardLayout.jsx`

```
┌────────────────────────────────────────────────────────────────┐
│ SIDEBAR (220px fixed)  │  MAIN CONTENT (flex-1)               │
│                        │                                       │
│  AgroSphere logo       │  TopBar (farm name + actions)        │
│  ─────────────────     │  ──────────────────────────────────  │
│  Dashboard             │                                       │
│  Farm map  ←current    │  ┌─────────────────┬───────────────┐ │
│  AI Brain              │  │  LEFT: FarmMap  │ RIGHT: Stats  │ │
│  Disease               │  │  Panel          │ Panel         │ │
│  Drone                 │  │  (flex: 1.4)    │ (fixed 340px) │ │
│  Irrigation            │  │                 │               │ │
│  Market                │  └─────────────────┴───────────────┘ │
│  Storage               │                                       │
│  Schemes               │                                       │
│  Traceability          │                                       │
│  Remote Sensing        │                                       │
│  ─────────────────     │                                       │
│  Settings              │                                       │
│  [Demo Mode badge]     │                                       │
└────────────────────────────────────────────────────────────────┘
```

Sidebar: dark bg (#0D1A0F), 220px, border-right (#2A4030).
Active nav item: green background pill, white text.
All nav items are real links (React Router). Non-implemented pages show a "Coming soon" placeholder.

### LEFT PANEL — `FarmMapPanel.jsx`

Full height of the content area. Dark background (#0D1A0F). Relative positioned.

Contains (stacked using absolute positioning):
1. `ZoneGrid` — the main interactive zone grid
2. `DroneButton` — top-right corner of map
3. `SatelliteUpload` — top-left, small camera icon button
4. `BorewellMarker` — positioned at bottom-center of map
5. `DroneAnimation` — overlay that appears during scan
6. Satellite image overlay layer (shows uploaded image semi-transparently over zones)

#### `ZoneGrid.jsx`

Renders the farm as an SVG or CSS grid of zone polygons.

For a 4-zone farm: 2×2 grid.
Each zone is a `ZoneCell` component.

Map header (top of map area):
```
[Farm name] · [X acres]                    [Refresh] [⚡ 2 alerts]
```

#### `ZoneCell.jsx`

Each zone cell is clickable. On click → updates `selectedZone` in Zustand store → StatsPanel animates in with that zone's data.

Visual states:
```
DEFAULT:    Colored background (crop-based) + zone name + crop icon + moisture bar
SELECTED:   Brighter fill + white border (2px) + scale(1.02)
WARNING:    Amber border + pulsing amber dot in top-right corner
CRITICAL:   Red border (2px) + pulsing red dot + subtle red glow on border
SCANNING:   Green sweep animation passes over it during drone scan
```

Cell content layout:
```
┌──────────────────────────────┐
│  [crop icon]          [●]    │  ← alert dot (color = status)
│                              │
│  Zone A                      │  ← zone name (Syne font)
│  Maize · 5 ac                │  ← crop + acreage
│                              │
│  ████████░░░░ 52%            │  ← moisture bar
│  Health: 78%                 │  ← health score
└──────────────────────────────┘
```

Crop icons (use Lucide or inline SVGs):
- Maize: Wheat icon (amber)
- Wheat: Leaf icon (teal)
- Tomato: Circle icon (red)
- Rice: Droplets icon (blue)
- Cotton: Cloud icon (purple)

#### `DroneButton.jsx`

Positioned absolute top-right of map.
```
[🛸 Drone scan]   ← green button
```

On click: triggers `useDroneScan` hook → starts `DroneAnimation`.

#### `DroneAnimation.jsx`

When scan is triggered:
1. Show drone SVG icon at top-left of map
2. Animate drone flying left→right across top of map (CSS keyframe)
3. Green horizontal scan line sweeps downward (height animates 0→100% over 3 seconds)
4. As scan line passes each zone: zone briefly flashes bright green, then sensor values update with new synthetic readings
5. After complete: show toast "Scan complete — Zone C requires attention"
6. Trigger background API call to refresh sensor data

Use Framer Motion for all animations.

#### `SatelliteUpload.jsx`

Camera icon button in top-left of map.
On click: opens a dropzone modal.

Modal content:
```
┌─────────────────────────────────────┐
│  Upload satellite or drone image    │
│                                     │
│  ┌───────────────────────────────┐  │
│  │                               │  │
│  │   Drop image here             │  │
│  │   or click to browse          │  │
│  │                               │  │
│  │   Supports: JPG, PNG, TIFF    │  │
│  └───────────────────────────────┘  │
│                                     │
│  [Zone to overlay: Zone A ▼]       │
│  [Opacity: ────────── 70%]         │
│                                     │
│  [Cancel]           [Apply overlay] │
└─────────────────────────────────────┘
```

After applying: show the uploaded image as a semi-transparent layer over the selected zone cell. Add a small "📷 Satellite overlay active" badge on that zone.

#### `BorewellMarker.jsx`

Blue pump icon positioned at bottom-center of map grid.
Label: "Borewell · 180 L/min"

On click → slide open `BorewellPanel` from the right (pushes StatsPanel left or overlays it).

`BorewellPanel` content:
```
Header:
  Borewell status: [● ACTIVE] / [○ IDLE]
  Motor toggle: [ON ●────] / [────● OFF]

Stats row:
  Flow rate: [animated gauge 0–500 L/min]
  Water table: 280 ft
  Motor runtime today: 4.2 hrs
  Est. water remaining: 12,400 kL

Zone irrigation table:
  Zone | Crop    | Last irrigated | Next due  | Status
  A    | Maize   | 2 days ago     | Tomorrow  | Optimal
  B    | Wheat   | 3 days ago     | In 2 days | Optimal
  C    | Tomato  | 4 days ago     | NOW ←     | Overdue ⚠
  D    | Rice    | Today          | In 4 days | Optimal

[Irrigate Zone C now]  ← urgent red button
[AI schedule for this week]
```

### RIGHT PANEL — `StatsPanelShell.jsx`

Fixed 340px width. Dark card background (#1C2E1F). Border-left (#2A4030).
Scrollable vertically (overflow-y: auto).

**Default state (no zone selected):**
```
┌──────────────────────────────────┐
│  Click a zone on the map         │
│  to view its details             │
│                                  │
│  Farm summary:                   │
│  Overall health: 72%  ████████░  │
│  Active alerts: 2                │
│  Next irrigation: Zone C · Now   │
│  Weekly water budget: 420 kL     │
└──────────────────────────────────┘
```

**Zone selected state — animates in with Framer Motion slide+fade:**

#### `ZoneHeader.jsx`
```
Zone C                          [CRITICAL]
Tomato · Hybrid Roma · 5 acres
Sown 60 days ago · 38 days to harvest
```
Status badge colors: OPTIMAL=green, WARNING=amber, CRITICAL=red.

#### `QuickStats.jsx`
4 pill cards in a 2×2 grid:
```
[Moisture: 28% ↓]  [pH: 6.4 ✓]
[Temp: 34°C ↑]     [Humidity: 71%]
```
Color each value: green/amber/red based on whether it's in range for that crop.
Arrow indicators: ↑ trending up, ↓ trending down, → stable (compare last 2 readings).

#### `SoilRadar.jsx`
Recharts `RadarChart` with 6 axes:
- pH, Moisture, Nitrogen, Phosphorus, Potassium, Temperature
- All values normalized 0–100 (as % of optimal)
- Two lines: actual (red/amber/green based on health) + optimal (dashed green)
- Dark background, green grid lines

#### `GrowthChart.jsx`
Recharts `LineChart`:
- X axis: days from sowing (0 → total growth days)
- Y axis: growth progress %
- Line 1: actual growth (colored, solid)
- Line 2: expected growth curve (dashed green)
- Vertical marker at "today"
- Stage labels at x-axis: Germination | Vegetative | Flowering | Fruiting | Maturity

#### `IrrigationCard.jsx`
```
Next irrigation
──────────────────────────────
Zone C needs water NOW
Recommended: 90 min · 160 L/min
Estimated volume: 8,640 L

[Irrigate now]    [Schedule for 5AM]
```
If no immediate need: show "Next: Wednesday 5AM · 60 min"

#### `CareTaskList.jsx`
List of AI-recommended tasks:
```
● HIGH  Apply 15kg Urea/acre          Due: Today
        Nitrogen critically low (85 mg/kg vs 120 target)
        [Mark done]  [Reschedule]

● MED   Check for early blight        Due: This week
        High humidity + temp risk
        [Mark done]  [Ask AI why]

● LOW   Weeding required              Due: Next week
        [Mark done]  [Reschedule]
```

#### `YieldForecast.jsx`
```
Expected yield
──────────────────────────────
2.8 – 3.4 tonnes/acre
Confidence: Medium

████████░░░░░░  Current: 68% of target

Risk factors:
  ↓ Drought stress (Zone C moisture critical)
  ↑ Good temperature for flowering
  ↓ Slight N deficiency
```

#### `LiveSensorTicker.jsx`
WebSocket-connected live feed. Shows last 5 readings:
```
Sensor readings — Zone C          [● LIVE]
──────────────────────────────────────────
14:32:05   Moist: 28%  Temp: 34.2°C  pH: 6.4
14:31:00   Moist: 28%  Temp: 34.0°C  pH: 6.4
14:29:55   Moist: 29%  Temp: 33.8°C  pH: 6.5
```
Font: JetBrains Mono. New readings slide in from top with Framer Motion.

---

## ZUSTAND STORE — `farmStore.js`

```js
const useFarmStore = create((set) => ({
  // Farm data
  farm: null,
  zones: [],
  setFarm: (farm) => set({ farm }),
  setZones: (zones) => set({ zones }),

  // Wizard state
  wizardStep: 1,
  wizardData: {
    farmInfo: {},
    zoneSplit: { count: 4, zones: [] },
    cropDetails: {},   // keyed by zoneId
    borewell: {},
  },
  setWizardStep: (step) => set({ wizardStep: step }),
  updateWizardData: (section, data) =>
    set((s) => ({ wizardData: { ...s.wizardData, [section]: data } })),

  // Dashboard state
  selectedZone: null,
  setSelectedZone: (zone) => set({ selectedZone: zone }),

  // Drone scan state
  scanState: 'idle',  // 'idle' | 'scanning' | 'complete'
  scanProgress: 0,
  setScanState: (state) => set({ scanState: state }),
  setScanProgress: (p) => set({ scanProgress: p }),

  // Satellite overlay
  satelliteOverlays: {},  // zoneId -> { imageUrl, opacity }
  setSatelliteOverlay: (zoneId, data) =>
    set((s) => ({ satelliteOverlays: { ...s.satelliteOverlays, [zoneId]: data } })),

  // Borewell panel
  borewellOpen: false,
  setBorewellOpen: (open) => set({ borewellOpen: open }),

  // Alerts
  alerts: [],
  setAlerts: (alerts) => set({ alerts }),
}))
```

---

## SYNTHETIC DEMO DATA — `syntheticFarm.js`

When running without backend (or when "Use demo data" is clicked in wizard):

```js
export const SHARMA_FARM = {
  id: 'demo-farm-1',
  name: 'Sharma Farm',
  farmer: 'Rajesh Sharma',
  total_acres: 20,
  location: 'Gulbarga, Karnataka',
  borewell: {
    status: 'active',
    depth_ft: 400,
    motor_hp: 3,
    flow_rate_lpm: 180,
    water_table_ft: 280,
    motor_runtime_today_hrs: 4.2,
  },
  zones: [
    {
      id: 'zone-a',
      name: 'Zone A',
      crop: 'Maize',
      variety: 'Hybrid 614',
      acres: 5,
      sowing_date: '2026-02-27',   // 45 days ago
      growth_stage: 'Vegetative',
      days_to_harvest: 75,
      health_score: 78,
      status: 'warning',
      sensors: {
        moisture: 52,
        ph: 6.4,
        temperature: 32,
        humidity: 68,
        nitrogen: 105,
        phosphorus: 55,
        potassium: 72,
      },
      trend: { moisture: 'down', temperature: 'up' },
    },
    {
      id: 'zone-b',
      name: 'Zone B',
      crop: 'Wheat',
      variety: 'HD-2967',
      acres: 5,
      sowing_date: '2026-03-13',   // 30 days ago
      growth_stage: 'Vegetative',
      days_to_harvest: 60,
      health_score: 82,
      status: 'optimal',
      sensors: {
        moisture: 44,
        ph: 6.8,
        temperature: 28,
        humidity: 62,
        nitrogen: 118,
        phosphorus: 62,
        potassium: 80,
      },
      trend: { moisture: 'stable', temperature: 'stable' },
    },
    {
      id: 'zone-c',
      name: 'Zone C',
      crop: 'Tomato',
      variety: 'Hybrid Roma',
      acres: 5,
      sowing_date: '2026-02-11',   // 60 days ago
      growth_stage: 'Flowering',
      days_to_harvest: 38,
      health_score: 42,
      status: 'critical',
      sensors: {
        moisture: 28,
        ph: 6.4,
        temperature: 34,
        humidity: 74,
        nitrogen: 85,
        phosphorus: 48,
        potassium: 66,
      },
      trend: { moisture: 'down', temperature: 'up' },
    },
    {
      id: 'zone-d',
      name: 'Zone D',
      crop: 'Rice',
      variety: 'Sona Masuri',
      acres: 5,
      sowing_date: '2026-03-23',   // 20 days ago
      growth_stage: 'Germination',
      days_to_harvest: 100,
      health_score: 88,
      status: 'optimal',
      sensors: {
        moisture: 82,
        ph: 6.1,
        temperature: 30,
        humidity: 80,
        nitrogen: 95,
        phosphorus: 52,
        potassium: 70,
      },
      trend: { moisture: 'stable', temperature: 'stable' },
    },
  ],
}

// Generate live sensor reading with slight drift
export function generateLiveSensorReading(zone) {
  const s = zone.sensors
  const drift = () => (Math.random() - 0.5) * 2
  return {
    zone_id: zone.id,
    timestamp: new Date().toISOString(),
    moisture: Math.max(0, Math.min(100, s.moisture + drift())).toFixed(1),
    temperature: (s.temperature + drift() * 0.3).toFixed(1),
    humidity: Math.max(0, Math.min(100, s.humidity + drift())).toFixed(1),
    ph: (s.ph + drift() * 0.05).toFixed(2),
  }
}
```

---

## ROUTING — `App.jsx`

```jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

function App() {
  const { farm } = useFarmStore()

  return (
    <BrowserRouter>
      <Routes>
        {/* If no farm set up yet → wizard */}
        <Route path="/setup" element={<WizardShell />} />

        {/* Main dashboard */}
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<FarmMapView />} />
          <Route path="ai-brain" element={<AIBrainPage />} />
          <Route path="disease" element={<ComingSoon name="Disease Detection" />} />
          <Route path="drone" element={<ComingSoon name="Drone Management" />} />
          <Route path="irrigation" element={<ComingSoon name="Irrigation Control" />} />
          <Route path="market" element={<ComingSoon name="Market Intelligence" />} />
          <Route path="storage" element={<ComingSoon name="Storage Manager" />} />
          <Route path="schemes" element={<ComingSoon name="Government Schemes" />} />
          <Route path="traceability" element={<ComingSoon name="Crop Traceability" />} />
          <Route path="remote-sensing" element={<ComingSoon name="Remote Sensing" />} />
        </Route>

        {/* Default redirect */}
        <Route path="*" element={<Navigate to={farm ? '/dashboard' : '/setup'} />} />
      </Routes>
    </BrowserRouter>
  )
}
```

### `FarmMapView.jsx` (the Concept A main view)

```jsx
// Full-height flex row:
// <div className="flex h-full">
//   <FarmMapPanel className="flex-[1.4]" />   ← LEFT
//   <StatsPanelShell className="w-[340px]" />  ← RIGHT
// </div>
```

---

## ANIMATIONS SPEC (Framer Motion)

### Wizard step transitions
```js
// Slide left-to-right between steps
const variants = {
  enter: { x: 40, opacity: 0 },
  center: { x: 0, opacity: 1 },
  exit: { x: -40, opacity: 0 },
}
// <AnimatePresence mode="wait">
//   <motion.div key={step} variants={variants} ...>
```

### Zone click → stats panel
```js
// Stats panel slides in from right
initial={{ x: 60, opacity: 0 }}
animate={{ x: 0, opacity: 1 }}
transition={{ type: 'spring', stiffness: 300, damping: 30 }}
```

### Zone cell selection
```js
// Selected zone scale + border
whileHover={{ scale: 1.02 }}
animate={{ 
  scale: isSelected ? 1.02 : 1,
  borderColor: isSelected ? '#4ADE80' : zoneColor
}}
```

### Alert pulse (critical zones)
```js
// Pulsing dot on critical zones
animate={{ scale: [1, 1.4, 1], opacity: [1, 0.6, 1] }}
transition={{ repeat: Infinity, duration: 1.5 }}
```

### Drone scan sweep
```js
// Green scan line from top to bottom
animate={{ top: ['0%', '100%'] }}
transition={{ duration: 3, ease: 'linear' }}
```

### Sensor ticker (new reading slides in)
```js
// Each new reading slides down from top
initial={{ y: -20, opacity: 0 }}
animate={{ y: 0, opacity: 1 }}
transition={{ type: 'spring', stiffness: 400, damping: 25 }}
```

### Wizard → dashboard transition
```js
// Mini map uses layoutId to expand into full map
// <motion.div layoutId="farm-map"> in MiniMapPreview
// <motion.div layoutId="farm-map"> in FarmMapPanel
// Framer Motion shared layout animation handles the expansion
```

---

## API INTEGRATION

All API calls go to `http://localhost:5000/api`. Use Axios.

If backend is not running: automatically fall back to synthetic data (check with a health ping on mount).

```js
// api.js
import axios from 'axios'
const api = axios.create({ baseURL: 'http://localhost:5000/api' })

export const farmAPI = {
  create: (data) => api.post('/farms', data),
  get: (id) => api.get(`/farms/${id}`),
  getZones: (farmId) => api.get(`/farms/${farmId}/zones`),
}

export const zoneAPI = {
  getStats: (zoneId) => api.get(`/zones/${zoneId}/stats`),
  getSensorHistory: (zoneId) => api.get(`/zones/${zoneId}/sensors/history`),
  irrigateNow: (zoneId) => api.post(`/zones/${zoneId}/irrigate`),
}

export const aiAPI = {
  analyze: (farmId) => api.post(`/ai/analyze/${farmId}`),
  ask: (farmId, question) => api.post(`/ai/ask/${farmId}`, { question }),
}
```

WebSocket for live sensors:
```js
// useWebSocket.js
const ws = new WebSocket(`ws://localhost:5000/ws/farm/${farmId}/sensors`)
ws.onmessage = (e) => {
  const reading = JSON.parse(e.data)
  // Update sensor ticker for the matching zone
}
// If WS fails: simulate readings locally every 5 seconds using generateLiveSensorReading()
```

---

## CROP CONFIG — `cropConfig.js`

```js
export const CROP_CONFIG = {
  Maize: {
    color: 'rgba(239,159,39,0.25)',
    border: '#EF9F27',
    textColor: '#FAC775',
    icon: 'Wheat',   // Lucide icon name
    optimal: { moisture: [50,70], ph: [6.0,7.0], nitrogen: 120, phosphorus: 60, potassium: 80 },
  },
  Wheat: {
    color: 'rgba(29,158,117,0.20)',
    border: '#1D9E75',
    textColor: '#9FE1CB',
    icon: 'Leaf',
    optimal: { moisture: [45,65], ph: [6.0,7.5], nitrogen: 100, phosphorus: 55, potassium: 70 },
  },
  Tomato: {
    color: 'rgba(226,75,74,0.25)',
    border: '#E24B4A',
    textColor: '#F09595',
    icon: 'Circle',
    optimal: { moisture: [55,75], ph: [6.0,6.8], nitrogen: 130, phosphorus: 65, potassium: 90 },
  },
  Rice: {
    color: 'rgba(55,138,221,0.22)',
    border: '#378ADD',
    textColor: '#85B7EB',
    icon: 'Droplets',
    optimal: { moisture: [70,85], ph: [5.5,6.5], nitrogen: 110, phosphorus: 50, potassium: 75 },
  },
  Cotton: {
    color: 'rgba(167,139,250,0.22)',
    border: '#A78BFA',
    textColor: '#C4B5FD',
    icon: 'Cloud',
    optimal: { moisture: [40,60], ph: [6.0,8.0], nitrogen: 90, phosphorus: 45, potassium: 85 },
  },
  Sugarcane: {
    color: 'rgba(52,211,153,0.22)',
    border: '#34D399',
    textColor: '#6EE7B7',
    icon: 'Zap',
    optimal: { moisture: [60,80], ph: [6.0,7.5], nitrogen: 150, phosphorus: 65, potassium: 110 },
  },
  Onion: {
    color: 'rgba(251,146,60,0.22)',
    border: '#FB923C',
    textColor: '#FCD34D',
    icon: 'Layers',
    optimal: { moisture: [40,60], ph: [6.0,7.0], nitrogen: 80, phosphorus: 50, potassium: 60 },
  },
}

export function getHealthColor(score) {
  if (score >= 75) return '#4ADE80'
  if (score >= 50) return '#F59E0B'
  return '#EF4444'
}

export function getValueStatus(value, [min, max]) {
  if (value >= min && value <= max) return 'optimal'
  if (value >= min * 0.85 && value <= max * 1.15) return 'warning'
  return 'critical'
}
```

---

## CHATBOT INTEGRATION (Krishi — Gemini)

In the bottom-right of DashboardLayout, show a floating chat button.
On click: slide up a chat drawer (400px tall, full width of right panel).

```
┌──────────────────────────────────┐
│ Krishi ✦  Farm AI Advisor   [×] │
├──────────────────────────────────┤
│ Hi! I'm Krishi. Ask me          │
│ anything about your farm.        │
│                                  │
│ [Which zone C needs water now?]  │
│ [Farm summary]                   │
│ [This week's care tasks]         │
│ [Any disease risk?]              │
├──────────────────────────────────┤
│ [Ask Krishi...]        [Send →]  │
└──────────────────────────────────┘
```

POST to `/api/chat/stream` for streaming typewriter responses.
Inject selected zone context when a zone is active.

---

## IMPLEMENTATION ORDER FOR CURSOR

Build in exactly this sequence:

```
Phase 1 — Foundation
  1. Vite + Tailwind + design system CSS variables
  2. Zustand store (farmStore.js)
  3. Synthetic demo data (syntheticFarm.js + cropConfig.js)
  4. React Router setup (App.jsx)

Phase 2 — Wizard (Flow 1)
  5. WizardShell layout (two-column with MiniMapPreview)
  6. StepIndicator with Framer Motion progress
  7. Step1_FarmInfo form
  8. Step2_ZoneSplit with preset cards
  9. Step3_CropDetails with sliders + auto-fill
  10. Step4_Borewell with depth diagram
  11. Step5_Review with zone summary cards
  12. MiniMapPreview (live 2×2 grid updating per step)
  13. "Use demo data" shortcut

Phase 3 — Dashboard Shell (Flow 2)
  14. DashboardLayout (sidebar + content area)
  15. Sidebar with all nav links + Demo Mode badge
  16. TopBar with alerts bell

Phase 4 — Farm Map Panel (Left)
  17. FarmMapPanel container
  18. Z