# تشغيل CyberGuard على Windows: انسخي والصقي مرة واحدة

هذه الطريقة مصممة لتجاوز خطأ VS Code مثل `git.showOutput not found`، **ولا تحتاج Git Clone أو تثبيت Git**.

## قبل التشغيل
- ثبتي Python 3.11+ وتأكدي من توفر `py` أو `python` في PowerShell.
- افتحي Visual Studio Code، ثم **Terminal → New Terminal**. من السهم بجانب علامة + اختاري **PowerShell** إن كانت الطرفية مختلفة.
- يجب أن يكون الإنترنت متاحًا للمرة الأولى لتنزيل ملفات المستودع وتبعيات Python.
- اقرئي الكود قبل تنفيذه؛ يقوم بالتحميل من مستودع `oull1i/CyberGuard` وتثبيت تبعياته، ولا يتصل بالروابط المراد فحصها.

## الصقي الكود التالي كاملًا في PowerShell

```powershell
$ErrorActionPreference = 'Stop'
$folder = Join-Path $HOME ('CyberGuard-' + (Get-Date -Format 'yyyyMMdd-HHmmss-fff'))
New-Item -ItemType Directory -Path $folder | Out-Null
$zip = Join-Path $folder 'CyberGuard.zip'

Invoke-WebRequest -Uri 'https://github.com/oull1i/CyberGuard/archive/refs/heads/main.zip' -OutFile $zip
Expand-Archive -LiteralPath $zip -DestinationPath $folder
Set-Location (Join-Path $folder 'CyberGuard-main')

if (Get-Command py -ErrorAction SilentlyContinue) {
    & py -3 scripts\vscode_setup.py
} elseif (Get-Command python -ErrorAction SilentlyContinue) {
    & python scripts\vscode_setup.py
} else {
    throw 'Install Python 3.11+ first, then restart VS Code.'
}
if ($LASTEXITCODE -ne 0) { throw 'Setup failed. See the message above.' }

Write-Host 'CyberGuard is starting. Open http://127.0.0.1:5000' -ForegroundColor Green
& .\.venv\Scripts\python.exe app.py
```

## النتيجة المتوقعة
- يتم إنشاء مجلد جديد باسم يشبه `CyberGuard-20261024-194500-123` داخل مجلد المستخدم في Windows.
- يتم فك ZIP داخله وتشغيل `scripts/vscode_setup.py`.
- يقوم Python بإعداد بيئة محلية `.venv` وتثبيت المكتبات اللازمة.
- يعمل Flask على **http://127.0.0.1:5000** محليًا فقط.
- أوقفي الخادم بـ `Ctrl+C`، ولا تغلقي الطرفية إذا كنتِ تريدين استمرار عمل الواجهة.
- لفتح نسخة المشروع نفسها داخل VS Code، استخدمي **File → Open Folder** واختاري مجلد `CyberGuard-main` الذي تم إنشاؤه.

## إذا ظهر خطأ
| الرسالة | الحل |
| --- | --- |
| `py` أو `python` غير معروف | ثبتي Python 3.11+، وتأكدي من تفعيل تشغيله عبر PATH، ثم أعيدي فتح VS Code. |
| تعذر تنزيل ZIP | تأكدي من اتصال الإنترنت وإمكانية فتح https://github.com/oull1i/CyberGuard في المتصفح. |
| فشل `pip install` | راجعي نص الخطأ؛ قد يكون اتصال الشبكة أو نسخة Python غير مدعومة لإحدى الحزم. |
| `Address already in use` | هناك برنامج يستخدم المنفذ 5000؛ أوقفيه، أو عدّلي `PORT` عند التشغيل. |
| المتصفح لا يفتح الصفحة | تأكدي من استمرار تشغيل Flask وأن الطرفية تعرض العنوان الصحيح. |

> **ملاحظة:** الاختبارات الآلية على GitHub لا تغني عن اختبار التشغيل على جهازك، لأن تثبيت Python وإعدادات Windows تختلف من جهاز إلى آخر. انخفاض درجة الخطر في CyberGuard لا يضمن أمان الرابط.
