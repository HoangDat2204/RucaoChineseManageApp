/**
 * Tên file: global.js
 * Chức năng:
 * - Quản lý việc tải và cache dữ liệu dùng chung cho toàn bộ ứng dụng (ví dụ: database.json).
 * - Cung cấp các hàm tiện ích toàn cục.
 * - Được tải ngay từ file index.html.
 */

// --- KHỞI ĐỘNG ---

// Lắng nghe sự kiện pywebviewready để bắt đầu tải dữ liệu nền.
// Nếu không dùng PyWebView mà chạy trên trình duyệt thường, dùng DOMContentLoaded.
let teacherClassData = null; // Biến duy nhất để lưu dữ liệu
let BillDate = null;




function exportDataForSave () {
    console.log("🐍 Python đang lấy dữ liệu!");
    
    // 1. Gom dữ liệu
    // Lưu ý: Đảm bảo teacherClassData có thể truy cập được (scope)
    // Nếu biến nằm trong Vue/React, bạn cần truy xuất đúng cách.
    var dataToSend = teacherClassData ; 
    
    // 2. TRẢ VỀ DỮ LIỆU TRỰC TIẾP (QUAN TRỌNG)
    return JSON.stringify(dataToSend); 
}

window.addEventListener('pywebviewready', async () => {
    console.log("Global script: PyWebView API is ready.");
    
    BillData =  JSON.parse(sessionStorage.getItem('BillData'));
    console.log(BillData);
    if (!BillData){
        loadBillData();
    }

    teacherClassData =  JSON.parse(sessionStorage.getItem('teacherClassDB'));
    if (!teacherClassData){
        await loadAndCacheDatabase(true);
    }
     // Tải dữ liệu giáo viên/lớp lần đầu
    
    
    
    let grandTotal = [0, 0, 0];
    // Loop through teachers
    Object.keys(teacherClassData).forEach(teacher => {
        if (teacherClassData[teacher]['Class']) {
            Object.values(teacherClassData[teacher]['Class']).forEach(cls => {
                if (cls.Notifications && Array.isArray(cls.Notifications)) {
                    grandTotal[0] += cls.Notifications[0] || 0;
                    grandTotal[1] += cls.Notifications[1] || 0;
                    grandTotal[2] += cls.Notifications[2] || 0;
                }
            });
        }
    });
        
    classMange =  document.querySelector('.feature-card[href="page/classmanage.html"]');
    classMange.innerHTML = `<div class="card-icon">
                        <!-- Icon SVG cho lớp học/nhóm -->
                            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                        </div>
                        <h2>Quản Lý Lớp Học</h2>
                        <p>Xem thông tin buổi học lớp học, điểm danh.</p>
                        ${(Number(grandTotal[0]) + Number(grandTotal[1]) + Number(grandTotal[2])) > 0 ? '<div class="notification-bell-container"><svg class="bell-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg><span class="notification-badge-count">' + (Number(grandTotal[0]) + Number(grandTotal[1]) + Number(grandTotal[2])) + '</span></div>`' : ''}`;


});

// Phương án dự phòng cho trình duyệt thường
// document.addEventListener('DOMContentLoaded', loadAndCacheDatabase);


// --- CÁC HÀM QUẢN LÝ DỮ LIỆU ---

async function loadBillData() {
    try {
        const url = `/api/get-bill-data?_=${new Date().getTime()}`;
        const response = await fetch(url);
        if (!response.ok) {
            // Nếu lỗi, throw error để khối catch bên ngoài bắt được
            const errData = await response.json().catch(() => ({ error: 'Lỗi không xác định từ server.' }));
            throw new Error(errData.error || 'Lỗi kết nối server.');
        }
        
      

        allData = await response.json();
        sessionStorage.setItem('BillData', JSON.stringify(allData));

    } catch (error) {
        // Ném lỗi ra ngoài để hàm gọi nó có thể xử lý
        throw error; 
    }
}


/**
 * Tải dữ liệu giáo viên/lớp từ backend và lưu vào sessionStorage.
 * @param {boolean} forceRefresh - Nếu true, sẽ bỏ qua cache và tải lại từ server.
 */
async function loadAndCacheDatabase(forceRefresh = false) {
    // Hiển thị overlay loading toàn cục (nếu có)
    showGlobalLoading(true, "Đang cập nhật dữ liệu nền...");

    try {
        if (!forceRefresh) {
            const cachedData = sessionStorage.getItem('teacherClassDB');
            if (cachedData) {
                console.log("Đã sử dụng dữ liệu giáo viên/lớp từ cache.");
                window.dispatchEvent(new CustomEvent('databaseReady')); // Báo cho các trang biết dữ liệu đã sẵn sàng
                return; // Không cần tải lại
            }
        }

        console.log("Đang tải dữ liệu giáo viên/lớp dùng chung từ server...");
        
        const response = await fetch(`/api/get-database?_=${new Date().getTime()}`);
        if (!response.ok) throw new Error("Không thể tải dữ-liệu giáo viên/lớp.");
        
        const data = await response.json();
        // Lưu dữ liệu vào sessionStorage dưới dạng chuỗi JSON
        sessionStorage.setItem('teacherClassDB', JSON.stringify(data));
        console.log("Đã lưu dữ liệu giáo viên/lớp vào cache.");
        
        
       

        teacherClassData =  JSON.parse(sessionStorage.getItem('teacherClassDB'));
        // Gửi đi một sự kiện để các trang khác biết rằng dữ liệu đã được cập nhật
        window.dispatchEvent(new CustomEvent('databaseReady'));

    } catch (error) {
        console.error("Lỗi tải database dùng chung:", error);
        alert(`Lỗi nghiêm trọng: ${error.message}`);
    } finally {
        // Luôn ẩn overlay loading sau khi hoàn tất
        showGlobalLoading(false);
    }
}


// --- CÁC HÀM TIỆN ÍCH TOÀN CỤC ---

/**
 * Hiển thị hoặc ẩn overlay loading toàn cục.
 * Yêu cầu phải có <div id="global-loading-overlay">...</div> trong file HTML.
 * @param {boolean} isLoading - True để hiện, false để ẩn.
 * @param {string} message - Nội dung hiển thị.
 */
function showGlobalLoading(isLoading, message = "Đang xử lý...") {
    const loadingOverlay = document.getElementById('global-loading-overlay');
    if (loadingOverlay) {
        const loadingMessage = loadingOverlay.querySelector('p');
        if (loadingMessage) {
            loadingMessage.textContent = message;
        }
        loadingOverlay.style.display = isLoading ? 'flex' : 'none';
    }
}

/**
 * Hàm tiện ích để xóa và điền các options mới vào một thẻ <select>.
 * Có thể được gọi từ bất kỳ file JS nào khác.
 * @param {HTMLSelectElement} selectElement - Thẻ <select> cần cập nhật.
 * @param {string[]} dataArray - Mảng các chuỗi để tạo options.
 * @param {string} defaultText - Dòng chữ cho option mặc định.
 */
function populateSelect(selectElement, dataArray, defaultText) {
    if (!selectElement) return;
    
    // Xóa tất cả các option cũ
    selectElement.innerHTML = '';

    // Tạo và thêm option mặc định
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = defaultText;
    selectElement.appendChild(defaultOption);

    // Lặp qua mảng dữ liệu và tạo các option khác
    if (dataArray && Array.isArray(dataArray)) {
        dataArray.forEach(item => {
            const option = document.createElement('option');
            option.value = item;
            option.textContent = item;
            selectElement.appendChild(option);
        });
    }
}