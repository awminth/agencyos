# AgencyMS အသုံးပြုလမ်းညွှန် (မြန်မာ) — လက်ရှိစနစ်ပုံစံ အပြည့်အစုံ

ဤစာရွက်သည် AgencyMS (Overseas Employment Agency Worker & Invoice Management System) ၏ **လက်ရှိ အလုပ်လုပ်ပုံ** အားလုံးကို ဖော်ပြသည်။ Help Chat သည် ဤစာရွက်ကိုသာ အခြေခံ၍ မြန်မာလို ဖြေရမည်။

---

## ၁။ စနစ်အကြောင်း အတိုချုပ်

AgencyMS သည် ဂျပန်အလုပ်အကိုင် ကိုယ်စားလှယ်အေဂျင်စီများအတွက် —

- အလုပ်သမား (Workers) နှင့် ကျောင်းသား (Students) စီမံခြင်း
- Host Company / School အလိုက် **Formal Digital Invoice** ထုတ်ခြင်း
- ပေးချေမှု၊ voucher၊ အစီရင်ခံစာ၊ ဆက်တင်များ

ကို တစ်နေရာတည်းတွင် စီမံသည့် ဝက်ဘ်အက်ပ်ဖြစ်သည်။

### မီနူးများ (Sidebar / မိုဘိုင်း Bottom Nav)

| မီနူး (မြန်မာ) | အင်္ဂလိပ် | အဓိကလုပ်ဆောင်ချက် |
|---------------|-----------|---------------------|
| ပင်မ ဒက်ရှ်ဘုတ် | Dashboard | အနှစ်ချုပ် ကတ်များ၊ ဇယားများ |
| အလုပ်သမား | Workers | Worker CRUD၊ Excel Import/Export |
| ကျောင်းသား | Students | Profiles + Introduction Fees |
| ဗီဇာ / စာချုပ် | Deployments | Worker deployment ရှုထောင့် |
| ငွေစာရင်း | Invoices | Host အလိုက် fee invoices |
| အစီရင်ခံစာ | Reports | Fees / Students / Upcoming / Outstanding / Expiry |
| ဆက်တင် | Settings | Print၊ Bank၊ Currency၊ Variables၊ Users |

အပေါ်ဘား (Navbar) တွင် — ဘာသာစကား၊ ငွေကြေးပြသမှု၊ **အသိပေးချက်များ (ခေါင်းလောင်း)**၊ Log out။  
Help Chat ခလုတ်သည် ညာအောက်တွင် ပေါ်သည် (login ပြီးမှ)။

ခွင့်ပြုချက် `read` မရှိသော မီနူးကို မမြင်ရ / သုံးမရ။

---

## ၂။ Login / အခန်းကဏ္ဍ / ခွင့်ပြုချက်

### Login

1. Email + Password ထည့်ပါ။
2. **အကောင့်မှတ်ထားမည် (Remember me)** ရွေးနိုင်သည်။
3. Login စာမျက်နှာတွင် ဘာသာစကား (မြန်မာ / English / 日本語) ပြောင်းနိုင်သည်။
4. အောင်မြင်ရင် Dashboard သို့ ရောက်သည်။

### Roles (ပုံမှန်)

- **Admin** — module အားလုံး CRUD၊ Users စီမံနိုင်
- **Manager** — Workers/Students/Deployments/Invoices create+read+update (delete မရ)၊ Reports read၊ Settings read+update၊ Users မရ
- **Staff** — အဓိက module များ read-only၊ Settings / Users မရ

### Permission modules

`dashboard`၊ `workers`၊ `students`၊ `deployments`၊ `invoices`၊ `reports`၊ `settings`၊ `users` — တစ်ခုချင်း create / read / update / delete။

အကောင့်စီမံရန် — Settings → **အသုံးပြုသူ အကောင့်များ** (`users` ခွင့်လို)။

---

## ၃။ Dashboard (ပင်မ ဒက်ရှ်ဘုတ်)

### သတိပေးဘန်နာ (ရှိမှ ပေါ်)

- Management invoice — **နောက် ၇ ရက်** အတွင်း next invoice date၊ Paid မဟုတ်သေး
- စာချုပ်ကုန်ဆုံး — Active worker၊ contract end **၆၀ ရက်** အတွင်း

### အနှစ်ချုပ် ကတ် ၄ ခု

