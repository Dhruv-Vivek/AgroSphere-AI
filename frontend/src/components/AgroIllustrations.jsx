const CROP_THEMES = {
  Tomato: {
    sky: '#fee2e2',
    field: '#fecaca',
    accent: '#dc2626',
    accentSoft: '#f87171',
    stem: '#15803d',
    label: 'Tomato',
  },
  Onion: {
    sky: '#ffedd5',
    field: '#fdba74',
    accent: '#c2410c',
    accentSoft: '#fb923c',
    stem: '#16a34a',
    label: 'Onion',
  },
  Potato: {
    sky: '#fef3c7',
    field: '#fde68a',
    accent: '#92400e',
    accentSoft: '#d97706',
    stem: '#65a30d',
    label: 'Potato',
  },
  Wheat: {
    sky: '#fef3c7',
    field: '#fde68a',
    accent: '#ca8a04',
    accentSoft: '#f59e0b',
    stem: '#65a30d',
    label: 'Wheat',
  },
  Rice: {
    sky: '#dbeafe',
    field: '#bfdbfe',
    accent: '#2563eb',
    accentSoft: '#60a5fa',
    stem: '#15803d',
    label: 'Rice',
  },
  Grapes: {
    sky: '#ede9fe',
    field: '#ddd6fe',
    accent: '#7c3aed',
    accentSoft: '#a78bfa',
    stem: '#15803d',
    label: 'Grapes',
  },
  Banana: {
    sky: '#fef9c3',
    field: '#fde047',
    accent: '#facc15',
    accentSoft: '#fde68a',
    stem: '#65a30d',
    label: 'Banana',
  },
  Apple: {
    sky: '#fee2e2',
    field: '#fecaca',
    accent: '#b91c1c',
    accentSoft: '#f87171',
    stem: '#166534',
    label: 'Apple',
  },
  Other: {
    sky: '#dcfce7',
    field: '#bbf7d0',
    accent: '#16a34a',
    accentSoft: '#4ade80',
    stem: '#166534',
    label: 'Produce',
  },
}

const SCHEME_THEMES = {
  Subsidies: {
    sky: '#dcfce7',
    surface: '#bbf7d0',
    accent: '#16a34a',
    accentSoft: '#86efac',
    label: 'Subsidy support',
  },
  Insurance: {
    sky: '#dbeafe',
    surface: '#bfdbfe',
    accent: '#2563eb',
    accentSoft: '#93c5fd',
    label: 'Risk cover',
  },
  Loans: {
    sky: '#ede9fe',
    surface: '#ddd6fe',
    accent: '#7c3aed',
    accentSoft: '#c4b5fd',
    label: 'Farm finance',
  },
  Training: {
    sky: '#fef3c7',
    surface: '#fde68a',
    accent: '#d97706',
    accentSoft: '#fdba74',
    label: 'Skill building',
  },
  default: {
    sky: '#e0f2fe',
    surface: '#bae6fd',
    accent: '#0284c7',
    accentSoft: '#7dd3fc',
    label: 'Agri program',
  },
}

function cropTheme(crop) {
  return CROP_THEMES[crop] || CROP_THEMES.Other
}

function schemeTheme(category) {
  return SCHEME_THEMES[category] || SCHEME_THEMES.default
}

