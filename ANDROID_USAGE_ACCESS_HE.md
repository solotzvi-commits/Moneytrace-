# MONEYTRACE — חיבור מדידת שימוש באנדרואיד

## מה התווסף
- תוסף Capacitor מקומי בשם `UsageStats` שמבקש גישה רק לאחר לחיצה מפורשת של המשתמש.
- בדיקת זמן שימוש ב-30 הימים האחרונים רק עבור חבילות אפליקציה מוגדרות מראש שמקושרות למנויים מוכרים.
- התוצאות מסוננות בצד Android לרשימת החבילות שהאפליקציה מבקשת; אין קריאה או שליחה של היסטוריית גלישה/תוכן.
- הנתונים מיועדים להישאר במכשיר. אין להעביר אותם ל-Supabase או ל-AI.

## התקנה בפרויקט Android שנוצר עם Capacitor
המאגר עדיין אינו מכיל תיקיית `android/` שנוצרה על ידי Capacitor. לאחר יצירתה:

1. העתק את `native/android/UsageStatsPlugin.java` אל:
   `android/app/src/main/java/com/moneytrace/app/UsageStatsPlugin.java`
2. החלף/מזג את `MainActivity.java.example` אל:
   `android/app/src/main/java/com/moneytrace/app/MainActivity.java`
   יש לשמור כל רישום Plugin קיים ב-MainActivity אם יתווסף בעתיד.
3. הוסף את ההרשאה מ-`AndroidManifest.permissions.xml` ישירות מתחת לתגית `<manifest>` בקובץ:
   `android/app/src/main/AndroidManifest.xml`
   אם אין namespace בשם tools, הוסף `xmlns:tools="http://schemas.android.com/tools"` לתגית manifest.
4. הרץ `npm install`, `npx cap sync android`, בנה והתקן על מכשיר Android אמיתי.
5. ב-MONEYTRACE → מנויים, לחץ על הפעלת מדידת שימוש ואשר את הגישה במסך הגדרות Android. חזור לאפליקציה ורענן את הבדיקה.

## מה Android מאפשר ומה לא
- זה עובד רק באפליקציית Android מותקנת (Capacitor), לא באתר או ב-PWA בדפדפן.
- Android מציג מסך גישה מיוחד ל-Usage Access; זו אינה הרשאת Runtime רגילה. המשתמש יכול לבטל אותה בכל עת.
- זמן Foreground הוא אומדן של זמן שהאפליקציה הייתה בחזית, לא הוכחה לצפייה בסרט/האזנה בפועל. מערכות הפעלה ויצרני מכשירים עשויים לספק נתונים חלקיים.
- אין כאן חיבור לחשבון Netflix, ואין גישה לתוכן, סיסמאות, הודעות או היסטוריית צפייה.
- התמיכה ב-iOS אינה קיימת: iOS לא מספקת לאפליקציות צד שלישי API כללי כזה.
- לפני פרסום ב-Google Play צריך לבדוק את מדיניות User Data ו-Permissions של Google Play. Usage Access נחשבת גישה רגישה; אין להציג אותה כחובה לשימוש באפליקציה, ויש להסביר את המטרה לפני פתיחת מסך ההרשאה.

## פרטיות
המשתמש יוזם את ההרשאה, רואה הסבר לפני המעבר להגדרות, ויכול להמשיך להשתמש ב-MONEYTRACE גם בלי לאפשר אותה. התוסף מחזיר רק סטטיסטיקות של חבילות שנכללו ברשימת הבדיקה, לתקופה של 30 יום.