1. Total Workers (+ Active / Contract Ended အရေအတွက်)
2. Absconding Rate % (+ Absconded အရေအတွက်)
3. Outstanding (ကျန်ငွေ) + pending invoice အရေအတွက်
4. Unsent Receipts (receipt မပို့ရသေးသော အရေအတွက်)

မှတ်ချက် — Outstanding / Collected / pending စသည်တို့သည် API တွင် **Worker + Student invoices ပေါင်း** တွက်သည်။ Dashboard UI တွင် Collected ကတ် သီးခြား မပြပါ။

### အခြား

- Status pie chart (Active / Ended / Absconded)
- Visa bar chart
- Recent invoices / Recent workers စာရင်း
- Excel / PDF export (dashboard summary)

---

## ၄။ Workers (အလုပ်သမား)

### စာရင်း

1. **အလုပ်သမား** မီနူး ဖွင့်ပါ။
2. ရှာဖွေ / Status / Visa / Contract expiry စစ်ထုတ်နိုင်သည်။
3. Excel / PDF Export လုပ်နိုင်သည်။

### အသစ်ထည့်ရန်

1. **အလုပ်သမားသစ် သွင်းရန်** နှိပ်ပါ။
2. ပိုင်း ၃ ပိုင်း ဖြည့်ပါ —

**Profile**
- Serial No၊ အမည်*၊ ကျား/မ၊ မွေးနေ့၊ Passport*၊ Status၊ Notes
- Status — Active / Contract Ended / Absconded (Absconded ဖြစ်ရင် Absconded Date)

**Deployment (ဗီဇာ / နေရာချထားမှု)**
- Visa Type*၊ Supervising Org*၊ Host Company*၊ Job Category*
- Own Card Date၊ Departure Date၊ Japan Entry Date၊ Contract End Date
- Dropdown တန်ဖိုးများသည် Settings → **စနစ် ကိန်းရှင်များ** မှ လာသည်

**Financial config**
- Currency — JPY / MMK / USD
- Flight Fee၊ Training Fee၊ Management Fee
- Billing Cycle Months (ပုံမှန် ၆)

3. Save လုပ်ပါ။

### ပြင် / အသေးစိတ် / ဖျက်

- စာရင်းမှ Edit၊ Detail modal၊ Delete (ခွင့်ရှိမှ)
- Active worker အတွက် **Mark Absconded** (ရက်စွဲ + မှတ်ချက်) အမြန်လုပ်နိုင်သည်
- ဆက်စပ် invoice ရှိရင် ဖျက်ရာတွင် သတိပေးနိုင်သည်

### Excel Import

1. **Template** ဒေါင်းလုပ် — Settings Variables နမူနာ ပါသည်။
2. ကော်လံခေါင်းစဉ် မပြောင်းဘဲ ဖြည့်ပါ။
3. **Import** တင်ပါ — အမှားရှိရင် **တစ်ခုမှ မထည့်** (rollback)။

လိုအပ်အနည်းဆုံး — Name၊ Passport No၊ Visa Type၊ Supervising Org၊ Host Company၊ Job Category။

---

## ၅။ Students (ကျောင်းသား)

Students မီနူးတွင် **tab နှစ်ခု** ရှိသည် —

### ၅.၁ Profiles (ကျောင်းသားကိုယ်ရေး)

1. အသစ်ထည့် — Profile / Visa+School / Introduction Fee
2. လိုအပ် — Visa Type၊ **School Name** (`school_name` variable)၊ School Address (စာသား — စနစ်တွင် hostCompany အဖြစ် သိမ်း)
3. Introduction Fee ငွေကြေး — **JPY**
4. Status / Mark Absconded — Workers နှင့် ဆင်တူ
5. Excel / PDF **Export** ရသည် — **Excel Import မရှိ**
6. ဆက်စပ် student invoice ရှိရင် ဖျက်ရာတွင် သတိပေး

### ၅.၂ Introduction Fees (ကျောင်းအလိုက် ငွေတောင်းခံ)

- **School Name** အလိုက် invoice တစ်စောင် — ထိုကျောင်းအောက်ရှိ ကျောင်းသားများကို line items အဖြစ် စုပေါင်း
- Formal Invoice စီးဆင်းမှုသည် Worker Host Invoice နှင့် **တူညီ** (အောက်ပိုင်း ၇ ကြည့်ပါ)
- Invoices မီနူးအောက်တွင် မဟုတ် — **Students → Introduction Fees** မှ စီမံသည်

