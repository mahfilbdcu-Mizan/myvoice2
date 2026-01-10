import { useState, useRef } from "react";
import { Navigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { BlockedUserGuard } from "@/components/BlockedUserGuard";
import { FreeCreditsOnlyGuard } from "@/components/FreeCreditsOnlyGuard";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, FileAudio, Download, Copy, Check } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export default function DashboardSTT() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ jsonUrl?: string; srtUrl?: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const validTypes = ['audio/mp3', 'audio/mpeg', 'audio/aac', 'audio/aiff', 'audio/ogg', 'audio/opus', 'audio/wav', 'audio/webm', 'audio/flac', 'audio/m4a', 'audio/x-m4a'];
      const isValidType = validTypes.some(type => selectedFile.type.includes(type.split('/')[1])) || 
                          selectedFile.name.match(/\.(mp3|aac|aiff|ogg|opus|wav|webm|flac|m4a)$/i);
      
      if (!isValidType) {
        toast({
          title: "Invalid file type",
          description: "Please upload an audio file (mp3, aac, aiff, ogg, opus, wav, webm, flac, m4a)",
          variant: "destructive",
        });
        return;
      }
      
      if (selectedFile.size > 200 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Maximum file size is 200MB",
          variant: "destructive",
        });
        return;
      }
      
      setFile(selectedFile);
      setResult(null);
    }
  };

  const handleTranscribe = async () => {
    if (!file || !user) return;

    setIsProcessing(true);
    setProgress(10);

    try {
      // Get user's API key
      const { data: apiKeyData } = await supabase
        .from('user_api_keys')
        .select('encrypted_key')
        .eq('user_id', user.id)
        .eq('provider', 'ai33')
        .single();

      if (!apiKeyData?.encrypted_key) {
        toast({
          title: "API Key Required",
          description: "Please add your AI33 API key in the API Key settings",
          variant: "destructive",
        });
        setIsProcessing(false);
        return;
      }

      setProgress(30);

      // Create form data
      const formData = new FormData();
      formData.append('file', file);

      // Call the API
      const response = await fetch('https://api.ai33.pro/v1/task/speech-to-text', {
        method: 'POST',
        headers: {
          'xi-api-key': apiKeyData.encrypted_key,
        },
        body: formData,
      });

      setProgress(50);

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success || !data.task_id) {
        throw new Error(data.error || 'Failed to start transcription');
      }

      // Poll for task completion
      const taskId = data.task_id;
      let attempts = 0;
      const maxAttempts = 60;

      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        const taskResponse = await fetch(`https://api.ai33.pro/v1/task/${taskId}`, {
          headers: {
            'xi-api-key': apiKeyData.encrypted_key,
          },
        });

        const taskData = await taskResponse.json();
        setProgress(50 + Math.min(attempts * 2, 40));

        if (taskData.status === 'done') {
          setResult({
            jsonUrl: taskData.metadata?.json_url,
            srtUrl: taskData.metadata?.srt_url,
          });
          setProgress(100);
          toast({
            title: "Transcription Complete",
            description: "Your audio has been transcribed successfully",
          });
          break;
        } else if (taskData.status === 'error') {
          throw new Error(taskData.error_message || 'Transcription failed');
        }

        attempts++;
      }

      if (attempts >= maxAttempts) {
        throw new Error('Transcription timed out');
      }

    } catch (error: any) {
      console.error('STT error:', error);
      toast({
        title: "Transcription Failed",
        description: error.message || "Failed to transcribe audio",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const copyToClipboard = async (url: string) => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <DashboardLayout>
      <BlockedUserGuard featureName="Speech-to-Text">
        <FreeCreditsOnlyGuard featureName="Speech-to-Text">
          <div className="space-y-6">
            <div>
          <h1 className="text-3xl font-bold">Speech to Text</h1>
          <p className="text-muted-foreground">Transcribe audio files to text (JSON & SRT formats)</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Upload Audio</CardTitle>
            <CardDescription>
              Supported formats: mp3, aac, aiff, ogg, opus, wav, webm, flac, m4a (Max: 200MB)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".mp3,.aac,.aiff,.ogg,.opus,.wav,.webm,.flac,.m4a"
              onChange={handleFileChange}
              className="hidden"
            />
            
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
            >
              {file ? (
                <div className="flex items-center justify-center gap-3">
                  <FileAudio className="h-8 w-8 text-primary" />
                  <div className="text-left">
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="h-10 w-10 mx-auto text-muted-foreground" />
                  <p className="text-muted-foreground">Click to upload or drag and drop</p>
                </div>
              )}
            </div>

            {isProcessing && (
              <div className="space-y-2">
                <Progress value={progress} />
                <p className="text-sm text-center text-muted-foreground">
                  {progress < 50 ? 'Uploading...' : 'Transcribing...'}
                </p>
              </div>
            )}

            <Button 
              onClick={handleTranscribe} 
              disabled={!file || isProcessing}
              className="w-full"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                'Transcribe Audio'
              )}
            </Button>
          </CardContent>
        </Card>

        {result && (
          <Card>
            <CardHeader>
              <CardTitle>Transcription Results</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {result.jsonUrl && (
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <span className="font-medium">JSON Transcript</span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(result.jsonUrl!)}
                    >
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                    <Button size="sm" asChild>
                      <a href={result.jsonUrl} target="_blank" rel="noopener noreferrer">
                        <Download className="h-4 w-4 mr-1" /> Download
                      </a>
                    </Button>
                  </div>
                </div>
              )}
              {result.srtUrl && (
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <span className="font-medium">SRT Subtitles</span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(result.srtUrl!)}
                    >
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                    <Button size="sm" asChild>
                      <a href={result.srtUrl} target="_blank" rel="noopener noreferrer">
                        <Download className="h-4 w-4 mr-1" /> Download
                      </a>
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
          </div>
        </FreeCreditsOnlyGuard>
      </BlockedUserGuard>
    </DashboardLayout>
  );
}
