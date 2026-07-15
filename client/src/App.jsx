import React, { useEffect, useState, useCallback } from 'react';
import AuthPage from './pages/AuthPage.jsx';
import { api, getStoredToken, setToken } from './api.js';

const CATEGORIES = ["Rings","Bracelets","Necklaces","Earrings","Brooches","Cufflinks","Other"];
const KARATS = [18, 24, 22, 14, 10];
const DWT_TO_GRAMS = 1.55517384;
const gToDwt = (g) => Number(g || 0) / DWT_TO_GRAMS;
const dwtToG = (dwt) => Number(dwt || 0) * DWT_TO_GRAMS;

function money(n) {
  return Number(n || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
}

export default function App() {
  const [user, setUser] = useState(null);
  const [checkedAuth, setCheckedAuth] = useState(false);
  const [view, setView] = useState('dashboard'); // dashboard | styles | style-detail
  const [styles, setStyles] = useState([]);
  const [goldPrice, setGoldPrice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [selectedStyleId, setSelectedStyleId] = useState(null);
  const [search, setSearch] = useState('');

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [st, gp] = await Promise.all([api.getStyles(), api.getGoldPrice()]);
      setStyles(st); setGoldPrice(gp);
    } catch (e) {
      if (e.message === 'Invalid or expired token') { setToken(null); setUser(null); }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const token = getStoredToken();
    if (!token) { setCheckedAuth(true); return; }
    const stored = localStorage.getItem('wp_user');
    if (stored) setUser(JSON.parse(stored));
    setCheckedAuth(true);
  }, []);

  useEffect(() => { if (user) loadAll(); }, [user, loadAll]);

  function onAuthed(u) {
    localStorage.setItem('wp_user', JSON.stringify(u));
    setUser(u);
  }
  function logout() {
    setToken(null); localStorage.removeItem('wp_user'); setUser(null);
  }

  if (!checkedAuth) return <div className="dw-loading">Loading…</div>;
  if (!user) return <AuthPage onAuthed={onAuthed} />;

  async function refreshStyles() { setStyles(await api.getStyles()); }

  function openStyle(id) { setSelectedStyleId(id); setView('style-detail'); }

  return (
    <div className="dw-app">
      <div className="dw-side">
        <div className="dw-brand">
          <div className="dw-brand-name">The Webb Pricing</div>
          <div className="dw-brand-sub">Cost &amp; Pricing Studio</div>
        </div>
        <div className="dw-nav">
          <button className={`dw-nav-btn ${view === 'dashboard' ? 'active' : ''}`} onClick={() => setView('dashboard')}>Dashboard</button>
          <button className={`dw-nav-btn ${view === 'styles' || view === 'style-detail' ? 'active' : ''}`} onClick={() => setView('styles')}>Styles</button>
        </div>
        {goldPrice && (
          <div className="dw-gold-ticker">
            Gold Price (18k)<br />
            <b>{money(goldPrice.perGramByKarat[18] * 31.1035)}</b> / oz<br />
            <b>{money(goldPrice.perGramByKarat[18] * DWT_TO_GRAMS)}</b> / dwt
            <div style={{ marginTop: 6, fontSize: 10, color: '#9aa4bd', fontFamily: "'Inter',sans-serif", letterSpacing: 0 }}>1 troy oz = 20 dwt</div>
          </div>
        )}
        <div className="dw-side-foot">
          <div className="dw-me">Signed in as<br /><b>{user.name}</b> · {user.role === 'admin' ? 'Admin' : 'Member'}</div>
          <button className="dw-relink" onClick={logout}>Log out</button>
        </div>
      </div>
      <div className="dw-main">
        {loading ? <div className="dw-loading">Loading data…</div> : (
          <>
            {view === 'dashboard' && <Dashboard styles={styles} goldPrice={goldPrice} onOpenStyle={openStyle} />}
            {view === 'styles' && (
              <Styles
                styles={styles} search={search} setSearch={setSearch}
                onAdd={() => setModal({ type: 'style', editing: null })}
                onOpen={openStyle}
                onDelete={async (s) => {
                  if (!confirm(`Delete style ${s.style_number}? This removes its price history, sales, and comparisons too.`)) return;
                  await api.deleteStyle(s.id);
                  await refreshStyles();
                }}
              />
            )}
            {view === 'style-detail' && selectedStyleId && (
              <StyleDetail
                styleId={selectedStyleId}
                onBack={() => setView('styles')}
                onEdit={(s) => setModal({ type: 'style', editing: s })}
                onChanged={refreshStyles}
              />
            )}
          </>
        )}
      </div>
      {modal && modal.type === 'style' && (
        <StyleModal
          editing={modal.editing}
          onClose={() => setModal(null)}
          onSave={async (data) => {
            if (modal.editing) await api.updateStyle(modal.editing.id, data);
            else await api.createStyle(data);
            await refreshStyles();
            setModal(null);
          }}
        />
      )}
    </div>
  );
}

