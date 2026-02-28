import { useState, useEffect, useCallback } from 'react';
import { ScrollText, Search, RefreshCw, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import api from '../utils/api';

const ACTION_META = {
  PERSONNEL_ADDED:      { label: 'Personnel Added',    cls: 'badge-green'  },
  PERSONNEL_REMOVED:    { label: 'Personnel Removed',  cls: 'badge-red'    },
  PROMOTED:             { label: 'Promoted',           cls: 'badge-blue'   },
  DEMOTED:              { label: 'Demoted',            cls: 'badge-amber'  },
  AWARD_GRANTED:        { label: 'Award Granted',      cls: 'badge-amber'  },
  EVALUATION_CONDUCTED: { label: 'Evaluation',         cls: 'badge-muted'  },
  OPERATION_CREATED:    { label: 'Op Created',         cls: 'badge-blue'   },
  OPERATION_UPDATED:    { label: 'Op Updated',         cls: 'badge-blue'   },
  OPERATION_DELETED:    { label: 'Op Deleted',         cls: 'badge-red'    },
  STATUS_CHANGED:       { label: 'Status Changed',     cls: 'badge-amber'  },
  QUALIFICATION_ADDED:  { label: 'Qual Added',         cls: 'badge-muted'  },
  QUALIFICATION_REMOVED:{ label: 'Qual Removed',       cls: 'badge-muted'  },
  ORBAT_ASSIGNED:       { label: 'ORBAT Assigned',     cls: 'badge-blue'   },
  IMAGE_UPLOADED:       { label: 'Image Uploaded',     cls: 'badge-muted'  },
  IMAGE_REMOVED:        { label: 'Image Removed',      cls: 'badge-muted'  },
};

const ACTION_KEYS = Object.keys(ACTION_META);

function ActionBadge({ action }) {
  const meta = ACTION_META[action];
  if (!meta) return <span className="badge-muted font-mono text-[10px]">{action}</span>;
  return <span className={`${meta.cls} font-mono text-[10px] whitespace-nowrap`}>{meta.label}</span>;
}

export default function EventLog() {
  const [rows, setRows]       = useState([]);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(1);
  const [pages, setPages]     = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch]   = useState('');
  const [action, setAction]   = useState('');
  const [inputVal, setInputVal] = useState('');

  const LIMIT = 25;

  const fetchLog = useCallback(async (pg = 1, silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const params = new URLSearchParams({ page: pg, limit: LIMIT });
      if (action)  params.set('action', action);
      if (search)  params.set('search', search);
      const res = await api.get(`/activity?${params}`);
      setRows(res.data.rows);
      setTotal(res.data.total);
      setPage(res.data.page);
      setPages(res.data.pages);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [action, search]);

  useEffect(() => { fetchLog(1); }, [fetchLog]);

  const handleSearch = (e) => {
    e.preventDefault();
    setSearch(inputVal.trim());
    setPage(1);
  };

  const handleActionChange = (e) => {
    setAction(e.target.value);
    setPage(1);
  };

  const goPage = (p) => {
    if (p < 1 || p > pages) return;
    fetchLog(p);
  };

  return (
    <div className="space-y-4 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <ScrollText size={14} className="text-[#3b82f6]" />
          <span className="section-header text-sm">Activity Log</span>
          <span className="text-[#1a2f55] font-mono text-xs ml-1">{total} entries</span>
        </div>
        <button
          onClick={() => fetchLog(page, true)}
          disabled={refreshing}
          className="flex items-center gap-1.5 text-[#4a6fa5] hover:text-[#dbeafe] transition-colors text-xs font-mono"
        >
          <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Action filter */}
        <select
          value={action}
          onChange={handleActionChange}
          className="input-field py-1.5 text-xs w-44"
        >
          <option value="">All Actions</option>
          {ACTION_KEYS.map((k) => (
            <option key={k} value={k}>{ACTION_META[k].label}</option>
          ))}
        </select>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex items-center gap-2 flex-1 min-w-[180px]">
          <div className="relative flex-1">
            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#2a4a80]" />
            <input
              className="input-field pl-8 py-1.5 text-xs w-full"
              placeholder="Search details or user..."
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
            />
          </div>
          <button type="submit" className="btn-primary py-1.5 px-3 text-xs">Search</button>
          {(search || action) && (
            <button
              type="button"
              onClick={() => { setSearch(''); setAction(''); setInputVal(''); }}
              className="btn-ghost py-1.5 px-3 text-xs"
            >
              Clear
            </button>
          )}
        </form>
      </div>

      {/* Log table */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={18} className="animate-spin text-[#3b82f6]" />
        </div>
      ) : rows.length === 0 ? (
        <div className="card py-16 text-center text-[#1a2f55] font-mono text-xs">NO LOG ENTRIES FOUND</div>
      ) : (
        <div className="card overflow-hidden">
          <div className="divide-y divide-[#162448]/40">
            {rows.map((row) => (
              <div key={row.id} className="flex items-start gap-3 px-4 py-3 hover:bg-[#0f1c35]/40 transition-colors">
                {/* Timestamp */}
                <div className="text-[#1a2f55] font-mono text-[10px] w-28 shrink-0 mt-0.5 leading-relaxed">
                  <div>{format(parseISO(row.created_at), 'MMM dd, yyyy')}</div>
                  <div>{format(parseISO(row.created_at), 'HH:mm:ss')}</div>
                </div>

                {/* Badge */}
                <div className="w-28 shrink-0 mt-0.5">
                  <ActionBadge action={row.action} />
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <p className="text-[#dbeafe] text-xs leading-relaxed">{row.details}</p>
                </div>

                {/* User */}
                <div className="text-[#4a6fa5] font-mono text-[10px] shrink-0 text-right mt-0.5">
                  {row.display_name || '—'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-[#1a2f55]">
            Page {page} of {pages} · {total} total
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => goPage(page - 1)}
              disabled={page <= 1}
              className="p-1.5 text-[#4a6fa5] hover:text-[#dbeafe] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={14} />
            </button>

            {/* Page number pills */}
            {Array.from({ length: Math.min(pages, 7) }, (_, i) => {
              let p;
              if (pages <= 7) {
                p = i + 1;
              } else if (page <= 4) {
                p = i + 1;
              } else if (page >= pages - 3) {
                p = pages - 6 + i;
              } else {
                p = page - 3 + i;
              }
              return (
                <button
                  key={p}
                  onClick={() => goPage(p)}
                  className={`w-7 h-7 rounded-sm text-xs transition-colors ${
                    p === page
                      ? 'bg-[#3b82f6]/10 text-[#60a5fa] border border-[#3b82f6]/40'
                      : 'text-[#4a6fa5] hover:text-[#dbeafe] border border-transparent hover:border-[#162448]'
                  }`}
                >
                  {p}
                </button>
              );
            })}

            <button
              onClick={() => goPage(page + 1)}
              disabled={page >= pages}
              className="p-1.5 text-[#4a6fa5] hover:text-[#dbeafe] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
