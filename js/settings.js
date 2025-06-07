// Settings Management Module
const Settings = {
  // Default settings
  defaults: {
    store: {
      name: "Modern POS",
      address: "",
      phone: "",
      email: "",
      taxId: "",
      logo: "",
      promptpay: "",
    },
    system: {
      language: "th",
      timezone: "Asia/Bangkok",
      dateFormat: "DD/MM/YYYY",
      timeFormat: "HH:mm",
      currency: "฿",
      currencyPosition: "before",
      decimalPlaces: 2,
      thousandsSeparator: ",",
      decimalSeparator: ".",
    },
    business: {
      tax: 7,
      memberDiscount: 5,
      pointRate: 100, // 100 baht = 1 point
      minStockWarning: 10,
      roundingMethod: "normal", // normal, up, down
      allowNegativeStock: false,
      requireCustomerPhone: false,
    },
    receipt: {
      paperSize: "80mm",
      showLogo: true,
      showAddress: true,
      showPhone: true,
      showTaxId: false,
      showThankYou: true,
      thankYouMessage: "ขอบคุณที่ใช้บริการ",
      footerMessage: "",
      printCopy: 1,
      autoPrint: false,
    },
    printer: {
      enabled: false,
      type: "thermal", // thermal, inkjet, laser
      ip: "",
      port: "9100",
      encoding: "UTF-8",
    },
    cashDrawer: {
      enabled: false,
      openOnSale: true,
      port: "COM1",
    },
    scanner: {
      enabled: false,
      type: "usb", // usb, bluetooth, camera
      beepOnScan: true,
    },
    backup: {
      autoBackup: true,
      backupInterval: "daily", // daily, weekly, monthly
      backupTime: "02:00",
      keepBackups: 30,
    },
    security: {
      requirePin: false,
      pin: "",
      lockAfter: 5, // minutes
      allowVoid: true,
      allowDiscount: true,
      maxDiscount: 50, // percent
    },
  },

  // Get all settings
  getAll() {
    const saved = App.getSettings();
    return this.mergeWithDefaults(saved);
  },

  // Get specific setting
  get(path, defaultValue = null) {
    const settings = this.getAll();
    const keys = path.split(".");
    let value = settings;

    for (const key of keys) {
      if (value && typeof value === "object" && key in value) {
        value = value[key];
      } else {
        return defaultValue;
      }
    }

    return value;
  },

  // Set setting value
  set(path, value) {
    const settings = this.getAll();
    const keys = path.split(".");
    const lastKey = keys.pop();
    let target = settings;

    for (const key of keys) {
      if (!(key in target) || typeof target[key] !== "object") {
        target[key] = {};
      }
      target = target[key];
    }

    target[lastKey] = value;
    App.updateSettings(settings);

    return value;
  },

  // Update multiple settings
  update(updates) {
    const settings = this.getAll();
    const merged = this.deepMerge(settings, updates);
    App.updateSettings(merged);

    return merged;
  },

  // Reset to defaults
  reset(category = null) {
    if (category && this.defaults[category]) {
      const settings = this.getAll();
      settings[category] = JSON.parse(JSON.stringify(this.defaults[category]));
      App.updateSettings(settings);
    } else {
      App.updateSettings(JSON.parse(JSON.stringify(this.defaults)));
    }

    Utils.showToast("รีเซ็ตการตั้งค่าเรียบร้อย", "success");
  },

  // Merge with defaults
  mergeWithDefaults(saved) {
    return this.deepMerge(JSON.parse(JSON.stringify(this.defaults)), saved);
  },

  // Deep merge helper
  deepMerge(target, source) {
    for (const key in source) {
      if (
        source[key] &&
        typeof source[key] === "object" &&
        !Array.isArray(source[key])
      ) {
        target[key] = target[key] || {};
        this.deepMerge(target[key], source[key]);
      } else {
        target[key] = source[key];
      }
    }
    return target;
  },

  // Validate settings
  validate(settings) {
    const errors = [];

    // Store validation
    if (!settings.store.name || settings.store.name.trim() === "") {
      errors.push("กรุณาระบุชื่อร้าน");
    }

    // Business validation
    if (settings.business.tax < 0 || settings.business.tax > 100) {
      errors.push("อัตราภาษีต้องอยู่ระหว่าง 0-100%");
    }

    if (
      settings.business.memberDiscount < 0 ||
      settings.business.memberDiscount > 100
    ) {
      errors.push("ส่วนลดสมาชิกต้องอยู่ระหว่าง 0-100%");
    }

    if (settings.business.pointRate < 1) {
      errors.push("อัตราแต้มสะสมต้องมากกว่า 0");
    }

    // Security validation
    if (
      settings.security.requirePin &&
      (!settings.security.pin || settings.security.pin.length < 4)
    ) {
      errors.push("PIN ต้องมีอย่างน้อย 4 หลัก");
    }

    if (
      settings.security.maxDiscount < 0 ||
      settings.security.maxDiscount > 100
    ) {
      errors.push("ส่วนลดสูงสุดต้องอยู่ระหว่าง 0-100%");
    }

    return {
      valid: errors.length === 0,
      errors: errors,
    };
  },

  // Export settings
  export() {
    const settings = this.getAll();
    const data = JSON.stringify(settings, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `pos-settings-${
      new Date().toISOString().split("T")[0]
    }.json`;
    link.click();

    URL.revokeObjectURL(url);
    Utils.showToast("ส่งออกการตั้งค่าสำเร็จ", "success");
  },

  // Import settings
  import(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const imported = JSON.parse(e.target.result);

          // Validate
          const validation = this.validate(imported);
          if (!validation.valid) {
            throw new Error(validation.errors.join(", "));
          }

          // Update settings
          this.update(imported);

          Utils.showToast("นำเข้าการตั้งค่าสำเร็จ", "success");
          resolve();
        } catch (error) {
          Utils.showToast(`เกิดข้อผิดพลาด: ${error.message}`, "error");
          reject(error);
        }
      };

      reader.readAsText(file);
    });
  },

  // Test printer
  testPrinter() {
    const settings = this.get("printer");

    if (!settings.enabled) {
      Utils.showToast("กรุณาเปิดใช้งานเครื่องพิมพ์ก่อน", "error");
      return;
    }

    Utils.showLoading("กำลังทดสอบเครื่องพิมพ์...");

    // Simulate printer test
    setTimeout(() => {
      Utils.hideLoading();

      const testReceipt = `
          <div style="font-family: monospace; width: 300px; margin: 0 auto;">
            <h3 style="text-align: center;">ทดสอบเครื่องพิมพ์</h3>
            <hr style="border-style: dashed;">
            <p>วันที่: ${Utils.formatDate(new Date(), "long")}</p>
            <p>เครื่องพิมพ์: ${settings.ip || "Local"}</p>
            <p>สถานะ: ทำงานปกติ</p>
            <hr style="border-style: dashed;">
            <p style="text-align: center;">*** ทดสอบสำเร็จ ***</p>
          </div>
        `;

      Utils.print(testReceipt, "ทดสอบเครื่องพิมพ์");
      Utils.showToast("ทดสอบเครื่องพิมพ์สำเร็จ", "success");
    }, 2000);
  },

  // Test cash drawer
  testCashDrawer() {
    const settings = this.get("cashDrawer");

    if (!settings.enabled) {
      Utils.showToast("กรุณาเปิดใช้งานลิ้นชักเก็บเงินก่อน", "error");
      return;
    }

    Utils.showToast("คำสั่งเปิดลิ้นชักถูกส่งแล้ว", "info");

    // In real app, send command to cash drawer
    console.log("Opening cash drawer on port:", settings.port);
  },

  // Configure receipt template
  configureReceipt() {
    const current = this.get("receipt");

    const content = `
        <div class="p-6">
          <h3 class="text-xl font-bold text-gray-800 mb-4">ตั้งค่าใบเสร็จ</h3>
          
          <form onsubmit="Settings.saveReceiptSettings(event)">
            <div class="space-y-4">
              <div class="grid grid-cols-2 gap-4">
                <label class="flex items-center gap-2">
                  <input type="checkbox" id="receiptShowLogo" 
                         ${current.showLogo ? "checked" : ""}
                         class="rounded text-blue-600">
                  <span class="text-gray-700">แสดงโลโก้</span>
                </label>
                
                <label class="flex items-center gap-2">
                  <input type="checkbox" id="receiptShowAddress"
                         ${current.showAddress ? "checked" : ""}
                         class="rounded text-blue-600">
                  <span class="text-gray-700">แสดงที่อยู่</span>
                </label>
                
                <label class="flex items-center gap-2">
                  <input type="checkbox" id="receiptShowPhone"
                         ${current.showPhone ? "checked" : ""}
                         class="rounded text-blue-600">
                  <span class="text-gray-700">แสดงเบอร์โทร</span>
                </label>
                
                <label class="flex items-center gap-2">
                  <input type="checkbox" id="receiptShowTaxId"
                         ${current.showTaxId ? "checked" : ""}
                         class="rounded text-blue-600">
                  <span class="text-gray-700">แสดงเลขประจำตัวผู้เสียภาษี</span>
                </label>
              </div>
              
              <div>
                <label class="text-gray-700 text-sm font-medium">ข้อความขอบคุณ</label>
                <input type="text" id="receiptThankYou"
                       value="${current.thankYouMessage}"
                       class="w-full mt-1 p-2 rounded-lg border border-gray-300 text-gray-800">
              </div>
              
              <div>
                <label class="text-gray-700 text-sm font-medium">ข้อความท้ายใบเสร็จ</label>
                <textarea id="receiptFooter" rows="3"
                          class="w-full mt-1 p-2 rounded-lg border border-gray-300 text-gray-800">${
                            current.footerMessage
                          }</textarea>
              </div>
              
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="text-gray-700 text-sm font-medium">จำนวนสำเนา</label>
                  <input type="number" id="receiptCopies" min="1" max="3"
                         value="${current.printCopy}"
                         class="w-full mt-1 p-2 rounded-lg border border-gray-300 text-gray-800">
                </div>
                
                <div>
                  <label class="flex items-center gap-2 mt-6">
                    <input type="checkbox" id="receiptAutoPrint"
                           ${current.autoPrint ? "checked" : ""}
                           class="rounded text-blue-600">
                    <span class="text-gray-700">พิมพ์อัตโนมัติ</span>
                  </label>
                </div>
              </div>
            </div>
            
            <div class="flex gap-3 mt-6">
              <button type="button" onclick="Settings.previewReceipt()"
                      class="flex-1 bg-gray-200 hover:bg-gray-300 py-2 rounded-lg text-gray-800">
                <i class="fas fa-eye mr-2"></i>ดูตัวอย่าง
              </button>
              <button type="submit"
                      class="flex-1 btn-primary py-2 rounded-lg text-white">
                <i class="fas fa-save mr-2"></i>บันทึก
              </button>
            </div>
          </form>
        </div>
      `;

    Utils.createModal(content, { size: "w-full max-w-2xl" });
  },

  // Save receipt settings
  saveReceiptSettings(event) {
    event.preventDefault();

    const updates = {
      showLogo: document.getElementById("receiptShowLogo").checked,
      showAddress: document.getElementById("receiptShowAddress").checked,
      showPhone: document.getElementById("receiptShowPhone").checked,
      showTaxId: document.getElementById("receiptShowTaxId").checked,
      thankYouMessage: document.getElementById("receiptThankYou").value,
      footerMessage: document.getElementById("receiptFooter").value,
      printCopy: parseInt(document.getElementById("receiptCopies").value),
      autoPrint: document.getElementById("receiptAutoPrint").checked,
    };

    this.set("receipt", { ...this.get("receipt"), ...updates });

    Utils.closeModal(event.target.closest(".fixed"));
    Utils.showToast("บันทึกการตั้งค่าใบเสร็จแล้ว", "success");
  },

  // Preview receipt
  previewReceipt() {
    const settings = this.getAll();
    const sampleSale = {
      id: 999999,
      date: new Date().toISOString(),
      items: [
        { name: "สินค้าตัวอย่าง 1", price: 100, quantity: 2 },
        { name: "สินค้าตัวอย่าง 2", price: 50, quantity: 1 },
      ],
      subtotal: 250,
      discount: 25,
      total: 225,
      paymentMethod: "cash",
      received: 300,
      change: 75,
    };

    Payment.showReceipt(sampleSale);
  },

  // Initialize settings
  init() {
    // Check if settings need migration
    this.migrate();

    // Setup auto-backup if enabled
    const backup = this.get("backup");
    if (backup.autoBackup) {
      this.setupAutoBackup();
    }
  },

  // Migrate old settings
  migrate() {
    const version = this.get("version", 0);
    const currentVersion = 1;

    if (version < currentVersion) {
      console.log(
        "Migrating settings from version",
        version,
        "to",
        currentVersion
      );

      // Perform migrations here

      this.set("version", currentVersion);
    }
  },

  // Setup auto backup
  setupAutoBackup() {
    const backup = this.get("backup");

    // Schedule daily backup
    if (backup.backupInterval === "daily") {
      const now = new Date();
      const [hours, minutes] = backup.backupTime.split(":");
      const backupTime = new Date(now);
      backupTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      if (backupTime < now) {
        backupTime.setDate(backupTime.getDate() + 1);
      }

      const timeout = backupTime - now;

      setTimeout(() => {
        this.performAutoBackup();
        // Set interval for daily backup
        setInterval(() => this.performAutoBackup(), 24 * 60 * 60 * 1000);
      }, timeout);
    }
  },

  // Perform auto backup
  performAutoBackup() {
    console.log("Performing auto backup...");
    App.exportData();

    // Clean old backups
    this.cleanOldBackups();
  },

  // Clean old backups
  cleanOldBackups() {
    const keepBackups = this.get("backup.keepBackups", 30);
    // In real app, would delete old backup files
    console.log("Keeping last", keepBackups, "backups");
  },
};
