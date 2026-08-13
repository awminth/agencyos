export interface PrintLetterhead {
  agencyName: string;
  address: string;
  phone: string;
  registrationNo: string;
  fax: string;
  logoData: string | null;
}

export const EMPTY_LETTERHEAD: PrintLetterhead = {
  agencyName: '',
  address: '',
  phone: '',
  registrationNo: '',
  fax: '',
  logoData: null,
};

export function parsePrintLetterheads(data: any): {
  voucher1: PrintLetterhead;
  voucher2: PrintLetterhead;
} {
  const mapOne = (src: any): PrintLetterhead => ({
    agencyName: src?.agencyName || '',
    address: src?.address || '',
    phone: src?.phone || '',
    registrationNo: src?.registrationNo || '',
    fax: src?.fax || '',
    logoData: src?.logoData || null,
  });

  if (data?.voucher1 || data?.voucher2) {
    return {
      voucher1: mapOne(data.voucher1),
      voucher2: mapOne(data.voucher2),
    };
  }

  const flat = mapOne(data);
  return { voucher1: flat, voucher2: { ...flat } };
}

export function letterheadContactLine(p: PrintLetterhead): string {
  return [
    p.address,
    p.phone ? `TEL: ${p.phone}` : '',
    p.fax ? `FAX: ${p.fax}` : '',
    p.registrationNo ? `Reg: ${p.registrationNo}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}
