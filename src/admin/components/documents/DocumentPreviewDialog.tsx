import { useEffect, useState } from 'react';
import { Loader2, Download, ExternalLink, FileQuestion } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  /** Storage bucket name. Defaults to application-documents. */
  bucket?: string;
  /** Object path within the bucket. */
  filePath: string;
  fileName: string;
}

type Kind = 'pdf' | 'image' | 'other';

const detectKind = (name: string): Kind => {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  if (ext === 'pdf') return 'pdf';
  if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif', 'bmp', 'svg'].includes(ext)) return 'image';
  return 'other';
};

export function DocumentPreviewDialog({
  open, onOpenChange, bucket = 'application-documents', filePath, fileName,
}: Props) {
  const { toast } = useToast();
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const kind = detectKind(fileName);

  useEffect(() => {
    if (!open) { setUrl(null); return; }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.storage.from(bucket).createSignedUrl(filePath, 600);
        if (error) throw error;
        if (!cancelled) setUrl(data.signedUrl);
      } catch (e: any) {
        toast({ variant: 'destructive', title: 'Preview failed', description: e.message });
        if (!cancelled) onOpenChange(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, bucket, filePath]);

  const download = async () => {
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle className="truncate pr-6">{fileName}</DialogTitle>
          <DialogDescription className="capitalize">{kind} preview · signed URL valid 10 min</DialogDescription>
        </DialogHeader>
        <div className="bg-muted rounded-md min-h-[60vh] flex items-center justify-center overflow-hidden">
          {loading || !url ? (
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          ) : kind === 'pdf' ? (
            <iframe src={url} title={fileName} className="w-full h-[70vh] bg-white" />
          ) : kind === 'image' ? (
            <img src={url} alt={fileName} className="max-h-[70vh] max-w-full object-contain" />
          ) : (
            <div className="text-center text-muted-foreground py-12">
              <FileQuestion className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Inline preview not supported for this file type.</p>
              <p className="text-xs mt-1">Use Download or Open in new tab below.</p>
            </div>
          )}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => url && window.open(url, '_blank')} disabled={!url}>
            <ExternalLink className="h-4 w-4 mr-2" /> Open in new tab
          </Button>
          <Button onClick={download} disabled={!url}>
            <Download className="h-4 w-4 mr-2" /> Download
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
