import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'
import {
  Activity, AlertTriangle, IndianRupee, RefreshCw,
  Sprout, TrendingDown, TrendingUp, ScanLine, Plane,
  LineChart, Sparkles, Loader2, Droplets,
  Thermometer, BarChart3, Zap, ShieldCheck, Microscope,
  Navigation, Warehouse, FileText, QrCode, Satellite,
} from 'lucide-react'
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  BarElement, Title, Tooltip, Legend,
} from 'chart.js'
import { Bar } from 'react-chartjs-2'

import WeatherCard from '../components/WeatherCard.jsx'
import Stepper from '../components/ui/Stepper.jsx'
import CardNav from '../components/ui/CardNav.jsx'
import MagicBento from '../components/ui/MagicBento.jsx'
import BorderGlow, { BorderGlowCard } from '../components/ui/BorderGlow.jsx'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

const API_BASE = 'http://localhost:5000/api'

const FALLBACK_WEATHER     = { city:'Punjab Farm', temp:28, humidity:65, description:'Partly cloudy', wind:12 }
const FALLBACK_STATS       = { health:87, alerts:3, crops:5, revenue:45000 }
const FALLBACK_CROP_HEALTH = { labels:['Wheat','Rice','Corn','Soybean','Cotton','Sugarcane'], values:[92,88,76,84,71,90] }
const FALLBACK_MARKET      = [{ crop:'Wheat',price:2450,trend:'up'},{crop:'Rice',price:3120,trend:'up'},{crop:'Corn',price:1980,trend:'down'}]
const MOCK_ALERTS          = [
  { id:1, level:'urgent',  title:'Soil moisture critical — Block C', time:'12 min ago', body:'Moisture dropped below 18% for 2 consecutive readings.' },
  { id:2, level:'warning', title:'Wind advisory for drone ops',       time:'1 hr ago',  body:'Gusts up to 34 km/h may affect scheduled aerial survey.'  },
  { id:3, level:'info',    title:'Irrigation cycle completed',        time:'3 hr ago',  body:'Zone North-2 finished on schedule with 94% efficiency.'   },
  { id:4, level:'warning', title:'Market price dip: Wheat',          time:'5 hr ago',  body:'Local mandi quotes down 2.1% vs 7-day average.'           },
]

const FARM_STEPS = [
  { label:'Soil analysis',  description:'pH, NPK, moisture'  },
  { label:'Crop planning',  description:'Season & varieties' },
  { label:'Drone survey',   description:'Aerial health scan' },
  { label:'Disease check',  description:'AI leaf diagnosis'  },
  { label:'Market intel',   description:'Prices & timing'    },
  { label:'Harvest',        description:'Yield & storage'    },
]

const NAV_ITEMS = [
  { to:'/farm',           label:'Farm Intel',   icon:<Sprout      className="h-5 w-5"/>, color:'emerald' },
  { to:'/disease',        label:'Disease',      icon:<Microscope  className="h-5 w-5"/>, color:'red'     },
  { to:'/drone',          label:'Drone',        icon:<Navigation  className="h-5 w-5"/>, color:'blue'    },
  { to:'/market',         label:'Market',       icon:<TrendingUp  className="h-5 w-5"/>, color:'amber'   },
  { to:'/irrigation',     label:'Irrigation',   icon:<Droplets    className="h-5 w-5"/>, color:'teal'    },
  { to:'/storage',        label:'Storage',      icon:<Warehouse   className="h-5 w-5"/>, color:'violet'  },
  { to:'/schemes',        label:'Schemes',      icon:<FileText    className="h-5 w-5"/>, color:'emerald' },
  { to:'/traceability',   label:'Traceability', icon:<QrCode      className="h-5 w-5"/>, color:'blue'    },
  { to:'/remote-sensing', label:'Remote Sense', icon:<Satellite   className="h-5 w-5"/>, color:'violet'  },
]

