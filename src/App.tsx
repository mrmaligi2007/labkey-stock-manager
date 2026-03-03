import { useState, useMemo, useEffect } from 'react';
import { 
  Search, Plus, Minus, RefreshCw, LogOut, LayoutDashboard, Boxes, FileText, 
  Building2, AlertCircle, Trash2, ChevronDown, ChevronRight, 
  Package, Upload, FileUp, Loader2, X, CheckCircle, Sparkles
} from 'lucide-react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Auth } from './components/Auth';
import { supabase } from './lib/supabase';
import { initialProducts } from './data/products';
import { PRODUCT_LINES, getProductLine, isControlUnit, isReader, isMedia } from './lib/labkey-systems';

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || '');

type ViewMode = 'dashboard' | 'inventory' | 'invoices';

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
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingAI, setProcessingAI] = useState(false);
  const [uploadResults, setUploadResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);

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

  const extractInvoiceDataWithGemini = async (file: File): Promise<any> => {
    try {
      const base64Data = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result as string;
          resolve(base64.split(',')[1]);
        };
        reader.readAsDataURL(file);
      });

      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

      const prompt = `Extract the following information from this invoice PDF and return as JSON:
{
  "customer_name": "company or customer name",
  "invoice_date": "date in YYYY-MM-DD format",
  "invoice_number": "invoice number",
  "items": [
    {
      "sku": "product code (look for LK-XX-XXXX format)",
      "description": "product description",
      "quantity": number,
      "unit_price": number,
      "total_price": number
    }
  ],
  "subtotal": number,
  "tax": number,
  "total": number
}
Important:
- Look for LabKey product codes starting with "LK-" (like LK-BS-CU2, LK-NX-TN, etc.)
- Extract all line items with quantities and prices
- If a field is not found, use null or 0
- Return ONLY valid JSON, no markdown formatting`;

      const result = await model.generateContent([
        prompt,
        { inlineData: { mimeType: 'application/pdf', data: base64Data } }
      ]);

      const response = await result.response;
      const text = response.text();

      let extractedData;
      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          extractedData = JSON.parse(jsonMatch[0]);
        } else {
          extractedData = JSON.parse(text);
        }
      } catch (e) {
        return {
          customer_name: 'Unknown (Parse Error)',
          invoice_date: new Date().toISOString().split('T')[0],
          invoice_number: 'UNKNOWN',
          items: [],
          subtotal: 0,
          tax: 0,
          total: 0
        };
      }

      return {
        customer_name: extractedData.customer_name || 'Unknown Customer',
        invoice_date: extractedData.invoice_date || new Date().toISOString().split('T')[0],
        invoice_number: extractedData.invoice_number || 'UNKNOWN',
        items: extractedData.items || [],
        subtotal: extractedData.subtotal || 0,
        tax: extractedData.tax || 0,
        total: extractedData.total || 0
      };
    } catch (error) {
      console.error('Gemini extraction error:', error);
      throw error;
    }
  };

  const handleInvoiceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploading(true);
    setUploadProgress(0);
    setUploadResults([]);
    
    const results: any[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      try {
        const fileName = `invoices/${Date.now()}_${file.name}`;
        const { error: uploadError } = await supabase.storage.from('invoices').upload(fileName, file);
        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage.from('invoices').getPublicUrl(fileName);

        setProcessingAI(true);
        const extractedData = await extractInvoiceDataWithGemini(file);
        setProcessingAI(false);

        const { error: invoiceError } = await supabase.from('invoices').insert([{
          invoice_number: extractedData.invoice_number || `INV-${Date.now()}-${i}`,
          customer_id: null,
          total_amount: extractedData.total || 0,
          status: 'pending',
          notes: `Customer: ${extractedData.customer_name}\nDate: ${extractedData.invoice_date}\nItems: ${extractedData.items.length}\nTotal: $${extractedData.total}`,
          pdf_url: publicUrl,
          extracted_data: extractedData
        }]);

        if (invoiceError) throw invoiceError;

        let stockUpdated = 0;
        for (const item of extractedData.items) {
          const product = products.find(p => 
            p.product_code === item.sku || 
            p.product_code.toLowerCase() === item.sku?.toLowerCase()
          );
          if (product && product.in_stock >= item.quantity) {
            await handleUpdateStock(product.product_code, product.in_stock - item.quantity);
            stockUpdated++;
          }
        }

        results.push({
          file: file.name,
          status: 'success',
          customer: extractedData.customer_name,
          invoiceNumber: extractedData.invoice_number,
          date: extractedData.invoice_date,
          itemsFound: extractedData.items.length,
          items: extractedData.items,
          total: extractedData.total,
          stockUpdated: stockUpdated
        });

      } catch (err: any) {
        results.push({ file: file.name, status: 'error', error: err.message });
      }
      
      setUploadProgress(Math.round(((i + 1) / files.length) * 100));
    }

    setUploadResults(results);
    setShowResults(true);
    setUploading(false);
    fetchAllData();
  };

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) newExpanded.delete(category);
    else newExpanded.add(category);
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

  const organizedProducts = useMemo(() => {
    const filtered = searchTerm 
      ? products.filter(p => p.product_code.toLowerCase().includes(searchTerm.toLowerCase()) || p.description.toLowerCase().includes(searchTerm.toLowerCase()))
      : products;

    const organized: any = { CONTROL_UNITS: {}, READERS: {}, MEDIA: {}, ACCESSORIES: {} };

    filtered.forEach(product => {
      const line = getProductLine(product.product_code);
      if (line) {
        let subcategory = line.subcategory;
        if (line.line === 'MEDIA') subcategory = getMediaSubcategory(product.product_code);
        if (!organized[line.line][subcategory]) organized[line.line][subcategory] = [];
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

  if (!session) return <Auth onAuthSuccess={fetchAllData} />;

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
              <div className="bg-blue-600 p-2 rounded-lg"><Building2 className="w-6 h-6 text-white" /></div>
              <div>
                <h1 className="font-bold text-slate-900">LabKey Manager</h1>
                <p className="text-xs text-slate-500">Stock Management</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-600 hidden md:block">{session.user.email}</span>
              <button onClick={handleSignOut} className="p-2 text-slate-400 hover:text-red-600"><LogOut className="w-5 h-5" /></button>
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
        {viewMode === 'dashboard' && (
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
                  <div className={`p-2 bg-${stat.color}-100 rounded-lg`}><stat.icon className={`w-5 h-5 text-${stat.color}-600`} /></div>
                  <span className="text-sm text-slate-500">{stat.label}</span>
                </div>
                <p className={`text-2xl font-bold text-${stat.color}-600`}>{stat.value}</p>
              </div>
            ))}
          </div>
        )}

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
              {['CONTROL_UNITS', 'READERS', 'MEDIA', 'ACCESSORIES'].map((category) => {
                const line = PRODUCT_LINES[category as keyof typeof PRODUCT_LINES];
                const colors: any = {
                  CONTROL_UNITS: 'from-blue-50 to-blue-100 border-blue-200',
                  READERS: 'from-indigo-50 to-indigo-100 border-indigo-200',
                  MEDIA: 'from-teal-50 to-teal-100 border-teal-200',
                  ACCESSORIES: 'from-slate-50 to-slate-100 border-slate-200'
                };
                const icons: any = {
                  CONTROL_UNITS: Building2,
                  READERS: Package,
                  MEDIA: Boxes,
                  ACCESSORIES: Package
                };
                const iconColors: any = {
                  CONTROL_UNITS: 'text-blue-600',
                  READERS: 'text-indigo-600',
                  MEDIA: 'text-teal-600',
                  ACCESSORIES: 'text-slate-600'
                };
                const Icon = icons[category];
                
                return (
                  <div key={category} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <button 
                      onClick={() => toggleCategory(category)}
                      className={`w-full flex items-center justify-between p-4 bg-gradient-to-r ${colors[category]}`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={`w-6 h-6 ${iconColors[category]}`} />
                        <div className="text-left">
                          <h3 className="font-bold text-slate-900">{line.name}</h3>
                          <p className="text-sm text-slate-600">{line.description}</p>
                        </div>
                      </div>
                      {expandedCategories.has(category) ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                    </button>
                    
                    {expandedCategories.has(category) && (
                      <div className="p-4 space-y-4">
                        {Object.entries(line.subcategories).map(([key, subcat]: [string, any]) => {
                          const prods = organizedProducts[category][key] || [];
                          if (prods.length === 0) return null;
                          return (
                            <div key={key} className="border border-slate-200 rounded-lg overflow-hidden">
                              <div className={`p-3 ${subcat.color} text-white`}>
                                <h4 className="font-bold">{subcat.name}</h4>
                                <p className="text-sm opacity-90">{subcat.description}</p>
                              </div>
                              <div className="divide-y divide-slate-100">
                                {prods.map((product: any) => {
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
                                          <button onClick={() => handleUpdateStock(product.product_code, product.in_stock - 1)} className="w-8 h-8 flex items-center justify-center bg-slate-100 rounded hover:bg-red-100"><Minus className="w-4 h-4" /></button>
                                          <button onClick={() => handleUpdateStock(product.product_code, product.in_stock + 1)} className="w-8 h-8 flex items-center justify-center bg-slate-100 rounded hover:bg-emerald-100"><Plus className="w-4 h-4" /></button>
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
                );
              })}
            </div>
          </div>
        )}

        {viewMode === 'invoices' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 border border-slate-200">
              <div className="flex items-center gap-3 mb-4">
                <Sparkles className="w-6 h-6 text-purple-600" />
                <div>
                  <h2 className="text-xl font-bold text-slate-900">AI Invoice Processing</h2>
                  <p className="text-sm text-slate-500">Powered by Google Gemini 2.0 Flash</p>
                </div>
              </div>
              
              <p className="text-slate-600 mb-4">Upload multiple PDF invoices. Gemini AI will intelligently extract customer details, products, quantities, and prices.</p>
              
              <label className={`flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
                uploading ? 'bg-slate-50 border-slate-300' : 'border-slate-300 hover:bg-slate-50 hover:border-purple-400'
              }`}>
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  {uploading ? (
                    <>
                      <Loader2 className="w-8 h-8 text-purple-600 mb-2 animate-spin" />
                      <p className="text-sm text-slate-600">{processingAI ? '🤖 Gemini AI analyzing...' : `Uploading... ${uploadProgress}%`}</p>
                    </>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-slate-400 mb-2" />
                      <p className="text-sm text-slate-500">Click or drag multiple PDF files</p>
                      <p className="text-xs text-slate-400 mt-1">Gemini AI will extract all data</p>
                    </>
                  )}
                </div>
                <input type="file" className="hidden" accept=".pdf" multiple onChange={handleInvoiceUpload} disabled={uploading} />
              </label>
            </div>

            {showResults && uploadResults.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                  <h3 className="font-bold text-slate-900">Upload Results</h3>
                  <button onClick={() => setShowResults(false)} className="p-1 hover:bg-slate-100 rounded"><X className="w-5 h-5" /></button>
                </div>
                <div className="divide-y divide-slate-100">
                  {uploadResults.map((result, idx) => (
                    <div key={idx} className="p-4">
                      <div className="flex items-center gap-3 mb-2">
                        {result.status === 'success' ? <CheckCircle className="w-5 h-5 text-emerald-500" /> : <X className="w-5 h-5 text-red-500" />}
                        <span className="font-medium text-slate-900">{result.file}</span>
                        <span className={`px-2 py-1 text-xs rounded-full ${result.status === 'success' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{result.status}</span>
                      </div>
                      
                      {result.status === 'success' && (
                        <div className="ml-8 space-y-1 text-sm">
                          <p><strong>Customer:</strong> {result.customer}</p>
                          <p><strong>Invoice #:</strong> {result.invoiceNumber}</p>
                          <p><strong>Items Found:</strong> {result.itemsFound}</p>
                          <p><strong>Total:</strong> ${result.total}</p>
                          <p><strong>Stock Updated:</strong> {result.stockUpdated} items</p>
                        </div>
                      )}
                      
                      {result.status === 'error' && <p className="ml-8 text-sm text-red-600">{result.error}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="p-4 border-b border-slate-200"><h3 className="font-bold text-slate-900">Uploaded Invoices ({invoices.length})</h3></div>
              <div className="divide-y divide-slate-100">
                {invoices.map(invoice => (
                  <div key={invoice.id} className="p-4 flex items-center justify-between hover:bg-slate-50">
                    <div>
                      <p className="font-semibold text-slate-900">{invoice.invoice_number}</p>
                      <p className="text-sm text-slate-500">{new Date(invoice.date).toLocaleDateString()}</p>
                      {invoice.notes && <div className="mt-1 text-sm text-slate-600 whitespace-pre-line">{invoice.notes}</div>}
                    </div>
                    <div className="flex items-center gap-3">
                      {invoice.pdf_url && (
                        <a href={invoice.pdf_url} target="_blank" rel="noopener noreferrer" className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><FileUp className="w-5 h-5" /></a>
                      )}
                      <button 
                        onClick={() => { if (confirm('Delete?')) supabase.from('invoices').delete().eq('id', invoice.id).then(() => fetchAllData()); }}
                        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
                {invoices.length === 0 && (
                  <div className="p-8 text-center text-slate-400"><FileText className="w-12 h-12 mx-auto mb-4" /><p>No invoices uploaded yet</p></div>
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
