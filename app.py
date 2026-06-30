# app.py
from flask import Flask, request, jsonify, render_template
from ultralytics import YOLO
import cv2
import os
import base64
from PIL import Image
import io
import numpy as np
import tempfile
import warnings
warnings.filterwarnings('ignore')

app = Flask(__name__)

# ========== قسمت ۱: آماده‌سازی داده (همون کد کولاب) ==========
def setup_data():
    """این همون بخش اول کد کولاب هست که داده رو آماده میکنه"""
    # ایجاد فایل data.yaml
    data_yaml = """
train: /content/data/G03/train/images
val: /content/data/G03/valid/images
test: /content/data/G03/test/images

nc: 4
names: ['Glioma', 'Meningioma_Tumor', 'No_Tumor', 'Pituitary_Tumor']
"""
    
    os.makedirs('data', exist_ok=True)
    with open("data/data.yaml", "w") as f:
        f.write(data_yaml)
    
    # چک کردن وجود داده (اگر در کولاب بود)
    if not os.path.exists("/content/data/G03"):
        print("⚠️ داده‌های آموزشی پیدا نشد! از مدل آموزش‌دیده استفاده می‌کنیم.")
        return False
    return True

# ========== قسمت ۲: آموزش مدل (اختیاری - اگر نیاز باشه) ==========
def train_model():
    """این همون بخش آموزش کولاب هست (اختیاری)"""
    try:
        if os.path.exists("/content/data/G03"):
            from ultralytics import YOLO
            model = YOLO("yolov8n-seg.pt")
            model.train(data="/content/data/G03/data.yaml", epochs=1, imgsz=640)
            return True
    except Exception as e:
        print(f"⚠️ خطا در آموزش: {e}")
        return False

# ========== قسمت ۳: بارگذاری مدل ==========
def load_model():
    """بارگذاری مدل آموزش‌دیده"""
    model_path = "models/best.pt"
    
    # اگر مدل وجود نداره، از مدل پیش‌فرض استفاده کن
    if not os.path.exists(model_path):
        print("⚠️ مدل پیدا نشد! از مدل پیش‌فرض استفاده می‌کنیم.")
        from ultralytics import YOLO
        return YOLO("yolov8n-seg.pt")
    
    return YOLO(model_path)

# بارگذاری مدل یک بار
model = load_model()

# ========== قسمت ۴: تابع تشخیص (همون کد کولاب) ==========
def detect_tumor(image_bytes):
    """این همون بخش تشخیص کد کولاب هست"""
    try:
        # تبدیل bytes به تصویر
        image = Image.open(io.BytesIO(image_bytes))
        
        # تبدیل به numpy array برای OpenCV
        image_np = np.array(image)
        
        # اجرای تشخیص (همون کد کولاب)
        results = model.predict(source=image_np, save=False)
        
        # پردازش نتایج
        result_data = {
            'detections': [],
            'output_image': None
        }
        
        for r in results:
            # استخراج جعبه‌ها
            boxes = r.boxes
            if boxes is not None:
                for box in boxes:
                    # مختصات
                    x1, y1, x2, y2 = box.xyxy[0].tolist()
                    conf = float(box.conf[0])
                    cls = int(box.cls[0])
                    
                    # نام کلاس (با توجه به data.yaml)
                    class_names = ['Glioma', 'Meningioma_Tumor', 'No_Tumor', 'Pituitary_Tumor']
                    class_name = class_names[cls] if cls < len(class_names) else f"Class_{cls}"
                    
                    result_data['detections'].append({
                        'class': class_name,
                        'confidence': conf,
                        'bbox': [int(x1), int(y1), int(x2), int(y2)]
                    })
            
            # گرفتن تصویر خروجی (با bounding boxes)
            output_img = r.plot()
            
            # تبدیل به base64 برای نمایش در وب
            _, img_encoded = cv2.imencode('.jpg', output_img)
            img_base64 = base64.b64encode(img_encoded).decode('utf-8')
            result_data['output_image'] = f"data:image/jpeg;base64,{img_base64}"
        
        return result_data
        
    except Exception as e:
        print(f"❌ خطا در تشخیص: {e}")
        return {'error': str(e)}

# ========== قسمت ۵: مسیرهای Flask ==========

@app.route('/')
def index():
    """صفحه اصلی"""
    return render_template('index.html')

@app.route('/detect', methods=['POST'])
def detect():
    """دریافت تصویر و تشخیص تومور"""
    try:
        # دریافت تصویر از درخواست
        if 'image' not in request.files:
            return jsonify({'error': 'تصویری ارسال نشده است'}), 400
        
        file = request.files['image']
        if file.filename == '':
            return jsonify({'error': 'فایل خالی است'}), 400
        
        # خواندن تصویر
        image_bytes = file.read()
        
        # تشخیص
        result = detect_tumor(image_bytes)
        
        if 'error' in result:
            return jsonify({'error': result['error']}), 500
        
        return jsonify(result)
        
    except Exception as e:
        print(f"❌ خطا: {e}")
        return jsonify({'error': str(e)}), 500

# ========== قسمت ۶: اجرا ==========
if __name__ == '__main__':
    # آماده‌سازی داده
    setup_data()
    
    # اجرای سرور
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)