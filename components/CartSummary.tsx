import React, { useMemo } from 'react';
import type { CartItem, Medication } from '../types';
import { CloseIcon, TrashIcon, PlusIcon, MinusIcon, ShoppingCartIcon } from './IconComponents';

interface CartSummaryProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  onUpdateCart: (med: Medication, quantity: number) => void;
  onProceedToCheckout: () => void;
}

const QuantitySelector: React.FC<{ item: CartItem, onUpdate: (med: Medication, quantity: number) => void }> = ({ item, onUpdate }) => (
    <div className="flex items-center border border-slate-200 rounded-md">
        <button onClick={() => onUpdate(item, item.quantity - 1)} className="px-2 py-1 text-slate-500 hover:bg-slate-100 rounded-l-md">
            <MinusIcon className="h-4 w-4" />
        </button>
        <span className="font-semibold text-slate-700 px-3">{item.quantity}</span>
        <button onClick={() => onUpdate(item, item.quantity + 1)} className="px-2 py-1 text-slate-500 hover:bg-slate-100 rounded-r-md">
            <PlusIcon className="h-4 w-4" />
        </button>
    </div>
);


const CartSummary: React.FC<CartSummaryProps> = ({ isOpen, onClose, cartItems, onUpdateCart, onProceedToCheckout }) => {
    
    const subtotal = useMemo(() => {
        return cartItems.reduce((total, item) => total + item.price * item.quantity, 0);
    }, [cartItems]);
    
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50" onClick={onClose}>
            <div
                onClick={e => e.stopPropagation()}
                className={`fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
            >
                <header className="p-4 border-b border-slate-200 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-slate-800">Shopping Cart</h2>
                    <button onClick={onClose} className="p-2 rounded-full text-slate-500 hover:bg-slate-100">
                        <CloseIcon className="h-6 w-6" />
                    </button>
                </header>
                
                {cartItems.length === 0 ? (
                    <div className="flex-1 flex flex-col justify-center items-center text-center p-8">
                        <ShoppingCartIcon className="h-16 w-16 text-slate-300 mb-4" />
                        <h3 className="font-bold text-slate-700 text-lg">Your cart is empty</h3>
                        <p className="text-slate-500">Add items from the pharmacy to get started.</p>
                    </div>
                ) : (
                    <main className="flex-1 overflow-y-auto p-4">
                        <ul className="divide-y divide-slate-200">
                            {cartItems.map(item => (
                                <li key={item.id} className="py-4 flex items-center gap-4">
                                    <div className="flex-1">
                                        <p className="font-semibold text-slate-800">{item.name}</p>
                                        <p className="text-sm text-slate-500">{item.dosage}</p>
                                        <p className="font-bold text-sky-600 mt-1">₦{item.price.toLocaleString()}</p>
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        <QuantitySelector item={item} onUpdate={onUpdateCart} />
                                        <button onClick={() => onUpdateCart(item, 0)} className="text-xs text-red-500 hover:underline">Remove</button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </main>
                )}
                
                {cartItems.length > 0 && (
                    <footer className="p-4 border-t border-slate-200 bg-slate-50">
                        <div className="flex justify-between items-center mb-4">
                            <span className="text-lg font-semibold text-slate-700">Subtotal</span>
                            <span className="text-xl font-bold text-slate-800">₦{subtotal.toLocaleString()}</span>
                        </div>
                        <button onClick={onProceedToCheckout} className="w-full bg-sky-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-sky-700 transition-colors">
                            Proceed to Checkout
                        </button>
                    </footer>
                )}
            </div>
        </div>
    );
};

export default CartSummary;