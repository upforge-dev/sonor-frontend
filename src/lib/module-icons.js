/**
 * Module icons - single source of truth for sidebar and ModuleLayout header.
 * Use the same icon in ModuleLayout.Header as in Sidebar for that module.
 *
 * Exception: Signal module has its own design and does not use ModuleLayout;
 * it is not included here.
 *
 * @see Sidebar.jsx (nav items use these icons)
 * @see ModuleLayout.jsx (header icon is mandatory; use MODULE_ICONS[moduleId])
 */

import {
  Home,
  FileText,
  MessageSquare,
  DollarSign,
  BarChart3,
  Users,
  FolderOpen,
  Shield,
  Mail,
  LineChart,
  BookOpen,
  Briefcase,
  Send,
  Trophy,
  ClipboardList,
  Search,
  Zap,
  Star,
  Radio,
  Calendar,
  Box,
  Building2,
  Link2,
  Globe2,
} from 'lucide-react'

export const MODULE_ICONS = {
  dashboard: Home,
  audits: LineChart,
  projects: FileText,
  files: FolderOpen,
  messages: MessageSquare,
  sync: Calendar,
  crm: Users,
  seo: Search,
  website: Globe2,
  commerce: Box,
  engage: Zap,
  reputation: Star,
  broadcast: Radio,
  affiliates: Link2,
  team: Shield,
  'team-metrics': Trophy,
  forms: ClipboardList,
  blog: BookOpen,
  portfolio: Briefcase,
  email: Mail,
  outreach: Mail,
  analytics: BarChart3,
  billing: DollarSign,
  proposals: Send,
  organization: Building2,
  platform: Shield,
  'clients-managed': Building2,
}

export default MODULE_ICONS
