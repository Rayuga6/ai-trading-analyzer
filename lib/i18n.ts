export type SupportedLanguage = "en" | "hi" | "gu";

export const DEFAULT_LANGUAGE: SupportedLanguage = "en";

export const SUPPORTED_LANGUAGES: Array<{
  code: SupportedLanguage;
  name: string;
  nativeName: string;
}> = [
  { code: "en", name: "English", nativeName: "English" },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी" },
  { code: "gu", name: "Gujarati", nativeName: "ગુજરાતી" },
];

type MessageValue = string | Record<string, unknown>;

export type TranslationMessages = Record<
  string,
  MessageValue
>;

const LANGUAGE_STORAGE_KEY = "aitrade-language";

const FALLBACK_MESSAGES: Record<
  SupportedLanguage,
  TranslationMessages
> = {
  en: {
    appName: "AITrade Analyzer",
    common: {
      loading: "Loading...",
      refresh: "Refresh",
      save: "Save",
      cancel: "Cancel",
      close: "Close",
      error: "Something went wrong.",
    },
    navigation: {
      dashboard: "Dashboard",
      pricing: "Pricing",
      alerts: "Alerts",
      performance: "Performance",
      backtest: "Backtesting",
      paperTrading: "Paper Trading",
    },
    trading: {
      buy: "BUY",
      sell: "SELL",
      hold: "HOLD",
      confidence: "Confidence",
      entryPrice: "Entry price",
      stopLoss: "Stop loss",
      takeProfit: "Take profit",
    },
    legal: {
      disclaimer: "Risk Disclaimer",
      terms: "Terms & Conditions",
      privacy: "Privacy Policy",
      refund: "Refund & Subscription Policy",
      responsibleTrading: "Responsible Trading",
    },
  },
  hi: {
    appName: "AITrade Analyzer",
    common: {
      loading: "लोड हो रहा है...",
      refresh: "रिफ्रेश",
      save: "सेव करें",
      cancel: "रद्द करें",
      close: "बंद करें",
      error: "कुछ गलत हो गया।",
    },
    navigation: {
      dashboard: "डैशबोर्ड",
      pricing: "प्राइसिंग",
      alerts: "अलर्ट",
      performance: "परफॉर्मेंस",
      backtest: "बैकटेस्टिंग",
      paperTrading: "पेपर ट्रेडिंग",
    },
    trading: {
      buy: "BUY",
      sell: "SELL",
      hold: "HOLD",
      confidence: "कॉन्फिडेंस",
      entryPrice: "एंट्री प्राइस",
      stopLoss: "स्टॉप लॉस",
      takeProfit: "टेक प्रॉफिट",
    },
    legal: {
      disclaimer: "रिस्क डिस्क्लेमर",
      terms: "नियम और शर्तें",
      privacy: "प्राइवेसी पॉलिसी",
      refund: "रिफंड और सब्सक्रिप्शन पॉलिसी",
      responsibleTrading: "जिम्मेदार ट्रेडिंग",
    },
  },
  gu: {
    appName: "AITrade Analyzer",
    common: {
      loading: "લોડ થઈ રહ્યું છે...",
      refresh: "રિફ્રેશ",
      save: "સાચવો",
      cancel: "રદ કરો",
      close: "બંધ કરો",
      error: "કંઈક ખોટું થયું.",
    },
    navigation: {
      dashboard: "ડેશબોર્ડ",
      pricing: "પ્રાઇસિંગ",
      alerts: "અલર્ટ્સ",
      performance: "પરફોર્મન્સ",
      backtest: "બેકટેસ્ટિંગ",
      paperTrading: "પેપર ટ્રેડિંગ",
    },
    trading: {
      buy: "BUY",
      sell: "SELL",
      hold: "HOLD",
      confidence: "કોન્ફિડન્સ",
      entryPrice: "એન્ટ્રી પ્રાઇસ",
      stopLoss: "સ્ટોપ લોસ",
      takeProfit: "ટેક પ્રોફિટ",
    },
    legal: {
      disclaimer: "રિસ્ક ડિસ્ક્લેમર",
      terms: "નિયમો અને શરતો",
      privacy: "પ્રાઇવસી પોલિસી",
      refund: "રિફંડ અને સબ્સ્ક્રિપ્શન પોલિસી",
      responsibleTrading: "જવાબદાર ટ્રેડિંગ",
    },
  },
};

