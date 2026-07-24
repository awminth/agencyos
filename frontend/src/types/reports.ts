export type ReportSection = 'fees' | 'students' | 'upcoming' | 'outstanding' | 'expiry';

export const REPORT_SECTIONS: ReportSection[] = [
  'fees',
  'students',
  'upcoming',
  'outstanding',
  'expiry',
];

export function reportSectionLabelKey(section: ReportSection): string {
  switch (section) {
    case 'fees':
      return 'reports.tabFees';
    case 'students':
      return 'reports.tabStudents';
    case 'upcoming':
      return 'reports.tabUpcoming';
    case 'outstanding':
      return 'reports.tabOutstanding';
    case 'expiry':
      return 'reports.tabExpiry';
  }
}
