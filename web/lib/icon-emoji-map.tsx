export type IconMapEntry =
| { type: "emoji"; glyph: string }
| { type: "text"; char: string }
| { type: "svg"; svg: React.ReactNode }

/** lucide / radix 图标Name → 3D emoji or 文本符号 */
// 方to 性 UI 图标统aused SVG,not used文本 emoji
const ChevronRightSvg = (<svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
<path d="m9 18 6-6-6-6" />
</svg>)
const ChevronLeftSvg = (<svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
<path d="m15 18-6-6 6-6" />
</svg>)
const ChevronUpSvg = (<svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
<path d="m18 15-6-6-6 6" />
</svg>)
const ChevronDownSvg = (<svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
<path d="m6 9 6 6 6-6" />
</svg>)
const ChevronsUpDownSvg = (<svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
<path d="m7 15 5 5 5-5" />
<path d="m7 9 5-5 5 5" />
</svg>)
const ArrowRightSvg = (<svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
<path d="M5 12h14" />
<path d="m12 5 7 7-7 7" />
</svg>)
const ArrowLeftSvg = (<svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
<path d="M19 12H5" />
<path d="m12 19-7-7 7-7" />
</svg>)
const PlaySvg = (<svg viewBox="0 0 24 24" width="100%" height="100%" fill="currentColor">
<polygon points="6 3 20 12 6 21 6 3" />
</svg>)
const StopSvg = (<svg viewBox="0 0 24 24" width="100%" height="100%" fill="currentColor">
<rect x="5" y="5" width="14" height="14" rx="2" />
</svg>)
const DownloadSvg = (<svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
<polyline points="7 10 12 15 17 10" />
<line x1="12" y1="15" x2="12" y2="3" />
</svg>)
const GitCompareSvg = (<svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
<line x1="12" y1="3" x2="12" y2="21" />
<path d="m8 7-4 4 4 4" />
<path d="m16 17 4-4-4-4" />
</svg>)

