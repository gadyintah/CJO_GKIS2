'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';

interface Member {
  member_id: number;
  first_name: string;
  last_name: string;
  card_uid: string;
  custom_card_id: string;
  image_path: string;
  emergency_contact: string;
  plan_type: string;
  membership_status: string;
  end_date: string;
  days_remaining: number;
  created_at: string;
}

interface ImportPreview {
  name?: string;
  card_no?: string;
  status?: string;
  membership_date?: string;
  no_of_months?: string;
  end_date?: string;
  amount?: string;
  mop?: string;
  contact_no?: string;
  emergency_contact?: string;
}

interface ImportResult {
  success: boolean;
  created: number;
  updated: number;
  errors: { row: number; error: string }[];
  total: number;
  message: string;
}

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Import state
  const [importing, setImporting] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<ImportPreview[] | null>(null);
  const [importPreviewTotal, setImportPreviewTotal] = useState(0);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importError, setImportError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchMembers = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (filter !== 'all') params.set('status', filter);
      params.set('page', page.toString());
      params.set('limit', '100');
      const res = await fetch(`/api/members?${params}`);
      const data = await res.json();
      setMembers(data.members || []);
      setTotalCount(data.totalCount || 0);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [search, filter, page]);

  useEffect(() => {
    setPage(1);
  }, [search, filter]);

  useEffect(() => {
    const timer = setTimeout(fetchMembers, 300);
    return () => clearTimeout(timer);
  }, [fetchMembers]);

  const handleExport = () => {
    window.open('/api/members/export', '_blank');
  };

  const handleImportFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFile(file);
    setImportPreview(null);
    setImportResult(null);
    setImportError('');

    const fd = new FormData();
    fd.append('file', file);
    fd.append('preview', 'true');
    try {
      const res = await fetch('/api/members/import', { method: 'POST', body: fd });
      const data = await res.json();
      if (data.error) {
        setImportError(data.error);
        return;
      }
      setImportPreview(data.preview);
      setImportPreviewTotal(data.total);
    } catch {
      setImportError('Failed to read file. Please check the format.');
    }
  };

  const handleImportConfirm = async () => {
    if (!importFile) return;
    setImporting(true);
    setImportError('');
    try {
      const fd = new FormData();
      fd.append('file', importFile);
      const res = await fetch('/api/members/import', { method: 'POST', body: fd });
      const data = await res.json();
      if (data.error) {
        setImportError(data.error);
        return;
      }
      setImportResult(data);
      setImportPreview(null);
      setImportFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      fetchMembers();
    } catch {
      setImportError('Import failed. Please try again.');
    } finally {
      setImporting(false);
    }
  };

  const handleImportCancel = () => {
    setImportFile(null);
    setImportPreview(null);
    setImportResult(null);
    setImportError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Members</h1>
          <p className="text-gray-500 mt-1">{totalCount} member{totalCount !== 1 ? 's' : ''} found</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2.5 rounded-lg transition-colors"
            title="Export all member data to Excel"
          >
            <span>⬇️</span> Export Data
          </button>
          <label className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-4 py-2.5 rounded-lg transition-colors cursor-pointer"
            title="Import member data from Excel or CSV">
            <span>⬆️</span> Import Data
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleImportFileChange}
              className="hidden"
            />
          </label>
          <Link
            href="/admin/members/register"
            className="bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-semibold px-6 py-2.5 rounded-lg transition-colors"
          >
            + Register Member
          </Link>
        </div>
      </div>

      {importError && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-start justify-between">
          <span>⚠️ {importError}</span>
          <button onClick={handleImportCancel} className="text-red-400 hover:text-red-600 ml-4">✕</button>
        </div>
      )}

      {importResult && (
        <div className={`mb-4 p-4 rounded-lg border ${importResult.errors.length > 0 ? 'bg-yellow-50 border-yellow-300' : 'bg-green-50 border-green-300'}`}>
          <div className="flex items-start justify-between">
            <div>
              <p className="font-semibold text-gray-800">✅ Import Complete</p>
              <p className="text-gray-600 mt-1">{importResult.message}</p>
              {importResult.errors.length > 0 && (
                <details className="mt-2">
                  <summary className="text-orange-600 cursor-pointer font-medium text-sm">
                    {importResult.errors.length} row(s) had errors — click to view
                  </summary>
                  <ul className="mt-2 space-y-1">
                    {importResult.errors.map((e, i) => (
                      <li key={i} className="text-sm text-red-700">Row {e.row}: {e.error}</li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
            <button onClick={() => setImportResult(null)} className="text-gray-400 hover:text-gray-600 ml-4">✕</button>
          </div>
        </div>
      )}

      {importPreview && (
        <div className="mb-6 bg-white rounded-xl shadow p-5 border border-orange-200">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-800">📋 Import Preview</h2>
              <p className="text-sm text-gray-500 mt-0.5">Showing first {importPreview.length} of {importPreviewTotal} row(s)</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleImportCancel}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleImportConfirm}
                disabled={importing}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-lg text-sm font-semibold"
              >
                {importing ? 'Importing...' : `Import ${importPreviewTotal} Row(s)`}
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-3 py-2 font-semibold text-gray-600">Name</th>
                  <th className="px-3 py-2 font-semibold text-gray-600">Card No.</th>
                  <th className="px-3 py-2 font-semibold text-gray-600">Status</th>
                  <th className="px-3 py-2 font-semibold text-gray-600">Start Date</th>
                  <th className="px-3 py-2 font-semibold text-gray-600">End Date</th>
                  <th className="px-3 py-2 font-semibold text-gray-600">Months</th>
                  <th className="px-3 py-2 font-semibold text-gray-600">Amount</th>
                  <th className="px-3 py-2 font-semibold text-gray-600">MOP</th>
                  <th className="px-3 py-2 font-semibold text-gray-600">Contact</th>
                  <th className="px-3 py-2 font-semibold text-gray-600">Emergency Contact - Name</th>
                </tr>
              </thead>
              <tbody>
                {importPreview.map((row, i) => (
                  <tr key={i} className={`border-t border-gray-100 ${i % 2 === 0 ? '' : 'bg-gray-50'}`}>
                    <td className="px-3 py-2 font-medium text-gray-800">{row.name || '-'}</td>
                    <td className="px-3 py-2 font-mono text-gray-600">{row.card_no || '-'}</td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        String(row.status || '').toLowerCase() === 'ongoing' || String(row.status || '').toLowerCase() === 'active'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {row.status || '-'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-gray-600">{row.membership_date || '-'}</td>
                    <td className="px-3 py-2 text-gray-600">{row.end_date || '-'}</td>
                    <td className="px-3 py-2 text-gray-600">{row.no_of_months || '-'}</td>
                    <td className="px-3 py-2 text-gray-600">{row.amount || '-'}</td>
                    <td className="px-3 py-2 text-gray-600">{row.mop || '-'}</td>
                    <td className="px-3 py-2 text-gray-600">{row.contact_no || '-'}</td>
                    <td className="px-3 py-2 text-gray-600">{row.emergency_contact || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow p-4 mb-6 flex flex-wrap gap-4 items-center">
        <input
          type="text"
          placeholder="Search by name, card UID, or custom ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-64 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-400"
        />
        <div className="flex gap-2">
          {['all', 'active', 'expired'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg font-medium capitalize transition-colors ${
                filter === f
                  ? 'bg-yellow-500 text-gray-900'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="px-4 py-3 text-gray-600 font-semibold text-sm">Photo</th>
                <th className="px-4 py-3 text-gray-600 font-semibold text-sm">Name</th>
                <th className="px-4 py-3 text-gray-600 font-semibold text-sm">Card UID</th>
                <th className="px-4 py-3 text-gray-600 font-semibold text-sm">Plan</th>
                <th className="px-4 py-3 text-gray-600 font-semibold text-sm">Status</th>
                <th className="px-4 py-3 text-gray-600 font-semibold text-sm">End Date</th>
                <th className="px-4 py-3 text-gray-600 font-semibold text-sm">Days Left</th>
                <th className="px-4 py-3 text-gray-600 font-semibold text-sm">Emergency Contact - Name</th>
                <th className="px-4 py-3 text-gray-600 font-semibold text-sm">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-gray-400 animate-pulse">Loading...</td>
                </tr>
              ) : members.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-gray-400">No members found</td>
                </tr>
              ) : (
                members.map((m) => {
                  const isActive = !!m.membership_status;
                  return (
                    <tr
                      key={m.member_id}
                      className={`border-t border-gray-100 hover:bg-gray-50 ${
                        isActive ? '' : 'bg-red-50'
                      }`}
                    >
                      <td className="px-4 py-3">
                        {m.image_path ? (
                          <div className="relative w-10 h-10 rounded-full overflow-hidden">
                            <Image src={m.image_path} alt="photo" fill className="object-cover" />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">
                            👤
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-800">
                        {m.first_name} {m.last_name}
                      </td>
                      <td className="px-4 py-3 font-mono text-sm text-gray-600">
                        {m.card_uid || '-'}
                        {m.custom_card_id && <span className="ml-1 text-gray-400 text-xs">({m.custom_card_id})</span>}
                      </td>
                      <td className="px-4 py-3 capitalize text-gray-600">{m.plan_type || '-'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {isActive ? 'Active' : 'Expired'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-sm">{m.end_date || '-'}</td>
                      <td className="px-4 py-3">
                        {isActive ? (
                          <span className={`font-semibold ${m.days_remaining <= 7 ? 'text-orange-500' : 'text-green-600'}`}>
                            {m.days_remaining}d
                          </span>
                        ) : '-'}
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-sm">{m.emergency_contact || '-'}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <Link href={`/admin/members/${m.member_id}`} className="text-blue-500 hover:text-blue-700 text-sm font-medium">View</Link>
                          <Link href={`/admin/members/${m.member_id}/edit`} className="text-gray-500 hover:text-gray-700 text-sm font-medium">Edit</Link>
                          <Link href={`/admin/members/${m.member_id}/renew`} className="text-green-500 hover:text-green-700 text-sm font-medium">Renew</Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
          >
            ← Prev
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
            .reduce<(number | string)[]>((acc, p, i, arr) => {
              if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push('...');
              acc.push(p);
              return acc;
            }, [])
            .map((p, i) =>
              typeof p === 'string' ? (
                <span key={`ellipsis-${i}`} className="px-2 text-gray-400">...</span>
              ) : (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium ${
                    page === p ? 'bg-yellow-500 text-gray-900' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  {p}
                </button>
              )
            )}
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
