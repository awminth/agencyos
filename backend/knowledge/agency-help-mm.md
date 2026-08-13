# AgencyMS အသုံးပြုလမ်းညွှန် (မြန်မာ)

ဤစာရွက်သည် Overseas Employment Agency Worker & Invoice Management System (AgencyMS) အတွက် အကူအညီစာရွက်ဖြစ်သည်။ လက်ရှိစနစ်သည် **Host Company / School အလိုက် Formal Digital Invoice** (Copy image + PDF) ကို အခြေခံသည်။

## စနစ်အကြောင်း အတိုချုပ်

AgencyMS သည် ဂျပန်အလုပ်အကိုင် ကိုယ်စားလှယ်အေဂျင်စီများအတွက် အလုပ်သမား (Workers)၊ ကျောင်းသား (Students)၊ ငွေတောင်းခံလွှာ (Invoices)၊ အစီရင်ခံစာများ (Reports) နှင့် ဆက်တင်များကို စီမံခန့်ခွဲသည့် ဝက်ဘ်အက်ပ်ဖြစ်သည်။

အဓိက မီနူးများ — Dashboard၊ Workers၊ Students၊ Deployments၊ Invoices၊ Reports၊ Settings။

## Login / အကောင့်

- အကောင့်ဖြင့် ဝင်ရောက်ရသည်။
- အသုံးပြုသူတိုင်းတွင် ခွင့်ပြုချက် (permissions) ရှိသည် — ဖတ်ရန်၊ ထည့်ရန်၊ ပြင်ရန်၊ ဖျက်ရန်။
- ခွင့်မရှိသော မီနူးကို မမြင်ရ သို့မဟုတ် သုံးမရပါ။
- Admin သို့မဟုတ် users ခွင့်ရှိသူက Settings → User Accounts မှ အကောင့်နှင့် ခွင့်ပြုချက် စီမံနိုင်သည်။

## Dashboard

- အလုပ်သမား အရေအတွက်၊ invoice အခြေအနေ၊ စာချုပ်ကုန်ဆုံးမည့်သူများ၊ ကျန်ငွေ (outstanding) အနှစ်ချုပ်ကို ပြသည်။
- Outstanding / Collected တွင် **Worker invoices + Student invoices** နှစ်မျိုးလုံး ပေါင်းပြသည်။
- အချက်အလက် ပြင်ဆင်လိုပါက သက်ဆိုင်ရာ မီနူး (Workers / Invoices စသည်) သို့ သွားပါ။

## Workers (အလုပ်သမား)

### ဘယ်မှာ ထည့်ရမလဲ

1. Sidebar (သို့ မိုဘိုင်း Bottom Nav) မှ **Workers** ကို နှိပ်ပါ။
2. **Add / အသစ်ထည့်** ခလုတ်ဖြင့် Worker Form ဖွင့်ပါ။
3. လိုအပ်သော အချက်အလက် ဖြည့်ပြီး Save လုပ်ပါ။

### အဓိက အချက်အလက်များ

- Serial No၊ အမည်၊ ကျား/မ၊ မွေးနေ့ (DOB)၊ Passport No
- Status — Active၊ Contract Ended၊ Absconded
- Deployment — Visa Type၊ Supervising Org၊ Host Company၊ Job Category
- ရက်စွဲများ — Own Card Date၊ Departure Date၊ Japan Entry Date၊ Contract End Date
- ငွေကြေး config — Flight Fee၊ Training Fee၊ Management Fee၊ Billing Cycle Months၊ Currency (JPY / MMK / USD)

Visa Type၊ Supervising Org၊ Host Company၊ Job Category တို့သည် Settings → System Variables တွင် သတ်မှတ်ထားသော တန်ဖိုးများနှင့် ကိုက်ညီသင့်သည်။

### Excel Import / Template

1. Workers စာမျက်နှာတွင် **Template** ဒေါင်းလုပ်လုပ်ပါ။
2. Excel တွင် ကော်လံခေါင်းစဉ်များကို မပြောင်းဘဲ ဖြည့်ပါ။
3. ဖိုင်ကို **Import** ဖြင့် တင်ပါ။

### Export

Workers စာရင်းကို Excel / PDF အဖြစ် Export လုပ်နိုင်သည်။

