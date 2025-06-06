// Products Management Module
const Products = {
  // Search products
  search(keyword) {
    const products = App.getProducts();
    const searchTerm = keyword.toLowerCase().trim();

    if (!searchTerm) return products;

    return products.filter((product) => {
      return (
        product.name.toLowerCase().includes(searchTerm) ||
        (product.code && product.code.toLowerCase().includes(searchTerm)) ||
        (product.barcode && product.barcode.includes(searchTerm))
      );
    });
  },

  // Filter products
  filter(options = {}) {
    let products = App.getProducts();

    // Filter by category
    if (options.category && options.category !== "all") {
      products = products.filter((p) => p.category === options.category);
    }

    // Filter by price range
    if (options.minPrice !== undefined) {
      products = products.filter((p) => p.price >= options.minPrice);
    }
    if (options.maxPrice !== undefined) {
      products = products.filter((p) => p.price <= options.maxPrice);
    }

    // Filter by stock
    if (options.inStock) {
      products = products.filter((p) => p.stock > 0);
    }
    if (options.lowStock) {
      products = products.filter(
        (p) => p.stock < Config.business.minStockWarning
      );
    }

    // Sort
    if (options.sortBy) {
      products = this.sort(products, options.sortBy, options.sortOrder);
    }

    return products;
  },

  // Sort products
  sort(products, sortBy = "name", sortOrder = "asc") {
    const sorted = [...products];
    const multiplier = sortOrder === "desc" ? -1 : 1;

    sorted.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name) * multiplier;
        case "price":
          return (a.price - b.price) * multiplier;
        case "stock":
          return (a.stock - b.stock) * multiplier;
        case "category":
          return (a.category - b.category) * multiplier;
        case "sales":
          const aSales = this.getProductSales(a.id);
          const bSales = this.getProductSales(b.id);
          return (aSales - bSales) * multiplier;
        default:
          return 0;
      }
    });

    return sorted;
  },

  // Get product sales count
  getProductSales(productId) {
  const sales = App.getSales();
  let totalQuantity = 0;

  sales.forEach((sale) => {
    // ข้ามบิลที่ถูก refund แล้ว
    if (sale.refunded) return;
    
    sale.items.forEach((item) => {
      if (item.id === productId) {
        totalQuantity += item.quantity;
      }
    });
  });

  return totalQuantity;
},

  // Get product revenue
  getProductRevenue(productId) {
  const sales = App.getSales();
  let totalRevenue = 0;

  sales.forEach((sale) => {
    // ข้ามบิลที่ถูก refund แล้ว
    if (sale.refunded) return;
    
    sale.items.forEach((item) => {
      if (item.id === productId) {
        totalRevenue += item.price * item.quantity;
      }
    });
  });

  return totalRevenue;
},

  // Get product profit
  getProductProfit(productId) {
  const product = App.getProductById(productId);
  if (!product || !product.cost) return 0;

  const sales = App.getSales();
  let totalProfit = 0;

  sales.forEach((sale) => {
    // ข้ามบิลที่ถูก refund แล้ว
    if (sale.refunded) return;
    
    sale.items.forEach((item) => {
      if (item.id === productId) {
        const profit = (item.price - product.cost) * item.quantity;
        totalProfit += profit;
      }
    });
  });

  return totalProfit;
},

  // Get low stock products
  getLowStock() {
    return App.getProducts().filter(
      (p) => p.stock < Config.business.minStockWarning
    );
  },

  // Get out of stock products
  getOutOfStock() {
    return App.getProducts().filter((p) => p.stock <= 0);
  },

  // Get best selling products
  getBestSelling(limit = 10, dateRange = null) {
    const products = App.getProducts();
    const sales = dateRange
      ? App.getSalesByDateRange(dateRange.start, dateRange.end)
      : App.getSales();

    // Calculate sales for each product
    const productSales = {};

    sales.forEach((sale) => {
      sale.items.forEach((item) => {
        if (!productSales[item.id]) {
          productSales[item.id] = {
            id: item.id,
            name: item.name,
            quantity: 0,
            revenue: 0,
          };
        }
        productSales[item.id].quantity += item.quantity;
        productSales[item.id].revenue += item.price * item.quantity;
      });
    });

    // Sort by quantity sold
    const sorted = Object.values(productSales).sort(
      (a, b) => b.quantity - a.quantity
    );

    return sorted.slice(0, limit);
  },

  // Update stock
  updateStock(productId, quantity, operation = "set") {
    const product = App.getProductById(productId);
    if (!product) return false;

    let newStock;
    switch (operation) {
      case "add":
        newStock = product.stock + quantity;
        break;
      case "subtract":
        newStock = Math.max(0, product.stock - quantity);
        break;
      case "set":
      default:
        newStock = quantity;
        break;
    }

    App.updateProduct(productId, { stock: newStock });
    return true;
  },

  // Bulk update stocks
  bulkUpdateStock(updates) {
    const results = [];

    updates.forEach((update) => {
      const success = this.updateStock(
        update.productId,
        update.quantity,
        update.operation
      );
      results.push({
        productId: update.productId,
        success: success,
      });
    });

    return results;
  },

  // Import products from CSV
  importFromCSV(csvData) {
    try {
      const lines = csvData.split("\n");
      const headers = lines[0].split(",").map((h) => h.trim());
      const products = [];

      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;

        const values = lines[i].split(",").map((v) => v.trim());
        const product = {};

        headers.forEach((header, index) => {
          const value = values[index] || "";

          switch (header.toLowerCase()) {
            case "name":
            case "ชื่อ":
              product.name = value;
              break;
            case "price":
            case "ราคา":
              product.price = parseFloat(value) || 0;
              break;
            case "cost":
            case "ต้นทุน":
              product.cost = parseFloat(value) || 0;
              break;
            case "stock":
            case "สต็อค":
              product.stock = parseInt(value) || 0;
              break;
            case "category":
            case "หมวดหมู่":
              // Map category name to ID
              const category = App.getCategories().find(
                (c) => c.name === value
              );
              product.category = category ? category.id : 2;
              break;
            case "code":
            case "รหัส":
              product.code = value;
              break;
            case "barcode":
            case "บาร์โค้ด":
              product.barcode = value;
              break;
          }
        });

        // Validate required fields
        if (product.name && product.price !== undefined) {
          // Set defaults
          product.image = product.image || "📦";
          product.imageType = "emoji";
          product.category = product.category || 2;
          product.stock = product.stock || 0;

          products.push(product);
        }
      }

      // Add products
      let successCount = 0;
      products.forEach((product) => {
        App.addProduct(product);
        successCount++;
      });

      return {
        success: true,
        count: successCount,
        message: `นำเข้าสินค้าสำเร็จ ${successCount} รายการ`,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: "เกิดข้อผิดพลาดในการนำเข้าข้อมูล",
      };
    }
  },

  // Export products to CSV
  exportToCSV() {
    const products = App.getProducts();
    const categories = App.getCategories();

    const data = products.map((product) => {
      const category = categories.find((c) => c.id === product.category);

      return {
        รหัส: product.code || "",
        ชื่อ: product.name,
        หมวดหมู่: category ? category.name : "",
        ต้นทุน: product.cost || 0,
        ราคา: product.price,
        สต็อค: product.stock,
        บาร์โค้ด: product.barcode || "",
        ขายแล้ว: this.getProductSales(product.id),
        รายได้: this.getProductRevenue(product.id),
      };
    });

    Utils.exportToCSV(
      data,
      `products-${new Date().toISOString().split("T")[0]}.csv`
    );
  },

  // Validate product data
  validate(productData) {
    const errors = [];

    // Required fields
    if (!productData.name || productData.name.trim() === "") {
      errors.push("กรุณาระบุชื่อสินค้า");
    }

    if (!productData.price || productData.price <= 0) {
      errors.push("กรุณาระบุราคาขายที่ถูกต้อง");
    }

    if (productData.stock < 0) {
      errors.push("จำนวนสต็อคต้องไม่ติดลบ");
    }

    // Check duplicate code
    if (productData.code) {
      const existing = App.getProducts().find(
        (p) => p.code === productData.code && p.id !== productData.id
      );
      if (existing) {
        errors.push("รหัสสินค้านี้มีอยู่แล้ว");
      }
    }

    // Check duplicate barcode
    if (productData.barcode) {
      const existing = App.getProducts().find(
        (p) => p.barcode === productData.barcode && p.id !== productData.id
      );
      if (existing) {
        errors.push("บาร์โค้ดนี้มีอยู่แล้ว");
      }
    }

    // Business rules
    if (productData.cost && productData.cost > productData.price) {
      errors.push("ต้นทุนไม่ควรสูงกว่าราคาขาย");
    }

    return {
      valid: errors.length === 0,
      errors: errors,
    };
  },

  // Get product statistics
  getStatistics() {
    const products = App.getProducts();
    const sales = App.getSales();

    // Calculate total values
    let totalValue = 0;
    let totalCost = 0;
    let totalStock = 0;

    products.forEach((product) => {
      totalValue += product.price * product.stock;
      totalCost += (product.cost || 0) * product.stock;
      totalStock += product.stock;
    });

    // Calculate sales statistics
    let totalRevenue = 0;
    let totalQuantitySold = 0;

    sales.forEach((sale) => {
      totalRevenue += sale.total;
      sale.items.forEach((item) => {
        totalQuantitySold += item.quantity;
      });
    });

    return {
      totalProducts: products.length,
      totalStock: totalStock,
      totalValue: totalValue,
      totalCost: totalCost,
      potentialProfit: totalValue - totalCost,
      lowStockCount: this.getLowStock().length,
      outOfStockCount: this.getOutOfStock().length,
      totalRevenue: totalRevenue,
      totalQuantitySold: totalQuantitySold,
      averagePrice:
        products.length > 0
          ? products.reduce((sum, p) => sum + p.price, 0) / products.length
          : 0,
    };
  },

  // Generate barcode (placeholder)
  generateBarcode() {
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0");
    return `${timestamp}${random}`;
  },

  // Print product labels
  printLabels(productIds) {
    const products = productIds
      .map((id) => App.getProductById(id))
      .filter(Boolean);

    if (products.length === 0) {
      Utils.showToast("ไม่พบสินค้าที่เลือก", "error");
      return;
    }

    let labelsHtml = `
        <style>
          @page { size: A4; margin: 10mm; }
          .label { 
            width: 60mm; 
            height: 30mm; 
            border: 1px solid #ccc; 
            padding: 5mm; 
            margin: 5mm;
            float: left;
            text-align: center;
            font-family: Arial, sans-serif;
          }
          .product-name { font-weight: bold; font-size: 14px; margin-bottom: 5px; }
          .product-price { font-size: 18px; color: #e74c3c; font-weight: bold; }
          .product-code { font-size: 10px; color: #666; margin-top: 5px; }
        </style>
      `;

    products.forEach((product) => {
      labelsHtml += `
          <div class="label">
            <div class="product-name">${product.name}</div>
            <div class="product-price">${Utils.formatCurrency(
              product.price
            )}</div>
            ${
              product.code
                ? `<div class="product-code">${product.code}</div>`
                : ""
            }
          </div>
        `;
    });

    Utils.print(labelsHtml, "ป้ายราคาสินค้า");
  },
};
