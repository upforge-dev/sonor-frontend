// src/components/seo/SEOClientReport.jsx
// One-click branded PDF export for client reporting
import { useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  FileText,
  Download,
  Calendar,
  TrendingUp,
  TrendingDown,
  Target,
  Check,
  Eye,
  Sparkles,
  BarChart3,
  Globe,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { UptradeSpinner } from '@/components/UptradeLoading';
import { useSeoGSCOverview, useSeoPages, useSeoOpportunities } from '@/hooks/seo';
import useAuthStore from '@/lib/auth-store';

// Report sections configuration
const REPORT_SECTIONS = [
  { id: 'executive_summary', label: 'Executive Summary', required: true },
  { id: 'kpi_overview', label: 'KPI Overview', required: true },
  { id: 'organic_traffic', label: 'Organic Traffic', required: false },
  { id: 'keyword_rankings', label: 'Keyword Rankings', required: false },
  { id: 'top_pages', label: 'Top Performing Pages', required: false },
  { id: 'opportunities', label: 'Opportunities & Recommendations', required: false },
  { id: 'technical_health', label: 'Technical Health', required: false },
  { id: 'competitor_analysis', label: 'Competitor Analysis', required: false },
  { id: 'changes_made', label: 'Changes Made This Period', required: false },
  { id: 'next_steps', label: 'Next Steps', required: false },
];

// Report period options
const PERIOD_OPTIONS = [
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' },
  { value: 'mtd', label: 'Month to Date' },
  { value: '90d', label: 'Last 90 Days' },
  { value: 'custom', label: 'Custom Range' },
];

export function SEOClientReportButton({ projectId, variant = 'default', className }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant={variant}
        onClick={() => setOpen(true)}
        className={className}
      >
        <FileText className="h-4 w-4 mr-2" />
        Generate Report
      </Button>
      <SEOClientReportModal
        open={open}
        onClose={() => setOpen(false)}
        projectId={projectId}
      />
    </>
  );
}

