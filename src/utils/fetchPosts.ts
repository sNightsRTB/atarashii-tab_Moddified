export interface Post {
  id: string;
  url: string;
  title: string;
  permalink: string;
  subreddit: string;
  author: string;
  over_18: boolean;
  is_video: boolean;
}

export interface FetchConfig {
  num?: number;
  q?: string;
  sort?: string;
  t?: string;
  nsfw?: boolean;
  [key: string]: any;
}

const GITHUB_JSON_URL =
  `https://raw.githubusercontent.com/sNightsRTB/atarashii-wallpapers/main/wallpapers.json?t=${Date.now()}`;

// Fallback high-res wallpaper in case array is empty or URLs fail
const FALLBACK_WALLPAPER: Post = {
  id: "fallback-1",
  url: "https://raw.githubusercontent.com/sNightsRTB/atarashii-wallpapers/main/fallback.jpg",
  title: "Default Wallpaper",
  permalink: "https://github.com/sNightsRTB/atarashii-wallpapers",
  subreddit: "atarashii-wallpapers",
  author: "sNightsRTB",
  over_18: false,
  is_video: false,
};

function smartShuffle(array: Post[]): Post[] {
  if (array.length <= 1) return array;

  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }

  try {
    const lastSeenId = sessionStorage.getItem("last_wallpaper_id");
    if (lastSeenId && arr.length > 1 && arr[0].id === lastSeenId) {
      const temp = arr[0];
      arr[0] = arr[1];
      arr[1] = temp;
    }

    if (arr.length > 0) {
      sessionStorage.setItem("last_wallpaper_id", arr[0].id);
    }
  } catch (e) {
    console.warn("[Atarashii] sessionStorage unavailable:", e);
  }

  return arr;
}

export async function fetchPosts(config?: FetchConfig): Promise<Post[]> {
  try {
    const response = await fetch(GITHUB_JSON_URL);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    if (!Array.isArray(data)) {
      throw new Error("Invalid JSON structure: Expected an array of wallpapers.");
    }

    const showOnlyNsfw = config && typeof config.nsfw === "boolean" ? config.nsfw : false;
    const mappedPosts: Post[] = [];

    for (const item of data) {
      // Validate that item has a valid image URL property
      const imageUrl = item.url || item.link || item.image;
      if (!imageUrl || typeof imageUrl !== "string") {
        console.warn("[Atarashii] Skipping item missing valid URL:", item);
        continue;
      }

      const isNsfw = !!item.nsfw;

      // Filter by NSFW setting
      if (showOnlyNsfw !== isNsfw) {
        continue;
      }

      mappedPosts.push({
        id: String(item.id || Math.random().toString(36).substring(2, 9)),
        url: imageUrl,
        title: item.title || "Wallpaper",
        permalink: imageUrl,
        subreddit: "atarashii-wallpapers",
        author: item.author || "sNightsRTB",
        over_18: isNsfw,
        is_video: false,
      });
    }

    console.log(`[Atarashii Fetch] Show Only NSFW: ${showOnlyNsfw} | Valid posts found: ${mappedPosts.length}`);

    if (mappedPosts.length === 0) {
      console.warn("[Atarashii] No matching wallpapers found in JSON. Returning fallback.");
      return [FALLBACK_WALLPAPER];
    }

    return smartShuffle(mappedPosts);
  } catch (error) {
    console.error("Failed to fetch wallpapers from GitHub repo:", error);
    return [FALLBACK_WALLPAPER];
  }
}

export default fetchPosts;
