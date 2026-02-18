import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Type, Image, Square, Link2, Minus, BoxSelect, List, Table2, Video,
  LayoutGrid, ChevronDown, GripVertical, Code2, FormInput, Star,
  Columns, StickyNote, Quote, MapPin, Mail, Phone, Calendar,
  Sparkles, Layers
} from 'lucide-react';

interface Props {
  onInsertElement: (tag: string, customHtml?: string) => void;
}

interface ElementItem {
  label: string;
  tag: string;
  icon: typeof Type;
  description: string;
  customHtml?: string;
}

interface TemplateItem {
  label: string;
  description: string;
  icon: typeof Type;
  html: string;
  preview?: string;
}

const elementCategories: { title: string; icon: typeof Type; items: ElementItem[] }[] = [
  {
    title: 'Text',
    icon: Type,
    items: [
      { label: 'Heading 1', tag: 'h1', icon: Type, description: 'Large heading' },
      { label: 'Heading 2', tag: 'h2', icon: Type, description: 'Section heading' },
      { label: 'Heading 3', tag: 'h3', icon: Type, description: 'Sub heading' },
      { label: 'Paragraph', tag: 'p', icon: Type, description: 'Body text' },
      { label: 'Small Text', tag: 'small', icon: Type, description: 'Fine print', customHtml: '<small style="font-size:12px;color:#888;">Small text</small>' },
      { label: 'Blockquote', tag: 'blockquote', icon: Quote, description: 'Quote block', customHtml: '<blockquote style="border-left:4px solid #6366f1;padding:16px 20px;margin:16px 0;background:rgba(99,102,241,0.05);border-radius:0 8px 8px 0;font-style:italic;color:#555;">"A great quote goes here."</blockquote>' },
    ],
  },
  {
    title: 'Media',
    icon: Image,
    items: [
      { label: 'Image', tag: 'img', icon: Image, description: 'Photo / graphic' },
      { label: 'Video', tag: 'video', icon: Video, description: 'Video embed', customHtml: '<div style="width:100%;aspect-ratio:16/9;background:#0a0a0a;border-radius:12px;margin:16px 0;display:flex;align-items:center;justify-content:center;color:#555;font-size:14px;">▶ Video Placeholder</div>' },
      { label: 'Icon Box', tag: 'div', icon: Star, description: 'Icon container', customHtml: '<div style="width:56px;height:56px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:14px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:24px;margin:12px 0;">★</div>' },
    ],
  },
  {
    title: 'Interactive',
    icon: BoxSelect,
    items: [
      { label: 'Button', tag: 'button', icon: BoxSelect, description: 'Call to action' },
      { label: 'Outline Button', tag: 'button', icon: BoxSelect, description: 'Secondary action', customHtml: '<button style="padding:12px 24px;background:transparent;color:#6366f1;border:2px solid #6366f1;border-radius:8px;font-weight:600;cursor:pointer;font-size:14px;">Outline Button</button>' },
      { label: 'Link', tag: 'a', icon: Link2, description: 'Hyperlink' },
      { label: 'Input', tag: 'input', icon: FormInput, description: 'Text input', customHtml: '<input type="text" placeholder="Enter text..." style="padding:12px 16px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px;width:100%;max-width:320px;outline:none;" />' },
      { label: 'Textarea', tag: 'textarea', icon: FormInput, description: 'Multi-line input', customHtml: '<textarea placeholder="Write something..." rows="3" style="padding:12px 16px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px;width:100%;max-width:400px;outline:none;resize:vertical;"></textarea>' },
    ],
  },
  {
    title: 'Layout',
    icon: LayoutGrid,
    items: [
      { label: 'Container', tag: 'div', icon: Square, description: 'Generic box' },
      { label: '2 Columns', tag: 'div', icon: Columns, description: 'Two column grid', customHtml: '<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin:16px 0;"><div style="padding:24px;background:rgba(99,102,241,0.06);border-radius:12px;min-height:80px;">Column 1</div><div style="padding:24px;background:rgba(99,102,241,0.06);border-radius:12px;min-height:80px;">Column 2</div></div>' },
      { label: '3 Columns', tag: 'div', icon: Columns, description: 'Three column grid', customHtml: '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px;margin:16px 0;"><div style="padding:24px;background:rgba(99,102,241,0.06);border-radius:12px;min-height:80px;">Col 1</div><div style="padding:24px;background:rgba(99,102,241,0.06);border-radius:12px;min-height:80px;">Col 2</div><div style="padding:24px;background:rgba(99,102,241,0.06);border-radius:12px;min-height:80px;">Col 3</div></div>' },
      { label: 'Separator', tag: 'hr', icon: Minus, description: 'Horizontal line' },
      { label: 'Spacer', tag: 'div', icon: Minus, description: 'Empty spacing', customHtml: '<div style="height:48px;"></div>' },
    ],
  },
  {
    title: 'Data',
    icon: Table2,
    items: [
      { label: 'List', tag: 'ul', icon: List, description: 'Bulleted list', customHtml: '<ul style="margin:16px 0;padding-left:24px;list-style:disc;"><li style="margin-bottom:8px;">List item one</li><li style="margin-bottom:8px;">List item two</li><li>List item three</li></ul>' },
      { label: 'Ordered List', tag: 'ol', icon: List, description: 'Numbered list', customHtml: '<ol style="margin:16px 0;padding-left:24px;list-style:decimal;"><li style="margin-bottom:8px;">First step</li><li style="margin-bottom:8px;">Second step</li><li>Third step</li></ol>' },
      { label: 'Badge', tag: 'span', icon: StickyNote, description: 'Status label', customHtml: '<span style="display:inline-block;padding:4px 12px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border-radius:20px;font-size:12px;font-weight:700;letter-spacing:0.05em;">Badge</span>' },
    ],
  },
];