function normalizeWeather(p) {
  if (!p||typeof p!=='object') return {...FALLBACK_WEATHER}
  const d=p.data??p.weather??p
  return { city:d.city??d.name??FALLBACK_WEATHER.city, temp:Number(d.temp??d.temperature??d.main?.temp??FALLBACK_WEATHER.temp), humidity:Number(d.humidity??d.main?.humidity??FALLBACK_WEATHER.humidity), description:String(d.description??d.weather?.[0]?.description??FALLBACK_WEATHER.description), wind:Number(d.wind??d.wind_speed??FALLBACK_WEATHER.wind) }
}
function normalizeStats(p) {
  if (!p||typeof p!=='object') return {...FALLBACK_STATS}
  const d=p.data??p.stats??p.dashboard??p
  return { health:Number(d.health??d.farmHealthScore??FALLBACK_STATS.health), alerts:Number(d.alerts??d.activeAlerts??FALLBACK_STATS.alerts), crops:Number(d.crops??d.cropsGrowing??FALLBACK_STATS.crops), revenue:Number(d.revenue??d.todayRevenue??FALLBACK_STATS.revenue) }
}
function normalizePrices(p) {
  const raw=Array.isArray(p)?p:p?.data??p?.prices??p?.crops??[]
  if (!Array.isArray(raw)||raw.length===0) return [...FALLBACK_MARKET]
  return raw.map((r,i)=>({ crop:String(r.crop??r.name??`Crop${i+1}`), price:Number(r.price??r.rate??0), trend:(()=>{const t=String(r.trend??'').toLowerCase();return t.includes('down')?'down':t.includes('up')?'up':'flat'})() })).filter(r=>r.price>0).sort((a,b)=>b.price-a.price).slice(0,4)
}
function normalizeCropHealth(p) {
  const d=p?.cropHealth??p?.healthByCrop??p?.crops??p
  if (Array.isArray(d)&&d.length>0) return { labels:d.map((x,i)=>x.crop??x.name??FALLBACK_CROP_HEALTH.labels[i%6]), values:d.map((x,i)=>Number(x.health??x.score??FALLBACK_CROP_HEALTH.values[i%6])) }
  return {...FALLBACK_CROP_HEALTH}
}
function formatInr(n) {
  try { return new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(n) }
  catch { return `₹${Math.round(n).toLocaleString('en-IN')}` }
}
const BADGE={urgent:'bg-red-50 text-red-700 border border-red-100',warning:'bg-amber-50 text-amber-800 border border-amber-100',info:'bg-emerald-50 text-emerald-800 border border-emerald-100'}