function isSupportedLanguage(
  value: unknown,
): value is SupportedLanguage {
  return (
    value === "en" ||
    value === "hi" ||
    value === "gu"
  );
}

export function normalizeLanguage(
  value: unknown,
): SupportedLanguage {
  return isSupportedLanguage(value)
    ? value
    : DEFAULT_LANGUAGE;
}

export function getLanguageName(
  language: SupportedLanguage,
) {
  return (
    SUPPORTED_LANGUAGES.find(
      (item) => item.code === language,
    )?.name ?? "English"
  );
}

export function getLanguageNativeName(
  language: SupportedLanguage,
) {
  return (
    SUPPORTED_LANGUAGES.find(
      (item) => item.code === language,
    )?.nativeName ?? "English"
  );
}

export function getMessages(
  language: SupportedLanguage,
): TranslationMessages {
  return FALLBACK_MESSAGES[normalizeLanguage(language)];
}

function getNestedValue(
  messages: TranslationMessages,
  key: string,
): string | undefined {
  const parts = key.split(".");
  let current: unknown = messages;

  for (const part of parts) {
    if (
      !current ||
      typeof current !== "object" ||
      !(part in current)
    ) {
      return undefined;
    }

    current = (current as Record<string, unknown>)[
      part
    ];
  }

  return typeof current === "string"
    ? current
    : undefined;
}

export function createTranslator(
  language: SupportedLanguage,
  fallbackLanguage: SupportedLanguage = DEFAULT_LANGUAGE,
) {
  const messages = getMessages(language);
  const fallback = getMessages(fallbackLanguage);

  return function translate(
    key: string,
    variables?: Record<string, string | number>,
  ): string {
    let value =
      getNestedValue(messages, key) ??
      getNestedValue(fallback, key) ??
      key;

    if (variables) {
      for (const [name, replacement] of Object.entries(
        variables,
      )) {
        value = value.replace(
          new RegExp(`\\{${name}\\}`, "g"),
          String(replacement),
        );
      }
    }

    return value;
  };
}

export function getStoredLanguage(): SupportedLanguage {
  if (typeof window === "undefined") {
    return DEFAULT_LANGUAGE;
  }

  try {
    return normalizeLanguage(
      window.localStorage.getItem(
        LANGUAGE_STORAGE_KEY,
      ),
    );
  } catch {
    return DEFAULT_LANGUAGE;
  }
}

export function setStoredLanguage(
  language: SupportedLanguage,
): void {
  if (typeof window === "undefined") return;

  const normalized = normalizeLanguage(language);

  try {
    window.localStorage.setItem(
      LANGUAGE_STORAGE_KEY,
      normalized,
    );
    document.documentElement.lang = normalized;
  } catch {
    // Storage can be unavailable in private/restricted browsers.
  }
}

export function clearStoredLanguage(): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(
      LANGUAGE_STORAGE_KEY,
    );
  } catch {
    // Ignore storage errors.
  }
}

export function getLanguageDirection(
  _language: SupportedLanguage,
): "ltr" {
  return "ltr";
}

export function getLanguageDateLocale(
  language: SupportedLanguage,
): string {
  switch (language) {
    case "hi":
      return "hi-IN";
    case "gu":
      return "gu-IN";
    default:
      return "en-IN";
  }
}

export function getLanguageCurrency(
  language: SupportedLanguage,
): string {
  // The product's subscription pricing is currently displayed in INR.
  switch (language) {
    case "hi":
    case "gu":
    case "en":
    default:
      return "INR";
  }
}

export function getLanguageOptions() {
  return SUPPORTED_LANGUAGES.map((language) => ({
    ...language,
    value: language.code,
  }));
}

export { LANGUAGE_STORAGE_KEY };
