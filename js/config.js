// Configuration Module
const Config = {
  // App Settings
  app: {
    name: "Modern POS",
    version: "1.0.0",
    debug: false,
  },

  // Default Settings
  defaults: {
    currency: "฿",
    currencyPosition: "before", // before or after
    decimalPlaces: 2,
    thousandsSeparator: ",",
    decimalSeparator: ".",
    dateFormat: "DD/MM/YYYY",
    timeFormat: "HH:mm",
    timezone: "Asia/Bangkok",
  },

  // Business Rules
  business: {
    minStockWarning: 10,
    maxDiscountPercent: 50,
    defaultTaxRate: 7,
    defaultMemberDiscount: 5,
    pointsPerBaht: 1, // 1 point per 100 baht
    pointsValue: 100, // 100 baht per point earn
  },

  // UI Settings
  ui: {
    animationDuration: 300,
    toastDuration: 3000,
    debounceDelay: 300,
    itemsPerPage: 20,
    maxRecentItems: 10,
  },

  // Colors
  colors: {
    primary: "#3b82f6",
    secondary: "#8b5cf6",
    success: "#10b981",
    danger: "#ef4444",
    warning: "#f59e0b",
    info: "#3b82f6",
    dark: "#1f2937",
    light: "#f3f4f6",
  },

  // API Endpoints (if needed in future)
  api: {
    baseUrl: "",
    timeout: 30000,
  },

  // Storage Keys
  storage: {
    prefix: "pos_",
    keys: {
      data: "pos_data",
      settings: "pos_settings",
      currentCart: "pos_current_cart",
      user: "pos_user",
      theme: "pos_theme",
    },
  },

  // Features Toggle
  features: {
    barcode: true,
    qrcode: true,
    members: true,
    inventory: true,
    reports: true,
    multiLanguage: false,
    offlineMode: true,
    cloudSync: false,
  },

  // Printer Settings
  printer: {
    paperWidth: 80, // mm
    fontSize: 12,
    marginTop: 10,
    marginBottom: 10,
    marginLeft: 5,
    marginRight: 5,
  },

  // Get config value
  get(path, defaultValue = null) {
    const keys = path.split(".");
    let value = this;

    for (const key of keys) {
      if (value && typeof value === "object" && key in value) {
        value = value[key];
      } else {
        return defaultValue;
      }
    }

    return value;
  },

  // Set config value
  set(path, value) {
    const keys = path.split(".");
    const lastKey = keys.pop();
    let target = this;

    for (const key of keys) {
      if (!(key in target) || typeof target[key] !== "object") {
        target[key] = {};
      }
      target = target[key];
    }

    target[lastKey] = value;
  },

  // Merge config
  merge(newConfig) {
    const merge = (target, source) => {
      for (const key in source) {
        if (
          source[key] &&
          typeof source[key] === "object" &&
          !Array.isArray(source[key])
        ) {
          target[key] = target[key] || {};
          merge(target[key], source[key]);
        } else {
          target[key] = source[key];
        }
      }
    };

    merge(this, newConfig);
  },

  // Reset to defaults
  reset() {
    // Store original defaults
    const defaults = JSON.parse(JSON.stringify(this));

    // Clear current config
    for (const key in this) {
      if (typeof this[key] !== "function") {
        delete this[key];
      }
    }

    // Restore defaults
    this.merge(defaults);
  },

  // Validate config
  validate() {
    const errors = [];

    // Validate business rules
    if (this.business.minStockWarning < 0) {
      errors.push("Minimum stock warning must be positive");
    }

    if (
      this.business.maxDiscountPercent < 0 ||
      this.business.maxDiscountPercent > 100
    ) {
      errors.push("Maximum discount must be between 0 and 100");
    }

    if (
      this.business.defaultTaxRate < 0 ||
      this.business.defaultTaxRate > 100
    ) {
      errors.push("Tax rate must be between 0 and 100");
    }

    return {
      valid: errors.length === 0,
      errors: errors,
    };
  },

  // Export config
  export() {
    const config = {};
    for (const key in this) {
      if (typeof this[key] !== "function") {
        config[key] = this[key];
      }
    }
    return JSON.stringify(config, null, 2);
  },

  // Import config
  import(jsonString) {
    try {
      const config = JSON.parse(jsonString);
      this.merge(config);
      const validation = this.validate();
      if (!validation.valid) {
        throw new Error(validation.errors.join(", "));
      }
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  },
};