export default function Dashboard() {
  const navigate=useNavigate()
  const [stats,setStats]=useState(FALLBACK_STATS)
  const [statsLoading,setStatsLoading]=useState(true)
  const [weather,setWeather]=useState(FALLBACK_WEATHER)
  const [weatherLoading,setWeatherLoading]=useState(true)
  const [marketRows,setMarketRows]=useState(FALLBACK_MARKET)
  const [marketLoading,setMarketLoading]=useState(true)
  const [cropHealth,setCropHealth]=useState(FALLBACK_CROP_HEALTH)
  const [chartLoading,setChartLoading]=useState(true)
  const [farmStep,setFarmStep]=useState(2)

  const fetchStats=useCallback(async()=>{ setStatsLoading(true); try{const r=await axios.get(`${API_BASE}/dashboard`,{timeout:8000});setStats(normalizeStats(r.data))}catch{setStats({...FALLBACK_STATS})}finally{setStatsLoading(false)} },[])
  const fetchWeather=useCallback(async()=>{ setWeatherLoading(true); try{const r=await axios.get(`${API_BASE}/farm/weather`,{params:{lat:20.59,lon:78.96},timeout:8000});setWeather(normalizeWeather(r.data))}catch{setWeather({...FALLBACK_WEATHER})}finally{setWeatherLoading(false)} },[])
  const fetchMarket=useCallback(async()=>{ setMarketLoading(true); try{const r=await axios.get(`${API_BASE}/market/prices`,{timeout:8000});setMarketRows(normalizePrices(r.data))}catch{setMarketRows([...FALLBACK_MARKET])}finally{setMarketLoading(false)} },[])
  const fetchCropHealth=useCallback(async()=>{ setChartLoading(true); try{const r=await axios.get(`${API_BASE}/dashboard`,{timeout:8000});setCropHealth(normalizeCropHealth(r.data))}catch{setCropHealth({...FALLBACK_CROP_HEALTH})}finally{setChartLoading(false)} },[])

  useEffect(()=>{ void fetchStats();void fetchWeather();void fetchMarket();void fetchCropHealth() },[fetchStats,fetchWeather,fetchMarket,fetchCropHealth])

const chartData = useMemo(() => ({
  labels: cropHealth.labels,
  datasets: [
    {
      label: 'Health index',
      data: cropHealth.values,
      backgroundColor: 'rgba(16,185,129,0.5)',
      borderColor: 'rgba(5,150,105,0.9)',
      borderWidth: 1,
      borderRadius: 8,
      maxBarThickness: 20
    }
  ]
}), [cropHealth.labels, cropHealth.values])

  const chartOptions=useMemo(()=>({ indexAxis:'y',responsive:true,maintainAspectRatio:false, plugins:{legend:{display:false},tooltip:{callbacks:{label:(ctx)=>`${ctx.parsed.x}% vitality`}}}, scales:{x:{min:0,max:100,grid:{color:'rgba(15,23,42,0.05)'},ticks:{color:'#475569',font:{size:11}}},y:{grid:{display:false},ticks:{color:'#1e293b',font:{size:12,weight:'600'}}}} }),[])

  const bentoItems=useMemo(()=>[
    // Row 1: 4 stat cards
    {id:'health',colSpan:1,children:(
      <div className="flex h-full flex-col justify-between p-5">
        <div className="flex items-start justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Farm Health</p>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600"><Activity className="h-4 w-4"/></div>
        </div>
        {statsLoading?<div className="mt-3 h-8 w-20 animate-pulse rounded-lg bg-gray-100"/>:<p className="mt-2 text-3xl font-bold tracking-tight text-gray-900">{stats.health}%</p>}
        <p className="mt-1 text-xs text-gray-500">Soil + crop composite</p>
        <div className="mt-3 h-2 w-full rounded-full bg-gray-100"><div className="h-2 rounded-full bg-emerald-500 transition-all duration-700" style={{width:`${stats.health}%`}}/></div>
      </div>
    )},
    {id:'alerts',colSpan:1,spotlightColor:'rgba(245,158,11,0.12)',children:(
      <div className="flex h-full flex-col justify-between p-5">
        <div className="flex items-start justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Active Alerts</p>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600"><AlertTriangle className="h-4 w-4"/></div>
        </div>
        {statsLoading?<div className="mt-3 h-8 w-12 animate-pulse rounded-lg bg-gray-100"/>:<p className="mt-2 text-3xl font-bold tracking-tight text-gray-900">{stats.alerts}</p>}
        <p className="mt-1 text-xs text-gray-500">Needs review or action</p>
        <div className="mt-3 flex gap-1">{Array.from({length:5}).map((_,i)=><div key={i} className={`h-2 flex-1 rounded-full ${i<stats.alerts?'bg-amber-400':'bg-gray-100'}`}/>)}</div>
      </div>
    )},
    {id:'crops',colSpan:1,children:(
      <div className="flex h-full flex-col justify-between p-5">
        <div className="flex items-start justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Crops Growing</p>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600"><Sprout className="h-4 w-4"/></div>
        </div>
        {statsLoading?<div className="mt-3 h-8 w-12 animate-pulse rounded-lg bg-gray-100"/>:<p className="mt-2 text-3xl font-bold tracking-tight text-gray-900">{stats.crops}</p>}
        <p className="mt-1 text-xs text-gray-500">Across monitored parcels</p>
        <div className="mt-3 flex flex-wrap gap-1.5">{['Wheat','Rice','Corn','Cotton','Soya'].slice(0,stats.crops).map(c=><span key={c} className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">{c}</span>)}</div>
      </div>
    )},
    {id:'revenue',colSpan:1,spotlightColor:'rgba(99,102,241,0.12)',children:(
      <div className="flex h-full flex-col justify-between p-5">
        <div className="flex items-start justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Revenue Est.</p>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600"><IndianRupee className="h-4 w-4"/></div>
        </div>
        {statsLoading?<div className="mt-3 h-8 w-28 animate-pulse rounded-lg bg-gray-100"/>:<p className="mt-2 text-2xl font-bold tracking-tight text-gray-900">{formatInr(stats.revenue)}</p>}
        <p className="mt-1 text-xs text-gray-500">Today's mandi estimate</p>
        <div className="mt-3 flex items-center gap-1 text-xs font-semibold text-emerald-600"><TrendingUp className="h-3.5 w-3.5"/> +4.2% vs yesterday</div>
      </div>
    )},
    // Row 2: chart (col 2) + weather (col 1, row 2) — weather spans rows so listed next
    {id:'weather',colSpan:1,rowSpan:2,children:(
      <div className="p-1 h-full">
        <WeatherCard weather={weather} loading={weatherLoading} onRefresh={()=>void fetchWeather()}/>
      </div>
    )},
    {id:'crop-chart',colSpan:2,rowSpan:2,children:(
      <div className="flex h-full flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Crop Health Overview</p>
            <p className="mt-0.5 text-base font-semibold text-gray-900">Vitality by crop line</p>
          </div>
          <button type="button" onClick={()=>void fetchCropHealth()} disabled={chartLoading} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-sm transition hover:border-emerald-300 hover:text-emerald-700 disabled:opacity-60">
            {chartLoading?<Loader2 className="h-3.5 w-3.5 animate-spin"/>:<RefreshCw className="h-3.5 w-3.5"/>}Refresh
          </button>
        </div>
        <div className="relative mt-4 flex-1 min-h-[200px]">
          {chartLoading&&<div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-white/80"><Loader2 className="h-7 w-7 animate-spin text-emerald-600"/></div>}
          <Bar data={chartData} options={chartOptions}/>
        </div>
      </div>
    )},
    // Row 3: market (col 2) + quick actions (col 1) + system (col 1)
    {id:'market',colSpan:2,children:(
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Market Snapshot</p>
            <p className="mt-0.5 text-base font-semibold text-gray-900">Top crops by spot quote</p>
          </div>
          <button type="button" onClick={()=>void fetchMarket()} disabled={marketLoading} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-sm transition hover:border-emerald-300 hover:text-emerald-700 disabled:opacity-60">
            {marketLoading?<Loader2 className="h-3.5 w-3.5 animate-spin"/>:<RefreshCw className="h-3.5 w-3.5"/>}Refresh
          </button>
        </div>
        <div className="mt-3 overflow-hidden rounded-xl border border-gray-100">
          <table className="min-w-full divide-y divide-gray-100 text-sm">
            <thead className="bg-gray-50"><tr>{['Crop','Spot (₹/qtl)','Trend'].map(h=><th key={h} className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide text-gray-500 last:text-right">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {marketLoading?<tr><td colSpan={3} className="py-6 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-emerald-600"/></td></tr>
                :marketRows.map(r=><tr key={r.crop} className="hover:bg-gray-50/70"><td className="px-4 py-2.5 font-semibold text-gray-900">{r.crop}</td><td className="px-4 py-2.5 text-gray-800">₹{Math.round(r.price).toLocaleString('en-IN')}</td><td className="px-4 py-2.5 text-right">{r.trend==='up'?<span className="inline-flex items-center gap-1 font-semibold text-emerald-600"><TrendingUp className="h-3.5 w-3.5"/>Up</span>:r.trend==='down'?<span className="inline-flex items-center gap-1 font-semibold text-red-500"><TrendingDown className="h-3.5 w-3.5"/>Down</span>:<span className="font-semibold text-gray-500">Flat</span>}</td></tr>)
              }
            </tbody>
          </table>
        </div>
      </div>
    )},
    {id:'quick-actions',colSpan:1,children:(
      <div className="p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Quick Actions</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {[
            {label:'Disease Scan',icon:ScanLine, to:'/disease',color:'bg-red-50 text-red-600'},
            {label:'Start Drone', icon:Plane,    to:'/drone',  color:'bg-blue-50 text-blue-600'},
            {label:'Market',      icon:LineChart, to:'/market', color:'bg-amber-50 text-amber-600'},
            {label:'AI Advice',   icon:Sparkles, to:null,      color:'bg-violet-50 text-violet-600'},
          ].map(a=>(
            <button key={a.label} type="button" onClick={()=>a.to?navigate(a.to):toast.success('Opening AI advisor…')} className="flex flex-col items-center gap-2 rounded-xl border border-gray-100 bg-gray-50/60 p-3 text-center transition hover:border-emerald-200 hover:bg-white hover:shadow-sm">
              <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${a.color}`}><a.icon className="h-4 w-4"/></span>
              <span className="text-[11px] font-semibold text-gray-700">{a.label}</span>
            </button>
          ))}
        </div>
      </div>
    )},
    {id:'system',colSpan:1,spotlightColor:'rgba(99,102,241,0.1)',children:(
      <div className="p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">System Status</p>
        <div className="mt-3 space-y-2.5">
          {[
            {label:'AI Brain',       ok:true, icon:Sparkles},
            {label:'Drone system',   ok:true, icon:Plane},
            {label:'Weather API',    ok:true, icon:Thermometer},
            {label:'Disease model',  ok:true, icon:ShieldCheck},
            {label:'Market feed',    ok:false,icon:BarChart3},
          ].map(s=>(
            <div key={s.label} className="flex items-center gap-3">
              <s.icon className={`h-4 w-4 shrink-0 ${s.ok?'text-emerald-500':'text-amber-400'}`}/>
              <span className="flex-1 text-xs font-medium text-gray-700">{s.label}</span>
              <span className={`flex h-2 w-2 rounded-full ${s.ok?'bg-emerald-500':'bg-amber-400'}`}/>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2">
          <Zap className="h-4 w-4 text-emerald-600"/>
          <span className="text-xs font-semibold text-emerald-700">4/5 services online</span>
        </div>
      </div>
    )},
    // Row 4: full alerts feed
    {id:'alerts-feed',colSpan:4,spotlightColor:'rgba(239,68,68,0.06)',children:(
      <div className="p-5">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Recent Alerts</p>
            <p className="mt-0.5 text-base font-semibold text-gray-900">Signal feed</p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {MOCK_ALERTS.map(a=>(
            <div key={a.id} className="rounded-xl border border-gray-100 bg-gray-50/40 px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${BADGE[a.level]}`}>{a.level}</span>
                <span className="text-[11px] text-gray-400">{a.time}</span>
              </div>
              <p className="mt-1.5 text-sm font-semibold text-gray-900">{a.title}</p>
              <p className="mt-0.5 text-xs text-gray-500">{a.body}</p>
            </div>
          ))}
        </div>
      </div>
    )},
  ],[stats, statsLoading, weather, weatherLoading, marketRows, marketLoading, chartLoading, chartData, chartOptions, fetchCropHealth, fetchWeather, fetchMarket, navigate])

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8">

      {/* ── 1. CardNav ────────────────────────────────────── */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Modules</p>
            <p className="text-sm font-semibold text-gray-700">Jump to any section</p>
          </div>
          <button type="button" onClick={()=>{void fetchStats();toast.success('Stats refreshed')}} disabled={statsLoading} className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 shadow-sm transition hover:border-emerald-300 hover:text-emerald-700 disabled:opacity-60">
            {statsLoading?<Loader2 className="h-4 w-4 animate-spin"/>:<RefreshCw className="h-4 w-4"/>}Refresh all
          </button>
        </div>
        <CardNav items={NAV_ITEMS} columns={9}/>
      </section>

      {/* ── 2. Stepper (BorderGlow card) ─────────────────── */}
      <BorderGlowCard glowColor="#10b981" padding="p-6">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Farm Workflow</p>
            <p className="mt-0.5 text-base font-semibold text-gray-900">Current season progress</p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={()=>setFarmStep(s=>Math.max(0,s-1))} disabled={farmStep===0} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:border-emerald-300 hover:text-emerald-700 disabled:opacity-40">← Prev</button>
            <button type="button" onClick={()=>setFarmStep(s=>Math.min(FARM_STEPS.length-1,s+1))} disabled={farmStep===FARM_STEPS.length-1} className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-40">Next →</button>
          </div>
        </div>
        <Stepper steps={FARM_STEPS} currentStep={farmStep} onChange={setFarmStep} orientation="horizontal"/>
        <div className="mt-5 rounded-xl bg-emerald-50 px-4 py-3 border border-emerald-100">
          <p className="text-sm font-semibold text-emerald-800">Current: {FARM_STEPS[farmStep].label}</p>
          <p className="mt-0.5 text-xs text-emerald-600">{FARM_STEPS[farmStep].description} — Step {farmStep+1} of {FARM_STEPS.length}</p>
        </div>
      </BorderGlowCard>

      {/* ── 3. Magic Bento ───────────────────────────────── */}
      <section>
        <div className="mb-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Overview</p>
          <p className="text-sm font-semibold text-gray-700">Live farm intelligence</p>
        </div>
        <MagicBento items={bentoItems} columns={4} gap={16} spotlightColor="rgba(16,185,129,0.12)" tiltDeg={4}/>
      </section>

    </div>
  )
}