---

## ၆။ Deployments (ဗီဇာ / စာချုပ်)

- သီးခြား entity မဟုတ် — **Workers စာရင်းကို deployment ရှုထောင့်** ဖြင့် ပြသည်
- ခေါင်းစဉ် — **ဗီဇာ / စာချုပ် စီမံခန့်ခွဲခြင်း**
- ကော်လံ — Visa၊ Org/Host၊ Departure၊ Japan Entry၊ Contract End၊ ရက်ကျန် badge
- ရှာဖွေ — အမည် / passport / host / visa
- Sidebar badge — contract **၃၀ ရက်** အတွင်း ကုန်ဆုံးမည့် Active workers
- Add / Edit / Delete — workers ကဲ့သို့ (deployments permission)
- ဤ view တွင် Excel Import **မရှိ**

---

## ၇။ Invoices (ငွေစာရင်း — Host Company Billing)

### အဓိက ပုံစံ (အရေးကြီး)

- Invoice တစ်စောင် = **Host Company တစ်ခု** (+ Supervising Org)
- ထို host အောက် workers = **line items**
- Fee tabs သုံးခု —
  1. **Management Fee**
  2. **Flight Fee**
  3. **Training Fee**
- စာရင်းတွင် Host card/row များ ပြသည် (worker တစ်ဦးချင်း မဟုတ်)

### ၇.၁ Invoice အသစ် ဖန်တီးရန်

1. **ငွေစာရင်း** → Fee tab ရွေးပါ။
2. **ငွေတောင်းခံလွှာ အသစ်ထုတ်ရန် (Create Invoice)** နှိပ်ပါ။
3. Supervising Org → Host Company ရွေးပါ → workers/lines အလိုအလျောက် ပေါ်မည်။
4. **Formal Invoice fields** မဖြည့်ရင် Save **မရ** —
   - **Attn (Billed To)** * — လက်ခံသူ / ဌာန (ပုံမှန်: Management / Representatives)
   - **Subject** * — ငွေတောင်းခံ ခေါင်းစဉ်
   - **Tax Rate** * — 10% / 8% / 0%
   - **Bank Account** * — Settings → Bank Accounts မှ ရွေး (default အကောင့် ရှိရင် အလိုအလျောက်)
5. Live preview — Subtotal (Excl. Tax) / Consumption Tax / Total Amount Due
6. Save လုပ်ပါ။

### ၇.၂ ငွေတွက်ချက်မှု

| အမည် | အဓိပ္ပာယ် |
|------|-----------|
| Total Amount / Subtotal | Tax **မပါ** — line amounts ပေါင်း |
| Tax Amount | Subtotal × Tax Rate |
| Amount Due | Subtotal + Tax — **ပေးချေမှု ဤပမာဏကို အခြေခံ** |
| Outstanding | Amount Due − Amount Received |
| Status | Pending / Partial / Paid (ကျန် ၀ = Paid) |

### ၇.၃ Host Fee Detail စာမျက်နှာ

Host card နှိပ် → ထို host + fee type အတွက် အသေးစိတ် —

- အနှစ်ချုပ် — Total / Paid / Remain
- **Total Paid Voucher** (စုပေါင်း voucher)
- Invoice တစ်ခုချင်း —
  - **Eye / Invoice Preview** → Formal invoice
  - **Pay** — `invoices.update` ရှိရမည် + status ≠ Paid + outstanding > 0 (မကိုက်ရင် **မပေါ်**)
  - Edit / Delete (ခွင့်ရှိမှ)
- **Payment Vouchers** — View / Delete

### ၇.၄ Formal Invoice Preview / မျှဝေရန်

- Excel ပုံစံနှင့် ဆင်တူသော digital invoice — **A4 ပုံနှိပ် POS မဟုတ်**
- **Copy image** + **PDF Download** (chat / email မျှဝေရန်)
- **Voucher 1 / Voucher 2** tabs — Print Setting letterhead နှစ်ခု ပြောင်းကြည့်

### ၇.၅ ပေးချေမှု (Pay)

