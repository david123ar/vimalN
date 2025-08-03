import axios from "axios";
import CryptoJS from "crypto-js";
import { v1_base_url } from "../../utils/base_v1.js";
import { fallback_1, fallback_2 } from "../../utils/fallback.js";

export async function decryptSources_v1(epID, id, name, type) {
  try {
    console.log("🔍 Fetching sources and key...");
    const [{ data: sourcesData }, { data: key }] = await Promise.all([
      axios.get(`https://${v1_base_url}/ajax/v2/episode/sources?id=${id}`),
      axios.get("https://raw.githubusercontent.com/itzzzme/megacloud-keys/refs/heads/main/key.txt"),
    ]);

    console.log("✅ Sources and key fetched.");
    console.log("🔗 sourcesData:", sourcesData);
    console.log("🔑 key:", key);

    const ajaxLink = sourcesData?.link;
    if (!ajaxLink) throw new Error("Missing link in sourcesData");

    console.log("🔗 ajaxLink:", ajaxLink);

    const sourceIdMatch = /\/([^/?]+)\?/.exec(ajaxLink); 
    const sourceId = sourceIdMatch?.[1];
    if (!sourceId) throw new Error("Unable to extract sourceId from link");

    console.log("🆔 Extracted sourceId:", sourceId);

    const baseUrlMatch = ajaxLink.match(/^(https?:\/\/[^\/]+(?:\/[^\/]+){3})/);
    if (!baseUrlMatch) throw new Error("Could not extract base URL from ajaxLink");
    const baseUrl = baseUrlMatch[1];

    console.log("🌐 Base URL:", baseUrl);

    let decryptedSources = null;
    let rawSourceData = {};

    try {
      console.log("📡 Fetching encrypted source...");
      const { data } = await axios.get(`${baseUrl}/getSources?id=${sourceId}`);
      rawSourceData = data;

      console.log("📦 Raw source data received:", rawSourceData);

      const encrypted = rawSourceData?.sources;
      if (!encrypted) throw new Error("Encrypted source missing");

      console.log("🔐 Encrypted source:", encrypted);

      const decrypted = CryptoJS.AES.decrypt(encrypted, key.trim()).toString(CryptoJS.enc.Utf8);
      if (!decrypted) throw new Error("Failed to decrypt source");

      console.log("🔓 Decrypted source string:", decrypted);

      decryptedSources = JSON.parse(decrypted);
      console.log("✅ Decrypted sources parsed:", decryptedSources);
    } catch (decryptionError) {
      console.warn("❗ Decryption failed. Trying fallback...", decryptionError.message);

      try {
        const fallback = name.toLowerCase() === "hd-1" ? fallback_1 : fallback_2;
        console.log("🔁 Using fallback server:", fallback);

        const { data: html } = await axios.get(
          `https://${fallback}/stream/s-2/${epID}/${type}`,
          {
            headers: {
              Referer: `https://${fallback_1}/`,
            },
          }
        );

        console.log("📄 HTML fetched from fallback:", html?.substring(0, 300) + "...");

        const dataIdMatch = html.match(/data-id=["'](\d+)["']/);
        const realId = dataIdMatch?.[1];
        if (!realId) throw new Error("Could not extract data-id for fallback");

        console.log("🆔 Extracted fallback data-id:", realId);

        const { data: fallback_data } = await axios.get(
          `https://${fallback}/stream/getSources?id=${realId}`,
          {
            headers: {
              "X-Requested-With": "XMLHttpRequest",
            },
          }
        );

        console.log("📦 Fallback source data:", fallback_data);

        decryptedSources = [{ file: fallback_data.sources.file }];
        rawSourceData.tracks = fallback_data.tracks ?? [];
        rawSourceData.intro = fallback_data.intro ?? null;
        rawSourceData.outro = fallback_data.outro ?? null;
      } catch (fallbackError) {
        console.error("❌ Fallback failed:", fallbackError.message);
        throw new Error("Fallback failed: " + fallbackError.message);
      }
    }

    console.log("✅ Final result prepared.");
    return {
      id,
      type,
      link: {
        file: decryptedSources?.[0]?.file ?? "",
        type: "hls",
      },
      tracks: rawSourceData.tracks ?? [],
      intro: rawSourceData.intro ?? null,
      outro: rawSourceData.outro ?? null,
      server: name,
    };
  } catch (error) {
    console.error(`🚨 Error during decryptSources_v1(${id}):`, error.message);
    return null;
  }
}
