import jwt  # Cần cài thư viện: pip install pyjwt
from datetime import datetime
import requests
import urllib.parse
import os
from seleniumwire import webdriver  # Dùng seleniumwire để bắt header
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
import json
import re
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, time, timezone
import time  # <--- Thêm dòng này


basedir = os.path.abspath(os.path.dirname(__file__))
CHROME_USER_DATA_DIR = os.path.join(basedir, 'selenium_profile_for_teams')
TOKEN_FILE_PATH = os.path.join(basedir, 'token.txt')
SKYPE_TOKEN = ""
GLOBAL_TARGET_DATE = "2025-11-01" # Ví dụ, bạn gán giá trị thực tế vào đây
DB_FILE_PATH = os.path.join(basedir, '..','..','database', 'database.json')


def make_unique_key(target_set, base_key):
    if base_key not in target_set:
        target_set.add(base_key)
        return base_key
    counter = 1
    while True:
        new_key = f"{base_key} ({counter})"
        if new_key not in target_set:
            target_set.add(new_key)
            return new_key
        counter += 1

def convert_utc_to_vietnam(dt_obj):
    """Chuyển datetime từ UTC sang UTC+7"""
    return dt_obj + timedelta(hours=7)
def load_token():
    global SKYPE_TOKEN  
    try:
        with open(TOKEN_FILE_PATH, "r", encoding="utf-8") as f:
            SKYPE_TOKEN = f.read().strip() 
        print(f"✅ Đã đọc được Token: {SKYPE_TOKEN[:20]}...") # In thử 20 ký tự đầu
        return True
    except FileNotFoundError:
        print("⚠️ Chưa có file token. Vui lòng chạy script lấy token trước.")
        return False
    except Exception as e:
        print(f"❌ Lỗi khi đọc file: {e}")
        return False

def get_start_time_ms(date_string):
    """
    Input: '2025-11-20' (Ngầm hiểu là giờ Việt Nam)
    Output: Timestamp UTC (Đã trừ 7 tiếng) để gửi cho API
    """
    try:
        # 1. Tạo datetime từ chuỗi (Ví dụ: 2025-11-20 00:00:00)
        dt_naive = datetime.strptime(date_string, "%Y-%m-%d")
        
        # 2. Gán cứng múi giờ cho nó là UTC+7 (Vietnam)
        vn_timezone = timezone(timedelta(hours=7))
        dt_vn = dt_naive.replace(tzinfo=vn_timezone)
        
        # 3. Lấy timestamp (Python sẽ tự động đổi từ múi giờ +7 về UTC để tính giây)
        timestamp_s = dt_vn.timestamp()
        
        # 4. Đổi ra mili-giây
        timestamp_ms = int(timestamp_s * 1000)
        
        return str(timestamp_ms)
    except ValueError:
        print("❌ Ngày tháng sai định dạng")
        return "1"
    
# ================= CẤU HÌNH =================
# 1. Đường dẫn đến thư mục User Data của Chrome
# Cách lấy: Gõ chrome://version vào thanh địa chỉ, copy dòng "Profile Path"
# LƯU Ý: Bỏ chữ "\Default" ở cuối đường dẫn đi.
# Ví dụ: C:\Users\Admin\AppData\Local\Google\Chrome\User Data
# ============================================

