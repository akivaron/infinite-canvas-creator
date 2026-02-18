import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Type, Palette, Square, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Bold, Italic, Underline, Trash2, Copy, Plus, X, ChevronDown, Image, Link2,
  BoxSelect, Minus, CornerDownRight, MoveVertical, MoveHorizontal
} from 'lucide-react';

export interface ElementStyles {
  color: string;
  fontSize: string;
  fontWeight: string;
  fontStyle: string;
  textDecoration: string;
  textAlign: string;
  backgroundColor: string;
  padding: string;
  paddingTop: string;
  paddingRight: string;
  paddingBottom: string;
  paddingLeft: string;
  margin: string;
  marginTop: string;
  marginRight: string;
  marginBottom: string;
  marginLeft: string;
  borderRadius: string;
  borderWidth: string;
  borderColor: string;
  borderStyle: string;
  width: string;
  height: string;
  display: string;
  opacity: string;
  letterSpacing: string;
  lineHeight: string;
  textTransform: string;
}

interface Props {
  selectedTag: string | null;
  selectedText: string | null;
  styles: Partial<ElementStyles> | null;
  onStyleChange: (prop: string, value: string) => void;
  onAction: (action: string, payload?: string) => void;
}

const Section = ({ title, icon: Icon, children, defaultOpen = true }: { title: string; icon: typeof Type; children: React.ReactNode; defaultOpen?: boolean }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-border">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-4 py-2.5 text-[9px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
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
            <div className="px-4 pb-3 space-y-2">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const PropRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex items-center gap-2">
    <span className="text-[9px] font-bold text-muted-foreground w-16 shrink-0">{label}</span>
    <div className="flex-1 flex items-center gap-1.5">{children}</div>
  </div>
);

const PropInput = ({ value, onChange, placeholder, type = 'text', className = '' }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string; className?: string;
}) => (
  <input
    type={type}
    value={value}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder}
    className={`flex-1 px-2 py-1.5 rounded-lg bg-secondary/50 border border-border text-[10px] font-bold text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary w-full ${className}`}
  />
);

const ColorInput = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
  <div className="flex items-center gap-1.5 flex-1">
    <input
      type="color"
      value={rgbToHex(value)}
      onChange={(e) => onChange(e.target.value)}
      className="w-7 h-7 rounded-lg border border-border cursor-pointer bg-transparent p-0.5"
    />
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="flex-1 px-2 py-1.5 rounded-lg bg-secondary/50 border border-border text-[10px] font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
    />
  </div>
);

const ToggleBtn = ({ active, onClick, children, title }: { active: boolean; onClick: () => void; children: React.ReactNode; title: string }) => (
  <button
    onClick={onClick}
    title={title}
    className={`p-1.5 rounded-lg transition-all ${active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/80'}`}
  >
    {children}
  </button>
);

function rgbToHex(rgb: string): string {
  if (rgb.startsWith('#')) return rgb;
  const match = rgb.match(/\d+/g);
  if (!match || match.length < 3) return '#000000';
  return '#' + match.slice(0, 3).map(x => parseInt(x).toString(16).padStart(2, '0')).join('');
}

const fontSizes = ['10px', '11px', '12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px', '36px', '40px', '48px', '56px', '64px', '72px'];
const fontWeights = [
  { label: 'Thin', value: '100' },
  { label: 'Light', value: '300' },
  { label: 'Normal', value: '400' },
  { label: 'Medium', value: '500' },
  { label: 'Semibold', value: '600' },
  { label: 'Bold', value: '700' },
  { label: 'Black', value: '900' },
];
const insertElements = [
  { label: 'Text', tag: 'p', icon: Type },
  { label: 'Heading', tag: 'h2', icon: Type },
  { label: 'Button', tag: 'button', icon: BoxSelect },
  { label: 'Link', tag: 'a', icon: Link2 },
  { label: 'Image', tag: 'img', icon: Image },
  { label: 'Div', tag: 'div', icon: Square },
  { label: 'Separator', tag: 'hr', icon: Minus },
];

