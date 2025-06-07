// Shift Manager Module - จัดการระบบเปิด-ปิดรอบ
const ShiftManager = {
  currentShift: null,
  
  // Initialize shift manager
  init() {
    console.log("🔄 Initializing Shift Manager...");
    this.loadCurrentShift();
    this.updateUI();
    
    // Check shift status every minute
    setInterval(() => this.updateUI(), 60000);
  },
  
  // Load current shift from storage
  loadCurrentShift() {
    const storeId = App.state.currentStoreId;
    if (!storeId) return;
    
    const savedShift = localStorage.getItem(`currentShift_${storeId}`);
    if (savedShift) {
      this.currentShift = JSON.parse(savedShift);
      
      // ตรวจสอบว่ารอบนี้ยังเปิดอยู่หรือไม่
      if (this.currentShift && this.currentShift.status === 'open') {
        console.log(`📋 Loaded open shift: ${this.currentShift.employeeName}`);
      }
    }
  },
  
  // Save current shift
  saveCurrentShift() {
    const storeId = App.state.currentStoreId;
    if (!storeId) return;
    
    if (this.currentShift) {
      localStorage.setItem(`currentShift_${storeId}`, JSON.stringify(this.currentShift));
    } else {
      localStorage.removeItem(`currentShift_${storeId}`);
    }
  },
  
  // Check if shift is open
  isShiftOpen() {
    return this.currentShift && this.currentShift.status === 'open';
  },
  
  // Get current shift
  getCurrentShift() {
    return this.currentShift;
  },
  
  // Open shift
  async openShift(employeeName, openingCash, notes = '') {
    if (this.isShiftOpen()) {
      Utils.showToast("มีรอบที่เปิดอยู่แล้ว กรุณาปิดรอบก่อน", "error");
      return false;
    }
    
    const now = new Date();
    const shiftNumber = await this.getNextShiftNumber();
    
    this.currentShift = {
      id: `SHIFT_${now.toISOString().split('T')[0]}_${String(shiftNumber).padStart(3, '0')}`,
      shiftNumber: shiftNumber,
      date: now.toISOString().split('T')[0],
      openTime: now.toISOString(),
      closeTime: null,
      employeeName: employeeName.trim(),
      openBy: Auth.getCurrentUser()?.uid || employeeName,
      closeBy: null,
      openingCash: parseFloat(openingCash) || 0,
      closingCash: 0,
      expectedCash: parseFloat(openingCash) || 0,
      actualCash: 0,
      difference: 0,
      sales: {
        total: 0,
        cash: 0,
        transfer: 0,
        other: 0,
        bills: 0,
        refunds: 0,
        refundAmount: 0
      },
      salesIds: [], // เก็บ ID ของบิลในรอบนี้
      status: 'open',
      notes: notes,
      closeNotes: ''
    };
    
    // Save to state
    this.saveCurrentShift();
    
    // Add to shifts history
    if (!App.state.shifts) App.state.shifts = [];
    App.state.shifts.push(this.currentShift);
    App.saveData();
    
    // Sync to Firebase
    if (window.FirebaseService && FirebaseService.isAuthenticated()) {
      await this.syncShiftToFirebase(this.currentShift);
    }
    
    console.log(`✅ Shift opened by ${employeeName}`);
    Utils.showToast(`เปิดรอบสำเร็จ - ${employeeName}`, "success");
    
    this.updateUI();
    return true;
  },
  
  // Close shift
  async closeShift(actualCash, closeNotes = '') {
    if (!this.isShiftOpen()) {
      Utils.showToast("ไม่มีรอบที่เปิดอยู่", "error");
      return false;
    }
    
    // Calculate final numbers
    const cashSales = this.currentShift.sales.cash;
    const expectedCash = this.currentShift.openingCash + cashSales - this.currentShift.sales.refundAmount;
    
    // Update shift data
    this.currentShift.closeTime = new Date().toISOString();
    this.currentShift.closeBy = Auth.getCurrentUser()?.uid || this.currentShift.employeeName;
    this.currentShift.actualCash = parseFloat(actualCash) || 0;
    this.currentShift.expectedCash = expectedCash;
    this.currentShift.difference = (parseFloat(actualCash) || 0) - expectedCash;
    this.currentShift.status = 'closed';
    this.currentShift.closeNotes = closeNotes;
    
    // Update in shifts array
    const shiftIndex = App.state.shifts.findIndex(s => s.id === this.currentShift.id);
    if (shiftIndex !== -1) {
      App.state.shifts[shiftIndex] = this.currentShift;
    }
    
    // Save final state
    App.saveData();
    
    // Sync to Firebase
    if (window.FirebaseService && FirebaseService.isAuthenticated()) {
      await this.syncShiftToFirebase(this.currentShift);
    }
    
    // Show close report
    this.showCloseReport(this.currentShift);
    
    // Clear current shift
    const closedShift = {...this.currentShift};
    this.currentShift = null;
    this.saveCurrentShift();
    
    console.log(`✅ Shift closed by ${closedShift.employeeName}`);
    Utils.showToast("ปิดรอบสำเร็จ", "success");
    
    this.updateUI();
    return closedShift;
  },
  
  // Get next shift number for the day
  async getNextShiftNumber() {
    const today = new Date().toISOString().split('T')[0];
    const todayShifts = (App.state.shifts || []).filter(s => s.date === today);
    return todayShifts.length + 1;
  },
  
  // Add sale to current shift
  addSaleToShift(sale) {
    if (!this.isShiftOpen()) return;
    
    // Update shift sales data
    this.currentShift.sales.bills++;
    this.currentShift.sales.total += sale.total;
    
    // Update by payment method
    if (sale.paymentMethod === 'cash') {
      this.currentShift.sales.cash += sale.total;
    } else if (sale.paymentMethod === 'transfer') {
      this.currentShift.sales.transfer += sale.total;
    } else {
      this.currentShift.sales.other += sale.total;
    }
    
    // Add sale ID
    this.currentShift.salesIds.push(sale.id);
    
    // Update expected cash
    if (sale.paymentMethod === 'cash') {
      this.currentShift.expectedCash = this.currentShift.openingCash + this.currentShift.sales.cash - this.currentShift.sales.refundAmount;
    }
    
    // Save
    this.saveCurrentShift();
    this.updateUI();
  },
  
  // Add refund to current shift
  addRefundToShift(refund) {
    if (!this.isShiftOpen()) return;
    
    this.currentShift.sales.refunds++;
    this.currentShift.sales.refundAmount += Math.abs(refund.total);
    
    // Update expected cash if refund was cash
    if (refund.paymentMethod === 'cash') {
      this.currentShift.expectedCash = this.currentShift.openingCash + this.currentShift.sales.cash - this.currentShift.sales.refundAmount;
    }
    
    // Save
    this.saveCurrentShift();
    this.updateUI();
  },
  
  // Update UI
  updateUI() {
    // Update shift status bar
    this.updateShiftStatusBar();
    
    // Update main buttons
    this.updateMainButtons();
    
    // Update BackOffice if open
    if (window.BackOffice && BackOffice.currentPage === 'shifts') {
      BackOffice.loadShiftsList();
    }
  },
  
  // Update shift status bar
  updateShiftStatusBar() {
    const statusContainer = document.getElementById('shiftStatusBar');
    if (!statusContainer) return;
    
    if (this.isShiftOpen()) {
      const shift = this.currentShift;
      const duration = this.getShiftDuration(shift.openTime);
      const isMobile = window.innerWidth <= 640;
      
      statusContainer.className = 'bg-green-50 border-b border-green-200 p-2 text-sm';
      
      if (isMobile) {
        // Mobile view - 2 lines
        statusContainer.innerHTML = `
          <div class="flex justify-between items-center">
            <div class="flex items-center gap-2">
              <span class="text-green-600">🟢</span>
              <span class="font-medium text-gray-800">รอบ: ${shift.employeeName}</span>
              <span class="text-gray-600">฿${Utils.formatNumber(shift.sales.total.toFixed(0))}</span>
            </div>
            <button onclick="ShiftManager.showQuickShiftInfo()" class="text-blue-600">
              <i class="fas fa-info-circle"></i>
            </button>
          </div>
          <div class="text-xs text-gray-600 mt-1">
            เริ่ม: ${new Date(shift.openTime).toLocaleTimeString('th-TH', {hour: '2-digit', minute: '2-digit'})} 
            (${duration})
          </div>
        `;
      } else {
        // Desktop/Tablet view - 1 line
        statusContainer.innerHTML = `
          <div class="flex justify-between items-center">
            <div class="flex items-center gap-4">
              <span class="text-green-600 font-medium">🟢 รอบเปิดอยู่</span>
              <span class="text-gray-700">พนักงาน: <strong>${shift.employeeName}</strong></span>
              <span class="text-gray-600">เริ่ม: ${new Date(shift.openTime).toLocaleTimeString('th-TH', {hour: '2-digit', minute: '2-digit'})}</span>
              <span class="text-gray-600">เวลาทำงาน: ${duration}</span>
            </div>
            <div class="flex items-center gap-4">
              <span class="font-medium text-gray-800">ยอดขาย: ${Utils.formatCurrency(shift.sales.total)}</span>
              <button onclick="ShiftManager.showQuickShiftInfo()" class="text-blue-600 hover:text-blue-700">
                <i class="fas fa-chart-line"></i> ดูสรุป
              </button>
            </div>
          </div>
        `;
      }
    } else {
      // No shift open
      statusContainer.className = 'bg-red-50 border-b border-red-200 p-2 text-sm';
      statusContainer.innerHTML = `
        <div class="flex justify-between items-center">
          <div class="flex items-center gap-2">
            <span class="text-red-600">🔴</span>
            <span class="font-medium text-red-700">ยังไม่ได้เปิดรอบ</span>
          </div>
          <button onclick="ShiftManager.showOpenShiftModal()" class="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-xs font-medium">
            <i class="fas fa-play mr-1"></i>เปิดรอบ
          </button>
        </div>
      `;
    }
  },
  
  // Update main buttons
  updateMainButtons() {
    const openShiftBtn = document.getElementById('openShiftBtn');
    const closeShiftBtn = document.getElementById('closeShiftBtn');
    
    if (openShiftBtn) {
      openShiftBtn.style.display = this.isShiftOpen() ? 'none' : 'block';
    }
    
    if (closeShiftBtn) {
      closeShiftBtn.style.display = this.isShiftOpen() ? 'block' : 'none';
    }
    
    // Disable/Enable POS buttons
    const addToCartButtons = document.querySelectorAll('.product-card');
    addToCartButtons.forEach(btn => {
      if (!this.isShiftOpen()) {
        btn.classList.add('opacity-50', 'cursor-not-allowed');
        btn.onclick = (e) => {
          e.preventDefault();
          Utils.showToast("กรุณาเปิดรอบก่อนทำการขาย", "error");
        };
      }
    });
  },
  
  // Get shift duration
  getShiftDuration(startTime) {
    const start = new Date(startTime);
    const now = new Date();
    const diff = now - start;
    
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    
    if (hours > 0) {
      return `${hours} ชม. ${minutes} นาที`;
    } else {
      return `${minutes} นาที`;
    }
  },
  
  // Show open shift modal
  showOpenShiftModal() {
    const content = `
      <div class="modal-with-footer h-full flex flex-col">
        <div class="modal-header bg-gradient-to-r from-green-500 to-green-600 text-white p-4">
          <h3 class="text-lg font-bold">เปิดรอบการขาย</h3>
        </div>
        
        <div class="modal-body" style="padding-bottom: 100px;">
          <form id="openShiftForm" onsubmit="ShiftManager.processOpenShift(event)">
            <div class="space-y-4">
              <div>
                <label class="text-gray-700 text-sm font-medium">ชื่อพนักงาน *</label>
                <input type="text" id="employeeName" required
                       class="w-full mt-1 p-3 rounded-lg border border-gray-300 text-gray-800 text-lg"
                       placeholder="กรอกชื่อเล่น..." autofocus>
              </div>
              
              <div>
                <label class="text-gray-700 text-sm font-medium">เงินสดเริ่มต้น *</label>
                <div class="relative">
                  <span class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-xl">฿</span>
                  <input type="number" id="openingCash" required min="0" step="0.01"
                         class="w-full mt-1 p-3 pl-10 rounded-lg border border-gray-300 text-gray-800 text-xl text-center"
                         placeholder="0.00" value="1000">
                </div>
                
                <!-- Quick amount buttons -->
                <div class="grid grid-cols-4 gap-2 mt-2">
                  ${[500, 1000, 2000, 5000].map(amount => `
                    <button type="button" onclick="document.getElementById('openingCash').value=${amount}"
                            class="p-2 bg-gray-100 hover:bg-gray-200 rounded text-gray-700 font-medium transition">
                      ${Utils.formatNumber(amount)}
                    </button>
                  `).join('')}
                </div>
              </div>
              
              <div>
                <label class="text-gray-700 text-sm font-medium">หมายเหตุ</label>
                <textarea id="openingNotes" rows="2"
                          class="w-full mt-1 p-2 rounded-lg border border-gray-300 text-gray-800"
                          placeholder="หมายเหตุเพิ่มเติม (ถ้ามี)"></textarea>
              </div>
            </div>
          </form>
        </div>
        
        <div class="modal-footer" style="position: fixed; bottom: 0; left: 0; right: 0; background: white; border-top: 1px solid #e5e7eb; padding: 1rem; padding-bottom: calc(1rem + env(safe-area-inset-bottom, 0px)); box-shadow: 0 -4px 6px -1px rgba(0, 0, 0, 0.1);">
  <div class="flex gap-3 max-w-md mx-auto">
    <button type="button" onclick="Utils.closeModal(this.closest('.fixed'))"
            class="flex-1 bg-gray-200 hover:bg-gray-300 py-3 rounded-lg text-gray-800 font-medium transition">
      ยกเลิก
    </button>
    <button type="submit" form="openShiftForm"
            class="flex-1 bg-green-500 hover:bg-green-600 py-3 rounded-lg text-white font-medium transition">
      <i class="fas fa-play mr-2"></i>เปิดรอบ
    </button>
  </div>
</div>
      </div>
    `;
    
    Utils.createModal(content, { size: 'w-full max-w-md', mobileFullscreen: true });
  },
  
  // Process open shift
  async processOpenShift(event) {
    event.preventDefault();
    
    const employeeName = document.getElementById('employeeName').value.trim();
    const openingCash = parseFloat(document.getElementById('openingCash').value) || 0;
    const notes = document.getElementById('openingNotes').value.trim();
    
    if (!employeeName) {
      Utils.showToast("กรุณากรอกชื่อพนักงาน", "error");
      return;
    }
    
    const success = await this.openShift(employeeName, openingCash, notes);
    
    if (success) {
      Utils.closeModal(event.target.closest('.fixed'));
      POS.refresh(); // Refresh POS to enable buttons
    }
  },
  
  // Show close shift modal
  showCloseShiftModal() {
    if (!this.isShiftOpen()) {
      Utils.showToast("ไม่มีรอบที่เปิดอยู่", "error");
      return;
    }
    
    const shift = this.currentShift;
    const expectedCash = shift.openingCash + shift.sales.cash - shift.sales.refundAmount;
    
    const content = `
      <div class="modal-with-footer h-full flex flex-col">
        <div class="modal-header bg-gradient-to-r from-red-500 to-red-600 text-white p-4">
          <h3 class="text-lg font-bold">ปิดรอบการขาย</h3>
        </div>
        
        <div class="modal-body">
          <!-- Shift Summary -->
          <div class="bg-gray-50 rounded-lg p-4 mb-4">
            <h4 class="font-medium text-gray-700 mb-3">สรุปรอบการขาย</h4>
            <div class="space-y-2 text-sm">
              <div class="flex justify-between">
                <span class="text-gray-600">พนักงาน:</span>
                <span class="font-medium">${shift.employeeName}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">เวลาทำงาน:</span>
                <span>${this.getShiftDuration(shift.openTime)}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">จำนวนบิล:</span>
                <span>${shift.sales.bills} บิล</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">ยอดขายรวม:</span>
                <span class="font-medium">${Utils.formatCurrency(shift.sales.total)}</span>
              </div>
            </div>
          </div>
          
          <!-- Cash Count -->
          <form id="closeShiftForm" onsubmit="ShiftManager.processCloseShift(event)">
            <div class="bg-blue-50 rounded-lg p-4 mb-4">
              <h4 class="font-medium text-blue-800 mb-3">การนับเงินสด</h4>
              <div class="space-y-3">
                <div class="flex justify-between text-sm">
                  <span>เงินสดเริ่มต้น:</span>
                  <span>${Utils.formatCurrency(shift.openingCash)}</span>
                </div>
                <div class="flex justify-between text-sm">
                  <span>ยอดขายเงินสด:</span>
                  <span class="text-green-600">+${Utils.formatCurrency(shift.sales.cash)}</span>
                </div>
                ${shift.sales.refundAmount > 0 ? `
                <div class="flex justify-between text-sm">
                  <span>คืนเงิน:</span>
                  <span class="text-red-600">-${Utils.formatCurrency(shift.sales.refundAmount)}</span>
                </div>
                ` : ''}
                <div class="border-t pt-3 flex justify-between font-medium">
                  <span>เงินสดที่ควรมี:</span>
                  <span class="text-blue-800">${Utils.formatCurrency(expectedCash)}</span>
                </div>
              </div>
            </div>
            
            <div class="space-y-4">
              <div>
                <label class="text-gray-700 text-sm font-medium">เงินสดที่นับได้จริง *</label>
                <div class="relative">
                  <span class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-xl">฿</span>
                  <input type="number" id="actualCash" required min="0" step="0.01"
                         class="w-full mt-1 p-3 pl-10 rounded-lg border border-gray-300 text-gray-800 text-xl text-center"
                         placeholder="0.00" value="${expectedCash.toFixed(2)}"
                         onchange="ShiftManager.calculateDifference()">
                </div>
                
                <!-- Cash Calculator Button -->
                <button type="button" onclick="ShiftManager.showCashCalculator()"
                        class="w-full mt-2 p-2 bg-blue-100 hover:bg-blue-200 rounded-lg text-blue-700 font-medium transition">
                  <i class="fas fa-calculator mr-2"></i>ช่วยนับเงิน
                </button>
              </div>
              
              <!-- Difference Display -->
              <div id="cashDifference" class="hidden">
                <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <div class="flex justify-between items-center">
                    <span class="text-yellow-800 font-medium">ส่วนต่าง:</span>
                    <span id="differenceAmount" class="text-xl font-bold"></span>
                  </div>
                  <p id="differenceNote" class="text-xs text-yellow-600 mt-1"></p>
                </div>
              </div>
              
              <div>
                <label class="text-gray-700 text-sm font-medium">หมายเหตุการปิดรอบ</label>
                <textarea id="closingNotes" rows="2"
                          class="w-full mt-1 p-2 rounded-lg border border-gray-300 text-gray-800"
                          placeholder="หมายเหตุเพิ่มเติม (ถ้ามี)"></textarea>
              </div>
            </div>
          </form>
        </div>
        
        <div class="modal-footer">
          <div class="flex gap-3">
            <button type="button" onclick="Utils.closeModal(this.closest('.fixed'))"
                    class="flex-1 bg-gray-200 hover:bg-gray-300 py-3 rounded-lg text-gray-800 font-medium transition">
              ยกเลิก
            </button>
            <button type="submit" form="closeShiftForm"
                    class="flex-1 bg-red-500 hover:bg-red-600 py-3 rounded-lg text-white font-medium transition">
              <i class="fas fa-stop mr-2"></i>ปิดรอบ
            </button>
          </div>
        </div>
      </div>
    `;
    
    Utils.createModal(content, { size: 'w-full max-w-lg', mobileFullscreen: true });
  },
  
  // Calculate cash difference
  calculateDifference() {
    const shift = this.currentShift;
    const expectedCash = shift.openingCash + shift.sales.cash - shift.sales.refundAmount;
    const actualCash = parseFloat(document.getElementById('actualCash').value) || 0;
    const difference = actualCash - expectedCash;
    
    const diffContainer = document.getElementById('cashDifference');
    const diffAmount = document.getElementById('differenceAmount');
    const diffNote = document.getElementById('differenceNote');
    
    if (difference !== 0) {
      diffContainer.classList.remove('hidden');
      
      if (difference > 0) {
        diffAmount.className = 'text-xl font-bold text-green-600';
        diffAmount.textContent = `+${Utils.formatCurrency(difference)}`;
        diffNote.textContent = 'เงินเกิน';
      } else {
        diffAmount.className = 'text-xl font-bold text-red-600';
        diffAmount.textContent = Utils.formatCurrency(difference);
        diffNote.textContent = 'เงินขาด';
      }
    } else {
      diffContainer.classList.add('hidden');
    }
  },
  
  // Show cash calculator
  showCashCalculator() {
    const denominations = [
      { value: 1000, label: '1,000 บาท', type: 'note' },
      { value: 500, label: '500 บาท', type: 'note' },
      { value: 100, label: '100 บาท', type: 'note' },
      { value: 50, label: '50 บาท', type: 'note' },
      { value: 20, label: '20 บาท', type: 'note' },
      { value: 10, label: '10 บาท', type: 'coin' },
      { value: 5, label: '5 บาท', type: 'coin' },
      { value: 2, label: '2 บาท', type: 'coin' },
      { value: 1, label: '1 บาท', type: 'coin' }
    ];
    
    const content = `
      <div class="modal-with-footer h-full flex flex-col">
        <div class="modal-header bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4">
          <h3 class="text-lg font-bold">ช่วยนับเงิน</h3>
        </div>
        
        <div class="modal-body">
          <div class="space-y-3">
            ${denominations.map(denom => `
              <div class="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                <div class="flex items-center gap-3">
                  <span class="${denom.type === 'note' ? 'text-green-600' : 'text-yellow-600'}">
                    <i class="fas fa-${denom.type === 'note' ? 'money-bill' : 'coins'} text-xl"></i>
                  </span>
                  <span class="font-medium">${denom.label}</span>
                </div>
                <div class="flex items-center gap-2">
                  <button type="button" onclick="ShiftManager.decrementDenom(${denom.value})"
                          class="w-8 h-8 bg-gray-200 hover:bg-gray-300 rounded flex items-center justify-center">
                    <i class="fas fa-minus text-xs"></i>
                  </button>
                  <input type="number" id="denom_${denom.value}" min="0" value="0"
                         class="w-16 text-center border rounded p-1"
                         onchange="ShiftManager.calculateCashTotal()">
                  <button type="button" onclick="ShiftManager.incrementDenom(${denom.value})"
                          class="w-8 h-8 bg-gray-200 hover:bg-gray-300 rounded flex items-center justify-center">
                    <i class="fas fa-plus text-xs"></i>
                  </button>
                </div>
              </div>
            `).join('')}
          </div>
          
          <div class="mt-4 p-4 bg-blue-50 rounded-lg">
            <div class="flex justify-between items-center">
              <span class="text-blue-800 font-medium">ยอดรวม:</span>
              <span id="cashTotal" class="text-2xl font-bold text-blue-800">฿0.00</span>
            </div>
          </div>
        </div>
        
        <div class="modal-footer">
          <div class="flex gap-3">
            <button type="button" onclick="Utils.closeModal(this.closest('.fixed'))"
                    class="flex-1 bg-gray-200 hover:bg-gray-300 py-3 rounded-lg text-gray-800 font-medium">
              ยกเลิก
            </button>
            <button type="button" onclick="ShiftManager.applyCashTotal()"
                    class="flex-1 bg-blue-500 hover:bg-blue-600 py-3 rounded-lg text-white font-medium">
              ใช้ยอดนี้
            </button>
          </div>
        </div>
      </div>
    `;
    
    Utils.createModal(content, { size: 'w-full max-w-md', mobileFullscreen: true });
  },
  
  // Increment denomination
  incrementDenom(value) {
    const input = document.getElementById(`denom_${value}`);
    input.value = parseInt(input.value) + 1;
    this.calculateCashTotal();
  },
  
  // Decrement denomination
  decrementDenom(value) {
    const input = document.getElementById(`denom_${value}`);
    const current = parseInt(input.value);
    if (current > 0) {
      input.value = current - 1;
      this.calculateCashTotal();
    }
  },
  
  // Calculate cash total
  calculateCashTotal() {
    const denominations = [1000, 500, 100, 50, 20, 10, 5, 2, 1];
    let total = 0;
    
    denominations.forEach(value => {
      const count = parseInt(document.getElementById(`denom_${value}`).value) || 0;
      total += value * count;
    });
    
    document.getElementById('cashTotal').textContent = Utils.formatCurrency(total);
  },
  
  // Apply cash total
  applyCashTotal() {
    const denominations = [1000, 500, 100, 50, 20, 10, 5, 2, 1];
    let total = 0;
    
    denominations.forEach(value => {
      const count = parseInt(document.getElementById(`denom_${value}`).value) || 0;
      total += value * count;
    });
    
    // Set actual cash in close shift form
    document.getElementById('actualCash').value = total.toFixed(2);
    this.calculateDifference();
    
    // Close calculator modal
    const calculatorModal = document.querySelector('.modal-header').closest('.fixed');
    Utils.closeModal(calculatorModal);
  },
  
  // Process close shift
  async processCloseShift(event) {
    event.preventDefault();
    
    const actualCash = parseFloat(document.getElementById('actualCash').value) || 0;
    const closeNotes = document.getElementById('closingNotes').value.trim();
    
    const closedShift = await this.closeShift(actualCash, closeNotes);
    
    if (closedShift) {
      Utils.closeModal(event.target.closest('.fixed'));
    }
  },
  
  // Show close report
  showCloseReport(shift) {
    const duration = this.getShiftDuration(shift.openTime, shift.closeTime);
    
    const content = `
      <div class="modal-with-footer h-full flex flex-col">
        <div class="modal-header bg-gradient-to-r from-purple-500 to-purple-600 text-white p-4">
          <h3 class="text-lg font-bold">ใบปิดรอบ (Z-Report)</h3>
        </div>
        
        <div class="modal-body" id="shiftReportContent">
          <div class="bg-white rounded-lg">
            <!-- Header -->
            <div class="text-center border-b pb-4 mb-4">
              <h2 class="text-xl font-bold text-gray-800">${App.state.settings.storeName || 'SP24 POS'}</h2>
              <p class="text-sm text-gray-600">ใบปิดรอบการขาย</p>
              <p class="text-xs text-gray-500 mt-2">รอบที่: ${shift.shiftNumber} | ${new Date(shift.date).toLocaleDateString('th-TH', {year: 'numeric', month: 'long', day: 'numeric'})}</p>
            </div>
            
            <!-- Shift Info -->
            <div class="bg-gray-50 rounded-lg p-4 mb-4">
              <h4 class="font-medium text-gray-700 mb-3">ข้อมูลรอบการขาย</h4>
              <div class="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span class="text-gray-600">พนักงาน:</span>
                  <p class="font-medium">${shift.employeeName}</p>
                </div>
                <div>
                  <span class="text-gray-600">ระยะเวลา:</span>
                  <p class="font-medium">${duration}</p>
                </div>
                <div>
                  <span class="text-gray-600">เวลาเปิด:</span>
                  <p>${new Date(shift.openTime).toLocaleTimeString('th-TH')}</p>
                </div>
                <div>
                  <span class="text-gray-600">เวลาปิด:</span>
                  <p>${new Date(shift.closeTime).toLocaleTimeString('th-TH')}</p>
                </div>
              </div>
            </div>
            
            <!-- Sales Summary -->
            <div class="bg-blue-50 rounded-lg p-4 mb-4">
              <h4 class="font-medium text-blue-800 mb-3">สรุปยอดขาย</h4>
              <div class="space-y-2">
                <div class="flex justify-between">
                  <span class="text-gray-700">จำนวนบิล:</span>
                  <span class="font-medium">${shift.sales.bills} บิล</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-700">ยอดขายรวม:</span>
                  <span class="font-medium text-lg">${Utils.formatCurrency(shift.sales.total)}</span>
                </div>
                ${shift.sales.bills > 0 ? `
                <div class="flex justify-between text-sm text-gray-600">
                  <span>เฉลี่ยต่อบิล:</span>
                  <span>${Utils.formatCurrency(shift.sales.total / shift.sales.bills)}</span>
                </div>
                ` : ''}
              </div>
            </div>
            
            <!-- Payment Methods -->
            <div class="bg-green-50 rounded-lg p-4 mb-4">
              <h4 class="font-medium text-green-800 mb-3">แยกตามการชำระเงิน</h4>
              <div class="space-y-2">
                <div class="flex justify-between">
                  <span class="text-gray-700">เงินสด:</span>
                  <span class="font-medium">${Utils.formatCurrency(shift.sales.cash)}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-700">โอนเงิน:</span>
                  <span class="font-medium">${Utils.formatCurrency(shift.sales.transfer)}</span>
                </div>
                ${shift.sales.other > 0 ? `
                <div class="flex justify-between">
                  <span class="text-gray-700">อื่นๆ:</span>
                  <span class="font-medium">${Utils.formatCurrency(shift.sales.other)}</span>
                </div>
                ` : ''}
              </div>
            </div>
            
            <!-- Cash Movement -->
            <div class="bg-yellow-50 rounded-lg p-4 mb-4">
              <h4 class="font-medium text-yellow-800 mb-3">การเคลื่อนไหวเงินสด</h4>
              <div class="space-y-2">
                <div class="flex justify-between">
                  <span class="text-gray-700">เงินสดเริ่มต้น:</span>
                  <span>${Utils.formatCurrency(shift.openingCash)}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-700">ยอดขายเงินสด:</span>
                  <span class="text-green-600">+${Utils.formatCurrency(shift.sales.cash)}</span>
                </div>
                ${shift.sales.refundAmount > 0 ? `
                <div class="flex justify-between">
                  <span class="text-gray-700">คืนเงิน:</span>
                  <span class="text-red-600">-${Utils.formatCurrency(shift.sales.refundAmount)}</span>
                </div>
                ` : ''}
                <div class="border-t pt-2 mt-2">
                  <div class="flex justify-between font-medium">
                    <span>เงินสดที่ควรมี:</span>
                    <span>${Utils.formatCurrency(shift.expectedCash)}</span>
                  </div>
                  <div class="flex justify-between font-medium">
                    <span>เงินสดที่นับได้:</span>
                    <span>${Utils.formatCurrency(shift.actualCash)}</span>
                  </div>
                  ${shift.difference !== 0 ? `
                  <div class="flex justify-between font-medium mt-2 ${shift.difference > 0 ? 'text-green-600' : 'text-red-600'}">
                    <span>ส่วนต่าง:</span>
                    <span>${shift.difference > 0 ? '+' : ''}${Utils.formatCurrency(shift.difference)}</span>
                  </div>
                  ` : ''}
                </div>
              </div>
            </div>
            
            <!-- Notes -->
            ${shift.notes || shift.closeNotes ? `
            <div class="bg-gray-50 rounded-lg p-4 mb-4">
              <h4 class="font-medium text-gray-700 mb-2">หมายเหตุ</h4>
              ${shift.notes ? `<p class="text-sm text-gray-600">เปิดรอบ: ${shift.notes}</p>` : ''}
              ${shift.closeNotes ? `<p class="text-sm text-gray-600">ปิดรอบ: ${shift.closeNotes}</p>` : ''}
            </div>
            ` : ''}
            
            <!-- Signature -->
            <div class="border-t pt-4 mt-6">
              <div class="grid grid-cols-2 gap-8">
                <div class="text-center">
                  <div class="border-b border-gray-400 pb-1 mb-1">
                    <span class="invisible">ลายเซ็น</span>
                  </div>
                  <p class="text-sm text-gray-600">ผู้ปิดรอบ</p>
                </div>
                <div class="text-center">
                  <div class="border-b border-gray-400 pb-1 mb-1">
                    <span class="invisible">ลายเซ็น</span>
                  </div>
                  <p class="text-sm text-gray-600">ผู้ตรวจสอบ</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="modal-footer">
          <div class="flex gap-3">
            <button type="button" onclick="ShiftManager.printShiftReport('${shift.id}')"
                    class="flex-1 bg-gray-200 hover:bg-gray-300 py-3 rounded-lg text-gray-800 font-medium">
              <i class="fas fa-print mr-2"></i>พิมพ์
            </button>
            <button type="button" onclick="Utils.closeModal(this.closest('.fixed'))"
                    class="flex-1 bg-purple-500 hover:bg-purple-600 py-3 rounded-lg text-white font-medium">
              ปิด
            </button>
          </div>
        </div>
      </div>
    `;
    
    Utils.createModal(content, { size: 'w-full max-w-md', mobileFullscreen: true });
  },
  
  // Print shift report
  printShiftReport(shiftId) {
    const shift = App.state.shifts.find(s => s.id === shiftId);
    if (!shift) return;
    
    const content = document.getElementById('shiftReportContent').innerHTML;
    Utils.print(content, `ใบปิดรอบ #${shift.shiftNumber}`);
  },
  
  // Show quick shift info
  showQuickShiftInfo() {
    if (!this.isShiftOpen()) return;
    
    const shift = this.currentShift;
    const content = `
      <div class="p-6">
        <h3 class="text-lg font-bold text-gray-800 mb-4">สรุปรอบปัจจุบัน</h3>
        
        <div class="space-y-3">
          <div class="bg-gray-50 rounded-lg p-3">
            <div class="flex justify-between">
              <span class="text-gray-600">พนักงาน:</span>
              <span class="font-medium">${shift.employeeName}</span>
            </div>
          </div>
          
          <div class="bg-gray-50 rounded-lg p-3">
            <div class="flex justify-between">
              <span class="text-gray-600">เวลาทำงาน:</span>
              <span class="font-medium">${this.getShiftDuration(shift.openTime)}</span>
            </div>
          </div>
          
          <div class="bg-blue-50 rounded-lg p-3">
            <div class="flex justify-between">
              <span class="text-gray-700">จำนวนบิล:</span>
              <span class="font-medium">${shift.sales.bills} บิล</span>
            </div>
            <div class="flex justify-between mt-2">
              <span class="text-gray-700">ยอดขายรวม:</span>
              <span class="font-medium text-lg">${Utils.formatCurrency(shift.sales.total)}</span>
            </div>
          </div>
          
          <div class="bg-green-50 rounded-lg p-3">
            <div class="text-sm space-y-1">
              <div class="flex justify-between">
                <span class="text-gray-600">เงินสด:</span>
                <span>${Utils.formatCurrency(shift.sales.cash)}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">โอนเงิน:</span>
                <span>${Utils.formatCurrency(shift.sales.transfer)}</span>
              </div>
            </div>
          </div>
          
          ${shift.sales.refunds > 0 ? `
          <div class="bg-red-50 rounded-lg p-3">
            <div class="flex justify-between">
              <span class="text-red-700">คืนเงิน:</span>
              <span class="text-red-700">${shift.sales.refunds} รายการ (${Utils.formatCurrency(shift.sales.refundAmount)})</span>
            </div>
          </div>
          ` : ''}
        </div>
        
        <button onclick="Utils.closeModal(this.closest('.fixed'))"
                class="w-full mt-6 bg-gray-200 hover:bg-gray-300 py-2 rounded-lg text-gray-800 font-medium">
          ปิด
        </button>
      </div>
    `;
    
    Utils.createModal(content, { size: 'w-full max-w-sm' });
  },
  
  // Get shifts history
  getShiftsHistory(dateRange = null) {
    let shifts = App.state.shifts || [];
    
    if (dateRange) {
      shifts = shifts.filter(s => {
        const shiftDate = new Date(s.date);
        return shiftDate >= dateRange.start && shiftDate <= dateRange.end;
      });
    }
    
    return shifts.sort((a, b) => new Date(b.openTime) - new Date(a.openTime));
  },
  
  // Generate shifts report
  generateShiftsReport(startDate, endDate) {
    const shifts = this.getShiftsHistory({
      start: new Date(startDate),
      end: new Date(endDate)
    });
    
    const report = {
      period: {
        start: startDate,
        end: endDate
      },
      totalShifts: shifts.length,
      totalSales: 0,
      totalCash: 0,
      totalTransfer: 0,
      totalBills: 0,
      totalDifference: 0,
      shifts: []
    };
    
    shifts.forEach(shift => {
      report.totalSales += shift.sales.total;
      report.totalCash += shift.sales.cash;
      report.totalTransfer += shift.sales.transfer;
      report.totalBills += shift.sales.bills;
      report.totalDifference += shift.difference || 0;
      
      report.shifts.push({
        date: shift.date,
        shiftNumber: shift.shiftNumber,
        employee: shift.employeeName,
        duration: this.getShiftDuration(shift.openTime, shift.closeTime),
        sales: shift.sales.total,
        bills: shift.sales.bills,
        difference: shift.difference || 0
      });
    });
    
    return report;
  },
  
  // Sync shift to Firebase
  async syncShiftToFirebase(shift) {
    try {
      if (!FirebaseService.currentStore) return;
      
      const storeId = FirebaseService.currentStore.id;
      await FirebaseService.db
        .collection('stores')
        .doc(storeId)
        .collection('shifts')
        .doc(shift.id)
        .set({
          ...shift,
          syncedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      
      console.log('Shift synced to Firebase:', shift.id);
    } catch (error) {
      console.error('Error syncing shift:', error);
      // Queue for later sync
      if (window.SyncManager) {
        SyncManager.queueOperation('shift', shift);
      }
    }
  }
};

// Export
window.ShiftManager = ShiftManager;
