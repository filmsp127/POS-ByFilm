// Main App Module
const App = {
  // Global state
  state: {
    products: [],
    categories: [],
    cart: [],
    sales: [],
    members: [],
    currentCategory: "all",
    currentStoreId: null,
    settings: {
      storeName: "Modern POS",
      storeAddress: "",
      storePhone: "",
      tax: 7,
      currency: "฿",
      memberDiscount: 5,
      pointRate: 100,
      autoLockMinutes: 10, // Auto lock after 10 minutes
      printer: { enabled: false, ip: "" },
      cashDrawer: { enabled: false, port: "" },
      scanner: { enabled: false },
      auth: null,
      receipt: {
        showPhone: true,
        showLogo: true,
        footerMessage: "ขอบคุณที่ใช้บริการ",
      },
    },
  },

  // Auto-save interval
  autoSaveInterval: null,
  lastActivity: Date.now(),
  lockCheckInterval: null,

  // Initialize application
  init() {
    console.log("🚀 Initializing POS System...");

    try {
      // Initialize authentication first
      Auth.init();

      // Check authentication
      if (!Auth.isAuthenticated()) {
        // Hide loading screen and show login
        document.getElementById("loadingScreen").style.display = "none";
        Auth.showLogin();
        return;
      }

      // User is authenticated, proceed with normal initialization
      this.initializeApp();
    } catch (error) {
      console.error("Initialization error:", error);
      document.getElementById("loadingScreen").style.display = "none";
      Auth.showLogin();
    }
  },

  // Initialize the main application
  async initializeApp() {
    try {
      // Get current store
      const store = Auth.getCurrentStore();
      if (store) {
        this.state.currentStoreId = store.id;
        console.log(`🏪 Loading data for store: ${store.name}`);
      }

      // Load saved data for this store
      await this.loadData();

      // Initialize modules
      POS.init();
      Cart.init();
      Payment.init();
      BackOffice.init();

      // Setup auto-save
      this.setupAutoSave();

      // Setup activity tracking for auto-lock
      this.setupActivityTracking();

      // Hide loading screen
      setTimeout(() => {
        document.getElementById("loadingScreen").style.display = "none";
        this.showWelcomeMessage();
      }, 1000);

      // Setup service worker for offline support
      this.setupServiceWorker();

      // Initial sync with Firebase
      if (window.FirebaseService && FirebaseService.isAuthenticated()) {
        this.syncWithFirebase();
      }
    } catch (error) {
      console.error("App initialization error:", error);
      document.getElementById("loadingScreen").style.display = "none";
      Utils.showToast("เกิดข้อผิดพลาดในการโหลดข้อมูล", "error");
    }
  },

  // Setup auto-save
  setupAutoSave() {
    // Clear existing interval
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
    }

    // Save every 30 seconds
    this.autoSaveInterval = setInterval(() => {
      this.saveData();
      console.log("⏰ Auto-saved data");
    }, 30000);

    // Save on page unload
    window.addEventListener("beforeunload", () => {
      this.saveData();
    });

    // Save on visibility change (mobile)
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        this.saveData();
      }
    });
  },

  // Setup activity tracking for auto-lock
  setupActivityTracking() {
    // Update last activity time
    const updateActivity = () => {
      this.lastActivity = Date.now();
    };

    // Track user activity
    [
      "mousedown",
      "mousemove",
      "keypress",
      "scroll",
      "touchstart",
      "click",
    ].forEach((event) => {
      document.addEventListener(event, updateActivity, true);
    });

    // Check for inactivity every minute
    if (this.lockCheckInterval) {
      clearInterval(this.lockCheckInterval);
    }

    this.lockCheckInterval = setInterval(() => {
      const inactiveMinutes = (Date.now() - this.lastActivity) / 1000 / 60;
      const lockMinutes = this.state.settings.autoLockMinutes || 10;

      if (inactiveMinutes >= lockMinutes) {
        console.log("🔒 Auto-locking due to inactivity");
        this.autoLock();
      }
    }, 60000); // Check every minute
  },

  // Auto lock screen
  autoLock() {
    // Save current state
    this.saveData();

    // Show PIN screen
    Auth.showPinLogin();

    // Hide main interface
    document.getElementById("posInterface").style.display = "none";
  },

  // Data Management with Store Isolation and Firebase Sync
  async loadData() {
    try {
      const storeId = this.state.currentStoreId;
      if (!storeId) {
        console.error("No store ID found");
        this.loadDefaultData();
        return;
      }

      // Try to load from localStorage first
      const storageKey = `posData_${storeId}`;
      const savedData = localStorage.getItem(storageKey);

      if (savedData) {
        const data = JSON.parse(savedData);
        this.state = { ...this.state, ...data, currentStoreId: storeId };
        console.log("✅ Data loaded from storage for store:", storeId);
      } else if (window.FirebaseService && FirebaseService.isAuthenticated()) {
        // Try to load from Firebase
        await this.loadFromFirebase();
      } else {
        // Load default data for new store
        this.loadDefaultData();
        console.log("📦 Default data loaded for new store");
      }
    } catch (error) {
      console.error("❌ Error loading data:", error);
      this.loadDefaultData();
    }
  },

  // Load data from Firebase
  async loadFromFirebase() {
    try {
      if (!FirebaseService.currentStore) return;

      const storeId = FirebaseService.currentStore.id;
      const storeRef = FirebaseService.db.collection("stores").doc(storeId);

      // Load products
      const productsSnap = await storeRef.collection("products").get();
      const products = [];
      productsSnap.forEach((doc) => {
        products.push({ ...doc.data(), id: doc.id });
      });
      if (products.length > 0) {
        this.state.products = products;
      }

      // Load categories
      const categoriesSnap = await storeRef.collection("categories").get();
      const categories = [];
      categoriesSnap.forEach((doc) => {
        categories.push({ ...doc.data(), id: parseInt(doc.id) });
      });
      if (categories.length > 0) {
        this.state.categories = categories;
      }

      // Load members
      const membersSnap = await storeRef.collection("members").get();
      const members = [];
      membersSnap.forEach((doc) => {
        members.push({ ...doc.data(), id: doc.id });
      });
      if (members.length > 0) {
        this.state.members = members;
      }

      // Load recent sales (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const salesSnap = await storeRef
        .collection("sales")
        .where("timestamp", ">=", thirtyDaysAgo.getTime())
        .orderBy("timestamp", "desc")
        .limit(500)
        .get();

      const sales = [];
      salesSnap.forEach((doc) => {
        sales.push({ ...doc.data(), id: parseInt(doc.id) });
      });
      if (sales.length > 0) {
        this.state.sales = sales;
      }

      console.log("✅ Data loaded from Firebase");
      this.saveData(); // Save to local storage
    } catch (error) {
      console.error("Error loading from Firebase:", error);
    }
  },

  // Sync with Firebase
  async syncWithFirebase() {
    try {
      if (!FirebaseService.currentStore) return;

      const storeId = FirebaseService.currentStore.id;
      const storeRef = FirebaseService.db.collection("stores").doc(storeId);

      // Sync products
      const batch = FirebaseService.db.batch();

      this.state.products.forEach((product) => {
        const productRef = storeRef
          .collection("products")
          .doc(product.id.toString());
        batch.set(
          productRef,
          {
            ...product,
            lastSynced: firebase.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      });

      // Sync categories
      this.state.categories.forEach((category) => {
        const categoryRef = storeRef
          .collection("categories")
          .doc(category.id.toString());
        batch.set(
          categoryRef,
          {
            ...category,
            lastSynced: firebase.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      });

      // Sync members
      this.state.members.forEach((member) => {
        const memberRef = storeRef
          .collection("members")
          .doc(member.id.toString());
        batch.set(
          memberRef,
          {
            ...member,
            lastSynced: firebase.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      });

      await batch.commit();
      console.log("✅ Data synced to Firebase");
    } catch (error) {
      console.error("Error syncing to Firebase:", error);
    }
  },

  saveData() {
    try {
      const storeId = this.state.currentStoreId;
      if (!storeId) {
        console.error("Cannot save data: No store ID");
        return;
      }

      const storageKey = `posData_${storeId}`;
      localStorage.setItem(storageKey, JSON.stringify(this.state));
      console.log("💾 Data saved for store:", storeId);

      // Sync to Firebase in background (don't wait)
      if (window.FirebaseService && FirebaseService.isAuthenticated()) {
        this.syncWithFirebase().catch(console.error);
      }
    } catch (error) {
      console.error("❌ Error saving data:", error);

      // Try to save critical data only
      try {
        const criticalData = {
          sales: this.state.sales.slice(-100), // Last 100 sales
          members: this.state.members,
          currentStoreId: this.state.currentStoreId,
        };
        const storageKey = `posDataCritical_${this.state.currentStoreId}`;
        localStorage.setItem(storageKey, JSON.stringify(criticalData));
        console.log("💾 Critical data saved");
      } catch (e) {
        console.error("❌ Failed to save critical data:", e);
      }
    }
  },

  // Sales with member info
  addSale(sale) {
    try {
      sale.id = Date.now();
      sale.timestamp = Date.now();
      sale.date = new Date().toISOString();
      sale.storeId = this.state.currentStoreId;

      // Add user info
      const user = Auth.getCurrentUser();
      if (user) {
        sale.cashier = user.username || user.email || "พนักงาน";
        if (user.uid) sale.cashierId = user.uid;
      }

      // Add member info if exists
      if (sale.memberId) {
        const member = this.state.members.find((m) => m.id == sale.memberId);
        if (member) {
          sale.memberName = member.name;
          sale.memberPhone = member.phone;
        }
      } else {
        sale.memberName = "ลูกค้าทั่วไป";
      }

      // Validate sale data
      if (!sale.items || sale.items.length === 0) {
        throw new Error("ไม่มีสินค้าในรายการขาย");
      }

      // Save to state first
      this.state.sales.push(sale);

      // Update stock
      sale.items.forEach((item) => {
        const product = this.getProductById(item.id);
        if (product) {
          product.stock -= item.quantity;
        }
      });

      // Save to localStorage immediately
      this.saveData();

      // Log activity
      this.logActivity("sale_completed", {
        saleId: sale.id,
        total: sale.total,
        itemCount: sale.items.length,
        memberName: sale.memberName,
      });

      console.log("✅ Sale saved successfully:", sale.id);
      return sale;
    } catch (error) {
      console.error("❌ Error adding sale:", error);

      // Rollback changes
      const index = this.state.sales.findIndex((s) => s.id === sale.id);
      if (index !== -1) {
        this.state.sales.splice(index, 1);
      }

      throw error;
    }
  },

  // Show welcome message
  showWelcomeMessage() {
    const user = Auth.getCurrentUser();
    const store = Auth.getCurrentStore();

    if (user && store) {
      Utils.showToast(
        `ยินดีต้อนรับกลับ ${user.username || user.email} - ${store.name}!`,
        "success"
      );
    }

    // Show main interface
    document.getElementById("posInterface").style.display = "flex";
  },

  // Service Worker Setup
  setupServiceWorker() {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => console.log("✅ Service Worker registered"))
        .catch((err) => console.log("❌ Service Worker registration failed"));
    }
  },

  // Get state
  getState() {
    return this.state;
  },

  // Update state
  updateState(updates) {
    this.state = { ...this.state, ...updates };
    this.saveData();
  },

  // Products
  getProducts() {
    return this.state.products;
  },

  getProductById(id) {
    return this.state.products.find((p) => p.id === id);
  },

  addProduct(product) {
    product.id = Date.now();
    this.state.products.push(product);
    this.saveData();
    return product;
  },

  updateProduct(id, updates) {
    const index = this.state.products.findIndex((p) => p.id === id);
    if (index !== -1) {
      this.state.products[index] = {
        ...this.state.products[index],
        ...updates,
      };
      this.saveData();
      return true;
    }
    return false;
  },

  deleteProduct(id) {
    this.state.products = this.state.products.filter((p) => p.id !== id);
    this.saveData();
  },

  // Categories
  getCategories() {
    return this.state.categories;
  },

  // Sales
  addSale(sale) {
    try {
      sale.id = Date.now();
      sale.timestamp = Date.now();
      sale.date = new Date().toISOString();
      sale.storeId = this.state.currentStoreId; // เพิ่ม Store ID

      // Add user info
      const user = Auth.getCurrentUser();
      if (user) {
        sale.cashier = user.username || user.email || "พนักงาน";
        if (user.uid) sale.cashierId = user.uid;
      }

      // Validate sale data
      if (!sale.items || sale.items.length === 0) {
        throw new Error("ไม่มีสินค้าในรายการขาย");
      }

      // Save to state first
      this.state.sales.push(sale);

      // Update stock
      sale.items.forEach((item) => {
        const product = this.getProductById(item.id);
        if (product) {
          product.stock -= item.quantity;
        }
      });

      // Save to localStorage
      this.saveData();

      // Log activity
      this.logActivity("sale_completed", {
        saleId: sale.id,
        total: sale.total,
        itemCount: sale.items.length,
      });

      console.log("✅ Sale saved successfully:", sale.id);
      return sale;
    } catch (error) {
      console.error("❌ Error adding sale:", error);

      // Rollback changes
      const index = this.state.sales.findIndex((s) => s.id === sale.id);
      if (index !== -1) {
        this.state.sales.splice(index, 1);
      }

      throw error; // Re-throw for handling in payment module
    }
  },

  // Get sale by ID
  getSaleById(saleId) {
    return this.state.sales.find((s) => s.id === saleId);
  },

  // Get sales
  getSales() {
    return this.state.sales;
  },

  // Reports
  getTodaySales() {
    const today = new Date().toDateString();
    return this.state.sales.filter(
      (s) => new Date(s.date).toDateString() === today
    );
  },

  getSalesByDateRange(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return this.state.sales.filter((s) => {
      const saleDate = new Date(s.date);
      return saleDate >= start && saleDate <= end;
    });
  },

  // Settings
  getSettings() {
    return this.state.settings;
  },

  updateSettings(updates) {
    this.state.settings = { ...this.state.settings, ...updates };
    this.saveData();
  },

  // Data Export/Import
  exportData() {
    const store = Auth.getCurrentStore();
    const dataStr = JSON.stringify(this.state, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `pos-backup-${store ? store.name : "data"}-${
      new Date().toISOString().split("T")[0]
    }.json`;
    link.click();
    URL.revokeObjectURL(url);
  },

  importData(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          this.state = { ...this.state, ...data };
          this.saveData();
          resolve();
        } catch (error) {
          reject(error);
        }
      };
      reader.readAsText(file);
    });
  },

  // Clear all data with authentication check
  clearAllData() {
    if (!Auth.isAuthenticated()) {
      Utils.showToast("กรุณาเข้าสู่ระบบก่อน", "error");
      return;
    }

    Utils.confirm(
      "ต้องการล้างข้อมูลทั้งหมด? การกระทำนี้ไม่สามารถย้อนกลับได้",
      () => {
        Utils.confirm("ยืนยันอีกครั้ง? ข้อมูลทั้งหมดจะถูกลบ", () => {
          // Keep authentication data
          const authSettings = this.state.settings.auth;
          const storeId = this.state.currentStoreId;

          const storageKey = `posData_${storeId}`;
          localStorage.removeItem(storageKey);

          // Reset to defaults but keep auth
          this.loadDefaultData();
          if (authSettings) {
            this.state.settings.auth = authSettings;
            this.saveData();
          }

          Utils.showToast("ล้างข้อมูลเรียบร้อย", "success");
          setTimeout(() => location.reload(), 1000);
        });
      }
    );
  },

  // Logout function
  logout() {
    Utils.confirm("ต้องการออกจากระบบ?", () => {
      Auth.logout();
      location.reload();
    });
  },

  // Show user menu
  showUserMenu() {
    const user = Auth.getCurrentUser();
    const store = Auth.getCurrentStore();
    if (!user) return;

    const content = `
      <div class="p-4">
        <div class="flex items-center gap-3 mb-4 pb-4 border-b border-gray-200">
          <div class="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
            <i class="fas fa-user text-white"></i>
          </div>
          <div>
            <div class="font-medium text-gray-800">${user.username}</div>
            <div class="text-sm text-gray-500">${
              store ? store.name : "ร้านค้า"
            }</div>
            <div class="text-xs text-gray-400">
              เข้าสู่ระบบ ${Utils.formatDate(user.loginTime, "time")}
            </div>
          </div>
        </div>
        
        <div class="space-y-2">
          <button onclick="Auth.changePin(); Utils.closeModal(this.closest('.fixed'))" 
                  class="w-full text-left p-3 hover:bg-gray-100 rounded-lg transition">
            <i class="fas fa-key mr-3 text-gray-600"></i>เปลี่ยนรหัส PIN
          </button>
          <button onclick="App.switchStore(); Utils.closeModal(this.closest('.fixed'))" 
                  class="w-full text-left p-3 hover:bg-gray-100 rounded-lg transition">
            <i class="fas fa-store mr-3 text-gray-600"></i>เปลี่ยนร้าน
          </button>
          <button onclick="App.logout(); Utils.closeModal(this.closest('.fixed'))" 
                  class="w-full text-left p-3 hover:bg-red-50 text-red-600 rounded-lg transition">
            <i class="fas fa-sign-out-alt mr-3"></i>ออกจากระบบ
          </button>
        </div>
      </div>
    `;

    Utils.createModal(content, { size: "w-full max-w-xs" });
  },

  // Switch store
  switchStore() {
    Utils.confirm("ต้องการเปลี่ยนร้าน? ข้อมูลที่ยังไม่บันทึกจะหายไป", () => {
      Auth.clearCurrentStore();
      location.reload();
    });
  },

  // Check and handle session expiry
  checkSession() {
    if (!Auth.isAuthenticated()) {
      Utils.showToast("เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่", "warning");
      setTimeout(() => {
        location.reload();
      }, 2000);
      return false;
    }
    return true;
  },

  // Add activity logging
  logActivity(action, details = {}) {
    const user = Auth.getCurrentUser();
    const store = Auth.getCurrentStore();
    if (!user) return;

    const logEntry = {
      timestamp: Date.now(),
      date: new Date().toISOString(),
      user: user.username,
      userId: user.uid,
      storeId: store ? store.id : null,
      storeName: store ? store.name : null,
      action: action,
      details: details,
    };

    // Store in activity log (keep last 1000 entries)
    if (!this.state.activityLog) {
      this.state.activityLog = [];
    }

    this.state.activityLog.push(logEntry);

    // Keep only last 1000 entries
    if (this.state.activityLog.length > 1000) {
      this.state.activityLog = this.state.activityLog.slice(-1000);
    }

    this.saveData();
  },

  // Get activity log
  getActivityLog(limit = 100) {
    if (!this.state.activityLog) return [];

    return this.state.activityLog.slice(-limit).reverse(); // Most recent first
  },

  // Data validation
  validateSaleData() {
    const sales = this.getSales();
    const products = this.getProducts();

    console.log("=== Data Validation ===");
    console.log("Total sales:", sales.length);
    console.log("Total products:", products.length);
    console.log("Last sale:", sales[sales.length - 1]);
    console.log("Current store:", this.state.currentStoreId);

    // Check localStorage size
    const dataSize = new Blob([JSON.stringify(this.state)]).size;
    const maxSize = 10 * 1024 * 1024; // 10MB
    console.log("Data size:", (dataSize / 1024 / 1024).toFixed(2), "MB");

    if (dataSize > maxSize * 0.8) {
      console.warn("⚠️ Storage is getting full!");
      this.cleanOldSales();
    }

    return {
      salesCount: sales.length,
      productsCount: products.length,
      dataSize: dataSize,
      isFull: dataSize > maxSize * 0.8,
    };
  },

  // Clean old sales
  cleanOldSales() {
    const oneMonthAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const oldSalesCount = this.state.sales.length;

    // Keep only sales from last 30 days
    this.state.sales = this.state.sales.filter((sale) => {
      const saleTime = new Date(sale.date).getTime();
      return saleTime > oneMonthAgo;
    });

    const removed = oldSalesCount - this.state.sales.length;
    if (removed > 0) {
      this.saveData();
      console.log(`🗑️ Cleaned ${removed} old sales`);
      Utils.showToast(`ลบข้อมูลเก่า ${removed} รายการ`, "info");
    }
  },
};
