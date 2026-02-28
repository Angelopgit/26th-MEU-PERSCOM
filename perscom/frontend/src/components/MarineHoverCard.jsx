import { createPortal } from 'react-dom';
import { differenceInDays } from 'date-fns';

const RANK_ABBREV = {
  'Recruit': 'Rct', 'Private': 'Pvt', 'Private First Class': 'PFC',
  'Lance Corporal': 'LCpl', 'Corporal': 'Cpl', 'Sergeant': 'Sgt',
  'Staff Sergeant': 'SSgt', 'Gunnery Sergeant': 'GySgt',
  'Master Sergeant': 'MSgt', 'First Sergeant': '1stSgt',
  'Master Gunnery Sergeant': 'MGySgt', 'Sergeant Major': 'SgtMaj',
  'Second Lieutenant': '2ndLt', 'First Lieutenant': '1stLt',
  'Captain': 'Capt', 'Major': 'Maj', 'Lieutenant Colonel': 'LtCol', 'Colonel': 'Col',
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

const STATUS_STYLES = {
  'Active':           'bg-[#3b82f6]/10 text-[#60a5fa] border-[#3b82f6]/30',
  'Leave of Absence': 'bg-amber-900/20 text-amber-400 border-amber-900/30',
  'Inactive':         'bg-[#162448]/40 text-[#4a6fa5] border-[#162448]',
};

export default function MarineHoverCard({ person, x, y, visible }) {
  if (!person) return null;

  const cardWidth = 224;
  const cardHeight = 130;
  const margin = 16;

  const vw = window.innerWidth;
  const vh = window.innerHeight;

  let left = x + 12;
  let top = y + 12;

  if (left + cardWidth + margin > vw) left = x - cardWidth - 12;
  if (top + cardHeight + margin > vh) top = y - cardHeight - 12;

  const rankAbbr = person.status === 'Marine'
    ? (RANK_ABBREV[person.rank] || person.rank || '—')
    : 'CIV';

  const tig = calcTIG(person.rank_since, person.date_of_entry);
  const tis = calcTIG(null, person.date_of_entry);
  const memberStatus = person.member_status || 'Active';
  const statusStyle = STATUS_STYLES[memberStatus] || STATUS_STYLES['Active'];

  return createPortal(
    <div
      style={{
        position: 'fixed',
        left,
        top,
        zIndex: 9999,
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(4px)',
        transition: 'opacity 150ms ease, transform 150ms ease',
        pointerEvents: 'none',
        width: cardWidth,
      }}
    >
      <div
        className="bg-[#0c1428] border border-[#3b82f6]/40 rounded-sm shadow-xl"
        style={{ boxShadow: '0 0 20px rgba(59,130,246,0.15), 0 4px 24px rgba(0,0,0,0.6)' }}
      >
        {/* Header accent bar */}
        <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-[#3b82f6]/60 to-transparent rounded-t-sm" />

        <div className="px-3 py-2.5 space-y-2">
          {/* Name + rank */}
          <div>
            <div className="text-[#dbeafe] text-sm font-medium leading-tight truncate">
              {person.name}
            </div>
            <div className="text-[#4a6fa5] text-[10px] font-mono mt-0.5">{rankAbbr}</div>
          </div>

          {/* Status badge */}
          <div>
            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-sm uppercase tracking-wider font-medium border ${statusStyle}`}>
              {memberStatus}
            </span>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 pt-0.5 border-t border-[#162448]">
            <div>
              <div className="text-[#1a2f55] text-[9px] font-mono uppercase tracking-widest">TIG</div>
              <div className="text-[#93c5fd] text-xs font-mono">{tig}</div>
            </div>
            <div>
              <div className="text-[#1a2f55] text-[9px] font-mono uppercase tracking-widest">TIS</div>
              <div className="text-[#93c5fd] text-xs font-mono">{tis}</div>
            </div>
            <div className="col-span-2">
              <div className="text-[#1a2f55] text-[9px] font-mono uppercase tracking-widest">Joined</div>
              <div className="text-[#93c5fd] text-xs font-mono">{person.date_of_entry}</div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
