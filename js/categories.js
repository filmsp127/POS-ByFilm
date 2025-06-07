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

  // Available icons for categories - เพิ่มไอคอนให้ครอบคลุมมากขึ้น
  availableIcons: [
    // เครื่องดื่ม
    { icon: "fa-mug-hot", name: "เครื่องดื่มร้อน" },
    { icon: "fa-coffee", name: "กาแฟ" },
    { icon: "fa-mug-saucer", name: "ชา" },
    { icon: "fa-glass-water", name: "น้ำเปล่า" },
    { icon: "fa-bottle-water", name: "น้ำดื่ม" },
    { icon: "fa-wine-glass", name: "ไวน์" },
    { icon: "fa-beer", name: "เบียร์" },
    { icon: "fa-martini-glass", name: "ค็อกเทล" },
    { icon: "fa-champagne-glasses", name: "แชมเปญ" },
    { icon: "fa-whiskey-glass", name: "วิสกี้" },
    { icon: "fa-blender", name: "น้ำปั่น" },
    { icon: "fa-glass-water-droplet", name: "น้ำผลไม้" },
    
    // อาหาร
    { icon: "fa-utensils", name: "อาหารทั่วไป" },
    { icon: "fa-burger", name: "เบอร์เกอร์" },
    { icon: "fa-pizza-slice", name: "พิซซ่า" },
    { icon: "fa-hotdog", name: "ฮอทดอก" },
    { icon: "fa-bowl-rice", name: "ข้าว" },
    { icon: "fa-bowl-food", name: "ก๋วยเตี๋ยว" },
    { icon: "fa-bacon", name: "เบคอน" },
    { icon: "fa-drumstick-bite", name: "ไก่" },
    { icon: "fa-fish", name: "ปลา" },
    { icon: "fa-shrimp", name: "กุ้ง" },
    { icon: "fa-egg", name: "ไข่" },
    { icon: "fa-cheese", name: "ชีส" },
    { icon: "fa-bread-slice", name: "ขนมปัง" },
    { icon: "fa-plate-wheat", name: "พาสต้า" },
    
    // ของหวาน/ขนม
    { icon: "fa-ice-cream", name: "ไอศกรีม" },
    { icon: "fa-cake-candles", name: "เค้ก" },
    { icon: "fa-cookie", name: "คุกกี้" },
    { icon: "fa-candy-cane", name: "ลูกอม" },
    { icon: "fa-stroopwafel", name: "วาฟเฟิล" },
    { icon: "fa-cookie-bite", name: "ขนมกรุบกรอบ" },
    
    // ผลไม้/ผัก
    { icon: "fa-apple-whole", name: "แอปเปิ้ล" },
    { icon: "fa-lemon", name: "มะนาว" },
    { icon: "fa-carrot", name: "แครอท" },
    { icon: "fa-pepper-hot", name: "พริก" },
    { icon: "fa-seedling", name: "ผักสด" },
    
    // สินค้าทั่วไป
    { icon: "fa-shopping-basket", name: "สินค้าทั่วไป" },
    { icon: "fa-box", name: "สินค้าบรรจุกล่อง" },
    { icon: "fa-jar", name: "สินค้าบรรจุขวด" },
    { icon: "fa-bottle-droplet", name: "เครื่องสำอาง" },
    { icon: "fa-soap", name: "สบู่" },
    { icon: "fa-spray-can-sparkles", name: "สเปรย์" },
    { icon: "fa-pills", name: "ยา" },
    { icon: "fa-syringe", name: "วัคซีน" },
    { icon: "fa-tooth", name: "ทันตกรรม" },
    
    // เสื้อผ้า/แฟชั่น
    { icon: "fa-shirt", name: "เสื้อ" },
    { icon: "fa-user-tie", name: "เสื้อผ้าทางการ" },
    { icon: "fa-vest", name: "เสื้อกั๊ก" },
    { icon: "fa-socks", name: "ถุงเท้า" },
    { icon: "fa-glasses", name: "แว่นตา" },
    { icon: "fa-hat-cowboy", name: "หมวก" },
    { icon: "fa-shoe-prints", name: "รองเท้า" },
    { icon: "fa-bag-shopping", name: "กระเป๋า" },
    { icon: "fa-gem", name: "เครื่องประดับ" },
    { icon: "fa-ring", name: "แหวน" },
    
    // อุปกรณ์/เครื่องมือ
    { icon: "fa-wrench", name: "เครื่องมือ" },
    { icon: "fa-hammer", name: "ค้อน" },
    { icon: "fa-screwdriver", name: "ไขควง" },
    { icon: "fa-toolbox", name: "กล่องเครื่องมือ" },
    { icon: "fa-paint-roller", name: "อุปกรณ์ทาสี" },
    { icon: "fa-brush", name: "แปรง" },
    
    // อิเล็กทรอนิกส์
    { icon: "fa-mobile-screen", name: "โทรศัพท์" },
    { icon: "fa-laptop", name: "คอมพิวเตอร์" },
    { icon: "fa-desktop", name: "คอมพิวเตอร์ตั้งโต๊ะ" },
    { icon: "fa-tablet-screen-button", name: "แท็บเล็ต" },
    { icon: "fa-headphones", name: "หูฟัง" },
    { icon: "fa-camera", name: "กล้อง" },
    { icon: "fa-tv", name: "ทีวี" },
    { icon: "fa-gamepad", name: "เกม" },
    { icon: "fa-keyboard", name: "คีย์บอร์ด" },
    { icon: "fa-computer-mouse", name: "เมาส์" },
    
    // บริการ
    { icon: "fa-scissors", name: "ตัดผม" },
    { icon: "fa-spa", name: "สปา" },
    { icon: "fa-dumbbell", name: "ฟิตเนส" },
    { icon: "fa-car", name: "ยานยนต์" },
    { icon: "fa-motorcycle", name: "มอเตอร์ไซค์" },
    { icon: "fa-bicycle", name: "จักรยาน" },
    { icon: "fa-gas-pump", name: "น้ำมัน" },
    
    // หนังสือ/การศึกษา
    { icon: "fa-book", name: "หนังสือ" },
    { icon: "fa-graduation-cap", name: "การศึกษา" },
    { icon: "fa-pencil", name: "เครื่องเขียน" },
    { icon: "fa-palette", name: "ศิลปะ" },
    { icon: "fa-music", name: "ดนตรี" },
    
    // สุขภาพ
    { icon: "fa-heart-pulse", name: "สุขภาพ" },
    { icon: "fa-stethoscope", name: "การแพทย์" },
    { icon: "fa-wheelchair", name: "ผู้พิการ" },
    { icon: "fa-baby", name: "เด็กอ่อน" },
    { icon: "fa-person-cane", name: "ผู้สูงอายุ" },
    
    // อื่นๆ
    { icon: "fa-gift", name: "ของขวัญ" },
    { icon: "fa-tag", name: "ป้ายราคา" },
    { icon: "fa-tags", name: "หมวดหมู่" },
    { icon: "fa-star", name: "พิเศษ" },
    { icon: "fa-fire", name: "ยอดนิยม" },
    { icon: "fa-bolt", name: "โปรโมชั่น" },
    { icon: "fa-percent", name: "ส่วนลด" },
    { icon: "fa-certificate", name: "คูปอง" },
    { icon: "fa-ticket", name: "ตั๋ว" },
    { icon: "fa-calendar", name: "กิจกรรม" }
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
  async create(categoryData) {
    const categories = this.getAll();

    // Generate new ID - ต้องแน่ใจว่า ID ไม่ซ้ำ
    const existingIds = categories.map(c => c.id);
    let newId = Math.max(...existingIds) + 1;
    
    // ตรวจสอบ ID ซ้ำ
    while (existingIds.includes(newId)) {
      newId++;
    }

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
    
    // Save to localStorage first
    App.saveData(true); // Skip Firebase sync in saveData

    // Sync to Firebase directly
    if (
      window.FirebaseService &&
      FirebaseService.isAuthenticated() &&
      FirebaseService.currentStore
    ) {
      try {
        const storeId = FirebaseService.currentStore.id;
        await FirebaseService.db
          .collection("stores")
          .doc(storeId)
          .collection("categories")
          .doc(newCategory.id.toString())
          .set({
            ...newCategory,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            storeId: storeId
          });
        console.log("✅ Category synced to Firebase:", newCategory.name);
      } catch (error) {
        console.error("Error syncing category to Firebase:", error);
        // Queue for later sync if offline
        if (window.SyncManager) {
          SyncManager.queueOperation('category', newCategory);
        }
      }
    }

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
        <div class="modal-with-footer h-full flex flex-col">
          <div class="modal-header bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-4">
            <h3 class="text-xl font-bold">เพิ่มหมวดหมู่ใหม่</h3>
          </div>
          
          <div class="modal-body">
            <form onsubmit="Categories.handleAddCategory(event)" id="categoryForm">
              <div class="space-y-4">
                <div>
                  <label class="text-gray-700 text-sm font-medium">ชื่อหมวดหมู่ *</label>
                  <input type="text" id="categoryName" required
                         class="w-full mt-1 p-2 rounded-lg border border-gray-300 text-gray-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                         placeholder="เช่น เครื่องดื่มร้อน">
                </div>
                
                <div>
                  <label class="text-gray-700 text-sm font-medium">ไอคอน</label>
                  
                  <!-- Search Icon -->
                  <input type="text" id="iconSearch" placeholder="ค้นหาไอคอน..." 
                         onkeyup="Categories.filterIcons(this.value)"
                         class="w-full mt-1 mb-2 p-2 rounded-lg border border-gray-300 text-gray-800 text-sm">
                  
                  <!-- Icon Categories -->
                  <div class="mb-2">
                    <select id="iconCategory" onchange="Categories.filterIconsByCategory(this.value)"
                            class="w-full p-2 rounded-lg border border-gray-300 text-gray-800 text-sm">
                      <option value="">ทั้งหมด</option>
                      <option value="food">อาหาร/เครื่องดื่ม</option>
                      <option value="product">สินค้าทั่วไป</option>
                      <option value="fashion">แฟชั่น</option>
                      <option value="electronic">อิเล็กทรอนิกส์</option>
                      <option value="service">บริการ</option>
                      <option value="health">สุขภาพ</option>
                      <option value="other">อื่นๆ</option>
                    </select>
                  </div>
                  
                  <div class="grid grid-cols-6 gap-2 max-h-64 overflow-y-auto p-2 border border-gray-200 rounded-lg" id="iconGrid">
                    ${this.availableIcons
                      .map(
                        (item, index) => `
                      <button type="button" 
                              onclick="Categories.selectIcon('${item.icon}', this)"
                              class="icon-option p-3 rounded-lg hover:bg-gray-100 text-gray-600 transition"
                              title="${item.name}"
                              data-name="${item.name.toLowerCase()}"
                              data-category="${this.getIconCategory(item.icon)}">
                        <i class="fas ${item.icon} text-xl"></i>
                      </button>
                    `
                      )
                      .join("")}
                  </div>
                  <input type="hidden" id="categoryIcon" value="fa-tag">
                  <div class="text-xs text-gray-500 mt-1">เลือกไอคอนที่เหมาะสมกับหมวดหมู่ของคุณ</div>
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
                  <div class="text-xs text-gray-500 mt-1">เลือกสีเพื่อแยกแยะหมวดหมู่</div>
                </div>
              </div>
            </form>
          </div>
          
          <div class="modal-footer">
            <div class="flex gap-3">
              <button type="button" onclick="Utils.closeModal(this.closest('.fixed'))"
                      class="flex-1 bg-gray-200 hover:bg-gray-300 py-2 rounded-lg text-gray-800 transition">
                ยกเลิก
              </button>
              <button type="submit" form="categoryForm"
                      class="flex-1 btn-primary py-2 rounded-lg text-white">
                เพิ่มหมวดหมู่
              </button>
            </div>
          </div>
        </div>
      `;

    Utils.createModal(content, { size: "w-full max-w-lg", mobileFullscreen: true });
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
  // Get icon category
  getIconCategory(icon) {
    const foodIcons = ['fa-mug-hot', 'fa-coffee', 'fa-mug-saucer', 'fa-glass-water', 'fa-bottle-water', 'fa-wine-glass', 'fa-beer', 'fa-martini-glass', 'fa-champagne-glasses', 'fa-whiskey-glass', 'fa-blender', 'fa-glass-water-droplet', 'fa-utensils', 'fa-burger', 'fa-pizza-slice', 'fa-hotdog', 'fa-bowl-rice', 'fa-bowl-food', 'fa-bacon', 'fa-drumstick-bite', 'fa-fish', 'fa-shrimp', 'fa-egg', 'fa-cheese', 'fa-bread-slice', 'fa-plate-wheat', 'fa-ice-cream', 'fa-cake-candles', 'fa-cookie', 'fa-candy-cane', 'fa-stroopwafel', 'fa-cookie-bite', 'fa-apple-whole', 'fa-lemon', 'fa-carrot', 'fa-pepper-hot', 'fa-seedling'];
    const productIcons = ['fa-shopping-basket', 'fa-box', 'fa-jar', 'fa-bottle-droplet', 'fa-soap', 'fa-spray-can-sparkles', 'fa-pills', 'fa-syringe', 'fa-tooth'];
    const fashionIcons = ['fa-shirt', 'fa-user-tie', 'fa-vest', 'fa-socks', 'fa-glasses', 'fa-hat-cowboy', 'fa-shoe-prints', 'fa-bag-shopping', 'fa-gem', 'fa-ring'];
    const electronicIcons = ['fa-mobile-screen', 'fa-laptop', 'fa-desktop', 'fa-tablet-screen-button', 'fa-headphones', 'fa-camera', 'fa-tv', 'fa-gamepad', 'fa-keyboard', 'fa-computer-mouse'];
    const serviceIcons = ['fa-scissors', 'fa-spa', 'fa-dumbbell', 'fa-car', 'fa-motorcycle', 'fa-bicycle', 'fa-gas-pump', 'fa-wrench', 'fa-hammer', 'fa-screwdriver', 'fa-toolbox', 'fa-paint-roller', 'fa-brush'];
    const healthIcons = ['fa-heart-pulse', 'fa-stethoscope', 'fa-wheelchair', 'fa-baby', 'fa-person-cane'];
    
    if (foodIcons.includes(icon)) return 'food';
    if (productIcons.includes(icon)) return 'product';
    if (fashionIcons.includes(icon)) return 'fashion';
    if (electronicIcons.includes(icon)) return 'electronic';
    if (serviceIcons.includes(icon)) return 'service';
    if (healthIcons.includes(icon)) return 'health';
    return 'other';
  },

  // Filter icons by search
  filterIcons(searchTerm) {
    const term = searchTerm.toLowerCase();
    const icons = document.querySelectorAll('#iconGrid .icon-option');
    
    icons.forEach(icon => {
      const name = icon.getAttribute('data-name');
      if (name && name.includes(term)) {
        icon.style.display = '';
      } else {
        icon.style.display = 'none';
      }
    });
  },

  // Filter icons by category
  filterIconsByCategory(category) {
    const icons = document.querySelectorAll('#iconGrid .icon-option');
    
    icons.forEach(icon => {
      const iconCategory = icon.getAttribute('data-category');
      if (!category || iconCategory === category) {
        icon.style.display = '';
      } else {
        icon.style.display = 'none';
      }
    });
    
    // Clear search when category changes
    const searchInput = document.getElementById('iconSearch');
    if (searchInput) {
      searchInput.value = '';
    }
  },
};
