// Authentication Module - ปรับปรุงใหม่
const Auth = {
  currentUser: null,
  loginAttempts: 0,
  maxAttempts: 5,
  lockoutTime: 300000, // 5 minutes
  lastLockout: null,
  useFirebase: true,
  lastActivityTime: Date.now(),
  isAppActive: true,

  init() {
    if (this.useFirebase) {
      this.setupAutoLock();
      this.setupAppStateDetection();
    } else {
      this.loadAuthState();
      this.setupAutoLock();
    }
  },

  // ตรวจจับการออกจากแอพ
  setupAppStateDetection() {
    // ตรวจจับเมื่อเปลี่ยนแท็บหรือซ่อนหน้าต่าง
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        // แอพถูกซ่อน (switch ไปแอพอื่น)
        this.isAppActive = false;
        console.log('แอพถูกซ่อน - จะล็อคเมื่อกลับมา');
      } else {
        // กลับมาที่แอพ
        if (!this.isAppActive) {
          // ถ้าออกไปนานเกิน 30 วินาที ให้ล็อค
          const awayTime = Date.now() - this.lastActivityTime;
          if (awayTime > 30000) { // 30 วินาที
            console.log('ออกจากแอพนานเกินไป - ล็อคหน้าจอ');
            this.showPinLogin();
          }
        }
        this.isAppActive = true;
        this.lastActivityTime = Date.now();
      }
    });

    // ตรวจจับการปิดแอพบนมือถือ
    window.addEventListener('blur', () => {
      this.isAppActive = false;
    });

    window.addEventListener('focus', () => {
      if (!this.isAppActive) {
        const awayTime = Date.now() - this.lastActivityTime;
        if (awayTime > 30000) {
          this.showPinLogin();
        }
      }
      this.isAppActive = true;
      this.lastActivityTime = Date.now();
    });

    // ตรวจจับการ minimize หรือ background บน mobile
    window.addEventListener('pagehide', () => {
      this.isAppActive = false;
    });

    window.addEventListener('pageshow', () => {
      if (!this.isAppActive) {
        this.showPinLogin();
      }
      this.isAppActive = true;
    });
  },

  // ปรับปรุง Hash function ให้คงที่และเข้าใจง่าย
  hashPin(pin) {
    // ใช้วิธีง่ายๆ แต่คงที่ - เข้ารหัสเป็น base64
    const pinString = String(pin).padStart(6, '0'); // ทำให้เป็น 6 หลักเสมอ
    return btoa(pinString + '_SP24POS_SALT'); // เข้ารหัส base64
  },

  // ปรับปรุงการ verify PIN
  async verifyPin(userId, hashedPin) {
    try {
      const userDoc = await this.db.collection("users").doc(userId).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        
        // Debug log (ลบออกในตอน production)
        console.log('Stored PIN hash:', userData.pin);
        console.log('Input PIN hash:', hashedPin);
        
        // เปรียบเทียบแบบ string ตรงๆ
        return userData.pin === hashedPin;
      }
      return false;
    } catch (error) {
      console.error("Verify PIN error:", error);
      
      // ถ้า Firebase error ให้ตรวจสอบจาก local storage
      const localUser = this.getLocalUserData();
      if (localUser && localUser.pin === hashedPin) {
        return true;
      }
      
      return false;
    }
  },

  // เก็บ PIN ใน local storage เป็น backup
  saveLocalUserData(userId, pin) {
    const userData = {
      userId: userId,
      pin: pin,
      savedAt: Date.now()
    };
    localStorage.setItem('pos_user_backup', JSON.stringify(userData));
  },

  getLocalUserData() {
    try {
      const saved = localStorage.getItem('pos_user_backup');
      return saved ? JSON.parse(saved) : null;
    } catch (error) {
      return null;
    }
  },

  // ปรับปรุง Process PIN login
  async processPinLogin(event) {
    event.preventDefault();

    const pin = document.getElementById("loginPin").value;
    const user = Auth.getCurrentUser();

    if (!pin || pin.length !== 6) {
      Utils.showToast("กรุณาใส่รหัส PIN 6 หลัก", "error");
      return;
    }

    // Show loading
    Utils.showLoading("กำลังตรวจสอบ PIN...");

    try {
      const hashedPin = this.hashPin(pin);
      
      // ลอง verify หลายวิธี
      let isValidPin = false;
      
      // วิธีที่ 1: ตรวจสอบจาก Firebase
      try {
        isValidPin = await FirebaseService.verifyPin(user.uid, hashedPin);
      } catch (error) {
        console.log('Firebase verify failed, trying local...');
      }
      
      // วิธีที่ 2: ถ้า Firebase fail ให้ใช้ local backup
      if (!isValidPin) {
        const localData = this.getLocalUserData();
        if (localData && localData.pin === hashedPin) {
          isValidPin = true;
        }
      }

      Utils.hideLoading();

      if (isValidPin) {
        // Success
        this.loginAttempts = 0;
        this.lastActivityTime = Date.now();
        this.closeAuthModal();
        Utils.showToast("เข้าสู่ระบบสำเร็จ!", "success");

        // บันทึก PIN ใน local storage เป็น backup
        this.saveLocalUserData(user.uid, hashedPin);

        // Initialize main app
        setTimeout(() => {
          App.initializeApp();
        }, 500);
      } else {
        // Failed
        this.loginAttempts++;

        if (this.loginAttempts >= this.maxAttempts) {
          this.lastLockout = Date.now();
          this.showLockoutMessage();
        } else {
          Utils.showToast(
            `รหัส PIN ไม่ถูกต้อง (เหลือ ${
              this.maxAttempts - this.loginAttempts
            } ครั้ง)`,
            "error"
          );

          // Clear and refocus PIN input
          const pinInput = document.getElementById("loginPin");
          if (pinInput) {
            pinInput.value = "";
            pinInput.focus();
          }
        }
      }
    } catch (error) {
      Utils.hideLoading();
      console.error('PIN login error:', error);
      Utils.showToast("เกิดข้อผิดพลาด กรุณาลองใหม่", "error");
    }
  },

  // ปรับปรุง Auto-lock ให้นานขึ้น
  setupAutoLock() {
    let timeout;
    const lockAfter = 120 * 60 * 1000; // 2 ชั่วโมง (เดิม 30 นาที)

    const resetTimer = () => {
      clearTimeout(timeout);
      this.lastActivityTime = Date.now();
      
      if (this.isAuthenticated() && this.isAppActive) {
        timeout = setTimeout(() => {
          // ล็อคเฉพาะเมื่อแอพ active อยู่
          if (this.isAppActive) {
            this.logout();
            Utils.showToast("ระบบล็อคอัตโนมัติเนื่องจากไม่มีการใช้งาน", "info");
            this.showLogin();
          }
        }, lockAfter);
      }
    };

    // Reset timer on user activity
    ["mousedown", "mousemove", "keypress", "scroll", "touchstart", "click"].forEach(
      (event) => {
        document.addEventListener(event, resetTimer, true);
      }
    );

    // Start timer
    resetTimer();
  },

  // เพิ่ม Quick PIN entry buttons
  showPinLogin() {
    const user = Auth.getCurrentUser();
    const store = Auth.getCurrentStore();
    const displayName = user ? user.username : "ผู้ใช้";
    const storeName = store ? store.name : "ร้านค้า";

    const content = `
      <div class="p-4 sm:p-8 max-w-sm mx-auto">
        <div class="text-center mb-6 sm:mb-8">
          <div class="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <i class="fas fa-lock text-xl sm:text-2xl text-white"></i>
          </div>
          <h2 class="text-xl sm:text-2xl font-bold text-gray-800 mb-1">ใส่รหัส PIN</h2>
          <p class="text-sm sm:text-base text-gray-600">${displayName}</p>
          <p class="text-xs sm:text-sm text-gray-500">${storeName}</p>
        </div>

        <form onsubmit="Auth.processPinLogin(event)" class="space-y-4 sm:space-y-6">
          <div>
            <div class="flex justify-center items-center gap-2 mb-4">
              ${[1,2,3,4,5,6].map(i => `
                <div id="pin-dot-${i}" class="w-3 h-3 rounded-full bg-gray-300 transition-all duration-200"></div>
              `).join('')}
            </div>
            
            <input type="password" id="loginPin" required pattern="[0-9]{6}" maxlength="6"
                   class="hidden"
                   oninput="Auth.updatePinDots(this.value)">
            
            <!-- Big Number Pad -->
            <div class="grid grid-cols-3 gap-3 mt-6">
              ${[1,2,3,4,5,6,7,8,9,'clear',0,'⌫'].map(key => {
                if (key === 'clear') {
                  return `<button type="button" onclick="Auth.clearPin()" 
                           class="h-16 rounded-2xl bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium transition-all duration-200 transform hover:scale-105 active:scale-95">
                    <i class="fas fa-redo text-sm"></i>
                  </button>`;
                } else if (key === '⌫') {
                  return `<button type="button" onclick="Auth.backspacePin()" 
                           class="h-16 rounded-2xl bg-red-100 hover:bg-red-200 text-red-600 font-medium transition-all duration-200 transform hover:scale-105 active:scale-95">
                    <i class="fas fa-backspace"></i>
                  </button>`;
                } else {
                  return `<button type="button" onclick="Auth.appendPin('${key}')" 
                           class="h-16 rounded-2xl bg-white hover:bg-gray-50 text-2xl font-semibold text-gray-800 shadow-sm hover:shadow-md transition-all duration-200 transform hover:scale-105 active:scale-95">
                    ${key}
                  </button>`;
                }
              }).join('')}
            </div>
          </div>

          <button type="submit" id="submitPinBtn" disabled
                  class="w-full btn-primary py-3 rounded-xl text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200">
            <i class="fas fa-unlock mr-2"></i>ยืนยัน
          </button>

          <div class="text-center">
            <button type="button" onclick="Auth.showResetPin()" 
                    class="text-gray-500 hover:text-gray-700 text-sm">
              ลืมรหัส PIN?
            </button>
          </div>
        </form>
      </div>
    `;

    const modal = document.createElement("div");
    modal.id = "authModal";
    modal.className =
      "fixed inset-0 bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 z-50 flex items-center justify-center p-4";
    modal.innerHTML = `
      <div class="bg-white rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        ${content}
      </div>
    `;

    document.getElementById("modalsContainer").appendChild(modal);
    
    // Focus on hidden input
    setTimeout(() => {
      document.getElementById('loginPin').focus();
    }, 100);
  },

  // Helper functions for PIN input
  updatePinDots(value) {
    const length = value.length;
    
    // Update dots
    for (let i = 1; i <= 6; i++) {
      const dot = document.getElementById(`pin-dot-${i}`);
      if (i <= length) {
        dot.classList.remove('bg-gray-300');
        dot.classList.add('bg-indigo-600', 'scale-125');
      } else {
        dot.classList.remove('bg-indigo-600', 'scale-125');
        dot.classList.add('bg-gray-300');
      }
    }

    // Enable/disable submit button
    const submitBtn = document.getElementById('submitPinBtn');
    if (submitBtn) {
      submitBtn.disabled = length !== 6;
    }

    // Auto submit when 6 digits
    if (length === 6) {
      setTimeout(() => {
        const form = document.querySelector('#authModal form');
        if (form) {
          form.dispatchEvent(new Event('submit'));
        }
      }, 200);
    }
  },

  appendPin(digit) {
    const input = document.getElementById('loginPin');
    if (input.value.length < 6) {
      input.value += digit;
      this.updatePinDots(input.value);
      
      // Haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate(10);
      }
    }
  },

  backspacePin() {
    const input = document.getElementById('loginPin');
    input.value = input.value.slice(0, -1);
    this.updatePinDots(input.value);
  },

  clearPin() {
    const input = document.getElementById('loginPin');
    input.value = '';
    this.updatePinDots('');
  },

  // Process Firebase signup with PIN backup
  async processFirebaseSignup(event) {
    event.preventDefault();

    const name = document.getElementById("signupName").value.trim();
    const email = document.getElementById("signupEmail").value.trim();
    const password = document.getElementById("signupPassword").value;
    const passwordConfirm = document.getElementById("signupPasswordConfirm").value;
    const storeName = document.getElementById("signupStoreName").value.trim();
    const pin = document.getElementById("signupPin").value;

    // Validation
    if (!name || !email || !password || !storeName || !pin) {
      Utils.showToast("กรุณากรอกข้อมูลให้ครบถ้วน", "error");
      return;
    }

    if (password !== passwordConfirm) {
      Utils.showToast("รหัสผ่านไม่ตรงกัน", "error");
      return;
    }

    if (!/^\d{6}$/.test(pin)) {
      Utils.showToast("PIN ต้องเป็นตัวเลข 6 หลัก", "error");
      return;
    }

    Utils.showLoading("กำลังสร้างบัญชี...");

    try {
      const hashedPin = this.hashPin(pin);
      
      // Create user account
      const result = await FirebaseService.signUp(email, password, {
        name,
        pin: hashedPin,
        displayName: name,
      });

      if (result.success) {
        // Save PIN backup locally
        this.saveLocalUserData(result.user.uid, hashedPin);

        // Update display name
        await result.user.updateProfile({ displayName: name });

        // Create store for the user
        const storeResult = await FirebaseService.createStore({
          name: storeName,
          ownerId: result.user.uid,
          ownerEmail: email,
          ownerName: name,
        });

        if (storeResult.success) {
          Utils.hideLoading();
          Utils.showToast("สร้างบัญชีและร้านสำเร็จ!", "success");

          setTimeout(() => {
            this.closeAuthModal();
            location.reload();
          }, 1500);
        } else {
          Utils.hideLoading();
          Utils.showToast(`สร้างร้านไม่สำเร็จ: ${storeResult.error}`, "error");
        }
      } else {
        Utils.hideLoading();
        let errorMessage = result.error;
        if (result.error.includes("email-already-in-use")) {
          errorMessage = "อีเมลนี้ถูกใช้งานแล้ว";
        } else if (result.error.includes("invalid-email")) {
          errorMessage = "รูปแบบอีเมลไม่ถูกต้อง";
        } else if (result.error.includes("weak-password")) {
          errorMessage = "รหัสผ่านไม่ปลอดภัย";
        }

        Utils.showToast(`สร้างบัญชีไม่สำเร็จ: ${errorMessage}`, "error");
      }
    } catch (error) {
      Utils.hideLoading();
      console.error("Signup error:", error);
      Utils.showToast("เกิดข้อผิดพลาดในการสมัครสมาชิก: " + error.message, "error");
    }
  },
};

  // Switch to local mode (offline)
  switchToLocalMode() {
    Utils.confirm(
      "ต้องการใช้งานแบบออฟไลน์? (เหมาะสำหรับร้านเดียว)\n\nข้อจำกัด:\n- ไม่สามารถ sync ข้อมูลได้\n- ข้อมูลเก็บในเครื่องเท่านั้น",
      () => {
        this.useFirebase = false;
        this.closeAuthModal();
        this.showLogin();
      }
    );
  },

  // Show PIN login with 6 digits
  showPinLogin() {
    const user = Auth.getCurrentUser();
    const store = Auth.getCurrentStore();
    const displayName = user ? user.username : "ผู้ใช้";
    const storeName = store ? store.name : "ร้านค้า";

    // Check if locked out
    if (this.isLockedOut()) {
      this.showLockoutMessage();
      return;
    }

    const content = `
        <div class="p-4 sm:p-8 max-w-sm mx-auto">
          <div class="text-center mb-6 sm:mb-8">
            <div class="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <i class="fas fa-user text-xl sm:text-2xl text-white"></i>
            </div>
            <h2 class="text-xl sm:text-2xl font-bold text-gray-800 mb-1">ยินดีต้อนรับกลับ</h2>
            <p class="text-sm sm:text-base text-gray-600">${displayName}</p>
            <p class="text-xs sm:text-sm text-gray-500">${storeName}</p>
          </div>
  
          <form onsubmit="Auth.processPinLogin(event)" class="space-y-4 sm:space-y-6">
            <div>
              <label class="text-gray-700 text-sm font-medium text-center block">กรุณาใส่รหัส PIN 6 หลัก</label>
              <input type="password" id="loginPin" required pattern="[0-9]{6}" maxlength="6"
                     class="w-full mt-3 p-3 sm:p-4 text-2xl sm:text-3xl text-center rounded-lg border border-gray-300 text-gray-800 tracking-widest focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                     placeholder="••••••" autofocus>
              <div class="text-xs text-gray-500 mt-2 text-center">
                ${
                  this.loginAttempts > 0
                    ? `เหลือโอกาส ${
                        this.maxAttempts - this.loginAttempts
                      } ครั้ง`
                    : ""
                }
              </div>
            </div>
  
            <!-- PIN Keypad -->
            <div class="grid grid-cols-3 gap-2 sm:gap-3 mt-4 sm:mt-6">
              ${[1, 2, 3, 4, 5, 6, 7, 8, 9, "", 0, "⌫"]
                .map((key) =>
                  key === ""
                    ? "<div></div>"
                    : `<button type="button" onclick="Auth.pinKeypadClick('${key}')" 
                         class="numpad-btn h-12 sm:h-14 rounded-xl text-lg sm:text-xl font-semibold hover:bg-gray-200 transition ${
                           key === "⌫" ? "text-red-500" : "text-gray-700"
                         }">
                   ${key}
                 </button>`
                )
                .join("")}
            </div>
  
            <button type="submit" class="w-full btn-primary py-2 sm:py-3 rounded-lg text-white font-medium">
              <i class="fas fa-unlock mr-2"></i>เข้าสู่ระบบ
            </button>
  
            <button type="button" onclick="Auth.showResetPin()" class="w-full text-gray-500 hover:text-gray-700 text-xs sm:text-sm">
              ลืมรหัส PIN?
            </button>
          </form>
        </div>
      `;

    const modal = document.createElement("div");
    modal.id = "authModal";
    modal.className =
      "fixed inset-0 bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 z-50 flex items-center justify-center p-4";
    modal.innerHTML = `
        <div class="bg-white rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
          ${content}
        </div>
      `;

    document.getElementById("modalsContainer").appendChild(modal);
  },

  // PIN keypad click handler
  pinKeypadClick(key) {
    const pinInput = document.getElementById("loginPin");
    if (!pinInput) return;

    if (key === "⌫") {
      pinInput.value = pinInput.value.slice(0, -1);
    } else if (pinInput.value.length < 6) {
      pinInput.value += key;
    }

    // Auto submit when 6 digits entered
    if (pinInput.value.length === 6) {
      setTimeout(() => {
        const form = pinInput.closest("form");
        if (form) {
          const event = new Event("submit");
          form.dispatchEvent(event);
        }
      }, 100);
    }
  },

  // Process PIN login
  async processPinLogin(event) {
    event.preventDefault();

    const pin = document.getElementById("loginPin").value;
    const user = Auth.getCurrentUser();

    if (!pin || pin.length !== 6) {
      Utils.showToast("กรุณาใส่รหัส PIN 6 หลัก", "error");
      return;
    }

    // Check PIN
    const hashedPin = this.hashPin(pin);
    const isValidPin = await FirebaseService.verifyPin(user.uid, hashedPin);

    if (isValidPin) {
      // Success
      this.loginAttempts = 0;
      this.closeAuthModal();
      Utils.showToast("เข้าสู่ระบบสำเร็จ!", "success");

      // Initialize main app
      setTimeout(() => {
        App.initializeApp();
      }, 500);
    } else {
      // Failed
      this.loginAttempts++;

      if (this.loginAttempts >= this.maxAttempts) {
        this.lastLockout = Date.now();
        this.showLockoutMessage();
      } else {
        Utils.showToast(
          `รหัส PIN ไม่ถูกต้อง (เหลือ ${
            this.maxAttempts - this.loginAttempts
          } ครั้ง)`,
          "error"
        );

        // Clear and refocus PIN input
        const pinInput = document.getElementById("loginPin");
        if (pinInput) {
          pinInput.value = "";
          pinInput.focus();
        }

        // Update attempts display
        const attemptsDisplay = document.querySelector(
          ".text-xs.text-gray-500"
        );
        if (attemptsDisplay) {
          attemptsDisplay.textContent = `เหลือโอกาส ${
            this.maxAttempts - this.loginAttempts
          } ครั้ง`;
        }
      }
    }
  },

  // Check if locked out
  isLockedOut() {
    if (this.loginAttempts < this.maxAttempts || !this.lastLockout) {
      return false;
    }

    const timeSinceLockout = Date.now() - this.lastLockout;
    return timeSinceLockout < this.lockoutTime;
  },

  // Show lockout message
  showLockoutMessage() {
    const remainingTime = Math.ceil(
      (this.lockoutTime - (Date.now() - this.lastLockout)) / 1000 / 60
    );

    const content = `
        <div class="p-6 sm:p-8 max-w-sm mx-auto text-center">
          <div class="w-14 h-14 sm:w-16 sm:h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <i class="fas fa-lock text-xl sm:text-2xl text-white"></i>
          </div>
          <h2 class="text-xl sm:text-2xl font-bold text-gray-800 mb-2">ระบบล็อค</h2>
          <p class="text-sm sm:text-base text-gray-600 mb-4">พยายามเข้าสู่ระบบหลายครั้งเกินไป</p>
          <div class="bg-red-50 rounded-lg p-4 mb-6">
            <div class="text-red-600 font-medium">เหลือเวลา: <span id="lockoutTimer">${remainingTime}</span> นาที</div>
          </div>
          <button onclick="Auth.checkLockout()" class="btn-primary px-6 py-2 rounded-lg text-white">
            <i class="fas fa-refresh mr-2"></i>ตรวจสอบอีกครั้ง
          </button>
        </div>
      `;

    this.closeAuthModal();

    const modal = document.createElement("div");
    modal.id = "authModal";
    modal.className =
      "fixed inset-0 bg-gradient-to-br from-red-500 via-red-600 to-red-700 z-50 flex items-center justify-center p-4";
    modal.innerHTML = `
        <div class="bg-white rounded-2xl shadow-2xl">
          ${content}
        </div>
      `;

    document.getElementById("modalsContainer").appendChild(modal);

    // Update timer every minute
    this.lockoutTimer = setInterval(() => {
      const remaining = Math.ceil(
        (this.lockoutTime - (Date.now() - this.lastLockout)) / 1000 / 60
      );
      const timerEl = document.getElementById("lockoutTimer");
      if (timerEl && remaining > 0) {
        timerEl.textContent = remaining;
      } else {
        this.checkLockout();
      }
    }, 60000);
  },

  // Check lockout status
  checkLockout() {
    if (this.lockoutTimer) {
      clearInterval(this.lockoutTimer);
      this.lockoutTimer = null;
    }

    if (!this.isLockedOut()) {
      this.loginAttempts = 0;
      this.lastLockout = null;
      this.closeAuthModal();
      this.showPinLogin();
    } else {
      this.showLockoutMessage();
    }
  },

  // Show reset PIN dialog
  showResetPin() {
    Utils.confirm(
      "ต้องการรีเซ็ตรหัส PIN? จะต้องเข้าสู่ระบบด้วยอีเมลและรหัสผ่านอีกครั้ง",
      () => {
        // Logout and show login
        this.logout();
        this.useFirebase = true;
        this.showFirebaseLogin();
      }
    );
  },

  // Hash PIN for storage
  hashPin(pin) {
    // Simple hash function - in production use stronger encryption
    let hash = 0;
    const str = pin + "pos_salt_key_v2";
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  },

  // Setup auto-lock
  setupAutoLock() {
    let timeout;
    const lockAfter = 30 * 60 * 1000; // 30 minutes

    const resetTimer = () => {
      clearTimeout(timeout);
      if (this.isAuthenticated()) {
        timeout = setTimeout(() => {
          this.logout();
          Utils.showToast("ระบบล็อคอัตโนมัติเนื่องจากไม่มีการใช้งาน", "info");
          this.showLogin();
        }, lockAfter);
      }
    };

    // Reset timer on user activity
    ["mousedown", "mousemove", "keypress", "scroll", "touchstart"].forEach(
      (event) => {
        document.addEventListener(event, resetTimer, true);
      }
    );

    // Start timer
    resetTimer();
  },

  // Logout
  async logout() {
    if (this.useFirebase) {
      Utils.showLoading("กำลังออกจากระบบ...");
      const result = await FirebaseService.signOut();
      Utils.hideLoading();

      if (result.success) {
        this.closeAuthModal();
        location.reload();
      } else {
        Utils.showToast("เกิดข้อผิดพลาดในการออกจากระบบ", "error");
      }
    } else {
      this.currentUser = null;
      this.saveAuthState();

      // Clear any existing timers
      if (this.lockoutTimer) {
        clearInterval(this.lockoutTimer);
        this.lockoutTimer = null;
      }
    }
  },

  // Close auth modal
  closeAuthModal() {
    const modal = document.getElementById("authModal");
    if (modal) {
      modal.remove();
    }
  },

  // Get current user
  getCurrentUser() {
    if (this.useFirebase) {
      return FirebaseService.getCurrentUser();
    }
    return this.currentUser;
  },

  // Get current store
  getCurrentStore() {
    if (this.useFirebase) {
      return FirebaseService.getCurrentStore();
    }
    return null;
  },

  // Clear current store
  clearCurrentStore() {
    FirebaseService.currentStore = null;
    localStorage.removeItem("currentStoreId");
  },

  // Change PIN function
  changePin() {
    const content = `
      <div class="p-4 sm:p-6">
        <h3 class="text-lg sm:text-xl font-bold text-gray-800 mb-4">เปลี่ยนรหัส PIN</h3>
        
        <form onsubmit="Auth.processChangePin(event)">
          <div class="space-y-3 sm:space-y-4">
            <div>
              <label class="text-gray-700 text-sm font-medium">รหัส PIN ปัจจุบัน</label>
              <input type="password" id="currentPin" required pattern="[0-9]{6}" maxlength="6"
                     class="w-full mt-1 p-2 sm:p-3 text-xl sm:text-2xl text-center rounded-lg border border-gray-300 text-gray-800 tracking-widest"
                     placeholder="••••••">
            </div>
            
            <div>
              <label class="text-gray-700 text-sm font-medium">รหัส PIN ใหม่</label>
              <input type="password" id="newPin" required pattern="[0-9]{6}" maxlength="6"
                     class="w-full mt-1 p-2 sm:p-3 text-xl sm:text-2xl text-center rounded-lg border border-gray-300 text-gray-800 tracking-widest"
                     placeholder="••••••">
            </div>
            
            <div>
              <label class="text-gray-700 text-sm font-medium">ยืนยันรหัส PIN ใหม่</label>
              <input type="password" id="confirmNewPin" required pattern="[0-9]{6}" maxlength="6"
                     class="w-full mt-1 p-2 sm:p-3 text-xl sm:text-2xl text-center rounded-lg border border-gray-300 text-gray-800 tracking-widest"
                     placeholder="••••••">
            </div>
          </div>
          
          <div class="flex gap-3 mt-4 sm:mt-6">
            <button type="button" onclick="Utils.closeModal(this.closest('.fixed'))"
                    class="flex-1 bg-gray-200 hover:bg-gray-300 py-2 rounded-lg text-gray-800 transition">
              ยกเลิก
            </button>
            <button type="submit" class="flex-1 btn-primary py-2 rounded-lg text-white">
              เปลี่ยนรหัส
            </button>
          </div>
        </form>
      </div>
    `;

    Utils.createModal(content, { size: "w-full max-w-md" });
  },

  // Process PIN change
  async processChangePin(event) {
    event.preventDefault();

    const currentPin = document.getElementById("currentPin").value;
    const newPin = document.getElementById("newPin").value;
    const confirmNewPin = document.getElementById("confirmNewPin").value;
    const user = this.getCurrentUser();

    // Validate new PIN
    if (newPin !== confirmNewPin) {
      Utils.showToast("รหัส PIN ใหม่ไม่ตรงกัน", "error");
      return;
    }

    if (!/^\d{6}$/.test(newPin)) {
      Utils.showToast("รหัส PIN ต้องเป็นตัวเลข 6 หลัก", "error");
      return;
    }

    // Verify current PIN
    const isValidPin = await FirebaseService.verifyPin(
      user.uid,
      this.hashPin(currentPin)
    );

    if (!isValidPin) {
      Utils.showToast("รหัส PIN ปัจจุบันไม่ถูกต้อง", "error");
      return;
    }

    // Update PIN
    const result = await FirebaseService.updatePin(
      user.uid,
      this.hashPin(newPin)
    );

    if (result.success) {
      Utils.closeModal(event.target.closest(".fixed"));
      Utils.showToast("เปลี่ยนรหัส PIN สำเร็จ", "success");
    } else {
      Utils.showToast("เกิดข้อผิดพลาดในการเปลี่ยน PIN", "error");
    }
  },
};

// Export
window.Auth = Auth;
