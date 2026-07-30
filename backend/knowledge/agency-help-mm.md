# AgencyMS အသုံးပြုလမ်းညွှန် (မြန်မာ)

ဤစာရွက်သည် Overseas Employment Agency Worker & Invoice Management System (AgencyMS) အတွက် အကူအညီစာရွက်ဖြစ်သည်။

## စနစ်အကြောင်း အတိုချုပ်

AgencyMS သည် ဂျပန်အလုပ်အကိုင် ကိုယ်စားလှယ်အေဂျင်စီများအတွက် အလုပ်သမား (Workers)၊ ကျောင်းသား (Students)၊ ငွေတောင်းခံလွှာ (Invoices)၊ အစီရင်ခံစာများ (Reports) နှင့် ဆက်တင်များကို စီမံခန့်ခွဲသည့် ဝက်ဘ်အက်ပ်ဖြစ်သည်။

အဓိက မီနူးများ — Dashboard၊ Workers၊ Students၊ Deployments၊ Invoices၊ Reports၊ Settings၊ Notifications။

## Login / အကောင့်

- အကောင့်ဖြင့် ဝင်ရောက်ရသည်။
- အသုံးပြုသူတိုင်းတွင် ခွင့်ပြုချက် (permissions) ရှိသည် — ဖတ်ရန်၊ ထည့်ရန်၊ ပြင်ရန်၊ ဖျက်ရန်။
- ခွင့်မရှိသော မီနူးကို မမြင်ရ သို့မဟုတ် သုံးမရပါ။
- Admin သို့မဟုတ် users ခွင့်ရှိသူက Settings → Users မှ အကောင့်နှင့် ခွင့်ပြုချက် စီမံနိုင်သည်။

## Dashboard

- စုစုပေါင်း အလုပ်သမား၊ ကျောင်းသား၊ ငွေတောင်းခံလွှာ အခြေအနေ၊ စာချုပ်ကုန်ဆုံးမည့်သူများ စသည့် အနှစ်ချုပ်ကို ပြသည်။
- အချက်အလက် ပြင်ဆင်လိုပါက သက်ဆိုင်ရာ မီနူး (Workers / Invoices စသည်) သို့ သွားပါ။

## Workers (အလုပ်သမား)

### ဘယ်မှာ ထည့်ရမလဲ

1. ဘယ်ဘက် Sidebar (သို့ မိုဘိုင်း Bottom Nav) မှ **Workers** ကို နှိပ်ပါ။
2. **Add / အသစ်ထည့်** ခလုတ်ဖြင့် Worker Form ဖွင့်ပါ။
3. လိုအပ်သော အချက်အလက် ဖြည့်ပြီး Save လုပ်ပါ။

### အဓိက အချက်အလက်များ

- Serial No၊ အမည်၊ ကျား/မ၊ မွေးနေ့ (DOB)၊ Passport No
- Status — Active၊ Contract Ended၊ Absconded
- Absconded Date (Absconded ဖြစ်မှ)၊ Notes
- Deployment — Visa Type၊ Supervising Org၊ Host Company၊ Job Category
- ရက်စွဲများ — Own Card Date၊ Departure Date၊ Japan Entry Date၊ Contract End Date
- ငွေကြေး — Flight Fee၊ Training Fee၊ Management Fee၊ Billing Cycle Months၊ Currency (JPY / MMK / USD)

Visa Type၊ Supervising Org၊ Host Company၊ Job Category တို့သည် Settings → Variables တွင် သတ်မှတ်ထားသော တန်ဖိုးများနှင့် ကိုက်ညီသင့်သည်။

### ပြင်ရန် / ဖျက်ရန် / အသေးစိတ်

- စာရင်းမှ အလုပ်သမားကို ရွေးပြီး Edit သို့မဟုတ် Detail ကြည့်နိုင်သည်။
- ဖျက်ရန် Delete သုံးပါ (ဆက်စပ် invoice စသည် ရှိပါက သတိပေးချက် ထွက်နိုင်သည်)။
- Status ပြောင်းနိုင်သည် (Active / Contract Ended / Absconded)။

### Excel Import / Template

1. Workers စာမျက်နှာတွင် **Template** ဒေါင်းလုပ်လုပ်ပါ။
2. Excel တွင် ကော်လံခေါင်းစဉ်များကို မပြောင်းဘဲ ဖြည့်ပါ။
3. ဖိုင်ကို **Import** ဖြင့် တင်ပါ။

လိုအပ်သော ကော်လံများ (အနည်းဆုံး) — Name၊ Passport No၊ Visa Type၊ Supervising Org၊ Host Company၊ Job Category။

အခြားကော်လံများ — Serial No၊ Gender၊ DOB၊ Status၊ Absconded Date၊ Notes၊ ရက်စွဲများ၊ Fee များ၊ Billing Cycle၊ Currency။

မှားယွင်းသော အတန်းများရှိပါက Import မအောင်မြင်ဘဲ အမှားစာရင်း ပြမည်။ Template ထဲရှိ Settings Reference sheet ကို ကြည့်ပြီး Variables တန်ဖိုးများကို ကိုက်အောင် ထည့်ပါ။

### Export

Workers စာရင်းကို Excel / PDF အဖြစ် Export လုပ်နိုင်သည်။

## Students (ကျောင်းသား)