function Dashboard({ styles, goldPrice, onOpenStyle }) {
  const totalRevenue = styles.reduce((sum, s) => sum + Number(s.total_revenue || 0), 0);
  const totalUnits = styles.reduce((sum, s) => sum + Number(s.total_units_sold || 0), 0);
  const recent = [...styles].slice(0, 6);
  return (
    <>
      <h1 className="dw-h1"><span className="dw-facet"></span>Dashboard</h1>
      <p className="dw-sub">Live gold pricing, style economics, and sales at a glance.</p>
      <div className="dw-stats">
        <div className="dw-stat"><div className="dw-stat-num">{styles.length}</div><div className="dw-stat-label">Styles Tracked</div></div>
        <div className="dw-stat"><div className="dw-stat-num">{totalUnits}</div><div className="dw-stat-label">Units Sold</div></div>
        <div className="dw-stat"><div className="dw-stat-num">{money(totalRevenue)}</div><div className="dw-stat-label">Total Revenue</div></div>
        <div className="dw-stat"><div className="dw-stat-num">{goldPrice ? money(goldPrice.perGramByKarat[18] * DWT_TO_GRAMS) : '—'}</div><div className="dw-stat-label">Gold / dwt (18k)</div></div>
      </div>
      <div className="dw-panel">
        <div className="dw-panel-title">Recent Styles</div>
        {recent.length ? (
          <table className="dw-table">
            <thead><tr><th>Style #</th><th>Description</th><th>Current Price</th><th>Units Sold</th><th>Revenue</th></tr></thead>
            <tbody>
              {recent.map(s => (
                <tr key={s.id} style={{ cursor: 'pointer' }} onClick={() => onOpenStyle(s.id)}>
                  <td><b>{s.style_number}</b></td>
                  <td>{s.description}</td>
                  <td>{s.current_price ? money(s.current_price) : '—'}</td>
                  <td>{s.total_units_sold}</td>
                  <td>{money(s.total_revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <div className="dw-empty">No styles yet. Add your first one from the Styles tab.</div>}
      </div>
    </>
  );
}

function Styles({ styles, search, setSearch, onAdd, onOpen, onDelete }) {
  const list = styles.filter(s => !search || `${s.style_number}${s.description}${s.category}`.toLowerCase().includes(search.toLowerCase()));
  return (
    <>
      <h1 className="dw-h1"><span className="dw-facet"></span>Styles</h1>
      <p className="dw-sub">Every style's cost basis, current price, and performance.</p>
      <div className="dw-toolbar">
        <input placeholder="Search styles…" value={search} onChange={e => setSearch(e.target.value)} />
        <button className="dw-btn dw-btn-gold" onClick={onAdd}>+ Add Style</button>
      </div>
      <div className="dw-panel" style={{ padding: 0, overflowX: 'auto' }}>
        <table className="dw-table">
          <thead><tr><th>Style #</th><th>Description</th><th>Category</th><th>Gold</th><th>Current Price</th><th>Units Sold</th><th>Revenue</th><th></th></tr></thead>
          <tbody>
            {list.length ? list.map(s => (
              <tr key={s.id}>
                <td style={{ cursor: 'pointer' }} onClick={() => onOpen(s.id)}><b>{s.style_number}</b></td>
                <td style={{ cursor: 'pointer' }} onClick={() => onOpen(s.id)}>{s.description}</td>
                <td><span className="dw-tag">{s.category}</span></td>
                <td>{gToDwt(s.gold_weight_g).toFixed(2)} dwt / {s.gold_karat}k</td>
                <td>{s.current_price ? money(s.current_price) : '—'}</td>
                <td>{s.total_units_sold}</td>
                <td>{money(s.total_revenue)}</td>
                <td>
                  <div className="dw-row-actions">
                    <button className="dw-link-btn" onClick={() => onOpen(s.id)}>Open</button>
                    <button className="dw-link-btn" onClick={() => onDelete(s)}>Delete</button>
                  </div>
                </td>
              </tr>
            )) : <tr><td colSpan={8}><div className="dw-empty">No styles yet. Click "Add Style" to get started.</div></td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}

function StyleDetail({ styleId, onBack, onEdit, onChanged }) {
  const [detail, setDetail] = useState(null);
  const [tab, setTab] = useState('cost');
  const [modal, setModal] = useState(null);

  const load = useCallback(async () => {
    setDetail(await api.getStyleDetail(styleId));
  }, [styleId]);

  useEffect(() => { load(); }, [load]);

  if (!detail) return <div className="dw-loading">Loading style…</div>;
  const { style, costBreakdown, priceHistory, sales, competitors, totalUnitsSold, totalRevenue } = detail;

  return (
    <>
      <button className="dw-back" onClick={onBack}>← Back to Styles</button>
      <h1 className="dw-h1"><span className="dw-facet"></span>{style.style_number}</h1>
      <p className="dw-sub">{style.description} {style.category ? `· ${style.category}` : ''}</p>

      <div className="dw-toolbar">
        <div></div>
        <button className="dw-btn dw-btn-ghost" onClick={() => onEdit(style)}>Edit Style Details</button>
      </div>

      <div className="dw-tabs">
        {[['cost','Cost & Suggested Price'],['history','Price History'],['sales','Sales'],['competitors','Competitor Comparison']].map(([k,l]) => (
          <button key={k} className={`dw-tab ${tab === k ? 'active' : ''}`} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      {tab === 'cost' && (
        <div className="dw-panel">
          <div className="dw-panel-title">Cost Breakdown (live gold price)</div>
          <div className="dw-cost-row"><span>Gold ({gToDwt(style.gold_weight_g).toFixed(2)} dwt / {(gToDwt(style.gold_weight_g)/20).toFixed(4)} oz @ {style.gold_karat}k, {money(costBreakdown.goldPricePerGram * DWT_TO_GRAMS)}/dwt)</span><span>{money(costBreakdown.goldCost)}</span></div>
          <div className="dw-cost-row"><span>Stone Cost</span><span>{money(costBreakdown.stoneCost)}</span></div>
          <div className="dw-cost-row"><span>Labor Cost</span><span>{money(costBreakdown.laborCost)}</span></div>
          <div className="dw-cost-row"><span>Total Cost</span><span>{money(costBreakdown.totalCost)}</span></div>
          <div className="dw-suggested">
            <div className="dw-suggested-num">{money(costBreakdown.suggestedPrice)}</div>
            <div className="dw-suggested-label">Suggested Price at {style.target_margin_pct}% Markup</div>
          </div>
          <div style={{ marginTop: 16, display: 'flex', gap: 24, fontSize: 13, color: 'var(--ink-soft)' }}>
            <div>Units Sold: <b style={{ color: 'var(--ink)' }}>{totalUnitsSold}</b></div>
            <div>Total Revenue: <b style={{ color: 'var(--ink)' }}>{money(totalRevenue)}</b></div>
          </div>
        </div>
      )}

      {tab === 'history' && (
        <div className="dw-panel">
          <div className="dw-panel-title">
            Price History
            <button className="dw-btn dw-btn-gold" onClick={() => setModal({ type: 'price' })}>+ Log New Price</button>
          </div>
          {priceHistory.length ? (
            <table className="dw-table">
              <thead><tr><th>Date</th><th>Price</th><th>Gold Spot at Time</th><th>Note</th><th></th></tr></thead>
              <tbody>
                {priceHistory.map(p => (
                  <tr key={p.id}>
                    <td>{new Date(p.effective_date).toLocaleDateString()}</td>
                    <td><b>{money(p.price)}</b></td>
                    <td>{p.gold_price_at_time ? money(p.gold_price_at_time) : '—'}</td>
                    <td>{p.note}</td>
                    <td><button className="dw-link-btn" onClick={async () => { await api.deletePriceHistory(p.id); load(); }}>Delete</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <div className="dw-empty">No price history yet. Log the first price to start tracking increases over time.</div>}
        </div>
      )}

      {tab === 'sales' && (
        <div className="dw-panel">
          <div className="dw-panel-title">
            Sales
            <button className="dw-btn dw-btn-gold" onClick={() => setModal({ type: 'sale' })}>+ Log Sale</button>
          </div>
          {sales.length ? (
            <table className="dw-table">
              <thead><tr><th>Date</th><th>Qty</th><th>Unit Price</th><th>Total</th><th>Notes</th><th></th></tr></thead>
              <tbody>
                {sales.map(s => (
                  <tr key={s.id}>
                    <td>{new Date(s.sale_date).toLocaleDateString()}</td>
                    <td>{s.quantity}</td>
                    <td>{money(s.unit_price)}</td>
                    <td><b>{money(s.quantity * s.unit_price)}</b></td>
                    <td>{s.notes}</td>
                    <td><button className="dw-link-btn" onClick={async () => { await api.deleteSale(s.id); load(); onChanged(); }}>Delete</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <div className="dw-empty">No sales logged yet.</div>}
        </div>
      )}

      {tab === 'competitors' && (
        <div className="dw-panel">
          <div className="dw-panel-title">
            Competitor Comparison
            <button className="dw-btn dw-btn-gold" onClick={() => setModal({ type: 'competitor' })}>+ Add Comparison</button>
          </div>
          {competitors.length ? (
            <table className="dw-table">
              <thead><tr><th>Brand</th><th>Item</th><th>Price</th><th>Checked</th><th>Source</th><th></th></tr></thead>
              <tbody>
                {competitors.map(c => (
                  <tr key={c.id}>
                    <td><b>{c.brand}</b></td>
                    <td>{c.item_description}</td>
                    <td>{c.price ? money(c.price) : '—'}</td>
                    <td>{new Date(c.checked_date).toLocaleDateString()}</td>
                    <td>{c.source_url ? <a href={c.source_url} target="_blank" rel="noreferrer">Link</a> : '—'}</td>
                    <td><button className="dw-link-btn" onClick={async () => { await api.deleteCompetitor(c.id); load(); }}>Delete</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <div className="dw-empty">No comparisons yet. Add a competitor price to see how this style stacks up.</div>}
        </div>
      )}

      {modal?.type === 'price' && (
        <PriceModal onClose={() => setModal(null)} onSave={async (data) => { await api.addPriceHistory({ styleId, ...data }); setModal(null); load(); onChanged(); }} />
      )}
      {modal?.type === 'sale' && (
        <SaleModal onClose={() => setModal(null)} onSave={async (data) => { await api.addSale({ styleId, ...data }); setModal(null); load(); onChanged(); }} />
      )}
      {modal?.type === 'competitor' && (
        <CompetitorModal onClose={() => setModal(null)} onSave={async (data) => { await api.addCompetitor({ styleId, ...data }); setModal(null); load(); }} />
      )}
    </>
  );
}

function StyleModal({ editing, onClose, onSave }) {
  const [form, setForm] = useState(editing ? {
    styleNumber: editing.style_number, description: editing.description || '', category: editing.category || CATEGORIES[0],
    goldWeightDwt: gToDwt(editing.gold_weight_g).toFixed(3), goldKarat: editing.gold_karat || 18,
    stoneCost: editing.stone_cost || 0, laborCost: editing.labor_cost || 0,
    targetMarginPct: editing.target_margin_pct || 100, notes: editing.notes || ''
  } : { styleNumber: '', description: '', category: CATEGORIES[0], goldWeightDwt: 0, goldKarat: 18, stoneCost: 0, laborCost: 0, targetMarginPct: 100, notes: '' });
  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  return (
    <div className="dw-modal-bg" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="dw-modal">
        <h3>{editing ? 'Edit Style' : 'Add Style'}</h3>
        <div className="dw-field"><label>Style Number</label><input value={form.styleNumber} onChange={e => set('styleNumber', e.target.value)} placeholder="e.g. RG-1042" /></div>
        <div className="dw-field"><label>Description</label><input value={form.description} onChange={e => set('description', e.target.value)} placeholder="e.g. Twisted gold band with emerald" /></div>
        <div className="dw-field"><label>Category</label>
          <select value={form.category} onChange={e => set('category', e.target.value)}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select>
        </div>
        <div className="dw-cost-grid">
          <div className="dw-field">
            <label>Gold Weight (dwt)</label>
            <input type="number" step="0.001" value={form.goldWeightDwt} onChange={e => set('goldWeightDwt', e.target.value)} />
            <div style={{ fontSize: 11, color: 'var(--ink-soft)', marginTop: 4 }}>
              1 troy oz = 20 dwt{form.goldWeightDwt ? ` · ${(Number(form.goldWeightDwt) / 20).toFixed(4)} oz` : ''}
            </div>
          </div>
          <div className="dw-field"><label>Gold Karat</label>
            <select value={form.goldKarat} onChange={e => set('goldKarat', e.target.value)}>{KARATS.map(k => <option key={k} value={k}>{k}k{k === 18 ? ' (Primary)' : ''}</option>)}</select>
          </div>
        </div>
        <div className="dw-cost-grid">
          <div className="dw-field"><label>Stone Cost ($)</label><input type="number" step="0.01" value={form.stoneCost} onChange={e => set('stoneCost', e.target.value)} /></div>
          <div className="dw-field"><label>Labor Cost ($)</label><input type="number" step="0.01" value={form.laborCost} onChange={e => set('laborCost', e.target.value)} /></div>
        </div>
        <div className="dw-field"><label>Target Markup (%)</label><input type="number" step="1" value={form.targetMarginPct} onChange={e => set('targetMarginPct', e.target.value)} /></div>
        <div className="dw-field"><label>Notes</label><textarea value={form.notes} onChange={e => set('notes', e.target.value)} /></div>
        <div className="dw-modal-actions">
          <button className="dw-btn dw-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="dw-btn dw-btn-gold" onClick={() => {
            if (!form.styleNumber.trim()) return alert('Style number is required');
            const { goldWeightDwt, ...rest } = form;
            onSave({ ...rest, goldWeightG: dwtToG(goldWeightDwt) });
          }}>
            {editing ? 'Save Changes' : 'Add Style'}
          </button>
        </div>
      </div>
    </div>
  );
}

function PriceModal({ onClose, onSave }) {
  const [price, setPrice] = useState('');
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().slice(0,10));
  const [note, setNote] = useState('');
  return (
    <div className="dw-modal-bg" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="dw-modal">
        <h3>Log New Price</h3>
        <div className="dw-field"><label>Price ($)</label><input type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value)} /></div>
        <div className="dw-field"><label>Effective Date</label><input type="date" value={effectiveDate} onChange={e => setEffectiveDate(e.target.value)} /></div>
        <div className="dw-field"><label>Note</label><input value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. Annual increase" /></div>
        <div className="dw-modal-actions">
          <button className="dw-btn dw-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="dw-btn dw-btn-gold" onClick={() => { if (!price) return alert('Price is required'); onSave({ price: Number(price), effectiveDate, note }); }}>Save</button>
        </div>
      </div>
    </div>
  );
}

function SaleModal({ onClose, onSave }) {
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState('');
  const [saleDate, setSaleDate] = useState(new Date().toISOString().slice(0,10));
  const [notes, setNotes] = useState('');
  return (
    <div className="dw-modal-bg" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="dw-modal">
        <h3>Log Sale</h3>
        <div className="dw-cost-grid">
          <div className="dw-field"><label>Quantity</label><input type="number" min="1" value={quantity} onChange={e => setQuantity(e.target.value)} /></div>
          <div className="dw-field"><label>Unit Price ($)</label><input type="number" step="0.01" value={unitPrice} onChange={e => setUnitPrice(e.target.value)} /></div>
        </div>
        <div className="dw-field"><label>Sale Date</label><input type="date" value={saleDate} onChange={e => setSaleDate(e.target.value)} /></div>
        <div className="dw-field"><label>Notes</label><input value={notes} onChange={e => setNotes(e.target.value)} /></div>
        <div className="dw-modal-actions">
          <button className="dw-btn dw-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="dw-btn dw-btn-gold" onClick={() => { if (!unitPrice) return alert('Unit price is required'); onSave({ quantity: Number(quantity), unitPrice: Number(unitPrice), saleDate, notes }); }}>Save</button>
        </div>
      </div>
    </div>
  );
}

function CompetitorModal({ onClose, onSave }) {
  const [brand, setBrand] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  const [price, setPrice] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [checkedDate, setCheckedDate] = useState(new Date().toISOString().slice(0,10));
  return (
    <div className="dw-modal-bg" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="dw-modal">
        <h3>Add Competitor Comparison</h3>
        <div className="dw-field"><label>Brand</label><input value={brand} onChange={e => setBrand(e.target.value)} placeholder="e.g. Cartier" /></div>
        <div className="dw-field"><label>Item Description</label><input value={itemDescription} onChange={e => setItemDescription(e.target.value)} placeholder="e.g. Love bracelet, yellow gold" /></div>
        <div className="dw-field"><label>Price ($)</label><input type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value)} /></div>
        <div className="dw-field"><label>Source URL</label><input value={sourceUrl} onChange={e => setSourceUrl(e.target.value)} placeholder="https://…" /></div>
        <div className="dw-field"><label>Checked Date</label><input type="date" value={checkedDate} onChange={e => setCheckedDate(e.target.value)} /></div>
        <div className="dw-field"><label>Notes</label><textarea value={notes} onChange={e => setNotes(e.target.value)} /></div>
        <div className="dw-modal-actions">
          <button className="dw-btn dw-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="dw-btn dw-btn-gold" onClick={() => { if (!brand.trim()) return alert('Brand is required'); onSave({ brand, itemDescription, price: price ? Number(price) : null, sourceUrl, notes, checkedDate }); }}>Save</button>
        </div>
      </div>
    </div>
  );
}
