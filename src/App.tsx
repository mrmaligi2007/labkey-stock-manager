import { useState, useMemo, useEffect } from 'react';
import { 
  Search, Plus, Minus, RefreshCw, LogOut, LayoutDashboard, Boxes, FileText, 
  Building2, AlertCircle, Trash2, ChevronDown, ChevronRight, 
  Package, Upload, FileUp
} from 'lucide-react';
import { Auth } from './components/Auth';
import { supabase } from './lib/supabase';
import { initialProducts } from './data/products';
import { PRODUCT_LINES, getProductLine, isControlUnit, isReader, isMedia } from './lib/labkey-systems';

type ViewMode = 'dashboard' | 'inventory' | 'invoices';

// Helper to determine media subcategory
function getMediaSubcategory(sku: string): string {
  if (sku.includes('TS') || sku.includes('TSO') || sku.includes('TS1') || sku.includes('TS2')) return 'CARDS';
  if (sku.includes('GP') || sku.includes('GNGP')) return 'KEYCHAINS';
  if (sku.includes('SK')) return 'STICKERS';
  if (sku.includes('BF')) return 'BRACELETS';
  return 'CARDS';
}

function App() {
  const [session, setSession] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['CONTROL_UNITS', 'READERS', 'MEDIA']));
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthChecked(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setAuthChecked(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (authChecked && session) {
      fetchAllData();
    } else if (authChecked && !session) {
      setLoading(false);
    }
  }, [authChecked, session]);

  async function fetchAllData() {
    setLoading(true);
    try {
      const [{ data: productsData }, { data: invoicesData }] = await Promise.all([
        supabase.from('products').select('*').order('product_code'),
        supabase.from('invoices').select('*').order('date', { ascending: false })
      ]);

      setProducts(productsData || initialProducts);
      setInvoices(invoicesData || []);
    } catch (err) {
      setProducts(initialProducts);
    } finally {
      setLoading(false);
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setProducts([]);
    setInvoices([]);
  };

  const handleUpdateStock = async (productCode: string, newStock: number) => {
    if (newStock < 0) newStock = 0;
    try {
      await supabase.from('products').update({ in_stock: newStock }).eq('product_code', productCode);
      setProducts(prev => prev.map(p => p.product_code === productCode ? { ...p, in_stock: newStock } : p));
    } catch (err) {
      alert('Failed to update stock');
    }
  };

  // Handle invoice PDF upload
  const handleInvoiceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      // Upload to Supabase Storage
      const fileName = `invoices/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('invoices')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('invoices')
        .getPublicUrl(fileName);

      // Create invoice record
      const { error: invoiceError } = await supabase
        .from('invoices')
        .insert([{
          invoice_number: `INV-UPLOAD-${Date.now()}`,
          customer_id: null,
          total_amount: 0,
          status: 'pending',
          notes: `Uploaded invoice: ${file.name}`,
          pdf_url: publicUrl
        }])
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // TODO: Parse PDF to extract items and deduct stock automatically
      // For now, just store the invoice

      fetchAllData();
      alert('Invoice uploaded successfully! PDF parsing for automatic stock deduction coming soon.');
    } catch (err) {
      console.error('Upload error:', err);
      alert('Failed to upload invoice');
    } finally {
      setUploading(false);
    }
  };

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const stats = useMemo(() => {
    const controlUnits = products.filter(p => isControlUnit(p.product_code));
    const readers = products.filter(p => isReader(p.product_code));
    const media = products.filter(p => isMedia(p.product_code));
    const lowStock = products.filter(p => p.in_stock <= (p.min_stock || 0));
    const totalSales = invoices.reduce((sum, inv) => inv.status !== 'cancelled' ? sum + (inv.total_amount || 0) : sum, 0);
    return {
      totalProducts: products.length,
      controlUnits: controlUnits.length,
      readers: readers.length,
      media: media.length,
      lowStock: lowStock.length,
      totalInvoices: invoices.length,
      totalSales,
      pendingInvoices: invoices.filter(i => i.status === 'pending').length
    };
  }, [products, invoices]);

  // Organize products properly
  const organizedProducts = useMemo(() => {
    const filtered = searchTerm 
      ? products.filter(p => 
          p.product_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.description.toLowerCase().includes(searchTerm.toLowerCase())
        )
      : products;

    const organized: any = {
      CONTROL_UNITS: {},
      READERS: {},
      MEDIA: {},
      ACCESSORIES: {}
    };

    filtered.forEach(product => {
      const line = getProductLine(product.product_code);
      if (line) {
        let subcategory = line.subcategory;
        
        // Fix media subcategories
        if (line.line === 'MEDIA') {
          subcategory = getMediaSubcategory(product.product_code);
        }
        
        if (!organized[line.line][subcategory]) {
          organized[line.line][subcategory] = [];
        }
        organized[line.line][subcategory].push(product);
      }
    });

    return organized;
  }, [products, searchTerm]);

  const getStockStatus = (stock: number, min: number) => {
    if (stock === 0) return { label: 'Out', color: 'bg-red-500', text: 'text-red-600', bg: 'bg-red-50' };
    if (stock <= min) return { label: 'Low', color: 'bg-orange-500', text: 'text-orange-600', bg: 'bg-orange-50' };
    return { label: 'OK', color: 'bg-emerald-500', text: 'text-emerald-600', bg: 'bg-emerald-50' };
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-10 h-10 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <Auth onAuthSuccess={fetchAllData} />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-slate-600 text-lg">Loading LabKey Manager...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-2 rounded-lg">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-slate-900">LabKey Manager</h1>
                <p className="text-xs text-slate-500">Stock Management</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-600 hidden md:block">{session.user.email}</span>
              <button onClick={handleSignOut} className="p-2 text-slate-400 hover:text-red-600">
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <nav className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto py-2">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
              { id: 'inventory', label: 'Inventory', icon: Boxes },
              { id: 'invoices', label: 'Invoices', icon: FileText },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setViewMode(tab.id as ViewMode)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all ${
                  viewMode === tab.id ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* DASHBOARD */}
        {viewMode === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Control Units', value: stats.controlUnits, icon: Building2, color: 'blue' },
                { label: 'Readers', value: stats.readers, icon: Package, color: 'indigo' },
                { label: 'Media Items', value: stats.media, icon: Boxes, color: 'teal' },
                { label: 'Low Stock', value: stats.lowStock, icon: AlertCircle, color: 'red' },
                { label: 'Total Invoices', value: stats.totalInvoices, icon: FileText, color: 'cyan' },
                { label: 'Pending', value: stats.pendingInvoices, icon: FileText, color: 'orange' },
              ].map((stat, idx) => (
                <div key={idx} className="bg-white rounded-xl p-4 border border-slate-200">
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`p-2 bg-${stat.color}-100 rounded-lg`}>
                      <stat.icon className={`w-5 h-5 text-${stat.color}-600`} />
                    </div>
                    <span className="text-sm text-slate-500">{stat.label}</span>
                  </div>
                  <p className={`text-2xl font-bold text-${stat.color}-600`}>{stat.value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* INVENTORY */}
        {viewMode === 'inventory' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-4 border border-slate-200">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search by SKU or product name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-6">
              {/* CONTROL UNITS */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <button 
                  onClick={() => toggleCategory('CONTROL_UNITS')}
                  className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-blue-100 border-b border-blue-200"
                >
                  <div className="flex items-center gap-3">
                    <Building2 className="w-6 h-6 text-blue-600" />
                    <div className="text-left">
                      <h3 className="font-bold text-slate-900">Control Units</h3>
                      <p className="text-sm text-slate-600">Central controllers for access management</p>
                    </div>
                  </div>
                  {expandedCategories.has('CONTROL_UNITS') ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                </button>
                
                {expandedCategories.has('CONTROL_UNITS') && (
                  <div className="p-4 space-y-4">
                    {Object.entries(PRODUCT_LINES.CONTROL_UNITS.subcategories).map(([key, subcat]: [string, any]) => {
                      const products = organizedProducts.CONTROL_UNITS[key] || [];
                      if (products.length === 0) return null;
                      return (
                        <div key={key} className="border border-slate-200 rounded-lg overflow-hidden">
                          <div className={`p-3 ${subcat.color} text-white`}>
                            <h4 className="font-bold">{subcat.name}</h4>
                            <p className="text-sm opacity-90">{subcat.description}</p>
                          </div>
                          <div className="divide-y divide-slate-100">
                            {products.map((product: any) => {
                              const status = getStockStatus(product.in_stock, product.min_stock || 0);
                              return (
                                <div key={product.product_code} className="p-3 flex items-center justify-between hover:bg-slate-50">
                                  <div className="flex-1">
                                    <p className="font-medium text-slate-900">{product.description}</p>
                                    <p className="text-sm text-slate-500 font-mono">{product.product_code}</p>
                                    <div className="flex gap-2 mt-1">
                                      {subcat.features.slice(0, 3).map((feat: string) => (
                                        <span key={feat} className="text-xs px-2 py-0.5 bg-slate-100 rounded">{feat}</span>
                                      ))}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${status.bg} ${status.text}`}>
                                      {status.label} ({product.in_stock})
                                    </span>
                                    <div className="flex gap-1">
                                      <button onClick={() => handleUpdateStock(product.product_code, product.in_stock - 1)} className="w-8 h-8 flex items-center justify-center bg-slate-100 rounded hover:bg-red-100">
                                        <Minus className="w-4 h-4" />
                                      </button>
                                      <button onClick={() => handleUpdateStock(product.product_code, product.in_stock + 1)} className="w-8 h-8 flex items-center justify-center bg-slate-100 rounded hover:bg-emerald-100">
                                        <Plus className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* READERS */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <button 
                  onClick={() => toggleCategory('READERS')}
                  className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-indigo-50 to-indigo-100 border-b border-indigo-200"
                >
                  <div className="flex items-center gap-3">
                    <Package className="w-6 h-6 text-indigo-600" />
                    <div className="text-left">
                      <h3 className="font-bold text-slate-900">Readers</h3>
                      <p className="text-sm text-slate-600">Access control devices</p>
                    </div>
                  </div>
                  {expandedCategories.has('READERS') ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                </button>
                
                {expandedCategories.has('READERS') && (
                  <div className="p-4 space-y-4">
                    {Object.entries(PRODUCT_LINES.READERS.subcategories).map(([key, subcat]: [string, any]) => {
                      const products = organizedProducts.READERS[key] || [];
                      if (products.length === 0) return null;
                      return (
                        <div key={key} className="border border-slate-200 rounded-lg overflow-hidden">
                          <div className={`p-3 ${subcat.color} text-white`}>
                            <h4 className="font-bold">{subcat.name}</h4>
                            <p className="text-sm opacity-90">{subcat.description}</p>
                          </div>
                          <div className="divide-y divide-slate-100">
                            {products.map((product: any) => {
                              const status = getStockStatus(product.in_stock, product.min_stock || 0);
                              return (
                                <div key={product.product_code} className="p-3 flex items-center justify-between hover:bg-slate-50">
                                  <div className="flex-1">
                                    <p className="font-medium text-slate-900">{product.description}</p>
                                    <p className="text-sm text-slate-500 font-mono">{product.product_code}</p>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${status.bg} ${status.text}`}>
                                      {status.label} ({product.in_stock})
                                    </span>
                                    <div className="flex gap-1">
                                      <button onClick={() => handleUpdateStock(product.product_code, product.in_stock - 1)} className="w-8 h-8 flex items-center justify-center bg-slate-100 rounded hover:bg-red-100">
                                        <Minus className="w-4 h-4" />
                                      </button>
                                      <button onClick={() => handleUpdateStock(product.product_code, product.in_stock + 1)} className="w-8 h-8 flex items-center justify-center bg-slate-100 rounded hover:bg-emerald-100">
                                        <Plus className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* MEDIA */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <button 
                  onClick={() => toggleCategory('MEDIA')}
                  className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-teal-50 to-teal-100 border-b border-teal-200"
                >
                  <div className="flex items-center gap-3">
                    <Boxes className="w-6 h-6 text-teal-600" />
                    <div className="text-left">
                      <h3 className="font-bold text-slate-900">Media</h3>
                      <p className="text-sm text-slate-600">NFC cards, keychains, stickers, bracelets</p>
                    </div>
                  </div>
                  {expandedCategories.has('MEDIA') ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                </button>
                
                {expandedCategories.has('MEDIA') && (
                  <div className="p-4 space-y-4">
                    {Object.entries(PRODUCT_LINES.MEDIA.subcategories).map(([key, subcat]: [string, any]) => {
                      const products = organizedProducts.MEDIA[key] || [];
                      if (products.length === 0) return null;
                      return (
                        <div key={key} className="border border-slate-200 rounded-lg overflow-hidden">
                          <div className={`p-3 ${subcat.color} text-white`}>
                            <h4 className="font-bold">{subcat.name}</h4>
                            <p className="text-sm opacity-90">{subcat.description}</p>
                          </div>
                          <div className="divide-y divide-slate-100">
                            {products.map((product: any) => {
                              const status = getStockStatus(product.in_stock, product.min_stock || 0);
                              return (
                                <div key={product.product_code} className="p-3 flex items-center justify-between hover:bg-slate-50">
                                  <div className="flex-1">
                                    <p className="font-medium text-slate-900">{product.description}</p>
                                    <p className="text-sm text-slate-500 font-mono">{product.product_code}</p>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${status.bg} ${status.text}`}>
                                      {status.label} ({product.in_stock})
                                    </span>
                                    <div className="flex gap-1">
                                      <button onClick={() => handleUpdateStock(product.product_code, product.in_stock - 1)} className="w-8 h-8 flex items-center justify-center bg-slate-100 rounded hover:bg-red-100">
                                        <Minus className="w-4 h-4" />
                                      </button>
                                      <button onClick={() => handleUpdateStock(product.product_code, product.in_stock + 1)} className="w-8 h-8 flex items-center justify-center bg-slate-100 rounded hover:bg-emerald-100">
                                        <Plus className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* ACCESSORIES */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <button 
                  onClick={() => toggleCategory('ACCESSORIES')}
                  className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200"
                >
                  <div className="flex items-center gap-3">
                    <Package className="w-6 h-6 text-slate-600" />
                    <div className="text-left">
                      <h3 className="font-bold text-slate-900">Accessories</h3>
                      <p className="text-sm text-slate-600">Additional components and add-ons</p>
                    </div>
                  </div>
                  {expandedCategories.has('ACCESSORIES') ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                </button>
                
                {expandedCategories.has('ACCESSORIES') && (
                  <div className="p-4">
                    {Object.entries(PRODUCT_LINES.ACCESSORIES.subcategories).map(([key, subcat]: [string, any]) => {
                      const products = organizedProducts.ACCESSORIES[key] || [];
                      if (products.length === 0) return null;
                      return (
                        <div key={key} className="border border-slate-200 rounded-lg overflow-hidden">
                          <div className={`p-3 ${subcat.color} text-white`}>
                            <h4 className="font-bold">{subcat.name}</h4>
                          </div>
                          <div className="divide-y divide-slate-100">
                            {products.map((product: any) => {
                              const status = getStockStatus(product.in_stock, product.min_stock || 0);
                              return (
                                <div key={product.product_code} className="p-3 flex items-center justify-between hover:bg-slate-50">
                                  <div className="flex-1">
                                    <p className="font-medium text-slate-900">{product.description}</p>
                                    <p className="text-sm text-slate-500 font-mono">{product.product_code}</p>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${status.bg} ${status.text}`}>
                                      {status.label} ({product.in_stock})
                                    </span>
                                    <div className="flex gap-1">
                                      <button onClick={() => handleUpdateStock(product.product_code, product.in_stock - 1)} className="w-8 h-8 flex items-center justify-center bg-slate-100 rounded hover:bg-red-100">
                                        <Minus className="w-4 h-4" />
                                      </button>
                                      <button onClick={() => handleUpdateStock(product.product_code, product.in_stock + 1)} className="w-8 h-8 flex items-center justify-center bg-slate-100 rounded hover:bg-emerald-100">
                                        <Plus className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* INVOICES - Upload Only */}
        {viewMode === 'invoices' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 border border-slate-200">
              <h2 className="text-xl font-bold text-slate-900 mb-4">Upload Invoice</h2>
              <p className="text-slate-600 mb-4">Upload your invoice PDF. Stock will be automatically deducted based on items detected.</p>
              
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-8 h-8 text-slate-400 mb-2" />
                  <p className="text-sm text-slate-500">{uploading ? 'Uploading...' : 'Click to upload invoice PDF'}</p>
                </div>
                <input 
                  type="file" 
                  className="hidden" 
                  accept=".pdf"
                  onChange={handleInvoiceUpload}
                  disabled={uploading}
                />
              </label>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="p-4 border-b border-slate-200">
                <h3 className="font-bold text-slate-900">Uploaded Invoices</h3>
              </div>
              <div className="divide-y divide-slate-100">
                {invoices.map(invoice => (
                  <div key={invoice.id} className="p-4 flex items-center justify-between hover:bg-slate-50">
                    <div>
                      <p className="font-semibold text-slate-900">{invoice.invoice_number}</p>
                      <p className="text-sm text-slate-500">{new Date(invoice.date).toLocaleDateString()}</p>
                      {invoice.notes && <p className="text-sm text-slate-600">{invoice.notes}</p>}
                    </div>
                    <div className="flex items-center gap-3">
                      {invoice.pdf_url && (
                        <a 
                          href={invoice.pdf_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                        >
                          <FileUp className="w-5 h-5" />
                        </a>
                      )}
                      <button 
                        onClick={() => {
                          if (confirm('Delete this invoice?')) {
                            supabase.from('invoices').delete().eq('id', invoice.id).then(() => fetchAllData());
                          }
                        }}
                        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
                {invoices.length === 0 && (
                  <div className="p-8 text-center text-slate-400">
                    <FileText className="w-12 h-12 mx-auto mb-4" />
                    <p>No invoices uploaded yet</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
