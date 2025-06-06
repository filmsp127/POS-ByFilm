// Sync Manager - จัดการการ sync ข้อมูลระหว่างเครื่อง
const SyncManager = {
  syncStatus: {
    isOnline: navigator.onLine,
    lastSync: null,
    pendingSync: [],
    isSyncing: false
  },

 // Initialize sync manager
  init() {
    console.log("🔄 Initializing Sync Manager...");
    
    // Monitor online/offline status
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());
    
    // Setup periodic sync check with longer interval
    setInterval(() => this.checkSyncStatus(), 60000); // Every 60 seconds (เพิ่มจาก 30)
    
    // Check initial status after delay
    setTimeout(() => this.checkSyncStatus(), 5000); // Wait 5 seconds before first check
  },

  // Handle when coming online
  handleOnline() {
    console.log("🟢 Back online!");
    this.syncStatus.isOnline = true;
    Utils.showToast("กลับมาออนไลน์แล้ว กำลัง sync ข้อมูล...", "info");
    
    // Sync pending data
    this.syncPendingData();
  },

  // Handle when going offline
  handleOffline() {
    console.log("🔴 Went offline!");
    this.syncStatus.isOnline = false;
    Utils.showToast("ออฟไลน์ - ข้อมูลจะถูก sync เมื่อกลับมาออนไลน์", "warning");
  },

  // Check sync status
  async checkSyncStatus() {
    if (!this.syncStatus.isOnline || this.syncStatus.isSyncing) return;
    
    // Check if Firebase is connected
    if (!window.FirebaseService || !FirebaseService.isAuthenticated()) return;
    
    try {
      // Test Firebase connection
      await FirebaseService.db.collection('_test').doc('ping').set({
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      });
      
      // If successful, sync any pending data
      if (this.syncStatus.pendingSync.length > 0) {
        this.syncPendingData();
      }
    } catch (error) {
      console.error("Firebase connection error:", error);
      this.syncStatus.isOnline = false;
    }
  },

  // Add data to pending sync
  addToPendingSync(type, data) {
    this.syncStatus.pendingSync.push({
      type,
      data,
      timestamp: Date.now()
    });
    
    // Save to localStorage
    localStorage.setItem('pendingSync', JSON.stringify(this.syncStatus.pendingSync));
    
    // Try to sync immediately if online
    if (this.syncStatus.isOnline) {
      this.syncPendingData();
    }
  },

  // Sync pending data
  async syncPendingData() {
    if (this.syncStatus.isSyncing || this.syncStatus.pendingSync.length === 0) return;
    
    this.syncStatus.isSyncing = true;
    const pending = [...this.syncStatus.pendingSync];
    
    try {
      for (const item of pending) {
        await this.syncItem(item);
        
        // Remove from pending
        const index = this.syncStatus.pendingSync.findIndex(p => p.timestamp === item.timestamp);
        if (index !== -1) {
          this.syncStatus.pendingSync.splice(index, 1);
        }
      }
      
      // Clear localStorage
      localStorage.removeItem('pendingSync');
      
      // Update last sync time
      this.syncStatus.lastSync = Date.now();
      
      Utils.showToast("✅ ข้อมูลถูก sync เรียบร้อย", "success");
    } catch (error) {
      console.error("Sync error:", error);
      Utils.showToast("❌ ไม่สามารถ sync ข้อมูลได้", "error");
    } finally {
      this.syncStatus.isSyncing = false;
    }
  },

  // Sync individual item
  async syncItem(item) {
    if (!FirebaseService.currentStore) return;
    
    const storeId = FirebaseService.currentStore.id;
    const storeRef = FirebaseService.db.collection('stores').doc(storeId);
    
    switch (item.type) {
      case 'sale':
        await storeRef.collection('sales').doc(item.data.id.toString()).set({
          ...item.data,
          syncedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        break;
        
      case 'product':
        await storeRef.collection('products').doc(item.data.id.toString()).set({
          ...item.data,
          lastSynced: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        break;
        
      case 'member':
        await storeRef.collection('members').doc(item.data.id.toString()).set({
          ...item.data,
          lastSynced: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        break;
        
      case 'stockUpdate':
        await storeRef.collection('products').doc(item.data.productId.toString()).update({
          stock: item.data.stock,
          lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        });
        break;
    }
  },

  // Force sync all data
  async forceSync() {
    if (this.syncStatus.isSyncing) {
      Utils.showToast("กำลัง sync อยู่ กรุณารอสักครู่...", "info");
      return;
    }
    
    Utils.showLoading("กำลัง sync ข้อมูลทั้งหมด...");
    
    try {
      // Sync all data
      await App.syncWithFirebase();
      
      // Sync pending data
      await this.syncPendingData();
      
      Utils.hideLoading();
      Utils.showToast("✅ Sync ข้อมูลสำเร็จ!", "success");
      
      // Refresh UI
      if (POS && POS.refresh) {
        POS.refresh();
      }
    } catch (error) {
      Utils.hideLoading();
      console.error("Force sync error:", error);
      Utils.showToast("❌ ไม่สามารถ sync ข้อมูลได้", "error");
    }
  },

  // Get sync status display
  getSyncStatusDisplay() {
    if (!this.syncStatus.isOnline) {
      return '<span class="text-red-500"><i class="fas fa-wifi-slash"></i> ออฟไลน์</span>';
    }
    
    if (this.syncStatus.isSyncing) {
      return '<span class="text-blue-500"><i class="fas fa-sync fa-spin"></i> กำลัง sync...</span>';
    }
    
    if (this.syncStatus.pendingSync.length > 0) {
      return `<span class="text-yellow-500"><i class="fas fa-exclamation-triangle"></i> รอ sync ${this.syncStatus.pendingSync.length} รายการ</span>`;
    }
    
    return '<span class="text-green-500"><i class="fas fa-check-circle"></i> ออนไลน์</span>';
  }
};

// Export
window.SyncManager = SyncManager;
