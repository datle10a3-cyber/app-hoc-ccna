'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Copy, Check, Trash2, Image as ImageIcon, Maximize2, Eye } from 'lucide-react';
import { repository } from '@/lib/db/repository';
import { commandItemText } from '@/lib/command-items';
import { CiscoCommand } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';

export default function CommandDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const [cmd, setCmd] = useState<CiscoCommand | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (id) setCmd(repository.getCommandById(id) || null);
  }, [id]);

  if (!cmd) return <p className="text-sm text-muted-foreground text-center py-12">Không tìm thấy lệnh.</p>;

  const hasSteps = cmd.steps && cmd.steps.length > 0;
  const allCommandsText = commandItemText(cmd);

  const handleCopyText = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(key);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = () => {
    if (confirm('Bạn có chắc muốn xóa bộ lệnh này?')) {
      repository.deleteCommand(cmd.id);
      toast('Đã xóa', 'Đã xóa bộ lệnh thành công.', 'info');
      router.push('/commands');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <Link href="/commands">
          <Button variant="ghost" size="sm" className="gap-1 text-xs">
            <ArrowLeft className="w-3.5 h-3.5" /> Quay lại thư viện lệnh
          </Button>
        </Link>
        <Button variant="outline" size="sm" onClick={handleDelete} className="gap-1 text-xs text-destructive hover:bg-destructive/10">
          <Trash2 className="w-3.5 h-3.5" /> Xóa bộ lệnh
        </Button>
      </div>

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center justify-between gap-2 border-b border-border pb-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="info">{cmd.mode}</Badge>
              <Badge variant="outline">{cmd.category}</Badge>
              <Badge variant="secondary">{cmd.device}</Badge>
            </div>
            {allCommandsText && <Button
              size="sm" 
              variant="outline" 
              onClick={() => handleCopyText('all', allCommandsText)}
              className="gap-1.5 text-xs"
            >
              {copiedId === 'all' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-emerald-500 font-medium">Đã copy tất cả</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy tất cả</span>
                </>
              )}
            </Button>}
          </div>

          <div>
            <h1 className="text-lg font-bold font-mono text-emerald-400">{cmd.title}</h1>
            {cmd.description && cmd.description !== cmd.title && cmd.description !== cmd.steps?.[0]?.explanation && (
              <p className="text-xs text-muted-foreground mt-1">{cmd.description}</p>
            )}
          </div>

          <div className={`grid grid-cols-1 ${cmd.imageUrl ? 'md:grid-cols-3' : ''} gap-4 items-start`}>
            {/* Steps */}
            <div className={`${cmd.imageUrl ? 'md:col-span-2' : ''} space-y-4`}>
              {hasSteps ? (
                cmd.steps!.map((step, idx) => (
                  <div key={step.id || idx} className="space-y-1.5">
                    {step.explanation && (
                      <div className="flex items-start gap-1.5 text-xs text-foreground font-medium">
                        <span className="text-emerald-500 font-bold">{idx + 1}.</span>
                    <span className="whitespace-pre-wrap">{step.explanation}</span>
                      </div>
                    )}
                    {step.command && (
                      <div className="relative group">
                        <pre className="cisco-terminal my-0 pr-10">{step.command}</pre>
                        <button
                          onClick={() => handleCopyText(`step-${idx}`, step.command)}
                          className="absolute right-2 top-2 p-1 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-opacity opacity-80 group-hover:opacity-100"
                          title="Copy lệnh này"
                        >
                          {copiedId === `step-${idx}` ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                ))
              ) : allCommandsText ? (
                <div className="space-y-1.5">
                  <div className="relative group">
                    <pre className="cisco-terminal my-0 pr-10">{allCommandsText}</pre>
                    <button
                      onClick={() => handleCopyText('single', allCommandsText)}
                      className="absolute right-2 top-2 p-1 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-opacity opacity-80 group-hover:opacity-100"
                      title="Copy lệnh"
                    >
                      {copiedId === `single` ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <p className="rounded-lg border border-dashed border-border bg-muted/20 px-3 py-4 text-xs text-muted-foreground">Item này chưa có lệnh. Quay lại Thư viện lệnh và bấm Sửa để thêm lệnh.</p>
              )}
            </div>

            {/* Attached Diagram Image */}
            {cmd.imageUrl && (
              <div className="md:col-span-1 space-y-1">
                <div className="flex items-center justify-between text-xs text-sky-400 font-medium mb-1">
                  <span className="flex items-center gap-1">
                    <ImageIcon className="w-3.5 h-3.5" /> Sơ đồ ghi nhớ
                  </span>
                  <button 
                    onClick={() => setIsLightboxOpen(true)}
                    className="text-[10px] text-emerald-400 hover:underline flex items-center gap-1"
                  >
                    <Maximize2 className="w-3 h-3" /> Phóng to
                  </button>
                </div>
                <div 
                  onClick={() => setIsLightboxOpen(true)}
                  className="rounded-lg overflow-hidden border border-border bg-slate-950 p-1 cursor-pointer group hover:border-emerald-500/50 transition-colors"
                >
                  <img src={cmd.imageUrl} alt={cmd.title} className="w-full h-auto object-contain rounded" />
                </div>
              </div>
            )}
          </div>

          {cmd.notes && (
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 mt-4">
              <p className="text-xs text-foreground">📝 <strong>Ghi chú:</strong> {cmd.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lightbox Modal */}
      {isLightboxOpen && cmd.imageUrl && (
        <Modal isOpen={isLightboxOpen} onClose={() => setIsLightboxOpen(false)} title={`Sơ đồ: ${cmd.title}`}>
          <div className="space-y-3">
            <div className="p-2 bg-slate-950 rounded-lg border border-border flex items-center justify-center min-h-[250px]">
              <img src={cmd.imageUrl} alt={cmd.title} className="max-w-full max-h-[70vh] object-contain rounded" />
            </div>
            <div className="flex justify-end">
              <Button size="sm" variant="outline" onClick={() => setIsLightboxOpen(false)}>Đóng</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
