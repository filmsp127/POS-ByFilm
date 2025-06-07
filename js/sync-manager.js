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
    setInterval(() => this.checkSyncStatus(), 60000); // Every 60 seconds
    
    // Check initial status after delay
    setTimeout(() => this.checkSyncStatus(), 5000); // Wait 5 seconds before first check
    
    // Load pending sync from localStorage
    this.loadPendingSync();
  },

  // Load pending sync from localStorage
  loadPendingSync() {
    try {
      const saved = localStorage.getItem('pendingSync');
      if (saved) {
        this.syncStatus.pendingSync = JSON.parse(saved);
        console.log(`📋 Loaded ${this.syncStatus.pendingSync.length} pending sync items`);
      }
    } catch (error) {
      console.error('Error loading pending sync:', error);
    }
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
      // Test Firebase connection with timeout
      const testPromise = FirebaseService.db.collection('_test').doc('ping').set({
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      });
      
      // Add timeout
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 5000)
      );
      
      await Promise.race([testPromise, timeoutPromise]);
      
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
    // Check if item already exists
    const exists = this.syncStatus.pendingSync.some(item => 
      item.type === type && item.data.id === data.id
    );
    
    if (!exists) {
      this.syncStatus.pendingSync.push({
        type,
        data,
        timestamp: Date.now()
      });
      
      // Save to localStorage
      localStorage.setItem('pendingSync', JSON.stringify(this.syncStatus.pendingSync));
      
      console.log(`➕ Added ${type} to pending sync:`, data.id || data.name);
    }
    
    // Try to sync immediately if online
    if (this.syncStatus.isOnline && !this.syncStatus.isSyncing) {
      this.syncPendingData();
    }
  },

  // Sync pending data
  async syncPendingData() {
    if (this.syncStatus.isSyncing || this.syncStatus.pendingSync.length === 0) return;
    
    this.syncStatus.isSyncing = true;
    const pending = [...this.syncStatus.pendingSync];
    
    console.log(`🔄 Syncing ${pending.length} pending items...`);
    
    let successCount = 0;
    let failCount = 0;
    
    try {
      for (const item of pending) {
        try {
          await this.syncItem(item);
          
          // Remove from pending
          const index = this.syncStatus.pendingSync.findIndex(p => p.timestamp === item.timestamp);
          if (index !== -1) {
            this.syncStatus.pendingSync.splice(index, 1);
          }
          successCount++;
        } catch (error) {
          console.error(`Failed to sync ${item.type}:`, error);
          failCount++;
        }
      }
      
      // Save updated pending list
      localStorage.setItem('pendingSync', JSON.stringify(this.syncStatus.pendingSync));
      
      // Update last sync time
      this.syncStatus.lastSync = Date.now();
      
      if (successCount > 0) {
        Utils.showToast(`✅ Sync สำเร็จ ${successCount} รายการ`, "success");
      }
      
      if (failCount > 0) {
        Utils.showToast(`❌ Sync ไม่สำเร็จ ${failCount} รายการ`, "error");
      }
    } catch (error) {
      console.error("Sync error:", error);
      Utils.showToast("❌ ไม่สามารถ sync ข้อมูลได้", "error");
    } finally {
      this.syncStatus.isSyncing = false;
    }
  },

  // Sync individual item
  async syncItem(item) {
    if (!FirebaseService.currentStore) {
      throw new Error('No current store');
    }
    
    const storeId = FirebaseService.currentStore.id;
    const storeRef = FirebaseService.db.collection('stores').doc(storeId);
    
    console.log(`🔸 Syncing ${item.type}:`, item.data.id || item.data.name);
    
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
        
      case 'category':
        await storeRef.collection('categories').doc(item.data.id.toString()).set({
          ...item.data,
          lastSynced: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        break;
        
      case 'productDelete':
        await storeRef.collection('products').doc(item.data.id.toString()).delete();
        break;
        
      case 'memberDelete':
        await storeRef.collection('members').doc(item.data.id.toString()).delete();
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
      // First, reload data from Firebase
      await App.loadFromFirebase();
      
      // Then sync local changes
      await App.syncWithFirebase();
      
      // Sync pending data
      await this.syncPendingData();
      
      Utils.hideLoading();
      Utils.showToast("✅ Sync ข้อมูลสำเร็จ!", "success");
      
      // Refresh UI
      if (POS && POS.refresh) {
        POS.refresh();
      }
      
      // Refresh backoffice if open
      if (BackOffice && BackOffice.currentPage) {
        switch (BackOffice.currentPage) {
          case 'products':
            BackOffice.loadProductsList();
            break;
          case 'members':
            BackOffice.loadMembersList();
            break;
          case 'sales':
            BackOffice.loadSalesHistory();
            break;
          case 'dashboard':
            BackOffice.updateDashboardStats();
            break;
        }
      }
    } catch (error) {
      Utils.hideLoading();
      console.error("Force sync error:", error);
      Utils.showToast("❌ ไม่สามารถ sync ข้อมูลได้: " + error.message, "error");
    }
  },

  // Get sync status display
getSyncStatusDisplay() {
  const fullStatus = this.getFullSyncStatus();
  const iconStatus = this.getSyncStatusIcon();
  
  // Update both elements
  const statusEl = document.getElementById('syncStatus');
  const iconEl = document.getElementById('syncStatusIcon');
  
  if (statusEl) statusEl.innerHTML = fullStatus;
  if (iconEl) iconEl.innerHTML = iconStatus;
  
  return fullStatus;
},

// Get full status text
getFullSyncStatus() {
  if (!this.syncStatus.isOnline) {
    return '<span class="text-red-500"><i class="fas fa-wifi-slash"></i> ออฟไลน์</span>';
  }
  
  if (this.syncStatus.isSyncing) {
    return '<span class="text-blue-500"><i class="fas fa-sync fa-spin"></i> กำลัง sync...</span>';
  }
  
  if (this.syncStatus.pendingSync.length > 0) {
    return `<span class="text-yellow-500"><i class="fas fa-exclamation-triangle"></i> รอ sync ${this.syncStatus.pendingSync.length} รายการ</span>`;
  }
  
  if (this.syncStatus.lastSync) {
    const minutesAgo = Math.floor((Date.now() - this.syncStatus.lastSync) / 60000);
    if (minutesAgo < 1) {
      return '<span class="text-green-500"><i class="fas fa-check-circle"></i> ซิงค์แล้ว</span>';
    } else {
      return `<span class="text-green-500"><i class="fas fa-check-circle"></i> ซิงค์เมื่อ ${minutesAgo} นาทีที่แล้ว</span>`;
    }
  }
  
  return '<span class="text-green-500"><i class="fas fa-check-circle"></i> ออนไลน์</span>';
},

// Get icon only for mobile
getSyncStatusIcon() {
  if (!this.syncStatus.isOnline) {
    return '<i class="fas fa-wifi-slash text-red-500"></i>';
  }
  
  if (this.syncStatus.isSyncing) {
    return '<i class="fas fa-sync fa-spin text-blue-500"></i>';
  }
  
  if (this.syncStatus.pendingSync.length > 0) {
    return `<i class="fas fa-exclamation-triangle text-yellow-500"></i>`;
  }
  
  return '<i class="fas fa-check-circle text-green-500"></i>';
},

  // Queue operation for sync
  queueOperation(type, data) {
    this.addToPendingSync(type, data);
  }
};

// Export
window.SyncManager = SyncManager;
