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

function friendlyMysqlMessage(err: MysqlLikeError): string | null {
  const code = err.code || '';
  const sqlMsg = (err.sqlMessage || err.message || '').toLowerCase();

  if (code === 'ER_DATA_TOO_LONG' || err.errno === 1406) {
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
    if (sqlMsg.includes('serial') || sqlMsg.includes('serial_no')) {
      return 'ဤ Serial No ကို အခြားအလုပ်သမားက သုံးပြီးသား ဖြစ်နေပါသည်။';
    }
    if (sqlMsg.includes('passport')) {
      return 'ဤ Passport နံပါတ် ရှိပြီးသား ဖြစ်နေပါသည်။';
    }
    if (sqlMsg.includes('invoice')) {
      return 'ဤ Invoice နံပါတ် ရှိပြီးသား ဖြစ်နေပါသည်။';
    }
    if (sqlMsg.includes('email')) {
      return 'ဤ Email ရှိပြီးသား ဖြစ်နေပါသည်။';
    }
    return 'ထည့်သွင်းသော အချက်အလက် ထပ်နေပါသည်။ ကွဲပြားသော တန်ဖိုးဖြင့် ပြန်ထည့်ပါ။';
  }

  if (code === 'ER_BAD_NULL_ERROR' || err.errno === 1048) {
    return 'လိုအပ်သော အကွက်များ ဖြည့်ရန် ကျန်ရှိနေပါသည်။';
  }

  if (code === 'ER_TRUNCATED_WRONG_VALUE' || code === 'ER_WRONG_VALUE' || err.errno === 1292) {
    return 'ရက်စွဲ သို့မဟုတ် ဂဏန်းပုံစံ မှားနေပါသည်။ ပြန်စစ်ဆေးပါ။';
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
    res.status(400).json({ error: mysqlMsg });
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
