"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ImageIcon,
  Loader2,
  RefreshCw,
  Trash2,
  Upload,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiAssetUrl, apiFetch } from "../../lib/api";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

function formatBytes(bytes) {
  if (!bytes) return "—";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Admin-only control for the single public image on the home page.
 *
 * The image lives on the API rather than in the frontend bundle, so every
 * visitor sees the same file and replacing it does not require a deploy. The
 * public home page only ever reads it; writes require an admin session.
 */
export default function SiteImageManager() {
  const [image, setImage] = useState(null);
  const [file, setFile] = useState(null);
  const [alt, setAlt] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const fileInputRef = useRef(null);
  const preview = useMemo(
    () => (file ? URL.createObjectURL(file) : null),
    [file],
  );

  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const response = await apiFetch("/site-images/home-image");
        if (cancelled) return;
        setImage(response?.data ?? null);
        setAlt(response?.data?.alt ?? "");
        setError(null);
      } catch (cause) {
        if (!cancelled) {
          setError(cause?.message ?? "Could not load the home image.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const chooseFile = (event) => {
    const chosen = event.target.files?.[0] ?? null;
    setNotice(null);
    setError(null);

    if (!chosen) {
      setFile(null);
      return;
    }

    if (!ALLOWED_TYPES.includes(chosen.type)) {
      setError("Choose a PNG, JPEG, WebP or GIF image.");
      event.target.value = "";
      return;
    }

    if (chosen.size > MAX_BYTES) {
      setError("That image is larger than 5 MB.");
      event.target.value = "";
      return;
    }

    setFile(chosen);
  };

  const save = async (event) => {
    event.preventDefault();
    setError(null);
    setNotice(null);

    if (!file && !image) {
      setError("Choose an image first.");
      return;
    }

    setSaving(true);

    try {
      const body = new FormData();
      if (file) body.append("image", file);
      body.append("alt", alt.trim());

      const response = await apiFetch("/site-images/home-image", {
        method: "PUT",
        body,
      });

      setImage(response?.data ?? null);
      setAlt(response?.data?.alt ?? "");
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setNotice(
        file
          ? "Home image replaced. Every visitor now sees the new image."
          : "Alt text updated.",
      );
    } catch (cause) {
      setError(cause?.message ?? "Could not save the home image.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!image) return;

    const confirmed = window.confirm(
      "Remove the home presentation image? The home page will fall back to the NL mark until an admin uploads another image.",
    );
    if (!confirmed) return;

    setRemoving(true);
    setError(null);
    setNotice(null);

    try {
      await apiFetch("/site-images/home-image", { method: "DELETE" });
      setImage(null);
      setFile(null);
      setAlt("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      setNotice("Home image removed.");
    } catch (cause) {
      setError(cause?.message ?? "Could not remove the home image.");
    } finally {
      setRemoving(false);
    }
  };

  const shownUrl = preview ?? apiAssetUrl(image?.url);

  return (
    <Card className="shadow-none">
      <CardHeader className="border-b border-border pb-4">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
          <ImageIcon className="size-5" aria-hidden="true" />
          Home presentation image
        </CardTitle>
        <CardDescription className="max-w-2xl">
          This is the large image beside the home page introduction. Uploading
          a new file replaces the current one for every visitor.
        </CardDescription>
      </CardHeader>

      <CardContent className="grid gap-6 pt-1 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <div className="overflow-hidden rounded-xl border border-border bg-[var(--nl-surface-3)]">
          {loading ? (
            <div className="grid min-h-64 place-items-center text-sm text-muted-foreground">
              Loading image…
            </div>
          ) : shownUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- API-hosted, user-uploaded image with unknown dimensions
            <img
              src={shownUrl}
              alt={alt || image?.alt || "Home page presentation image"}
              className="aspect-[4/3] h-full w-full object-cover"
            />
          ) : (
            <div className="grid min-h-64 place-items-center gap-3 text-center">
              <span className="grid size-14 place-items-center rounded-xl bg-primary text-sm font-extrabold text-primary-foreground">
                NL
              </span>
              <p className="max-w-xs px-6 text-sm text-muted-foreground">
                No image yet. The home page is using the NL mark as a fallback.
              </p>
            </div>
          )}
        </div>

        <form className="flex flex-col gap-4" onSubmit={save}>
          {image ? (
            <div className="rounded-lg border border-border bg-[var(--nl-surface-2)] px-3 py-2.5 text-xs text-muted-foreground">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold text-foreground">Current file</span>
                <span className="font-mono">{formatBytes(image.size)}</span>
              </div>
              <p className="mt-1 truncate font-mono text-[0.68rem] text-muted-foreground/70">
                {image.url}
              </p>
            </div>
          ) : null}

          <div className="grid gap-2">
            <Label htmlFor="site-image-file">
              {image ? "Replace image" : "Choose image"}
            </Label>
            <Input
              ref={fileInputRef}
              id="site-image-file"
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={chooseFile}
              className="h-auto cursor-pointer border-border bg-[var(--nl-surface-2)] py-2 text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-primary-foreground hover:file:bg-[var(--nl-primary-strong)]"
            />
            <p className="text-xs leading-5 text-muted-foreground">
              PNG, JPEG, WebP or GIF · up to 5 MB. Large landscape images work
              best.
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="site-image-alt">
              Alt text
            </Label>
            <Input
              id="site-image-alt"
              value={alt}
              onChange={(event) => setAlt(event.target.value)}
              maxLength={200}
              placeholder="A short description for screen readers"
              className="border-border bg-[var(--nl-surface-2)] text-foreground placeholder:text-muted-foreground"
            />
            <p className="text-xs text-muted-foreground">
              {alt.length}/200 · Describe what the image shows, not the file name.
            </p>
          </div>

          {error ? (
            <Alert variant="destructive" className="border-[var(--nl-danger-line)] bg-[var(--nl-danger-soft)]">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          {notice ? (
            <Alert className="border-[var(--nl-info-line)] bg-[var(--nl-info-soft)]">
              <AlertDescription>{notice}</AlertDescription>
            </Alert>
          ) : null}

          <div className="flex flex-wrap gap-2 pt-1">
            <Button type="submit" disabled={saving || removing || (!file && !image)}>
              {saving ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Upload className="size-4" aria-hidden="true" />
              )}
              {image ? "Save changes" : "Upload image"}
            </Button>

            {image ? (
              <Button
                type="button"
                variant="outline"
                disabled={saving || removing}
                onClick={remove}
                className="border-border text-foreground hover:bg-accent"
              >
                {removing ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Trash2 className="size-4" aria-hidden="true" />
                )}
                Remove
              </Button>
            ) : null}

            {file ? (
              <Button
                type="button"
                variant="ghost"
                disabled={saving || removing}
                onClick={() => {
                  setFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
              >
                <RefreshCw className="size-4" aria-hidden="true" />
                Clear selection
              </Button>
            ) : null}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
