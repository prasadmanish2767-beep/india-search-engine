import { brandImageMeta } from "@/lib/brand";
import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ContentLayout } from "@/components/bharatkhoj/ContentLayout";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { INDIAN_LANGUAGES, getCurrentLanguage, setLanguage, t, LanguageCode } from "@/lib/i18n";

const description = "Customize language, safe search, suggestions, and result preferences for BharatKhoj.";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      ...brandImageMeta,
      { title: "Search Preferences — BharatKhoj" },
      { name: "description", content: description },
      { property: "og:title", content: "Search Preferences — BharatKhoj" },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/settings" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "/settings" }],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const [lang, setLangState] = useState<LanguageCode>("en");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setLangState(getCurrentLanguage());
  }, []);

  const handleSave = (event: React.FormEvent) => {
    event.preventDefault();
    setLanguage(lang);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <ContentLayout title={t("language", lang) + " & Preferences"} intro={description}>
      <form className="settings-form" onSubmit={handleSave}>
        <Setting label={t("language", lang)} hint={t("languageDesc", lang)}>
          <Select value={lang} onValueChange={(val) => setLangState(val as LanguageCode)}>
            <SelectTrigger aria-label="Language">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {INDIAN_LANGUAGES.map((l) => (
                <SelectItem key={l.code} value={l.code}>
                  {l.nativeName} ({l.name})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Setting>

        <Setting label={t("safeSearch", lang)} hint={t("safeSearchDesc", lang)}>
          <Switch defaultChecked aria-label="Safe search" />
        </Setting>

        <Setting label={t("suggestions", lang)} hint={t("suggestionsDesc", lang)}>
          <Switch defaultChecked aria-label="Search suggestions" />
        </Setting>

        <Setting label={t("resultsPerPage", lang)} hint="Number of organic results">
          <Select defaultValue="10">
            <SelectTrigger aria-label="Results per page">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10 results</SelectItem>
              <SelectItem value="20">20 results</SelectItem>
            </SelectContent>
          </Select>
        </Setting>

        <Button type="submit">{t("saveSettings", lang)}</Button>
        {saved && <p className="form-success" role="status" style={{ color: "#168A45", marginTop: "1rem" }}>{t("savedMsg", lang)}</p>}
      </form>
    </ContentLayout>
  );
}

function Setting({ label, hint, children }: { label: string; hint: string; children: React.ReactNode }) {
  return (
    <div className="setting-row">
      <span>
        <strong>{label}</strong>
        <small>{hint}</small>
      </span>
      <div>{children}</div>
    </div>
  );
}
