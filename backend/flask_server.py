# --- FILE MỚI: backend/flask_server.py ---
from datetime import date
import os
import json
from flask import Flask, jsonify, send_from_directory, request
from flask_cors import CORS
import threading
import re # <-- Thêm import còn thiếu
from calendar_scanner.calendar_scanner import main as scan_calendar_main, find_specific_class, delete_bill_task, create_new_class,delete_class_and_future_instances, create_calendar_events_for_class
import datetime



basedir = os.path.abspath(os.path.dirname(__file__))





# Lấy đường dẫn tuyệt đối của thư mục chứa file này
app = Flask(__name__, static_folder=os.path.join(basedir, '..'), static_url_path='')
BILL_FILE_PATH = os.path.join(basedir, 'calendar_scanner', 'data', 'bill.json')
DATA_BASE_PATH = os.path.join(basedir, '..', 'database', 'database.json')
print("HEllo ", DATA_BASE_PATH)
is_scanning = False


def process_bill_data(all_data):
    processed_list = []
    for student_name, data in all_data.items():
        sessions = data['class']
        teacher = data['teacher']
        courses = {}
        for session in sessions:
            match = re.search(r'B(\d+)K(\d+)', session.get('result', ''))
            if match:
                session_num = int(match.group(1))
                course_num = int(match.group(2))
                if course_num not in courses:
                    courses[course_num] = []
                courses[course_num].append({**session, 'sessionNumber': session_num})

        if not courses:
            continue
        
        course_numbers = list(courses.keys())
        target_course_num = None
        is_special_course = False

        courses_with_b = [cn for cn in course_numbers if any(s['sessionNumber'] == 12 for s in courses[cn])]
        if courses_with_b:
            is_special_course = True
        else:
            courses_with_b = [cn for cn in course_numbers if any(s['sessionNumber'] == 8 for s in courses[cn])]
   
        for target_course_num in courses_with_b:        
            if target_course_num is not None:
                target_sessions = courses[target_course_num]
                session_count = len(target_sessions)
                is_valid = (is_special_course and session_count == 12) or (not is_special_course and session_count == 8)
                target_sessions.sort(key=lambda s: s['sessionNumber'])
                dates = [s['date'] for s in target_sessions]
                expected_count = 12 if is_special_course else 8
                
                processed_list.append({
                    'name': student_name, 'courseNumber': target_course_num, 'teacher': teacher,
                    'isDisabled': not is_valid, 'dates': dates,
                    'displayText': f"{student_name} - Khóa {target_course_num} ({session_count}/{expected_count} buổi)" if not is_valid else f"{student_name} - Khóa {target_course_num} ({session_count} buổi)"
                })
            else:
                highest_course_num = max(course_numbers)
                session_count = len(courses[highest_course_num])
                processed_list.append({
                    'name': student_name, 'courseNumber': highest_course_num,
                    'isDisabled': True, 'dates': [],
                    'displayText': f"{student_name} - Khóa {highest_course_num} ({session_count} buổi, chưa kết thúc)"
                })

    processed_list.sort(key=lambda x: (x['isDisabled'], x['name']))
    return processed_list

@app.route('/')
def index():
    """Phục vụ file index.html."""
    return app.send_static_file('index.html')


@app.route('/api/get-database', methods=['GET'])
def get_database():
    try:
        if not os.path.exists(DATA_BASE_PATH): return jsonify({}), 200
        with open(DATA_BASE_PATH, 'r', encoding='utf-8') as f:
            data = json.load(f)
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": f"Lỗi đọc database.json: {e}"}), 500



@app.route('/api/cancel-bill-task', methods=['POST'])
def cancel_bill_task():
    data = request.get_json()
    student_name = data.get('studentName')
    id_calendar = data.get('ID_calendar')
    cancel_date = data.get('Bill_date')
    print(student_name)
    if not student_name:
        return jsonify({"error": "Thiếu thông tin học viên."}), 400

    # Gọi hàm xử lý logic từ module calendar_scanner
    success, message = delete_bill_task(student_name, id_calendar, cancel_date)

    if success:
        return jsonify({"message": message}), 200
    else:
        # Nếu không tìm thấy, đó là lỗi 404. Nếu lỗi server, là 500.
        # Để đơn giản, ta có thể trả về lỗi 500 chung cho các trường hợp thất bại.
        if "Không tìm thấy" in message:
             return jsonify({"error": message}), 404
        return jsonify({"error": message}), 500


