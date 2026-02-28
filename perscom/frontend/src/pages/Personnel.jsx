import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Search, Plus, ChevronUp, ChevronDown, Award, Trash2,
  Edit2, Star, Loader2, X, UserPlus,
} from 'lucide-react';
import { differenceInDays, format } from 'date-fns';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import MarineHoverCard from '../components/MarineHoverCard';

const RANKS = [
  'Recruit', 'Private', 'Private First Class', 'Lance Corporal', 'Corporal',
  'Sergeant', 'Staff Sergeant', 'Gunnery Sergeant', 'Master Sergeant',
  'First Sergeant', 'Master Gunnery Sergeant', 'Sergeant Major',
  'Second Lieutenant', 'First Lieutenant', 'Captain', 'Major',
  'Lieutenant Colonel', 'Colonel',
];

const RANK_ABBREV = {
  'Recruit': 'Rct', 'Private': 'Pvt', 'Private First Class': 'PFC',
  'Lance Corporal': 'LCpl', 'Corporal': 'Cpl', 'Sergeant': 'Sgt',
  'Staff Sergeant': 'SSgt', 'Gunnery Sergeant': 'GySgt',
  'Master Sergeant': 'MSgt', 'First Sergeant': '1stSgt',
  'Master Gunnery Sergeant': 'MGySgt', 'Sergeant Major': 'SgtMaj',
  'Second Lieutenant': '2ndLt', 'First Lieutenant': '1stLt',
  'Captain': 'Capt', 'Major': 'Maj', 'Lieutenant Colonel': 'LtCol', 'Colonel': 'Col',
};

const MEMBER_STATUS_STYLES = {
  'Active':           'badge-green',
  'Leave of Absence': 'badge-amber',
  'Inactive':         'badge-muted',
};

function calcTIG(rankSince, dateOfEntry) {
  const from = rankSince || dateOfEntry;
  if (!from) return '—';
  const days = differenceInDays(new Date(), new Date(from));
  if (days < 1) return '0d';
  if (days < 30) return `${days}d`;
  if (days < 365) return `${Math.floor(days / 30)}mo`;
  const y = Math.floor(days / 365);
  const m = Math.floor((days % 365) / 30);
  return m > 0 ? `${y}y ${m}mo` : `${y}y`;
}

const BLANK_FORM = {
  name: '', status: 'Civilian', rank: '', date_of_entry: new Date().toISOString().split('T')[0],
};

