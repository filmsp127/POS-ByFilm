// Firebase Configuration and Multi-Store Services
const FirebaseService = {
  app: null,
  db: null,
  auth: null,
  currentUser: null,
  currentStore: null,

  // Initialize Firebase
  async init() {
    try {
      // Firebase config
      const firebaseConfig = {
        apiKey: "AIzaSyC1Rli_m_pIT5z5e8jWoZwG8yGBAv1cRAI",
        authDomain: "pos-by-film.firebaseapp.com",
        projectId: "pos-by-film",
        storageBucket: "pos-by-film.firebasestorage.app",
        messagingSenderId: "1073770642247",
        appId: "1:1073770642247:web:3b36e56dbe7b02c3336a62",
        measurementId: "G-3WM0134WES",
      };

      // Initialize Firebase
      if (!firebase.apps.length) {
        this.app = firebase.initializeApp(firebaseConfig);
      } else {
        this.app = firebase.app();
      }

      this.db = firebase.firestore();
      this.auth = firebase.auth();

      // Enable offline persistence
      try {
        await this.db.enablePersistence();
        console.log("✅ Firestore offline persistence enabled");
      } catch (err) {
        if (err.code !== "failed-precondition") {
          console.log("⚠️ Firestore persistence error:", err);
        }
      }

      // Auth state listener
      this.auth.onAuthStateChanged((user) => {
        this.handleAuthStateChange(user);
      });

      console.log("✅ Firebase initialized successfully");
      return true;
    } catch (error) {
      console.error("❌ Firebase initialization error:", error);
      return false;
    }
  },

  // Handle authentication state changes
  async handleAuthStateChange(user) {
    if (user) {
      this.currentUser = user;
      console.log("👤 User signed in:", user.email);

      // Check if user has stores
      const stores = await this.getUserStores(user.uid);

      if (stores.length === 0) {
        // No stores - for new users after signup
        console.log("No stores found for user");
      } else if (stores.length === 1) {
        // Auto-select single store
        await this.selectStore(stores[0].storeId);
      } else {
        // Multiple stores - need to select
        const lastStoreId = localStorage.getItem("currentStoreId");
        if (lastStoreId && stores.find((s) => s.storeId === lastStoreId)) {
          await this.selectStore(lastStoreId);
        }
      }
    } else {
      this.currentUser = null;
      this.currentStore = null;
      console.log("👤 User signed out");
    }
  },

  // Sign up new user
  async signUp(email, password, userData) {
    try {
      const userCredential = await this.auth.createUserWithEmailAndPassword(
        email,
        password
      );
      const user = userCredential.user;

      // Save user profile with PIN
      await this.db.collection("users").doc(user.uid).set({
        email: email,
        name: userData.name,
        pin: userData.pin, // Store hashed PIN
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
      });

      return { success: true, user: user };
    } catch (error) {
      console.error("Sign up error:", error);

      // Translate error messages
      let errorMessage = error.message;
      if (error.code === "auth/email-already-in-use") {
        errorMessage = "อีเมลนี้ถูกใช้งานแล้ว";
      } else if (error.code === "auth/invalid-email") {
        errorMessage = "รูปแบบอีเมลไม่ถูกต้อง";
      } else if (error.code === "auth/weak-password") {
        errorMessage = "รหัสผ่านไม่ปลอดภัย";
      }

      return { success: false, error: errorMessage };
    }
  },

  // Sign in user
  async signIn(email, password) {
    try {
      const userCredential = await this.auth.signInWithEmailAndPassword(
        email,
        password
      );

      // Update last login
      await this.db.collection("users").doc(userCredential.user.uid).update({
        lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
      });

      return { success: true, user: userCredential.user };
    } catch (error) {
      console.error("Sign in error:", error);

      // Translate error messages
      let errorMessage = error.message;
      if (error.code === "auth/user-not-found") {
        errorMessage = "ไม่พบผู้ใช้นี้";
      } else if (error.code === "auth/wrong-password") {
        errorMessage = "รหัสผ่านไม่ถูกต้อง";
      } else if (error.code === "auth/invalid-email") {
        errorMessage = "รูปแบบอีเมลไม่ถูกต้อง";
      }

      return { success: false, error: errorMessage };
    }
  },

  // Sign out user
  async signOut() {
    try {
      await this.auth.signOut();
      this.currentUser = null;
      this.currentStore = null;
      localStorage.removeItem("currentStoreId");
      return { success: true };
    } catch (error) {
      console.error("Sign out error:", error);
      return { success: false, error: error.message };
    }
  },

  // Verify PIN
  async verifyPin(userId, hashedPin) {
    try {
      const userDoc = await this.db.collection("users").doc(userId).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        return userData.pin === hashedPin;
      }
      return false;
    } catch (error) {
      console.error("Verify PIN error:", error);
      return false;
    }
  },

  // Update PIN
  async updatePin(userId, newHashedPin) {
    try {
      await this.db.collection("users").doc(userId).update({
        pin: newHashedPin,
      });
      return { success: true };
    } catch (error) {
      console.error("Update PIN error:", error);
      return { success: false, error: error.message };
    }
  },

  // Create new store - แก้ไขให้ง่ายขึ้น
  async createStore(storeData) {
    try {
      if (!this.currentUser) {
        throw new Error("User not authenticated");
      }

      // สร้าง store document
      const storeRef = await this.db.collection("stores").add({
        name: storeData.name,
        ownerId: storeData.ownerId || this.currentUser.uid,
        ownerEmail: storeData.ownerEmail || this.currentUser.email,
        ownerName: storeData.ownerName || "",
        address: storeData.address || "",
        phone: storeData.phone || "",
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        settings: {
          currency: "฿",
          tax: 7,
          memberDiscount: 5,
          pointRate: 100,
        },
        status: "active",
      });

      // Add user access to store
      await this.db
        .collection("users")
        .doc(this.currentUser.uid)
        .collection("stores")
        .doc(storeRef.id)
        .set({
          storeId: storeRef.id,
          storeName: storeData.name,
          role: "owner",
          joinedAt: firebase.firestore.FieldValue.serverTimestamp(),
        });

      // Initialize store data
      await this.initializeStoreData(storeRef.id);

      return { success: true, storeId: storeRef.id };
    } catch (error) {
      console.error("Create store error:", error);
      return { success: false, error: error.message };
    }
  },

  // Initialize default store data - ไม่มีสินค้าตัวอย่าง
  async initializeStoreData(storeId) {
    const batch = this.db.batch();

    // Default categories only
    const categories = [
      {
        id: 1,
        name: "ทั้งหมด",
        icon: "fa-th",
        color: "purple",
        protected: true,
      },
      { id: 2, name: "เครื่องดื่ม", icon: "fa-coffee", color: "blue" },
      { id: 3, name: "อาหาร", icon: "fa-utensils", color: "green" },
      { id: 4, name: "ของหวาน", icon: "fa-ice-cream", color: "pink" },
    ];

    categories.forEach((category) => {
      const categoryRef = this.db
        .collection("stores")
        .doc(storeId)
        .collection("categories")
        .doc(category.id.toString());
      batch.set(categoryRef, {
        ...category,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
    });

    // ไม่มีสินค้าตัวอย่าง - ลบออกทั้งหมด

    await batch.commit();
    console.log("Store initialized WITHOUT default products");
  },

  // Get user's stores
  async getUserStores(userId) {
    try {
      const snapshot = await this.db
        .collection("users")
        .doc(userId)
        .collection("stores")
        .get();

      const stores = [];
      snapshot.forEach((doc) => {
        stores.push({ id: doc.id, ...doc.data() });
      });

      return stores;
    } catch (error) {
      console.error("Get user stores error:", error);
      return [];
    }
  },

  // Select current store
  async selectStore(storeId) {
    try {
      const storeDoc = await this.db.collection("stores").doc(storeId).get();

      if (!storeDoc.exists) {
        throw new Error("Store not found");
      }

      this.currentStore = { id: storeId, ...storeDoc.data() };

      // Save to localStorage for quick access
      localStorage.setItem("currentStoreId", storeId);

      console.log("🏪 Store selected:", this.currentStore.name);
      return { success: true, store: this.currentStore };
    } catch (error) {
      console.error("Select store error:", error);
      return { success: false, error: error.message };
    }
  },

  // Get current store
  getCurrentStore() {
    return this.currentStore;
  },

  // Get current user
  getCurrentUser() {
    return this.currentUser;
  },

  // Check if user is authenticated
  isAuthenticated() {
    return this.currentUser !== null;
  },

  async getStoreData(storeId) {
    try {
      const storeRef = this.db.collection("stores").doc(storeId);

      // Setup real-time listener
      storeRef.onSnapshot((doc) => {
        if (doc.exists) {
          const storeData = { id: doc.id, ...doc.data() };
          this.currentStore = storeData;

          // Update App state
          if (window.App && App.state) {
            App.state.currentStoreId = storeId;
            App.updateSettings({
              storeName: storeData.name,
              storeAddress: storeData.address || "",
              storePhone: storeData.phone || "",
            });
          }
        }
      });

      return { success: true };
    } catch (error) {
      console.error("Get store data error:", error);
      return { success: false, error: error.message };
    }
  },
};

// Export
window.FirebaseService = FirebaseService;
