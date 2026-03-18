import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ShoppingCart, Plus, Minus, Trash2, Settings, Store, ArrowRight, Image as ImageIcon, MessageCircle, Lock, Loader2, Download, Upload } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, onSnapshot, setDoc } from 'firebase/firestore';

// --- FIREBASE CLOUD SETUP (YOURS) ---
const firebaseConfig = {
  apiKey: "AIzaSyBFQKhBQcfTYhLr40X8vCazEt4OBCIIj7U",
  authDomain: "truevve-fish-it-store.firebaseapp.com",
  projectId: "truevve-fish-it-store",
  storageBucket: "truevve-fish-it-store.firebasestorage.app",
  messagingSenderId: "353036330063",
  appId: "1:353036330063:web:a678e904994fe4ceccf63a",
  measurementId: "G-884RTEZ9Y8"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = "truevve-store";

const formatIDR = (amount) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

export default function App() {
  const [user, setUser] = useState(null);
  const [isCloudLoading, setIsCloudLoading] = useState(true);
  const [view, setView] = useState('store');
  const [items, setItems] = useState([]);
  const [qrisUrl, setQrisUrl] = useState('');
  const [username, setUsername] = useState('');
  const [cart, setCart] = useState({});
  const [activeCategory, setActiveCategory] = useState('Semua');
  const [showQrisModal, setShowQrisModal] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');

  // --- CATEGORY CONFIG ---
  const CATEGORY_ORDER = ['Semua', 'Ikan', 'Batu', 'Skin', 'Buff', 'Emote', 'Boat', 'Crate'];
  const CATEGORY_STYLES = {
    Semua:  { active: 'bg-slate-800 text-white border-slate-800',  inactive: 'bg-white text-slate-600 border-slate-200 hover:border-slate-400' },
    Ikan:   { active: 'bg-blue-500 text-white border-blue-500',    inactive: 'bg-white text-blue-600 border-blue-200 hover:border-blue-400' },
    Batu:   { active: 'bg-stone-500 text-white border-stone-500',  inactive: 'bg-white text-stone-600 border-stone-200 hover:border-stone-400' },
    Skin:   { active: 'bg-pink-500 text-white border-pink-500',    inactive: 'bg-white text-pink-600 border-pink-200 hover:border-pink-400' },
    Buff:   { active: 'bg-amber-500 text-white border-amber-500',  inactive: 'bg-white text-amber-600 border-amber-200 hover:border-amber-400' },
    Emote:  { active: 'bg-purple-500 text-white border-purple-500',inactive: 'bg-white text-purple-600 border-purple-200 hover:border-purple-400' },
    Boat:   { active: 'bg-cyan-500 text-white border-cyan-500',    inactive: 'bg-white text-cyan-600 border-cyan-200 hover:border-cyan-400' },
    Crate:  { active: 'bg-orange-500 text-white border-orange-500',inactive: 'bg-white text-orange-600 border-orange-200 hover:border-orange-400' },
  };
  const CATEGORY_EMOJI = {
    Semua: '🛒', Ikan: '🐟', Batu: '💎', Skin: '🎨',
    Buff: '⚡', Emote: '😄', Boat: '⛵', Crate: '📦',
  };

  const getItemCategory = (name) => {
    const match = name.match(/^\[(\w+)\]/);
    return match ? match[1] : null;
  };

  const availableCategories = useMemo(() => {
    const found = new Set(items.map(i => getItemCategory(i.name)).filter(Boolean));
    return CATEGORY_ORDER.filter(c => c === 'Semua' || found.has(c));
  }, [items]);

  const filteredItems = useMemo(() => {
    if (activeCategory === 'Semua') return items;
    return items.filter(i => getItemCategory(i.name) === activeCategory);
  }, [items, activeCategory]);

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          try {
            await signInWithCustomToken(auth, __initial_auth_token);
          } catch (tokenError) {
            console.warn("Token tidak cocok dengan project ini, menggunakan login anonim.", tokenError);
            await signInAnonymously(auth);
          }
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error("Gagal terhubung ke sistem:", error);
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'storeConfig', 'main');
    const unsubscribe = onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setItems(data.items || []);
        setQrisUrl(data.qrisUrl || 'https://upload.wikimedia.org/wikipedia/commons/d/d0/QR_code_for_mobile_English_Wikipedia.svg');
      } else {
        setItems([]);
        setQrisUrl('https://upload.wikimedia.org/wikipedia/commons/d/d0/QR_code_for_mobile_English_Wikipedia.svg');
      }
      setIsCloudLoading(false);
    }, (error) => {
      console.error("Gagal mengambil data toko:", error);
      setIsCloudLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  const updateItemsInCloud = async (newItems) => {
    setItems(newItems);
    if (!user) return;
    try {
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'storeConfig', 'main');
      await setDoc(docRef, { items: newItems }, { merge: true });
    } catch (error) {
      console.error("Gagal menyimpan item:", error);
    }
  };

  const updateQrisInCloud = async (newUrl) => {
    setQrisUrl(newUrl);
    if (!user) return;
    try {
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'storeConfig', 'main');
      await setDoc(docRef, { qrisUrl: newUrl }, { merge: true });
    } catch (error) {
      console.error("Gagal menyimpan QRIS:", error);
    }
  };

  const cartItems = useMemo(() => {
    return Object.entries(cart)
      .filter(([_, qty]) => qty > 0)
      .map(([id, qty]) => {
        const item = items.find(i => i.id === id);
        return { ...item, qty };
      })
      .filter(item => item && item.name);
  }, [cart, items]);

  const cartTotal = useMemo(() => {
    return cartItems.reduce((total, item) => total + (item.price * item.qty), 0);
  }, [cartItems]);

  // --- CHANGE 3: Manual quantity input handler (1–999) ---
  const updateCartQty = (itemId, value) => {
    const parsed = parseInt(value, 10);
    const newQty = isNaN(parsed) ? 0 : Math.min(999, Math.max(0, parsed));
    setCart(prev => ({ ...prev, [itemId]: newQty }));
  };

  const updateCart = (itemId, delta) => {
    setCart(prev => {
      const currentQty = prev[itemId] || 0;
      const newQty = Math.min(999, Math.max(0, currentQty + delta));
      return { ...prev, [itemId]: newQty };
    });
  };

  const handleDashboardAccess = () => {
    setShowPinModal(true);
    setPinInput('');
    setPinError('');
  };

  const verifyPin = () => {
    if (pinInput === import.meta.env.VITE_DASHBOARD_PIN) {
      setView('dashboard');
      setShowPinModal(false);
    } else {
      setPinError('PIN Salah! Coba lagi.');
    }
  };

  const handleCheckout = () => {
    if (!username.trim()) {
      alert("Tolong masukkan username terlebih dahulu.");
      return;
    }
    if (cartItems.length === 0) return;
    setShowQrisModal(true);
  };

  const handleSendWhatsApp = () => {
    const itemsListString = cartItems.map(item => `${item.name} (x${item.qty})`).join(', ');
    const totalString = formatIDR(cartTotal);

    const message = `TRUEVVE FISH IT ORDER FORM
Halo kak, aku mau order ya!
username: ${username}
item: ${itemsListString}
total: ${totalString}

Berikut bukti bayar via qrisnya kak!`;

    const encodedMessage = encodeURIComponent(message);
    // --- CHANGE 2: Updated WhatsApp number ---
    const waLink = `https://wa.me/6285185793108?text=${encodedMessage}`;
    window.open(waLink, '_blank');
    setShowQrisModal(false);
  };

  if (isCloudLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-500">
        <Loader2 className="animate-spin mb-4 text-blue-600" size={40} />
        <p>Memuat toko online Anda...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-blue-200">
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">T</div>
            <h1 className="text-xl font-bold tracking-tight text-slate-800">TRUEVVE FISH IT</h1>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setView('store')}
              className={`px-4 py-2 rounded-md flex items-center gap-2 text-sm font-medium transition-colors ${view === 'store' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              <Store size={18} /> Store
            </button>
            <button
              onClick={handleDashboardAccess}
              className={`px-4 py-2 rounded-md flex items-center gap-2 text-sm font-medium transition-colors ${view === 'dashboard' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              <Settings size={18} /> Dashboard
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {view === 'dashboard' ? (
          <Dashboard
            items={items}
            setItems={updateItemsInCloud}
            qrisUrl={qrisUrl}
            setQrisUrl={updateQrisInCloud}
          />
        ) : (
          <div className="flex flex-col lg:flex-row gap-8">
            <div className="flex-1 space-y-8">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <label htmlFor="username" className="block text-sm font-medium text-slate-700 mb-2">
                  Masukkan Username Anda <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Contoh: Budi123"
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-slate-800">Pilih Item</h2>
                  <span className="text-sm text-slate-400">{filteredItems.length} item</span>
                </div>

                {/* CATEGORY FILTER BAR */}
                {availableCategories.length > 1 && (
                  <div className="flex flex-wrap gap-2 mb-5">
                    {availableCategories.map(cat => {
                      const style = CATEGORY_STYLES[cat] || CATEGORY_STYLES['Semua'];
                      const isActive = activeCategory === cat;
                      return (
                        <button
                          key={cat}
                          onClick={() => setActiveCategory(cat)}
                          className={`px-4 py-1.5 rounded-full border text-sm font-semibold transition-all ${isActive ? style.active : style.inactive}`}
                        >
                          {CATEGORY_EMOJI[cat]} {cat}
                        </button>
                      );
                    })}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredItems.map(item => {
                    const qty = cart[item.id] || 0;
                    const category = getItemCategory(item.name);
                    const displayName = item.name.replace(/^\[\w+\]\s*/, '');
                    const catStyle = category && CATEGORY_STYLES[category];
                    return (
                      <div key={item.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col transition-transform hover:-translate-y-1 hover:shadow-md">
                        <div className="flex flex-col flex-1">
                          {category && catStyle && (
                            <span className={`self-start text-xs font-bold px-2 py-0.5 rounded-full border mb-2 ${catStyle.inactive}`}>
                              {CATEGORY_EMOJI[category]} {category}
                            </span>
                          )}
                          <h3 className="font-semibold text-slate-800 line-clamp-2">{displayName}</h3>
                          <p className="text-blue-600 font-bold mt-1 text-lg">{formatIDR(item.price)}</p>

                          <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
                            <span className="text-sm text-slate-500">Kuantitas</span>
                            <div className="flex items-center gap-2 bg-slate-50 rounded-lg p-1 border border-slate-200">
                              <button
                                onClick={() => updateCart(item.id, -1)}
                                disabled={qty === 0}
                                className="w-8 h-8 flex items-center justify-center rounded-md bg-white text-slate-600 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100 transition-colors"
                              >
                                <Minus size={16} />
                              </button>
                              <input
                                type="number"
                                min="0"
                                max="999"
                                value={qty === 0 ? '' : qty}
                                placeholder="0"
                                onChange={(e) => updateCartQty(item.id, e.target.value)}
                                className="w-14 text-center font-medium bg-white border border-slate-200 rounded-md py-1 text-sm outline-none focus:ring-2 focus:ring-blue-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              />
                              <button
                                onClick={() => updateCart(item.id, 1)}
                                disabled={qty >= 999}
                                className="w-8 h-8 flex items-center justify-center rounded-md bg-white text-slate-600 shadow-sm hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              >
                                <Plus size={16} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {filteredItems.length === 0 && items.length > 0 && (
                    <div className="col-span-full py-12 text-center text-slate-500 bg-white rounded-2xl border border-dashed border-slate-300">
                      Tidak ada item di kategori <strong>{activeCategory}</strong>.
                    </div>
                  )}
                  {items.length === 0 && (
                    <div className="col-span-full py-12 text-center text-slate-500 bg-white rounded-2xl border border-dashed border-slate-300">
                      Belum ada item di toko. Masuk ke menu Dashboard untuk menambahkan.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="w-full lg:w-96 shrink-0">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 sticky top-24 overflow-hidden flex flex-col max-h-[calc(100vh-8rem)]">
                <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center gap-2 text-slate-800">
                  <ShoppingCart size={20} className="text-blue-600" />
                  <h2 className="font-bold text-lg">Keranjang Belanja</h2>
                </div>

                <div className="p-5 flex-1 overflow-y-auto min-h-[150px]">
                  {cartItems.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-3 py-8">
                      <ShoppingCart size={48} className="opacity-20" />
                      <p className="text-sm">Keranjang masih kosong</p>
                    </div>
                  ) : (
                    <ul className="space-y-4">
                      {cartItems.map(item => (
                        <li key={item.id} className="flex justify-between items-start text-sm">
                          <div className="flex-1 pr-4">
                            <p className="font-medium text-slate-800 leading-tight">{item.name}</p>
                            <p className="text-slate-500 mt-1">{formatIDR(item.price)} <span className="text-xs">x{item.qty}</span></p>
                          </div>
                          <p className="font-semibold text-slate-800 whitespace-nowrap">{formatIDR(item.price * item.qty)}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="p-5 bg-slate-50 border-t border-slate-100">
                  <div className="flex justify-between items-center mb-4">
                    <span className="font-semibold text-slate-600">Total</span>
                    <span className="text-xl font-bold text-blue-600">{formatIDR(cartTotal)}</span>
                  </div>
                  <button
                    onClick={handleCheckout}
                    disabled={cartItems.length === 0 || !username.trim()}
                    className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl font-medium flex items-center justify-center gap-2 transition-colors"
                  >
                    Checkout Sekarang <ArrowRight size={18} />
                  </button>
                  {(!username.trim() && cartItems.length > 0) && (
                    <p className="text-red-500 text-xs text-center mt-2">Masukkan username terlebih dahulu</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* QRIS MODAL */}
      {showQrisModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 text-center">
              <h3 className="text-2xl font-bold text-slate-800 mb-2">Scan QRIS</h3>
              <p className="text-slate-600 mb-6">Silakan scan kode QR di bawah ini untuk membayar total <span className="font-bold text-slate-800">{formatIDR(cartTotal)}</span></p>
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 inline-block mb-6 shadow-sm">
                <img
                  src={qrisUrl}
                  alt="QRIS Payment"
                  className="w-64 h-64 object-contain mx-auto"
                  onError={(e) => { e.target.src = 'https://via.placeholder.com/250?text=QRIS+BELUM+DIATUR'; }}
                />
              </div>
              <div className="space-y-3">
                <button
                  onClick={handleSendWhatsApp}
                  className="w-full py-4 px-4 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-md shadow-green-500/20"
                >
                  <MessageCircle size={22} />
                  Kirim Bukti & Order ke WhatsApp
                </button>
                <button
                  onClick={() => setShowQrisModal(false)}
                  className="w-full py-3 px-4 bg-white text-slate-600 hover:bg-slate-50 border border-slate-200 rounded-xl font-medium transition-colors"
                >
                  Kembali
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PIN MODAL */}
      {showPinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden p-6 text-center">
            <div className="mx-auto w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4">
              <Lock size={24} />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Akses Dashboard</h3>
            <p className="text-sm text-slate-600 mb-6">Masukkan PIN rahasia untuk mengatur toko.</p>
            <input
              type="password"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && verifyPin()}
              placeholder="Masukkan PIN..."
              className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 text-center text-lg tracking-widest mb-2 outline-none"
              autoFocus
            />
            {pinError && <p className="text-red-500 text-sm mb-4">{pinError}</p>}
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowPinModal(false)} className="flex-1 py-3 px-4 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl font-medium transition-colors">
                Batal
              </button>
              <button onClick={verifyPin} className="flex-1 py-3 px-4 bg-blue-600 text-white hover:bg-blue-700 rounded-xl font-medium transition-colors">
                Masuk
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- DASHBOARD COMPONENT ---
function Dashboard({ items, setItems, qrisUrl, setQrisUrl }) {
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [importError, setImportError] = useState('');
  const fileInputRef = useRef(null);

  const handleAddItem = (e) => {
    e.preventDefault();
    if (!newItemName || !newItemPrice) return;
    const newItem = {
      id: Date.now().toString(),
      name: newItemName,
      price: parseInt(newItemPrice, 10)
    };
    setItems([...items, newItem]);
    setNewItemName('');
    setNewItemPrice('');
  };

  const handleRemoveItem = (id) => {
    setItems(items.filter(item => item.id !== id));
  };

  // --- CHANGE 1: Export to CSV ---
  const handleExportCSV = () => {
    if (items.length === 0) {
      alert("Tidak ada item untuk diekspor.");
      return;
    }
    const header = 'name,price';
    const rows = items.map(item => `"${item.name.replace(/"/g, '""')}",${item.price}`);
    const csvContent = [header, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'truevve_items.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // --- CHANGE 1: Import from CSV ---
  const handleImportCSV = (e) => {
    setImportError('');
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        const lines = text.trim().split('\n');

        // Expect header: name,price
        if (lines.length < 2) throw new Error("File CSV kosong atau tidak valid.");

        const header = lines[0].toLowerCase().replace(/\s/g, '');
        if (!header.includes('name') || !header.includes('price')) {
          throw new Error("Header CSV harus mengandung 'name' dan 'price'.");
        }

        const parsedItems = [];
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          // Handle quoted fields (e.g. "Ikan Koi, Premium",50000)
          const match = line.match(/^"((?:[^"]|"")*)"\s*,\s*(\d+)$/) ||
                        line.match(/^([^,]+)\s*,\s*(\d+)$/);
          if (!match) throw new Error(`Format baris ${i + 1} tidak valid: "${line}"`);

          const name = match[1].replace(/""/g, '"').trim();
          const price = parseInt(match[2], 10);

          if (!name || isNaN(price) || price < 0) {
            throw new Error(`Data baris ${i + 1} tidak valid.`);
          }
          parsedItems.push({ id: Date.now().toString() + i, name, price });
        }

        if (parsedItems.length === 0) throw new Error("Tidak ada item valid di file CSV.");

        if (window.confirm(`Ditemukan ${parsedItems.length} item. Ini akan MENGGANTIKAN semua item yang ada. Lanjutkan?`)) {
          setItems(parsedItems);
        }
      } catch (err) {
        setImportError(`Gagal import: ${err.message}`);
      }
      // Reset input so same file can be re-imported
      e.target.value = '';
    };
    reader.readAsText(file);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-300">
      <div className="bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-xl mb-6">
        <p className="text-sm font-medium">✨ <strong>Mode Cloud Aktif:</strong> Setiap perubahan yang Anda buat di sini akan langsung tersimpan permanen dan langsung terlihat oleh pelanggan Anda.</p>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Dashboard Pengaturan</h2>
          <p className="text-slate-500">Atur item yang dijual dan perbarui kode QRIS Anda di sini.</p>
        </div>
        {/* --- CHANGE 1: Import/Export buttons --- */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
          >
            <Download size={16} /> Export CSV
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
          >
            <Upload size={16} /> Import CSV
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleImportCSV}
            className="hidden"
          />
        </div>
      </div>

      {importError && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-sm">
          ⚠️ {importError}
        </div>
      )}

      {/* CSV Format Guide */}
      <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-sm text-slate-600">
        <p className="font-semibold text-slate-700 mb-1">📋 Format CSV untuk Import:</p>
        <code className="block bg-white border border-slate-200 rounded-lg p-3 text-xs font-mono text-slate-700 whitespace-pre">
{`name,price
Ikan Koi Premium,150000
Pakan Ikan 500gr,35000
"Aquarium 60cm, Lengkap",450000`}
        </code>
        <p className="mt-2 text-xs text-slate-500">Header pertama harus <strong>name,price</strong>. Nama yang mengandung koma harus dibungkus tanda kutip.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* QRIS SETTINGS */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-slate-800">
              <ImageIcon size={20} className="text-blue-500" />
              Pengaturan QRIS
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">URL Gambar QRIS</label>
                <input
                  type="text"
                  value={qrisUrl}
                  onChange={(e) => setQrisUrl(e.target.value)}
                  placeholder="Paste direct link (berakhiran .jpg / .png)..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                />
                <p className="text-xs text-slate-500 mt-1">Pastikan link berakhiran .jpg/.png (Klik kanan pada gambar &gt; Copy Image Address)</p>
              </div>
              <div className="aspect-square bg-slate-50 rounded-xl border border-dashed border-slate-300 flex items-center justify-center p-2 overflow-hidden">
                <img
                  src={qrisUrl}
                  alt="QRIS Preview"
                  className="w-full h-full object-contain"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ITEMS SETTINGS */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-slate-800">
              <Plus size={20} className="text-blue-500" />
              Tambah Item Baru
            </h3>
            <form onSubmit={handleAddItem} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nama Item</label>
                  <input
                    type="text"
                    required
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    placeholder="Contoh: Ikan Koi"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Harga (IDR)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={newItemPrice}
                    onChange={(e) => setNewItemPrice(e.target.value)}
                    placeholder="Contoh: 50000"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors"
              >
                Tambah Ke Daftar
              </button>
            </form>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-lg text-slate-800">Daftar Item Aktif ({items.length})</h3>
            </div>
            <ul className="divide-y divide-slate-100">
              {items.length === 0 && (
                <li className="p-8 text-center text-slate-500">Belum ada item. Tambahkan di atas atau import via CSV.</li>
              )}
              {items.map(item => (
                <li key={item.id} className="p-4 flex items-center gap-4 hover:bg-slate-50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 truncate">{item.name}</p>
                    <p className="text-sm text-slate-500">{formatIDR(item.price)}</p>
                  </div>
                  <button
                    onClick={() => handleRemoveItem(item.id)}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="Hapus Item"
                  >
                    <Trash2 size={20} />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}