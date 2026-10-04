import type { NextFunction, Request, Response } from 'express';

export class AppError extends Error {
  statusCode: number;
  /** Optional per-row / field warnings (e.g. Excel import validation). */
  warnings?: string[];

  constructor(message: string, statusCode = 400, warnings?: string[]) {
    super(message);
    this.statusCode = statusCode;
    this.warnings = warnings;
  }
}

type MysqlLikeError = {
  code?: string;
  errno?: number;
  sqlMessage?: string;
  message?: string;
};

const COLUMN_LABELS: Record<string, string> = {
  own_card_date: 'Own Card Date (ကိုယ်ပိုင်ကတ် ရက်စွဲ)',
  departure_date: 'Departure Date (ထွက်ခွာရက်)',
  japan_entry_date: 'Japan Entry Date (ဂျပန်ဝင်ရောက်ရက်)',
  contract_end_date: 'Contract End Date (စာချုပ်ကုန်ဆုံးရက်)',
  last_invoice_date: 'Last Invoice Date',
  next_invoice_date: 'Invoice Date',
  absconded_date: 'Absconded Date',
  dob: 'DOB (မွေးနေ့)',
  passport_no: 'Passport No',
  serial_no: 'Serial No',
  name: 'Name (အမည်)',
  visa_type: 'Visa Type',
  supervising_org: 'Supervising Org',
  host_company: 'Host Company',
  job_category: 'Job Category',
  gender: 'Gender',
  status: 'Status',
  worker_id: 'Worker',
  invoice_no: 'Invoice No',
  email: 'Email',
};

function extractColumnName(sqlMsg: string): string | null {
  const m =
    sqlMsg.match(/column\s+'([^']+)'/i) ||
    sqlMsg.match(/for key\s+'([^']+)'/i) ||
    sqlMsg.match(/field\s+'([^']+)'/i);
  return m?.[1] || null;
}

function columnLabel(col: string | null): string {
  if (!col) return 'လိုအပ်သော အကွက်';
  return COLUMN_LABELS[col] || col;
}

/** Map MySQL errors to short user-facing Myanmar/English messages. */
export function friendlyMysqlMessage(err: MysqlLikeError): string | null {
  const code = err.code || '';
  const sqlRaw = err.sqlMessage || err.message || '';
  const sqlMsg = sqlRaw.toLowerCase();
  const col = extractColumnName(sqlRaw);
  const label = columnLabel(col);

  if (code === 'ER_DATA_TOO_LONG' || err.errno === 1406) {
    if (col) return `${label} ရှည်လွန်းပါသည်။ အတိုချုံ့၍ ပြန်ထည့်ပါ။`;
    if (sqlMsg.includes('passport')) {
      return 'Passport နံပါတ် ရှည်လွန်းပါသည်။ အတိုချုံ့၍ ပြန်ထည့်ပါ။';
    }
    if (sqlMsg.includes('serial')) {
      return 'စဉ် / Serial No ရှည်လွန်းပါသည်။ အတိုချုံ့၍ ပြန်ထည့်ပါ။';
    }
    if (sqlMsg.includes('name')) {
      return 'အမည် ရှည်လွန်းပါသည်။ အတိုချုံ့၍ ပြန်ထည့်ပါ။';
    }
    if (sqlMsg.includes("'id'")) {
      return 'စနစ် ID ဖန်တီးမှု မှားယွင်းနေပါသည်။ ပြန်လည် သိမ်းဆည်းကြည့်ပါ။';
    }
    return 'ထည့်သွင်းထားသော အချက်အလက် တစ်ခုခု ရှည်လွန်း/မကိုက်ညီပါ။ စစ်ဆေးပြီး ပြန်ထည့်ပါ။';
  }

  if (code === 'ER_DUP_ENTRY' || err.errno === 1062) {
    if (col?.includes('serial') || sqlMsg.includes('serial')) {
      return 'ဤ Serial No ကို အခြားအလုပ်သမားက သုံးပြီးသား ဖြစ်နေပါသည်။';
    }
    if (col?.includes('passport') || sqlMsg.includes('passport')) {
      return 'ဤ Passport နံပါတ် ရှိပြီးသား ဖြစ်နေပါသည်။';
    }
    if (sqlMsg.includes('invoice')) {
      return 'ဤ Invoice နံပါတ် ရှိပြီးသား ဖြစ်နေပါသည်။';
    }
    if (sqlMsg.includes('email')) {
      return 'ဤ Email ရှိပြီးသား ဖြစ်နေပါသည်။';
    }
    return `${label} ထပ်နေပါသည်။ ကွဲပြားသော တန်ဖိုးဖြင့် ပြန်ထည့်ပါ။`;
  }

  if (code === 'ER_BAD_NULL_ERROR' || err.errno === 1048) {
    return `${label} ဖြည့်ရန် လိုအပ်ပါသည် (ဗလာ မထားရပါ)။ Excel တွင် ရက်စွဲ/တန်ဖိုး ဖြည့်ပြီး ပြန် Import လုပ်ပါ။`;
  }

  if (code === 'ER_TRUNCATED_WRONG_VALUE' || code === 'ER_WRONG_VALUE' || err.errno === 1292) {
    if (col) {
      return `${label} ပုံစံ မှားနေပါသည်။ ရက်စွဲဆိုရင် DD.MM.YYYY သို့မဟုတ် YYYY-MM-DD သုံးပါ။`;
    }
    return 'ရက်စွဲ သို့မဟုတ် ဂဏန်းပုံစံ မှားနေပါသည်။ DD.MM.YYYY သို့မဟုတ် YYYY-MM-DD ဖြင့် ပြန်စစ်ဆေးပါ။';
  }

  if (code === 'ER_NO_REFERENCED_ROW_2' || err.errno === 1452) {
    return 'ချိတ်ဆက်ရမည့် အချက်အလက် (အလုပ်သမား စသဖြင့်) မတွေ့ပါ။';
  }

  return null;
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.message,
      ...(err.warnings?.length ? { warnings: err.warnings } : {}),
    });
    return;
  }

  const mysqlMsg = friendlyMysqlMessage(err as MysqlLikeError);
  if (mysqlMsg) {
    console.error(err);
    res.status(400).json({ error: mysqlMsg, warnings: [mysqlMsg] });
    return;
  }

  console.error(err);
  res.status(500).json({
    error: 'သိမ်းဆည်း၍ မရပါ။ အချက်အလက်များကို စစ်ဆေးပြီး ထပ်မံ ကြိုးစားပါ။',
  });
}

export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}
