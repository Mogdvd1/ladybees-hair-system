/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AuthProvider, useAuth } from './AuthContext';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Products from './components/Products';
import Sales from './components/Sales';
import LayBy from './components/LayBy';
import Customers from './components/Customers';
import Reports from './components/Reports';
import CurrencyConverter from './components/CurrencyConverter';
import { Toaster } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { LogIn, LayoutDashboard } from 'lucide-react';
import { signInWithGoogle } from './firebase';

const AppContent: React.FC = () => {
  const { user, loading, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-brand-dark">
        <motion.div 
          animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="text-brand-gold text-3xl font-cursive font-bold tracking-widest"
        >
          LadyBee's Hair with Flair
        </motion.div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-brand-dark p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card max-w-md w-full p-10 text-center space-y-8"
        >
          <div className="space-y-2">
            <h1 className="text-5xl font-cursive font-bold text-brand-gold tracking-wider">
              LadyBee's
            </h1>
            <p className="text-xs text-brand-pink uppercase tracking-[0.3em] -mt-2">
              Hair with Flair
            </p>
          </div>
          
          <div className="py-8">
            <div className="w-20 h-20 mx-auto rounded-full gold-gradient flex items-center justify-center text-brand-dark shadow-2xl shadow-brand-gold/20">
              <LogIn size={40} />
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-bold">Business Management</h2>
            <p className="text-gray-400 text-sm">Please sign in with your corporate account to access the dashboard.</p>
            <div className="p-3 bg-brand-gold/5 border border-brand-gold/10 rounded-lg">
              <p className="text-[10px] text-brand-gold uppercase tracking-widest font-bold">Admin Access</p>
              <p className="text-xs text-gray-400 mt-1">Use ladybeeshairwithflair@gmail.com for CEO privileges.</p>
            </div>
            <button 
              onClick={signInWithGoogle}
              className="w-full py-4 gold-gradient text-brand-dark font-bold rounded-xl shadow-lg hover:scale-[1.02] transition-transform flex items-center justify-center space-x-3"
            >
              <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
              <span>Sign in with Google</span>
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard />;
      case 'products': return <Products />;
      case 'customers': return <Customers />;
      case 'sales': return <Sales />;
      case 'layby': return <LayBy />;
      case 'reports': return <Reports />;
      case 'converter': return <CurrencyConverter />;
      default: return (
        <div className="flex flex-col items-center justify-center h-[60vh] text-gray-500 space-y-4">
          <div className="p-6 rounded-full bg-white/5">
            <LayoutDashboard size={48} />
          </div>
          <p className="text-xl font-cursive italic text-brand-gold">Module coming soon...</p>
        </div>
      );
    }
  };

  return (
    <div className="flex min-h-screen bg-brand-dark text-white">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="flex-1 lg:ml-64 p-4 lg:p-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </main>
      <Toaster position="top-right" theme="dark" richColors />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
