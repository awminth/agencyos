/**
 * Overseas Employment Agency Worker & Invoice Management System
 * Main Application Shell with REST API Integration & Role Access Control
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Worker,
  Invoice,
  DashboardStats,
  UserRole,
  WorkerStatus,
  AuthUser,
  InvoiceFeeType,
  InvoiceWorkerSummary,
  Student,
  StudentInvoice,
  StudentInvoiceSchoolSummary,
} from './types';
import { Navbar } from './components/Navbar';
import { Sidebar, ActiveTab } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { WorkerManagement } from './components/WorkerManagement';
import { InvoiceManagement } from './components/InvoiceManagement';
import { ReportsView } from './components/ReportsView';
import { SettingsView } from './components/SettingsView';
import { WorkerFormPage } from './components/WorkerFormPage';
import { InvoiceFormPage } from './components/InvoiceFormPage';
import { WorkerFeeDetailPage } from './components/WorkerFeeDetailModal';
import { PrintableInvoiceModal } from './components/PrintableInvoiceModal';
import { HelpChat } from './components/HelpChat';
import { WorkerDetailModal } from './components/WorkerDetailModal';
import { LoginPage } from './components/LoginPage';
import { BottomNav } from './components/BottomNav';
import { NotificationsView } from './components/NotificationsView';
import { useLanguage } from './context/LanguageContext';
import { can, normalizePermissions } from './utils/permissions';
import { confirmDelete, showSuccess, showWarning } from './utils/swal';
import { parseApiResponse } from './utils/api';
import { StudentFormPage } from './components/StudentFormPage';
import { StudentManagement } from './components/StudentManagement';
import { StudentInvoiceManagement } from './components/StudentInvoiceManagement';
import { StudentInvoiceFormPage } from './components/StudentInvoiceFormPage';
import { StudentFeeDetailPage, buildSchoolSummaries } from './components/StudentFeeDetailPage';
import { StudentDetailModal } from './components/StudentDetailModal';
import type { ReportSection } from './types/reports';
import {
  alertKeyInvoice,
  alertKeyWorker,
  countUnreadAlerts,
  getNotifiedAlertIds,
  getUnreadAlertIds,
  markAlertsNotified,
  markAllAlertsRead,
  pruneAlertIdStores,
} from './utils/alertReadState';
import {
  getNotificationPermission,
  notifyUnreadAlerts,
  registerAppServiceWorker,
} from './utils/browserNotifications';
import { subscribeWebPush } from './utils/webPush';

type FormPage =
  | { kind: 'worker'; worker: Worker | null }
  | { kind: 'invoice'; invoice: Invoice | null }
  | { kind: 'invoiceWorker'; summary: InvoiceWorkerSummary }
  | { kind: 'student'; student: Student | null }
  | { kind: 'studentInvoice'; invoice: StudentInvoice | null }
  | { kind: 'studentFee'; summary: StudentInvoiceSchoolSummary };

function normalizeStoredUser(raw: unknown): AuthUser | null {
  if (!raw || typeof raw !== 'object') return null;
  const u = raw as Partial<AuthUser>;
  if (!u.id || !u.email || !u.role) return null;
  const role = u.role as UserRole;
  return {
    id: u.id,
    name: u.name || u.email,
    email: u.email,
    role,
    title: u.title || `${role} User`,
    permissions: normalizePermissions(u.permissions, role),
  };
}

function persistUserSession(user: AuthUser, rememberMe: boolean) {
  localStorage.removeItem('agency_os_user');
  sessionStorage.removeItem('agency_os_user');
  if (rememberMe) {
    localStorage.setItem('agency_os_user', JSON.stringify(user));
  } else {
    sessionStorage.setItem('agency_os_user', JSON.stringify(user));
  }
}

export default function App() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [reportSection, setReportSection] = useState<ReportSection>('fees');
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    const saved =
      localStorage.getItem('agency_os_user') || sessionStorage.getItem('agency_os_user');
    if (saved) {
      try {
        return normalizeStoredUser(JSON.parse(saved));
      } catch {
        return null;
      }
    }
    return null;
  });

  // Re-persist normalized permissions so newly added modules (e.g. students)
  // land in the stored session without forcing a re-login.
  useEffect(() => {
    if (!currentUser) return;
    const rememberMe = Boolean(localStorage.getItem('agency_os_user'));
    const inSession = Boolean(sessionStorage.getItem('agency_os_user'));
    if (!rememberMe && !inSession) return;
    persistUserSession(currentUser, rememberMe);
  }, [currentUser]);

  const handleLoginSuccess = (user: AuthUser, rememberMe: boolean) => {
    const normalized: AuthUser = {
      ...user,
      permissions: normalizePermissions(user.permissions, user.role),
    };
    setCurrentUser(normalized);
    persistUserSession(normalized, rememberMe);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('agency_os_user');
    sessionStorage.removeItem('agency_os_user');
  };

  // Data States
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [studentInvoices, setStudentInvoices] = useState<StudentInvoice[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Modal / Form States
  const [formPage, setFormPage] = useState<FormPage | null>(null);
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editingStudentInvoice, setEditingStudentInvoice] = useState<StudentInvoice | null>(null);
  const [createInvoiceFeeType, setCreateInvoiceFeeType] = useState<InvoiceFeeType>('management');
  const [createPreferredHostCompany, setCreatePreferredHostCompany] = useState<string | undefined>();
  const [createPreferredSupervisingOrg, setCreatePreferredSupervisingOrg] = useState<
    string | undefined
  >();
  const [invoiceWorkerReturn, setInvoiceWorkerReturn] = useState<InvoiceWorkerSummary | null>(null);
  const [createPreferredSchoolName, setCreatePreferredSchoolName] = useState<string | undefined>();
  const [studentFeeReturn, setStudentFeeReturn] = useState<StudentInvoiceSchoolSummary | null>(null);
  const [printableInvoice, setPrintableInvoice] = useState<Invoice | null>(null);
  const [selectedDetailWorker, setSelectedDetailWorker] = useState<Worker | null>(null);
  const [selectedStudentDetail, setSelectedStudentDetail] = useState<Student | null>(null);
  const [studentsView, setStudentsView] = useState<'profiles' | 'fees'>('profiles');

  const handleTabChange = (tab: ActiveTab) => {
    setFormPage(null);
    setEditingWorker(null);
    setEditingInvoice(null);
    setEditingStudent(null);
    setEditingStudentInvoice(null);
    setInvoiceWorkerReturn(null);
    setStudentFeeReturn(null);
    setCreatePreferredSchoolName(undefined);
    setActiveTab(tab);
  };

  // FETCH ALL DATA FROM BACKEND REST API
  const refreshAllData = async () => {
    try {
      const [sRes, wRes, iRes, stuRes, stuInvRes] = await Promise.all([
        fetch('/api/analytics').then(res => res.json()),
        fetch('/api/workers').then(res => res.json()),
        fetch('/api/invoices').then(res => res.json()),
        fetch('/api/students').then(res => res.json()),
        fetch('/api/student-invoices').then(res => res.json()),
      ]);

      setStats(sRes || null);
      setWorkers(wRes || []);
      setInvoices(iRes || []);
      setStudents(stuRes || []);
      setStudentInvoices(stuInvRes || []);
    } catch (err) {
      console.error('Failed to load system data from REST API:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshAllData();
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    const allowed = (tab: ActiveTab) => {
      if (tab === 'notifications') return true;
      if (tab === 'settings') {
        return (
          can(currentUser.permissions, 'settings', 'read') ||
          can(currentUser.permissions, 'users', 'read')
        );
      }
      return can(currentUser.permissions, tab, 'read');
    };
    if (!allowed(activeTab)) {
      const first =
        (['dashboard', 'workers', 'students', 'deployments', 'invoices', 'reports', 'settings'] as ActiveTab[]).find(
          allowed
        ) || 'dashboard';
      setActiveTab(first);
    }
  }, [currentUser, activeTab]);

  // WORKER CRUD HANDLERS
  const handleSaveWorker = async (payload: Partial<Worker>) => {
    const wasEdit = !!editingWorker;
    try {
      const res = editingWorker
        ? await fetch(`/api/workers/${editingWorker.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch('/api/workers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

      await parseApiResponse(res);
      setFormPage(null);
      setEditingWorker(null);
      await refreshAllData();
      await showSuccess(wasEdit ? 'Update အောင်မြင်ပါသည်' : 'Save အောင်မြင်ပါသည်');
    } catch (err) {
      console.error('Save worker failed', err);
      const message =
        err instanceof Error
          ? err.message
          : 'အလုပ်သမား သိမ်းဆည်းရာတွင် အမှားဖြစ်ပေါ်ခဲ့ပါသည်။';
      await showWarning('အချက်အလက် စစ်ဆေးရန်', message);
      // Stay on form page so user can correct and retry
    }
  };

  const handleDeleteWorker = async (id: string) => {
    type RelatedPayload = {
      workerName: string;
      serialNo: string;
      invoiceCount: number;
      invoices: { invoiceNo: string; status: string }[];
      hasRelated: boolean;
    };

    let related: RelatedPayload | null = null;
    try {
      const relatedRes = await fetch(`/api/workers/${id}/related`);
      related = await parseApiResponse<RelatedPayload>(relatedRes);
    } catch (err) {
      console.error(err);
      await showWarning(
        t('workers.deleteLoadFail'),
        err instanceof Error ? err.message : undefined
      );
      return;
    }

    const escapeHtml = (value: string) =>
      value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;');

    let ok = false;
    if (related?.hasRelated) {
      const listItems = related.invoices
        .slice(0, 8)
        .map(
          (inv) =>
            `<li><code>${escapeHtml(inv.invoiceNo)}</code> <span>(${escapeHtml(inv.status)})</span></li>`
        )
        .join('');
      const more =
        related.invoiceCount > 8
          ? `<li>… +${related.invoiceCount - 8}</li>`
          : '';

      ok = await confirmDelete({
        tone: 'warning',
        title: t('workers.deleteRelatedTitle'),
        html: `
          <p class="agency-swal__msg">${escapeHtml(
            t('workers.deleteRelatedText', {
              name: related.workerName,
              serial: related.serialNo,
              count: related.invoiceCount,
            })
          )}</p>
          <p class="agency-swal__msg" style="margin-top:0.75rem;font-weight:600">${escapeHtml(
            t('workers.deleteRelatedList')
          )}</p>
          <ul class="agency-swal__msg" style="text-align:left;margin:0.35rem auto 0;max-width:18rem;padding-left:1.25rem">
            ${listItems}${more}
          </ul>
        `,
        confirmText: t('workers.deleteConfirmHard'),
        cancelText: t('workers.deleteCancel'),
      });
    } else {
      const name = related?.workerName || id;
      ok = await confirmDelete({
        title: t('workers.deleteTitle'),
        text: t('workers.deleteSimple', { name }),
        confirmText: t('workers.deleteConfirmSimple'),
        cancelText: t('workers.deleteCancel'),
      });
    }

    if (!ok) return;

    try {
      const res = await fetch(`/api/workers/${id}`, { method: 'DELETE' });
      const result = await parseApiResponse<{ deletedInvoices?: number }>(res);
      await refreshAllData();
      const deletedCount = result.deletedInvoices ?? related?.invoiceCount ?? 0;
      await showSuccess(
        deletedCount > 0
          ? t('workers.deletedWithRelated', { count: deletedCount })
          : t('workers.deleted')
      );
    } catch (err) {
      console.error(err);
      await showWarning(
        t('workers.deleteFail'),
        err instanceof Error ? err.message : undefined
      );
    }
  };

  const handleWorkerStatusChange = async (worker: Worker, newStatus: WorkerStatus) => {
    try {
      const body: Partial<Worker> = { status: newStatus };
      if (newStatus === 'Absconded') {
        body.abscondedDate =
          worker.abscondedDate || new Date().toISOString().split('T')[0];
        if (worker.notes) body.notes = worker.notes;
      }
      const res = await fetch(`/api/workers/${worker.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      await parseApiResponse(res);
      refreshAllData();
    } catch (err) {
      console.error(err);
      await showWarning(
        'အခြေအနေ ပြောင်း၍ မရပါ',
        err instanceof Error ? err.message : 'ထပ်မံ ကြိုးစားပါ'
      );
    }
  };

  const handleSaveStudent = async (payload: Partial<Student>) => {
    const wasEdit = !!editingStudent;
    try {
      const res = editingStudent
        ? await fetch(`/api/students/${editingStudent.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch('/api/students', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

      await parseApiResponse(res);
      setFormPage(null);
      setEditingStudent(null);
      await refreshAllData();
      await showSuccess(wasEdit ? 'Update အောင်မြင်ပါသည်' : 'Save အောင်မြင်ပါသည်');
    } catch (err) {
      console.error('Save student failed', err);
      const message =
        err instanceof Error
          ? err.message
          : 'Student သိမ်းဆည်းရာတွင် အမှားဖြစ်ပေါ်ခဲ့ပါသည်။';
      await showWarning(t('students.incompleteTitle'), message);
    }
  };

  const handleDeleteStudent = async (id: string) => {
    type RelatedPayload = {
      studentName: string;
      serialNo: string;
      invoiceCount: number;
      invoices: { invoiceNo: string; status: string }[];
      hasRelated: boolean;
    };

    let related: RelatedPayload | null = null;
    try {
      const relatedRes = await fetch(`/api/students/${id}/related`);
      related = await parseApiResponse<RelatedPayload>(relatedRes);
    } catch (err) {
      console.error(err);
      await showWarning(
        t('students.deleteLoadFail'),
        err instanceof Error ? err.message : undefined
      );
      return;
    }

    const escapeHtml = (value: string) =>
      value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;');

    let ok = false;
    if (related?.hasRelated) {
      const listItems = related.invoices
        .slice(0, 8)
        .map(
          (inv) =>
            `<li><code>${escapeHtml(inv.invoiceNo)}</code> <span>(${escapeHtml(inv.status)})</span></li>`
        )
        .join('');
      const more =
        related.invoiceCount > 8
          ? `<li>… +${related.invoiceCount - 8}</li>`
          : '';

      ok = await confirmDelete({
        tone: 'warning',
        title: t('students.deleteRelatedTitle'),
        html: `
          <p class="agency-swal__msg">${escapeHtml(
            t('students.deleteRelatedText', {
              name: related.studentName,
              serial: related.serialNo,
              count: related.invoiceCount,
            })
          )}</p>
          <p class="agency-swal__msg" style="margin-top:0.75rem;font-weight:600">${escapeHtml(
            t('students.deleteRelatedList')
          )}</p>
          <ul class="agency-swal__msg" style="text-align:left;margin:0.35rem auto 0;max-width:18rem;padding-left:1.25rem">
            ${listItems}${more}
          </ul>
        `,
        confirmText: t('students.deleteConfirmHard'),
        cancelText: t('students.deleteCancel'),
      });
    } else {
      const name = related?.studentName || id;
      ok = await confirmDelete({
        title: t('students.deleteTitle'),
        text: t('students.deleteSimple', { name }),
        confirmText: t('students.deleteConfirmSimple'),
        cancelText: t('students.deleteCancel'),
      });
    }

    if (!ok) return;

    try {
      const res = await fetch(`/api/students/${id}`, { method: 'DELETE' });
      const result = await parseApiResponse<{ deletedInvoices?: number }>(res);
      await refreshAllData();
      const deletedCount = result.deletedInvoices ?? related?.invoiceCount ?? 0;
      await showSuccess(
        deletedCount > 0
          ? t('students.deletedWithRelated', { count: deletedCount })
          : t('students.deleted')
      );
    } catch (err) {
      console.error(err);
      await showWarning(
        t('students.deleteFail'),
        err instanceof Error ? err.message : undefined
      );
    }
  };

  const handleStudentStatusChange = async (student: Student, newStatus: WorkerStatus) => {
    try {
      const body: Partial<Student> = { status: newStatus };
      if (newStatus === 'Absconded') {
        body.abscondedDate =
          student.abscondedDate || new Date().toISOString().split('T')[0];
        if (student.notes) body.notes = student.notes;
      }
      const res = await fetch(`/api/students/${student.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      await parseApiResponse(res);
      refreshAllData();
    } catch (err) {
      console.error(err);
      await showWarning(
        'အခြေအနေ ပြောင်း၍ မရပါ',
        err instanceof Error ? err.message : 'ထပ်မံ ကြိုးစားပါ'
      );
    }
  };

  const handleOpenStudentFeeForStudent = (student: Student) => {
    const schoolName = student.deployment.supervisingOrg || '';
    const summaries = buildSchoolSummaries(studentInvoices);
    const summary =
      summaries.find((item) => item.schoolName === schoolName) || {
        schoolName: schoolName || '—',
        studentCount: 1,
        feeType: 'introduction' as const,
        totalAmount: 0,
        totalPaid: 0,
        remainAmount: 0,
        invoiceCount: 0,
        paymentCount: 0,
      };
    setStudentsView('fees');
    setFormPage({ kind: 'studentFee', summary });
  };

  // INVOICE CRUD HANDLERS
  const handleSaveInvoice = async (payload: Partial<Invoice>) => {
    const wasEdit = !!editingInvoice;
    try {
      const res = editingInvoice
        ? await fetch(`/api/invoices/${editingInvoice.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch('/api/invoices', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

      await parseApiResponse(res);
      const returnTo = invoiceWorkerReturn;
      setEditingInvoice(null);
      setCreatePreferredHostCompany(undefined);
      setCreatePreferredSupervisingOrg(undefined);
      setInvoiceWorkerReturn(null);
      setFormPage(returnTo ? { kind: 'invoiceWorker', summary: returnTo } : null);
      await refreshAllData();
      await showSuccess(wasEdit ? 'Update အောင်မြင်ပါသည်' : 'Invoice ထုတ်ပြီးပါပြီ');
    } catch (err) {
      console.error('Save invoice failed', err);
      const message =
        err instanceof Error
          ? err.message
          : 'Invoice သိမ်းဆည်းရာတွင် အမှားဖြစ်ပေါ်ခဲ့ပါသည်။';
      await showWarning('အချက်အလက် စစ်ဆေးရန်', message);
    }
  };

  const handleDeleteInvoice = async (id: string) => {
    const ok = await confirmDelete({
      title: 'Invoice ဖျက်မည်?',
      text: 'ဤ Invoice အား ဖျက်ရန် သေချာပါသလား?',
    });
    if (!ok) return;
    try {
      const res = await fetch(`/api/invoices/${id}`, { method: 'DELETE' });
      await parseApiResponse(res);
      await refreshAllData();
      await showSuccess('ဖျက်ပြီးပါပြီ');
    } catch (err) {
      console.error(err);
      await showWarning(
        'ဖျက်၍ မရပါ',
        err instanceof Error ? err.message : 'ထပ်မံ ကြိုးစားပါ'
      );
    }
  };

  const handleSaveStudentInvoice = async (payload: Partial<StudentInvoice>) => {
    const wasEdit = !!editingStudentInvoice;
    try {
      const res = editingStudentInvoice
        ? await fetch(`/api/student-invoices/${editingStudentInvoice.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch('/api/student-invoices', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

      await parseApiResponse(res);
      const returnTo = studentFeeReturn;
      setEditingStudentInvoice(null);
      setCreatePreferredSchoolName(undefined);
      setStudentFeeReturn(null);
      setFormPage(returnTo ? { kind: 'studentFee', summary: returnTo } : null);
      await refreshAllData();
      await showSuccess(wasEdit ? 'Update အောင်မြင်ပါသည်' : 'Invoice ထုတ်ပြီးပါပြီ');
    } catch (err) {
      console.error('Save student invoice failed', err);
      const message =
        err instanceof Error
          ? err.message
          : 'Student invoice သိမ်းဆည်းရာတွင် အမှားဖြစ်ပေါ်ခဲ့ပါသည်။';
      await showWarning('အချက်အလက် စစ်ဆေးရန်', message);
    }
  };

  const handleDeleteStudentInvoice = async (id: string) => {
    const ok = await confirmDelete({
      title: t('students.deleteInvoiceTitle'),
      text: t('students.deleteInvoiceText'),
    });
    if (!ok) return;
    try {
      const res = await fetch(`/api/student-invoices/${id}`, { method: 'DELETE' });
      await parseApiResponse(res);
      await refreshAllData();
      await showSuccess(t('students.deleteInvoiceSuccess'));
    } catch (err) {
      console.error(err);
      await showWarning(
        t('students.deleteInvoiceFail'),
        err instanceof Error ? err.message : 'ထပ်မံ ကြိုးစားပါ'
      );
    }
  };

  // Calculate Urgent Notifications
  const todayStr = new Date().toISOString().split('T')[0];
  const target7Days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const target30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const urgentInvoices = invoices.filter(i => 
    (i.feeType || 'management') === 'management' &&
    i.nextInvoiceDate >= todayStr && i.nextInvoiceDate <= target7Days && i.status !== 'Paid'
  );

  const expiringWorkers = workers.filter(w => {
    const exp = w.deployment?.contractEndDate;
    return w.status === 'Active' && exp && exp >= todayStr && exp <= target30Days;
  });

  const currentAlertIds = useMemo(() => {
    const inv = urgentInvoices.map((i) => alertKeyInvoice(i.id));
    const wrk = expiringWorkers.map((w) => alertKeyWorker(w.id));
    return [...inv, ...wrk];
  }, [urgentInvoices, expiringWorkers]);

  const [alertReadTick, setAlertReadTick] = useState(0);
  const unreadAlertCount = useMemo(() => {
    void alertReadTick;
    return countUnreadAlerts(currentAlertIds);
  }, [currentAlertIds, alertReadTick]);

  const handleMarkAllAlertsRead = useCallback(() => {
    markAllAlertsRead(currentAlertIds);
    markAlertsNotified(currentAlertIds);
    setAlertReadTick((n) => n + 1);
  }, [currentAlertIds]);

  useEffect(() => {
    void registerAppServiceWorker().then(async (reg) => {
      if (!reg || !currentUser) return;
      if (getNotificationPermission() !== 'granted') return;
      await subscribeWebPush(currentUser.id, reg);
    });
  }, [currentUser?.id]);

  useEffect(() => {
    if (!currentUser || loading) return;
    pruneAlertIdStores(currentAlertIds);

    if (getNotificationPermission() !== 'granted') return;

    const unread = getUnreadAlertIds(currentAlertIds);
    const alreadyNotified = getNotifiedAlertIds();
    const fresh = unread.filter((id) => !alreadyNotified.has(id));
    if (!fresh.length) return;

    const payload = fresh.map((id) => {
      if (id.startsWith('inv-')) {
        const inv = urgentInvoices.find((i) => alertKeyInvoice(i.id) === id);
        return {
          id,
          title: t('alert.urgentInvoices'),
          body: inv
            ? `${inv.workerName} · ${inv.nextInvoiceDate}`
            : t('alert.urgentInvoices'),
        };
      }
      const w = expiringWorkers.find((x) => alertKeyWorker(x.id) === id);
      return {
        id,
        title: t('alert.expiring'),
        body: w
          ? `${w.name} · ${w.deployment.contractEndDate}`
          : t('alert.expiring'),
      };
    });

    void notifyUnreadAlerts(payload).then(() => {
      markAlertsNotified(fresh);
    });
  }, [
    currentUser,
    loading,
    currentAlertIds,
    urgentInvoices,
    expiringWorkers,
    t,
  ]);

  if (!currentUser) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="flex h-dvh max-h-dvh flex-col overflow-hidden bg-slate-50 font-sans text-slate-900 selection:bg-blue-600 selection:text-white dark:bg-slate-950 dark:text-slate-100">
      {/* TOP NAVIGATION BAR */}
      <div className="shrink-0">
      <Navbar
        alertCount={unreadAlertCount}
        onOpenAlerts={() => handleTabChange('notifications')}
        currentUser={currentUser}
        onLogout={handleLogout}
      />
      </div>

      {/* MAIN BODY LAYOUT — full width, internal scroll only */}
      <div className="flex min-h-0 w-full flex-1 flex-col md:flex-row">
        <Sidebar
          activeTab={activeTab}
          reportSection={reportSection}
          onTabChange={handleTabChange}
          onReportSectionChange={setReportSection}
          pendingInvoicesCount={stats?.pendingInvoicesCount || 0}
          expiringContractsCount={stats?.contractExpiring30DaysCount || 0}
          permissions={currentUser.permissions}
        />

        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4 pb-24 sm:px-6 sm:py-6 md:pb-6 lg:px-8">
          {loading ? (
            <div className="flex min-h-[400px] items-center justify-center rounded-2xl border border-slate-800 bg-slate-900 p-12 text-center text-slate-400">
              <div>
                <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-b-2 border-amber-500" />
                <p className="text-sm font-semibold">{t('common.loading')}</p>
              </div>
            </div>
          ) : formPage?.kind === 'worker' ? (
            <WorkerFormPage
              worker={formPage.worker}
              onBack={() => {
                setFormPage(null);
                setEditingWorker(null);
              }}
              onSave={handleSaveWorker}
            />
          ) : formPage?.kind === 'student' ? (
            <StudentFormPage
              student={formPage.student}
              onBack={() => {
                setFormPage(null);
                setEditingStudent(null);
              }}
              onSave={handleSaveStudent}
            />
          ) : formPage?.kind === 'invoice' ? (
            <InvoiceFormPage
              invoice={formPage.invoice}
              workers={workers}
              defaultFeeType={formPage.invoice?.feeType || createInvoiceFeeType}
              preferredHostCompany={
                formPage.invoice?.hostCompany || createPreferredHostCompany
              }
              preferredSupervisingOrg={
                formPage.invoice?.supervisingOrg || createPreferredSupervisingOrg
              }
              onBack={() => {
                const returnTo = invoiceWorkerReturn;
                setEditingInvoice(null);
                setCreatePreferredHostCompany(undefined);
                setCreatePreferredSupervisingOrg(undefined);
                setInvoiceWorkerReturn(null);
                setFormPage(returnTo ? { kind: 'invoiceWorker', summary: returnTo } : null);
              }}
              onSave={handleSaveInvoice}
            />
          ) : formPage?.kind === 'studentInvoice' ? (
            <StudentInvoiceFormPage
              invoice={formPage.invoice}
              students={students}
              preferredSchoolName={
                formPage.invoice?.schoolName ||
                formPage.invoice?.supervisingOrg ||
                createPreferredSchoolName
              }
              onBack={() => {
                const returnTo = studentFeeReturn;
                setEditingStudentInvoice(null);
                setCreatePreferredSchoolName(undefined);
                setStudentFeeReturn(null);
                setFormPage(returnTo ? { kind: 'studentFee', summary: returnTo } : null);
              }}
              onSave={handleSaveStudentInvoice}
            />
          ) : formPage?.kind === 'invoiceWorker' ? (
            <WorkerFeeDetailPage
              summary={formPage.summary}
              invoices={invoices}
              currentUser={currentUser}
              onBack={() => setFormPage(null)}
              onEditInvoice={(invoice) => {
                setInvoiceWorkerReturn(formPage.summary);
                setEditingInvoice(invoice);
                setFormPage({ kind: 'invoice', invoice });
              }}
              onDeleteInvoice={handleDeleteInvoice}
              onRefresh={refreshAllData}
            />
          ) : formPage?.kind === 'studentFee' ? (
            <StudentFeeDetailPage
              summary={formPage.summary}
              invoices={studentInvoices}
              currentUser={currentUser}
              onBack={() => setFormPage(null)}
              onEditInvoice={(invoice) => {
                setStudentFeeReturn(formPage.summary);
                setEditingStudentInvoice(invoice);
                setFormPage({ kind: 'studentInvoice', invoice });
              }}
              onDeleteInvoice={handleDeleteStudentInvoice}
              onRefresh={refreshAllData}
            />
          ) : (
            <>
              {activeTab === 'notifications' && (
                <NotificationsView
                  urgentInvoices={urgentInvoices}
                  expiringWorkers={expiringWorkers}
                  unreadCount={unreadAlertCount}
                  userId={currentUser.id}
                  onNavigate={handleTabChange}
                  onMarkAllRead={handleMarkAllAlertsRead}
                />
              )}

              {activeTab === 'dashboard' && can(currentUser.permissions, 'dashboard', 'read') && (
                <Dashboard
                  stats={stats}
                  workers={workers}
                  invoices={invoices}
                />
              )}

              {activeTab === 'workers' && can(currentUser.permissions, 'workers', 'read') && (
                <WorkerManagement
                  workers={workers}
                  currentUser={currentUser}
                  viewMode="workers"
                  onOpenAddModal={() => {
                    setEditingWorker(null);
                    setFormPage({ kind: 'worker', worker: null });
                  }}
                  onOpenEditModal={(worker) => {
                    setEditingWorker(worker);
                    setFormPage({ kind: 'worker', worker });
                  }}
                  onDeleteWorker={handleDeleteWorker}
                  onStatusChange={handleWorkerStatusChange}
                  onSelectWorkerDetail={(worker) => setSelectedDetailWorker(worker)}
                  onImportComplete={refreshAllData}
                />
              )}

              {activeTab === 'students' && can(currentUser.permissions, 'students', 'read') && (
                <div className="space-y-5">
                  <div className="bento-card flex flex-wrap items-center gap-2 p-3">
                    <button
                      type="button"
                      onClick={() => {
                        setStudentsView('profiles');
                        setFormPage(null);
                      }}
                      className={`cursor-pointer rounded-xl px-4 py-2 text-xs font-semibold sm:text-sm ${
                        studentsView === 'profiles'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {t('students.profilesTab')}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setStudentsView('fees');
                        setFormPage(null);
                      }}
                      className={`cursor-pointer rounded-xl px-4 py-2 text-xs font-semibold sm:text-sm ${
                        studentsView === 'fees'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {t('students.feesTab')}
                    </button>
                  </div>

                  {studentsView === 'profiles' ? (
                    <StudentManagement
                      students={students}
                      currentUser={currentUser}
                      onOpenAddModal={() => {
                        setEditingStudent(null);
                        setFormPage({ kind: 'student', student: null });
                      }}
                      onOpenEditModal={(student) => {
                        setEditingStudent(student);
                        setFormPage({ kind: 'student', student });
                      }}
                      onDeleteStudent={handleDeleteStudent}
                      onStatusChange={handleStudentStatusChange}
                      onSelectStudentDetail={(student) => setSelectedStudentDetail(student)}
                      onOpenStudentFees={handleOpenStudentFeeForStudent}
                    />
                  ) : (
                    <StudentInvoiceManagement
                      invoices={studentInvoices}
                      students={students}
                      currentUser={currentUser}
                      onOpenCreateModal={(schoolName) => {
                        setCreatePreferredSchoolName(schoolName);
                        setStudentFeeReturn(null);
                        setEditingStudentInvoice(null);
                        setFormPage({ kind: 'studentInvoice', invoice: null });
                      }}
                      onOpenSchoolDetail={(summary) => {
                        setStudentsView('fees');
                        setFormPage({ kind: 'studentFee', summary });
                      }}
                    />
                  )}
                </div>
              )}

              {activeTab === 'deployments' && can(currentUser.permissions, 'deployments', 'read') && (
                <WorkerManagement
                  workers={workers}
                  currentUser={currentUser}
                  viewMode="deployments"
                  onOpenAddModal={() => {
                    setEditingWorker(null);
                    setFormPage({ kind: 'worker', worker: null });
                  }}
                  onOpenEditModal={(worker) => {
                    setEditingWorker(worker);
                    setFormPage({ kind: 'worker', worker });
                  }}
                  onDeleteWorker={handleDeleteWorker}
                  onStatusChange={handleWorkerStatusChange}
                  onSelectWorkerDetail={(worker) => setSelectedDetailWorker(worker)}
                />
              )}

              {activeTab === 'invoices' && can(currentUser.permissions, 'invoices', 'read') && (
                <InvoiceManagement
                  invoices={invoices}
                  workers={workers}
                  currentUser={currentUser}
                  feeTab={createInvoiceFeeType}
                  onFeeTabChange={setCreateInvoiceFeeType}
                  onOpenCreateModal={(feeType, preferred) => {
                    setCreateInvoiceFeeType(feeType);
                    setCreatePreferredHostCompany(preferred?.hostCompany);
                    setCreatePreferredSupervisingOrg(preferred?.supervisingOrg);
                    setInvoiceWorkerReturn(null);
                    setEditingInvoice(null);
                    setFormPage({ kind: 'invoice', invoice: null });
                  }}
                  onOpenWorkerDetail={(summary) => {
                    setCreateInvoiceFeeType(summary.feeType);
                    setFormPage({ kind: 'invoiceWorker', summary });
                  }}
                />
              )}

              {activeTab === 'reports' && can(currentUser.permissions, 'reports', 'read') && (
                <ReportsView activeSection={reportSection} />
              )}

              {activeTab === 'settings' &&
                (can(currentUser.permissions, 'settings', 'read') ||
                  can(currentUser.permissions, 'users', 'read')) && (
                  <SettingsView currentUser={currentUser} />
                )}
            </>
          )}
        </main>
      </div>

      <BottomNav
        activeTab={activeTab}
        reportSection={reportSection}
        onTabChange={handleTabChange}
        onReportSectionChange={setReportSection}
        pendingInvoicesCount={stats?.pendingInvoicesCount || 0}
        expiringContractsCount={stats?.contractExpiring30DaysCount || 0}
        permissions={currentUser.permissions}
      />

      {/* Printable Invoice / Official Receipt Modal */}
      {printableInvoice && (
        <PrintableInvoiceModal
          invoice={printableInvoice}
          onClose={() => setPrintableInvoice(null)}
        />
      )}

      {/* Worker Detail Inspection Modal */}
      {selectedDetailWorker && (
        <WorkerDetailModal
          worker={selectedDetailWorker}
          invoices={invoices}
          onClose={() => setSelectedDetailWorker(null)}
          onEdit={(w) => {
            setSelectedDetailWorker(null);
            setEditingWorker(w);
            setFormPage({ kind: 'worker', worker: w });
          }}
        />
      )}

      {selectedStudentDetail && (
        <StudentDetailModal
          student={selectedStudentDetail}
          invoices={studentInvoices}
          onClose={() => setSelectedStudentDetail(null)}
          onEdit={(student) => {
            setSelectedStudentDetail(null);
            setEditingStudent(student);
            setFormPage({ kind: 'student', student });
          }}
        />
      )}

      <HelpChat userId={currentUser.id} />
    </div>
  );
}
