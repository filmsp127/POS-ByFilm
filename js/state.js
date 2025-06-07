// State Management Module
const State = {
  // State data
  data: {
    products: [],
    categories: [],
    cart: [],
    sales: [],
    members: [],
    currentCategory: "all",
    currentUser: null,
    settings: {},
  },

  // State listeners
  listeners: new Map(),

  // Initialize state
  init() {
    this.loadFromStorage();
    this.setupAutoSave();
  },

  // Get state value
  get(path, defaultValue = null) {
    const keys = path.split(".");
    let value = this.data;

    for (const key of keys) {
      if (value && typeof value === "object" && key in value) {
        value = value[key];
      } else {
        return defaultValue;
      }
    }

    return value;
  },

  // Set state value
  set(path, value) {
    const keys = path.split(".");
    const lastKey = keys.pop();
    let target = this.data;

    // Navigate to the parent object
    for (const key of keys) {
      if (!(key in target) || typeof target[key] !== "object") {
        target[key] = {};
      }
      target = target[key];
    }

    // Store old value
    const oldValue = target[lastKey];

    // Set new value
    target[lastKey] = value;

    // Notify listeners
    this.notify(path, value, oldValue);

    // Auto save
    this.save();

    return value;
  },

  // Update state (merge)
  update(path, updates) {
    const current = this.get(path, {});
    const merged = { ...current, ...updates };
    return this.set(path, merged);
  },

  // Push to array
  push(path, item) {
    const array = this.get(path, []);
    array.push(item);
    return this.set(path, array);
  },

  // Remove from array
  remove(path, predicate) {
    const array = this.get(path, []);
    const filtered = array.filter((item, index) => {
      if (typeof predicate === "function") {
        return !predicate(item, index);
      } else {
        return item !== predicate;
      }
    });
    return this.set(path, filtered);
  },

  // Find in array
  find(path, predicate) {
    const array = this.get(path, []);
    return array.find(predicate);
  },

  // Filter array
  filter(path, predicate) {
    const array = this.get(path, []);
    return array.filter(predicate);
  },

  // Subscribe to state changes
  subscribe(path, callback) {
    if (!this.listeners.has(path)) {
      this.listeners.set(path, new Set());
    }
    this.listeners.get(path).add(callback);

    // Return unsubscribe function
    return () => {
      const pathListeners = this.listeners.get(path);
      if (pathListeners) {
        pathListeners.delete(callback);
        if (pathListeners.size === 0) {
          this.listeners.delete(path);
        }
      }
    };
  },

  // Notify listeners
  notify(path, newValue, oldValue) {
    // Notify exact path listeners
    const exactListeners = this.listeners.get(path);
    if (exactListeners) {
      exactListeners.forEach((callback) => {
        try {
          callback(newValue, oldValue, path);
        } catch (error) {
          console.error("State listener error:", error);
        }
      });
    }

    // Notify parent path listeners
    const pathParts = path.split(".");
    for (let i = pathParts.length - 1; i > 0; i--) {
      const parentPath = pathParts.slice(0, i).join(".");
      const parentListeners = this.listeners.get(parentPath);
      if (parentListeners) {
        const parentValue = this.get(parentPath);
        parentListeners.forEach((callback) => {
          try {
            callback(parentValue, parentValue, parentPath);
          } catch (error) {
            console.error("State listener error:", error);
          }
        });
      }
    }

    // Notify root listeners
    const rootListeners = this.listeners.get("*");
    if (rootListeners) {
      rootListeners.forEach((callback) => {
        try {
          callback(this.data, this.data, "*");
        } catch (error) {
          console.error("State listener error:", error);
        }
      });
    }
  },

  // Batch updates
  batch(updates) {
    const results = [];

    // Disable auto-save temporarily
    const autoSave = this.autoSaveEnabled;
    this.autoSaveEnabled = false;

    // Apply all updates
    for (const [path, value] of Object.entries(updates)) {
      results.push(this.set(path, value));
    }

    // Re-enable auto-save and save once
    this.autoSaveEnabled = autoSave;
    this.save();

    return results;
  },

  // Transaction
  transaction(callback) {
    // Create snapshot
    const snapshot = JSON.parse(JSON.stringify(this.data));

    try {
      // Disable auto-save
      const autoSave = this.autoSaveEnabled;
      this.autoSaveEnabled = false;

      // Execute transaction
      const result = callback(this);

      // Re-enable auto-save and save
      this.autoSaveEnabled = autoSave;
      this.save();

      return result;
    } catch (error) {
      // Rollback on error
      this.data = snapshot;
      throw error;
    }
  },

  // Save to storage
  save() {
    if (!this.autoSaveEnabled) return;

    try {
      const key = Config.storage.prefix + Config.storage.keys.data;
      localStorage.setItem(key, JSON.stringify(this.data));
    } catch (error) {
      console.error("Failed to save state:", error);
    }
  },

  // Load from storage
  loadFromStorage() {
    try {
      const key = Config.storage.prefix + Config.storage.keys.data;
      const saved = localStorage.getItem(key);

      if (saved) {
        const data = JSON.parse(saved);
        this.data = { ...this.data, ...data };
      }
    } catch (error) {
      console.error("Failed to load state:", error);
    }
  },

  // Setup auto-save
  setupAutoSave() {
    this.autoSaveEnabled = true;

    // Save on page unload
    window.addEventListener("beforeunload", () => {
      this.save();
    });
  },

  // Clear state
  clear(path = null) {
    if (path) {
      this.set(path, null);
    } else {
      // Clear all data except structure
      this.data = {
        products: [],
        categories: [],
        cart: [],
        sales: [],
        members: [],
        currentCategory: "all",
        currentUser: null,
        settings: {},
      };
      this.save();
    }
  },

  // Reset state
  reset() {
    this.clear();
    this.listeners.clear();
  },

  // Export state
  export() {
    return JSON.stringify(this.data, null, 2);
  },

  // Import state
  import(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      this.data = data;
      this.save();
      this.notify("*", this.data, null);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  },

  // Debug helpers
  debug: {
    // Get all listeners
    getListeners() {
      const result = {};
      State.listeners.forEach((callbacks, path) => {
        result[path] = callbacks.size;
      });
      return result;
    },

    // Log state tree
    logTree() {
      console.group("State Tree");
      console.log(JSON.parse(JSON.stringify(State.data)));
      console.groupEnd();
    },

    // Watch path
    watch(path) {
      return State.subscribe(path, (newValue, oldValue) => {
        console.log(`State[${path}] changed:`, {
          old: oldValue,
          new: newValue,
        });
      });
    },
  },
};
