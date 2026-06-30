// static/script.js

let currentImageData = null;
let resultData = null;

document.addEventListener('DOMContentLoaded', function() {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    
    // کلیک روی باکس آپلود
    dropZone.addEventListener('click', function() {
        fileInput.click();
    });
    
    // کشیدن و رها کردن
    dropZone.addEventListener('dragover', function(e) {
        e.preventDefault();
        this.classList.add('dragover');
    });
    
    dropZone.addEventListener('dragleave', function(e) {
        e.preventDefault();
        this.classList.remove('dragover');
    });
    
    dropZone.addEventListener('drop', function(e) {
        e.preventDefault();
        this.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFile(files[0]);
        }
    });
    
    // انتخاب فایل
    fileInput.addEventListener('change', function() {
        if (this.files.length > 0) {
            handleFile(this.files[0]);
        }
    });
});

// مدیریت فایل انتخاب شده
function handleFile(file) {
    // اعتبارسنجی
    if (!file.type.startsWith('image/')) {
        showError('لطفاً یک تصویر معتبر انتخاب کنید!');
        return;
    }
    
    // محدودیت حجم (10MB)
    if (file.size > 10 * 1024 * 1024) {
        showError('حجم تصویر نباید بیشتر از 10MB باشد!');
        return;
    }
    
    // ذخیره داده
    currentImageData = file;
    
    // نمایش پیش‌نمایش
    const reader = new FileReader();
    reader.onload = function(e) {
        document.getElementById('originalImage').src = e.target.result;
        document.getElementById('previewSection').style.display = 'block';
        document.getElementById('resultSection').style.display = 'none';
        
        // اسکرول به بخش پیش‌نمایش
        document.getElementById('previewSection').scrollIntoView({ behavior: 'smooth' });
    };
    reader.readAsDataURL(file);
}

// تشخیص تومور
async function detectTumor() {
    if (!currentImageData) {
        showError('لطفاً ابتدا یک تصویر انتخاب کنید!');
        return;
    }
    
    // غیرفعال کردن دکمه
    const btn = document.getElementById('detectBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> در حال تشخیص...';
    
    // نمایش بارگذاری
    document.getElementById('loadingSection').style.display = 'block';
    document.getElementById('resultSection').style.display = 'none';
    
    try {
        // ارسال به سرور
        const formData = new FormData();
        formData.append('image', currentImageData);
        
        const response = await fetch('/detect', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.error) {
            showError(result.error);
            return;
        }
        
        // نمایش نتیجه
        displayResult(result);
        
    } catch (error) {
        showError('خطا در ارتباط با سرور: ' + error.message);
    } finally {
        // فعال کردن دکمه
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-microscope"></i> شروع تشخیص';
        document.getElementById('loadingSection').style.display = 'none';
    }
}

// نمایش نتیجه
function displayResult(result) {
    resultData = result;
    
    // نمایش تصویر خروجی
    if (result.output_image) {
        document.getElementById('resultImage').src = result.output_image;
    }
    
    // نمایش جزئیات
    const detailsDiv = document.getElementById('resultDetails');
    detailsDiv.innerHTML = '';
    
    if (result.detections && result.detections.length > 0) {
        result.detections.forEach(detection => {
            const item = document.createElement('div');
            item.className = 'detection-item';
            
            const confidenceClass = detection.confidence > 0.8 ? '' : (detection.confidence > 0.5 ? 'medium' : 'low');
            
            item.innerHTML = `
                <div class="class-name">${detection.class}</div>
                <div class="confidence ${confidenceClass}">
                    دقت: ${(detection.confidence * 100).toFixed(1)}%
                </div>
                <div style="font-size:0.8em;color:#718096;margin-top:5px;">
                    موقعیت: [${detection.bbox[0]}, ${detection.bbox[1]}, ${detection.bbox[2]}, ${detection.bbox[3]}]
                </div>
            `;
            
            detailsDiv.appendChild(item);
        });
    } else {
        detailsDiv.innerHTML = `
            <div class="detection-item" style="border-right-color:#fc8181;">
                <div class="class-name">هیچ توموری تشخیص داده نشد</div>
                <div style="color:#718096;margin-top:5px;">تصویر سالم است</div>
            </div>
        `;
    }
    
    // نمایش بخش نتیجه
    document.getElementById('resultSection').style.display = 'block';
    document.getElementById('resultSection').scrollIntoView({ behavior: 'smooth' });
}

// دانلود نتیجه
function downloadResult() {
    if (!resultData || !resultData.output_image) {
        showError('نتیجه‌ای برای دانلود وجود ندارد!');
        return;
    }
    
    // دانلود تصویر
    const link = document.createElement('a');
    link.download = `result_${Date.now()}.jpg`;
    link.href = resultData.output_image;
    link.click();
}

// ریست کردن
function resetAll() {
    document.getElementById('previewSection').style.display = 'none';
    document.getElementById('resultSection').style.display = 'none';
    document.getElementById('loadingSection').style.display = 'none';
    document.getElementById('fileInput').value = '';
    currentImageData = null;
    resultData = null;
    
    // اسکرول به بالا
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// نمایش خطا
function showError(message) {
    alert('❌ ' + message);
}

// تابع کمکی برای نمایش نتیجه (از PyScript استفاده نمیشه دیگه)
function runDetection() {
    detectTumor();
}