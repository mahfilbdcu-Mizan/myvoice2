import { useState, useRef } from "react";
import { Upload, Loader2, Download, FileText, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { waitForTask } from "@/lib/voice-api";
import { toast } from "@/hooks/use-toast";

export function SpeechToTextPanel() {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [taskStatus, setTaskStatus] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string>("");
  const [srtUrl, setSrtUrl] = useState<string | null>(null);
  const [jsonUrl, setJsonUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const extension = selectedFile.name.split('.').pop()?.toLowerCase();
      const validFormats = ['mp3', 'aac', 'aiff', 'ogg', 'opus', 'wav', 'webm', 'flac', 'm4a'];
      if (validFormats.includes(extension || '')) {
        setFile(selectedFile);
        setTranscript("");
        setSrtUrl(null);
        setJsonUrl(null);
      } else {
        toast({
          title: "Invalid file type",
          description: "Supported formats: mp3, aac, aiff, ogg, opus, wav, webm, flac, m4a",
          variant: "destructive",
        });
      }
    }
  };

  const handleTranscribe = async () => {
    if (!file) return;

    setIsProcessing(true);
    setTaskStatus("Uploading...");
    setTranscript("");
    setSrtUrl(null);
    setJsonUrl(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/speech-to-text`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to start transcription");
      }

      if (data.task_id) {
        setTaskStatus("Transcribing...");
        const task = await waitForTask(data.task_id);

        if (task?.status === "done" && task.metadata) {
          setSrtUrl(task.metadata.srt_url || null);
          setJsonUrl(task.metadata.json_url || null);

          // Fetch the transcript from JSON URL
          if (task.metadata.json_url) {
            try {
              const transcriptRes = await fetch(task.metadata.json_url);
              const transcriptData = await transcriptRes.json();
              if (transcriptData.text) {
                setTranscript(transcriptData.text);
              } else if (Array.isArray(transcriptData)) {
                setTranscript(transcriptData.map((s: { text: string }) => s.text).join(" "));
              }
            } catch {
              console.log("Could not fetch transcript JSON");
            }
          }

          toast({
            title: "Transcription complete!",
            description: "Your transcript is ready.",
          });
        } else if (task?.status === "failed") {
          throw new Error(task.error_message || "Transcription failed");
        }
      }
    } catch (error) {
      toast({
        title: "Transcription failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setTaskStatus(null);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(transcript);
    toast({
      title: "Copied!",
      description: "Transcript copied to clipboard",
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Speech to Text</h2>
        <p className="text-muted-foreground">
          Transcribe audio files to text with timestamps
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upload Section */}
        <div className="space-y-4 rounded-xl border border-border bg-card p-6">
          <div
            className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border p-8 transition-colors hover:border-primary"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="mb-4 h-10 w-10 text-muted-foreground" />
            <p className="font-medium">{file ? file.name : "Click to upload audio"}</p>
            <p className="text-sm text-muted-foreground">
              MP3, WAV, AAC, FLAC, etc. (max 200MB)
            </p>
            <Input
              ref={fileInputRef}
              type="file"
              accept=".mp3,.aac,.aiff,.ogg,.opus,.wav,.webm,.flac,.m4a"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          <Button
            className="w-full gap-2"
            size="lg"
            onClick={handleTranscribe}
            disabled={!file || isProcessing}
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                {taskStatus}
              </>
            ) : (
              <>
                <FileText className="h-5 w-5" />
                Transcribe
              </>
            )}
          </Button>
        </div>

        {/* Result Section */}
        <div className="space-y-4 rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Transcript</h3>
            {transcript && (
              <Button variant="ghost" size="sm" onClick={copyToClipboard}>
                <Copy className="mr-2 h-4 w-4" />
                Copy
              </Button>
            )}
          </div>

          <Textarea
            value={transcript}
            readOnly
            placeholder="Transcript will appear here..."
            className="min-h-[200px] resize-none"
          />

          {(srtUrl || jsonUrl) && (
            <div className="flex gap-2">
              {srtUrl && (
                <Button
                  variant="outline"
                  className="flex-1 gap-2"
                  onClick={() => {
                    const a = document.createElement("a");
                    a.href = srtUrl;
                    a.download = `transcript-${Date.now()}.srt`;
                    a.click();
                  }}
                >
                  <Download className="h-4 w-4" />
                  Download SRT
                </Button>
              )}
              {jsonUrl && (
                <Button
                  variant="outline"
                  className="flex-1 gap-2"
                  onClick={() => {
                    const a = document.createElement("a");
                    a.href = jsonUrl;
                    a.download = `transcript-${Date.now()}.json`;
                    a.click();
                  }}
                >
                  <Download className="h-4 w-4" />
                  Download JSON
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
