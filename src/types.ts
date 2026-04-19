export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  minStock: number;
  image: string;
  createdAt: any;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  categories: string[];
  documents: string[];
  createdAt: any;
}

export interface RFQ {
  id: string;
  supplierId: string;
  items: RFQItem[];
  status: 'pending' | 'sent' | 'responded';
  dateIssued: any;
}

export interface RFQItem {
  name: string;
  description: string;
  quantity: number;
  length?: string;
  color?: string;
  type?: string;
  images?: string[];
}

export interface Quotation {
  id: string;
  rfqId: string;
  supplierId: string;
  items: QuotationItem[];
  totalPrice: number;
  validUntil: any;
  documentUrl?: string;
  status: 'pending' | 'approved' | 'rejected';
}

export interface QuotationItem {
  name: string;
  quantity: number;
  unitPrice: number;
}

export interface Order {
  id: string;
  quotationId: string;
  supplierId: string;
  items: OrderItem[];
  paymentTerms: string;
  deliveryDate: any;
  status: 'pending' | 'confirmed' | 'received';
  stockUpdated?: boolean;
}

export interface OrderItem {
  productId?: string;
  name: string;
  quantity: number;
  price: number;
}

export interface PriceAdjustment {
  id: string;
  orderId: string;
  itemId: string;
  buyingCost: number;
  shippingCost: number;
  logisticsCost: number;
  baseCost: number;
  markup: number;
  finalPrice: number;
  currency: string;
  exchangeRate: number;
}
