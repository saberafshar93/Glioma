# app.py
from flask import Flask, request, jsonify, render_template
from ultralytics import YOLO
import cv2
import numpy as np
import base64
import os
import time
from PIL import Image
import io
import warnings
warnings.filterwarnings('ignore')

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # محدودیت 16MB

# ========== بارگذاری مدل ==========
def load_model():
    """بارگذاری مدل با مدیریت خطا"""
    try:
        # اول مدل آموزش‌دیده رو چک کن
        model_path = "models/best.pt"
        if os.path.exists(model_path):
            print(f"✅ مدل از {model_path} بارگذاری شد")
            return YOLO(model_path)
        else:
            # اگر نبود، از مدل پایه استفاده کن
            print("⚠️ مدل آموزش‌دیده پیدا نشد، از مدل پایه استفاده می‌شود")
            return YOLO("yolov8n-seg.pt")
    except Exception as e:
        print(f"❌ خطا در بارگذاری مدل: {e}")
        return None

model = load_model()

# ========== تابع تشخیص ==========
def detect_tumor(image_bytes):
    """تشخیص تومور با مدیریت کامل خطا"""
    try:
        # تبدیل bytes به تصویر
        image = Image.open(io.BytesIO(image_bytes))
        image_np = np.array(image)
        
        # اگر تصویر رنگی نیست، به RGB تبدیل کن
        if len(image_np.shape) == 2:
            image_np = cv2.cvtColor(image_np, cv2.COLOR_GRAY2RGB)
        elif image_np.shape[2] == 4:
            image_np = cv2.cvtColor(image_np, cv2.COLOR_RGBA2RGB)
        
        # اجرای تشخیص
        results = model.predict(source=image_np, conf=0.25, iou=0.45)
        
        # پردازش نتایج
        detections = []
        output_image = None
        
        for r in results:
            if r.boxes is not None:
                for box in r.boxes:
                    x1, y1, x2, y2 = box.xyxy[0].tolist()
                    conf = float(box.conf[0])
                    cls = int(box.cls[0])
                    
                    # نام کلاس‌ها
                    class_names = ['Glioma', 'Meningioma_Tumor', 'No_Tumor', 'Pituitary_Tumor']
                    class_name = class_names[cls] if cls < len(class_names) else f"Class_{cls}"
                    
                    detections.append({
                        'class': class_name,
                        'confidence': round(conf * 100, 2),
                        'bbox': [int(x1), int(y1), int(x2), int(y2)]
                    })
            
            # ایجاد تصویر خروجی
            if r.plot():
                output_img = r.plot()
                _, img_encoded = cv2.imencode('.jpg', output_img, [cv2.IMWRITE_JPEG_QUALITY, 95])
                output_image = base64.b64encode(img_encoded).decode('utf-8')
        
        return {
            'success': True,
            'detections': detections,
            'total_detections': len(detections),
            'output_image': output_image,
            'message': f"{len(detections)} مورد تشخیص داده شد" if detections else "هیچ توموری تشخیص داده نشد"
        }
        
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }

# ========== مسیرهای Flask ==========

@app.route('/')
def index():
    """صفحه اصلی"""
    return render_template('index.html')

@app.route('/detect', methods=['POST'])
def detect():
    """دریافت تصویر و تشخیص"""
    try:
        if 'image' not in request.files:
            return jsonify({'success': False, 'error': 'تصویر ارسال نشده است'}), 400
        
        file = request.files['image']
        if file.filename == '':
            return jsonify({'success': False, 'error': 'فایل خالی است'}), 400
        
        # اعتبارسنجی نوع فایل
        allowed_extensions = {'jpg', 'jpeg', 'png', 'bmp', 'tiff'}
        if '.' not in file.filename or file.filename.rsplit('.', 1)[1].lower() not in allowed_extensions:
            return jsonify({'success': False, 'error': 'فرمت فایل پشتیبانی نمی‌شود'}), 400
        
        # خواندن تصویر
        image_bytes = file.read()
        
        # تشخیص
        result = detect_tumor(image_bytes)
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/health')
def health():
    """چک کردن وضعیت سلامت سرور"""
    return jsonify({
        'status': 'healthy',
        'model_loaded': model is not None,
        'timestamp': time.time()
    })

# ========== اجرا ==========
if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)