"use client";

import { useId, useRef, useState } from "react";
import "./ImageUploader.css";

/** Layouts the uploader can render. */
export const UPLOAD_VARIANTS = {
  ICON: "icon",
  BANNER: "banner",
};

const VARIANT_META = {
  [UPLOAD_VARIANTS.ICON]: { ratio: "1:1" },
  [UPLOAD_VARIANTS.BANNER]: { ratio: "16:9" },
};

const ACCEPTED = ["image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml"];

/** Human-readable file size. */
function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Image picker used for two things: the icon on a language card and the
 * presentation image on the home page. The variant changes the frame, not the
 * logic.
 *
 * Nothing is uploaded. The file is read into a data URL with FileReader and
 * handed to `onChange`, so the parent can preview it immediately; when the
 * backend is ready this is where a multipart request will go instead.
 */
function ImageUploader({
  variant = UPLOAD_VARIANTS.BANNER,
  value = null,
  onChange = null,
  label = "Presentation image",
  description = null,
  maxSizeMB = 3,
  disabled = false,
}) {
  const inputRef = useRef(null);
  const fieldId = useId();
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState(null);
  const [meta, setMeta] = useState(null);

  const variantMeta = VARIANT_META[variant] ?? VARIANT_META[UPLOAD_VARIANTS.BANNER];
  const errorId = `${fieldId}-error`;
  const hintId = `${fieldId}-hint`;

  const readFile = (file) => {
    if (!file) return;

    if (!ACCEPTED.includes(file.type)) {
      setError("That file is not an image. Use PNG, JPEG, WebP, GIF or SVG.");
      return;
    }

    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`That image is ${formatSize(file.size)}. The limit is ${maxSizeMB} MB.`);
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      setError(null);
      setMeta({ name: file.name, size: file.size });
      onChange?.(String(reader.result), { name: file.name, size: file.size, type: file.type });
    };

    reader.onerror = () => {
      setError("The image could not be read. Try a different file.");
    };

    reader.readAsDataURL(file);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setDragging(false);
    if (disabled) return;
    readFile(event.dataTransfer.files?.[0]);
  };

  const handleSelect = (event) => {
    readFile(event.target.files?.[0]);
    // Reset so picking the same file twice still fires a change event.
    event.target.value = "";
  };

  const clear = () => {
    setError(null);
    setMeta(null);
    onChange?.(null);
  };

  const describedBy = [description ? hintId : null, error ? errorId : null]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={`imageUploader imageUploader--${variant}`}>
      <div className="imageUploader__header">
        <span className="nl-eyebrow">Image</span>
        <h3 className="imageUploader__label">{label}</h3>
        {description ? (
          <p className="imageUploader__description" id={hintId}>
            {description}
          </p>
        ) : null}
      </div>

      {value ? (
        <div className="imageUploader__preview">
          {/* eslint-disable-next-line @next/next/no-img-element -- local data URL preview */}
          <img src={value} alt="" className="imageUploader__image" />

          <div className="imageUploader__previewBar">
            <span className="imageUploader__file">
              {meta ? `${meta.name} · ${formatSize(meta.size)}` : "Image loaded"}
            </span>

            <div className="imageUploader__previewActions">
              <button
                type="button"
                className="nl-btn nl-btn--sm"
                onClick={() => inputRef.current?.click()}
                disabled={disabled}
              >
                <span className="nl-icon nl-icon--upload" aria-hidden="true" />
                Replace
              </button>

              <button
                type="button"
                className="nl-btn nl-btn--sm nl-btn--danger"
                onClick={clear}
                disabled={disabled}
              >
                <span className="nl-icon nl-icon--trash" aria-hidden="true" />
                Remove
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className={`imageUploader__dropzone ${dragging ? "is-dragging" : ""}`}
          onClick={() => inputRef.current?.click()}
          onDragOver={(event) => {
            event.preventDefault();
            if (!disabled) setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          disabled={disabled}
          aria-describedby={describedBy || undefined}
        >
          <span className="nl-icon nl-icon--image imageUploader__glyph" aria-hidden="true" />
          <span className="imageUploader__dropTitle">Drop an image here</span>
          <span className="imageUploader__dropHint">or click to choose a file</span>
          <span className="imageUploader__dropMeta">
            PNG, JPEG, WebP, GIF or SVG · up to {maxSizeMB} MB · {variantMeta.ratio}
          </span>
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(",")}
        className="nl-visually-hidden"
        onChange={handleSelect}
        tabIndex={-1}
        aria-hidden="true"
      />

      {error ? (
        <p className="imageUploader__error" id={errorId} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export default ImageUploader;