def get_and_save_token():
    print("⚠️  LƯU Ý: Hãy tắt hết Chrome đang mở trước khi chạy!")
    print("🚀 Đang khởi động trình duyệt để lấy Token...")

    options = webdriver.ChromeOptions()
    options.add_argument(f"--user-data-dir={CHROME_USER_DATA_DIR}")
    options.add_argument("--headless") 
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-gpu")
    
    options.accept_insecure_certs = True
    try:
        driver = webdriver.Chrome(
            service=Service(ChromeDriverManager().install()), 
            options=options
        )
        print("🔗 Đang truy cập Teams...")
        driver.get("https://teams.live.com/")
        
        found_token = None
        print("⏳ Đang 'nghe lén' gói tin mạng (Chờ khoảng 20s)...")
        
        for i in range(30):
            time.sleep(1)
            for request in reversed(driver.requests):
                if request.response: 
                    auth_header = request.headers.get('authentication') or request.headers.get('Authentication')
                    
                    if auth_header and 'skypetoken=' in auth_header:
                        print(f"✅ Đã BẮT ĐƯỢC Token ở giây thứ {i+1}!")
                        found_token = auth_header
                        break
            if found_token:
                break
        if found_token:
            clean_token = found_token.replace("skypetoken=", "").strip()
            with open(TOKEN_FILE_PATH, "w", encoding="utf-8") as f:
                f.write(clean_token)
                
            print(f"💾 Đã lưu token vào file: {TOKEN_FILE_PATH}")
            print(f"🔑 Token preview: {clean_token[:30]}...")
            return True
        else:
            print("❌ Không tìm thấy token sau 30s. Có thể trang web chưa load xong hoặc chưa đăng nhập.")
            return False

    except Exception as e:
        print(f"❌ Lỗi xảy ra: {e}")
        if "user data directory is already in use" in str(e).lower():
            print("👉 GỢI Ý: Bạn chưa tắt hết Chrome. Hãy tắt Chrome và thử lại.")
        return False
        
    finally:
        if 'driver' in locals():
            driver.quit()