1. **Students** မီနူးသို့ သွားပါ။
2. အသစ်ထည့် / ပြင် / ဖျက် / status ပြောင်း — Workers နှင့် ဆင်တူစီးဆင်းမှု။
3. ကျောင်းသားငွေတောင်းခံလွှာများသည် Student Invoices အပိုင်းတွင် စီမံသည်။

## Deployments

- Deployment အချက်အလက် (ဗီဇာ၊ ကုမ္ပဏီ၊ ရက်စွဲများ) ကို Workers / ဖောင်မှတဆင့် စီမံသည်။
- Deployments မီနူးသည် deployment ရှုထောင့်မှ စာရင်းကြည့်ရန် ဖြစ်သည်။

## Invoices (အလုပ်သမား ငွေတောင်းခံလွှာ)

### ဘယ်မှာ ထည့်ရမလဲ

1. **Invoices** မီနူးသို့ သွားပါ။
2. အသစ်ဖန်တီးရန် Create / Add သုံးပါ — Worker ကို ရွေးရမည်။
3. Billing period၊ ငွေပမာဏ၊ ရက်စွဲများ ဖြည့်ပြီး Save လုပ်ပါ။

### Worker Fee Detail

- Invoice နှင့် ဆက်စပ်သော worker အခကြေးငွေ အသေးစိတ်ကို Worker Fee Detail စာမျက်နှာမှ ကြည့် / စီမံနိုင်သည်။
- Flight / Training fee payments ကို fee payments အဖြစ် မှတ်တမ်းတင်နိုင်သည်။

### Status

- Pending၊ Partial၊ Paid၊ Overdue စသည့် အခြေအနေများ ရှိသည်။
- ပေးချေမှု မှတ်တမ်းတင်ပြီးနောက် outstanding (ကျန်ငွေ) ပြောင်းနိုင်သည်။
- Print / Receipt preview ဖြင့် ပုံနှိပ်/မျှဝေနိုင်သည်။

## Student Invoices

- Students အပိုင်း သို့မဟုတ် သက်ဆိုင်ရာ student invoice စာမျက်နှာမှ ကျောင်းသား ငွေတောင်းခံလွှာ ဖန်တီး / ပြင် / ပေးချေမှု လုပ်နိုင်သည်။
- Worker invoices နှင့် စီးဆင်းမှု ဆင်တူသော်လည်း student နှင့် ချိတ်ဆက်သည်။

## Reports

Reports မီနူးအောက်တွင် အပိုင်းများ ရှိသည် —

- **Fees** — အခကြေးငွေ ဆိုင်ရာ
- **Students** — ကျောင်းသား ဆိုင်ရာ
- **Upcoming** — လာမည့် ငွေတောင်းခံ / အရေးကြီးရက်များ
- **Outstanding** — ကျန်ငွေ
- **Expiry** — စာချုပ်ကုန်ဆုံးမည့်သူများ

လိုအပ်သော report အမျိုးအစားကို Sidebar / Bottom Nav မှ ရွေးပါ။

## Notifications

- စာချုပ်ကုန်ဆုံးခါနီး၊ အရေးကြီး invoice စသည့် သတိပေးချက်များ ပြသည်။
- Web Push ဖွင့်ထားပါက browser သတိပေးချက် ရနိုင်သည် (backend တွင် VAPID keys လိုသည်)။

## Settings

Settings မီနူးတွင် —

### Print

- Receipt / invoice ပုံနှိပ် ဆက်တင် (အေဂျင်စီအမည်၊ လိပ်စာ၊ လိုဂို စသည်)။

### Currency

- ပြသမည့် ငွေကြေး (ဥပမာ JPY / MMK) နှင့် ငွေလဲနှုန်း။

### Variables

- စနစ်ကိန်းရှင်များ — visa_type၊ supervising_org၊ host_company၊ job_category စသည့် အမျိုးအစားများ။
- Worker / Student ဖောင်များတွင် ရွေးချယ်စရာအဖြစ် သုံးသည်။
- အသစ်ထည့်၊ ပြင်၊ ဖျက်၊ active/inactive လုပ်နိုင်သည်။

### Users

- အသုံးပြုသူအကောင့် ဖန်တီး / ပြင် / ဖျက်။
- Module တိုင်းအတွက် create / read / update / delete ခွင့်ပြုချက် သတ်မှတ်။

## ဘာသာစကား UI

- အက်ပ် UI တွင် အင်္ဂလိပ် / ဂျပန် ပြောင်းနိုင်သည် (Language dropdown)။
- Help Chat ကူညီသူက မြန်မာဘာသာဖြင့်သာ မေး/ဖြေသည်။

## မလုပ်သင့် / မဖြေသင့်သောအရာများ

Help assistant သည် —

- ဤ AgencyMS ဆော့ဖ်ဝဲ အသုံးပြုနည်းသာ ရှင်းပြရမည်။
- ရာဇဝတ်မှု၊ hacking၊ API key ခိုးယူခြင်း၊ ပြင်ပအထွေထွေအကြောင်းအရာ မဖြေရ။
- ဒေတာဘေ့စ်ထဲရှိ တကယ့် worker/invoice မှတ်တမ်း တစ်ခုချင်းကို ရှာမပေးနိုင် (စာရွက်လမ်းညွှန်အဆင့်သာ)။
- Docs တွင် မပါသော လုပ်ဆောင်ချက်ကို မှန်းမဖြေဘဲ မသိကြောင်း ပြောရမည်။
