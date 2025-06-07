// Payment Module
const Payment = {
  currentSale: null,
  paymentMethod: null,

  init() {
    console.log("Payment module initialized");
  },

    open(items, subtotal, discount, total, memberId) {
    // เพิ่มการเช็คว่าเปิดรอบหรือยัง
    if (window.ShiftManager && !ShiftManager.isShiftOpen()) {
      Utils.showToast("กรุณาเปิดรอบก่อนทำการขาย", "error");
      return;
    }

    this.currentSale = {
      items,
      subtotal,
      discount,
      total,
      memberId,
    };

    this.createPaymentModal();
  },
  processSale() {
    Utils.showLoading("กำลังบันทึกการขาย...");

    try {
      // Get cart data including member info
      const cartData = Cart.getCartData();

      // Merge with current sale data
      this.currentSale = {
        ...this.currentSale,
        ...cartData,
        paymentMethod: this.paymentMethod,
      };

      // Create sale record
      const sale = App.addSale(this.currentSale);

      if (!sale) {
        Utils.hideLoading();
        Utils.showToast("ไม่สามารถบันทึกการขายได้", "error");
        return;
      }

      // Update member points if applicable
      if (this.currentSale.memberId) {
        this.updateMemberPoints(
          this.currentSale.memberId,
          this.currentSale.total
        );
      }

      // Clear cart
      Cart.clearAfterPayment();

      // Close modal
      Utils.closeModal(this.modal);

      // Hide loading
      Utils.hideLoading();

      // Show success
      Utils.showToast(`ชำระเงินสำเร็จ #${sale.id}`, "success");

      // Show receipt
      this.showReceipt(sale);

      // Refresh POS display
      POS.refresh();

      // Sync to Firebase if available
      if (window.FirebaseService && FirebaseService.isAuthenticated()) {
        this.syncSaleToFirebase(sale);
      }
    } catch (error) {
      console.error("Process sale error:", error);
      Utils.hideLoading();
      Utils.showToast("เกิดข้อผิดพลาดในการบันทึก: " + error.message, "error");
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

  createPaymentModal() {
  // สร้างรายการสินค้า
  let itemsList = "";
  this.currentSale.items.forEach((item) => {
    itemsList += `
      <div class="flex justify-between items-center py-2 border-b border-gray-200">
        <div class="flex-1">
          <span class="text-gray-800 text-sm">${item.name}</span>
          <span class="text-gray-500 text-xs ml-2">x${item.quantity}</span>
        </div>
        <span class="text-gray-800 font-medium text-sm">${Utils.formatCurrency(
          item.price * item.quantity
        )}</span>
      </div>
    `;
  });

  const content = `
    <div class="modal-with-footer h-full flex flex-col">
      <div class="modal-header bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-4">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-bold">ชำระเงิน</h3>
          <button onclick="Payment.cancel()" class="w-10 h-10 flex items-center justify-center hover:bg-white/20 rounded-lg transition">
            <i class="fas fa-times text-xl"></i>
          </button>
        </div>
      </div>
        <div class="modal-body">
          <!-- Items List -->
          <div class="bg-gray-50 rounded-lg p-4 mb-4 max-h-32 overflow-y-auto">
            <h4 class="font-medium text-gray-700 mb-2">รายการสินค้า</h4>
            ${itemsList}
          </div>
          
          <!-- Total Amount -->
          <div class="text-center mb-6 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
            <div class="text-4xl font-bold" id="paymentAmount">
              ${Utils.formatCurrency(this.currentSale.total)}
            </div>
            <div class="text-sm opacity-90 mt-1">ยอดที่ต้องชำระ</div>
          </div>

          <!-- Payment Methods -->
          <div class="grid grid-cols-2 gap-4 mb-6">
            <button onclick="Payment.selectMethod('cash')" id="cashMethodBtn"
                    class="payment-method bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200 p-6 rounded-xl text-center hover:border-green-500 hover:shadow-lg transition">
              <i class="fas fa-money-bill-wave text-4xl text-green-600 mb-2"></i>
              <div class="text-gray-800 font-medium">เงินสด</div>
            </button>
            <button onclick="Payment.selectMethod('transfer')" id="transferMethodBtn"
                    class="payment-method bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 p-6 rounded-xl text-center hover:border-blue-500 hover:shadow-lg transition">
              <i class="fas fa-mobile-alt text-4xl text-blue-600 mb-2"></i>
              <div class="text-gray-800 font-medium">โอนเงิน</div>
            </button>
          </div>

          <!-- Cash Section -->
          <div id="cashSection" class="hidden space-y-4 mb-6">
            <div>
              <label class="text-gray-700 text-sm mb-2 block font-medium">จำนวนเงินที่รับ</label>
              <input type="number" id="receivedAmount" 
                     class="w-full p-4 text-2xl text-center bg-gray-50 rounded-lg text-gray-800 border-2 border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-200"
                     placeholder="0.00" onkeyup="Payment.calculateChange()">
            </div>
            <div class="bg-green-50 rounded-lg p-4">
              <div class="flex justify-between text-xl">
                <span class="text-gray-700">เงินทอน</span>
                <span id="changeAmount" class="font-bold text-green-600">฿0.00</span>
              </div>
            </div>
            
            <!-- Quick cash buttons -->
            <div class="grid grid-cols-5 gap-2">
              ${[20, 50, 100, 500, 1000]
                .map(
                  (amount) => `
                  <button onclick="Payment.setQuickCash(${amount})" 
                          class="bg-gradient-to-br from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 py-2 rounded text-gray-700 font-medium transition shadow">
                    ${amount}
                  </button>
                `
                )
                .join("")}
            </div>
          </div>

          <!-- Transfer Section -->
          <div id="transferSection" class="hidden space-y-4 mb-6">
            <div class="text-center bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl p-6">
              <div class="text-gray-700 mb-4 font-medium">สแกน QR Code เพื่อโอนเงิน</div>
              
              <!-- QR Code Display -->
              <div class="bg-white p-4 rounded-lg inline-block shadow-md mb-4" id="qrCodeContainer">
                <div id="qrCodeDisplay" class="w-48 h-48 flex items-center justify-center text-gray-400">
                  <i class="fas fa-qrcode text-6xl"></i>
                </div>
              </div>
              
              <div class="text-gray-600 text-sm mb-4">
                PromptPay: <span id="promptPayNumber">${
                  App.getSettings().promptpay || "ยังไม่ได้ตั้งค่า"
                }</span>
              </div>
              
              <!-- Upload QR Code -->
              <div class="mb-4">
                <input type="file" id="qrCodeUpload" accept="image/*" class="hidden" onchange="Payment.handleQRUpload(event)">
                <button onclick="document.getElementById('qrCodeUpload').click()" 
                        class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm">
                  <i class="fas fa-upload mr-2"></i>อัพโหลด QR Code
                </button>
              </div>
            </div>
            
            <div>
              <label class="text-gray-700 text-sm mb-2 block font-medium">เลขที่อ้างอิง (ถ้ามี)</label>
              <input type="text" id="transferRef" 
                     class="w-full p-2 rounded-lg bg-gray-50 border border-gray-300 text-gray-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                     placeholder="กรอกเลขที่อ้างอิง">
            </div>
          </div>
        </div>
        <!-- ปิด modal-body -->
      </div>
      
      <div class="modal-footer">
        <div class="grid grid-cols-2 gap-3">
          <button onclick="Payment.cancel()" 
                  class="bg-gradient-to-br from-gray-200 to-gray-300 hover:from-gray-300 hover:to-gray-400 py-3 rounded-lg text-gray-800 font-medium transition shadow">
            ยกเลิก
          </button>
          <button onclick="Payment.confirm()" id="confirmPaymentBtn" 
                  class="btn-primary py-3 rounded-lg text-white font-medium shadow-lg" disabled>
            ยืนยันชำระเงิน
          </button>
        </div>
      </div>
    </div>
  `;

  this.modal = Utils.createModal(content, {
    size: "w-full max-w-lg",
    mobileFullscreen: true
  });

    // แสดง QR Code ถ้ามี
    this.loadSavedQRCode();
  },

  selectMethod(method) {
    this.paymentMethod = method;

    // Reset UI
    document.querySelectorAll(".payment-method").forEach((btn) => {
      btn.classList.remove(
        "ring-4",
        "ring-green-300",
        "ring-blue-300",
        "border-green-500",
        "border-blue-500"
      );
      btn.classList.add("border-gray-200");
    });

    // Highlight selected
    const btn = document.getElementById(`${method}MethodBtn`);
    if (method === "cash") {
      btn.classList.remove("border-gray-200");
      btn.classList.add("ring-4", "ring-green-300", "border-green-500");
    } else {
      btn.classList.remove("border-gray-200");
      btn.classList.add("ring-4", "ring-blue-300", "border-blue-500");
    }

    // Show relevant section
    document
      .getElementById("cashSection")
      .classList.toggle("hidden", method !== "cash");
    document
      .getElementById("transferSection")
      .classList.toggle("hidden", method !== "transfer");

    // Enable confirm button
    document.getElementById("confirmPaymentBtn").disabled = false;

    // Generate/Load QR Code for transfer
    if (method === "transfer") {
      this.loadSavedQRCode();
    } else {
      document.getElementById("receivedAmount").focus();
    }
  },

  setQuickCash(amount) {
    document.getElementById("receivedAmount").value = amount;
    this.calculateChange();
  },

  calculateChange() {
    const total = this.currentSale.total;
    const received =
      parseFloat(document.getElementById("receivedAmount").value) || 0;
    const change = Math.max(0, received - total);

    document.getElementById("changeAmount").textContent =
      Utils.formatCurrency(change);

    // Enable/disable confirm based on amount
    const confirmBtn = document.getElementById("confirmPaymentBtn");
    confirmBtn.disabled = this.paymentMethod !== "cash" || received < total;

    // Update button style based on status
    if (received >= total && this.paymentMethod === "cash") {
      confirmBtn.classList.add("bg-green-600", "hover:bg-green-700");
      confirmBtn.classList.remove("bg-gray-400");
    }

    // Auto confirm if exact amount
    if (received === total) {
      setTimeout(() => this.confirm(), 500);
    }
  },

  // Handle QR Code upload
  handleQRUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const qrCodeData = e.target.result;

      // Save QR Code
      const settings = App.getSettings();
      settings.qrCode = qrCodeData;
      App.updateSettings(settings);

      // Display QR Code
      this.displayQRCode(qrCodeData);

      Utils.showToast("อัพโหลด QR Code สำเร็จ", "success");
    };
    reader.readAsDataURL(file);
  },

  // Load saved QR Code
  loadSavedQRCode() {
    const settings = App.getSettings();
    if (settings.qrCode) {
      this.displayQRCode(settings.qrCode);
    }
  },

  // Display QR Code
  displayQRCode(qrCodeData) {
    const container = document.getElementById("qrCodeDisplay");
    if (container) {
      container.innerHTML = `<img src="${qrCodeData}" alt="QR Code" class="w-full h-full object-contain">`;
    }
  },

  confirm() {
    if (!this.paymentMethod) {
      Utils.showToast("กรุณาเลือกวิธีชำระเงิน", "error");
      return;
    }

    if (this.paymentMethod === "cash") {
      const received =
        parseFloat(document.getElementById("receivedAmount").value) || 0;
      if (received < this.currentSale.total) {
        Utils.showToast("จำนวนเงินไม่พอ", "error");
        return;
      }
      this.currentSale.received = received;
      this.currentSale.change = received - this.currentSale.total;
    } else {
      this.currentSale.transferRef =
        document.getElementById("transferRef").value;
    }

    this.currentSale.paymentMethod = this.paymentMethod;
    this.processSale();
  },

  updateMemberPoints(memberId, amount) {
    const members = App.state.members || [];
    const member = members.find((m) => m.id == memberId);
    if (member) {
      const pointRate = App.getSettings().pointRate || 100;
      const points = Math.floor(amount / pointRate);
      member.points = (member.points || 0) + points;
      member.totalPurchase = (member.totalPurchase || 0) + amount;
      App.saveData();
    }
  },

  showReceipt(sale) {
    const content = this.generateReceiptHTML(sale);
    const receiptModal = Utils.createModal(
      `
            <div class="p-6">
                <div class="bg-white text-black p-4 rounded-lg mb-4 shadow-inner" style="font-family: 'Courier New', monospace;">
                    ${content}
                </div>
                <div class="grid grid-cols-3 gap-3">
                    <button onclick="Payment.editReceipt(${sale.id})" 
                            class="bg-blue-500 hover:bg-blue-600 py-2 rounded-lg text-white transition">
                        <i class="fas fa-edit mr-2"></i>แก้ไข
                    </button>
                    <button onclick="Payment.printReceipt(${sale.id})" 
                            class="bg-gray-200 hover:bg-gray-300 py-2 rounded-lg text-gray-800 transition">
                        <i class="fas fa-print mr-2"></i>พิมพ์
                    </button>
                    <button onclick="Utils.closeModal(this.closest('.fixed'))" 
                            class="btn-success py-2 rounded-lg text-white">
                        เสร็จสิ้น
                    </button>
                </div>
            </div>
        `,
      { size: "w-full max-w-sm" }
    );
  },

  // แก้ไขใบเสร็จ
  editReceipt(saleId) {
    const sale = App.getSaleById(saleId);
    if (!sale) return;

    const settings = App.getSettings();
    const currentCustomerName = sale.customerName || "ลูกค้าทั่วไป";

    const content = `
      <div class="p-6">
        <h3 class="text-xl font-bold text-gray-800 mb-4">แก้ไขใบเสร็จ</h3>
        
        <form onsubmit="Payment.saveReceiptEdits(event, ${saleId})">
          <div class="space-y-4">
            <div>
              <label class="text-gray-700 text-sm font-medium">ชื่อลูกค้า</label>
              <input type="text" id="customerName" value="${currentCustomerName}"
                     class="w-full mt-1 p-2 rounded-lg border border-gray-300 text-gray-800"
                     placeholder="ลูกค้าทั่วไป">
            </div>
            
            <div>
              <label class="text-gray-700 text-sm font-medium">โลโก้ร้าน (แบบขาวดำ)</label>
              <input type="file" id="logoUpload" accept="image/*" 
                     onchange="Payment.handleLogoUpload(event)"
                     class="w-full mt-1 p-2 rounded-lg border border-gray-300">
              <div class="mt-2 text-center" id="logoPreview">
                ${
                  settings.logoBlackWhite
                    ? `<img src="${settings.logoBlackWhite}" alt="โลโก้" class="h-16 mx-auto filter grayscale">`
                    : '<div class="text-gray-400">ยังไม่มีโลโก้</div>'
                }
              </div>
            </div>
            
            <div>
              <label class="text-gray-700 text-sm font-medium">ข้อความท้ายบิล</label>
              <textarea id="footerMessage" rows="3"
                        class="w-full mt-1 p-2 rounded-lg border border-gray-300 text-gray-800"
                        placeholder="ขอบคุณที่ใช้บริการ">${
                          settings.receipt?.footerMessage || ""
                        }</textarea>
            </div>
          </div>
          
          <div class="flex gap-3 mt-6">
            <button type="button" onclick="Utils.closeModal(this.closest('.fixed'))"
                    class="flex-1 bg-gray-200 hover:bg-gray-300 py-2 rounded-lg text-gray-800">
              ยกเลิก
            </button>
            <button type="submit"
                    class="flex-1 btn-primary py-2 rounded-lg text-white">
              บันทึก
            </button>
          </div>
        </form>
      </div>
    `;

    Utils.createModal(content, { size: "w-full max-w-md" });
  },

  // Handle logo upload
  handleLogoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const logoData = e.target.result;
      const preview = document.getElementById("logoPreview");

      preview.innerHTML = `<img src="${logoData}" alt="โลโก้" class="h-16 mx-auto filter grayscale">`;

      // Save to settings
      const settings = App.getSettings();
      settings.logoBlackWhite = logoData;
      App.updateSettings(settings);
    };
    reader.readAsDataURL(file);
  },

  // Save receipt edits
  saveReceiptEdits(event, saleId) {
    event.preventDefault();

    const sale = App.getSaleById(saleId);
    if (!sale) return;

    const customerName = document.getElementById("customerName").value.trim();
    const footerMessage = document.getElementById("footerMessage").value.trim();

    // Update sale
    sale.customerName = customerName || "ลูกค้าทั่วไป";

    // Update settings
    const settings = App.getSettings();
    if (!settings.receipt) settings.receipt = {};
    settings.receipt.footerMessage = footerMessage;
    App.updateSettings(settings);

    App.saveData();

    Utils.closeModal(event.target.closest(".fixed"));
    Utils.showToast("บันทึกการแก้ไขแล้ว", "success");

    // Refresh receipt display
    this.showReceipt(sale);
  },

  generateReceiptHTML(sale) {
    const settings = App.getSettings();
    const receiptSettings = settings.receipt || {};
    const store = Auth.getCurrentStore();

    // Get customer name
    const customerName =
      sale.customerName ||
      (sale.memberId ? this.getMemberName(sale.memberId) : "ลูกค้าทั่วไป");

    const items = sale.items
      .map(
        (item) => `
            <div style="display: flex; justify-content: space-between; font-size: 12px;">
                <span>${item.name} x${item.quantity}</span>
                <span>${Utils.formatCurrency(item.price * item.quantity)}</span>
            </div>
        `
      )
      .join("");

    return `
            <div style="text-align: center; font-size: 14px;">
                ${
                  settings.logoBlackWhite
                    ? `<img src="${settings.logoBlackWhite}" alt="โลโก้" style="height: 60px; margin: 0 auto 10px auto; filter: grayscale(100%);">`
                    : `<h3 style="margin: 0; font-size: 18px;">${
                        store ? store.name : settings.storeName || "Modern POS"
                      }</h3>`
                }
                ${
                  receiptSettings.showAddress && settings.storeAddress
                    ? `<p style="margin: 5px 0; font-size: 12px;">${settings.storeAddress}</p>`
                    : ""
                }
                ${
                  settings.storePhone
                    ? `<p style="margin: 5px 0; font-size: 12px;">โทร: ${settings.storePhone}</p>`
                    : ""
                }
                ${
                  receiptSettings.showTaxId && settings.taxId
                    ? `<p style="margin: 5px 0; font-size: 12px;">เลขประจำตัวผู้เสียภาษี: ${settings.taxId}</p>`
                    : ""
                }
                <hr style="border-style: dashed; margin: 10px 0;">
                <p style="margin: 5px 0;">เลขที่: ${sale.id}</p>
                <p style="margin: 5px 0;">ลูกค้า: ${customerName}</p>
                <p style="margin: 5px 0;">${Utils.formatDate(
                  sale.date,
                  "long"
                )}</p>
                <hr style="border-style: dashed; margin: 10px 0;">
                ${items}
                <hr style="border-style: dashed; margin: 10px 0;">
                <div style="display: flex; justify-content: space-between;">
                    <span>รวม:</span>
                    <span>${Utils.formatCurrency(
                      sale.subtotal || sale.total + (sale.discount || 0)
                    )}</span>
                </div>
                ${
                  sale.discount > 0
                    ? `
                <div style="display: flex; justify-content: space-between; color: green;">
                    <span>ส่วนลด:</span>
                    <span>-${Utils.formatCurrency(sale.discount)}</span>
                </div>
                `
                    : ""
                }
                <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 16px; margin-top: 5px;">
                    <span>ยอดสุทธิ:</span>
                    <span>${Utils.formatCurrency(sale.total)}</span>
                </div>
                ${
                  sale.paymentMethod === "cash"
                    ? `
                <div style="display: flex; justify-content: space-between; margin-top: 5px;">
                    <span>รับเงิน:</span>
                    <span>${Utils.formatCurrency(sale.received)}</span>
                </div>
                <div style="display: flex; justify-content: space-between;">
                    <span>เงินทอน:</span>
                    <span>${Utils.formatCurrency(sale.change)}</span>
                </div>
                `
                    : `
                <div style="margin-top: 5px;">
                    <span>ชำระโดย: โอนเงิน</span>
                    ${
                      sale.transferRef
                        ? `<br><span style="font-size: 11px;">Ref: ${sale.transferRef}</span>`
                        : ""
                    }
                </div>
                `
                }
                <hr style="border-style: dashed; margin: 10px 0;">
                ${
                  receiptSettings.footerMessage
                    ? `<p style="margin: 5px 0; font-size: 12px;">${receiptSettings.footerMessage}</p>`
                    : `<p style="margin: 5px 0; font-size: 12px;">ขอบคุณที่ใช้บริการ</p>`
                }
                ${
                  store
                    ? `<p style="margin: 5px 0; font-size: 10px; color: gray;">ร้าน: ${store.name}</p>`
                    : ""
                }
            </div>
        `;
  },

  // Get member name by ID
  getMemberName(memberId) {
    const members = App.state.members || [];
    const member = members.find((m) => m.id == memberId);
    return member ? member.name : "ลูกค้าทั่วไป";
  },

  printReceipt(saleId) {
    const sale = App.getSaleById(saleId);
    if (!sale) return;

    const content = this.generateReceiptHTML(sale);
    const copies = App.getSettings().receipt?.printCopy || 1;

    // Print multiple copies if needed
    for (let i = 0; i < copies; i++) {
      if (i > 0) {
        // Add delay between copies
        setTimeout(() => {
          Utils.print(content, `ใบเสร็จ #${sale.id}`);
        }, i * 1000);
      } else {
        Utils.print(content, `ใบเสร็จ #${sale.id}`);
      }
    }
  },

  cancel() {
    Utils.closeModal(this.modal);
  },

  // Hardware integration
  openCashDrawer() {
    console.log("Opening cash drawer...");
    // In real app, send command to cash drawer
    // Via USB, Serial port, or network printer
  },

  // Refund functionality
  refund(saleId) {
  const sale = App.getSaleById(saleId);
  if (!sale) return;

  // ป้องกันการ refund ซ้ำ
  if (sale.type === "refund" || sale.refunded) {
    Utils.showToast("บิลนี้ถูกคืนเงินแล้ว", "error");
    return;
  }

  Utils.confirm(
    `ต้องการคืนเงินบิล #${sale.id} จำนวน ${Utils.formatCurrency(sale.total)}?`,
    () => {
      // Create refund record
      const refund = {
        id: Date.now(),
        type: "refund",
        originalSaleId: sale.id,
        items: sale.items.map(item => ({
          ...item,
          quantity: -item.quantity // ติดลบเพื่อหักออก
        })),
        total: -sale.total,
        subtotal: -sale.subtotal,
        discount: -sale.discount,
        timestamp: Date.now(),
        date: new Date().toISOString(),
        paymentMethod: sale.paymentMethod,
        cashier: Auth.getCurrentUser()?.username || "พนักงาน",
        memberId: sale.memberId,
        memberName: sale.memberName
      };

      // Restore stock
      sale.items.forEach((item) => {
        const product = App.getProductById(item.id);
        if (product) {
          App.updateProduct(item.id, {
            stock: product.stock + item.quantity
          });
        }
      });

      // Mark original sale as refunded
      const saleIndex = App.state.sales.findIndex(s => s.id === saleId);
      if (saleIndex !== -1) {
        App.state.sales[saleIndex].refunded = true;
        App.state.sales[saleIndex].refundedAt = Date.now();
      }

      // Add refund record
      App.state.sales.push(refund);
      // Update shift if open (เพิ่มโค้ดนี้)
if (window.ShiftManager && ShiftManager.isShiftOpen()) {
  ShiftManager.addRefundToShift(refund);
}
      App.saveData();

      // Update member points if applicable
      if (sale.memberId) {
        const pointsToDeduct = Math.floor(Math.abs(sale.total) / (App.getSettings().pointRate || 100));
        const member = App.state.members.find(m => m.id == sale.memberId);
        if (member) {
          member.points = Math.max(0, (member.points || 0) - pointsToDeduct);
          member.totalPurchase = Math.max(0, (member.totalPurchase || 0) - Math.abs(sale.total));
        }
      }

      Utils.showToast("คืนเงินสำเร็จ", "success");
      this.showRefundReceipt(refund);
      
      // Refresh UI
      if (BackOffice.currentPage === "sales") {
        BackOffice.loadSalesHistory();
      } else if (BackOffice.currentPage === "dashboard") {
        BackOffice.updateDashboardStats();
      }
    }
  );
},

  // Show refund receipt
  showRefundReceipt(refund) {
    const content = `
      <div style="text-align: center; font-family: 'Courier New', monospace;">
        <h3 style="color: red;">ใบคืนเงิน</h3>
        <p>เลขที่: R${refund.id}</p>
        <p>อ้างอิงบิล: #${refund.originalSaleId}</p>
        <hr style="border-style: dashed;">
        <p style="font-size: 18px; font-weight: bold;">
          ยอดคืน: ${Utils.formatCurrency(Math.abs(refund.total))}
        </p>
        <hr style="border-style: dashed;">
        <p>${Utils.formatDate(new Date(), "long")}</p>
      </div>
    `;

    Utils.createModal(
      `
        <div class="p-6">
          <div class="bg-red-50 text-red-900 p-4 rounded-lg mb-4">
            ${content}
          </div>
          <button onclick="Utils.closeModal(this.closest('.fixed'))" 
                  class="w-full btn-primary py-2 rounded-lg text-white">
            ปิด
          </button>
        </div>
      `,
      { size: "w-full max-w-sm" }
    );
  },

  // Split bill
  splitBill(numWays = 2) {
    const total = Cart.getTotal();
    const perPerson = Math.ceil(total / numWays);

    const content = `
      <div class="p-6">
        <h3 class="text-xl font-bold text-gray-800 mb-4">แบ่งบิล</h3>
        
        <div class="bg-gray-50 rounded-lg p-4 mb-4">
          <div class="text-center">
            <div class="text-sm text-gray-600">ยอดรวมทั้งหมด</div>
            <div class="text-2xl font-bold text-gray-800">${Utils.formatCurrency(
              total
            )}</div>
          </div>
        </div>
        
        <div class="mb-4">
          <label class="text-gray-700 text-sm font-medium">จำนวนคน</label>
          <input type="number" id="splitWays" value="${numWays}" min="2" max="10"
                 onchange="Payment.updateSplitAmount()"
                 class="w-full mt-1 p-2 rounded-lg border border-gray-300 text-gray-800 text-center">
        </div>
        
        <div class="bg-blue-50 rounded-lg p-4 mb-4">
          <div class="text-center">
            <div class="text-sm text-gray-600">ต่อคน</div>
            <div class="text-2xl font-bold text-blue-600" id="perPersonAmount">
              ${Utils.formatCurrency(perPerson)}
            </div>
          </div>
        </div>
        
        <button onclick="Utils.closeModal(this.closest('.fixed'))"
                class="w-full btn-primary py-2 rounded-lg text-white">
          ตกลง
        </button>
      </div>
    `;

    Utils.createModal(content, { size: "w-full max-w-sm" });
  },

  updateSplitAmount() {
    const total = Cart.getTotal();
    const ways = parseInt(document.getElementById("splitWays").value) || 2;
    const perPerson = Math.ceil(total / ways);

    document.getElementById("perPersonAmount").textContent =
      Utils.formatCurrency(perPerson);
  },
};