export function SEOClientReportModal({ open, onClose, projectId }) {
  const { currentOrg } = useAuthStore();
  
  // Use React Query hooks instead of store
  const { data: gscOverview } = useSeoGSCOverview(projectId);
  const { data: pagesData } = useSeoPages(projectId, { limit: 50 });
  const { data: opportunitiesData } = useSeoOpportunities(projectId, { status: 'open' });
  
  const pages = pagesData?.pages || [];
  const opportunities = opportunitiesData?.opportunities || [];
  
  const [generating, setGenerating] = useState(false);
  const [preview, setPreview] = useState(false);
  const [config, setConfig] = useState({
    period: '30d',
    sections: ['executive_summary', 'kpi_overview', 'keyword_rankings', 'opportunities', 'next_steps'],
    includeLogo: true,
    includeCharts: true,
    clientName: currentOrg?.name || '',
    reportTitle: 'Monthly SEO Performance Report',
  });

  const toggleSection = (sectionId) => {
    setConfig(prev => ({
      ...prev,
      sections: prev.sections.includes(sectionId)
        ? prev.sections.filter(s => s !== sectionId)
        : [...prev.sections, sectionId],
    }));
  };

  const handleGenerate = async () => {
    setGenerating(true);
    
    try {
      // Generate report data
      const reportData = generateReportData({
        config,
        gscOverview,
        pages,
        opportunities,
        orgName: currentOrg?.name,
        domain: currentOrg?.domain,
      });

      // Generate PDF (using print-friendly HTML)
      await generatePDF(reportData, config);
      
      onClose();
    } catch (error) {
      console.error('Failed to generate report:', error);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-[var(--accent-primary)]" />
            Generate Client Report
          </DialogTitle>
          <DialogDescription>
            Create a branded PDF report for {currentOrg?.name || 'your client'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Report Title & Period */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Report Title</Label>
              <Input
                value={config.reportTitle}
                onChange={(e) => setConfig(prev => ({ ...prev, reportTitle: e.target.value }))}
                placeholder="Monthly SEO Performance Report"
              />
            </div>
            <div className="space-y-2">
              <Label>Reporting Period</Label>
              <Select
                value={config.period}
                onValueChange={(value) => setConfig(prev => ({ ...prev, period: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  {PERIOD_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Sections */}
          <div className="space-y-3">
            <Label>Report Sections</Label>
            <div className="grid gap-2 sm:grid-cols-2">
              {REPORT_SECTIONS.map(section => (
                <button
                  key={section.id}
                  onClick={() => !section.required && toggleSection(section.id)}
                  disabled={section.required}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-lg border text-left transition-all',
                    config.sections.includes(section.id)
                      ? 'bg-[var(--accent-primary)]/10 border-[var(--accent-primary)]/30'
                      : 'bg-[var(--glass-bg)] border-[var(--glass-border)]',
                    section.required && 'cursor-not-allowed opacity-70'
                  )}
                >
                  <div className={cn(
                    'w-5 h-5 rounded border-2 flex items-center justify-center transition-all',
                    config.sections.includes(section.id)
                      ? 'bg-[var(--accent-primary)] border-[var(--accent-primary)]'
                      : 'border-[var(--glass-border)]'
                  )}>
                    {config.sections.includes(section.id) && (
                      <Check className="h-3 w-3 text-white" />
                    )}
                  </div>
                  <span className="text-sm text-[var(--text-primary)]">
                    {section.label}
                    {section.required && (
                      <Badge variant="outline" className="ml-2 text-xs">Required</Badge>
                    )}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Options */}
          <div className="space-y-3">
            <Label>Options</Label>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--glass-bg)] border border-[var(--glass-border)]">
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">Include Logo</p>
                  <p className="text-xs text-[var(--text-tertiary)]">Add organization logo to header</p>
                </div>
                <Switch
                  checked={config.includeLogo}
                  onCheckedChange={(checked) => setConfig(prev => ({ ...prev, includeLogo: checked }))}
                />
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--glass-bg)] border border-[var(--glass-border)]">
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">Include Charts</p>
                  <p className="text-xs text-[var(--text-tertiary)]">Add visual charts and graphs</p>
                </div>
                <Switch
                  checked={config.includeCharts}
                  onCheckedChange={(checked) => setConfig(prev => ({ ...prev, includeCharts: checked }))}
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="outline"
            onClick={() => setPreview(true)}
          >
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>
          <Button onClick={handleGenerate} disabled={generating}>
            {generating ? (
              <>
                <UptradeSpinner size="sm" className="mr-2 [&_p]:hidden [&_svg]:!h-4 [&_svg]:!w-4" />
                Generating...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Generate report data from current state
function generateReportData({ config, gscOverview, pages, opportunities, orgName, domain }) {
  const metrics = gscOverview?.metrics || {};
  const trend = gscOverview?.trend || [];
  
  // Calculate changes
  const clicksChange = trend.length >= 2
    ? ((trend[trend.length - 1]?.clicks - trend[0]?.clicks) / (trend[0]?.clicks || 1)) * 100
    : 0;
  const impressionsChange = trend.length >= 2
    ? ((trend[trend.length - 1]?.impressions - trend[0]?.impressions) / (trend[0]?.impressions || 1)) * 100
    : 0;

  return {
    header: {
      title: config.reportTitle,
      client: config.clientName || orgName,
      domain,
      period: PERIOD_OPTIONS.find(p => p.value === config.period)?.label,
      generatedAt: new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
    },
    kpis: [
      {
        label: 'Total Clicks',
        value: formatNumber(metrics.clicks || 0),
        change: clicksChange,
      },
      {
        label: 'Impressions',
        value: formatNumber(metrics.impressions || 0),
        change: impressionsChange,
      },
      {
        label: 'Average CTR',
        value: `${(metrics.ctr || 0).toFixed(2)}%`,
        change: 0,
      },
      {
        label: 'Average Position',
        value: (metrics.position || 0).toFixed(1),
        change: 0,
        inverse: true,
      },
    ],
    topPages: (pages || []).slice(0, 10).map(p => ({
      url: p.url,
      title: p.title,
      clicks: p.clicks || 0,
      impressions: p.impressions || 0,
    })),
    opportunities: (opportunities || [])
      .filter(o => o.status === 'open')
      .slice(0, 5)
      .map(o => ({
        title: o.title,
        description: o.description,
        priority: o.priority,
        impact: o.impact_estimate,
      })),
  };
}

function formatNumber(num) {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

// Generate PDF using print-friendly HTML
async function generatePDF(data, config) {
  // Create print-friendly HTML
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>${data.header.title}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          color: #1a1a1a;
          line-height: 1.6;
          padding: 40px;
        }
        .header {
          text-align: center;
          margin-bottom: 40px;
          padding-bottom: 20px;
          border-bottom: 2px solid #e5e5e5;
        }
        .header h1 { font-size: 28px; margin-bottom: 8px; }
        .header .meta { color: #666; font-size: 14px; }
        .section { margin-bottom: 32px; }
        .section h2 { 
          font-size: 18px; 
          margin-bottom: 16px; 
          padding-bottom: 8px;
          border-bottom: 1px solid #e5e5e5;
        }
        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 24px;
        }
        .kpi-card {
          background: #f8f9fa;
          padding: 16px;
          border-radius: 8px;
          text-align: center;
        }
        .kpi-card .value { font-size: 24px; font-weight: bold; }
        .kpi-card .label { font-size: 12px; color: #666; margin-top: 4px; }
        .kpi-card .change { font-size: 12px; margin-top: 4px; }
        .kpi-card .change.positive { color: #22c55e; }
        .kpi-card .change.negative { color: #ef4444; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 10px; text-align: left; border-bottom: 1px solid #e5e5e5; }
        th { background: #f8f9fa; font-weight: 600; font-size: 12px; text-transform: uppercase; }
        .priority { 
          display: inline-block;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 600;
        }
        .priority.critical { background: #fee2e2; color: #dc2626; }
        .priority.high { background: #ffedd5; color: #ea580c; }
        .priority.medium { background: #fef3c7; color: #d97706; }
        .priority.low { background: #dbeafe; color: #2563eb; }
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #e5e5e5;
          text-align: center;
          color: #999;
          font-size: 12px;
        }
        @media print {
          body { padding: 20px; }
          .kpi-grid { grid-template-columns: repeat(2, 1fr); }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${data.header.title}</h1>
        <div class="meta">
          <p>${data.header.client} • ${data.header.domain}</p>
          <p>${data.header.period} • Generated ${data.header.generatedAt}</p>
        </div>
      </div>

      ${config.sections.includes('kpi_overview') ? `
        <div class="section">
          <h2>📊 Key Performance Indicators</h2>
          <div class="kpi-grid">
            ${data.kpis.map(kpi => `
              <div class="kpi-card">
                <div class="value">${kpi.value}</div>
                <div class="label">${kpi.label}</div>
                ${kpi.change !== 0 ? `
                  <div class="change ${kpi.change > 0 ? 'positive' : 'negative'}">
                    ${kpi.change > 0 ? '↑' : '↓'} ${Math.abs(kpi.change).toFixed(1)}%
                  </div>
                ` : ''}
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      ${config.sections.includes('top_pages') ? `
        <div class="section">
          <h2>🏆 Top Performing Pages</h2>
          <table>
            <thead>
              <tr>
                <th>Page</th>
                <th>Clicks</th>
                <th>Impressions</th>
              </tr>
            </thead>
            <tbody>
              ${data.topPages.map(page => `
                <tr>
                  <td>${page.title || page.url}</td>
                  <td>${formatNumber(page.clicks)}</td>
                  <td>${formatNumber(page.impressions)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : ''}

      ${config.sections.includes('opportunities') ? `
        <div class="section">
          <h2>💡 Opportunities & Recommendations</h2>
          <table>
            <thead>
              <tr>
                <th>Recommendation</th>
                <th>Priority</th>
                <th>Expected Impact</th>
              </tr>
            </thead>
            <tbody>
              ${data.opportunities.map(opp => `
                <tr>
                  <td>
                    <strong>${opp.title}</strong>
                    <br><small>${opp.description}</small>
                  </td>
                  <td><span class="priority ${opp.priority}">${opp.priority}</span></td>
                  <td>${opp.impact || 'Medium'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : ''}

      ${config.sections.includes('next_steps') ? `
        <div class="section">
          <h2>🎯 Next Steps</h2>
          <ol style="padding-left: 20px;">
            <li>Review and implement the high-priority recommendations above</li>
            <li>Monitor keyword rankings for target terms</li>
            <li>Continue building quality backlinks</li>
            <li>Update underperforming content based on search intent</li>
          </ol>
        </div>
      ` : ''}

      <div class="footer">
        <p>Report generated by Sonor • ${new Date().toISOString().split('T')[0]}</p>
      </div>
    </body>
    </html>
  `;

  // Open print dialog (browser's built-in PDF export)
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    
    // Wait for content to load then print
    setTimeout(() => {
      printWindow.print();
    }, 500);
  }
}

export default SEOClientReportButton;
