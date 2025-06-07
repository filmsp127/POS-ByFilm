// เพิ่มฟังก์ชันเหล่านี้ใน app.js หรือสร้างไฟล์ debug.js ใหม่

// Debug Functions
const Debug = {
  // ตรวจสอบสถานะระบบทั้งหมด
  checkSystemStatus() {
    console.log("=== SYSTEM STATUS CHECK ===");
    
    // 1. Check Authentication
    console.log("1. Authentication:");
    console.log("   - Authenticated:", Auth.isAuthenticated());
    console.log("   - Current User:", Auth.getCurrentUser());
    console.log("   - Current Store:", Auth.getCurrentStore());
    
    // 2. Check Firebase
    console.log("\n2. Firebase:");
    console.log("   - Connected:", window.FirebaseService && FirebaseService.isAuthenticated());
    console.log("   - Online:", navigator.onLine);
    
    // 3. Check Shift
    console.log("\n3. Shift Status:");
    console.log("   - Shift Open:", ShiftManager.isShiftOpen());
    console.log("   - Current Shift:", ShiftManager.getCurrentShift());
    
    // 4. Check Cart
    console.log("\n4. Cart Status:");
    console.log("   - Items:", Cart.items.length);
    console.log("   - Total:", Cart.getTotal());
    console.log("   - Cart Panel Exists:", !!document.getElementById('cartPanel'));
    
    // 5. Check Data
    console.log("\n5. Data Status:");
    console.log("   - Products:", App.state.products.length);
    console.log("   - Categories:", App.state.categories.length);
    console.log("   - Sales:", App.state.sales.length);
    console.log("   - Members:", App.state.members.length);
    
    // 6. Check Sync
    console.log("\n6. Sync Status:");
    console.log("   - Pending Sync:", SyncManager.syncStatus.pendingSync.length);
    console.log("   - Last Sync:", new Date(SyncManager.syncStatus.lastSync || 0).toLocaleString());
    console.log("   - Is Syncing:", SyncManager.syncStatus.isSyncing);
  },
  
  // แก้ไขปัญหา Cart Panel
  fixCartPanel() {
    console.log("🔧 Fixing cart panel...");
    
    // ลบ panel เก่า
    const oldPanel = document.getElementById('cartPanel');
    if (oldPanel) {
      oldPanel.remove();
      console.log("✅ Removed old cart panel");
    }
    
    // สร้าง panel ใหม่
    Cart.createCartPanel();
    console.log("✅ Created new cart panel");
    
    // ทดสอบเปิด
    Cart.open();
  },
  
  // แก้ไขปัญหา Shift
  async fixShift() {
    console.log("🔧 Fixing shift issues...");
    
    // 1. Clean up listeners
    if (ShiftManager.shiftListener) {
      ShiftManager.shiftListener();
      ShiftManager.shiftListener = null;
    }
    
    // 2. Reload shift data
    ShiftManager.loadCurrentShift();
    
    // 3. Setup listener again
    ShiftManager.setupRealtimeListener();
    
    // 4. Update UI
    ShiftManager.updateUI();
    
    console.log("✅ Shift fixed");
  },
  
  // ปิดรอบบังคับ (กรณีฉุกเฉิน)
  async forceCloseShift() {
    if (!ShiftManager.isShiftOpen()) {
      console.log("❌ No shift to close");
      return;
    }
    
    const shift = ShiftManager.currentShift;
    console.log("⚠️ Force closing shift:", shift.employeeName);
    
    // ปิดรอบด้วยยอดเงินที่ควรมี
    await ShiftManager.closeShift(shift.expectedCash, "ปิดรอบฉุกเฉิน");
  },
  
  // ล้าง shift ค้าง
  clearStuckShift() {
    console.log("🔧 Clearing stuck shift...");
    
    ShiftManager.currentShift = null;
    ShiftManager.saveCurrentShift();
    ShiftManager.updateUI();
    
    // Clear from local state
    const storeId = App.state.currentStoreId;
    if (storeId) {
      localStorage.removeItem(`currentShift_${storeId}`);
    }
    
    console.log("✅ Shift cleared");
  },
  
  // Force sync ข้อมูลทั้งหมด
  async forceSyncAll() {
    console.log("🔄 Starting force sync...");
    
    try {
      // 1. Sync app data
      await App.syncWithFirebase();
      
      // 2. Sync pending items
      await SyncManager.syncPendingData();
      
      // 3. Reload from Firebase
      await App.loadFromFirebase();
      
      console.log("✅ Force sync completed");
      Utils.showToast("Sync ข้อมูลสำเร็จ", "success");
    } catch (error) {
      console.error("❌ Force sync failed:", error);
      Utils.showToast("Sync ผิดพลาด: " + error.message, "error");
    }
  },
  
  // Reset ระบบทั้งหมด (ระวัง!)
  resetSystem() {
    if (!confirm("⚠️ คำเตือน: การ reset จะลบข้อมูลในเครื่องทั้งหมด ยืนยัน?")) {
      return;
    }
    
    if (!confirm("⚠️ ยืนยันอีกครั้ง? ข้อมูลจะหายทั้งหมด!")) {
      return;
    }
    
    console.log("🔥 RESETTING SYSTEM...");
    
    // Clear all localStorage
    const storeId = App.state.currentStoreId;
    localStorage.removeItem(`posData_${storeId}`);
    localStorage.removeItem(`currentShift_${storeId}`);
    localStorage.removeItem('currentCart');
    localStorage.removeItem('pendingSync');
    
    // Reload page
    location.reload();
  }
};

// เพิ่มคำสั่ง console สำหรับ debug
console.log("🛠️ Debug commands available:");
console.log("- Debug.checkSystemStatus() - ตรวจสอบสถานะระบบ");
console.log("- Debug.fixCartPanel() - แก้ไขปัญหาตะกร้า");
console.log("- Debug.fixShift() - แก้ไขปัญหา shift");
console.log("- Debug.forceCloseShift() - ปิดรอบฉุกเฉิน");
console.log("- Debug.clearStuckShift() - ล้าง shift ค้าง");
console.log("- Debug.forceSyncAll() - บังคับ sync ข้อมูล");
console.log("- Debug.resetSystem() - รีเซ็ตระบบ (ระวัง!)");

// Export to window
window.Debug = Debug;
