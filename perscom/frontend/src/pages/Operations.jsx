import { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Edit2, Trash2, Loader2, Calendar, CheckCircle, Radio, Image, X } from 'lucide-react';
import { format, isPast, parseISO } from 'date-fns';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';

const BACKEND = ''; // Vite proxy in dev; same-origin in production

function opStatus(op) {
  if (!op.end_date) return 'ACTIVE';
  return isPast(parseISO(op.end_date)) ? 'COMPLETED' : 'ACTIVE';
}

const BLANK = { title: '', description: '', start_date: '', end_date: '' };

function OpForm({ initial = BLANK, onSave, onCancel, saving }) {
  const [form, setForm] = useState(initial);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="label">Operation Title</label>
        <input
          className="input-field"
          placeholder="Operation Name"
          value={form.title}
          onChange={(e) => set('title', e.target.value)}
          required
          autoFocus
        />
      </div>
      <div>
        <label className="label">Description</label>
        <textarea
          className="input-field resize-none"
          rows={3}
          placeholder="Mission overview and objectives..."
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Start Date *</label>
          <input type="date" className="input-field" value={form.start_date} onChange={(e) => set('start_date', e.target.value)} required />
        </div>
        <div>
          <label className="label">End Date</label>
          <input type="date" className="input-field" value={form.end_date} onChange={(e) => set('end_date', e.target.value)} min={form.start_date} />
          <p className="text-[#1a2f55] text-[10px] mt-1">Leave blank for ongoing</p>
        </div>
      </div>
      <div className="flex gap-2 justify-end pt-1">
        <button type="button" onClick={onCancel} className="btn-ghost">Cancel</button>
        <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
          {saving && <Loader2 size={13} className="animate-spin" />}
          Save
        </button>
      </div>
    </form>
  );
}