def check_token_life(token):
    try:
        decoded = jwt.decode(token, options={"verify_signature": False})
        exp_timestamp = decoded.get('exp') # Thời điểm hết hạn (Unix timestamp)
        now_timestamp = time.time()
        time_left = exp_timestamp - now_timestamp
        
        if time_left > 0:
            print("HELLO1")
            hours = int(time_left // 3600)
            minutes = int((time_left % 3600) // 60)
            print(f"✅ Token còn sống: {hours} giờ {minutes} phút nữa.")
            return True
        else:
            print("HELLO2")

            print("❌ Token ĐÃ HẾT HẠN!")
            get_and_save_token()
            return False
    
    except Exception as e:
        print("HELLO3")
        get_and_save_token()
        return False

def msg_load(id, number_msg = 200): 
    id_encode = urllib.parse.quote(id)
    url = f"https://teams.live.com/api/chatsvc/consumer/v1/users/ME/conversations/{id_encode}/messages"
    headers = {
        "authentication": f"skypetoken={SKYPE_TOKEN}",
        "clientinfo": "os=windows; osVer=NT 10.0; proc=x86; lcid=en-us; deviceType=1; country=us; clientName=skypeteams; clientVer=1415/25110202744",
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36"
    }
    params = {
        "view": "msnp24Equivalent|supportsMessageProperties|supportsExtendedHistory",
        "pageSize": number_msg,
        "startTime":  get_start_time_ms(GLOBAL_TARGET_DATE)
    }

    try:
        response = requests.get(url, headers=headers, params=params)
        response.raise_for_status() 
        data = response.json()
        messages = data.get('messages', [])
        print(f"Lấy được {len(messages)} tin nhắn.")
        return messages

    except Exception as e:
        print("Lỗi rồi:", e)
        return;



# --- GIẢ LẬP HÀM LẤY MESSAGE (BẠN THAY BẰNG HÀM THỰC TẾ CỦA BẠN) ---
# from your_crawler_module import get_messages_optimized 
# Tạm thời tôi để pass để code chạy được logic, bạn nhớ import hàm thật
def get_messages_optimized(chat_id):
    # Code thực tế của bạn sẽ gọi API Teams ở đây
    return [] 

# --- BIẾN GLOBAL ---


# --- 1. CÁC HÀM BỔ TRỢ (HELPER) ---



def parse_vietnamese_weekday(day_str):
    """Chuyển 'Thứ 2' -> 0, 'Chủ Nhật' -> 6"""
    mapping = {
        'thứ 2': 0, 'thứ 3': 1, 'thứ 4': 2, 'thứ 5': 3, 
        'thứ 6': 4, 'thứ 7': 5, 'chủ nhật': 6, 'cn': 6
    }
    return mapping.get(day_str.lower().strip(), -1)

def parse_schedule_string(schedule_str):
    """
    Input: "Thứ 2, 09:00-11:00 | Thứ 4, 09:00-11:00"
    Output: List các buổi học lí thuyết
    [{'weekday': 0, 'start': time(9,0), 'end': time(11,0), 'duration_min': 120}, ...]
    """
    if not schedule_str: return []
    sessions = []
    parts = schedule_str.split('|')
    
    for part in parts:
        # Regex để bắt: "Thứ X, HH:MM-HH:MM"
        match = re.search(r'([^,]+),\s*(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})', part.strip())
        if match:
            day_str, start_str, end_str = match.groups()
            weekday = parse_vietnamese_weekday(day_str)
            
            try:
                t_start = datetime.strptime(start_str, "%H:%M").time()
                t_end = datetime.strptime(end_str, "%H:%M").time()
                
                # Tính độ dài lí thuyết (phút)
                dummy_date = datetime(2000, 1, 1)
                dt_start = dummy_date.replace(hour=t_start.hour, minute=t_start.minute)
                dt_end = dummy_date.replace(hour=t_end.hour, minute=t_end.minute)
                duration = (dt_end - dt_start).total_seconds() / 60
                
                if weekday != -1:
                    sessions.append({
                        'weekday': weekday,
                        'start': t_start,
                        'end': t_end,
                        'duration_min': duration
                    })
            except:
                continue
    return sessions

def extract_participants_from_xml(content):
    """Chỉ trích xuất danh sách người tham gia từ XML gói End"""
    try:
        xml_string = f"<root>{content}</root>"
        root = ET.fromstring(xml_string)
        participants = []
        for part in root.findall(".//part"):
            name = part.find('displayName').text
            participants.append(name)
        return participants
    except:
        return []

def format_duration(seconds):
    """Đổi giây sang chuỗi '1 giờ 30 phút 0 giây'"""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    sec = int(seconds % 60)
    return f"{hours} giờ {minutes} phút {sec} giây"

# --- 2. LOGIC XỬ LÝ CHÍNH ---

def process_class_messages(class_name, class_data):
    """
    Xử lý tin nhắn:
    1. Dùng GUID làm key.
    2. Bỏ qua nếu GUID đã tồn tại.
    3. Tính toán buổi nghỉ dạng Dict.
    """
    conv_id = class_data.get("TeamsConversationID")
    if not conv_id: return class_data

    # Lấy lịch lí thuyết
    schedule_list = parse_schedule_string(class_data.get("Study_week_day", ""))
    if not schedule_list: return class_data

    # --- LOAD DỮ LIỆU CŨ RA ĐỂ CHECK TRÙNG ---
    # Đảm bảo là dict, nếu chưa có thì khởi tạo rỗng
    buoi_da_hoc = class_data.get("buoiDaHoc", {})
    buoi_vang_nghi_count = 0
    if not isinstance(buoi_da_hoc, dict): buoi_da_hoc = {}
    
    buoi_bat_thuong = class_data.get("buoibatthuong", {})
    if not isinstance(buoi_bat_thuong, dict): buoi_bat_thuong = {}
    buoi_batthuong_count = 0

    # Lấy tin nhắn từ API
    messages = msg_load(conv_id)
    if not messages: return class_data

    # --- BƯỚC 1: GOM CẶP START - END ---
    call_sessions_map = {}
    checkin_msgs = [] 

    for msg in messages:
        msg_type = msg.get('messagetype')
        content = msg.get('content', '')
        arr_time_str = msg.get('originalarrivaltime')
        
        if msg_type == 'Event/Call':
            skype_guid = msg.get('skypeguid')
            if not skype_guid: continue 

            # === CHECK TRÙNG GUID NGAY TẠI ĐÂY ĐỂ TỐI ƯU ===
            # Nếu GUID này đã được xử lý và lưu trong DB rồi thì bỏ qua luôn
            if skype_guid in buoi_da_hoc or skype_guid in buoi_bat_thuong:
                continue 

            try:
                msg_dt_utc = datetime.strptime(arr_time_str.split('.')[0].replace('Z', ''), "%Y-%m-%dT%H:%M:%S")
                msg_dt_vn = convert_utc_to_vietnam(msg_dt_utc)

                if skype_guid not in call_sessions_map:
                    call_sessions_map[skype_guid] = {}

                if '<callEventType>callStarted</callEventType>' in content:
                    call_sessions_map[skype_guid]['real_start'] = msg_dt_vn
                
                elif '<callEventType>callEnded</callEventType>' in content:
                    call_sessions_map[skype_guid]['real_end'] = msg_dt_vn
                    call_sessions_map[skype_guid]['participants'] = extract_participants_from_xml(content)
            except Exception as e:
                print(f"Lỗi parse event call: {e}")

        elif msg_type in ['RichText/Html', 'Text']:
            clean_text = re.sub('<[^<]+?>', '', content).strip()
            # Chuẩn hóa text về chữ thường để so sánh cho chính xác (hi/HI/Hi)
            clean_text_lower = clean_text.lower()
            if clean_text_lower == '2' or clean_text_lower == 'hi':
                try:
                    chk_dt_utc = datetime.strptime(arr_time_str.split('.')[0].replace('Z', ''), "%Y-%m-%dT%H:%M:%S")
                    chk_dt_vn = convert_utc_to_vietnam(chk_dt_utc)
                    checkin_msgs.append(chk_dt_vn)
                except: pass

    # --- BƯỚC 2: LỌC RA CÁC CUỘC GỌI HỢP LỆ (CHỈ XỬ LÝ CÁI MỚI) ---
    valid_calls = []
    for guid, session in call_sessions_map.items():
        # Kiểm tra lại lần nữa cho chắc (dù đã check ở trên)
        if guid in buoi_da_hoc or guid in buoi_bat_thuong:
            continue

        if 'real_end' in session:
            start_time = session.get('real_start')
            end_time = session['real_end']
            
            # Fallback nếu thiếu start (tùy chọn)
            if not start_time: pass 

            if start_time and end_time:
                duration_sec = (end_time - start_time).total_seconds()
                valid_calls.append({
                    'start_dt': start_time,
                    'end_dt': end_time,
                    'duration_sec': duration_sec,
                    'participants': session.get('participants', []),
                    'guid': guid
                })

    # Sắp xếp các cuộc gọi mới
    valid_calls.sort(key=lambda x: x['start_dt'])

    # --- BƯỚC 3: PHÂN LOẠI VÀ CẬP NHẬT VÀO DICT HIỆN CÓ ---
    # Lưu ý: Ta cập nhật trực tiếp vào biến buoi_da_hoc và buoi_bat_thuong đã load từ đầu

    for call in valid_calls:
        base_date_str = call['start_dt'].strftime("%Y-%m-%d")
        call_weekday = call['start_dt'].weekday()
        call_time = call['start_dt'].time()
        call_guid = call['guid']
        
        # Tìm lịch lí thuyết khớp
        matched_schedule = None
        for sched in schedule_list:
            if sched['weekday'] == call_weekday:
                dummy_date = datetime(2000, 1, 1)
                dt_sched = dummy_date.replace(hour=sched['start'].hour, minute=sched['start'].minute)
                dt_call = dummy_date.replace(hour=call_time.hour, minute=call_time.minute)
                
                diff_min = abs((dt_call - dt_sched).total_seconds() / 60)
                if diff_min <= 15:
                    matched_schedule = sched
                    break
        
        # Chuẩn bị value
        val_start = call['start_dt'].strftime("%H:%M:%S")
        val_end = call['end_dt'].strftime("%H:%M:%S")
        val_dur_str = format_duration(call['duration_sec'])
        val_parts = call['participants']

        # --- PHÂN LOẠI ---
        if not matched_schedule:
            # Thêm vào dict Bất Thường (Key là GUID)
            buoi_bat_thuong[call_guid] = [base_date_str, val_start, val_end, val_dur_str, val_parts, False, "WrongTime"]
            buoi_batthuong_count += 1
            continue

        status = "Normal"
        actual_dur_min = call['duration_sec'] / 60
        theory_dur_min = matched_schedule['duration_min']
        diff_dur = theory_dur_min - actual_dur_min
        
        if diff_dur > 30:
            buoi_bat_thuong[call_guid] = [base_date_str, val_start, val_end, val_dur_str, val_parts, False, "EndSoon"]
            buoi_batthuong_count += 1
            continue
        elif 5 <= diff_dur <= 30:
            status = "EndSoon"
            buoi_vang_nghi_count += 1
        
        # Kiểm tra điểm danh "2"
        sched_start_dt = call['start_dt'].replace(
            hour=matched_schedule['start'].hour, 
            minute=matched_schedule['start'].minute, 
            second=0
        )

        found_checkin = None
        for chk_time in checkin_msgs:
            # So sánh cùng ngày
            if chk_time.date() == call['start_dt'].date():
                found_checkin = chk_time
                break
        
        if not found_checkin:
            status = "Absence"
            buoi_vang_nghi_count += 1
        else:
            delta_checkin = (found_checkin - sched_start_dt).total_seconds() / 60
            if delta_checkin > 15:
                status = "Absence"
                buoi_vang_nghi_count += 1
            elif 5 < delta_checkin <= 15:
                if status == "Normal":
                    status = "Late"
                    buoi_vang_nghi_count += 1

        # Thêm vào dict Đã Học (Key là GUID)
        buoi_da_hoc[call_guid] = [base_date_str, val_start, val_end, val_dur_str, val_parts, status]

    # Gán ngược lại vào data lớp
    class_data["buoiDaHoc"] = buoi_da_hoc
    class_data["buoibatthuong"] = buoi_bat_thuong
    
    # --- LOGIC TÌM BUỔI NGHỈ (CẢI TIẾN) ---
    # Chỉ chạy khi có lịch học (để biết thứ mấy phải học)
    # ==============================================================================
    # LOGIC TÌM BUỔI NGHỈ (SỬ DỤNG LOGIC: NOW > END_TIME + 30 PHÚT)
    # ==============================================================================
    
    if schedule_list:
        buoi_nghi = {}
        last_record_buoi_nghi = dict(class_data["buoiNghi"]);
       
        # 1. Chuẩn bị dữ liệu ngày đã học
        raw_dates = []
        for val in buoi_da_hoc.values():
            try:
                d_str = val[0] # Lấy "YYYY-MM-DD"
                raw_dates.append(datetime.strptime(d_str, "%Y-%m-%d"))
            except: pass
        
        sorted_dates = sorted(list(set(raw_dates))) # Danh sách ngày đã học (tăng dần)
        sched_weekdays = [s['weekday'] for s in schedule_list] # DS thứ phải học
        now = datetime.now()

        # 2. Lấy ngày bắt đầu (Nếu có trong DB)
        start_date_obj = None
        if "ngayBatDau" in class_data and class_data["ngayBatDau"]:
            try:
                start_date_obj = datetime.strptime(class_data["ngayBatDau"], "%Y-%m-%d")
            except: pass

        # ---------------------------------------------------------
        # HÀM CON: KIỂM TRA 1 NGÀY CÓ PHẢI LÀ NGHỈ KHÔNG?
        # Logic: Chỉ báo nghỉ nếu Hiện tại > (Giờ kết thúc ca học + 30 phút)
        # ---------------------------------------------------------
        def check_is_missing(check_date, reason_prefix):
            # 1. Nếu không trúng thứ học -> Bỏ qua
            if check_date.weekday() not in sched_weekdays:
                return False, ""
            
            # 2. Nếu là ngày tương lai -> Bỏ qua
            if check_date.date() > now.date():
                return False, ""

            # 3. Tìm giờ học cụ thể của thứ này
            todays_sched = next((s for s in schedule_list if s['weekday'] == check_date.weekday()), None)
            
            if todays_sched:
                # Tạo mốc thời gian kết thúc học của ngày đang xét
                # Ví dụ: check_date là 25/11, lịch học kết thúc 21:00
                sched_end_dt = datetime.combine(check_date.date(), todays_sched['end'])
                
                # Thêm 30 phút buffer (thời gian chờ)
                limit_time = sched_end_dt + timedelta(minutes=30)

                # SO SÁNH QUYẾT ĐỊNH:
                # Nếu Bây giờ (now) vẫn sớm hơn Limit -> Chưa được phép kết luận là nghỉ.
                if now < limit_time:
                    return False, ""

            return True, reason_prefix
        # ---------------------------------------------------------

        # --- GIAI ĐOẠN A: NẾU CHƯA CÓ DỮ LIỆU HỌC NÀO ---
        if not sorted_dates:
            if start_date_obj:
                curr = start_date_obj
                while curr.date() <= now.date():
                    if (curr.strftime("%Y-%m-%d") not in last_record_buoi_nghi):
                        is_miss, reason = check_is_missing(curr, "Chưa dạy (Toàn bộ)")
                        if is_miss:
                            buoi_nghi[curr.strftime("%Y-%m-%d")] = reason
                    curr += timedelta(days=1)
        
        # --- GIAI ĐOẠN B: ĐÃ CÓ DỮ LIỆU HỌC ---
        else:
            first_record = sorted_dates[0]
            last_record = sorted_dates[-1]

            # 1. Quét CHẶN ĐẦU (StartDate -> Buổi đầu tiên)
            # if start_date_obj and start_date_obj < first_record:
            #     curr = start_date_obj
            #     while curr < first_record:
            #         is_miss, reason = check_is_missing(curr, "Nghỉ/Chưa dạy (Đầu khóa)")
            #         if is_miss:
            #             buoi_nghi[curr.strftime("%Y-%m-%d")] = reason
            #         curr += timedelta(days=1)

            # 2. Quét Ở GIỮA (Khoảng trống giữa các buổi đã học)
            if len(sorted_dates) >= 2:
                for i in range(len(sorted_dates) - 1):
                    curr = sorted_dates[i] + timedelta(days=1)
                    
                    next_d = sorted_dates[i+1]
                    while curr < next_d:
                        # Vẫn dùng check_is_missing để đảm bảo tính nhất quán
                        if (curr.strftime("%Y-%m-%d") not in last_record_buoi_nghi):
                            is_miss, reason = check_is_missing(curr, "Nghỉ/Chưa dạy (Giữa khóa)")
                            if is_miss:
                                buoi_nghi[curr.strftime("%Y-%m-%d")] = reason
                        curr += timedelta(days=1)

            # 3. Quét CHẶN ĐUÔI (Buổi cuối cùng -> Hôm nay)
            curr = last_record + timedelta(days=1)
            while curr.date() <= now.date():
                if (curr.strftime("%Y-%m-%d") not in last_record_buoi_nghi):
                    is_miss, reason = check_is_missing(curr, "Nghỉ/Chưa dạy (Mới nhất)")
                    if is_miss:
                        buoi_nghi[curr.strftime("%Y-%m-%d")] = reason
                curr += timedelta(days=1)

        # Cập nhật vào data class
        last_record_buoi_nghi.update(buoi_nghi)
        class_data["buoiNghi"] = last_record_buoi_nghi
        class_data["Notifications"] = [x + y for x, y in zip(class_data["Notifications"], [buoi_vang_nghi_count, len(buoi_nghi), buoi_batthuong_count])]
    return class_data
# --- 3. HÀM MAIN KHỞI CHẠY ---

def main_process_attendance():
    print(f"🚀 Bắt đầu quét dữ liệu điểm danh (Limit: {GLOBAL_TARGET_DATE})...")
    
    try:
        # 1. Đọc Database
        if not os.path.exists(DB_FILE_PATH):
            print("❌ Không tìm thấy file database.json")
            return

        with open(DB_FILE_PATH, 'r', encoding='utf-8') as f:
            db = json.load(f)

        # 2. Duyệt từng giáo viên -> từng lớp
        for teacher_name, teacher_data in db.items():
            print(f"👤 Đang xử lý giáo viên: {teacher_name}")
            classes = teacher_data.get("Class", {})
            
            for class_name, class_info in classes.items():
                is_active = class_info.get("isActive")
                conv_id = class_info.get("TeamsConversationID")
                
                if is_active and conv_id:
                    print(f"   📚 Đang xử lý lớp: {class_name}")
                    # Gọi hàm xử lý logic cho lớp này
                    updated_class_info = process_class_messages(class_name, class_info)
                    # Cập nhật lại vào DB trong bộ nhớ
                    classes[class_name] = updated_class_info
                else:
                    print(f"   ⏩ Bỏ qua lớp: {class_name} (Không Active hoặc thiếu ID)")

        # 3. Lưu Database mới
        with open(DB_FILE_PATH, 'w', encoding='utf-8') as f:
            json.dump(db, f, ensure_ascii=False, indent=2)
            
        print("✅ Hoàn tất cập nhật database.json")

    except Exception as e:
        print(f"❌ Lỗi trong quá trình xử lý chính: {e}")



def main():
    if not load_token():
        get_and_save_token()
    else:
        print(SKYPE_TOKEN)
        if not check_token_life(SKYPE_TOKEN):
            load_token()
    main_process_attendance()

