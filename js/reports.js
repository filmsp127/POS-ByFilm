// Reports Module
const Reports = {
  // Report types
  types: {
    DAILY: "daily",
    WEEKLY: "weekly",
    MONTHLY: "monthly",
    CUSTOM: "custom",
    INVENTORY: "inventory",
    PROFIT: "profit",
    TAX: "tax",
  },

  // Generate daily report
  generateDailyReport(date = new Date()) {
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    const sales = App.getSalesByDateRange(
      startDate.toISOString(),
      endDate.toISOString()
    );

    return this.generateSalesReport(sales, {
      title: `รายงานประจำวัน ${Utils.formatDate(date, "long")}`,
      period: "daily",
    });
  },

  // Generate weekly report
  generateWeeklyReport(startDate) {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);

    const sales = App.getSalesByDateRange(
      start.toISOString(),
      end.toISOString()
    );

    return this.generateSalesReport(sales, {
      title: `รายงานประจำสัปดาห์ ${Utils.formatDate(
        start
      )} - ${Utils.formatDate(end)}`,
      period: "weekly",
    });
  },

  // Generate monthly report
  generateMonthlyReport(year, month) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59, 999);

    const sales = App.getSalesByDateRange(
      start.toISOString(),
      end.toISOString()
    );

    const monthName = start.toLocaleDateString("th-TH", {
      month: "long",
      year: "numeric",
    });

    return this.generateSalesReport(sales, {
      title: `รายงานประจำเดือน ${monthName}`,
      period: "monthly",
    });
  },

  // Generate sales report
  generateSalesReport(sales, options = {}) {
    const report = {
      title: options.title || "รายงานการขาย",
      period: options.period || "custom",
      generatedAt: new Date().toISOString(),
      summary: {
        totalSales: sales.length,
        totalRevenue: 0,
        totalCost: 0,
        totalProfit: 0,
        totalDiscount: 0,
        totalTax: 0,
        cashSales: 0,
        transferSales: 0,
        memberSales: 0,
      },
      products: {},
      categories: {},
      hourly: {},
      daily: {},
    };

    // Process sales data
    sales.forEach((sale) => {
      // Summary
      report.summary.totalRevenue += sale.total;
      report.summary.totalDiscount += sale.discount || 0;

      // Payment method
      if (sale.paymentMethod === "cash") {
        report.summary.cashSales += sale.total;
      } else {
        report.summary.transferSales += sale.total;
      }

      // Member sales
      if (sale.memberId) {
        report.summary.memberSales += sale.total;
      }

      // Process items
      sale.items.forEach((item) => {
        // Product sales
        if (!report.products[item.id]) {
          const product = App.getProductById(item.id);
          report.products[item.id] = {
            id: item.id,
            name: item.name,
            quantity: 0,
            revenue: 0,
            cost: 0,
            profit: 0,
            category: product ? product.category : null,
          };
        }

        report.products[item.id].quantity += item.quantity;
        report.products[item.id].revenue += item.price * item.quantity;

        // Calculate cost and profit
        const product = App.getProductById(item.id);
        if (product && product.cost) {
          const itemCost = product.cost * item.quantity;
          report.products[item.id].cost += itemCost;
          report.products[item.id].profit +=
            (item.price - product.cost) * item.quantity;
          report.summary.totalCost += itemCost;
        }
      });

      // Hourly distribution
      const hour = new Date(sale.date).getHours();
      if (!report.hourly[hour]) {
        report.hourly[hour] = {
          sales: 0,
          revenue: 0,
        };
      }
      report.hourly[hour].sales++;
      report.hourly[hour].revenue += sale.total;

      // Daily distribution (for weekly/monthly reports)
      if (options.period !== "daily") {
        const day = new Date(sale.date).toLocaleDateString();
        if (!report.daily[day]) {
          report.daily[day] = {
            sales: 0,
            revenue: 0,
          };
        }
        report.daily[day].sales++;
        report.daily[day].revenue += sale.total;
      }
    });

    // Calculate total profit
    report.summary.totalProfit =
      report.summary.totalRevenue - report.summary.totalCost;

    // Calculate tax (simplified)
    const taxRate = App.getSettings().tax || 7;
    report.summary.totalTax =
      (report.summary.totalRevenue * taxRate) / (100 + taxRate);

    // Category summary
    const categories = App.getCategories();
    categories.forEach((category) => {
      report.categories[category.id] = {
        id: category.id,
        name: category.name,
        quantity: 0,
        revenue: 0,
        profit: 0,
      };
    });

    // Aggregate by category
    Object.values(report.products).forEach((product) => {
      if (product.category && report.categories[product.category]) {
        report.categories[product.category].quantity += product.quantity;
        report.categories[product.category].revenue += product.revenue;
        report.categories[product.category].profit += product.profit;
      }
    });

    return report;
  },

  // Generate inventory report
  generateInventoryReport() {
    const products = App.getProducts();
    const categories = App.getCategories();

    const report = {
      title: "รายงานสินค้าคงคลัง",
      generatedAt: new Date().toISOString(),
      summary: {
        totalProducts: products.length,
        totalStock: 0,
        totalValue: 0,
        totalCost: 0,
        lowStock: 0,
        outOfStock: 0,
      },
      byCategory: {},
      products: [],
    };

    // Initialize categories
    categories.forEach((category) => {
      report.byCategory[category.id] = {
        name: category.name,
        count: 0,
        stock: 0,
        value: 0,
        cost: 0,
      };
    });

    // Process products
    products.forEach((product) => {
      const value = product.price * product.stock;
      const cost = (product.cost || 0) * product.stock;

      // Summary
      report.summary.totalStock += product.stock;
      report.summary.totalValue += value;
      report.summary.totalCost += cost;

      if (product.stock <= 0) {
        report.summary.outOfStock++;
      } else if (product.stock < Config.business.minStockWarning) {
        report.summary.lowStock++;
      }

      // By category
      if (report.byCategory[product.category]) {
        report.byCategory[product.category].count++;
        report.byCategory[product.category].stock += product.stock;
        report.byCategory[product.category].value += value;
        report.byCategory[product.category].cost += cost;
      }

      // Product details
      report.products.push({
        id: product.id,
        code: product.code,
        name: product.name,
        category: product.category,
        price: product.price,
        cost: product.cost || 0,
        stock: product.stock,
        value: value,
        costValue: cost,
        status:
          product.stock <= 0 ? "หมด" : product.stock < 10 ? "ใกล้หมด" : "ปกติ",
      });
    });

    return report;
  },

  // Generate profit report
  generateProfitReport(startDate, endDate) {
    const sales = App.getSalesByDateRange(startDate, endDate);
    const report = this.generateSalesReport(sales, {
      title: `รายงานกำไรขาดทุน ${Utils.formatDate(
        startDate
      )} - ${Utils.formatDate(endDate)}`,
      period: "custom",
    });

    // Add profit analysis
    report.profitAnalysis = {
      grossProfit: report.summary.totalRevenue - report.summary.totalCost,
      grossProfitMargin:
        report.summary.totalRevenue > 0
          ? (
              ((report.summary.totalRevenue - report.summary.totalCost) /
                report.summary.totalRevenue) *
              100
            ).toFixed(2)
          : 0,
      netProfit: report.summary.totalProfit - report.summary.totalTax,
      netProfitMargin:
        report.summary.totalRevenue > 0
          ? (
              ((report.summary.totalProfit - report.summary.totalTax) /
                report.summary.totalRevenue) *
              100
            ).toFixed(2)
          : 0,
    };

    // Top profitable products
    report.topProfitable = Object.values(report.products)
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 10);

    // Low margin products
    report.lowMargin = Object.values(report.products)
      .filter((p) => p.revenue > 0)
      .map((p) => ({
        ...p,
        margin: ((p.profit / p.revenue) * 100).toFixed(2),
      }))
      .sort((a, b) => a.margin - b.margin)
      .slice(0, 10);

    return report;
  },

  // Generate tax report
  generateTaxReport(year, month = null) {
    let startDate, endDate;

    if (month) {
      startDate = new Date(year, month - 1, 1);
      endDate = new Date(year, month, 0, 23, 59, 59, 999);
    } else {
      startDate = new Date(year, 0, 1);
      endDate = new Date(year, 11, 31, 23, 59, 59, 999);
    }

    const sales = App.getSalesByDateRange(
      startDate.toISOString(),
      endDate.toISOString()
    );

    const taxRate = App.getSettings().tax || 7;

    const report = {
      title: month
        ? `รายงานภาษี ${startDate.toLocaleDateString("th-TH", {
            month: "long",
            year: "numeric",
          })}`
        : `รายงานภาษีประจำปี ${year}`,
      taxRate: taxRate,
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
      summary: {
        totalSales: sales.length,
        totalRevenue: 0,
        totalTaxableRevenue: 0,
        totalTax: 0,
        cashRevenue: 0,
        transferRevenue: 0,
      },
      monthly: {},
      daily: {},
    };

    // Process sales
    sales.forEach((sale) => {
      const revenue = sale.total;
      const taxableRevenue = revenue;
      const tax = (taxableRevenue * taxRate) / (100 + taxRate);

      // Summary
      report.summary.totalRevenue += revenue;
      report.summary.totalTaxableRevenue += taxableRevenue;
      report.summary.totalTax += tax;

      if (sale.paymentMethod === "cash") {
        report.summary.cashRevenue += revenue;
      } else {
        report.summary.transferRevenue += revenue;
      }

      // Monthly breakdown
      const monthKey = new Date(sale.date).toLocaleDateString("th-TH", {
        year: "numeric",
        month: "long",
      });

      if (!report.monthly[monthKey]) {
        report.monthly[monthKey] = {
          sales: 0,
          revenue: 0,
          tax: 0,
        };
      }

      report.monthly[monthKey].sales++;
      report.monthly[monthKey].revenue += revenue;
      report.monthly[monthKey].tax += tax;

      // Daily breakdown (for monthly reports)
      if (month) {
        const dayKey = new Date(sale.date).getDate();

        if (!report.daily[dayKey]) {
          report.daily[dayKey] = {
            sales: 0,
            revenue: 0,
            tax: 0,
          };
        }

        report.daily[dayKey].sales++;
        report.daily[dayKey].revenue += revenue;
        report.daily[dayKey].tax += tax;
      }
    });

    return report;
  },

  // Format report for display
  formatReportHTML(report) {
    let html = `
        <div class="bg-white rounded-xl shadow-lg p-6">
          <h2 class="text-2xl font-bold text-gray-800 mb-6">${report.title}</h2>
          
          <!-- Summary Cards -->
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      `;

    // Add summary cards based on report type
    if (report.summary.totalRevenue !== undefined) {
      html += `
          <div class="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-4 text-white">
            <div class="text-sm opacity-90">ยอดขายรวม</div>
            <div class="text-2xl font-bold">${Utils.formatCurrency(
              report.summary.totalRevenue
            )}</div>
          </div>
        `;
    }

    if (report.summary.totalSales !== undefined) {
      html += `
          <div class="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-4 text-white">
            <div class="text-sm opacity-90">จำนวนบิล</div>
            <div class="text-2xl font-bold">${report.summary.totalSales}</div>
          </div>
        `;
    }

    if (report.summary.totalProfit !== undefined) {
      html += `
          <div class="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-4 text-white">
            <div class="text-sm opacity-90">กำไร</div>
            <div class="text-2xl font-bold">${Utils.formatCurrency(
              report.summary.totalProfit
            )}</div>
          </div>
        `;
    }

    if (report.summary.totalTax !== undefined) {
      html += `
          <div class="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg p-4 text-white">
            <div class="text-sm opacity-90">ภาษี</div>
            <div class="text-2xl font-bold">${Utils.formatCurrency(
              report.summary.totalTax
            )}</div>
          </div>
        `;
    }

    html += `</div>`;

    // Add charts placeholder
    html += `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <div class="bg-gray-50 rounded-lg p-4">
            <h3 class="font-bold text-gray-800 mb-4">กราฟยอดขาย</h3>
            <canvas id="salesChart" height="200"></canvas>
          </div>
          <div class="bg-gray-50 rounded-lg p-4">
            <h3 class="font-bold text-gray-800 mb-4">สัดส่วนหมวดหมู่</h3>
            <canvas id="categoryChart" height="200"></canvas>
          </div>
        </div>
      `;

    // Add detailed tables
    if (report.products && Object.keys(report.products).length > 0) {
      html += `
          <div class="mt-6">
            <h3 class="font-bold text-gray-800 mb-4">รายละเอียดสินค้า</h3>
            <div class="overflow-x-auto">
              <table class="w-full">
                <thead class="bg-gray-100">
                  <tr>
                    <th class="p-3 text-left">สินค้า</th>
                    <th class="p-3 text-right">จำนวน</th>
                    <th class="p-3 text-right">ยอดขาย</th>
                    <th class="p-3 text-right">กำไร</th>
                  </tr>
                </thead>
                <tbody>
        `;

      const sortedProducts = Object.values(report.products)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 20);

      sortedProducts.forEach((product) => {
        html += `
            <tr class="border-b hover:bg-gray-50">
              <td class="p-3">${product.name}</td>
              <td class="p-3 text-right">${product.quantity}</td>
              <td class="p-3 text-right">${Utils.formatCurrency(
                product.revenue
              )}</td>
              <td class="p-3 text-right text-green-600">${Utils.formatCurrency(
                product.profit
              )}</td>
            </tr>
          `;
      });

      html += `
                </tbody>
              </table>
            </div>
          </div>
        `;
    }

    html += `
          <div class="mt-6 text-center text-gray-500 text-sm">
            สร้างเมื่อ: ${Utils.formatDate(report.generatedAt, "long")}
          </div>
        </div>
      `;

    return html;
  },

  // Export report
  exportReport(report, format = "pdf") {
    switch (format) {
      case "csv":
        this.exportReportCSV(report);
        break;
      case "excel":
        this.exportReportExcel(report);
        break;
      case "pdf":
      default:
        this.exportReportPDF(report);
        break;
    }
  },

  // Export to CSV
  exportReportCSV(report) {
    let csvData = [];

    // Add summary
    csvData.push({
      รายการ: "ยอดขายรวม",
      จำนวน: report.summary.totalRevenue,
    });
    csvData.push({
      รายการ: "จำนวนบิล",
      จำนวน: report.summary.totalSales,
    });
    csvData.push({
      รายการ: "กำไร",
      จำนวน: report.summary.totalProfit,
    });

    // Add blank row
    csvData.push({});

    // Add products
    if (report.products) {
      Object.values(report.products).forEach((product) => {
        csvData.push({
          สินค้า: product.name,
          จำนวน: product.quantity,
          ยอดขาย: product.revenue,
          กำไร: product.profit,
        });
      });
    }

    const filename = `${report.title.replace(/\s+/g, "-")}-${
      new Date().toISOString().split("T")[0]
    }.csv`;
    Utils.exportToCSV(csvData, filename);
  },

  // Export to PDF (simplified)
  exportReportPDF(report) {
    const html = this.formatReportHTML(report);
    Utils.print(html, report.title);
  },

  // Schedule reports
  scheduleReport(config) {
    // In a real app, this would set up scheduled jobs
    console.log("Report scheduled:", config);
    Utils.showToast("ตั้งค่าการสร้างรายงานอัตโนมัติแล้ว", "success");
  },
};
