import React from 'react';
import { useAuth } from '../AuthContext';
import { signInWithGoogle, logout } from '../firebase';
import { 
  LayoutDashboard, 
  Package, 
  Users, 
  ShoppingCart, 
  Clock, 
  Receipt, 
  Calculator, 
  List,
  LogOut,
  LogIn,
  Menu,
  X,
  Truck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const { user, isAdmin } = useAuth();
  const [isOpen, setIsOpen] = React.useState(false);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'sales', label: 'Sales', icon: ShoppingCart },
    { id: 'layby', label: 'Lay-by', icon: Clock },
    { id: 'converter', label: 'Currency', icon: Calculator },
    { id: 'settings', label: 'Settings', icon: List },
  ];

  if (isAdmin) {
    // Add Products, Reports and Ordering for Admin
    menuItems.splice(1, 0, { id: 'products', label: 'Products', icon: Package });
    menuItems.splice(5, 0, { id: 'reports', label: 'Reports', icon: Receipt });
    menuItems.splice(menuItems.length - 1, 0, { id: 'ordering', label: 'Ordering', icon: Truck });
  }

  return (
    <>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-brand-gold rounded-lg text-brand-dark"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-brand-dark border-r border-white/10 transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex flex-col h-full p-6">
          <div className="mb-10 text-center">
            <h1 className="text-3xl font-display font-bold text-brand-gold tracking-widest uppercase italic leading-none">
              Lady Bee's
            </h1>
            <p className="text-[9px] text-brand-gold uppercase tracking-[0.2em] font-bold">
              Hair With Flair®
            </p>
            <p className="text-[9px] text-brand-gold uppercase tracking-[0.1em] mt-1 font-bold">
              Your Best Hair Affair
            </p>
          </div>

          <nav className="flex-1 space-y-2">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setIsOpen(false);
                }}
                className={`
                  w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200
                  ${activeTab === item.id 
                    ? 'bg-brand-gold text-brand-dark font-medium shadow-lg shadow-brand-gold/20' 
                    : 'text-gray-400 hover:bg-white/5 hover:text-white'}
                `}
              >
                <item.icon size={20} />
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="mt-auto pt-6 border-t border-white/10">
            {user ? (
              <div className="space-y-4">
                <div className="flex items-center space-x-3 px-2">
                  <img 
                    src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`} 
                    className="w-8 h-8 rounded-full border border-brand-gold"
                    alt="User"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{user.displayName}</p>
                    <p className="text-[10px] text-brand-gold font-bold uppercase tracking-widest">
                      {isAdmin ? 'CEO / Owner' : 'Staff Member'}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={logout}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2 rounded-lg border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                >
                  <LogOut size={16} />
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <button 
                onClick={signInWithGoogle}
                className="w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-xl gold-gradient text-brand-dark font-bold shadow-lg"
              >
                <LogIn size={20} />
                <span>Sign In</span>
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
