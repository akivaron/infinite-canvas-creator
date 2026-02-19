import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Save, Undo2, Redo2, Plus, Trash2, Copy, ChevronDown, ChevronRight,
  CreditCard, Shield, Zap, Database, Clock, AlertCircle, CheckCircle, XCircle,
  Package, DollarSign, Calendar, Layers, Search, Globe, Lock, Key, Settings,
  Gift, Tag, UserCheck, RefreshCw, Star, Info
} from 'lucide-react';
import { useCanvasStore, type CanvasNode } from '@/stores/canvasStore';
import { ScrollArea } from '@/components/ui/scroll-area';

/* ─── Types ─── */
type PaymentProvider = 'Stripe' | 'PayPal' | 'Paddle' | 'LemonSqueezy' | 'Adyen';
type PaymentSystem = 'Subscription' | 'One-time' | 'Lifetime' | 'Free';
type Interval = 'Monthly' | 'Yearly' | 'Quarterly';

interface PaymentPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  systemType: PaymentSystem;
  interval?: Interval;
  features: string[];
  isPopular?: boolean;
  description: string;
}

interface PaymentConfig {
  provider: PaymentProvider;
  environment: 'Test' | 'Live';
  publicKey?: string;
  secretKey?: string;
  webhookSecret?: string;
  plans: PaymentPlan[];
}

/* ─── Element Templates ─── */
interface PaymentElement {
  id: string;
  label: string;
  icon: any;
  category: string;
  createPlan?: Partial<PaymentPlan>;
  configUpdate?: Partial<PaymentConfig>;
}

const paymentElements: PaymentElement[] = [
  // Providers
  { id: 'stripe', label: 'Stripe', icon: CreditCard, category: 'Providers', configUpdate: { provider: 'Stripe' } },
  { id: 'paypal', label: 'PayPal', icon: Globe, category: 'Providers', configUpdate: { provider: 'PayPal' } },
  { id: 'lemon', label: 'LemonSqueezy', icon: Zap, category: 'Providers', configUpdate: { provider: 'LemonSqueezy' } },
  
  // Plan Types
  { id: 'plan-sub', label: 'Subscription', icon: RefreshCw, category: 'Plan Types', createPlan: { systemType: 'Subscription', interval: 'Monthly', price: 19 } },
  { id: 'plan-one', label: 'One-time', icon: DollarSign, category: 'Plan Types', createPlan: { systemType: 'One-time', price: 99 } },
  { id: 'plan-life', label: 'Lifetime', icon: Star, category: 'Plan Types', createPlan: { systemType: 'Lifetime', price: 499 } },
  { id: 'plan-free', label: 'Free Tier', icon: Gift, category: 'Plan Types', createPlan: { systemType: 'Free', price: 0 } },

  // Features
  { id: 'feat-unlimited', label: 'Unlimited Access', icon: Layers, category: 'Features' },
  { id: 'feat-support', label: 'Priority Support', icon: UserCheck, category: 'Features' },
  { id: 'feat-custom', label: 'Custom Domain', icon: Globe, category: 'Features' },
];

const categories = [...new Set(paymentElements.map(e => e.category))];

let planCounter = 0;
const newPlanId = () => `plan-${++planCounter}-${Date.now()}`;

const defaultConfig = (): PaymentConfig => ({
  provider: 'Stripe',
  environment: 'Test',
  plans: [
    {
      id: newPlanId(),
      name: 'Starter',
      price: 0,
      currency: 'USD',
      systemType: 'Free',
      features: ['Basic access', 'Community support'],
      description: 'Perfect for getting started'
    }
  ]
});

function parseConfig(content?: string): PaymentConfig {
  if (!content) return defaultConfig();
  try {
    const parsed = JSON.parse(content);
    if (parsed.provider) return parsed;
  } catch (e) {
    // Not valid JSON
  }
  return defaultConfig();
}