@app.route('/api/get-bill-data', methods=['GET'])
def get_bill_data():
    try:
        if not os.path.exists(BILL_FILE_PATH): return jsonify([]), 200
        with open(BILL_FILE_PATH, 'r', encoding='utf-8') as f:
            raw_data = json.load(f)
        processed_data = process_bill_data(raw_data)
        print("processed_data")
        return jsonify(processed_data)
    except Exception as e:
        print(f"Lỗi khi xử lý dữ liệu bill: {e}")
        return jsonify({"error": "Không thể xử lý dữ liệu từ server"}), 500

@app.route('/api/process-custom-data', methods=['POST'])
def process_custom_data():
    try:
        raw_data = request.get_json()
        if not raw_data: return jsonify({"error": "Không có dữ liệu JSON."}), 400
        processed_data = process_bill_data(raw_data)
        return jsonify(processed_data)
    except json.JSONDecodeError:
        return jsonify({"error": "Dữ liệu không phải là JSON hợp lệ."}), 400
    except Exception as e:
        return jsonify({"error": f"Lỗi server: {e}"}), 500


def run_calendar_scan():
    global is_scanning
    if is_scanning: return
    is_scanning = True
    print("\n[SCANNER] Bắt đầu quét...")
    try:
        scan_calendar_main()
        print("[SCANNER] Quét thành công!")
    except Exception as e:
        print(f"[SCANNER] [LỖI]: {e}")
    finally:
        is_scanning = False
        print("[SCANNER] Kết thúc quét.")


@app.route('/api/refresh-calendar', methods=['POST'])
def refresh_calendar_api():
    global is_scanning
    if is_scanning: return jsonify({"message": "Đang quét."}), 429
    scanner_thread = threading.Thread(target=run_calendar_scan)
    scanner_thread.start()
    return jsonify({"message": "Đã bắt đầu làm mới."}), 202

@app.route('/api/scan-status', methods=['GET'])
def scan_status():
    return jsonify({"is_scanning": is_scanning})



@app.route('/api/find-sessions', methods=['POST'])
def find_sessions():
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request không chứa dữ liệu JSON."}), 400

    teacher_name = data.get('teacherName')
    class_name = data.get('className') # Tên học viên/lớp từ dropdown
    course_number = data.get('courseNumber')

    if not all([teacher_name, class_name, course_number]):
        return jsonify({"error": "Thiếu thông tin tìm kiếm (giáo viên, lớp, hoặc khóa)."}), 400

    print(f"Nhận yêu cầu tìm kiếm cho: GV '{teacher_name}', Lớp '{class_name}', Khóa {course_number}")
    try:
        result = find_specific_class(class_name, course_number);    
        respone = process_bill_data(result)
        if not (result): return jsonify({"Không tìm thấy khóa học hợp lệ"}), 500
        print(f" -> Tìm thấy {len(result)} buổi học. Trả về kết quả.")
        return jsonify(respone)


    except Exception as e:
        print(f"Lỗi khi tìm kiếm sự kiện: {e}")
        return jsonify({"error": "Lỗi server khi tìm kiếm."}), 500




# === API CHÍNH: CUNG CẤP TOÀN BỘ DỮ LIỆU THÔ ===
@app.route('/api/get-initial-data', methods=['GET'])
def get_initial_data():
    try:
        if not os.path.exists(DATA_BASE_PATH):
            return jsonify({}), 200 # Trả về object rỗng nếu file chưa có
        with open(DATA_BASE_PATH, 'r', encoding='utf-8') as f:
            raw_data = json.load(f)
        return jsonify(raw_data)
    except Exception as e:
        print(f"Lỗi khi đọc file data: {e}")
        return jsonify({"error": "Không thể đọc dữ liệu từ server"}), 500

