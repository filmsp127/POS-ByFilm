// Utility Functions
const Utils = {
  // Format currency
  formatCurrency(amount) {
    return `฿${amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
  },

  // Format date
  formatDate(date, format = "short") {
    const d = new Date(date);
    if (format === "short") {
      return d.toLocaleDateString("th-TH");
    } else if (format === "long") {
      return d.toLocaleString("th-TH");
    } else if (format === "time") {
      return d.toLocaleTimeString("th-TH");
    }
    return d.toString();
  },

  // Generate unique ID
  generateId() {
    return Date.now() + Math.random().toString(36).substr(2, 9);
  },

  // Show toast notification
  showToast(message, type = "info", duration = 3000) {
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;

    const icon =
      type === "error"
        ? "fa-exclamation-circle"
        : type === "success"
        ? "fa-check-circle"
        : type === "warning"
        ? "fa-exclamation-triangle"
        : "fa-info-circle";

    const iconColor =
      type === "error"
        ? "text-red-500"
        : type === "success"
        ? "text-green-500"
        : type === "warning"
        ? "text-yellow-500"
        : "text-blue-500";

    toast.innerHTML = `
            <div class="flex items-center gap-3">
                <i class="fas ${icon} ${iconColor} text-xl"></i>
                <span class="text-gray-700 font-medium">${message}</span>
            </div>
        `;

    const container = document.getElementById("toastContainer");
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateX(100%)";
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },

  // Create modal
createModal(content, options = {}) {
  const modal = document.createElement("div");
  modal.className = "fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4";
  
  // Check if mobile
  const isMobile = window.innerWidth <= 640;
  const sizeClass = options.size || "w-full max-w-md";
  
  // สำหรับ modal ที่ต้องการเต็มจอบนมือถือ
  const modalClass = isMobile && options.mobileFullscreen !== false 
    ? "w-full h-full max-w-full max-h-full m-0 rounded-none" 
    : sizeClass;
  
  // เพิ่ม max-height และ flex สำหรับ modal ทั่วไป
  const heightClass = modalClass.includes('h-full') ? '' : 'max-h-[90vh]';
  
  // Check if content has modal structure
  const hasModalStructure = content.includes('modal-with-footer') || 
                          content.includes('modal-body') || 
                          content.includes('modal-footer');
  
  if (hasModalStructure) {
    // Content already has proper structure
    modal.innerHTML = `
      <div class="bg-white rounded-xl shadow-2xl ${modalClass} ${heightClass} flex flex-col overflow-hidden">
        ${content}
      </div>
    `;
  } else {
    // Wrap content in proper structure
    modal.innerHTML = `
      <div class="bg-white rounded-xl shadow-2xl ${modalClass} ${heightClass} flex flex-col overflow-hidden">
        <div class="flex-1 overflow-y-auto">
          ${content}
        </div>
      </div>
    `;
  }

  // ป้องกันการปิด modal โดยไม่ตั้งใจบนมือถือ
  if (options.closeOnClick !== false) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal && !isMobile) {
        modal.remove();
      }
    });
  }

  document.getElementById("modalsContainer").appendChild(modal);
  
  // Focus management และป้องกัน body scroll
  if (isMobile) {
    document.body.style.overflow = 'hidden';
    
    // Find first input and focus it after a delay
    setTimeout(() => {
      const firstInput = modal.querySelector('input:not([type="hidden"]), textarea, select');
      if (firstInput && !firstInput.readOnly) {
        firstInput.focus();
        // Scroll to input if needed
        firstInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 300);
  }
  
  return modal;
},

// Close modal
closeModal(modal) {
  if (modal) {
    // Re-enable body scroll
    document.body.style.overflow = '';
    
    modal.style.opacity = "0";
    setTimeout(() => modal.remove(), 300);
  }
},

  // Confirm dialog
  confirm(message, onConfirm, onCancel) {
    const content = `
            <div class="p-6">
                <h3 class="text-xl font-bold text-gray-800 mb-4">ยืนยันการดำเนินการ</h3>
                <p class="text-gray-600 mb-6">${message}</p>
                <div class="flex gap-3">
                    <button onclick="Utils.confirmCancel(this)" class="flex-1 bg-gray-200 hover:bg-gray-300 py-2 rounded-lg text-gray-800">
                        ยกเลิก
                    </button>
                    <button onclick="Utils.confirmOK(this)" class="flex-1 btn-primary py-2 rounded-lg text-white">
                        ยืนยัน
                    </button>
                </div>
            </div>
        `;

    const modal = this.createModal(content);
    modal._onConfirm = onConfirm;
    modal._onCancel = onCancel;
  },

  confirmOK(button) {
    const modal = button.closest(".fixed");
    if (modal._onConfirm) modal._onConfirm();
    this.closeModal(modal);
  },

  confirmCancel(button) {
    const modal = button.closest(".fixed");
    if (modal._onCancel) modal._onCancel();
    this.closeModal(modal);
  },

  // Loading overlay
  showLoading(message = "กำลังโหลด...") {
    const loading = document.createElement("div");
    loading.id = "loadingOverlay";
    loading.className =
      "fixed inset-0 bg-white/90 z-50 flex items-center justify-center";
    loading.innerHTML = `
            <div class="text-center">
                <div class="spinner mx-auto mb-4"></div>
                <p class="text-gray-700">${message}</p>
            </div>
        `;
    document.body.appendChild(loading);
  },

  hideLoading() {
    const loading = document.getElementById("loadingOverlay");
    if (loading) loading.remove();
  },

  // Debounce function
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  // Format number
  formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  },

  // Calculate percentage
  calculatePercentage(value, total) {
    if (total === 0) return 0;
    return ((value / total) * 100).toFixed(2);
  },

  // Validate phone number
  validatePhone(phone) {
    const cleaned = phone.replace(/\D/g, "");
    return /^0\d{9}$/.test(cleaned);
  },

  // Validate email
  validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  },

  // Export to CSV
  exportToCSV(data, filename) {
    const csv = this.convertToCSV(data);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  convertToCSV(data) {
    if (data.length === 0) return "";

    const headers = Object.keys(data[0]);
    const csvHeaders = headers.join(",");

    const csvRows = data.map((row) => {
      return headers
        .map((header) => {
          const value = row[header];
          return typeof value === "string" && value.includes(",")
            ? `"${value}"`
            : value;
        })
        .join(",");
    });

    return [csvHeaders, ...csvRows].join("\n");
  },

  // Print function
  print(content, title = "พิมพ์เอกสาร") {
    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
            <html>
                <head>
                    <title>${title}</title>
                    <style>
                        body { font-family: 'Kanit', sans-serif; }
                        @media print {
                            .no-print { display: none; }
                        }
                    </style>
                </head>
                <body>
                    ${content}
                    <script>
                        window.onload = function() {
                            window.print();
                            window.onafterprint = function() {
                                window.close();
                            };
                        };
                    </script>
                </body>
            </html>
        `);
    printWindow.document.close();
  },

  // Get random color
  getRandomColor() {
    const colors = [
      "red",
      "blue",
      "green",
      "yellow",
      "purple",
      "pink",
      "orange",
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  },

  // Haptic feedback
  vibrate(duration = 10) {
    if ("vibrate" in navigator) {
      navigator.vibrate(duration);
    }
  },
};
