export type IconMapEntry =
  | { type: "emoji"; glyph: string }
  | { type: "text"; char: string }
  | { type: "svg"; svg: React.ReactNode }

/** lucide / radix 图标名称 → 3D emoji 或文本符号 */
export const ICON_EMOJI_MAP: Record<string, IconMapEntry> = {
  Activity: { type: "emoji", glyph: "📈" },
  AlertCircle: { type: "emoji", glyph: "⚠️" },
  AlertTriangle: { type: "emoji", glyph: "⚠️" },
  ArrowLeft: { type: "emoji", glyph: "⬅️" },
  ArrowRight: { type: "emoji", glyph: "➡️" },
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
  ChevronDown: { type: "emoji", glyph: "⬇️" },
  ChevronDownIcon: { type: "emoji", glyph: "⬇️" },
  ChevronLeft: { type: "emoji", glyph: "⬅️" },
  ChevronRight: { type: "emoji", glyph: "➡️" },
  ChevronRightIcon: { type: "emoji", glyph: "➡️" },
  ChevronUp: { type: "emoji", glyph: "⬆️" },
  ChevronUpIcon: { type: "emoji", glyph: "⬆️" },
  ChevronsUpDown: { type: "emoji", glyph: "↕️" },
  Circle: { type: "emoji", glyph: "⭕" },
  CircleCheckIcon: { type: "emoji", glyph: "✅" },
  Clock: {
    type: "svg",
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
  Database: { type: "emoji", glyph: "🗄️" },
  Dog: { type: "emoji", glyph: "🐶" },
  Download: { type: "emoji", glyph: "⬇️" },
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
  GitCompareArrows: { type: "emoji", glyph: "↔️" },
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
  Play: { type: "emoji", glyph: "▶️" },
  Plus: {
    type: "svg",
    svg: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18">
        <g fill="#212121">
          <line x1="9" y1="3.25" x2="9" y2="14.75" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
          <line x1="3.25" y1="9" x2="14.75" y2="9" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
        </g>
      </svg>
    ),
  },
  PlusCircle: {
    type: "svg",
    svg: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18">
        <g fill="#212121">
          <line x1="9" y1="3.25" x2="9" y2="14.75" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
          <line x1="3.25" y1="9" x2="14.75" y2="9" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
        </g>
      </svg>
    ),
  },
  RefreshCw: { type: "emoji", glyph: "🔄" },
  Search: { type: "emoji", glyph: "🔍" },
  Send: { type: "emoji", glyph: "📤" },
  Settings: { type: "emoji", glyph: "⚙️" },
  Shield: { type: "emoji", glyph: "🛡️" },
  ShieldCheck: { type: "emoji", glyph: "🛡️" },
  ShieldOff: { type: "emoji", glyph: "🛡️" },
  ShoppingBag: { type: "emoji", glyph: "🛍️" },
  Sparkles: { type: "emoji", glyph: "✨" },
  Star: { type: "emoji", glyph: "⭐" },
  Stethoscope: { type: "emoji", glyph: "🩺" },
  StopCircle: { type: "emoji", glyph: "⏹️" },
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
