'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';

interface MemberInfo {
  member_id: number;
  first_name: string;
  last_name: string;
  contact_no: string;
  address: string;
  birthdate: string;
  emergency_contact: string;
  card_uid: string;
  custom_card_id: string;
  image_path: string;
  notes: string;
}

export default function EditMemberPage() {
  const params = useParams();
  const router = useRouter();
  const [formData, setFormData] = useState<MemberInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    const fetchMember = async () => {
      try {
        const res = await fetch(`/api/members/${params.id}`);
        const json = await res.json();
        if (json.error) { router.push('/admin/members'); return; }
        const m = json.member;
        setFormData({
          member_id: m.member_id,
          first_name: m.first_name || '',
          last_name: m.last_name || '',
          contact_no: m.contact_no || '',
          address: m.address || '',
          birthdate: m.birthdate || '',
          emergency_contact: m.emergency_contact || '',
          card_uid: m.card_uid || '',
          custom_card_id: m.custom_card_id || '',
          image_path: m.image_path || '',
          notes: m.notes || '',
        });
        if (m.image_path) setImagePreview(m.image_path);
      } catch (err) {
        console.error(err);
        setError('Failed to load member data');
      } finally {
        setLoading(false);
      }
    };
    fetchMember();
  }, [params.id, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (!formData) return;
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData) return;
    setSaving(true);
    setError('');

    try {
      let image_path = formData.image_path;

      if (imageFile) {
        const fd = new FormData();
        fd.append('file', imageFile);
        const uploadRes = await fetch('/api/upload', { method: 'POST', body: fd });
        const uploadData = await uploadRes.json();
        if (uploadData.error) throw new Error(uploadData.error);
        image_path = uploadData.path;
      }

      const res = await fetch(`/api/members/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, image_path }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setSuccess(true);
      setTimeout(() => router.push(`/admin/members/${params.id}`), 1500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update member');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-gray-400 animate-pulse">Loading member data...</div>;
  if (!formData) return null;

  if (success) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-green-600">Member Updated Successfully!</h2>
          <p className="text-gray-500 mt-2">Redirecting to member profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Edit Member</h1>
        <p className="text-gray-500 mt-1">{formData.first_name} {formData.last_name}</p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-yellow-800 mb-3">📡 Card Information</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Card UID</label>
              <input type="text" name="card_uid" value={formData.card_uid} onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 font-mono focus:outline-none focus:ring-2 focus:ring-yellow-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Custom Card ID</label>
              <input type="text" name="custom_card_id" value={formData.custom_card_id} onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-400" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">👤 Personal Information</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
              <input type="text" name="first_name" value={formData.first_name} onChange={handleChange} required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
              <input type="text" name="last_name" value={formData.last_name} onChange={handleChange} required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact Number</label>
              <input type="tel" name="contact_no" value={formData.contact_no} onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Birthdate</label>
              <input type="date" name="birthdate" value={formData.birthdate} onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-400" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <input type="text" name="address" value={formData.address} onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-400" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Emergency Contact</label>
              <input type="text" name="emergency_contact" value={formData.emergency_contact} onChange={handleChange}
                placeholder="Name - Relationship - Contact number"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-400" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes / Comments</label>
              <textarea name="notes" value={formData.notes} onChange={handleChange} rows={3}
                placeholder="Any additional notes about this member..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-400" />
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Member Photo</label>
            <div className="flex items-center gap-4">
              {imagePreview ? (
                <div className="relative w-24 h-24 rounded-xl overflow-hidden border-2 border-gray-300">
                  <Image src={imagePreview} alt="Preview" fill className="object-cover" />
                </div>
              ) : (
                <div className="w-24 h-24 rounded-xl bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400">
                  📷
                </div>
              )}
              <label className="cursor-pointer bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                Change Photo
                <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
              </label>
            </div>
          </div>
        </div>

        <div className="flex gap-4">
          <button type="submit" disabled={saving}
            className="flex-1 bg-yellow-500 hover:bg-yellow-600 disabled:bg-yellow-300 text-gray-900 font-bold py-4 rounded-xl text-lg transition-colors">
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          <button type="button" onClick={() => router.back()}
            className="px-8 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded-xl transition-colors">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
