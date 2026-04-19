import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, addDoc, serverTimestamp, getDocs, where, doc, updateDoc, increment } from 'firebase/firestore';
import { ShoppingCart, Search, Plus, Trash2, User, CreditCard, Receipt, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../AuthContext';
import { toast } from 'sonner';

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
}

interface CartItem extends Product {
  quantity: number;
}

const Sales: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [paymentProvider, setPaymentProvider] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [proofImage, setProofImage] = useState<string | null>(null);
  const { user } = useAuth();

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProofImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const paymentMethods = [
    { id: 'Cash', label: 'Cash', providers: [] },
    { id: 'Mobile Money', label: 'Mobile Money', providers: ['MTN', 'Airtel'] },
    { id: 'Bank Transfer', label: 'Bank Transfer', providers: ['FNB E-wallet', 'Zanaco', 'Stanbic'] }
  ];

  // Auto-clear leading zero logic
  const handleNumberInput = (val: string, setter: (v: string) => void) => {
    const cleaned = val.replace(/^0+/, '');
    setter(cleaned);
  };

  useEffect(() => {
    const q = query(collection(db, 'products'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
      setProducts(items.filter(p => p.stock > 0));
    });
    return unsubscribe;
  }, []);

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          toast.error(`Only ${product.stock} units available`);
          return prev;
        }
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setIsProcessing(true);

    try {
      // 1. Create or find customer
      let customerId = 'walk-in';
      if (customerName && customerPhone) {
        const q = query(collection(db, 'customers'), where('phone', '==', customerPhone));
        const snap = await getDocs(q);
        
        if (!snap.empty) {
          customerId = snap.docs[0].id;
          const customerRef = doc(db, 'customers', customerId);
          await updateDoc(customerRef, {
            lastVisit: new Date().toISOString(),
            totalSpent: increment(total)
          });
        } else {
          const customerRef = await addDoc(collection(db, 'customers'), {
            name: customerName,
            phone: customerPhone,
            totalSpent: total,
            lastVisit: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            type: 'Sale'
          });
          customerId = customerRef.id;
        }
      }

      // 2. Create Sale Record
      await addDoc(collection(db, 'sales'), {
        customerId,
        customerName: customerName || 'Walk-in Customer',
        items: cart.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity
        })),
        total,
        paymentMethod,
        paymentProvider,
        proofImage,
        timestamp: serverTimestamp(),
        processedBy: user?.displayName
      });

      // 3. Update Stock
      for (const item of cart) {
        const productRef = doc(db, 'products', item.id);
        await updateDoc(productRef, {
          stock: increment(-item.quantity)
        });
      }

      toast.success('Sale completed successfully!');
      setCart([]);
      setCustomerName('');
      setCustomerPhone('');
      setPaymentProvider('');
      setProofImage(null);
    } catch (error) {
      console.error("Checkout error:", error);
      toast.error('Failed to process sale');
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-6">
        <header className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-editorial font-bold text-brand-gold uppercase tracking-widest italic">New Sale</h2>
            <p className="text-[10px] text-brand-pink font-medium italic-editorial tracking-widest uppercase">POS Terminals</p>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-brand-gold w-64"
            />
          </div>
        </header>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {filteredProducts.map((product) => (
            <motion.button
              key={product.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => addToCart(product)}
              className="glass-card p-4 text-left hover:border-brand-gold/50 transition-colors group"
            >
              <div className="flex justify-between items-start mb-2">
                <div className="p-2 rounded-lg bg-brand-gold/10 text-brand-gold group-hover:bg-brand-gold group-hover:text-brand-dark transition-colors">
                  <Plus size={20} />
                </div>
                <span className="text-[10px] font-bold text-brand-pink uppercase">{product.stock} in stock</span>
              </div>
              <h4 className="font-bold truncate">{product.name}</h4>
              <p className="text-brand-gold font-mono mt-1">ZK {product.price.toLocaleString()}</p>
            </motion.button>
          ))}
        </div>
      </div>

      <div className="space-y-6">
        <div className="glass-card p-6 sticky top-6">
          <h3 className="text-xl font-bold mb-6 flex items-center space-x-2">
            <ShoppingCart className="text-brand-gold" size={20} />
            <span>Current Cart</span>
          </h3>

          <div className="space-y-4 max-h-[300px] overflow-y-auto mb-6 pr-2">
            {cart.length === 0 ? (
              <div className="text-center py-10 text-gray-500 italic">
                Cart is empty
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.id} className="flex items-center justify-between group">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{item.name}</p>
                    <p className="text-xs text-gray-400">{item.quantity} x ZK {item.price.toLocaleString()}</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="font-mono text-brand-gold">ZK {(item.price * item.quantity).toLocaleString()}</span>
                    <button 
                      onClick={() => removeFromCart(item.id)}
                      className="text-gray-500 hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="space-y-4 pt-6 border-t border-white/10">
            <div className="space-y-2">
              <label className="text-[10px] text-gray-400 uppercase tracking-widest">Customer Details (Optional)</label>
              <div className="grid grid-cols-2 gap-2">
                <input 
                  type="text" 
                  placeholder="Name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm focus:border-brand-gold outline-none"
                />
                <input 
                  type="text" 
                  placeholder="Phone"
                  value={customerPhone}
                  onChange={(e) => handleNumberInput(e.target.value, setCustomerPhone)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm focus:border-brand-gold outline-none"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] text-gray-400 uppercase tracking-widest">Payment Method</label>
              <div className="grid grid-cols-1 gap-2">
                {paymentMethods.map(method => (
                  <div key={method.id} className="space-y-2">
                    <button
                      onClick={() => {
                        setPaymentMethod(method.id);
                        setPaymentProvider(method.providers[0] || '');
                      }}
                      className={`w-full py-2 text-xs rounded-lg border transition-all ${
                        paymentMethod === method.id 
                          ? 'border-brand-gold bg-brand-gold/10 text-brand-gold' 
                          : 'border-white/10 text-gray-400 hover:bg-white/5'
                      }`}
                    >
                      {method.label}
                    </button>
                    {paymentMethod === method.id && method.providers.length > 0 && (
                      <div className="flex gap-2 pl-4">
                        {method.providers.map(provider => (
                          <button
                            key={provider}
                            onClick={() => setPaymentProvider(provider)}
                            className={`px-3 py-1 text-[10px] rounded-full border transition-all ${
                              paymentProvider === provider
                                ? 'border-brand-pink bg-brand-pink/10 text-brand-pink'
                                : 'border-white/10 text-gray-500 hover:bg-white/5'
                            }`}
                          >
                            {provider}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {(paymentMethod === 'Mobile Money' || paymentMethod === 'Bank Transfer') && (
              <div className="space-y-2">
                <label className="text-[10px] text-gray-400 uppercase tracking-widest">Proof of Payment</label>
                <div className="flex items-center space-x-2">
                  <label className="flex-1 flex items-center justify-center px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-xs text-gray-400 cursor-pointer hover:bg-white/10 transition-colors">
                    <Plus size={14} className="mr-2" />
                    {proofImage ? 'Image Selected' : 'Upload Image'}
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                  {proofImage && (
                    <button 
                      onClick={() => setProofImage(null)}
                      className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
                {proofImage && (
                  <div className="mt-2 relative h-20 w-full rounded-lg overflow-hidden border border-white/10">
                    <img src={proofImage} className="w-full h-full object-cover" alt="Proof" />
                  </div>
                )}
              </div>
            )}

            <div className="pt-4 space-y-2">
              <div className="flex justify-between text-gray-400 text-sm">
                <span>Subtotal</span>
                <span>ZK {total.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xl font-bold text-brand-gold">
                <span>Total</span>
                <span>ZK {total.toLocaleString()}</span>
              </div>
            </div>

            <button 
              disabled={cart.length === 0 || isProcessing}
              onClick={handleCheckout}
              className={`
                w-full py-4 rounded-xl font-bold shadow-lg transition-all flex items-center justify-center space-x-2
                ${cart.length === 0 || isProcessing 
                  ? 'bg-gray-800 text-gray-500 cursor-not-allowed' 
                  : 'gold-gradient text-brand-dark hover:scale-[1.02]'}
              `}
            >
              {isProcessing ? (
                <div className="w-6 h-6 border-2 border-brand-dark border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <CheckCircle2 size={20} />
                  <span>Complete Sale</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sales;