function StorageScene({ variant = 'cold', title = 'Storage hub' }) {
  const isCold = variant === 'cold'
  const isMarket = variant === 'market'
  const sky = isMarket ? '#ffedd5' : isCold ? '#dbeafe' : '#dcfce7'
  const ground = isMarket ? '#fed7aa' : isCold ? '#bfdbfe' : '#bbf7d0'
  const barn = isMarket ? '#9a3412' : isCold ? '#1d4ed8' : '#166534'
  const roof = isMarket ? '#ea580c' : isCold ? '#2563eb' : '#15803d'
  const crate = isMarket ? '#fb923c' : isCold ? '#60a5fa' : '#4ade80'
  const detail = isMarket ? '#7c2d12' : isCold ? '#1e3a8a' : '#14532d'

  return (
    <svg viewBox="0 0 360 220" className="h-full w-full" role="img" aria-label={title}>
      <rect width="360" height="220" fill={sky} />
      <circle cx="62" cy="52" r="18" fill="#fff7ed" opacity="0.8" />
      <path d="M0 170C46 150 88 146 138 154C177 160 216 185 264 180C302 176 327 156 360 150V220H0Z" fill={ground} />
      <rect x="104" y="92" width="150" height="78" rx="12" fill={barn} />
      <path d="M90 106L180 46L270 106" fill={roof} />
      <path d="M90 106L180 46L270 106" stroke={detail} strokeWidth="6" strokeLinejoin="round" />
      <rect x="164" y="112" width="30" height="58" rx="8" fill="#f8fafc" opacity="0.95" />
      <rect x="122" y="112" width="28" height="22" rx="6" fill="#f8fafc" opacity="0.9" />
      <rect x="208" y="112" width="28" height="22" rx="6" fill="#f8fafc" opacity="0.9" />
      <rect x="46" y="136" width="44" height="28" rx="8" fill={crate} />
      <rect x="262" y="142" width="52" height="32" rx="8" fill={crate} />
      <rect x="278" y="126" width="34" height="18" rx="6" fill={detail} opacity="0.9" />
      <path d="M52 150H84M52 158H84M272 156H304M272 164H304" stroke="#ffffff" strokeLinecap="round" strokeOpacity="0.65" strokeWidth="4" />
      <path d="M176 120V166" stroke={detail} strokeWidth="5" strokeLinecap="round" opacity="0.18" />
      {isCold ? (
        <>
          <path d="M58 74C71 61 90 61 103 74" stroke="#60a5fa" strokeWidth="6" strokeLinecap="round" fill="none" />
          <path d="M58 92C71 79 90 79 103 92" stroke="#60a5fa" strokeWidth="6" strokeLinecap="round" fill="none" />
        </>
      ) : null}
      {isMarket ? (
        <>
          <circle cx="302" cy="64" r="14" fill="#fb923c" />
          <path d="M302 50V78M288 64H316" stroke="#fff7ed" strokeWidth="5" strokeLinecap="round" />
        </>
      ) : null}
    </svg>
  )
}

export function CropThumbnail({ crop, className = '', title }) {
  const theme = cropTheme(crop)

  return (
    <div className={`relative overflow-hidden rounded-2xl ${className}`}>
      <svg viewBox="0 0 160 160" className="h-full w-full" role="img" aria-label={title || theme.label}>
        <rect width="160" height="160" fill={theme.sky} />
        <path d="M0 114C18 106 36 104 56 110C72 114 94 126 116 122C132 119 145 109 160 102V160H0Z" fill={theme.field} />
        <circle cx="120" cy="34" r="14" fill="#ffffff" opacity="0.8" />
        {crop === 'Banana' ? (
          <path d="M48 88C78 60 106 60 118 90C100 106 73 109 48 88Z" fill={theme.accent} />
        ) : crop === 'Grapes' ? (
          <>
            <circle cx="72" cy="88" r="14" fill={theme.accent} />
            <circle cx="92" cy="84" r="13" fill={theme.accentSoft} />
            <circle cx="82" cy="104" r="13" fill={theme.accent} />
            <circle cx="102" cy="104" r="12" fill={theme.accentSoft} />
            <circle cx="92" cy="124" r="12" fill={theme.accent} />
          </>
        ) : crop === 'Wheat' ? (
          <>
            <path d="M80 46V122" stroke={theme.stem} strokeWidth="6" strokeLinecap="round" />
            <path d="M80 62L64 72M80 76L60 86M80 90L64 100M80 62L96 72M80 76L100 86M80 90L96 100" stroke={theme.accent} strokeWidth="6" strokeLinecap="round" />
          </>
        ) : crop === 'Rice' ? (
          <>
            <path d="M78 44C68 70 65 93 72 124" stroke={theme.stem} strokeWidth="6" strokeLinecap="round" fill="none" />
            <path d="M92 48C84 74 82 95 88 124" stroke={theme.stem} strokeWidth="6" strokeLinecap="round" fill="none" />
            <circle cx="66" cy="68" r="5" fill={theme.accent} />
            <circle cx="60" cy="80" r="5" fill={theme.accentSoft} />
            <circle cx="94" cy="72" r="5" fill={theme.accent} />
            <circle cx="100" cy="84" r="5" fill={theme.accentSoft} />
          </>
        ) : crop === 'Onion' ? (
          <>
            <path d="M80 50C100 58 112 82 112 104C112 124 98 138 80 138C62 138 48 124 48 104C48 82 60 58 80 50Z" fill={theme.accent} />
            <path d="M80 44C76 54 76 62 80 72C84 62 84 54 80 44Z" fill={theme.stem} />
          </>
        ) : crop === 'Potato' ? (
          <ellipse cx="80" cy="102" rx="34" ry="26" fill={theme.accent} />
        ) : crop === 'Apple' ? (
          <>
            <circle cx="70" cy="98" r="24" fill={theme.accent} />
            <circle cx="94" cy="98" r="24" fill={theme.accentSoft} />
            <path d="M82 60C82 52 86 46 94 42" stroke={theme.stem} strokeWidth="5" strokeLinecap="round" />
            <path d="M96 48C104 48 110 52 114 60C106 61 100 59 96 48Z" fill={theme.stem} />
          </>
        ) : crop === 'Tomato' ? (
          <>
            <circle cx="80" cy="100" r="34" fill={theme.accent} />
            <path d="M80 64L88 76L102 74L94 86L102 98L88 94L80 106L72 94L58 98L66 86L58 74L72 76Z" fill={theme.stem} />
          </>
        ) : (
          <>
            <circle cx="80" cy="100" r="30" fill={theme.accent} />
            <path d="M80 50C88 58 91 66 88 76" stroke={theme.stem} strokeWidth="5" strokeLinecap="round" />
            <path d="M88 58C98 58 106 62 110 70C100 71 93 67 88 58Z" fill={theme.stem} />
          </>
        )}
        <rect x="12" y="12" width="70" height="22" rx="11" fill="#ffffff" opacity="0.75" />
        <text x="24" y="27" fill="#334155" fontFamily="Arial, sans-serif" fontSize="11" fontWeight="700">
          {theme.label}
        </text>
      </svg>
    </div>
  )
}

