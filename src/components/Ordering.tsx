import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { 
  collection, onSnapshot, query, addDoc, doc, updateDoc, deleteDoc,
  orderBy, serverTimestamp, getDocs, where, increment 
} from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Building2, FileText, ClipboardCheck, Truck, Plus, 
  Search, ExternalLink, Filter, ChevronRight, X, 
  Download, Upload, Calculator, TrendingUp, AlertCircle,
  Package, DollarSign, RefreshCcw, Edit2, Trash2,
  Mail, MessageSquare
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useAuth } from '../AuthContext';
import { Supplier, RFQ, Quotation, Order, Product } from '../types';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const BUNDLE_LOGIC = {
  A: [
    { inch: 8, combinations: [{ inch: 6, grams: 50 }, { inch: 8, grams: 125 }], total: 175 },
    { inch: 10, combinations: [{ inch: 6, grams: 50 }, { inch: 8, grams: 125 }], total: 175 },
    { inch: 12, combinations: [{ inch: 6, grams: 50 }, { inch: 8, grams: 50 }, { inch: 10, grams: 100 }], total: 200 },
    { inch: 14, combinations: [{ inch: 10, grams: 100 }, { inch: 12, grams: 150 }], total: 250 },
    { inch: 16, combinations: [{ inch: 12, grams: 100 }, { inch: 14, grams: 150 }], total: 250 },
    { inch: 18, combinations: [{ inch: 14, grams: 100 }, { inch: 16, grams: 150 }], total: 250 },
    { inch: 20, combinations: [{ inch: 16, grams: 100 }, { inch: 18, grams: 150 }], total: 250 },
    { inch: 22, combinations: [{ inch: 18, grams: 100 }, { inch: 20, grams: 100 }, { inch: 22, grams: 100 }], total: 300 },
    { inch: 24, combinations: [{ inch: 20, grams: 100 }, { inch: 22, grams: 100 }, { inch: 24, grams: 100 }], total: 300 },
    { inch: 26, combinations: [{ inch: 22, grams: 100 }, { inch: 24, grams: 100 }, { inch: 26, grams: 100 }], total: 300 },
    { inch: 28, combinations: [{ inch: 24, grams: 100 }, { inch: 26, grams: 100 }, { inch: 28, grams: 100 }], total: 300 },
    { inch: 30, combinations: [{ inch: 26, grams: 100 }, { inch: 28, grams: 100 }, { inch: 30, grams: 100 }], total: 300 }
  ],
  B: [
    { inch: 8, combinations: [{ inch: 6, grams: 50 }, { inch: 8, grams: 150 }], total: 200 },
    { inch: 10, combinations: [{ inch: 8, grams: 50 }, { inch: 10, grams: 150 }], total: 200 },
    { inch: 12, combinations: [{ inch: 8, grams: 100 }, { inch: 10, grams: 100 }], total: 200 },
    { inch: 14, combinations: [{ inch: 10, grams: 100 }, { inch: 12, grams: 150 }], total: 250 },
    { inch: 16, combinations: [{ inch: 12, grams: 100 }, { inch: 14, grams: 150 }], total: 250 },
    { inch: 18, combinations: [{ inch: 14, grams: 100 }, { inch: 16, grams: 150 }], total: 250 },
    { inch: 20, combinations: [{ inch: 14, grams: 100 }, { inch: 16, grams: 100 }, { inch: 18, grams: 100 }], total: 300 },
    { inch: 22, combinations: [{ inch: 16, grams: 100 }, { inch: 18, grams: 100 }, { inch: 20, grams: 100 }], total: 300 },
    { inch: 24, combinations: [{ inch: 18, grams: 100 }, { inch: 20, grams: 100 }, { inch: 22, grams: 100 }], total: 300 },
    { inch: 26, combinations: [{ inch: 20, grams: 100 }, { inch: 22, grams: 100 }, { inch: 24, grams: 100 }], total: 300 },
    { inch: 28, combinations: [{ inch: 22, grams: 100 }, { inch: 24, grams: 100 }, { inch: 26, grams: 100 }], total: 300 },
    { inch: 30, combinations: [{ inch: 24, grams: 100 }, { inch: 26, grams: 100 }, { inch: 28, grams: 100 }], total: 300 }
  ]
};

const COMPANY_INFO = {
  name: "Lady Bee's Hair With Flair®",
  tagline: "Your Best Hair Affair",
  phone: "0968849428 / 0977833270",
  email: "ladybeeshairwithflair@gmail.com",
  address: "Lusaka, Zambia",
  socials: {
    facebook: "Ladybeeshairwithflair",
    instagram: "Ladybeeshairwithflair",
    tiktok: "Ladybeeshairwithflair"
  }
};

