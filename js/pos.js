// POS Module - Main sales interface
const POS = {
  currentCategory: "all",
  searchTerm: "",

  init() {
    this.loadCategories();
    this.loadProducts();
    this.setupEventListeners();
  },

  setupEventListeners() {
    // Search functionality (if added)
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
    container.innerHTML = "";

    const categories = App.getCategories();

    categories.forEach((cat) => {
      const tab = document.createElement("button");
      tab.className = `category-tab ${
        (this.currentCategory === "all" && cat.id === 1) ||
        this.currentCategory === cat.id
          ? "active"
          : ""
      }`;
      tab.onclick = () => this.selectCategory(cat.id);

      const iconMap = {
        "fa-th": "fa-border-all",
        "fa-coffee": "fa-mug-hot",
        "fa-utensils": "fa-utensils",
        "fa-ice-cream": "fa-ice-cream",
      };

      const icon = iconMap[cat.icon] || cat.icon;

      tab.innerHTML = `<i class="fas ${icon} mr-2"></i>${cat.name}`;
      container.appendChild(tab);
    });
  },

  selectCategory(categoryId) {
    this.currentCategory = categoryId;

    // Update active tab
    document.querySelectorAll(".category-tab").forEach((tab) => {
      tab.classList.remove("active");
    });
    event.target.closest(".category-tab").classList.add("active");

    this.loadProducts();
  },

  loadProducts() {
    const grid = document.getElementById("productsGrid");
    grid.innerHTML = "";

    let products = App.getProducts();

    // Filter by category
    if (this.currentCategory !== 1 && this.currentCategory !== "all") {
      products = products.filter((p) => p.category === this.currentCategory);
    }

    // Filter by search
    if (this.searchTerm) {
      products = products.filter(
        (p) =>
          p.name.toLowerCase().includes(this.searchTerm) ||
          p.code?.toLowerCase().includes(this.searchTerm)
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
                <div class="col-span-full text-center py-8 text-white/50">
                    <i class="fas fa-box-open text-4xl mb-2"></i>
                    <p>ไม่พบสินค้า</p>
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

    // Category colors
    const categoryClass =
      product.category === 2
        ? "category-drink"
        : product.category === 3
        ? "category-food"
        : "category-dessert";

    card.innerHTML = `
            <div class="text-center">
                <div class="text-5xl mb-3">${product.image || "📦"}</div>
                <h4 class="font-medium text-gray-800 mb-1 text-sm">${
                  product.name
                }</h4>
                <div class="text-2xl font-bold text-gray-900 mb-2">${Utils.formatCurrency(
                  product.price
                )}</div>
                <div class="flex items-center justify-center gap-2">
                    <span class="text-xs px-2 py-1 rounded-full ${categoryClass}">
                        ${
                          product.category === 2
                            ? "เครื่องดื่ม"
                            : product.category === 3
                            ? "อาหาร"
                            : "ของหวาน"
                        }
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
    }
  },

  updateCartDisplay() {
    const cartCount = Cart.getItemCount();
    const total = Cart.getTotal();

    document.getElementById("cartCount").textContent = cartCount;
    document.getElementById("totalDisplay").textContent =
      Utils.formatCurrency(total);
  },

  animateCartIcon() {
    const cartIcon = document.querySelector('[onclick="Cart.open()"]');
    cartIcon.classList.add("pulse");
    setTimeout(() => cartIcon.classList.remove("pulse"), 500);
  },

  // Barcode scanner input handler
  barcodeBuffer: "",
  barcodeTimeout: null,

  handleBarcodeInput(e) {
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
      Utils.showToast("ไม่พบสินค้า", "error");
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
    this.loadProducts();
    this.updateCartDisplay();
  },
};
