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
      autoLockMinutes: 10,
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
  unsubscribers: [],
  syncTimeout: null,

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
      console.log("🚀 Starting app initialization...");

      // Get current store
      const store = Auth.getCurrentStore();
      const user = Auth.getCurrentUser();

      console.log("Current user:", user);
      console.log("Current store:", store);

      if (!store && user && window.FirebaseService) {
        console.log("No store found, checking user stores...");

        try {
          const stores = await FirebaseService.getUserStores(user.uid);
          console.log("User stores:", stores);

          if (stores.length === 0) {
            Utils.showToast("ไม่พบข้อมูลร้าน กรุณาสร้างร้านใหม่", "error");
            document.getElementById("loadingScreen").style.display = "none";
            this.showCreateStoreModal();
            return;
          } else if (stores.length === 1) {
            // มีร้านเดียว เลือกอัตโนมัติ
            console.log("Auto-selecting single store:", stores[0]);
            const selectResult = await FirebaseService.selectStore(
              stores[0].storeId
            );
            if (selectResult.success) {
              // เริ่มใหม่หลังจากเลือกร้านแล้ว
              await this.initializeApp();
              return;
            } else {
              throw new Error("Failed to select store: " + selectResult.error);
            }
          } else {
            // มีหลายร้าน ให้เลือก
            document.getElementById("loadingScreen").style.display = "none";
            this.showStoreSelectionModal(stores);
            return;
          }
        } catch (error) {
          console.error("Error getting user stores:", error);
          document.getElementById("loadingScreen").style.display = "none";
          Utils.showToast("เกิดข้อผิดพลาดในการโหลดข้อมูลร้าน", "error");
          return;
        }
      }

      if (!store) {
        console.error("No store available");
        document.getElementById("loadingScreen").style.display = "none";
        Utils.showToast("ไม่พบข้อมูลร้าน", "error");
        return;
      }

      this.state.currentStoreId = store.id;
      console.log(`🏪 Loading data for store: ${store.name}`);

      // Update settings with store info
      this.state.settings.storeName = store.name || "Modern POS";
      this.state.settings.storeAddress = store.address || "";
      this.state.settings.storePhone = store.phone || "";

      // Load saved data for this store
      await this.loadData();

      // Initialize modules
      POS.init();
      Cart.init();
      Payment.init();
      BackOffice.init();

      // Update sync status display
