# --- FILE: backend/main_app.py ---

import sys
import os
import threading
import time
import webview
from flask_server import app
from calendar_scanner.calendar_scanner import main as scan_calendar_main
from teams_api.Team_fetch import main as token_generate
import json

# --- CẤU HÌNH ĐƯỜNG DẪN ---
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
basedir = os.path.abspath(os.path.dirname(__file__))
webview.settings['ALLOW_DOWNLOADS'] = True
DATA_BASE_PATH = os.path.join(basedir, '..', 'database', 'database.json')
LOADING_HTML_PATH = os.path.join(basedir, 'loading.html') # Đường dẫn tới file HTML mới tạo

window = None # Biến global lưu cửa sổ webview

class State:
    def __init__(self):
        self.is_saved = False

state = State()

# --- LỚP API XỬ LÝ LOADING ---
class LoadingApi:
    def __init__(self):
        self._window = None

    def set_window(self, window):
        self._window = window

    def start_loading(self):
        # Bắt đầu thread xử lý nặng để không đơ UI loading
        threading.Thread(target=self._run_background_tasks).start()

    def _run_background_tasks(self):
        # Bước 1: Quét lịch
        self._window.evaluate_js('setProgress(60, "Đang đồng bộ dữ liệu lịch...")')
        try:
            scan_calendar_main() 
        except Exception as e:
            print(f"Lỗi scan calendar: {e}")
        
        # Bước 2: Tạo Token
        self._window.evaluate_js('setProgress(80, "Đang xác thực tài khoản Teams...")')
        try:
            token_generate()
        except Exception as e:
            print(f"Lỗi generate token: {e}")

        # Bước 3: Đợi Flask (optional, đảm bảo flask đã lên)
        self._window.evaluate_js('setProgress(95, "Đang kết nối máy chủ...")')
        time.sleep(1) 

        # Bước 4: Hoàn tất -> Chuyển trang
        self._window.evaluate_js('setProgress(100, "Hoàn tất! Đang vào ứng dụng...")')
        time.sleep(0.5) # Dừng xíu cho đẹp
        
        # Chuyển hướng webview sang trang Flask chính
        self._window.load_url('http://127.0.0.1:5000/')


# --- CÁC HÀM XỬ LÝ ĐÓNG ỨNG DỤNG (GIỮ NGUYÊN) ---
def save_and_close(window_obj):
    try:
        # Kiểm tra xem đang ở trang Flask hay trang Loading
        # Nếu đang loading mà đóng thì không có hàm exportDataForSave để gọi -> lỗi
        current_url = window_obj.get_current_url()
        if '127.0.0.1:5000' not in current_url:
            print("Đóng khi đang loading, bỏ qua lưu dữ liệu.")
            state.is_saved = True
            window_obj.destroy()
            return

        data = window_obj.evaluate_js('exportDataForSave()')
        if data:
            data_to_save = json.loads(data)
            with open(DATA_BASE_PATH, 'w', encoding='utf-8') as f:
                json.dump(data_to_save, f, ensure_ascii=False, indent=4)
            print("Đã lưu dữ liệu xong!")
        
        state.is_saved = True
        window_obj.destroy()
        
    except Exception as e:
        print(f"Lỗi khi lưu và đóng: {e}")
        state.is_saved = True
        window_obj.destroy()

def on_closing():
    if state.is_saved:
        return True

    print("Người dùng bấm X. Hủy đóng tạm thời để lấy dữ liệu...")
    t = threading.Thread(target=save_and_close, args=(window,))
    t.start()
    return False

# --- HÀM KHỞI ĐỘNG FLASK ---
def run_flask():
    # Tắt banner để console gọn hơn
    import logging
    log = logging.getLogger('werkzeug')
    log.setLevel(logging.ERROR)
    app.run(host='127.0.0.1', port=5000, debug=False)

# --- ĐIỂM KHỞI ĐỘNG CHÍNH ---
if __name__ == '__main__':
    print("--- KHỞI ĐỘNG ỨNG DỤNG ---")
    
    # 1. Chạy Flask ở Background
    flask_thread = threading.Thread(target=run_flask)
    flask_thread.daemon = True
    flask_thread.start()
    
    # 2. Khởi tạo API Loading
    api = LoadingApi()
    
    # 3. Tạo cửa sổ trỏ đến file HTML Loading cục bộ
    # Lưu ý: 'file://' + LOADING_HTML_PATH để đảm bảo webview load đúng file
    loading_url = f'file://{LOADING_HTML_PATH}'
    
    window = webview.create_window(
        'RucaoChinese Dashboard', 
        url=loading_url,        # Load file html loading trước
        js_api=api,             # Gắn API vào để HTML gọi được Python
        resizable=True, 
        width=1200, 
        height=800
    )
    
    # Gán window vào API để API có thể điều khiển (gọi JS, chuyển trang)
    api.set_window(window)
    
    window.events.closing += on_closing

    # 4. Start App
    webview.start(debug=True)
    print("--- ỨNG DỤNG ĐÃ ĐÓNG ---")