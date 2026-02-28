import { useState, useEffect, useCallback, useRef } from 'react';
import { Target, Search, X, Loader2, ChevronRight, User } from 'lucide-react';
import api from '../utils/api';
import Modal from '../components/Modal';
import { useAuth } from '../context/AuthContext';

const RANK_ABBREV = {
  'Recruit': 'Rct', 'Private': 'Pvt', 'Private First Class': 'PFC',
  'Lance Corporal': 'LCpl', 'Corporal': 'Cpl', 'Sergeant': 'Sgt',
  'Staff Sergeant': 'SSgt', 'Gunnery Sergeant': 'GySgt',
  'Master Sergeant': 'MSgt', 'First Sergeant': '1stSgt',
  'Master Gunnery Sergeant': 'MGySgt', 'Sergeant Major': 'SgtMaj',
  'Second Lieutenant': '2ndLt', 'First Lieutenant': '1stLt',
  'Captain': 'Capt', 'Major': 'Maj', 'Lieutenant Colonel': 'LtCol', 'Colonel': 'Col',
};

const STATUS_DOT = {
  'Active': 'bg-emerald-400',
  'Leave of Absence': 'bg-amber-400',
  'Inactive': 'bg-[#2a4a80]',
};

// ── Slot card ──────────────────────────────────────────────────────────────────
function SlotCard({ slot, onClick, animDelay = 0, readOnly = false }) {
  const filled = !!slot.personnel_name;
  const rankAbbr = RANK_ABBREV[slot.personnel_rank] || slot.personnel_rank || '';
  const dot = STATUS_DOT[slot.personnel_member_status] || 'bg-[#2a4a80]';

  return (
    <button
      onClick={() => onClick(slot)}
      className={`
        group relative w-full text-left rounded-sm border transition-all duration-200
        ${readOnly ? 'cursor-default' : 'hover:scale-105 focus:outline-none focus:ring-1 focus:ring-[#3b82f6]/50'}
        ${filled
          ? `bg-[#0c1428] border-[#3b82f6]/40 shadow-[0_0_12px_rgba(59,130,246,0.15)] ${readOnly ? '' : 'hover:shadow-[0_0_20px_rgba(59,130,246,0.35)] hover:border-[#3b82f6]/70'}`
          : `bg-[#060918]/60 border-dashed border-[#162448] ${readOnly ? '' : 'hover:border-[#3b82f6]/25 hover:bg-[#0c1428]/60'}`
        }
      `}
      style={{ animationDelay: `${animDelay}ms`, animation: 'fadeSlideIn 300ms ease both' }}
    >
      <div className="px-2.5 py-2">
        <div className="text-[10px] font-mono text-[#2a4a80] mb-0.5 truncate">{slot.name}</div>
        {filled ? (
          <div className="flex items-center gap-1.5">
            <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} />
            <div className="text-[#dbeafe] text-xs font-medium truncate">
              {rankAbbr} {slot.personnel_name}
            </div>
          </div>
        ) : (
          <div className="text-[#1a2f55] text-[10px] font-mono tracking-wider">UNASSIGNED</div>
        )}
      </div>
    </button>
  );
}

// ── Section header ─────────────────────────────────────────────────────────────
function SectionLabel({ label, callsign, count, total }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <span className="text-[#dbeafe] text-xs font-medium">{label}</span>
      {callsign && (
        <span className="text-[10px] font-mono text-[#3b82f6] bg-[#3b82f6]/10 border border-[#3b82f6]/25 px-1.5 py-0.5 rounded-sm">
          {callsign}
        </span>
      )}
      <span className="text-[#1a2f55] text-[10px] font-mono ml-auto">{count}/{total}</span>
    </div>
  );
}

// ── Assignment modal ───────────────────────────────────────────────────────────
function AssignModal({ slot, personnel, onAssign, onUnassign, onClose, saving }) {
  const [search, setSearch] = useState('');
  const filtered = personnel.filter((p) => {
    if (!search) return true;
    return p.name.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <Modal title={slot.name} onClose={onClose} maxWidth="max-w-sm">
      <div className="space-y-3">
        {slot.personnel_name && (
          <div className="flex items-center justify-between p-2.5 rounded-sm bg-[#3b82f6]/5 border border-[#3b82f6]/20">
            <div>
              <div className="text-[#dbeafe] text-xs font-medium">{slot.personnel_name}</div>
              <div className="text-[#4a6fa5] text-[10px] font-mono">{slot.personnel_rank} · Currently Assigned</div>
            </div>
            <button
              onClick={() => onUnassign(slot)}
              disabled={saving}
              className="text-red-400/70 hover:text-red-400 text-[10px] font-mono transition-colors flex items-center gap-1"
            >
              {saving ? <Loader2 size={10} className="animate-spin" /> : <X size={10} />}
              Unassign
            </button>
          </div>
        )}

        <div className="relative">
          <Search size={11} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#2a4a80]" />
          <input
            className="input-field pl-8 text-xs py-1.5"
            placeholder="Search marines..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus={!slot.personnel_name}
          />
        </div>

        <div className="max-h-56 overflow-y-auto space-y-1 pr-1 -mr-1 custom-scroll">
          {filtered.length === 0 && (
            <div className="text-center text-[#1a2f55] text-[10px] font-mono py-4">NO MARINES FOUND</div>
          )}
          {filtered.map((p) => {
            const isAssigned = p.id === slot.personnel_id;
            const rankAbbr = RANK_ABBREV[p.rank] || p.rank || '';
            const dot = STATUS_DOT[p.member_status] || 'bg-[#2a4a80]';
            return (
              <button
                key={p.id}
                onClick={() => onAssign(slot, p)}
                disabled={saving || isAssigned}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-sm text-left transition-colors
                  ${isAssigned
                    ? 'bg-[#3b82f6]/10 border border-[#3b82f6]/30 cursor-default'
                    : 'hover:bg-[#0f1c35] border border-transparent hover:border-[#162448]'
                  }`}
              >
                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-[#dbeafe] text-xs truncate">{rankAbbr} {p.name}</div>
                  <div className="text-[#1a2f55] text-[10px] font-mono">{p.member_status}</div>
                </div>
                {isAssigned && (
                  <span className="text-[#3b82f6] text-[10px] font-mono shrink-0">Assigned</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}

// ── Fireteam block ─────────────────────────────────────────────────────────────
function FireteamBlock({ label, slots, onSlotClick, baseDelay, readOnly = false }) {
  return (
    <div className="border border-[#162448]/60 rounded-sm p-2 bg-[#060918]/40">
      <div className="text-[10px] font-mono text-[#2a4a80] mb-1.5 tracking-wider">{label}</div>
      <div className="space-y-1">
        {slots.map((s, i) => (
          <SlotCard key={s.id} slot={s} onClick={onSlotClick} animDelay={baseDelay + i * 25} readOnly={readOnly} />
        ))}
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function Orbat() {
  const { isGuest } = useAuth();
  const [slots, setSlots]         = useState([]);
  const [personnel, setPersonnel] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [saving, setSaving]       = useState(false);
  const [offset, setOffset]       = useState({ x: 0, y: 0 });
  const containerRef              = useRef(null);
  const frameRef                  = useRef(null);

  // ── Fetch data ──────────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [slotsRes, personnelRes] = await Promise.all([
        api.get('/orbat'),
        api.get('/personnel'),
      ]);
      setSlots(slotsRes.data);
      setPersonnel(personnelRes.data.filter((p) => p.status === 'Marine'));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Parallax ────────────────────────────────────────────────────────────────
  const handleMouseMove = useCallback((e) => {
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(() => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width  - 0.5) * 18;
      const y = ((e.clientY - rect.top)  / rect.height - 0.5) * 9;
      setOffset({ x, y });
    });
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    setOffset({ x: 0, y: 0 });
  }, []);

  // ── Slot helpers ────────────────────────────────────────────────────────────
  const byId = (id) => slots.find((s) => s.id === id);
  const childrenOf = (parentId) => slots.filter((s) => s.parent_id === parentId).sort((a, b) => a.sort_order - b.sort_order);

  const roleSlots = slots.filter((s) => s.type === 'role');
  const filledCount = roleSlots.filter((s) => s.personnel_id).length;
  const totalRoles  = roleSlots.length;

  // ── Slot click — guests cannot assign ─────────────────────────────────────
  const handleSlotClick = (slot) => {
    if (isGuest) return;
    setSelectedSlot(slot);
  };

  // ── Assign / Unassign ──────────────────────────────────────────────────────
  const handleAssign = async (slot, person) => {
    setSaving(true);
    try {
      await api.post('/orbat/assign', { slotId: slot.id, personnelId: person.id });
      setSlots((prev) => prev.map((s) => {
        if (s.id === slot.id) return { ...s, personnel_id: person.id, personnel_name: person.name, personnel_rank: person.rank, personnel_member_status: person.member_status };
        // Clear person from any previous slot
        if (s.personnel_id === person.id) return { ...s, personnel_id: null, personnel_name: null, personnel_rank: null, personnel_member_status: null };
        return s;
      }));
      setSelectedSlot(null);
    } catch (err) { alert(err.response?.data?.error || 'Failed to assign'); }
    finally { setSaving(false); }
  };

  const handleUnassign = async (slot) => {
    setSaving(true);
    try {
      await api.delete(`/orbat/assign/${slot.id}`);
      setSlots((prev) => prev.map((s) => s.id === slot.id
        ? { ...s, personnel_id: null, personnel_name: null, personnel_rank: null, personnel_member_status: null }
        : s));
      setSelectedSlot(null);
    } catch { alert('Failed to unassign'); }
    finally { setSaving(false); }
  };

  // ── Build tree helpers ─────────────────────────────────────────────────────
  const getSlots = (parentId, names) => {
    const children = childrenOf(parentId);
    return names.map((n) => children.find((s) => s.name === n)).filter(Boolean);
  };

  const getFireteam = (parentId, label) => {
    const sq = byId(parentId);
    if (!sq) return null;
    const ft = childrenOf(parentId).find((s) => s.name === label || s.id.includes(label.toLowerCase().replace(/\s/g, '-')));
    return ft ? childrenOf(ft.id) : [];
  };

  // ── Structured selectors ───────────────────────────────────────────────────
  const meu       = byId('meu-1');
  const bat       = byId('bat-1');
  const company   = byId('co-1');
  const platoon   = byId('plt-outlaw');
  const cmdOdin   = byId('cmd-odin');
  const odinRoles = cmdOdin ? childrenOf('cmd-odin') : [];
  const sq1       = byId('sq-1');
  const sq2       = byId('sq-2');
  const avn       = byId('avn-maw');
  const avnRoles  = avn ? childrenOf('avn-maw') : [];

  const getSquadCore = (sqId) => {
    const ch = childrenOf(sqId);
    return ch.filter((s) => s.type === 'role');
  };

  const getFireteams = (sqId) => {
    return childrenOf(sqId).filter((s) => s.type === 'fireteam');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={18} className="animate-spin text-[#3b82f6]" />
      </div>
    );
  }

  const bgStyle = { transform: `translate(${offset.x * 0.7}px, ${offset.y * 0.7}px)`, transition: 'transform 0.15s ease-out' };
  const fgStyle = { transform: `translate(${offset.x * 0.15}px, ${offset.y * 0.15}px)`, transition: 'transform 0.15s ease-out' };

  return (
    <div className="space-y-4 max-w-5xl">
      {/* Inject keyframe animation */}
      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Target size={14} className="text-[#3b82f6]" />
          <span className="section-header text-sm">Order of Battle</span>
          <div className="flex items-center gap-1.5 text-xs font-mono text-[#1a2f55]">
            <span className="text-[#4a6fa5]">{filledCount}</span>
            <span>/</span>
            <span>{totalRoles}</span>
            <span className="ml-1">slots filled</span>
          </div>
        </div>
        {/* Fill bar */}
        <div className="flex items-center gap-2">
          <div className="w-32 h-1.5 bg-[#162448] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#3b82f6] rounded-full transition-all duration-700"
              style={{ width: `${totalRoles ? (filledCount / totalRoles) * 100 : 0}%` }}
            />
          </div>
          <span className="text-[#1a2f55] text-xs font-mono">
            {totalRoles ? Math.round((filledCount / totalRoles) * 100) : 0}%
          </span>
        </div>
      </div>

      {/* Parallax container */}
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="relative rounded-sm overflow-hidden select-none"
      >
        {/* Background grid */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            ...bgStyle,
            backgroundImage: `radial-gradient(circle, #1a2f55 1px, transparent 1px)`,
            backgroundSize: '28px 28px',
            opacity: 0.25,
          }}
        />

        {/* Content layer */}
        <div style={fgStyle} className="relative space-y-6 p-4">

          {/* ── MEU → Battalion → Company → Platoon chain ── */}
          <div className="flex items-center gap-0 justify-center flex-wrap text-[10px] font-mono text-[#1a2f55]">
            {[meu, bat, company, platoon].filter(Boolean).map((node, i, arr) => (
              <span key={node.id} className="flex items-center gap-0">
                <span className="text-[#4a6fa5] px-2">{node.name}</span>
                {i < arr.length - 1 && <ChevronRight size={11} className="text-[#162448]" />}
              </span>
            ))}
            {platoon?.callsign && (
              <span className="ml-2 text-[10px] font-mono text-[#3b82f6] bg-[#3b82f6]/10 border border-[#3b82f6]/25 px-1.5 py-0.5 rounded-sm">
                {platoon.callsign}
              </span>
            )}
          </div>

          {/* ── Odin Command ── */}
          {cmdOdin && (
            <div className="card p-3" style={{ animationDelay: '0ms', animation: 'fadeSlideIn 300ms ease both' }}>
              <SectionLabel
                label={cmdOdin.name}
                callsign={cmdOdin.callsign}
                count={odinRoles.filter((s) => s.personnel_id).length}
                total={odinRoles.length}
              />
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {odinRoles.map((s, i) => (
                  <SlotCard key={s.id} slot={s} onClick={handleSlotClick} animDelay={i * 40} readOnly={isGuest} />
                ))}
              </div>
            </div>
          )}

          {/* ── Squads ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[sq1, sq2].filter(Boolean).map((sq, sqIdx) => {
              const coreRoles = getSquadCore(sq.id).filter((s) => s.type === 'role');
              const fireteams = getFireteams(sq.id);
              const allSlots  = [
                ...coreRoles,
                ...fireteams.flatMap((ft) => childrenOf(ft.id)),
              ];
              const filled = allSlots.filter((s) => s.personnel_id).length;

              return (
                <div key={sq.id} className="card p-3">
                  <SectionLabel
                    label={sq.name}
                    count={filled}
                    total={allSlots.length}
                  />

                  {/* Squad core roles */}
                  {coreRoles.length > 0 && (
                    <div className="grid grid-cols-3 gap-1.5 mb-3">
                      {coreRoles.map((s, i) => (
                        <SlotCard key={s.id} slot={s} onClick={handleSlotClick} animDelay={sqIdx * 200 + i * 30} readOnly={isGuest} />
                      ))}
                    </div>
                  )}

                  {/* Fireteams */}
                  <div className="space-y-2">
                    {fireteams.map((ft, ftIdx) => {
                      const ftRoles = childrenOf(ft.id);
                      return (
                        <FireteamBlock
                          key={ft.id}
                          label={ft.name}
                          slots={ftRoles}
                          onSlotClick={handleSlotClick}
                          baseDelay={sqIdx * 200 + 100 + ftIdx * 80}
                          readOnly={isGuest}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Aviation ── */}
          {avn && (
            <div className="card p-3" style={{ animation: 'fadeSlideIn 300ms ease 400ms both' }}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-px h-4 bg-[#3b82f6]/30" />
                <SectionLabel
                  label={avn.name}
                  count={avnRoles.filter((s) => s.personnel_id).length}
                  total={avnRoles.length}
                />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {avnRoles.map((s, i) => (
                  <SlotCard key={s.id} slot={s} onClick={handleSlotClick} animDelay={400 + i * 35} readOnly={isGuest} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Minimap ── */}
      <div className="fixed bottom-6 right-6 z-30 pointer-events-none">
        <div className="bg-[#060918]/90 border border-[#162448] rounded-sm p-2 w-40 backdrop-blur-sm">
          <div className="text-[9px] font-mono text-[#2a4a80] mb-1.5 tracking-widest">ORBAT OVERVIEW</div>
          <div className="space-y-1">
            {/* MEU row */}
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-[#3b82f6]/40 border border-[#3b82f6]/60 rounded-sm shrink-0" />
              <div className="text-[8px] font-mono text-[#4a6fa5] truncate">26th MEU (SOC)</div>
            </div>
            {/* Odin */}
            <div className="ml-2 flex items-center gap-1">
              <div className={`w-1.5 h-1.5 rounded-sm shrink-0 ${odinRoles.filter((s) => s.personnel_id).length === odinRoles.length && odinRoles.length > 0 ? 'bg-[#3b82f6]/70' : 'bg-[#162448]'}`} />
              <div className="text-[8px] font-mono text-[#1a2f55]">
                Odin: {odinRoles.filter((s) => s.personnel_id).length}/{odinRoles.length}
              </div>
            </div>
            {/* Squads */}
            {[sq1, sq2].filter(Boolean).map((sq) => {
              const sqCh = slots.filter((s) => {
                const isChild = s.parent_id === sq.id || slots.find((p) => p.id === s.parent_id && p.parent_id === sq.id);
                return isChild && s.type === 'role';
              });
              const sqFilled = sqCh.filter((s) => s.personnel_id).length;
              return (
                <div key={sq.id} className="ml-2 flex items-center gap-1">
                  <div className={`w-1.5 h-1.5 rounded-sm shrink-0 ${sqFilled === sqCh.length && sqCh.length > 0 ? 'bg-[#3b82f6]/70' : sqFilled > 0 ? 'bg-[#3b82f6]/30' : 'bg-[#162448]'}`} />
                  <div className="text-[8px] font-mono text-[#1a2f55]">
                    {sq.name}: {sqFilled}/{sqCh.length}
                  </div>
                </div>
              );
            })}
            {/* Aviation */}
            {avn && (
              <div className="ml-2 flex items-center gap-1">
                <div className={`w-1.5 h-1.5 rounded-sm shrink-0 ${avnRoles.filter((s) => s.personnel_id).length === avnRoles.length && avnRoles.length > 0 ? 'bg-[#3b82f6]/70' : avnRoles.some((s) => s.personnel_id) ? 'bg-[#3b82f6]/30' : 'bg-[#162448]'}`} />
                <div className="text-[8px] font-mono text-[#1a2f55]">
                  MAW: {avnRoles.filter((s) => s.personnel_id).length}/{avnRoles.length}
                </div>
              </div>
            )}
          </div>
          {/* Fill bar */}
          <div className="mt-2 w-full h-0.5 bg-[#162448] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#3b82f6]/50 rounded-full"
              style={{ width: `${totalRoles ? (filledCount / totalRoles) * 100 : 0}%` }}
            />
          </div>
          <div className="text-[8px] font-mono text-[#1a2f55] mt-1 text-right">{filledCount}/{totalRoles}</div>
        </div>
      </div>

      {/* ── Assignment modal ── */}
      {selectedSlot && (
        <AssignModal
          slot={selectedSlot}
          personnel={personnel}
          onAssign={handleAssign}
          onUnassign={handleUnassign}
          onClose={() => setSelectedSlot(null)}
          saving={saving}
        />
      )}
    </div>
  );
}