1. Pay နှိပ် → ပမာဏ၊ ရက်စွဲ၊ Receipt No၊ Notes
2. ပမာဏသည် outstanding **ထက် မပိုရ** (ပိုရိုက်ရင် error / submit မရ)
3. Partial / Full ပြီးရင် outstanding + status အလိုအလျောက် ပြောင်း
4. ပြီးရင် Payment voucher ဖွင့်နိုင် — formal layout + Copy / PDF + Voucher 1/2

### ၇.၆ Edit သတိ

- Attn / Subject / Bank မရှိသော invoice ဟောင်း Edit လုပ်ရင် ဖြည့်မှ Save ရ
- Tax rate ပြောင်းရင် outstanding ပြန်တွက်

---

## ၈။ Student Invoices (School Billing) — အသေးစိတ်

လမ်းကြောင်း — **ကျောင်းသား → Introduction Fees**

1. School ရွေး → ကျောင်းသား lines (introduction fee ပေါင်း — ပြင်နိုင်)
2. Formal fields — Attn / Subject / Tax / Bank (**Worker နှင့် တူ**)
3. School fee detail — Pay / Invoice Preview / Edit / Delete / Payment Vouchers / Total Paid Voucher
4. Formal preview + Copy / PDF + Voucher 1/2 — တူညီ
5. Overpayment ကာကွယ်မှု — တူညီ

---

## ၉။ Reports (အစီရင်ခံစာ)

Reports မီနူးအောက် **sub-tab ၅ ခု** —

| Tab | ပြသသည် |
|-----|---------|
| **Fee Payments** | Worker Management / Flight / Training fee အခြေအနေ (host line-item invoices ပါ၊ tax-inclusive due)၊ fee-type / outstanding filter၊ ရှာဖွေ၊ Excel/PDF |
| **Student Introduction Fees** | ကျောင်းသား introduction fee status၊ filter / export |
| **Upcoming Invoice (ရှေ့ ၁ လ)** | Management next-invoice ~၁ လ အတွင်း၊ ရက်ကျန် |
| **Outstanding Balance** | ကျန်ငွေရှိ invoices (**host invoices အပါအဝင်**) |
| **Contract Expiry** | စာချုပ်ကုန်ဆုံးရက် + ရက်ကျန် |

Tab တိုင်း Excel / PDF export လုပ်နိုင်သည်။

---

## ၁၀။ Settings (ဆက်တင်)

### ၁၀.၁ ပုံနှိပ် ဆက်တင် (Print Setting)

- **Voucher 1** နှင့် **Voucher 2** — letterhead နှစ်ခု
- Logo၊ Agency Name၊ Address၊ Phone၊ **Registration No.**၊ **FAX**
- Invoice / Payment voucher preview တွင် tab ဖြင့် ပြောင်းပြသည်
- Slot တစ်ခုချင်း Save

### ၁၀.၂ ဘဏ်အကောင့်များ (Bank Accounts) — သီးခြား tab

1. Label၊ Bank Name*၊ Branch Code၊ Branch Name၊ Account Number*၊ Account Holder*
2. **Set as default** ရွေးနိုင်
3. Invoice ဖန်တီး/ပြင်သည့်အခါ dropdown မှ ရွေး — ရွေးချိန်က **snapshot** အဖြစ် invoice ပေါ်တွင် မှတ်သည် (နောက်မှ bank ပြင်လည်း အဟောင်း invoice မပြောင်း)

### ၁၀.၃ ငွေလဲနှုန်း (Currency Exchange)

- JPY ↔ MMK ငွေလဲနှုန်း
- ပြသမည့် ငွေကြေး — **JPY သို့မဟုတ် MMK** (radio)
- Preview ပြသည်

### ၁၀.၄ စနစ် ကိန်းရှင်များ (System Variables)

အမျိုးအစားများ —

- `visa_type`
- `supervising_org`
- `host_company` — **parent supervising org** လိုအပ်
- `job_category`
- `school_name` — Students ကျောင်းအမည်

အသစ်ထည့် / ပြင် / ဖျက် / active-inactive လုပ်နိုင်သည်။

### ၁၀.၅ အသုံးပြုသူ အကောင့်များ (User Accounts)

- အကောင့် ဖန်တီး / ပြင် / ဖျက်
- Module တိုင်း create/read/update/delete ခွင့် သတ်မှတ်
- `users` permission လိုသည်

