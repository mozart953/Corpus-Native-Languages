"use client";

import { useState } from "react";
import { apiFetch } from "../../lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const LANGUAGE_STATUSES = [
  { value: "active", label: "Active" },
  { value: "endangered", label: "Endangered" },
  { value: "critically-endangered", label: "Critically endangered" },
];

function initialValues(kind, entry, languages) {
  if (kind === "word") {
    return {
      languageId: entry?.languageId ?? languages[0]?.id ?? "",
      word: entry?.word ?? "",
      translation: entry?.translation ?? "",
      pronunciation: entry?.pronunciation ?? "",
      partOfSpeech: entry?.partOfSpeech ?? "",
      usage: entry?.usage ?? "",
    };
  }

  return {
    id: entry?.id ?? "",
    name: entry?.name ?? "",
    autonym: entry?.autonym ?? "",
    region: entry?.region ?? "",
    speakers: entry?.speakers ?? 0,
    status: entry?.status ?? "active",
    accent: entry?.accent ?? "#2dd4bf",
  };
}

/**
 * One form for both entry types. A word needs an existing language; a language
 * can be created first and then receive words.
 */
export default function EntryForm({
  kind = "word",
  entry = null,
  languages = [],
  roleKey = "contributor",
  onCancel = null,
  onSaved = null,
}) {
  const isEdit = Boolean(entry?.id);
  const isWord = kind === "word";
  const role = ["reviewer", "admin"].includes(roleKey) ? roleKey : "contributor";
  const [values, setValues] = useState(() => initialValues(kind, entry, languages));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const saveLabel = isEdit
    ? "Save changes"
    : role === "admin"
      ? "Publish entry"
      : role === "reviewer"
        ? "Save for final approval"
        : "Save draft";

  const roleHint =
    role === "admin"
      ? "Admin saves keep the current review state; new entries publish immediately."
      : role === "reviewer"
        ? "Reviewer saves mark the entry reviewer approved; an admin still gives the final approval."
        : isEdit
          ? "Editing a draft keeps it private; editing submitted content returns it to pending."
          : "Save first, then submit it to the reviewer queue when you are ready.";

  const update = (field) => (event) => {
    const { value } = event.target;
    setValues((current) => ({ ...current, [field]: value }));
    setError(null);
  };

  const submit = async (event) => {
    event.preventDefault();
    setError(null);

    if (isWord) {
      if (!values.languageId) return setError("Choose a language first.");
      if (!values.word.trim()) return setError("Enter the word.");
      if (!values.translation.trim()) return setError("Enter a translation.");
    } else {
      if (values.name.trim().length < 2) return setError("Enter a language name.");
      if (!values.autonym.trim()) return setError("Enter the language's own name.");
      if (values.region.trim().length < 2) return setError("Enter the region.");
      if (Number(values.speakers) < 0 || Number.isNaN(Number(values.speakers))) {
        return setError("Speakers must be zero or more.");
      }
    }

    setSubmitting(true);

    try {
      const base = isWord ? "/words" : "/languages";
      const path = isEdit ? `${base}/${encodeURIComponent(entry.id)}` : base;

      let body;
      if (isWord) {
        body = {
          languageId: values.languageId,
          word: values.word.trim(),
          translation: values.translation.trim(),
          pronunciation: values.pronunciation.trim(),
          partOfSpeech: values.partOfSpeech.trim(),
          usage: values.usage.trim(),
        };
      } else {
        body = {
          name: values.name.trim(),
          autonym: values.autonym.trim(),
          region: values.region.trim(),
          speakers: Number(values.speakers),
          status: values.status,
          accent: values.accent || "#2dd4bf",
        };
        if (!isEdit && values.id.trim()) body.id = values.id.trim();
      }

      const response = await apiFetch(path, {
        method: isEdit ? "PUT" : "POST",
        body,
      });

      onSaved?.(response.data, kind, isEdit);
    } catch (cause) {
      setError(cause?.message ?? "Could not save this entry.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="rolePanel roleForm" onSubmit={submit} noValidate>
      <div className="roleForm__head">
        <div>
          <span className="nl-eyebrow">{isEdit ? "Edit entry" : "New entry"}</span>
          <h2 className="roleSection__title">
            {isEdit
              ? `Update this ${isWord ? "word" : "language"}`
              : `Add a ${isWord ? "word" : "language"}`}
          </h2>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Close
        </Button>
      </div>

      {error ? (
        <p className="roleError" role="alert">
          {error}
        </p>
      ) : null}

      {isWord ? (
        <div className="roleFormGrid">
          <div className="roleField roleField--wide">
            <Label className="roleLabel" htmlFor="entry-language">
              Language
            </Label>
            <select
              id="entry-language"
              className="roleSelect"
              value={values.languageId}
              onChange={update("languageId")}
            >
              {languages.length === 0 ? <option value="">No languages yet</option> : null}
              {languages.map((language) => (
                <option key={language.id} value={language.id}>
                  {language.name}
                  {language.autonym ? ` — ${language.autonym}` : ""}
                </option>
              ))}
            </select>
            {languages.length === 0 ? (
              <span className="roleHint">
                Create a language first, then come back to add words to it.
              </span>
            ) : null}
          </div>

          <div className="roleField">
            <Label className="roleLabel" htmlFor="entry-word">
              Word
            </Label>
            <Input
              id="entry-word"
              className="roleInput"
              value={values.word}
              onChange={update("word")}
              placeholder="e.g. jun"
            />
          </div>

          <div className="roleField">
            <Label className="roleLabel" htmlFor="entry-translation">
              Translation
            </Label>
            <Input
              id="entry-translation"
              className="roleInput"
              value={values.translation}
              onChange={update("translation")}
              placeholder="e.g. one"
            />
          </div>

          <div className="roleField">
            <Label className="roleLabel" htmlFor="entry-pronunciation">
              Pronunciation
            </Label>
            <Input
              id="entry-pronunciation"
              className="roleInput"
              value={values.pronunciation}
              onChange={update("pronunciation")}
              placeholder="How it sounds"
            />
          </div>

          <div className="roleField">
            <Label className="roleLabel" htmlFor="entry-pos">
              Part of speech
            </Label>
            <Input
              id="entry-pos"
              className="roleInput"
              value={values.partOfSpeech}
              onChange={update("partOfSpeech")}
              placeholder="noun, verb, greeting…"
            />
          </div>

          <div className="roleField roleField--wide">
            <Label className="roleLabel" htmlFor="entry-usage">
              Usage or example
            </Label>
            <Textarea
              id="entry-usage"
              className="roleTextarea"
              value={values.usage}
              onChange={update("usage")}
              placeholder="A sentence, a context, or a note for reviewers."
            />
          </div>
        </div>
      ) : (
        <div className="roleFormGrid">
          {!isEdit ? (
            <div className="roleField">
              <Label className="roleLabel" htmlFor="entry-id">
                URL id (optional)
              </Label>
              <Input
                id="entry-id"
                className="roleInput"
                value={values.id}
                onChange={update("id")}
                placeholder="auto-generated from the name"
              />
            </div>
          ) : null}

          <div className="roleField">
            <Label className="roleLabel" htmlFor="entry-name">
              Name
            </Label>
            <Input
              id="entry-name"
              className="roleInput"
              value={values.name}
              onChange={update("name")}
              placeholder="e.g. Kaqchikel"
            />
          </div>

          <div className="roleField">
            <Label className="roleLabel" htmlFor="entry-autonym">
              Name in the language
            </Label>
            <Input
              id="entry-autonym"
              className="roleInput"
              value={values.autonym}
              onChange={update("autonym")}
              placeholder="e.g. Kaqchikel"
            />
          </div>

          <div className="roleField">
            <Label className="roleLabel" htmlFor="entry-region">
              Region
            </Label>
            <Input
              id="entry-region"
              className="roleInput"
              value={values.region}
              onChange={update("region")}
              placeholder="e.g. Chimaltenango"
            />
          </div>

          <div className="roleField">
            <Label className="roleLabel" htmlFor="entry-speakers">
              Speakers
            </Label>
            <Input
              id="entry-speakers"
              type="number"
              min="0"
              className="roleInput"
              value={values.speakers}
              onChange={update("speakers")}
            />
          </div>

          <div className="roleField">
            <Label className="roleLabel" htmlFor="entry-status">
              Vitality
            </Label>
            <select
              id="entry-status"
              className="roleSelect"
              value={values.status}
              onChange={update("status")}
            >
              {LANGUAGE_STATUSES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="roleField">
            <Label className="roleLabel" htmlFor="entry-accent">
              Accent colour
            </Label>
            <Input
              id="entry-accent"
              className="roleInput"
              value={values.accent}
              onChange={update("accent")}
              placeholder="#2dd4bf"
            />
          </div>
        </div>
      )}

      <div className="roleActions">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving…" : saveLabel}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <span className="roleHint">{roleHint}</span>
      </div>
    </form>
  );
}
