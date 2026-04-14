import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, addDoc, updateDoc, doc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { Plus, Search, Edit2, Trash2, Package, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { useAuth } from '../AuthContext';

interface Product {
  id: string;
  name: string;
  category: string;
  buyingCost: number;
  shippingCost: number;
  logisticsCost: number;
  markupPercent: number;
  price: number; // Calculated selling price
  stock: number;
  minStock: number;
  image?: string;
  buyingReceipt?: string;
}

const Products: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { isAdmin, user } = useAuth();
  
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    buyingCost: 0,
    shippingCost: 0,
    logisticsCost: 0,
    markupPercent: 30,
    stock: 0,
    minStock: 5,
    image: '',
    buyingReceipt: ''
  });

  // Calculate base cost and selling price
  const baseCost = formData.buyingCost + formData.shippingCost + formData.logisticsCost;
  const sellingPrice = baseCost * (1 + formData.markupPercent / 100);

  useEffect(() => {
    const q = query(collection(db, 'products'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
      setProducts(items);
    });
    return unsubscribe;
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'image' | 'buyingReceipt' = 'image') => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 800000) {
        toast.error('Image too large. Please use an image smaller than 800KB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, [field]: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      toast.error('You do not have permission to add products. Please log in as the CEO.');
      return;
    }
    
    console.log('Attempting to save product...', {
      editingId,
      isAdmin,
      userEmail: user?.email,
      uid: user?.uid,
      data: {
        ...formData,
        price: Number(sellingPrice.toFixed(2))
      }
    });

    try {
      const productData = {
        name: formData.name,
        category: formData.category,
        buyingCost: formData.buyingCost,
        shippingCost: formData.shippingCost,
        logisticsCost: formData.logisticsCost,
        markupPercent: formData.markupPercent,
        price: Number(sellingPrice.toFixed(2)),
        stock: formData.stock,
        minStock: formData.minStock,
        image: formData.image || '',
        buyingReceipt: formData.buyingReceipt || '',
        updatedAt: new Date().toISOString()
      };

      if (editingId) {
        const docRef = doc(db, 'products', editingId);
        console.log('Updating doc:', docRef.path);
        await updateDoc(docRef, productData);
        toast.success('Product updated successfully!');
      } else {
        const colRef = collection(db, 'products');
        console.log('Adding to collection:', colRef.path);
        await addDoc(colRef, {
          ...productData,
          createdAt: serverTimestamp()
        });
        toast.success('Product added successfully!');
      }
      
      handleCloseModal();
    } catch (error: any) {
      console.error("Error adding product:", error);
      
      // Detailed error logging for diagnostics
      const errInfo = {
        error: error.message,
        code: error.code,
        authEmail: user?.email,
        isAdmin: isAdmin
      };
      console.error('Firestore Error Details:', JSON.stringify(errInfo));
      
      if (error.code === 'permission-denied') {
        toast.error(`Permission Denied (Firestore): Your account (${user?.email}) does not have permission to write to this database. Please check if the security rules are deployed and your email is correctly set as CEO.`);
      } else {
        toast.error(`Firestore Error [${error.code}]: ${error.message}`);
      }
    }
  };

  const handleEdit = (product: Product) => {
    console.log('Editing product:', product.id);
    setEditingId(product.id);
    setFormData({
      name: product.name,
      category: product.category,
      buyingCost: product.buyingCost,
      shippingCost: product.shippingCost,
      logisticsCost: product.logisticsCost,
      markupPercent: product.markupPercent,
      stock: product.stock,
      minStock: product.minStock,
      image: product.image || ''
    });
    setIsModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    console.log('Deleting product:', deleteId);
    try {
      await deleteDoc(doc(db, 'products', deleteId));
      toast.success('Product deleted successfully');
      setDeleteId(null);
    } catch (error: any) {
      console.error('Delete error:', error);
      toast.error(`Failed to delete product: ${error.message}`);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({ 
      name: '', 
      category: '', 
      buyingCost: 0, 
      shippingCost: 0, 
      logisticsCost: 0, 
      markupPercent: 30, 
      stock: 0, 
      minStock: 5,
      image: ''
    });
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-3xl font-cursive font-bold text-brand-gold">Product Catalog</h2>
        <div className="flex items-center space-x-4">
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
          {isAdmin ? (
            <button 
              onClick={() => setIsModalOpen(true)}
              className="flex items-center space-x-2 px-4 py-2 gold-gradient text-brand-dark font-bold rounded-xl shadow-lg hover:scale-105 transition-transform"
            >
              <Plus size={20} />
              <span>Add Product</span>
            </button>
          ) : (
            <div className="px-4 py-2 bg-brand-pink/10 border border-brand-pink/20 rounded-xl text-brand-pink text-[10px] font-bold uppercase tracking-widest">
              CEO Access Required to Add Products
            </div>
          )}
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="border-bottom border-white/10 bg-white/5">
                <th className="p-4 text-brand-gold font-display uppercase text-xs tracking-widest">Product</th>
                <th className="p-4 text-brand-gold font-display uppercase text-xs tracking-widest">Category</th>
                <th className="p-4 text-brand-gold font-display uppercase text-xs tracking-widest">Base Cost</th>
                <th className="p-4 text-brand-gold font-display uppercase text-xs tracking-widest">Selling Price</th>
                <th className="p-4 text-brand-gold font-display uppercase text-xs tracking-widest">Stock</th>
                <th className="p-4 text-brand-gold font-display uppercase text-xs tracking-widest">Status</th>
                {isAdmin && <th className="p-4 text-brand-gold font-display uppercase text-xs tracking-widest text-right">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product) => {
                const pBaseCost = (product.buyingCost || 0) + (product.shippingCost || 0) + (product.logisticsCost || 0);
                return (
                  <tr key={product.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center space-x-3">
                        {product.image ? (
                          <img src={product.image} className="w-10 h-10 rounded-lg object-cover border border-white/10" alt={product.name} />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-brand-gold/10 flex items-center justify-center text-brand-gold">
                            <Package size={20} />
                          </div>
                        )}
                        <span className="font-medium">{product.name}</span>
                      </div>
                    </td>
                    <td className="p-4 text-gray-400">{product.category}</td>
                    <td className="p-4 font-mono text-sm text-gray-400">ZK {pBaseCost.toLocaleString()}</td>
                    <td className="p-4 font-mono font-bold text-brand-gold">ZK {product.price.toLocaleString()}</td>
                    <td className="p-4 font-mono">{product.stock}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                        product.stock <= product.minStock 
                          ? 'bg-red-400/10 text-red-400' 
                          : 'bg-green-400/10 text-green-400'
                      }`}>
                        {product.stock <= product.minStock ? 'Low Stock' : 'In Stock'}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="p-4 text-right space-x-2">
                        <button 
                          onClick={() => handleEdit(product)}
                          className="p-2 text-gray-400 hover:text-brand-gold transition-colors"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => setDeleteId(product.id)}
                          className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-card w-full max-w-2xl p-8 my-8"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-cursive font-bold text-brand-gold">
                  {editingId ? 'Edit Product' : 'Add New Product'}
                </h3>
                <button onClick={handleCloseModal} className="text-gray-400 hover:text-white">✕</button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs text-gray-400 uppercase tracking-widest mb-1">Product Name</label>
                      <input 
                        required
                        type="text" 
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-brand-gold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 uppercase tracking-widest mb-1">Category</label>
                      <input 
                        type="text" 
                        value={formData.category}
                        onChange={(e) => setFormData({...formData, category: e.target.value})}
                        className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-brand-gold"
                        placeholder="e.g. Wigs, Bundles"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 uppercase tracking-widest mb-1">Product Image</label>
                      <div className="space-y-2">
                        {formData.image ? (
                          <div className="relative group h-32">
                            <img 
                              src={formData.image} 
                              alt="Product preview" 
                              className="w-full h-full object-cover rounded-xl border border-brand-gold/30"
                            />
                            <button 
                              type="button"
                              onClick={() => setFormData({...formData, image: ''})}
                              className="absolute top-2 right-2 p-1 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-white/10 rounded-xl hover:border-brand-gold/50 hover:bg-white/5 transition-all cursor-pointer">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                              <Plus className="text-brand-gold mb-2" size={24} />
                              <p className="text-[10px] text-gray-400">Upload Product Image</p>
                            </div>
                            <input 
                              type="file" 
                              className="hidden" 
                              accept="image/*"
                              onChange={(e) => handleFileChange(e, 'image')}
                            />
                          </label>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 uppercase tracking-widest mb-1">Buying Receipt</label>
                      <div className="space-y-2">
                        {formData.buyingReceipt ? (
                          <div className="relative group h-32">
                            <img 
                              src={formData.buyingReceipt} 
                              alt="Receipt preview" 
                              className="w-full h-full object-cover rounded-xl border border-brand-gold/30"
                            />
                            <button 
                              type="button"
                              onClick={() => setFormData({...formData, buyingReceipt: ''})}
                              className="absolute top-2 right-2 p-1 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-white/10 rounded-xl hover:border-brand-gold/50 hover:bg-white/5 transition-all cursor-pointer">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                              <Plus className="text-brand-gold mb-2" size={24} />
                              <p className="text-[10px] text-gray-400">Upload Buying Receipt</p>
                            </div>
                            <input 
                              type="file" 
                              className="hidden" 
                              accept="image/*"
                              onChange={(e) => handleFileChange(e, 'buyingReceipt')}
                            />
                          </label>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 p-4 bg-white/5 rounded-2xl border border-white/10">
                    <h4 className="text-sm font-bold text-brand-gold uppercase tracking-widest border-b border-white/10 pb-2">Price Template</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] text-gray-400 uppercase mb-1">Buying Cost (ZK)</label>
                        <input 
                          type="number" 
                          value={formData.buyingCost}
                          onChange={(e) => setFormData({...formData, buyingCost: Number(e.target.value)})}
                          className="w-full px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-brand-gold text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-gray-400 uppercase mb-1">Shipping (ZK)</label>
                        <input 
                          type="number" 
                          value={formData.shippingCost}
                          onChange={(e) => setFormData({...formData, shippingCost: Number(e.target.value)})}
                          className="w-full px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-brand-gold text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-gray-400 uppercase mb-1">Logistics (ZK)</label>
                        <input 
                          type="number" 
                          value={formData.logisticsCost}
                          onChange={(e) => setFormData({...formData, logisticsCost: Number(e.target.value)})}
                          className="w-full px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-brand-gold text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-gray-400 uppercase mb-1">Markup (%)</label>
                        <input 
                          type="number" 
                          value={formData.markupPercent}
                          onChange={(e) => setFormData({...formData, markupPercent: Number(e.target.value)})}
                          className="w-full px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-brand-gold text-sm"
                        />
                      </div>
                    </div>
                    <div className="pt-2 space-y-1">
                      <div className="flex justify-between text-xs text-gray-400">
                        <span>Base Cost:</span>
                        <span>ZK {baseCost.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm font-bold text-brand-gold">
                        <span>Selling Price:</span>
                        <span>ZK {sellingPrice.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-400 uppercase tracking-widest mb-1">Initial Stock</label>
                    <input 
                      required
                      type="number" 
                      value={formData.stock}
                      onChange={(e) => setFormData({...formData, stock: Number(e.target.value)})}
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-brand-gold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 uppercase tracking-widest mb-1">Min Stock Alert</label>
                    <input 
                      required
                      type="number" 
                      value={formData.minStock}
                      onChange={(e) => setFormData({...formData, minStock: Number(e.target.value)})}
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-brand-gold"
                    />
                  </div>
                </div>

                <div className="flex space-x-4 mt-8">
                  <button 
                    type="button"
                    onClick={handleCloseModal}
                    className="flex-1 px-4 py-3 rounded-xl border border-white/10 hover:bg-white/5 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 px-4 py-3 gold-gradient text-brand-dark font-bold rounded-xl shadow-lg hover:scale-[1.02] transition-transform"
                  >
                    {editingId ? 'Update Product' : 'Add Product'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {deleteId && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="glass-card max-w-sm w-full p-8 text-center"
            >
              <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle size={32} />
              </div>
              <h3 className="text-xl font-bold mb-2">Delete Product?</h3>
              <p className="text-gray-400 text-sm mb-8">This action cannot be undone. Are you sure you want to remove this item from the catalog?</p>
              <div className="flex space-x-3">
                <button 
                  onClick={() => setDeleteId(null)}
                  className="flex-1 py-3 rounded-xl border border-white/10 hover:bg-white/5 transition-colors text-sm font-bold"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleDelete}
                  className="flex-1 py-3 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 transition-colors"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Products;
