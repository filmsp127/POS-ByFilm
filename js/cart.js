// Cart Module
const Cart = {
  items: [],
  discount: 0,
  memberId: null,

  init() {
    this.loadCart();
  },

  loadCart() {
    // Load cart from session storage
    const savedCart = sessionStorage.getItem("currentCart");
    if (savedCart) {
      this.items = JSON.parse(savedCart);
    }
  },

  saveCart() {
    sessionStorage.setItem("currentCart", JSON.stringify(this.items));
  },

  addItem(product, quantity = 1, updateStock = true) {
    // Check stock
    if (updateStock && product.stock < quantity) {
      Utils.showToast("สินค้าในคลังไม่พอ", "error");
      return false;
    }

    // Find existing item
    const existingItem = this.items.find((item) => item.id === product.id);

    if (existingItem) {
      // Check stock for additional quantity
      if (updateStock && existingItem.quantity + quantity > product.stock) {
        Utils.showToast("สินค้าในคลังไม่พอ", "error");
        return false;
      }
      existingItem.quantity += quantity;
    } else {
      // Add new item
      this.items.push({
        ...product,
        quantity: quantity,
      });
    }

    this.saveCart();
    POS.updateCartDisplay();
    return true;
  },

  updateQuantity(productId, newQuantity) {
    const item = this.items.find((i) => i.id === productId);
    if (!item) return;

    if (newQuantity <= 0) {
      this.removeItem(productId);
      return;
    }

    // Check stock
    const product = App.getProductById(productId);
    if (product && newQuantity > product.stock) {
      Utils.showToast("สินค้าในคลังไม่พอ", "error");
      return;
    }

    item.quantity = newQuantity;
    this.saveCart();
    this.render();
    POS.updateCartDisplay();
  },

  removeItem(productId) {
    this.items = this.items.filter((item) => item.id !== productId);
    this.saveCart();
    this.render();
    POS.updateCartDisplay();
  },

  clear() {
    Utils.confirm("ต้องการล้างรายการทั้งหมด?", () => {
      this.items = [];
      this.discount = 0;
      this.memberId = null;
      this.saveCart();
      this.render();
      POS.updateCartDisplay();
      Utils.showToast("ล้างรายการแล้ว", "info");
    });
  },

  getItemCount() {
    return this.items.reduce((sum, item) => sum + item.quantity, 0);
  },

  getSubtotal() {
    return this.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
  },

  getDiscount() {
    const subtotal = this.getSubtotal();
    let discountAmount = 0;

    // Percentage discount
    if (this.discount > 0) {
      discountAmount += subtotal * (this.discount / 100);
    }

    // Member discount
    if (this.memberId) {
      const memberDiscount = App.getSettings().memberDiscount || 5;
      discountAmount += subtotal * (memberDiscount / 100);
    }

    return discountAmount;
  },

  getTotal() {
    return this.getSubtotal() - this.getDiscount();
  },

  setDiscount(percent) {
    this.discount = Math.max(0, Math.min(100, percent));
    this.render();
  },

  setMember(memberId) {
    this.memberId = memberId;
    this.render();
  },

  open() {
    const panel = document.getElementById("cartPanel");
    if (!panel) {
      this.createCartPanel();
    } else {
      panel.classList.remove("hidden");
    }
    this.render();
  },

  close() {
    const panel = document.getElementById("cartPanel");
    if (panel) {
      panel.classList.add("hidden");
    }
  },

  createCartPanel() {
    const panel = document.createElement("div");
    panel.id = "cartPanel";
    panel.className = "fixed inset-0 z-40 hidden";
    panel.innerHTML = `
            <div class="absolute inset-0 bg-black/50" onclick="Cart.close()"></div>
            <div class="absolute right-0 top-0 h-full w-full max-w-md glass-dark slide-in-right">
                <div class="flex flex-col h-full">
                    <!-- Cart Header -->
                    <div class="p-4 border-b border-white/10 flex items-center justify-between">
                        <h2 class="text-xl font-bold text-white">รายการสั่งซื้อ</h2>
                        <button onclick="Cart.close()" class="text-white p-2">
                            <i class="fas fa-times text-xl"></i>
                        </button>
                    </div>

                    <!-- Member Selection -->
                    <div class="p-4 border-b border-white/10">
                        <label class="text-sm text-white/70">สมาชิก</label>
                        <select id="cartMemberSelect" onchange="Cart.setMember(this.value)" 
                                class="w-full mt-1 p-2 rounded-lg bg-white/10 border border-white/20 text-white">
                            <option value="">ลูกค้าทั่วไป</option>
                        </select>
                    </div>

                    <!-- Cart Items -->
                    <div class="flex-1 overflow-y-auto p-4" id="cartItemsContainer">
                        <!-- Items will be rendered here -->
                    </div>

                    <!-- Cart Summary -->
                    <div class="glass p-4 border-t border-white/10">
                        <div class="space-y-2 mb-4">
                            <!-- Discount Input -->
                            <div class="flex items-center justify-between">
                                <span class="text-white">ส่วนลด</span>
                                <div class="flex items-center gap-2">
                                    <input type="number" id="discountInput" 
                                           placeholder="0" min="0" max="100"
                                           onchange="Cart.setDiscount(this.value)"
                                           class="w-16 px-2 py-1 rounded bg-white/10 border border-white/20 text-sm text-right text-white">
                                    <span class="text-white">%</span>
                                </div>
                            </div>
                            
                            <!-- Summary Lines -->
                            <div class="flex justify-between text-white">
                                <span>รวม</span>
                                <span id="cartSubtotal">฿0.00</span>
                            </div>
                            <div class="flex justify-between text-white">
                                <span>ส่วนลด</span>
                                <span id="cartDiscountAmount" class="text-green-400">-฿0.00</span>
                            </div>
                            <div class="flex justify-between text-xl font-bold text-white pt-2 border-t border-white/10">
                                <span>ยอดสุทธิ</span>
                                <span id="cartTotal">฿0.00</span>
                            </div>
                        </div>
                        
                        <!-- Action Buttons -->
                        <div class="grid grid-cols-2 gap-3">
                            <button onclick="Cart.clear()" class="btn-danger py-3 rounded-lg text-white font-medium">
                                <i class="fas fa-trash mr-2"></i>ล้าง
                            </button>
                            <button onclick="Cart.checkout()" class="btn-success py-3 rounded-lg text-white font-medium">
                                <i class="fas fa-check mr-2"></i>ชำระเงิน
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

    document.getElementById("modalsContainer").appendChild(panel);

    // Load members
    this.loadMembers();
  },

  loadMembers() {
    const select = document.getElementById("cartMemberSelect");
    if (!select) return;

    const members = App.state.members || [];
    select.innerHTML = '<option value="">ลูกค้าทั่วไป</option>';

    members.forEach((member) => {
      const option = document.createElement("option");
      option.value = member.id;
      option.textContent = `${member.name} (${member.phone})`;
      select.appendChild(option);
    });
  },

  render() {
    const container = document.getElementById("cartItemsContainer");
    if (!container) return;

    container.innerHTML = "";

    if (this.items.length === 0) {
      container.innerHTML = `
                <div class="text-center py-8 text-white/50">
                    <i class="fas fa-shopping-basket text-4xl mb-2"></i>
                    <p>ไม่มีสินค้าในตะกร้า</p>
                </div>
            `;
    } else {
      this.items.forEach((item) => {
        const itemEl = this.createCartItem(item);
        container.appendChild(itemEl);
      });
    }

    // Update summary
    this.updateSummary();
  },

  createCartItem(item) {
    const div = document.createElement("div");
    div.className = "cart-item glass rounded-lg p-3 mb-3";
    div.innerHTML = `
            <div class="flex items-center justify-between text-white">
                <div class="flex-1">
                    <div class="font-medium">${item.name}</div>
                    <div class="text-sm text-gray-400">
                        ${Utils.formatCurrency(item.price)} x ${item.quantity}
                    </div>
                </div>
                <div class="flex items-center gap-2">
                    <button onclick="Cart.updateQuantity(${item.id}, ${
      item.quantity - 1
    })" 
                            class="numpad-btn w-8 h-8 rounded flex items-center justify-center">
                        <i class="fas fa-minus text-sm"></i>
                    </button>
                    <input type="number" value="${item.quantity}" 
                           onchange="Cart.updateQuantity(${
                             item.id
                           }, parseInt(this.value))"
                           class="w-12 text-center bg-white/10 rounded text-white">
                    <button onclick="Cart.updateQuantity(${item.id}, ${
      item.quantity + 1
    })" 
                            class="numpad-btn w-8 h-8 rounded flex items-center justify-center">
                        <i class="fas fa-plus text-sm"></i>
                    </button>
                </div>
                <div class="ml-4 font-bold">
                    ${Utils.formatCurrency(item.price * item.quantity)}
                </div>
                <button onclick="Cart.removeItem(${item.id})" 
                        class="ml-2 text-red-400 hover:text-red-300">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
    return div;
  },

  updateSummary() {
    const subtotal = this.getSubtotal();
    const discount = this.getDiscount();
    const total = this.getTotal();

    const elements = {
      cartSubtotal: Utils.formatCurrency(subtotal),
      cartDiscountAmount: `-${Utils.formatCurrency(discount)}`,
      cartTotal: Utils.formatCurrency(total),
    };

    Object.entries(elements).forEach(([id, value]) => {
      const el = document.getElementById(id);
      if (el) el.textContent = value;
    });

    // Update discount input
    const discountInput = document.getElementById("discountInput");
    if (discountInput && !discountInput.matches(":focus")) {
      discountInput.value = this.discount || "";
    }
  },

  checkout() {
    if (this.items.length === 0) {
      Utils.showToast("ไม่มีสินค้าในตะกร้า", "error");
      return;
    }

    this.close();
    Payment.open(
      this.items,
      this.getSubtotal(),
      this.getDiscount(),
      this.getTotal(),
      this.memberId
    );
  },

  // Get cart data for payment
  getCartData() {
    return {
      items: this.items,
      subtotal: this.getSubtotal(),
      discount: this.getDiscount(),
      total: this.getTotal(),
      memberId: this.memberId,
    };
  },

  // Clear cart after successful payment
  clearAfterPayment() {
    this.items = [];
    this.discount = 0;
    this.memberId = null;
    this.saveCart();
    POS.updateCartDisplay();
  },
};
