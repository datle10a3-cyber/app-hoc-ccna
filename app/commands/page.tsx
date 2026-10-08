'use client';

import React, { useState, useEffect } from 'react';
import { 
  Terminal, Search, Plus, Copy, Check, Trash2, PlusCircle, Edit3
} from 'lucide-react';
import { repository } from '@/lib/db/repository';
import { CiscoCommand, CommandStep } from '@/lib/types';
import { CollectionItem } from '@/components/ui/collection-item';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { commandItemText, matchesCommandItem, matchingCommandLines } from '@/lib/command-items';

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
    const refresh = () => setCommands(repository.getCommands());
    refresh();
    window.addEventListener('ccna:data-sync', refresh);
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
    return () => window.removeEventListener('ccna:data-sync', refresh);
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

  const filtered = commands.filter(cmd => matchesCommandItem(cmd, query))
    .sort((left, right) => matchingCommandLines(right, query).length - matchingCommandLines(left, query).length);

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
    void navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      toast('Đã copy cấu hình', '', 'success');
      setTimeout(() => setCopiedId(null), 2000);
    }).catch(() => toast('Không thể copy', 'Hãy kiểm tra quyền truy cập clipboard.', 'warning'));
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
      category: editingCmd?.category || cmdTitle.trim(),
      device: editingCmd?.device || 'Cisco L2 Switch',
      mode: editingCmd?.mode || 'Global Configuration',
      imageUrl: editingCmd?.imageUrl,
      notes: editingCmd?.notes,
      example: allCmdsCombined,
      steps: validSteps,
      tags: editingCmd?.tags || [cmdTitle.trim()],
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
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Tìm lệnh..."
          className="w-full pl-8 pr-3 py-1.5 bg-muted/30 border border-input rounded-md text-xs font-mono focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      {/* Command List Grid */}
      <div className="space-y-2.5">
        {filtered.map(cmd => {
          const allCommandsText = commandItemText(cmd);
          const matchingLines = matchingCommandLines(cmd, query);
          const firstCommand = allCommandsText.split(/\r?\n/).find(line => line.trim() && !line.trim().startsWith('#'))?.trim() || '';

          return (
            <CollectionItem key={cmd.id} href={`/commands/${encodeURIComponent(cmd.id)}`} title={cmd.title} icon={Terminal}
              badge={cmd.steps?.length ? `${cmd.steps.length} phần` : undefined}
              preview={matchingLines.length ? <span className="flex flex-wrap gap-1" aria-label="Lệnh khớp tìm kiếm">
                {matchingLines.slice(0, 2).map((line, index) => <code key={`${line}-${index}`} className="max-w-full break-words rounded bg-primary/10 px-1.5 font-mono text-[11px] text-primary [overflow-wrap:anywhere]">{line}</code>)}
                {matchingLines.length > 2 && <span className="text-[11px]">+{matchingLines.length - 2}</span>}
              </span> : <code className="block truncate font-mono text-[11px]">{firstCommand || cmd.description || 'Mở để xem nội dung'}</code>}
              actions={<>
                <button type="button" onClick={() => handleOpenEdit(cmd)} aria-label={`Sửa ${cmd.title}`}><Edit3 className="h-4 w-4" />Sửa</button>
                {allCommandsText && <button type="button" onClick={() => handleCopyText(`all-${cmd.id}`, allCommandsText)} aria-label={`Copy ${cmd.title}`}>
                  {copiedId === `all-${cmd.id}` ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
                  {copiedId === `all-${cmd.id}` ? 'Đã copy' : 'Copy'}
                </button>}
                <button type="button" data-danger onClick={() => handleDelete(cmd.id)} aria-label={`Xóa ${cmd.title}`}><Trash2 className="h-4 w-4" />Xóa</button>
              </>}
            />
          );
        })}
      </div>

      {filtered.length === 0 && (
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
        <form onSubmit={handleSave} className="record-form space-y-5">
          <div>
            <label htmlFor="command-title" className="text-xs font-bold text-foreground block mb-1">Tiêu đề *</label>
            <input 
              id="command-title"
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
                className="min-h-11 gap-1 text-amber-500 border-amber-500/40 hover:bg-amber-500/10 font-bold"
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
                      className="min-h-11 px-2 text-xs text-muted-foreground hover:text-destructive flex items-center gap-1 font-medium"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Xóa
                    </button>
                  )}
                </div>

                <div>
                  <label htmlFor={`step-explanation-${step.id}`} className="text-[11px] font-bold text-muted-foreground block mb-1">Giải thích</label>
                  <textarea
                    id={`step-explanation-${step.id}`}
                    value={step.explanation} 
                    onChange={e => handleStepChange(idx, 'explanation', e.target.value)}
                    rows={2}
                    className="w-full px-2.5 py-1 bg-background border border-input rounded text-xs focus:outline-none focus:ring-1 focus:ring-ring font-medium resize-y"
                  />
                </div>

                <div>
                  <label htmlFor={`step-command-${step.id}`} className="text-[11px] font-bold text-muted-foreground block mb-1">Lệnh</label>
                  <textarea 
                    id={`step-command-${step.id}`}
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

          <div className="sticky -bottom-4 flex justify-end gap-2 border-t border-border bg-card py-3 sm:-bottom-6">
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
