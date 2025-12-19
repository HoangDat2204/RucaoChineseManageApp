// --- FILE: script/Classmanage.js (PHIÊN BẢN HOÀN CHỈNH) ---

// --- KHAI BÁO BIẾN TOÀN CỤC ---
const teacherList = document.getElementById('teacher-list');
const classGrid = document.getElementById('class-grid');
const classGridTitle = document.getElementById('class-grid-title');
const classGridSection = document.getElementById('class-grid-section');
const classDetailSection = document.getElementById('class-detail-section');
const backToGridBtn = document.getElementById('back-to-grid-btn');
const classDetailTitle = document.getElementById('class-detail-title');
const classStatusToggle = document.getElementById('class-status-toggle');
const sessionFilterContainer = document.querySelector('.session-filter');
const memberTableContainer = document.getElementById('member-table-container');
const addTeacherBtn = document.querySelector('.add-teacher-btn');
const addTeacherModal = document.getElementById('add-teacher-modal');
const closeTeacherModalBtn = document.getElementById('close-teacher-modal-btn');
const addTeacherForm = document.getElementById('add-teacher-form');
const abnormalListContainer = document.getElementById('detail-abnormal-list');
const BackToHomeBtn = document.querySelector('.back-button')
const editBtn = document.querySelector('.btn-icon-only'); // Nút cây bút
const infoItemSchedule = editBtn.closest('.info-item'); // Container cha to nhất
const scheduleList = document.getElementById('detail-study-schedule'); // Khu vực chứa các ngày
const headerTitle = document.getElementById('schedult-header'); // Header để đổi nút 
const breakList = document.getElementById('detail-break-list');
const addStudentBtn = document.getElementById('add-student-btn');
const newStudentNameInput = document.getElementById('student-name');


let teacherClassData = null; // Biến duy nhất để lưu dữ liệu
let currentClassInfo = { teacher: null, className: null, start_day: null, schedule:null }; // Lưu lại lớp đang xem
let isEditingSchedule = false; // Biến kiểm tra trạng thái đang sửa
let days = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
// --- CÁC HÀM XỬ LÝ GIAO DIỆN ---
/**
 * Tìm và cập nhật trạng thái (active/inactive) của một class card
 * trong màn hình grid danh sách lớp.
 * @param {string} className - Tên lớp cần cập nhật.
 * @param {boolean} isActive - Trạng thái mới (true là hoạt động).
 */
function updateClassCardStatus(className, isActive) {
    // Tìm đúng card trong grid dựa vào `data-className`
    const classCard = classGrid.querySelector(`.class-card[data-class-name="${className}"]`);

    if (classCard) {
        if (isActive) {
            // Nếu trạng thái mới là hoạt động, xóa class 'inactive'
            classCard.classList.remove('inactive');
        } else {
            // Nếu trạng thái mới là đã kết thúc, thêm class 'inactive'
            classCard.classList.add('inactive');
        }
        console.log(`Đã cập nhật giao diện cho card lớp '${className}'.`);
    }
}





function exportDataForSave () {
    console.log("🐍 Python đang lấy dữ liệu!");
    
    // 1. Gom dữ liệu
    // Lưu ý: Đảm bảo teacherClassData có thể truy cập được (scope)
    // Nếu biến nằm trong Vue/React, bạn cần truy xuất đúng cách.
    var dataToSend = teacherClassData ; 
    
    // 2. TRẢ VỀ DỮ LIỆU TRỰC TIẾP (QUAN TRỌNG)
    return JSON.stringify(dataToSend); 
}