const templates: { category: string; items: TemplateItem[] }[] = [
  {
    category: 'Hero Sections',
    items: [
      {
        label: 'Hero Centered',
        description: 'Title, subtitle & CTA centered',
        icon: Sparkles,
        html: `<section style="padding:80px 24px;text-align:center;background:linear-gradient(135deg,#0f0f23,#1a1a3e);color:#fff;border-radius:16px;margin:16px 0;">
  <h1 style="font-size:48px;font-weight:900;margin:0 0 16px;letter-spacing:-0.02em;">Build Something Amazing</h1>
  <p style="font-size:18px;color:rgba(255,255,255,0.65);max-width:520px;margin:0 auto 32px;line-height:1.6;">Create beautiful, modern websites with our intuitive builder. No coding required.</p>
  <div style="display:flex;gap:12px;justify-content:center;">
    <button style="padding:14px 32px;background:#6366f1;color:#fff;border:none;border-radius:10px;font-weight:700;font-size:15px;cursor:pointer;">Get Started</button>
    <button style="padding:14px 32px;background:rgba(255,255,255,0.1);color:#fff;border:1px solid rgba(255,255,255,0.15);border-radius:10px;font-weight:700;font-size:15px;cursor:pointer;">Learn More</button>
  </div>
</section>`,
      },
      {
        label: 'Hero Split',
        description: 'Text left, image right',
        icon: Columns,
        html: `<section style="display:grid;grid-template-columns:1fr 1fr;gap:48px;align-items:center;padding:64px 32px;margin:16px 0;">
  <div>
    <span style="display:inline-block;padding:4px 14px;background:rgba(99,102,241,0.1);color:#6366f1;border-radius:20px;font-size:12px;font-weight:700;margin-bottom:16px;">NEW RELEASE</span>
    <h1 style="font-size:42px;font-weight:900;margin:0 0 16px;color:#0f172a;letter-spacing:-0.02em;">The Future of Web Design</h1>
    <p style="font-size:16px;color:#64748b;line-height:1.7;margin:0 0 28px;">Empowering creators to build stunning digital experiences without writing a single line of code.</p>
    <button style="padding:14px 28px;background:#6366f1;color:#fff;border:none;border-radius:10px;font-weight:700;font-size:15px;cursor:pointer;">Start Building →</button>
  </div>
  <div style="aspect-ratio:4/3;background:linear-gradient(135deg,#e0e7ff,#c7d2fe);border-radius:16px;display:flex;align-items:center;justify-content:center;color:#6366f1;font-size:14px;">Image Placeholder</div>
</section>`,
      },
    ],
  },
  {
    category: 'Feature Sections',
    items: [
      {
        label: 'Feature Cards',
        description: '3-column feature grid',
        icon: LayoutGrid,
        html: `<section style="padding:64px 32px;margin:16px 0;">
  <div style="text-align:center;margin-bottom:48px;">
    <h2 style="font-size:32px;font-weight:800;margin:0 0 12px;color:#0f172a;">Why Choose Us</h2>
    <p style="font-size:16px;color:#64748b;">Everything you need to build incredible products.</p>
  </div>
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:24px;">
    <div style="padding:32px;background:#fff;border:1px solid #e2e8f0;border-radius:16px;">
      <div style="width:48px;height:48px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:12px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:20px;margin-bottom:20px;">⚡</div>
      <h3 style="font-size:18px;font-weight:700;margin:0 0 8px;color:#0f172a;">Lightning Fast</h3>
      <p style="font-size:14px;color:#64748b;line-height:1.6;margin:0;">Optimized performance that loads in milliseconds, not seconds.</p>
    </div>
    <div style="padding:32px;background:#fff;border:1px solid #e2e8f0;border-radius:16px;">
      <div style="width:48px;height:48px;background:linear-gradient(135deg,#f59e0b,#f97316);border-radius:12px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:20px;margin-bottom:20px;">🎨</div>
      <h3 style="font-size:18px;font-weight:700;margin:0 0 8px;color:#0f172a;">Beautiful Design</h3>
      <p style="font-size:14px;color:#64748b;line-height:1.6;margin:0;">Pixel-perfect components that look stunning out of the box.</p>
    </div>
    <div style="padding:32px;background:#fff;border:1px solid #e2e8f0;border-radius:16px;">
      <div style="width:48px;height:48px;background:linear-gradient(135deg,#10b981,#059669);border-radius:12px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:20px;margin-bottom:20px;">🔒</div>
      <h3 style="font-size:18px;font-weight:700;margin:0 0 8px;color:#0f172a;">Secure</h3>
      <p style="font-size:14px;color:#64748b;line-height:1.6;margin:0;">Enterprise-grade security baked into every layer.</p>
    </div>
  </div>
</section>`,
      },
    ],
  },
  {
    category: 'Content Sections',
    items: [
      {
        label: 'CTA Banner',
        description: 'Full-width call to action',
        icon: Sparkles,
        html: `<section style="padding:48px 32px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:16px;margin:16px 0;text-align:center;">
  <h2 style="font-size:28px;font-weight:800;color:#fff;margin:0 0 12px;">Ready to Get Started?</h2>
  <p style="font-size:16px;color:rgba(255,255,255,0.75);margin:0 0 28px;">Join thousands of creators building amazing things today.</p>
  <button style="padding:14px 32px;background:#fff;color:#6366f1;border:none;border-radius:10px;font-weight:700;font-size:15px;cursor:pointer;">Start Free Trial</button>
</section>`,
      },
      {
        label: 'Testimonial',
        description: 'Customer quote card',
        icon: Quote,
        html: `<div style="padding:36px;background:#fff;border:1px solid #e2e8f0;border-radius:16px;margin:16px 0;max-width:560px;">
  <div style="display:flex;gap:4px;margin-bottom:16px;color:#f59e0b;font-size:18px;">★★★★★</div>
  <p style="font-size:16px;color:#334155;line-height:1.7;margin:0 0 20px;font-style:italic;">"This tool completely transformed how we build websites. What used to take days now takes hours."</p>
  <div style="display:flex;align-items:center;gap:12px;">
    <div style="width:44px;height:44px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;">JD</div>
    <div>
      <div style="font-size:14px;font-weight:700;color:#0f172a;">Jane Doe</div>
      <div style="font-size:12px;color:#94a3b8;">CEO at TechCorp</div>
    </div>
  </div>
</div>`,
      },
      {
        label: 'Pricing Card',
        description: 'Single pricing tier',
        icon: StickyNote,
        html: `<div style="padding:36px;background:#fff;border:2px solid #6366f1;border-radius:20px;margin:16px 0;max-width:360px;text-align:center;">
  <span style="display:inline-block;padding:4px 14px;background:rgba(99,102,241,0.1);color:#6366f1;border-radius:20px;font-size:12px;font-weight:700;margin-bottom:16px;">POPULAR</span>
  <h3 style="font-size:22px;font-weight:800;margin:0 0 8px;color:#0f172a;">Pro Plan</h3>
  <div style="font-size:48px;font-weight:900;color:#0f172a;margin:0 0 4px;">$29<span style="font-size:16px;color:#94a3b8;font-weight:500;">/mo</span></div>
  <p style="font-size:14px;color:#64748b;margin:0 0 24px;">Everything you need to grow</p>
  <ul style="list-style:none;padding:0;margin:0 0 28px;text-align:left;">
    <li style="padding:8px 0;font-size:14px;color:#334155;border-bottom:1px solid #f1f5f9;">✓ Unlimited projects</li>
    <li style="padding:8px 0;font-size:14px;color:#334155;border-bottom:1px solid #f1f5f9;">✓ Priority support</li>
    <li style="padding:8px 0;font-size:14px;color:#334155;border-bottom:1px solid #f1f5f9;">✓ Custom domains</li>
    <li style="padding:8px 0;font-size:14px;color:#334155;">✓ Analytics dashboard</li>
  </ul>
  <button style="width:100%;padding:14px;background:#6366f1;color:#fff;border:none;border-radius:10px;font-weight:700;font-size:15px;cursor:pointer;">Choose Plan</button>
</div>`,
      },
      {
        label: 'Contact Section',
        description: 'Contact info block',
        icon: Mail,
        html: `<section style="padding:48px 32px;margin:16px 0;">
  <h2 style="font-size:28px;font-weight:800;margin:0 0 24px;color:#0f172a;">Get in Touch</h2>
  <div style="display:flex;flex-direction:column;gap:16px;max-width:400px;">
    <div style="display:flex;align-items:center;gap:12px;"><span style="font-size:18px;">📧</span><span style="font-size:15px;color:#334155;">hello@example.com</span></div>
    <div style="display:flex;align-items:center;gap:12px;"><span style="font-size:18px;">📱</span><span style="font-size:15px;color:#334155;">+1 (555) 000-0000</span></div>
    <div style="display:flex;align-items:center;gap:12px;"><span style="font-size:18px;">📍</span><span style="font-size:15px;color:#334155;">123 Builder St, San Francisco, CA</span></div>
  </div>
</section>`,
      },
      {
        label: 'Footer',
        description: 'Simple site footer',
        icon: Layers,
        html: `<footer style="padding:48px 32px;background:#0f172a;color:#fff;border-radius:16px;margin:16px 0;">
  <div style="display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:32px;margin-bottom:32px;">
    <div>
      <h3 style="font-size:18px;font-weight:800;margin:0 0 12px;">YourBrand</h3>
      <p style="font-size:14px;color:rgba(255,255,255,0.5);line-height:1.6;margin:0;">Building the future of the web, one pixel at a time.</p>
    </div>
    <div>
      <h4 style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 12px;color:rgba(255,255,255,0.4);">Product</h4>
      <div style="display:flex;flex-direction:column;gap:8px;"><a href="#" style="font-size:14px;color:rgba(255,255,255,0.65);text-decoration:none;">Features</a><a href="#" style="font-size:14px;color:rgba(255,255,255,0.65);text-decoration:none;">Pricing</a><a href="#" style="font-size:14px;color:rgba(255,255,255,0.65);text-decoration:none;">Changelog</a></div>
    </div>
    <div>
      <h4 style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 12px;color:rgba(255,255,255,0.4);">Company</h4>
      <div style="display:flex;flex-direction:column;gap:8px;"><a href="#" style="font-size:14px;color:rgba(255,255,255,0.65);text-decoration:none;">About</a><a href="#" style="font-size:14px;color:rgba(255,255,255,0.65);text-decoration:none;">Blog</a><a href="#" style="font-size:14px;color:rgba(255,255,255,0.65);text-decoration:none;">Careers</a></div>
    </div>
    <div>
      <h4 style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 12px;color:rgba(255,255,255,0.4);">Legal</h4>
      <div style="display:flex;flex-direction:column;gap:8px;"><a href="#" style="font-size:14px;color:rgba(255,255,255,0.65);text-decoration:none;">Privacy</a><a href="#" style="font-size:14px;color:rgba(255,255,255,0.65);text-decoration:none;">Terms</a></div>
    </div>
  </div>
  <div style="border-top:1px solid rgba(255,255,255,0.1);padding-top:24px;font-size:13px;color:rgba(255,255,255,0.35);">© 2026 YourBrand. All rights reserved.</div>
</footer>`,
      },
    ],
  },
  {
    category: 'Navigation',
    items: [
      {
        label: 'Navbar',
        description: 'Top navigation bar',
        icon: Layers,
        html: `<nav style="display:flex;align-items:center;justify-content:space-between;padding:16px 32px;background:#fff;border-bottom:1px solid #e2e8f0;border-radius:12px;margin:16px 0;">
  <span style="font-size:20px;font-weight:900;color:#0f172a;">Brand</span>
  <div style="display:flex;gap:28px;align-items:center;">
    <a href="#" style="font-size:14px;color:#64748b;text-decoration:none;font-weight:500;">Features</a>
    <a href="#" style="font-size:14px;color:#64748b;text-decoration:none;font-weight:500;">Pricing</a>
    <a href="#" style="font-size:14px;color:#64748b;text-decoration:none;font-weight:500;">About</a>
    <button style="padding:10px 20px;background:#6366f1;color:#fff;border:none;border-radius:8px;font-weight:600;font-size:14px;cursor:pointer;">Sign Up</button>
  </div>
</nav>`,
      },
    ],
  },
];

