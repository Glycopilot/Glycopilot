/**
 * Icônes UI du portail médecin (Lucide).
 * GlycoIcon = logo / marque uniquement (sidebar logo, branding).
 */
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  BarChart3,
  CheckCircle,
  ChevronRight,
  Clock,
  Droplets,
  Eye,
  FilterX,
  Flame,
  Footprints,
  Gauge,
  Heart,
  HelpCircle,
  Inbox,
  LayoutDashboard,
  LayoutGrid,
  LogOut,
  Mail,
  Minus,
  Phone,
  Pill,
  Search,
  Send,
  Stethoscope,
  TrendingDown,
  TrendingUp,
  UserCheck,
  UserCircle,
  UserPlus,
  UserX,
  Users,
  Utensils,
  X,
  XCircle,
} from 'lucide-react';

const ICONS = {
  activity: Activity,
  alert: AlertTriangle,
  'alert-circle': AlertCircle,
  chart: BarChart3,
  check: CheckCircle,
  chevron: ChevronRight,
  clock: Clock,
  droplets: Droplets,
  eye: Eye,
  'filter-x': FilterX,
  flame: Flame,
  footsteps: Footprints,
  gauge: Gauge,
  heart: Heart,
  help: HelpCircle,
  inbox: Inbox,
  dashboard: LayoutDashboard,
  grid: LayoutGrid,
  logout: LogOut,
  mail: Mail,
  minus: Minus,
  phone: Phone,
  pill: Pill,
  search: Search,
  send: Send,
  stethoscope: Stethoscope,
  'trend-down': TrendingDown,
  'trend-up': TrendingUp,
  'user-check': UserCheck,
  'user-circle': UserCircle,
  'user-plus': UserPlus,
  'user-x': UserX,
  users: Users,
  utensils: Utensils,
  x: X,
  'x-circle': XCircle,
};

export default function AppIcon({ name, size = 18, className = '', strokeWidth = 2 }) {
  const Icon = ICONS[name];
  if (!Icon) return null;
  return (
    <Icon
      size={size}
      strokeWidth={strokeWidth}
      className={`app-icon ${className}`.trim()}
      aria-hidden
    />
  );
}

export {
  LayoutDashboard,
  Users,
  UserCircle,
  LogOut,
  HelpCircle,
  X,
  Mail,
  Phone,
  ChevronRight,
};
