// FS HUB SHARED MEMORY - FULLY LINKED TO DATABASE
export const OrderStore = {
  repLocation: { latitude: 6.6018, longitude: 3.3515 },
  currentClient: null,
  currentAgent: {
    name: 'Guest Officer',
    id: 'REP-GUEST',
    role: 'Field Officer',
    territory: 'Ikeja Commercial Zone • Route #14',
    avatar: null,
    initials: 'GO',
    email: '',
  },

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
      console.log(`[OrderStore] Added product "${prodObj.name}"`);
    }
  },

  addNewRep: function(repObj) {
    // Support both id and email uniqueness
    const exists = this.activeReps.some(r => r.id === repObj.id || r.email?.toLowerCase() === repObj.email?.toLowerCase());
    if (!exists) {
      this.activeReps = [repObj, ...this.activeReps];
    } else {
      // Update existing
      this.activeReps = this.activeReps.map(r => 
        (r.id === repObj.id || r.email?.toLowerCase() === repObj.email?.toLowerCase()) ? { ...r, ...repObj } : r
      );
    }
    // Also set as currentAgent if this is the logged in rep
    if (repObj.isCurrent) {
      this.currentAgent = {
        name: repObj.name?.replace(' (Field Officer)', '') || repObj.fullName || repObj.name,
        id: repObj.id,
        role: 'Senior Field Officer',
        territory: repObj.zone || repObj.territory || 'Ikeja Commercial Zone',
        avatar: repObj.avatar || null,
        initials: (repObj.name?.substring(0,2) || 'FO').toUpperCase(),
        email: repObj.email,
      };
    }
  },

  setCurrentAgent: function(repObj) {
    this.currentAgent = {
      name: repObj.name?.replace(' (Field Officer)', '') || repObj.fullName || repObj.name || 'Field Officer',
      id: repObj.id,
      role: repObj.role || 'Senior Field Officer',
      territory: repObj.zone || repObj.territory || 'Ikeja Commercial Zone',
      avatar: repObj.avatar || null,
      initials: repObj.initials || (repObj.name?.substring(0,2) || 'FO').toUpperCase(),
      email: repObj.email || '',
    };
    // Also mark as current in activeReps
    this.activeReps.forEach(r => r.isCurrent = false);
    const idx = this.activeReps.findIndex(r => r.id === repObj.id || r.email === repObj.email);
    if (idx > -1) this.activeReps[idx].isCurrent = true;
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
  },

  clearCart: function() {
    this.cart = [];
  }
};

export default OrderStore;
