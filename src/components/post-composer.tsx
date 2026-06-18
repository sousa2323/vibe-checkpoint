import {
  Camera as CameraPlugin,
  CameraDirection,
  EncodingType,
  MediaTypeSelection,
  type MediaResult,
} from "@capacitor/camera";
import { Capacitor } from "@capacitor/core";
import {
  Camera as CameraIcon,
  CheckCircle2,
  ImagePlus,
  Images,
  LoaderCircle,
  MapPin,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AppSelect } from "@/components/app-form-controls";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { UserMentionMultiPicker } from "@/components/user-mention-picker";
import type { FeedPostSummary, PostComposerEventOption, UserMentionSummary } from "@/lib/data";
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

const optimizedImageMimeType = "image/jpeg";
const maxOptimizedImageBytes = 1.85 * 1024 * 1024;
const maxOptimizedImageDimension = 1600;

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
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const [options, setOptions] = useState<PostComposerEventOption[]>([]);
  const [eventId, setEventId] = useState("");
  const [caption, setCaption] = useState("");
  const [taggedUsers, setTaggedUsers] = useState<UserMentionSummary[]>([]);
  const [photos, setPhotos] = useState<PreviewPhoto[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const selectedEvent = options.find((option) => option.id === eventId);
  const loadingRef = useRef(false);
  const requireAuthRef = useRef(onRequireAuth);

  useEffect(() => {
    requireAuthRef.current = onRequireAuth;
  }, [onRequireAuth]);

  useEffect(() => {
    if (!open) {
      setOptions([]);
      setEventId("");
      setLoadingOptions(false);
      return;
    }
    if (loadingRef.current) return;
    if (!userId) {
      setOptions([]);
      setEventId("");
      setLoadingOptions(false);
      requireAuthRef.current();
      return;
    }

    let cancelled = false;
    setLoadingOptions(true);
    loadOptions({ data: { userId } })
      .then((nextOptions) => {
        if (cancelled) return;
        setOptions(nextOptions);
        setEventId((currentEventId) => {
          if (nextOptions.some((option) => option.id === currentEventId)) return currentEventId;
          return nextOptions[0]?.id ?? "";
        });
      })
      .catch(() => {
        if (!cancelled) {
          setOptions([]);
          setEventId("");
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingOptions(false);
      });

    return () => {
      cancelled = true;
    };
  }, [loadOptions, open, userId]);

  function resetForm() {
    photos.forEach((photo) => URL.revokeObjectURL(photo.previewUrl));
    setPhotos([]);
    setCaption("");
    setTaggedUsers([]);
    setEventId(options[0]?.id ?? "");
  }

  function handleFiles(files: FileList | null) {
    if (!files) return;
    addPhotoFiles(Array.from(files));
  }

  function addPhotoFiles(files: File[]) {
    const remaining = 3 - photos.length;
    if (remaining <= 0) return;

    const nextFiles = files.filter((file) => file.type.startsWith("image/")).slice(0, remaining);
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

  async function addFromCamera() {
    if (photos.length >= 3) return;

    if (!Capacitor.isNativePlatform()) {
      cameraInputRef.current?.click();
      return;
    }

    try {
      const result = await CameraPlugin.takePhoto({
        quality: 86,
        targetWidth: 1600,
        targetHeight: 1600,
        correctOrientation: true,
        encodingType: EncodingType.JPEG,
        cameraDirection: CameraDirection.Rear,
        saveToGallery: false,
        includeMetadata: true,
      });
      addPhotoFiles([await mediaResultToFile(result, "camera")]);
    } catch (cause) {
      if (!isUserCancelledMediaPicker(cause)) {
        onStatus("Não foi possível abrir a câmera agora.");
      }
    }
  }

  async function addFromGallery() {
    if (photos.length >= 3) return;

    if (!Capacitor.isNativePlatform()) {
      galleryInputRef.current?.click();
      return;
    }

    const remaining = 3 - photos.length;
    try {
      const result = await CameraPlugin.chooseFromGallery({
        mediaType: MediaTypeSelection.Photo,
        allowMultipleSelection: remaining > 1,
        limit: remaining,
        includeMetadata: true,
      });
      const files = await Promise.all(
        result.results
          .slice(0, remaining)
          .map((photo, index) => mediaResultToFile(photo, `galeria-${index}`)),
      );
      addPhotoFiles(files);
    } catch (cause) {
      if (!isUserCancelledMediaPicker(cause)) {
        onStatus("Não foi possível abrir a galeria agora.");
      }
    }
  }

  async function submit() {
    if (!userId) {
      onRequireAuth();
      return;
    }
    if (!eventId) {
      onStatus("Faça check-in em um evento recente para postar.");
      return;
    }
    if (!selectedEvent) {
      onStatus("Esse evento não está mais disponível para postagem.");
      return;
    }
    if (!caption.trim() && photos.length === 0) {
      onStatus("Adicione uma legenda ou pelo menos uma foto.");
      return;
    }

    loadingRef.current = true;
    setLoading(true);
    try {
      // Cada foto otimiza e envia em sequência, mas todas em paralelo entre si:
      // o upload de uma começa enquanto outra ainda está sendo otimizada.
      const photoUrls = await Promise.all(
        photos.map(async (photo) => {
          const optimizedPhoto = await withClientTimeout(
            optimizeImageForUpload(photo.file),
            15000,
            "Tempo esgotado ao preparar a imagem. Tente outra foto.",
          );
          const base64 = await fileToBase64(optimizedPhoto);
          const result = await withClientTimeout(
            upload({
              data: { userId, mimeType: optimizedPhoto.type, base64 },
            }),
            30000,
            "Tempo esgotado ao enviar a imagem. Tente novamente.",
          );
          return result.mediaUrl;
        }),
      );

      const post = await withClientTimeout(
        createPost({
          data: {
            userId,
            authorName: userName,
            authorAvatarUrl: userAvatarUrl,
            eventId,
            caption,
            photoUrls,
            taggedPerson: taggedUsers[0] ? mentionLabel(taggedUsers[0]) : undefined,
            taggedUserId: taggedUsers[0]?.userId,
            taggedUsers,
          },
        }),
        45000,
        "Tempo esgotado ao publicar. Tente novamente.",
      );
      onCreated(post);
      onOpenChange(false);
      resetForm();
      onStatus("Postagem publicada.");
    } catch (cause) {
      console.error("Não foi possível publicar o post", cause);
      onStatus(publicPostErrorMessage(cause));
    } finally {
      loadingRef.current = false;
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
          {options.length === 0 && loadingOptions ? (
            <div className="rounded-3xl bg-muted p-5 text-center">
              <LoaderCircle className="mx-auto h-8 w-8 animate-spin text-primary" />
              <p className="mt-3 font-black">Carregando evento atual...</p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                Estamos verificando seus check-ins disponíveis para postagem.
              </p>
            </div>
          ) : options.length === 0 ? (
            <div className="rounded-3xl bg-muted p-5 text-center">
              <CheckCircle2 className="mx-auto h-8 w-8 text-primary" />
              <p className="mt-3 font-black">Nenhum evento acontecendo agora para postar</p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                Faça check-in e publique somente enquanto o evento estiver rolando.
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

              <div>
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
                </div>
                {photos.length < 3 ? (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => void addFromCamera()}
                      className="flex h-12 items-center justify-center gap-2 rounded-full bg-foreground px-4 text-sm font-black text-background transition-transform active:scale-[0.98]"
                    >
                      <CameraIcon className="h-4 w-4" />
                      Câmera
                    </button>
                    <button
                      type="button"
                      onClick={() => void addFromGallery()}
                      className="flex h-12 items-center justify-center gap-2 rounded-full bg-muted px-4 text-sm font-black text-foreground transition-opacity active:opacity-80"
                    >
                      <Images className="h-4 w-4" />
                      Galeria
                    </button>
                    <input
                      ref={cameraInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={(event) => {
                        handleFiles(event.target.files);
                        event.target.value = "";
                      }}
                    />
                    <input
                      ref={galleryInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(event) => {
                        handleFiles(event.target.files);
                        event.target.value = "";
                      }}
                    />
                  </div>
                ) : null}
                <p className="mt-2 flex items-center gap-1.5 text-xs leading-relaxed text-muted-foreground">
                  <ImagePlus className="h-3.5 w-3.5" />
                  Até 3 fotos do rolê, tiradas agora ou escolhidas da galeria.
                </p>
              </div>

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

              <UserMentionMultiPicker
                currentUserId={userId}
                label="Marcar pessoa opcional"
                selectedUsers={taggedUsers}
                onSelectedUsersChange={setTaggedUsers}
              />
            </>
          )}

          <button
            type="button"
            onClick={() => void submit()}
            disabled={loading || !selectedEvent}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-primary text-sm font-black text-primary-foreground shadow-[0_16px_36px_-20px_rgba(0,0,0,0.8)] disabled:opacity-50"
          >
            {loading ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <CameraIcon className="h-4 w-4" />
            )}
            {loading ? "Publicando..." : "Publicar agora"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

async function mediaResultToFile(result: MediaResult, fallbackName: string) {
  const source = result.webPath ?? result.uri;
  if (!source) throw new Error("Imagem indisponível.");

  const response = await fetch(source);
  const blob = await response.blob();
  const mimeType = normalizeImageMimeType(blob.type, result.metadata?.format);
  const extension = extensionFromMimeType(mimeType);

  return new File([blob], `${fallbackName}-${Date.now()}.${extension}`, {
    type: mimeType,
    lastModified: Date.now(),
  });
}

function normalizeImageMimeType(blobType: string, format?: string) {
  if (blobType.startsWith("image/")) return blobType;

  const normalizedFormat = format?.toLowerCase();
  if (normalizedFormat === "png") return "image/png";
  if (normalizedFormat === "webp") return "image/webp";
  return "image/jpeg";
}

function extensionFromMimeType(mimeType: string) {
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  return "jpg";
}

function mentionLabel(user: UserMentionSummary) {
  return user.username ? `@${user.username}` : (user.displayName ?? "");
}

function publicPostErrorMessage(cause: unknown) {
  const fallback = "Não foi possível publicar agora. Tente novamente.";
  if (!(cause instanceof Error)) return fallback;

  const message = cause.message.trim();
  const safePrefixes = [
    "Adicione uma legenda",
    "A imagem deve ter",
    "Esse evento não está",
    "Envie uma imagem",
    "Escreva uma legenda",
    "Faça check-in",
    "Não foi possível abrir",
    "Não foi possível ler",
    "Não foi possível otimizar",
    "Não foi possível preparar",
    "Selecione um evento",
    "Tempo esgotado",
    "Use apenas imagens",
  ];

  return safePrefixes.some((prefix) => message.startsWith(prefix)) ? message : fallback;
}

async function optimizeImageForUpload(file: File) {
  const image = await loadImage(file);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Não foi possível preparar a imagem.");

  const baseScale = Math.min(
    1,
    maxOptimizedImageDimension / image.width,
    maxOptimizedImageDimension / image.height,
  );
  let width = Math.max(1, Math.round(image.width * baseScale));
  let height = Math.max(1, Math.round(image.height * baseScale));
  const qualities = [0.82, 0.74, 0.66, 0.58, 0.5, 0.42];
  let smallestBlob: Blob | null = null;

  for (let resizeAttempt = 0; resizeAttempt < 4; resizeAttempt += 1) {
    canvas.width = width;
    canvas.height = height;
    context.drawImage(image, 0, 0, width, height);

    for (const quality of qualities) {
      const blob = await canvasToBlob(canvas, optimizedImageMimeType, quality);
      if (!smallestBlob || blob.size < smallestBlob.size) smallestBlob = blob;
      if (blob.size <= maxOptimizedImageBytes) {
        return new File([blob], `${fileNameWithoutExtension(file.name) || "foto"}.jpg`, {
          type: optimizedImageMimeType,
          lastModified: Date.now(),
        });
      }
    }

    width = Math.max(1, Math.round(width * 0.75));
    height = Math.max(1, Math.round(height * 0.75));
  }

  if (!smallestBlob || smallestBlob.size > maxOptimizedImageBytes) {
    throw new Error("Não foi possível otimizar essa imagem. Tente outra foto.");
  }

  return new File([smallestBlob], `${fileNameWithoutExtension(file.name) || "foto"}.jpg`, {
    type: optimizedImageMimeType,
    lastModified: Date.now(),
  });
}

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Não foi possível abrir essa imagem."));
    };
    image.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Não foi possível preparar a imagem."));
      },
      type,
      quality,
    );
  });
}

function fileNameWithoutExtension(name: string) {
  return name.replace(/\.[^.]+$/, "");
}

async function withClientTimeout<T>(
  promise: PromiseLike<T>,
  milliseconds: number,
  message: string,
) {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      Promise.resolve(promise),
      new Promise<T>((_, reject) => {
        timeout = setTimeout(() => reject(new Error(message)), milliseconds);
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

function isUserCancelledMediaPicker(cause: unknown) {
  const message =
    cause instanceof Error ? cause.message.toLowerCase() : String(cause).toLowerCase();
  return message.includes("cancel") || message.includes("dismiss") || message.includes("abort");
}

function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Não foi possível ler a imagem."));
    reader.readAsDataURL(file);
  });
}
