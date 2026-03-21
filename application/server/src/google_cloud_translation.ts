import { TranslationServiceClient } from "@google-cloud/translate";
import httpErrors from "http-errors";

type TranslateClient = Pick<TranslationServiceClient, "getProjectId" | "translateText">;

const PROJECT_ID_ENV_KEYS = ["GOOGLE_CLOUD_PROJECT", "GCLOUD_PROJECT", "GCP_PROJECT"] as const;
const TRANSLATION_LOCATION = "global";

let translationClient: TranslationServiceClient | null = null;

function getTranslationClient(): TranslationServiceClient {
  translationClient ??= new TranslationServiceClient();
  return translationClient;
}

async function resolveProjectId(client: TranslateClient): Promise<string> {
  for (const key of PROJECT_ID_ENV_KEYS) {
    const value = process.env[key]?.trim();
    if (value != null && value.length > 0) {
      return value;
    }
  }

  const projectId = (await client.getProjectId())?.trim();
  if (projectId != null && projectId.length > 0) {
    return projectId;
  }

  throw new httpErrors.ServiceUnavailable(
    "Google Cloud project ID is not configured. Set GOOGLE_CLOUD_PROJECT on the server.",
  );
}

export async function translateWithGoogleCloud(
  params: {
    sourceLanguage: string;
    targetLanguage: string;
    text: string;
  },
  options: {
    client?: TranslateClient;
  } = {},
): Promise<string> {
  const client = options.client ?? getTranslationClient();
  const projectId = await resolveProjectId(client);

  try {
    const [response] = await client.translateText({
      parent: `projects/${projectId}/locations/${TRANSLATION_LOCATION}`,
      contents: [params.text],
      mimeType: "text/plain",
      sourceLanguageCode: params.sourceLanguage,
      targetLanguageCode: params.targetLanguage,
    });

    const translatedText = response.translations?.[0]?.translatedText?.trim();
    if (translatedText == null || translatedText.length === 0) {
      throw new httpErrors.BadGateway("Google Cloud Translation returned an empty response.");
    }

    return translatedText;
  } catch (error) {
    if (httpErrors.isHttpError(error)) {
      throw error;
    }

    throw new httpErrors.BadGateway("Google Cloud Translation request failed.");
  }
}