Settings မြင်ရန် — `settings.read` သို့မဟုတ် `users.read`။

---

## ၁၁။ အသိပေးချက်များ (Notifications) + Web Push

- Navbar **ခေါင်းလောင်း** နှိပ် → Notifications စာမျက်နှာ
- ပြသသည် —
  - Urgent management invoices (၇ ရက်)
  - Contract expiry (Active၊ ၆၀ ရက်)
- Filter — All / Invoices / Contracts
- Mark all read၊ Invoices / Deployments သို့ ခုန်သွားနိုင်
- Browser notification + Service Worker + Web Push (`VAPID` keys backend လို)
- Permission ဖွင့် + **Send test push** စမ်းနိုင်
- Login ပြီး permission ပေးထားရင် auto-subscribe ကြိုးစားသည်

---

## ၁၂။ ဘာသာစကား နှင့် Help Chat

### UI ဘာသာ

- Navbar / Login — **မြန်မာ / English / 日本語**
- ရွေးချယ်မှု သိမ်းထားသည်

### Help Chat

- ခေါင်းစဉ် — **အကူအညီ (မြန်မာ)**
- **မေး/ဖြေ မြန်မာလိုသာ** (UI ဘာသာ ဘာပဲရွေးရွေး)
- တစ်ရက်လျှင် အသုံးပြုသူတစ်ဦး **၃၀ ကြိမ်** (Asia/Yangon နေ့ရက်)
- ကျန်ကြိမ် — `ယနေ့ ကျန် X / 30`
- မေးခွန်း အရှည် အများဆုံး ~၂၀၀၀ စာလုံး
- စကားဝိုင်း မှတ်ဉာဏ် နောက်ဆုံး အလှည့် ~၈ ခု
- Gemini API key မရှိရင် Help Chat မရ (503)
- ဤလမ်းညွှန်စာရွက်တွင် မပါလျှင် မှန်းမဖြေရ

---

## ၁၃။ အကြံပြု အသုံးပြုအစဉ် (System တစ်ခုလုံး)

1. Settings → **စနစ် ကိန်းရှင်များ** (visa / org / host / job / school)
2. Settings → **ပုံနှိပ် ဆက်တင်** (Voucher 1 & 2၊ Registration၊ FAX၊ Logo)
3. Settings → **ဘဏ်အကောင့်များ** — အနည်းဆုံး ၁ ခု (+ default)
4. Settings → **ငွေလဲနှုန်း** (လိုအပ်ရင်)
5. **အလုပ်သမား** / **ကျောင်းသား Profiles** ထည့် (သို့ Excel Import — Workers သာ)
6. **ငွေစာရင်း** → Create Invoice (Attn, Subject, Tax, Bank)
7. သို့မဟုတ် Students → **Introduction Fees** → School invoice
8. Invoice Preview → Copy / PDF မျှဝေ
9. Pay → Payment voucher View
10. Reports / Notifications ဖြင့် စောင့်ကြည့်

---

## ၁၄။ မလုပ်သင့် / မဖြေသင့်သောအရာများ

Help assistant သည် —

1. AgencyMS ဆော့ဖ်ဝဲ **အသုံးပြုနည်း** သာ ရှင်းပြရမည်။
2. ဆော့ဖ်ဝဲနှင့် မသက်ဆိုင်သော အကြောင်းအရာ (သတင်း၊ ဟာသ၊ ပရိုဂရမ်မင်း သင်ခန်းစာ၊ ရာဇဝတ်မှု စသည်) ငြင်းရမည် — မြန်မာလို တိုတို။
3. hacking၊ API key / စကားဝှက် တောင်းခြင်း မလုပ်ရ။
4. ဒေတာဘေ့စ်ထဲရှိ တကယ့် worker / invoice မှတ်တမ်း တစ်ခုချင်း **ရှာမပေးရ** (လမ်းညွှန်အဆင့်သာ)။
5. ဤစာရွက်တွင် မပါသော လုပ်ဆောင်ချက်ကို မှန်းမဖြေဘဲ **မသိကြောင်း** ပြောရမည်။
6. မေးခွန်းနှင့် အဖြေကို **မြန်မာဘာသာဖြင့်သာ** ရေးရမည်။ အခြားဘာသာဖြင့် မေးလာပါက မြန်မာလို ပြန်မေးခိုင်းပါ။
