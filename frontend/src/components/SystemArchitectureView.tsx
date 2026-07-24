import React, { useState, useEffect } from 'react';
import { Database, Server, Cpu, GitMerge, FileCode2, Copy, Check, ArrowRight, Layers, Table, Workflow } from 'lucide-react';

export const SystemArchitectureView: React.FC = () => {
  const [docData, setDocData] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch('/api/system/schema-architecture')
      .then(res => res.json())
      .then(data => setDocData(data))
      .catch(err => console.error(err));
  }, []);

  const handleCopySQL = () => {
    const sql = `
-- Database Schema for Overseas Employment Agency Worker & Invoice Management System

CREATE TABLE workers (
  id VARCHAR(36) PRIMARY KEY,
  serial_no VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  gender ENUM('Male', 'Female') NOT NULL,
  dob DATE NOT NULL,
  passport_no VARCHAR(30) NOT NULL,
  status ENUM('Active', 'Contract Ended', 'Absconded') NOT NULL DEFAULT 'Active',
  absconded_date DATE NULL,
  notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE deployments (
  id VARCHAR(36) PRIMARY KEY,
  worker_id VARCHAR(36) NOT NULL,
  visa_type VARCHAR(50) NOT NULL,
  supervising_org VARCHAR(150) NOT NULL,
  host_company VARCHAR(150) NOT NULL,
  job_category VARCHAR(100) NOT NULL,
  own_card_date DATE NOT NULL,
  departure_date DATE NOT NULL,
  japan_entry_date DATE NOT NULL,
  contract_end_date DATE NOT NULL,
  FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE CASCADE
);

CREATE TABLE financial_configs (
  id VARCHAR(36) PRIMARY KEY,
  worker_id VARCHAR(36) NOT NULL,
  flight_fee DECIMAL(12,2) DEFAULT 0,
  training_fee DECIMAL(12,2) DEFAULT 0,
  management_fee DECIMAL(12,2) NOT NULL,
  billing_cycle_months INT DEFAULT 6,
  currency ENUM('JPY','MMK','USD') NOT NULL DEFAULT 'JPY',
  FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE CASCADE
);

CREATE TABLE invoices (
  id VARCHAR(36) PRIMARY KEY,
  invoice_no VARCHAR(30) NOT NULL UNIQUE,
  worker_id VARCHAR(36) NOT NULL,
  billing_period VARCHAR(50) NOT NULL,
  last_invoice_date DATE NOT NULL,
  next_invoice_date DATE NOT NULL,
  total_amount DECIMAL(12,2) NOT NULL,
  amount_received DECIMAL(12,2) DEFAULT 0,
  outstanding_amount DECIMAL(12,2) GENERATED ALWAYS AS (GREATEST(0, total_amount - amount_received)) STORED,
  payment_received_date DATE NULL,
  receipt_no VARCHAR(50) NULL,
  receipt_sent_date DATE NULL,
  status ENUM('Pending', 'Partial', 'Paid', 'Overdue') NOT NULL DEFAULT 'Pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE CASCADE
);

CREATE TABLE fee_payments (
  id VARCHAR(64) PRIMARY KEY,
  worker_id VARCHAR(64) NOT NULL,
  fee_type ENUM('flight', 'training') NOT NULL,
  amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  payment_date DATE NOT NULL,
  receipt_no VARCHAR(50) NULL,
  notes TEXT NULL,
  currency ENUM('JPY', 'MMK', 'USD') NOT NULL DEFAULT 'JPY',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE CASCADE
);
`;
    navigator.clipboard.writeText(sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="bento-card p-6 space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                စနစ်၏ Architecture၊ Database Schema ERD နှင့် System Flow Diagram
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Overseas Employment Agency ERP - System Design & Normalized Database Specification
              </p>
            </div>
          </div>

          <button
            onClick={handleCopySQL}
            className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-2 rounded-xl text-xs flex items-center gap-2 cursor-pointer shadow-xs transition-all self-start sm:self-auto"
          >
            {copied ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'SQL ကူးယူပြီးပါပြီ!' : 'MySQL DDL ကူးယူမည်'}</span>
          </button>
        </div>
      </div>

      {/* 1. ARCHITECTURE LAYERS OVERVIEW */}
      <div className="bento-card p-6 space-y-4">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b border-slate-200 pb-3">
          <Layers className="w-5 h-5 text-blue-600" />
          <span>1. System Architecture Diagram (သုံးဆင့် ပါဝင်သော စနစ်)</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          {/* Frontend Layer */}
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/80 space-y-3 relative overflow-hidden">
            <div className="text-micro text-blue-600">Layer 1: Presentation</div>
            <div className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Cpu className="w-5 h-5 text-blue-600" />
              <span>React Single Page App</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Responsive UI၊ Myanmar Language Support၊ Recharts Analytics၊ Excel CSV Export & Printable Receipt Generator။
            </p>
            <div className="text-[10px] text-slate-600 font-mono bg-white p-2 rounded-lg border border-slate-200">
              React 19 + Vite + Tailwind CSS v4
            </div>
          </div>

          {/* Backend API Layer */}
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/80 space-y-3 relative overflow-hidden">
            <div className="text-micro text-emerald-600">Layer 2: Application / APIs</div>
            <div className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Server className="w-5 h-5 text-emerald-600" />
              <span>Node.js RESTful APIs</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Automated Invoice Date Calculation Engine, Outstanding Balance Computation, Gemini AI Insights Proxy.
            </p>
            <div className="text-[10px] text-slate-600 font-mono bg-white p-2 rounded-lg border border-slate-200">
              Express.js REST Server (0.0.0.0:3000)
            </div>
          </div>

          {/* Database Storage Layer */}
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/80 space-y-3 relative overflow-hidden">
            <div className="text-micro text-indigo-600">Layer 3: Data Storage</div>
            <div className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Database className="w-5 h-5 text-indigo-600" />
              <span>Relational Database</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Normalized MySQL/JSON Storage engine storing Workers, Deployments, Financial Configs, Invoices & Payment Logs.
            </p>
            <div className="text-[10px] text-slate-600 font-mono bg-white p-2 rounded-lg border border-slate-200">
              MySQL 8.0 Engine Schema
            </div>
          </div>
        </div>
      </div>

      {/* 2. SYSTEM FLOW DIAGRAM */}
      <div className="bento-card p-6 space-y-4">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b border-slate-200 pb-3">
          <Workflow className="w-5 h-5 text-blue-600" />
          <span>2. System Operational Flow Diagram (လုပ်ငန်းစဉ် စီးဆင်းမှု)</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
          {docData?.systemFlow?.map((step: string, index: number) => (
            <div key={index} className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-2.5 relative">
              <div className="w-7 h-7 bg-blue-600 text-white font-bold rounded-lg flex items-center justify-center text-xs font-mono shadow-xs">
                0{index + 1}
              </div>
              <p className="text-xs text-slate-700 leading-relaxed font-medium">
                {step}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* 3. NORMALIZED DATABASE SCHEMA ERD */}
      <div className="bento-card p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Table className="w-5 h-5 text-blue-600" />
            <span>3. Database Schema Design (Normalized Tables & Relations)</span>
          </h3>
          <span className="text-xs text-slate-500 font-mono">3rd Normal Form (3NF)</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {docData?.databaseSchema?.tables?.map((table: any, idx: number) => (
            <div key={idx} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <span className="font-mono font-bold text-blue-600 text-sm">
                    {table.tableName}
                  </span>
                  <span className="text-xs text-slate-500 ml-2">({table.description})</span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px] text-slate-700">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 font-mono uppercase text-[10px] tracking-wider">
                      <th className="p-2 pl-3">Column Name</th>
                      <th className="p-2">Data Type</th>
                      <th className="p-2">Key / Constraint</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {table.columns.map((col: any, cIdx: number) => (
                      <tr key={cIdx} className="hover:bg-slate-50">
                        <td className="p-2 pl-3 font-bold text-slate-900">{col.name}</td>
                        <td className="p-2 text-blue-600 font-medium">{col.type}</td>
                        <td className="p-2">
                          <span className={`status-badge inline-block text-[10px] ${
                            col.key.includes('PK') ? 'bg-blue-100 text-blue-700 font-bold' :
                            col.key.includes('FK') ? 'bg-indigo-100 text-indigo-700' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                            {col.key}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
