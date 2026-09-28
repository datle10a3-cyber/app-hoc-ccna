'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Terminal, Search, Plus, Copy, Check, Trash2, PlusCircle, ChevronRight, Edit3
} from 'lucide-react';
import { repository } from '@/lib/db/repository';
import { CiscoCommand, CommandStep } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { commandItemText, matchesCommandItem, matchingCommandLines } from '@/lib/command-items';

interface FormStep {
  id: string;
  explanation: string;
  command: string;
}

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

  const { toast } = useToast();

  useEffect(() => {
    setCommands(repository.getCommands());
  }, []);

  const filtered = commands.filter(cmd => matchesCommandItem(cmd, query))
    .sort((left, right) => matchingCommandLines(right, query).length - matchingCommandLines(left, query).length);

  const handleOpenAdd = () => {
    setEditingCmd(null);
    setCmdTitle('');
    setSteps([{ id: '1', explanation: '', command: '' }]);
    setIsAddOpen(true);
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
    
    setIsAddOpen(false);
    setEditingCmd(null);
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

      {/* Command List Grid */}
      <div className="space-y-4">
        {filtered.map(cmd => {
          const allCommandsText = commandItemText(cmd);
          const matchingLines = matchingCommandLines(cmd, query);

          return (
            <Card key={cmd.id} className="hover:border-amber-500/40 transition-all border-border/80 shadow-xs group">
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
        onClose={() => setIsAddOpen(false)} 
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
            <Button type="button" variant="outline" size="sm" onClick={() => setIsAddOpen(false)}>Hủy</Button>
            <Button type="submit" size="sm" className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold shadow-xs">
              {editingCmd ? 'Cập nhật item' : 'Lưu item'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