## Students (ကျောင်းသား)

1. **Students** မီနူးသို့ သွားပါ။
2. အသစ်ထည့် / ပြင် / ဖျက် / status ပြောင်း — Workers နှင့် ဆင်တူစီးဆင်းမှု။
3. Introduction Fee invoices သည် **School အလိုက်** ဖန်တီးသည် (ကျောင်းတစ်ခုအောက်ရှိ ကျောင်းသားများ စုပေါင်း)။

## Deployments

- Deployment အချက်အလက် (ဗီဇာ၊ ကုမ္ပဏီ၊ ရက်စွဲများ) ကို Workers / Students ဖောင်မှတဆင့် စီမံသည်။
- Deployments မီနူးသည် deployment ရှုထောင့်မှ စာရင်းကြည့်ရန် ဖြစ်သည်။

## Invoices (Worker — Host Company Billing)

### အဓိက သဘောတရား

- Invoice တစ်စောင်သည် **Host Company တစ်ခု** အတွက် ဖြစ်သည် (Supervising Org + Host)။
- ထို host အောက်ရှိ workers များကို **line items** အဖြစ် ထည့်သည်။
- Fee tabs — **Management Fee**၊ **Flight Fee**၊ **Training Fee**။

### Invoice အသစ် ဖန်တီးရန်

1. **Invoices** မီနူး → fee tab ရွေးပါ။
2. **Create Invoice** နှိပ်ပါ။
3. Supervising Org → Host Company ရွေးပါ (workers/lines အလိုအလျောက် ပေါ်မည်)။
4. **Formal Invoice fields** ဖြည့်ရမည် (မဖြည့်ရင် Save မရ) —
   - **Billed To (Attn)** — လက်ခံသူအမည် / ဌာန
   - **Subject** — ငွေတောင်းခံ ခေါင်းစဉ်
   - **Tax Rate** — 0% / 8% / 10% (ဂျပန် consumption tax)
   - **Bank Account** — Settings တွင် မှတ်ထားသော အကောင့်မှ dropdown ရွေးပါ
5. Save လုပ်ပါ။

### ငွေတွက်ချက်မှု (အရေးကြီး)

- **Total Amount (subtotal)** = tax မပါသော စုစုပေါင်း (line amounts ပေါင်း)
- **Tax Amount** = subtotal × tax rate
- **Amount Due** = subtotal + tax — **ပေးချေမှုများသည် Amount Due ကို အခြေခံသည်**
- **Outstanding** = Amount Due − Amount Received
- Status — Pending / Partial / Paid (ကျန်ငွေ ၀ ဖြစ်ရင် Paid)

### Invoice ကြည့် / မျှဝေရန် (Formal Digital Invoice)

1. Host card ကို နှိပ် → Fee Detail စာမျက်နှာ။
2. Invoice အတန်းရှိ **View (မျက်လုံး)** သို့မဟုတ် **Invoice Preview** နှိပ်ပါ။
3. Formal invoice ဖွင့်မည် — Excel ပုံစံနှင့် ဆင်တူသော်လည်း **A4 ပုံနှိပ်မဟုတ်**၊ digital share အတွက် ဖြစ်သည်။
4. **Copy image** သို့မဟုတ် **PDF Download** သုံးပါ (chat / email မျှဝေရန်)။
5. **Voucher 1 / Voucher 2** tabs — Settings → Print Setting တွင် သတ်မှတ်ထားသော letterhead နှစ်ခု ပြောင်းကြည့်နိုင်သည်။

### ပေးချေမှု (Record Payment)

1. Fee Detail တွင် **Pay** နှိပ်ပါ (Paid / outstanding = ၀ ဖြစ်ရင် Pay **မပေါ်**).
2. ပမာဏသည် outstanding ထက် မပိုရ (ပိုရိုက်ရင် error)။
3. Partial / Full ပေးချေပြီးနောက် outstanding နှင့် status အလိုအလျောက် ပြောင်းသည်။
4. Payment voucher ကို View ဖြင့် ဖွင့်နိုင်သည် — formal invoice ပုံစံတူ layout + Copy / PDF။

### Invoice Edit သတိ

