'use client';

import React, { useState } from 'react';
import { Plus, Trash2, MoveUp, MoveDown, Terminal, Type, List, AlertTriangle, Info, Lightbulb, FileOutput } from 'lucide-react';
import { LessonBlock, BlockType } from '@/lib/types';
import { Button } from '@/components/ui/button';

interface LessonEditorProps {
  blocks: LessonBlock[];
  onChange: (blocks: LessonBlock[]) => void;
}

export function LessonEditor({ blocks, onChange }: LessonEditorProps) {
  const addBlock = (type: BlockType) => {
    const newBlock: LessonBlock = {
      id: `block-${Date.now()}-${Math.random()}`,
      type,
      title: type === 'cisco-command' ? 'Cisco IOS Command' : type === 'note' ? 'Ghi Chú' : '',
      content: ''
    };
    onChange([...blocks, newBlock]);
  };

  const updateBlock = (id: string, updated: Partial<LessonBlock>) => {
    onChange(blocks.map(b => b.id === id ? { ...b, ...updated } : b));
  };

  const deleteBlock = (id: string) => {
    onChange(blocks.filter(b => b.id !== id));
  };

  const moveBlock = (index: number, direction: 'up' | 'down') => {
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === blocks.length - 1)) return;
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    const newBlocks = [...blocks];
    const temp = newBlocks[index];
    newBlocks[index] = newBlocks[targetIdx];
    newBlocks[targetIdx] = temp;
    onChange(newBlocks);
  };

  return (
    <div className="space-y-4">
      {/* Block List */}
      <div className="space-y-3">
        {blocks.map((block, idx) => (
          <div key={block.id} className="p-3.5 rounded-xl border border-border bg-card space-y-2 relative group">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase text-cisco-blue flex items-center gap-1 font-mono">
                Block {idx + 1}: {block.type}
              </span>
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => moveBlock(idx, 'up')} className="p-1 hover:bg-muted rounded text-muted-foreground">
                  <MoveUp className="w-3.5 h-3.5" />
                </button>
                <button type="button" onClick={() => moveBlock(idx, 'down')} className="p-1 hover:bg-muted rounded text-muted-foreground">
                  <MoveDown className="w-3.5 h-3.5" />
                </button>
                <button type="button" onClick={() => deleteBlock(block.id)} className="p-1 hover:bg-muted rounded text-rose-500">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Block Title Input */}
            <input
              type="text"
              value={block.title || ''}
              onChange={e => updateBlock(block.id, { title: e.target.value })}
              placeholder="Tiêu đề block (tùy chọn)..."
              className="w-full px-2.5 py-1 bg-muted/30 border border-input rounded text-xs font-semibold focus:ring-1 focus:ring-cisco-blue"
            />

            {/* Block Content Input */}
            <textarea
              value={block.content}
              onChange={e => updateBlock(block.id, { content: e.target.value })}
              placeholder={block.type === 'cisco-command' ? 'SW1(config)# vlan 10...' : 'Nội dung block bài học...'}
              rows={block.type === 'cisco-command' ? 5 : 3}
              className={`w-full p-2.5 border border-input rounded text-xs focus:ring-1 focus:ring-cisco-blue ${
                block.type === 'cisco-command' ? 'bg-cli-bg font-mono text-slate-100' : 'bg-muted/30 font-sans'
              }`}
            />
          </div>
        ))}
      </div>

      {/* Add Block Tool Buttons */}
      <div className="p-3 rounded-xl border border-border bg-muted/20 space-y-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
          + Thêm Block Nội Dung:
        </span>
        <div className="flex items-center gap-1.5 flex-wrap">
          <Button type="button" variant="outline" size="sm" onClick={() => addBlock('heading')} className="gap-1 text-xs">
            <Type className="w-3.5 h-3.5" /> Tiêu Đề
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => addBlock('paragraph')} className="gap-1 text-xs">
            <Type className="w-3.5 h-3.5" /> Đoạn Văn
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => addBlock('cisco-command')} className="gap-1 text-xs text-cisco-blue">
            <Terminal className="w-3.5 h-3.5" /> Cisco Command
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => addBlock('command-output')} className="gap-1 text-xs text-emerald-400">
            <FileOutput className="w-3.5 h-3.5" /> CLI Output
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => addBlock('note')} className="gap-1 text-xs text-amber-400">
            <Info className="w-3.5 h-3.5" /> Ghi Chú
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => addBlock('warning')} className="gap-1 text-xs text-rose-400">
            <AlertTriangle className="w-3.5 h-3.5" /> Cảnh Báo
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => addBlock('example')} className="gap-1 text-xs text-emerald-400">
            <Lightbulb className="w-3.5 h-3.5" /> Ví Dụ
          </Button>
        </div>
      </div>
    </div>
  );
}
