/**
 * Tên file: AddClass.js
 * Chức năng: Xử lý toàn bộ logic giao diện cho trang Thêm Lớp Học Mới.
 */
const selectTeacher = document.getElementById('select-teacher');
const addScheduleBtn = document.getElementById('add-schedule-btn');
const scheduleContainer = document.getElementById('schedule-container');
const addStudentBtn = document.getElementById('add-student-btn');
const newStudentNameInput = document.getElementById('new-student-name');
const studentTableBody = document.getElementById('student-table-body');
const addClassForm = document.getElementById('add-class-form');


function exportDataForSave () {
    console.log("🐍 Python đang lấy dữ liệu!");
    
    // 1. Gom dữ liệu
    // Lưu ý: Đảm bảo teacherClassData có thể truy cập được (scope)
    // Nếu biến nằm trong Vue/React, bạn cần truy xuất đúng cách.
    var dataToSend = teacherClassData ; 
    
    // 2. TRẢ VỀ DỮ LIỆU TRỰC TIẾP (QUAN TRỌNG)
    return JSON.stringify(dataToSend); 
}

function initializeAddClassPage() {
    console.log("Trang Thêm Lớp đã tải. Đang đọc dữ liệu từ cache...");
    
    const cachedDataString = sessionStorage.getItem('teacherClassDB');
    
    if (cachedDataString) {
        const teacherClassData = JSON.parse(cachedDataString);
        
        // Lấy danh sách tên giáo viên
        const teacherNames = Object.keys(teacherClassData).sort();
        
        // Xóa các option cũ và điền danh sách giáo viên mới vào dropdown
        selectTeacher.innerHTML = '<option value="">-- Chọn giáo viên --</option>'; // Reset
        teacherNames.forEach(name => {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            selectTeacher.appendChild(option);
        });
        console.log("Đã điền xong danh sách giáo viên.");
        
    } else {
        console.warn("Không tìm thấy dữ liệu giáo viên/lớp trong cache.");
        // Có thể thêm một option báo lỗi
        selectTeacher.innerHTML = '<option value="">Không có dữ liệu giáo viên</option>';
        selectTeacher.disabled = true;
    }
}

/**
     * Hàm để thêm một hàng học viên mới vào bảng
     * @param {string} name - Tên của học viên
     */
function addStudentRow(name) {
    const row = document.createElement('tr');
    // `data-name` để dễ dàng lấy tên khi thu thập dữ liệu
    row.dataset.name = name; 

    row.innerHTML = `
        <td>${name}</td>
        <td><input type="checkbox" class="tuition-cb" data-course="K1"></td>
        <td><input type="checkbox" class="tuition-cb" data-course="K2"></td>
        <td><input type="checkbox" class="tuition-cb" data-course="K3"></td>
        <td><button type="button" class="remove-student-btn">&times;</button></td>
    `;
    studentTableBody.appendChild(row);
}


document.addEventListener('DOMContentLoaded', () => {

    initializeAddClassPage();

}); // Kết thúc DOMContentLoaded




    
    

    // Sự kiện khi bấm nút "+" thêm học viên
addStudentBtn.addEventListener('click', () => {
    const studentName = newStudentNameInput.value.trim();
    if (studentName) {
        addStudentRow(studentName);
        newStudentNameInput.value = ''; // Xóa ô input
        newStudentNameInput.focus(); // Focus lại vào ô input
    } else {
        alert("Vui lòng nhập tên học viên.");
    }
});

addScheduleBtn.addEventListener('click', () => {
    // Sao chép hàng đầu tiên
    const newRow = scheduleContainer.firstElementChild.cloneNode(true);
    
    // Reset giá trị của các input trong hàng mới
    newRow.querySelectorAll('input').forEach(input => input.value = '');
    
    // Hiển thị nút xóa cho hàng mới (và các hàng khác không phải hàng đầu)
    newRow.querySelector('.remove-row-btn').style.visibility = 'visible';
    
    scheduleContainer.appendChild(newRow);
});

// Sự kiện để xóa một hàng lịch học
scheduleContainer.addEventListener('click', (e) => {
    if (e.target.classList.contains('remove-row-btn')) {
        // Ngăn việc xóa hàng cuối cùng
        if (scheduleContainer.children.length > 1) {
            e.target.parentElement.remove();
        }
    }
});


    // Sự kiện khi nhấn Enter trong ô input tên học viên
newStudentNameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault(); // Ngăn hành vi mặc định (như submit form)
        addStudentBtn.click(); // Giả lập một cú click vào nút "+"
    }
});

// Sự kiện để xóa một hàng học viên
studentTableBody.addEventListener('click', (e) => {
    if (e.target.classList.contains('remove-student-btn')) {
        // closest('tr') sẽ tìm thẻ <tr> cha gần nhất và xóa nó đi
        e.target.closest('tr').remove();
    }
});


addClassForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitButton = addClassForm.querySelector('.submit-btn');
    submitButton.disabled = true;
    // Kích hoạt hiệu ứng loading trên toàn bộ container
    if ( !addClassForm) {
        console.error("Lỗi nghiêm trọng: Không tìm thấy các phần tử container hoặc form chính!");
        return; // Dừng thực thi nếu thiếu phần tử cốt lõi
    }
    addClassForm.classList.add('loading');
    submitButton.textContent = 'Đang kiểm tra và thêm...';
    
    try {
        // --- 1. Gom dữ liệu từ Form ---
        const schedule = [];
        scheduleContainer.querySelectorAll('.schedule-row').forEach(row => {
            schedule.push({
                day: row.querySelector('select[name="dayOfWeek[]"]').value,
                start: row.querySelector('input[name="startTime[]"]').value,
                end: row.querySelector('input[name="endTime[]"]').value
            });
        });

        const membersData = {};
        studentTableBody.querySelectorAll('tr').forEach(row => {
            const name = row.dataset.name;
            const tuition = {};
            row.querySelectorAll('.tuition-cb').forEach(cb => {
                tuition[cb.dataset.course] = cb.checked ? "Done" : "No_done";
            });
            membersData[name] = {
                isStudying: "True", Study_dates: [], Off_dates: [],
                TuitionFee: tuition
            };
        });

        const finalData = {
            teacherName: document.getElementById('select-teacher').value,
            className: document.getElementById('class-name').value,
            sessionControl : document.getElementById('session-control').checked,
            classDetails: {
                TeamsConversationID : document.getElementById('teams-id').value,
                Notifications : [0,0,0],
                isActive: "True",
                ngayBatDau: document.getElementById('start-date').value,
                loaiLop: document.getElementById('class-type').value,
                Study_week_day: schedule.map(s => `${s.day}, ${s.start}-${s.end}`).join(' | '),
                buoiDaHoc: {},
                buoiNghi: {},
                buoibatthuong: {},
                Members: membersData
            }
        };

        // Kiểm tra dữ liệu cơ bản
        if (!finalData.teacherName || !finalData.className) {
            throw new Error("Vui lòng chọn giáo viên và nhập tên lớp.");
        }

        // --- 2. Gửi dữ liệu lên Backend ---
        const response = await fetch('/api/add-class', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(finalData)
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error);

        // --- 3. Xử lý khi thành công ---
        alert(result.message);
        
        // Cập nhật lại cache và chuyển về trang quản lý
        if (result.newData) {
            sessionStorage.setItem('teacherClassDB', JSON.stringify(result.newData));
            window.location.href = './ClassAdd.html'; // Tự động chuyển trang
        }

    } catch (error) {
        alert(`Lỗi: ${error.message}`);
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'Thêm Lớp';
        addClassForm.classList.remove('loading');
    }
});