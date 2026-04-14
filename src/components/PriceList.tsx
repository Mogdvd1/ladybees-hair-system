import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { List, Search, Download, Tag, Package, DollarSign } from 'lucide-react';
import { motion } from 'motion/react';

interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
}

const PriceList: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'products'), orderBy('name'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
      setProducts(items);
    });
    return unsubscribe;
  }, []);

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const categories = Array.from(new Set(products.map(p => p.category)));

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-3xl font-display font-bold text-brand-gold">Price List</h2>
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Search prices..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-brand-gold w-64"
            />
          </div>
          <button className="flex items-center space-x-2 px-4 py-2 border border-brand-gold/30 text-brand-gold rounded-xl hover:bg-brand-gold/10 transition-all">
            <Download size={18} />
            <span>Export PDF</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-1 space-y-6">
          <div className="glass-card p-6">
            <h3 className="font-bold mb-4 flex items-center space-x-2">
              <Tag size={18} className="text-brand-pink" />
              <span>Categories</span>
            </h3>
            <div className="space-y-2">
              <button className="w-full text-left px-3 py-2 rounded-lg bg-brand-gold/10 text-brand-gold text-sm font-medium">
                All Items ({products.length})
              </button>
              {categories.map(cat => (
                <button key={cat} className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/5 text-gray-400 text-sm transition-colors">
                  {cat || 'Uncategorized'}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="md:col-span-3 glass-card overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5">
                <th className="p-4 text-brand-gold font-display uppercase text-[10px] tracking-widest">Product Name</th>
                <th className="p-4 text-brand-gold font-display uppercase text-[10px] tracking-widest">Category</th>
                <th className="p-4 text-brand-gold font-display uppercase text-[10px] tracking-widest text-right">Unit Price</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product) => (
                <tr key={product.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center space-x-3">
                      <Package size={16} className="text-gray-500" />
                      <span className="font-medium">{product.name}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="text-xs text-gray-400 bg-white/5 px-2 py-1 rounded">{product.category || 'N/A'}</span>
                  </td>
                  <td className="p-4 text-right">
                    <span className="font-mono font-bold text-brand-gold">K{product.price.toLocaleString()}</span>
                  </td>
                </tr>
              ))}
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={3} className="p-10 text-center text-gray-500 italic">No products found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PriceList;
