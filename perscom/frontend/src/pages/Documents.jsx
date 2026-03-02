import { useState, useEffect, useRef, useCallback } from 'react';
import {
  FileText, Package, Clock, Plus, Edit2, Trash2, Loader2,
  Bold, Italic, X, ChevronDown, ChevronUp, AlertTriangle, Image,
  FileDown, Maximize2,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import Modal from '../components/Modal';
import { useAuth } from '../context/AuthContext';

const BACKEND = import.meta.env.BASE_URL.replace(/\/$/, '');
// Railway backend URL for DOCX Office Online viewer (needs publicly reachable URL)
const RAILWAY_ORIGIN = 'https://26th-meu-perscom-production.up.railway.app';

// ── Colour palette for rich text editor ──────────────────────────────────────
const COLORS = [
  { label: 'White',    value: '#f1f5f9' },
  { label: 'Blue',     value: '#60a5fa' },
  { label: 'Cyan',     value: '#22d3ee' },
  { label: 'Green',    value: '#4ade80' },
  { label: 'Amber',    value: '#fbbf24' },
  { label: 'Red',      value: '#f87171' },
  { label: 'Gray',     value: '#94a3b8' },
];

// ── Rich Text Editor ──────────────────────────────────────────────────────────
function RichTextEditor({ value, onChange }) {
  const editorRef = useRef(null);
  const [showColors, setShowColors] = useState(false);
  const colorRef = useRef(null);

  const lastValueRef = useRef(value);
  useEffect(() => {
    if (editorRef.current && value !== lastValueRef.current) {
      editorRef.current.innerHTML = value || '';
      lastValueRef.current = value;
    }
  }, [value]);

  useEffect(() => {
    const handler = (e) => {
      if (colorRef.current && !colorRef.current.contains(e.target)) setShowColors(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const exec = (cmd, val = null) => {
    editorRef.current.focus();
    document.execCommand(cmd, false, val);
    const html = editorRef.current.innerHTML;
    lastValueRef.current = html;
    onChange(html);
  };

  const applyColor = (color) => {
    editorRef.current.focus();
    const sel = window.getSelection();
    if (sel && sel.rangeCount) {
      document.execCommand('foreColor', false, color);
      const html = editorRef.current.innerHTML;
      lastValueRef.current = html;
      onChange(html);
    }
    setShowColors(false);
  };

  const handleInput = () => {
    const html = editorRef.current.innerHTML;
    lastValueRef.current = html;
    onChange(html);
  };

  const ToolBtn = ({ onMouseDown, title, children, active }) => (
    <button
      type="button"
      data-nosound
      onMouseDown={(e) => { e.preventDefault(); onMouseDown(); }}
      title={title}
      className={`px-2 py-1 rounded-sm text-xs font-mono transition-colors border ${
        active
          ? 'bg-[#3b82f6]/20 border-[#3b82f6]/50 text-[#60a5fa]'
          : 'border-[#162448] text-[#4a6fa5] hover:text-[#dbeafe] hover:border-[#3b82f6]/30'
      }`}
    >
      {children}
    </button>
  );

  return (
    <div className="border border-[#162448] rounded-sm overflow-hidden">
      <div className="flex items-center gap-1 flex-wrap px-2 py-1.5 bg-[#060918] border-b border-[#162448]">
        <ToolBtn onMouseDown={() => exec('bold')} title="Bold"><Bold size={11} /></ToolBtn>
        <ToolBtn onMouseDown={() => exec('italic')} title="Italic"><Italic size={11} /></ToolBtn>
        <div className="w-px h-4 bg-[#162448] mx-0.5" />
        {['h1','h2','h3'].map((h) => (
          <ToolBtn key={h} onMouseDown={() => exec('formatBlock', h)} title={h.toUpperCase()}>
            {h.toUpperCase()}
          </ToolBtn>
        ))}
        <ToolBtn onMouseDown={() => exec('formatBlock', 'p')} title="Normal text">¶</ToolBtn>
        <div className="w-px h-4 bg-[#162448] mx-0.5" />
        <div className="relative" ref={colorRef}>
          <button
            type="button"
            data-nosound
            onMouseDown={(e) => { e.preventDefault(); setShowColors((v) => !v); }}
            title="Text colour"
            className="px-2 py-1 rounded-sm text-xs font-mono border border-[#162448] text-[#4a6fa5] hover:text-[#dbeafe] hover:border-[#3b82f6]/30 transition-colors flex items-center gap-1"
          >
            <span className="text-[10px]">A</span>
            <span className="w-2 h-2 rounded-full bg-[#60a5fa]" />
          </button>
          {showColors && (
            <div className="absolute top-full left-0 mt-1 bg-[#0c1428] border border-[#162448] rounded-sm p-2 flex flex-wrap gap-1.5 z-50 w-36 shadow-xl">
              {COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  data-nosound
                  onMouseDown={(e) => { e.preventDefault(); applyColor(c.value); }}
                  title={c.label}
                  className="w-5 h-5 rounded-sm border border-[#162448] hover:scale-110 transition-transform"
                  style={{ backgroundColor: c.value }}
                />
              ))}
            </div>
          )}
        </div>
        <div className="w-px h-4 bg-[#162448] mx-0.5" />
        <ToolBtn onMouseDown={() => exec('removeFormat')} title="Clear formatting">
          <X size={10} />
        </ToolBtn>
      </div>
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        className="min-h-[180px] p-3 text-[#dbeafe] text-sm outline-none leading-relaxed rich-content"
        style={{ caretColor: '#60a5fa' }}
      />
    </div>
  );
}

// ── Full-page file viewer modal ───────────────────────────────────────────────
function FileViewer({ file, onClose }) {
  const isPdf = file.file_type === 'pdf';
  const src = isPdf
    ? `${BACKEND}${file.file_url}`
    : `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(RAILWAY_ORIGIN + file.file_url)}`;

  return (
    <div className="fixed inset-0 z-[60] bg-black/90 flex flex-col">
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#090f1e] border-b border-[#162448] shrink-0">
        <div className="flex items-center gap-2">
          <FileDown size={13} className="text-[#3b82f6]" />
          <span className="text-[#60a5fa] text-xs font-mono uppercase tracking-widest truncate max-w-xs">
            {file.file_name}
          </span>
        </div>
        <button onClick={onClose} className="text-[#2a4a80] hover:text-[#dbeafe] transition-colors p-1">
          <X size={15} />
        </button>
      </div>
      <div className="flex-1 min-h-0">
        <iframe
          src={src}
          className="w-full h-full border-0"
          title={file.file_name}
          allow="fullscreen"
        />
      </div>
    </div>
  );
}

// ── Document card ─────────────────────────────────────────────────────────────
function DocCard({ doc, isAdmin, onEdit, onDelete, onImagesChange, onFilesChange }) {
  const [expanded, setExpanded] = useState(false);
  const [images, setImages] = useState(doc.images || []);
  const [files, setFiles] = useState(doc.files || []);
  const [uploading, setUploading] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [lightbox, setLightbox] = useState(null);
  const [viewFile, setViewFile] = useState(null);
  const imageRef = useRef(null);
  const fileRef = useRef(null);

  const handleUploadImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const res = await api.post(`/documents/${doc.id}/images`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const updated = [...images, res.data];
      setImages(updated);
      onImagesChange?.(doc.id, updated);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to upload image');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleUploadFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingFile(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await api.post(`/documents/${doc.id}/files`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const updated = [...files, res.data];
      setFiles(updated);
      onFilesChange?.(doc.id, updated);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to upload file');
    } finally {
      setUploadingFile(false);
      e.target.value = '';
    }
  };

  const handleDeleteImage = async (imgId) => {
    try {
      await api.delete(`/documents/${doc.id}/images/${imgId}`);
      const updated = images.filter((i) => i.id !== imgId);
      setImages(updated);
      onImagesChange?.(doc.id, updated);
    } catch {
      alert('Failed to delete image');
    }
  };

  const handleDeleteFile = async (fileId) => {
    if (!confirm('Delete this file attachment?')) return;
    try {
      await api.delete(`/documents/${doc.id}/files/${fileId}`);
      const updated = files.filter((f) => f.id !== fileId);
      setFiles(updated);
      onFilesChange?.(doc.id, updated);
    } catch {
      alert('Failed to delete file');
    }
  };

  return (
    <>
      <div className="card overflow-hidden">
        <div
          className="flex items-start justify-between gap-3 px-4 py-3 cursor-pointer hover:bg-[#0f1c35]/40 transition-colors"
          onClick={() => setExpanded((v) => !v)}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <FileText size={12} className="text-[#3b82f6] shrink-0" />
              <h3 className="text-[#dbeafe] text-sm font-medium truncate">{doc.title}</h3>
              {images.length > 0 && (
                <span className="text-[#1a2f55] text-[9px] font-mono flex items-center gap-1">
                  <Image size={8} /> {images.length}
                </span>
              )}
              {files.length > 0 && (
                <span className="text-[#1a2f55] text-[9px] font-mono flex items-center gap-1">
                  <FileDown size={8} /> {files.length}
                </span>
              )}
            </div>
            <div className="text-[#1a2f55] text-[10px] font-mono mt-0.5">
              {doc.author} · {format(parseISO(doc.created_at), 'MMM dd, yyyy')}
              {doc.updated_at !== doc.created_at && (
                <span className="ml-2 text-[#0f2040]">(edited)</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {isAdmin && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); onEdit(doc); }}
                  className="p-1.5 text-[#2a4a80] hover:text-[#dbeafe] transition-colors"
                  title="Edit"
                >
                  <Edit2 size={12} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(doc); }}
                  className="p-1.5 text-[#2a4a80] hover:text-red-400 transition-colors"
                  title="Delete"
                >
                  <Trash2 size={12} />
                </button>
              </>
            )}
            {expanded ? <ChevronUp size={14} className="text-[#2a4a80]" /> : <ChevronDown size={14} className="text-[#2a4a80]" />}
          </div>
        </div>

        {expanded && (
          <div className="border-t border-[#162448]/50">
            {doc.content && (
              <div
                className="px-4 pb-4 pt-3 text-sm text-[#93c5fd] leading-relaxed rich-content"
                dangerouslySetInnerHTML={{ __html: doc.content }}
              />
            )}

            {/* Attached files (PDF/DOCX) */}
            {(files.length > 0 || isAdmin) && (
              <div className={`px-4 pb-3 ${doc.content ? 'border-t border-[#162448]/30 pt-3' : 'pt-3'}`}>
                {files.length > 0 && (
                  <div className="space-y-1.5 mb-2">
                    {files.map((f) => (
                      <div key={f.id} className="flex items-center gap-2 group/file">
                        <button
                          onClick={() => setViewFile(f)}
                          className="flex items-center gap-2 flex-1 min-w-0 text-left hover:text-[#dbeafe] transition-colors"
                        >
                          <div className={`shrink-0 text-[9px] font-mono px-1.5 py-0.5 rounded-sm border ${
                            f.file_type === 'pdf'
                              ? 'text-red-400 border-red-900/40 bg-red-950/20'
                              : 'text-blue-400 border-blue-900/40 bg-blue-950/20'
                          }`}>
                            {f.file_type.toUpperCase()}
                          </div>
                          <Maximize2 size={10} className="text-[#2a4a80] shrink-0" />
                          <span className="text-[#4a6fa5] text-xs truncate group-hover/file:text-[#dbeafe] transition-colors">
                            {f.file_name}
                          </span>
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => handleDeleteFile(f.id)}
                            className="opacity-0 group-hover/file:opacity-100 p-1 text-[#2a4a80] hover:text-red-400 transition-all shrink-0"
                          >
                            <X size={10} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {isAdmin && (
                  <button
                    onClick={() => fileRef.current?.click()}
                    disabled={uploadingFile}
                    className="flex items-center gap-1.5 text-[#1a2f55] hover:text-[#4a6fa5] text-[10px] font-mono transition-colors"
                  >
                    {uploadingFile ? <Loader2 size={10} className="animate-spin" /> : <FileDown size={10} />}
                    {uploadingFile ? 'Uploading...' : 'Attach PDF / DOCX'}
                  </button>
                )}
                <input ref={fileRef} type="file" accept=".pdf,.docx" className="hidden" onChange={handleUploadFile} />
              </div>
            )}

            {/* Images section */}
            {(images.length > 0 || isAdmin) && (
              <div className="px-4 pb-4 border-t border-[#162448]/30 pt-3">
                {images.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {images.map((img) => (
                      <div key={img.id} className="relative group/img">
                        <img
                          src={`${BACKEND}${img.image_url}`}
                          alt=""
                          className="h-24 w-auto object-cover rounded-sm border border-[#162448] cursor-pointer hover:border-[#3b82f6]/40 transition-colors"
                          onClick={() => setLightbox(`${BACKEND}${img.image_url}`)}
                        />
                        {isAdmin && (
                          <button
                            onClick={() => handleDeleteImage(img.id)}
                            className="absolute top-1 right-1 bg-[#06091a]/90 border border-red-900/50 rounded-sm p-0.5 text-red-400 opacity-0 group-hover/img:opacity-100 transition-opacity"
                            title="Delete image"
                          >
                            <X size={10} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {isAdmin && (
                  <button
                    onClick={() => imageRef.current?.click()}
                    disabled={uploading}
                    className="flex items-center gap-1.5 text-[#1a2f55] hover:text-[#4a6fa5] text-[10px] font-mono transition-colors"
                  >
                    {uploading ? <Loader2 size={10} className="animate-spin" /> : <Image size={10} />}
                    {uploading ? 'Uploading...' : 'Add Image'}
                  </button>
                )}
                <input ref={imageRef} type="file" accept="image/*" className="hidden" onChange={handleUploadImage} />
              </div>
            )}
          </div>
        )}

        {/* Image lightbox */}
        {lightbox && (
          <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 p-8" onClick={() => setLightbox(null)}>
            <img src={lightbox} alt="" className="max-w-full max-h-full object-contain rounded-sm" />
          </div>
        )}
      </div>

      {/* File viewer */}
      {viewFile && <FileViewer file={viewFile} onClose={() => setViewFile(null)} />}
    </>
  );
}

// ── Document modal (create / edit) ────────────────────────────────────────────
function DocModal({ initial, onSave, onClose, saving }) {
  const [title, setTitle] = useState(initial?.title || '');
  const [content, setContent] = useState(initial?.content || '');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSave({ title: title.trim(), content });
  };

  return (
    <Modal title={initial ? 'Edit Document' : 'New Document'} onClose={onClose} maxWidth="max-w-2xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Title / Headline</label>
          <input
            className="input-field"
            placeholder="Document title..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            autoFocus
          />
        </div>
        <div>
          <label className="label mb-2">Content</label>
          <RichTextEditor value={content} onChange={setContent} />
        </div>
        <div className="flex gap-2 justify-end pt-1">
          <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
          <button type="submit" disabled={saving || !title.trim()} className="btn-primary flex items-center gap-2">
            {saving && <Loader2 size={13} className="animate-spin" />}
            {initial ? 'Save Changes' : 'Publish'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Gear Loadout panel ────────────────────────────────────────────────────────
function LoadoutCard({ loadout, isAdmin, onDelete, onAddItem, onDeleteItem }) {
  const [showAddItem, setShowAddItem] = useState(false);
  const [itemName, setItemName] = useState('');
  const [itemDesc, setItemDesc] = useState('');
  const [saving, setSaving] = useState(false);

  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!itemName.trim()) return;
    setSaving(true);
    await onAddItem(loadout.id, itemName.trim(), itemDesc.trim());
    setItemName('');
    setItemDesc('');
    setShowAddItem(false);
    setSaving(false);
  };

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#162448] bg-[#060918]/60">
        <div>
          <div className="flex items-center gap-2">
            <Package size={12} className="text-[#3b82f6]" />
            <span className="text-[#dbeafe] text-sm font-medium">{loadout.name}</span>
          </div>
          {loadout.description && (
            <p className="text-[#4a6fa5] text-xs mt-0.5 ml-4">{loadout.description}</p>
          )}
        </div>
        {isAdmin && (
          <button
            onClick={() => onDelete(loadout)}
            className="p-1.5 text-[#2a4a80] hover:text-red-400 transition-colors"
            title="Delete loadout"
          >
            <Trash2 size={12} />
          </button>
        )}
      </div>

      <div className="divide-y divide-[#162448]/40">
        {loadout.items.length === 0 && (
          <div className="px-4 py-3 text-[#1a2f55] text-[10px] font-mono">NO ITEMS LISTED</div>
        )}
        {loadout.items.map((item) => (
          <div key={item.id} className="flex items-center gap-3 px-4 py-2.5 group">
            <div className="w-1 h-1 rounded-full bg-[#3b82f6]/50 shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="text-[#dbeafe] text-xs font-medium">{item.name}</span>
              {item.description && (
                <span className="text-[#4a6fa5] text-xs ml-2">{item.description}</span>
              )}
            </div>
            {isAdmin && (
              <button
                onClick={() => onDeleteItem(loadout.id, item.id)}
                className="opacity-0 group-hover:opacity-100 p-1 text-[#2a4a80] hover:text-red-400 transition-all"
              >
                <X size={11} />
              </button>
            )}
          </div>
        ))}
      </div>

      {isAdmin && (
        <div className="border-t border-[#162448] px-4 py-2.5">
          {showAddItem ? (
            <form onSubmit={handleAddItem} className="flex items-center gap-2">
              <input
                className="input-field flex-1 py-1 text-xs"
                placeholder="Item name (e.g. M4A1 Rifle)"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                autoFocus
                required
              />
              <input
                className="input-field w-40 py-1 text-xs"
                placeholder="Note (optional)"
                value={itemDesc}
                onChange={(e) => setItemDesc(e.target.value)}
              />
              <button type="submit" disabled={saving} className="btn-primary py-1 px-3 text-xs flex items-center gap-1">
                {saving ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />}
                Add
              </button>
              <button type="button" onClick={() => setShowAddItem(false)} className="btn-ghost py-1 px-2 text-xs">
                <X size={11} />
              </button>
            </form>
          ) : (
            <button
              onClick={() => setShowAddItem(true)}
              className="flex items-center gap-1.5 text-[#2a4a80] hover:text-[#4a6fa5] text-xs font-mono transition-colors"
            >
              <Plus size={11} />
              Add item
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── LOA row ───────────────────────────────────────────────────────────────────
const RANK_ABBREV = {
  'Recruit': 'Rct', 'Private': 'Pvt', 'Private First Class': 'PFC',
  'Lance Corporal': 'LCpl', 'Corporal': 'Cpl', 'Sergeant': 'Sgt',
  'Staff Sergeant': 'SSgt', 'Gunnery Sergeant': 'GySgt',
  'Master Sergeant': 'MSgt', 'First Sergeant': '1stSgt',
  'Master Gunnery Sergeant': 'MGySgt', 'Sergeant Major': 'SgtMaj',
  'Second Lieutenant': '2ndLt', 'First Lieutenant': '1stLt',
  'Captain': 'Capt', 'Major': 'Maj', 'Lieutenant Colonel': 'LtCol', 'Colonel': 'Col',
};

// ── Main page ─────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'documents',  label: 'Documents',       icon: FileText },
  { id: 'loadouts',   label: 'Gear Loadouts',   icon: Package  },
  { id: 'loa',        label: 'Leave of Absence',icon: Clock    },
];

export default function Documents() {
  const { isAdmin } = useAuth();
  const [tab, setTab] = useState('documents');

  const [docs, setDocs]           = useState([]);
  const [docsLoading, setDocsLoading] = useState(true);
  const [docModal, setDocModal]   = useState(null);
  const [docSaving, setDocSaving] = useState(false);
  const [deleteDoc, setDeleteDoc] = useState(null);
  const [deleting, setDeleting]   = useState(false);

  const [loadouts, setLoadouts]   = useState([]);
  const [loadoutsLoading, setLoadoutsLoading] = useState(true);
  const [showNewLoadout, setShowNewLoadout] = useState(false);
  const [newLoadoutName, setNewLoadoutName] = useState('');
  const [newLoadoutDesc, setNewLoadoutDesc] = useState('');
  const [loadoutSaving, setLoadoutSaving] = useState(false);

  const [loaList, setLoaList]     = useState([]);
  const [loaLoading, setLoaLoading] = useState(true);

  const fetchDocs = useCallback(async () => {
    setDocsLoading(true);
    try { const r = await api.get('/documents'); setDocs(r.data); }
    catch {} finally { setDocsLoading(false); }
  }, []);

  const fetchLoadouts = useCallback(async () => {
    setLoadoutsLoading(true);
    try { const r = await api.get('/gear-loadouts'); setLoadouts(r.data); }
    catch {} finally { setLoadoutsLoading(false); }
  }, []);

  const fetchLoa = useCallback(async () => {
    setLoaLoading(true);
    try {
      const r = await api.get('/personnel');
      setLoaList(r.data.filter((p) => p.member_status === 'Leave of Absence'));
    } catch {} finally { setLoaLoading(false); }
  }, []);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);
  useEffect(() => { fetchLoadouts(); }, [fetchLoadouts]);
  useEffect(() => { fetchLoa(); }, [fetchLoa]);

  const handleSaveDoc = async ({ title, content }) => {
    setDocSaving(true);
    try {
      if (docModal && docModal.id) {
        await api.put(`/documents/${docModal.id}`, { title, content });
      } else {
        await api.post('/documents', { title, content });
      }
      setDocModal(null);
      fetchDocs();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save document');
    } finally { setDocSaving(false); }
  };

  const handleDeleteDoc = async () => {
    setDeleting(true);
    try {
      await api.delete(`/documents/${deleteDoc.id}`);
      setDeleteDoc(null);
      fetchDocs();
    } catch { alert('Failed to delete document'); }
    finally { setDeleting(false); }
  };

  const handleAddLoadout = async (e) => {
    e.preventDefault();
    if (!newLoadoutName.trim()) return;
    setLoadoutSaving(true);
    try {
      const r = await api.post('/gear-loadouts', { name: newLoadoutName.trim(), description: newLoadoutDesc.trim() });
      setLoadouts((prev) => [...prev, { ...r.data, items: [] }]);
      setNewLoadoutName('');
      setNewLoadoutDesc('');
      setShowNewLoadout(false);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create loadout');
    } finally { setLoadoutSaving(false); }
  };

  const handleDeleteLoadout = async (loadout) => {
    if (!confirm(`Delete loadout "${loadout.name}" and all its items?`)) return;
    try {
      await api.delete(`/gear-loadouts/${loadout.id}`);
      setLoadouts((prev) => prev.filter((l) => l.id !== loadout.id));
    } catch { alert('Failed to delete loadout'); }
  };

  const handleAddItem = async (loadoutId, name, description) => {
    try {
      const r = await api.post(`/gear-loadouts/${loadoutId}/items`, { name, description });
      setLoadouts((prev) => prev.map((l) =>
        l.id === loadoutId ? { ...l, items: [...l.items, r.data] } : l
      ));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to add item');
    }
  };

  const handleDeleteItem = async (loadoutId, itemId) => {
    try {
      await api.delete(`/gear-loadouts/${loadoutId}/items/${itemId}`);
      setLoadouts((prev) => prev.map((l) =>
        l.id === loadoutId ? { ...l, items: l.items.filter((i) => i.id !== itemId) } : l
      ));
    } catch { alert('Failed to delete item'); }
  };

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center gap-2">
        <FileText size={14} className="text-[#3b82f6]" />
        <span className="section-header text-sm">Unit Documents</span>
      </div>

      <div className="flex gap-0 border-b border-[#162448]">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            data-sound="tab"
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-all -mb-px ${
              tab === id
                ? 'border-[#3b82f6] text-[#60a5fa]'
                : 'border-transparent text-[#4a6fa5] hover:text-[#93c5fd]'
            }`}
          >
            <Icon size={12} />
            {label}
            {id === 'loa' && loaList.length > 0 && (
              <span className="bg-amber-900/40 text-amber-400 text-[9px] font-mono px-1.5 py-0.5 rounded-sm border border-amber-900/40">
                {loaList.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === 'documents' && (
        <div className="space-y-3">
          {isAdmin && (
            <div className="flex justify-end">
              <button onClick={() => setDocModal('new')} className="btn-primary flex items-center gap-2 text-sm">
                <Plus size={13} /> New Document
              </button>
            </div>
          )}
          {docsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={18} className="animate-spin text-[#3b82f6]" />
            </div>
          ) : docs.length === 0 ? (
            <div className="card py-12 text-center text-[#1a2f55] font-mono text-xs">NO DOCUMENTS PUBLISHED</div>
          ) : (
            docs.map((doc) => (
              <DocCard
                key={doc.id}
                doc={doc}
                isAdmin={isAdmin}
                onEdit={(d) => setDocModal(d)}
                onDelete={(d) => setDeleteDoc(d)}
                onImagesChange={(docId, imgs) =>
                  setDocs((prev) => prev.map((d) => d.id === docId ? { ...d, images: imgs } : d))
                }
                onFilesChange={(docId, fls) =>
                  setDocs((prev) => prev.map((d) => d.id === docId ? { ...d, files: fls } : d))
                }
              />
            ))
          )}
        </div>
      )}

      {tab === 'loadouts' && (
        <div className="space-y-3">
          {isAdmin && (
            <div className="flex justify-end">
              <button onClick={() => setShowNewLoadout(true)} className="btn-primary flex items-center gap-2 text-sm">
                <Plus size={13} /> New Loadout
              </button>
            </div>
          )}
          {isAdmin && showNewLoadout && (
            <div className="card p-4">
              <form onSubmit={handleAddLoadout} className="space-y-3">
                <div className="text-[#4a6fa5] text-xs font-mono mb-2">// CREATE LOADOUT</div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Loadout Name</label>
                    <input
                      className="input-field"
                      placeholder="e.g. Rifleman (AT)"
                      value={newLoadoutName}
                      onChange={(e) => setNewLoadoutName(e.target.value)}
                      required autoFocus
                    />
                  </div>
                  <div>
                    <label className="label">Description (optional)</label>
                    <input
                      className="input-field"
                      placeholder="Brief description..."
                      value={newLoadoutDesc}
                      onChange={(e) => setNewLoadoutDesc(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <button type="button" onClick={() => { setShowNewLoadout(false); setNewLoadoutName(''); setNewLoadoutDesc(''); }} className="btn-ghost">Cancel</button>
                  <button type="submit" disabled={loadoutSaving || !newLoadoutName.trim()} className="btn-primary flex items-center gap-2">
                    {loadoutSaving && <Loader2 size={12} className="animate-spin" />}
                    Create
                  </button>
                </div>
              </form>
            </div>
          )}
          {loadoutsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={18} className="animate-spin text-[#3b82f6]" />
            </div>
          ) : loadouts.length === 0 ? (
            <div className="card py-12 text-center text-[#1a2f55] font-mono text-xs">NO GEAR LOADOUTS DEFINED</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {loadouts.map((l) => (
                <LoadoutCard
                  key={l.id}
                  loadout={l}
                  isAdmin={isAdmin}
                  onDelete={handleDeleteLoadout}
                  onAddItem={handleAddItem}
                  onDeleteItem={handleDeleteItem}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'loa' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-mono text-[#1a2f55]">
            <AlertTriangle size={11} className="text-amber-400" />
            <span>Marines currently on Leave of Absence</span>
            <span className="ml-auto text-[#4a6fa5]">{loaList.length} personnel</span>
          </div>
          {loaLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={18} className="animate-spin text-[#3b82f6]" />
            </div>
          ) : loaList.length === 0 ? (
            <div className="card py-12 text-center">
              <Clock size={24} className="text-[#162448] mx-auto mb-2" />
              <div className="text-[#1a2f55] font-mono text-xs">NO PERSONNEL CURRENTLY ON LOA</div>
            </div>
          ) : (
            <div className="card overflow-hidden">
              <div className="flex items-center gap-4 px-4 py-2.5 border-b border-[#162448] bg-[#060918]">
                <div className="flex-1 section-header">Name / Rank</div>
                <div className="w-32 section-header hidden sm:block">Date of Entry</div>
                <div className="w-28 section-header">Status</div>
              </div>
              {loaList.map((p) => (
                <div key={p.id} className="flex items-center gap-4 px-4 py-3 border-b border-[#162448]/40 last:border-0 hover:bg-[#0f1c35]/40 transition-colors">
                  <div className="flex-1 min-w-0">
                    <Link
                      to={`/personnel/${p.id}`}
                      className="text-[#dbeafe] text-sm font-medium hover:text-[#60a5fa] transition-colors"
                    >
                      {p.name}
                    </Link>
                    <div className="text-[#4a6fa5] text-xs font-mono mt-0.5">
                      {p.status === 'Marine' ? (RANK_ABBREV[p.rank] || p.rank || '—') : 'CIV'}
                    </div>
                  </div>
                  <div className="w-32 hidden sm:block text-[#4a6fa5] text-xs font-mono">
                    {p.date_of_entry ? format(parseISO(p.date_of_entry), 'MMM dd, yyyy') : '—'}
                  </div>
                  <div className="w-28">
                    <span className="badge bg-amber-900/20 text-amber-400 border border-amber-900/30 font-mono text-[10px]">
                      On Leave
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {docModal && (
        <DocModal
          initial={docModal === 'new' ? null : docModal}
          onSave={handleSaveDoc}
          onClose={() => setDocModal(null)}
          saving={docSaving}
        />
      )}

      {deleteDoc && (
        <Modal title="Delete Document" onClose={() => setDeleteDoc(null)} maxWidth="max-w-sm">
          <div className="space-y-4">
            <p className="text-[#93c5fd] text-sm">
              Delete <span className="text-[#dbeafe] font-medium">"{deleteDoc.title}"</span>?
              This cannot be undone.
            </p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setDeleteDoc(null)} className="btn-ghost">Cancel</button>
              <button onClick={handleDeleteDoc} disabled={deleting} className="btn-danger flex items-center gap-2">
                {deleting && <Loader2 size={13} className="animate-spin" />}
                Delete
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
