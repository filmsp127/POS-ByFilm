// POS Module - Main sales interface
const POS = {
  currentCategory: 1, // เริ่มต้นที่ 1 (ทั้งหมด)
  searchTerm: "",

  init() {
    this.loadCategories();
    this.loadProducts();
    this.setupEventListeners();
  },

  setupEventListeners() {
    // Search functionality
    const searchInput = document.getElementById("searchProduct");
    if (searchInput) {
      searchInput.addEventListener(
        "input",
        Utils.debounce((e) => {
          this.searchTerm = e.target.value.toLowerCase();
          this.loadProducts();
        }, 300)
      );
    }

    // Barcode scanner support
    document.addEventListener("keydown", this.handleBarcodeInput.bind(this));
  },

  loadCategories() {
    const container = document.getElementById("categoryTabs");
    if (!container) return;

    container.innerHTML = "";

    const categories = App.getCategories();

    categories.forEach((cat) => {
      const tab = document.createElement("button");
      tab.className = `category-tab ${
        this.currentCategory === cat.id ? "active" : ""
      }`;
      tab.setAttribute("data-category-id", cat.id);
      tab.onclick = () => this.selectCategory(cat.id);

      // Map icons properly
      const icon = cat.icon || "fa-tag";

      tab.innerHTML = `<i class="fas ${icon} mr-2"></i>${cat.name}`;
      container.appendChild(tab);
    });
  },

  selectCategory(categoryId) {
    this.currentCategory = categoryId;

    // Update active tab
    document.querySelectorAll(".category-tab").forEach((tab) => {
      tab.classList.remove("active");
      if (parseInt(tab.getAttribute("data-category-id")) === categoryId) {
        tab.classList.add("active");
      }
    });

    this.loadProducts();
  },

  loadProducts() {
    const grid = document.getElementById("productsGrid");
    if (!grid) return;

    grid.innerHTML = "";

    let products = App.getProducts();

    // Filter by category - แก้ไขเงื่อนไข
    if (this.currentCategory !== 1) {
      // 1 = ทั้งหมด
      products = products.filter((p) => p.category === this.currentCategory);
    }

    // Filter by search
    if (this.searchTerm) {
      products = products.filter(
        (p) =>
          p.name.toLowerCase().includes(this.searchTerm) ||
          (p.code && p.code.toLowerCase().includes(this.searchTerm)) ||
          (p.barcode && p.barcode.includes(this.searchTerm))
      );
    }

    // Create product cards
    products.forEach((product) => {
      const card = this.createProductCard(product);
      grid.appendChild(card);
    });

    // Show empty state if no products
    if (products.length === 0) {
      grid.innerHTML = `
        <div class="col-span-full text-center py-8 text-gray-500">
          <i class="fas fa-box-open text-4xl mb-2"></i>
          <p>ไม่พบสินค้า${this.currentCategory !== 1 ? "ในหมวดหมู่นี้" : ""}</p>
          ${
            this.currentCategory !== 1
              ? '<p class="text-sm mt-2">ลองเลือกหมวดหมู่อื่น หรือเพิ่มสินค้าในหมวดหมู่นี้</p>'
              : ""
          }
        </div>
      `;
    }
  },

  createProductCard(product) {
    const card = document.createElement("div");
    card.className = "product-card";
    card.onclick = () => this.addToCart(product);

    const stockClass = product.stock < 10 ? "stock-low" : "stock-normal";
    const stockStatus = product.stock <= 0 ? "หมด" : `${product.stock} ชิ้น`;

    // Get category info
    const category = App.getCategories().find((c) => c.id === product.category);
    const categoryName = category ? category.name : "ทั่วไป";

    // Category colors based on ID
    const categoryClass =
      product.category === 2
        ? "category-drink"
        : product.category === 3
        ? "category-food"
        : product.category === 4
        ? "category-dessert"
        : "bg-gray-100 text-gray-700";

    card.innerHTML = `
      <div class="text-center">
        <div class="mb-3 flex items-center justify-center" style="height: 80px;">
          ${
            product.imageType === "url"
              ? `<img src="${product.image}" alt="${product.name}" class="max-h-full max-w-full object-contain rounded shadow-sm" onerror="this.onerror=null; this.parentElement.innerHTML='<div class=\\'text-5xl\\'>📦</div>'">`
              : `<div class="text-5xl">${product.image || "📦"}</div>`
          }
        </div>
        <h4 class="font-medium text-gray-800 mb-1 text-sm line-clamp-2">${
          product.name
        }</h4>
        <div class="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
          ${Utils.formatCurrency(product.price)}
        </div>
        <div class="flex items-center justify-center gap-2">
          <span class="text-xs px-2 py-1 rounded-full ${categoryClass}">
            ${categoryName}
          </span>
          <span class="text-xs ${stockClass} font-medium">
            ${stockStatus}
          </span>
        </div>
      </div>
    `;

    // Disable if out of stock
    if (product.stock <= 0) {
      card.classList.add("opacity-50", "cursor-not-allowed");
      card.onclick = () => Utils.showToast("สินค้าหมด", "error");
    }

    return card;
  },

  addToCart(product) {
    // Check if shift is open (เพิ่มโค้ดนี้)
  if (window.ShiftManager && !ShiftManager.isShiftOpen()) {
    Utils.showToast("กรุณาเปิดรอบก่อนทำการขาย", "error");
    return;
  }
    if (product.stock <= 0) {
      Utils.showToast("สินค้าหมด", "error");
      return;
    }

    const added = Cart.addItem(product);
    if (added) {
      Utils.showToast(`เพิ่ม ${product.name}`, "success");
      Utils.vibrate();

      // Update display
      this.updateCartDisplay();

      // Animate cart icon
      this.animateCartIcon();

      // Update stock display
      this.updateProductDisplay(product.id);
    }
  },

  updateProductDisplay(productId) {
    // Reload products to update stock display
    const product = App.getProductById(productId);
    if (product && product.stock < 10) {
      // If stock is low, reload to update display
      this.loadProducts();
    }
  },

  updateCartDisplay() {
    const cartCount = Cart.getItemCount();
    const total = Cart.getTotal();

    const cartCountEl = document.getElementById("cartCount");
    const totalDisplayEl = document.getElementById("totalDisplay");

    if (cartCountEl) {
      cartCountEl.textContent = cartCount;
      cartCountEl.style.display = cartCount > 0 ? "flex" : "none";
    }

    if (totalDisplayEl) {
      totalDisplayEl.textContent = Utils.formatCurrency(total);
    }
  },

  animateCartIcon() {
    const cartIcon = document.querySelector('[onclick="Cart.open()"]');
    if (cartIcon) {
      cartIcon.classList.add("pulse");
      setTimeout(() => cartIcon.classList.remove("pulse"), 500);
    }
  },

  // Barcode scanner input handler
  barcodeBuffer: "",
  barcodeTimeout: null,

  handleBarcodeInput(e) {
    // Skip if typing in input field
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") {
      return;
    }

    // Check if input is from barcode scanner (rapid input)
    if (e.key === "Enter" && this.barcodeBuffer.length > 0) {
      this.processBarcode(this.barcodeBuffer);
      this.barcodeBuffer = "";
      return;
    }

    // Accumulate input
    if (e.key.length === 1) {
      this.barcodeBuffer += e.key;

      // Clear buffer after timeout
      clearTimeout(this.barcodeTimeout);
      this.barcodeTimeout = setTimeout(() => {
        this.barcodeBuffer = "";
      }, 100);
    }
  },

  processBarcode(barcode) {
    const product = App.getProducts().find((p) => p.barcode === barcode);
    if (product) {
      this.addToCart(product);
    } else {
      Utils.showToast(`ไม่พบสินค้าบาร์โค้ด: ${barcode}`, "error");
    }
  },

  // Quick sale functions
  quickSale(amount) {
    const customProduct = {
      id: "quick_" + Date.now(),
      name: "ขายด่วน",
      price: amount,
      category: 0,
      image: "💰",
      stock: 999,
    };

    Cart.addItem(customProduct, 1, false);
    Cart.open();
  },

  // Refresh products display
  refresh() {
    // Reload categories in case they changed
    this.loadCategories();

    // Reload products
    this.loadProducts();

    // Update cart display
    this.updateCartDisplay();
  },

  // Search products
  searchProducts(keyword) {
    this.searchTerm = keyword.toLowerCase();
    this.loadProducts();
  },

  // Clear search
  clearSearch() {
    this.searchTerm = "";
    const searchInput = document.getElementById("searchProduct");
    if (searchInput) {
      searchInput.value = "";
    }
    this.loadProducts();
  },

  // Show category products count
  getCategoryProductsCount(categoryId) {
    const products = App.getProducts();
    if (categoryId === 1) {
      return products.length;
    }
    return products.filter((p) => p.category === categoryId).length;
  },

  // Update category badge
  updateCategoryBadges() {
    document.querySelectorAll(".category-tab").forEach((tab) => {
      const categoryId = parseInt(tab.getAttribute("data-category-id"));
      const count = this.getCategoryProductsCount(categoryId);

      // Find or create badge
      let badge = tab.querySelector(".category-badge");
      if (!badge) {
        badge = document.createElement("span");
        badge.className = "category-badge ml-1 text-xs";
        tab.appendChild(badge);
      }

      badge.textContent = `(${count})`;
    });
  },

  // Check if product is in current view
  isProductInCurrentView(product) {
    if (this.currentCategory === 1) {
      return true; // Show all products
    }
    return product.category === this.currentCategory;
  },

  // Handle product updates
  onProductUpdate(productId) {
    const product = App.getProductById(productId);
    if (product && this.isProductInCurrentView(product)) {
      this.loadProducts();
    }
  },

  // Handle category updates
  onCategoryUpdate() {
    this.loadCategories();
    this.loadProducts();
  },
};

// Export
window.POS = POS;
