// =========================================================================
// FS HUB SHARED MEMORY (`_OrderStore.js`) — 100% WARNING FREE
// Look right right here: Added `export default OrderStore` at the very bottom so Expo Router stops warning!
// =========================================================================

export const OrderStore = {
  repLocation: { latitude: 6.6018, longitude: 3.3515 },
  currentClient: null,

  clients: [],
  cart: [],
  activeReps: [],
  catalog: [],

  addNewClient: function(clientObj) {
    const exists = this.clients.some(c => c.id === clientObj.id);
    if (!exists) {
      this.clients = [clientObj, ...this.clients];
    }
  },

  addNewProduct: function(prodObj) {
    const exists = this.catalog.some(p => p.id === prodObj.id || p.barcode === prodObj.barcode);
    if (!exists) {
      this.catalog = [prodObj, ...this.catalog];
      console.log(`[OrderStore] Admin added new product "${prodObj.name}" to master catalog.`);
    }
  },

  addNewRep: function(repObj) {
    const exists = this.activeReps.some(r => r.id === repObj.id || r.email === repObj.email);
    if (!exists) {
      this.activeReps = [repObj, ...this.activeReps];
    }
  },

  addToCart: function(productId, qtyToAdd) {
    const product = this.catalog.find(p => p.id === productId);
    if (!product) return;

    const existingIndex = this.cart.findIndex(item => item.id === productId);
    if (existingIndex > -1) {
      this.cart[existingIndex].qty = qtyToAdd;
    } else {
      this.cart.push({
        id: product.id,
        name: product.name,
        category: product.category,
        price: product.price,
        qty: qtyToAdd,
        barcode: product.barcode,
      });
    }
  },

  removeFromCart: function(productId) {
    this.cart = this.cart.filter(item => item.id !== productId);
  },

  getCartSummary: function() {
    const distinctProducts = this.cart.length;
    const totalUnits = this.cart.reduce((sum, item) => sum + item.qty, 0);
    const grandTotal = this.cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    return { distinctProducts, totalUnits, grandTotal };
  }
};

// ⚠️ THE EXACT 1-LINE FIX THAT STOPS EXPO ROUTER YELLOW WARNINGS:
export default OrderStore;