export function SchemeThumbnail({ category, className = '', title }) {
  const theme = schemeTheme(category)

  return (
    <div className={`relative overflow-hidden rounded-2xl ${className}`}>
      <svg viewBox="0 0 320 180" className="h-full w-full" role="img" aria-label={title || theme.label}>
        <rect width="320" height="180" fill={theme.sky} />
        <path d="M0 134C45 118 80 116 120 128C157 140 196 158 242 150C273 144 294 133 320 120V180H0Z" fill={theme.surface} />
        <rect x="82" y="58" width="156" height="96" rx="18" fill="#ffffff" opacity="0.95" />
        <rect x="102" y="80" width="84" height="10" rx="5" fill={theme.accentSoft} />
        <rect x="102" y="98" width="116" height="10" rx="5" fill={theme.accentSoft} opacity="0.8" />
        <rect x="102" y="116" width="92" height="10" rx="5" fill={theme.accentSoft} opacity="0.65" />
        <rect x="210" y="80" width="18" height="46" rx="9" fill={theme.accent} />
        <path d="M258 60L278 78L244 102L224 84Z" fill={theme.accent} opacity="0.95" />
        <circle cx="256" cy="132" r="18" fill={theme.accent} />
        <circle cx="282" cy="132" r="18" fill={theme.accentSoft} />
        <path d="M60 130C80 90 112 84 144 104" stroke={theme.accent} strokeWidth="6" strokeLinecap="round" fill="none" opacity="0.55" />
        <text x="102" y="54" fill="#334155" fontFamily="Arial, sans-serif" fontSize="13" fontWeight="700">
          {theme.label}
        </text>
      </svg>
    </div>
  )
}

export function StorageHeroArt({ className = '', title = 'Storage operations' }) {
  return (
    <div className={`overflow-hidden rounded-[28px] ${className}`}>
      <StorageScene variant="cold" title={title} />
    </div>
  )
}

export function StorageCardArt({ variant, className = '', title }) {
  return (
    <div className={`overflow-hidden rounded-2xl ${className}`}>
      <StorageScene variant={variant} title={title} />
    </div>
  )
}
