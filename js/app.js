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
    settings: {
      storeName: "Modern POS",
      storeAddress: "",
      storePhone: "",
      tax: 7,
      currency: "฿",
      memberDiscount: 5,
      printer: { enabled: false, ip: "" },
      cashDrawer: { enabled: false, port: "" },
      scanner: { enabled: false },
    },
  },

  // Initialize application
  init() {
    console.log("🚀 Initializing POS System...");

    // Load saved data
    this.loadData();

    // Initialize modules
    POS.init();
    Cart.init();
    Payment.init();
    BackOffice.init();

    // Hide loading screen
    setTimeout(() => {
      document.getElementById("loadingScreen").style.display = "none";
    }, 1000);

    // Setup service worker for offline support
    this.setupServiceWorker();
  },

  // Data Management
  loadData() {
    try {
      // Try to load from localStorage first
      const savedData = localStorage.getItem("posData");
      if (savedData) {
        const data = JSON.parse(savedData);
        this.state = { ...this.state, ...data };
        console.log("✅ Data loaded from storage");
      } else {
        // Load default data
        this.loadDefaultData();
        console.log("📦 Default data loaded");
      }
    } catch (error) {
      console.error("❌ Error loading data:", error);
      this.loadDefaultData();
    }
  },

  loadDefaultData() {
    // Default categories
    this.state.categories = [
      { id: 1, name: "ทั้งหมด", icon: "fa-th", color: "purple" },
      { id: 2, name: "เครื่องดื่ม", icon: "fa-coffee", color: "blue" },
      { id: 3, name: "อาหาร", icon: "fa-utensils", color: "green" },
      { id: 4, name: "ของหวาน", icon: "fa-ice-cream", color: "pink" },
    ];

    // Default products
    this.state.products = [
      {
        id: 1,
        name: "อเมริกาโน่ร้อน",
        price: 50,
        category: 2,
        image: "☕",
        stock: 100,
        cost: 20,
      },
      {
        id: 2,
        name: "อเมริกาโน่เย็น",
        price: 55,
        category: 2,
        image: "🧊",
        stock: 100,
        cost: 22,
      },
      {
        id: 3,
        name: "คาปูชิโน่",
        price: 60,
        category: 2,
        image: "☕",
        stock: 100,
        cost: 25,
      },
      {
        id: 4,
        name: "ลาเต้",
        price: 65,
        category: 2,
        image: "☕",
        stock: 100,
        cost: 28,
      },
      {
        id: 5,
        name: "ชาเขียว",
        price: 45,
        category: 2,
        image: "🍵",
        stock: 100,
        cost: 15,
      },
      {
        id: 6,
        name: "ข้าวผัดหมู",
        price: 60,
        category: 3,
        image: "🍚",
        stock: 50,
        cost: 30,
      },
      {
        id: 7,
        name: "ผัดไทย",
        price: 70,
        category: 3,
        image: "🍜",
        stock: 50,
        cost: 35,
      },
      {
        id: 8,
        name: "ข้าวมันไก่",
        price: 50,
        category: 3,
        image: "🍗",
        stock: 50,
        cost: 25,
      },
      {
        id: 9,
        name: "เค้กช็อคโกแลต",
        price: 85,
        category: 4,
        image: "🍰",
        stock: 20,
        cost: 40,
      },
      {
        id: 10,
        name: "ไอศกรีม",
        price: 35,
        category: 4,
        image: "🍦",
        stock: 30,
        cost: 15,
      },
    ];

    this.saveData();
  },

  saveData() {
    try {
      localStorage.setItem("posData", JSON.stringify(this.state));
      console.log("💾 Data saved");
    } catch (error) {
      console.error("❌ Error saving data:", error);
    }
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
    sale.id = Date.now();
    sale.timestamp = Date.now();
    sale.date = new Date().toISOString();
    this.state.sales.push(sale);

    // Update stock
    sale.items.forEach((item) => {
      const product = this.getProductById(item.id);
      if (product) {
        product.stock -= item.quantity;
      }
    });

    this.saveData();
    return sale;
  },

  getSales() {
    return this.state.sales;
  },

  getSaleById(id) {
    return this.state.sales.find((s) => s.id === id);
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
    const dataStr = JSON.stringify(this.state, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `pos-backup-${new Date().toISOString().split("T")[0]}.json`;
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

  // Clear all data
  clearAllData() {
    if (confirm("ต้องการล้างข้อมูลทั้งหมด? การกระทำนี้ไม่สามารถย้อนกลับได้")) {
      if (confirm("ยืนยันอีกครั้ง?")) {
        localStorage.clear();
        location.reload();
      }
    }
  },
};
