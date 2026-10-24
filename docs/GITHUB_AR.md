# نشر CyberGuard Pro على GitHub — دليل شامل

> **حالة النشر:** تجهيز الملفات لا يعني نشرها تلقائيًا. حتى يظهر المشروع في GitHub، يجب إنشاء مستودع على حسابك أولًا ثم دفع الملفات إليه. لا ترفعي الملف المضغوط ZIP نفسه؛ ارفعي **محتوياته** بعد فك الضغط.

## قبل النشر (دقيقتان)

1. راجعي ملفات المشروع وتأكدي من ملكيتك لحقوق الكود والأصول، ومن موافقتك على ترخيص MIT المرفق.
2. تأكدي أنه لا توجد كلمات مرور أو مفاتيح API أو بيانات شخصية. ملف `.env` محظور عبر `.gitignore`، لكن لا تضعي أسرارًا في الملفات الأخرى.
3. لا تعدّلي النتائج لتدّعي Accuracy أو AI confidence؛ المحرك المباشر قائم على قواعد تفسيرية، لا نموذج مدرّب.

## الخطوة 1: إنشاء المستودع

1. سجّلي الدخول إلى حساب GitHub: **`btsa123987-alt`** (أو حسابك الذي ستنشرين فيه).
2. افتحي [إنشاء مستودع جديد](https://github.com/new?name=CyberGuard&description=Explainable%20QR%20%26%20URL%20security%20risk%20analyzer%20%7C%20Flask%20%7C%20Arabic%20%26%20English).
3. اكتبي اسم المستودع: **`CyberGuard`**.
4. ضعي هذا الوصف (Description):

   `Explainable QR & URL security risk analyzer | Flask | Arabic & English | Docker | CI`

5. اختاري **Public** فقط إذا أردتِ عرضه ضمن ملف الأعمال. اختاري **Private** إذا كنتِ تفضلين مراجعته أولًا.
6. **لا تفعّلي** إنشاء README أو `.gitignore` أو License من GitHub؛ الملفات موجودة ضمن المشروع.
7. اضغطي **Create repository**.

رابط المستودع المتوقع **بعد إنشائه**: `https://github.com/btsa123987-alt/CyberGuard` (ليس رابطًا مؤكدًا قبل الإنشاء).

## الخطوة 2: رفع الملفات — الأسهل من المتصفح

1. فكّي ضغط الملف النهائي على جهازك.
2. افتحي **مجلد المشروع الذي يحتوي `app.py` و`README.md` و`.github`**.
3. في المستودع الفارغ اضغطي **uploading an existing file** (أو **Add file → Upload files** إن ظهرت).
4. اسحبي الملفات والمجلدات الموجودة **داخل** المجلد، وليس ملف ZIP ولا المجلد الخارجي نفسه. تأكدي من رفع الملفات التي تبدأ بنقطة مثل `.github`, `.gitignore`, `.env.example`؛ إن لم تظهر، استخدمي طريقة Git أدناه.
5. اكتبي رسالة الحفظ: `Initial release: CyberGuard Pro v2.0` واضغطي **Commit changes**.

**أفضل طريقة للتحديثات اللاحقة هي Git، لأنها تحفظ التغييرات وتتعامل جيدًا مع المجلدات المخفية.**

## بديل احترافي: الرفع باستخدام Git عبر PowerShell (Windows)

ثبّتي Git من [git-scm.com](https://git-scm.com/) إن لم يكن موجودًا، وافتحي PowerShell **داخل المجلد الذي يحتوي `app.py`**، ثم:

```powershell
git init
git add .
git commit -m "Initial release: CyberGuard Pro v2.0"
git branch -M main
git remote add origin https://github.com/btsa123987-alt/CyberGuard.git
git push -u origin main
```

إذا طلب Git تحديد هويتك عند أول commit:

```powershell
git config --global user.name "YOUR_DISPLAY_NAME"
git config --global user.email "YOUR_VERIFIED_GITHUB_EMAIL"
```

استبدلي القيم ببيانات GitHub الفعلية. استخدمي تسجيل الدخول المعتمد في Git Credential Manager أو GitHub CLI، ولا تضعي كلمة المرور أو Access Token داخل الأوامر أو الملفات.

كما توجد أداة مساعدة في المشروع: `scripts/publish_github.ps1`؛ شغليها **بعد إنشاء المستودع الفارغ** بهذا الأمر من جذر المشروع:

```powershell
powershell -NoProfile -File .\scripts\publish_github.ps1 -Username btsa123987-alt -RepoName CyberGuard
```

ستتحقق من الملفات واسم المستودع، ثم تنشئ أول commit وتدفعه إلى GitHub عند توفر المصادقة. لا تنشئ المستودع على GitHub بدلًا عنك، ولا تتجاوز تسجيل الدخول.

## الخطوة 3: مظهر مستودع احترافي

من صفحة المستودع، اضغطي علامة الإعداد بجانب **About**، ثم أضيفي:

- **Description:** `Explainable QR & URL security risk analyzer | Flask | Arabic & English | Docker | CI`
- **Website:** اتركيه فارغًا إلى أن تنشري Demo فعليًا. لا تستخدمي رابط localhost كرابط عام.
- **Topics:** `cybersecurity`, `phishing-detection`, `qr-code`, `url-analysis`, `python`, `flask`, `secure-coding`, `docker`, `rest-api`, `security-tools`

**Pin repository:** من ملفك الشخصي في GitHub اضغطي **Customize your pins** ثم اختاري CyberGuard (بعد ظهوره على الحساب).

## الخطوة 4: التأكد من النجاح

- في جذر المستودع يجب أن يظهر `README.md` بجانب `app.py` و`cyberguard/`، لا مجلدًا خارجيًا يحتويها كلها.
- افتحي **Actions → CI**. اختبارات Python وبناء Docker تعمل تلقائيًا إذا كانت GitHub Actions مفعلة. ظهور علامة خضراء يؤكد نجاح هذه الفحوصات فقط، وليس إثباتًا أن كشف التصيد دقيق بنسبة محددة.
- إذا كانت Actions معطلة، فعّليها من إعدادات المستودع وفق صلاحيات حسابك.
- تأكدي من ظهور `LICENSE` و`docs/PROJECT_EXPLANATION_AR.md` في المستودع.

## الخطوة 5: تشغيل المشروع على جهازك

يتطلب Python 3.11+؛ من جذر المشروع على Windows:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe app.py
```

افتحي `http://127.0.0.1:5000`. لتشغيل الاختبارات:

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
.\.venv\Scripts\python.exe -m pytest tests -q
.\.venv\Scripts\python.exe -m ruff check cyberguard tests scripts app.py
```

ويمكن تشغيله عبر Docker: `docker compose up --build` ثم `http://127.0.0.1:8000`.

## الخطوة 6: عرضه في السيرة الذاتية أو LinkedIn

**Project Title:** CyberGuard — Explainable QR & URL Security Analyzer

**Description:**

> Built a bilingual Flask application that performs offline URL and QR-code risk analysis using transparent security indicators. Implemented secure input validation, REST APIs, automated tests, Docker deployment, and GitHub Actions CI/CD.

**Tech Stack:** Python, Flask, OpenCV, HTML/CSS, JavaScript, Docker, GitHub Actions, pytest.

**GitHub URL:** أضيفي رابط المستودع الفعلي **بعد التأكد من نشره**.

## استكشاف المشكلات

| المشكلة | الحل |
| --- | --- |
| `Repository not found` | تحققي أن المستودع أُنشئ، وأن اسم الحساب صحيح، وأن GitHub يسمح لحسابك بالدفع إليه. |
| `Permission denied` أو `Authentication failed` | سجّلي الدخول باستخدام Git Credential Manager أو GitHub CLI، وتأكدي من صلاحية الكتابة. |
| `remote origin already exists` | اطلعي على `git remote -v` وصححي الرابط فقط إذا كان غير صحيح. |
| `src refspec main does not match any` | تأكدي من نجاح `git commit` ثم `git branch -M main`. |
| `rejected (fetch first)` | قد يحتوي المستودع البعيد على commit سابق؛ لا تستخدمي `--force` دون مراجعة. |
| فقدان `.github/` عند الرفع | استخدمي Git بدلًا من الرفع بالمتصفح. |
| تبويب Actions أحمر | افتحي تفاصيل المهمة؛ غالبًا سببها اعتماد أو اختلاف نسخة أو اختبار فاشل، وليست دليلًا قاطعًا على عطل كامل التطبيق. |

**للشرح التقني التفصيلي:** [شرح المشروع](PROJECT_EXPLANATION_AR.md) · [واجهة API](API.md) · [اعتبارات الأمان](SECURITY.md).
