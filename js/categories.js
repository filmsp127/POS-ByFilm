// Categories Management Module
const Categories = {
  // Default categories
  defaults: [
    {
      id: 1,
      name: "ทั้งหมด",
      icon: "fa-border-all",
      color: "purple",
      protected: true,
    },
    {
      id: 2,
      name: "เครื่องดื่ม",
      icon: "fa-mug-hot",
      color: "blue",
      protected: false,
    },
    {
      id: 3,
      name: "อาหาร",
      icon: "fa-utensils",
      color: "green",
      protected: false,
    },
    {
      id: 4,
      name: "ของหวาน",
      icon: "fa-ice-cream",
      color: "pink",
      protected: false,
    },
  ],

  // Available icons for categories
  availableIcons: [
    { icon: "fa-mug-hot", name: "เครื่องดื่ม" },
    { icon: "fa-coffee", name: "กาแฟ" },
    { icon: "fa-wine-glass", name: "เครื่องดื่มแอลกอฮอล์" },
    { icon: "fa-beer", name: "เบียร์" },
    { icon: "fa-utensils", name: "อาหาร" },
    { icon: "fa-hamburger", name: "ฟาสต์ฟู้ด" },
    { icon: "fa-pizza-slice", name: "พิซซ่า" },
    { icon: "fa-hotdog", name: "ฮอทดอก" },
    { icon: "fa-ice-cream", name: "ไอศกรีม" },
    { icon: "fa-birthday-cake", name: "เค้ก" },
    { icon: "fa-cookie", name: "คุกกี้" },
    { icon: "fa-candy-cane", name: "ลูกอม" },
    { icon: "fa-apple-alt", name: "ผลไม้" },
    { icon: "fa-carrot", name: "ผัก" },
    { icon: "fa-cheese", name: "ชีส" },
    { icon: "fa-bread-slice", name: "ขนมปัง" },
    { icon: "fa-bacon", name: "เบคอน" },
    { icon: "fa-egg", name: "ไข่" },
    { icon: "fa-fish", name: "ปลา" },
    { icon: "fa-drumstick-bite", name: "ไก่" },
  ],

  // Available colors
  availableColors: [
    { value: "red", name: "แดง", hex: "#ef4444" },
    { value: "orange", name: "ส้ม", hex: "#f97316" },
    { value: "amber", name: "เหลืองอำพัน", hex: "#f59e0b" },
    { value: "yellow", name: "เหลือง", hex: "#eab308" },
    { value: "lime", name: "เขียวมะนาว", hex: "#84cc16" },
    { value: "green", name: "เขียว", hex: "#22c55e" },
    { value: "emerald", name: "เขียวมรกต", hex: "#10b981" },
    { value: "teal", name: "เขียวน้ำทะเล", hex: "#14b8a6" },
    { value: "cyan", name: "ฟ้าน้ำทะเล", hex: "#06b6d4" },
    { value: "sky", name: "ฟ้า", hex: "#0ea5e9" },
    { value: "blue", name: "น้ำเงิน", hex: "#3b82f6" },
    { value: "indigo", name: "คราม", hex: "#6366f1" },
    { value: "violet", name: "ม่วงอ่อน", hex: "#8b5cf6" },
    { value: "purple", name: "ม่วง", hex: "#a855f7" },
    { value: "fuchsia", name: "บานเย็น", hex: "#d946ef" },
    { value: "pink", name: "ชมพู", hex: "#ec4899" },
    { value: "rose", name: "กุหลาบ", hex: "#f43f5e" },
  ],

  // Get all categories
  getAll() {
    return App.getCategories();
  },

  // Get category by ID
  getById(id) {
    return this.getAll().find((cat) => cat.id === id);
  },

  // Create new category
  create(categoryData) {
    const categories = this.getAll();

    // Generate new ID
    const newId = Math.max(...categories.map((c) => c.id)) + 1;

    const newCategory = {
      id: newId,
      name: categoryData.name,
      icon: categoryData.icon || "fa-tag",
      color: categoryData.color || "gray",
      protected: false,
      createdAt: Date.now(),
    };

    // Add to state
    App.state.categories.push(newCategory);
    App.saveData();

    Utils.showToast(`เพิ่มหมวดหมู่ "${newCategory.name}" สำเร็จ`, "success");
    return newCategory;
  },

  // Update category
  update(id, updates) {
    const categories = this.getAll();
    const index = categories.findIndex((cat) => cat.id === id);

    if (index === -1) {
      Utils.showToast("ไม่พบหมวดหมู่ที่ต้องการแก้ไข", "error");
      return false;
    }

    const category = categories[index];

    // Check if protected
    if (category.protected) {
      Utils.showToast("ไม่สามารถแก้ไขหมวดหมู่นี้ได้", "error");
      return false;
    }

    // Update category
    categories[index] = {
      ...category,
      ...updates,
      updatedAt: Date.now(),
    };

    App.saveData();
    Utils.showToast(`แก้ไขหมวดหมู่ "${category.name}" สำเร็จ`, "success");
    return categories[index];
  },

  // Delete category
  delete(id) {
    const categories = this.getAll();
    const category = this.getById(id);

    if (!category) {
      Utils.showToast("ไม่พบหมวดหมู่ที่ต้องการลบ", "error");
      return false;
    }

    // Check if protected
    if (category.protected) {
      Utils.showToast("ไม่สามารถลบหมวดหมู่นี้ได้", "error");
      return false;
    }

    // Check if has products
    const productsInCategory = App.getProducts().filter(
      (p) => p.category === id
    );
    if (productsInCategory.length > 0) {
      Utils.showToast(
        `ไม่สามารถลบได้ เนื่องจากมีสินค้า ${productsInCategory.length} รายการในหมวดหมู่นี้`,
        "error"
      );
      return false;
    }

    // Confirm deletion
    Utils.confirm(`ต้องการลบหมวดหมู่ "${category.name}" ใช่หรือไม่?`, () => {
      // Remove from state
      App.state.categories = categories.filter((cat) => cat.id !== id);
      App.saveData();

      Utils.showToast(`ลบหมวดหมู่ "${category.name}" สำเร็จ`, "success");

      // Refresh UI if on categories page
      if (BackOffice.currentPage === "categories") {
        BackOffice.loadCategoriesList();
      }
    });
  },

  // Get products count by category
  getProductsCount(categoryId) {
    return App.getProducts().filter((p) => p.category === categoryId).length;
  },

  // Get category statistics
  getStatistics() {
    const categories = this.getAll();
    const products = App.getProducts();
    const sales = App.getSales();

    return categories.map((category) => {
      const categoryProducts = products.filter(
        (p) => p.category === category.id
      );
      const productIds = categoryProducts.map((p) => p.id);

      // Calculate sales for this category
      let totalSales = 0;
      let totalQuantity = 0;

      sales.forEach((sale) => {
        sale.items.forEach((item) => {
          if (productIds.includes(item.id)) {
            totalSales += item.price * item.quantity;
            totalQuantity += item.quantity;
          }
        });
      });

      return {
        id: category.id,
        name: category.name,
        icon: category.icon,
        color: category.color,
        productsCount: categoryProducts.length,
        totalSales: totalSales,
        totalQuantity: totalQuantity,
        averagePrice:
          categoryProducts.length > 0
            ? categoryProducts.reduce((sum, p) => sum + p.price, 0) /
              categoryProducts.length
            : 0,
      };
    });
  },

  // Validate category data
  validate(categoryData) {
    const errors = [];

    if (!categoryData.name || categoryData.name.trim() === "") {
      errors.push("กรุณาระบุชื่อหมวดหมู่");
    }

    if (categoryData.name && categoryData.name.length > 50) {
      errors.push("ชื่อหมวดหมู่ต้องไม่เกิน 50 ตัวอักษร");
    }

    // Check duplicate name
    const existingCategory = this.getAll().find(
      (cat) => cat.name === categoryData.name && cat.id !== categoryData.id
    );
    if (existingCategory) {
      errors.push("ชื่อหมวดหมู่นี้มีอยู่แล้ว");
    }

    return {
      valid: errors.length === 0,
      errors: errors,
    };
  },

  // Create category modal
  showAddCategoryModal() {
    const content = `
        <div class="p-6">
          <h3 class="text-xl font-bold text-gray-800 mb-4">เพิ่มหมวดหมู่ใหม่</h3>
          
          <form onsubmit="Categories.handleAddCategory(event)">
            <div class="space-y-4">
              <div>
                <label class="text-gray-700 text-sm font-medium">ชื่อหมวดหมู่ *</label>
                <input type="text" id="categoryName" required
                       class="w-full mt-1 p-2 rounded-lg border border-gray-300 text-gray-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                       placeholder="เช่น เครื่องดื่มร้อน">
              </div>
              
              <div>
                <label class="text-gray-700 text-sm font-medium">ไอคอน</label>
                <div class="grid grid-cols-6 gap-2 mt-2 max-h-48 overflow-y-auto p-2 border border-gray-200 rounded-lg">
                  ${this.availableIcons
                    .map(
                      (item) => `
                    <button type="button" 
                            onclick="Categories.selectIcon('${item.icon}', this)"
                            class="icon-option p-3 rounded-lg hover:bg-gray-100 text-gray-600 transition"
                            title="${item.name}">
                      <i class="fas ${item.icon} text-xl"></i>
                    </button>
                  `
                    )
                    .join("")}
                </div>
                <input type="hidden" id="categoryIcon" value="fa-tag">
              </div>
              
              <div>
                <label class="text-gray-700 text-sm font-medium">สี</label>
                <div class="grid grid-cols-6 gap-2 mt-2">
                  ${this.availableColors
                    .map(
                      (color) => `
                    <button type="button"
                            onclick="Categories.selectColor('${color.value}', this)"
                            class="color-option p-3 rounded-lg transition hover:scale-110"
                            style="background-color: ${color.hex};"
                            title="${color.name}">
                    </button>
                  `
                    )
                    .join("")}
                </div>
                <input type="hidden" id="categoryColor" value="gray">
              </div>
            </div>
            
            <div class="flex gap-3 mt-6">
              <button type="button" onclick="Utils.closeModal(this.closest('.fixed'))"
                      class="flex-1 bg-gray-200 hover:bg-gray-300 py-2 rounded-lg text-gray-800 transition">
                ยกเลิก
              </button>
              <button type="submit"
                      class="flex-1 btn-primary py-2 rounded-lg text-white">
                เพิ่มหมวดหมู่
              </button>
            </div>
          </form>
        </div>
      `;

    Utils.createModal(content, { size: "w-full max-w-lg" });
  },

  // Handle icon selection
  selectIcon(icon, button) {
    // Remove active state from all icons
    document.querySelectorAll(".icon-option").forEach((btn) => {
      btn.classList.remove(
        "bg-blue-100",
        "text-blue-600",
        "ring-2",
        "ring-blue-500"
      );
    });

    // Add active state to selected icon
    button.classList.add(
      "bg-blue-100",
      "text-blue-600",
      "ring-2",
      "ring-blue-500"
    );

    // Update hidden input
    document.getElementById("categoryIcon").value = icon;
  },

  // Handle color selection
  selectColor(color, button) {
    // Remove active state from all colors
    document.querySelectorAll(".color-option").forEach((btn) => {
      btn.classList.remove("ring-4", "ring-gray-400", "ring-offset-2");
    });

    // Add active state to selected color
    button.classList.add("ring-4", "ring-gray-400", "ring-offset-2");

    // Update hidden input
    document.getElementById("categoryColor").value = color;
  },

  // Handle add category form submission
  handleAddCategory(event) {
    event.preventDefault();

    const categoryData = {
      name: document.getElementById("categoryName").value.trim(),
      icon: document.getElementById("categoryIcon").value,
      color: document.getElementById("categoryColor").value,
    };

    // Validate
    const validation = this.validate(categoryData);
    if (!validation.valid) {
      Utils.showToast(validation.errors[0], "error");
      return;
    }

    // Create category
    this.create(categoryData);

    // Close modal
    Utils.closeModal(event.target.closest(".fixed"));

    // Refresh categories list if on categories page
    if (BackOffice.currentPage === "categories") {
      BackOffice.loadCategoriesList();
    }

    // Refresh POS categories
    POS.loadCategories();

    // Refresh products display to show new category
    POS.loadProducts();
  },

  // Export categories
  export() {
    const categories = this.getAll();
    const data = categories.map((cat) => ({
      name: cat.name,
      icon: cat.icon,
      color: cat.color,
      productsCount: this.getProductsCount(cat.id),
    }));

    Utils.exportToCSV(
      data,
      `categories-${new Date().toISOString().split("T")[0]}.csv`
    );
  },
};
