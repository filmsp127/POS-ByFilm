// Cart Module
const Cart = {
  items: [],
  discount: 0,
  memberId: null,
  pointsUsed: 0, // แต้มที่ใช้

  init() {
    this.loadCart();
  },

  loadCart() {
    // Load cart from session storage
    const savedCart = sessionStorage.getItem("currentCart");
    if (savedCart) {
      const data = JSON.parse(savedCart);
      this.items = data.items || [];
      this.discount = data.discount || 0;
      this.memberId = data.memberId || null;
      this.pointsUsed = data.pointsUsed || 0;
    }
  },

  saveCart() {
    const cartData = {
      items: this.items,
      discount: this.discount,
      memberId: this.memberId,
      pointsUsed: this.pointsUsed,
    };
    sessionStorage.setItem("currentCart", JSON.stringify(cartData));
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
      this.pointsUsed = 0;
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

    // Points discount
    discountAmount += this.pointsUsed;

    return discountAmount;
  },

  getTotal() {
    return Math.max(0, this.getSubtotal() - this.getDiscount());
  },

  setDiscount(percent) {
    this.discount = Math.max(0, Math.min(100, percent));
    this.saveCart();
    this.render();
  },

  setMember(memberId) {
    console.log("Setting member:", memberId);
    this.memberId = memberId || null;
    this.pointsUsed = 0; // Reset points when changing member
    this.saveCart();
    this.render();
  },

  // ใช้แต้มสะสม
  usePoints(points) {
    if (!this.memberId) {
      Utils.showToast("กรุณาเลือกสมาชิกก่อน", "error");
      return;
    }

    const member = this.getMemberData();
    if (!member) {
      Utils.showToast("ไม่พบข้อมูลสมาชิก", "error");
      return;
    }

    const availablePoints = member.points || 0;
    const maxPoints = Math.min(availablePoints, this.getSubtotal());

    if (points > maxPoints) {
      Utils.showToast(`สามารถใช้แต้มได้สูงสุด ${maxPoints} แต้ม`, "error");
      return;
    }

    this.pointsUsed = Math.max(0, points);
    this.saveCart();
    this.render();
  },

  // Get member data
  getMemberData() {
    if (!this.memberId) return null;
    const members = App.state.members || [];
    return members.find((m) => m.id == this.memberId);
  },

  open() {
    const panel = document.getElementById("cartPanel");
    if (!panel) {
      this.createCartPanel();
    } else {
      panel.classList.remove("hidden");
    }
    this.loadMembers(); // โหลดสมาชิกใหม่ทุกครั้งที่เปิด
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
            <div class="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl slide-in-right">
                <div class="flex flex-col h-full">
                    <!-- Cart Header -->
                    <div class="p-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-indigo-500 to-purple-600">
                        <h2 class="text-xl font-bold text-white">รายการสั่งซื้อ</h2>
                        <button onclick="Cart.close()" class="text-white p-2 hover:bg-white/20 rounded-lg transition">
                            <i class="fas fa-times text-xl"></i>
                        </button>
                    </div>

                    <!-- Member Selection -->
                    <div class="p-4 border-b border-gray-200 bg-gradient-to-br from-purple-50 to-indigo-50">
                        <label class="text-sm text-gray-700 font-medium">สมาชิก</label>
                        <select id="cartMemberSelect" onchange="Cart.setMember(this.value)" 
                                class="w-full mt-1 p-2 rounded-lg bg-white border border-gray-300 text-gray-800 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition">
                            <option value="">ลูกค้าทั่วไป</option>
                        </select>
                        
                        <!-- Add Member Button -->
                        <button onclick="Cart.showAddMemberQuick()" 
                                class="mt-2 w-full text-sm text-purple-600 hover:text-purple-700 font-medium">
                            <i class="fas fa-user-plus mr-1"></i>เพิ่มสมาชิกใหม่
                        </button>
                        
                        <!-- Member Points Info -->
                        <div id="memberPointsInfo" class="hidden mt-2 p-2 bg-white rounded-lg shadow-sm">
                            <div class="text-xs text-gray-600">แต้มสะสม: <span id="memberPoints" class="font-semibold text-purple-600">0</span> แต้ม</div>
                            
                            <!-- Use Points Section -->
                            <div class="flex items-center gap-2 mt-2">
                                <input type="number" id="pointsToUse" placeholder="0" min="0" 
                                       class="flex-1 px-2 py-1 text-sm rounded border border-gray-300 focus:border-purple-500"
                                       onchange="Cart.usePoints(parseInt(this.value) || 0)">
                                <button onclick="Cart.useMaxPoints()" 
                                        class="text-xs bg-purple-500 hover:bg-purple-600 text-white px-2 py-1 rounded">
                                    ใช้ทั้งหมด
                                </button>
                            </div>
                            <div class="text-xs text-gray-500 mt-1">1 แต้ม = 1 บาท</div>
                        </div>
                    </div>

                    <!-- Cart Items -->
                    <div class="flex-1 overflow-y-auto p-4 bg-gradient-to-br from-gray-50 to-gray-100" id="cartItemsContainer">
                        <!-- Items will be rendered here -->
                    </div>

                    <!-- Cart Summary -->
                    <div class="bg-white p-4 border-t border-gray-200 shadow-lg">
                        <div class="space-y-2 mb-4">
                            <!-- Discount Input -->
                            <div class="flex items-center justify-between">
                                <span class="text-gray-700 font-medium">ส่วนลด (%)</span>
                                <div class="flex items-center gap-2">
                                    <input type="number" id="discountInput" 
                                           placeholder="0" min="0" max="100"
                                           value="${this.discount || ""}"
                                           onchange="Cart.setDiscount(this.value)"
                                           class="w-16 px-2 py-1 rounded bg-gray-100 border border-gray-300 text-sm text-right text-gray-800 focus:border-purple-500 focus:ring-2 focus:ring-purple-200">
                                    <span class="text-gray-600">%</span>
                                </div>
                            </div>
                            
                            <!-- Summary Lines -->
                            <div class="flex justify-between text-gray-700">
                                <span>รวม</span>
                                <span id="cartSubtotal" class="font-medium">฿0.00</span>
                            </div>
                            <div class="flex justify-between text-gray-700">
                                <span>ส่วนลด</span>
                                <span id="cartDiscountAmount" class="text-green-600 font-medium">-฿0.00</span>
                            </div>
                            <!-- Points Used Display -->
                            <div id="pointsUsedDisplay" class="hidden flex justify-between text-purple-600">
                                <span>ใช้แต้ม</span>
                                <span id="cartPointsUsed" class="font-medium">-฿0.00</span>
                            </div>
                            <div class="flex justify-between text-xl font-bold text-gray-900 pt-2 border-t border-gray-200">
                                <span>ยอดสุทธิ</span>
                                <span id="cartTotal" class="text-purple-600">฿0.00</span>
                            </div>
                        </div>
                        
                        <!-- Action Buttons -->
                        <div class="grid grid-cols-2 gap-3">
                            <button onclick="Cart.clear()" class="btn-danger py-3 rounded-lg font-medium shadow">
                                <i class="fas fa-trash mr-2"></i>ล้าง
                            </button>
                            <button onclick="Cart.checkout()" class="btn-success py-3 rounded-lg font-medium shadow-lg">
                                <i class="fas fa-check mr-2"></i>ชำระเงิน
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

    document.getElementById("cartPanelContainer").appendChild(panel);

    // Load members after creating panel
    setTimeout(() => {
      this.loadMembers();
    }, 100);
  },

  loadMembers() {
    console.log("Loading members...");
    const select = document.getElementById("cartMemberSelect");
    if (!select) {
      console.error("Member select not found");
      return;
    }

    const members = App.state.members || [];
    console.log("Found members:", members);

    // Clear existing options
    select.innerHTML = '<option value="">ลูกค้าทั่วไป</option>';

    // Add member options
    members.forEach((member) => {
      const option = document.createElement("option");
      option.value = member.id;
      option.textContent = `${member.name} (${member.phone})`;
      select.appendChild(option);
    });

    // Set selected member
    if (this.memberId) {
      select.value = this.memberId;
    }

    // Update member info display
    this.updateMemberDisplay();
  },

  // Show quick add member form
  showAddMemberQuick() {
    const content = `
      <div class="p-6">
        <h3 class="text-xl font-bold text-gray-800 mb-4">เพิ่มสมาชิกใหม่</h3>
        
        <form onsubmit="Cart.saveQuickMember(event)">
          <div class="space-y-4">
            <div>
              <label class="text-gray-700 text-sm font-medium">ชื่อ-นามสกุล *</label>
              <input type="text" id="quickMemberName" required
                     class="w-full mt-1 p-2 rounded-lg border border-gray-300 text-gray-800 focus:border-purple-500 focus:ring-2 focus:ring-purple-200">
            </div>
            
            <div>
              <label class="text-gray-700 text-sm font-medium">เบอร์โทร *</label>
              <input type="tel" id="quickMemberPhone" required pattern="[0-9]{10}"
                     class="w-full mt-1 p-2 rounded-lg border border-gray-300 text-gray-800 focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
                     placeholder="0812345678">
            </div>
          </div>
          
          <div class="flex gap-3 mt-6">
            <button type="button" onclick="Utils.closeModal(this.closest('.fixed'))"
                    class="flex-1 bg-gray-200 hover:bg-gray-300 py-2 rounded-lg text-gray-800">
              ยกเลิก
            </button>
            <button type="submit"
                    class="flex-1 btn-primary py-2 rounded-lg text-white">
              เพิ่ม
            </button>
          </div>
        </form>
      </div>
    `;

    Utils.createModal(content, { size: "w-full max-w-md" });
  },

  // Save quick member
  saveQuickMember(event) {
    event.preventDefault();

    const memberData = {
      id: Date.now(),
      name: document.getElementById("quickMemberName").value.trim(),
      phone: document.getElementById("quickMemberPhone").value.trim(),
      joinDate: new Date().toISOString(),
      points: 0,
      totalPurchase: 0,
    };

    // Validate phone
    if (!Utils.validatePhone(memberData.phone)) {
      Utils.showToast("เบอร์โทรไม่ถูกต้อง", "error");
      return;
    }

    // Check duplicate phone
    const members = App.state.members || [];
    if (members.find((m) => m.phone === memberData.phone)) {
      Utils.showToast("เบอร์โทรนี้มีอยู่แล้ว", "error");
      return;
    }

    // Add member
    if (!App.state.members) App.state.members = [];
    App.state.members.push(memberData);
    App.saveData();

    // Set as current member
    this.setMember(memberData.id);

    // Reload members list
    this.loadMembers();

    Utils.closeModal(event.target.closest(".fixed"));
    Utils.showToast("เพิ่มสมาชิกสำเร็จ", "success");
  },

  // Update member display
  updateMemberDisplay() {
    const memberInfo = document.getElementById("memberPointsInfo");
    const memberPointsSpan = document.getElementById("memberPoints");

    if (!memberInfo || !memberPointsSpan) return;

    if (this.memberId) {
      const member = this.getMemberData();
      if (member) {
        memberInfo.classList.remove("hidden");
        memberPointsSpan.textContent = member.points || 0;

        // Update points input
        const pointsInput = document.getElementById("pointsToUse");
        if (pointsInput) {
          pointsInput.value = this.pointsUsed;
          pointsInput.max = Math.min(member.points || 0, this.getSubtotal());
        }
      }
    } else {
      memberInfo.classList.add("hidden");
      this.pointsUsed = 0;
    }
  },

  // Use maximum points
  useMaxPoints() {
    if (!this.memberId) return;

    const member = this.getMemberData();
    if (!member) return;

    const maxPoints = Math.min(member.points || 0, this.getSubtotal());
    this.usePoints(maxPoints);

    const pointsInput = document.getElementById("pointsToUse");
    if (pointsInput) {
      pointsInput.value = maxPoints;
    }
  },

  render() {
    const container = document.getElementById("cartItemsContainer");
    if (!container) return;

    container.innerHTML = "";

    if (this.items.length === 0) {
      container.innerHTML = `
                <div class="text-center py-8 text-gray-400">
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
    this.updateMemberDisplay();
  },

  createCartItem(item) {
    const div = document.createElement("div");
    div.className =
      "cart-item bg-white rounded-lg p-3 mb-3 shadow-sm hover:shadow-md transition";
    div.innerHTML = `
            <div class="flex items-center justify-between">
                <div class="flex-1">
                    <div class="font-medium text-gray-800">${item.name}</div>
                    <div class="text-sm text-gray-500">
                        ${Utils.formatCurrency(item.price)} x ${item.quantity}
                    </div>
                </div>
                <div class="flex items-center gap-2">
                    <button onclick="Cart.updateQuantity(${item.id}, ${
      item.quantity - 1
    })" 
                            class="numpad-btn w-8 h-8 rounded flex items-center justify-center hover:bg-gray-200">
                        <i class="fas fa-minus text-sm"></i>
                    </button>
                    <input type="number" value="${item.quantity}" 
                           onchange="Cart.updateQuantity(${
                             item.id
                           }, parseInt(this.value))"
                           class="w-12 text-center bg-gray-100 rounded text-gray-800 border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200">
                    <button onclick="Cart.updateQuantity(${item.id}, ${
      item.quantity + 1
    })" 
                            class="numpad-btn w-8 h-8 rounded flex items-center justify-center hover:bg-gray-200">
                        <i class="fas fa-plus text-sm"></i>
                    </button>
                </div>
                <div class="ml-4 font-bold text-gray-900">
                    ${Utils.formatCurrency(item.price * item.quantity)}
                </div>
                <button onclick="Cart.removeItem(${item.id})" 
                        class="ml-2 text-red-500 hover:text-red-600 hover:bg-red-50 p-2 rounded transition">
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

    // Update discount input if exists
    const discountInput = document.getElementById("discountInput");
    if (discountInput && !discountInput.matches(":focus")) {
      discountInput.value = this.discount || "";
    }

    // Show/hide points used display
    const pointsDisplay = document.getElementById("pointsUsedDisplay");
    const pointsUsedSpan = document.getElementById("cartPointsUsed");

    if (pointsDisplay && pointsUsedSpan) {
      if (this.pointsUsed > 0) {
        pointsDisplay.classList.remove("hidden");
        pointsUsedSpan.textContent = `-${Utils.formatCurrency(
          this.pointsUsed
        )}`;
      } else {
        pointsDisplay.classList.add("hidden");
      }
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
    const member = this.getMemberData();

    return {
      items: this.items,
      subtotal: this.getSubtotal(),
      discount: this.getDiscount(),
      total: this.getTotal(),
      memberId: this.memberId,
      memberName: member ? member.name : null,
      memberPhone: member ? member.phone : null,
      pointsUsed: this.pointsUsed,
    };
  },

  // Clear cart after successful payment
  clearAfterPayment() {
    // Update member points if used
    if (this.memberId && this.pointsUsed > 0) {
      this.deductMemberPoints();
    }

    this.items = [];
    this.discount = 0;
    this.memberId = null;
    this.pointsUsed = 0;
    this.saveCart();
    POS.updateCartDisplay();
  },

  // Deduct points from member
  deductMemberPoints() {
    if (!this.memberId || this.pointsUsed <= 0) return;

    const members = App.state.members || [];
    const member = members.find((m) => m.id == this.memberId);

    if (member) {
      member.points = Math.max(0, (member.points || 0) - this.pointsUsed);
      App.saveData();
    }
  },
};

// Export
window.Cart = Cart;
