// BackOffice Module - All back office functions
const BackOffice = {
  currentPage: null,

  init() {
    console.log("BackOffice initialized");
  },

  openMenu() {
    const menu = document.getElementById("backOfficeMenu");
    if (!menu) {
      this.createBackOfficeMenu();
    } else {
      menu.classList.remove("hidden");
    }
  },

  closeMenu() {
    const menu = document.getElementById("backOfficeMenu");
    if (menu) {
      menu.classList.add("hidden");
    }
  },

  createBackOfficeMenu() {
    const menu = document.createElement("div");
    menu.id = "backOfficeMenu";
    menu.className = "fixed inset-0 z-50 hidden";
    menu.innerHTML = `
            <div class="absolute inset-0 bg-black/50" onclick="BackOffice.closeMenu()"></div>
            <div class="absolute left-0 top-0 h-full w-80 bg-white shadow-2xl slide-in-left">
                <div class="p-6">
                    <div class="flex items-center justify-between mb-6">
                        <h2 class="text-xl font-bold text-gray-800">ระบบหลังร้าน</h2>
                        <button onclick="BackOffice.closeMenu()" class="text-gray-600 hover:text-gray-800">
                            <i class="fas fa-times text-xl"></i>
                        </button>
                    </div>
                    
                    <nav class="space-y-2">
                        <a href="#" onclick="BackOffice.openPage('dashboard')" class="block bg-gradient-to-r from-gray-50 to-gray-100 hover:from-indigo-50 hover:to-purple-50 p-4 rounded-lg text-gray-800 transition group">
                            <i class="fas fa-chart-line mr-3 text-indigo-500 group-hover:text-indigo-600"></i>แดชบอร์ด
                        </a>
                        <a href="#" onclick="BackOffice.openPage('products')" class="block bg-gradient-to-r from-gray-50 to-gray-100 hover:from-emerald-50 hover:to-green-50 p-4 rounded-lg text-gray-800 transition group">
                            <i class="fas fa-box mr-3 text-emerald-500 group-hover:text-emerald-600"></i>จัดการสินค้า
                        </a>
                        <a href="#" onclick="BackOffice.openPage('categories')" class="block bg-gradient-to-r from-gray-50 to-gray-100 hover:from-purple-50 hover:to-pink-50 p-4 rounded-lg text-gray-800 transition group">
                            <i class="fas fa-tags mr-3 text-purple-500 group-hover:text-purple-600"></i>หมวดหมู่
                        </a>
                        <a href="#" onclick="BackOffice.openPage('members')" class="block bg-gradient-to-r from-gray-50 to-gray-100 hover:from-orange-50 hover:to-amber-50 p-4 rounded-lg text-gray-800 transition group">
                            <i class="fas fa-users mr-3 text-orange-500 group-hover:text-orange-600"></i>สมาชิก
                        </a>
                        <a href="#" onclick="BackOffice.openPage('sales')" class="block bg-gradient-to-r from-gray-50 to-gray-100 hover:from-red-50 hover:to-rose-50 p-4 rounded-lg text-gray-800 transition group">
                            <i class="fas fa-receipt mr-3 text-red-500 group-hover:text-red-600"></i>ประวัติการขาย
                        </a>
                        <a href="#" onclick="BackOffice.openPage('reports')" class="block bg-gradient-to-r from-gray-50 to-gray-100 hover:from-indigo-50 hover:to-blue-50 p-4 rounded-lg text-gray-800 transition group">
                            <i class="fas fa-file-alt mr-3 text-indigo-500 group-hover:text-indigo-600"></i>รายงาน
                        </a>
                        <a href="#" onclick="BackOffice.openPage('settings')" class="block bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-slate-100 p-4 rounded-lg text-gray-800 transition group">
                            <i class="fas fa-cog mr-3 text-gray-500 group-hover:text-gray-600"></i>ตั้งค่า
                        </a>
                    </nav>
                </div>
            </div>
        `;
    document.getElementById("modalsContainer").appendChild(menu);
  },

  openPage(page) {
    this.currentPage = page;
    this.closeMenu();

    // Hide POS interface
    document.getElementById("posInterface").style.display = "none";

    // Remove existing page if any
    const existingPage = document.getElementById("backOfficePage");
    if (existingPage) {
      existingPage.remove();
    }

    // Create new page
    const pageContent = this.createPage(page);
    document.getElementById("app").appendChild(pageContent);
  },

  closePage() {
    const page = document.getElementById("backOfficePage");
    if (page) {
      page.remove();
    }
    document.getElementById("posInterface").style.display = "flex";
    POS.refresh();
  },

  createPage(page) {
    const pageContainer = document.createElement("div");
    pageContainer.id = "backOfficePage";
    pageContainer.className = "fixed inset-0 z-30 overflow-y-auto bg-gray-50";

    let content = "";
    switch (page) {
      case "dashboard":
        content = this.createDashboardPage();
        break;
      case "products":
        content = this.createProductsPage();
        break;
      case "categories":
        content = this.createCategoriesPage();
        break;
      case "members":
        content = this.createMembersPage();
        break;
      case "sales":
        content = this.createSalesPage();
        break;
      case "reports":
        content = this.createReportsPage();
        break;
      case "settings":
        content = this.createSettingsPage();
        break;
    }

    pageContainer.innerHTML = content;

    // Initialize page specific functions after DOM is ready
    setTimeout(() => {
      switch (page) {
        case "dashboard":
          this.initDashboard();
          break;
        case "products":
          this.loadProductsList();
          break;
        case "categories":
          this.loadCategoriesList();
          break;
        case "members":
          this.loadMembersList();
          break;
        case "sales":
          this.loadSalesHistory();
          break;
        case "reports":
          this.initReports();
          break;
        case "settings":
          this.loadSettings();
          break;
      }
    }, 100);

    return pageContainer;
  },

  // Dashboard Page
  createDashboardPage() {
    const today = new Date().toLocaleDateString("th-TH");
    return `
            <div class="min-h-screen p-4">
                <!-- Header -->
                <div class="bg-white shadow-md rounded-lg mb-6 p-4 flex items-center justify-between">
                    <div class="flex items-center gap-4">
                        <button onclick="BackOffice.closePage()" class="text-gray-700 hover:text-gray-900">
                            <i class="fas fa-arrow-left text-xl"></i>
                        </button>
                        <h1 class="text-2xl font-bold text-gray-800">แดชบอร์ด</h1>
                    </div>
                    <div class="text-gray-600">
                        <i class="far fa-calendar mr-2"></i>${today}
                    </div>
                </div>

                <!-- Stats Grid -->
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div class="bg-white rounded-xl shadow-md p-4 border border-gray-100 hover:shadow-lg transition">
                        <div class="flex items-center justify-between">
                            <div>
                                <div class="text-gray-600 text-sm">ยอดขายวันนี้</div>
                                <div class="text-2xl font-bold text-gray-800" id="todaySales">฿0</div>
                                <div class="text-green-500 text-sm mt-1">
                                    <i class="fas fa-arrow-up"></i> +0%
                                </div>
                            </div>
                            <div class="text-3xl text-indigo-500 opacity-30">
                                <i class="fas fa-chart-line"></i>
                            </div>
                        </div>
                    </div>
                    <div class="bg-white rounded-xl shadow-md p-4 border border-gray-100 hover:shadow-lg transition">
                        <div class="flex items-center justify-between">
                            <div>
                                <div class="text-gray-600 text-sm">จำนวนบิล</div>
                                <div class="text-2xl font-bold text-gray-800" id="todayOrders">0</div>
                                <div class="text-gray-500 text-sm mt-1">วันนี้</div>
                            </div>
                            <div class="text-3xl text-emerald-500 opacity-30">
                                <i class="fas fa-receipt"></i>
                            </div>
                        </div>
                    </div>
                    <div class="bg-white rounded-xl shadow-md p-4 border border-gray-100 hover:shadow-lg transition">
                        <div class="flex items-center justify-between">
                            <div>
                                <div class="text-gray-600 text-sm">สินค้าขายดี</div>
                                <div class="text-xl font-bold text-gray-800" id="topProduct">-</div>
                                <div class="text-gray-500 text-xs mt-1" id="topProductQty">ขายไป 0 ชิ้น</div>
                            </div>
                            <div class="text-3xl text-purple-500 opacity-30">
                                <i class="fas fa-crown"></i>
                            </div>
                        </div>
                    </div>
                    <div class="bg-white rounded-xl shadow-md p-4 border border-gray-100 hover:shadow-lg transition">
                        <div class="flex items-center justify-between">
                            <div>
                                <div class="text-gray-600 text-sm">สินค้าใกล้หมด</div>
                                <div class="text-2xl font-bold text-orange-500" id="lowStock">0</div>
                                <div class="text-gray-500 text-sm mt-1">รายการ</div>
                            </div>
                            <div class="text-3xl text-orange-500 opacity-30">
                                <i class="fas fa-exclamation-triangle"></i>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Quick Actions -->
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <button onclick="BackOffice.openPage('products')" class="bg-white shadow-md p-4 rounded-xl text-gray-800 hover:bg-gradient-to-br hover:from-indigo-50 hover:to-purple-50 hover:shadow-lg transition border border-gray-100">
                        <i class="fas fa-plus-circle text-2xl mb-2 text-indigo-500"></i>
                        <div>เพิ่มสินค้า</div>
                    </button>
                    <button onclick="BackOffice.quickSale()" class="bg-white shadow-md p-4 rounded-xl text-gray-800 hover:bg-gradient-to-br hover:from-emerald-50 hover:to-green-50 hover:shadow-lg transition border border-gray-100">
                        <i class="fas fa-cash-register text-2xl mb-2 text-emerald-500"></i>
                        <div>ขายด่วน</div>
                    </button>
                    <button onclick="BackOffice.exportDailyReport()" class="bg-white shadow-md p-4 rounded-xl text-gray-800 hover:bg-gradient-to-br hover:from-purple-50 hover:to-pink-50 hover:shadow-lg transition border border-gray-100">
                        <i class="fas fa-download text-2xl mb-2 text-purple-500"></i>
                        <div>รายงานวัน</div>
                    </button>
                    <button onclick="BackOffice.openPage('settings')" class="bg-white shadow-md p-4 rounded-xl text-gray-800 hover:bg-gradient-to-br hover:from-gray-50 hover:to-slate-50 hover:shadow-lg transition border border-gray-100">
                        <i class="fas fa-cog text-2xl mb-2 text-gray-600"></i>
                        <div>ตั้งค่า</div>
                    </button>
                </div>

                <!-- Charts -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="bg-white shadow-md p-4 rounded-xl">
                        <h3 class="text-gray-800 font-bold mb-4">ยอดขาย 7 วันล่าสุด</h3>
                        <canvas id="salesChart" height="200"></canvas>
                    </div>
                    <div class="bg-white shadow-md p-4 rounded-xl">
                        <h3 class="text-gray-800 font-bold mb-4">สินค้าขายดี 5 อันดับ</h3>
                        <div id="topProductsList" class="space-y-2">
                            <!-- Top products will be loaded here -->
                        </div>
                    </div>
                </div>
            </div>
        `;
  },

  // Products Management Page
  createProductsPage() {
    return `
            <div class="min-h-screen p-4">
                <!-- Header -->
                <div class="bg-white shadow-md rounded-lg mb-6 p-4 flex items-center justify-between">
                    <div class="flex items-center gap-4">
                        <button onclick="BackOffice.closePage()" class="text-gray-700 hover:text-gray-900">
                            <i class="fas fa-arrow-left text-xl"></i>
                        </button>
                        <h1 class="text-2xl font-bold text-gray-800">จัดการสินค้า</h1>
                    </div>
                    <button onclick="BackOffice.showAddProductModal()" class="btn-primary px-4 py-2 rounded-lg text-white">
                        <i class="fas fa-plus mr-2"></i>เพิ่มสินค้า
                    </button>
                </div>

                <!-- Search and Filter -->
                <div class="bg-white shadow-md rounded-lg p-4 mb-4 flex gap-4">
                    <div class="flex-1">
                        <input type="text" id="searchProductInput" placeholder="ค้นหาสินค้า..." 
                               onkeyup="BackOffice.searchProducts(this.value)"
                               class="w-full p-2 rounded-lg border border-gray-300 text-gray-800">
                    </div>
                    <select onchange="BackOffice.filterProductsByCategory(this.value)" 
                            class="p-2 rounded-lg border border-gray-300 text-gray-800">
                        <option value="">ทั้งหมด</option>
                        <option value="2">เครื่องดื่ม</option>
                        <option value="3">อาหาร</option>
                        <option value="4">ของหวาน</option>
                    </select>
                </div>

                <!-- Products Table -->
                <div class="bg-white shadow-md rounded-xl overflow-hidden">
                    <div class="data-table-wrapper">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th class="p-3 text-left">รูป</th>
                                    <th class="p-3 text-left">ชื่อสินค้า</th>
                                    <th class="p-3 text-center">หมวดหมู่</th>
                                    <th class="p-3 text-right">ต้นทุน</th>
                                    <th class="p-3 text-right">ราคาขาย</th>
                                    <th class="p-3 text-right">กำไร</th>
                                    <th class="p-3 text-right">สต็อค</th>
                                    <th class="p-3 text-center">จัดการ</th>
                                </tr>
                            </thead>
                            <tbody id="productsTableBody">
                                <!-- Products will be loaded here -->
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- Add/Edit Product Modal -->
            <div id="productModal" class="fixed inset-0 bg-black/70 hidden z-50 flex items-center justify-center p-4">
                <div class="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                    <h3 class="text-xl font-bold text-gray-800 mb-4">เพิ่ม/แก้ไขสินค้า</h3>
                    <form onsubmit="BackOffice.saveProduct(event)">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input type="hidden" id="editProductId">
                            
                            <!-- Left Column -->
                            <div class="space-y-4">
                                <div>
                                    <label class="text-gray-700 text-sm">รหัสสินค้า</label>
                                    <input type="text" id="productCode" 
                                           class="w-full p-2 rounded-lg border border-gray-300 text-gray-800">
                                </div>
                                <div>
                                    <label class="text-gray-700 text-sm">ชื่อสินค้า *</label>
                                    <input type="text" id="productName" required 
                                           class="w-full p-2 rounded-lg border border-gray-300 text-gray-800">
                                </div>
                                <div>
                                    <label class="text-gray-700 text-sm">หมวดหมู่ *</label>
                                    <select id="productCategory" required
                                    class="w-full p-2 rounded-lg border border-gray-300 text-gray-800">
                                ${App.getCategories()
                                  .filter((cat) => cat.id !== 1) // ไม่แสดง "ทั้งหมด"
                                  .map(
                                    (cat) =>
                                      `<option value="${cat.id}">${cat.name}</option>`
                                  )
                                  .join("")}
                            </select>
                                </div>
                                <div class="grid grid-cols-2 gap-4">
                                    <div>
                                        <label class="text-gray-700 text-sm">ต้นทุน</label>
                                        <input type="number" id="productCost" min="0" step="0.01"
                                               class="w-full p-2 rounded-lg border border-gray-300 text-gray-800">
                                    </div>
                                    <div>
                                        <label class="text-gray-700 text-sm">ราคาขาย *</label>
                                        <input type="number" id="productPrice" required min="0" step="0.01"
                                               class="w-full p-2 rounded-lg border border-gray-300 text-gray-800">
                                    </div>
                                </div>
                                <div>
                                    <label class="text-gray-700 text-sm">สต็อค *</label>
                                    <input type="number" id="productStock" required min="0"
                                           class="w-full p-2 rounded-lg border border-gray-300 text-gray-800">
                                </div>
                            </div>
                            
                            <!-- Right Column - Image Upload -->
                            <div class="space-y-4">
                                <div>
                                    <label class="text-gray-700 text-sm">รูปสินค้า</label>
                                    <div class="mt-2">
                                        <!-- Image Preview -->
                                        <div id="imagePreview" class="w-full h-48 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center mb-4">
                                            <div id="previewContent" class="text-center">
                                                <i class="fas fa-image text-4xl text-gray-400 mb-2"></i>
                                                <p class="text-gray-500 text-sm">ยังไม่มีรูป</p>
                                            </div>
                                        </div>
                                        
                                        <!-- Upload Options -->
                                        <div class="space-y-2">
                                            <input type="file" id="productImageFile" accept="image/*" 
                                                   onchange="BackOffice.handleImageUpload(event)"
                                                   class="hidden">
                                            <button type="button" onclick="document.getElementById('productImageFile').click()"
                                                    class="w-full bg-gray-100 hover:bg-gray-200 py-2 rounded-lg text-gray-700 transition">
                                                <i class="fas fa-upload mr-2"></i>อัพโหลดรูป
                                            </button>
                                            
                                            <div class="text-center text-gray-500 text-sm my-2">หรือ</div>
                                            
                                            <input type="text" id="productImageUrl" placeholder="URL รูปภาพ"
                                                   onchange="BackOffice.handleImageUrl(this.value)"
                                                   class="w-full p-2 rounded-lg border border-gray-300 text-gray-800 text-sm">
                                            
                                            <div class="text-center text-gray-500 text-sm my-2">หรือ</div>
                                            
                                            <input type="text" id="productEmoji" placeholder="ใช้ Emoji เช่น 🍕 ☕ 🍰"
                                                   onchange="BackOffice.handleEmoji(this.value)"
                                                   maxlength="2" class="w-full p-2 rounded-lg border border-gray-300 text-gray-800 text-center text-2xl">
                                        </div>
                                        
                                        <input type="hidden" id="productImage">
                                        <input type="hidden" id="productImageType" value="emoji">
                                    </div>
                                </div>
                                
                                <div>
                                    <label class="text-gray-700 text-sm">บาร์โค้ด</label>
                                    <input type="text" id="productBarcode" 
                                           class="w-full p-2 rounded-lg border border-gray-300 text-gray-800">
                                </div>
                            </div>
                        </div>
                        
                        <div class="flex gap-3 mt-6">
                            <button type="button" onclick="BackOffice.closeProductModal()" 
                                    class="flex-1 bg-gray-200 hover:bg-gray-300 py-2 rounded-lg text-gray-800">
                                ยกเลิก
                            </button>
                            <button type="submit" class="flex-1 btn-primary py-2 rounded-lg text-white">
                                บันทึก
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;
  },

  // Categories Page
  createCategoriesPage() {
    return `
            <div class="min-h-screen p-4">
                <!-- Header -->
                <div class="bg-white shadow-md rounded-lg mb-6 p-4 flex items-center justify-between">
                    <div class="flex items-center gap-4">
                        <button onclick="BackOffice.closePage()" class="text-gray-700 hover:text-gray-900">
                            <i class="fas fa-arrow-left text-xl"></i>
                        </button>
                        <h1 class="text-2xl font-bold text-gray-800">หมวดหมู่</h1>
                    </div>
                    <button onclick="Categories.showAddCategoryModal()" class="btn-primary px-4 py-2 rounded-lg text-white">
                        <i class="fas fa-plus mr-2"></i>เพิ่มหมวดหมู่
                    </button>
                </div>

                <!-- Categories Grid -->
                <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4" id="categoriesGrid">
                    <!-- Categories will be loaded here -->
                </div>
            </div>
        `;
  },

  // Members Page
  createMembersPage() {
    return `
            <div class="min-h-screen p-4">
                <!-- Header -->
                <div class="bg-white shadow-md rounded-lg mb-6 p-4 flex items-center justify-between">
                    <div class="flex items-center gap-4">
                        <button onclick="BackOffice.closePage()" class="text-gray-700 hover:text-gray-900">
                            <i class="fas fa-arrow-left text-xl"></i>
                        </button>
                        <h1 class="text-2xl font-bold text-gray-800">สมาชิก</h1>
                    </div>
                    <button onclick="BackOffice.showAddMemberModal()" class="btn-primary px-4 py-2 rounded-lg text-white">
                        <i class="fas fa-user-plus mr-2"></i>เพิ่มสมาชิก
                    </button>
                </div>

                <!-- Stats -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div class="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl p-4 text-white shadow-lg">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-sm opacity-90">สมาชิกทั้งหมด</p>
                                <p class="text-2xl font-bold" id="totalMembers">0</p>
                            </div>
                            <i class="fas fa-users text-3xl opacity-30"></i>
                        </div>
                    </div>
                    <div class="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-4 text-white shadow-lg">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-sm opacity-90">สมาชิกใหม่เดือนนี้</p>
                                <p class="text-2xl font-bold" id="newMembers">0</p>
                            </div>
                            <i class="fas fa-user-plus text-3xl opacity-30"></i>
                        </div>
                    </div>
                    <div class="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-4 text-white shadow-lg">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-sm opacity-90">ยอดซื้อรวม</p>
                                <p class="text-2xl font-bold" id="memberTotalSales">฿0</p>
                            </div>
                            <i class="fas fa-chart-line text-3xl opacity-30"></i>
                        </div>
                    </div>
                </div>

                <!-- Members Table -->
                <div class="bg-white shadow-md rounded-xl overflow-hidden">
                    <div class="data-table-wrapper">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th class="p-3 text-left">รหัส</th>
                                    <th class="p-3 text-left">ชื่อ-นามสกุล</th>
                                    <th class="p-3 text-left">เบอร์โทร</th>
                                    <th class="p-3 text-right">ยอดซื้อสะสม</th>
                                    <th class="p-3 text-right">แต้มสะสม</th>
                                    <th class="p-3 text-center">จัดการ</th>
                                </tr>
                            </thead>
                            <tbody id="membersTableBody">
                                <!-- Members will be loaded here -->
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
  },

  // Sales History Page
  createSalesPage() {
    return `
            <div class="min-h-screen p-4">
                <!-- Header -->
                <div class="bg-white shadow-md rounded-lg mb-6 p-4 flex items-center justify-between">
                    <div class="flex items-center gap-4">
                        <button onclick="BackOffice.closePage()" class="text-gray-700 hover:text-gray-900">
                            <i class="fas fa-arrow-left text-xl"></i>
                        </button>
                        <h1 class="text-2xl font-bold text-gray-800">ประวัติการขาย</h1>
                    </div>
                    <div class="flex gap-2">
                        <input type="date" id="salesDateFilter" class="p-2 rounded-lg border border-gray-300 text-gray-800">
                        <button onclick="BackOffice.filterSalesByDate()" class="btn-primary px-4 py-2 rounded-lg text-white">
                            <i class="fas fa-search"></i>
                        </button>
                    </div>
                </div>

                <!-- Sales List -->
                <div class="space-y-3" id="salesList">
                    <!-- Sales items will be loaded here -->
                </div>
            </div>
        `;
  },

  // Reports Page
  createReportsPage() {
    return `
            <div class="min-h-screen p-4">
                <!-- Header -->
                <div class="bg-white shadow-md rounded-lg mb-6 p-4 flex items-center justify-between">
                    <div class="flex items-center gap-4">
                        <button onclick="BackOffice.closePage()" class="text-gray-700 hover:text-gray-900">
                            <i class="fas fa-arrow-left text-xl"></i>
                        </button>
                        <h1 class="text-2xl font-bold text-gray-800">รายงาน</h1>
                    </div>
                    <button onclick="BackOffice.exportReport()" class="btn-primary px-4 py-2 rounded-lg text-white">
                        <i class="fas fa-download mr-2"></i>ดาวน์โหลด
                    </button>
                </div>

                <!-- Date Range Selector -->
                <div class="bg-white shadow-md rounded-lg p-4 mb-6 flex gap-4 items-center">
                    <div>
                        <label class="text-gray-700 text-sm">จากวันที่</label>
                        <input type="date" id="reportStartDate" class="p-2 rounded-lg border border-gray-300 text-gray-800">
                    </div>
                    <div>
                        <label class="text-gray-700 text-sm">ถึงวันที่</label>
                        <input type="date" id="reportEndDate" class="p-2 rounded-lg border border-gray-300 text-gray-800">
                    </div>
                    <button onclick="BackOffice.generateReport()" class="btn-primary px-4 py-2 rounded-lg text-white mt-5">
                        สร้างรายงาน
                    </button>
                </div>

                <!-- Report Content -->
                <div id="reportContent">
                    <!-- Report will be generated here -->
                </div>
            </div>
        `;
  },

  // Settings Page - เพิ่มการตั้งค่าเบอร์โทรร้านและโลโก้
  createSettingsPage() {
    return `
            <div class="min-h-screen p-4">
                <!-- Header -->
                <div class="bg-white shadow-md rounded-lg mb-6 p-4 flex items-center justify-between">
                    <div class="flex items-center gap-4">
                        <button onclick="BackOffice.closePage()" class="text-gray-700 hover:text-gray-900">
                            <i class="fas fa-arrow-left text-xl"></i>
                        </button>
                        <h1 class="text-2xl font-bold text-gray-800">ตั้งค่า</h1>
                    </div>
                </div>

                <!-- Settings Sections -->
                <div class="space-y-4">
                    <!-- Store Settings -->
                    <div class="bg-white shadow-md rounded-xl p-6">
                        <h3 class="text-lg font-bold text-gray-800 mb-4">
                            <i class="fas fa-store mr-2 text-purple-600"></i>ข้อมูลร้าน
                        </h3>
                        <div class="space-y-4">
                            <div>
                                <label class="text-gray-700 text-sm">ชื่อร้าน</label>
                                <input type="text" id="storeName"
                                       class="w-full p-2 rounded-lg border border-gray-300 text-gray-800">
                            </div>
                            <div>
                                <label class="text-gray-700 text-sm">ที่อยู่</label>
                                <textarea id="storeAddress" rows="3"
                                          class="w-full p-2 rounded-lg border border-gray-300 text-gray-800"></textarea>
                            </div>
                            <div>
                                <label class="text-gray-700 text-sm">เบอร์โทรร้าน</label>
                                <input type="tel" id="storePhone" pattern="[0-9]{10}"
                                       placeholder="0812345678"
                                       class="w-full p-2 rounded-lg border border-gray-300 text-gray-800">
                                <div class="text-xs text-gray-500 mt-1">ใช้สำหรับแสดงในใบเสร็จ</div>
                            </div>
                            <div>
                                <label class="text-gray-700 text-sm">PromptPay</label>
                                <input type="text" id="storePromptPay"
                                       placeholder="เบอร์โทรหรือเลขประจำตัว"
                                       class="w-full p-2 rounded-lg border border-gray-300 text-gray-800">
                            </div>
                            
                            <!-- Logo Settings -->
                            <div>
                                <label class="text-gray-700 text-sm">โลโก้ร้าน (แบบขาวดำ)</label>
                                <div class="mt-2">
                                    <input type="file" id="logoUpload" accept="image/*" 
                                           onchange="BackOffice.handleLogoUpload(event)"
                                           class="w-full p-2 rounded-lg border border-gray-300">
                                    <div class="mt-3 text-center p-4 bg-gray-50 rounded-lg" id="logoPreview">
                                        <div class="text-gray-400">ยังไม่มีโลโก้</div>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- QR Code Settings -->
                            <div>
                                <label class="text-gray-700 text-sm">QR Code พร้อมเพย์</label>
                                <div class="mt-2">
                                    <input type="file" id="qrCodeUpload" accept="image/*" 
                                           onchange="BackOffice.handleQRUpload(event)"
                                           class="w-full p-2 rounded-lg border border-gray-300">
                                    <div class="mt-3 text-center p-4 bg-gray-50 rounded-lg" id="qrCodePreview">
                                        <div class="text-gray-400">ยังไม่มี QR Code</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- System Settings -->
                    <div class="bg-white shadow-md rounded-xl p-6">
                        <h3 class="text-lg font-bold text-gray-800 mb-4">
                            <i class="fas fa-cog mr-2 text-blue-600"></i>ระบบ
                        </h3>
                        <div class="space-y-4">
                            <div>
                                <label class="text-gray-700 text-sm">อัตราภาษี (%)</label>
                                <input type="number" id="taxRate" min="0" max="100"
                                       class="w-full p-2 rounded-lg border border-gray-300 text-gray-800">
                            </div>
                            <div>
                                <label class="text-gray-700 text-sm">ส่วนลดสมาชิก (%)</label>
                                <input type="number" id="memberDiscount" min="0" max="100"
                                       class="w-full p-2 rounded-lg border border-gray-300 text-gray-800">
                            </div>
                            <div>
                                <label class="text-gray-700 text-sm">อัตราแต้มสะสม (บาท:แต้ม)</label>
                                <input type="number" id="pointRate" min="1"
                                       placeholder="100 (100 บาท = 1 แต้ม)"
                                       class="w-full p-2 rounded-lg border border-gray-300 text-gray-800">
                            </div>
                        </div>
                    </div>

                    <!-- Receipt Settings -->
                    <div class="bg-white shadow-md rounded-xl p-6">
                        <h3 class="text-lg font-bold text-gray-800 mb-4">
                            <i class="fas fa-receipt mr-2 text-orange-600"></i>ใบเสร็จ
                        </h3>
                        <div class="space-y-4">
                            <div>
                                <label class="text-gray-700 text-sm">ข้อความท้ายบิล</label>
                                <textarea id="receiptFooterMessage" rows="3"
                                          placeholder="ขอบคุณที่ใช้บริการ"
                                          class="w-full p-2 rounded-lg border border-gray-300 text-gray-800"></textarea>
                            </div>
                            <div class="grid grid-cols-2 gap-4">
                                <label class="flex items-center gap-2">
                                    <input type="checkbox" id="showStorePhone" 
                                           class="rounded text-blue-600">
                                    <span class="text-gray-700">แสดงเบอร์โทรในใบเสร็จ</span>
                                </label>
                                <label class="flex items-center gap-2">
                                    <input type="checkbox" id="showStoreLogo" 
                                           class="rounded text-blue-600">
                                    <span class="text-gray-700">แสดงโลโก้ในใบเสร็จ</span>
                                </label>
                            </div>
                        </div>
                    </div>

                    <!-- Data Management -->
                    <div class="bg-white shadow-md rounded-xl p-6">
                        <h3 class="text-lg font-bold text-gray-800 mb-4">
                            <i class="fas fa-database mr-2 text-green-600"></i>จัดการข้อมูล
                        </h3>
                        <div class="space-y-3">
                            <button onclick="BackOffice.backupData()" class="w-full bg-gray-100 hover:bg-gray-200 py-3 rounded-lg text-gray-800 transition">
                                <i class="fas fa-download mr-2"></i>สำรองข้อมูล
                            </button>
                            <button onclick="BackOffice.restoreData()" class="w-full bg-gray-100 hover:bg-gray-200 py-3 rounded-lg text-gray-800 transition">
                                <i class="fas fa-upload mr-2"></i>กู้คืนข้อมูล
                            </button>
                            <button onclick="App.clearAllData()" class="w-full btn-danger py-3 rounded-lg text-white">
                                <i class="fas fa-trash mr-2"></i>ล้างข้อมูลทั้งหมด
                            </button>
                        </div>
                    </div>

                    <!-- Save Button -->
                    <button onclick="BackOffice.saveSettings()" class="w-full btn-primary py-3 rounded-lg text-white">
                        <i class="fas fa-save mr-2"></i>บันทึกการตั้งค่า
                    </button>
                </div>
            </div>
        `;
  },

  // Dashboard Functions
  initDashboard() {
    this.updateDashboardStats();
    this.loadTopProducts();
    // TODO: Initialize charts
  },

  updateDashboardStats() {
    const today = new Date().toDateString();
    const todaySales = App.getSales().filter(
      (s) => new Date(s.date).toDateString() === today
    );

    const totalSales = todaySales.reduce((sum, sale) => sum + sale.total, 0);
    const lowStockProducts = App.getProducts().filter(
      (p) => p.stock < 10
    ).length;

    // Find top product
    const productSales = {};
    todaySales.forEach((sale) => {
      sale.items.forEach((item) => {
        productSales[item.id] = (productSales[item.id] || 0) + item.quantity;
      });
    });

    const topProductId = Object.entries(productSales).sort(
      (a, b) => b[1] - a[1]
    )[0];

    document.getElementById("todaySales").textContent =
      Utils.formatCurrency(totalSales);
    document.getElementById("todayOrders").textContent = todaySales.length;
    document.getElementById("lowStock").textContent = lowStockProducts;

    if (topProductId) {
      const product = App.getProductById(parseInt(topProductId[0]));
      if (product) {
        document.getElementById("topProduct").textContent = product.name;
        document.getElementById(
          "topProductQty"
        ).textContent = `ขายไป ${topProductId[1]} ชิ้น`;
      }
    }
  },

  loadTopProducts() {
    const container = document.getElementById("topProductsList");
    if (!container) return;

    const topProducts = Products.getBestSelling(5);

    container.innerHTML = "";
    topProducts.forEach((product, index) => {
      const item = document.createElement("div");
      item.className =
        "flex items-center justify-between p-3 bg-gray-50 rounded-lg";
      item.innerHTML = `
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 bg-gradient-to-br ${
            index === 0
              ? "from-yellow-400 to-yellow-500"
              : index === 1
              ? "from-gray-300 to-gray-400"
              : index === 2
              ? "from-orange-400 to-orange-500"
              : "from-gray-200 to-gray-300"
          } rounded-full flex items-center justify-center text-white font-bold text-sm">
            ${index + 1}
          </div>
          <div>
            <div class="font-medium text-gray-800">${product.name}</div>
            <div class="text-xs text-gray-500">ขายไป ${
              product.quantity
            } ชิ้น</div>
          </div>
        </div>
        <div class="text-right">
          <div class="font-medium text-gray-800">${Utils.formatCurrency(
            product.revenue
          )}</div>
        </div>
      `;
      container.appendChild(item);
    });
  },

  // Products Management Functions
  loadProductsList() {
    const tbody = document.getElementById("productsTableBody");
    if (!tbody) return;

    tbody.innerHTML = "";
    const products = App.getProducts();

    products.forEach((product) => {
      const category = App.getCategories().find(
        (c) => c.id === product.category
      );
      const profit = product.price - (product.cost || 0);
      const profitPercent = product.cost
        ? ((profit / product.cost) * 100).toFixed(1)
        : 0;

      const tr = document.createElement("tr");
      tr.className = "hover:bg-gray-50";
      tr.innerHTML = `
        <td class="p-3">
          ${
            product.imageType === "url"
              ? `<img src="${product.image}" alt="${product.name}" class="w-12 h-12 rounded object-cover">`
              : `<div class="text-2xl w-12 h-12 flex items-center justify-center">${
                  product.image || "📦"
                }</div>`
          }
        </td>
        <td class="p-3 text-gray-800" style="max-width: 200px;">
          <div class="font-medium truncate">${product.name}</div>
          ${
            product.code
              ? `<div class="text-xs text-gray-500">${product.code}</div>`
              : ""
          }
        </td>
        <td class="p-3 text-center">
          <span class="px-2 py-1 rounded-full text-xs ${
            category?.id === 2
              ? "bg-blue-100 text-blue-800"
              : category?.id === 3
              ? "bg-green-100 text-green-800"
              : "bg-pink-100 text-pink-800"
          }">
            ${category ? category.name : "-"}
          </span>
        </td>
        <td class="p-3 text-right text-gray-700">${Utils.formatCurrency(
          product.cost || 0
        )}</td>
        <td class="p-3 text-right text-gray-800 font-medium">${Utils.formatCurrency(
          product.price
        )}</td>
        <td class="p-3 text-right">
          <div class="text-gray-700">${Utils.formatCurrency(profit)}</div>
          <div class="text-xs ${
            profit > 0 ? "text-green-600" : "text-red-600"
          }">${profitPercent}%</div>
        </td>
        <td class="p-3 text-right">
          <span class="${
            product.stock < 10 ? "text-red-600 font-medium" : "text-green-600"
          }">
            ${product.stock}
          </span>
        </td>
        <td class="p-3 text-center">
          <button onclick="BackOffice.editProduct(${
            product.id
          })" class="text-blue-600 hover:text-blue-700 mr-2">
            <i class="fas fa-edit"></i>
          </button>
          <button onclick="BackOffice.deleteProduct(${
            product.id
          })" class="text-red-600 hover:text-red-700">
            <i class="fas fa-trash"></i>
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  },

  showAddProductModal() {
    document.getElementById("productModal").classList.remove("hidden");
    // Reset form
    document.getElementById("editProductId").value = "";
    document.getElementById("productCode").value = "";
    document.getElementById("productName").value = "";
    document.getElementById("productPrice").value = "";
    document.getElementById("productCost").value = "";
    document.getElementById("productStock").value = "";
    document.getElementById("productCategory").value = "2";
    document.getElementById("productBarcode").value = "";
    document.getElementById("productEmoji").value = "";
    document.getElementById("productImageUrl").value = "";
    document.getElementById("productImage").value = "";
    document.getElementById("productImageType").value = "emoji";
    this.resetImagePreview();
  },

  closeProductModal() {
    document.getElementById("productModal").classList.add("hidden");
  },

  // Image handling functions
  handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      // 5MB limit
      Utils.showToast("ไฟล์ใหญ่เกินไป (ไม่เกิน 5MB)", "error");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const imageData = e.target.result;
      document.getElementById("productImage").value = imageData;
      document.getElementById("productImageType").value = "url";
      this.updateImagePreview(imageData, "url");

      // Clear other inputs
      document.getElementById("productEmoji").value = "";
      document.getElementById("productImageUrl").value = "";
    };
    reader.readAsDataURL(file);
  },

  handleImageUrl(url) {
    if (!url) return;

    // Validate URL
    try {
      new URL(url);
      document.getElementById("productImage").value = url;
      document.getElementById("productImageType").value = "url";
      this.updateImagePreview(url, "url");

      // Clear other inputs
      document.getElementById("productEmoji").value = "";
      document.getElementById("productImageFile").value = "";
    } catch (e) {
      Utils.showToast("URL รูปภาพไม่ถูกต้อง", "error");
    }
  },

  handleEmoji(emoji) {
    if (!emoji) return;

    document.getElementById("productImage").value = emoji;
    document.getElementById("productImageType").value = "emoji";
    this.updateImagePreview(emoji, "emoji");

    // Clear other inputs
    document.getElementById("productImageUrl").value = "";
    document.getElementById("productImageFile").value = "";
  },

  updateImagePreview(image, type) {
    const previewContent = document.getElementById("previewContent");

    if (type === "url") {
      previewContent.innerHTML = `
                <img src="${image}" alt="Preview" class="max-w-full max-h-full object-contain rounded" 
                     style="max-height: 180px;">
            `;
    } else if (type === "emoji") {
      previewContent.innerHTML = `
                <div class="text-6xl">${image}</div>
            `;
    }
  },

  resetImagePreview() {
    document.getElementById("previewContent").innerHTML = `
            <i class="fas fa-image text-4xl text-gray-400 mb-2"></i>
            <p class="text-gray-500 text-sm">ยังไม่มีรูป</p>
        `;
  },

  async saveProduct(event) {
    event.preventDefault();

    const productId = document.getElementById("editProductId").value;
    const productData = {
      code: document.getElementById("productCode").value,
      name: document.getElementById("productName").value,
      price: parseFloat(document.getElementById("productPrice").value),
      cost: parseFloat(document.getElementById("productCost").value) || 0,
      stock: parseInt(document.getElementById("productStock").value),
      category: parseInt(document.getElementById("productCategory").value),
      barcode: document.getElementById("productBarcode").value,
      image: document.getElementById("productImage").value || "📦",
      imageType: document.getElementById("productImageType").value,
    };

    if (productId) {
      App.updateProduct(parseInt(productId), productData);
      Utils.showToast("แก้ไขสินค้าสำเร็จ", "success");
    } else {
      App.addProduct(productData);
      Utils.showToast("เพิ่มสินค้าสำเร็จ", "success");
    }
    
    // Force sync immediately
    try {
      await App.syncWithFirebase();
      console.log("Product synced to Firebase");
    } catch (error) {
      console.error("Sync error:", error);
    }

    this.loadProductsList();
    this.closeProductModal();
    POS.refresh();
  },

  editProduct(id) {
    const product = App.getProductById(id);
    if (!product) return;

    document.getElementById("editProductId").value = product.id;
    document.getElementById("productCode").value = product.code || "";
    document.getElementById("productName").value = product.name;
    document.getElementById("productPrice").value = product.price;
    document.getElementById("productCost").value = product.cost || "";
    document.getElementById("productStock").value = product.stock;
    document.getElementById("productCategory").value = product.category;
    document.getElementById("productBarcode").value = product.barcode || "";

    if (product.imageType === "url") {
      document.getElementById("productImageUrl").value = product.image;
      this.handleImageUrl(product.image);
    } else {
      document.getElementById("productEmoji").value = product.image;
      this.handleEmoji(product.image);
    }

    document.getElementById("productModal").classList.remove("hidden");
  },

  deleteProduct(id) {
    Utils.confirm("ต้องการลบสินค้านี้?", () => {
      App.deleteProduct(id);
      this.loadProductsList();
      Utils.showToast("ลบสินค้าสำเร็จ", "success");
    });
  },

  searchProducts(keyword) {
    const products = Products.search(keyword);
    this.renderProductsList(products);
  },

  filterProductsByCategory(categoryId) {
    const products = categoryId
      ? Products.filter({ category: parseInt(categoryId) })
      : App.getProducts();
    this.renderProductsList(products);
  },

  renderProductsList(products) {
    const tbody = document.getElementById("productsTableBody");
    if (!tbody) return;

    tbody.innerHTML = "";

    products.forEach((product) => {
      const category = App.getCategories().find(
        (c) => c.id === product.category
      );
      const profit = product.price - (product.cost || 0);
      const profitPercent = product.cost
        ? ((profit / product.cost) * 100).toFixed(1)
        : 0;

      const tr = document.createElement("tr");
      tr.className = "hover:bg-gray-50";
      tr.innerHTML = `
                <td class="p-3">
                    ${
                      product.imageType === "url"
                        ? `<img src="${product.image}" alt="${product.name}" class="w-12 h-12 rounded object-cover">`
                        : `<div class="text-2xl w-12 h-12 flex items-center justify-center">${
                            product.image || "📦"
                          }</div>`
                    }
                </td>
                <td class="p-3 text-gray-800" style="max-width: 200px;">
                    <div class="font-medium truncate">${product.name}</div>
                    ${
                      product.code
                        ? `<div class="text-xs text-gray-500">${product.code}</div>`
                        : ""
                    }
                </td>
                <td class="p-3 text-center">
                    <span class="px-2 py-1 rounded-full text-xs ${
                      category?.id === 2
                        ? "bg-blue-100 text-blue-800"
                        : category?.id === 3
                        ? "bg-green-100 text-green-800"
                        : "bg-pink-100 text-pink-800"
                    }">
                        ${category ? category.name : "-"}
                    </span>
                </td>
                <td class="p-3 text-right text-gray-700">${Utils.formatCurrency(
                  product.cost || 0
                )}</td>
                <td class="p-3 text-right text-gray-800 font-medium">${Utils.formatCurrency(
                  product.price
                )}</td>
                <td class="p-3 text-right">
                    <div class="text-gray-700">${Utils.formatCurrency(
                      profit
                    )}</div>
                    <div class="text-xs ${
                      profit > 0 ? "text-green-600" : "text-red-600"
                    }">${profitPercent}%</div>
                </td>
                <td class="p-3 text-right">
                    <span class="${
                      product.stock < 10
                        ? "text-red-600 font-medium"
                        : "text-green-600"
                    }">
                        ${product.stock}
                    </span>
                </td>
                <td class="p-3 text-center">
                    <button onclick="BackOffice.editProduct(${
                      product.id
                    })" class="text-blue-600 hover:text-blue-700 mr-2">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="BackOffice.deleteProduct(${
                      product.id
                    })" class="text-red-600 hover:text-red-700">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
      tbody.appendChild(tr);
    });

    if (products.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" class="p-8 text-center text-gray-500">
            <i class="fas fa-box-open text-4xl mb-2"></i>
            <p>ไม่พบสินค้า</p>
          </td>
        </tr>
      `;
    }
  },

  // Categories Functions
  loadCategoriesList() {
    const grid = document.getElementById("categoriesGrid");
    if (!grid) return;

    grid.innerHTML = "";
    const categories = App.getCategories();

    categories.forEach((category) => {
      if (category.id === 1) return; // Skip "All" category

      const productsCount = Products.filter({ category: category.id }).length;

      const card = document.createElement("div");
      card.className =
        "bg-white rounded-xl p-6 text-center shadow-md hover:shadow-lg transition cursor-pointer";
      card.innerHTML = `
                <div class="text-4xl mb-2 text-${category.color || "gray"}-500">
                    <i class="fas ${category.icon}"></i>
                </div>
                <h4 class="font-bold text-gray-800">${category.name}</h4>
                <p class="text-sm text-gray-500 mt-2">
                    ${productsCount} สินค้า
                </p>
                <div class="mt-4 flex justify-center gap-2">
                    <button onclick="BackOffice.editCategory(${
                      category.id
                    })" class="text-blue-600 hover:text-blue-700">
                        <i class="fas fa-edit"></i>
                    </button>
                    ${
                      !category.protected
                        ? `
                    <button onclick="Categories.delete(${category.id})" class="text-red-600 hover:text-red-700">
                        <i class="fas fa-trash"></i>
                    </button>
                    `
                        : ""
                    }
                </div>
            `;
      grid.appendChild(card);
    });
  },

  // Members Functions
  loadMembersList() {
    const tbody = document.getElementById("membersTableBody");
    if (!tbody) return;

    tbody.innerHTML = "";
    const members = App.state.members || [];

    // Update stats
    document.getElementById("totalMembers").textContent = members.length;

    const thisMonth = new Date().getMonth();
    const newMembers = members.filter((m) => {
      return m.joinDate && new Date(m.joinDate).getMonth() === thisMonth;
    }).length;
    document.getElementById("newMembers").textContent = newMembers;

    const totalSales = members.reduce(
      (sum, m) => sum + (m.totalPurchase || 0),
      0
    );
    document.getElementById("memberTotalSales").textContent =
      Utils.formatCurrency(totalSales);

    // Load table
    members.forEach((member) => {
      const tr = document.createElement("tr");
      tr.className = "hover:bg-gray-50";
      tr.innerHTML = `
                <td class="p-3 text-gray-700">${member.id}</td>
                <td class="p-3 text-gray-800 font-medium">${member.name}</td>
                <td class="p-3 text-gray-700">${member.phone}</td>
                <td class="p-3 text-right text-gray-700">${Utils.formatCurrency(
                  member.totalPurchase || 0
                )}</td>
                <td class="p-3 text-right text-purple-600 font-medium">${
                  member.points || 0
                }</td>
                <td class="p-3 text-center">
                    <button onclick="BackOffice.editMember(${
                      member.id
                    })" class="text-blue-600 hover:text-blue-700 mr-2">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="BackOffice.deleteMember(${
                      member.id
                    })" class="text-red-600 hover:text-red-700">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
      tbody.appendChild(tr);
    });
  },

  showAddMemberModal() {
    const content = `
      <div class="modal-with-footer h-full flex flex-col">
        <div class="modal-body">
          <h3 class="text-xl font-bold text-gray-800 mb-4">เพิ่มสมาชิกใหม่</h3>
          
          <form onsubmit="BackOffice.saveMember(event)" id="memberForm">
            <div class="space-y-4">
              <input type="hidden" id="editMemberId">
              
              <div>
                <label class="text-gray-700 text-sm font-medium">ชื่อ-นามสกุล *</label>
                <input type="text" id="memberName" required
                       class="w-full mt-1 p-2 rounded-lg border border-gray-300 text-gray-800">
              </div>
              
              <div>
                <label class="text-gray-700 text-sm font-medium">เบอร์โทร *</label>
                <input type="tel" id="memberPhone" required pattern="[0-9]{10}"
                       class="w-full mt-1 p-2 rounded-lg border border-gray-300 text-gray-800"
                       placeholder="0812345678">
              </div>
              
              <div>
                <label class="text-gray-700 text-sm font-medium">อีเมล</label>
                <input type="email" id="memberEmail"
                       class="w-full mt-1 p-2 rounded-lg border border-gray-300 text-gray-800">
              </div>
              
              <div>
                <label class="text-gray-700 text-sm font-medium">วันเกิด</label>
                <input type="date" id="memberBirthdate"
                       class="w-full mt-1 p-2 rounded-lg border border-gray-300 text-gray-800">
              </div>
            </div>
          </form>
        </div>
        
        <div class="modal-footer">
          <div class="flex gap-3">
            <button type="button" onclick="Utils.closeModal(this.closest('.fixed'))"
                    class="flex-1 bg-gray-200 hover:bg-gray-300 py-2 rounded-lg text-gray-800">
              ยกเลิก
            </button>
            <button type="submit" form="memberForm"
                    class="flex-1 btn-primary py-2 rounded-lg text-white">
              บันทึก
            </button>
          </div>
        </div>
      </div>
    `;

    Utils.createModal(content, { size: "w-full max-w-md" });
  },

  saveMember(event) {
    event.preventDefault();

    const memberId = document.getElementById("editMemberId").value;
    const memberData = {
      name: document.getElementById("memberName").value,
      phone: document.getElementById("memberPhone").value,
      email: document.getElementById("memberEmail").value,
      birthdate: document.getElementById("memberBirthdate").value,
    };

    if (!memberId) {
      // Add new member
      memberData.id = Date.now();
      memberData.joinDate = new Date().toISOString();
      memberData.points = 0;
      memberData.totalPurchase = 0;

      if (!App.state.members) App.state.members = [];
      App.state.members.push(memberData);
      Utils.showToast("เพิ่มสมาชิกสำเร็จ", "success");
    } else {
      // Update existing member
      const index = App.state.members.findIndex((m) => m.id == memberId);
      if (index !== -1) {
        App.state.members[index] = {
          ...App.state.members[index],
          ...memberData,
        };
        Utils.showToast("แก้ไขข้อมูลสมาชิกสำเร็จ", "success");
      }
    }

    App.saveData();
    this.loadMembersList();
    Utils.closeModal(event.target.closest(".fixed"));
  },

  editMember(id) {
    const member = App.state.members.find((m) => m.id == id);
    if (!member) return;

    const content = `
      <div class="p-6">
        <h3 class="text-xl font-bold text-gray-800 mb-4">แก้ไขข้อมูลสมาชิก</h3>
        
        <form onsubmit="BackOffice.saveMember(event)">
          <div class="space-y-4">
            <input type="hidden" id="editMemberId" value="${member.id}">
            
            <div>
              <label class="text-gray-700 text-sm font-medium">ชื่อ-นามสกุล *</label>
              <input type="text" id="memberName" required value="${member.name}"
                     class="w-full mt-1 p-2 rounded-lg border border-gray-300 text-gray-800">
            </div>
            
            <div>
              <label class="text-gray-700 text-sm font-medium">เบอร์โทร *</label>
              <input type="tel" id="memberPhone" required pattern="[0-9]{10}" value="${
                member.phone
              }"
                     class="w-full mt-1 p-2 rounded-lg border border-gray-300 text-gray-800">
            </div>
            
            <div>
              <label class="text-gray-700 text-sm font-medium">อีเมล</label>
              <input type="email" id="memberEmail" value="${member.email || ""}"
                     class="w-full mt-1 p-2 rounded-lg border border-gray-300 text-gray-800">
            </div>
            
            <div>
              <label class="text-gray-700 text-sm font-medium">วันเกิด</label>
              <input type="date" id="memberBirthdate" value="${
                member.birthdate || ""
              }"
                     class="w-full mt-1 p-2 rounded-lg border border-gray-300 text-gray-800">
            </div>
            
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="text-gray-700 text-sm font-medium">แต้มสะสม</label>
                <div class="mt-1 p-2 bg-gray-100 rounded-lg text-gray-800 font-medium">
                  ${member.points || 0}
                </div>
              </div>
              <div>
                <label class="text-gray-700 text-sm font-medium">ยอดซื้อสะสม</label>
                <div class="mt-1 p-2 bg-gray-100 rounded-lg text-gray-800 font-medium">
                  ${Utils.formatCurrency(member.totalPurchase || 0)}
                </div>
              </div>
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

  deleteMember(id) {
    Utils.confirm("ต้องการลบสมาชิกนี้?", () => {
      App.state.members = App.state.members.filter((m) => m.id != id);
      App.saveData();
      this.loadMembersList();
      Utils.showToast("ลบสมาชิกสำเร็จ", "success");
    });
  },

  // Sales History Functions
  loadSalesHistory() {
    const salesList = document.getElementById("salesList");
    if (!salesList) return;

    salesList.innerHTML = "";
    const sales = App.getSales().sort((a, b) => b.timestamp - a.timestamp);

    sales.forEach((sale) => {
      const saleItem = document.createElement("div");
      saleItem.className =
        "bg-white shadow-md rounded-xl p-4 cursor-pointer hover:shadow-lg transition";
      saleItem.onclick = () => this.showSaleDetail(sale);

      const date = new Date(sale.date);
      const paymentIcon =
        sale.paymentMethod === "cash" ? "fa-money-bill-wave" : "fa-mobile-alt";
      const paymentColor =
        sale.paymentMethod === "cash" ? "text-green-600" : "text-blue-600";

      // แก้ไขการแสดงชื่อลูกค้า
      const customerName =
        sale.memberName || sale.customerName || "ลูกค้าทั่วไป";

      saleItem.innerHTML = `
        <div class="flex justify-between items-center">
          <div>
            <div class="font-bold text-gray-800">#${sale.id}</div>
            <div class="text-sm text-gray-600">
              ${Utils.formatDate(sale.date, "long")}
            </div>
            <div class="text-sm text-gray-500 mt-1">
              <i class="fas fa-user mr-1"></i>${customerName} 
              <span class="mx-2">•</span>
              <i class="fas fa-box mr-1"></i>${sale.items.length} รายการ
            </div>
          </div>
          <div class="text-right">
            <div class="text-xl font-bold text-gray-900">${Utils.formatCurrency(
              sale.total
            )}</div>
            <div class="${paymentColor}">
              <i class="fas ${paymentIcon}"></i> ${
        sale.paymentMethod === "cash" ? "เงินสด" : "โอนเงิน"
      }
            </div>
          </div>
        </div>
      `;

      salesList.appendChild(saleItem);
    });

    if (sales.length === 0) {
      salesList.innerHTML = `
        <div class="text-center py-8 text-gray-500">
          <i class="fas fa-receipt text-4xl mb-2"></i>
          <p>ยังไม่มีประวัติการขาย</p>
        </div>
      `;
    }
  },

  filterSalesByDate() {
    const dateFilter = document.getElementById("salesDateFilter").value;
    if (!dateFilter) {
      this.loadSalesHistory();
      return;
    }

    const salesList = document.getElementById("salesList");
    salesList.innerHTML = "";

    const filterDate = new Date(dateFilter).toDateString();
    const sales = App.getSales()
      .filter((s) => new Date(s.date).toDateString() === filterDate)
      .sort((a, b) => b.timestamp - a.timestamp);

    if (sales.length === 0) {
      salesList.innerHTML = `
        <div class="text-center py-8 text-gray-500">
          <i class="fas fa-search text-4xl mb-2"></i>
          <p>ไม่พบการขายในวันที่เลือก</p>
        </div>
      `;
      return;
    }

    sales.forEach((sale) => {
      const saleItem = document.createElement("div");
      saleItem.className =
        "bg-white shadow-md rounded-xl p-4 cursor-pointer hover:shadow-lg transition";
      saleItem.onclick = () => this.showSaleDetail(sale);

      const paymentIcon =
        sale.paymentMethod === "cash" ? "fa-money-bill-wave" : "fa-mobile-alt";
      const paymentColor =
        sale.paymentMethod === "cash" ? "text-green-600" : "text-blue-600";

      saleItem.innerHTML = `
                <div class="flex justify-between items-center">
                    <div>
                        <div class="font-bold text-gray-800">#${sale.id}</div>
                        <div class="text-sm text-gray-600">
                            ${Utils.formatDate(sale.date, "time")}
                        </div>
                        <div class="text-xs text-gray-500 mt-1">
                            ${sale.items.length} รายการ
                        </div>
                    </div>
                    <div class="text-right">
                        <div class="text-xl font-bold text-gray-900">${Utils.formatCurrency(
                          sale.total
                        )}</div>
                        <div class="${paymentColor}">
                            <i class="fas ${paymentIcon}"></i> ${
        sale.paymentMethod === "cash" ? "เงินสด" : "โอนเงิน"
      }
                        </div>
                    </div>
                </div>
            `;

      salesList.appendChild(saleItem);
    });
  },

  showSaleDetail(sale) {
    let itemsHtml = "";
    sale.items.forEach((item) => {
      itemsHtml += `
        <tr>
          <td class="p-2 text-gray-700">${item.name}</td>
          <td class="p-2 text-center text-gray-700">${item.quantity}</td>
          <td class="p-2 text-right text-gray-700">${Utils.formatCurrency(
            item.price
          )}</td>
          <td class="p-2 text-right text-gray-700">${Utils.formatCurrency(
            item.price * item.quantity
          )}</td>
        </tr>
      `;
    });

    // แสดงชื่อลูกค้า
    const customerName = sale.memberName || sale.customerName || "ลูกค้าทั่วไป";

    const content = `
      <div class="p-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-xl font-bold text-gray-800">รายละเอียดการขาย</h3>
          <button onclick="Utils.closeModal(this.closest('.fixed'))" class="text-gray-600 hover:text-gray-800">
            <i class="fas fa-times text-xl"></i>
          </button>
        </div>
        
        <div class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <div class="text-sm text-gray-600">เลขที่บิล</div>
              <div class="font-medium text-gray-800">#${sale.id}</div>
            </div>
            <div>
              <div class="text-sm text-gray-600">วันที่</div>
              <div class="font-medium text-gray-800">${Utils.formatDate(
                sale.date,
                "long"
              )}</div>
            </div>
            <div>
              <div class="text-sm text-gray-600">ลูกค้า</div>
              <div class="font-medium text-gray-800">${customerName}</div>
            </div>
            <div>
              <div class="text-sm text-gray-600">พนักงาน</div>
              <div class="font-medium text-gray-800">${
                sale.cashier || "ไม่ระบุ"
              }</div>
            </div>
          </div>
          
          <div>
            <div class="text-sm text-gray-600 mb-2">รายการสินค้า</div>
            <div class="bg-gray-50 rounded-lg overflow-hidden">
              <table class="w-full">
                <thead class="bg-gray-100">
                  <tr>
                    <th class="p-2 text-left text-sm text-gray-700">สินค้า</th>
                    <th class="p-2 text-center text-sm text-gray-700">จำนวน</th>
                    <th class="p-2 text-right text-sm text-gray-700">ราคา</th>
                    <th class="p-2 text-right text-sm text-gray-700">รวม</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${itemsHtml}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    
                    <div class="bg-gray-50 rounded-lg p-4 space-y-2">
                        <div class="flex justify-between text-gray-700">
                            <span>ราคารวม</span>
                            <span>${Utils.formatCurrency(
                              sale.subtotal || sale.total + (sale.discount || 0)
                            )}</span>
                        </div>
                        ${
                          sale.discount > 0
                            ? `
                        <div class="flex justify-between text-green-600">
                            <span>ส่วนลด</span>
                            <span>-${Utils.formatCurrency(sale.discount)}</span>
                        </div>
                        `
                            : ""
                        }
                        <div class="flex justify-between text-xl font-bold text-gray-800 pt-2 border-t border-gray-200">
                            <span>ยอดสุทธิ</span>
                            <span>${Utils.formatCurrency(sale.total)}</span>
                        </div>
                    </div>
                    
                    <div class="flex items-center justify-between bg-gray-50 rounded-lg p-4">
                        <span class="text-gray-700">ชำระด้วย</span>
                        <span class="${
                          sale.paymentMethod === "cash"
                            ? "text-green-600"
                            : "text-blue-600"
                        }">
                            <i class="fas ${
                              sale.paymentMethod === "cash"
                                ? "fa-money-bill-wave"
                                : "fa-mobile-alt"
                            } mr-2"></i>
                            ${
                              sale.paymentMethod === "cash"
                                ? "เงินสด"
                                : "โอนเงิน"
                            }
                        </span>
                    </div>
                    
                    ${
                      sale.paymentMethod === "cash" && sale.received
                        ? `
                    <div class="bg-gray-50 rounded-lg p-4 space-y-2">
                        <div class="flex justify-between text-gray-700">
                            <span>รับเงิน</span>
                            <span>${Utils.formatCurrency(sale.received)}</span>
                        </div>
                        <div class="flex justify-between text-gray-700">
                            <span>เงินทอน</span>
                            <span>${Utils.formatCurrency(
                              sale.change || 0
                            )}</span>
                        </div>
                    </div>
                    `
                        : ""
                    }
                    
                    ${
                      sale.memberId
                        ? `
                    <div class="bg-gray-50 rounded-lg p-4">
                        <div class="text-sm text-gray-600">สมาชิก</div>
                        <div class="text-gray-800">ID: ${sale.memberId}</div>
                    </div>
                    `
                        : ""
                    }
                    
                    ${
                      sale.type === "refund"
                        ? `
                    <div class="bg-red-50 rounded-lg p-4 text-red-800">
                        <div class="font-bold">นี่คือบิลคืนเงิน</div>
                        <div class="text-sm">อ้างอิงบิลเดิม: #${sale.originalSaleId}</div>
                    </div>
                    `
                        : ""
                    }
                </div>
                
                <div class="flex gap-3 mt-6">
                    <button onclick="Payment.printReceipt(${
                      sale.id
                    })" class="flex-1 bg-gray-200 hover:bg-gray-300 py-2 rounded-lg text-gray-800">
                        <i class="fas fa-print mr-2"></i>พิมพ์ใบเสร็จ
                    </button>
                    ${
                      sale.type !== "refund"
                        ? `
                    <button onclick="Payment.refund(${sale.id})" class="flex-1 bg-red-500 hover:bg-red-600 py-2 rounded-lg text-white">
                        <i class="fas fa-undo mr-2"></i>คืนเงิน
                    </button>
                    `
                        : ""
                    }
                    <button onclick="Utils.closeModal(this.closest('.fixed'))" class="flex-1 btn-primary py-2 rounded-lg text-white">
                        ปิด
                    </button>
                </div>
            </div>
        `;

    Utils.createModal(content, { size: "w-full max-w-2xl" });
  },

  // Reports Functions
  initReports() {
    // Set default date range (last 7 days)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);

    document.getElementById("reportStartDate").value = startDate
      .toISOString()
      .split("T")[0];
    document.getElementById("reportEndDate").value = endDate
      .toISOString()
      .split("T")[0];

    this.generateReport();
  },

  generateReport() {
    const startDate = document.getElementById("reportStartDate").value;
    const endDate = document.getElementById("reportEndDate").value;

    const report = Reports.generateSalesReport(
      App.getSalesByDateRange(startDate, endDate),
      {
        title: `รายงานการขาย ${Utils.formatDate(
          startDate
        )} - ${Utils.formatDate(endDate)}`,
        period: "custom",
      }
    );

    const reportContent = Reports.formatReportHTML(report);
    document.getElementById("reportContent").innerHTML = reportContent;
  },

  exportReport() {
    const startDate = document.getElementById("reportStartDate").value;
    const endDate = document.getElementById("reportEndDate").value;

    const report = Reports.generateSalesReport(
      App.getSalesByDateRange(startDate, endDate),
      {
        title: `รายงานการขาย ${Utils.formatDate(
          startDate
        )} - ${Utils.formatDate(endDate)}`,
        period: "custom",
      }
    );

    Reports.exportReport(report, "csv");
  },

  // Settings Functions - เพิ่มการจัดการโลโก้และ QR Code
  loadSettings() {
    const settings = App.getSettings();

    document.getElementById("storeName").value = settings.storeName || "";
    document.getElementById("storeAddress").value = settings.storeAddress || "";
    document.getElementById("storePhone").value = settings.storePhone || "";
    document.getElementById("storePromptPay").value = settings.promptpay || "";
    document.getElementById("taxRate").value = settings.tax || 7;
    document.getElementById("memberDiscount").value =
      settings.memberDiscount || 5;
    document.getElementById("pointRate").value = settings.pointRate || 100;
    document.getElementById("receiptFooterMessage").value =
      settings.receipt?.footerMessage || "";

    // Load checkboxes
    document.getElementById("showStorePhone").checked =
      settings.receipt?.showPhone !== false;
    document.getElementById("showStoreLogo").checked =
      settings.receipt?.showLogo !== false;

    // Load logo preview
    if (settings.logoBlackWhite) {
      document.getElementById(
        "logoPreview"
      ).innerHTML = `<img src="${settings.logoBlackWhite}" alt="โลโก้" class="h-16 mx-auto filter grayscale">`;
    }

    // Load QR code preview
    if (settings.qrCode) {
      document.getElementById(
        "qrCodePreview"
      ).innerHTML = `<img src="${settings.qrCode}" alt="QR Code" class="h-24 mx-auto">`;
    }
  },

  // Handle logo upload for settings
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

      Utils.showToast("อัพโหลดโลโก้สำเร็จ", "success");
    };
    reader.readAsDataURL(file);
  },

  // Handle QR code upload for settings
  handleQRUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const qrData = e.target.result;
      const preview = document.getElementById("qrCodePreview");

      preview.innerHTML = `<img src="${qrData}" alt="QR Code" class="h-24 mx-auto">`;

      // Save to settings
      const settings = App.getSettings();
      settings.qrCode = qrData;
      App.updateSettings(settings);

      Utils.showToast("อัพโหลด QR Code สำเร็จ", "success");
    };
    reader.readAsDataURL(file);
  },

  saveSettings() {
    const updates = {
      storeName: document.getElementById("storeName").value,
      storeAddress: document.getElementById("storeAddress").value,
      storePhone: document.getElementById("storePhone").value,
      promptpay: document.getElementById("storePromptPay").value,
      tax: parseFloat(document.getElementById("taxRate").value),
      memberDiscount: parseFloat(
        document.getElementById("memberDiscount").value
      ),
      pointRate: parseInt(document.getElementById("pointRate").value),
    };

    // Receipt settings
    if (!updates.receipt) updates.receipt = {};
    updates.receipt.footerMessage = document.getElementById(
      "receiptFooterMessage"
    ).value;
    updates.receipt.showPhone =
      document.getElementById("showStorePhone").checked;
    updates.receipt.showLogo = document.getElementById("showStoreLogo").checked;

    App.updateSettings(updates);
    Utils.showToast("บันทึกการตั้งค่าสำเร็จ", "success");
  },

  // Data Management
  backupData() {
    App.exportData();
    Utils.showToast("สำรองข้อมูลสำเร็จ", "success");
  },

  restoreData() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        await App.importData(file);
        Utils.showToast("กู้คืนข้อมูลสำเร็จ", "success");
        setTimeout(() => location.reload(), 1000);
      } catch (error) {
        Utils.showToast("ไฟล์ไม่ถูกต้อง", "error");
      }
    };
    input.click();
  },

  // Quick Actions
  quickSale() {
    this.closePage();

    const content = `
      <div class="p-6">
        <h3 class="text-xl font-bold text-gray-800 mb-4">ขายด่วน</h3>
        
        <form onsubmit="BackOffice.processQuickSale(event)">
          <div class="space-y-4">
            <div>
              <label class="text-gray-700 text-sm font-medium">ชื่อสินค้า</label>
              <input type="text" id="quickSaleName" value="ขายด่วน" required
                     class="w-full mt-1 p-2 rounded-lg border border-gray-300 text-gray-800">
            </div>
            
            <div>
              <label class="text-gray-700 text-sm font-medium">จำนวนเงิน *</label>
              <input type="number" id="quickSaleAmount" required min="0" step="0.01"
                     class="w-full mt-1 p-3 text-xl rounded-lg border border-gray-300 text-gray-800 text-center"
                     placeholder="0.00" autofocus>
            </div>
            
            <!-- Quick amount buttons -->
            <div class="grid grid-cols-4 gap-2">
              ${[20, 50, 100, 500]
                .map(
                  (amount) => `
                <button type="button" onclick="document.getElementById('quickSaleAmount').value=${amount}"
                        class="bg-gradient-to-br from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 py-2 rounded text-gray-700 font-medium shadow transition">
                  ${amount}
                </button>
              `
                )
                .join("")}
            </div>
          </div>
          
          <div class="flex gap-3 mt-6">
            <button type="button" onclick="Utils.closeModal(this.closest('.fixed'))"
                    class="flex-1 bg-gray-200 hover:bg-gray-300 py-2 rounded-lg text-gray-800">
              ยกเลิก
            </button>
            <button type="submit"
                    class="flex-1 btn-primary py-2 rounded-lg text-white">
              เพิ่มลงตะกร้า
            </button>
          </div>
        </form>
      </div>
    `;

    Utils.createModal(content, { size: "w-full max-w-sm" });
  },

  processQuickSale(event) {
    event.preventDefault();

    const name = document.getElementById("quickSaleName").value;
    const amount = parseFloat(document.getElementById("quickSaleAmount").value);

    if (amount <= 0) {
      Utils.showToast("กรุณาระบุจำนวนเงินที่ถูกต้อง", "error");
      return;
    }

    const quickProduct = {
      id: "quick_" + Date.now(),
      name: name,
      price: amount,
      category: 0,
      image: "💰",
      stock: 999,
    };

    Cart.addItem(quickProduct, 1, false);
    Utils.closeModal(event.target.closest(".fixed"));
    Cart.open();
  },

  exportDailyReport() {
    const today = new Date().toISOString().split("T")[0];
    const report = Reports.generateDailyReport(new Date());
    Reports.exportReport(report, "csv");
  },

  // Category management
  editCategory(id) {
    const category = Categories.getById(id);
    if (!category) return;

    const content = `
      <div class="p-6">
        <h3 class="text-xl font-bold text-gray-800 mb-4">แก้ไขหมวดหมู่</h3>
        
        <form onsubmit="BackOffice.updateCategory(event, ${id})">
          <div class="space-y-4">
            <div>
              <label class="text-gray-700 text-sm font-medium">ชื่อหมวดหมู่ *</label>
              <input type="text" id="categoryName" required value="${
                category.name
              }"
                     class="w-full mt-1 p-2 rounded-lg border border-gray-300 text-gray-800">
            </div>
            
            <div>
              <label class="text-gray-700 text-sm font-medium">ไอคอน</label>
              <div class="grid grid-cols-6 gap-2 mt-2 max-h-48 overflow-y-auto p-2 border border-gray-200 rounded-lg">
                ${Categories.availableIcons
                  .map(
                    (item) => `
                  <button type="button" 
                          onclick="Categories.selectIcon('${item.icon}', this)"
                          class="icon-option p-3 rounded-lg hover:bg-gray-100 text-gray-600 transition ${
                            category.icon === item.icon
                              ? "bg-blue-100 text-blue-600 ring-2 ring-blue-500"
                              : ""
                          }"
                          title="${item.name}">
                    <i class="fas ${item.icon} text-xl"></i>
                  </button>
                `
                  )
                  .join("")}
              </div>
              <input type="hidden" id="categoryIcon" value="${category.icon}">
            </div>
            
            <div>
              <label class="text-gray-700 text-sm font-medium">สี</label>
              <div class="grid grid-cols-6 gap-2 mt-2">
                ${Categories.availableColors
                  .map(
                    (color) => `
                  <button type="button"
                          onclick="Categories.selectColor('${
                            color.value
                          }', this)"
                          class="color-option p-3 rounded-lg transition hover:scale-110 ${
                            category.color === color.value
                              ? "ring-4 ring-gray-400 ring-offset-2"
                              : ""
                          }"
                          style="background-color: ${color.hex};"
                          title="${color.name}">
                  </button>
                `
                  )
                  .join("")}
              </div>
              <input type="hidden" id="categoryColor" value="${category.color}">
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

    Utils.createModal(content, { size: "w-full max-w-lg" });
  },

  updateCategory(event, id) {
    event.preventDefault();

    const categoryData = {
      name: document.getElementById("categoryName").value.trim(),
      icon: document.getElementById("categoryIcon").value,
      color: document.getElementById("categoryColor").value,
    };

    Categories.update(id, categoryData);
    Utils.closeModal(event.target.closest(".fixed"));
    this.loadCategoriesList();
    POS.loadCategories();
  },
};
