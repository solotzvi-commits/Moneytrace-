# MONEYTRACE — אפליקציית ניהול כספים אישית ועסקית

MONEYTRACE היא אפליקציה בעברית (RTL), בעיצוב כהה ומותאם למובייל, לניהול הכנסות, הוצאות ותמונה פיננסית אישית — עם סביבת עבודה עסקית נפרדת.

## הרצה מקומית

```bash
python3 -m http.server 8080
```

פתח `http://localhost:8080`. תכונות PWA, התחברות וסנכרון דורשות סביבת HTTPS בפריסה (או localhost בפיתוח).

## מה קיים באפליקציה

- לוח בקרה להכנסות, הוצאות ויתרה מחושבת.
- הוספה, עריכה ומחיקה של תנועות.
- חיפוש לפי בית עסק וסינון לפי סוג וקטגוריה.
- ייבוא וייצוא CSV וגיבוי/שחזור JSON.
- תקציבים חודשיים לפי קטגוריה, עם אזהרה בהתקרבות ל־80% והתראה על חריגה.
- יעדי חיסכון ומעקב אחר סכום שהצטבר.
- זיהוי היוריסטי של מנויים וחיובים חוזרים.
- תובנות מקומיות, תחזית הוצאות ומחשבון חיסכון.
- MONEYTRACE Intelligence 5.0: ציון בריאות פיננסית אינדיקטיבי, תחזית סוף חודש, זיהוי הוצאות חריגות אפשריות, חיובים חוזרים ודוח חודשי להורדה — כל הניתוח מחושב מקומית בדפדפן.
- Business Intelligence: סיכום הכנסות, הוצאות, רווחיות, חשבוניות פתוחות ומלאי נמוך במרחב העסקי.
- Business Accounting: יומן פקודות כפול, אימות איזון חובה/זכות, ביטול באמצעות פקודה נגדית, מאזן בוחן, דוח רווח והפסד ומאזן בסיסי — עם ייצוא CSV.\n- Business cloud foundation: Supabase migration עם עסקים מרובי-משתמשים, תפקידים, RLS, יומן ביקורת ו-RPC מאומת לפרסום פקודות.
- AI Coach מקומי; תשובות GPT דורשות פונקציית Supabase מאובטחת ומפתח API בצד השרת.
- מצב עסקי לניהול לקוחות, ספקים, דרישות תשלום ומלאי.
- התחברות Supabase וסנכרון תנועות אישיות, בכפוף להגדרת הפרויקט ומדיניות RLS תקינה.
- PWA עם manifest ו-service worker, וכן קבצי הכנה ל־Capacitor.

## מגבלות חשובות

- נתוני ההדגמה פיקטיביים. יש למחוק אותם ולהזין נתונים משלך לפני הסתמכות על הדוחות.
- תקציבים ויעדי חיסכון נשמרים כרגע מקומית במכשיר ואינם מסתנכרנים בין מכשירים.
- ממשק Business Mode הקיים עדיין שומר את הנתונים שלו מקומית; סכמת הענן החדשה היא תשתית בלבד ועדיין לא חוברה לממשק. אין להשתמש בנתוני אמת לפני חיבור, בדיקות הרשאות, גיבוי ושחזור.
- דוחות הנהלת החשבונות הם דוחות ניהוליים המבוססים על פקודות שהוזנו ידנית. אין עדיין התאמות בנק, קליטת מסמכים, שכר, חישובי פחת או הגשת דיווחים לרשויות.
- אין חיבור Open Banking אמיתי לבנקים בישראל. ייבוא CSV/PDF אינו חיבור בנק.
- ה־AI Coach אינו שולח נתונים למודל GPT עד לפריסת פונקציית שרת ייעודית והגדרת `OPENAI_API_KEY` בצד השרת. אין להכניס מפתח פרטי לקובצי הדפדפן.
- אין להשתמש עדיין בנתוני לקוחות אמיתיים או לקבל החלטות פיננסיות על סמך האומדנים בלי בדיקות אבטחה, RLS וגיבוי.
- אין Firewall או הגדרת CSP שמבטיחים חסינות מפריצה. נדרשות בדיקות חדירה ובדיקת הרשאות בצד השרת לפני השקה מסחרית.

## מעטפת Android/iOS

נוספו `capacitor.config.json` ו־`package.json` להכנת מעטפת Capacitor. יש לפעול לפי `APP_STORE_RELEASE_GUIDE_HE.md` ו־`MOBILE_PUBLISH_FROM_PHONE_HE.md`.

## בדיקות אוטומטיות

GitHub Actions מריץ בדיקות תחביר JavaScript, תקינות קובצי JSON, מדיניות CSP ובדיקות בסיסיות למניעת הזרקת מזהים לתוך HTML. CodeQL מריץ סריקת אבטחה סטטית.


See [the architecture map](docs/ARCHITECTURE.md) for module ownership and repository organization.\n\n## Loading and authentication architecture

- The initial page loads the transaction workspace and authentication runtime only.
- PDF.js is fetched only when a user selects a PDF statement.
- Insights, subscriptions, assistant, business accounting, and admin analytics are loaded on first navigation to their respective areas.
- Google OAuth uses Supabase Auth. Before enabling it in production, enable the Google provider in the Supabase dashboard, add the Google OAuth client ID/secret there, and allow the production callback URL in both Google Cloud and Supabase Auth URL configuration.
- Email signup errors now distinguish invalid addresses and Supabase rate limits. The client does not bypass or weaken server-side rate limits.
