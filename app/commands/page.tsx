'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Terminal, Search, Plus, Copy, Check, Trash2, PlusCircle, ChevronRight, Edit3, Star, Layers3
} from 'lucide-react';
import { repository } from '@/lib/db/repository';
import { CiscoCommand, CommandStep } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { commandItemText, matchesCommandItem, matchingCommandLines } from '@/lib/command-items';
import { articleInCategory, ciscoLibrary, libraryCategories, matchesLibraryArticle } from '@/lib/cisco-library';
import { libraryFavorites, toggleLibraryFavorite } from '@/lib/cisco-library-favorites';

interface FormStep {
  id: string;
  explanation: string;
  command: string;
}

const COMMAND_FORM_DRAFT_KEY = 'ccna-command-form-draft-v1';

export default function CommandsPage() {
  const [query, setQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [commands, setCommands] = useState<CiscoCommand[]>([]);
  const [category, setCategory] = useState('TẤT CẢ');
  const [tag, setTag] = useState('');
  const [libraryFavs, setLibraryFavs] = useState<string[]>([]);

  // Add / Edit Form State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingCmd, setEditingCmd] = useState<CiscoCommand | null>(null);
  const [cmdTitle, setCmdTitle] = useState('');
  const [steps, setSteps] = useState<FormStep[]>([
    { id: '1', explanation: '', command: '' }
  ]);
  const [draftRestored, setDraftRestored] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    setCommands(repository.getCommands());
    setLibraryFavs(libraryFavorites());
    const urlQuery = new URLSearchParams(window.location.search);
    setTag(urlQuery.get('tag') || '');
    setQuery(urlQuery.get('q') || '');
    try {
      const savedDraft = localStorage.getItem(COMMAND_FORM_DRAFT_KEY);
      if (savedDraft) {
        const draft = JSON.parse(savedDraft) as {
          isAddOpen?: boolean;
          editingId?: string | null;
          cmdTitle?: string;
          steps?: FormStep[];
        };
        if (draft.isAddOpen && Array.isArray(draft.steps) && draft.steps.length > 0) {
          setIsAddOpen(true);
          setEditingCmd(draft.editingId ? repository.getCommands().find(command => command.id === draft.editingId) || null : null);
          setCmdTitle(typeof draft.cmdTitle === 'string' ? draft.cmdTitle : '');
          setSteps(draft.steps.map((step, index) => ({
            id: typeof step.id === 'string' ? step.id : `restored-${index}`,
            explanation: typeof step.explanation === 'string' ? step.explanation : '',
            command: typeof step.command === 'string' ? step.command : '',
          })));
        }
      }
    } catch {
      localStorage.removeItem(COMMAND_FORM_DRAFT_KEY);
    } finally {
      setDraftRestored(true);
    }
  }, []);

  // Keep the open form across route changes, reloads, and browser tab suspension.
  useEffect(() => {
    if (!draftRestored) return;
    try {
      if (!isAddOpen) {
        localStorage.removeItem(COMMAND_FORM_DRAFT_KEY);
        return;
      }
      localStorage.setItem(COMMAND_FORM_DRAFT_KEY, JSON.stringify({
        isAddOpen: true,
        editingId: editingCmd?.id || null,
        cmdTitle,
        steps,
      }));
    } catch {
      // The form remains usable if browser storage is unavailable or full.
    }
  }, [draftRestored, isAddOpen, editingCmd, cmdTitle, steps]);

  const filtered = commands.filter(cmd => (category === 'TẤT CẢ' || category === 'CỦA TÔI' || (category === 'YÊU THÍCH' && cmd.isFavorite)) && (!tag || cmd.tags?.includes(tag)) && matchesCommandItem(cmd, query))
    .sort((left, right) => matchingCommandLines(right, query).length - matchingCommandLines(left, query).length);
  const filteredLibrary = ciscoLibrary.filter(article => (category === 'TẤT CẢ' || (category === 'YÊU THÍCH' && libraryFavs.includes(article.id)) || articleInCategory(article, category)) && (!tag || article.tags.includes(tag)) && matchesLibraryArticle(article, query));

  const handleOpenAdd = () => {
    setEditingCmd(null);
    setCmdTitle('');
    setSteps([{ id: '1', explanation: '', command: '' }]);
    setIsAddOpen(true);
  };

  const handleCloseForm = () => {
    setIsAddOpen(false);
    setEditingCmd(null);
    setCmdTitle('');
    setSteps([{ id: '1', explanation: '', command: '' }]);
    try { localStorage.removeItem(COMMAND_FORM_DRAFT_KEY); } catch { /* Ignore unavailable storage. */ }
  };

  const handleOpenEdit = (cmd: CiscoCommand) => {
    setEditingCmd(cmd);
    setCmdTitle(cmd.title);
    if (cmd.steps && cmd.steps.length > 0) {
      setSteps(cmd.steps.map(s => ({
        id: s.id || String(Math.random()),
        explanation: s.explanation || '',
        command: s.command || ''
      })));
    } else {
      setSteps([{ id: '1', explanation: cmd.description === cmd.title ? '' : cmd.description || '', command: commandItemText(cmd) }]);
    }
    setIsAddOpen(true);
  };

  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleAddStep = () => {
    setSteps(prev => [...prev, { id: String(Date.now()), explanation: '', command: '' }]);
  };

  const handleRemoveStep = (index: number) => {
    if (steps.length === 1) return;
    setSteps(prev => prev.filter((_, i) => i !== index));
  };

  const handleStepChange = (index: number, field: 'explanation' | 'command', value: string) => {
    setSteps(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cmdTitle.trim()) return;

    const validSteps: CommandStep[] = steps
      .filter(s => s.command.trim() || s.explanation.trim())
      .map(s => ({
        id: s.id.startsWith('step-') ? s.id : `step-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        explanation: s.explanation.trim(),
        command: s.command.trim()
      }));

    const allCmdsCombined = validSteps.map(s => `${s.explanation ? '# ' + s.explanation + '\n' : ''}${s.command}`).join('\n\n');
    const cmdToSave: CiscoCommand = {
      id: editingCmd ? editingCmd.id : `cmd-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      command: cmdTitle.trim(),
      title: cmdTitle.trim(),
      description: validSteps[0]?.explanation || '',
      category: cmdTitle.trim(),
      device: 'Cisco L2 Switch',
      mode: editingCmd?.mode || 'Global Configuration',
      imageUrl: editingCmd?.imageUrl,
      example: allCmdsCombined,
      steps: validSteps,
      tags: [cmdTitle.trim()],
      isFavorite: editingCmd ? editingCmd.isFavorite : false,
      createdAt: editingCmd ? editingCmd.createdAt : new Date().toISOString()
    };

    try {
      repository.saveCommand(cmdToSave);
    } catch {
      toast('Không thể lưu item', 'Vui lòng kiểm tra dung lượng lưu trữ hoặc giảm kích thước ảnh.', 'warning');
      return;
    }
    setCommands(repository.getCommands());
    toast('Đã lưu!', editingCmd ? `Đã cập nhật bộ lệnh "${cmdTitle}".` : `Bộ lệnh "${cmdTitle}" đã được lưu.`, 'success');
    
    handleCloseForm();
  };

  const handleDelete = (id: string) => {
    if (confirm('Xóa bộ lệnh này?')) {
      repository.deleteCommand(id);
      setCommands(repository.getCommands());
      toast('Đã xóa', 'Đã xóa bộ lệnh thành công.', 'info');
    }
  };

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-lg font-extrabold text-foreground flex items-center gap-2">
            <Terminal className="w-5 h-5 text-amber-500" /> Thư Viện Lệnh Cisco
          </h1>
        </div>
        <Button size="sm" onClick={handleOpenAdd} className="w-full sm:w-auto gap-1.5 text-xs bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold shadow-xs">
          <Plus className="w-3.5 h-3.5" /> Thêm item lệnh
        </Button>
      </div>

      {/* Filter & Search Bar */}
      <div className="relative">
        <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Tìm lệnh..."
          className="w-full pl-8 pr-3 py-1.5 bg-muted/30 border border-input rounded-md text-xs font-mono focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      <div className="flex flex-wrap gap-1.5" aria-label="Nhóm lệnh">
        {['TẤT CẢ', ...libraryCategories, 'YÊU THÍCH', 'CỦA TÔI'].map(group => <button key={group} type="button" onClick={() => setCategory(group)} aria-pressed={category === group} className={`rounded-md border px-2.5 py-1.5 text-[11px] font-semibold transition-colors ${category === group ? 'border-cyan-500/60 bg-cyan-500/15 text-cyan-300' : group === 'FULL CONFIG' ? 'border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10' : 'border-border text-muted-foreground hover:text-foreground'}`}>{group === 'FULL CONFIG' && <Layers3 className="mr-1 inline h-3.5 w-3.5" />}{group}</button>)}
      </div>
      {tag && <div className="flex items-center gap-2 text-xs text-cyan-300">Tag: {tag}<button type="button" onClick={() => { setTag(''); history.replaceState(null, '', '/commands'); }} className="underline">Xóa lọc</button></div>}
      <p className="text-xs text-muted-foreground">{filteredLibrary.length + filtered.length} bài phù hợp · Tìm theo tên, lệnh, tag, công nghệ hoặc interface.</p>

      <div className="space-y-2">
        {filteredLibrary.map(article => <Card key={article.id} className="collection-card group"><CardContent className="flex items-start gap-2 p-3 sm:p-3.5">
          <Link href={`/commands/${article.id}`} className="min-w-0 flex-1 space-y-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400">
            <div className="flex flex-wrap items-center gap-2"><span className={`rounded border px-1.5 py-0.5 font-mono text-[10px] ${article.kind === 'full' ? 'border-emerald-500/40 text-emerald-400' : 'border-cyan-500/30 text-cyan-300'}`}>{article.kind === 'full' ? 'FULL CONFIG' : article.category}</span><h2 className="text-sm font-bold text-foreground group-hover:text-cyan-300">{article.title}</h2></div>
            <p className="line-clamp-2 text-xs text-muted-foreground">{article.description}</p>
            <div className="flex flex-wrap gap-1">{article.tags.slice(1, 5).map(item => <span key={item} className="text-[10px] text-cyan-400/80">#{item.replace(/\s+/g, '')}</span>)}</div>
          </Link>
          <button type="button" onClick={() => setLibraryFavs(toggleLibraryFavorite(article.id))} aria-label={libraryFavs.includes(article.id) ? `Bỏ yêu thích ${article.title}` : `Yêu thích ${article.title}`} className="rounded p-1 text-muted-foreground hover:text-yellow-400"><Star className={`h-4 w-4 ${libraryFavs.includes(article.id) ? 'fill-yellow-400 text-yellow-400' : ''}`} /></button>
          <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
        </CardContent></Card>)}
      </div>

      {/* Command List Grid */}
      <div className="space-y-4">
        {!!filtered.length && <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Bộ lệnh của bạn</h2>}
        {filtered.map(cmd => {
          const allCommandsText = commandItemText(cmd);
          const matchingLines = matchingCommandLines(cmd, query);

          return (
            <Card key={cmd.id} className="collection-card group">
              <CardContent className="flex items-start gap-2 p-3 sm:p-3.5">
                <Link href={`/commands/${encodeURIComponent(cmd.id)}`} className="flex min-w-0 flex-1 flex-col gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500" aria-label={`Xem chi tiết ${cmd.title}`}>
                  <span className="flex min-w-0 items-center justify-between gap-3">
                    <h2 className="text-sm font-bold text-foreground break-words leading-snug group-hover:text-amber-500">{cmd.title}</h2>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-amber-500" />
                  </span>
                  <span className="line-clamp-2 text-xs text-muted-foreground break-words">
                    {cmd.steps?.length
                      ? `${cmd.steps.length} mục · ${cmd.steps.find(step => step.explanation)?.explanation || cmd.steps.find(step => step.command)?.command || 'Xem nội dung chi tiết'}`
                      : cmd.description || (allCommandsText ? 'Xem nội dung lệnh' : 'Chưa có lệnh.')}
                  </span>
                  {!!matchingLines.length && <span className="flex flex-wrap gap-1.5" aria-label="Lệnh khớp tìm kiếm">
                    {matchingLines.map((line, lineIndex) => <code key={`${line}-${lineIndex}`} className="max-w-full break-all rounded border border-amber-500/20 bg-amber-500/10 px-2 py-1 text-[11px] text-amber-400">{line}</code>)}
                  </span>}
                </Link>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(cmd)} 
                      className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-amber-500 transition-colors" 
                      title="Sửa"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    {allCommandsText && <button
                      type="button"
                      onClick={() => handleCopyText(`all-${cmd.id}`, allCommandsText)} 
                      className="p-1 rounded bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      title="Copy tất cả"
                    >
                      {copiedId === `all-${cmd.id}` ? (
                        <Check className="w-3.5 h-3.5 text-amber-500" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>}
                    <button 
                      type="button"
                      onClick={() => handleDelete(cmd.id)} 
                      className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-destructive transition-colors" 
                      title="Xóa"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filtered.length + filteredLibrary.length === 0 && (
        <div className="text-center py-12 bg-card border border-border rounded-xl p-6 space-y-2">
          <Terminal className="w-8 h-8 text-muted-foreground mx-auto opacity-50" />
          <p className="text-sm font-bold text-foreground">
            {commands.length === 0 ? 'Chưa có item lệnh nào.' : 'Không tìm thấy item phù hợp.'}
          </p>
        </div>
      )}

      {/* Add / Edit Modal */}
      <Modal 
        isOpen={isAddOpen} 
        onClose={handleCloseForm}
        title={editingCmd ? "Sửa item lệnh" : "Thêm item lệnh"}
      >
        <form onSubmit={handleSave} className="space-y-4 max-h-[78vh] overflow-y-auto pr-1">
          <div>
            <label className="text-xs font-bold text-foreground block mb-1">Tiêu đề *</label>
            <input 
              type="text" 
              value={cmdTitle} 
              onChange={e => setCmdTitle(e.target.value)} 
              placeholder="VD: LACP, HSRP, STP..."
              className="w-full px-3 py-1.5 bg-muted/30 border border-input rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-ring font-medium" 
              required 
            />
          </div>
          {/* Dynamic Steps Section */}
          <div className="space-y-3 pt-2 border-t border-border">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground">Nội dung</span>
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                onClick={handleAddStep}
                className="text-[11px] h-7 gap-1 text-amber-500 border-amber-500/40 hover:bg-amber-500/10 font-bold"
              >
                <PlusCircle className="w-3.5 h-3.5" /> Thêm lệnh
              </Button>
            </div>

            {steps.map((step, idx) => (
              <div key={step.id} className="p-3 bg-muted/20 border border-border rounded-xl space-y-2 relative">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold text-amber-500">#{idx + 1}</span>
                  {steps.length > 1 && (
                    <button 
                      type="button" 
                      onClick={() => handleRemoveStep(idx)}
                      className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1 font-medium"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Xóa
                    </button>
                  )}
                </div>

                <div>
                  <label className="text-[11px] font-bold text-muted-foreground block mb-1">Giải thích</label>
                  <textarea
                    value={step.explanation} 
                    onChange={e => handleStepChange(idx, 'explanation', e.target.value)}
                    rows={2}
                    className="w-full px-2.5 py-1 bg-background border border-input rounded text-xs focus:outline-none focus:ring-1 focus:ring-ring font-medium resize-y"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-muted-foreground block mb-1">Lệnh</label>
                  <textarea 
                    value={step.command} 
                    onChange={e => handleStepChange(idx, 'command', e.target.value)}
                    placeholder="Nhập lệnh Cisco..."
                    rows={2}
                    className="w-full px-2.5 py-1.5 bg-[#14120e] text-amber-300 font-mono border border-input rounded text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button type="button" variant="outline" size="sm" onClick={handleCloseForm}>Hủy</Button>
            <Button type="submit" size="sm" className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold shadow-xs">
              {editingCmd ? 'Cập nhật item' : 'Lưu item'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
