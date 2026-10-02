// ------------------------------------------------------------------ helpers
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const pad2 = (n) => String(n).padStart(2, '0');
const isoOf = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const todayISO = () => isoOf(new Date());
const money = (v, dp = 2) => (v < 0 ? '-$' : '$') + Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp });
const signed = (v, dp = 2) => (v > 0 ? '+' : '') + money(v, dp);
const pct = (v, dp = 0) => (v * 100).toFixed(dp) + '%';
const cls = (v) => (v > 0 ? 'up' : v < 0 ? 'down' : '');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const easeOutBack = (x, s = 1.9) => 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2);
const easeInOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const isTouch = matchMedia('(pointer: coarse)').matches;

// ------------------------------------------------------------------ language (ไทย / English)
// Thai is the default. Static and rendered UI text is translated by exact match (plus a few
// patterns with numbers); sentences built from data use tr(en, th) directly.
const LANG = (() => { try { return JSON.parse(localStorage.getItem('harvest-ledger-v1'))?.settings?.lang || 'th'; } catch (e) { return 'th'; } })();
const tr = (en, th) => (LANG === 'th' ? th : en);
const TH = {
  // HUD & travel
  'Controls': 'วิธีเล่น', 'or click ground: walk': 'หรือคลิกพื้น: เดิน', 'interact ·': 'เข้าอาคาร ·', 'new quest': 'จดเทรดใหม่',
  'Drag: rotate · Scroll: zoom': 'ลาก: หมุนกล้อง · Scroll: ซูม', 'hide': 'ซ่อน', 'Farmer': 'ชาวนา', 'Lv': 'Lv',
  'Farmhouse': 'บ้านไร่', 'Field': 'แปลงผัก', '✦ New Quest': '✦ จดเทรดใหม่', 'Board': 'กระดาน', 'Tavern': 'โรงเตี๊ยม',
  'Growing your farm…': 'กำลังปลูกฟาร์ม…',
  'Account balance (starting gold + net PnL)': 'ยอดเงิน (ทุนเริ่มต้น + กำไรสุทธิ)', 'Experience': 'ค่าประสบการณ์',
  'Energy: drains as today\'s losses approach your daily loss limit': 'พลังงาน: ลดลงเมื่อขาดทุนวันนี้เข้าใกล้ลิมิตรายวัน',
  'Discipline: plan-adherence hearts, last 20 quests': 'วินัย: คะแนนทำตามแผน 20 เทรดล่าสุด',
  'Weather follows today\'s PnL · sky follows your clock': 'สภาพอากาศตาม PnL วันนี้ · ท้องฟ้าตามเวลาจริง',
  'Sound on/off (M)': 'เปิด/ปิดเสียง (M)', 'Switch to the lighter 2D version (same data)': 'สลับไปเวอร์ชัน 2D ที่เบากว่า (ข้อมูลเดียวกัน)',
  'Settings, graphics & save file': 'ตั้งค่า กราฟิก และไฟล์เซฟ', 'Switch language': 'เปลี่ยนภาษา',
  '🏠 Farmhouse': '🏠 บ้านไร่', '📜 Quest Board': '📜 กระดานเควส', '🍺 Tavern': '🍺 โรงเตี๊ยม', '💰 Chest': '💰 หีบสมบัติ',
  '📅 Calendar': '📅 ปฏิทิน', '📮 Settings': '📮 ตั้งค่า', '🌾 Field': '🌾 แปลงผัก',
  // titles & emotions
  'Seedling Trader': 'เทรดเดอร์ต้นกล้า', 'Sprout Scalper': 'สแคลปเปอร์หน่ออ่อน', 'Field Hand': 'มือไร่ฝึกหัด', 'Harvest Swinger': 'นักสวิงเก็บเกี่ยว',
  'Market Rancher': 'เจ้าของไร่ตลาด', 'Golden Farmer': 'ชาวนาทองคำ', 'Legend of the Valley': 'ตำนานแห่งหุบเขา',
  'Calm': 'ใจนิ่ง', 'Patient': 'อดทนรอ', 'Confident': 'มั่นใจ', 'Focused': 'มีสมาธิ', 'FOMO': 'FOMO', 'Greedy': 'โลภ',
  'Fearful': 'กลัว', 'Revenge': 'เอาคืน', 'Bored': 'เบื่อ', 'Tired': 'เหนื่อย', 'Unsorted': 'ไม่ระบุ',
  'Mon': 'จ.', 'Tue': 'อ.', 'Wed': 'พ.', 'Thu': 'พฤ.', 'Fri': 'ศ.', 'Sat': 'ส.', 'Sun': 'อา.',
  // farmhouse
  'Level': 'เลเวล', 'Win rate': 'อัตราชนะ', 'Energy': 'พลังงาน', 'daily loss limit': 'ลิมิตขาดทุนรายวัน', 'Discipline': 'วินัย',
  'Daily loss limit reached. Rest until tomorrow.': 'ขาดทุนถึงลิมิตรายวันแล้ว พักก่อน พรุ่งนี้ค่อยมาใหม่',
  'Latest quests': 'เทรดล่าสุด', 'Inventory': 'คลังสถิติ', 'your trading stats': 'สถิติการเทรดของคุณ',
  'Total PnL': 'กำไรสุทธิ', 'Win Rate': 'อัตราชนะ', 'Profit Factor': 'Profit Factor', 'Streak': 'ชนะ/แพ้ติดกัน', 'Quests': 'จำนวนเทรด',
  'Best Harvest': 'เทรดดีที่สุด', 'Avg Win / Loss': 'ชนะเฉลี่ย / แพ้เฉลี่ย', 'Expectancy': 'กำไรคาดหวัง',
  'gross win ÷ gross loss': 'กำไรรวม ÷ ขาดทุนรวม', 'per quest': 'ต่อเทรด',
  'Net profit and loss after fees': 'กำไรขาดทุนสุทธิหลังหักค่าธรรมเนียม', 'Winning quests ÷ all quests': 'เทรดที่ชนะ ÷ เทรดทั้งหมด',
  'Above 1.5 is a healthy farm': 'เกิน 1.5 ถือว่าฟาร์มแข็งแรง', 'Current consecutive wins or losses': 'จำนวนชนะหรือแพ้ติดกันตอนนี้',
  'Trades logged': 'จำนวนเทรดที่จดไว้', 'Biggest winning trade': 'เทรดที่กำไรมากที่สุด', 'Average winning vs losing trade': 'เทรดชนะเฉลี่ยเทียบกับเทรดแพ้เฉลี่ย',
  'Average PnL per trade': 'PnL เฉลี่ยต่อเทรด', 'No quests yet. Visit the Quest Board!': 'ยังไม่มีเทรด ไปที่กระดานเควสเลย!',
  // quest board & form
  'Quest Board': 'กระดานเควส', 'New Quest': 'จดเทรดใหม่', 'Cancel edit': 'ยกเลิกการแก้ไข', 'Date': 'วันที่', 'Time': 'เวลา',
  'Asset / Pair': 'สินทรัพย์ / คู่เทรด', 'Direction': 'ทิศทาง', 'Entry price': 'ราคาเข้า', 'Exit price': 'ราคาออก', 'Size / Qty': 'ขนาด / จำนวน',
  'Fees': 'ค่าธรรมเนียม', 'PnL ($)': 'กำไร/ขาดทุน ($)', 'AUTO': 'อัตโนมัติ', 'MANUAL': 'กรอกเอง', '↺ back to auto': '↺ กลับไปคำนวณอัตโนมัติ',
  'Setup category': 'ประเภท Setup', 'Emotional state': 'อารมณ์ตอนเข้าเทรด', 'Followed the plan?': 'ทำตามแผนแค่ไหน?',
  'Execution notes': 'บันทึกการเทรด', 'Mistakes made': 'ข้อผิดพลาด', 'Lessons learned': 'บทเรียนที่ได้', 'Chart snapshot': 'ภาพกราฟ',
  '📷 Drop a screenshot here or click to attach': '📷 ลากภาพหน้าจอมาวาง หรือแตะเพื่อแนบ', '📷 Snapshot attached (click to replace)': '📷 แนบภาพแล้ว (แตะเพื่อเปลี่ยน)',
  'remove snapshot': 'ลบภาพ', 'Reward:': 'รางวัล:', '✦ Plant Quest': '✦ ปลูกเควส', '✎ Save Changes': '✎ บันทึกการแก้ไข', 'Clear': 'ล้าง',
  'Ctrl/⌘+Enter saves · paste a screenshot with Ctrl/⌘+V': 'Ctrl/⌘+Enter บันทึก · วางภาพด้วย Ctrl/⌘+V',
  'Why did you take it? How did you manage it?': 'ทำไมถึงเข้า? บริหารออร์เดอร์ยังไง?', 'Moved stop, entered early, sized too big…': 'เลื่อน SL, เข้าเร็วไป, ไม้ใหญ่เกิน…',
  'What will you do next time?': 'ครั้งหน้าจะทำอะไรต่างไป?', 'calculated from entry / exit / size': 'คำนวณจากราคาเข้า / ออก / ขนาด',
  'Search asset, setup, notes…': 'ค้นหาสินทรัพย์ setup โน้ต…', 'Breakout, Pullback, Reversal…': 'Breakout, Pullback, Reversal…',
  'Pinned Quests': 'เควสบนกระดาน', 'All': 'ทั้งหมด', 'Harvests': 'ชนะ', 'Withered': 'แพ้', 'All setups': 'ทุก setup',
  'No quests pinned here yet.': 'ยังไม่มีเควสบนกระดาน', 'Show more quests ▼': 'ดูเพิ่ม ▼',
  // tavern
  'The Tavern': 'โรงเตี๊ยม', 'Gold Chronicle': 'บันทึกทองคำ', 'equity after every quest': 'เงินในพอร์ตหลังแต่ละเทรด', 'balance at the end of each day': 'ยอดเงินตอนสิ้นวัน', 'The Innkeeper says…': 'เจ้าของร้านบอกว่า…',
  'Next tip ▶': 'คำแนะนำถัดไป ▶', '📜 Scroll of Setups': '📜 คัมภีร์ Setup', 'Win rate & gold by setup · click a row to see those quests': 'อัตราชนะและกำไรแยกตาม setup · แตะแถวเพื่อดูเทรด',
  '📖 Book of Moods': '📖 ตำราอารมณ์', 'How your emotional state changes the outcome': 'อารมณ์ส่งผลต่อผลเทรดอย่างไร',
  '🗓 Almanac of Weekdays': '🗓 ปฏิทินวันในสัปดาห์', '🏆 Achievements': '🏆 ความสำเร็จ', 'The pages are still blank. Log a few quests!': 'หน้ากระดาษยังว่างอยู่ ลองจดเทรดสักหน่อย!',
  // windows
  'Quest Details': 'รายละเอียดเควส', 'QUEST COMPLETE': 'เควสสำเร็จ', 'QUEST FAILED': 'เควสล้มเหลว', 'BREAK EVEN': 'เสมอตัว',
  'Entry': 'ราคาเข้า', 'Exit': 'ราคาออก', 'Size': 'ขนาด', 'Mood:': 'อารมณ์:', 'no tags': 'ไม่มีแท็ก', 'Plan adherence': 'การทำตามแผน',
  '📜 Execution Log': '📜 บันทึกการเทรด', '⚠ Mistakes Made': '⚠ ข้อผิดพลาด', '✦ Lessons Learned': '✦ บทเรียนที่ได้',
  'No notes written.': 'ไม่มีโน้ต', 'None recorded.': 'ไม่ได้บันทึกไว้', 'No lesson written yet. Every quest teaches something!': 'ยังไม่ได้เขียนบทเรียน ทุกเควสสอนอะไรเราเสมอ!',
  'Delete': 'ลบ', '🌾 Show in field': '🌾 ดูในแปลงผัก', 'Edit': 'แก้ไข', 'Close': 'ปิด', 'Day result': 'ผลของวัน',
  'Treasure Chest': 'หีบสมบัติ', 'Gold in the chest': 'ทองในหีบ', 'Net PnL': 'กำไรสุทธิ', 'Today': 'วันนี้', 'Best harvest': 'ดีที่สุด', 'Worst storm': 'แย่ที่สุด',
  'See the Gold Chronicle ▶': 'ดูบันทึกทองคำ ▶', 'Mailbox · Settings': 'ตู้จดหมาย · ตั้งค่า', 'Farmer name': 'ชื่อชาวนา',
  'Starting gold ($)': 'ทุนเริ่มต้น ($)', 'Daily loss limit ($)': 'ลิมิตขาดทุนรายวัน ($)', 'Sound volume': 'ระดับเสียง', '🎮 Graphics': '🎮 กราฟิก',
  'Pixel filter (retro look, faster on phones)': 'ฟิลเตอร์ pixel (ลุคเรโทร และเร็วขึ้นบนมือถือ)', 'Shadows': 'เงา', 'Switch to 2D version': 'สลับไปเวอร์ชัน 2D',
  '💾 Save file': '💾 ไฟล์เซฟ', 'Export JSON': 'ส่งออก JSON', 'Import JSON': 'นำเข้า JSON', 'Load demo farm': 'โหลดฟาร์มตัวอย่าง', 'Reset farm': 'รีเซ็ตฟาร์ม',
  'Saved in this browser only (localStorage) and shared with the 2D version. Export a backup now and then.': 'ข้อมูลเก็บในเบราว์เซอร์นี้เท่านั้น และใช้ร่วมกับเวอร์ชัน 2D ส่งออกสำรองไว้บ้างเป็นระยะ',
  'Save & close': 'บันทึกและปิด', 'Quest Complete!': 'เควสสำเร็จ!', 'Quest Failed…': 'เควสล้มเหลว…', 'QUEST COMPLETE!': 'เควสสำเร็จ!',
  'Lesson learned': 'ได้บทเรียน', 'Collect ✦': 'เก็บเกี่ยว ✦', 'Keep farming': 'ปลูกต่อไป', 'Level Up!': 'เลเวลอัป!', 'You are now a': 'ตอนนี้คุณคือ',
  'Keep journaling every quest to grow your farm.': 'จดทุกเทรดต่อไป แล้วฟาร์มจะโตขึ้นเรื่อยๆ', 'Hooray!': 'เย้!',
  'You passed out…': 'คุณหมดแรงสลบไป…', 'Go to bed 🛏': 'ไปนอน 🛏', 'Hmm…': 'อืม…', 'Yes': 'ใช่', 'No': 'ไม่', 'Keep': 'เก็บไว้',
  'Cancel': 'ยกเลิก', 'Replace': 'แทนที่', 'Plow it': 'ไถเลย', '3D not available': 'เปิด 3D ไม่ได้', 'Open 2D version': 'เปิดเวอร์ชัน 2D',
  'Welcome to Harvest Valley': 'ยินดีต้อนรับสู่หุบเขาเก็บเกี่ยว', 'Explore first': 'สำรวจก่อน', '✦ Plant first quest': '✦ ปลูกเควสแรก',
  'Tap the ground to walk · tap a building to enter · drag to look around · pinch to zoom': 'แตะพื้นเพื่อเดิน · แตะอาคารเพื่อเข้า · ลากเพื่อหมุนกล้อง · ใช้สองนิ้วซูม',
  'WASD or click to walk · E to enter · drag to look around · scroll to zoom': 'WASD หรือคลิกเพื่อเดิน · E เข้าอาคาร · ลากเพื่อหมุนกล้อง · scroll เพื่อซูม',
  'Every trade is a seed. Log it at the Quest Board, write down the lesson, and a crop grows in your field. Wins fill the chest with gold; losses bring rain — and XP.':
    'ทุกเทรดคือเมล็ดพันธุ์ จดไว้ที่กระดานเควส เขียนบทเรียนไว้ แล้วผักจะงอกในแปลงของคุณ เทรดชนะเติมทองลงหีบ เทรดแพ้นำฝนมา แต่ก็ได้ XP',
  'A fine harvest!': 'เก็บเกี่ยวได้งามมาก!', 'The crops are thriving!': 'ผักงอกงามสุดๆ!', 'Gold in the barn!': 'ทองเต็มยุ้งฉาง!', 'Plan followed, reward earned.': 'ทำตามแผน ได้รางวัลสมใจ',
  'Even the best crops need rain.': 'ผักที่ดีที่สุดก็ต้องเจอฝน', 'Compost today, harvest tomorrow.': 'วันนี้เป็นปุ๋ย พรุ่งนี้ได้เก็บเกี่ยว',
  'A lesson learned is XP earned.': 'ได้บทเรียน = ได้ XP', 'Every farmer loses a season or two.': 'ชาวนาทุกคนเคยเสียผลผลิตกันทั้งนั้น',
  'Pull up a stool, traveler. Log a few quests and I will read your fortune in the numbers.': 'นั่งก่อนสิ นักเดินทาง จดเทรดสักหน่อย แล้วข้าจะอ่านดวงจากตัวเลขให้',
  // toasts
  'Demo farm planted!': 'ปลูกฟาร์มตัวอย่างแล้ว!', 'Quest removed': 'ลบเควสแล้ว', 'Settings saved': 'บันทึกการตั้งค่าแล้ว', 'Save file loaded': 'โหลดไฟล์เซฟแล้ว',
  'Could not read that file': 'อ่านไฟล์นี้ไม่ได้', 'Use a JSON exported from Harvest Ledger.': 'ใช้ไฟล์ JSON ที่ส่งออกจาก Harvest Ledger',
  'A fresh field': 'ฟาร์มใหม่เอี่ยม', 'Your farm has been reset.': 'รีเซ็ตฟาร์มแล้ว', 'Quest updated': 'อัปเดตเควสแล้ว', 'Quest incomplete': 'เควสยังไม่ครบ',
  'Which asset was this quest on?': 'เทรดสินทรัพย์อะไร?', 'Fill entry, exit and size — or type the PnL directly.': 'กรอกราคาเข้า ราคาออก และขนาด หรือพิมพ์ PnL เอง',
  'Sound on': 'เปิดเสียง', 'Sound off': 'ปิดเสียง', 'Snapshot pasted': 'วางภาพแล้ว', 'Your storage chest is full!': 'พื้นที่เก็บข้อมูลเต็มแล้ว!',
  'Remove some snapshots or export a backup.': 'ลบภาพบางส่วน หรือส่งออกไฟล์สำรอง', 'Updating to the new version…': 'กำลังอัปเดตเวอร์ชันใหม่…',
  'Your data is safe.': 'ข้อมูลของคุณปลอดภัย', '✨ New version — tap to update': '✨ มีเวอร์ชันใหม่ — แตะเพื่ออัปเดต',
  '📓 Daily Journal': '📓 บันทึกประจำวัน', '✎ Write': '✎ เขียน', 'Handbook & daily tasks': 'คู่มือและภารกิจประจำวัน', '📖 Handbook': '📖 คู่มือ',
  'Enter Farmhouse': 'เข้าบ้านไร่', 'Open Quest Board': 'เปิดกระดานเควส', 'Enter Tavern': 'เข้าโรงเตี๊ยม', 'Open chest': 'เปิดหีบ',
  'Read calendar': 'ดูปฏิทิน', 'Settings': 'ตั้งค่า', 'Previous month': 'เดือนก่อน', 'Next month': 'เดือนถัดไป', 'Toggle sound': 'เปิด/ปิดเสียง', 'Close ': 'ปิด', 'Open shop': 'เปิดร้านค้า', '🛒 Shop': '🛒 ร้านค้า', '🎣 Dock': '🎣 ท่าตกปลา', '🌳 Bench': '🌳 ม้านั่ง', '🔭 Telescope': '🔭 กล้องดูดาว', 'Go fishing': 'ตกปลา', 'Sit & breathe': 'นั่งหายใจ', 'Look at the stars': 'ส่องดาว', '💧 Water crops': '💧 รดน้ำผัก', '🧺 Harvest': '🧺 เก็บเกี่ยว', 'Things to do': 'ทำอะไรดี', '⛏ Cave': '⛏ ถ้ำ', 'Enter the cave': 'เข้าถ้ำ', 'Enter the house': 'เข้าไปในบ้าน', '📓 Desk': '📓 โต๊ะเขียน', '🏆 Trophies': '🏆 ถ้วยรางวัล', '🖼 Photos': '🖼 รูปถ่าย', '🛏 Bed': '🛏 เตียง', '🔥 Fireplace': '🔥 เตาผิง', '🚪 Door': '🚪 ประตู', 'Write at the desk': 'นั่งเขียนที่โต๊ะ', 'Look at trophies': 'ดูถ้วยรางวัล', 'Look at photos': 'ดูรูปถ่าย', 'Rest': 'นอนพัก', 'Sit by the fire': 'นั่งผิงไฟ', 'Go outside': 'ออกไปข้างนอก',
};
Object.assign(TH, { Wardrobe: 'ตู้เสื้อผ้า' });
Object.assign(TH, { 'Pre-trade check': 'เช็คก่อนเข้าไม้' });
Object.assign(TH, { // risk & R
  '🛑 Stop loss': '🛑 Stop loss', '🎯 Take profit': '🎯 Take profit', 'Risk ($)': 'ความเสี่ยง ($)', 'from entry, stop and size — or type it': 'คิดจากราคาเข้า Stop และขนาด หรือพิมพ์เอง', '🛑 Stop': '🛑 Stop', '🎯 Target': '🎯 เป้า',
});
Object.assign(TH, { // tabbed layout
  'Today': 'วันนี้', 'Stats': 'สถิติ', 'Calendar': 'ปฏิทิน', 'Goals': 'เป้าหมาย', 'Go inside': 'เข้าบ้าน', 'Walk into the farmhouse': 'เดินเข้าไปในบ้าน',
  'Log a trade': 'จดเทรด', 'All trades': 'เทรดทั้งหมด', 'Mind & lessons': 'ใจ & บทเรียน', 'More: notes, mistakes, chart': 'เพิ่มเติม: บันทึก ข้อผิดพลาด ภาพกราฟ',
  'Overview': 'ภาพรวม', 'Timing': 'ช่วงเวลา', 'Habits': 'นิสัย', 'Results': 'ผลลัพธ์', 'Awards': 'รางวัล',
  'Friends': 'เพื่อน', 'Friends: ranking, visits, guestbook': 'เพื่อน: อันดับ เยี่ยมฟาร์ม สมุดเยี่ยม', 'Menu': 'เมนู', 'Sound': 'เสียง', 'Language': 'ภาษา', 'Farm view': 'มุมมองฟาร์ม', 'All settings': 'ตั้งค่าทั้งหมด', 'Handbook': 'คู่มือ',
});
const TH_RE = [
  [/^(\d+) quests? \(showing (\d+)\)$/, '$1 เควส (แสดง $2)'], [/^(\d+) quests over the last (\d+) days$/, '$1 เควสใน $2 วันที่ผ่านมา'],
  [/^(\d+) quests?$/, '$1 เควส'], [/^best (\d+) wins$/, 'ชนะติดสูงสุด $1'], [/^(\d+) today$/, 'วันนี้ $1'],
  [/^(\d+) \/ (\d+) unlocked$/, 'ปลดล็อกแล้ว $1 / $2'], [/^ratio (.+)$/, 'อัตราส่วน $1'], [/^(-?[\d.]+%) on (.+)$/, '$1 จากทุน $2'],
  [/^Edit Quest · (.+)$/, 'แก้ไขเควส · $1'], [/^Achievement: (.+)$/, 'ความสำเร็จ: $1'], [/^(\d+) quests imported$/, 'นำเข้า $1 เควส'],
];
function t(s) {
  if (LANG !== 'th' || !s) return s;
  const k = s.trim(); if (!k) return s;
  if (TH[k] != null) return s.replace(k, TH[k]);
  for (const [re, rep] of TH_RE) if (re.test(k)) return s.replace(k, k.replace(re, rep));
  return s;
}
const I18N_ATTRS = ['placeholder', 'data-tip', 'aria-label', 'title'];
function translateTree(root) {
  if (LANG !== 'th') return;
  if (root.nodeType === 3) { const v = t(root.data); if (v !== root.data) root.data = v; return; }
  if (root.nodeType !== 1 || /^(SCRIPT|STYLE|TEXTAREA)$/.test(root.tagName)) return;
  const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  for (let n = root; n; n = walk.nextNode()) {
    if (n.nodeType === 3) { if (!/^(SCRIPT|STYLE|TEXTAREA)$/.test(n.parentNode?.tagName)) { const v = t(n.data); if (v !== n.data) n.data = v; } continue; }
    for (const a of I18N_ATTRS) { const v = n.getAttribute(a); if (v) { const tv = t(v); if (tv !== v) n.setAttribute(a, tv); } }
  }
}
if (LANG === 'th') {
  document.documentElement.lang = 'th';
  translateTree(document.body);
  new MutationObserver((muts) => {
    for (const m of muts) {
      if (m.type === 'characterData') translateTree(m.target);
      else m.addedNodes.forEach(translateTree);
    }
  }).observe(document.body, { childList: true, subtree: true, characterData: true });
}

