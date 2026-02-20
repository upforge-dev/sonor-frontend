import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Sparkles, 
  Zap, 
  Brain, 
  TrendingUp, 
  Search, 
  MessageSquare,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import SignalIcon from '@/components/ui/SignalIcon';
import { signalApi } from '@/lib/signal-api';

export default function SignalDisabledView({ projectId, orgId, onEnabled }) {
  const [enabling, setEnabling] = useState(false);
  const [error, setError] = useState(null);

  const handleEnable = async () => {
    setEnabling(true);
    setError(null);
    
    try {
      await signalApi.enableSignal(projectId, orgId);
      onEnabled?.();
    } catch (err) {
      console.error('Failed to enable Signal:', err);
      setError('Failed to enable Signal. Please try again.');
    } finally {
      setEnabling(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      {/* Hero Section */}
      <div className="text-center mb-12">
        <div 
          className="w-20 h-20 mx-auto mb-6 rounded-2xl flex items-center justify-center"
          style={{ 
            background: `linear-gradient(135deg, var(--brand-primary), var(--brand-primary))` 
          }}
        >
          <SignalIcon className="h-10 w-10 text-white" />
        </div>
        
        <h1 className="text-4xl font-bold mb-4">
          Enable Signal AI
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Signal is your autonomous AI agent that monitors, analyzes, and optimizes your business 
          operations 24/7. It takes action when needed, not just when asked.
        </p>
      </div>

      {/* Features Grid */}
      <div className="grid md:grid-cols-2 gap-6 mb-12">
        <Card className="p-6">
          <div 
            className="p-3 rounded-xl w-fit mb-4"
            style={{ backgroundColor: 'color-mix(in srgb, var(--brand-primary) 15%, transparent)' }}
          >
            <Zap className="h-6 w-6" style={{ color: 'var(--brand-primary)' }} />
          </div>
          <h3 className="font-semibold text-lg mb-2">Autonomous Actions</h3>
          <p className="text-sm text-muted-foreground">
            Signal doesn't just suggest—it acts. From fixing indexing errors to optimizing content, 
            Signal handles tier-1 tasks automatically.
          </p>
        </Card>

        <Card className="p-6">
          <div 
            className="p-3 rounded-xl w-fit mb-4"
            style={{ backgroundColor: 'color-mix(in srgb, var(--brand-primary) 15%, transparent)' }}
          >
            <Brain className="h-6 w-6" style={{ color: 'var(--brand-primary)' }} />
          </div>
          <h3 className="font-semibold text-lg mb-2">Learns & Adapts</h3>
          <p className="text-sm text-muted-foreground">
            Signal learns from outcomes and feedback, continuously improving its recommendations 
            and decision-making over time.
          </p>
        </Card>

        <Card className="p-6">
          <div 
            className="p-3 rounded-xl w-fit mb-4"
            style={{ backgroundColor: 'color-mix(in srgb, var(--brand-primary) 15%, transparent)' }}
          >
            <Search className="h-6 w-6" style={{ color: 'var(--brand-primary)' }} />
          </div>
          <h3 className="font-semibold text-lg mb-2">Proactive Monitoring</h3>
          <p className="text-sm text-muted-foreground">
            Monitors GSC health, reviews, traffic, leads, and more. Detects issues before they 
            become problems and takes corrective action.
          </p>
        </Card>

        <Card className="p-6">
          <div 
            className="p-3 rounded-xl w-fit mb-4"
            style={{ backgroundColor: 'color-mix(in srgb, var(--brand-primary) 15%, transparent)' }}
          >
            <TrendingUp className="h-6 w-6" style={{ color: 'var(--brand-primary)' }} />
          </div>
          <h3 className="font-semibold text-lg mb-2">Continuous Optimization</h3>
          <p className="text-sm text-muted-foreground">
            Never stops improving. Signal identifies opportunities, tests variations, and 
            optimizes performance across all your modules.
          </p>
        </Card>
      </div>

      {/* How It Works */}
      <Card className="p-8 mb-8">
        <h2 className="text-2xl font-bold mb-6">How Signal Works</h2>
        <div className="space-y-4">
          <div className="flex gap-4">
            <div 
              className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold"
              style={{ backgroundColor: 'var(--brand-primary)' }}
            >
              1
            </div>
            <div>
              <h3 className="font-semibold mb-1">Autonomous Setup</h3>
              <p className="text-sm text-muted-foreground">
                Signal sets itself up by discovering your site, integrating data sources, 
                and configuring monitoring agents—no manual wizard required.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div 
              className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold"
              style={{ backgroundColor: 'var(--brand-primary)' }}
            >
              2
            </div>
            <div>
              <h3 className="font-semibold mb-1">24/7 Monitoring</h3>
              <p className="text-sm text-muted-foreground">
                Background agents continuously monitor your business operations, tracking metrics 
                and detecting anomalies in real-time.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div 
              className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold"
              style={{ backgroundColor: 'var(--brand-primary)' }}
            >
              3
            </div>
            <div>
              <h3 className="font-semibold mb-1">Smart Actions</h3>
              <p className="text-sm text-muted-foreground">
                When issues arise, Signal takes action based on tier level. Tier 1 tasks execute 
                automatically, higher tiers request approval.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div 
              className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold"
              style={{ backgroundColor: 'var(--brand-primary)' }}
            >
              4
            </div>
            <div>
              <h3 className="font-semibold mb-1">Outcome Tracking</h3>
              <p className="text-sm text-muted-foreground">
                Signal measures the results of every action, learns from feedback, and refines 
                its decision-making to continuously improve performance.
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* What's Included */}
      <Card className="p-8 mb-8">
        <h2 className="text-2xl font-bold mb-6">What's Included</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {[
            'GSC health monitoring',
            'Review monitoring & responses',
            'Traffic anomaly detection',
            'Lead scoring & assignment',
            'Content decay detection',
            'Uptime monitoring',
            'Ranking tracking',
            'Competitor analysis',
            'SEO opportunity detection',
            'Automated indexing fixes',
            'Smart form routing',
            'Proactive insights',
          ].map((feature) => (
            <div key={feature} className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 flex-shrink-0" style={{ color: 'var(--brand-primary)' }} />
              <span className="text-sm">{feature}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Pricing */}
      <Card className="p-8 mb-8 border-2" style={{ borderColor: 'var(--brand-primary)' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold mb-2">Transparent Pricing</h2>
            <p className="text-muted-foreground">
              Signal is OFF by default. You control when it runs and how much it can spend.
            </p>
          </div>
          <Sparkles className="h-8 w-8" style={{ color: 'var(--brand-primary)' }} />
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg bg-accent">
            <div>
              <div className="font-semibold">Default Daily Budget</div>
              <div className="text-sm text-muted-foreground">Customize in settings</div>
            </div>
            <div className="text-2xl font-bold" style={{ color: 'var(--brand-primary)' }}>
              $10/day
            </div>
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg bg-accent">
            <div>
              <div className="font-semibold">Max Actions Per Day</div>
              <div className="text-sm text-muted-foreground">Prevents runaway costs</div>
            </div>
            <div className="text-2xl font-bold" style={{ color: 'var(--brand-primary)' }}>
              50
            </div>
          </div>
        </div>
      </Card>

      {/* CTA */}
      <div className="text-center">
        <Button
          onClick={handleEnable}
          disabled={enabling}
          size="lg"
          className="text-lg px-8 py-6 h-auto"
          style={{
            background: `linear-gradient(135deg, var(--brand-primary), var(--brand-primary))`,
            color: 'white',
          }}
        >
          {enabling ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Enabling Signal...
            </>
          ) : (
            <>
              <Sparkles className="h-5 w-5 mr-2" />
              Enable Signal Now
            </>
          )}
        </Button>

        {error && (
          <p className="text-sm text-destructive mt-4">{error}</p>
        )}

        <p className="text-sm text-muted-foreground mt-4">
          Setup takes 5-10 minutes. Signal will configure itself autonomously.
        </p>
      </div>
    </div>
  );
}