function checkUnsavedChanges(actionCallback) {
    // 1. Nếu không có cờ đang sửa -> Cho qua luôn
    if (!isEditingSchedule) {
        actionCallback();
        return;
    }

    // 2. Nếu đang sửa -> Tạo và hiện Modal
    // Kiểm tra xem modal đã có trong DOM chưa để tránh tạo trùng
    if (document.querySelector('.warning-modal-overlay')) {
        document.querySelector('.warning-modal-overlay').remove();
    }

    const modalHTML = `
    <div class="warning-modal-overlay" id="unsavedWarningModal">
        <div class="warning-modal-box">
            <!-- Icon cảnh báo -->
            <svg class="warning-icon-svg" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 16 16">
                <path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/>
            </svg>
            
            <div class="warning-title">Chưa lưu thay đổi!</div>
            <div class="warning-text">
                Bạn đang sửa lịch học. Nếu rời đi bây giờ, dữ liệu sẽ bị mất.<br>
                <strong>Bạn có muốn rời đi không?</strong>
            </div>

            <div class="warning-actions">
                <!-- Nút X: Ở lại -->
                <button id="btnStay" class="btn-circle btn-stay" title="Hủy - Ở lại trang này">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16">
                         <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
                    </svg>
                </button>

                <!-- Nút Tick: Rời đi -->
                <button id="btnLeave" class="btn-circle btn-confirm-leave" title="Đồng ý - Rời đi và mất dữ liệu">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z"/>
                    </svg>
                </button>
            </div>
        </div>
    </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // 3. Gán sự kiện cho các nút trong Modal
    const modal = document.getElementById('unsavedWarningModal');
    
    // Nút Tick: Chấp nhận rời đi
    document.getElementById('btnLeave').onclick = function() {
        isEditingSchedule = false; // Reset cờ
        const scheduleListContainer = infoItemSchedule.querySelector('#detail-study-schedule');
        save_schedule_click(scheduleListContainer);
        modal.remove(); // Tắt bảng
        actionCallback(); // CHẠY HÀNH ĐỘNG CHUYỂN TRANG
    };

    // Nút X: Ở lại trang
    document.getElementById('btnStay').onclick = function() {
        modal.remove(); // Chỉ cần tắt bảng
    };
}
function openAddTeacherModal() {
    addTeacherForm.reset(); // Xóa dữ liệu cũ trong form
    addTeacherModal.style.display = 'flex';
    setTimeout(() => addTeacherModal.classList.add('visible'), 10);
}
function closeAddTeacherModal() {
    addTeacherModal.classList.remove('visible');
    setTimeout(() => addTeacherModal.style.display = 'none', 300);
}


function populateTeacherList(active_teacher = 'none') {
    if (!teacherClassData) return;
    console.log(teacherClassData)
    teacherList.querySelectorAll('.teacher-item:not(.add-teacher-btn)').forEach(item => item.remove());
    const teacherNames = Object.keys(teacherClassData).sort();
    teacherNames.forEach(name => {
        const listItem = document.createElement('li');
        let grandTotal = [0, 0, 0];

        if (name === active_teacher){
            listItem.className = 'teacher-item active'
        }
        else{
            listItem.className = 'teacher-item'
        }
        if (teacherClassData[name]['Class']) {
            Object.values(teacherClassData[name]['Class']).forEach(cls => {
                if (cls.Notifications && Array.isArray(cls.Notifications)) {
                    grandTotal[0] += cls.Notifications[0] || 0;
                    grandTotal[1] += cls.Notifications[1] || 0;
                    grandTotal[2] += cls.Notifications[2] || 0;
                }
            });
        }
        console.log(name)
        console.log(grandTotal)
 
        listItem.dataset.teacherName = name;
        const initials = name.split('_').pop().substring(0, 2).toUpperCase();
        listItem.innerHTML =    `<span class="avatar">${initials}</span>
                                <span class="name">${name}</span>
                                ${(Number(grandTotal[0])+ Number(grandTotal[1]) + Number(grandTotal[2])) > 0 ? '<span class="notification-badge">' + (Number(grandTotal[0]) + Number(grandTotal[1]) + Number(grandTotal[2])) + '</span>' : ''}`;
        teacherList.appendChild(listItem);
    });
}

function displayClassesForTeacher(teacherName) {
    classGrid.innerHTML = '';
    const classesObject = teacherClassData[teacherName]?.["Class"];
    if (!classesObject) {
        classGrid.innerHTML = '<p style="padding: 20px; text-align: center;">Giáo viên này chưa có dữ liệu lớp học.</p>';
        return;
    }
    classGridTitle.textContent = `Danh sách lớp của ${teacherName}`;
    const classNames = Object.keys(classesObject).sort();
    if (classNames.length === 0) {
        classGrid.innerHTML = '<p style="padding: 20px; text-align: center;">Giáo viên này chưa có lớp nào.</p>';
        return;
    }
    classNames.forEach(className => {
        let grandTotal = teacherClassData[teacherName]['Class'][className]['Notifications']


        const classDetails = classesObject[className];
        const card = document.createElement('div');
        card.className = 'class-card';
        card.dataset.className = className;
        if (!classDetails.isActive) {
            card.classList.add('inactive');
        }
        const memberCount = Object.keys(classDetails.Members || {}).length;
        const classType = (classDetails.loaiLop || 'Chung').toLowerCase();
        card.innerHTML = `<h3>${className}</h3>
                            <p>${memberCount} học viên</p>
                            <span class="class-type ${classType}">${classDetails.loaiLop || 'Chung'}</span>
                            ${(Number(grandTotal[0])+ Number(grandTotal[1]) + Number(grandTotal[2])) > 0 ? '<span class="notification-badge">' + (Number(grandTotal[0]) + Number(grandTotal[1]) + Number(grandTotal[2])) + '</span>' : ''}`;
        classGrid.appendChild(card);
    });
}

function filterAndDisplaySessions(row_number = 5) {
    // 1. Lấy dữ liệu lớp học
    const classDetails = teacherClassData[currentClassInfo.teacher]?.["Class"]?.[currentClassInfo.className];
    const sessionListContainer = document.getElementById('detail-session-list');
    
    if (!sessionListContainer) return;

    // Reset container & Style
    sessionListContainer.innerHTML = '';
    sessionListContainer.className = 'session-table-container'; // Dùng lại CSS Table đã tạo ở bước trước

    if (!classDetails) return;

    // --- BƯỚC 1: GỘP DỮ LIỆU TỪ 2 NGUỒN ---
    let allSessions = [];

    // Nguồn A: Buổi đã học (Mặc định là tính công)
    const regularSessions = classDetails.buoiDaHoc || {};
    Object.keys(regularSessions).forEach(key => {
        const val = regularSessions[key];
        // val format: [Start, End, Duration, StudentsList]
        if (Array.isArray(val) && val.length >= 4) {
            allSessions.push({
                type: val[5],
                dateRaw: val[0], // "yyyy_mm_dd"
                start: val[1],
                end: val[2],
                duration: val[3],
                students: val[4]
            });
        }
    });

    // Nguồn B: Buổi bất thường (Chỉ lấy nếu isNormal == True)
    const abnormalSessions = classDetails.buoibatthuong || {};

    Object.keys(abnormalSessions).forEach(key => {
        const val = abnormalSessions[key];
        // val format: [Start, End, Duration, StudentsList, IsNormal]
        if (Array.isArray(val) && val.length >= 5) {
            // Kiểm tra flag True/False (xử lý cả string lẫn boolean)
            const isNormalFlag = val[5]; 
            const isCounted = isNormalFlag;

            if (isCounted) {
                allSessions.push({
                    type: 'abnormal', // Đánh dấu để (tuỳ chọn) có thể tô màu khác nếu muốn
                    dateRaw: val[0], // "yyyy-mm-dd" hoặc "yyyy_mm_dd"
                    start: val[1],
                    end: val[2],
                    duration: val[3],
                    students: val[4]
                });
            }
        }
    });

    if (allSessions.length === 0) {
        sessionListContainer.innerHTML = '<div class="empty-message">Chưa có buổi học nào được ghi nhận.</div>';
        return;
    }

    // --- BƯỚC 2: SẮP XẾP (Date + Time) ---
    allSessions.sort((a, b) => {
        // Hàm helper để tạo Date Object từ chuỗi ngày và giờ
        // Hỗ trợ cả dấu "_" và "-" (2023_11_20 hoặc 2025-11-23)
        const getDateObj = (item) => {
            const dateStr = item.dateRaw.replace(/_/g, '-'); // Chuẩn hóa về yyyy-mm-dd
            // Ghép ngày + giờ bắt đầu để so sánh chính xác từng phút
            // Ví dụ: "2025-11-23T20:20:00"
            return new Date(`${dateStr}T${item.start}`);
        };

        const dateA = getDateObj(a);
        const dateB = getDateObj(b);

        // Giảm dần (Mới nhất lên đầu)
        return dateB - dateA;
    });

    // --- BƯỚC 3: RENDER HEADER ---
    const headerRow = document.createElement('div');
    headerRow.className = 'session-header';
    headerRow.innerHTML = `
        <div class="col-date">Ngày</div>
        <div class="col-time">Giờ học</div>
        <div class="col-duration">Độ dài</div>
        <div class="col-count" title="Số lượng học viên">SL</div>
        <div class="col-names">Học viên tham gia</div>
    `;
    sessionListContainer.appendChild(headerRow);

    // --- BƯỚC 4: RENDER BODY ---
    const bodyContainer = document.createElement('div');
    bodyContainer.className = 'session-body';
    let count = 0
    allSessions.forEach(session => {
        if (count == row_number){
            
            sessionListContainer.appendChild(bodyContainer);
            return true;
        }
        count += 1;
        // Xử lý hiển thị ngày
        // Chuyển đổi "yyyy_mm_dd" hoặc "yyyy-mm-dd" -> Date
        const [year, month, day_idx] = session.dateRaw.replace(/-/g, '_').split('_');
        const [day, idx] = day_idx.split(" ")
        const dateObj = new Date(Number(year),Number(month - 1),Number(day));
        const daysOfWeek = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
        const formattedDate = `${daysOfWeek[dateObj.getDay()]}, ${day.toString().padStart(2,'0')}/${month.toString().padStart(2,'0')}/${year} ${idx ? idx: ""}`;

        // Xử lý danh sách học viên
        let studentCount = 0;
        let studentNamesStr = "Chưa có dữ liệu";
        if (Array.isArray(session.students)) {
            studentCount = session.students.length;
            studentNamesStr = session.students.join(', ');
        }

        // Xử lý Giờ (Cắt bỏ giây nếu cần, ví dụ 20:00:00 -> 20:00)
        // Nếu muốn giữ nguyên giây thì để nguyên session.start
        const formatTime = (t) => t.split(':').slice(0, 2).join(':'); 
        const timeRange = `${formatTime(session.start).replace(":","h")} - ${formatTime(session.end).replace(":","h")}`;

        // Tạo dòng HTML
        const row = document.createElement('div');
        row.className = 'session-row';
        
        // (Tuỳ chọn) Thêm class nếu là buổi bất thường để dễ phân biệt
        if (session.type === 'abnormal') {
            row.style.backgroundColor = '#fff8e1'; // Màu vàng nhạt nhẹ để đánh dấu
        }
        else if(session.type === 'Absence'){
            row.style.backgroundColor = '#ffe6e6';
        }
        else if(session.type === 'Late'){
            row.style.backgroundColor = '#EBE3FB';
        }

        row.innerHTML = `
            <div class="col-date">
                <strong>${formattedDate}</strong>
                ${session.type === 'abnormal' ? '<br><small style="color:orange; font-size:0.8em">(Bù/Thêm)</small>' : ''}
                ${session.type === 'Absence' ? '<br><small style="color:orange; font-size:0.8em">( Vắng )</small>' : ''}
                ${session.type === 'Late' ? '<br><small style="color:orange; font-size:0.8em">( Trể )</small>' : ''}
            </div>
            <div class="col-time">${timeRange}</div>
            <div class="col-duration">${session.duration}</div>
            <div class="col-count text-center">
                <span class="badge-count">${studentCount}</span>
            </div>
            <div class="col-names" title="${studentNamesStr}">${studentNamesStr}</div>
        `;
        bodyContainer.appendChild(row);
    });

    sessionListContainer.appendChild(bodyContainer);
}




function populateClassDetails(teacherName, className) {
    const classDetails = teacherClassData[teacherName]?.["Class"]?.[className];
    if (!classDetails) return;
    currentClassInfo = { teacher: teacherName, className: className, start_day: classDetails.ngayBatDau, schedule: classDetails.Study_week_day };
    
    classDetailTitle.textContent = `Chi tiết lớp ${className}`;
    const isActive = classDetails.isActive ;
    classStatusToggle.checked = isActive;
    document.getElementById('class-status-label').textContent = isActive ? 'Đang hoạt động' : 'Đã kết thúc';
    
    const memberCount = Object.keys(classDetails.Members || {}).length;
    document.getElementById('detail-teacher-name').textContent = teacherName;
    document.getElementById('detail-member-count').textContent = `${memberCount} học viên`;
    const scheduleContainer = document.getElementById('detail-study-schedule');
    scheduleContainer.innerHTML = ''; // Xóa lịch học cũ
    const studyWeekDay = classDetails.Study_week_day;
    
    let grandTotal = classDetails['Notifications']
        
    const BuoiDaHoc = document.getElementById('tabs')
    BuoiDaHoc.innerHTML = `<button class="tab-link active" data-tab="tab-thanhvien">Thành viên</button>
                            <button class="tab-link" data-tab="tab-buoidahoc">Buổi đã học
                            ${(Number(grandTotal[0])) > 0 ? '<span  id="noti-vang-tre" class="notification-badge">' + (Number(grandTotal[0])) + '</span>' : ''}
                            </button>
                            <button class="tab-link" data-tab="tab-buoinghi">Buổi nghỉ
                            ${(Number(grandTotal[1])) > 0 ? '<span id="noti-buoi-nghi" class="notification-badge">' + (Number(grandTotal[1])) + '</span>' : ''}
                            </button>
                            <button class="tab-link" data-tab="tab-buoibatthuong">Buổi bất thường
                            ${(Number(grandTotal[2])) > 0 ? '<span id="noti-bat-thuong" class="notification-badge">' + (Number(grandTotal[2])) + '</span>' : ''}
                            </button>`

    if (studyWeekDay) {
        // Tách chuỗi dựa trên dấu "|"
        const schedules = studyWeekDay.split('|').map(s => s.trim());
        
        schedules.forEach(scheduleText => {
            const dayElement = document.createElement('span');
            dayElement.className = 'schedule-day';
            dayElement.textContent = scheduleText;
            scheduleContainer.appendChild(dayElement);
        });
    } else {
        scheduleContainer.textContent = 'Lịch không cố định';
    }

    document.getElementById('detail-class-type').textContent = classDetails.loaiLop || 'N/A';
    let Class_abnormal_number = Object.values(classDetails.buoibatthuong)
                            .filter(buoi => buoi[5] === true).length;

    let Class_normal = Object.keys(classDetails.buoiDaHoc || {}).length;
    document.getElementById('detail-total-sessions').textContent = `${(Number(Class_abnormal_number) + Number(Class_normal))} buổi`;

    // Tab Thành viên
    memberTableContainer.innerHTML = '';
    memberTableContainer.style = null;
    const members = classDetails.Members || {};
    const sortedMemberNames = Object.keys(members).sort((a, b) => {
        const statusA = members[a].isStudying === "True";
        const statusB = members[b].isStudying === "True";
    
        // Nếu trạng thái khác nhau, ưu tiên người đang học (statusB > statusA)
        if (statusA !== statusB) {
            return statusB - statusA; // true (1) sẽ lớn hơn false (0)
        }
    
        // Nếu trạng thái giống nhau, sắp xếp theo tên (alphabet)
        return a.localeCompare(b);
    });
    if (sortedMemberNames.length === 0) {
        memberTableContainer.innerHTML = 'Hiện tại chưa có học viên, nhấn nút bên dưới để thêm<button class="btn-circle-text" id="huge_one"></button></div>';
        memberTableContainer.style.textAlign = 'center';
        memberTableContainer.style.justifyItems = 'center';
        memberTableContainer.style.fontWeight = 'bold';
        memberTableContainer.style.fontSize = '20px';
        memberTableContainer.style.padding = '30px';
    } else {
        const headerRow = document.createElement('div');
        headerRow.className = 'member-table-header';
        headerRow.innerHTML = '<div class="member-table-cell header-info-cell">Học viên <button class="btn-circle-text"  id="smaller_one"></button></div>';
        const allCourseKeys = new Set();
        sortedMemberNames.forEach(name => Object.keys(members[name].TuitionFee || {}).forEach(key => allCourseKeys.add(key)));
        const sortedAllCourseKeys = Array.from(allCourseKeys).sort((a, b) => parseInt(a.replace('K', '')) - parseInt(b.replace('K', '')));
        sortedAllCourseKeys.forEach(courseKey => {
            const headerCell = document.createElement('div');
            headerCell.className = 'member-table-cell header-tuition-cell';
            headerCell.textContent = courseKey;
            headerRow.appendChild(headerCell);
        });
        memberTableContainer.appendChild(headerRow);

        sortedMemberNames.forEach(memberName => {
            const memberDetails = members[memberName];
            const dataRow = document.createElement('div');
            dataRow.className = 'member-table-row';
            if (memberDetails.isStudying === "False") {
                dataRow.classList.add('inactive-student');
            }
            const initials = memberName.substring(0, 2).toUpperCase();
            let rowHTML = `<div class="member-table-cell member-info-cell"><span class="member-name">${memberName}</span></div>`;
            sortedAllCourseKeys.forEach(courseKey => {
                const isDone = memberDetails.TuitionFee?.[courseKey] === 'Done';
                rowHTML += `<label class="member-table-cell tuition-cell"><input type="checkbox" class="tuition-checkbox" data-member-name="${memberName}" data-course-key="${courseKey}" ${isDone ? 'checked' : ''}></label>`;
            });
            dataRow.innerHTML = rowHTML;
            memberTableContainer.appendChild(dataRow);
        });

    }

    // Điền các tab khác
    filterAndDisplaySessions();
    const breakList = document.getElementById('detail-break-list');
    breakList.innerHTML = '';
    const BreakSessions = classDetails.buoiNghi || {};
    const BreakKeys = Object.keys(BreakSessions);
    
    const headerRow = document.createElement('div');
    headerRow.className = 'offdates-header sticky-header';
    headerRow.innerHTML = `
    <div class="col-date">Ngày diễn ra</div>
    <div class="col-reason" title="Lý do nghỉ">Lý do buổi nghỉ</div>
    `;
    breakList.appendChild(headerRow);

    BreakKeys.sort(); 
    BreakKeys.reverse();
    BreakKeys.forEach(breakDate => {
        const sessionInfo = BreakSessions[breakDate];
        const listItem = document.createElement('li');
        listItem.className = 'offdates-row';
        listItem.innerHTML = `<span class="break-date">${days[new Date(breakDate).getDay()]}, ${breakDate.split('-').reverse().join('/')}</span><span class="break-reason">${sessionInfo|| 'Lí do chưa xác định'}</span>`;
        breakList.appendChild(listItem);
    });

    reasons = document.querySelectorAll('.break-reason');
    const abnormalList = document.getElementById('detail-abnormal-list');
    
    if (abnormalList) {
        abnormalList.innerHTML = ''; 
        abnormalList.className = 'abnormal-table-container'; 

        const abnormalSessions = classDetails.buoibatthuong || {};
        const abnormalKeys = Object.keys(abnormalSessions);
        abnormalKeys.sort((a, b) => {
            // Lấy ngày và giờ của phần tử A
            // data[a][0] là ngày (2025-12-09), data[a][1] là giờ (14:59:55)
            // Ghép lại thành chuỗi chuẩn ISO: "2025-12-09T14:59:55"
            const timeA = new Date(`${abnormalSessions[a][0]}T${abnormalSessions[a][1]}`);
            const timeB = new Date(`${abnormalSessions[b][0]}T${abnormalSessions[b][1]}`);
          
            // So sánh thời gian
            return timeB - timeA ; 
          });

        // 1. TẠO HEADER (Thêm cột "Tính công")
        const headerRow = document.createElement('div');
        headerRow.className = 'abnormal-header sticky-header';
        
        // Lưu ý: CSS Grid sẽ định nghĩa lại độ rộng các cột này
        headerRow.innerHTML = `
            <div class="col-date">Ngày diễn ra</div>
            <div class="col-time">Thời gian</div>
            <div class="col-duration">Thời lượng</div>
            <div class="col-count" title="Số học viên">Số học viên</div>
            <div class="col-is-normal" title="Đánh dấu là buổi học bình thường">Buổi học bình thường</div>
        `;
        abnormalList.appendChild(headerRow);

        // 2. TẠO BODY
        const bodyContainer = document.createElement('div');
        bodyContainer.className = 'abnormal-body';

        if (abnormalKeys.length === 0) {
            bodyContainer.innerHTML = '<div class="empty-message">Chưa có buổi học bất thường.</div>';
        } else {
            abnormalKeys.forEach(Key => {
                const sessionInfo = abnormalSessions[Key]; 
                // Cấu trúc mong đợi: [Start, End, Duration, Count, IsNormal]
                
                if (!Array.isArray(sessionInfo) || sessionInfo.length < 4) return;

                // Xử lý ngày
                const [year, month, day_indx] = sessionInfo[0].split('-');
                const [day,ind] = day_indx.split(" ")
                const dateObj = new Date(Number(year),Number(month - 1),Number (day));
                const daysOfWeek = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
                const formattedDate = `${daysOfWeek[dateObj.getDay()]}, ${day}/${month}/${year}  ${ind ? ind : ""}`;

                // Xử lý dữ liệu
                const timeRange = `${sessionInfo[1].slice(0,5).replace(":","h")} - ${sessionInfo[2].slice(0,5).replace(":","h")}`;
                const duration = sessionInfo[3];
                const studentList = sessionInfo[4]; 
                let studentCount = 0;
        
                if (Array.isArray(studentList)) {
                    studentCount = studentList.length;
                    // Nối tên bằng dấu phẩy
                    studentNamesStr = studentList.join(', ');
                }
                // Lấy giá trị True/False từ phần tử thứ 5 (index 4)
                // Hỗ trợ cả kiểu Boolean (true) hoặc String ("True"/"true")
                let rawIsNormal = sessionInfo[5];
                let isChecked = rawIsNormal;
               

                const row = document.createElement('div');
                row.className = 'abnormal-row';
                
                // Render dòng dữ liệu
                // Input checkbox được thêm class 'normal-checkbox' để dễ xử lý sự kiện sau này
                // Tôi để 'disabled' để người dùng chỉ xem. Nếu bạn muốn cho sửa, hãy bỏ chữ 'disabled' đi.
                row.innerHTML = `
                    <div class="col-date"><strong>${formattedDate}</strong></div>
                    <div class="col-time">${timeRange}</div>
                    <div class="col-duration">${duration}</div>
                    <div class="col-count text-center">
                        <span class="badge-count-red">${studentCount}</span>
                    </div>
                    <div class="col-is-normal text-center">
                        <input type="checkbox" class="normal-checkbox" 
                               data-key="${Key}" 
                               ${isChecked ? 'checked' : ''} > 
                    </div>
                `;
                bodyContainer.appendChild(row);
            });
        }
        abnormalList.appendChild(bodyContainer);
        
    }


    // Reset về tab đầu tiên
    const tabsContainer = document.querySelector('.detail-tabs');
    tabsContainer.querySelector('.tab-link.active')?.classList.remove('active');
    tabsContainer.querySelector('[data-tab="tab-thanhvien"]')?.classList.add('active');
    document.querySelector('.tab-content.active')?.classList.remove('active');
    document.getElementById('tab-thanhvien')?.classList.add('active');
}

function initializePage() {
    const cachedDataString = sessionStorage.getItem('teacherClassDB');
    
    if (cachedDataString) {
        teacherClassData = JSON.parse(cachedDataString);
        populateTeacherList();
        const firstTeacherItem = teacherList.querySelector('.teacher-item:not(.add-teacher-btn)');
        if (firstTeacherItem) {
            firstTeacherItem.click();
        }
    } else {
        alert("Không tìm thấy dữ liệu dùng chung. Vui lòng quay lại trang chủ.");
        teacherList.innerHTML = '<li>Không có dữ liệu.</li>';
    }
}

// --- GẮN CÁC EVENT LISTENER ---

document.addEventListener('DOMContentLoaded', initializePage);
window.addEventListener('databaseReady', initializePage);


teacherList.addEventListener('click', (e) => {
    const clickedItem = e.target.closest('.teacher-item');
    if (!clickedItem || clickedItem.classList.contains('add-teacher-btn')) return;

    // BỌC LOGIC VÀO HÀM KIỂM TRA
    checkUnsavedChanges(() => {
        // --- Code xử lý chuyển trang cũ nằm ở đây ---
        teacherList.querySelector('.teacher-item.active')?.classList.remove('active');
        clickedItem.classList.add('active');
        displayClassesForTeacher(clickedItem.dataset.teacherName);
        classGridSection.style.display = 'block';
        classDetailSection.style.display = 'none';
    });
});


classGrid.addEventListener('click', (e) => {
    const clickedCard = e.target.closest('.class-card');
    if (!clickedCard) return;
    const teacherName = teacherList.querySelector('.teacher-item.active').dataset.teacherName;
    populateClassDetails(teacherName, clickedCard.dataset.className);
    classGridSection.style.display = 'none';
    classDetailSection.style.display = 'block';
});

backToGridBtn.addEventListener('click', () => {
    checkUnsavedChanges(() => {
        classGridSection.style.display = 'block';
        classDetailSection.style.display = 'none';
        // Nếu muốn reset form edit khi back thì thêm logic reset ở đây
    });
});



document.querySelector('.detail-tabs').addEventListener('click', async (e) => {
    if (!e.target.matches('.tab-link')) return;
    let grandTotal = teacherClassData[currentClassInfo.teacher]['Class'][currentClassInfo.className]['Notifications'];
    document.querySelector('.detail-tabs .active').classList.remove('active');
    document.querySelector('.tab-content.active').classList.remove('active');
    e.target.classList.add('active');
    if (e.target.dataset.tab === 'tab-buoidahoc'){
        grandTotal[0] = 0;
        const myButton = document.querySelector('.tab-link[data-tab="tab-buoidahoc"]');
        myButton.innerHTML = `Buổi đã học`;
    }
    else if (e.target.dataset.tab === 'tab-buoinghi'){
        grandTotal[1] = 0;
        const myButton = document.querySelector('.tab-link[data-tab="tab-buoinghi"]');
        myButton.innerHTML = `Buổi nghỉ`
    }
    else if (e.target.dataset.tab === 'tab-buoibatthuong'){
        grandTotal[2] = 0;
        const myButton = document.querySelector('.tab-link[data-tab="tab-buoibatthuong"]');
        myButton.innerHTML = `Buổi bất thường`;
    }
    
    

    teacherClassData[currentClassInfo.teacher]["Class"][currentClassInfo.className]['Notifications'] = grandTotal;
    populateTeacherList(currentClassInfo.teacher);
    displayClassesForTeacher(currentClassInfo.teacher);
    sessionStorage.setItem('teacherClassDB', JSON.stringify(teacherClassData));
    document.getElementById(e.target.dataset.tab).classList.add('active');
});


classStatusToggle.addEventListener('change', async (e) => {
    const newStatusBoolean = e.target.checked; // Lấy trạng thái boolean (true/false)
    
    // Cập nhật text trên giao diện ngay lập tức để người dùng thấy phản hồi
    document.getElementById('class-status-label').textContent = newStatusBoolean ? 'Đang hoạt động' : 'Đã kết thúc';

    // Vô hiệu hóa nút toggle trong khi gửi yêu cầu
    classStatusToggle.disabled = true;

    try {
        console.log(`Đang gửi yêu cầu cập nhật trạng thái cho lớp '${currentClassInfo.className}' thành: ${newStatusBoolean}`);
        // const ID_calendar = teacherClassData[ currentClassInfo.teacher]['ID_Calendar'];
        // const response = await fetch('/api/update-class-status', {
        //     method: 'POST',
        //     headers: { 'Content-Type': 'application/json' },
        //     body: JSON.stringify({
        //         teacherName: currentClassInfo.teacher,
        //         className: currentClassInfo.className,
        //         StartedDay: currentClassInfo.start_day,
        //         Schedule: currentClassInfo.schedule,
        //         isActive: newStatusBoolean, // Gửi đi giá trị boolean
        //         CalendarID : ID_calendar
        //     })
        // });

        // const result = await response.json();
        // if (!response.ok) {
        //     // Nếu có lỗi, đảo ngược lại trạng thái trên giao diện
        //     e.target.checked = !newStatusBoolean;
        //     document.getElementById('class-status-label').textContent = !newStatusBoolean ? 'Đang hoạt động' : 'Đã kết thúc';
        //     throw new Error(result.error);
        // }

        // console.log(result.message);
        updateClassCardStatus(currentClassInfo.className, newStatusBoolean);

        // // Cập nhật lại cache trong sessionStorage với dữ liệu mới nhất từ backend
        // if (result.newData) {
        //     teacherClassData = result.newData;
        //     sessionStorage.setItem('teacherClassDB', JSON.stringify(teacherClassData));
        //     console.log("Cache sessionStorage đã được cập nhật với dữ liệu từ server.");
        // }

        teacherClassData[currentClassInfo.teacher]['Class'][currentClassInfo.className]['isActive'] = newStatusBoolean;
        sessionStorage.setItem('teacherClassDB', JSON.stringify(teacherClassData));
        console.log("Cache sessionStorage đã được cập nhật với dữ liệu từ server.");
        e.target.checked = newStatusBoolean;
        console.log(teacherClassData)
    } catch (error) {
        e.target.checked = !newStatusBoolean;
        document.getElementById('class-status-label').textContent = !newStatusBoolean ? 'Đang hoạt động' : 'Đã kết thúc';
        alert(`Lỗi khi cập nhật trạng thái lớp: ${error.message}`);
    } finally {
        // Bật lại nút toggle sau khi hoàn tất
        classStatusToggle.disabled = false;
    }
});
memberTableContainer.addEventListener('change', async (e) => {
    if (e.target.matches('.tuition-checkbox')) {
        const checkbox = e.target;
        const memberName = checkbox.dataset.memberName;
        const courseKey = checkbox.dataset.courseKey;
        const newStatus = checkbox.checked ? "Done" : "No_done";

        // Vô hiệu hóa checkbox tạm thời để tránh click nhiều lần
        checkbox.disabled = true;

        try {
            console.log(`Đang gửi yêu cầu cập nhật học phí: [${memberName}] - [${courseKey}] -> ${newStatus}`);

            // const response = await fetch('/api/update-tuition-status', {
            //     method: 'POST',
            //     headers: { 'Content-Type': 'application/json' },
            //     body: JSON.stringify({
            //         teacherName: currentClassInfo.teacher,
            //         className: currentClassInfo.className,
            //         memberName: memberName,
            //         courseKey: courseKey,
            //         newStatus: newStatus
            //     })
            // });

            // const result = await response.json();
            // if (!response.ok) {
            //     // Nếu lỗi, đảo ngược lại trạng thái checkbox trên giao diện
            //     checkbox.checked = !checkbox.checked;
            //     throw new Error(result.error);
            // }

            // console.log(result.message);

            // Cập nhật lại cache trong sessionStorage với dữ liệu mới nhất
            // if (result.newData) {
       
            teacherClassData[currentClassInfo.teacher]['Class'][currentClassInfo.className]['Members'][memberName]['TuitionFee'][courseKey] =newStatus;
            sessionStorage.setItem('teacherClassDB', JSON.stringify(teacherClassData));
            console.log("Cache sessionStorage đã được cập nhật.");
            // }

        } catch (error) {
            alert(`Lỗi khi cập nhật học phí: ${error.message}`);
        } finally {
            // Bật lại checkbox sau khi hoàn tất
            checkbox.disabled = false;
        }
    }
});

memberTableContainer.addEventListener('click', (e) => {
    if (e.target.closest('.tuition-cell')) {
        // Nếu click vào ô học phí, không làm gì cả, để listener 'change' xử lý
        return; 
    }
    const memberInfoCell = e.target.closest('.member-info-cell');
    if (memberInfoCell) {
        e.preventDefault();
        const memberName = memberInfoCell.querySelector('.member-name').textContent;
        alert(`Xem chi tiết cho học viên: ${memberName}`);
    }
});

sessionFilterContainer.addEventListener('click', (e) => {
    if (e.target.matches('.filter-btn')) {
        sessionFilterContainer.querySelector('.active')?.classList.remove('active');
        e.target.classList.add('active');
        filterAndDisplaySessions(e.target.dataset.count);
    }
});

document.getElementById('detail-session-list').addEventListener('click', (e) => {
    if (e.target.matches('.expand-homework-btn')) {
        const button = e.target;
        const homeworkContainer = button.parentElement;
        const isExpanded = homeworkContainer.classList.toggle('expanded');
        button.textContent = isExpanded ? 'Thu gọn' : 'Xem thêm';
    }
});

addTeacherBtn.addEventListener('click', openAddTeacherModal);

// Đóng modal
closeTeacherModalBtn.addEventListener('click', closeAddTeacherModal);
addTeacherModal.addEventListener('click', (e) => {
    if (e.target === addTeacherModal) closeAddTeacherModal();
});
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && addTeacherModal.classList.contains('visible')) {
        closeAddTeacherModal();
    }
});

// Xử lý khi submit form
addTeacherForm.addEventListener('submit', async (e) => {
    e.preventDefault(); // Ngăn trang tải lại
    const submitButton = addTeacherForm.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = 'Đang lưu...';

    try {
        const formData = new FormData(addTeacherForm);
        const teacherData = Object.fromEntries(formData.entries());


        const response = await fetch('/api/add-teacher', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(teacherData)
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error);

        // Cập nhật thành công
        closeAddTeacherModal();
        alert(result.message);

        // Cập nhật lại dữ liệu và giao diện
        teacherClassData = result.newData; // Lấy dữ liệu mới nhất từ backend
        sessionStorage.setItem('teacherClassDB', JSON.stringify(teacherClassData)); // Cập nhật cache
        populateTeacherList(); // Vẽ lại danh sách giáo viên

    } catch (error) {
        alert(`Lỗi: ${error.message}`);
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'Lưu giáo viên';
    }
});

abnormalListContainer.addEventListener('change', async function(event) {
    if (event.target && event.target.classList.contains('normal-checkbox')) {
        const checkbox = event.target;
        const Key = checkbox.dataset.key;

        const isChecked = checkbox.checked; 
        if (currentClassInfo && currentClassInfo.teacher && currentClassInfo.className) {
            const classData = teacherClassData[currentClassInfo.teacher]["Class"][currentClassInfo.className];
            
            if (classData && classData.buoibatthuong && classData.buoibatthuong[Key]) {
                const sessionInfo = classData.buoibatthuong[Key];
                const newValue = isChecked ? true : false;
                
                if (sessionInfo.length >= 5) {
                    sessionInfo[5] = newValue;
                } else {
                    sessionInfo.push(newValue);
                }
                try {
                    // console.log(`Đang gửi yêu cầu cập nhật trạng thái cho buổi '${currentClassInfo.className}' thành: ${isChecked}`);
                    // const response = await fetch('/api/update-class-abnormal-status', {
                    //     method: 'POST',
                    //     headers: { 'Content-Type': 'application/json' },
                    //     body: JSON.stringify({
                    //         teacherName: currentClassInfo.teacher,
                    //         className: currentClassInfo.className,
                    //         isNormal: isChecked, // Gửi đi giá trị boolean
                    //         date: Key
                    //     })
                    // });
            
                    // if (!response.ok) {
                    //     checkbox.checked = !isChecked;
                    // }
                    // else{
                    filterAndDisplaySessions();
                    console.log("Cache sessionStorage đã được cập nhật với dữ liệu từ server.");
                    // }
                } catch (error) {
                    checkbox.checked = !isChecked;
                    alert(`Lỗi khi cập nhật trạng thái buổi: ${error.message}`);
                } 
            }
        }
    }
});

BackToHomeBtn.addEventListener('click', async (e) => {
    // 1. Chặn hành động chuyển trang ngay lập tức
    e.preventDefault();
    const btn = e.currentTarget; 
    const targetUrl = btn.getAttribute('href') || '/'; 

    // 4. Kiểm tra thay đổi
    checkUnsavedChanges(async () => {
        // --- NẾU NGƯỜI DÙNG ĐỒNG Ý RỜI ĐI ---
        
        // A. Gọi API lưu dữ liệu (Code cũ của bạn)
        try {
            const response = await fetch('/api/update-all', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({teacherClassData})
            });
            sessionStorage.setItem('teacherClassDB', JSON.stringify(teacherClassData));
            
            if (!response) { console.log("Lỗi API"); }
        } catch (err) {
            console.error(err);
        }

        // B. Tự động chuyển trang bằng JS
        window.location.href = targetUrl;
    });
});

editBtn.addEventListener('click', function() {
    
    // --- BƯỚC 1: Xử lý các ngày hiện có (Thêm nút X) ---
    const currentDays = scheduleList.querySelectorAll('.schedule-day');
    

    currentDays.forEach(day => {
        // Kiểm tra để tránh thêm nút X nhiều lần nếu bấm edit liên tục
        if (!day.querySelector('.btn-remove-schedule')) {
            const removeBtn = document.createElement('span');
            removeBtn.className = 'btn-remove-schedule';
            removeBtn.title = 'Xóa ngày này';
            
            // Icon SVG chữ X nhỏ
            removeBtn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
                </svg>
            `;

            // Sự kiện: Bấm X thì xóa chính dòng đó
            removeBtn.onclick = function() {
                day.remove();
            };

            day.appendChild(removeBtn);
        }
    });

    // --- BƯỚC 2: Thêm nút Cộng (+) ở dưới cùng info-item ---
    // Kiểm tra xem nút thêm đã tồn tại chưa
    if (!document.getElementById('btnAddSchedule')) {
        const addBtn = document.createElement('div'); // Dùng div hoặc button đều được
        addBtn.id = 'btnAddSchedule';
        addBtn.className = 'btn-add-schedule';
        addBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
            </svg>
            Thêm lịch học mới
        `;

        // Sự kiện cho nút Thêm: Thêm một thẻ span mới vào list
        addBtn.onclick = function() {
            console.log("hello")
            addNewScheduleRow(scheduleList);
        };

        // Chèn vào cuối cùng của thẻ info-item
        infoItemSchedule.appendChild(addBtn);
    }

    
    // --- BƯỚC 3: Đổi nút Edit thành nút Save (Như logic cũ của bạn) ---
    // (Lưu ý: Bạn cần update lại logic tạo nút Save ở đây nếu muốn giữ các nút X/+)
    changeEditToSaveButton();
});

headerTitle.addEventListener('click', function(e) {
    // Kiểm tra xem cái được click có phải là nút Edit (hoặc icon bên trong nó) không
    const btn = e.target.closest('.btn-icon-only');
    if (btn) {
        handleEditClick();
    }
});

// Hàm xử lý logic khi bấm nút Chỉnh sửa (Cây bút)
function handleEditClick() {
    isEditingSchedule = true;
    // Tìm các phần tử liên quan dựa trên nút vừa bấm
    const currentItem = infoItemSchedule;
    const scheduleListContainer = currentItem.querySelector('#detail-study-schedule');

    // --- BƯỚC 1: Thêm nút X vào các ngày hiện có ---
    const currentDays = scheduleListContainer.querySelectorAll('.schedule-day');
    currentDays.forEach(day => {
        if (!day.querySelector('.btn-remove-schedule')) {
            const removeBtn = document.createElement('span');
            removeBtn.className = 'btn-remove-schedule';
            removeBtn.title = 'Xóa ngày này';
            removeBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16"><path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/></svg>`;
            
            removeBtn.onclick = function() {
                day.remove();
            };
            day.appendChild(removeBtn);
        }
    });

    // --- BƯỚC 2: Thêm nút Cộng (+) ---
    if (!currentItem.querySelector('.btn-add-schedule')) {
        const addBtn = document.createElement('div');
        addBtn.id = 'btnAddSchedule';
        addBtn.className = 'btn-add-schedule';
        addBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
            </svg>
            Thêm lịch học mới
        `;

        addBtn.onclick = function() {
            // Gọi hàm mở Modal, truyền vào đúng container danh sách
            addNewScheduleRow(scheduleListContainer);
        };

        currentItem.appendChild(addBtn);
    }

    // --- BƯỚC 3: Đổi giao diện sang nút Save ---
    changeEditToSaveButton(scheduleListContainer);
}

// Hàm hiển thị Modal và thêm dòng mới
function addNewScheduleRow(targetList) {
    // 1. Tạo Modal nếu chưa có
    if (!document.getElementById('scheduleModal')) {
        createModalHTML();
    }

    const modal = document.getElementById('scheduleModal');
    // Hiển thị modal (đảm bảo CSS display: flex hoạt động)
    modal.style.display = 'flex';
    // Trick nhỏ để animation fade-in hoạt động mượt mà nếu có
    setTimeout(() => modal.classList.add('visible'), 10);

    // 2. Xử lý nút Xác Nhận (Reset sự kiện cũ)
    const confirmBtn = document.getElementById('modalConfirmBtn');
    const newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);

    newConfirmBtn.addEventListener('click', function() {
        const day = document.getElementById('selectDay').value;
        const startH = document.getElementById('startHour').value;
        const startM = document.getElementById('startMin').value;
        const endH = document.getElementById('endHour').value;
        const endM = document.getElementById('endMin').value;

        // Định dạng chuỗi hiển thị
        const formattedString = `${day}, ${startH}:${startM}-${endH}:${endM}`;

        // Tạo phần tử hiển thị mới
        const newSpan = document.createElement('span');
        newSpan.className = 'schedule-day';
        newSpan.textContent = formattedString;

        // Thêm nút X cho phần tử mới
        const removeBtn = document.createElement('span');
        removeBtn.className = 'btn-remove-schedule';
        removeBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16"><path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/></svg>`;
        removeBtn.onclick = () => newSpan.remove();
        
        newSpan.appendChild(removeBtn);
        targetList.appendChild(newSpan);

        // Đóng modal
        modal.style.display = 'none';
        modal.classList.remove('visible');
    });

    // 3. Xử lý nút Hủy
    const cancelBtn = document.getElementById('modalCancelBtn');
    cancelBtn.onclick = function() {
        modal.style.display = 'none';
        modal.classList.remove('visible');
    };
}

