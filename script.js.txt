// script.js
document.addEventListener('DOMContentLoaded', function() {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const previewSection = document.getElementById('previewSection');
    const actionSection = document.getElementById('actionSection');
    const originalImage = document.getElementById('originalImage');

    // کلیک روی باکس آپلود
    dropZone.addEventListener('click', function() {
        fileInput.click();
    });

    // کشیدن و رها کردن
    dropZone.addEventListener('dragover', function(e) {
        e.preventDefault();
        this.style.borderColor = '#667eea';
        this.style.background = '#f7fafc';
    });

    dropZone.addEventListener('dragleave', function(e) {
        e.preventDefault();
        this.style.borderColor = '#cbd5e0';
        this.style.background = 'transparent';
    });

    dropZone.addEventListener('drop', function(e) {
        e.preventDefault();
        this.style.borderColor = '#cbd5e0';
        this.style.background = 'transparent';
        
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

    // مدیریت فایل انتخاب شده
    function handleFile(file) {
        if (!file.type.startsWith('image/')) {
            alert('لطفاً یک تصویر انتخاب کنید!');
            return;
        }

        const reader = new FileReader();
        reader.onload = function(e) {
            originalImage.src = e.target.result;
            previewSection.style.display = 'block';
            actionSection.style.display = 'block';
            
            // اسکرول به بخش پیش‌نمایش
            previewSection.scrollIntoView({ behavior: 'smooth' });
        };
        reader.readAsDataURL(file);
    }
});

// تابع تشخیص (از PyScript فراخوانی میشه)
function runDetection() {
    // این تابع توسط PyScript اجرا میشه
    const btn = document.getElementById('detectBtn');
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> در حال تشخیص...';
    btn.disabled = true;
    
    // PyScript رو صدا می‌زنیم
    if (typeof pyodide !== 'undefined') {
        pyodide.runPython('run_detection()');
    }
    
    setTimeout(() => {
        btn.innerHTML = '<i class="fas fa-microscope"></i> شروع تشخیص';
        btn.disabled = false;
    }, 3000);
}