@app.route('/api/add-teacher', methods=['POST'])
def add_teacher():
    data = request.get_json()
    teacher_name = data.get('teacherName')


    if not teacher_name or not teacher_name.strip():
        return jsonify({"error": "Tên giáo viên không được để trống."}), 400

    try:
        # Đọc dữ liệu hiện có
        db_data = {}
        if os.path.exists(DATA_BASE_PATH):
            with open(DATA_BASE_PATH, 'r', encoding='utf-8') as f:
                db_data = json.load(f)
        
        # Kiểm tra trùng lặp
        if teacher_name in db_data:
            return jsonify({"error": f"Giáo viên '{teacher_name}' đã tồn tại."}), 409 # 409 Conflict

        # Thêm giáo viên mới
        db_data[teacher_name] = {
            "Age": data.get('age', ''), # Dùng get với giá trị mặc định
            "ID_Calendar": data.get('ID_Calendar', ''),
            "Info": data.get('info', ''),
            "Class": {} # Bắt đầu với danh sách lớp rỗng
        }
        
        # Ghi đè lại toàn bộ file
        with open(DATA_BASE_PATH, 'w', encoding='utf-8') as f:
            json.dump(db_data, f, ensure_ascii=False, indent=2)
            
        print(f" -> Đã thêm giáo viên mới: '{teacher_name}'")
        return jsonify({"message": "Thêm giáo viên thành công!", "newData": db_data}), 201 # 201 Created

    except Exception as e:
        print(f"Lỗi khi thêm giáo viên: {e}")
        return jsonify({"error": "Lỗi server khi thêm giáo viên."}), 500


@app.route('/api/update-class-status', methods=['POST'])
def update_class_status():
    data = request.get_json()
    teacher_name = data.get('teacherName')
    class_name = data.get('className')
    is_active = data.get('isActive') # Nhận true/false từ frontend
    id_calendar = data.get('CalendarID')
    start_day = str( date.today())
    schedule = data.get('Schedule')

    if not all([teacher_name, class_name]) or is_active is None:
        return jsonify({"error": "Thiếu thông tin cần thiết."}), 400


    print(f"Nhận yêu cầu cập nhật trạng thái cho: GV '{teacher_name}', Lớp '{class_name}' -> isActive: {is_active}")
    print(id_calendar, "---------", start_day ,"-----------", schedule)
    try:
        # Sử dụng lock để tránh xung đột khi đọc/ghi file
        with threading.Lock():
            db_data = {}
            if os.path.exists(DATA_BASE_PATH):
                with open(DATA_BASE_PATH, 'r', encoding='utf-8') as f:
                    db_data = json.load(f)
            
            # Kiểm tra xem đường dẫn có tồn tại không
            if teacher_name not in db_data or class_name not in db_data[teacher_name].get("Class", {}):
                return jsonify({"error": "Không tìm thấy giáo viên hoặc lớp học."}), 404

            # Cập nhật trạng thái
            # Chuyển đổi boolean từ JS thành chuỗi "True"/"False" cho JSON
            db_data[teacher_name]["Class"][class_name]['isActive'] = "True" if is_active else "False"
            
            # Ghi đè lại toàn bộ file
            with open(DATA_BASE_PATH, 'w', encoding='utf-8') as f:
                json.dump(db_data, f, ensure_ascii=False, indent=2)
                
        print(f" -> Đã cập nhật trạng thái lớp '{class_name}' thành công.")
        # Trả về toàn bộ dữ liệu mới để frontend cập nhật cache
        
        if not is_active:
            success, message = delete_class_and_future_instances(class_name, id_calendar)
            if success:
                return jsonify({"message": "Cập nhật trạng thái và Calendar thành công!", "newData": db_data}), 200
            else:
                if "Không tìm thấy" in message:
                    return jsonify({"error": message}), 404
                return jsonify({"error": message}), 500
        else:
            success, message = create_calendar_events_for_class(id_calendar,teacher_name, class_name, start_day, schedule)
            if success:
                return jsonify({"message": "Cập nhật trạng thái và Calendar thành công!", "newData": db_data}), 200
            else:
                # Nếu không tìm thấy, đó là lỗi 404. Nếu lỗi server, là 500.
                # Để đơn giản, ta có thể trả về lỗi 500 chung cho các trường hợp thất bại.
                if "Không tìm thấy" in message:
                    return jsonify({"error": message}), 404
                return jsonify({"error": message}), 500
        
        return jsonify({"message": "Cập nhật trạng thái thành công!", "newData": db_data}), 200

    except Exception as e:
        print(f"Lỗi khi cập nhật trạng thái lớp: {e}")
        return jsonify({"error": "Lỗi server khi cập nhật trạng thái."}), 500
    

