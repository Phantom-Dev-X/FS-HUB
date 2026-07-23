// =========================================================================
// FS HUB SHARED ROUTE MEMORY (`RouteStore.js`) — 100% WARNING FREE
// Look: Added `export default RouteStore` at the bottom to stop Expo Router warnings!
// =========================================================================

export const RouteStore = {
  isJourneyActive: false,
  repLocation: { latitude: 6.6018, longitude: 3.3515 },
  clients: [],

  addNewClient: function(clientObj) {
    const exists = this.clients.some(c => c.id === clientObj.id);
    if (!exists) {
      this.clients = [
        {
          id: clientObj.id,
          name: clientObj.name,
          address: clientObj.address,
          coordinate: clientObj.coordinate || { latitude: 6.6018 + (Math.random()*0.02 - 0.01), longitude: 3.3515 + (Math.random()*0.02 - 0.01) },
          distance: 'Just added (Route Pending)',
          selected: true,
          visited: false,
        },
        ...this.clients
      ];
    }
  },

  getSelectedStores: function() {
    return this.clients.filter(c => c.selected);
  }
};

// ⚠️ THE EXACT 1-LINE FIX THAT STOPS EXPO ROUTER YELLOW WARNINGS:
export default RouteStore;
