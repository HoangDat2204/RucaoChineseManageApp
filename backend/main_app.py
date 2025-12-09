# --- FILE: backend/main_app.py ---

import sys
import os
import threading
import webview
from flask_server import app
from calendar_scanner.calendar_scanner import main as scan_calendar_main
from teams_api.Team_fetch import main as token_generate
import json

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
basedir = os.path.abspath(os.path.dirname(__file__))
webview.settings['ALLOW_DOWNLOADS'] = True
DATA_BASE_PATH = os.path.join(basedir, '..', 'database', 'database.json')


window = None
class State:
    def __init__(self):
        self.is_saved = False

state = State()

def save_and_close(window):
    # Hàm này chạy ở luồng riêng, nên không làm treo UI
    try:
        # Lúc này UI thread đang rảnh, gọi JS vô tư
        data = window.evaluate_js('exportDataForSave()')
        data_to_save = json.loads(data)
        # Lưu dữ liệu
        with open(DATA_BASE_PATH, 'w', encoding='utf-8') as f:
            json.dump(
                data_to_save, 
                f, 
                ensure_ascii=False,  # <--- QUAN TRỌNG: Giữ nguyên tiếng Việt
                indent=4             # <--- Xuống dòng đẹp mắt
            )
        print("Đã lưu dữ liệu xong!")
        
        # Đánh dấu là đã lưu
        state.is_saved = True
        
        # Tự động đóng cửa sổ bằng code
        window.destroy()
        
    except Exception as e:
        print(f"Lỗi: {e}")
        # Nếu lỗi quá thì cũng force đóng luôn
        state.is_saved = True
        window.destroy()


def on_closing():
    # Nếu đã lưu rồi thì cho phép đóng luôn
    if state.is_saved:
        return True

    print("Người dùng bấm X. Hủy đóng tạm thời để lấy dữ liệu...")
    
    t = threading.Thread(target=save_and_close, args=(window,))
    t.start()

    return False


# --- CÁC HÀM ĐIỀU PHỐI ---
def run_flask():
    app.run(host='127.0.0.1', port=5000, debug=False) # Tắt debug của Flask để log gọn hơn




# --- ĐIỂM KHỞI ĐỘNG CHÍNH ---
if __name__ == '__main__':
    print("--- KHỞI ĐỘNG ỨNG DỤNG ---")
    flask_thread = threading.Thread(target=run_flask)
    flask_thread.daemon = True
    flask_thread.start()
    
    scan_calendar_main()
    token_generate()
    
    
    window = webview.create_window('RucaoChinese Dashboard', 'http://127.0.0.1:5000/', resizable= True ,width=1200, height=800)
    window.events.closing += on_closing

    webview.start(debug=True)
    print("--- ỨNG DỤNG ĐÃ ĐÓNG ---")