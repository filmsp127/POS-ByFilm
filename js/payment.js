// Payment Module
const Payment = {
  currentSale: null,
  paymentMethod: null,

  init() {
    // Initialize payment methods
  },

  open(items, subtotal, discount, total, memberId) {
    this.currentSale = {
      items,
      subtotal,
      discount,
      total,
      memberId,
    };

    this.createPaymentModal();
  },

  createPaymentModal() {
    const content = `
            <div class="p-6">
                <!-- Header -->
                <h3 class="text-2xl font-bold text-white text-center mb-6">ชำระเงิน</h3>
                
                <!-- Total Amount -->
                <div class="text-center mb-6">
                    <div class="text-4xl font-bold text-white" id="paymentAmount">
                        ${Utils.formatCurrency(this.currentSale.total)}
                    </div>
                    <div class="text-sm text-gray-400 mt-1">ยอดที่ต้องชำระ</div>
                </div>

                <!-- Payment Methods -->
                <div class="grid grid-cols-2 gap-4 mb-6">
                    <button onclick="Payment.selectMethod('cash')" id="cashMethodBtn"
                            class="payment-method glass p-6 rounded-xl text-center hover:bg-white/10 transition">
                        <i class="fas fa-money-bill-wave text-4xl text-green-400 mb-2"></i>
                        <div class="text-white font-medium">เงินสด</div>
                    </button>
                    <button onclick="Payment.selectMethod('transfer')" id="transferMethodBtn"
                            class="payment-method glass p-6 rounded-xl text-center hover:bg-white/10 transition">
                        <i class="fas fa-mobile-alt text-4xl text-blue-400 mb-2"></i>
                        <div class="text-white font-medium">โอนเงิน</div>
                    </button>
                </div>

                <!-- Cash Section -->
                <div id="cashSection" class="hidden space-y-4">
                    <div>
                        <label class="text-white text-sm mb-2 block">จำนวนเงินที่รับ</label>
                        <input type="number" id="receivedAmount" 
                               class="w-full p-4 text-2xl text-center glass rounded-lg text-white border border-white/20"
                               placeholder="0.00" onkeyup="Payment.calculateChange()">
                    </div>
                    <div class="flex justify-between text-white text-xl">
                        <span>เงินทอน</span>
                        <span id="changeAmount" class="font-bold text-yellow-400">฿0.00</span>
                    </div>
                    
                    <!-- Quick cash buttons -->
                    <div class="grid grid-cols-4 gap-2">
                        ${[20, 50, 100, 500, 1000]
                          .map(
                            (amount) => `
                            <button onclick="Payment.setQuickCash(${amount})" 
                                    class="glass py-2 rounded text-white hover:bg-white/10">
                                ${amount}
                            </button>
                        `
                          )
                          .join("")}
                    </div>
                </div>

                <!-- Transfer Section -->
                <div id="transferSection" class="hidden space-y-4">
                    <div class="text-center glass rounded-xl p-4">
                        <div class="text-white mb-2">สแกน QR Code เพื่อโอนเงิน</div>
                        <div class="bg-white p-4 rounded-lg inline-block">
                            <canvas id="qrcode" width="150" height="150"></canvas>
                        </div>
                        <div class="text-white text-sm mt-2">
                            PromptPay: ${
                              App.getSettings().promptpay || "0812345678"
                            }
                        </div>
                    </div>
                    <div>
                        <label class="text-white text-sm mb-2 block">เลขที่อ้างอิง (ถ้ามี)</label>
                        <input type="text" id="transferRef" 
                               class="w-full p-2 rounded-lg bg-white/10 border border-white/20 text-white"
                               placeholder="กรอกเลขที่อ้างอิง">
                    </div>
                </div>

                <!-- Action Buttons -->
                <div class="grid grid-cols-2 gap-3 mt-6">
                    <button onclick="Payment.cancel()" class="glass py-3 rounded-lg text-white">
                        ยกเลิก
                    </button>
                    <button onclick="Payment.confirm()" id="confirmPaymentBtn" 
                            class="btn-primary py-3 rounded-lg text-white font-medium" disabled>
                        ยืนยันชำระเงิน
                    </button>
                </div>
            </div>
        `;

    this.modal = Utils.createModal(content, { size: "w-full max-w-lg" });
  },

  selectMethod(method) {
    this.paymentMethod = method;

    // Reset UI
    document.querySelectorAll(".payment-method").forEach((btn) => {
      btn.classList.remove("ring-2", "ring-white", "bg-white/20");
    });

    // Highlight selected
    const btn = document.getElementById(`${method}MethodBtn`);
    btn.classList.add("ring-2", "ring-white", "bg-white/20");

    // Show relevant section
    document
      .getElementById("cashSection")
      .classList.toggle("hidden", method !== "cash");
    document
      .getElementById("transferSection")
      .classList.toggle("hidden", method !== "transfer");

    // Enable confirm button
    document.getElementById("confirmPaymentBtn").disabled = false;

    // Generate QR Code for transfer
    if (method === "transfer") {
      this.generateQRCode();
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

    // Auto confirm if exact amount
    if (received === total) {
      setTimeout(() => this.confirm(), 500);
    }
  },

  generateQRCode() {
    // In real app, use QR code library
    const canvas = document.getElementById("qrcode");
    const ctx = canvas.getContext("2d");

    // Placeholder QR code
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, 150, 150);
    ctx.fillStyle = "#fff";
    ctx.font = "12px Arial";
    ctx.textAlign = "center";
    ctx.fillText("QR Code", 75, 75);
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

  processSale() {
    Utils.showLoading("กำลังบันทึกการขาย...");

    // Create sale record
    const sale = App.addSale(this.currentSale);

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

    // Open cash drawer if enabled
    if (this.paymentMethod === "cash" && App.getSettings().cashDrawer.enabled) {
      this.openCashDrawer();
    }

    // Print receipt if enabled
    if (App.getSettings().printer.enabled) {
      setTimeout(() => this.printReceipt(sale), 1000);
    }
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
                <div class="bg-white text-black p-4 rounded-lg mb-4" style="font-family: 'Courier New', monospace;">
                    ${content}
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <button onclick="Payment.printReceipt(${sale.id})" 
                            class="glass py-2 rounded-lg text-white">
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

  generateReceiptHTML(sale) {
    const settings = App.getSettings();
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
                <h3 style="margin: 0; font-size: 18px;">${
                  settings.storeName
                }</h3>
                ${
                  settings.storeAddress
                    ? `<p style="margin: 5px 0; font-size: 12px;">${settings.storeAddress}</p>`
                    : ""
                }
                ${
                  settings.storePhone
                    ? `<p style="margin: 5px 0; font-size: 12px;">โทร: ${settings.storePhone}</p>`
                    : ""
                }
                <hr style="border-style: dashed; margin: 10px 0;">
                <p style="margin: 5px 0;">เลขที่: ${sale.id}</p>
                <p style="margin: 5px 0;">${Utils.formatDate(
                  sale.date,
                  "long"
                )}</p>
                <hr style="border-style: dashed; margin: 10px 0;">
                ${items}
                <hr style="border-style: dashed; margin: 10px 0;">
                <div style="display: flex; justify-content: space-between;">
                    <span>รวม:</span>
                    <span>${Utils.formatCurrency(sale.subtotal)}</span>
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
                </div>
                `
                }
                <hr style="border-style: dashed; margin: 10px 0;">
                <p style="margin: 5px 0; font-size: 12px;">ขอบคุณที่ใช้บริการ</p>
            </div>
        `;
  },

  printReceipt(saleId) {
    const sale = App.getSaleById(saleId);
    if (!sale) return;

    const content = this.generateReceiptHTML(sale);
    Utils.print(content, `ใบเสร็จ #${sale.id}`);
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

    Utils.confirm(
      `ต้องการคืนเงินบิล #${sale.id} จำนวน ${Utils.formatCurrency(
        sale.total
      )}?`,
      () => {
        // Create refund record
        const refund = {
          ...sale,
          id: Date.now(),
          type: "refund",
          originalSaleId: sale.id,
          total: -sale.total,
        };

        // Restore stock
        sale.items.forEach((item) => {
          const product = App.getProductById(item.id);
          if (product) {
            product.stock += item.quantity;
          }
        });

        App.addSale(refund);
        Utils.showToast("คืนเงินสำเร็จ", "success");
      }
    );
  },
};
