import { useState, useEffect, useRef } from 'react';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { ToggleSwitch } from '../components/ui/ToggleSwitch';
import { Icons } from '../components/ui/Icons';
import { UNIT_OPTIONS } from '../data/unitOptions';
import { HARDWARE_DB } from '../data/hardwareDB';
import { calculateVehicle } from '../utils/vehicleCalculator';
import { getGSTByCategory } from '../api/apiClient';
import { VendorQueryModal } from '../components/modals/VendorQueryModal';

// ── Category dropdown options (fixed + custom allowed) ───────
// ── Category autocomplete options ────────────────────────────
const CATEGORY_OPTIONS = [
  'Sand', 'Cement', 'Steel', 'PVC Pipe', 'Blue Metal', 'Blue Metal (Jalli)',
  'Construction', 'Flooring', 'Fittings', 'Hardware', 'Painting',
  'Interior', 'Carpentry', 'Electrical', 'Plumbing', 'Sanitary',
  'Gravel', 'Bricks', 'Paint', 'Sanitary',
];

// ── Heavy categories → auto self-delivery ────────────────────
const HEAVY_CATEGORIES = ['sand', 'pvc pipe', 'steel', 'blue metal', 'blue metal (jalli)'];
const isHeavyCategory  = (cat) => HEAVY_CATEGORIES.includes((cat || '').trim().toLowerCase());
const MAX_PRODUCT_IMAGE_SIZE_BYTES = 2 * 1024 * 1024;

// ── Category → HSN auto-fill map (first match per category) ──
const CATEGORY_HSN_MAP = HARDWARE_DB.reduce((acc, item) => {
  const key = item.category.toLowerCase();
  if (!acc[key]) acc[key] = item.hsn;
  return acc;
}, {});

const getHSNForCategory = (cat) =>
  cat ? (CATEGORY_HSN_MAP[cat.trim().toLowerCase()] || '') : '';

// ── Word-count helper ─────────────────────────────────────────
const countWords = (text) => text.trim() === '' ? 0 : text.trim().split(/\s+/).length;

// ── Vehicle animation ─────────────────────────────────────────
const VehicleAnim = ({ suggestion }) => {
  if (!suggestion) return null;
  let animClass, color, icon;
  if (suggestion.includes('Two Wheeler')) {
    animClass = 'vehicle-anim-bike'; color = 'text-orange-500';
    icon = <svg viewBox="0 0 100 60" className="w-24 h-24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="20" cy="45" r="12"/><circle cx="80" cy="45" r="12"/><circle cx="20" cy="45" r="4" fill="currentColor"/><circle cx="80" cy="45" r="4" fill="currentColor"/><path d="M20 45 L45 45 L60 25 L80 45"/><path d="M45 45 L40 25 L25 25 L35 15"/><path d="M60 25 L75 15"/><path d="M45 25 L65 25" strokeWidth="3"/></svg>;
  } else if (suggestion.includes('3-Wheeler')) {
    animClass = 'vehicle-anim-auto'; color = 'text-yellow-500';
    icon = <svg viewBox="0 0 100 60" className="w-24 h-24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M60 50 L60 20 L75 20 L88 35 L88 50 Z"/><rect x="12" y="25" width="48" height="25" rx="1"/><circle cx="25" cy="50" r="7" strokeWidth="2.5"/><circle cx="75" cy="50" r="7" strokeWidth="2.5"/></svg>;
  } else {
    animClass = 'vehicle-anim-truck'; color = 'text-blue-500';
    icon = <svg viewBox="0 0 100 60" className="w-32 h-24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="25" cy="52" r="7"/><circle cx="40" cy="52" r="7"/><circle cx="80" cy="52" r="7"/><rect x="5" y="15" width="50" height="30" rx="2"/><path d="M55 45 L90 45 L90 25 L75 15 L55 15"/><path d="M75 15 L75 45"/></svg>;
  }
  return (
    <div className={`mt-4 flex flex-col justify-center items-center h-40 overflow-hidden bg-white dark:bg-slate-950 rounded-2xl border-2 border-dashed border-gray-200 dark:border-slate-800 ${color} relative shadow-inner`}>
      <div className={`scale-150 transform origin-center ${animClass}`}>{icon}</div>
      <div className="mt-4 text-xs font-bold uppercase tracking-widest opacity-60">{suggestion}</div>
    </div>
  );
};