const CategorySection = ({ title, icon: Icon, children }: { title: string; icon: typeof Type; children: React.ReactNode }) => {
  const [open, setOpen] = useState(true);
  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2 text-[9px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
      >
        <Icon className="w-3 h-3" />
        <span className="flex-1 text-left">{title}</span>
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? '' : '-rotate-90'}`} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="px-2 pb-2 space-y-1">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const ElementsTemplatesPanel = ({ onInsertElement }: Props) => {
  const [tab, setTab] = useState<'elements' | 'templates'>('elements');

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-border shrink-0">
        <button
          onClick={() => setTab('elements')}
          className={`flex-1 py-2.5 text-[9px] font-black uppercase tracking-widest transition-colors ${
            tab === 'elements' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Elements
        </button>
        <button
          onClick={() => setTab('templates')}
          className={`flex-1 py-2.5 text-[9px] font-black uppercase tracking-widest transition-colors ${
            tab === 'templates' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Templates
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {tab === 'elements' ? (
          <div className="py-1">
            {elementCategories.map((cat) => (
              <CategorySection key={cat.title} title={cat.title} icon={cat.icon}>
                {cat.items.map((item) => (
                  <button
                    key={item.label}
                    onClick={() => onInsertElement(item.tag, item.customHtml)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-secondary/80 transition-all group text-left"
                  >
                    <div className="w-7 h-7 rounded-md bg-secondary/60 group-hover:bg-primary/10 flex items-center justify-center shrink-0 transition-colors">
                      <item.icon className="w-3 h-3 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] font-bold text-foreground">{item.label}</div>
                      <div className="text-[9px] text-muted-foreground/60">{item.description}</div>
                    </div>
                    <GripVertical className="w-3 h-3 text-muted-foreground/20 group-hover:text-muted-foreground/50 shrink-0" />
                  </button>
                ))}
              </CategorySection>
            ))}
          </div>
        ) : (
          <div className="py-1">
            {templates.map((cat) => (
              <CategorySection key={cat.category} title={cat.category} icon={Layers}>
                {cat.items.map((item) => (
                  <button
                    key={item.label}
                    onClick={() => onInsertElement('template', item.html)}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg hover:bg-secondary/80 transition-all group text-left"
                  >
                    <div className="w-8 h-8 rounded-md bg-secondary/60 group-hover:bg-primary/10 flex items-center justify-center shrink-0 transition-colors">
                      <item.icon className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] font-bold text-foreground">{item.label}</div>
                      <div className="text-[9px] text-muted-foreground/60">{item.description}</div>
                    </div>
                  </button>
                ))}
              </CategorySection>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