- Attn / Subject / Bank Account မရှိသော invoice ဟောင်းများကို Edit လုပ်ရင် ဖြည့်မှ Save ရမည်။
- Tax rate ပြောင်းရင် outstanding ပြန်တွက်သည်။

## Student Invoices (School Billing)

- Students / Introduction Fee အပိုင်းမှ **School** အလိုက် invoice ဖန်တီးသည်။
- Formal fields (Attn, Subject, Tax Rate, Bank Account) — Worker invoice နှင့် **တူညီ**။
- View → Formal invoice / Copy / PDF / Voucher 1–2 tabs တူညီ။
- Payment + overpayment ကာကွယ်မှု တူညီ။

## Reports

Reports မီနူးအောက်တွင် —

- **Fees** — Worker fee payments (host line-item invoices ပါ အပါအဝင်၊ tax-inclusive due)
- **Students** — ကျောင်းသား introduction fee status
- **Upcoming** — လာမည့် management invoice ရက်များ
- **Outstanding** — ကျန်ငွေရှိသော invoices (host invoices အပါအဝင်)
- **Expiry** — စာချုပ်ကုန်ဆုံးမည့်သူများ

## Settings

### Print Setting (Voucher 1 / Voucher 2)

- အေဂျင်စီ letterhead နှစ်ခု သတ်မှတ်နိုင်သည်။
- Logo၊ Agency Name၊ Address၊ Phone၊ **Registration No.**၊ **FAX**။
- Invoice / Payment voucher preview တွင် Voucher 1 သို့မဟုတ် 2 ရွေးပြနိုင်သည်။

### Bank Accounts (သီးခြား tab)

1. Settings → **Bank Accounts**။
2. Bank Name၊ Account Number၊ Account Holder စသည် ထည့်ပါ (default အကောင့် သတ်မှတ်နိုင်)။
3. Invoice ဖန်တီး/ပြင်သည့်အခါ dropdown မှ ရွေးသည် — ရွေးချိန်က snapshot အဖြစ် invoice ပေါ်တွင် မှတ်သည်။

### Currency Exchange

- ပြသမည့် ငွေကြေးနှင့် ငွေလဲနှုန်း။

### System Variables

- visa_type၊ supervising_org၊ host_company၊ job_category၊ school စသည့် dropdown တန်ဖိုးများ။

### User Accounts

- အသုံးပြုသူအကောင့်နှင့် module permissions။

## အသုံးပြု အဆင့်လိုက် (အကြံပြု)

1. Settings → Variables (Host / Org / School) ဖြည့်ပါ။
2. Settings → Print Setting (Voucher 1/2) + Registration / FAX။
3. Settings → Bank Accounts — အနည်းဆုံး ၁ ခု။
4. Workers / Students ထည့်ပါ။
5. Invoices → Create (Attn, Subject, Tax, Bank)။
6. View → Copy / PDF မျှဝေပါ။
7. Pay → Payment voucher View။

## ဘာသာစကား UI

- အက်ပ် UI တွင် မြန်မာ / အင်္ဂလိပ် / ဂျပန် ပြောင်းနိုင်သည် (Language dropdown)။
- Help Chat ကူညီသူက **မြန်မာဘာသာဖြင့်သာ** မေး/ဖြေသည်။
- တစ်ရက်လျှင် အသုံးပြုသူတစ်ဦး အကြိမ် ၃၀ အထိ မေးနိုင်သည်။

## မလုပ်သင့် / မဖြေသင့်သောအရာများ

Help assistant သည် —

- ဤ AgencyMS ဆော့ဖ်ဝဲ အသုံးပြုနည်းသာ ရှင်းပြရမည်။
- ရာဇဝတ်မှု၊ hacking၊ API key ခိုးယူခြင်း၊ ပြင်ပအထွေထွေအကြောင်းအရာ မဖြေရ။
- ဒေတာဘေ့စ်ထဲရှိ တကယ့် worker/invoice မှတ်တမ်း တစ်ခုချင်းကို ရှာမပေးနိုင် (စာရွက်လမ်းညွှန်အဆင့်သာ)။
- Docs တွင် မပါသော လုပ်ဆောင်ချက်ကို မှန်းမဖြေဘဲ မသိကြောင်း ပြောရမည်။
