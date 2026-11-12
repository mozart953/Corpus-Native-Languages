"use client";

import { useState } from "react";
import { apiFetch } from "../../lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "../../lib/i18n";

const LANGUAGE_STATUSES = [
  { value: "active", labelKey: "languageCard.status.active" },
  { value: "endangered", labelKey: "languageCard.status.endangered" },
  { value: "critically-endangered", labelKey: "languageCard.status.critically-endangered" },
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
 * Per-locale wording for the word's primary sense.
 *
 * Only reviewers and admins can reach this endpoint, so the editor is hidden
 * for contributors. English is edited through the main Translation field and
 * is the canonical fallback; every other active locale can be added, updated
 * or deleted here without changing the review state.
 */
function TranslationEditor({ wordId, senses }) {
  const { t, locales } = useI18n();
  const options = (locales ?? []).filter((item) => item.code !== "en");
  const [translations, setTranslations] = useState(
    () => senses?.[0]?.translations ?? [],
  );
  const [localeCode, setLocaleCode] = useState(options[0]?.code ?? "");
  const current = translations.find((row) => row.locale === localeCode);
  const [gloss, setGloss] = useState(current?.gloss ?? "");
  const [usage, setUsage] = useState(current?.usage ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  if (options.length === 0) {
    return (
      <div className="roleForm__section">
        <h3 className="roleSection__title">{t("form.translations.title")}</h3>
        <p className="roleHint">{t("form.translations.englishHint")}</p>
      </div>
    );
  }

  const chooseLocale = (nextCode) => {
    const next = translations.find((row) => row.locale === nextCode);
    setLocaleCode(nextCode);
    setGloss(next?.gloss ?? "");
    setUsage(next?.usage ?? "");
    setError(null);
    setNotice(null);
  };

  const applyResponse = (response) => {
    const next = response?.data?.senses?.[0]?.translations ?? [];
    setTranslations(next);
    const saved = next.find((row) => row.locale === localeCode);
    setGloss(saved?.gloss ?? "");
    setUsage(saved?.usage ?? "");
  };

  const save = async () => {
    if (!gloss.trim()) {
      setError(t("form.error.translation"));
      return;
    }

    setBusy(true);
    setError(null);
    setNotice(null);

    try {
      const response = await apiFetch(
        `/words/${encodeURIComponent(wordId)}/translations/${encodeURIComponent(localeCode)}`,
        { method: "PUT", body: { gloss: gloss.trim(), usage: usage.trim() } },
      );
      applyResponse(response);
      setNotice(
        t("form.translations.saved", { locale: localeCode.toUpperCase() }),
      );
    } catch (cause) {
      setError(cause?.message ?? t("form.error.save"));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    setError(null);
    setNotice(null);

    try {
      const response = await apiFetch(
        `/words/${encodeURIComponent(wordId)}/translations/${encodeURIComponent(localeCode)}`,
        { method: "DELETE" },
      );
      applyResponse(response);
      setNotice(
        t("form.translations.deleted", { locale: localeCode.toUpperCase() }),
      );
    } catch (cause) {
      setError(cause?.message ?? t("form.error.save"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="roleForm__section">
      <div className="roleForm__sectionHead">
        <div>
          <h3 className="roleSection__title">{t("form.translations.title")}</h3>
          <p className="roleHint">{t("form.translations.hint")}</p>
        </div>
      </div>

      <div className="roleFormGrid">
        <div className="roleField">
          <Label className="roleLabel" htmlFor="translation-locale">
            {t("form.translations.locale")}
          </Label>
          <select
            id="translation-locale"
            className="roleSelect"
            value={localeCode}
            onChange={(event) => chooseLocale(event.target.value)}
          >
            {options.map((item) => (
              <option key={item.code} value={item.code}>
                {item.label} ({item.code.toUpperCase()})
              </option>
            ))}
          </select>
          <span className="roleHint">{t("form.translations.englishHint")}</span>
        </div>

        <div className="roleField">
          <Label className="roleLabel" htmlFor="translation-gloss">
            {t("form.translations.gloss")}
          </Label>
          <Input
            id="translation-gloss"
            className="roleInput"
            value={gloss}
            onChange={(event) => {
              setGloss(event.target.value);
              setError(null);
              setNotice(null);
            }}
            placeholder={t("form.translationPlaceholder")}
          />
        </div>

        <div className="roleField roleField--wide">
          <Label className="roleLabel" htmlFor="translation-usage">
            {t("form.translations.usage")}
          </Label>
          <Textarea
            id="translation-usage"
            className="roleTextarea"
            value={usage}
            onChange={(event) => {
              setUsage(event.target.value);
              setError(null);
              setNotice(null);
            }}
            placeholder={t("form.usagePlaceholder")}
          />
        </div>
      </div>

      {error ? (
        <p className="roleError" role="alert">
          {error}
        </p>
      ) : null}

      {notice ? (
        <p className="roleNotice" role="status">
          {notice}
        </p>
      ) : null}

      <div className="roleActions">
        <Button type="button" onClick={save} disabled={busy}>
          {busy ? t("form.translations.saving") : t("form.translations.save")}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={remove}
          disabled={busy || !current}
        >
          {t("form.translations.delete")}
        </Button>
      </div>
    </div>
  );
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
  const { t } = useI18n();
  const [values, setValues] = useState(() => initialValues(kind, entry, languages));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const saveLabel = isEdit
    ? t("form.saveChanges")
    : role === "admin"
      ? t("form.publish")
      : role === "reviewer"
        ? t("form.saveForApproval")
        : t("form.saveDraft");

  const roleHint =
    role === "admin"
      ? t("form.hint.admin")
      : role === "reviewer"
        ? t("form.hint.reviewer")
        : isEdit
          ? t("form.hint.contributorEdit")
          : t("form.hint.contributorNew");

  const update = (field) => (event) => {
    const { value } = event.target;
    setValues((current) => ({ ...current, [field]: value }));
    setError(null);
  };

  const submit = async (event) => {
    event.preventDefault();
    setError(null);

    if (isWord) {
      if (!values.languageId) return setError(t("form.error.language"));
      if (!values.word.trim()) return setError(t("form.error.word"));
      if (!values.translation.trim()) return setError(t("form.error.translation"));
    } else {
      if (values.name.trim().length < 2) return setError(t("form.error.name"));
      if (!values.autonym.trim()) return setError(t("form.error.autonym"));
      if (values.region.trim().length < 2) return setError(t("form.error.region"));
      if (Number(values.speakers) < 0 || Number.isNaN(Number(values.speakers))) {
        return setError(t("form.error.speakers"));
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
      setError(cause?.message ?? t("form.error.save"));
    } finally {
      setSubmitting(false);
    }
  };

  const canEditTranslations = isWord && isEdit && role !== "contributor";

  return (
    <form className="rolePanel roleForm" onSubmit={submit} noValidate>
      <div className="roleForm__head">
        <div>
          <span className="nl-eyebrow">
            {t(isEdit ? "form.editEntry" : "form.newEntry")}
          </span>
          <h2 className="roleSection__title">
            {t(
              isEdit
                ? isWord
                  ? "form.updateWord"
                  : "form.updateLanguage"
                : isWord
                  ? "form.addWord"
                  : "form.addLanguage",
            )}
          </h2>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          {t("form.close")}
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
              {t("form.language")}
            </Label>
            <select
              id="entry-language"
              className="roleSelect"
              value={values.languageId}
              onChange={update("languageId")}
            >
              {languages.length === 0 ? (
                <option value="">{t("form.noLanguages")}</option>
              ) : null}
              {languages.map((language) => (
                <option key={language.id} value={language.id}>
                  {language.name}
                  {language.autonym ? ` — ${language.autonym}` : ""}
                </option>
              ))}
            </select>
            {languages.length === 0 ? (
              <span className="roleHint">{t("form.createLanguageFirst")}</span>
            ) : null}
          </div>

          <div className="roleField">
            <Label className="roleLabel" htmlFor="entry-word">
              {t("form.word")}
            </Label>
            <Input
              id="entry-word"
              className="roleInput"
              value={values.word}
              onChange={update("word")}
              placeholder={t("form.wordPlaceholder")}
            />
          </div>

          <div className="roleField">
            <Label className="roleLabel" htmlFor="entry-translation">
              {t("form.translation")}
            </Label>
            <Input
              id="entry-translation"
              className="roleInput"
              value={values.translation}
              onChange={update("translation")}
              placeholder={t("form.translationPlaceholder")}
            />
          </div>

          <div className="roleField">
            <Label className="roleLabel" htmlFor="entry-pronunciation">
              {t("form.pronunciation")}
            </Label>
            <Input
              id="entry-pronunciation"
              className="roleInput"
              value={values.pronunciation}
              onChange={update("pronunciation")}
              placeholder={t("form.pronunciationPlaceholder")}
            />
          </div>

          <div className="roleField">
            <Label className="roleLabel" htmlFor="entry-pos">
              {t("form.partOfSpeech")}
            </Label>
            <Input
              id="entry-pos"
              className="roleInput"
              value={values.partOfSpeech}
              onChange={update("partOfSpeech")}
              placeholder={t("form.partOfSpeechPlaceholder")}
            />
          </div>

          <div className="roleField roleField--wide">
            <Label className="roleLabel" htmlFor="entry-usage">
              {t("form.usage")}
            </Label>
            <Textarea
              id="entry-usage"
              className="roleTextarea"
              value={values.usage}
              onChange={update("usage")}
              placeholder={t("form.usagePlaceholder")}
            />
          </div>
        </div>
      ) : (
        <div className="roleFormGrid">
          {!isEdit ? (
            <div className="roleField">
              <Label className="roleLabel" htmlFor="entry-id">
                {t("form.id")}
              </Label>
              <Input
                id="entry-id"
                className="roleInput"
                value={values.id}
                onChange={update("id")}
                placeholder={t("form.idPlaceholder")}
              />
            </div>
          ) : null}

          <div className="roleField">
            <Label className="roleLabel" htmlFor="entry-name">
              {t("form.name")}
            </Label>
            <Input
              id="entry-name"
              className="roleInput"
              value={values.name}
              onChange={update("name")}
              placeholder={t("form.namePlaceholder")}
            />
          </div>

          <div className="roleField">
            <Label className="roleLabel" htmlFor="entry-autonym">
              {t("form.autonym")}
            </Label>
            <Input
              id="entry-autonym"
              className="roleInput"
              value={values.autonym}
              onChange={update("autonym")}
              placeholder={t("form.autonymPlaceholder")}
            />
          </div>

          <div className="roleField">
            <Label className="roleLabel" htmlFor="entry-region">
              {t("form.region")}
            </Label>
            <Input
              id="entry-region"
              className="roleInput"
              value={values.region}
              onChange={update("region")}
              placeholder={t("form.regionPlaceholder")}
            />
          </div>

          <div className="roleField">
            <Label className="roleLabel" htmlFor="entry-speakers">
              {t("form.speakers")}
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
              {t("form.vitality")}
            </Label>
            <select
              id="entry-status"
              className="roleSelect"
              value={values.status}
              onChange={update("status")}
            >
              {LANGUAGE_STATUSES.map((option) => (
                <option key={option.value} value={option.value}>
                  {t(option.labelKey)}
                </option>
              ))}
            </select>
          </div>

          <div className="roleField">
            <Label className="roleLabel" htmlFor="entry-accent">
              {t("form.accent")}
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
          {submitting ? t("form.saving") : saveLabel}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
          {t("form.cancel")}
        </Button>
        <span className="roleHint">{roleHint}</span>
      </div>

      {canEditTranslations ? (
        <TranslationEditor wordId={entry.id} senses={entry.senses} />
      ) : null}
    </form>
  );
}
