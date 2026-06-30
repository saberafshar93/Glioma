// static/script.js

let currentImageData = null;
let resultData = null;
let resultImageData = null;

document.addEventListener('DOMContentLoaded', function() {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    
    // کلیک روی باکس آپلود
    dropZone.addEventListener('click', function(e) {
        if (e.target === this || e.target.closest('.upload-area')) {
            fileInput.click();
        }
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
    
    // محدودیت حجم (16MB)
    if (file.size > 16 * 1024 * 1024) {
        showError('حجم تصویر نباید بیشتر از 16MB باشد!');
        return;
    }
    
    // ذخیره داده
    currentImageData = file;
    
    // نمایش اطلاعات فایل
    const fileInfo = document.getElementById('fileInfo');
    fileInfo.innerHTML = `
        <i class="fas fa-check-circle"></i>
        ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)
    `;
    
    // نمایش پیش‌نمایش
    const reader = new FileReader();
    reader.onload = function(e) {
        document.getElementById('originalImage').src = e.target.result;
        document.getElementById('previewSection').style.display = 'block';
        document.getElementById('resultSection').style.display = 'none';
        document.getElementById('loadingSection').style.display = 'none';
        
        // اطلاعات تصویر
        const img = new Image();
        img.onload = function() {
            document.getElementById('imageInfoText').textContent = 
                `${img.width} × ${img.height} پیکسل`;
        };
        img.src = e.target.result;
        
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
        
        if (!result.success) {
            showError(result.error || 'خطا در تشخیص');
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
    
    // زمان
    document.getElementById('resultTime').textContent = 
        new Date().toLocaleTimeString('fa-IR');
    
    // نمایش تصویر خروجی
    if (result.output_image) {
        resultImageData = result.output_image;
        document.getElementById('resultImage').src = 
            `data:image/jpeg;base64,${result.output_image}`;
    }
    
    // نمایش جزئیات
    const listDiv = document.getElementById('detectionsList');
    listDiv.innerHTML = '';
    
    if (result.detections && result.detections.length > 0) {
        result.detections.forEach(detection => {
            const item = document.createElement('div');
            item.className = 'detection-item';
            
            const confidenceClass = detection.confidence > 80 ? '' : 
                                  (detection.confidence > 50 ? 'medium' : 'low');
            
            item.innerHTML = `
                <div class="class-name">${detection.class}</div>
                <div class="confidence ${confidenceClass}">
                    دقت: ${detection.confidence}%
                </div>
                <div class="bbox-info">
                    موقعیت: [${detection.bbox[0]}, ${detection.bbox[1]}, 
                    ${detection.bbox[2]}, ${detection.bbox[3]}]
                </div>
            `;
            
            listDiv.appendChild(item);
        });
    } else {
        listDiv.innerHTML = `
            <div class="no-detection">
                <i class="fas fa-check-circle"></i>
                <h4>هیچ توموری تشخیص داده نشد</h4>
                <p>تصویر سالم است</p>
            </div>
        `;
    }
    
    // نمایش بخش نتیجه
    document.getElementById('resultSection').style.display = 'block';
    document.getElementById('resultSection').scrollIntoView({ behavior: 'smooth' });
}

// دانلود نتیجه
function downloadResult() {
    if (!resultImageData) {
        showError('نتیجه‌ای برای دانلود وجود ندارد!');
        return;
    }
    
    const link = document.createElement('a');
    link.download = `result_${Date.now()}.jpg`;
    link.href = `data:image/jpeg;base64,${resultImageData}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// ریست کردن
function resetAll() {
    document.getElementById('previewSection').style.display = 'none';
    document.getElementById('resultSection').style.display = 'none';
    document.getElementById('loadingSection').style.display = 'none';
    document.getElementById('fileInput').value = '';
    document.getElementById('fileInfo').innerHTML = '';
    currentImageData = null;
    resultData = null;
    resultImageData = null;
    
    // اسکرول به بالا
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// نمایش خطا
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.innerHTML = `
        <i class="fas fa-exclamation-circle"></i>
        <span>${message}</span>
    `;
    errorDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #fc8181;
        color: white;
        padding: 15px 25px;
        border-radius: 10px;
        box-shadow: 0 5px 15px rgba(252, 129, 129, 0.4);
        z-index: 9999;
        animation: slideDown 0.3s ease;
        max-width: 400px;
        display: flex;
        align-items: center;
        gap: 10px;
    `;
    
    document.body.appendChild(errorDiv);
    
    setTimeout(() => {
        errorDiv.style.opacity = '0';
        errorDiv.style.transition = 'opacity 0.3s ease';
        setTimeout(() => errorDiv.remove(), 300);
    }, 5000);
}