"use client";

import { useState } from "react";
import { Copy, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  buildFilename,
  copyToClipboard,
  downloadTextFile,
  wordsToDetailedTxt,
  wordsToJson,
  wordsToPairsTxt,
} from "../../utils/exporters";
import { useI18n } from "../../lib/i18n";
import "./DownloadMenu.css";

/** The export formats offered. */
export const FORMATS = {
  JSON: "json",
  PAIRS: "pairs",
  DETAILED: "detailed",
};

const FORMAT_META = {
  [FORMATS.JSON]: { label: "JSON", hintKey: "download.jsonHint" },
  [FORMATS.PAIRS]: { label: "TXT", hintKey: "download.txtPairsHint" },
  [FORMATS.DETAILED]: { label: "TXT", hintKey: "download.txtDetailedHint" },
};

/**
 * Export the visible words to a file.
 *
 * The scope matters: once a language and a search are active, "all words"
 * would be a lie, so the menu only offers selections that match what the
 * visitor is actually looking at. The TXT pair format is deliberately
 * tab-separated — that is the shape a training pipeline can read directly.
 */
function DownloadMenu({
  words = [],
  languageName = null,
  selectedIds = [],
  baseName = "corpus",
  onExport = null,
}) {
  const [format, setFormat] = useState(FORMATS.JSON);
  const [message, setMessage] = useState(null);
  const { t } = useI18n();

  const selectedWords = words.filter((word) => selectedIds.includes(word.id));
  const useSelection = selectedWords.length > 0;
  const target = useSelection ? selectedWords : words;

  const isEmpty = target.length === 0;
  const meta = {
    languageName: useSelection
      ? `${languageName ?? t("home.words.allLanguages")} (selection)`
      : languageName ?? t("home.words.allLanguages"),
  };

  const serialise = (chosen) => {
    if (chosen === FORMATS.JSON) {
      return { content: wordsToJson(target, meta), extension: "json", mime: "application/json" };
    }
    if (chosen === FORMATS.PAIRS) {
      return { content: wordsToPairsTxt(target, { meta }), extension: "txt", mime: "text/plain" };
    }
    return { content: wordsToDetailedTxt(target, { meta }), extension: "txt", mime: "text/plain" };
  };

  const flash = (text) => {
    setMessage(text);
    window.setTimeout(() => setMessage(null), 2600);
  };

  const handleDownload = () => {
    if (isEmpty) return;

    const { content, extension, mime } = serialise(format);
    const filename = buildFilename(`${baseName}-${useSelection ? "selection" : ""}`, extension);

    downloadTextFile(filename, content, mime);
    onExport?.({ format, filename, count: target.length });
    flash(t("download.message", { filename, count: target.length }));
  };

  const handleCopy = async () => {
    if (isEmpty) return;

    const { content, extension } = serialise(format);
    const ok = await copyToClipboard(content);

    flash(
      ok
        ? t("download.copied", {
            count: target.length,
            format: extension.toUpperCase(),
          })
        : t("download.copyFailed"),
    );
  };

  const wordLabel = target.length === 1 ? t("common.word") : t("common.words");

  return (
    <div className="downloadMenu">
      <div className="downloadMenu__head">
        <div>
          <span className="nl-eyebrow">{t("download.eyebrow")}</span>
          <h3 className="downloadMenu__title">{t("download.title")}</h3>
        </div>

        {useSelection ? (
          <Badge variant="outline" className="downloadMenu__scope">
            {t("download.selected", { count: selectedWords.length })}
          </Badge>
        ) : (
          <Badge variant="outline" className="downloadMenu__scope">
            {t("download.inView", { count: words.length })}
          </Badge>
        )}
      </div>

      <div className="downloadMenu__formats" role="group" aria-label={t("download.format")}>
        {Object.values(FORMATS).map((id) => (
          <Button
            key={id}
            type="button"
            variant="outline"
            className={`downloadMenu__format ${format === id ? "is-active" : ""}`}
            onClick={() => setFormat(id)}
            aria-pressed={format === id}
          >
            <span className="downloadMenu__formatName">{FORMAT_META[id].label}</span>
            <span className="downloadMenu__formatHint">{t(FORMAT_META[id].hintKey)}</span>
          </Button>
        ))}
      </div>

      <div className="downloadMenu__actions">
        <Button
          type="button"
          className="downloadMenu__download"
          onClick={handleDownload}
          disabled={isEmpty}
        >
          <Download className="size-4" aria-hidden="true" />
          {t("download.downloadFormat", { format: FORMAT_META[format].label })}
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={handleCopy}
          disabled={isEmpty}
        >
          <Copy className="size-4" aria-hidden="true" />
          {t("common.copy")}
        </Button>
      </div>

      <p className="downloadMenu__note">
        {isEmpty
          ? t("download.empty")
          : t(useSelection ? "download.noteSelection" : "download.note", {
              count: target.length,
              word: wordLabel,
            })}
      </p>

      <p className="downloadMenu__message" role="status" aria-live="polite">
        {message ?? ""}
      </p>
    </div>
  );
}

export default DownloadMenu;
