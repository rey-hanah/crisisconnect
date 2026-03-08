import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  X,
  Mic,
  MapPin,
  Loader2,
  Upload,
  File,
  Image as ImageIcon,
} from 'lucide-react';
import { API_URL as API } from '@/lib/api';

type Category = 'water' | 'food' | 'medical' | 'shelter' | 'rescue' | 'other';

const CATEGORIES: { value: Category; label: string }[] = [
  { value: 'water', label: 'Water' },
  { value: 'food', label: 'Food' },
  { value: 'medical', label: 'Medical' },
  { value: 'shelter', label: 'Shelter' },
  { value: 'rescue', label: 'Rescue' },
  { value: 'other', label: 'Other' },
];

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface UploadedFile {
  filename: string;
  originalname: string;
  url: string;
  size: number;
}

interface PostFormProps {
  token: string;
  onClose: () => void;
  onCreated: (post: any) => void;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImageFile(name: string) {
  return /\.(jpg|jpeg|png|gif|webp)$/i.test(name);
}

export default function PostForm({ token, onClose, onCreated }: PostFormProps) {
  const [type, setType] = useState<'need' | 'offer'>('need');
  const [category, setCategory] = useState<Category>('water');
  const [customCategory, setCustomCategory] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [peopleAffected, setPeopleAffected] = useState(1);
  const [neighborhood, setNeighborhood] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationLabel, setLocationLabel] = useState('');
  const [voiceProcessing, setVoiceProcessing] = useState(false);

  // File upload state
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const MAX_FILES = 5;

