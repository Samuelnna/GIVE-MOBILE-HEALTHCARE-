import React, { useState, useMemo } from 'react';
import type { CartItem } from '../types';
import { CloseIcon, ShoppingCartIcon } from './IconComponents';

interface CheckoutModalProps {
  cartItems: CartItem[];
  onClose: () => void;
  onConfirm: (details: {
    deliveryMethod: 'Home Delivery' | 'In-Person Pickup';
    deliveryAddress?: string;
    pickupLocation?: string;
  }) => void;
}

import { supabase } from '../src/supabaseClient';

const CheckoutModal: React.FC<CheckoutModalProps> = ({ cartItems, onClose, onConfirm }) => {
  const [deliveryMethod, setDeliveryMethod] = useState<'Home Delivery' | 'In-Person Pickup'>('Home Delivery');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [pickupLocation, setPickupLocation] = useState('');
  const [dbPharmacies, setDbPharmacies] = useState<any[]>([]);

  React.useEffect(() => {
    const fetchPharmacies = async () => {
        const { data } = await supabase.from('pharmacies').select('*');
        if (data && data.length > 0) {
            setDbPharmacies(data);
            setPickupLocation(data[0].name);
        }
    };
    fetchPharmacies();
  }, []);

  const subtotal = useMemo(() => {
    return cartItems.reduce((total, item) => total + item.price * item.quantity, 0);
  }, [cartItems]);

  const isFormValid = useMemo(() => {
    if (deliveryMethod === 'Home Delivery') {
      return deliveryAddress.trim().length >= 10; // Simple validation for address length
    }
    if (deliveryMethod === 'In-Person Pickup') {
      return !!pickupLocation;
    }
    return false;
  }, [deliveryMethod, deliveryAddress, pickupLocation]);

  const handleConfirm = () => {
    if (!isFormValid) return;

    const details = deliveryMethod === 'Home Delivery'
      ? { deliveryMethod, deliveryAddress }
      : { deliveryMethod, pickupLocation };
      
    onConfirm(details);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col animate-slide-up" onClick={e => e.stopPropagation()}>
        <header className="p-4 border-b border-slate-200 flex justify-between items-center flex-shrink-0">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <ShoppingCartIcon className="h-6 w-6 text-sky-500" />
            Complete Your Order
          </h2>
          <button onClick={onClose} className="p-2 rounded-full text-slate-500 hover:bg-slate-100" aria-label="Close">
            <CloseIcon className="h-6 w-6" />
          </button>
        </header>
        
        <main className="p-6 overflow-y-auto space-y-6">
          <div>
            <h3 className="font-bold text-lg text-slate-700 mb-2">Order Summary</h3>
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 max-h-40 overflow-y-auto">
              <ul className="divide-y divide-slate-200">
                {cartItems.map(item => (
                  <li key={item.id} className="py-2 flex justify-between items-center text-sm">
                    <div>
                      <p className="font-semibold text-slate-800">{item.name}</p>
                      <p className="text-slate-500">
                        {item.quantity} x ₦{item.price.toLocaleString()}
                      </p>
                    </div>
                    <p className="font-bold text-slate-800">
                      ₦{(item.quantity * item.price).toLocaleString()}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex justify-between items-center mt-3 pt-3 border-t-2 border-slate-200">
                <span className="text-lg font-semibold text-slate-700">Subtotal</span>
                <span className="text-xl font-bold text-slate-800">₦{subtotal.toLocaleString()}</span>
            </div>
          </div>

          <div>
            <h3 className="font-bold text-lg text-slate-700 mb-3">Delivery Method</h3>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-lg">
                <button 
                    onClick={() => setDeliveryMethod('Home Delivery')}
                    className={`py-2 px-4 rounded-md font-semibold text-sm transition-colors ${deliveryMethod === 'Home Delivery' ? 'bg-white shadow text-sky-600' : 'text-slate-600 hover:bg-white/60'}`}
                >
                    Home Delivery
                </button>
                 <button 
                    onClick={() => setDeliveryMethod('In-Person Pickup')}
                    className={`py-2 px-4 rounded-md font-semibold text-sm transition-colors ${deliveryMethod === 'In-Person Pickup' ? 'bg-white shadow text-sky-600' : 'text-slate-600 hover:bg-white/60'}`}
                >
                    In-Person Pickup
                </button>
            </div>
          </div>

          <div>
            {deliveryMethod === 'Home Delivery' ? (
              <div>
                <label htmlFor="deliveryAddress" className="block text-sm font-semibold text-slate-700 mb-2">Delivery Address</label>
                <textarea 
                    id="deliveryAddress"
                    value={deliveryAddress} 
                    onChange={e => setDeliveryAddress(e.target.value)} 
                    rows={3} 
                    placeholder="Enter your full street address, city, state, and zip code."
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 bg-white text-slate-900 placeholder:text-slate-500" 
                    required 
                />
              </div>
            ) : (
               <div>
                <label htmlFor="pickupLocation" className="block text-sm font-semibold text-slate-700 mb-2">Pickup Location</label>
                <select 
                    id="pickupLocation"
                    value={pickupLocation} 
                    onChange={e => setPickupLocation(e.target.value)} 
                    className="w-full p-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-sky-500"
                >
                    {dbPharmacies.map(loc => <option key={loc.name} value={loc.name}>{loc.name} ({loc.location})</option>)}
                    {dbPharmacies.length === 0 && <option disabled>No pharmacies found</option>}
                </select>
              </div>
            )}
          </div>
        </main>
        
        <footer className="p-4 border-t border-slate-200 bg-slate-50 flex-shrink-0">
          <button 
            onClick={handleConfirm}
            disabled={!isFormValid} 
            className="w-full bg-teal-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-teal-600 transition-colors disabled:bg-slate-400 disabled:cursor-not-allowed"
          >
            Place Order (₦{subtotal.toLocaleString()})
          </button>
        </footer>
      </div>
    </div>
  );
};

export default CheckoutModal;