function generatePaymentPreviewHtml(config: PaymentConfig, title: string): string {
  const plansHtml = config.plans.map(plan => `
    <div class="plan ${plan.isPopular ? 'popular' : ''}">
      ${plan.isPopular ? '<div class="popular-badge">Most Popular</div>' : ''}
      <div class="plan-header">
        <h2 class="plan-name">${plan.name}</h2>
        <div class="plan-price">
          <span class="currency">${plan.currency === 'USD' ? '$' : plan.currency}</span>
          <span class="amount">${plan.price}</span>
          ${plan.systemType === 'Subscription' ? `<span class="interval">/${plan.interval === 'Monthly' ? 'mo' : 'yr'}</span>` : ''}
        </div>
        <p class="plan-desc">${plan.description}</p>
      </div>
      <ul class="plan-features">
        ${plan.features.map(f => `<li><span class="check">✓</span> ${f}</li>`).join('')}
      </ul>
      <button class="plan-button">${plan.price === 0 ? 'Get Started' : 'Purchase Plan'}</button>
      <div class="plan-type">${plan.systemType}</div>
    </div>
  `).join('');

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: 'Inter', sans-serif; background:#0a0a0f; color:#e2e8f0; padding:40px 24px; }
    .container { max-width: 1000px; margin: 0 auto; text-align: center; }
    h1 { font-size:32px; font-weight:900; margin-bottom:12px; color:#fff; }
    .subtitle { color:#94a3b8; margin-bottom:48px; font-size:16px; }
    .pricing-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px; justify-content: center; }
    .plan { background:#111827; border:1px solid #1e293b; border-radius:24px; padding:32px; text-align:left; position:relative; display:flex; flex-direction:column; transition: transform 0.2s, border-color 0.2s; }
    .plan:hover { transform: translateY(-4px); border-color: #6366f1; }
    .plan.popular { border: 2px solid #6366f1; background: #111827; }
    .popular-badge { position: absolute; top: -12px; left: 50%; transform: translateX(-50%); background: #6366f1; color: white; padding: 4px 12px; border-radius: 999px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; }
    .plan-name { font-size: 18px; font-weight: 800; margin-bottom: 16px; color: #fff; }
    .plan-price { display: flex; align-items: baseline; gap: 4px; margin-bottom: 12px; }
    .currency { font-size: 20px; font-weight: 700; color: #94a3b8; }
    .amount { font-size: 40px; font-weight: 900; color: #fff; }
    .interval { color: #94a3b8; font-size: 14px; font-weight: 600; }
    .plan-desc { font-size: 14px; color: #94a3b8; margin-bottom: 24px; line-height: 1.5; }
    .plan-features { list-style: none; margin-bottom: 32px; flex: 1; }
    .plan-features li { display: flex; gap: 12px; font-size: 14px; color: #cbd5e1; margin-bottom: 12px; align-items: center; }
    .check { color: #10b981; font-weight: 900; }
    .plan-button { width: 100%; padding: 14px; border-radius: 12px; border: none; font-weight: 800; font-size: 14px; cursor: pointer; transition: opacity 0.2s; background: #6366f1; color: #fff; margin-bottom: 16px; }
    .plan.popular .plan-button { background: #6366f1; }
    .plan:not(.popular) .plan-button { background: #334155; }
    .plan-button:hover { opacity: 0.9; }
    .plan-type { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: #475569; text-align: center; }
    .provider-info { margin-top: 64px; color: #475569; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; }
  </style></head><body>
    <div class="container">
      <h1>${title}</h1>
      <p class="subtitle">Choose the perfect plan for your needs</p>
      <div class="pricing-grid">
        ${plansHtml}
      </div>
      <div class="provider-info">Powered by ${config.provider}</div>
    </div>
  </body></html>`;
}

interface Props {
  node: CanvasNode;
  onClose: () => void;
}

export const PaymentVisualEditor = ({ node, onClose }: Props) => {
  const { updateNode } = useCanvasStore();
  const [config, setConfig] = useState<PaymentConfig>(() => parseConfig(node.generatedCode));
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(config.plans[0]?.id || null);
  const [isDirty, setIsDirty] = useState(false);
  const [showLeftPanel, setShowLeftPanel] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>(
    Object.fromEntries(categories.map(c => [c, true]))
  );
  const [searchQuery, setSearchQuery] = useState('');

  const selectedPlan = config.plans.find(p => p.id === selectedPlanId) || null;
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const saveToNode = useCallback(() => {
    const code = JSON.stringify(config, null, 2);
    const preview = generatePaymentPreviewHtml(config, node.title);
    updateNode(node.id, { generatedCode: code, content: preview });
    setIsDirty(false);
  }, [config, node.id, node.title, updateNode]);

  useEffect(() => {
    if (!isDirty) return;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(saveToNode, 1500);
    return () => { if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current); };
  }, [isDirty, saveToNode]);

  const handleClose = useCallback(() => {
    if (isDirty) saveToNode();
    onClose();
  }, [isDirty, saveToNode, onClose]);

  const addPlan = useCallback((template?: Partial<PaymentPlan>) => {
    const plan: PaymentPlan = {
      id: newPlanId(),
      name: 'New Plan',
      price: 0,
      currency: 'USD',
      systemType: 'One-time',
      features: ['Feature 1'],
      description: 'Describe this plan...',
      ...template
    };
    setConfig(prev => ({ ...prev, plans: [...prev.plans, plan] }));
    setSelectedPlanId(plan.id);
    setIsDirty(true);
  }, []);

  const removePlan = useCallback((id: string) => {
    setConfig(prev => {
      const newPlans = prev.plans.filter(p => p.id !== id);
      if (selectedPlanId === id) setSelectedPlanId(newPlans[0]?.id || null);
      return { ...prev, plans: newPlans };
    });
    setIsDirty(true);
  }, [selectedPlanId]);

  const updatePlan = useCallback((id: string, updates: Partial<PaymentPlan>) => {
    setConfig(prev => ({
      ...prev,
      plans: prev.plans.map(p => p.id === id ? { ...p, ...updates } : p)
    }));
    setIsDirty(true);
  }, []);

  const updateConfig = useCallback((updates: Partial<PaymentConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
    setIsDirty(true);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData('application/payment-element');
    if (!raw) return;
    try {
      const element: PaymentElement = JSON.parse(raw);
      if (element.createPlan) {
        addPlan(element.createPlan);
      } else if (element.configUpdate) {
        updateConfig(element.configUpdate);
      } else if (element.category === 'Features' && selectedPlanId) {
        const plan = config.plans.find(p => p.id === selectedPlanId);
        if (plan && !plan.features.includes(element.label)) {
          updatePlan(selectedPlanId, { features: [...plan.features, element.label] });
        }
      }
    } catch (e) {
      console.error('Failed to parse dropped payment element:', e);
    }
  }, [config.plans, selectedPlanId, addPlan, updatePlan, updateConfig]);

  const filteredElements = searchQuery
    ? paymentElements.filter(el => el.label.toLowerCase().includes(searchQuery.toLowerCase()) || el.category.toLowerCase().includes(searchQuery.toLowerCase()))
    : paymentElements;

  return (
    <motion.div
      className="fixed inset-0 z-[100] bg-background flex flex-col"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.2 }}
    >
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card/90 backdrop-blur shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowLeftPanel(!showLeftPanel)}
            className={`p-1.5 rounded-lg transition-all ${showLeftPanel ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/80'}`}
          >
            <PanelLeft className="w-4 h-4" />
          </button>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-emerald-400" />
            <span className="text-[10px] font-black uppercase tracking-widest text-foreground">Payment Manager</span>
          </div>
          <div className="h-4 w-px bg-border" />
          <span className="text-[10px] font-bold text-muted-foreground truncate max-w-[160px]">{node.title}</span>
          <span className="text-[9px] font-bold text-muted-foreground/60">{config.plans.length} plan{config.plans.length !== 1 ? 's' : ''}</span>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => addPlan()} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest bg-secondary/80 text-foreground hover:bg-secondary transition-all">
            <Plus className="w-3 h-3" /> New Plan
          </button>
          <button onClick={saveToNode} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${isDirty ? 'bg-primary text-primary-foreground' : 'border border-border text-muted-foreground'}`}>
            <Save className="w-3 h-3" /> Save
          </button>
          <button onClick={handleClose} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/80 ml-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Elements Panel */}
        {showLeftPanel && (
          <div className="w-60 border-r border-border bg-card/90 flex flex-col shrink-0">
            <div className="p-3">
              <div className="relative">
                <Search className="w-3 h-3 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search elements..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-secondary/50 border border-border text-xs"
                />
              </div>
            </div>
            <ScrollArea className="flex-1">
              <div className="px-2 space-y-1">
                {categories.map(cat => (
                  <div key={cat}>
                    <button
                      onClick={() => setExpandedCategories(p => ({ ...p, [cat]: !p[cat] }))}
                      className="w-full flex items-center justify-between px-2 py-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground"
                    >
                      {cat}
                      {expandedCategories[cat] !== false ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                    </button>
                    {expandedCategories[cat] !== false && (
                      <div className="space-y-1 ml-2 mb-2">
                        {filteredElements.filter(e => e.category === cat).map(el => (
                          <div
                            key={el.id}
                            draggable
                            onDragStart={e => e.dataTransfer.setData('application/payment-element', JSON.stringify(el))}
                            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-secondary/30 hover:bg-secondary/60 cursor-grab text-xs font-bold text-muted-foreground hover:text-foreground transition-all"
                          >
                            <el.icon className="w-3 h-3" />
                            {el.label}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Center Canvas / Plan List */}
        <div className="flex-1 bg-secondary/20 p-8 overflow-auto flex flex-col gap-8" onDragOver={e => e.preventDefault()} onDrop={handleDrop}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {config.plans.map(plan => (
              <motion.div
                key={plan.id}
                layoutId={plan.id}
                onClick={() => setSelectedPlanId(plan.id)}
                className={`p-6 rounded-3xl border-2 transition-all cursor-pointer ${selectedPlanId === plan.id ? 'border-primary bg-card ring-4 ring-primary/5' : 'border-border bg-card/50 hover:border-primary/30'}`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest">{plan.systemType}</div>
                  <button onClick={(e) => { e.stopPropagation(); removePlan(plan.id); }} className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <h3 className="text-xl font-black uppercase tracking-tight mb-1">{plan.name}</h3>
                <div className="text-3xl font-black mb-4">
                  <span className="text-muted-foreground text-lg mr-1">$</span>{plan.price}
                  {plan.systemType === 'Subscription' && <span className="text-xs text-muted-foreground ml-1">/{plan.interval === 'Monthly' ? 'mo' : 'yr'}</span>}
                </div>
                <div className="space-y-2">
                  {plan.features.slice(0, 3).map((f, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <CheckCircle className="w-3 h-3 text-emerald-500" /> {f}
                    </div>
                  ))}
                  {plan.features.length > 3 && <div className="text-[10px] text-muted-foreground pl-5">+ {plan.features.length - 3} more</div>}
                </div>
              </motion.div>
            ))}
            <button onClick={() => addPlan()} className="p-8 rounded-3xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-3 text-muted-foreground hover:text-primary hover:border-primary/50 transition-all bg-secondary/5 group">
              <Plus className="w-8 h-8 group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-black uppercase tracking-widest">Add Custom Plan</span>
            </button>
          </div>
        </div>

        {/* Right Properties Panel */}
        <div className="w-80 border-l border-border bg-card/90 flex flex-col shrink-0 overflow-hidden">
          <div className="p-4 border-b border-border">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Properties</h3>
          </div>
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-6">
              {/* Global Config */}
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block mb-2">Provider</label>
                  <select
                    value={config.provider}
                    onChange={e => updateConfig({ provider: e.target.value as PaymentProvider })}
                    className="brand-input !py-2 !text-xs"
                  >
                    <option value="Stripe">Stripe</option>
                    <option value="PayPal">PayPal</option>
                    <option value="LemonSqueezy">LemonSqueezy</option>
                    <option value="Paddle">Paddle</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block mb-2">Environment</label>
                  <div className="flex p-1 rounded-xl bg-secondary/50 border border-border">
                    <button onClick={() => updateConfig({ environment: 'Test' })} className={`flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${config.environment === 'Test' ? 'bg-amber-500/10 text-amber-500' : 'text-muted-foreground'}`}>Test</button>
                    <button onClick={() => updateConfig({ environment: 'Live' })} className={`flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${config.environment === 'Live' ? 'bg-emerald-500/10 text-emerald-500' : 'text-muted-foreground'}`}>Live</button>
                  </div>
                </div>
              </div>

              {/* Selected Plan Details */}
              {selectedPlan ? (
                <div className="space-y-4 pt-6 border-t border-border">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-primary">Selected Plan: {selectedPlan.name}</h4>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block mb-2">Plan Name</label>
                    <input value={selectedPlan.name} onChange={e => updatePlan(selectedPlan.id, { name: e.target.value })} className="brand-input !py-2 !text-xs" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block mb-2">Price</label>
                      <input type="number" value={selectedPlan.price} onChange={e => updatePlan(selectedPlan.id, { price: Number(e.target.value) })} className="brand-input !py-2 !text-xs" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block mb-2">Currency</label>
                      <input value={selectedPlan.currency} onChange={e => updatePlan(selectedPlan.id, { currency: e.target.value })} className="brand-input !py-2 !text-xs" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block mb-2">System Type</label>
                    <select value={selectedPlan.systemType} onChange={e => updatePlan(selectedPlan.id, { systemType: e.target.value as PaymentSystem })} className="brand-input !py-2 !text-xs">
                      <option value="Subscription">Subscription</option>
                      <option value="One-time">One-time</option>
                      <option value="Lifetime">Lifetime</option>
                      <option value="Free">Free</option>
                    </select>
                  </div>
                  {selectedPlan.systemType === 'Subscription' && (
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block mb-2">Billing Interval</label>
                      <select value={selectedPlan.interval} onChange={e => updatePlan(selectedPlan.id, { interval: e.target.value as Interval })} className="brand-input !py-2 !text-xs">
                        <option value="Monthly">Monthly</option>
                        <option value="Quarterly">Quarterly</option>
                        <option value="Yearly">Yearly</option>
                      </select>
                    </div>
                  )}
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block mb-2">Description</label>
                    <textarea value={selectedPlan.description} onChange={e => updatePlan(selectedPlan.id, { description: e.target.value })} className="brand-input !py-2 !text-xs resize-none" rows={3} />
                  </div>
                  <div className="flex items-center gap-3">
                    <input type="checkbox" checked={selectedPlan.isPopular} onChange={e => updatePlan(selectedPlan.id, { isPopular: e.target.checked })} id="popular-check" />
                    <label htmlFor="popular-check" className="text-xs font-bold text-foreground cursor-pointer">Mark as popular</label>
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block mb-2">Features</label>
                    <div className="space-y-2">
                      {selectedPlan.features.map((f, i) => (
                        <div key={i} className="flex items-center gap-2 group">
                          <input
                            value={f}
                            onChange={e => {
                              const newFeatures = [...selectedPlan.features];
                              newFeatures[i] = e.target.value;
                              updatePlan(selectedPlan.id, { features: newFeatures });
                            }}
                            className="flex-1 bg-secondary/30 border border-border px-3 py-1.5 rounded-lg text-xs"
                          />
                          <button
                            onClick={() => {
                              const newFeatures = selectedPlan.features.filter((_, idx) => idx !== i);
                              updatePlan(selectedPlan.id, { features: newFeatures });
                            }}
                            className="p-1 rounded-lg text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => updatePlan(selectedPlan.id, { features: [...selectedPlan.features, 'New feature'] })}
                        className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border border-dashed border-border text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-all"
                      >
                        <Plus className="w-3 h-3" /> Add Feature
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Info className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-xs text-muted-foreground font-bold">Select a plan to edit its properties</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </motion.div>
  );
};

const PanelLeft = ({ className }: { className?: string }) => (
  <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="9" y1="3" x2="9" y2="21"/></svg>
);