// Image upload control for an operation card
function OpImageSection({ op, onImageUpdate }) {
  const { isAdmin } = useAuth();
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [lightbox, setLightbox] = useState(false);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const res = await api.post(`/operations/${op.id}/image`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onImageUpdate(op.id, res.data.image_url);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to upload image');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDelete = async () => {
    if (!confirm('Remove image from this operation?')) return;
    try {
      await api.delete(`/operations/${op.id}/image`);
      onImageUpdate(op.id, null);
    } catch {
      alert('Failed to remove image');
    }
  };

  return (
    <div className="mt-3">
      {op.image_url ? (
        <div className="relative group/img">
          <img
            src={`${BACKEND}${op.image_url}`}
            alt={op.title}
            className="w-full max-h-48 object-cover rounded-sm border border-[#162448] cursor-pointer"
            onClick={() => setLightbox(true)}
          />
          {isAdmin && (
            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover/img:opacity-100 transition-opacity">
              <button
                onClick={() => fileRef.current?.click()}
                className="bg-[#0c1428]/90 border border-[#162448] p-1.5 rounded-sm text-[#4a6fa5] hover:text-[#dbeafe] transition-colors"
                title="Replace image"
              >
                <Image size={12} />
              </button>
              <button
                onClick={handleDelete}
                className="bg-[#0c1428]/90 border border-red-900/50 p-1.5 rounded-sm text-[#4a6fa5] hover:text-red-400 transition-colors"
                title="Remove image"
              >
                <X size={12} />
              </button>
            </div>
          )}
          {/* Lightbox */}
          {lightbox && (
            <div
              className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-8"
              onClick={() => setLightbox(false)}
            >
              <img
                src={`${BACKEND}${op.image_url}`}
                alt={op.title}
                className="max-w-full max-h-full object-contain rounded-sm"
              />
            </div>
          )}
        </div>
      ) : isAdmin ? (
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-2 text-[#1a2f55] hover:text-[#4a6fa5] text-xs font-mono transition-colors border border-dashed border-[#162448] hover:border-[#3b82f6]/30 rounded-sm px-3 py-2 w-full justify-center"
        >
          {uploading ? <Loader2 size={12} className="animate-spin" /> : <Image size={12} />}
          {uploading ? 'Uploading...' : 'Add Image'}
        </button>
      ) : null}
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
    </div>
  );
}

export default function Operations() {
  const { isAdmin } = useAuth();
  const [ops, setOps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);

  const fetchOps = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/operations');
      setOps(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchOps(); }, [fetchOps]);

  const closeModal = () => { setModal(null); setSelected(null); };

  const handleCreate = async (form) => {
    setSaving(true);
    try {
      await api.post('/operations', form);
      closeModal();
      fetchOps();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create operation');
    } finally { setSaving(false); }
  };

  const handleEdit = async (form) => {
    setSaving(true);
    try {
      await api.put(`/operations/${selected.id}`, form);
      closeModal();
      fetchOps();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update operation');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setSaving(true);
    try {
      await api.delete(`/operations/${selected.id}`);
      closeModal();
      fetchOps();
    } catch { alert('Failed to delete operation'); }
    finally { setSaving(false); }
  };

  const handleImageUpdate = (opId, newUrl) => {
    setOps((prev) => prev.map((o) => o.id === opId ? { ...o, image_url: newUrl } : o));
  };

  const filtered = ops.filter((op) => {
    if (filter === 'All') return true;
    return opStatus(op) === filter.toUpperCase();
  });

  const active = ops.filter((op) => opStatus(op) === 'ACTIVE').length;
  const completed = ops.filter((op) => opStatus(op) === 'COMPLETED').length;

  return (
    <div className="space-y-4 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex gap-1">
            {['All', 'Active', 'Completed'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-xs rounded-sm border transition-colors font-mono ${
                  filter === f
                    ? 'bg-[#3b82f6]/10 text-[#60a5fa] border-[#3b82f6]/40'
                    : 'text-[#4a6fa5] border-[#162448] hover:border-[#3b82f6]/20 hover:text-[#93c5fd]'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3 text-xs font-mono text-[#1a2f55]">
            <span>ACTIVE: <span className="text-[#4a6fa5]">{active}</span></span>
            <span>COMPLETED: <span className="text-[#4a6fa5]">{completed}</span></span>
          </div>
        </div>
        {isAdmin && (
          <button onClick={() => setModal('create')} className="btn-primary flex items-center gap-2 shrink-0">
            <Plus size={13} /> Create Operation
          </button>
        )}
      </div>

      {/* Operations list */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={18} className="animate-spin text-[#3b82f6]" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card py-16 text-center text-[#1a2f55] font-mono text-xs">NO OPERATIONS FOUND</div>
      ) : (
        <div className="space-y-3">
          {filtered.map((op) => {
            const status = opStatus(op);
            return (
              <div key={op.id} className="card p-4 group">
                <div className="flex items-start gap-4">
                  <div className={`w-9 h-9 rounded-sm border flex items-center justify-center shrink-0 mt-0.5 ${
                    status === 'ACTIVE'
                      ? 'bg-[#3b82f6]/10 border-[#3b82f6]/25 text-[#3b82f6]'
                      : 'bg-[#162448]/40 border-[#162448] text-[#1a2f55]'
                  }`}>
                    {status === 'ACTIVE' ? <Radio size={14} /> : <CheckCircle size={14} />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap mb-1">
                      <h3 className="text-[#dbeafe] font-medium text-sm">{op.title}</h3>
                      <span className={status === 'ACTIVE' ? 'badge-green' : 'badge-muted'}>{status}</span>
                    </div>

                    {op.description && (
                      <p className="text-[#4a6fa5] text-xs leading-relaxed mb-2 line-clamp-2">{op.description}</p>
                    )}

                    <div className="flex items-center gap-4 text-xs font-mono text-[#1a2f55]">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={10} />
                        <span>Start: {format(parseISO(op.start_date), 'MMM dd, yyyy')}</span>
                      </div>
                      {op.end_date ? (
                        <div className="flex items-center gap-1.5">
                          <Calendar size={10} />
                          <span>End: {format(parseISO(op.end_date), 'MMM dd, yyyy')}</span>
                        </div>
                      ) : (
                        <span className="text-[#3b82f6]/50">Ongoing</span>
                      )}
                      <span className="text-[#1a2f55]">— {op.created_by_name}</span>
                    </div>

                    {/* Image section */}
                    <OpImageSection op={op} onImageUpdate={handleImageUpdate} />
                  </div>

                  {isAdmin && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button
                        onClick={() => { setSelected(op); setModal('edit'); }}
                        className="p-1.5 text-[#2a4a80] hover:text-[#dbeafe] transition-colors"
                        title="Edit"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => { setSelected(op); setModal('delete'); }}
                        className="p-1.5 text-[#2a4a80] hover:text-red-400 transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modal === 'create' && (
        <Modal title="Create Operation" onClose={closeModal} maxWidth="max-w-lg">
          <OpForm onSave={handleCreate} onCancel={closeModal} saving={saving} />
        </Modal>
      )}
      {modal === 'edit' && selected && (
        <Modal title={`Edit — ${selected.title}`} onClose={closeModal} maxWidth="max-w-lg">
          <OpForm
            initial={{ title: selected.title, description: selected.description || '', start_date: selected.start_date, end_date: selected.end_date || '' }}
            onSave={handleEdit}
            onCancel={closeModal}
            saving={saving}
          />
        </Modal>
      )}
      {modal === 'delete' && selected && (
        <Modal title="Confirm Deletion" onClose={closeModal} maxWidth="max-w-sm">
          <div className="space-y-4">
            <p className="text-[#93c5fd] text-sm">
              Delete operation <span className="text-[#dbeafe] font-medium">{selected.title}</span>?
              This action cannot be undone.
            </p>
            <div className="flex gap-2 justify-end">
              <button onClick={closeModal} className="btn-ghost">Cancel</button>
              <button onClick={handleDelete} disabled={saving} className="btn-danger flex items-center gap-2">
                {saving && <Loader2 size={13} className="animate-spin" />}
                Delete
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