function createModalHTML() {
    const days = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];
    
    const generateOptions = (count) => {
        let options = '';
        for (let i = 0; i < count; i++) {
            let val = i < 10 ? '0' + i : i;
            options += `<option value="${val}">${val}</option>`;
        }
        return options;
    };

    const hourOptions = generateOptions(24);
    const minOptions = generateOptions(60);

    const modalHTML = `
    <div id="scheduleModal" class="modal-overlay" style="display:none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 9999; justify-content: center; align-items: center;">
        <div class="modal-box" style="background: white; padding: 25px; border-radius: 12px; width: 380px;">
            <h3 class="modal-title" style="text-align:center; margin-bottom:20px;">Thêm Lịch Học</h3>
            
            <div class="form-group" style="margin-bottom:15px;">
                <label style="display:block; margin-bottom:5px; font-weight:bold;">Chọn Ngày:</label>
                <select id="selectDay" style="width:100%; padding:8px; border-radius:5px; border:1px solid #ccc;">
                    ${days.map(d => `<option value="${d}">${d}</option>`).join('')}
                </select>
            </div>

            <div class="form-group" style="margin-bottom:15px;">
                <label style="display:block; margin-bottom:5px; font-weight:bold;">Giờ bắt đầu:</label>
                <div style="display:flex; gap:5px; align-items:center;">
                    <select id="startHour" style="flex:1; padding:8px;">${hourOptions}</select>
                    <span>:</span>
                    <select id="startMin" style="flex:1; padding:8px;">${minOptions}</select>
                </div>
            </div>

            <div class="form-group" style="margin-bottom:20px;">
                <label style="display:block; margin-bottom:5px; font-weight:bold;">Giờ kết thúc:</label>
                <div style="display:flex; gap:5px; align-items:center;">
                    <select id="endHour" style="flex:1; padding:8px;">${hourOptions}</select>
                    <span>:</span>
                    <select id="endMin" style="flex:1; padding:8px;">${minOptions}</select>
                </div>
            </div>

            <div class="modal-actions" style="display:flex; justify-content:flex-end; gap:10px;">
                <button id="modalCancelBtn" style="padding:8px 15px; border:none; background:#eee; cursor:pointer; border-radius:5px;">Hủy bỏ</button>
                <button id="modalConfirmBtn" style="padding:8px 15px; border:none; background:#28a745; color:white; cursor:pointer; border-radius:5px;">Xác nhận</button>
            </div>
        </div>
    </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Set mặc định
    document.getElementById('startHour').value = "19";
    document.getElementById('endHour').value = "20";
    document.getElementById('endMin').value = "30";
}

function changeEditToSaveButton(scheduleListRef) {
    headerTitle.innerHTML = `
        <span class="label" style="padding-right: 5px;">Lịch học trong tuần</span> 
        <button class="btn-check" id="saveButton" title="Lưu thay đổi">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16">
                <path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z"/>
            </svg>
        </button>
    `;

    const saveBtn = document.getElementById('saveButton');
    
    saveBtn.addEventListener('click', function() {
        save_schedule_click(scheduleListRef);
    });
}

function save_schedule_click(scheduleListRef){
    console.log("Đã bấm LƯU");
        // 1. Thu thập dữ liệu sạch (loại bỏ text của nút X)
        // Lưu ý: Lúc này scheduleListRef vẫn trỏ đúng vào DOM vì chúng ta truyền tham chiếu
        const currentDays = scheduleListRef.querySelectorAll('.schedule-day');
        let string_schedules = '';
        
        currentDays.forEach(day => {
            // Lấy textNode đầu tiên (là giờ học), bỏ qua các element con (nút X)
            let cleanText = "";
            for (let node of day.childNodes) {
                if (node.nodeType === Node.TEXT_NODE) {
                    cleanText += node.textContent;
                }
            }
            cleanText = cleanText.trim();
            if (cleanText) {
                string_schedules += ' | ' + cleanText;
            }
        });
        
        // Xóa dấu gạch đứng đầu tiên
        string_schedules = string_schedules.replace(/^ \| /, "");
        
        // Cập nhật vào biến data toàn cục
        if (teacherClassData[currentClassInfo.teacher] && teacherClassData[currentClassInfo.teacher]['Class'][currentClassInfo.className]) {
            teacherClassData[currentClassInfo.teacher]['Class'][currentClassInfo.className]['Study_week_day'] = string_schedules;
            // Lưu vào session storage
            sessionStorage.setItem('teacherClassDB', JSON.stringify(teacherClassData));
            console.log("Đã lưu dữ liệu mới:", string_schedules);
        }

        // 2. Dọn dẹp giao diện (Xóa nút X, xóa nút +)
        const removeBtns = scheduleListRef.querySelectorAll('.btn-remove-schedule');
        removeBtns.forEach(btn => btn.remove());

        const addBtn = document.getElementById('btnAddSchedule');
        if (addBtn) addBtn.remove();
        isEditingSchedule = false;
        // 3. Quay lại nút Edit
        restoreEditButton();
}

function restoreEditButton() {
    headerTitle.innerHTML = `
        <span class="label" style="padding-right: 5px;">Lịch học trong tuần</span>
        <button class="btn-icon-only" id="mainEditBtn" title="Chỉnh sửa">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168l10-10zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207 11.207 2.5zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293l6.5-6.5zm-9.761 5.175-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325z"></path>
            </svg>
        </button> 
    `;
    
    // Lưu ý: Không cần gán lại sự kiện click ở đây nữa 
    // vì chúng ta đã dùng Event Delegation ở đầu (headerTitle.addEventListener)
    // Nó sẽ tự động bắt được click vào nút #mainEditBtn mới này.
}


// 2. Duyệt qua từng thẻ và gán sự kiện click

breakList.addEventListener('dblclick', (e) => {
    if (e.target.closest('.break-date')) {
        // Nếu click vào ô học phí, không làm gì cả, để listener 'change' xử lý
        return; 
    }
    const memberInfoCell = e.target.closest('.break-reason');
    if (memberInfoCell) {
        let isSaving = false; 
        const parent = memberInfoCell.parentElement;
        const Break_day_div = parent.querySelector('.break-date');
        let datestring = Break_day_div.textContent.match(/\d{2}\/\d{2}\/\d{4}/)[0];
        let parts = datestring.split('/');
        let dateonly = `${parts[2]}-${parts[1]}-${parts[0]}`;
        
        const currentText = memberInfoCell.innerText;

        // 3. Tạo thẻ Input
        const input = document.createElement('input');
        input.type = 'text';
        input.value = currentText;
        input.className = 'edit-break-input'; // Thêm class để style CSS

        // 4. Xóa nội dung cũ và chèn Input vào
        memberInfoCell.innerHTML = ''; 
        memberInfoCell.appendChild(input);

        // 5. Tự động focus vào input để gõ luôn
        input.focus();

        // --- HÀM LƯU DỮ LIỆU ---
        function saveContent() {
            if (isSaving) return;
            isSaving = true;
            const newText = input.value;
            
            teacherClassData[currentClassInfo.teacher]['Class'][currentClassInfo.className]['buoiNghi'][dateonly] = newText;
            sessionStorage.setItem('teacherClassDB', JSON.stringify(teacherClassData));
            memberInfoCell.innerHTML = newText;
        }

        // 6. Xử lý khi click ra ngoài (Blur) -> Lưu
        input.addEventListener('blur', function() {
            saveContent();
        });

        // 7. Xử lý khi ấn Enter -> Lưu
        input.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault(); // Ngăn hành vi mặc định
                saveContent();
            }
        });      
        }
});


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

newStudentNameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault(); // Ngăn hành vi mặc định (như submit form)
        addStudentBtn.click(); // Giả lập một cú click vào nút "+"
    }
});