export const PropertiesPanel = ({ selectedTag, selectedText, styles, onStyleChange, onAction }: Props) => {
  const [showInsert, setShowInsert] = useState(false);

  if (!selectedTag || !styles) {
    return (
      <div className="h-full flex flex-col items-center justify-center px-6 text-center">
        <BoxSelect className="w-10 h-10 text-muted-foreground/20 mb-3" />
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">No element selected</p>
        <p className="text-[9px] text-muted-foreground/60">Click an element on the canvas to inspect and edit its properties</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Element info header */}
      <div className="px-4 py-3 border-b border-border bg-secondary/30">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[9px] font-black uppercase tracking-widest text-primary">&lt;{selectedTag}&gt;</span>
            {selectedText && (
              <p className="text-[10px] text-muted-foreground truncate max-w-[180px] mt-0.5">"{selectedText}"</p>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => onAction('duplicate')} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors" title="Duplicate">
              <Copy className="w-3 h-3" />
            </button>
            <button onClick={() => onAction('delete')} className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors" title="Delete">
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {/* Content editing */}
        <Section title="Content" icon={Type} defaultOpen={true}>
          <textarea
            value={selectedText || ''}
            onChange={(e) => onAction('setText', e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-secondary/50 border border-border text-[11px] text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary"
            rows={2}
            placeholder="Element text..."
          />
        </Section>

        {/* Typography */}
        <Section title="Typography" icon={Type}>
          <PropRow label="Size">
            <select
              value={styles.fontSize || '16px'}
              onChange={(e) => onStyleChange('fontSize', e.target.value)}
              className="flex-1 px-2 py-1.5 rounded-lg bg-secondary/50 border border-border text-[10px] font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {fontSizes.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </PropRow>
          <PropRow label="Weight">
            <select
              value={styles.fontWeight || '400'}
              onChange={(e) => onStyleChange('fontWeight', e.target.value)}
              className="flex-1 px-2 py-1.5 rounded-lg bg-secondary/50 border border-border text-[10px] font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {fontWeights.map(w => <option key={w.value} value={w.value}>{w.label} ({w.value})</option>)}
            </select>
          </PropRow>
          <PropRow label="Style">
            <div className="flex gap-1">
              <ToggleBtn active={styles.fontWeight === '700' || styles.fontWeight === '900'} onClick={() => onStyleChange('fontWeight', styles.fontWeight === '700' ? '400' : '700')} title="Bold">
                <Bold className="w-3 h-3" />
              </ToggleBtn>
              <ToggleBtn active={styles.fontStyle === 'italic'} onClick={() => onStyleChange('fontStyle', styles.fontStyle === 'italic' ? 'normal' : 'italic')} title="Italic">
                <Italic className="w-3 h-3" />
              </ToggleBtn>
              <ToggleBtn active={styles.textDecoration?.includes('underline') || false} onClick={() => onStyleChange('textDecoration', styles.textDecoration?.includes('underline') ? 'none' : 'underline')} title="Underline">
                <Underline className="w-3 h-3" />
              </ToggleBtn>
            </div>
          </PropRow>
          <PropRow label="Align">
            <div className="flex gap-1">
              {([['left', AlignLeft], ['center', AlignCenter], ['right', AlignRight], ['justify', AlignJustify]] as const).map(([val, Ic]) => (
                <ToggleBtn key={val} active={styles.textAlign === val} onClick={() => onStyleChange('textAlign', val)} title={val}>
                  <Ic className="w-3 h-3" />
                </ToggleBtn>
              ))}
            </div>
          </PropRow>
          <PropRow label="Spacing">
            <PropInput value={styles.letterSpacing || '0px'} onChange={(v) => onStyleChange('letterSpacing', v)} placeholder="0px" />
          </PropRow>
          <PropRow label="Line H.">
            <PropInput value={styles.lineHeight || 'normal'} onChange={(v) => onStyleChange('lineHeight', v)} placeholder="normal" />
          </PropRow>
          <PropRow label="Transform">
            <select
              value={styles.textTransform || 'none'}
              onChange={(e) => onStyleChange('textTransform', e.target.value)}
              className="flex-1 px-2 py-1.5 rounded-lg bg-secondary/50 border border-border text-[10px] font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="none">None</option>
              <option value="uppercase">UPPERCASE</option>
              <option value="lowercase">lowercase</option>
              <option value="capitalize">Capitalize</option>
            </select>
          </PropRow>
        </Section>

        {/* Colors */}
        <Section title="Colors" icon={Palette}>
          <PropRow label="Text">
            <ColorInput value={styles.color || '#000000'} onChange={(v) => onStyleChange('color', v)} />
          </PropRow>
          <PropRow label="BG">
            <ColorInput value={styles.backgroundColor || 'transparent'} onChange={(v) => onStyleChange('backgroundColor', v)} />
          </PropRow>
          <PropRow label="Opacity">
            <input
              type="range"
              min="0" max="1" step="0.05"
              value={parseFloat(styles.opacity || '1')}
              onChange={(e) => onStyleChange('opacity', e.target.value)}
              className="flex-1"
            />
            <span className="text-[9px] font-bold text-muted-foreground w-8 text-right">{Math.round(parseFloat(styles.opacity || '1') * 100)}%</span>
          </PropRow>
        </Section>

        {/* Spacing */}
        <Section title="Spacing" icon={MoveVertical} defaultOpen={false}>
          <p className="text-[9px] font-bold text-muted-foreground mb-1">Padding</p>
          <div className="grid grid-cols-2 gap-1.5">
            <PropInput value={styles.paddingTop || '0px'} onChange={(v) => onStyleChange('paddingTop', v)} placeholder="Top" />
            <PropInput value={styles.paddingRight || '0px'} onChange={(v) => onStyleChange('paddingRight', v)} placeholder="Right" />
            <PropInput value={styles.paddingBottom || '0px'} onChange={(v) => onStyleChange('paddingBottom', v)} placeholder="Bottom" />
            <PropInput value={styles.paddingLeft || '0px'} onChange={(v) => onStyleChange('paddingLeft', v)} placeholder="Left" />
          </div>
          <p className="text-[9px] font-bold text-muted-foreground mb-1 mt-2">Margin</p>
          <div className="grid grid-cols-2 gap-1.5">
            <PropInput value={styles.marginTop || '0px'} onChange={(v) => onStyleChange('marginTop', v)} placeholder="Top" />
            <PropInput value={styles.marginRight || '0px'} onChange={(v) => onStyleChange('marginRight', v)} placeholder="Right" />
            <PropInput value={styles.marginBottom || '0px'} onChange={(v) => onStyleChange('marginBottom', v)} placeholder="Bottom" />
            <PropInput value={styles.marginLeft || '0px'} onChange={(v) => onStyleChange('marginLeft', v)} placeholder="Left" />
          </div>
        </Section>

        {/* Size & Border */}
        <Section title="Size & Border" icon={Square} defaultOpen={false}>
          <PropRow label="Width">
            <PropInput value={styles.width || 'auto'} onChange={(v) => onStyleChange('width', v)} placeholder="auto" />
          </PropRow>
          <PropRow label="Height">
            <PropInput value={styles.height || 'auto'} onChange={(v) => onStyleChange('height', v)} placeholder="auto" />
          </PropRow>
          <PropRow label="Radius">
            <PropInput value={styles.borderRadius || '0px'} onChange={(v) => onStyleChange('borderRadius', v)} placeholder="0px" />
          </PropRow>
          <PropRow label="Border W">
            <PropInput value={styles.borderWidth || '0px'} onChange={(v) => onStyleChange('borderWidth', v)} placeholder="0px" />
          </PropRow>
          <PropRow label="Border C">
            <ColorInput value={styles.borderColor || '#000000'} onChange={(v) => onStyleChange('borderColor', v)} />
          </PropRow>
          <PropRow label="Style">
            <select
              value={styles.borderStyle || 'none'}
              onChange={(e) => onStyleChange('borderStyle', e.target.value)}
              className="flex-1 px-2 py-1.5 rounded-lg bg-secondary/50 border border-border text-[10px] font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="none">None</option>
              <option value="solid">Solid</option>
              <option value="dashed">Dashed</option>
              <option value="dotted">Dotted</option>
            </select>
          </PropRow>
        </Section>

        {/* Insert element */}
        <Section title="Insert Element" icon={Plus} defaultOpen={false}>
          <div className="grid grid-cols-2 gap-1.5">
            {insertElements.map((el) => (
              <button
                key={el.tag}
                onClick={() => onAction('insert', el.tag)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-secondary/50 border border-border text-[10px] font-bold text-foreground hover:bg-secondary hover:border-primary/30 transition-all"
              >
                <el.icon className="w-3 h-3 text-muted-foreground" />
                {el.label}
              </button>
            ))}
          </div>
        </Section>
      </div>
    </div>
  );
};
