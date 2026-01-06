import { useState, useRef } from "react";
import { Navigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, FileAudio, Download, Play } from "lucide-react";
import { Progress } from "@/components/ui/progress";

const LANGUAGES = [
  { code: 'auto', name: 'Auto Detect' },
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'pl', name: 'Polish' },
  { code: 'tr', name: 'Turkish' },
  { code: 'ru', name: 'Russian' },
  { code: 'nl', name: 'Dutch' },
  { code: 'cs', name: 'Czech' },
  { code: 'ar', name: 'Arabic' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'hi', name: 'Hindi' },
  { code: 'id', name: 'Indonesian' },
  { code: 'fil', name: 'Filipino' },
  { code: 'vi', name: 'Vietnamese' },
];

export default function DashboardDubbing() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [file, setFile] = useState<File | null>(null);
  const [sourceLang, setSourceLang] = useState('auto');
  const [targetLang, setTargetLang] = useState('es');
  const [disableVoiceCloning, setDisableVoiceCloning] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ audioUrl?: string; srtUrl?: string; jsonUrl?: string } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const isValidType = selectedFile.name.match(/\.(mp3|m4a)$/i);
      
      if (!isValidType) {
        toast({
          title: "Invalid file type",
          description: "Please upload an audio file (mp3 or m4a only)",
          variant: "destructive",
        });
        return;
      }
      
      if (selectedFile.size > 20 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Maximum file size is 20MB",
          variant: "destructive",
        });
        return;
      }
      
      setFile(selectedFile);
      setResult(null);
    }
  };

  const handleDub = async () => {
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
      formData.append('num_speakers', '0');
      formData.append('disable_voice_cloning', String(disableVoiceCloning));
      formData.append('source_lang', sourceLang);
      formData.append('target_lang', targetLang);

      // Call the API
      const response = await fetch('https://api.ai33.pro/v1/task/dubbing', {
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
        throw new Error(data.error || 'Failed to start dubbing');
      }

      // Poll for task completion
      const taskId = data.task_id;
      let attempts = 0;
      const maxAttempts = 120; // Dubbing can take longer

      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        const taskResponse = await fetch(`https://api.ai33.pro/v1/task/${taskId}`, {
          headers: {
            'xi-api-key': apiKeyData.encrypted_key,
          },
        });

        const taskData = await taskResponse.json();
        setProgress(50 + Math.min(attempts, 45));

        if (taskData.status === 'done') {
          setResult({
            audioUrl: taskData.metadata?.audio_url,
            srtUrl: taskData.metadata?.srt_url,
            jsonUrl: taskData.metadata?.json_url,
          });
          setProgress(100);
          toast({
            title: "Dubbing Complete",
            description: "Your audio has been dubbed successfully",
          });
          break;
        } else if (taskData.status === 'error') {
          throw new Error(taskData.error_message || 'Dubbing failed');
        }

        attempts++;
      }

      if (attempts >= maxAttempts) {
        throw new Error('Dubbing timed out');
      }

    } catch (error: any) {
      console.error('Dubbing error:', error);
      toast({
        title: "Dubbing Failed",
        description: error.message || "Failed to dub audio",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
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
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Audio Dubbing</h1>
          <p className="text-muted-foreground">Dub audio files into different languages</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Upload Audio</CardTitle>
            <CardDescription>
              Supported formats: mp3, m4a only (Max: 20MB or 5 minutes)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <input
              ref={fileInputRef}
              type="file"
              accept=".mp3,.m4a"
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Source Language</Label>
                <Select value={sourceLang} onValueChange={setSourceLang}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map(lang => (
                      <SelectItem key={lang.code} value={lang.code}>
                        {lang.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Target Language</Label>
                <Select value={targetLang} onValueChange={setTargetLang}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.filter(l => l.code !== 'auto').map(lang => (
                      <SelectItem key={lang.code} value={lang.code}>
                        {lang.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div>
                <p className="font-medium">Use Voice Library</p>
                <p className="text-sm text-muted-foreground">
                  Use similar voices from library instead of cloning
                </p>
              </div>
              <Switch
                checked={disableVoiceCloning}
                onCheckedChange={setDisableVoiceCloning}
              />
            </div>

            {isProcessing && (
              <div className="space-y-2">
                <Progress value={progress} />
                <p className="text-sm text-center text-muted-foreground">
                  {progress < 50 ? 'Uploading...' : 'Dubbing in progress...'}
                </p>
              </div>
            )}

            <Button 
              onClick={handleDub} 
              disabled={!file || isProcessing}
              className="w-full"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                'Start Dubbing'
              )}
            </Button>
          </CardContent>
        </Card>

        {result && (
          <Card>
            <CardHeader>
              <CardTitle>Dubbing Results</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {result.audioUrl && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <span className="font-medium">Dubbed Audio</span>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" asChild>
                        <a href={result.audioUrl} target="_blank" rel="noopener noreferrer">
                          <Play className="h-4 w-4 mr-1" /> Play
                        </a>
                      </Button>
                      <Button size="sm" asChild>
                        <a href={result.audioUrl} download>
                          <Download className="h-4 w-4 mr-1" /> Download
                        </a>
                      </Button>
                    </div>
                  </div>
                  <audio controls className="w-full" src={result.audioUrl} />
                </div>
              )}
              {result.srtUrl && (
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <span className="font-medium">SRT Subtitles</span>
                  <Button size="sm" asChild>
                    <a href={result.srtUrl} target="_blank" rel="noopener noreferrer">
                      <Download className="h-4 w-4 mr-1" /> Download
                    </a>
                  </Button>
                </div>
              )}
              {result.jsonUrl && (
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <span className="font-medium">JSON Transcript</span>
                  <Button size="sm" asChild>
                    <a href={result.jsonUrl} target="_blank" rel="noopener noreferrer">
                      <Download className="h-4 w-4 mr-1" /> Download
                    </a>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
