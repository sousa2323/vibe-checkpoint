import { Camera, CheckCircle2, ImagePlus, LoaderCircle, MapPin, UsersRound, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AppSelect } from "@/components/app-form-controls";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { FeedPostSummary, PostComposerEventOption } from "@/lib/data";
import { createUserPost, getPostComposerEvents } from "@/lib/data";
import { uploadMedia } from "@/lib/media";

type PostComposerProps = {
  open: boolean;
  userId?: string;
  userName?: string;
  userAvatarUrl?: string;
  onOpenChange: (open: boolean) => void;
  onCreated: (post: FeedPostSummary) => void;
  onRequireAuth: () => void;
  onStatus: (message: string) => void;
};

type PreviewPhoto = {
  id: string;
  file: File;
  previewUrl: string;
};

export function PostComposer({
  open,
  userId,
  userName,
  userAvatarUrl,
  onOpenChange,
  onCreated,
  onRequireAuth,
  onStatus,
}: PostComposerProps) {
  const loadOptions = useServerFn(getPostComposerEvents);
  const upload = useServerFn(uploadMedia);
  const createPost = useServerFn(createUserPost);
  const [options, setOptions] = useState<PostComposerEventOption[]>([]);
  const [eventId, setEventId] = useState("");
  const [caption, setCaption] = useState("");
  const [taggedPerson, setTaggedPerson] = useState("");
  const [photos, setPhotos] = useState<PreviewPhoto[]>([]);
  const [loading, setLoading] = useState(false);
  const selectedEvent = options.find((option) => option.id === eventId);

  useEffect(() => {
    if (!open) return;
    if (!userId) {
      onRequireAuth();
      return;
    }

    let cancelled = false;
    loadOptions({ data: { userId } })
      .then((nextOptions) => {
        if (cancelled) return;
        setOptions(nextOptions);
        setEventId(nextOptions[0]?.id ?? "");
      })
      .catch(() => {
        if (!cancelled) setOptions([]);
      });

    return () => {
      cancelled = true;
    };
  }, [loadOptions, onRequireAuth, open, userId]);

  function resetForm() {
    photos.forEach((photo) => URL.revokeObjectURL(photo.previewUrl));
    setPhotos([]);
    setCaption("");
    setTaggedPerson("");
    setEventId(options[0]?.id ?? "");
  }

  function handleFiles(files: FileList | null) {
    if (!files) return;
    const remaining = 3 - photos.length;
    const nextFiles = Array.from(files)
      .filter((file) => file.type.startsWith("image/"))
      .slice(0, remaining);
    if (nextFiles.length === 0) return;

    setPhotos((current) => [
      ...current,
      ...nextFiles.map((file) => ({
        id: `${file.name}-${file.lastModified}-${crypto.randomUUID()}`,
        file,
        previewUrl: URL.createObjectURL(file),
      })),
    ]);
  }

  async function submit() {
    if (!userId) {
      onRequireAuth();
      return;
    }
    if (!eventId) {
      onStatus("Faça check-in em um evento acontecendo agora para postar.");
      return;
    }
    if (!caption.trim() && photos.length === 0) {
      onStatus("Adicione uma legenda ou pelo menos uma foto.");
      return;
    }

    setLoading(true);
    try {
      const photoUrls = [] as string[];
      for (const photo of photos) {
        const base64 = await fileToBase64(photo.file);
        const result = await upload({
          data: { userId, mimeType: photo.file.type, base64 },
        });
        photoUrls.push(result.mediaUrl);
      }

      const post = await createPost({
        data: {
          userId,
          authorName: userName,
          authorAvatarUrl: userAvatarUrl,
          eventId,
          caption,
          photoUrls,
          taggedPerson,
        },
      });
      onCreated(post);
      onOpenChange(false);
      resetForm();
      onStatus("Postagem publicada.");
    } catch (cause) {
      onStatus(cause instanceof Error ? cause.message : "Não foi possível publicar agora.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bottom-0 top-auto max-h-[92vh] max-w-[420px] translate-y-0 overflow-y-auto rounded-t-[2rem] border-0 p-0 sm:top-[50%] sm:translate-y-[-50%] sm:rounded-[2rem]">
        <div className="border-b border-primary/10 bg-primary/10 p-5 text-foreground">
          <DialogHeader className="text-left">
            <DialogTitle className="text-2xl font-black">Criar postagem</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Mostre o que você está curtindo agora no estabelecimento.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="space-y-4 p-5">
          {options.length === 0 ? (
            <div className="rounded-3xl bg-muted p-5 text-center">
              <CheckCircle2 className="mx-auto h-8 w-8 text-primary" />
              <p className="mt-3 font-black">Nenhum check-in acontecendo agora</p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                Confirme presença em um evento ao vivo para criar uma postagem vinculada ao local.
              </p>
            </div>
          ) : (
            <>
              <AppSelect
                label="Evento atual"
                value={eventId}
                onValueChange={setEventId}
                labelClassName="text-xs font-black uppercase tracking-wide text-muted-foreground"
                triggerClassName="mt-2 border-0 bg-muted px-4 font-bold"
                options={options.map((option) => ({ value: option.id, label: option.title }))}
              />

              {selectedEvent ? (
                <div className="flex items-center gap-2 rounded-2xl bg-primary/10 px-3 py-2 text-xs font-bold text-primary">
                  <MapPin className="h-4 w-4" />
                  {selectedEvent.venueName}, {selectedEvent.venueNeighborhood} marcado
                  automaticamente
                </div>
              ) : null}

              <label className="block">
                <span className="text-xs font-black uppercase tracking-wide text-muted-foreground">
                  Fotos
                </span>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {photos.map((photo) => (
                    <div
                      key={photo.id}
                      className="relative h-28 overflow-hidden rounded-2xl bg-muted"
                    >
                      <img
                        src={photo.previewUrl}
                        alt="Preview"
                        className="h-full w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          URL.revokeObjectURL(photo.previewUrl);
                          setPhotos((current) => current.filter((item) => item.id !== photo.id));
                        }}
                        className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white"
                        aria-label="Remover foto"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  {photos.length < 3 ? (
                    <label className="flex h-28 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-primary/40 bg-primary/5 text-primary">
                      <ImagePlus className="h-6 w-6" />
                      <span className="mt-1 text-xs font-black">Adicionar</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        multiple
                        className="hidden"
                        onChange={(event) => handleFiles(event.target.files)}
                      />
                    </label>
                  ) : null}
                </div>
              </label>

              <label className="block">
                <span className="text-xs font-black uppercase tracking-wide text-muted-foreground">
                  Legenda
                </span>
                <textarea
                  value={caption}
                  onChange={(event) => setCaption(event.target.value)}
                  maxLength={500}
                  placeholder="Conta o clima do lugar..."
                  className="mt-2 min-h-28 w-full resize-none rounded-3xl bg-muted p-4 text-sm outline-none placeholder:text-muted-foreground"
                />
              </label>

              <label className="block">
                <span className="text-xs font-black uppercase tracking-wide text-muted-foreground">
                  Marcar pessoa opcional
                </span>
                <div className="mt-2 flex h-12 items-center gap-2 rounded-full bg-muted px-4">
                  <UsersRound className="h-4 w-4 text-muted-foreground" />
                  <input
                    value={taggedPerson}
                    onChange={(event) => setTaggedPerson(event.target.value)}
                    placeholder="@amigo"
                    className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-muted-foreground"
                  />
                </div>
              </label>
            </>
          )}

          <button
            type="button"
            onClick={() => void submit()}
            disabled={loading || options.length === 0}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-primary text-sm font-black text-primary-foreground shadow-[0_16px_36px_-20px_rgba(0,0,0,0.8)] disabled:opacity-50"
          >
            {loading ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <Camera className="h-4 w-4" />
            )}
            Publicar agora
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Não foi possível ler a imagem."));
    reader.readAsDataURL(file);
  });
}