// ------------------------------------------------------------------ pixel sprites (UI)
const PAL = {
  k: '#3b2314', y: '#f6c945', Y: '#d4902a', w: '#fffbe8', g: '#5aa04a', G: '#2f6b36', l: '#9bd35a',
  o: '#ec8a2e', O: '#b5561b', r: '#e0453f', R: '#8e2a2a', p: '#f28fad', b: '#8b5a2b', B: '#5c3a21',
  d: '#a58556', D: '#6b4f2e', c: '#eef3f8', C: '#9fb0c2', u: '#4f8fd6', P: '#f7e9c6', q: '#b89968',
  n: '#f5c9a0', h: '#7a4b2a', s: '#c6ccd6',
};
const SPRITES = {
  coin: ['..kkkkkk..', '.kyyyyyyk.', 'kyywwyyyYk', 'kywyyyyyYk', 'kyyyYYyyYk', 'kyyyYYyyYk', 'kyyyyyyyYk', 'kyyyyyyYYk', '.kYYYYYYk.', '..kkkkkk..'],
  sprout: ['............', '............', '............', '..ll....ll..', '.lllG..Glll.', '..lllGGlll..', '....lGGl....', '.....GG.....', '.....GG.....', '....BbbB....', '...BbbbbB...', '............'],
  pumpkin: ['......G.....', '.....Gl.....', '..ll.G......', '.lllGG......', '..kkkkkkkk..', '.koooOoooOok', 'kooooOoooOok', 'koowoOoooOok', 'kooooOoooOok', 'kooooOoooOok', '.kOooOoooOk.', '..kkkkkkkk..'],
  star: ['.....kk.....', '....kyyk....', '....kyyk....', 'kkkkyyyykkkk', 'kyyyywyyyyyk', '.kyyyyyyyyk.', '..kyyyyyyk..', '..kyyYYyyk..', '.kyyYkkYyyk.', '.kyYk..kYyk.', 'kyYk....kYyk', 'kkk......kkk'],
  withered: ['............', '............', '...d....d...', '....d..d....', '..d..dd..d..', '...d.dd.d...', '.....dd.....', '.....Dd.....', '.....dD.....', '....BbbB....', '...BbbbbB...', '............'],
  rain: ['............', '....CCCC....', '..CCccccC...', '.CccwcccccC.', 'CccccccccccC', 'CCCCCCCCCCCC', '............', '..u...u...u.', '.u...u...u..', '............', '...u...u....', '..u...u.....'],
  cloud: ['............', '............', '....cccc....', '..ccwwcccc..', '.cccccccccc.', 'cccccccccccc', 'CCCCCCCCCCCC', '.CCCCCCCCCC.', '............', '............', '............', '............'],
  sun: ['.....yy.....', '.y...yy...y.', '..y......y..', '....yyyy....', '...yywyyy...', 'yy.yyyyyy.yy', 'yy.yyyyyy.yy', '...yyyyyY...', '....yyYY....', '..y......y..', '.y...yy...y.', '.....yy.....'],
  heart: ['.kk...kk.', 'krrk.krrk', 'krwrkrrrk', 'krrrrrrrk', '.krrrrrk.', '..krrrk..', '...krk...', '....k....'],
  bolt: ['....kkk.', '...kyyk.', '..kyyk..', '.kyyykkk', 'kyyyyyyk', 'kkkyyyk.', '..kyyk..', '.kyyk...', '.kyk....', '.kk.....'],
  flame: ['...k....', '..kok...', '..kook..', '.koyok..', '.koyyok.', 'kooyyyok', 'koyyyyok', 'koyywyok', '.koyyok.', '..kkkk..'],
  note: ['............', '..kkkkkkkk..', '.kPPPPPPPPk.', '.kPqqqqqqPk.', '.kPPPPPPPPk.', '.kPqqqqqPPk.', '.kPPPPPPPPk.', '.kPqqqqqqPk.', '.kPPPPPPPPk.', '.kPqqqPPPPk.', '.kPPPPPPPPk.', '..kkkkkkkk..'],
  house: ['.....kk.....', '....krrk....', '...krrrrk...', '..krrrrrrk..', '.krrrrrrrrk.', 'kkkkkkkkkkkk', '.kPPPPPPPPk.', '.kPbbPPuuPk.', '.kPbbPPuuPk.', '.kPbbPPPPPk.', '.kPbbPPPPPk.', '.kkkkkkkkkk.'],
  mug: ['............', '..wwwwww....', '.wwwwwwww...', '.kkkkkkkk...', '.kyyyyyyk...', '.kyYyyyykkk.', '.kyYyyyyk.k.', '.kyYyyyyk.k.', '.kyYyyyykkk.', '.kyyyyyyk...', '.kkkkkkkk...', '............'],
  farmer: ['...kkkkkk...', '..kyyyyyyk..', '.kyyYYYYyyk.', 'kkkkkkkkkkkk', '.khhnnnnhhk.', '.khnknnknhk.', '.knnnnnnnnk.', '.knnnppnnnk.', '..knnnnnnk..', '..kggggggk..', '.kgggggggGk.', '.kkkkkkkkkk.'],
  speaker: ['....k......', '...kk...k..', 'kkkwk.k..k.', 'kwwwk..k.k.', 'kwwwk..k.k.', 'kkkwk.k..k.', '...kk...k..', '....k......'],
  mute: ['....k......', '...kk......', 'kkkwk.r..r.', 'kwwwk..rr..', 'kwwwk..rr..', 'kkkwk.r..r.', '...kk......', '....k......'],
  gear: ['...kkkk...', '.k.kssk.k.', 'kskssssksk', '.kss..ssk.', 'kks....skk', 'kks....skk', '.kss..ssk.', 'kskssssksk', '.k.kssk.k.', '...kkkk...'],
};
const sprCanvases = {}, sprURLs = {};
function spriteCanvas(name) {
  if (sprCanvases[name]) return sprCanvases[name];
  const rows = SPRITES[name], c = document.createElement('canvas');
  c.width = rows[0].length; c.height = rows.length;
  const g = c.getContext('2d');
  rows.forEach((row, y) => [...row].forEach((ch, x) => { if (PAL[ch]) { g.fillStyle = PAL[ch]; g.fillRect(x, y, 1, 1); } }));
  return (sprCanvases[name] = c);
}
const spr = (name) => (sprURLs[name] ||= spriteCanvas(name).toDataURL());
const img = (name, cl = 'w-6', extra = '') => `<img class="px ${cl}" src="${spr(name)}" alt="" ${extra}>`;
function hydrateSprites(root = document) { $$('img[data-sprite]', root).forEach((el) => { el.src = spr(el.dataset.sprite); }); }

