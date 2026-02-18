import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Type, Image, Square, Link2, Minus, BoxSelect, List, Table2, Video,
  LayoutGrid, ChevronDown, GripVertical, Code2, FormInput, Star,
  Columns, StickyNote, Quote, MapPin, Mail, Phone, Calendar,
  Sparkles, Layers, ToggleLeft, CircleUser, CreditCard, Shield,
  Clock, Hash, Percent, FileText, AlignJustify, Palette, Globe,
  Heart, ThumbsUp, Share2, Bell, Search, Filter, Tag, Bookmark,
  Download, Upload, Printer, Settings, Zap, Award, TrendingUp,
  BarChart3, PieChart, Activity, CheckSquare, Radio, Sliders,
  Navigation, Menu, Sidebar, PanelTop, PanelBottom, Grid3X3,
  CircleDot, Loader2, AlertTriangle, Info, CheckCircle2, XCircle,
  ChevronRight, ArrowRight, ExternalLink, Eye, EyeOff, Lock,
  Unlock, Trash2, Edit3, Copy, RotateCw, Maximize2, Minimize2
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
      { label: 'Heading 4', tag: 'h4', icon: Type, description: 'Minor heading', customHtml: '<h4 style="font-size:16px;font-weight:700;margin:12px 0;color:#1e293b;">Heading 4</h4>' },
      { label: 'Paragraph', tag: 'p', icon: Type, description: 'Body text' },
      { label: 'Small Text', tag: 'small', icon: Type, description: 'Fine print', customHtml: '<small style="font-size:12px;color:#888;">Small text</small>' },
      { label: 'Lead Text', tag: 'p', icon: Type, description: 'Large intro text', customHtml: '<p style="font-size:20px;line-height:1.6;color:#475569;margin:16px 0;">Lead paragraph text that introduces a section with larger, more readable typography.</p>' },
      { label: 'Blockquote', tag: 'blockquote', icon: Quote, description: 'Quote block', customHtml: '<blockquote style="border-left:4px solid #6366f1;padding:16px 20px;margin:16px 0;background:rgba(99,102,241,0.05);border-radius:0 8px 8px 0;font-style:italic;color:#555;">"A great quote goes here."</blockquote>' },
      { label: 'Code Block', tag: 'pre', icon: Code2, description: 'Monospace code', customHtml: '<pre style="background:#1e1e2e;color:#cdd6f4;padding:20px;border-radius:12px;font-size:13px;font-family:monospace;overflow-x:auto;margin:16px 0;"><code>const greeting = "Hello World";\nconsole.log(greeting);</code></pre>' },
      { label: 'Inline Code', tag: 'code', icon: Code2, description: 'Inline monospace', customHtml: '<code style="background:rgba(99,102,241,0.1);color:#6366f1;padding:2px 8px;border-radius:6px;font-size:13px;font-family:monospace;">inline code</code>' },
      { label: 'Label', tag: 'label', icon: Tag, description: 'Form label', customHtml: '<label style="display:block;font-size:13px;font-weight:600;color:#374151;margin-bottom:6px;">Label text</label>' },
      { label: 'Caption', tag: 'span', icon: Type, description: 'Image caption', customHtml: '<span style="display:block;font-size:12px;color:#94a3b8;text-align:center;margin-top:8px;">Image caption text</span>' },
    ],
  },
  {
    title: 'Media',
    icon: Image,
    items: [
      { label: 'Image', tag: 'img', icon: Image, description: 'Photo / graphic' },
      { label: 'Video', tag: 'video', icon: Video, description: 'Video embed', customHtml: '<div style="width:100%;aspect-ratio:16/9;background:#0a0a0a;border-radius:12px;margin:16px 0;display:flex;align-items:center;justify-content:center;color:#555;font-size:14px;">▶ Video Placeholder</div>' },
      { label: 'Icon Box', tag: 'div', icon: Star, description: 'Icon container', customHtml: '<div style="width:56px;height:56px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:14px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:24px;margin:12px 0;">★</div>' },
      { label: 'Avatar', tag: 'div', icon: CircleUser, description: 'User avatar', customHtml: '<div style="width:48px;height:48px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:16px;">JD</div>' },
      { label: 'Avatar Group', tag: 'div', icon: CircleUser, description: 'Stacked avatars', customHtml: '<div style="display:flex;"><div style="width:40px;height:40px;background:#6366f1;border-radius:50%;border:3px solid #fff;display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;font-weight:700;">A</div><div style="width:40px;height:40px;background:#f59e0b;border-radius:50%;border:3px solid #fff;margin-left:-12px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;font-weight:700;">B</div><div style="width:40px;height:40px;background:#10b981;border-radius:50%;border:3px solid #fff;margin-left:-12px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;font-weight:700;">C</div><div style="width:40px;height:40px;background:#94a3b8;border-radius:50%;border:3px solid #fff;margin-left:-12px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:11px;font-weight:700;">+3</div></div>' },
      { label: 'Logo Placeholder', tag: 'div', icon: Globe, description: 'Brand logo', customHtml: '<div style="display:inline-flex;align-items:center;gap:8px;"><div style="width:36px;height:36px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:10px;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:900;font-size:16px;">L</div><span style="font-size:18px;font-weight:800;color:#0f172a;">Brand</span></div>' },
      { label: 'Image Gallery', tag: 'div', icon: Grid3X3, description: '2x2 image grid', customHtml: '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:16px 0;"><div style="aspect-ratio:1;background:linear-gradient(135deg,#e0e7ff,#c7d2fe);border-radius:12px;"></div><div style="aspect-ratio:1;background:linear-gradient(135deg,#fef3c7,#fde68a);border-radius:12px;"></div><div style="aspect-ratio:1;background:linear-gradient(135deg,#d1fae5,#a7f3d0);border-radius:12px;"></div><div style="aspect-ratio:1;background:linear-gradient(135deg,#fce7f3,#fbcfe8);border-radius:12px;"></div></div>' },
    ],
  },
  {
    title: 'Buttons',
    icon: BoxSelect,
    items: [
      { label: 'Primary Button', tag: 'button', icon: BoxSelect, description: 'Main CTA' },
      { label: 'Secondary Button', tag: 'button', icon: BoxSelect, description: 'Secondary action', customHtml: '<button style="padding:12px 24px;background:#f1f5f9;color:#334155;border:none;border-radius:8px;font-weight:600;cursor:pointer;font-size:14px;">Secondary</button>' },
      { label: 'Outline Button', tag: 'button', icon: BoxSelect, description: 'Bordered button', customHtml: '<button style="padding:12px 24px;background:transparent;color:#6366f1;border:2px solid #6366f1;border-radius:8px;font-weight:600;cursor:pointer;font-size:14px;">Outline Button</button>' },
      { label: 'Ghost Button', tag: 'button', icon: BoxSelect, description: 'Minimal button', customHtml: '<button style="padding:12px 24px;background:transparent;color:#6366f1;border:none;border-radius:8px;font-weight:600;cursor:pointer;font-size:14px;">Ghost Button</button>' },
      { label: 'Icon Button', tag: 'button', icon: BoxSelect, description: 'Button with icon', customHtml: '<button style="display:inline-flex;align-items:center;gap:8px;padding:12px 24px;background:#6366f1;color:#fff;border:none;border-radius:8px;font-weight:600;cursor:pointer;font-size:14px;">→ Get Started</button>' },
      { label: 'Pill Button', tag: 'button', icon: BoxSelect, description: 'Rounded pill', customHtml: '<button style="padding:12px 28px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border:none;border-radius:999px;font-weight:700;cursor:pointer;font-size:14px;">Pill Button</button>' },
      { label: 'Button Group', tag: 'div', icon: BoxSelect, description: 'Grouped buttons', customHtml: '<div style="display:inline-flex;border-radius:10px;overflow:hidden;border:1px solid #e2e8f0;"><button style="padding:10px 20px;background:#fff;border:none;border-right:1px solid #e2e8f0;font-size:13px;font-weight:600;cursor:pointer;color:#334155;">Left</button><button style="padding:10px 20px;background:#6366f1;border:none;border-right:1px solid rgba(255,255,255,0.2);font-size:13px;font-weight:600;cursor:pointer;color:#fff;">Center</button><button style="padding:10px 20px;background:#fff;border:none;font-size:13px;font-weight:600;cursor:pointer;color:#334155;">Right</button></div>' },
      { label: 'Link', tag: 'a', icon: Link2, description: 'Hyperlink' },
      { label: 'Link Arrow', tag: 'a', icon: ArrowRight, description: 'Link with arrow', customHtml: '<a href="#" style="display:inline-flex;align-items:center;gap:6px;color:#6366f1;text-decoration:none;font-size:14px;font-weight:600;">Learn more <span style="font-size:18px;">→</span></a>' },
    ],
  },
  {
    title: 'Form Elements',
    icon: FormInput,
    items: [
      { label: 'Text Input', tag: 'input', icon: FormInput, description: 'Single line input', customHtml: '<input type="text" placeholder="Enter text..." style="padding:12px 16px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px;width:100%;max-width:320px;outline:none;" />' },
      { label: 'Email Input', tag: 'input', icon: Mail, description: 'Email field', customHtml: '<input type="email" placeholder="you@example.com" style="padding:12px 16px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px;width:100%;max-width:320px;outline:none;" />' },
      { label: 'Password Input', tag: 'input', icon: Lock, description: 'Password field', customHtml: '<input type="password" placeholder="••••••••" style="padding:12px 16px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px;width:100%;max-width:320px;outline:none;" />' },
      { label: 'Search Input', tag: 'div', icon: Search, description: 'Search with icon', customHtml: '<div style="position:relative;max-width:320px;"><input type="text" placeholder="Search..." style="padding:12px 16px 12px 40px;border:1px solid #e2e8f0;border-radius:10px;font-size:14px;width:100%;outline:none;" /><span style="position:absolute;left:14px;top:50%;transform:translateY(-50%);color:#94a3b8;font-size:16px;">🔍</span></div>' },
      { label: 'Textarea', tag: 'textarea', icon: FormInput, description: 'Multi-line input', customHtml: '<textarea placeholder="Write something..." rows="3" style="padding:12px 16px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px;width:100%;max-width:400px;outline:none;resize:vertical;"></textarea>' },
      { label: 'Select Dropdown', tag: 'select', icon: ChevronDown, description: 'Dropdown select', customHtml: '<select style="padding:12px 16px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px;width:100%;max-width:320px;outline:none;background:#fff;cursor:pointer;"><option>Select an option</option><option>Option 1</option><option>Option 2</option><option>Option 3</option></select>' },
      { label: 'Checkbox', tag: 'label', icon: CheckSquare, description: 'Check option', customHtml: '<label style="display:flex;align-items:center;gap:10px;cursor:pointer;font-size:14px;color:#334155;"><input type="checkbox" style="width:18px;height:18px;accent-color:#6366f1;cursor:pointer;" /> I agree to the terms</label>' },
      { label: 'Radio Group', tag: 'div', icon: Radio, description: 'Radio options', customHtml: '<div style="display:flex;flex-direction:column;gap:10px;"><label style="display:flex;align-items:center;gap:10px;cursor:pointer;font-size:14px;color:#334155;"><input type="radio" name="radio-group" style="width:18px;height:18px;accent-color:#6366f1;cursor:pointer;" /> Option A</label><label style="display:flex;align-items:center;gap:10px;cursor:pointer;font-size:14px;color:#334155;"><input type="radio" name="radio-group" style="width:18px;height:18px;accent-color:#6366f1;cursor:pointer;" /> Option B</label><label style="display:flex;align-items:center;gap:10px;cursor:pointer;font-size:14px;color:#334155;"><input type="radio" name="radio-group" style="width:18px;height:18px;accent-color:#6366f1;cursor:pointer;" /> Option C</label></div>' },
      { label: 'Toggle Switch', tag: 'label', icon: ToggleLeft, description: 'On/off toggle', customHtml: '<label style="display:flex;align-items:center;gap:12px;cursor:pointer;font-size:14px;color:#334155;"><div style="width:44px;height:24px;background:#6366f1;border-radius:12px;position:relative;"><div style="width:20px;height:20px;background:#fff;border-radius:50%;position:absolute;top:2px;right:2px;box-shadow:0 1px 3px rgba(0,0,0,0.2);"></div></div>Enabled</label>' },
      { label: 'Range Slider', tag: 'input', icon: Sliders, description: 'Slider control', customHtml: '<div style="max-width:320px;"><label style="display:block;font-size:13px;font-weight:600;color:#374151;margin-bottom:8px;">Volume: 75%</label><input type="range" min="0" max="100" value="75" style="width:100%;accent-color:#6366f1;cursor:pointer;" /></div>' },
      { label: 'File Upload', tag: 'div', icon: Upload, description: 'Upload area', customHtml: '<div style="border:2px dashed #e2e8f0;border-radius:12px;padding:32px;text-align:center;cursor:pointer;transition:border-color 0.2s;"><div style="font-size:32px;margin-bottom:12px;">📁</div><p style="font-size:14px;font-weight:600;color:#334155;margin:0 0 4px;">Drop files here or click to upload</p><p style="font-size:12px;color:#94a3b8;margin:0;">PNG, JPG, PDF up to 10MB</p></div>' },
    ],
  },
  {
    title: 'Layout',
    icon: LayoutGrid,
    items: [
      { label: 'Container', tag: 'div', icon: Square, description: 'Generic box' },
      { label: '2 Columns', tag: 'div', icon: Columns, description: 'Two column grid', customHtml: '<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin:16px 0;"><div style="padding:24px;background:rgba(99,102,241,0.06);border-radius:12px;min-height:80px;">Column 1</div><div style="padding:24px;background:rgba(99,102,241,0.06);border-radius:12px;min-height:80px;">Column 2</div></div>' },
      { label: '3 Columns', tag: 'div', icon: Columns, description: 'Three column grid', customHtml: '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px;margin:16px 0;"><div style="padding:24px;background:rgba(99,102,241,0.06);border-radius:12px;min-height:80px;">Col 1</div><div style="padding:24px;background:rgba(99,102,241,0.06);border-radius:12px;min-height:80px;">Col 2</div><div style="padding:24px;background:rgba(99,102,241,0.06);border-radius:12px;min-height:80px;">Col 3</div></div>' },
      { label: '4 Columns', tag: 'div', icon: Grid3X3, description: 'Four column grid', customHtml: '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin:16px 0;"><div style="padding:20px;background:rgba(99,102,241,0.06);border-radius:12px;min-height:60px;text-align:center;">1</div><div style="padding:20px;background:rgba(99,102,241,0.06);border-radius:12px;min-height:60px;text-align:center;">2</div><div style="padding:20px;background:rgba(99,102,241,0.06);border-radius:12px;min-height:60px;text-align:center;">3</div><div style="padding:20px;background:rgba(99,102,241,0.06);border-radius:12px;min-height:60px;text-align:center;">4</div></div>' },
      { label: 'Sidebar Layout', tag: 'div', icon: Sidebar, description: 'Sidebar + content', customHtml: '<div style="display:grid;grid-template-columns:240px 1fr;gap:24px;margin:16px 0;min-height:200px;"><div style="padding:24px;background:rgba(99,102,241,0.06);border-radius:12px;">Sidebar</div><div style="padding:24px;background:rgba(99,102,241,0.03);border-radius:12px;">Main Content</div></div>' },
      { label: 'Flex Row', tag: 'div', icon: AlignJustify, description: 'Horizontal flex', customHtml: '<div style="display:flex;gap:16px;align-items:center;margin:16px 0;"><div style="padding:16px 24px;background:rgba(99,102,241,0.06);border-radius:8px;">Item 1</div><div style="padding:16px 24px;background:rgba(99,102,241,0.06);border-radius:8px;">Item 2</div><div style="padding:16px 24px;background:rgba(99,102,241,0.06);border-radius:8px;">Item 3</div></div>' },
      { label: 'Flex Column', tag: 'div', icon: AlignJustify, description: 'Vertical flex', customHtml: '<div style="display:flex;flex-direction:column;gap:12px;margin:16px 0;"><div style="padding:16px 24px;background:rgba(99,102,241,0.06);border-radius:8px;">Item 1</div><div style="padding:16px 24px;background:rgba(99,102,241,0.06);border-radius:8px;">Item 2</div><div style="padding:16px 24px;background:rgba(99,102,241,0.06);border-radius:8px;">Item 3</div></div>' },
      { label: 'Separator', tag: 'hr', icon: Minus, description: 'Horizontal line' },
      { label: 'Vertical Divider', tag: 'div', icon: Minus, description: 'Vertical line', customHtml: '<div style="width:1px;height:48px;background:#e2e8f0;margin:0 16px;display:inline-block;vertical-align:middle;"></div>' },
      { label: 'Spacer S', tag: 'div', icon: Minus, description: '24px spacing', customHtml: '<div style="height:24px;"></div>' },
      { label: 'Spacer M', tag: 'div', icon: Minus, description: '48px spacing', customHtml: '<div style="height:48px;"></div>' },
      { label: 'Spacer L', tag: 'div', icon: Minus, description: '80px spacing', customHtml: '<div style="height:80px;"></div>' },
    ],
  },
  {
    title: 'Data Display',
    icon: Table2,
    items: [
      { label: 'Unordered List', tag: 'ul', icon: List, description: 'Bulleted list', customHtml: '<ul style="margin:16px 0;padding-left:24px;list-style:disc;"><li style="margin-bottom:8px;">List item one</li><li style="margin-bottom:8px;">List item two</li><li>List item three</li></ul>' },
      { label: 'Ordered List', tag: 'ol', icon: List, description: 'Numbered list', customHtml: '<ol style="margin:16px 0;padding-left:24px;list-style:decimal;"><li style="margin-bottom:8px;">First step</li><li style="margin-bottom:8px;">Second step</li><li>Third step</li></ol>' },
      { label: 'Check List', tag: 'ul', icon: CheckSquare, description: 'Todo-style list', customHtml: '<ul style="margin:16px 0;padding:0;list-style:none;"><li style="display:flex;align-items:center;gap:10px;padding:8px 0;">✅ Completed task</li><li style="display:flex;align-items:center;gap:10px;padding:8px 0;">⬜ Pending task</li><li style="display:flex;align-items:center;gap:10px;padding:8px 0;">⬜ Another task</li></ul>' },
      { label: 'Badge', tag: 'span', icon: StickyNote, description: 'Status label', customHtml: '<span style="display:inline-block;padding:4px 12px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border-radius:20px;font-size:12px;font-weight:700;letter-spacing:0.05em;">Badge</span>' },
      { label: 'Badge Outline', tag: 'span', icon: StickyNote, description: 'Bordered badge', customHtml: '<span style="display:inline-block;padding:4px 12px;border:1.5px solid #6366f1;color:#6366f1;border-radius:20px;font-size:12px;font-weight:700;">Outline</span>' },
      { label: 'Badge Group', tag: 'div', icon: StickyNote, description: 'Multiple badges', customHtml: '<div style="display:flex;flex-wrap:wrap;gap:8px;"><span style="padding:4px 12px;background:#6366f1;color:#fff;border-radius:20px;font-size:12px;font-weight:700;">React</span><span style="padding:4px 12px;background:#f59e0b;color:#fff;border-radius:20px;font-size:12px;font-weight:700;">TypeScript</span><span style="padding:4px 12px;background:#10b981;color:#fff;border-radius:20px;font-size:12px;font-weight:700;">Tailwind</span></div>' },
      { label: 'Table', tag: 'table', icon: Table2, description: 'Data table', customHtml: '<table style="width:100%;border-collapse:collapse;margin:16px 0;"><thead><tr style="border-bottom:2px solid #e2e8f0;"><th style="padding:12px 16px;text-align:left;font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;">Name</th><th style="padding:12px 16px;text-align:left;font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;">Email</th><th style="padding:12px 16px;text-align:left;font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;">Role</th></tr></thead><tbody><tr style="border-bottom:1px solid #f1f5f9;"><td style="padding:12px 16px;font-size:14px;color:#0f172a;">John Doe</td><td style="padding:12px 16px;font-size:14px;color:#64748b;">john@example.com</td><td style="padding:12px 16px;"><span style="padding:2px 10px;background:rgba(99,102,241,0.1);color:#6366f1;border-radius:12px;font-size:12px;font-weight:600;">Admin</span></td></tr><tr style="border-bottom:1px solid #f1f5f9;"><td style="padding:12px 16px;font-size:14px;color:#0f172a;">Jane Smith</td><td style="padding:12px 16px;font-size:14px;color:#64748b;">jane@example.com</td><td style="padding:12px 16px;"><span style="padding:2px 10px;background:rgba(16,185,129,0.1);color:#059669;border-radius:12px;font-size:12px;font-weight:600;">User</span></td></tr></tbody></table>' },
      { label: 'Stat Number', tag: 'div', icon: Hash, description: 'Large statistic', customHtml: '<div style="text-align:center;padding:24px;"><div style="font-size:48px;font-weight:900;color:#0f172a;letter-spacing:-0.02em;">2,847</div><div style="font-size:14px;color:#64748b;margin-top:4px;">Total Users</div></div>' },
      { label: 'Progress Bar', tag: 'div', icon: Loader2, description: 'Percentage bar', customHtml: '<div style="margin:16px 0;"><div style="display:flex;justify-content:space-between;margin-bottom:8px;"><span style="font-size:13px;font-weight:600;color:#334155;">Progress</span><span style="font-size:13px;font-weight:700;color:#6366f1;">75%</span></div><div style="width:100%;height:8px;background:#e2e8f0;border-radius:999px;overflow:hidden;"><div style="width:75%;height:100%;background:linear-gradient(90deg,#6366f1,#8b5cf6);border-radius:999px;"></div></div></div>' },
      { label: 'Rating Stars', tag: 'div', icon: Star, description: '5-star rating', customHtml: '<div style="display:flex;gap:4px;color:#f59e0b;font-size:20px;">★★★★☆</div>' },
      { label: 'Steps/Timeline', tag: 'div', icon: Activity, description: 'Process steps', customHtml: '<div style="display:flex;flex-direction:column;gap:0;margin:16px 0;"><div style="display:flex;gap:16px;"><div style="display:flex;flex-direction:column;align-items:center;"><div style="width:32px;height:32px;background:#6366f1;color:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;">1</div><div style="width:2px;height:32px;background:#e2e8f0;"></div></div><div style="padding-bottom:24px;"><div style="font-size:14px;font-weight:700;color:#0f172a;">Step One</div><div style="font-size:13px;color:#64748b;">Description of the first step</div></div></div><div style="display:flex;gap:16px;"><div style="display:flex;flex-direction:column;align-items:center;"><div style="width:32px;height:32px;background:#e2e8f0;color:#64748b;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;">2</div><div style="width:2px;height:32px;background:#e2e8f0;"></div></div><div style="padding-bottom:24px;"><div style="font-size:14px;font-weight:700;color:#0f172a;">Step Two</div><div style="font-size:13px;color:#64748b;">Description of the second step</div></div></div><div style="display:flex;gap:16px;"><div style="display:flex;flex-direction:column;align-items:center;"><div style="width:32px;height:32px;background:#e2e8f0;color:#64748b;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;">3</div></div><div><div style="font-size:14px;font-weight:700;color:#0f172a;">Step Three</div><div style="font-size:13px;color:#64748b;">Description of the third step</div></div></div></div>' },
    ],
  },
  {
    title: 'Feedback',
    icon: AlertTriangle,
    items: [
      { label: 'Alert Info', tag: 'div', icon: Info, description: 'Info message', customHtml: '<div style="display:flex;align-items:flex-start;gap:12px;padding:16px;background:rgba(59,130,246,0.08);border:1px solid rgba(59,130,246,0.2);border-radius:12px;margin:16px 0;"><span style="font-size:18px;">ℹ️</span><div><div style="font-size:14px;font-weight:700;color:#1e40af;">Information</div><div style="font-size:13px;color:#3b82f6;margin-top:2px;">This is an informational message.</div></div></div>' },
      { label: 'Alert Success', tag: 'div', icon: CheckCircle2, description: 'Success message', customHtml: '<div style="display:flex;align-items:flex-start;gap:12px;padding:16px;background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.2);border-radius:12px;margin:16px 0;"><span style="font-size:18px;">✅</span><div><div style="font-size:14px;font-weight:700;color:#065f46;">Success</div><div style="font-size:13px;color:#059669;margin-top:2px;">Operation completed successfully.</div></div></div>' },
      { label: 'Alert Warning', tag: 'div', icon: AlertTriangle, description: 'Warning message', customHtml: '<div style="display:flex;align-items:flex-start;gap:12px;padding:16px;background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.2);border-radius:12px;margin:16px 0;"><span style="font-size:18px;">⚠️</span><div><div style="font-size:14px;font-weight:700;color:#92400e;">Warning</div><div style="font-size:13px;color:#d97706;margin-top:2px;">Please review before proceeding.</div></div></div>' },
      { label: 'Alert Error', tag: 'div', icon: XCircle, description: 'Error message', customHtml: '<div style="display:flex;align-items:flex-start;gap:12px;padding:16px;background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2);border-radius:12px;margin:16px 0;"><span style="font-size:18px;">❌</span><div><div style="font-size:14px;font-weight:700;color:#991b1b;">Error</div><div style="font-size:13px;color:#ef4444;margin-top:2px;">Something went wrong. Please try again.</div></div></div>' },
      { label: 'Toast', tag: 'div', icon: Bell, description: 'Notification toast', customHtml: '<div style="display:flex;align-items:center;gap:12px;padding:14px 20px;background:#0f172a;color:#fff;border-radius:12px;max-width:360px;box-shadow:0 20px 40px rgba(0,0,0,0.15);margin:16px 0;"><span style="font-size:16px;">🔔</span><div style="flex:1;"><div style="font-size:13px;font-weight:600;">New notification</div><div style="font-size:12px;color:rgba(255,255,255,0.6);">You have a new message</div></div><span style="font-size:16px;cursor:pointer;color:rgba(255,255,255,0.4);">✕</span></div>' },
      { label: 'Tooltip', tag: 'div', icon: Info, description: 'Tooltip popup', customHtml: '<div style="position:relative;display:inline-block;"><div style="padding:8px 16px;background:#0f172a;color:#fff;border-radius:8px;font-size:12px;font-weight:500;box-shadow:0 4px 12px rgba(0,0,0,0.15);">Helpful tooltip text</div><div style="position:absolute;bottom:-6px;left:50%;transform:translateX(-50%);width:12px;height:12px;background:#0f172a;transform:translateX(-50%) rotate(45deg);"></div></div>' },
    ],
  },
  {
    title: 'Cards & Containers',
    icon: CreditCard,
    items: [
      { label: 'Card Basic', tag: 'div', icon: CreditCard, description: 'Simple card', customHtml: '<div style="padding:24px;background:#fff;border:1px solid #e2e8f0;border-radius:16px;margin:16px 0;"><h3 style="font-size:18px;font-weight:700;margin:0 0 8px;color:#0f172a;">Card Title</h3><p style="font-size:14px;color:#64748b;line-height:1.6;margin:0;">Card description text goes here with supporting details.</p></div>' },
      { label: 'Card with Image', tag: 'div', icon: CreditCard, description: 'Image + content', customHtml: '<div style="background:#fff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;margin:16px 0;max-width:360px;"><div style="aspect-ratio:16/9;background:linear-gradient(135deg,#e0e7ff,#c7d2fe);"></div><div style="padding:20px;"><h3 style="font-size:16px;font-weight:700;margin:0 0 8px;color:#0f172a;">Card Title</h3><p style="font-size:14px;color:#64748b;line-height:1.5;margin:0 0 16px;">Brief description of the card content.</p><button style="padding:10px 20px;background:#6366f1;color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;">Read More</button></div></div>' },
      { label: 'Card Hover', tag: 'div', icon: CreditCard, description: 'Elevated card', customHtml: '<div style="padding:28px;background:#fff;border:1px solid #e2e8f0;border-radius:16px;margin:16px 0;box-shadow:0 4px 6px -1px rgba(0,0,0,0.05);transition:box-shadow 0.2s;"><div style="width:48px;height:48px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:12px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:20px;margin-bottom:16px;">⚡</div><h3 style="font-size:18px;font-weight:700;margin:0 0 8px;color:#0f172a;">Feature Card</h3><p style="font-size:14px;color:#64748b;line-height:1.6;margin:0;">Hover-ready card with icon and description.</p></div>' },
      { label: 'Glass Card', tag: 'div', icon: CreditCard, description: 'Glassmorphism', customHtml: '<div style="padding:28px;background:rgba(255,255,255,0.6);backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,0.3);border-radius:20px;margin:16px 0;box-shadow:0 8px 32px rgba(0,0,0,0.08);"><h3 style="font-size:18px;font-weight:700;margin:0 0 8px;color:#0f172a;">Glass Card</h3><p style="font-size:14px;color:#64748b;line-height:1.6;margin:0;">A frosted-glass style container.</p></div>' },
      { label: 'Gradient Card', tag: 'div', icon: Palette, description: 'Gradient background', customHtml: '<div style="padding:32px;background:linear-gradient(135deg,#6366f1,#8b5cf6,#a78bfa);border-radius:20px;margin:16px 0;color:#fff;"><h3 style="font-size:20px;font-weight:800;margin:0 0 8px;">Gradient Card</h3><p style="font-size:14px;color:rgba(255,255,255,0.8);line-height:1.6;margin:0;">Beautiful gradient background container.</p></div>' },
      { label: 'Accordion Item', tag: 'div', icon: ChevronDown, description: 'Expandable section', customHtml: '<div style="border:1px solid #e2e8f0;border-radius:12px;margin:8px 0;overflow:hidden;"><button style="width:100%;display:flex;justify-content:space-between;align-items:center;padding:16px 20px;background:#fff;border:none;cursor:pointer;font-size:15px;font-weight:600;color:#0f172a;">Accordion Title <span style="color:#94a3b8;">▼</span></button><div style="padding:0 20px 16px;font-size:14px;color:#64748b;line-height:1.6;">Accordion content goes here. This section can be expanded or collapsed.</div></div>' },
      { label: 'Tabs', tag: 'div', icon: PanelTop, description: 'Tab navigation', customHtml: '<div style="margin:16px 0;"><div style="display:flex;border-bottom:2px solid #e2e8f0;"><button style="padding:12px 20px;border:none;background:none;font-size:14px;font-weight:700;color:#6366f1;border-bottom:2px solid #6366f1;margin-bottom:-2px;cursor:pointer;">Tab 1</button><button style="padding:12px 20px;border:none;background:none;font-size:14px;font-weight:600;color:#94a3b8;cursor:pointer;">Tab 2</button><button style="padding:12px 20px;border:none;background:none;font-size:14px;font-weight:600;color:#94a3b8;cursor:pointer;">Tab 3</button></div><div style="padding:20px 0;font-size:14px;color:#334155;">Tab 1 content goes here.</div></div>' },
      { label: 'Modal/Dialog', tag: 'div', icon: Maximize2, description: 'Dialog overlay', customHtml: '<div style="padding:32px;background:#fff;border-radius:20px;box-shadow:0 25px 50px rgba(0,0,0,0.15);max-width:440px;margin:16px 0;"><h2 style="font-size:20px;font-weight:800;margin:0 0 8px;color:#0f172a;">Dialog Title</h2><p style="font-size:14px;color:#64748b;line-height:1.6;margin:0 0 24px;">Are you sure you want to continue? This action cannot be undone.</p><div style="display:flex;gap:12px;justify-content:flex-end;"><button style="padding:10px 20px;background:#f1f5f9;color:#334155;border:none;border-radius:8px;font-weight:600;font-size:14px;cursor:pointer;">Cancel</button><button style="padding:10px 20px;background:#ef4444;color:#fff;border:none;border-radius:8px;font-weight:600;font-size:14px;cursor:pointer;">Delete</button></div></div>' },
    ],
  },
  {
    title: 'Social & Misc',
    icon: Heart,
    items: [
      { label: 'Social Icons', tag: 'div', icon: Share2, description: 'Social media links', customHtml: '<div style="display:flex;gap:12px;"><div style="width:40px;height:40px;background:#1DA1F2;border-radius:10px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:16px;cursor:pointer;">𝕏</div><div style="width:40px;height:40px;background:#0A66C2;border-radius:10px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:16px;cursor:pointer;">in</div><div style="width:40px;height:40px;background:#333;border-radius:10px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:16px;cursor:pointer;">⌘</div><div style="width:40px;height:40px;background:#E4405F;border-radius:10px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:16px;cursor:pointer;">📷</div></div>' },
      { label: 'Like Button', tag: 'button', icon: Heart, description: 'Heart/like action', customHtml: '<button style="display:inline-flex;align-items:center;gap:8px;padding:10px 20px;background:rgba(239,68,68,0.08);color:#ef4444;border:1px solid rgba(239,68,68,0.2);border-radius:999px;font-size:14px;font-weight:600;cursor:pointer;">❤️ 142</button>' },
      { label: 'Share Button', tag: 'button', icon: Share2, description: 'Share action', customHtml: '<button style="display:inline-flex;align-items:center;gap:8px;padding:10px 20px;background:rgba(99,102,241,0.08);color:#6366f1;border:1px solid rgba(99,102,241,0.2);border-radius:999px;font-size:14px;font-weight:600;cursor:pointer;">↗ Share</button>' },
      { label: 'Bookmark Button', tag: 'button', icon: Bookmark, description: 'Save/bookmark', customHtml: '<button style="display:inline-flex;align-items:center;gap:8px;padding:10px 20px;background:rgba(245,158,11,0.08);color:#f59e0b;border:1px solid rgba(245,158,11,0.2);border-radius:999px;font-size:14px;font-weight:600;cursor:pointer;">🔖 Save</button>' },
      { label: 'Breadcrumb', tag: 'nav', icon: ChevronRight, description: 'Navigation trail', customHtml: '<nav style="display:flex;align-items:center;gap:8px;font-size:13px;margin:16px 0;"><a href="#" style="color:#6366f1;text-decoration:none;font-weight:500;">Home</a><span style="color:#cbd5e1;">›</span><a href="#" style="color:#6366f1;text-decoration:none;font-weight:500;">Products</a><span style="color:#cbd5e1;">›</span><span style="color:#64748b;">Current Page</span></nav>' },
      { label: 'Pagination', tag: 'div', icon: BarChart3, description: 'Page navigation', customHtml: '<div style="display:flex;gap:4px;align-items:center;margin:16px 0;"><button style="padding:8px 12px;background:#fff;border:1px solid #e2e8f0;border-radius:8px;font-size:13px;color:#64748b;cursor:pointer;">←</button><button style="padding:8px 14px;background:#6366f1;border:none;border-radius:8px;font-size:13px;color:#fff;font-weight:600;cursor:pointer;">1</button><button style="padding:8px 14px;background:#fff;border:1px solid #e2e8f0;border-radius:8px;font-size:13px;color:#64748b;cursor:pointer;">2</button><button style="padding:8px 14px;background:#fff;border:1px solid #e2e8f0;border-radius:8px;font-size:13px;color:#64748b;cursor:pointer;">3</button><button style="padding:8px 12px;background:#fff;border:1px solid #e2e8f0;border-radius:8px;font-size:13px;color:#64748b;cursor:pointer;">→</button></div>' },
      { label: 'Chip/Tag', tag: 'div', icon: Tag, description: 'Removable tag', customHtml: '<div style="display:inline-flex;align-items:center;gap:6px;padding:6px 14px;background:#f1f5f9;border-radius:999px;font-size:13px;font-weight:500;color:#334155;">Design <span style="cursor:pointer;color:#94a3b8;font-size:16px;">×</span></div>' },
      { label: 'Countdown', tag: 'div', icon: Clock, description: 'Timer display', customHtml: '<div style="display:flex;gap:12px;text-align:center;"><div><div style="font-size:36px;font-weight:900;color:#0f172a;background:#f1f5f9;padding:12px 16px;border-radius:12px;min-width:60px;">12</div><div style="font-size:11px;color:#94a3b8;margin-top:6px;font-weight:600;">DAYS</div></div><div><div style="font-size:36px;font-weight:900;color:#0f172a;background:#f1f5f9;padding:12px 16px;border-radius:12px;min-width:60px;">08</div><div style="font-size:11px;color:#94a3b8;margin-top:6px;font-weight:600;">HOURS</div></div><div><div style="font-size:36px;font-weight:900;color:#0f172a;background:#f1f5f9;padding:12px 16px;border-radius:12px;min-width:60px;">45</div><div style="font-size:11px;color:#94a3b8;margin-top:6px;font-weight:600;">MINS</div></div><div><div style="font-size:36px;font-weight:900;color:#0f172a;background:#f1f5f9;padding:12px 16px;border-radius:12px;min-width:60px;">23</div><div style="font-size:11px;color:#94a3b8;margin-top:6px;font-weight:600;">SECS</div></div></div>' },
      { label: 'Divider Text', tag: 'div', icon: Minus, description: 'Line with text', customHtml: '<div style="display:flex;align-items:center;gap:16px;margin:24px 0;"><div style="flex:1;height:1px;background:#e2e8f0;"></div><span style="font-size:12px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:0.1em;">Or continue with</span><div style="flex:1;height:1px;background:#e2e8f0;"></div></div>' },
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
      {
        label: 'Hero Gradient',
        description: 'Full gradient with floating shapes',
        icon: Sparkles,
        html: `<section style="padding:100px 24px;text-align:center;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:#fff;border-radius:16px;margin:16px 0;position:relative;overflow:hidden;">
  <div style="position:absolute;top:20%;left:10%;width:120px;height:120px;background:rgba(255,255,255,0.08);border-radius:50%;"></div>
  <div style="position:absolute;bottom:15%;right:15%;width:200px;height:200px;background:rgba(255,255,255,0.05);border-radius:50%;"></div>
  <span style="display:inline-block;padding:6px 16px;background:rgba(255,255,255,0.15);border-radius:999px;font-size:13px;font-weight:600;margin-bottom:20px;backdrop-filter:blur(4px);">✨ Introducing v2.0</span>
  <h1 style="font-size:56px;font-weight:900;margin:0 0 20px;letter-spacing:-0.03em;position:relative;">Design Without Limits</h1>
  <p style="font-size:18px;color:rgba(255,255,255,0.75);max-width:500px;margin:0 auto 36px;line-height:1.7;position:relative;">The most powerful visual builder for modern web applications.</p>
  <button style="padding:16px 36px;background:#fff;color:#764ba2;border:none;border-radius:12px;font-weight:800;font-size:16px;cursor:pointer;box-shadow:0 8px 24px rgba(0,0,0,0.15);position:relative;">Get Started Free</button>
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
      {
        label: 'Stats Section',
        description: '4-column statistics',
        icon: TrendingUp,
        html: `<section style="padding:48px 32px;background:#0f172a;border-radius:16px;margin:16px 0;">
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:24px;text-align:center;">
    <div><div style="font-size:42px;font-weight:900;color:#fff;">10K+</div><div style="font-size:14px;color:rgba(255,255,255,0.5);margin-top:4px;">Active Users</div></div>
    <div><div style="font-size:42px;font-weight:900;color:#fff;">99.9%</div><div style="font-size:14px;color:rgba(255,255,255,0.5);margin-top:4px;">Uptime</div></div>
    <div><div style="font-size:42px;font-weight:900;color:#fff;">50M+</div><div style="font-size:14px;color:rgba(255,255,255,0.5);margin-top:4px;">API Calls</div></div>
    <div><div style="font-size:42px;font-weight:900;color:#fff;">24/7</div><div style="font-size:14px;color:rgba(255,255,255,0.5);margin-top:4px;">Support</div></div>
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
        label: 'FAQ Section',
        description: 'Questions & answers',
        icon: Info,
        html: `<section style="padding:64px 32px;margin:16px 0;max-width:680px;">
  <h2 style="font-size:32px;font-weight:800;margin:0 0 8px;color:#0f172a;">Frequently Asked Questions</h2>
  <p style="font-size:16px;color:#64748b;margin:0 0 36px;">Everything you need to know about our platform.</p>
  <div style="display:flex;flex-direction:column;gap:12px;">
    <div style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;"><div style="padding:18px 20px;font-size:15px;font-weight:600;color:#0f172a;display:flex;justify-content:space-between;cursor:pointer;">What is your refund policy? <span style="color:#94a3b8;">+</span></div><div style="padding:0 20px 18px;font-size:14px;color:#64748b;line-height:1.6;">We offer a 30-day money-back guarantee. No questions asked.</div></div>
    <div style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;"><div style="padding:18px 20px;font-size:15px;font-weight:600;color:#0f172a;display:flex;justify-content:space-between;cursor:pointer;">Can I cancel anytime? <span style="color:#94a3b8;">+</span></div><div style="padding:0 20px 18px;font-size:14px;color:#64748b;line-height:1.6;">Yes! You can cancel your subscription at any time from your account settings.</div></div>
    <div style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;"><div style="padding:18px 20px;font-size:15px;font-weight:600;color:#0f172a;display:flex;justify-content:space-between;cursor:pointer;">Do you offer team plans? <span style="color:#94a3b8;">+</span></div><div style="padding:0 20px 18px;font-size:14px;color:#64748b;line-height:1.6;">Yes, we have team and enterprise plans. Contact us for custom pricing.</div></div>
  </div>
</section>`,
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
        label: 'Contact Form',
        description: 'Full contact form',
        icon: Mail,
        html: `<section style="padding:48px 32px;margin:16px 0;max-width:520px;">
  <h2 style="font-size:28px;font-weight:800;margin:0 0 8px;color:#0f172a;">Send us a Message</h2>
  <p style="font-size:14px;color:#64748b;margin:0 0 28px;">We'll get back to you within 24 hours.</p>
  <form style="display:flex;flex-direction:column;gap:16px;">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
      <div><label style="display:block;font-size:13px;font-weight:600;color:#374151;margin-bottom:6px;">First Name</label><input type="text" placeholder="John" style="width:100%;padding:12px 16px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px;outline:none;" /></div>
      <div><label style="display:block;font-size:13px;font-weight:600;color:#374151;margin-bottom:6px;">Last Name</label><input type="text" placeholder="Doe" style="width:100%;padding:12px 16px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px;outline:none;" /></div>
    </div>
    <div><label style="display:block;font-size:13px;font-weight:600;color:#374151;margin-bottom:6px;">Email</label><input type="email" placeholder="john@example.com" style="width:100%;padding:12px 16px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px;outline:none;" /></div>
    <div><label style="display:block;font-size:13px;font-weight:600;color:#374151;margin-bottom:6px;">Message</label><textarea rows="4" placeholder="Tell us about your project..." style="width:100%;padding:12px 16px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px;outline:none;resize:vertical;"></textarea></div>
    <button style="padding:14px;background:#6366f1;color:#fff;border:none;border-radius:10px;font-weight:700;font-size:15px;cursor:pointer;">Send Message</button>
  </form>
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
      {
        label: 'Navbar Dark',
        description: 'Dark theme navbar',
        icon: Navigation,
        html: `<nav style="display:flex;align-items:center;justify-content:space-between;padding:16px 32px;background:#0f172a;border-radius:12px;margin:16px 0;">
  <span style="font-size:20px;font-weight:900;color:#fff;">Brand</span>
  <div style="display:flex;gap:28px;align-items:center;">
    <a href="#" style="font-size:14px;color:rgba(255,255,255,0.65);text-decoration:none;font-weight:500;">Features</a>
    <a href="#" style="font-size:14px;color:rgba(255,255,255,0.65);text-decoration:none;font-weight:500;">Pricing</a>
    <a href="#" style="font-size:14px;color:rgba(255,255,255,0.65);text-decoration:none;font-weight:500;">About</a>
    <button style="padding:10px 20px;background:#6366f1;color:#fff;border:none;border-radius:8px;font-weight:600;font-size:14px;cursor:pointer;">Sign Up</button>
  </div>
</nav>`,
      },
    ],
  },
  {
    category: 'Login & Auth',
    items: [
      {
        label: 'Login Form',
        description: 'Email & password login',
        icon: Lock,
        html: `<div style="max-width:400px;margin:32px auto;padding:40px;background:#fff;border:1px solid #e2e8f0;border-radius:20px;box-shadow:0 4px 6px rgba(0,0,0,0.04);">
  <div style="text-align:center;margin-bottom:32px;">
    <div style="width:48px;height:48px;background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:14px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:20px;margin:0 auto 16px;">🔐</div>
    <h2 style="font-size:24px;font-weight:800;margin:0 0 4px;color:#0f172a;">Welcome back</h2>
    <p style="font-size:14px;color:#64748b;margin:0;">Sign in to your account</p>
  </div>
  <form style="display:flex;flex-direction:column;gap:16px;">
    <div><label style="display:block;font-size:13px;font-weight:600;color:#374151;margin-bottom:6px;">Email</label><input type="email" placeholder="you@example.com" style="width:100%;padding:12px 16px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px;outline:none;" /></div>
    <div><label style="display:block;font-size:13px;font-weight:600;color:#374151;margin-bottom:6px;">Password</label><input type="password" placeholder="••••••••" style="width:100%;padding:12px 16px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px;outline:none;" /></div>
    <div style="display:flex;justify-content:space-between;align-items:center;"><label style="display:flex;align-items:center;gap:8px;font-size:13px;color:#64748b;cursor:pointer;"><input type="checkbox" style="accent-color:#6366f1;" /> Remember me</label><a href="#" style="font-size:13px;color:#6366f1;text-decoration:none;font-weight:500;">Forgot password?</a></div>
    <button style="padding:14px;background:#6366f1;color:#fff;border:none;border-radius:10px;font-weight:700;font-size:15px;cursor:pointer;">Sign In</button>
  </form>
  <div style="display:flex;align-items:center;gap:16px;margin:24px 0;"><div style="flex:1;height:1px;background:#e2e8f0;"></div><span style="font-size:12px;color:#94a3b8;">OR</span><div style="flex:1;height:1px;background:#e2e8f0;"></div></div>
  <button style="width:100%;padding:12px;background:#fff;border:1px solid #e2e8f0;border-radius:10px;font-size:14px;font-weight:600;color:#334155;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;">🌐 Continue with Google</button>
  <p style="text-align:center;font-size:13px;color:#64748b;margin:20px 0 0;">Don't have an account? <a href="#" style="color:#6366f1;text-decoration:none;font-weight:600;">Sign up</a></p>
</div>`,
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
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('application/ve-element', JSON.stringify({ tag: item.tag, customHtml: item.customHtml || '' }));
                      e.dataTransfer.effectAllowed = 'copy';
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-secondary/80 transition-all group text-left cursor-grab active:cursor-grabbing"
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
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('application/ve-element', JSON.stringify({ tag: 'template', customHtml: item.html }));
                      e.dataTransfer.effectAllowed = 'copy';
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg hover:bg-secondary/80 transition-all group text-left cursor-grab active:cursor-grabbing"
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