setInterval(() => {
  const statusEl = document.getElementById('syncStatus');
  if (statusEl && window.SyncManager) {
    statusEl.innerHTML = SyncManager.getSyncStatusDisplay();
  }
}, 1000);

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
    } catch (error) {
      console.error("App initialization error:", error);
      document.getElementById("loadingScreen").style.display = "none";
      Utils.showToast(
        "เกิดข้อผิดพลาดในการโหลดข้อมูล: " + error.message,
        "error"
      );
    }
  },

  // Show store selection modal
  showStoreSelectionModal(stores) {
    const content = `
      <div class="p-6">
        <h3 class="text-xl font-bold text-gray-800 mb-4">เลือกร้านค้า</h3>
        <div class="space-y-3">
          ${stores
            .map(
              (store) => `
            <button onclick="App.selectStore('${store.storeId}')" 
                    class="w-full p-4 bg-gray-50 border-2 border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition text-left">
              <div class="font-medium text-gray-800">${store.storeName}</div>
              <div class="text-sm text-gray-500">เข้าร่วมเมื่อ ${Utils.formatDate(
                store.joinedAt?.toDate() || new Date()
              )}</div>
            </button>
          `
            )
            .join("")}
        </div>
        
        <div class="mt-6 pt-4 border-t">
          <button onclick="App.showCreateStoreModal()" 
                  class="w-full btn-primary py-2 rounded-lg text-white">
            <i class="fas fa-plus mr-2"></i>สร้างร้านใหม่
          </button>
        </div>
      </div>
    `;

    Utils.createModal(content, { size: "w-full max-w-md" });
  },

  async selectStore(storeId) {
    Utils.showLoading("กำลังเปลี่ยนร้าน...");

    const result = await FirebaseService.selectStore(storeId);
    if (result.success) {
      Utils.hideLoading();
      location.reload();
    } else {
      Utils.hideLoading();
      Utils.showToast("เกิดข้อผิดพลาดในการเลือกร้าน", "error");
    }
  },

  showCreateStoreModal() {
    const content = `
      <div class="p-6">
        <h3 class="text-xl font-bold text-gray-800 mb-4">สร้างร้านใหม่</h3>
        
        <form onsubmit="App.createNewStore(event)">
          <div class="space-y-4">
            <div>
              <label class="text-gray-700 text-sm font-medium">ชื่อร้าน *</label>
              <input type="text" id="newStoreName" required
                     class="w-full mt-1 p-2 rounded-lg border border-gray-300 text-gray-800">
            </div>
            
            <div>
              <label class="text-gray-700 text-sm font-medium">ที่อยู่</label>
              <textarea id="newStoreAddress" rows="3"
                        class="w-full mt-1 p-2 rounded-lg border border-gray-300 text-gray-800"></textarea>
            </div>
            
            <div>
              <label class="text-gray-700 text-sm font-medium">เบอร์โทร</label>
              <input type="tel" id="newStorePhone"
                     class="w-full mt-1 p-2 rounded-lg border border-gray-300 text-gray-800">
            </div>
          </div>
          
          <div class="flex gap-3 mt-6">
            <button type="button" onclick="Utils.closeModal(this.closest('.fixed'))"
                    class="flex-1 bg-gray-200 hover:bg-gray-300 py-2 rounded-lg text-gray-800">
              ยกเลิก
            </button>
            <button type="submit"
                    class="flex-1 btn-primary py-2 rounded-lg text-white">
              สร้างร้าน
            </button>
          </div>
        </form>
      </div>
    `;

    Utils.createModal(content, { size: "w-full max-w-md" });
  },

  async createNewStore(event) {
    event.preventDefault();

    const user = Auth.getCurrentUser();
    if (!user) {
      Utils.showToast("กรุณาเข้าสู่ระบบก่อน", "error");
      return;
    }

    const storeData = {
      name: document.getElementById("newStoreName").value.trim(),
      address: document.getElementById("newStoreAddress").value.trim(),
      phone: document.getElementById("newStorePhone").value.trim(),
      ownerId: user.uid,
      ownerEmail: user.email,
      ownerName: user.displayName || user.email,
    };

    Utils.showLoading("กำลังสร้างร้าน...");

    const result = await FirebaseService.createStore(storeData);

    if (result.success) {
      Utils.hideLoading();
      Utils.showToast("สร้างร้านสำเร็จ!", "success");
      Utils.closeModal(event.target.closest(".fixed"));

      // Select the new store
      const selectResult = await FirebaseService.selectStore(result.storeId);
      if (selectResult.success) {
        setTimeout(() => {
          location.reload();
        }, 1000);
      }
    } else {
      Utils.hideLoading();
      Utils.showToast(`สร้างร้านไม่สำเร็จ: ${result.error}`, "error");
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
      // Cleanup listeners
      if (this.unsubscribers) {
        this.unsubscribers.forEach((unsub) => unsub());
      }
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
        return;
      }

      // Always try to load from Firebase first if authenticated
      if (window.FirebaseService && FirebaseService.isAuthenticated()) {
        console.log("Loading from Firebase...");
        await this.loadFromFirebase();

        // Setup real-time sync
        this.setupRealtimeSync();
      } else {
        // Try to load from localStorage
        const storageKey = `posData_${storeId}`;
        const savedData = localStorage.getItem(storageKey);

        if (savedData) {
          const data = JSON.parse(savedData);
          this.state = { ...this.state, ...data, currentStoreId: storeId };
          console.log("✅ Data loaded from storage for store:", storeId);
        } else {
          // Load default data without products
          this.loadDefaultDataWithoutProducts();
          console.log("📦 Default data loaded (no products)");
        }
      }
    } catch (error) {
      console.error("❌ Error loading data:", error);
      this.loadDefaultDataWithoutProducts();
    }
  },

  // Load data from Firebase
  async loadFromFirebase() {
    if (!FirebaseService.currentStore) {
      console.error("No current store for loading data");
      return;
    }

    try {
      const storeId = FirebaseService.currentStore.id;
      const storeRef = FirebaseService.db.collection("stores").doc(storeId);

      console.log("🔄 Loading data from Firebase for store:", storeId);

      // Load store info
      const storeDoc = await storeRef.get();
      if (storeDoc.exists) {
        const storeData = storeDoc.data();
        if (storeData.settings) {
          this.state.settings = {
            ...this.state.settings,
            ...storeData.settings,
          };
        }
        // Update store name
        this.state.settings.storeName = storeData.name || "Modern POS";
        this.state.settings.storeAddress = storeData.address || "";
        this.state.settings.storePhone = storeData.phone || "";
      }

      // Clear existing data first to ensure fresh data
      this.state.categories = [];
      this.state.products = [];
      this.state.members = [];
      this.state.sales = [];

      // Load categories
      const categoriesSnapshot = await storeRef.collection("categories").get();
      const categories = [];
      categoriesSnapshot.forEach((doc) => {
        const data = doc.data();
        categories.push({ 
          ...data, 
          id: data.id || parseInt(doc.id) 
        });
      });
      
      if (categories.length > 0) {
        this.state.categories = categories;
        console.log("✅ Loaded categories:", categories.length);
      } else {
        // If no categories, create defaults
        this.loadDefaultCategories();
        // Sync default categories to Firebase
        await this.syncCategoriesToFirebase();
      }

      // Load products - ปรับปรุงการ load ให้แม่นยำ
      const productsSnapshot = await storeRef.collection("products").get();
      console.log("📦 Loading products from Firebase, found:", productsSnapshot.size);

      const products = [];
      productsSnapshot.forEach((doc) => {
        const data = doc.data();
        // ตรวจสอบว่ามีข้อมูลครบถ้วน
        if (data && data.name) {
          console.log("Product from Firebase:", doc.id, data.name);
          products.push({
            ...data,
            id: data.id || parseInt(doc.id),
          });
        }
      });

      this.state.products = products;
      console.log("✅ Loaded products:", products.length);

      // Load members
      const membersSnapshot = await storeRef.collection("members").get();
      const members = [];
      membersSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data) {
          members.push({
            ...data,
            id: data.id || parseInt(doc.id),
          });
        }
      });
      this.state.members = members;
      console.log("✅ Loaded members:", members.length);

      // Load sales (last 100) - ปรับปรุงการ handle timestamp
      try {
        const salesSnapshot = await storeRef
          .collection("sales")
          .orderBy("timestamp", "desc")
          .limit(100)
          .get();
        
        const sales = [];
        salesSnapshot.forEach((doc) => {
          const data = doc.data();
          if (data) {
            sales.push({
              ...data,
              id: data.id || parseInt(doc.id),
              // Ensure timestamp exists
              timestamp: data.timestamp || data.date || Date.now()
            });
          }
        });
        this.state.sales = sales.reverse(); // Sort from oldest to newest
        console.log("✅ Loaded sales:", sales.length);
      } catch (error) {
        console.warn("⚠️ Error loading sales (might be no sales yet):", error);
        this.state.sales = [];
      }

      console.log("✅ All data loaded from Firebase successfully");

      // Save to localStorage for offline use
      this.saveData(true); // Skip Firebase sync since we just loaded from there

      // Force UI refresh
      if (POS && POS.refresh) {
        POS.refresh();
      }
      if (BackOffice && BackOffice.currentPage) {
        BackOffice.openPage(BackOffice.currentPage);
      }

    } catch (error) {
      console.error("❌ Error loading from Firebase:", error);

      // Fall back to localStorage
      const storageKey = `posData_${this.state.currentStoreId}`;
      const savedData = localStorage.getItem(storageKey);
      if (savedData) {
        const data = JSON.parse(savedData);
        this.state = {
          ...this.state,
          ...data,
          currentStoreId: this.state.currentStoreId,
        };
        console.log("📱 Loaded from localStorage instead");
      } else {
        this.loadDefaultDataWithoutProducts();
      }
    }
  },

  // Sync categories to Firebase
  async syncCategoriesToFirebase() {
    try {
      if (!FirebaseService.currentStore) return;

      const storeId = FirebaseService.currentStore.id;
      const batch = FirebaseService.db.batch();

      this.state.categories.forEach((category) => {
        const categoryRef = FirebaseService.db
          .collection("stores")
          .doc(storeId)
          .collection("categories")
          .doc(category.id.toString());
        batch.set(categoryRef, {
          ...category,
          lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
        });
      });

      await batch.commit();
      console.log("Categories synced to Firebase");
    } catch (error) {
      console.error("Error syncing categories:", error);
    }
  },

  // Setup real-time sync with Firebase - เพิ่ม sync sales ด้วย
  setupRealtimeSync() {
    if (!FirebaseService.currentStore) return;

    const storeId = FirebaseService.currentStore.id;
    const storeRef = FirebaseService.db.collection("stores").doc(storeId);

    // Clear existing listeners
    if (this.unsubscribers) {
      this.unsubscribers.forEach((unsub) => unsub());
    }
    this.unsubscribers = [];

    // Filter sample products
    const defaultProductNames = [
      "อเมริกาโน่เย็น",
      "อเมริกาโน่ร้อน",
      "คาปูชิโน่",
    ];

    // Listen to products changes
    const productsUnsub = storeRef
      .collection("products")
      .onSnapshot((snapshot) => {
        snapshot.docChanges().forEach((change) => {
          const data = change.doc.data();

          // Filter out sample products
          if (defaultProductNames.includes(data.name)) {
            return; // Skip sample products
          }

          const product = { ...data, id: data.id || parseInt(change.doc.id) };

          if (change.type === "added") {
            const exists = this.state.products.find((p) => p.id === product.id);
            if (!exists) {
              this.state.products.push(product);
            }
          } else if (change.type === "modified") {
            const index = this.state.products.findIndex(
              (p) => p.id === product.id
            );
            if (index >= 0) {
              this.state.products[index] = product;
            }
          } else if (change.type === "removed") {
            this.state.products = this.state.products.filter(
              (p) => p.id !== product.id
            );
          }
        });

        // Update UI
        if (POS && POS.refresh) {
          POS.refresh();
        }
        if (BackOffice.currentPage === "products") {
          BackOffice.loadProductsList();
        }
      });
    this.unsubscribers.push(productsUnsub);

    // Listen to categories changes
    const categoriesUnsub = storeRef
      .collection("categories")
      .onSnapshot((snapshot) => {
        snapshot.docChanges().forEach((change) => {
          const data = change.doc.data();
          const category = { ...data, id: parseInt(change.doc.id) };

          if (change.type === "added") {
            const exists = this.state.categories.find(
              (c) => c.id === category.id
            );
            if (!exists) {
              this.state.categories.push(category);
            }
          } else if (change.type === "modified") {
            const index = this.state.categories.findIndex(
              (c) => c.id === category.id
            );
            if (index >= 0) {
              this.state.categories[index] = category;
            }
          } else if (change.type === "removed") {
            this.state.categories = this.state.categories.filter(
              (c) => c.id !== category.id
            );
          }
        });

        // Update UI
        if (POS && POS.refresh) {
          POS.refresh();
        }
      });
    this.unsubscribers.push(categoriesUnsub);

    // Listen to members changes
    const membersUnsub = storeRef
      .collection("members")
      .onSnapshot((snapshot) => {
        snapshot.docChanges().forEach((change) => {
          const data = change.doc.data();
          const member = { ...data, id: data.id || parseInt(change.doc.id) };

          if (change.type === "added") {
            const exists = this.state.members.find((m) => m.id === member.id);
            if (!exists) {
              this.state.members.push(member);
            }
          } else if (change.type === "modified") {
            const index = this.state.members.findIndex(
              (m) => m.id === member.id
            );
            if (index >= 0) {
              this.state.members[index] = member;
            }
          } else if (change.type === "removed") {
            this.state.members = this.state.members.filter(
              (m) => m.id !== member.id
            );
          }
        });

        if (BackOffice.currentPage === "members") {
          BackOffice.loadMembersList();
        }
      });
    this.unsubscribers.push(membersUnsub);

    // Listen to sales changes (last 100)
    const salesUnsub = storeRef
      .collection("sales")
      .orderBy("timestamp", "desc")
      .limit(100)
      .onSnapshot((snapshot) => {
        // Clear and reload all sales from snapshot
        const newSales = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          newSales.push({
            ...data,
            id: parseInt(doc.id),
          });
        });
        
        // Sort from oldest to newest
        this.state.sales = newSales.reverse();
        
        // Update UI if on sales page
        if (BackOffice.currentPage === "sales") {
          BackOffice.loadSalesHistory();
        }
        
        // Update dashboard stats
        if (BackOffice.currentPage === "dashboard") {
          BackOffice.updateDashboardStats();
        }
      });
    this.unsubscribers.push(salesUnsub);

    // Listen to store info changes
    const storeUnsub = storeRef.onSnapshot((doc) => {
      if (doc.exists) {
        const storeData = doc.data();

        // Update store settings
        if (storeData.settings) {
          this.state.settings = {
            ...this.state.settings,
            ...storeData.settings,
          };
        }

        // Update store info
        this.state.settings.storeName = storeData.name || "Modern POS";
        this.state.settings.storeAddress = storeData.address || "";
        this.state.settings.storePhone = storeData.phone || "";

        // Save to localStorage
        this.saveData(true);
      }
    });
    this.unsubscribers.push(storeUnsub);

    console.log("✅ Real-time sync setup completed with sales sync");
  },

    // Sync with Firebase - ปรับปรุงให้ sync ทุกอย่างรวมทั้ง sales
  async syncWithFirebase() {
    try {
      if (!FirebaseService.currentStore) {
        console.error("No current store for sync");
        return;
      }

      console.log("Starting sync to Firebase...");
      const storeId = FirebaseService.currentStore.id;
      const storeRef = FirebaseService.db.collection("stores").doc(storeId);

      // Log what we're syncing
      console.log("Products to sync:", this.state.products.length);
      console.log("Sales to sync:", this.state.sales.length);
      console.log("Members to sync:", this.state.members.length);

      // Sync store settings
      await storeRef.set(
        {
          name:
            this.state.settings.storeName || FirebaseService.currentStore.name,
          address: this.state.settings.storeAddress || "",
          phone: this.state.settings.storePhone || "",
          settings: this.state.settings,
          lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      // ใช้ batches แยกเพื่อหลีกเลี่ยง limit 500 operations
      let batch = FirebaseService.db.batch();
      let operationCount = 0;
      const MAX_BATCH_SIZE = 400; // เผื่อไว้หน่อย

      // Sync products
      for (const product of this.state.products) {
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
        operationCount++;

        if (operationCount >= MAX_BATCH_SIZE) {
          await batch.commit();
          batch = FirebaseService.db.batch();
          operationCount = 0;
        }
      }

      // Sync categories
      for (const category of this.state.categories) {
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
        operationCount++;

        if (operationCount >= MAX_BATCH_SIZE) {
          await batch.commit();
          batch = FirebaseService.db.batch();
          operationCount = 0;
        }
      }

      // Sync members
      for (const member of this.state.members) {
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
        operationCount++;

        if (operationCount >= MAX_BATCH_SIZE) {
          await batch.commit();
          batch = FirebaseService.db.batch();
          operationCount = 0;
        }
      }

      // Sync recent sales (last 50)
      const recentSales = this.state.sales.slice(-50);
      for (const sale of recentSales) {
        const saleRef = storeRef
          .collection("sales")
          .doc(sale.id.toString());
        batch.set(
          saleRef,
          {
            ...sale,
            lastSynced: firebase.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
        operationCount++;

        if (operationCount >= MAX_BATCH_SIZE) {
          await batch.commit();
          batch = FirebaseService.db.batch();
          operationCount = 0;
        }
      }

      // Commit remaining operations
      if (operationCount > 0) {
        await batch.commit();
      }

      console.log("✅ All data synced to Firebase");
      return { success: true };
    } catch (error) {
      console.error("Error syncing to Firebase:", error);
      throw error;
    }
  },

   async saveData(skipFirebaseSync = false) {
     console.log("💾 saveData called, skipFirebaseSync:", skipFirebaseSync);
    console.log("Products to save:", this.state.products);
    try {
      const storeId = this.state.currentStoreId;
      if (!storeId) {
        console.error("Cannot save data: No store ID");
        return;
      }

      // Save to localStorage first for offline support
      const storageKey = `posData_${storeId}`;
      localStorage.setItem(storageKey, JSON.stringify(this.state));
      console.log("💾 Data saved locally for store:", storeId);

      // Only sync to Firebase if not skipped and authenticated
      if (!skipFirebaseSync && window.FirebaseService && FirebaseService.isAuthenticated()) {
        // Debounce Firebase sync to prevent rapid firing
        if (this.syncTimeout) {
          clearTimeout(this.syncTimeout);
        }
        
        this.syncTimeout = setTimeout(() => {
          this.syncWithFirebase().then(() => {
            console.log("☁️ Data synced to cloud");
          }).catch(error => {
            console.error("❌ Failed to sync to cloud:", error);
            Utils.showToast("ไม่สามารถซิงค์ข้อมูลได้ กรุณาตรวจสอบการเชื่อมต่อ", "warning");
          });
        }, 2000); // Wait 2 seconds before syncing
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
          sale.customerName = member.name;
        }
      } else {
        sale.memberName = "ลูกค้าทั่วไป";
        sale.customerName = sale.customerName || "ลูกค้าทั่วไป";
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

      // Sync to Firebase immediately
      if (
        window.FirebaseService &&
        FirebaseService.isAuthenticated() &&
        FirebaseService.currentStore
      ) {
        this.syncSaleToFirebase(sale);
        this.syncProductsToFirebase(); // Sync updated stock
      }

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

  // Sync sale to Firebase
  async syncSaleToFirebase(sale) {
    try {
      if (!FirebaseService.currentStore) return;

      const storeId = FirebaseService.currentStore.id;
      await FirebaseService.db
        .collection("stores")
        .doc(storeId)
        .collection("sales")
        .doc(sale.id.toString())
        .set({
          ...sale,
          syncedAt: firebase.firestore.FieldValue.serverTimestamp(),
        });

      console.log("Sale synced to Firebase:", sale.id);
    } catch (error) {
      console.error("Error syncing sale:", error);
    }
  },

  // Sync products to Firebase (for stock updates)
  async syncProductsToFirebase() {
    try {
      if (!FirebaseService.currentStore) return;

      const storeId = FirebaseService.currentStore.id;
      const batch = FirebaseService.db.batch();

      this.state.products.forEach((product) => {
        const productRef = FirebaseService.db
          .collection("stores")
          .doc(storeId)
          .collection("products")
          .doc(product.id.toString());

        batch.update(productRef, {
          stock: product.stock,
          lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
        });
      });

      await batch.commit();
      console.log("Products stock synced to Firebase");
    } catch (error) {
      console.error("Error syncing products:", error);
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

  async addProduct(product) {
  try {
    product.id = Date.now();
    product.createdAt = new Date().toISOString();
    
    // Add to local state first
    this.state.products.push(product);
    
    // Save to localStorage immediately
    this.saveData(true); // Skip Firebase sync in saveData
    
    // Sync to Firebase immediately if online
    if (window.FirebaseService && FirebaseService.isAuthenticated() && FirebaseService.currentStore) {
      const storeId = FirebaseService.currentStore.id;
      await FirebaseService.db
        .collection("stores")
        .doc(storeId)
        .collection("products")
        .doc(product.id.toString())
        .set({
          ...product,
          lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
          storeId: storeId
        });
      console.log("✅ Product synced to Firebase:", product.name);
    } else {
      // Queue for later sync if offline
      if (window.SyncManager) {
        SyncManager.queueOperation('product', product);
      }
    }
    
    return product;
  } catch (error) {
    console.error("Error adding product:", error);
    
    // Remove from local state on error
    const index = this.state.products.findIndex(p => p.id === product.id);
    if (index !== -1) {
      this.state.products.splice(index, 1);
    }
    
    throw error;
  }
},

  async updateProduct(id, updates) {
  try {
    const index = this.state.products.findIndex((p) => p.id === id);
    if (index === -1) {
      return false;
    }
    
    // Update local state
    this.state.products[index] = {
      ...this.state.products[index],
      ...updates,
      lastUpdated: new Date().toISOString()
    };
    
    // Save to localStorage
    this.saveData(true); // Skip Firebase sync in saveData
    
    // Sync to Firebase immediately if online
    if (window.FirebaseService && FirebaseService.isAuthenticated() && FirebaseService.currentStore) {
      const storeId = FirebaseService.currentStore.id;
      await FirebaseService.db
        .collection("stores")
        .doc(storeId)
        .collection("products")
        .doc(id.toString())
        .set({
          ...this.state.products[index],
          lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
      console.log("✅ Product updated in Firebase:", this.state.products[index].name);
    } else {
      // Queue for later sync if offline
      if (window.SyncManager) {
        SyncManager.queueOperation('product', this.state.products[index]);
      }
    }
    
    return true;
  } catch (error) {
    console.error("Error updating product:", error);
    throw error;
  }
},

  deleteProduct(id) {
    this.state.products = this.state.products.filter((p) => p.id !== id);
    this.saveData();

    // Delete from Firebase
    if (
      window.FirebaseService &&
      FirebaseService.isAuthenticated() &&
      FirebaseService.currentStore
    ) {
      const storeId = FirebaseService.currentStore.id;
      FirebaseService.db
        .collection("stores")
        .doc(storeId)
        .collection("products")
        .doc(id.toString())
        .delete()
        .catch(console.error);
    }
  },

  // Categories
  getCategories() {
    return this.state.categories;
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
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

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
          this.loadDefaultDataWithoutProducts();
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

  loadDefaultCategories() {
    console.log("Loading default categories...");

    this.state.categories = [
      {
        id: 1,
        name: "ทั้งหมด",
        icon: "fa-border-all",
        color: "purple",
        protected: true,
      },
      { id: 2, name: "เครื่องดื่ม", icon: "fa-mug-hot", color: "blue" },
      { id: 3, name: "อาหาร", icon: "fa-utensils", color: "green" },
      { id: 4, name: "ของหวาน", icon: "fa-ice-cream", color: "pink" },
    ];

    // Sync to Firebase
    if (
      window.FirebaseService &&
      FirebaseService.isAuthenticated() &&
      FirebaseService.currentStore
    ) {
      const storeId = FirebaseService.currentStore.id;
      const batch = FirebaseService.db.batch();

      this.state.categories.forEach((category) => {
        const categoryRef = FirebaseService.db
          .collection("stores")
          .doc(storeId)
          .collection("categories")
          .doc(category.id.toString());
        batch.set(categoryRef, {
          ...category,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
      });

      batch.commit().catch(console.error);
    }
  },

  loadDefaultDataWithoutProducts() {
    console.log("Loading default data without sample products...");

    // Default categories only
    this.loadDefaultCategories();

    // Empty arrays - no sample products
    this.state.products = [];
    this.state.cart = [];
    this.state.sales = [];
    this.state.members = [];
    this.state.currentCategory = 1;
  },

  // Logout function
  logout() {
    Utils.confirm("ต้องการออกจากระบบ?", () => {
      // Cleanup real-time listeners
      if (this.unsubscribers) {
        this.unsubscribers.forEach((unsub) => unsub());
        this.unsubscribers = [];
      }

      // Clear intervals
      if (this.autoSaveInterval) {
        clearInterval(this.autoSaveInterval);
      }
      if (this.lockCheckInterval) {
        clearInterval(this.lockCheckInterval);
      }

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
            <div class="font-medium text-gray-800">${
              user.displayName || user.email || "ผู้ใช้"
            }</div>
            <div class="text-sm text-gray-600">${
              store ? store.name : "กำลังโหลดข้อมูลร้าน..."
            }</div>
            <div class="text-xs text-gray-400">
              ${user.email}
            </div>
          </div>
        </div>
        
        <div class="space-y-2">
          <button onclick="Auth.changePin(); Utils.closeModal(this.closest('.fixed'))" 
                  class="w-full text-left p-3 hover:bg-gray-100 rounded-lg transition">
            <i class="fas fa-key mr-3 text-gray-600"></i>เปลี่ยนรหัส PIN
          </button>
          ${
            store
              ? `
          <button onclick="App.switchStore(); Utils.closeModal(this.closest('.fixed'))" 
                  class="w-full text-left p-3 hover:bg-gray-100 rounded-lg transition">
            <i class="fas fa-store mr-3 text-gray-600"></i>เปลี่ยนร้าน
          </button>
          `
              : ""
          }
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

  // Remove default products from Firebase
  async forceRemoveDefaultProducts() {
    if (!FirebaseService.currentStore) {
      Utils.showToast("ไม่พบข้อมูลร้าน", "error");
      return;
    }

    Utils.showLoading("กำลังลบสินค้าตัวอย่าง...");

    try {
      const storeId = FirebaseService.currentStore.id;
      const storeRef = FirebaseService.db.collection("stores").doc(storeId);

      // Sample product names
      const defaultProducts = ["อเมริกาโน่เย็น", "อเมริกาโน่ร้อน", "คาปูชิโน่"];

      // Get all products
      const snapshot = await storeRef.collection("products").get();
      const batch = FirebaseService.db.batch();
      let deleteCount = 0;

      snapshot.forEach((doc) => {
        const product = doc.data();
        if (defaultProducts.includes(product.name)) {
          batch.delete(doc.ref);
          deleteCount++;
          console.log("Deleting:", product.name);
        }
      });

      if (deleteCount > 0) {
        await batch.commit();

        // Remove from local state
        this.state.products = this.state.products.filter(
          (p) => !defaultProducts.includes(p.name)
        );

        // Save and sync
        this.saveData();

        Utils.hideLoading();
        Utils.showToast(
          `ลบสินค้าตัวอย่าง ${deleteCount} รายการสำเร็จ`,
          "success"
        );

        // Reload page
        setTimeout(() => {
          location.reload();
        }, 1000);
      } else {
        Utils.hideLoading();
        Utils.showToast("ไม่พบสินค้าตัวอย่าง", "info");
      }
    } catch (error) {
      Utils.hideLoading();
      console.error("Error:", error);
      Utils.showToast("เกิดข้อผิดพลาด: " + error.message, "error");
    }
  },

  // Check sync status
  async checkSyncStatus() {
    console.log("=== Sync Status Check ===");
    console.log("Authenticated:", FirebaseService.isAuthenticated());
    console.log("Current Store:", FirebaseService.currentStore);
    console.log("Local Products:", this.state.products.length);
    console.log("Store Name:", this.state.settings.storeName);

    if (FirebaseService.currentStore) {
      const storeId = FirebaseService.currentStore.id;
      const snapshot = await FirebaseService.db
        .collection("stores")
        .doc(storeId)
        .collection("products")
        .get();

      console.log("Firebase Products:", snapshot.size);

      snapshot.forEach((doc) => {
        console.log("- ", doc.data().name);
      });
    }
  },

  // Force sync products
  async forceSyncProducts() {
    if (!FirebaseService.currentStore) {
      Utils.showToast("ไม่พบข้อมูลร้าน", "error");
      return;
    }

    Utils.showLoading("กำลัง sync ข้อมูล...");

    try {
      await this.syncWithFirebase();
      Utils.hideLoading();
      Utils.showToast("Sync ข้อมูลสำเร็จ", "success");
    } catch (error) {
      Utils.hideLoading();
      console.error("Sync error:", error);
      Utils.showToast("Sync ผิดพลาด: " + error.message, "error");
    }
  },
  // Debug sync issues
async debugSync() {
    console.log("=== DEBUG SYNC ===");
    console.log("1. Current Store:", this.state.currentStoreId);
    console.log("2. Firebase Store:", FirebaseService.currentStore);
    console.log("3. Local Products:", this.state.products);
    console.log("4. Local Sales:", this.state.sales);
    console.log("5. Local Members:", this.state.members);
    
    if (FirebaseService.currentStore) {
      const storeId = FirebaseService.currentStore.id;
      
      // Check Firebase data
      try {
        const storeRef = FirebaseService.db.collection("stores").doc(storeId);
        
        // Products
        const productsSnap = await storeRef.collection("products").get();
        console.log("6. Firebase Products:", productsSnap.size);
        productsSnap.forEach(doc => {
          console.log("   -", doc.id, doc.data().name);
        });
        
        // Sales
        const salesSnap = await storeRef.collection("sales").get();
        console.log("7. Firebase Sales:", salesSnap.size);
        
        // Members
        const membersSnap = await storeRef.collection("members").get();
        console.log("8. Firebase Members:", membersSnap.size);
        
      } catch (error) {
        console.error("Firebase read error:", error);
      }
    }
    
    // Try force sync
    console.log("9. Attempting force sync...");
    try {
      await this.syncWithFirebase();
      console.log("10. Sync completed!");
    } catch (error) {
      console.error("11. Sync failed:", error);
    }
},
};