export const ICON_EMOJI_MAP: Record<string, IconMapEntry> = {
Activity: { type: "emoji", glyph: "📈" },
AlertCircle: { type: "emoji", glyph: "⚠️" },
AlertTriangle: { type: "emoji", glyph: "⚠️" },
ArrowLeft: { type: "svg", svg: ArrowLeftSvg },
ArrowRight: { type: "svg", svg: ArrowRightSvg },
Baby: { type: "emoji", glyph: "🍼" },
Ban: { type: "emoji", glyph: "🚫" },
BarChart3: { type: "emoji", glyph: "📊" },
Bell: { type: "emoji", glyph: "🔔" },
BookOpen: { type: "emoji", glyph: "📖" },
Cake: { type: "emoji", glyph: "🎂" },
Calendar: { type: "emoji", glyph: "📅" },
Camera: { type: "emoji", glyph: "📷" },
Cat: { type: "emoji", glyph: "🐱" },
Check: { type: "emoji", glyph: "✅" },
CheckCircle: { type: "emoji", glyph: "✅" },
CheckCircle2: { type: "emoji", glyph: "✅" },
CheckIcon: { type: "emoji", glyph: "✅" },
CheckSquare: { type: "emoji", glyph: "✅" },
ChevronDown: { type: "svg", svg: ChevronDownSvg },
ChevronDownIcon: { type: "svg", svg: ChevronDownSvg },
ChevronLeft: { type: "svg", svg: ChevronLeftSvg },
ChevronRight: { type: "svg", svg: ChevronRightSvg },
ChevronRightIcon: { type: "svg", svg: ChevronRightSvg },
ChevronUp: { type: "svg", svg: ChevronUpSvg },
ChevronUpIcon: { type: "svg", svg: ChevronUpSvg },
ChevronsUpDown: { type: "svg", svg: ChevronsUpDownSvg },
Circle: { type: "emoji", glyph: "⭕" },
CircleCheckIcon: { type: "emoji", glyph: "✅" },
Clock: {
type: "svg",
svg: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
<circle cx="12" cy="12" r="10" />
<polyline points="12 6 12 12 16 14" />
</svg>),
},
Database: { type: "emoji", glyph: "🗄️" },
Dog: { type: "emoji", glyph: "🐶" },
Download: { type: "svg", svg: DownloadSvg },
Droplets: { type: "emoji", glyph: "💧" },
Edit3: { type: "emoji", glyph: "✏️" },
ExternalLink: { type: "emoji", glyph: "🔗" },
Eye: { type: "emoji", glyph: "👁️" },
FileCheck: { type: "emoji", glyph: "📋" },
FileImage: { type: "emoji", glyph: "🖼️" },
FileText: { type: "emoji", glyph: "📄" },
Fingerprint: { type: "emoji", glyph: "🔍" },
Flag: { type: "emoji", glyph: "🚩" },
FlaskConical: { type: "emoji", glyph: "🧪" },
Gauge: { type: "emoji", glyph: "📊" },
GitCompareArrows: { type: "svg", svg: GitCompareSvg },
Heart: { type: "emoji", glyph: "❤️" },
History: { type: "emoji", glyph: "🕐" },
Home: { type: "emoji", glyph: "🏠" },
House: { type: "emoji", glyph: "🏠" },
Image: { type: "emoji", glyph: "🖼️" },
ImageIcon: { type: "emoji", glyph: "🖼️" },
ImagePlus: { type: "emoji", glyph: "🖼️" },
Info: { type: "emoji", glyph: "ℹ️" },
InfoIcon: { type: "emoji", glyph: "ℹ️" },
Layers: { type: "emoji", glyph: "📚" },
LayoutDashboard: { type: "emoji", glyph: "🗂️" },
LayoutGrid: { type: "text", char: "⊞" },
Loader2: { type: "emoji", glyph: "⏳" },
Loader2Icon: { type: "emoji", glyph: "⏳" },
Lock: { type: "emoji", glyph: "🔒" },
LogOut: { type: "emoji", glyph: "🚪" },
Mail: { type: "emoji", glyph: "✉️" },
MagnifyingGlassIcon: { type: "emoji", glyph: "🔍" },
MapPin: { type: "emoji", glyph: "📍" },
Menu: { type: "text", char: "☰" },
MessageSquare: { type: "emoji", glyph: "💬" },
MessageSquareWarning: { type: "emoji", glyph: "⚠️" },
Minus: { type: "emoji", glyph: "➖" },
MoreHorizontal: { type: "text", char: "⋯" },
MousePointerClick: { type: "emoji", glyph: "🖱️" },
OctagonXIcon: { type: "emoji", glyph: "🛑" },
Package: { type: "emoji", glyph: "📦" },
Paperclip: { type: "emoji", glyph: "📎" },
PawPrint: { type: "emoji", glyph: "🐾" },
Pencil: { type: "emoji", glyph: "✏️" },
Pill: { type: "emoji", glyph: "💊" },
Play: { type: "svg", svg: PlaySvg },
Plus: {
type: "svg",
svg: (<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18">
<g fill="#212121">
<line x1="9" y1="3.25" x2="9" y2="14.75" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
<line x1="3.25" y1="9" x2="14.75" y2="9" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
</g>
</svg>),
},
PlusCircle: {
type: "svg",
svg: (<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18">
<g fill="#212121">
<line x1="9" y1="3.25" x2="9" y2="14.75" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
<line x1="3.25" y1="9" x2="14.75" y2="9" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
</g>
</svg>),
},
RefreshCw: { type: "emoji", glyph: "🔄" },
Search: { type: "emoji", glyph: "🔍" },
Send: {
type: "svg",
svg: (<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 18 18">
<path d="M3.474,2.784L14.897,6.958c.481,.176,.467,.861-.021,1.018l-5.228,1.673-1.673,5.228c-.156,.488-.842,.502-1.018,.021L2.784,3.474c-.157-.43,.26-.847,.69-.69Z" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
</svg>),
},
Settings: { type: "emoji", glyph: "⚙️" },
Shield: { type: "emoji", glyph: "🛡️" },
ShieldCheck: { type: "emoji", glyph: "🛡️" },
ShieldOff: { type: "emoji", glyph: "🛡️" },
ShoppingBag: { type: "emoji", glyph: "🛍️" },
Sparkles: { type: "emoji", glyph: "✨" },
Star: { type: "emoji", glyph: "⭐" },
Stethoscope: { type: "emoji", glyph: "🩺" },
StopCircle: { type: "svg", svg: StopSvg },
Syringe: { type: "emoji", glyph: "💉" },
Tag: { type: "emoji", glyph: "🏷️" },
Target: { type: "emoji", glyph: "🎯" },
ThumbsDown: { type: "emoji", glyph: "❌" },
ThumbsUp: { type: "emoji", glyph: "✅" },
Trash2: { type: "emoji", glyph: "🗑️" },
TreePine: { type: "emoji", glyph: "🌲" },
TrendingDown: { type: "emoji", glyph: "📉" },
TrendingUp: { type: "emoji", glyph: "📈" },
TriangleAlertIcon: { type: "emoji", glyph: "⚠️" },
Type: { type: "emoji", glyph: "🔤" },
Upload: { type: "emoji", glyph: "📤" },
User: { type: "emoji", glyph: "👤" },
Users: { type: "emoji", glyph: "👥" },
Utensils: { type: "emoji", glyph: "🍴" },
Weight: { type: "emoji", glyph: "⚖️" },
X: { type: "emoji", glyph: "❌" },
XIcon: { type: "emoji", glyph: "❌" },
ZoomIn: { type: "emoji", glyph: "🔍" },
ZoomOut: { type: "emoji", glyph: "🔍" },
}