const Ordering: React.FC = () => {
  const { isAdmin, user } = useAuth();
  console.log('Ordering Component - Admin Status:', isAdmin, 'User:', user?.email);
  const [activeTab, setActiveTab] = useState<'suppliers' | 'rfqs' | 'quotations' | 'orders' | 'bundles'>('suppliers');
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [rfqs, setRfqs] = useState<RFQ[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [isRFQModalOpen, setIsRFQModalOpen] = useState(false);
  const [isQuotationModalOpen, setIsQuotationModalOpen] = useState(false);
  const [activeRFQForQuotation, setActiveRFQForQuotation] = useState<RFQ | null>(null);
  const rates = {
    USD: parseFloat(import.meta.env.VITE_EXCHANGE_RATE_USD || '25.5'),
    CNY: parseFloat(import.meta.env.VITE_EXCHANGE_RATE_CNY || '3.5'),
    ZMW: 1
  };

  const [newRFQ, setNewRFQ] = useState({
    supplierId: '',
    items: [{ 
      name: '', 
      description: '', 
      quantity: 1,
      length: '',
      color: '',
      type: '',
      images: [] as string[]
    }]
  });

  const [newQuotation, setNewQuotation] = useState({
    supplierId: '',
    rfqId: '',
    items: [] as { name: string, quantity: number, unitPrice: number, description?: string }[],
    totalPrice: 0,
    currency: 'ZMW'
  });

  const handleCreateQuotation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const total = newQuotation.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
      
      await addDoc(collection(db, 'quotations'), {
        ...newQuotation,
        totalPrice: total,
        status: 'pending',
        createdAt: serverTimestamp()
      });

      if (newQuotation.rfqId) {
        await updateDoc(doc(db, 'rfqs', newQuotation.rfqId), { status: 'responded' });
      }

      toast.success('Quotation recorded successfully');
      setIsQuotationModalOpen(false);
      setActiveRFQForQuotation(null);
    } catch (error) {
      toast.error('Failed to record quotation');
    }
  };

  const handleMarkAsSent = async (rfqId: string) => {
    try {
      await updateDoc(doc(db, 'rfqs', rfqId), { status: 'sent' });
    } catch (error) {
      console.error('Error marking RFQ as sent:', error);
    }
  };

  const handleCreateRFQ = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const docRef = await addDoc(collection(db, 'rfqs'), {
        ...newRFQ,
        status: 'pending',
        dateIssued: serverTimestamp()
      });
      
      const supplier = suppliers.find(s => s.id === newRFQ.supplierId);
      toast.success('RFQ logged in system');
      
      // If supplier found, offer to send email/whatsapp
      if (supplier) {
        toast.info(
          <div className="space-y-4 p-2">
            <div>
              <p className="font-bold text-sm">Delivery Required</p>
              <p className="text-[10px] text-gray-400">The RFQ is saved. Choose a delivery method to send it to the supplier:</p>
            </div>
            <div className="flex flex-col gap-2">
              <a 
                href={generateRFQEmail({ id: docRef.id, ...newRFQ } as any, supplier)}
                onClick={() => handleMarkAsSent(docRef.id)}
                className="px-3 py-2 bg-brand-gold text-brand-dark rounded-xl text-xs font-bold text-center flex items-center justify-center space-x-2 hover:bg-white transition-colors"
              >
                <Mail size={14} />
                <span>Launch Mail Client</span>
              </a>
              <a 
                href={generateRFQWhatsApp({ id: docRef.id, ...newRFQ } as any, supplier)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => handleMarkAsSent(docRef.id)}
                className="px-3 py-2 bg-green-500 text-white rounded-xl text-xs font-bold text-center flex items-center justify-center space-x-2 hover:bg-green-600 transition-colors"
              >
                <MessageSquare size={14} />
                <span>Send via WhatsApp</span>
              </a>
              <button 
                onClick={() => generateRFQPdf({ id: docRef.id, ...newRFQ } as any, supplier)}
                className="px-3 py-2 bg-white/10 text-white rounded-xl text-xs font-bold text-center flex items-center justify-center space-x-2 hover:bg-white/20 transition-colors"
              >
                <Download size={14} />
                <span>Download PDF</span>
              </button>
            </div>
            <div className="pt-2 border-t border-white/10 text-center">
              <p className="text-[9px] text-gray-500">Note: If links don't open, ensure popups are allowed or open the app in a new tab.</p>
            </div>
          </div>,
          { duration: 15000 }
        );
      }

      setIsRFQModalOpen(false);
      setNewRFQ({ 
        supplierId: '', 
        items: [{ 
          name: '', 
          description: '', 
          quantity: 1,
          length: '',
          color: '',
          type: '',
          images: [] as string[]
        }] 
      });
    } catch (error) {
      toast.error('Failed to issue RFQ');
    }
  };

  const generateRFQEmail = (rfq: RFQ, supplier: Supplier) => {
    const itemsList = rfq.items.map(item => {
      const isVietnamese = item.name === 'Vietnamese' && item.description?.includes('Bundle Combo');
      if (isVietnamese) {
        const bundleParts = item.description.match(/\d+" \(\d+g\)/g);
        if (bundleParts) {
          const formattedCombo = bundleParts.map(p => p.replace(' (', '=').replace(')', '')).join(' ');
          return `- ${item.name} (${item.type || 'N/A'}): Length: ${item.length}" head with ${formattedCombo} total ${item.quantity}g, Color: ${item.color || 'N/A'}`;
        }
      }
      return `- ${item.name} (${item.type || 'N/A'}): ${item.quantity}g, Length: ${item.length || 'N/A'}", Color: ${item.color || 'N/A'}`;
    }).join('\n');

    const subject = `RFQ: Request for Quotation - Lady Bee's Hair With Flair® (#${rfq.id.slice(0,8).toUpperCase()})`;
    const body = `Dear ${supplier.name},\n\nWe would like to request a quotation for the following items:\n\n${itemsList}\n\nAdditional Requirements:\n${rfq.items.map(i => i.description).filter(Boolean).join('\n') || 'None'}\n\nPlease provide your best prices\n\nBest regards,\nLady Bee's Hair With Flair® Management`;

    return `mailto:${supplier.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const generateRFQWhatsApp = (rfq: RFQ, supplier: Supplier) => {
    const itemsList = rfq.items.map(item => {
      const isVietnamese = item.name === 'Vietnamese' && item.description?.includes('Bundle Combo');
      if (isVietnamese) {
        const bundleParts = item.description.match(/\d+" \(\d+g\)/g);
        if (bundleParts) {
          const formattedCombo = bundleParts.map(p => p.replace(' (', '=').replace(')', '')).join(' ');
          return `• *${item.name}* (${item.type || 'N/A'}): Length: ${item.length}" head with ${formattedCombo} total ${item.quantity}g, Color: ${item.color || 'N/A'}`;
        }
      }
      return `• *${item.name}* (${item.type || 'N/A'}): ${item.quantity}g, Length: ${item.length || 'N/A'}", Color: ${item.color || 'N/A'}`;
    }).join('\n');

    const message = `*Lady Bee's Hair With Flair® - RFQ*\n\nHello ${supplier.name},\nWe would like a quote for:\n\n${itemsList}\n\nRef: ${rfq.id.slice(0,8).toUpperCase()}`;
    
    // Clean phone: keep only digits
    let cleanPhone = supplier.phone.replace(/\D/g, '');
    
    // If it starts with '0' and is 10 digits (Zambia format), prepend 260 and remove the 0
    if (cleanPhone.startsWith('0') && cleanPhone.length === 10) {
      cleanPhone = '260' + cleanPhone.substring(1);
    }
    
    // Use api.whatsapp.com which is more reliable for pre-filling text across all platforms
    return `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`;
  };

  const generateRFQPdf = (rfq: RFQ, supplier: Supplier) => {
    try {
      toast.loading('Generating RFQ PDF...');
      const doc = new jsPDF();
      
      // Header
      doc.setFontSize(22);
      doc.setTextColor(212, 175, 55); // Brand Gold
      doc.text(COMPANY_INFO.name, 105, 20, { align: 'center' });
      
      doc.setFontSize(11);
      doc.setTextColor(212, 175, 55); 
      doc.setFont('helvetica', 'bold');
      doc.text(COMPANY_INFO.tagline, 105, 26, { align: 'center' });
      
      doc.setFontSize(9);
      doc.setTextColor(100);
      doc.setFont('helvetica', 'normal');
      doc.text(`${COMPANY_INFO.address} | ${COMPANY_INFO.phone} | ${COMPANY_INFO.email}`, 105, 32, { align: 'center' });
      
      doc.setDrawColor(212, 175, 55);
      doc.line(20, 38, 190, 38);
      
      // Title
      doc.setFontSize(16);
      doc.setTextColor(0);
      doc.text('REQUEST FOR QUOTATION', 20, 48);
      doc.setFontSize(10);
      doc.text(`RFQ ID: ${rfq.id.toUpperCase()}`, 20, 55);
      doc.text(`Date Issued: ${format(new Date(rfq.dateIssued?.toDate?.() || new Date()), 'PPP')}`, 20, 60);
      
      // Supplier Info
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('To:', 20, 70);
      doc.setFont('helvetica', 'normal');
      doc.text(supplier.name, 20, 75);
      doc.text(supplier.contactPerson, 20, 80);
      doc.text(supplier.email, 20, 85);
      doc.text(supplier.phone, 20, 90);
      
      // Table
      const tableData = rfq.items.map((item, index) => {
        const isVietnamese = item.name === 'Vietnamese' && item.description?.includes('Bundle Combo');
        let lengthText = item.length ? `${item.length}"` : 'N/A';
        let qtyText = `${item.quantity}g`;
        
        if (isVietnamese) {
          const bundleParts = item.description.match(/\d+" \(\d+g\)/g);
          if (bundleParts) {
            const formattedCombo = bundleParts.map(p => p.replace(' (', '=').replace(')', '')).join(' ');
            lengthText = `${item.length}" head\nwith ${formattedCombo}`;
            qtyText = `${item.quantity}g`;
          }
        }

        return [
          index + 1,
          `${item.name}\n${item.type || 'N/A'}`,
          lengthText,
          item.color || 'N/A',
          qtyText,
          item.description || '-'
        ];
      });
      
      autoTable(doc, {
        startY: 100,
        head: [['#', 'Item/Type', 'Length', 'Color', 'Qty (g)', 'Description']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [212, 175, 55], textColor: [0, 0, 0] },
        styles: { cellPadding: 3, fontSize: 9 }
      });
      
      const lastTable = (doc as any).lastAutoTable;
      const finalY = lastTable ? lastTable.finalY : 150;
      
      doc.setFontSize(10);
      doc.setTextColor(0);
      doc.text('Authorized By:', 20, finalY + 20);
      doc.line(20, finalY + 25, 80, finalY + 25);
      doc.text('Management', 20, finalY + 30);

      // Social Badges Footer at bottom of page
      const pageHeight = doc.internal.pageSize.height;
      const footerWidth = 70; 
      const startX = (210 - footerWidth) / 2;
      const yPos = pageHeight - 15;
      
      // Facebook
      doc.setFillColor(59, 89, 152); // FB Blue
      doc.roundedRect(startX, yPos - 4, 6, 6, 1, 1, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(6);
      doc.setFont('helvetica', 'bold');
      doc.text('f', startX + 3, yPos, { align: 'center' });
      
      // Instagram
      doc.setFillColor(193, 53, 132); // IG Pink
      doc.roundedRect(startX + 10, yPos - 4, 6, 6, 1, 1, 'F');
      doc.setTextColor(255, 255, 255);
      doc.text('i', startX + 13, yPos, { align: 'center' });
      
      // TikTok
      doc.setFillColor(0, 0, 0); // TikTok Black
      doc.roundedRect(startX + 20, yPos - 4, 6, 6, 1, 1, 'F');
      doc.setTextColor(255, 255, 255);
      doc.text('t', startX + 23, yPos, { align: 'center' });
      
      doc.setTextColor(100);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`@${COMPANY_INFO.socials.facebook}`, startX + 48, yPos, { align: 'center' });
      
      doc.save(`RFQ_${rfq.id.slice(0,8).toUpperCase()}.pdf`);
      toast.dismiss();
      toast.success('RFQ PDF Downloaded');
    } catch (error) {
      console.error('PDF Error:', error);
      toast.dismiss();
      toast.error('Failed to generate PDF');
    }
  };

  const generateOrderPdf = (order: Order, supplier: Supplier) => {
    try {
      toast.loading('Generating Purchase Order PDF...');
      const doc = new jsPDF();
      const exchangeRate = rates.USD;
      
      // Header
      doc.setFontSize(22);
      doc.setTextColor(212, 175, 55); // Brand Gold
      doc.text(COMPANY_INFO.name, 105, 20, { align: 'center' });
      
      doc.setFontSize(11);
      doc.setTextColor(212, 175, 55); 
      doc.setFont('helvetica', 'bold');
      doc.text(COMPANY_INFO.tagline, 105, 26, { align: 'center' });
      
      doc.setFontSize(9);
      doc.setTextColor(100);
      doc.setFont('helvetica', 'normal');
      doc.text(`${COMPANY_INFO.address} | ${COMPANY_INFO.phone} | ${COMPANY_INFO.email}`, 105, 32, { align: 'center' });
      
      doc.setDrawColor(212, 175, 55);
      doc.line(20, 38, 190, 38);
      
      // Title
      doc.setFontSize(16);
      doc.setTextColor(0);
      doc.text('PURCHASE ORDER', 20, 48);
      doc.setFontSize(10);
      doc.text(`Order ID: ${order.id.toUpperCase()}`, 20, 55);
      doc.text(`Date Issued: ${format(new Date(), 'PPP')}`, 20, 60);
      doc.text(`Estimated Delivery: ${format(new Date(order.deliveryDate?.toDate?.() || new Date()), 'PPP')}`, 20, 65);
      
      // Supplier Info
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Vendor:', 20, 75);
      doc.setFont('helvetica', 'normal');
      doc.text(supplier.name, 20, 80);
      doc.text(supplier.contactPerson, 20, 85);
      doc.text(supplier.email, 20, 90);      // Table
      const tableData = order.items.map((item, index) => [
        index + 1,
        item.name,
        `${item.quantity}g`,
        `$ ${(item.price / exchangeRate).toFixed(2)}`,
        `$ ${((item.quantity * item.price) / exchangeRate).toFixed(2)}`
      ]);
      
      const totalOrderZK = order.items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
      const totalOrderUSD = totalOrderZK / exchangeRate;
      
      autoTable(doc, {
        startY: 100,
        head: [['#', 'Description', 'Qty (g)', 'Unit Price (USD)', 'Total (USD)']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [212, 175, 55], textColor: [0, 0, 0] },
        styles: { cellPadding: 3, fontSize: 9 }
      });
      
      const lastTable = (doc as any).lastAutoTable;
      const finalY = lastTable ? lastTable.finalY : 150;
      
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(`Grand Total: $ ${totalOrderUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (ZK ${totalOrderZK.toLocaleString()})`, 190, finalY + 15, { align: 'right' });
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100);
      doc.text(`Exchange Rate: 1 USD = ${exchangeRate} ZK`, 190, finalY + 22, { align: 'right' });
      
      doc.setFontSize(10);
      doc.setTextColor(0);
      doc.text('Payment Terms: ' + order.paymentTerms, 20, finalY + 35);
      
      // Signatures
      doc.setFontSize(10);
      doc.text('Authorized For Procurement:', 20, finalY + 45);
      doc.line(20, finalY + 50, 80, finalY + 50);
      doc.text('C.E.O / Lady Bee Management', 20, finalY + 55);

      // Social Badges Footer at bottom of page
      const pageHeight = doc.internal.pageSize.height;
      const footerWidth = 70; // approximate width of badges + text
      const footerStartX = (210 - footerWidth) / 2;
      const footerYPos = pageHeight - 15;
      
      // Facebook
      doc.setFillColor(59, 89, 152);
      doc.roundedRect(footerStartX, footerYPos - 4, 6, 6, 1, 1, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(6);
      doc.setFont('helvetica', 'bold');
      doc.text('f', footerStartX + 3, footerYPos, { align: 'center' });
      
      // Instagram
      doc.setFillColor(193, 53, 132);
      doc.roundedRect(footerStartX + 10, footerYPos - 4, 6, 6, 1, 1, 'F');
      doc.setTextColor(255, 255, 255);
      doc.text('i', footerStartX + 13, footerYPos, { align: 'center' });
      
      // TikTok
      doc.setFillColor(0, 0, 0);
      doc.roundedRect(footerStartX + 20, footerYPos - 4, 6, 6, 1, 1, 'F');
      doc.setTextColor(255, 255, 255);
      doc.text('t', footerStartX + 23, footerYPos, { align: 'center' });
      
      doc.setTextColor(100);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`@${COMPANY_INFO.socials.facebook}`, footerStartX + 48, footerYPos, { align: 'center' });
      
      doc.save(`PO_${order.id.slice(0,8).toUpperCase()}.pdf`);
      toast.dismiss();
      toast.success('PO PDF Downloaded');
    } catch (error) {
      console.error('PDF Error:', error);
      toast.dismiss();
      toast.error('Failed to generate PDF');
    }
  };
  const [newSupplier, setNewSupplier] = useState({
    name: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
    categories: '',
  });

  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const supplierData = {
        ...newSupplier,
        categories: typeof newSupplier.categories === 'string' 
          ? newSupplier.categories.split(',').map(c => c.trim()).filter(c => c)
          : newSupplier.categories,
      };

      if (editingId) {
        await updateDoc(doc(db, 'suppliers', editingId), {
          ...supplierData,
          updatedAt: serverTimestamp()
        });
        toast.success('Supplier updated successfully');
      } else {
        await addDoc(collection(db, 'suppliers'), {
          ...supplierData,
          documents: [],
          createdAt: serverTimestamp()
        });
        toast.success('Supplier added successfully');
      }
      setIsModalOpen(false);
      setEditingId(null);
      setNewSupplier({ name: '', contactPerson: '', email: '', phone: '', address: '', categories: '' });
    } catch (error: any) {
      console.error('Save Supplier Error:', error);
      toast.error(`Error [${error.code || 'unknown'}]: ${error.message || 'Failed to save supplier'}`);
    }
  };

  const handleDeleteSupplier = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this supplier? This action cannot be undone.')) return;
    try {
      await deleteDoc(doc(db, 'suppliers', id));
      toast.success('Supplier deleted successfully');
    } catch (error: any) {
      toast.error('Failed to delete supplier');
    }
  };

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showPriceAdjustment, setShowPriceAdjustment] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [adjustmentForm, setAdjustmentForm] = useState({
    productId: '',
    buyingCost: 0,
    shippingCost: 0,
    logisticsCost: 0,
    markup: 30,
    currency: 'ZMW',
    exchangeRate: 1,
    manualRate: false
  });

  useEffect(() => {
    const unsubProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
    });
    return () => unsubProducts();
  }, []);

  const baseCost = (adjustmentForm.buyingCost * adjustmentForm.exchangeRate) + 
                   adjustmentForm.shippingCost + adjustmentForm.logisticsCost;
  const finalPrice = baseCost * (1 + adjustmentForm.markup / 100);

  const handleApplyAdjustment = async () => {
    try {
      if (!adjustmentForm.productId) return toast.error('Select a product');
      
      const productRef = doc(db, 'products', adjustmentForm.productId);
      await updateDoc(productRef, {
        buyingCost: adjustmentForm.buyingCost * adjustmentForm.exchangeRate,
        shippingCost: adjustmentForm.shippingCost,
        logisticsCost: adjustmentForm.logisticsCost,
        markupPercent: adjustmentForm.markup,
        price: finalPrice,
        stock: increment(selectedOrder?.items.find(i => i.name === adjustmentForm.productId)?.quantity || 0)
      });

      // Log update
      await addDoc(collection(db, 'stock_logs'), {
        orderId: selectedOrder?.id,
        productId: adjustmentForm.productId,
        quantity: selectedOrder?.items.find(i => i.name === adjustmentForm.productId)?.quantity || 0,
        timestamp: serverTimestamp()
      });

      toast.success('Price adjusted and stock updated');
      setShowPriceAdjustment(false);
    } catch (error) {
      toast.error('Failed to update product');
    }
  };

  const handleApproveQuotation = async (quotation: Quotation) => {
    try {
      // 1. Create Order
      const orderData = {
        quotationId: quotation.id,
        supplierId: quotation.supplierId,
        items: quotation.items.map(i => ({ ...i, price: i.unitPrice })),
        paymentTerms: 'Standard',
        deliveryDate: serverTimestamp(),
        status: 'pending',
        stockUpdated: false
      };
      const docRef = await addDoc(collection(db, 'orders'), orderData);
      
      // 2. Update Quotation Status
      await updateDoc(doc(db, 'quotations', quotation.id), { status: 'approved' });
      
      const supplier = suppliers.find(s => s.id === quotation.supplierId);
      toast.success(
        <div className="space-y-4 p-2">
          <div>
            <p className="font-bold text-sm">Order Created Successfully</p>
            <p className="text-[10px] text-gray-400">The purchase order has been generated. You can now download the PDF.</p>
          </div>
          {supplier && (
            <button 
              onClick={() => generateOrderPdf({ id: docRef.id, ...orderData } as any, supplier)}
              className="w-full px-3 py-2 bg-brand-gold text-brand-dark rounded-xl text-xs font-bold text-center flex items-center justify-center space-x-2 hover:bg-white transition-colors"
            >
              <Download size={14} />
              <span>Download Order PDF</span>
            </button>
          )}
        </div>
      );
    } catch (error) {
      toast.error('Failed to approve quotation');
    }
  };

  const handleReceiveOrder = async (order: Order) => {
    try {
      // Update Order Status
      await updateDoc(doc(db, 'orders', order.id), { 
        status: 'received',
        stockUpdated: true
      });

      // Show Price Adjustment Modal
      setSelectedOrder(order);
      setShowPriceAdjustment(true);
      
      toast.success('Order marked as received. Please adjust prices.');
    } catch (error) {
      toast.error('Failed to update order status');
    }
  };

  useEffect(() => {
    // Test Firestore connection
    const testConnection = async () => {
      try {
        await getDocs(query(collection(db, 'suppliers'), where('__name__', '==', 'test')));
        console.log('Firestore connection verified');
      } catch (e) {
        console.error('Firestore connection error:', e);
      }
    };
    testConnection();

    const unsubSuppliers = onSnapshot(query(collection(db, 'suppliers'), orderBy('createdAt', 'desc')), (snapshot) => {
      setSuppliers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Supplier)));
    });

    const unsubRfqs = onSnapshot(query(collection(db, 'rfqs'), orderBy('dateIssued', 'desc')), (snapshot) => {
      setRfqs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RFQ)));
    });

    const unsubQuotations = onSnapshot(collection(db, 'quotations'), (snapshot) => {
      setQuotations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Quotation)));
    });

    const unsubOrders = onSnapshot(query(collection(db, 'orders'), orderBy('deliveryDate', 'desc')), (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order)));
    });

    return () => {
      unsubSuppliers();
      unsubRfqs();
      unsubQuotations();
      unsubOrders();
    };
  }, []);

  const renderSuppliers = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Search suppliers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-brand-gold w-full"
          />
        </div>
        <button 
          onClick={() => {
            setEditingId(null);
            setNewSupplier({ name: '', contactPerson: '', email: '', phone: '', address: '', categories: '' });
            setIsModalOpen(true);
          }}
          className="flex items-center space-x-2 px-4 py-2 gold-gradient text-brand-dark font-bold rounded-xl shadow-lg"
        >
          <Plus size={18} />
          <span>Add Supplier</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {suppliers.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase())).map(supplier => (
          <motion.div 
            key={supplier.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-6 cursor-pointer hover:border-brand-gold/50 transition-colors"
            onClick={() => setSelectedSupplier(supplier)}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-xl bg-brand-gold/10 flex items-center justify-center text-brand-gold">
                  <Building2 size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">{supplier.name}</h3>
                  <p className="text-xs text-brand-pink uppercase tracking-widest">{supplier.contactPerson}</p>
                </div>
              </div>
              <div className="flex space-x-2" onClick={(e) => e.stopPropagation()}>
                <button 
                  onClick={() => {
                    setEditingId(supplier.id);
                    setNewSupplier({
                      name: supplier.name,
                      contactPerson: supplier.contactPerson,
                      email: supplier.email,
                      phone: supplier.phone,
                      address: supplier.address,
                      categories: supplier.categories.join(', ')
                    });
                    setIsModalOpen(true);
                  }}
                  className="p-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-brand-gold transition-colors"
                >
                  <Edit2 size={16} />
                </button>
                <button 
                  onClick={() => handleDeleteSupplier(supplier.id)}
                  className="p-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            <div className="space-y-2 text-sm text-gray-400">
              <p className="flex items-center space-x-2">
                <Filter size={14} />
                <span>{supplier.categories.join(', ')}</span>
              </p>
              <p className="truncate">{supplier.email}</p>
              <p>{supplier.phone}</p>
            </div>
            <div className="mt-4 pt-4 border-t border-white/5 flex justify-between items-center">
              <span className="text-[10px] text-gray-500 uppercase tracking-widest">
                {format(new Date(supplier.createdAt?.toDate?.() || new Date()), 'MMM dd, yyyy')}
              </span>
              <ChevronRight size={18} className="text-brand-gold" />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );

  const renderTabs = () => {
    switch (activeTab) {
      case 'suppliers': return renderSuppliers();
      case 'rfqs': return (
        <RFQList 
          rfqs={rfqs} 
          suppliers={suppliers} 
          onAdd={() => setIsRFQModalOpen(true)} 
          onMarkSent={handleMarkAsSent}
          generateEmail={generateRFQEmail}
          generateWhatsApp={generateRFQWhatsApp}
          onDownloadPdf={generateRFQPdf}
          onReceiveQuotation={(rfq) => {
            setActiveRFQForQuotation(rfq);
            setNewQuotation({
              supplierId: rfq.supplierId,
              rfqId: rfq.id,
              items: rfq.items.map(item => ({
                name: `${item.name}${item.length ? ` ${item.length}"` : ''}${item.type ? ` (${item.type})` : ''}`,
                quantity: item.quantity,
                unitPrice: 0
              })),
              totalPrice: 0,
              currency: 'ZMW'
            });
            setIsQuotationModalOpen(true);
          }}
        />
      );
      case 'quotations': return (
        <QuotationList 
          quotations={quotations} 
          rfqs={rfqs} 
          suppliers={suppliers} 
          onApprove={handleApproveQuotation} 
          onAdd={() => {
            setNewQuotation({
              supplierId: '',
              rfqId: '',
              items: [],
              totalPrice: 0,
              currency: 'ZMW'
            });
            setActiveRFQForQuotation(null);
            setIsQuotationModalOpen(true);
          }}
        />
      );
      case 'orders': return (
        <OrderList 
          orders={orders} 
          suppliers={suppliers} 
          onReceive={handleReceiveOrder} 
          onDownloadPdf={generateOrderPdf}
        />
      );
      case 'bundles': return <BundleChart />;
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-4xl font-editorial font-bold text-brand-gold uppercase tracking-widest italic">Ordering Module</h2>
          <p className="text-xs text-brand-pink font-medium italic-editorial tracking-[0.3em]">Procurement & Stock Management</p>
        </div>
      </div>

      <div className="flex space-x-4 border-b border-white/10">
        {[
          { id: 'suppliers', label: 'Suppliers', icon: Building2 },
          { id: 'rfqs', label: 'RFQs', icon: FileText },
          { id: 'quotations', label: 'Quotations', icon: ClipboardCheck },
          { id: 'orders', label: 'Orders', icon: Truck },
          { id: 'bundles', label: 'Bundle Chart', icon: Calculator },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center space-x-2 px-6 py-4 text-sm font-bold transition-all relative ${
              activeTab === tab.id ? 'text-brand-gold' : 'text-gray-500 hover:text-white'
            }`}
          >
            <tab.icon size={18} />
            <span>{tab.label}</span>
            {activeTab === tab.id && (
              <motion.div 
                layoutId="activeOrderingTab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-gold"
              />
            )}
          </button>
        ))}
      </div>

      {renderTabs()}

      {/* Modals */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-card max-w-lg w-full p-8"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-brand-gold">{editingId ? 'Edit Supplier' : 'Add New Supplier'}</h3>
                <button onClick={() => setIsModalOpen(false)}><X size={24} /></button>
              </div>
              <form onSubmit={handleSaveSupplier} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Supplier Name</label>
                    <input 
                      required
                      value={newSupplier.name}
                      onChange={e => setNewSupplier({...newSupplier, name: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 focus:border-brand-gold outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Contact Person</label>
                    <input 
                      value={newSupplier.contactPerson}
                      onChange={e => setNewSupplier({...newSupplier, contactPerson: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 focus:border-brand-gold outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Email</label>
                    <input 
                      type="email"
                      value={newSupplier.email}
                      onChange={e => setNewSupplier({...newSupplier, email: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 focus:border-brand-gold outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Phone</label>
                    <input 
                      value={newSupplier.phone}
                      onChange={e => setNewSupplier({...newSupplier, phone: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 focus:border-brand-gold outline-none"
                    />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <label className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Categories (comma separated)</label>
                    <input 
                      placeholder="Hair, Tools, Chemicals"
                      value={newSupplier.categories}
                      onChange={e => setNewSupplier({...newSupplier, categories: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 focus:border-brand-gold outline-none"
                    />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <label className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Address</label>
                    <textarea 
                      value={newSupplier.address}
                      onChange={e => setNewSupplier({...newSupplier, address: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 focus:border-brand-gold outline-none h-20"
                    />
                  </div>
                </div>
                <button type="submit" className="w-full py-4 gold-gradient text-brand-dark font-bold rounded-xl shadow-lg mt-4">
                  {editingId ? 'Update Supplier' : 'Register Supplier'}
                </button>
              </form>
            </motion.div>
          </div>
        )}

        {isRFQModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-card max-w-2xl w-full p-8"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-brand-gold">Create Request for Quotation</h3>
                <button onClick={() => setIsRFQModalOpen(false)}><X size={24} /></button>
              </div>
              <form onSubmit={handleCreateRFQ} className="space-y-6">
                <div className="space-y-1">
                  <label className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Select Supplier</label>
                  <select 
                    required
                    value={newRFQ.supplierId}
                    onChange={e => setNewRFQ({...newRFQ, supplierId: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:border-brand-gold outline-none text-white"
                  >
                    <option value="" className="bg-brand-dark text-white">Select a supplier...</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id} className="bg-brand-dark text-white">{s.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Items</label>
                    <button 
                      type="button"
                      onClick={() => setNewRFQ({
                        ...newRFQ, 
                        items: [...newRFQ.items, { 
                          name: '', 
                          description: '', 
                          quantity: 1,
                          length: '',
                          color: '',
                          type: '',
                          images: [] as string[]
                        }]
                      })}
                      className="text-brand-gold hover:text-white transition-colors flex items-center space-x-1"
                    >
                      <Plus size={14} />
                      <span className="text-[10px] font-bold uppercase tracking-widest">Add Item</span>
                    </button>
                  </div>
                  {newRFQ.items.map((item, index) => (
                    <div key={index} className="space-y-4 p-4 bg-white/5 rounded-xl border border-white/5 relative group">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Hair Name (Origin)</label>
                          <select 
                            required
                            value={item.name}
                            onChange={e => {
                              const newItems = [...newRFQ.items];
                              newItems[index].name = e.target.value;
                              setNewRFQ({...newRFQ, items: newItems});
                            }}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-brand-gold outline-none text-white"
                          >
                            <option value="" className="bg-brand-dark text-white">Select origin...</option>
                            <option value="Vietnamese" className="bg-brand-dark text-white">Vietnamese</option>
                            <option value="Peruvian" className="bg-brand-dark text-white">Peruvian</option>
                            <option value="Brazilian" className="bg-brand-dark text-white">Brazilian</option>
                            <option value="Indian" className="bg-brand-dark text-white">Indian</option>
                            <option value="Other" className="bg-brand-dark text-white">Other</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Type Of Hair</label>
                          <select 
                            value={item.type || ''}
                            onChange={e => {
                              const newItems = [...newRFQ.items];
                              newItems[index].type = e.target.value;
                              setNewRFQ({...newRFQ, items: newItems});
                            }}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-brand-gold outline-none text-white"
                          >
                            <option value="" className="bg-brand-dark text-white">Select type...</option>
                            <option value="Double Drawn" className="bg-brand-dark text-white">Double Drawn</option>
                            <option value="SDD" className="bg-brand-dark text-white">SDD</option>
                            <option value="Single Donor" className="bg-brand-dark text-white">Single Donor</option>
                            <option value="Kinky Curly" className="bg-brand-dark text-white">Kinky Curly</option>
                            <option value="Waterwave" className="bg-brand-dark text-white">Waterwave</option>
                            <option value="Bodywave" className="bg-brand-dark text-white">Bodywave</option>
                            <option value="Yaki Straight" className="bg-brand-dark text-white">Yaki Straight</option>
                            <option value="Straight Hair" className="bg-brand-dark text-white">Straight Hair</option>
                            <option value="Bundle" className="bg-brand-dark text-white">Bundle</option>
                            <option value="Closure" className="bg-brand-dark text-white">Closure</option>
                            <option value="Frontal" className="bg-brand-dark text-white">Frontal</option>
                            <option value="Wig" className="bg-brand-dark text-white">Wig</option>
                            <option value="Other" className="bg-brand-dark text-white">Other</option>
                          </select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Length (Inches)</label>
                            <select 
                              value={item.length || ''}
                              onChange={e => {
                                const newItems = [...newRFQ.items];
                                const len = e.target.value;
                                newItems[index].length = len;
                                
                                // Auto-fill total grams as quantity if Vietnamese hair
                                if (item.name === 'Vietnamese' && len && len !== 'Other') {
                                  const logic = BUNDLE_LOGIC['A'].find(l => l.inch === parseInt(len));
                                  if (logic) {
                                    newItems[index].quantity = logic.total;
                                    newItems[index].description = `Bundle Combo (Cat A): ${logic.combinations.map(c => `${c.inch}" (${c.grams}g)`).join(', ')}`;
                                  }
                                }
                                
                                setNewRFQ({...newRFQ, items: newItems});
                              }}
                              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-brand-gold outline-none text-white"
                            >
                              <option value="" className="bg-brand-dark text-white">Select length...</option>
                              {["6", "8", "10", "12", "14", "16", "18", "20", "22", "24", "26", "28", "30", "32", "34", "36"].map(len => (
                                <option key={len} value={len} className="bg-brand-dark text-white">{len}"</option>
                              ))}
                              <option value="Other" className="bg-brand-dark text-white">Other</option>
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Color</label>
                            <select 
                              value={item.color || ''}
                              onChange={e => {
                                const newItems = [...newRFQ.items];
                                newItems[index].color = e.target.value;
                                setNewRFQ({...newRFQ, items: newItems});
                              }}
                              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-brand-gold outline-none text-white"
                            >
                              <option value="" className="bg-brand-dark text-white">Select color...</option>
                              <option value="Natural Color" className="bg-brand-dark text-white">Natural Color</option>
                              <option value="Colored Hair" className="bg-brand-dark text-white">Colored Hair</option>
                              <option value="Other" className="bg-brand-dark text-white">Other</option>
                            </select>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Total Grams / Qty</label>
                            <input 
                              type="number"
                              required
                              min="1"
                              value={item.quantity}
                              onChange={e => {
                                const newItems = [...newRFQ.items];
                                newItems[index].quantity = parseInt(e.target.value);
                                setNewRFQ({...newRFQ, items: newItems});
                              }}
                              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-brand-gold outline-none"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Bundle Category</label>
                            <div className="flex space-x-1 h-10 bg-white/5 p-1 rounded-lg border border-white/10">
                              {(['A', 'B'] as const).map(cat => (
                                <button
                                  key={cat}
                                  type="button"
                                  onClick={() => {
                                    if (item.name !== 'Vietnamese' || !item.length || item.length === 'Other') return;
                                    const newItems = [...newRFQ.items];
                                    const logic = BUNDLE_LOGIC[cat].find(l => l.inch === parseInt(item.length));
                                    if (logic) {
                                      newItems[index].quantity = logic.total;
                                      newItems[index].description = `Bundle Combo (Cat ${cat}): ${logic.combinations.map(c => `${c.inch}" (${c.grams}g)`).join(', ')}`;
                                      setNewRFQ({...newRFQ, items: newItems});
                                    }
                                  }}
                                  className={`flex-1 rounded text-[10px] font-bold uppercase transition-all ${
                                    item.description?.includes(`(Cat ${cat})`) 
                                      ? 'bg-brand-gold text-brand-dark' 
                                      : 'text-gray-500 hover:text-white'
                                  }`}
                                >
                                  Cat {cat}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="space-y-1 col-span-2">
                          <label className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Item Images (Max 5)</label>
                          <div className="grid grid-cols-4 gap-2">
                            {item.images?.map((img, i) => (
                              <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-white/10 group/thumb">
                                <img src={img} className="w-full h-full object-cover" alt="Item preview" />
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newItems = [...newRFQ.items];
                                    newItems[index].images = item.images?.filter((_, idx) => idx !== i);
                                    setNewRFQ({...newRFQ, items: newItems});
                                  }}
                                  className="absolute top-1 right-1 bg-red-500/80 text-white rounded-full p-0.5 opacity-0 group-hover/thumb:opacity-100 transition-opacity"
                                >
                                  <X size={10} />
                                </button>
                              </div>
                            ))}
                            {(item.images?.length || 0) < 5 && (
                              <div className="relative aspect-square">
                                <input 
                                  type="file"
                                  multiple
                                  accept="image/*"
                                  onChange={e => {
                                    Array.from(e.target.files || []).forEach((file: File) => {
                                      const reader = new FileReader();
                                      reader.onloadend = () => {
                                        setNewRFQ(prev => {
                                          const newItems = [...prev.items];
                                          const currentImages = newItems[index].images || [];
                                          if (currentImages.length < 5) {
                                            newItems[index].images = [...currentImages, reader.result as string];
                                            return { ...prev, items: newItems };
                                          }
                                          return prev;
                                        });
                                      };
                                      reader.readAsDataURL(file);
                                    });
                                  }}
                                  className="hidden"
                                  id={`item-img-${index}`}
                                />
                                <label 
                                  htmlFor={`item-img-${index}`}
                                  className="flex flex-col items-center justify-center h-full w-full bg-white/5 border border-dashed border-white/10 rounded-lg cursor-pointer hover:border-brand-gold transition-colors text-[10px] text-gray-400"
                                >
                                  <Plus size={16} className="mb-1" />
                                  <span>Add Image</span>
                                </label>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Additional Description / Bundle Mix</label>
                        <textarea 
                          placeholder="e.g. High quality remy hair only. Exact split of inches if required..."
                          value={item.description}
                          onChange={e => {
                            const newItems = [...newRFQ.items];
                            newItems[index].description = e.target.value;
                            setNewRFQ({...newRFQ, items: newItems});
                          }}
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-brand-gold outline-none h-16"
                        />
                        {item.name === 'Vietnamese' && item.length && item.length !== 'Other' && (
                          <div className="flex items-center space-x-2 mt-1">
                             <div className="w-1.5 h-1.5 rounded-full bg-brand-gold animate-pulse" />
                             <p className="text-[10px] text-brand-gold/70 italic">
                               {item.description?.includes('Bundle Combo') 
                                 ? 'Requirement applied from charts' 
                                 : 'Select a Cat A/B above to auto-fill suggested bundle mix'}
                             </p>
                          </div>
                        )}
                      </div>
                        <button 
                          type="button"
                          onClick={() => {
                            const newItems = newRFQ.items.filter((_, i) => i !== index);
                            setNewRFQ({...newRFQ, items: newItems});
                          }}
                          className="w-full mt-4 py-2 border border-red-500/30 text-red-500/70 hover:bg-red-500 hover:text-white rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all flex items-center justify-center space-x-2"
                        >
                          <Trash2 size={12} />
                          <span>Remove Item</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <button type="submit" className="w-full py-4 gold-gradient text-brand-dark font-bold rounded-xl shadow-lg">
                  Submit Request for Quotation
                </button>
              </form>
            </motion.div>
          </div>
        )}

        {isQuotationModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-card max-w-2xl w-full p-8"
            >
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-brand-gold">Record Supplier Quotation</h3>
                  {activeRFQForQuotation && (
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest">Responding to RFQ: {activeRFQForQuotation.id.slice(0,8).toUpperCase()}</p>
                  )}
                </div>
                <button onClick={() => {
                  setIsQuotationModalOpen(false);
                  setActiveRFQForQuotation(null);
                }}><X size={24} /></button>
              </div>
              <form onSubmit={handleCreateQuotation} className="space-y-6">
                {!activeRFQForQuotation && (
                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Select Supplier</label>
                    <select 
                      required
                      value={newQuotation.supplierId}
                      onChange={e => setNewQuotation({...newQuotation, supplierId: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:border-brand-gold outline-none text-white"
                    >
                      <option value="" className="bg-brand-dark text-white">Select a supplier...</option>
                      {suppliers.map(s => (
                        <option key={s.id} value={s.id} className="bg-brand-dark text-white">{s.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Quoted Items & Prices</label>
                    {!activeRFQForQuotation && (
                      <button 
                        type="button"
                        onClick={() => setNewQuotation({
                          ...newQuotation, 
                          items: [...newQuotation.items, { name: '', quantity: 1, unitPrice: 0 }]
                        })}
                        className="text-brand-gold hover:text-white transition-colors flex items-center space-x-1"
                      >
                        <Plus size={14} />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Add Item</span>
                      </button>
                    )}
                  </div>
                  {newQuotation.items.map((item, index) => (
                    <div key={index} className="grid grid-cols-12 gap-4 p-4 bg-white/5 rounded-xl border border-white/5">
                      <div className="col-span-6 space-y-1">
                        <label className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Item Description</label>
                        <input 
                          required
                          readOnly={!!activeRFQForQuotation}
                          value={item.name}
                          onChange={e => {
                            const newItems = [...newQuotation.items];
                            newItems[index].name = e.target.value;
                            setNewQuotation({...newQuotation, items: newItems});
                          }}
                          className={`w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-brand-gold outline-none ${activeRFQForQuotation ? 'opacity-50 cursor-not-allowed' : ''}`}
                        />
                      </div>
                      <div className="col-span-2 space-y-1">
                        <label className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Qty</label>
                        <input 
                          type="number"
                          required
                          value={item.quantity}
                          onChange={e => {
                            const newItems = [...newQuotation.items];
                            newItems[index].quantity = parseInt(e.target.value);
                            setNewQuotation({...newQuotation, items: newItems});
                          }}
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-brand-gold outline-none"
                        />
                      </div>
                      <div className="col-span-4 space-y-1">
                        <label className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Unit Price (ZK)</label>
                        <input 
                          type="number"
                          required
                          step="0.01"
                          placeholder="0.00"
                          value={item.unitPrice || ''}
                          onChange={e => {
                            const newItems = [...newQuotation.items];
                            newItems[index].unitPrice = parseFloat(e.target.value);
                            setNewQuotation({...newQuotation, items: newItems});
                          }}
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm border-brand-gold/30 focus:border-brand-gold outline-none text-brand-gold font-bold"
                        />
                      </div>
                    </div>
                  ))}
                  {newQuotation.items.length === 0 && (
                    <p className="text-center text-gray-500 py-8 italic border-2 border-dashed border-white/5 rounded-xl">No items added to quotation.</p>
                  )}
                </div>

                <div className="pt-6 border-t border-white/10 flex justify-between items-center">
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">Estimated Total</p>
                    <p className="text-2xl font-bold text-brand-pink">ZK {newQuotation.items.reduce((sum, item) => sum + (item.quantity * (item.unitPrice || 0)), 0).toLocaleString()}</p>
                  </div>
                  <button type="submit" className="px-8 py-4 gold-gradient text-brand-dark font-bold rounded-xl shadow-lg">
                    Log Quotation
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {showPriceAdjustment && selectedOrder && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-card max-w-2xl w-full p-8"
            >
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-brand-gold">Price Adjustment</h3>
                  <p className="text-xs text-gray-400">Order Ref: {selectedOrder.id.slice(0,8).toUpperCase()}</p>
                </div>
                <button onClick={() => setShowPriceAdjustment(false)}><X size={24} /></button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Target Product</label>
                    <select 
                      value={adjustmentForm.productId}
                      onChange={e => setAdjustmentForm({...adjustmentForm, productId: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 focus:border-brand-gold outline-none text-white"
                    >
                      <option value="" className="bg-brand-dark text-white">Select product to update...</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id} className="bg-brand-dark text-white">{p.name} (Current: ZK {p.price})</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Currency</label>
                      <select 
                        value={adjustmentForm.currency}
                        onChange={e => {
                          const curr = e.target.value as keyof typeof rates;
                          setAdjustmentForm({
                            ...adjustmentForm, 
                            currency: curr,
                            exchangeRate: rates[curr]
                          });
                        }}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 focus:border-brand-gold outline-none text-white"
                      >
                        <option value="ZMW" className="bg-brand-dark text-white">ZMW</option>
                        <option value="USD" className="bg-brand-dark text-white">USD</option>
                        <option value="CNY" className="bg-brand-dark text-white">CNY</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Ex. Rate</label>
                      <input 
                        type="number"
                        value={adjustmentForm.exchangeRate}
                        onChange={e => setAdjustmentForm({...adjustmentForm, exchangeRate: parseFloat(e.target.value)})}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 focus:border-brand-gold outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Buying Cost ({adjustmentForm.currency})</label>
                    <input 
                      type="number"
                      value={adjustmentForm.buyingCost}
                      onChange={e => setAdjustmentForm({...adjustmentForm, buyingCost: parseFloat(e.target.value)})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 focus:border-brand-gold outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Shipping (ZMW)</label>
                      <input 
                        type="number"
                        value={adjustmentForm.shippingCost}
                        onChange={e => setAdjustmentForm({...adjustmentForm, shippingCost: parseFloat(e.target.value)})}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 focus:border-brand-gold outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Logistics (ZMW)</label>
                      <input 
                        type="number"
                        value={adjustmentForm.logisticsCost}
                        onChange={e => setAdjustmentForm({...adjustmentForm, logisticsCost: parseFloat(e.target.value)})}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 focus:border-brand-gold outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Markup (%)</label>
                    <input 
                      type="number"
                      value={adjustmentForm.markup}
                      onChange={e => setAdjustmentForm({...adjustmentForm, markup: parseFloat(e.target.value)})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 focus:border-brand-gold outline-none"
                    />
                  </div>
                </div>

                <div className="bg-white/5 rounded-2xl p-6 flex flex-col justify-center items-center text-center space-y-4 border border-white/10">
                  <div className="space-y-1">
                    <p className="text-[10px] text-gray-500 uppercase tracking-[0.2em]">Base Cost</p>
                    <p className="text-2xl font-bold text-white">ZK {baseCost.toLocaleString()}</p>
                  </div>
                  <div className="w-full h-px bg-white/10" />
                  <div className="space-y-1">
                    <p className="text-[10px] text-brand-pink uppercase tracking-[0.2em]">Suggested Retail Price</p>
                    <p className="text-4xl font-bold text-brand-gold">ZK {finalPrice.toLocaleString()}</p>
                  </div>
                  <button 
                    onClick={handleApplyAdjustment}
                    className="w-full py-4 gold-gradient text-brand-dark font-bold rounded-xl shadow-lg mt-4 flex items-center justify-center space-x-2"
                  >
                    <RefreshCcw size={18} />
                    <span>Apply Adjustment</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Supplier Profile Overlay */}
      <AnimatePresence>
        {selectedSupplier && (
          <SupplierProfile 
            supplier={selectedSupplier} 
            rfqs={rfqs.filter(r => r.supplierId === selectedSupplier.id)}
            quotations={quotations.filter(q => q.supplierId === selectedSupplier.id)}
            orders={orders.filter(o => o.supplierId === selectedSupplier.id)}
            onClose={() => setSelectedSupplier(null)} 
            onDownloadRFQ={generateRFQPdf}
            onDownloadOrder={generateOrderPdf}
            onReceiveQuotation={(rfq) => {
              setActiveRFQForQuotation(rfq);
              setNewQuotation({
                supplierId: rfq.supplierId,
                rfqId: rfq.id,
                items: rfq.items.map(item => ({
                  name: `${item.name}${item.length ? ` ${item.length}"` : ''}${item.type ? ` (${item.type})` : ''}`,
                  quantity: item.quantity,
                  unitPrice: 0
                })),
                totalPrice: 0,
                currency: 'ZMW'
              });
              setIsQuotationModalOpen(true);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// Sub-component for Supplier Profile
const SupplierProfile: React.FC<{ 
  supplier: Supplier, 
  rfqs: RFQ[], 
  quotations: Quotation[], 
  orders: Order[],
  onClose: () => void,
  onDownloadRFQ: (r: RFQ, s: Supplier) => void,
  onDownloadOrder: (o: Order, s: Supplier) => void,
  onReceiveQuotation: (r: RFQ) => void
}> = ({ supplier, rfqs, quotations, orders, onClose, onDownloadRFQ, onDownloadOrder, onReceiveQuotation }) => {
  const [activeSubTab, setActiveSubTab] = useState<'info' | 'rfqs' | 'quotations' | 'orders'>('info');

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-end bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div 
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        className="w-full max-w-2xl h-full bg-brand-dark border-l border-white/10 p-8 overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-8">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 rounded-2xl bg-brand-gold/10 flex items-center justify-center text-brand-gold">
              <Building2 size={32} />
            </div>
            <div>
              <h3 className="text-3xl font-bold text-white">{supplier.name}</h3>
              <p className="text-brand-pink uppercase tracking-widest text-sm">{supplier.contactPerson}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-gray-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="flex space-x-1 bg-white/5 p-1 rounded-xl mb-8">
          {['info', 'rfqs', 'quotations', 'orders'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveSubTab(tab as any)}
              className={`flex-1 py-2 text-xs font-bold uppercase tracking-widest rounded-lg transition-all ${
                activeSubTab === tab ? 'bg-brand-gold text-brand-dark shadow-lg' : 'text-gray-500 hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Dynamic content based on activeSubTab */}
        <div className="mt-8">
          {activeSubTab === 'info' && (
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-1">
                <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Email Address</p>
                <p className="text-white">{supplier.email}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Phone Number</p>
                <p className="text-white">{supplier.phone}</p>
              </div>
              <div className="col-span-2 space-y-1">
                <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Physical Address</p>
                <p className="text-white">{supplier.address}</p>
              </div>
              <div className="col-span-2 space-y-1">
                <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Categories</p>
                <div className="flex flex-wrap gap-2">
                  {supplier.categories.map(cat => (
                    <span key={cat} className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs text-brand-gold">
                      {cat}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeSubTab === 'rfqs' && (
            <div className="space-y-4">
              <h4 className="text-lg font-bold text-white mb-4">Request History</h4>
              <div className="space-y-3">
                {rfqs.map(rfq => (
                  <div key={rfq.id} className="p-4 bg-white/5 rounded-xl border border-white/5 flex justify-between items-center group">
                    <div>
                      <p className="font-mono text-brand-gold text-xs">{rfq.id.slice(0,8).toUpperCase()}</p>
                      <p className="text-xs text-gray-400">{format(new Date(rfq.dateIssued?.toDate?.() || new Date()), 'MMM dd, yyyy')}</p>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        rfq.status === 'responded' ? 'bg-green-500/10 text-green-500' : 'bg-brand-pink/10 text-brand-pink'
                      }`}>
                        {rfq.status}
                      </span>
                      <button 
                        onClick={() => onDownloadRFQ(rfq, supplier)}
                        className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
                        title="Download PDF"
                      >
                        <Download size={14} />
                      </button>
                      {(rfq.status === 'sent' || rfq.status === 'pending') && (
                        <button 
                          onClick={() => onReceiveQuotation(rfq)}
                          className="p-1.5 hover:bg-brand-pink/10 rounded-lg text-brand-pink/50 hover:text-brand-pink transition-colors"
                          title="Record Quote"
                        >
                          <ClipboardCheck size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {rfqs.length === 0 && <p className="text-gray-500 italic text-sm">No RFQs found for this supplier.</p>}
              </div>
            </div>
          )}

          {activeSubTab === 'quotations' && (
             <div className="space-y-4">
              <h4 className="text-lg font-bold text-white mb-4">Quotation History</h4>
              <div className="space-y-3">
                {quotations.map(quo => (
                  <div key={quo.id} className="p-4 bg-white/5 rounded-xl border border-white/5 flex justify-between items-center">
                    <div>
                      <p className="font-mono text-brand-gold text-xs">{quo.id.slice(0,8).toUpperCase()}</p>
                      <p className="text-sm font-bold text-brand-pink">ZK {quo.totalPrice.toLocaleString()}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      quo.status === 'approved' ? 'bg-green-500/10 text-green-500' : 'bg-brand-gold/10 text-brand-gold'
                    }`}>
                      {quo.status}
                    </span>
                  </div>
                ))}
                {quotations.length === 0 && <p className="text-gray-500 italic text-sm">No quotations found.</p>}
              </div>
            </div>
          )}

          {activeSubTab === 'orders' && (
             <div className="space-y-4">
              <h4 className="text-lg font-bold text-white mb-4">Order History</h4>
              <div className="space-y-3">
                 {orders.map(order => (
                  <div key={order.id} className="p-4 bg-white/5 rounded-xl border border-white/5 flex justify-between items-center group">
                    <div>
                      <p className="font-mono text-brand-gold text-xs">{order.id.slice(0,8).toUpperCase()}</p>
                      <p className="text-xs text-gray-400">{format(new Date(order.deliveryDate?.toDate?.() || new Date()), 'MMM dd, yyyy')}</p>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        order.status === 'received' ? 'bg-green-500/10 text-green-500' : 'bg-brand-pink/10 text-brand-pink'
                      }`}>
                        {order.status}
                      </span>
                      <button 
                        onClick={() => onDownloadOrder(order, supplier)}
                        className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
                        title="Download PDF"
                      >
                        <Download size={14} />
                      </button>
                    </div>
                  </div>
                ))}
                {orders.length === 0 && <p className="text-gray-500 italic text-sm">No orders found.</p>}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

// Sub-components
const BundleChart: React.FC = () => {
  const [selectedCat, setSelectedCat] = useState<'A' | 'B'>('A');
  const [selectedInch, setSelectedInch] = useState<number | null>(null);
  const [isCustom, setIsCustom] = useState(false);
  const [customPrimary, setCustomPrimary] = useState('');
  const [customCombs, setCustomCombs] = useState<{inch: string, grams: string}[]>([{ inch: '', grams: '' }]);

  const currentLogic = BUNDLE_LOGIC[selectedCat];
  const selectedResult = currentLogic.find(l => l.inch === selectedInch);

  const customTotal = customCombs.reduce((sum, c) => sum + (parseInt(c.grams) || 0), 0);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="text-2xl font-bold text-white mb-1">Vietnamese Standard Bundles</h3>
          <p className="text-gray-400 text-sm italic-editorial">Select primary length or create a custom combination</p>
        </div>
        <div className="flex space-x-2 bg-white/5 p-1 rounded-xl border border-white/10">
          {(['A', 'B'] as const).map(cat => (
            <button
              key={cat}
              onClick={() => {
                setSelectedCat(cat);
                setSelectedInch(null);
                setIsCustom(false);
              }}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                selectedCat === cat && !isCustom ? 'bg-brand-gold text-brand-dark' : 'text-gray-500 hover:text-white'
              }`}
            >
              Category {cat}
            </button>
          ))}
          <button
            onClick={() => {
              setIsCustom(true);
              setSelectedInch(null);
            }}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center space-x-2 ${
              isCustom ? 'bg-brand-gold text-brand-dark' : 'text-gray-500 hover:text-white'
            }`}
          >
            <Plus size={14} />
            <span>Custom Combo</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Inch Selection */}
        <div className="lg:col-span-2 glass-card p-6">
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {currentLogic.map(item => (
              <button
                key={item.inch}
                onClick={() => {
                  setSelectedInch(item.inch);
                  setIsCustom(false);
                }}
                className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all ${
                  selectedInch === item.inch 
                    ? 'border-brand-gold bg-brand-gold/10 scale-105 shadow-lg shadow-brand-gold/10' 
                    : 'border-white/5 bg-white/5 hover:border-brand-gold/30'
                }`}
              >
                <span className={`text-xl font-bold ${selectedInch === item.inch ? 'text-brand-gold' : 'text-white'}`}>
                  {item.inch}"
                </span>
                <span className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">Primary</span>
              </button>
            ))}
          </div>

          <div className="mt-8 p-4 bg-brand-gold/5 border border-brand-gold/10 rounded-xl flex items-center space-x-3">
            <AlertCircle size={18} className="text-brand-gold flex-shrink-0" />
            <p className="text-xs text-brand-gold/80 italic">
              {isCustom 
                ? "You are now defining a custom bundle combination. Enter your own lengths and weights below."
                : `Combinations are calculated based on standard "Bundles Per Head" requirements for Category ${selectedCat}.`
              }
            </p>
          </div>
        </div>

        {/* Results Panel */}
        <div className="space-y-6">
          <AnimatePresence mode="wait">
            {isCustom ? (
              <motion.div
                key="custom-panel"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="glass-card p-6 border-l-4 border-brand-pink h-full"
              >
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <p className="text-brand-pink text-[10px] uppercase font-bold tracking-widest">Custom Style</p>
                    <div className="flex items-center space-x-2">
                       <input 
                         type="number"
                         placeholder="e.g. 10"
                         value={customPrimary}
                         onChange={e => setCustomPrimary(e.target.value)}
                         className="w-16 bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-white focus:border-brand-gold outline-none"
                       />
                       <span className="text-xl font-bold text-white">" Style</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-500 text-[10px] uppercase font-bold tracking-widest">Total Weight</p>
                    <p className="text-3xl font-mono font-bold text-brand-gold">{customTotal}g</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Custom Bundle Combo</p>
                    <button 
                      onClick={() => setCustomCombs([...customCombs, { inch: '', grams: '' }])}
                      className="text-brand-gold hover:text-white text-[10px] font-bold uppercase"
                    >
                      + Add Bundle
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    {customCombs.map((comb, i) => (
                      <div key={i} className="flex items-center space-x-3 group">
                        <div className="flex-1 flex items-center space-x-2 p-2 bg-white/5 rounded-xl border border-white/5">
                          <input 
                            type="number"
                            placeholder="Inch"
                            value={comb.inch}
                            onChange={e => {
                              const newCombs = [...customCombs];
                              newCombs[i].inch = e.target.value;
                              setCustomCombs(newCombs);
                            }}
                            className="w-14 bg-transparent border-b border-white/10 text-brand-gold text-center focus:border-brand-gold outline-none text-sm"
                          />
                          <span className="text-white/30 font-bold">"</span>
                          <span className="text-gray-600 text-[8px] uppercase font-bold px-1">with</span>
                          <input 
                            type="number"
                            placeholder="Grams"
                            value={comb.grams}
                            onChange={e => {
                              const newCombs = [...customCombs];
                              newCombs[i].grams = e.target.value;
                              setCustomCombs(newCombs);
                            }}
                            className="flex-1 bg-transparent border-b border-white/10 text-brand-pink text-center focus:border-brand-pink outline-none text-sm"
                          />
                          <span className="text-white/30 text-[10px]">g</span>
                        </div>
                        <button 
                          onClick={() => setCustomCombs(customCombs.filter((_, idx) => idx !== i))}
                          className="text-gray-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>

                  {customCombs.length === 0 && (
                    <p className="text-center text-gray-600 text-xs italic py-4">Add your first bundle row</p>
                  )}
                </div>

                <div className="mt-8 pt-6 border-t border-white/5">
                   <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-2 font-bold italic">Generated Reference String:</p>
                   <div className="p-3 bg-white/5 rounded-lg border border-dashed border-white/10 text-[10px] font-mono text-gray-400 break-all">
                      {customPrimary || '??'}" head with {customCombs.map(c => `${c.inch || '?'}" (${c.grams || '?'}g)`).join(' ')} total {customTotal}g
                   </div>
                </div>
              </motion.div>
            ) : selectedResult ? (
              <motion.div
                key={`${selectedCat}-${selectedInch}`}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="glass-card p-6 border-l-4 border-brand-gold h-full"
              >
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <p className="text-brand-pink text-[10px] uppercase font-bold tracking-widest">Requirement for</p>
                    <h4 className="text-3xl font-display font-bold text-white">{selectedInch}" Style</h4>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-500 text-[10px] uppercase font-bold tracking-widest">Total Weight</p>
                    <p className="text-3xl font-mono font-bold text-brand-gold">{selectedResult.total}g</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Bundle Combination</p>
                  {selectedResult.combinations.map((comb, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-lg bg-brand-gold/10 flex items-center justify-center text-brand-gold text-xs font-bold">
                          {comb.inch}"
                        </div>
                        <span className="text-sm font-medium text-white">Hair Length</span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-brand-pink font-bold">{comb.grams}g</span>
                        <span className="text-[8px] text-gray-500 uppercase">Weight</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-8 pt-6 border-t border-white/5">
                   <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-400">Category Selection:</span>
                      <span className="text-white font-bold">Vietnamese {selectedCat}</span>
                   </div>
                   <div className="flex justify-between items-center text-sm mt-2">
                      <span className="text-gray-400">Total Bundles approx:</span>
                      <span className="text-brand-gold font-bold">3.0 Bundles</span>
                   </div>
                </div>
              </motion.div>
            ) : (
              <div className="glass-card p-12 text-center h-full flex flex-row items-center justify-center">
                 <div className="space-y-4">
                    <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto text-gray-600">
                       <Calculator size={32} />
                    </div>
                    <p className="text-gray-500 italic max-w-xs mx-auto">
                      Select an inch from the grid to calculate the required bundle combinations.
                    </p>
                 </div>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

const RFQList: React.FC<{ 
  rfqs: RFQ[], 
  suppliers: Supplier[], 
  onAdd: () => void,
  onMarkSent: (id: string) => void,
  generateEmail: (r: RFQ, s: Supplier) => string,
  generateWhatsApp: (r: RFQ, s: Supplier) => string,
  onDownloadPdf: (r: RFQ, s: Supplier) => void,
  onReceiveQuotation: (rfq: RFQ) => void
}> = ({ rfqs, suppliers, onAdd, onMarkSent, generateEmail, generateWhatsApp, onDownloadPdf, onReceiveQuotation }) => (
  <div className="space-y-6">
    <div className="flex justify-between items-center">
      <h3 className="text-xl font-bold text-white">Requests for Quotation</h3>
      <button onClick={onAdd} className="flex items-center space-x-2 px-4 py-2 gold-gradient text-brand-dark font-bold rounded-xl shadow-lg">
        <Plus size={18} />
        <span>Create RFQ</span>
      </button>
    </div>
    <div className="glass-card overflow-hidden">
      <table className="w-full text-left">
        <thead className="bg-white/5 border-b border-white/10 uppercase text-[10px] tracking-widest text-gray-400">
          <tr>
            <th className="px-6 py-4">RFQ ID</th>
            <th className="px-6 py-4">Supplier</th>
            <th className="px-6 py-4">Items</th>
            <th className="px-6 py-4">Status</th>
            <th className="px-6 py-4">Date</th>
            <th className="px-6 py-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {rfqs.map(rfq => {
            const supplier = suppliers.find(s => s.id === rfq.supplierId);
            return (
              <React.Fragment key={rfq.id}>
                <tr className="hover:bg-white/5 transition-colors cursor-pointer group" onClick={() => {
                  const el = document.getElementById(`rfq-details-${rfq.id}`);
                  if (el) el.classList.toggle('hidden');
                }}>
                  <td className="px-6 py-4 font-mono text-brand-gold">{rfq.id.slice(0, 8).toUpperCase()}</td>
                  <td className="px-6 py-4 text-white">{supplier?.name}</td>
                  <td className="px-6 py-4 text-gray-400">
                    <span className="flex items-center space-x-2">
                      <span>{rfq.items.length} items</span>
                      <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                      rfq.status === 'responded' ? 'bg-green-500/10 text-green-500' : 
                      rfq.status === 'sent' ? 'bg-blue-500/10 text-blue-400' : 'bg-brand-pink/10 text-brand-pink'
                    }`}>
                      {rfq.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-400 text-sm">
                    {format(new Date(rfq.dateIssued?.toDate?.() || new Date()), 'MMM dd, yyyy')}
                  </td>
                  <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end space-x-2">
                      {supplier && (
                        <>
                          <button 
                            onClick={() => onDownloadPdf(rfq, supplier)}
                            title="Download PDF"
                            className="p-2 bg-white/5 rounded-lg text-white hover:bg-brand-gold hover:text-brand-dark transition-all"
                          >
                            <Download size={14} />
                          </button>
                          <a 
                            href={generateEmail(rfq, supplier)}
                            onClick={() => onMarkSent(rfq.id)}
                            title="Email RFQ"
                            className="p-2 bg-white/5 rounded-lg text-brand-gold hover:bg-brand-gold hover:text-brand-dark transition-all"
                          >
                            <Mail size={14} />
                          </a>
                          <a 
                            href={generateWhatsApp(rfq, supplier)}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => onMarkSent(rfq.id)}
                            title="WhatsApp RFQ"
                            className="p-2 bg-white/5 rounded-lg text-green-500 hover:bg-green-500 hover:text-white transition-all"
                          >
                            <MessageSquare size={14} />
                          </a>
                          {(rfq.status === 'sent' || rfq.status === 'pending') && (
                            <button 
                              onClick={() => onReceiveQuotation(rfq)}
                              title="Record Quote"
                              className="p-2 bg-brand-pink/10 rounded-lg text-brand-pink hover:bg-brand-pink hover:text-white transition-all flex items-center space-x-1"
                            >
                              <ClipboardCheck size={14} />
                              <span className="text-[10px] font-bold">Log Quote</span>
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              <tr id={`rfq-details-${rfq.id}`} className="hidden bg-white/[0.02]">
                <td colSpan={6} className="px-6 py-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {rfq.items.map((item, i) => (
                      <div key={i} className="flex flex-col space-y-4 p-4 rounded-xl border border-white/5 bg-white/5">
                        <div className="flex space-x-4">
                          <div className="w-20 h-20 rounded-lg overflow-hidden bg-brand-dark flex-shrink-0">
                            {item.images && item.images.length > 0 ? (
                              <img src={item.images[0]} alt={item.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-700">
                                <Package size={32} />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-white truncate">{item.name}</p>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 text-[10px] uppercase tracking-widest text-gray-500 font-bold">
                              <span className="text-brand-pink">Type:</span>
                              <span className="text-gray-300">{item.type || 'N/A'}</span>
                              <span className="text-brand-pink">Length:</span>
                              <span className="text-gray-300">{item.length ? `${item.length}"` : 'N/A'}</span>
                              <span className="text-brand-pink">Color:</span>
                              <span className="text-gray-300 truncate">{item.color || 'N/A'}</span>
                              <span className="text-brand-pink">Qty:</span>
                              <span className="text-gray-300">{item.quantity}g</span>
                            </div>
                          </div>
                        </div>

                        {item.images && item.images.length > 1 && (
                          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                            {item.images.slice(1).map((img, idx) => (
                              <img key={idx} src={img} className="w-12 h-12 rounded-lg object-cover flex-shrink-0 border border-white/10" alt="Extra preview" />
                            ))}
                          </div>
                        )}

                        {item.description && (
                          <p className="text-[10px] text-gray-500 mt-2 line-clamp-3 italic border-t border-white/5 pt-2">
                            {item.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </td>
              </tr>
            </React.Fragment>
          );
        })}
        </tbody>
      </table>
    </div>
  </div>
);

const QuotationList: React.FC<{ quotations: Quotation[], rfqs: RFQ[], suppliers: Supplier[], onApprove: (q: Quotation) => void, onAdd: () => void }> = ({ quotations, rfqs, suppliers, onApprove, onAdd }) => (
  <div className="space-y-6">
    <div className="flex justify-between items-center">
      <h3 className="text-xl font-bold text-white">Supplier Quotations</h3>
      <button onClick={onAdd} className="flex items-center space-x-2 px-4 py-2 gold-gradient text-brand-dark font-bold rounded-xl shadow-lg">
        <Plus size={18} />
        <span>Log Manual Quote</span>
      </button>
    </div>
    <div className="glass-card overflow-hidden">
      <table className="w-full text-left">
        <thead className="bg-white/5 border-b border-white/10 uppercase text-[10px] tracking-widest text-gray-400">
          <tr>
            <th className="px-6 py-4">Quo ID</th>
            <th className="px-6 py-4">RFQ Ref</th>
            <th className="px-6 py-4">Supplier</th>
            <th className="px-6 py-4">Total Price</th>
            <th className="px-6 py-4">Status</th>
            <th className="px-6 py-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {quotations.map(quo => (
            <tr key={quo.id} className="hover:bg-white/5">
              <td className="px-6 py-4 font-mono text-brand-gold">{quo.id.slice(0, 8).toUpperCase()}</td>
              <td className="px-6 py-4 text-gray-400 font-mono">{quo.rfqId?.slice(0, 8).toUpperCase() || 'N/A'}</td>
              <td className="px-6 py-4 text-white">{suppliers.find(s => s.id === quo.supplierId)?.name}</td>
              <td className="px-6 py-4 font-bold text-brand-pink">ZK {quo.totalPrice.toLocaleString()}</td>
              <td className="px-6 py-4">
                <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                  quo.status === 'approved' ? 'bg-green-500/10 text-green-500' : 'bg-brand-gold/10 text-brand-gold'
                }`}>
                  {quo.status}
                </span>
              </td>
              <td className="px-6 py-4 text-right">
                {quo.status === 'pending' && (
                  <button 
                    onClick={() => onApprove(quo)}
                    className="text-brand-gold hover:underline text-xs uppercase font-bold tracking-widest"
                  >
                    Approve
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

const OrderList: React.FC<{ 
  orders: Order[], 
  suppliers: Supplier[], 
  onReceive: (o: Order) => void,
  onDownloadPdf: (o: Order, s: Supplier) => void
}> = ({ orders, suppliers, onReceive, onDownloadPdf }) => (
  <div className="space-y-6">
    <h3 className="text-xl font-bold text-white">Purchase Orders</h3>
    <div className="glass-card overflow-hidden">
      <table className="w-full text-left">
        <thead className="bg-white/5 border-b border-white/10 uppercase text-[10px] tracking-widest text-gray-400">
          <tr>
            <th className="px-6 py-4">Order ID</th>
            <th className="px-6 py-4">Supplier</th>
            <th className="px-6 py-4">Delivery Date</th>
            <th className="px-6 py-4">Status</th>
            <th className="px-6 py-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {orders.map(order => {
            const supplier = suppliers.find(s => s.id === order.supplierId);
            return (
              <tr key={order.id} className="hover:bg-white/5">
                <td className="px-6 py-4 font-mono text-brand-gold">{order.id.slice(0, 8).toUpperCase()}</td>
                <td className="px-6 py-4 text-white">{supplier?.name}</td>
                <td className="px-6 py-4 text-gray-400 text-sm">
                  {format(new Date(order.deliveryDate?.toDate?.() || new Date()), 'MMM dd, yyyy')}
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                    order.status === 'received' ? 'bg-green-500/10 text-green-500' : 
                    order.status === 'confirmed' ? 'bg-blue-500/10 text-blue-400' : 'bg-brand-pink/10 text-brand-pink'
                  }`}>
                    {order.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end space-x-3">
                    {supplier && (
                      <button 
                        onClick={() => onDownloadPdf(order, supplier)}
                        title="Download Purchase Order PDF"
                        className="p-2 hover:bg-white/5 rounded-lg text-brand-gold transition-colors"
                      >
                        <Download size={16} />
                      </button>
                    )}
                    {order.status !== 'received' && (
                      <button 
                        onClick={() => onReceive(order)}
                        className="text-brand-gold hover:underline text-xs uppercase font-bold tracking-widest"
                      >
                        Mark Received
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  </div>
);

export default Ordering;