// ── Heavy-material popup ──────────────────────────────────────
const HeavyMaterialPopup = ({ onClose }) => (
  <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 pointer-events-none">
    <div className="pointer-events-auto bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-blue-200 dark:border-blue-900 max-w-xs w-full p-6 text-center fade-in">
      <div className="text-3xl mb-3">🚛</div>
      <h3 className="font-bold text-gray-900 dark:text-white text-sm mb-1">Self Delivery Enabled</h3>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
        Self delivery enabled automatically for heavy-material category.
      </p>
      <button onClick={onClose}
        className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2.5 rounded-xl text-sm transition active:scale-95">
        Got it
      </button>
    </div>
  </div>
);

// ── Word counter badge ────────────────────────────────────────
const WordCounter = ({ count, max }) => {
  const over = count > max;
  return (
    <span className={`text-[10px] font-bold tabular-nums ${over ? 'text-red-500' : count >= max * 0.85 ? 'text-orange-400' : 'text-gray-400'}`}>
      {count} / {max} words{over ? ' — limit exceeded' : ''}
    </span>
  );
};

// ── Category field: dropdown + custom text input ──────────────
// ── Category field: text input with autocomplete ──────────────
const CategoryField = ({ value, onChange }) => {
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);

  const handleChange = (e) => {
    const v = e.target.value;
    onChange(v);
    if (v.trim()) {
      const filtered = CATEGORY_OPTIONS.filter(c =>
        c.toLowerCase().startsWith(v.trim().toLowerCase())
      );
      setSuggestions(filtered);
      setOpen(filtered.length > 0);
    } else {
      setSuggestions([]);
      setOpen(false);
    }
  };

  const handleSelect = (cat) => {
    onChange(cat);
    setSuggestions([]);
    setOpen(false);
  };

  return (
    <div className="space-y-1.5 relative">
      <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
        Category
      </label>
      <input
        type="text"
        value={value}
        onChange={handleChange}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onFocus={() => {
          if (value.trim()) {
            const filtered = CATEGORY_OPTIONS.filter(c =>
              c.toLowerCase().startsWith(value.trim().toLowerCase())
            );
            if (filtered.length) { setSuggestions(filtered); setOpen(true); }
          }
        }}
        placeholder="Start typing: Sand, Cement, Steel..."
        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-[#0ceded] focus:ring-2 focus:ring-[#0ceded]/20 dark:border-slate-800 dark:bg-slate-900 dark:text-white transition-all"
      />
      {open && suggestions.length > 0 && (
        <div className="absolute z-50 w-full bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl shadow-xl mt-1 max-h-48 overflow-y-auto">
          {suggestions.map((cat, i) => (
            <div key={i} onMouseDown={() => handleSelect(cat)}
              className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-700 cursor-pointer text-sm border-b border-gray-50 dark:border-slate-700 last:border-0 dark:text-white">
              {cat}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
const ProductForm = ({ onSave, editingProduct, onCancel, notify }) => {
  const blank = {
    brand: '', name: '', description: '', detailedDescription: '',
    productQuality: '', warranty: '',
    category: '', mrp: '', price: '', stock: '',
    length: '', width: '', height: '', weight: '',
    hsn: '', unit: 'pcs', isBulk: false, bulkDiscount: '',
    selfDelivery: false, active: true, images: [],
  };

  const [form, setForm] = useState(
    editingProduct
      ? {
          ...editingProduct,
          productQuality:      editingProduct.productQuality      || '',
          detailedDescription: editingProduct.detailedDescription || '',
          warranty:            editingProduct.warranty            || '',
          mrp:                 editingProduct.mrp ?? editingProduct.unitPrice ?? '',
        }
      : blank
  );

  const [vehicle,        setVehicle]        = useState('');
  const [preview,        setPreview]        = useState(null);
  const [showQuery,      setShowQuery]      = useState(false);
  const [showHeavyPopup, setShowHeavyPopup] = useState(false);
  const [gstPercent,     setGstPercent]     = useState(editingProduct?.gstPercent ?? 18);
  const gstFetchTimeout = useRef(null);

  // ── Derived word counts ───────────────────────────────────
  const descWords   = countWords(form.description);
  const detailWords = countWords(form.detailedDescription);
  const DESC_MAX    = 30;
  const DETAIL_MAX  = 200;

  // ── Vehicle prediction ────────────────────────────────────
  useEffect(() => {
    setVehicle(calculateVehicle(form.length || 0, form.width || 0, form.height || 0, form.weight || 0));
  }, [form.length, form.width, form.height, form.weight]);

  // ── GST auto-fetch on category change ────────────────────
  useEffect(() => {
    if (!form.category) { setGstPercent(18); return; }
    clearTimeout(gstFetchTimeout.current);
    gstFetchTimeout.current = setTimeout(() => {
      getGSTByCategory(form.category)
        .then(res => setGstPercent(res.data.gst_rate || 18))
        .catch(() => setGstPercent(18));
    }, 300);
    return () => clearTimeout(gstFetchTimeout.current);
  }, [form.category]);

  // ── Auto-fill HSN + silently set name from category ──────────
  useEffect(() => {
    if (!form.category) return;
    const hsn = getHSNForCategory(form.category);
    setForm(f => ({
      ...f,
      hsn:  hsn || f.hsn,          // auto-fill only if we have a match; keep manual if not
      name: form.category,         // silently keep name = category for backend
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.category]);

  // ── Auto self-delivery for heavy categories ───────────────
  const prevCategoryRef = useRef(form.category);
  useEffect(() => {
    const categoryCleared = prevCategoryRef.current && !form.category;
    if (categoryCleared) {
      setForm(f => ({ ...f, selfDelivery: false }));
    }
    if (isHeavyCategory(form.category) && !form.selfDelivery) {
      setForm(f => ({ ...f, selfDelivery: true }));
      setShowHeavyPopup(true);
    }
    prevCategoryRef.current = form.category;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.category]);

  // ── Computed prices ───────────────────────────────────────
  const sellingPrice = parseFloat(form.price) || 0;
  const gstAmount    = (sellingPrice * gstPercent) / 100;
  const totalPrice   = parseFloat((sellingPrice + gstAmount).toFixed(2));

  // ── Field updater ─────────────────────────────────────────
  const update = (k, v) => {
    if (k === 'description' && countWords(v) > DESC_MAX) return;
    if (k === 'detailedDescription' && countWords(v) > DETAIL_MAX) return;
    setForm(f => ({ ...f, [k]: v }));
  };

  const handleImages = (e) => {
    const files = Array.from(e.target.files);
    if ((form.images?.length || 0) + files.length > 3) return notify('Max 3 images', 'error');

    const oversized = files.find((f) => f.size > MAX_PRODUCT_IMAGE_SIZE_BYTES);
    if (oversized) {
      notify('Each image must be 2MB or smaller', 'error');
      return;
    }

    files.forEach(f => {
      const r = new FileReader();
      r.onloadend = () => setForm(p => ({ ...p, images: [...(p.images || []), r.result] }));
      r.readAsDataURL(f);
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.category) return notify('Product Category is required', 'error');
    if (!form.price)    return notify('Selling Price is required', 'error');
    if (descWords > DESC_MAX)     return notify(`Description exceeds ${DESC_MAX} words`, 'error');
    if (detailWords > DETAIL_MAX) return notify(`Detailed Description exceeds ${DETAIL_MAX} words`, 'error');
    if (form.mrp && Number(form.price) > Number(form.mrp))
      return notify('Selling Price cannot exceed Unit Price', 'error');
    onSave({ ...form, unitPrice: form.mrp, vehicleType: vehicle });
  };

  return (
    <div className="p-6 max-w-4xl mx-auto fade-in">

      {preview && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 cursor-zoom-out fade-in" onClick={() => setPreview(null)}>
          <img src={preview} alt="Preview" className="max-w-full max-h-[90vh] rounded-lg shadow-2xl" />
          <button className="absolute top-4 right-4 bg-white/10 text-white rounded-full p-2" onClick={() => setPreview(null)}>✕</button>
        </div>
      )}

      {showHeavyPopup && <HeavyMaterialPopup onClose={() => setShowHeavyPopup(false)} />}
      {showQuery      && <VendorQueryModal   onClose={() => setShowQuery(false)} notify={notify} />}

      <Card>
        <div className="flex justify-between items-center mb-8 border-b border-gray-100 dark:border-slate-800 pb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {editingProduct ? 'Edit Product' : 'Add New Inventory'}
          </h2>
          <button onClick={onCancel} className="text-xs text-gray-500 hover:text-red-500">Cancel</button>
        </div>

        <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-8 relative">

          {/* ── LEFT COLUMN ──────────────────────────────────── */}
          <div className="space-y-5">

            {/* 1. Product Brand */}
            <Input label="Product Brand" value={form.brand}
              onChange={e => update('brand', e.target.value)}
              placeholder="e.g. UltraTech, Bosch..." />

            {/* 2. Description — immediately after Brand, 30 word limit */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Description</label>
                <WordCounter count={descWords} max={DESC_MAX} />
              </div>
              <textarea
                value={form.description}
                onChange={e => update('description', e.target.value)}
                rows="3"
                placeholder="Key features, material details... (max 30 words)"
                className={`w-full rounded-xl border px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#0ceded]/20 dark:bg-slate-900 dark:text-white resize-none transition-all
                  ${descWords > DESC_MAX
                    ? 'border-red-400 bg-red-50 dark:border-red-700 dark:bg-red-900/10'
                    : 'border-gray-200 bg-gray-50 focus:border-[#0ceded] dark:border-slate-800'}`}
              />
            </div>

            {/* Product Images */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Product Images (Max 3)</label>
              <div className="grid grid-cols-4 gap-3 w-full">
                <label className="aspect-square cursor-pointer flex flex-col items-center justify-center rounded-xl bg-gray-50 dark:bg-slate-900 border-2 border-dashed border-gray-300 dark:border-slate-700 hover:border-[#0ceded] hover:text-[#0ceded] text-gray-400 transition">
                  <Icons.Plus /><span className="text-[8px] font-bold mt-1">Add Img</span>
                  <input type="file" accept="image/*" multiple onChange={handleImages} className="hidden" />
                </label>
                {form.images?.map((img, i) => (
                  <div key={i} className="aspect-square rounded-xl overflow-hidden border border-gray-200 dark:border-slate-700 shadow-sm relative group cursor-zoom-in" onClick={() => setPreview(img)}>
                    <img src={img} alt="" className="w-full h-full object-cover group-hover:scale-110 transition" />
                    <div className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 cursor-pointer transition"
                      onClick={e => { e.stopPropagation(); setForm(p => ({ ...p, images: p.images.filter((_, j) => j !== i) })); }}>✕</div>
                  </div>
                ))}
              </div>
              <div className="text-[10px] text-gray-400">{form.images?.length || 0} / 3 uploaded</div>
            </div>

            {/* Detailed Description — 200 word limit */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Detailed Description</label>
                <WordCounter count={detailWords} max={DETAIL_MAX} />
              </div>
              <textarea
                value={form.detailedDescription}
                onChange={e => update('detailedDescription', e.target.value)}
                rows="4"
                placeholder="Full product specifications, usage instructions... (max 200 words)"
                className={`w-full rounded-xl border px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#0ceded]/20 dark:bg-slate-900 dark:text-white resize-none transition-all
                  ${detailWords > DETAIL_MAX
                    ? 'border-red-400 bg-red-50 dark:border-red-700 dark:bg-red-900/10'
                    : 'border-gray-200 bg-gray-50 focus:border-[#0ceded] dark:border-slate-800'}`}
              />
            </div>

            {/* Product Quality + Warranty */}
            <div className="grid grid-cols-2 gap-4">
              <Input label="Product Quality" value={form.productQuality}
                onChange={e => update('productQuality', e.target.value)}
                placeholder="e.g., Premium, Grade A" />
              <Input label="Warranty" value={form.warranty}
                onChange={e => update('warranty', e.target.value)}
                placeholder="e.g., 1 Year, Lifetime" />
            </div>

            {/* Category dropdown + HSN Code — same row */}
            <div className="grid grid-cols-2 gap-4">
              <CategoryField
                value={form.category}
                onChange={v => update('category', v)}
              />
              <Input label="HSN Code" value={form.hsn} onChange={e => update('hsn', e.target.value)} />
            </div>

            {/* Stock + Unit */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5 relative">
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Stock Quantity</label>
                <div className="quantity-input-wrapper">
                  <div id="quantitySelector" className="quantity-selector">
                    <div className="text-xs font-bold text-gray-600 dark:text-gray-300 mb-2">Quick Select</div>
                    <div className="flex flex-wrap justify-center">
                      {[5, 10, 20, 50, 100, 200, 500, 1000].map(n => (
                        <button key={n} type="button" className="quantity-btn"
                          onMouseDown={e => { e.preventDefault(); update('stock', String(n)); document.getElementById('quantitySelector').classList.remove('active'); }}>
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                  <input type="number" value={form.stock} onChange={e => update('stock', e.target.value)}
                    onFocus={() => document.getElementById('quantitySelector')?.classList.add('active')}
                    onBlur={() => setTimeout(() => document.getElementById('quantitySelector')?.classList.remove('active'), 200)}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-[#0ceded] focus:ring-2 focus:ring-[#0ceded]/20 dark:border-slate-800 dark:bg-slate-900 dark:text-white" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Unit Type</label>
                <select value={form.unit} onChange={e => update('unit', e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none focus:border-[#0ceded] dark:border-slate-800 dark:bg-slate-900 dark:text-white">
                  {UNIT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>

            {/* Bulk toggle */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-600 dark:text-gray-300">Enable Bulk Order</span>
              <ToggleSwitch checked={form.isBulk} onChange={v => update('isBulk', v)} />
            </div>
            {form.isBulk && (
              <div className="fade-in">
                <Input label="Bulk Discount (%)" type="number" value={form.bulkDiscount}
                  onChange={e => update('bulkDiscount', e.target.value)} />
              </div>
            )}

            {/* Unit Price + Selling Price */}
            <div className="grid grid-cols-2 gap-4">
              <Input label="Unit Price (₹)"    type="number" value={form.mrp}   onChange={e => update('mrp', e.target.value)} />
              <Input label="Selling Price (₹)" type="number" value={form.price} onChange={e => update('price', e.target.value)} />
            </div>

            {/* Total Price + Query button */}
            <div className="flex items-end gap-2">
              <div className="flex-1 space-y-1.5">
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Product Total Price (₹)
                  <span className="ml-2 text-[10px] font-normal text-[#0ceded] normal-case">
                    Selling Price + GST ({gstPercent}%)
                  </span>
                </label>
                <div className="w-full rounded-xl border border-gray-200 bg-gray-100 px-4 py-3 text-sm font-semibold text-gray-700 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-200 cursor-not-allowed select-none">
                  ₹ {sellingPrice > 0 ? totalPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '—'}
                </div>
              </div>
              <div className="pb-0.5">
                <button type="button" onClick={() => setShowQuery(true)} title="Send query to Admin"
                  className="w-11 h-11 rounded-full bg-[#25D366] hover:bg-[#20b958] text-white shadow-lg flex items-center justify-center transition active:scale-90 hover:scale-105">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    <line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                </button>
                <div className="text-[8px] text-gray-400 text-center mt-0.5 font-bold">QUERY</div>
              </div>
            </div>

          </div>

          {/* ── RIGHT COLUMN — Logistics ──────────────────────── */}
          <div className="space-y-5 border-l border-gray-100 dark:border-slate-800 pl-0 md:pl-8">
            <h3 className="text-xs font-bold text-[#0ceded] uppercase tracking-wider">Logistics</h3>
            <div className="grid grid-cols-3 gap-3">
              <Input label="L (cm)" type="number" value={form.length} onChange={e => update('length', e.target.value)} />
              <Input label="W (cm)" type="number" value={form.width}  onChange={e => update('width', e.target.value)} />
              <Input label="H (cm)" type="number" value={form.height} onChange={e => update('height', e.target.value)} />
            </div>
            <Input label="Weight (kg)" type="number" value={form.weight} onChange={e => update('weight', e.target.value)} />
            <div className="flex items-center justify-between p-4 rounded-xl bg-blue-500/5 border border-blue-500/20">
              <div>
                <span className="text-xs font-bold text-gray-700 dark:text-gray-200 uppercase block">Self Delivery</span>
                <span className="text-[10px] text-gray-500">
                  {isHeavyCategory(form.category) ? '⚡ Auto-enabled for heavy material' : 'I handle shipping'}
                </span>
              </div>
              <ToggleSwitch checked={form.selfDelivery} onChange={v => update('selfDelivery', v)} />
            </div>
            <div className="mt-4">
              <h4 className="text-[10px] text-gray-500 uppercase font-bold text-center mb-2">Predicted Vehicle Type</h4>
              <VehicleAnim suggestion={vehicle} />
            </div>
          </div>

          {/* ── SUBMIT ───────────────────────────────────────── */}
          <div className="md:col-span-2 pt-4">
            <button type="submit"
              className="w-40 bg-[#0ceded] hover:opacity-90 text-black font-bold py-2.5 rounded-xl shadow-lg transition active:scale-95 text-sm">
              {editingProduct ? 'Update Product' : 'Save Product'}
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default ProductForm;