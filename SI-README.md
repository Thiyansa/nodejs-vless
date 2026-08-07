# VLESS WebSocket සේවාදායකය සහ Shell API ක්‍රියාත්මක කරන්නා

මෙම ව්‍යාපෘතිය Node.js සහ WebSocket ප්‍රොටෝකෝලය භාවිතයෙන් ක්‍රියාත්මක කරන ලද සැහැල්ලු VLESS ප්‍රොක්සි සේවාදායකයකි. එය වෙබ් API එකක් හරහා Shell ස්ක්‍රිප්ට් ක්‍රියාත්මක කිරීමට සහය දක්වයි, එය ස්වයං-සත්කාරක ප්‍රොක්සි සැකසුම් සහ දුරස්ථ ස්ක්‍රිප්ට් ක්‍රියාත්මක කිරීමේ අවස්ථා සඳහා සුදුසු වේ.

## ✨ විශේෂාංග

- ✅ VLESS ප්‍රොටෝකෝලය සඳහා සහය දක්වන අතර ප්‍රධාන ධාරාවේ ප්‍රොක්සි සේවාදායකයින් සමඟ අනුකූල වේ
- 🌐 WebSocket + TLS හරහා සංකේතාත්මක සම්ප්‍රේෂණය ලබා ගනී
- 🔐 UUID මත පදනම් වූ සත්‍යාපනයට සහය දක්වයි
- 🖥 Shell ස්ක්‍රිප්ට් දුරස්ථව ක්‍රියාත්මක කිරීම සඳහා වෙබ් API අතුරුමුහුණතක් සපයයි
- 📎 පරිසර විචල්‍යයන් හරහා නම්‍යශීලී වින්‍යාසය සමඟ සරල සහ භාවිතා කිරීමට පහසුය

## 📦 පරිසර විචල්‍ය වින්‍යාසය

| Variable Name | Description                                         | Default Value                          |
| ------------- | --------------------------------------------------- | -------------------------------------- |
| `UUID`        | VLESS authentication key                            | `10889da6-14ea-4cc8-97fa-6c0bc410f121` |
| `DOMAIN`      | Access domain (used for client configuration)       | `example.com`                          |
| `PORT`        | Port number on which the service runs               | `3000`                                 |
| `REMARKS`     | Node remarks/description                            | `nodejs-vless`                         |
| `WEB_SHELL` | Whether to enable the Web Shell ( **on** : enabled, **off** : disabled ) | `off`               |

## ⚡️ වේගවත් යෙදවීම

```bash
wget https://raw.githubusercontent.com/Thiyansa/nodejs-vless/refs/heads/main/app.js
wget https://raw.githubusercontent.com/Thiyansa/nodejs-vless/refs/heads/main/package.json
npm install
PORT=3000 UUID=your-uuid DOMAIN=your-domain.com WEB_SHELL=on node app.js
```

⚠️ සටහන: කරුණාකර ඔබගේ UUID ආරක්ෂිතව තබා ගන්න.

## 📡 නෝඩ් තොරතුරු බලන්න

ප්‍රවේශ වීමට ඔබගේ බ්‍රවුසරය විවෘත කරන්න:

```
http://your-domain.com:3000/your-uuid
```

## 🔧 දුරස්ථ ෂෙල් ස්ක්‍රිප්ට් ක්‍රියාත්මක කිරීම

ඔබට පහත ආකාරවලින් ස්ක්‍රිප්ට් විධාන ක්‍රියාත්මක කළ හැක:

### ඉල්ලීම් ක්‍රම

```
POST http://your-domain.com:3000/your-uuid/run
```

### උදාහරණ ඉල්ලීම:

```bash
curl -X POST http://your-domain.com:3000/10889da6-14ea-4cc8-97fa-6c0bc410f121/run -d '
  ps aux
  export PROJECT=nodejs-vless
  echo $PROJECT
'
```

## 🛡 ආරක්ෂක නිර්දේශ

- ආරම්භයේදී පෙරනිමි UUID වෙනස් කර එය ආරක්ෂිතව තබා ගන්න.

- ඉල්ලීම් මූලාරම්භය සීමා කිරීම සඳහා TLS යෙදවීම සහ ෆයර්වෝලයක් සක්‍රීය කිරීම අපි නිර්දේශ කරමු.

- වෙබ් API ශක්තිමත් අවසර ලබා දෙයි; අතුරු මුහුණත ආරක්ෂා කිරීම සඳහා සත්‍යාපනය කළ ප්‍රතිලෝම ප්‍රොක්සියක් භාවිතා කිරීම අපි නිර්දේශ කරමු.

## 📜 බලපත්‍රය

මෙම ව්‍යාපෘතිය MIT බලපත්‍රය යටතේ බලපත්‍ර ලබා ඇත. ඉගෙනීම සහ දායකත්වයන් සාදරයෙන් පිළිගනිමු, නමුත් නීති විරෝධී භාවිතය තහනම්ය.