function PersonnelForm({ initial = BLANK_FORM, onSave, onCancel, saving }) {
  const [form, setForm] = useState(initial);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleStatusChange = (val) => {
    setForm((f) => ({ ...f, status: val, rank: val === 'Marine' ? (f.rank || 'Recruit') : '' }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ ...form, rank: form.status === 'Marine' ? form.rank : null });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="label">Full Name</label>
        <input
          className="input-field"
          placeholder="Last, First M."
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
          required
          autoFocus
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Status</label>
          <select className="select-field" value={form.status} onChange={(e) => handleStatusChange(e.target.value)}>
            <option value="Civilian">Civilian</option>
            <option value="Marine">Marine</option>
          </select>
        </div>
        <div>
          <label className="label">Rank {form.status === 'Marine' ? '*' : ''}</label>
          <select
            className="select-field"
            value={form.rank}
            onChange={(e) => set('rank', e.target.value)}
            disabled={form.status === 'Civilian'}
            required={form.status === 'Marine'}
          >
            {form.status === 'Civilian' && <option value="">N/A</option>}
            {RANKS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="label">Date of Entry</label>
        <input
          type="date"
          className="input-field"
          value={form.date_of_entry}
          onChange={(e) => set('date_of_entry', e.target.value)}
          required
        />
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

function AwardModal({ person, onClose, onUpdate }) {
  const [name, setName] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [saving, setSaving] = useState(false);
  const [awards, setAwards] = useState(person.awards || []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      const res = await api.post(`/personnel/${person.id}/awards`, { name: name.trim(), awarded_at: date });
      setAwards((a) => [res.data, ...a]);
      setName('');
      onUpdate();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to add award');
    } finally { setSaving(false); }
  };

  const handleRemove = async (awardId) => {
    try {
      await api.delete(`/personnel/${person.id}/awards/${awardId}`);
      setAwards((a) => a.filter((x) => x.id !== awardId));
      onUpdate();
    } catch { alert('Failed to remove award'); }
  };

  return (
    <Modal title={`Awards — ${person.name}`} onClose={onClose} maxWidth="max-w-md">
      <div className="space-y-4">
        <div>
          <label className="label mb-2">Current Awards</label>
          {awards.length === 0 ? (
            <div className="text-[#1a2f55] text-xs font-mono text-center py-3">NO AWARDS ON RECORD</div>
          ) : (
            <div className="space-y-1.5 mb-3">
              {awards.map((a) => (
                <div key={a.id} className="flex items-center justify-between bg-[#060918] border border-[#162448] px-3 py-2 rounded-sm">
                  <div>
                    <div className="text-[#dbeafe] text-sm flex items-center gap-1.5">
                      <Star size={10} className="text-amber-400" fill="currentColor" />{a.name}
                    </div>
                    <div className="text-[#1a2f55] text-xs font-mono mt-0.5">
                      {format(new Date(a.awarded_at), 'MMM dd, yyyy')}
                    </div>
                  </div>
                  <button onClick={() => handleRemove(a.id)} className="text-[#2a4a80] hover:text-red-400 transition-colors p-1">
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="border-t border-[#162448] pt-4">
          <label className="label mb-2">Add Award</label>
          <form onSubmit={handleAdd} className="space-y-2">
            <input className="input-field" placeholder="Award name" value={name} onChange={(e) => setName(e.target.value)} required />
            <input type="date" className="input-field" value={date} onChange={(e) => setDate(e.target.value)} />
            <button type="submit" disabled={saving || !name.trim()} className="btn-primary w-full flex items-center justify-center gap-2">
              {saving && <Loader2 size={13} className="animate-spin" />}
              Add Award
            </button>
          </form>
        </div>
      </div>
    </Modal>
  );
}

function DeleteModal({ person, onConfirm, onCancel, deleting }) {
  return (
    <Modal title="Confirm Removal" onClose={onCancel} maxWidth="max-w-sm">
      <div className="space-y-4">
        <p className="text-[#93c5fd] text-sm">
          Remove <span className="text-[#dbeafe] font-medium">{person.name}</span> from the roster?
          This action cannot be undone.
        </p>
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} className="btn-ghost">Cancel</button>
          <button onClick={onConfirm} disabled={deleting} className="btn-danger flex items-center gap-2">
            {deleting && <Loader2 size={13} className="animate-spin" />}
            Remove
          </button>
        </div>
      </div>
    </Modal>
  );
}

function MemberStatusDropdown({ person, onChanged }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const choose = async (val) => {
    if (val === person.member_status) { setOpen(false); return; }
    setSaving(true);
    try {
      await api.patch(`/personnel/${person.id}/member-status`, { member_status: val });
      onChanged(person.id, val);
    } catch { alert('Failed to update status'); }
    finally { setSaving(false); setOpen(false); }
  };

  const badgeClass = MEMBER_STATUS_STYLES[person.member_status] || 'badge-muted';

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={saving}
        className={`${badgeClass} cursor-pointer select-none`}
        title="Change member status"
      >
        {saving ? '...' : (person.member_status || 'Active')}
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 bg-[#0c1428] border border-[#162448] rounded-sm shadow-xl z-50 min-w-[10rem] py-0.5">
          {['Active', 'Leave of Absence', 'Inactive'].map((s) => (
            <button
              key={s}
              onClick={() => choose(s)}
              className={`w-full text-left px-3 py-1.5 text-xs font-mono transition-colors ${
                s === person.member_status
                  ? 'text-[#60a5fa] bg-[#3b82f6]/10'
                  : 'text-[#4a6fa5] hover:text-[#dbeafe] hover:bg-[#162448]/50'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Personnel() {
  const { isAdmin, isGuest } = useAuth();
  const [personnel, setPersonnel] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');

  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);

  const [hoverPerson, setHoverPerson] = useState(null);
  const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 });
  const [hoverVisible, setHoverVisible] = useState(false);
  const hoverTimer = useRef(null);

  const fetchPersonnel = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filter !== 'All') params.status = filter;
      if (search) params.search = search;
      const res = await api.get('/personnel', { params });
      setPersonnel(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [search, filter]);

  useEffect(() => {
    const id = setTimeout(fetchPersonnel, search ? 300 : 0);
    return () => clearTimeout(id);
  }, [fetchPersonnel, search]);

  const closeModal = () => { setModal(null); setSelected(null); };

  const handleAdd = async (form) => {
    setSaving(true);
    try {
      await api.post('/personnel', form);
      closeModal();
      fetchPersonnel();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to add personnel');
    } finally { setSaving(false); }
  };

  const handleEdit = async (form) => {
    setSaving(true);
    try {
      await api.put(`/personnel/${selected.id}`, form);
      closeModal();
      fetchPersonnel();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update personnel');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setSaving(true);
    try {
      await api.delete(`/personnel/${selected.id}`);
      closeModal();
      fetchPersonnel();
    } catch { alert('Failed to delete personnel'); }
    finally { setSaving(false); }
  };

  const handlePromote = async (person) => {
    try {
      await api.post(`/personnel/${person.id}/promote`);
      fetchPersonnel();
    } catch (err) { alert(err.response?.data?.error || 'Failed to promote'); }
  };

  const handleDemote = async (person) => {
    try {
      await api.post(`/personnel/${person.id}/demote`);
      fetchPersonnel();
    } catch (err) { alert(err.response?.data?.error || 'Failed to demote'); }
  };

  const handleStatusChanged = (id, newStatus) => {
    setPersonnel((prev) =>
      prev.map((p) => p.id === id ? { ...p, member_status: newStatus } : p)
    );
  };

  const showHover = (person, e) => {
    clearTimeout(hoverTimer.current);
    setHoverPerson(person);
    setHoverPos({ x: e.clientX, y: e.clientY });
    hoverTimer.current = setTimeout(() => setHoverVisible(true), 350);
  };

  const hideHover = () => {
    clearTimeout(hoverTimer.current);
    setHoverVisible(false);
    setTimeout(() => setHoverPerson(null), 200);
  };

  const marines = personnel.filter((p) => p.status === 'Marine').length;
  const civilians = personnel.filter((p) => p.status === 'Civilian').length;

  return (
    <div className="space-y-4 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4a6fa5]" />
            <input
              className="input-field pl-8 w-52"
              placeholder="Search personnel..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-1">
            {['All', 'Marine', 'Civilian'].map((f) => (
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
        </div>
        {isAdmin && (
          <button onClick={() => setModal('add')} className="btn-primary flex items-center gap-2 shrink-0">
            <UserPlus size={13} /> Add Personnel
          </button>
        )}
      </div>

      {/* Summary */}
      <div className="flex items-center gap-4 text-xs font-mono text-[#1a2f55]">
        <span>TOTAL: <span className="text-[#4a6fa5]">{personnel.length}</span></span>
        <span>MARINES: <span className="text-[#4a6fa5]">{marines}</span></span>
        <span>CIVILIANS: <span className="text-[#4a6fa5]">{civilians}</span></span>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="flex items-center gap-4 px-4 py-2.5 border-b border-[#162448] bg-[#060918]">
          <div className="w-2 shrink-0" />
          <div className="flex-1 section-header">Name / Rank</div>
          <div className="w-28 section-header hidden sm:block">Member Status</div>
          <div className="w-20 section-header hidden md:block">TIG</div>
          <div className="w-16 section-header hidden lg:block">Awards</div>
          <div className="w-20 section-header hidden sm:block">Type</div>
          {isAdmin && <div className="w-32 section-header text-right">Actions</div>}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={18} className="animate-spin text-[#3b82f6]" />
          </div>
        ) : personnel.length === 0 ? (
          <div className="py-12 text-center text-[#1a2f55] font-mono text-xs">NO PERSONNEL FOUND</div>
        ) : (
          personnel.map((person) => {
            const rankIdx = RANKS.indexOf(person.rank);
            const canPromote = person.status === 'Marine' && rankIdx < RANKS.length - 1;
            const canDemote = person.status === 'Marine' && rankIdx > 0;

            return (
              <div
                key={person.id}
                className="flex items-center gap-4 px-4 py-3 border-b border-[#162448]/50 last:border-0 hover:bg-[#0f1c35]/60 transition-colors group"
              >
                <div className={`w-1 h-8 rounded-full shrink-0 ${person.status === 'Marine' ? 'bg-[#3b82f6]' : 'bg-[#1a2f55]'}`} />

                <div className="flex-1 min-w-0">
                  <Link
                    to={`/personnel/${person.id}`}
                    className="block text-[#dbeafe] text-sm font-medium truncate hover:text-[#60a5fa] transition-colors"
                    onMouseEnter={(e) => showHover(person, e)}
                    onMouseLeave={hideHover}
                    onMouseMove={(e) => setHoverPos({ x: e.clientX, y: e.clientY })}
                  >
                    {person.name}
                  </Link>
                  <div className="text-[#4a6fa5] text-xs font-mono mt-0.5">
                    {person.status === 'Marine' ? (RANK_ABBREV[person.rank] || person.rank || '—') : 'CIV'}
                  </div>
                </div>

                <div className="w-28 hidden sm:block">
                  {isGuest ? (
                    <span className={MEMBER_STATUS_STYLES[person.member_status] || 'badge-muted'}>
                      {person.member_status || 'Active'}
                    </span>
                  ) : (
                    <MemberStatusDropdown person={person} onChanged={handleStatusChanged} />
                  )}
                </div>

                <div className="w-20 hidden md:block">
                  <div className="text-[#dbeafe] text-xs font-mono">
                    {calcTIG(person.rank_since, person.date_of_entry)}
                  </div>
                </div>

                <div className="w-16 hidden lg:block">
                  {person.awards?.length > 0 && (
                    <div className="flex items-center gap-1 text-amber-400">
                      <Star size={10} fill="currentColor" />
                      <span className="text-xs font-mono">{person.awards.length}</span>
                    </div>
                  )}
                </div>

                <div className="w-20 hidden sm:block">
                  <span className={person.status === 'Marine' ? 'badge-green' : 'badge-muted'}>
                    {person.status}
                  </span>
                </div>

                {isAdmin && (
                  <div className="w-32 flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {person.status === 'Marine' && (
                      <>
                        <button
                          onClick={() => handlePromote(person)}
                          disabled={!canPromote}
                          title="Promote"
                          className="p-1.5 text-[#2a4a80] hover:text-[#60a5fa] disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                        >
                          <ChevronUp size={14} />
                        </button>
                        <button
                          onClick={() => handleDemote(person)}
                          disabled={!canDemote}
                          title="Demote"
                          className="p-1.5 text-[#2a4a80] hover:text-amber-400 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                        >
                          <ChevronDown size={14} />
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => { setSelected(person); setModal('awards'); }}
                      title="Manage Awards"
                      className="p-1.5 text-[#2a4a80] hover:text-amber-400 transition-colors"
                    >
                      <Award size={14} />
                    </button>
                    <button
                      onClick={() => { setSelected(person); setModal('edit'); }}
                      title="Edit"
                      className="p-1.5 text-[#2a4a80] hover:text-[#dbeafe] transition-colors"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => { setSelected(person); setModal('delete'); }}
                      title="Remove"
                      className="p-1.5 text-[#2a4a80] hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <MarineHoverCard person={hoverPerson} x={hoverPos.x} y={hoverPos.y} visible={hoverVisible} />

      {modal === 'add' && (
        <Modal title="Add Personnel" onClose={closeModal}>
          <PersonnelForm onSave={handleAdd} onCancel={closeModal} saving={saving} />
        </Modal>
      )}
      {modal === 'edit' && selected && (
        <Modal title={`Edit — ${selected.name}`} onClose={closeModal}>
          <PersonnelForm
            initial={{ name: selected.name, status: selected.status, rank: selected.rank || '', date_of_entry: selected.date_of_entry }}
            onSave={handleEdit}
            onCancel={closeModal}
            saving={saving}
          />
        </Modal>
      )}
      {modal === 'delete' && selected && (
        <DeleteModal person={selected} onConfirm={handleDelete} onCancel={closeModal} deleting={saving} />
      )}
      {modal === 'awards' && selected && (
        <AwardModal person={selected} onClose={closeModal} onUpdate={fetchPersonnel} />
      )}
    </div>
  );
}
