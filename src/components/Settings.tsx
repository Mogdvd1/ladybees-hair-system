import React, { useState } from 'react';
import { db } from '../firebase';
import { collection, getDocs, deleteDoc, doc, writeBatch } from 'firebase/firestore';
import { ShieldAlert, Trash2, AlertTriangle, CheckCircle2, RefreshCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { useAuth } from '../AuthContext';

const Settings: React.FC = () => {
  const { isAdmin } = useAuth();
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  const collectionsToReset = [
    { id: 'products', label: 'Products & Inventory' },
    { id: 'sales', label: 'Sales Records' },
    { id: 'laybys', label: 'Lay-by Agreements' },
    { id: 'customers', label: 'Customer Directory' },
    { id: 'zra_payments', label: 'ZRA Tax Payments' }
  ];

  const handleReset = async () => {
    if (confirmText !== 'RESET') {
      toast.error('Please type RESET to confirm');
      return;
    }

    setIsResetting(true);
    try {
      for (const col of collectionsToReset) {
        const querySnapshot = await getDocs(collection(db, col.id));
        const batch = writeBatch(db);
        
        querySnapshot.forEach((document) => {
          batch.delete(doc(db, col.id, document.id));
        });
        
        await batch.commit();
        console.log(`Cleared collection: ${col.id}`);
      }

      toast.success('System reset successful! All data has been removed.');
      setIsResetModalOpen(false);
      setConfirmText('');
    } catch (error: any) {
      console.error('Reset error:', error);
      toast.error(`Failed to reset system: ${error.message}`);
    } finally {
      setIsResetting(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
        <div className="p-6 rounded-full bg-red-500/10 text-red-500">
          <ShieldAlert size={48} />
        </div>
        <h2 className="text-2xl font-bold">Access Denied</h2>
        <p className="text-gray-400 max-w-md">Only the CEO / Owner can access system settings and data management tools.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-3xl font-editorial font-bold text-brand-gold uppercase tracking-widest italic">System Settings</h2>
        <p className="text-gray-400 font-medium italic-editorial text-sm">Manage your application data and security</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="glass-card p-8 border-l-4 border-red-500">
          <div className="flex items-center space-x-4 mb-6">
            <div className="p-3 bg-red-500/10 text-red-500 rounded-xl">
              <Trash2 size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Danger Zone</h3>
              <p className="text-xs text-gray-400 uppercase tracking-widest">Data Management</p>
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-sm text-gray-300">
              The "System Reset" will permanently delete all your data, including products, sales, customers, and lay-by records. This action cannot be undone.
            </p>
            
            <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-4 space-y-2">
              <p className="text-[10px] text-red-400 font-bold uppercase tracking-widest">What will be deleted:</p>
              <ul className="grid grid-cols-2 gap-2">
                {collectionsToReset.map(c => (
                  <li key={c.id} className="flex items-center space-x-2 text-xs text-gray-400">
                    <div className="w-1 h-1 bg-red-500 rounded-full" />
                    <span>{c.label}</span>
                  </li>
                ))}
              </ul>
            </div>

            <button 
              onClick={() => setIsResetModalOpen(true)}
              className="w-full py-3 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition-colors flex items-center justify-center space-x-2 shadow-lg shadow-red-500/20"
            >
              <RefreshCcw size={18} />
              <span>Reset System Data</span>
            </button>
          </div>
        </div>

        <div className="glass-card p-8 border-l-4 border-brand-gold">
          <div className="flex items-center space-x-4 mb-6">
            <div className="p-3 bg-brand-gold/10 text-brand-gold rounded-xl">
              <ShieldAlert size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Security Info</h3>
              <p className="text-xs text-gray-400 uppercase tracking-widest">Access Control</p>
            </div>
          </div>
          <div className="space-y-4 text-sm text-gray-300">
            <p>Your system is currently secured with Role-Based Access Control (RBAC).</p>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <CheckCircle2 className="text-green-500 mt-1" size={16} />
                <div>
                  <p className="font-bold text-white">CEO / Owner</p>
                  <p className="text-xs text-gray-400">Full access to all modules, reports, and system settings.</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircle2 className="text-green-500 mt-1" size={16} />
                <div>
                  <p className="font-bold text-white">Staff Member</p>
                  <p className="text-xs text-gray-400">Can access the point-of-sale (POS), manage customers, and view lay-bys. No access to inventory management, financial reports, or system settings.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isResetModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-card max-w-md w-full p-8 text-center"
            >
              <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertTriangle size={40} />
              </div>
              <h3 className="text-2xl font-bold mb-2 text-white">Are you absolutely sure?</h3>
              <p className="text-gray-400 text-sm mb-8">
                This will wipe your entire database. You will lose all inventory, sales history, and customer data. This is permanent.
              </p>
              
              <div className="space-y-4 mb-8">
                <label className="block text-xs text-gray-500 uppercase tracking-widest">Type <span className="text-red-500 font-bold">RESET</span> to confirm</label>
                <input 
                  type="text" 
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
                  placeholder="RESET"
                  className="w-full px-4 py-3 bg-white/5 border border-red-500/30 rounded-xl focus:outline-none focus:border-red-500 text-center font-bold tracking-widest"
                />
              </div>

              <div className="flex space-x-4">
                <button 
                  onClick={() => { setIsResetModalOpen(false); setConfirmText(''); }}
                  className="flex-1 py-3 rounded-xl border border-white/10 hover:bg-white/5 transition-colors font-bold"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleReset}
                  disabled={confirmText !== 'RESET' || isResetting}
                  className="flex-1 py-3 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {isResetting ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span>Wipe All Data</span>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Settings;