@app.route('/api/update-tuition-status', methods=['POST'])
def update_tuition_status():
    data = request.get_json()
    teacher_name = data.get('teacherName')
    class_name = data.get('className')
    member_name = data.get('memberName')
    course_key = data.get('courseKey')
    new_status = data.get('newStatus') # Nhận "Done" hoặc "No_done"

    if not all([teacher_name, class_name, member_name, course_key, new_status]):
        return jsonify({"error": "Thiếu thông tin cần thiết."}), 400

    print(f"Nhận yêu cầu cập nhật học phí: {teacher_name}/{class_name}/{member_name}/{course_key} -> {new_status}")

    try:
        with threading.Lock():
            db_data = {}
            if os.path.exists(DATA_BASE_PATH):
                with open(DATA_BASE_PATH, 'r', encoding='utf-8') as f:
                    db_data = json.load(f)
            
            # Dùng try-except để truy cập an toàn vào cấu trúc lồng nhau
            try:
                # Cập nhật giá trị
                db_data[teacher_name]["Class"][class_name]['Members'][member_name]['TuitionFee'][course_key] = new_status
            except KeyError:
                return jsonify({"error": "Không tìm thấy đường dẫn dữ liệu (Giáo viên/Lớp/Học viên/Khóa)."}), 404

            # Ghi đè lại toàn bộ file
            with open(DATA_BASE_PATH, 'w', encoding='utf-8') as f:
                json.dump(db_data, f, ensure_ascii=False, indent=2)
                
        print(" -> Đã cập nhật trạng thái học phí thành công.")
        # Trả về toàn bộ dữ liệu mới để frontend cập nhật cache
        return jsonify({"message": "Cập nhật học phí thành công!", "newData": db_data}), 200

    except Exception as e:
        print(f"Lỗi khi cập nhật học phí: {e}")
        return jsonify({"error": "Lỗi server khi cập nhật học phí."}), 500
    

@app.route('/api/add-class', methods=['POST'])
def add_class_api():
    data = request.get_json()
    teacher_name = data.get('teacherName')
    class_name = data.get('className')
    class_details = data.get('classDetails')
    session_control = data.get('sessionControl', False)
    if not all([teacher_name, class_name, class_details]):
        return jsonify({"error": "Thiếu thông tin."}), 400
    print(session_control, "==============================")
    success, result_data = create_new_class(teacher_name, class_name, class_details, session_control)
    
    if success:
        return jsonify(result_data), 201
    else:
        status_code = 409 if "Trùng lịch" in result_data.get("error", "") else 500
        return jsonify(result_data), status_code

@app.route('/api/update-class-abnormal-status', methods = ['POST'])
def update_abnormal_status():
    data = request.get_json()
    teacher_name = data.get('teacherName')
    class_name = data.get('className')
    key = data.get('date');
    is_normal = data.get('isNormal')

    if not all([teacher_name, class_name]) or key is None:
        return jsonify({"error": "Thiếu thông tin cần thiết."}), 400


    print(f"Nhận yêu cầu cập nhật trạng thái cho: GV '{teacher_name}', Lớp '{class_name}', buổi bất thường: '{key}'")
    try:
        with threading.Lock():
            db_data = {}
            if os.path.exists(DATA_BASE_PATH):
                with open(DATA_BASE_PATH, 'r', encoding='utf-8') as f:
                    db_data = json.load(f)
            
            # Kiểm tra xem đường dẫn có tồn tại không
            if teacher_name not in db_data or class_name not in db_data[teacher_name].get("Class", {}):
                return jsonify({"error": "Không tìm thấy giáo viên hoặc lớp học."}), 404
            db_data[teacher_name]["Class"][class_name]['buoibatthuong'][key][5] = is_normal
            
            with open(DATA_BASE_PATH, 'w', encoding='utf-8') as f:
                json.dump(db_data, f, ensure_ascii=False, indent=2)
                
        print(f" -> Đã cập nhật trạng thái lớp '{class_name}' thành công.")
        
        return jsonify({"message": "Cập nhật trạng thái thành công!"}), 200

    except Exception as e:
        print(f"Lỗi khi cập nhật trạng thái lớp: {e}")
        return jsonify({"error": "Lỗi server khi cập nhật trạng thái."}), 500
    
@app.route('/api/update-all', methods = ['POST'])
def update_all_database():
    data = request.get_json()['teacherClassData'];

    try:
        with open(DATA_BASE_PATH, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        return jsonify({"message": "Cập nhật db thái thành công!"}), 200
    except:
        return jsonify({"error": "Lỗi server khi cập db."}), 500