  function detectLocation() {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }
    setLocating(true);
    setError('');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const latitude = pos.coords.latitude.toFixed(6);
        const longitude = pos.coords.longitude.toFixed(6);
        setLat(latitude);
        setLng(longitude);
        setLocationLabel(`${latitude}, ${longitude}`);
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
          );
          const data = await res.json();
          const place =
            data.address?.suburb ||
            data.address?.neighbourhood ||
            data.address?.city_district ||
            data.address?.city ||
            data.address?.town ||
            '';
          if (place) {
            setLocationLabel(place);
            if (!neighborhood) setNeighborhood(place);
          }
        } catch {
          // Keep coordinate label
        }
        setLocating(false);
      },
      () => {
        setError('Could not get your location. Please allow location access.');
        setLocating(false);
      },
      { timeout: 10000, enableHighAccuracy: true },
    );
  }

  function startVoice() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setError('Voice input is not supported in this browser. Try Chrome.');
      return;
    }
    const rec = new SR();
    rec.lang = 'en-US';
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    setListening(true);
    setError('');
    rec.start();
    rec.onresult = async (event: any) => {
      const transcript = event.results[0][0].transcript;
      setListening(false);
      setVoiceProcessing(true);

      try {
        const res = await fetch(`${API}/ai/voice-post`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ text: transcript }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.type === 'need' || data.type === 'offer') setType(data.type);
          if (data.title) setTitle(data.title);
          if (data.description) setDescription(data.description);
          if (data.category) setCategory(data.category as Category);
          if (data.peopleAffected) setPeopleAffected(data.peopleAffected);
          setVoiceProcessing(false);
          return;
        }
      } catch {
        // AI failed, fall through to local parser
      }

      // Local fallback parser - extracts fields without AI
      const lower = transcript.toLowerCase();

      // Detect type (need vs offer)
      if (
        lower.includes('i need') ||
        lower.includes('we need') ||
        lower.includes('need help') ||
        lower.includes('looking for') ||
        lower.includes('help us')
      ) {
        setType('need');
      } else if (
        lower.includes('i can') ||
        lower.includes('i have') ||
        lower.includes('offering') ||
        lower.includes('available') ||
        lower.includes('willing to')
      ) {
        setType('offer');
      }

      // Detect category
      if (
        lower.includes('water') ||
        lower.includes('drinking') ||
        lower.includes('bottles')
      )
        setCategory('water');
      else if (
        lower.includes('food') ||
        lower.includes('meal') ||
        lower.includes('hungry') ||
        lower.includes('eating')
      )
        setCategory('food');
      else if (
        lower.includes('medical') ||
        lower.includes('medicine') ||
        lower.includes('doctor') ||
        lower.includes('hospital') ||
        lower.includes('health')
      )
        setCategory('medical');
      else if (
        lower.includes('shelter') ||
        lower.includes('housing') ||
        lower.includes('stay') ||
        lower.includes('accommodation')
      )
        setCategory('shelter');
      else if (
        lower.includes('rescue') ||
        lower.includes('trapped') ||
        lower.includes('evacuation') ||
        lower.includes('save')
      )
        setCategory('rescue');

      // Extract number of people
      const peopleMatch = transcript.match(
        /(?:family of|people|persons|individuals|adults|children|kids)\s+(?:of\s+)?(\d+)|(\d+)\s+(?:people|persons|individuals|adults|children|kids)/i,
      );
      if (peopleMatch) {
        const num = parseInt(peopleMatch[1] || peopleMatch[2]);
        if (num > 0 && num <= 10000) setPeopleAffected(num);
      }

      // Create a short title from first few words
      const words = transcript.split(/\s+/).slice(0, 5).join(' ');
      if (words) setTitle(words);

      // Put full transcript in description
      setDescription(transcript);
      setVoiceProcessing(false);
    };
    rec.onerror = () => {
      setListening(false);
      setError('Voice recognition failed. Please try again.');
    };
    rec.onend = () => setListening(false);
  }

  // ── File upload ──
  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const remaining = MAX_FILES - uploadedFiles.length;
      if (remaining <= 0) {
        setError(`Maximum ${MAX_FILES} files allowed.`);
        return;
      }
      const filesToUpload = Array.from(files).slice(0, remaining);
      if (filesToUpload.length === 0) return;

      setUploading(true);
      setError('');

      const formData = new FormData();
      filesToUpload.forEach((f) => formData.append('files', f));

      try {
        const res = await fetch(`${API}/posts/upload`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.message || 'Upload failed');
        }
        const uploaded: UploadedFile[] = await res.json();
        setUploadedFiles((prev) => [...prev, ...uploaded]);
      } catch (err: any) {
        setError(err.message || 'File upload failed');
      } finally {
        setUploading(false);
      }
    },
    [uploadedFiles.length, token],
  );

  function removeFile(index: number) {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragActive(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setDragActive(false);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('Please add a title.');
      return;
    }
    if (!lat || !lng) {
      setError('Please detect your location first.');
      return;
    }

    setLoading(true);
    try {
      const photos = uploadedFiles.map((f) => f.url);
      const res = await fetch(`${API}/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          type,
          category,
          title: title.trim(),
          description: description.trim(),
          lat: parseFloat(lat),
          lng: parseFloat(lng),
          peopleAffected,
          neighborhood: neighborhood.trim(),
          ...(photos.length > 0 ? { photos } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to create post');
      onCreated(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/30 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md mx-4 rounded-xl border border-border bg-card shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-base font-semibold text-foreground">
            {type === 'need' ? 'Request help' : 'Offer help'}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="px-5 py-4 max-h-[70vh] overflow-y-auto">
          <form onSubmit={submit} className="flex flex-col gap-4">
            {/* Type toggle */}
            <div className="flex gap-1 p-1 bg-muted rounded-lg">
              {(['need', 'offer'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`
                    flex-1 py-2.5 rounded-lg text-sm font-medium transition-all capitalize
                    ${
                      type === t
                        ? 'bg-card text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }
                  `}
                >
                  {t === 'need' ? 'I need help' : 'I can offer'}
                </button>
              ))}
            </div>

            {/* Voice input */}
            <button
              type="button"
              onClick={startVoice}
              disabled={listening || voiceProcessing}
              className={`
                w-full flex items-center justify-center gap-2 rounded-lg border py-3 text-sm font-medium transition-all
                ${
                  listening
                    ? 'border-destructive/40 bg-destructive/5 text-destructive'
                    : voiceProcessing
                      ? 'border-primary/40 bg-primary/5 text-primary'
                      : 'border-border bg-card text-muted-foreground hover:text-foreground hover:border-foreground/20'
                }
              `}
            >
              {voiceProcessing ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Mic className={`size-4 ${listening ? 'animate-pulse' : ''}`} />
              )}
              {listening
                ? 'Listening... speak now'
                : voiceProcessing
                  ? 'Processing with AI...'
                  : 'Describe with voice'}
            </button>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Category
              </label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setCategory(c.value)}
                    className={`
                      px-3 py-2 rounded-lg text-sm font-medium border transition-all
                      ${
                        category === c.value
                          ? 'border-primary/30 bg-primary text-primary-foreground'
                          : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/20'
                      }
                    `}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
              {/* Other category custom title */}
              {category === 'other' && (
                <input
                  type="text"
                  placeholder="Specify category (e.g. Clothing, Tools)"
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  maxLength={40}
                  className="mt-2 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring/40 transition-shadow"
                />
              )}
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Title
              </label>
              <input
                type="text"
                placeholder="e.g. Family of 4 needs clean water"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                maxLength={120}
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring/40 transition-shadow"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Details{' '}
                <span className="text-muted-foreground/50">(optional)</span>
              </label>
              <textarea
                placeholder="Any additional context..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring/40 transition-shadow resize-none"
              />
            </div>

            {/* People affected */}
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                {type === 'need'
                  ? 'People who need help'
                  : 'People you can help'}
              </label>
              <input
                type="number"
                min={1}
                max={10000}
                value={peopleAffected}
                onChange={(e) =>
                  setPeopleAffected(parseInt(e.target.value) || 1)
                }
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40 transition-shadow"
              />
            </div>

            {/* File upload */}
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Photos / Documents{' '}
                <span className="text-muted-foreground/50">
                  (optional, max {MAX_FILES})
                </span>
              </label>

              {/* Drop zone */}
              <div
                ref={dropZoneRef}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() =>
                  uploadedFiles.length < MAX_FILES &&
                  fileInputRef.current?.click()
                }
                className={`
                  relative flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed py-5 cursor-pointer transition-all
                  ${
                    dragActive
                      ? 'border-primary/50 bg-primary/5'
                      : 'border-border hover:border-foreground/20 hover:bg-accent/30'
                  }
                  ${uploadedFiles.length >= MAX_FILES ? 'opacity-50 pointer-events-none' : ''}
                `}
              >
                {uploading ? (
                  <Loader2 className="size-5 text-muted-foreground animate-spin" />
                ) : (
                  <Upload className="size-5 text-muted-foreground" />
                )}
                <p className="text-sm text-muted-foreground">
                  {uploading ? 'Uploading...' : 'Drop files or click to browse'}
                </p>
                <p className="text-xs text-muted-foreground/60">
                  Images (JPG, PNG, GIF, WebP) and documents (PDF, DOC) up to 10
                  MB
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx"
                onChange={(e) => e.target.files && handleFiles(e.target.files)}
                className="hidden"
              />

              {/* Uploaded files list */}
              {uploadedFiles.length > 0 && (
                <div className="mt-2 space-y-1.5">
                  {uploadedFiles.map((file, i) => (
                    <div
                      key={file.filename}
                      className="flex items-center gap-2.5 rounded-lg border border-border bg-background px-3 py-2"
                    >
                      {isImageFile(file.originalname) ? (
                        <ImageIcon className="size-4 text-muted-foreground shrink-0" />
                      ) : (
                        <File className="size-4 text-muted-foreground shrink-0" />
                      )}
                      <span className="text-sm text-foreground truncate flex-1">
                        {file.originalname}
                      </span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {formatFileSize(file.size)}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeFile(i)}
                        className="rounded p-0.5 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Location
              </label>
              <button
                type="button"
                onClick={detectLocation}
                disabled={locating}
                className={`
                  w-full flex items-center justify-center gap-2 h-10 rounded-lg border text-sm font-medium transition-all
                  ${
                    lat && lng
                      ? 'border-primary/30 bg-primary/5 text-primary'
                      : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/20'
                  }
                `}
              >
                {locating ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <MapPin className="size-4" />
                )}
                {locating
                  ? 'Detecting...'
                  : lat && lng
                    ? locationLabel || 'Location set'
                    : 'Use my location'}
              </button>
              <input
                type="text"
                placeholder="Neighborhood (e.g. Kitsilano)"
                value={neighborhood}
                onChange={(e) => setNeighborhood(e.target.value)}
                className="mt-2 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring/40 transition-shadow"
              />
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-lg bg-destructive/5 border border-destructive/20 px-3 py-2.5">
                <p className="text-sm text-destructive font-medium">{error}</p>
              </div>
            )}

            {/* Submit */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-10 text-sm"
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin mr-2" />
                  Creating...
                </>
              ) : type === 'need' ? (
                'Submit request'
              ) : (
                'Submit offer'
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
